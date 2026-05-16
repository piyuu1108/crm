use crate::session::RuntimeConfig;
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct AppDetailIdentity {
    pub title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
}

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct AppIdentity {
    pub app_name: String,
    pub detail: Option<AppDetailIdentity>,
}

#[derive(Debug, Clone)]
pub struct Segment {
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub ended_at: chrono::DateTime<chrono::Utc>,
}

impl Segment {
    pub fn duration_secs(&self) -> i64 {
        (self.ended_at - self.started_at).num_seconds()
    }
}

fn add_or_extend_segment(
    segments: &mut Vec<Segment>,
    now: chrono::DateTime<chrono::Utc>,
    max_segments: usize,
) {
    if let Some(last) = segments.last_mut() {
        if (now - last.ended_at).num_seconds() <= 2 {
            last.ended_at = now;
            return;
        }
    }

    segments.push(Segment {
        started_at: now,
        ended_at: now,
    });

    if segments.len() > max_segments {
        // Evict shortest-duration segment, but protect the active (last) segment
        let mut min_idx = 0;
        let mut min_dur = i64::MAX;
        for i in 0..segments.len() - 1 {
            let dur = segments[i].duration_secs();
            if dur < min_dur {
                min_dur = dur;
                min_idx = i;
            }
        }
        segments.remove(min_idx);
    }
}

#[derive(Debug, Clone)]
pub struct AppDetailCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    /// None when segments are disabled — zero allocation.
    pub segments: Option<Vec<Segment>>,
}

/// Per-application cumulative counters.
#[derive(Debug, Clone)]
pub struct AppCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    /// None when details are disabled — zero allocation.
    pub details: Option<HashMap<AppDetailIdentity, AppDetailCounters>>,
    /// None when segments are disabled — zero allocation.
    pub segments: Option<Vec<Segment>>,
    /// Tracks the last time this app was the active foreground app (for pruning).
    pub last_active_at: Instant,
}

impl AppCounters {
    fn new_with_flags(enable_details: bool, enable_segments: bool) -> Self {
        Self {
            total_seconds: 0,
            active_seconds: 0,
            idle_seconds: 0,
            details: if enable_details { Some(HashMap::new()) } else { None },
            segments: if enable_segments { Some(Vec::new()) } else { None },
            last_active_at: Instant::now(),
        }
    }
}

/// Session-level cumulative analytics held in memory.
#[derive(Debug)]
pub struct SessionAnalytics {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub apps: HashMap<String, AppCounters>,
    pub login_at: Instant,
    // Feature flags — copied from RuntimeConfig at session start
    pub enable_details: bool,
    pub enable_segments: bool,
    pub max_segments_per_app: usize,
    pub max_segments_per_detail: usize,
    pub minimum_tracked_seconds: u64,
    pub candidate_retention_minutes: u64,
    /// Tick counter for periodic pruning (run every ~60 ticks ≈ 1 minute).
    prune_counter: u32,
}

impl SessionAnalytics {
    pub fn new(config: &RuntimeConfig) -> Self {
        Self {
            total_seconds: 0,
            active_seconds: 0,
            idle_seconds: 0,
            apps: HashMap::new(),
            login_at: Instant::now(),
            enable_details: config.enable_details,
            enable_segments: config.enable_segments,
            max_segments_per_app: config.max_segments_per_app,
            max_segments_per_detail: config.max_segments_per_detail,
            minimum_tracked_seconds: config.minimum_tracked_seconds,
            candidate_retention_minutes: config.candidate_retention_minutes,
            prune_counter: 0,
        }
    }

    /// Called every ~1 second by the monitoring loop.
    /// Increments the correct counters based on the current app identity and idle state.
    pub fn tick(&mut self, identity: &AppIdentity, is_idle: bool) {
        let now = chrono::Utc::now();
        self.total_seconds += 1;
        if !is_idle {
            self.active_seconds += 1;
        } else {
            self.idle_seconds += 1;
        }

        let enable_details = self.enable_details;
        let enable_segments = self.enable_segments;
        let max_seg_app = self.max_segments_per_app;
        let max_seg_detail = self.max_segments_per_detail;

        let app_counters = if let Some(ac) = self.apps.get_mut(&identity.app_name) {
            ac
        } else {
            self.apps.insert(
                identity.app_name.clone(),
                AppCounters::new_with_flags(enable_details, enable_segments),
            );
            self.apps.get_mut(&identity.app_name).unwrap()
        };

        // Update last activity timestamp (for pruning)
        app_counters.last_active_at = Instant::now();

        app_counters.total_seconds += 1;
        if !is_idle {
            app_counters.active_seconds += 1;

            // App-level segments — gated
            if enable_segments {
                let segments = app_counters.segments.get_or_insert_with(Vec::new);
                add_or_extend_segment(segments, now, max_seg_app);
            }
        } else {
            app_counters.idle_seconds += 1;
        }

        // Details — fully gated
        if enable_details {
            if let Some(detail) = &identity.detail {
                let details_map = app_counters.details.get_or_insert_with(HashMap::new);

                // Memory bound: Cap details at 100.
                if !details_map.contains_key(detail) && details_map.len() >= 100 {
                    let mut min_key = None;
                    let mut min_secs = u64::MAX;
                    for (k, v) in details_map.iter() {
                        if v.total_seconds < min_secs {
                            min_secs = v.total_seconds;
                            min_key = Some(k.clone());
                        }
                    }
                    if let Some(k) = min_key {
                        details_map.remove(&k);
                    }
                }

                if let Some(detail_counters) = details_map.get_mut(detail) {
                    detail_counters.total_seconds += 1;
                    if !is_idle {
                        detail_counters.active_seconds += 1;
                        if enable_segments {
                            let segs = detail_counters.segments.get_or_insert_with(Vec::new);
                            add_or_extend_segment(segs, now, max_seg_detail);
                        }
                    } else {
                        detail_counters.idle_seconds += 1;
                    }
                } else {
                    let mut detail_counters = AppDetailCounters {
                        total_seconds: 1,
                        active_seconds: 0,
                        idle_seconds: 0,
                        segments: None,
                    };
                    if !is_idle {
                        detail_counters.active_seconds = 1;
                        if enable_segments {
                            let segs = detail_counters.segments.get_or_insert_with(Vec::new);
                            add_or_extend_segment(segs, now, max_seg_detail);
                        }
                    } else {
                        detail_counters.idle_seconds = 1;
                    }
                    details_map.insert(detail.clone(), detail_counters);
                }
            }
        }

        // Periodic pruning — every ~60 ticks (≈1 minute)
        self.prune_counter += 1;
        if self.prune_counter >= 60 {
            self.prune_counter = 0;
            self.prune_inactive_candidates(&identity.app_name);
        }
    }

    /// Remove candidate apps that have been inactive longer than `candidate_retention_minutes`
    /// AND have not been promoted (total_seconds < minimum_tracked_seconds).
    /// The currently active app is always preserved.
    fn prune_inactive_candidates(&mut self, current_app: &str) {
        let retention_duration =
            std::time::Duration::from_secs(self.candidate_retention_minutes * 60);
        let threshold = self.minimum_tracked_seconds;
        let now = Instant::now();

        self.apps.retain(|app_name, counters| {
            // Always preserve the currently active app
            if app_name == current_app {
                return true;
            }
            // Promoted apps (above threshold) are never pruned
            if counters.total_seconds >= threshold {
                return true;
            }
            // Prune if inactive longer than retention window
            let inactive_for = now.duration_since(counters.last_active_at);
            if inactive_for > retention_duration {
                log::debug!(
                    "Pruning candidate app '{}' ({}s, inactive {:?})",
                    app_name,
                    counters.total_seconds,
                    inactive_for
                );
                return false;
            }
            true
        });
    }

    pub fn snapshot(&self) -> SyncPayload {
        fn map_segments(segments: Option<&Vec<Segment>>) -> Vec<SegmentPayload> {
            match segments {
                Some(segs) => segs
                    .iter()
                    .map(|s| SegmentPayload {
                        started_at: s
                            .started_at
                            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                        ended_at: s
                            .ended_at
                            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                    })
                    .collect(),
                None => Vec::new(),
            }
        }

        let min_tracked = self.minimum_tracked_seconds;

        SyncPayload {
            total_seconds: self.total_seconds,
            active_seconds: self.active_seconds,
            idle_seconds: self.idle_seconds,
            applications: self
                .apps
                .iter()
                .filter(|(_, c)| c.total_seconds >= min_tracked)
                .map(|(app_name, c)| {
                    let mut details: Vec<_> = match &c.details {
                        Some(detail_map) => detail_map
                            .iter()
                            .filter(|(_, dc)| dc.total_seconds >= 5)
                            .map(|(did, dc)| AppUsageDetailPayload {
                                title: did.title.clone(),
                                url: did.url.clone(),
                                domain: did.domain.clone(),
                                total_seconds: dc.total_seconds,
                                active_seconds: dc.active_seconds,
                                idle_seconds: dc.idle_seconds,
                                segments: map_segments(dc.segments.as_ref()),
                            })
                            .collect(),
                        None => Vec::new(),
                    };

                    // Cap maximum detail entries per application to 50
                    details.sort_by(|a, b| b.total_seconds.cmp(&a.total_seconds));
                    details.truncate(50);

                    // Enforce combined detail segments ≤ maxSegmentsPerApp
                    let max_total_segs = self.max_segments_per_app;
                    let total_detail_segs: usize =
                        details.iter().map(|d| d.segments.len()).sum();
                    if total_detail_segs > max_total_segs {
                        // Details are sorted by importance (most total_seconds first).
                        // Allocate budget to the most important details first.
                        let mut budget = max_total_segs;
                        for d in details.iter_mut() {
                            if d.segments.len() <= budget {
                                budget -= d.segments.len();
                            } else {
                                d.segments.truncate(budget);
                                budget = 0;
                            }
                        }
                    }

                    AppUsagePayload {
                        app_name: app_name.clone(),
                        total_seconds: c.total_seconds,
                        active_seconds: c.active_seconds,
                        idle_seconds: c.idle_seconds,
                        segments: map_segments(c.segments.as_ref()),
                        details,
                    }
                })
                .collect(),
        }
    }
}

/// Thread-safe handle to session analytics.
pub type SharedAnalytics = Arc<Mutex<Option<SessionAnalytics>>>;

/// Creates a new shared analytics handle (starts as None — no active session).
pub fn new_shared() -> SharedAnalytics {
    Arc::new(Mutex::new(None))
}

// ─── Serializable payloads for the server API ───

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPayload {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub applications: Vec<AppUsagePayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SegmentPayload {
    pub started_at: String,
    pub ended_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUsageDetailPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub segments: Vec<SegmentPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUsagePayload {
    pub app_name: String,
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub segments: Vec<SegmentPayload>,
    pub details: Vec<AppUsageDetailPayload>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;

    /// Helper: build a RuntimeConfig for tests with all features enabled.
    fn test_config_all_enabled() -> RuntimeConfig {
        RuntimeConfig {
            sync_interval_seconds: 30,
            sync_jitter_seconds: 5,
            timeout_seconds: 120,
            idle_threshold_seconds: 120,
            enable_details: true,
            enable_segments: true,
            max_segments_per_app: 50,
            max_segments_per_detail: 20,
            minimum_tracked_seconds: 15,
            candidate_retention_minutes: 10,
        }
    }

    /// Helper: build a RuntimeConfig with both features disabled.
    fn test_config_all_disabled() -> RuntimeConfig {
        RuntimeConfig {
            enable_details: false,
            enable_segments: false,
            ..test_config_all_enabled()
        }
    }

    #[test]
    fn test_segment_extension_and_creation() {
        let config = test_config_all_enabled();
        let mut analytics = SessionAnalytics::new(&config);
        let app_id = AppIdentity {
            app_name: "TestApp".to_string(),
            detail: None,
        };

        // Tick 1
        analytics.tick(&app_id, false);
        let segments = analytics.apps.get("TestApp").unwrap().segments.as_ref().unwrap();
        assert_eq!(segments.len(), 1);
        let end1 = segments[0].ended_at;

        // Sleep to simulate time passing (1 sec)
        sleep(Duration::from_secs(1));

        // Tick 2 (should extend)
        analytics.tick(&app_id, false);
        let segments = analytics.apps.get("TestApp").unwrap().segments.as_ref().unwrap();
        assert_eq!(segments.len(), 1);
        let end2 = segments[0].ended_at;
        assert!(end2 > end1);

        // Sleep to simulate long gap (3 secs)
        sleep(Duration::from_secs(3));

        // Tick 3 (should create new segment because gap > 2 secs)
        analytics.tick(&app_id, false);
        let segments = analytics.apps.get("TestApp").unwrap().segments.as_ref().unwrap();
        assert_eq!(segments.len(), 2);
    }

    #[test]
    fn test_segment_eviction_strategy() {
        let mut segments = Vec::new();
        let base_time = chrono::Utc::now();

        // Add 51 segments to trigger eviction
        for i in 0..51 {
            let start = base_time + chrono::Duration::hours(i);
            let end = if i == 10 {
                start // shortest segment (0 duration)
            } else {
                start + chrono::Duration::seconds(5)
            };

            add_or_extend_segment(&mut segments, start, 50);
            segments.last_mut().unwrap().ended_at = end;
        }

        let new_start = base_time + chrono::Duration::hours(52);
        add_or_extend_segment(&mut segments, new_start, 50);

        assert_eq!(segments.len(), 50);
    }

    #[test]
    fn test_details_disabled_no_allocations() {
        let config = RuntimeConfig {
            enable_details: false,
            enable_segments: true,
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);
        let app_id = AppIdentity {
            app_name: "Browser".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some("Some Page".to_string()),
                url: Some("https://example.com".to_string()),
                domain: Some("example.com".to_string()),
            }),
        };

        for _ in 0..20 {
            analytics.tick(&app_id, false);
        }

        let app = analytics.apps.get("Browser").unwrap();
        // Details should be None — zero allocation
        assert!(app.details.is_none());
        // Segments should still work
        assert!(app.segments.is_some());
        assert!(!app.segments.as_ref().unwrap().is_empty());
    }

    #[test]
    fn test_segments_disabled_no_allocations() {
        let config = RuntimeConfig {
            enable_details: true,
            enable_segments: false,
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);
        let app_id = AppIdentity {
            app_name: "Editor".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some("file.rs".to_string()),
                url: None,
                domain: None,
            }),
        };

        for _ in 0..20 {
            analytics.tick(&app_id, false);
        }

        let app = analytics.apps.get("Editor").unwrap();
        // Segments should be None — zero allocation
        assert!(app.segments.is_none());
        // Details should exist
        assert!(app.details.is_some());
        let details = app.details.as_ref().unwrap();
        assert_eq!(details.len(), 1);
        // Detail segments should also be None
        let dc = details.values().next().unwrap();
        assert!(dc.segments.is_none());
    }

    #[test]
    fn test_configurable_segment_eviction() {
        // Use a small limit to verify configurable eviction
        let config = RuntimeConfig {
            max_segments_per_app: 5,
            enable_segments: true,
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);
        // Create 10 segments by introducing gaps
        for i in 0..10u64 {
            // Inject a segment with a large gap to force new segment creation
            let now = chrono::Utc::now() + chrono::Duration::hours(i as i64);
            let app_counters = analytics
                .apps
                .entry("TestApp".to_string())
                .or_insert_with(|| AppCounters::new_with_flags(true, true));
            let segs = app_counters.segments.get_or_insert_with(Vec::new);
            add_or_extend_segment(segs, now, 5);
        }

        let segs = analytics
            .apps
            .get("TestApp")
            .unwrap()
            .segments
            .as_ref()
            .unwrap();
        assert!(segs.len() <= 5);
    }

    #[test]
    fn test_active_segment_protection() {
        let mut segments = Vec::new();
        let base_time = chrono::Utc::now();

        // Fill to limit
        for i in 0..5 {
            let start = base_time + chrono::Duration::hours(i);
            add_or_extend_segment(&mut segments, start, 5);
            // Make all segments short
            segments.last_mut().unwrap().ended_at = segments.last().unwrap().started_at;
        }

        // Add one more to trigger eviction
        let new_start = base_time + chrono::Duration::hours(10);
        add_or_extend_segment(&mut segments, new_start, 5);

        // The last segment (active) should be the newly added one
        assert_eq!(segments.len(), 5);
        let last = segments.last().unwrap();
        assert_eq!(last.started_at, new_start);
    }

    #[test]
    fn test_browser_hierarchy_correctness() {
        let config = test_config_all_enabled();
        let mut analytics = SessionAnalytics::new(&config);

        // Simulate browser with domain normalization —
        // top-level app_name should be "ChatGPT", details hold the page titles
        let app_id = AppIdentity {
            app_name: "ChatGPT".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some("Runtime Config Architecture".to_string()),
                url: None,
                domain: Some("chatgpt.com".to_string()),
            }),
        };
        for _ in 0..20 {
            analytics.tick(&app_id, false);
        }

        let app_id2 = AppIdentity {
            app_name: "ChatGPT".to_string(),
            detail: Some(AppDetailIdentity {
                title: Some("Fixing Chrono Timezones".to_string()),
                url: None,
                domain: Some("chatgpt.com".to_string()),
            }),
        };
        for _ in 0..10 {
            analytics.tick(&app_id2, false);
        }

        // Should be one top-level app "ChatGPT" with 2 details
        assert!(analytics.apps.contains_key("ChatGPT"));
        assert!(!analytics.apps.contains_key("Runtime Config Architecture"));
        let app = analytics.apps.get("ChatGPT").unwrap();
        let details = app.details.as_ref().unwrap();
        assert_eq!(details.len(), 2);
        assert_eq!(app.total_seconds, 30);
    }

    #[test]
    fn test_bounded_memory_detail_segments() {
        let config = RuntimeConfig {
            max_segments_per_detail: 3,
            enable_details: true,
            enable_segments: true,
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);
        let detail = AppDetailIdentity {
            title: Some("page".to_string()),
            url: None,
            domain: None,
        };
        // Add segments with gaps to force many new segments
        for i in 0..10u64 {
            let now = chrono::Utc::now() + chrono::Duration::hours(i as i64);
            let app_counters = analytics
                .apps
                .entry("App".to_string())
                .or_insert_with(|| AppCounters::new_with_flags(true, true));
            let details_map = app_counters.details.get_or_insert_with(HashMap::new);
            let dc = details_map.entry(detail.clone()).or_insert_with(|| AppDetailCounters {
                total_seconds: 0,
                active_seconds: 0,
                idle_seconds: 0,
                segments: Some(Vec::new()),
            });
            let segs = dc.segments.get_or_insert_with(Vec::new);
            add_or_extend_segment(segs, now, 3);
        }

        let dc = analytics
            .apps
            .get("App")
            .unwrap()
            .details
            .as_ref()
            .unwrap()
            .get(&detail)
            .unwrap();
        assert!(dc.segments.as_ref().unwrap().len() <= 3);
    }

    #[test]
    fn test_runtime_config_application() {
        let config = test_config_all_disabled();
        let analytics = SessionAnalytics::new(&config);

        assert!(!analytics.enable_details);
        assert!(!analytics.enable_segments);
        assert_eq!(analytics.max_segments_per_app, 50);
        assert_eq!(analytics.max_segments_per_detail, 20);
        assert_eq!(analytics.minimum_tracked_seconds, 15);
        assert_eq!(analytics.candidate_retention_minutes, 10);
    }

    #[test]
    fn test_segment_reuse_extension() {
        let config = test_config_all_enabled();
        let mut analytics = SessionAnalytics::new(&config);
        let app_id = AppIdentity {
            app_name: "App".to_string(),
            detail: None,
        };

        // Rapid consecutive ticks should extend, not create new segments
        analytics.tick(&app_id, false);
        analytics.tick(&app_id, false);
        analytics.tick(&app_id, false);

        let segs = analytics
            .apps
            .get("App")
            .unwrap()
            .segments
            .as_ref()
            .unwrap();
        assert_eq!(segs.len(), 1, "Consecutive ticks should extend a single segment");
    }

    #[test]
    fn test_candidate_pruning() {
        let config = RuntimeConfig {
            minimum_tracked_seconds: 10,
            candidate_retention_minutes: 0, // immediate pruning for test
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);

        // App with short usage (candidate — below threshold)
        let candidate = AppIdentity {
            app_name: "Transient".to_string(),
            detail: None,
        };
        for _ in 0..3 {
            analytics.tick(&candidate, false);
        }

        // Promoted app (above threshold)
        let promoted = AppIdentity {
            app_name: "MainApp".to_string(),
            detail: None,
        };
        for _ in 0..15 {
            analytics.tick(&promoted, false);
        }

        // Simulate candidate going stale
        if let Some(ac) = analytics.apps.get_mut("Transient") {
            ac.last_active_at = Instant::now() - Duration::from_secs(120);
        }

        // Force pruning by setting counter to 59 and ticking once more
        analytics.prune_counter = 59;
        analytics.tick(&promoted, false);

        // Transient should be pruned, MainApp preserved
        assert!(
            !analytics.apps.contains_key("Transient"),
            "Candidate app should be pruned after retention window"
        );
        assert!(
            analytics.apps.contains_key("MainApp"),
            "Promoted app should be preserved"
        );
    }

    #[test]
    fn test_snapshot_uses_configurable_threshold() {
        let config = RuntimeConfig {
            minimum_tracked_seconds: 5,
            ..test_config_all_enabled()
        };
        let mut analytics = SessionAnalytics::new(&config);

        let app_short = AppIdentity {
            app_name: "Short".to_string(),
            detail: None,
        };
        for _ in 0..3 {
            analytics.tick(&app_short, false);
        }

        let app_long = AppIdentity {
            app_name: "Long".to_string(),
            detail: None,
        };
        for _ in 0..10 {
            analytics.tick(&app_long, false);
        }

        let payload = analytics.snapshot();
        let app_names: Vec<_> = payload.applications.iter().map(|a| &a.app_name).collect();
        assert!(app_names.contains(&&"Long".to_string()));
        assert!(!app_names.contains(&&"Short".to_string()));
    }
}

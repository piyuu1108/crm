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

fn add_or_extend_segment(segments: &mut Vec<Segment>, now: chrono::DateTime<chrono::Utc>) {
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

    if segments.len() > 50 {
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

#[derive(Debug, Clone, Default)]
pub struct AppDetailCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub segments: Vec<Segment>,
}

/// Per-application cumulative counters.
#[derive(Debug, Clone, Default)]
pub struct AppCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub details: HashMap<AppDetailIdentity, AppDetailCounters>,
    pub segments: Vec<Segment>,
}

/// Session-level cumulative analytics held in memory.
#[derive(Debug)]
pub struct SessionAnalytics {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub apps: HashMap<String, AppCounters>,
    pub login_at: Instant,
}

impl SessionAnalytics {
    pub fn new() -> Self {
        Self {
            total_seconds: 0,
            active_seconds: 0,
            idle_seconds: 0,
            apps: HashMap::new(),
            login_at: Instant::now(),
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

        let app_counters = if let Some(ac) = self.apps.get_mut(&identity.app_name) {
            ac
        } else {
            self.apps.insert(identity.app_name.clone(), AppCounters::default());
            self.apps.get_mut(&identity.app_name).unwrap()
        };

        app_counters.total_seconds += 1;
        if !is_idle {
            app_counters.active_seconds += 1;
            add_or_extend_segment(&mut app_counters.segments, now);
        } else {
            app_counters.idle_seconds += 1;
        }

        if let Some(detail) = &identity.detail {
            // Memory bound: Cap details at 100.
            if !app_counters.details.contains_key(detail) && app_counters.details.len() >= 100 {
                // Prune the detail with the lowest total_seconds
                let mut min_key = None;
                let mut min_secs = u64::MAX;
                for (k, v) in app_counters.details.iter() {
                    if v.total_seconds < min_secs {
                        min_secs = v.total_seconds;
                        min_key = Some(k.clone());
                    }
                }
                if let Some(k) = min_key {
                    app_counters.details.remove(&k);
                }
            }

            if let Some(detail_counters) = app_counters.details.get_mut(detail) {
                detail_counters.total_seconds += 1;
                if !is_idle {
                    detail_counters.active_seconds += 1;
                    add_or_extend_segment(&mut detail_counters.segments, now);
                } else {
                    detail_counters.idle_seconds += 1;
                }
            } else {
                let mut detail_counters = AppDetailCounters::default();
                detail_counters.total_seconds += 1;
                if !is_idle {
                    detail_counters.active_seconds += 1;
                    add_or_extend_segment(&mut detail_counters.segments, now);
                } else {
                    detail_counters.idle_seconds += 1;
                }
                app_counters.details.insert(detail.clone(), detail_counters);
            }
        }
    }

    pub fn snapshot(&self) -> SyncPayload {
        fn map_segments(segments: &[Segment]) -> Vec<SegmentPayload> {
            segments
                .iter()
                .map(|s| SegmentPayload {
                    started_at: s.started_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                    ended_at: s.ended_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                })
                .collect()
        }

        SyncPayload {
            total_seconds: self.total_seconds,
            active_seconds: self.active_seconds,
            idle_seconds: self.idle_seconds,
            applications: self
                .apps
                .iter()
                .filter(|(_, c)| c.total_seconds >= 15) // Only send apps with global usage >= 15s
                .map(|(app_name, c)| {
                    let mut details: Vec<_> = c
                        .details
                        .iter()
                        .filter(|(_, dc)| dc.total_seconds >= 5) // Discard transient activities below 5s
                        .map(|(did, dc)| AppUsageDetailPayload {
                            title: did.title.clone(),
                            url: did.url.clone(),
                            domain: did.domain.clone(),
                            total_seconds: dc.total_seconds,
                            active_seconds: dc.active_seconds,
                            idle_seconds: dc.idle_seconds,
                            segments: map_segments(&dc.segments),
                        })
                        .collect();

                    // Cap maximum detail entries per application to 50
                    details.sort_by(|a, b| b.total_seconds.cmp(&a.total_seconds));
                    details.truncate(50);

                    AppUsagePayload {
                        app_name: app_name.clone(),
                        total_seconds: c.total_seconds,
                        active_seconds: c.active_seconds,
                        idle_seconds: c.idle_seconds,
                        segments: map_segments(&c.segments),
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

    #[test]
    fn test_segment_extension_and_creation() {
        let mut analytics = SessionAnalytics::new();
        let app_id = AppIdentity {
            app_name: "TestApp".to_string(),
            detail: None,
        };

        // Tick 1
        analytics.tick(&app_id, false);
        let segments = &analytics.apps.get("TestApp").unwrap().segments;
        assert_eq!(segments.len(), 1);
        let end1 = segments[0].ended_at;

        // Sleep to simulate time passing (1 sec)
        sleep(Duration::from_secs(1));

        // Tick 2 (should extend)
        analytics.tick(&app_id, false);
        let segments = &analytics.apps.get("TestApp").unwrap().segments;
        assert_eq!(segments.len(), 1);
        let end2 = segments[0].ended_at;
        assert!(end2 > end1);

        // Sleep to simulate long gap (3 secs)
        sleep(Duration::from_secs(3));

        // Tick 3 (should create new segment because gap > 2 secs)
        analytics.tick(&app_id, false);
        let segments = &analytics.apps.get("TestApp").unwrap().segments;
        assert_eq!(segments.len(), 2);
    }

    #[test]
    fn test_segment_eviction_strategy() {
        let mut segments = Vec::new();
        let base_time = chrono::Utc::now();
        
        // Add 51 segments to trigger eviction
        for i in 0..51 {
            let start = base_time + chrono::Duration::hours(i);
            // Make segment 10 the shortest (duration 0)
            let end = if i == 10 {
                start
            } else {
                start + chrono::Duration::seconds(5)
            };
            
            // We use add_or_extend_segment with a large enough gap to force new segment
            add_or_extend_segment(&mut segments, start);
            segments.last_mut().unwrap().ended_at = end;
        }

        // Before adding 52nd, segment 10 is the shortest (duration 0)
        // Adding 52nd will trigger eviction of segment 10
        let new_start = base_time + chrono::Duration::hours(52);
        add_or_extend_segment(&mut segments, new_start);
        
        // We should have 50 segments left (51 + 1 - 2? wait, if len > 50, we remove 1, so it stays at 50)
        // Wait, length was 51, add 1 = 52. 52 > 50, removes 1 = 51. Wait, let's check add_or_extend_segment.
        assert_eq!(segments.len(), 50);
    }
}

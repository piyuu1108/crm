use crate::session::RuntimeConfig;
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct AppDetailIdentity {
    pub title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
}

impl std::hash::Hash for AppDetailIdentity {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.url.hash(state);
        self.domain.hash(state);
        if self.url.is_none() && self.domain.is_none() {
            self.title.hash(state);
        }
    }
}

impl PartialEq for AppDetailIdentity {
    fn eq(&self, other: &Self) -> bool {
        if self.url != other.url || self.domain != other.domain {
            return false;
        }
        if self.url.is_none() && self.domain.is_none() {
            return self.title == other.title;
        }
        true
    }
}

impl Eq for AppDetailIdentity {}

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
    pub title: Option<String>,
    pub segments: Option<Vec<Segment>>,
}

#[derive(Debug, Clone)]
pub struct AppCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub details: Option<HashMap<AppDetailIdentity, AppDetailCounters>>,
    pub segments: Option<Vec<Segment>>,
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
    pub enable_details: bool,
    pub enable_segments: bool,
    pub max_segments_per_app: usize,
    pub max_segments_per_detail: usize,
    pub max_details_per_app: usize,
    pub minimum_tracked_seconds: u64,
    pub candidate_retention_minutes: u64,
    prune_counter: u32,
    /// Monotonic sequence number to protect against out-of-order syncs and replays.
    sequence_number: u64,
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
            max_details_per_app: config.max_details_per_app,
            minimum_tracked_seconds: config.minimum_tracked_seconds,
            candidate_retention_minutes: config.candidate_retention_minutes,
            prune_counter: 0,
            sequence_number: 0,
        }
    }

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
            self.apps.insert(
                identity.app_name.clone(),
                AppCounters::new_with_flags(self.enable_details, self.enable_segments),
            );
            self.apps.get_mut(&identity.app_name).unwrap()
        };

        app_counters.last_active_at = Instant::now();
        app_counters.total_seconds += 1;
        if !is_idle {
            app_counters.active_seconds += 1;
            if self.enable_segments && (!self.enable_details || identity.detail.is_none()) {
                let segments = app_counters.segments.get_or_insert_with(Vec::new);
                add_or_extend_segment(segments, now, self.max_segments_per_app);
            }
        } else {
            app_counters.idle_seconds += 1;
        }

        if self.enable_details {
            if let Some(detail) = &identity.detail {
                let details_map = app_counters.details.get_or_insert_with(HashMap::new);
                let mem_cap = self.max_details_per_app.saturating_mul(2);
                if !details_map.contains_key(detail) && details_map.len() >= mem_cap {
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
                    detail_counters.title = detail.title.clone();
                    if !is_idle {
                        detail_counters.active_seconds += 1;
                        if self.enable_segments {
                            let segs = detail_counters.segments.get_or_insert_with(Vec::new);
                            add_or_extend_segment(segs, now, self.max_segments_per_detail);
                        }
                    } else {
                        detail_counters.idle_seconds += 1;
                    }
                } else {
                    let mut detail_counters = AppDetailCounters {
                        total_seconds: 1,
                        active_seconds: 0,
                        idle_seconds: 0,
                        title: detail.title.clone(),
                        segments: None,
                    };
                    if !is_idle {
                        detail_counters.active_seconds = 1;
                        if self.enable_segments {
                            let segs = detail_counters.segments.get_or_insert_with(Vec::new);
                            add_or_extend_segment(segs, now, self.max_segments_per_detail);
                        }
                    } else {
                        detail_counters.idle_seconds = 1;
                    }
                    details_map.insert(detail.clone(), detail_counters);
                }
            }
        }

        self.prune_counter += 1;
        if self.prune_counter >= 60 {
            self.prune_counter = 0;
            self.prune_inactive_candidates(&identity.app_name);
        }
    }

    fn prune_inactive_candidates(&mut self, current_app: &str) {
        let retention_duration =
            std::time::Duration::from_secs(self.candidate_retention_minutes * 60);
        let threshold = self.minimum_tracked_seconds;
        let now = Instant::now();

        self.apps.retain(|app_name, counters| {
            if app_name == current_app { return true; }
            if counters.total_seconds >= threshold { return true; }
            let inactive_for = now.duration_since(counters.last_active_at);
            inactive_for <= retention_duration
        });
    }

    pub fn snapshot(&mut self) -> SyncPayload {
        self.sequence_number += 1;
        let sequence_number = self.sequence_number;

        fn map_segments(segments: Option<&Vec<Segment>>) -> Vec<SegmentPayload> {
            match segments {
                Some(segs) => segs.iter().map(|s| SegmentPayload {
                    started_at: s.started_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                    ended_at: s.ended_at.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
                }).collect(),
                None => Vec::new(),
            }
        }

        SyncPayload {
            sequence_number,
            total_seconds: self.total_seconds,
            active_seconds: self.active_seconds,
            idle_seconds: self.idle_seconds,
            applications: self.apps.iter()
                .filter(|(_, c)| c.total_seconds >= self.minimum_tracked_seconds)
                .map(|(app_name, c)| {
                    let mut details: Vec<_> = match &c.details {
                        Some(map) => map.iter()
                            .filter(|(_, dc)| dc.total_seconds >= 5)
                            .map(|(did, dc)| {
                                let mut detail_segs = map_segments(dc.segments.as_ref());
                                detail_segs.truncate(self.max_segments_per_detail);
                                AppUsageDetailPayload {
                                    title: dc.title.clone(),
                                    url: did.url.clone(),
                                    domain: did.domain.clone(),
                                    total_seconds: dc.total_seconds,
                                    active_seconds: dc.active_seconds,
                                    idle_seconds: dc.idle_seconds,
                                    segments: detail_segs,
                                }
                            }).collect(),
                        None => Vec::new(),
                    };
                    details.sort_by(|a, b| b.total_seconds.cmp(&a.total_seconds));
                    details.truncate(self.max_details_per_app);

                    let mut app_segments = map_segments(c.segments.as_ref());
                    app_segments.truncate(self.max_segments_per_app);

                    AppUsagePayload {
                        app_name: app_name.clone(),
                        total_seconds: c.total_seconds,
                        active_seconds: c.active_seconds,
                        idle_seconds: c.idle_seconds,
                        segments: app_segments,
                        details,
                    }
                }).collect(),
        }
    }
}

pub type SharedAnalytics = Arc<Mutex<Option<SessionAnalytics>>>;

pub fn new_shared() -> SharedAnalytics {
    Arc::new(Mutex::new(None))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPayload {
    pub sequence_number: u64,
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

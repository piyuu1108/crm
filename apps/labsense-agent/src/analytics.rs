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

#[derive(Debug, Clone, Default)]
pub struct AppDetailCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
}

/// Per-application cumulative counters.
#[derive(Debug, Clone, Default)]
pub struct AppCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub details: HashMap<AppDetailIdentity, AppDetailCounters>,
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
    pub fn tick(&mut self, identity: AppIdentity, is_idle: bool) {
        self.total_seconds += 1;
        if !is_idle {
            self.active_seconds += 1;
        } else {
            self.idle_seconds += 1;
        }

        let app_counters = self.apps.entry(identity.app_name).or_default();
        app_counters.total_seconds += 1;
        if !is_idle {
            app_counters.active_seconds += 1;
        } else {
            app_counters.idle_seconds += 1;
        }

        if let Some(detail) = identity.detail {
            let detail_counters = app_counters.details.entry(detail).or_default();
            detail_counters.total_seconds += 1;
            if !is_idle {
                detail_counters.active_seconds += 1;
            } else {
                detail_counters.idle_seconds += 1;
            }
        }
    }

    pub fn snapshot(&self) -> SyncPayload {
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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUsagePayload {
    pub app_name: String,
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub details: Vec<AppUsageDetailPayload>,
}

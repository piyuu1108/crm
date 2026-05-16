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
    pub fn tick(&mut self, identity: &AppIdentity, is_idle: bool) {
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
                } else {
                    detail_counters.idle_seconds += 1;
                }
            } else {
                let mut detail_counters = AppDetailCounters::default();
                detail_counters.total_seconds += 1;
                if !is_idle {
                    detail_counters.active_seconds += 1;
                } else {
                    detail_counters.idle_seconds += 1;
                }
                app_counters.details.insert(detail.clone(), detail_counters);
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

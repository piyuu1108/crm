use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct AppIdentity {
    pub app_name: String,
    pub context_title: Option<String>,
}

/// Per-application cumulative counters.
#[derive(Debug, Clone, Default)]
pub struct AppCounters {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
}


/// Session-level cumulative analytics held in memory.
#[derive(Debug)]
pub struct SessionAnalytics {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub apps: HashMap<AppIdentity, AppCounters>,
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

        let counters = self.apps.entry(identity).or_default();
        counters.total_seconds += 1;
        if !is_idle {
            counters.active_seconds += 1;
        } else {
            counters.idle_seconds += 1;
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
                .map(|(id, c)| AppUsagePayload {
                    app_name: id.app_name.clone(),
                    context_title: id.context_title.clone(),
                    total_seconds: c.total_seconds,
                    active_seconds: c.active_seconds,
                    idle_seconds: c.idle_seconds,
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
pub struct AppUsagePayload {
    pub app_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_title: Option<String>,
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
}

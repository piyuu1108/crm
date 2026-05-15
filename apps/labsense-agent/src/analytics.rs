use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

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
    pub apps: HashMap<String, AppCounters>,
    pub login_at: Instant,
    pub current_app: Option<String>,
}

impl SessionAnalytics {
    pub fn new() -> Self {
        Self {
            total_seconds: 0,
            active_seconds: 0,
            idle_seconds: 0,
            apps: HashMap::new(),
            login_at: Instant::now(),
            current_app: None,
        }
    }

    /// Called every ~1 second by the monitoring loop.
    /// Increments the correct counters based on the current app and idle state.
    pub fn tick(&mut self, app_name: &str, is_idle: bool) {
        self.total_seconds += 1;
        self.current_app = Some(app_name.to_string());

        let counters = self.apps.entry(app_name.to_string()).or_default();
        counters.total_seconds += 1;

        if is_idle {
            self.idle_seconds += 1;
            counters.idle_seconds += 1;
        } else {
            self.active_seconds += 1;
            counters.active_seconds += 1;
        }
    }

    /// Build a snapshot of the current cumulative analytics for sync.
    pub fn snapshot(&self) -> SyncPayload {
        SyncPayload {
            total_seconds: self.total_seconds,
            active_seconds: self.active_seconds,
            idle_seconds: self.idle_seconds,
            applications: self
                .apps
                .iter()
                .map(|(name, c)| AppUsagePayload {
                    app_name: name.clone(),
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
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
}

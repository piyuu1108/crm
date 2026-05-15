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

#[derive(Debug, Clone)]
pub struct PendingActivity {
    pub identity: AppIdentity,
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub is_committed: bool,
}

/// Session-level cumulative analytics held in memory.
#[derive(Debug)]
pub struct SessionAnalytics {
    pub total_seconds: u64,
    pub active_seconds: u64,
    pub idle_seconds: u64,
    pub apps: HashMap<AppIdentity, AppCounters>,
    pub login_at: Instant,
    pub pending_app: Option<PendingActivity>,
}

impl SessionAnalytics {
    pub fn new() -> Self {
        Self {
            total_seconds: 0,
            active_seconds: 0,
            idle_seconds: 0,
            apps: HashMap::new(),
            login_at: Instant::now(),
            pending_app: None,
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

        // Check if identity matches pending
        let matches_pending = self
            .pending_app
            .as_ref()
            .map(|p| p.identity == identity)
            .unwrap_or(false);

        if !matches_pending {
            // Identity changed. Discard uncommitted pending activity.
            self.pending_app = Some(PendingActivity {
                identity: identity.clone(),
                total_seconds: 0,
                active_seconds: 0,
                idle_seconds: 0,
                is_committed: false,
            });
        }

        if let Some(ref mut pending) = self.pending_app {
            pending.total_seconds += 1;
            if is_idle {
                pending.idle_seconds += 1;
            } else {
                pending.active_seconds += 1;
            }

            if pending.total_seconds >= 15 {
                if !pending.is_committed {
                    // Just reached 15 seconds: flush all accumulated pending time to apps
                    let counters = self.apps.entry(pending.identity.clone()).or_default();
                    counters.total_seconds += pending.total_seconds;
                    counters.active_seconds += pending.active_seconds;
                    counters.idle_seconds += pending.idle_seconds;
                    pending.is_committed = true;
                } else {
                    // Already committed, increment apps directly
                    let counters = self.apps.entry(pending.identity.clone()).or_default();
                    counters.total_seconds += 1;
                    if is_idle {
                        counters.idle_seconds += 1;
                    } else {
                        counters.active_seconds += 1;
                    }
                }
            }
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

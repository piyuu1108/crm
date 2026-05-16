use crate::api_client::LoginResponse;
use parking_lot::Mutex;
use std::sync::Arc;
use tokio::sync::Notify;

/// Runtime configuration received from the server after login.
#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub sync_interval_seconds: u64,
    pub sync_jitter_seconds: u64,
    pub timeout_seconds: u64,
    pub idle_threshold_seconds: u64,
    pub enable_details: bool,
    pub enable_segments: bool,
    pub max_segments_per_app: usize,
    pub max_segments_per_detail: usize,
    pub minimum_tracked_seconds: u64,
    pub candidate_retention_minutes: u64,
}

impl From<&LoginResponse> for RuntimeConfig {
    fn from(resp: &LoginResponse) -> Self {
        Self {
            sync_interval_seconds: resp.sync_interval_seconds,
            sync_jitter_seconds: resp.sync_jitter_seconds,
            timeout_seconds: resp.timeout_seconds,
            idle_threshold_seconds: resp.idle_threshold_seconds,
            enable_details: resp.enable_details,
            enable_segments: resp.enable_segments,
            max_segments_per_app: resp.max_segments_per_app,
            max_segments_per_detail: resp.max_segments_per_detail,
            minimum_tracked_seconds: resp.minimum_tracked_seconds,
            candidate_retention_minutes: resp.candidate_retention_minutes,
        }
    }
}

/// Current session state.
#[derive(Debug, Clone, PartialEq)]
pub enum SessionState {
    Idle,
    Active,
}

/// Session manager — holds the active session info and shared analytics.
pub struct Session {
    pub state: SessionState,
    pub session_id: Option<String>,
    pub student_id: Option<String>,
    pub runtime_config: Option<RuntimeConfig>,
}

impl Session {
    pub fn new() -> Self {
        Self {
            state: SessionState::Idle,
            session_id: None,
            student_id: None,
            runtime_config: None,
        }
    }

    /// Transition to active after successful login.
    pub fn activate(&mut self, session_id: String, student_id: String, config: RuntimeConfig) {
        self.state = SessionState::Active;
        self.session_id = Some(session_id);
        self.student_id = Some(student_id);
        self.runtime_config = Some(config);
    }

    /// Reset to idle after logout or error.
    pub fn deactivate(&mut self) {
        self.state = SessionState::Idle;
        self.session_id = None;
        self.student_id = None;
        self.runtime_config = None;
    }

    pub fn is_active(&self) -> bool {
        self.state == SessionState::Active
    }
}

/// Thread-safe session handle shared between web UI, sync loop, and monitor.
pub type SharedSession = Arc<Mutex<Session>>;

/// Create a new shared session.
pub fn new_shared() -> SharedSession {
    Arc::new(Mutex::new(Session::new()))
}

/// Notification handle to signal the sync/monitor loops to stop.
pub type StopSignal = Arc<Notify>;

pub fn new_stop_signal() -> StopSignal {
    Arc::new(Notify::new())
}

use crate::analytics::SharedAnalytics;
use crate::monitor::{foreground, idle, normalizer};
use crate::session::{SharedSession, StopSignal};
use std::time::Duration;
use sysinfo::System;

/// Starts the foreground application monitoring loop in a background task.
/// Polls every ~1 second, updates cumulative analytics counters.
pub fn start(
    session: SharedSession,
    analytics: SharedAnalytics,
    stop_signal: StopSignal,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        log::info!("Monitor loop started");
        let mut sys = System::new();

        loop {
            // Wait ~1 second or stop signal
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(1)) => {},
                _ = stop_signal.notified() => {
                    log::info!("Monitor loop: stop signal received");
                    break;
                }
            }

            // Check session is still active
            let idle_threshold = {
                let sess = session.lock();
                if !sess.is_active() {
                    log::info!("Monitor loop: session no longer active, exiting");
                    break;
                }
                sess.runtime_config
                    .as_ref()
                    .map(|c| c.idle_threshold_seconds)
                    .unwrap_or(120)
            };

            // Detect foreground application
            let app = foreground::get_foreground_app(&mut sys);

            // Detect idle state
            let user_is_idle = idle::is_idle(idle_threshold);

            // Update analytics
            if let Some(app) = app {
                let normalized_name = normalizer::normalize(&app);
                let mut guard = analytics.lock();
                if let Some(ref mut a) = *guard {
                    a.tick(&normalized_name, user_is_idle);
                }
            } else {
                // No foreground window — still count time
                let mut guard = analytics.lock();
                if let Some(ref mut a) = *guard {
                    a.tick("Desktop", user_is_idle);
                }
            }
        }

        log::info!("Monitor loop exited");
    })
}

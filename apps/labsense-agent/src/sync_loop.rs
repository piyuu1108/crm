use crate::analytics::SharedAnalytics;
use crate::api_client::{AgentError, ApiClient};
use crate::session::{SharedSession, StopSignal};
use rand::Rng;
use std::time::Duration;

/// Starts the periodic sync loop in a background task.
/// Runs until stop_signal is notified or the session is no longer active.
pub fn start(
    api_client: ApiClient,
    session: SharedSession,
    analytics: SharedAnalytics,
    stop_signal: StopSignal,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        log::info!("Sync loop started");

        loop {
            // Read sync config
            let (session_id, interval, jitter) = {
                let sess = session.lock();
                if !sess.is_active() {
                    log::info!("Sync loop: session no longer active, exiting");
                    break;
                }
                let config = sess.runtime_config.as_ref().unwrap();
                (
                    sess.session_id.clone().unwrap(),
                    config.sync_interval_seconds,
                    config.sync_jitter_seconds,
                )
            };

            // Sleep for interval + random jitter
            let jitter_amount = if jitter > 0 {
                rand::thread_rng().gen_range(0..=jitter)
            } else {
                0
            };
            let sleep_duration = Duration::from_secs(interval + jitter_amount);

            // Wait for either sleep to complete or stop signal
            tokio::select! {
                _ = tokio::time::sleep(sleep_duration) => {},
                _ = stop_signal.notified() => {
                    log::info!("Sync loop: stop signal received");
                    break;
                }
            }

            // Check session is still active after sleeping
            {
                let sess = session.lock();
                if !sess.is_active() {
                    break;
                }
            }

            // Build sync payload from cumulative analytics
            let payload = {
                let guard = analytics.lock();
                match guard.as_ref() {
                    Some(a) => a.snapshot(),
                    None => {
                        log::warn!("Sync loop: no analytics data, skipping");
                        continue;
                    }
                }
            };

            // Debug: log payload summary before sending
            for app in &payload.applications {
                log::info!(
                    "[sync] app='{}' total={}s segments={} details={}",
                    app.app_name,
                    app.total_seconds,
                    app.segments.len(),
                    app.details.len()
                );
                for d in &app.details {
                    log::info!(
                        "[sync]   detail title={:?} domain={:?} total={}s segments={}",
                        d.title,
                        d.domain,
                        d.total_seconds,
                        d.segments.len()
                    );
                }
            }

            // Send sync to server
            match api_client.sync(&session_id, payload).await {
                Ok(()) => {
                    log::info!("Sync successful");
                }
                Err(AgentError::Conflict(msg)) => {
                    log::warn!("Session ended server-side: {}", msg);
                    session.lock().deactivate();
                    *analytics.lock() = None;
                    break;
                }
                Err(AgentError::NotFound(msg)) => {
                    log::warn!("Session lost: {}", msg);
                    session.lock().deactivate();
                    *analytics.lock() = None;
                    break;
                }
                Err(e) => {
                    log::warn!("Sync failed (will retry): {}", e);
                    // Continue to next cycle — server timeout will eventually catch up
                }
            }
        }

        log::info!("Sync loop exited");
    })
}

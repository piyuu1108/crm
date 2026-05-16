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
            // Fetch AES key along with session ID
            let (session_id, aes_key, interval, jitter) = {
                let sess = session.lock();
                if !sess.is_active() {
                    log::info!("Sync loop: session no longer active, exiting");
                    break;
                }
                let config = sess.runtime_config.as_ref().unwrap();
                (
                    sess.session_id.clone().unwrap(),
                    sess.session_aes_key.unwrap(),
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

            let mut current_session_id = session_id;
            let mut current_aes_key = aes_key;

            loop {
                // Send sync to server
                match api_client.sync(&current_session_id, &current_aes_key, payload.clone()).await {
                    Ok(()) => {
                        log::info!("Sync successful");
                        break;
                    }
                    Err(AgentError::Unauthorized(msg)) => {
                        log::warn!("Sync Unauthorized (401): {}. Triggering self-healing loop.", msg);
                        let mut backoff_secs = 15;
                        loop {
                            let (college_id, password) = {
                                let sess = session.lock();
                                (
                                    sess.student_id.clone().unwrap_or_default(),
                                    sess.student_password.clone().unwrap_or_default(),
                                )
                            };
                            
                            let config = crate::config::AgentConfig::load().unwrap_or_else(|_| crate::config::AgentConfig {
                                server_url: String::new(),
                                pc_name: String::new(),
                                lab_name: None,
                            });

                            let req = crate::api_client::LoginRequest {
                                college_id,
                                password,
                                session_aes_key: String::new(),
                                hardware_id: crate::hardware::get_hardware_id(),
                                pc_name: config.pc_name,
                                lab_name: config.lab_name,
                            };

                            match api_client.login(req).await {
                                Ok((resp, new_aes_key)) => {
                                    log::info!("Self-healing successful. New session: {}", resp.session_id);
                                    let mut sess = session.lock();
                                    sess.session_id = Some(resp.session_id.clone());
                                    sess.session_aes_key = Some(new_aes_key);
                                    
                                    current_session_id = resp.session_id;
                                    current_aes_key = new_aes_key;
                                    break;
                                }
                                Err(e) => {
                                    log::warn!("Self-healing login failed: {}. Retrying in {}s", e, backoff_secs);
                                    tokio::time::sleep(Duration::from_secs(backoff_secs)).await;
                                    backoff_secs = std::cmp::min(backoff_secs * 2, 60);
                                }
                            }
                        }
                        // Inner loop broken: we have a new session, outer loop will immediately retry sync
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
                        log::warn!("Sync failed (will retry next cycle): {}", e);
                        break; // Continue to next cycle
                    }
                }
            }
        }

        log::info!("Sync loop exited");
    })
}

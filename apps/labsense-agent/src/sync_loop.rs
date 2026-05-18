use crate::analytics::SharedAnalytics;
use crate::api_client::{AgentError, ApiClient};
use crate::session::{SharedSession, StopSignal, SchedulingMode};
use rand::Rng;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Deterministically calculates a stable offset in seconds [0, interval) for a machine.
fn calculate_offset(hardware_id: &str, interval: u64) -> u64 {
    if interval == 0 { return 0; }
    let mut hasher = DefaultHasher::new();
    hardware_id.hash(&mut hasher);
    hasher.finish() % interval
}

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
        
        let hardware_id = crate::hardware::get_hardware_id();

        loop {
            // Fetch sync config from session
            let (session_id, aes_key, interval, jitter, mode) = {
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
                    config.scheduling_mode.clone(),
                )
            };

            // Calculate sleep duration based on scheduling mode
            let sleep_duration = match mode {
                SchedulingMode::DeterministicSlot => {
                    let now_unix = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    
                    let offset = calculate_offset(&hardware_id, interval);
                    
                    // Find the next UTC-aligned second that matches our offset
                    // If now=100, interval=30, offset=5:
                    // 100 / 30 = 3. 3 * 30 + 5 = 95. (95 <= 100, so target=125)
                    let mut target_unix = (now_unix / interval) * interval + offset;
                    if target_unix <= now_unix {
                        target_unix += interval;
                    }
                    
                    let diff = target_unix - now_unix;
                    
                    // Add 0-1000ms micro-jitter to prevent perfect sub-second alignment
                    // (prevents TCP handshake "thundering herds" on the Node.js event loop)
                    let micro_jitter_ms = rand::thread_rng().gen_range(0..1000);
                    
                    log::debug!("Next deterministic sync slot in {}s (offset={}s, jitter={}ms)", diff, offset, micro_jitter_ms);
                    Duration::from_millis((diff * 1000) + micro_jitter_ms)
                }
                SchedulingMode::RandomJitter => {
                    let jitter_amount = if jitter > 0 {
                        rand::thread_rng().gen_range(0..=jitter)
                    } else {
                        0
                    };
                    Duration::from_secs(interval + jitter_amount)
                }
            };

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
                let mut guard = analytics.lock();
                match guard.as_mut() {
                    Some(a) => a.snapshot(),
                    None => {
                        log::warn!("Sync loop: no analytics data, skipping");
                        continue;
                    }
                }
            };

            let mut current_session_id = session_id;
            let mut current_aes_key = aes_key;
            let mut retry_count = 0;

            loop {
                // Send sync to server
                match api_client.sync(&current_session_id, &current_aes_key, payload.clone()).await {
                    Ok(()) => {
                        log::info!("Sync successful");
                        break;
                    }
                    Err(AgentError::Unauthorized(msg)) => {
                        retry_count += 1;
                        if retry_count > 3 {
                            log::warn!("Sync Unauthorized (401) persists. Max retries exceeded. Skipping cycle.");
                            break;
                        }

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
                                    
                                    if let Some(a) = analytics.lock().as_mut() {
                                        a.reset_sequence_number();
                                    }
                                    
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

use crate::analytics::{SharedAnalytics, AppIdentity};
use crate::monitor::{foreground, idle, normalizer, uia};
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
        
        // Initialize COM for UIAutomation on this thread
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(
                None,
                windows::Win32::System::Com::COINIT_MULTITHREADED,
            );
        }

        let mut sys = System::new();

        struct WindowCache {
            hwnd: isize,
            title: String,
            domain: Option<String>,
            identity: AppIdentity,
        }

        let mut cache: Option<WindowCache> = None;

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
                let identity = if let Some(ref c) = cache {
                    if c.hwnd == app.hwnd && c.title == app.window_title {
                        // Window hasn't changed, reuse cached identity
                        Some(c.identity.clone())
                    } else {
                        None
                    }
                } else {
                    None
                };

                let identity = if let Some(id) = identity {
                    id
                } else {
                    // Cache miss or window changed
                    let _is_browser = normalizer::normalize(&app, None).app_name != app.process_name
                        && !app.process_name.is_empty(); 
                    
                    // A better check for browser is just passing domain, the normalizer handles it.
                    // But we only want to extract URL if it's a browser.
                    let process_lower = app.process_name.to_lowercase();
                    let is_browser = ["chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe", "vivaldi.exe", "iexplore.exe", "chromium.exe"]
                        .contains(&process_lower.as_str());

                    let domain = if is_browser {
                        uia::extract_browser_url(app.hwnd)
                    } else {
                        None
                    };

                    let new_identity = normalizer::normalize(&app, domain.as_deref());

                    cache = Some(WindowCache {
                        hwnd: app.hwnd,
                        title: app.window_title.clone(),
                        domain,
                        identity: new_identity.clone(),
                    });

                    new_identity
                };

                let mut guard = analytics.lock();
                if let Some(ref mut a) = *guard {
                    a.tick(identity, user_is_idle);
                }
            } else {
                // No foreground window — still count time
                let mut guard = analytics.lock();
                if let Some(ref mut a) = *guard {
                    a.tick(AppIdentity { app_name: "Desktop".to_string(), context_title: None }, user_is_idle);
                }
            }
        }

        log::info!("Monitor loop exited");
    })
}

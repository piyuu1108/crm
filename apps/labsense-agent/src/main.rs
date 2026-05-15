mod analytics;
mod api_client;
mod config;
mod hardware;
mod monitor;
mod monitor_loop;
mod session;
mod service;
mod sync_loop;
mod web_ui;

use config::AgentConfig;

/// Main entry point.
///
/// - Default (no args): runs in **console mode** — useful for development & debugging.
/// - With `--service` flag: runs as a **Windows service** registered with SCM.
fn main() {
    // Initialize logging
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_secs()
        .init();

    let args: Vec<String> = std::env::args().collect();

    if args.iter().any(|a| a == "--service") {
        // Windows service mode
        log::info!("Starting in Windows service mode");
        if let Err(e) = service::run() {
            log::error!("Service error: {}", e);
            std::process::exit(1);
        }
    } else {
        // Console mode (development / manual run)
        log::info!("Starting in console mode");
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(run_agent(true)); // true = open browser
    }
}

/// Core agent logic — used by both console mode and service mode.
///
/// `open_browser`: if true, auto-opens http://127.0.0.1:21211 in the default browser on startup.
pub async fn run_agent(open_browser: bool) {
    // Load local configuration
    let config = match AgentConfig::load() {
        Ok(c) => {
            log::info!("Config loaded: server={}, pc={}", c.server_url, c.pc_name);
            c
        }
        Err(e) => {
            log::error!("Failed to load config: {}", e);
            log::error!("Create a config.json with: {{ \"serverUrl\": \"http://...\", \"pcName\": \"...\" }}");
            return;
        }
    };

    // Create API client
    let api_client = api_client::ApiClient::new(&config.server_url);

    // Create shared state
    let session = session::new_shared();
    let analytics_state = analytics::new_shared();

    // Auto-open browser if in console mode
    if open_browser {
        log::info!("Opening browser at http://127.0.0.1:21211");
        if let Err(e) = open::that("http://127.0.0.1:21211") {
            log::warn!("Could not open browser automatically: {}", e);
        }
    }

    // Start the local web UI server (this blocks forever)
    web_ui::start(config, api_client, session, analytics_state).await;
}

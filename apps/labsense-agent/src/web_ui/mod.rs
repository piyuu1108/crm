pub mod routes;

use crate::analytics::SharedAnalytics;
use crate::api_client::ApiClient;
use crate::config::AgentConfig;
use crate::session::SharedSession;

/// Start the local web UI server on 127.0.0.1:21211.
pub async fn start(
    config: AgentConfig,
    api_client: ApiClient,
    session: SharedSession,
    analytics: SharedAnalytics,
) {
    let routes = routes::all(config, api_client, session, analytics);

    log::info!("Local web UI running at http://127.0.0.1:21211");

    warp::serve(routes).run(([127, 0, 0, 1], 21211)).await;
}

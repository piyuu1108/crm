use crate::analytics::{SessionAnalytics, SharedAnalytics};
use crate::api_client::{AgentError, ApiClient, LoginRequest};
use crate::config::AgentConfig;
use crate::hardware;
use crate::session::{self, RuntimeConfig, SharedSession};
use crate::{monitor_loop, sync_loop};
use rust_embed::Embed;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use warp::http::header::CONTENT_TYPE;
use warp::http::Response;
use warp::Filter;

/// Embedded static files (HTML, CSS, JS) compiled into the binary.
#[derive(Embed)]
#[folder = "src/web_ui/static/"]
struct StaticAssets;

/// Build all routes for the local web UI.
pub fn all(
    config: AgentConfig,
    api_client: ApiClient,
    session: SharedSession,
    analytics: SharedAnalytics,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let config = Arc::new(config);

    let index = warp::path::end().and(warp::get()).map(|| {
        match StaticAssets::get("index.html") {
            Some(content) => Response::builder()
                .header(CONTENT_TYPE, "text/html; charset=utf-8")
                .body(content.data.to_vec())
                .unwrap(),
            None => Response::builder()
                .status(404)
                .body(b"Not Found".to_vec())
                .unwrap(),
        }
    });

    let static_files = warp::path("static")
        .and(warp::path::tail())
        .and(warp::get())
        .map(|tail: warp::path::Tail| {
            let path = tail.as_str();
            match StaticAssets::get(path) {
                Some(content) => {
                    let mime = mime_guess::from_path(path)
                        .first_or_octet_stream()
                        .to_string();
                    Response::builder()
                        .header(CONTENT_TYPE, mime)
                        .body(content.data.to_vec())
                        .unwrap()
                }
                None => Response::builder()
                    .status(404)
                    .body(b"Not Found".to_vec())
                    .unwrap(),
            }
        });

    let login = {
        let config = config.clone();
        let api_client = api_client.clone();
        let session = session.clone();
        let analytics = analytics.clone();

        warp::path!("api" / "login")
            .and(warp::post())
            .and(warp::body::json())
            .and_then(move |body: LoginBody| {
                let config = config.clone();
                let api_client = api_client.clone();
                let session = session.clone();
                let analytics = analytics.clone();

                async move {
                    handle_login(body, config, api_client, session, analytics).await
                }
            })
    };

    let logout = {
        let api_client = api_client.clone();
        let session = session.clone();
        let analytics = analytics.clone();

        warp::path!("api" / "logout")
            .and(warp::post())
            .and_then(move || {
                let api_client = api_client.clone();
                let session = session.clone();
                let analytics = analytics.clone();

                async move { handle_logout(api_client, session, analytics).await }
            })
    };

    let status = {
        let session = session.clone();
        let analytics = analytics.clone();

        warp::path!("api" / "status")
            .and(warp::get())
            .and_then(move || {
                let session = session.clone();
                let analytics = analytics.clone();

                async move { handle_status(session, analytics).await }
            })
    };

    index.or(static_files).or(login).or(logout).or(status)
}

// ─── Request/Response types ───

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginBody {
    college_id: String,
    password: String,
}

#[derive(Serialize)]
struct JsonSuccess {
    success: bool,
}

#[derive(Serialize)]
struct JsonError {
    error: String,
}

#[derive(Serialize)]
struct StatusResponse {
    state: String,
}

// ─── Handlers ───

async fn handle_login(
    body: LoginBody,
    config: Arc<AgentConfig>,
    api_client: ApiClient,
    session: SharedSession,
    analytics: SharedAnalytics,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Check not already logged in
    {
        let sess = session.lock();
        if sess.is_active() {
            return Ok(warp::reply::with_status(
                warp::reply::json(&JsonError {
                    error: "Already logged in. Log out first.".to_string(),
                }),
                warp::http::StatusCode::CONFLICT,
            ));
        }
    }

    let hardware_id = hardware::get_hardware_id();

    let req = LoginRequest {
        college_id: body.college_id.clone(),
        password: body.password,
        hardware_id,
        pc_name: config.pc_name.clone(),
        lab_name: config.lab_name.clone(),
    };

    match api_client.login(req).await {
        Ok(resp) => {
            let runtime_config = RuntimeConfig::from(&resp);

            // Initialize analytics
            {
                let mut guard = analytics.lock();
                *guard = Some(SessionAnalytics::new());
            }

            // Activate session
            {
                let mut sess = session.lock();
                sess.activate(resp.session_id.clone(), body.college_id, runtime_config);
            }

            // Start monitor and sync loops
            let stop = session::new_stop_signal();
            monitor_loop::start(session.clone(), analytics.clone(), stop.clone());
            sync_loop::start(api_client.clone(), session.clone(), analytics.clone(), stop);

            Ok(warp::reply::with_status(
                warp::reply::json(&JsonSuccess { success: true }),
                warp::http::StatusCode::OK,
            ))
        }
        Err(AgentError::Unauthorized(msg)) => Ok(warp::reply::with_status(
            warp::reply::json(&JsonError { error: msg }),
            warp::http::StatusCode::UNAUTHORIZED,
        )),
        Err(AgentError::Forbidden(msg)) => Ok(warp::reply::with_status(
            warp::reply::json(&JsonError { error: msg }),
            warp::http::StatusCode::FORBIDDEN,
        )),
        Err(AgentError::BadRequest(msg)) => Ok(warp::reply::with_status(
            warp::reply::json(&JsonError { error: msg }),
            warp::http::StatusCode::BAD_REQUEST,
        )),
        Err(e) => Ok(warp::reply::with_status(
            warp::reply::json(&JsonError {
                error: format!("Server error: {}", e),
            }),
            warp::http::StatusCode::BAD_GATEWAY,
        )),
    }
}

async fn handle_logout(
    api_client: ApiClient,
    session: SharedSession,
    analytics: SharedAnalytics,
) -> Result<impl warp::Reply, warp::Rejection> {
    let session_id = {
        let sess = session.lock();
        if !sess.is_active() {
            return Ok(warp::reply::with_status(
                warp::reply::json(&JsonSuccess { success: true }),
                warp::http::StatusCode::OK,
            ));
        }
        sess.session_id.clone().unwrap()
    };

    // Send final sync before logout — extract payload first, then drop the lock
    let final_payload = {
        let guard = analytics.lock();
        guard.as_ref().map(|a| a.snapshot())
    };
    if let Some(payload) = final_payload {
        let _ = api_client.sync(&session_id, payload).await;
    }

    // Call server logout
    let _ = api_client.logout(&session_id).await;

    // Clean up local state
    session.lock().deactivate();
    *analytics.lock() = None;

    Ok(warp::reply::with_status(
        warp::reply::json(&JsonSuccess { success: true }),
        warp::http::StatusCode::OK,
    ))
}

async fn handle_status(
    session: SharedSession,
    _analytics: SharedAnalytics,
) -> Result<impl warp::Reply, warp::Rejection> {
    let sess = session.lock();
    let state = if sess.is_active() { "active" } else { "idle" };

    Ok(warp::reply::json(&StatusResponse {
        state: state.to_string(),
    }))
}


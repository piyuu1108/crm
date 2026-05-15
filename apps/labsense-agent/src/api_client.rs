use crate::analytics::SyncPayload;
use serde::{Deserialize, Serialize};

/// HTTP client for the LabSense server API.
#[derive(Clone)]
pub struct ApiClient {
    client: reqwest::Client,
    base_url: String,
}

// ─── Request / Response types ───

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub college_id: String,
    pub password: String,
    pub hardware_id: String,
    pub pc_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lab_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub session_id: String,
    pub sync_interval_seconds: u64,
    pub sync_jitter_seconds: u64,
    pub timeout_seconds: u64,
    pub idle_threshold: u64,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// Typed agent errors from the server API.
#[derive(Debug)]
pub enum AgentError {
    /// 400 — bad request / validation
    BadRequest(String),
    /// 401 — invalid credentials
    Unauthorized(String),
    /// 403 — account inactive
    Forbidden(String),
    /// 404 — session not found
    NotFound(String),
    /// 409 — session already completed
    Conflict(String),
    /// Network or deserialization error
    Network(String),
}

impl std::fmt::Display for AgentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentError::BadRequest(msg) => write!(f, "Bad Request: {}", msg),
            AgentError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            AgentError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            AgentError::NotFound(msg) => write!(f, "Not Found: {}", msg),
            AgentError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            AgentError::Network(msg) => write!(f, "Network Error: {}", msg),
        }
    }
}

impl ApiClient {
    pub fn new(base_url: &str) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    /// POST /api/agent/login — authenticate student and create session.
    pub async fn login(&self, req: LoginRequest) -> Result<LoginResponse, AgentError> {
        let url = format!("{}/api/agent/login", self.base_url);
        log::info!("POST {} (student: {})", url, req.college_id);

        let resp = self
            .client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;

        let status = resp.status().as_u16();
        match status {
            200 => {
                let body = resp
                    .json::<LoginResponse>()
                    .await
                    .map_err(|e| AgentError::Network(e.to_string()))?;
                log::info!("Login successful — session: {}", body.session_id);
                Ok(body)
            }
            400 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Bad request".to_string(),
                });
                Err(AgentError::BadRequest(body.error))
            }
            401 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Invalid credentials".to_string(),
                });
                Err(AgentError::Unauthorized(body.error))
            }
            403 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Account inactive".to_string(),
                });
                Err(AgentError::Forbidden(body.error))
            }
            _ => {
                let text = resp.text().await.unwrap_or_default();
                Err(AgentError::Network(format!("HTTP {}: {}", status, text)))
            }
        }
    }

    /// PATCH /api/sessions/:id — send cumulative analytics sync.
    pub async fn sync(
        &self,
        session_id: &str,
        payload: SyncPayload,
    ) -> Result<(), AgentError> {
        let url = format!("{}/api/sessions/{}", self.base_url, session_id);
        log::debug!("PATCH {} (total={}s, active={}s)", url, payload.total_seconds, payload.active_seconds);

        let resp = self
            .client
            .patch(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;

        let status = resp.status().as_u16();
        match status {
            200 => Ok(()),
            400 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Bad request".to_string(),
                });
                Err(AgentError::BadRequest(body.error))
            }
            404 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Session not found".to_string(),
                });
                Err(AgentError::NotFound(body.error))
            }
            409 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Session already completed".to_string(),
                });
                Err(AgentError::Conflict(body.error))
            }
            _ => {
                let text = resp.text().await.unwrap_or_default();
                Err(AgentError::Network(format!("HTTP {}: {}", status, text)))
            }
        }
    }

    /// POST /api/sessions/:id/logout — end session normally.
    pub async fn logout(&self, session_id: &str) -> Result<(), AgentError> {
        let url = format!("{}/api/sessions/{}/logout", self.base_url, session_id);
        log::info!("POST {} (logout)", url);

        let resp = self
            .client
            .post(&url)
            .send()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;

        let status = resp.status().as_u16();
        match status {
            200 => {
                log::info!("Logout successful");
                Ok(())
            }
            400 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Bad request".to_string(),
                });
                Err(AgentError::BadRequest(body.error))
            }
            404 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Session not found".to_string(),
                });
                Err(AgentError::NotFound(body.error))
            }
            409 => {
                let body = resp.json::<ErrorResponse>().await.unwrap_or(ErrorResponse {
                    error: "Session already completed".to_string(),
                });
                Err(AgentError::Conflict(body.error))
            }
            _ => {
                let text = resp.text().await.unwrap_or_default();
                Err(AgentError::Network(format!("HTTP {}: {}", status, text)))
            }
        }
    }
}

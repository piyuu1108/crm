use crate::analytics::SyncPayload;
use crate::session::SchedulingMode;
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
pub struct HybridLoginPayload {
    pub encrypted_key: String,
    pub payload: String,
}

#[derive(Debug, Deserialize)]
pub struct HandshakeResponse {
    pub challenge: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InnerLoginJson {
    pub college_id: String,
    pub password: String,
    pub hardware_id: String,
    pub pc_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lab_name: Option<String>,
    pub session_aes_key: String,
    pub nonce: String,
}

#[derive(Debug, Serialize)]
pub struct SyncRequestPayload {
    #[serde(rename = "syncToken")]
    pub sync_token: String,
    pub payload: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub college_id: String,
    pub password: String,
    pub session_aes_key: String,
    pub hardware_id: String,
    pub pc_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lab_name: Option<String>,
}

fn default_false() -> bool { false }
fn default_scheduling_mode() -> SchedulingMode { SchedulingMode::DeterministicSlot }
fn default_max_segments_per_app() -> usize { 50 }
fn default_max_segments_per_detail() -> usize { 20 }
fn default_max_details_per_app() -> usize { 50 }
fn default_minimum_tracked_seconds() -> u64 { 15 }
fn default_candidate_retention_minutes() -> u64 { 10 }

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub session_id: String,
    pub sync_interval_seconds: u64,
    pub sync_jitter_seconds: u64,
    #[serde(default = "default_scheduling_mode")]
    pub scheduling_mode: SchedulingMode,
    pub timeout_seconds: u64,
    pub idle_threshold_seconds: u64,
    #[serde(default = "default_false")]
    pub enable_details: bool,
    #[serde(default = "default_false")]
    pub enable_segments: bool,
    #[serde(default = "default_max_segments_per_app")]
    pub max_segments_per_app: usize,
    #[serde(default = "default_max_segments_per_detail")]
    pub max_segments_per_detail: usize,
    #[serde(default = "default_max_details_per_app")]
    pub max_details_per_app: usize,
    #[serde(default = "default_minimum_tracked_seconds")]
    pub minimum_tracked_seconds: u64,
    #[serde(default = "default_candidate_retention_minutes")]
    pub candidate_retention_minutes: u64,
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

    /// GET /api/agent/handshake — request challenge nonce
    pub async fn handshake(&self) -> Result<String, AgentError> {
        let url = format!("{}/api/agent/handshake", self.base_url);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;

        let status = resp.status().as_u16();
        if status == 200 {
            let body = resp
                .json::<HandshakeResponse>()
                .await
                .map_err(|e| AgentError::Network(e.to_string()))?;
            Ok(body.challenge)
        } else {
            Err(AgentError::Network(format!("Handshake failed with HTTP {}", status)))
        }
    }

    /// POST /api/agent/login — authenticate student and create session.
    pub async fn login(&self, req: LoginRequest) -> Result<(LoginResponse, [u8; 32]), AgentError> {
        // 1. Fetch challenge nonce
        let nonce = self.handshake().await?;
        
        let url = format!("{}/api/agent/login", self.base_url);
        log::info!("POST {} (student: {})", url, req.college_id);

        // 2. Generate Session AES Key (for future patches)
        let session_aes_key = crate::crypto::generate_aes_key();
        use base64::{engine::general_purpose, Engine as _};
        let encoded_session_key = general_purpose::STANDARD.encode(session_aes_key);
        
        // 3. Construct inner JSON payload
        let inner = InnerLoginJson {
            college_id: req.college_id.clone(),
            password: req.password.clone(),
            hardware_id: req.hardware_id.clone(),
            pc_name: req.pc_name.clone(),
            lab_name: req.lab_name.clone(),
            session_aes_key: encoded_session_key,
            nonce,
        };
        let json_str = serde_json::to_string(&inner).unwrap();

        // 4. Generate Login AES Key (for this request only)
        let login_aes_key = crate::crypto::generate_aes_key();

        // 5. Encrypt JSON with AES
        let encrypted_payload = crate::crypto::encrypt_aes_gcm_base64(&login_aes_key, json_str.as_bytes())
            .map_err(|e| AgentError::Network(format!("AES Encryption failed: {}", e)))?;

        // 6. Encrypt the Login AES Key with RSA
        let encrypted_key = crate::crypto::encrypt_rsa_base64(&login_aes_key)
            .map_err(|e| AgentError::Network(format!("RSA Encryption failed: {}", e)))?;

        // 7. Send Hybrid Payload
        let payload = HybridLoginPayload {
            encrypted_key,
            payload: encrypted_payload,
        };

        let resp = self
            .client
            .post(&url)
            .json(&payload)
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
                log::info!(
                    "Sync settings received from server: sync_interval={}s, sync_jitter={}s, scheduling_mode={:?}, timeout={}s, idle_threshold={}s, enable_details={}, enable_segments={}, max_segments_per_app={}, max_segments_per_detail={}, max_details_per_app={}, minimum_tracked={}s, candidate_retention={}m",
                    body.sync_interval_seconds,
                    body.sync_jitter_seconds,
                    body.scheduling_mode,
                    body.timeout_seconds,
                    body.idle_threshold_seconds,
                    body.enable_details,
                    body.enable_segments,
                    body.max_segments_per_app,
                    body.max_segments_per_detail,
                    body.max_details_per_app,
                    body.minimum_tracked_seconds,
                    body.candidate_retention_minutes
                );
                Ok((body, session_aes_key))
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

    /// PATCH /api/agent/sync — send cumulative analytics sync securely.
    pub async fn sync(
        &self,
        session_id: &str,
        aes_key: &[u8; 32],
        payload: SyncPayload,
    ) -> Result<(), AgentError> {
        let url = format!("{}/api/agent/sync", self.base_url);
        log::debug!("PATCH {} (total={}s, active={}s)", url, payload.total_seconds, payload.active_seconds);

        let json_str = serde_json::to_string(&payload).unwrap();
        let encrypted = crate::crypto::encrypt_aes_gcm_base64(aes_key, json_str.as_bytes())
            .map_err(|e| AgentError::Network(format!("AES Encryption failed: {}", e)))?;

        let req_payload = SyncRequestPayload {
            sync_token: session_id.to_string(),
            payload: encrypted,
        };

        let resp = self
            .client
            .patch(&url)
            .json(&req_payload)
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

use serde::Deserialize;
use std::path::PathBuf;

/// Local agent configuration loaded from config.json.
/// Server URL and PC name are provided during installation — never hardcoded.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub server_url: String,
    pub pc_name: String,
    #[serde(default)]
    pub lab_name: Option<String>,
}

impl AgentConfig {
    /// Load config from the standard install path, falling back to CWD for development.
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        // 1. Try production path: C:\Program Files\LabSense\config.json
        let prod_path = PathBuf::from(r"C:\Program Files\LabSense\config.json");
        if prod_path.exists() {
            let content = std::fs::read_to_string(&prod_path)?;
            let config: AgentConfig = serde_json::from_str(&content)?;
            log::info!("Loaded config from {}", prod_path.display());
            return Ok(config);
        }

        // 2. Fallback: ./config.json in current working directory (dev mode)
        let dev_path = PathBuf::from("config.json");
        if dev_path.exists() {
            let content = std::fs::read_to_string(&dev_path)?;
            let config: AgentConfig = serde_json::from_str(&content)?;
            log::info!("Loaded config from ./config.json (dev mode)");
            return Ok(config);
        }

        Err("config.json not found. Expected at C:\\Program Files\\LabSense\\config.json or ./config.json".into())
    }
}

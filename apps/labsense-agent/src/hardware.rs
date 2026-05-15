/// Generates a stable hardware fingerprint for this machine.
/// Uses the Windows MachineGuid from the registry — no admin privileges needed.
pub fn get_hardware_id() -> String {
    match machine_uid::get() {
        Ok(id) => id,
        Err(e) => {
            log::warn!("Failed to get machine UID, using fallback: {}", e);
            // Fallback: use hostname as a basic identifier
            get_hostname()
        }
    }
}

/// Returns the Windows computer name.
pub fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "UNKNOWN-PC".to_string())
}

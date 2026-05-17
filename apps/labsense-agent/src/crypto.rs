use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand::{rngs::OsRng as RandOsRng, RngCore};
use rsa::{Oaep, RsaPublicKey};
use sha2::Sha256;

/// Hardcoded RSA Public Key (2048-bit)
const PUBLIC_KEY_PEM: &str = r#"-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsjOpZ0P/V5BucdMDogEA
JR1vJcKXKVPRY1D+f9mOaGEru2mv7kVXj3sk2BhEI4w33SIhElQ6jNQX2f2q3leA
EDcvi7FVwvuACShRFLKG9BA+F0VipsVEOxr/5hWRfQ6LzStgC0FxyF8tBTzkh7Rl
gJmcYMAPZ46DTVuUYco4R4sDZUAaOA8nKZbFkSY0cTWFfRjgrWjmihmvMQkShbEF
sdE5vPM0dckbuEzFm3ZZrQwqzRMGhtvMOPGrqh0GGQ6lAEDJL7e35rphoPTjaboc
5tiZTqf6B+lpZjj77Cbya1i8o6Cg3z7F9D7poVnBnxMJ6s2ejSQTrV0yFfsno0UV
3wIDAQAB
-----END PUBLIC KEY-----
"#;

/// Generate a 32-byte AES-256 key
pub fn generate_aes_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    RandOsRng.fill_bytes(&mut key);
    key
}

/// Encrypt data with RSA-OAEP (SHA-256) using the hardcoded public key, return Base64.
pub fn encrypt_rsa_base64(data: &[u8]) -> Result<String, rsa::Error> {
    use rsa::pkcs8::DecodePublicKey;
    let pub_key = RsaPublicKey::from_public_key_pem(PUBLIC_KEY_PEM)
        .map_err(|_| rsa::Error::Internal)?;
    
    let mut rng = RandOsRng;
    let padding = Oaep::new::<Sha256>();
    
    let encrypted = pub_key.encrypt(&mut rng, padding, data)?;
    Ok(general_purpose::STANDARD.encode(encrypted))
}

/// Encrypt data with AES-256-GCM. Returns Base64 of (Nonce + Ciphertext + Tag).
/// Note: aes-gcm crate appends the 16-byte tag to the ciphertext automatically.
pub fn encrypt_aes_gcm_base64(key: &[u8; 32], data: &[u8]) -> Result<String, aes_gcm::Error> {
    let cipher = Aes256Gcm::new_from_slice(key).unwrap();
    
    // Generate fresh 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    RandOsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // Encrypt (ciphertext will include the tag at the end)
    let ciphertext = cipher.encrypt(nonce, data)?;
    
    // Construct payload: Nonce (12) + Ciphertext + Tag (16)
    let mut payload = Vec::with_capacity(12 + ciphertext.len());
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&ciphertext);
    
    Ok(general_purpose::STANDARD.encode(payload))
}

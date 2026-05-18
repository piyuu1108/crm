import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// 5 minutes TTL for the in-memory cache
const TTL_MS = 5 * 60 * 1000;
// 12 hours hard limit for a single session key
const MAX_SESSION_LENGTH = 12 * 60 * 60 * 1000;

interface VaultEntry {
	aesKey: Buffer;
	expiresAt: number;
	createdAt: number;
}

// In-memory Key Vault
const keyVault = new Map<string, VaultEntry>();

// Clean up expired keys and nonces periodically
setInterval(() => {
	const now = Date.now();
	for (const [token, entry] of keyVault.entries()) {
		if (now > entry.expiresAt || now - entry.createdAt > MAX_SESSION_LENGTH) {
			keyVault.delete(token);
		}
	}
	for (const [nonce, expiresAt] of nonces.entries()) {
		if (now > expiresAt) {
			nonces.delete(nonce);
		}
	}
}, 60000).unref();

// In-memory Challenge Nonces (TTL: 30s)
const nonces = new Map<string, number>();

export function generateChallenge(): string {
	const challenge = crypto.randomBytes(16).toString('hex');
	nonces.set(challenge, Date.now() + 30000);
	return challenge;
}

export function consumeChallenge(challenge: string): boolean {
	const expiresAt = nonces.get(challenge);
	if (!expiresAt) return false;
	nonces.delete(challenge);
	return Date.now() <= expiresAt;
}

export function getPrivateKey(): string {
	const pk = env.RSA_PRIVATE_KEY;
	if (!pk) {
		throw new Error('RSA_PRIVATE_KEY is not defined in the environment.');
	}
	return pk.replace(/\\n/g, '\n');
}

export function decryptRsaPayload(base64Payload: string): string {
	const privateKey = getPrivateKey();
	const buffer = Buffer.from(base64Payload, 'base64');
	const decrypted = crypto.privateDecrypt(
		{
			key: privateKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256'
		},
		buffer
	);
	return decrypted.toString('utf8');
}

export function storeAesKey(syncToken: string, base64AesKey: string): void {
	const aesKey = Buffer.from(base64AesKey, 'base64');
	const now = Date.now();
	keyVault.set(syncToken, {
		aesKey,
		expiresAt: now + TTL_MS,
		createdAt: now
	});
}

export function getAesKey(syncToken: string): Buffer | null {
	const entry = keyVault.get(syncToken);
	if (!entry) return null;

	const now = Date.now();
	if (now > entry.expiresAt || now - entry.createdAt > MAX_SESSION_LENGTH) {
		keyVault.delete(syncToken);
		return null;
	}

	// Refresh TTL for inactivity
	entry.expiresAt = now + TTL_MS;
	return entry.aesKey;
}

export function decryptAesGcmPayload(syncToken: string, base64Payload: string): string | null {
	const key = getAesKey(syncToken);
	if (!key) return null;
	return decryptAesGcmWithKey(key, base64Payload);
}

export function decryptAesGcmWithKey(key: Buffer, base64Payload: string): string | null {
	const payloadBuf = Buffer.from(base64Payload, 'base64');
	// Nonce is 12 bytes
	// Auth Tag is 16 bytes (appended to ciphertext)
	if (payloadBuf.length < 12 + 16) {
		return null; // Invalid payload
	}

	const nonce = payloadBuf.subarray(0, 12);
	const tag = payloadBuf.subarray(payloadBuf.length - 16);
	const ciphertext = payloadBuf.subarray(12, payloadBuf.length - 16);

	try {
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
		decipher.setAuthTag(tag);
		let decrypted = decipher.update(ciphertext, undefined, 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	} catch (e) {
		return null;
	}
}

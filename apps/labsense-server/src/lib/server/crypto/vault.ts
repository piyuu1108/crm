import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// 5 minutes TTL for the in-memory cache
const TTL_MS = 5 * 60 * 1000;

interface VaultEntry {
	aesKey: Buffer;
	expiresAt: number;
}

// In-memory Key Vault
const keyVault = new Map<string, VaultEntry>();

// Clean up expired keys periodically
setInterval(() => {
	const now = Date.now();
	for (const [token, entry] of keyVault.entries()) {
		if (now > entry.expiresAt) {
			keyVault.delete(token);
		}
	}
}, 60000).unref();

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
	keyVault.set(syncToken, {
		aesKey,
		expiresAt: Date.now() + TTL_MS
	});
}

export function getAesKey(syncToken: string): Buffer | null {
	const entry = keyVault.get(syncToken);
	if (!entry) return null;

	if (Date.now() > entry.expiresAt) {
		keyVault.delete(syncToken);
		return null;
	}

	// Refresh TTL
	entry.expiresAt = Date.now() + TTL_MS;
	return entry.aesKey;
}

export function decryptAesGcmPayload(syncToken: string, base64Payload: string): string | null {
	const key = getAesKey(syncToken);
	if (!key) return null;

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

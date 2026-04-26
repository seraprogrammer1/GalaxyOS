/**
 * Fernet-compatible symmetric encryption using Node.js built-in crypto.
 *
 * Fernet spec: https://github.com/fernet/spec/blob/master/Spec.md
 *  - Key: 32 bytes, URL-safe base64 encoded (first 16 = HMAC signing key, last 16 = AES encryption key)
 *  - Token: Version(1) || Timestamp(8) || IV(16) || Ciphertext || HMAC(32)
 *  - Cipher: AES-128-CBC with PKCS7 padding
 *  - MAC: HMAC-SHA256 over Version+Timestamp+IV+Ciphertext
 *
 * Fully compatible with Python's cryptography.fernet.Fernet — existing encrypted
 * access tokens in MongoDB are readable by this implementation without migration.
 */

import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

function getKeys(): { signingKey: Buffer; encryptionKey: Buffer } {
	const raw = Buffer.from(env.FERNET_KEY ?? '', 'base64');
	if (raw.length !== 32) {
		throw new Error('FERNET_KEY must be 32 bytes (URL-safe base64 encoded)');
	}
	return {
		signingKey: raw.subarray(0, 16),
		encryptionKey: raw.subarray(16, 32)
	};
}

export function encrypt(plaintext: string): string {
	const { signingKey, encryptionKey } = getKeys();

	const iv = crypto.randomBytes(16);
	const timestamp = BigInt(Math.floor(Date.now() / 1000));

	const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

	const version = Buffer.from([0x80]);
	const ts = Buffer.allocUnsafe(8);
	ts.writeBigUInt64BE(timestamp);

	const payload = Buffer.concat([version, ts, iv, ciphertext]);
	const hmac = crypto.createHmac('sha256', signingKey).update(payload).digest();

	return Buffer.concat([payload, hmac]).toString('base64url');
}

export function decrypt(token: string): string {
	const { signingKey, encryptionKey } = getKeys();

	// Accept both standard base64 and base64url (Python uses standard base64 with padding)
	const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
	const data = Buffer.from(normalized, 'base64');

	if (data.length < 57) throw new Error('Invalid Fernet token: too short');
	if (data[0] !== 0x80) throw new Error('Invalid Fernet token: bad version byte');

	const payload = data.subarray(0, data.length - 32);
	const sig = data.subarray(data.length - 32);

	const expectedSig = crypto.createHmac('sha256', signingKey).update(payload).digest();
	if (!crypto.timingSafeEqual(sig, expectedSig)) {
		throw new Error('Invalid Fernet token: signature mismatch');
	}

	const iv = data.subarray(9, 25);
	const ciphertext = data.subarray(25, data.length - 32);

	const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALG = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;
const SALT = 'connectors-v1';

function getKey(): Buffer {
  const envKey = process.env.CONNECTORS_ENCRYPTION_KEY;
  if (!envKey || envKey.length < 16) {
    throw new Error('CONNECTORS_ENCRYPTION_KEY must be set (min 16 chars or 64 hex)');
  }
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  return scryptSync(envKey, SALT, KEY_LEN);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64url');
  if (buf.length < IV_LEN + TAG_LEN) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

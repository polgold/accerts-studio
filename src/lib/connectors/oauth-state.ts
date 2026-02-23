import { createHmac, randomBytes } from 'crypto';

const STATE_SECRET = process.env.CONNECTORS_ENCRYPTION_KEY ?? process.env.CONNECTORS_STATE_SECRET ?? '';

export interface OAuthStatePayload {
  workspaceId: string;
  workspaceSlug: string;
  userId: string;
  nonce: string;
}

export function signState(payload: OAuthStatePayload): string {
  if (!STATE_SECRET || STATE_SECRET.length < 16) {
    throw new Error('CONNECTORS_ENCRYPTION_KEY or CONNECTORS_STATE_SECRET required for OAuth state');
  }
  const payloadJson = JSON.stringify(payload);
  const encoded = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const sig = createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyState(stateSigned: string): OAuthStatePayload | null {
  if (!STATE_SECRET || STATE_SECRET.length < 16) return null;
  const dot = stateSigned.indexOf('.');
  if (dot === -1) return null;
  const encoded = stateSigned.slice(0, dot);
  const sig = stateSigned.slice(dot + 1);
  const expectedSig = createHmac('sha256', STATE_SECRET).update(encoded).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (payload.workspaceId && payload.workspaceSlug && payload.userId && payload.nonce) {
      return payload;
    }
  } catch {
    // ignore
  }
  return null;
}

export function generateNonce(): string {
  return randomBytes(16).toString('base64url');
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { requireWorkspaceMemberInApi } from '@/lib/connectors/workspace-auth';
import { signState, generateNonce } from '@/lib/connectors/oauth-state';
import { MICROSOFT_SCOPES } from '@/lib/connectors/microsoft-graph';
import { randomBytes, createHash } from 'crypto';

const COOKIE_PKCE = 'connectors_microsoft_pkce';
const PKCE_MAX_AGE = 600;

function base64Url(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId requerido' }, { status: 400 });
  }

  const res = NextResponse.json({ error: 'Inicio OAuth fallido' }, { status: 400 });
  const supabase = createServerClientForRouteHandler(request, res);

  const auth = await requireWorkspaceMemberInApi(supabase, workspaceId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.AZURE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'OAuth no configurado (AZURE_CLIENT_ID / AZURE_REDIRECT_URI)' }, { status: 503 });
  }

  const codeVerifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());

  const statePayload = {
    workspaceId: auth.data.workspaceId,
    workspaceSlug: auth.data.workspaceSlug,
    userId: auth.data.userId,
    nonce: generateNonce(),
  };
  const state = signState(statePayload);

  res.cookies.set(COOKIE_PKCE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PKCE_MAX_AGE,
    path: '/',
  });

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', MICROSOFT_SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(authUrl.toString(), {
    headers: res.headers,
  });
}

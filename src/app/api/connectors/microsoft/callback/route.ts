import { NextRequest, NextResponse } from 'next/server';
import { createServerClientForRouteHandler } from '@/lib/supabase/route-handler';
import { verifyState } from '@/lib/connectors/oauth-state';
import { encrypt } from '@/lib/connectors/encryption';

const COOKIE_PKCE = 'connectors_microsoft_pkce';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const codeVerifier = request.cookies.get(COOKIE_PKCE)?.value;

  const res = NextResponse.redirect(new URL('/', request.url));

  if (!code || !stateParam || !codeVerifier) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(`${base}/onboarding?error=oauth_missing`);
  }

  const payload = verifyState(stateParam);
  if (!payload) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(`${base}/onboarding?error=oauth_invalid_state`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID ?? process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? process.env.AZURE_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? process.env.AZURE_REDIRECT_URI;
  const tenant = process.env.MICROSOFT_TENANT_ID ?? process.env.AZURE_TENANT_ID ?? 'common';
  if (!clientId || !clientSecret || !redirectUri) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(`${base}/onboarding?error=oauth_config`);
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!tokenRes.ok) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const isMsa = /personal|consumer|live\.com|msa|account.*type/i.test(data.error_description ?? '');
    const errorParam = isMsa ? 'msa_not_supported' : 'token_exchange';
    return NextResponse.redirect(`${base}/w/${payload.workspaceSlug}/settings/connectors?error=${errorParam}`);
  }
  if (!data.access_token || !data.refresh_token || typeof data.expires_in !== 'number') {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(`${base}/w/${payload.workspaceSlug}/settings/connectors?error=token_exchange`);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const supabase = createServerClientForRouteHandler(request, res);

  const { data: conn, error: insertError } = await supabase
    .from('workspace_connectors')
    .insert({
      workspace_id: payload.workspaceId,
      provider: 'microsoft',
      provider_connection_name: null,
      encrypted_access_token: encrypt(data.access_token),
      encrypted_refresh_token: encrypt(data.refresh_token),
      token_expires_at: expiresAt.toISOString(),
      created_by: payload.userId,
    })
    .select('id')
    .single();

  if (insertError || !conn) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(`${base}/w/${payload.workspaceSlug}/settings/connectors?error=save_failed`);
  }

  await supabase.from('connector_audit_log').insert({
    workspace_id: payload.workspaceId,
    connector_id: conn.id,
    user_id: payload.userId,
    action: 'connected',
    metadata: {},
  });

  res.cookies.set(COOKIE_PKCE, '', { maxAge: 0, path: '/' });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const redirectUrl = `${base}/w/${payload.workspaceSlug}/settings/connectors?connected=1`;
  return NextResponse.redirect(redirectUrl, { headers: res.headers });
}

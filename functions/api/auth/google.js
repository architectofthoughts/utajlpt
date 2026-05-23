// Google OAuth (Identity Services) credential 검증 → 세션 발급
//
// 클라이언트가 GIS One-Tap 또는 버튼으로 받은 JWT ID 토큰(credential)을
// POST로 보내면, Google tokeninfo로 검증하고 email/aud가 일치하면 세션 발급.
//
// 필요한 환경변수:
//   OAUTH_CLIENT_ID  — Google Cloud Console에서 발급 받은 Web 클라이언트 ID
//   OWNER_EMAIL      — 로그인 허용 이메일 (예: jaceyoung0705@gmail.com)

export async function onRequestPost(context) {
    const { env } = context;
    const { credential } = await context.request.json().catch(() => ({}));

    if (!credential) {
        return Response.json({ error: 'credential required' }, { status: 400 });
    }

    if (!env.OAUTH_CLIENT_ID || !env.OWNER_EMAIL) {
        return Response.json({ error: 'OAuth not configured (OAUTH_CLIENT_ID / OWNER_EMAIL)' }, { status: 500 });
    }

    // Verify ID token via Google tokeninfo
    let payload;
    try {
        const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
        const res = await fetch(tokenInfoUrl);
        if (!res.ok) {
            const detail = await res.text();
            return Response.json({ error: 'Token verification failed', detail: detail.slice(0, 300) }, { status: 401 });
        }
        payload = await res.json();
    } catch (err) {
        return Response.json({ error: `Verification network error: ${err.message}` }, { status: 502 });
    }

    // Validate audience (client_id), email_verified, and email match
    if (payload.aud !== env.OAUTH_CLIENT_ID) {
        return Response.json({ error: 'Invalid token audience' }, { status: 401 });
    }
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        return Response.json({ error: 'Email not verified' }, { status: 401 });
    }
    if (!payload.email || payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
        return Response.json({ error: 'Email not authorized' }, { status: 403 });
    }

    // Issue session (30 days)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare('DELETE FROM sessions WHERE datetime(expires_at) < datetime(\'now\')').run();
    await env.DB.prepare(
        'INSERT INTO sessions (id, user_email, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, payload.email, expiresAt).run();

    return Response.json({ ok: true, email: payload.email }, {
        headers: {
            'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`
        }
    });
}

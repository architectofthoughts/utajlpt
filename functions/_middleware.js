function parseCookie(cookieHeader, name) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : null;
}

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // Skip middleware for non-API paths (static assets)
    if (!url.pathname.startsWith('/api/')) {
        return next();
    }

    // Public endpoints (no session required)
    if (url.pathname === '/api/auth/login') {
        return next();
    }

    const cookie = request.headers.get('Cookie') || '';
    const sessionToken = parseCookie(cookie, 'session');

    if (!sessionToken) {
        return Response.json({ error: 'Unauthorized', detail: 'No session cookie' }, { status: 401 });
    }

    try {
        const session = await env.DB.prepare(
            'SELECT id FROM sessions WHERE id = ? AND datetime(expires_at) > datetime(\'now\')'
        ).bind(sessionToken).first();

        if (!session) {
            return Response.json({ error: 'Session expired' }, { status: 401 });
        }

        context.data = context.data || {};
        context.data.sessionId = session.id;
        return next();
    } catch (err) {
        return Response.json({ error: `Auth check failed: ${err.message}` }, { status: 500 });
    }
}

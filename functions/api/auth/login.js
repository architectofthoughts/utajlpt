async function hashPassphrase(passphrase, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { env } = context;
    const { passphrase } = await context.request.json();

    if (!passphrase) {
        return Response.json({ error: 'Passphrase required' }, { status: 400 });
    }

    // Hash the input and compare with stored hash
    // AUTH_PASSPHRASE_HASH format: "salt:hash"
    const storedHash = env.AUTH_PASSPHRASE_HASH;
    if (!storedHash) {
        return Response.json({ error: 'Auth not configured' }, { status: 500 });
    }

    const [salt, expectedHash] = storedHash.split(':');
    const inputHash = await hashPassphrase(passphrase, salt);

    if (inputHash !== expectedHash) {
        return Response.json({ error: 'Invalid passphrase' }, { status: 401 });
    }

    // Create session (30 days)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Clean up expired sessions
    await env.DB.prepare('DELETE FROM sessions WHERE datetime(expires_at) < datetime(\'now\')').run();

    await env.DB.prepare(
        'INSERT INTO sessions (id, expires_at) VALUES (?, ?)'
    ).bind(sessionId, expiresAt).run();

    return Response.json({ ok: true }, {
        headers: {
            'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`
        }
    });
}

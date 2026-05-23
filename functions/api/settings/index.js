const VALID_THEMES = new Set(['dark', 'light', 'system']);
const VALID_FONT_SIZES = new Set(['small', 'medium', 'large']);
const JLPT_LEVELS = new Set(['N5', 'N4', 'N3', 'N2', 'N1']);

function parseJsonArray(raw, fallback) {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

export async function onRequestGet(context) {
    const s = await context.env.DB.prepare('SELECT * FROM user_settings WHERE id = 1').first();

    if (!s) {
        return Response.json({
            theme: 'dark', fontSize: 'medium',
            autoMode: false, autoSeconds: 5,
            jlptFilter: ['N5', 'N4', 'N3', 'N2', 'N1'],
            hideMastered: false, onlyAdded: false, voiceEnabled: false
        });
    }

    return Response.json({
        theme: s.theme,
        fontSize: s.font_size,
        autoMode: !!s.auto_mode,
        autoSeconds: s.auto_seconds,
        jlptFilter: parseJsonArray(s.jlpt_filter, ['N5', 'N4', 'N3', 'N2', 'N1']),
        hideMastered: !!s.hide_mastered,
        onlyAdded: !!s.only_added,
        voiceEnabled: !!s.voice_enabled
    });
}

export async function onRequestPut(context) {
    const body = await context.request.json();
    const updates = [];
    const values = [];

    if (body.theme !== undefined) {
        if (!VALID_THEMES.has(body.theme)) {
            return Response.json({ error: 'Invalid theme' }, { status: 400 });
        }
        updates.push('theme=?'); values.push(body.theme);
    }
    if (body.fontSize !== undefined) {
        if (!VALID_FONT_SIZES.has(body.fontSize)) {
            return Response.json({ error: 'Invalid fontSize' }, { status: 400 });
        }
        updates.push('font_size=?'); values.push(body.fontSize);
    }
    if (body.autoMode !== undefined) {
        updates.push('auto_mode=?'); values.push(body.autoMode ? 1 : 0);
    }
    if (body.autoSeconds !== undefined) {
        const sec = Math.max(2, Math.min(20, parseInt(body.autoSeconds, 10) || 5));
        updates.push('auto_seconds=?'); values.push(sec);
    }
    if (body.jlptFilter !== undefined) {
        if (!Array.isArray(body.jlptFilter) || !body.jlptFilter.every(l => JLPT_LEVELS.has(l))) {
            return Response.json({ error: 'Invalid jlptFilter' }, { status: 400 });
        }
        updates.push('jlpt_filter=?'); values.push(JSON.stringify(body.jlptFilter));
    }
    if (body.hideMastered !== undefined) {
        updates.push('hide_mastered=?'); values.push(body.hideMastered ? 1 : 0);
    }
    if (body.onlyAdded !== undefined) {
        updates.push('only_added=?'); values.push(body.onlyAdded ? 1 : 0);
    }
    if (body.voiceEnabled !== undefined) {
        updates.push('voice_enabled=?'); values.push(body.voiceEnabled ? 1 : 0);
    }

    if (updates.length === 0) {
        return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(1);
    await context.env.DB.prepare(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return Response.json({ updated: true });
}

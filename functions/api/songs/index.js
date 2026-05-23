export async function onRequestGet(context) {
    const songs = await context.env.DB.prepare(
        'SELECT id, title, artist, created_at, difficulty_score, difficulty_label, jlpt_distribution_json FROM songs ORDER BY created_at DESC LIMIT 200'
    ).all();
    return Response.json(songs.results);
}

export async function onRequestPost(context) {
    const body = await context.request.json();
    const { id, title, artist, rawLyrics, lyrics, vocab, explanation, difficultyScore, difficultyLabel, jlptDistribution } = body;

    if (!lyrics) {
        return Response.json({ error: 'lyrics is required' }, { status: 400 });
    }

    // Dedupe by raw lyrics
    if (rawLyrics) {
        const existing = await context.env.DB.prepare(
            'SELECT id FROM songs WHERE raw_lyrics = ?'
        ).bind(rawLyrics).first();

        if (existing) {
            await context.env.DB.prepare(
                'UPDATE songs SET title=?, artist=?, lyrics_json=?, vocab_json=?, explanation_json=?, difficulty_score=?, difficulty_label=?, jlpt_distribution_json=? WHERE id=?'
            ).bind(
                title || '', artist || '',
                JSON.stringify(lyrics), JSON.stringify(vocab || []), JSON.stringify(explanation || []),
                difficultyScore ?? null, difficultyLabel || null,
                jlptDistribution ? JSON.stringify(jlptDistribution) : null,
                existing.id
            ).run();
            return Response.json({ id: existing.id, updated: true });
        }
    }

    const songId = id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    await context.env.DB.prepare(
        'INSERT INTO songs (id, title, artist, raw_lyrics, lyrics_json, vocab_json, explanation_json, difficulty_score, difficulty_label, jlpt_distribution_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        songId, title || '', artist || '', rawLyrics || '',
        JSON.stringify(lyrics), JSON.stringify(vocab || []), JSON.stringify(explanation || []),
        difficultyScore ?? null, difficultyLabel || null,
        jlptDistribution ? JSON.stringify(jlptDistribution) : null
    ).run();

    // Library cap at 200 (single-user app, more than enough)
    await context.env.DB.prepare(
        'DELETE FROM songs WHERE id NOT IN (SELECT id FROM songs ORDER BY created_at DESC LIMIT 200)'
    ).run();

    return Response.json({ id: songId, created: true }, { status: 201 });
}

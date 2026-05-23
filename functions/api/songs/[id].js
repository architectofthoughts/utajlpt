function parseJsonField(value, fallback) {
    if (value == null || value === '') return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
}

export async function onRequestGet(context) {
    const songId = context.params.id;
    const song = await context.env.DB.prepare('SELECT * FROM songs WHERE id = ?').bind(songId).first();

    if (!song) {
        return Response.json({ error: 'Song not found' }, { status: 404 });
    }

    return Response.json({
        id: song.id,
        title: song.title,
        artist: song.artist,
        rawLyrics: song.raw_lyrics,
        lyrics: parseJsonField(song.lyrics_json, []),
        vocab: parseJsonField(song.vocab_json, []),
        explanation: parseJsonField(song.explanation_json, []),
        difficultyScore: song.difficulty_score,
        difficultyLabel: song.difficulty_label || null,
        jlptDistribution: parseJsonField(song.jlpt_distribution_json, null),
        date: song.created_at
    });
}

export async function onRequestDelete(context) {
    const songId = context.params.id;
    // Cascade delete song_vocab links
    await context.env.DB.batch([
        context.env.DB.prepare('DELETE FROM song_vocab WHERE song_id = ?').bind(songId),
        context.env.DB.prepare('DELETE FROM songs WHERE id = ?').bind(songId)
    ]);
    return Response.json({ deleted: true });
}

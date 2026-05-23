// song_vocab — 양방향 링크. 한 노래에 나온 단어들 / 한 단어가 나온 노래들

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const songId = url.searchParams.get('song');
    const vocabId = url.searchParams.get('vocab');

    if (songId) {
        const rows = await context.env.DB.prepare(
            'SELECT * FROM song_vocab WHERE song_id = ? ORDER BY line_index'
        ).bind(songId).all();
        return Response.json(rows.results.map(r => ({
            songId: r.song_id, vocabId: r.vocab_id,
            lineIndex: r.line_index, surfaceForm: r.surface_form
        })));
    }

    if (vocabId) {
        const rows = await context.env.DB.prepare(
            `SELECT sv.*, s.title, s.artist
             FROM song_vocab sv
             JOIN songs s ON s.id = sv.song_id
             WHERE sv.vocab_id = ?
             ORDER BY s.created_at DESC`
        ).bind(vocabId).all();
        return Response.json(rows.results.map(r => ({
            songId: r.song_id, vocabId: r.vocab_id,
            lineIndex: r.line_index, surfaceForm: r.surface_form,
            title: r.title, artist: r.artist
        })));
    }

    return Response.json({ error: 'song or vocab query param required' }, { status: 400 });
}

export async function onRequestPost(context) {
    const body = await context.request.json();
    const { songId, links } = body;

    if (!songId || !Array.isArray(links)) {
        return Response.json({ error: 'songId and links array required' }, { status: 400 });
    }

    // Replace all existing links for this song
    const stmts = [
        context.env.DB.prepare('DELETE FROM song_vocab WHERE song_id = ?').bind(songId),
        ...links.map(l => context.env.DB.prepare(
            'INSERT OR REPLACE INTO song_vocab (song_id, vocab_id, line_index, surface_form) VALUES (?, ?, ?, ?)'
        ).bind(songId, l.vocabId, l.lineIndex ?? 0, l.surfaceForm || null))
    ];

    await context.env.DB.batch(stmts);
    return Response.json({ inserted: links.length });
}

// 회독 진도 동기화 — aim의 progress 테이블 ↔ 클라이언트 IndexedDB

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const since = url.searchParams.get('since'); // ISO 8601, optional

    let query = 'SELECT * FROM progress';
    const params = [];
    if (since) {
        query += ' WHERE updated_at > ?';
        params.push(since);
    }
    query += ' ORDER BY updated_at DESC';

    const rows = await context.env.DB.prepare(query).bind(...params).all();

    return Response.json(rows.results.map(r => ({
        vocabId: r.vocab_id,
        mastered: !!r.mastered,
        lastSeen: r.last_seen,
        reviewCount: r.review_count,
        knownCount: r.known_count,
        unknownCount: r.unknown_count,
        addedAt: r.added_at,
        updatedAt: r.updated_at
    })));
}

// Batch upsert from client IndexedDB
export async function onRequestPost(context) {
    const body = await context.request.json();
    const rows = Array.isArray(body) ? body : body.rows;

    if (!Array.isArray(rows)) {
        return Response.json({ error: 'rows array required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const stmts = rows.map(r => context.env.DB.prepare(
        `INSERT INTO progress (vocab_id, mastered, last_seen, review_count, known_count, unknown_count, added_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(vocab_id) DO UPDATE SET
            mastered = excluded.mastered,
            last_seen = excluded.last_seen,
            review_count = excluded.review_count,
            known_count = excluded.known_count,
            unknown_count = excluded.unknown_count,
            added_at = COALESCE(excluded.added_at, progress.added_at),
            updated_at = excluded.updated_at`
    ).bind(
        r.vocabId,
        r.mastered ? 1 : 0,
        r.lastSeen || null,
        r.reviewCount ?? 0,
        r.knownCount ?? 0,
        r.unknownCount ?? 0,
        r.addedAt || null,
        now
    ));

    if (stmts.length > 0) {
        await context.env.DB.batch(stmts);
    }

    return Response.json({ upserted: stmts.length });
}

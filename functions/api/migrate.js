// 데이터 이전 진입점 — 기존 lyric/aim 데이터를 utajlpt D1에 부어넣음.
// 한 번 쓰고 끝낼 용도지만 endpoint로 두면 클라에서 JSON 업로드만으로 처리 가능.

export async function onRequestPost(context) {
    const { songs, progress, stats, settings, songVocab } = await context.request.json();
    const counts = { songs: 0, progress: 0, songVocab: 0 };

    // Songs (lyric 출처)
    if (Array.isArray(songs) && songs.length > 0) {
        for (const song of songs.slice(0, 200)) {
            try {
                await context.env.DB.prepare(
                    `INSERT OR IGNORE INTO songs
                        (id, title, artist, raw_lyrics, lyrics_json, vocab_json, explanation_json,
                         difficulty_score, difficulty_label, jlpt_distribution_json, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    song.id, song.title || '', song.artist || '',
                    song.rawLyrics || '', JSON.stringify(song.lyrics || []),
                    JSON.stringify(song.vocab || []), JSON.stringify(song.explanation || []),
                    song.difficultyScore ?? null, song.difficultyLabel || null,
                    song.jlptDistribution ? JSON.stringify(song.jlptDistribution) : null,
                    song.date || new Date().toISOString()
                ).run();
                counts.songs++;
            } catch { /* skip duplicates */ }
        }
    }

    // Progress (aim 출처 — IndexedDB export)
    if (Array.isArray(progress) && progress.length > 0) {
        const now = new Date().toISOString();
        for (const p of progress) {
            try {
                await context.env.DB.prepare(
                    `INSERT OR REPLACE INTO progress
                        (vocab_id, mastered, last_seen, review_count, known_count, unknown_count, added_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    p.id || p.vocabId, p.mastered ? 1 : 0,
                    p.lastSeen ? new Date(p.lastSeen).toISOString() : null,
                    p.reviewCount ?? 0, p.knownCount ?? 0, p.unknownCount ?? 0,
                    p.addedAt ? new Date(p.addedAt).toISOString() : null,
                    now
                ).run();
                counts.progress++;
            } catch { /* skip */ }
        }
    }

    // Song-vocab links
    if (Array.isArray(songVocab) && songVocab.length > 0) {
        for (const sv of songVocab) {
            try {
                await context.env.DB.prepare(
                    'INSERT OR IGNORE INTO song_vocab (song_id, vocab_id, line_index, surface_form) VALUES (?, ?, ?, ?)'
                ).bind(sv.songId, sv.vocabId, sv.lineIndex ?? 0, sv.surfaceForm || null).run();
                counts.songVocab++;
            } catch { /* skip */ }
        }
    }

    // Stats
    if (stats && (stats.lastStudyDate || stats.totalSongsAnalyzed)) {
        await context.env.DB.prepare(
            `UPDATE learning_stats SET
                current_streak=?, longest_streak=?, last_study_date=?,
                total_songs_analyzed=?, total_vocab_mastered=?, total_reviews=?,
                quiz_attempts=?, quiz_correct=?, study_dates_json=?
            WHERE id = 1`
        ).bind(
            stats.currentStreak ?? 0, stats.longestStreak ?? 0,
            stats.lastStudyDate ?? null, stats.totalSongsAnalyzed ?? 0,
            // lyric 측 컬럼이 total_vocab_learned 였음. 둘 다 받음.
            stats.totalVocabMastered ?? stats.totalVocabLearned ?? 0,
            stats.totalReviews ?? 0,
            stats.quizAttempts ?? 0, stats.quizCorrect ?? 0,
            JSON.stringify(stats.studyDates || [])
        ).run();
    }

    // Settings
    if (settings) {
        await context.env.DB.prepare(
            'UPDATE user_settings SET theme=?, font_size=? WHERE id = 1'
        ).bind(settings.theme || 'dark', settings.fontSize || 'medium').run();
    }

    return Response.json(counts);
}

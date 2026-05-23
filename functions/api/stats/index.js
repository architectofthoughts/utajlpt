function parseStudyDates(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

export async function onRequestGet(context) {
    const stats = await context.env.DB.prepare('SELECT * FROM learning_stats WHERE id = 1').first();

    if (!stats) {
        return Response.json({
            currentStreak: 0, longestStreak: 0, lastStudyDate: null,
            totalSongsAnalyzed: 0, totalVocabMastered: 0, totalReviews: 0,
            quizAttempts: 0, quizCorrect: 0, studyDates: []
        });
    }

    return Response.json({
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        lastStudyDate: stats.last_study_date,
        totalSongsAnalyzed: stats.total_songs_analyzed,
        totalVocabMastered: stats.total_vocab_mastered,
        totalReviews: stats.total_reviews,
        quizAttempts: stats.quiz_attempts,
        quizCorrect: stats.quiz_correct,
        studyDates: parseStudyDates(stats.study_dates_json)
    });
}

export async function onRequestPut(context) {
    const body = await context.request.json();
    const {
        currentStreak, longestStreak, lastStudyDate,
        totalSongsAnalyzed, totalVocabMastered, totalReviews,
        quizAttempts, quizCorrect, studyDates
    } = body;

    await context.env.DB.prepare(
        `UPDATE learning_stats SET
            current_streak=?, longest_streak=?, last_study_date=?,
            total_songs_analyzed=?, total_vocab_mastered=?, total_reviews=?,
            quiz_attempts=?, quiz_correct=?, study_dates_json=?
        WHERE id = 1`
    ).bind(
        currentStreak ?? 0, longestStreak ?? 0, lastStudyDate ?? null,
        totalSongsAnalyzed ?? 0, totalVocabMastered ?? 0, totalReviews ?? 0,
        quizAttempts ?? 0, quizCorrect ?? 0,
        JSON.stringify(Array.isArray(studyDates) ? studyDates : [])
    ).run();

    return Response.json({ updated: true });
}

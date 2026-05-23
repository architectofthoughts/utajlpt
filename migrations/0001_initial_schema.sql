-- utajlpt initial D1 schema
-- 통합: aimtotopjlpt(progress) + lyricstudy(songs/srs_vocab/stats/settings/sessions)
-- 추가: song_vocab (양방향 링크), difficulty 필드는 songs에 인라인

-- ===== OAuth Sessions =====
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ===== Songs (분석한 가사 라이브러리) =====
CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    artist TEXT NOT NULL DEFAULT '',
    raw_lyrics TEXT NOT NULL DEFAULT '',
    -- 라인별 분석 (로마자, 번역, 해석) JSON
    lyrics_json TEXT NOT NULL,
    -- 핵심 단어 추출 결과 JSON (Gemini가 뽑은 형태 그대로)
    vocab_json TEXT NOT NULL,
    -- 문법 해설 JSON 배열
    explanation_json TEXT NOT NULL DEFAULT '[]',
    -- JLPT 난이도 (lyricstudy 0002 마이그레이션 통합)
    difficulty_score INTEGER,
    difficulty_label TEXT,
    jlpt_distribution_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);

-- ===== Progress (회독 진도) — aim 모델 =====
-- vocab 자체는 JMdict 빌드 산출물(public/data/vocab.json)에서 옴.
-- D1에는 진도 메타만 저장.
CREATE TABLE IF NOT EXISTS progress (
    vocab_id TEXT PRIMARY KEY,             -- 'jm-1234567' or 'jl-...'
    mastered INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT,
    review_count INTEGER NOT NULL DEFAULT 0,
    known_count INTEGER NOT NULL DEFAULT 0,
    unknown_count INTEGER NOT NULL DEFAULT 0,
    added_at TEXT,                          -- null이면 자동 노출, 값 있으면 사용자가 직접 추가
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_progress_mastered ON progress(mastered);
CREATE INDEX IF NOT EXISTS idx_progress_added ON progress(added_at);
CREATE INDEX IF NOT EXISTS idx_progress_updated ON progress(updated_at);

-- ===== SRS State (선택 모드) =====
-- 회독이 메인, SRS는 사용자가 명시적으로 켤 때만 사용.
-- 한 단어가 progress와 srs_state에 동시에 존재 가능 (둘 다 vocab_id 기준).
CREATE TABLE IF NOT EXISTS srs_state (
    vocab_id TEXT PRIMARY KEY,
    level INTEGER NOT NULL DEFAULT 1,
    next_review TEXT NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    source_song_id TEXT,                    -- 어떤 노래에서 추가됐는지 (선택)
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_srs_next_review ON srs_state(next_review);
CREATE INDEX IF NOT EXISTS idx_srs_source ON srs_state(source_song_id);

-- ===== Song-Vocab Mapping (양방향 링크 핵심) =====
-- 한 노래에 한 단어가 여러 라인에 나올 수 있으므로 line_index까지 PK.
CREATE TABLE IF NOT EXISTS song_vocab (
    song_id TEXT NOT NULL,
    vocab_id TEXT NOT NULL,
    line_index INTEGER NOT NULL DEFAULT 0,  -- 가사 라인 인덱스 (점프용)
    surface_form TEXT,                       -- 가사에 실제 등장한 표면형
    PRIMARY KEY (song_id, vocab_id, line_index)
);
CREATE INDEX IF NOT EXISTS idx_sv_vocab ON song_vocab(vocab_id);
CREATE INDEX IF NOT EXISTS idx_sv_song ON song_vocab(song_id);

-- ===== Learning Stats (single row) =====
CREATE TABLE IF NOT EXISTS learning_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_study_date TEXT,
    total_songs_analyzed INTEGER NOT NULL DEFAULT 0,
    total_vocab_mastered INTEGER NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    quiz_attempts INTEGER NOT NULL DEFAULT 0,
    quiz_correct INTEGER NOT NULL DEFAULT 0,
    study_dates_json TEXT NOT NULL DEFAULT '[]'
);

-- ===== User Settings (single row) =====
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL DEFAULT 'dark',
    font_size TEXT NOT NULL DEFAULT 'medium',
    auto_mode INTEGER NOT NULL DEFAULT 0,
    auto_seconds INTEGER NOT NULL DEFAULT 5,
    jlpt_filter TEXT NOT NULL DEFAULT '["N5","N4","N3","N2","N1"]',  -- JSON array
    hide_mastered INTEGER NOT NULL DEFAULT 0,
    only_added INTEGER NOT NULL DEFAULT 0,
    voice_enabled INTEGER NOT NULL DEFAULT 0
);

-- Initialize singleton rows
INSERT OR IGNORE INTO learning_stats (id) VALUES (1);
INSERT OR IGNORE INTO user_settings (id) VALUES (1);

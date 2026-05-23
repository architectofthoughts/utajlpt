# CLAUDE.md — utajlpt

가사로 배우고, 회독으로 굳히는 일본어 학습 앱.

## 컨셉

- **회독 (歌枠 외)**: JMdict 기반 ~24,000 일본어 단어를 JLPT/빈도 순으로 회독. 오토 타이머 + 영구 마스터.
- **가사 (歌)**: 일본 노래 가사를 Gemini로 분석 — 로마자/번역/문법/단어/퀴즈/난이도. LRCLIB 자동 검색.
- **양방향 연결**: 가사의 단어 → 내 단어장으로. 단어 상세 → 이 단어가 나온 노래로.

이전 두 앱 `aimtotopjlpt` + `lyricstudy`의 통합 후속작. 두 원본은 archive 처리됨.

## 스택

- **프론트**: Vite + Svelte 5 (runes) + TypeScript + TailwindCSS + vite-plugin-pwa
- **백엔드**: Cloudflare Pages Functions
- **DB**: Cloudflare D1 (`utajlpt-db`) + 클라이언트 IndexedDB (Dexie) 캐시
- **AI**: Google Gemini API (서버 프록시)
- **인증**: Google OAuth 2.0 (`jaceyoung0705@gmail.com` 단일 사용자 가정)
- **사전 데이터**: JMdict-simplified (eng-common) + Bluskyo JLPT 매핑 → 빌드 시 `public/data/vocab.json`
- **가사 데이터**: LRCLIB 1차 / lyrics.ovh 폴백

## Cloudflare 배포

```bash
wrangler pages deploy dist --project-name=utajlpt --branch=main
```

`--branch=main` 빠뜨리면 프리뷰로 빠짐. 절대 빠뜨리지 말 것.

## 개발 명령

```bash
npm install
npm run build:vocab           # vocab.json 갱신
npm run dev                   # http://localhost:5173 + Pages Functions
npm run build                 # vocab + tsc + vite build
npm run check                 # svelte-check
npm run deploy                # CF Pages 배포

npm run db:migrate:local      # 로컬 D1에 마이그레이션 적용
npm run db:migrate:remote     # 프로덕션 D1에 마이그레이션 적용
```

## 디렉토리 (목표 구조)

```
src/
  main.ts, App.svelte, app.css, types.ts
  lib/
    db.ts                 # Dexie schema (오프라인 캐시)
    vocab.ts              # vocab fetch + 캐시 + 검색
    study-engine.ts       # 회독 큐, outcome 기록, 마스터
    sync.ts               # D1 동기화 (online 시)
    auth.ts               # OAuth 클라이언트 흐름
    gemini.ts             # Gemini 프록시 호출
    lyrics.ts             # 가사 검색 + 분석 결과 파싱
    stores/
      settings.ts, session.ts, auth.ts
  components/
    BottomNav.svelte, Card.svelte, AutoTimer.svelte
    SongCard.svelte, LyricLine.svelte, QuizPanel.svelte
  routes/
    Study.svelte          # 메인 회독 (aim 그대로)
    List.svelte           # 단어 목록 + 검색
    Add.svelte            # JMdict 검색 + 큐 추가
    Library.svelte        # 내 노래 + 단어장 대시보드
    Lyrics.svelte         # 가사 입력/검색 → 분석
    Song.svelte           # 분석 결과 (params.id)
    Word.svelte           # 단어 상세 + 등장 노래 (params.id)
    Stats.svelte          # 통계, 난이도, JLPT 분포
    Settings.svelte
functions/
  api/
    auth/*.js             # OAuth 콜백, 세션
    gemini.js             # Gemini 프록시 (인증 후)
    songs/*.js            # 노래 CRUD
    vocab/*.js            # SRS 단어장
    progress.js           # aim 진도 동기화
    stats.js              # 학습 통계
    settings.js
    migrate.js            # 데이터 이전용
migrations/
  0001_initial_schema.sql
```

## 데이터 모델 (D1)

```
vocab          ← JMdict 빌드 산출물 캐시 (선택, 빌드 산출물도 있어서 미러)
progress       ← 회독 진도 (mastered, reviewCount, lastSeen, addedAt)
songs          ← 분석 가사 라이브러리 (난이도, JLPT 분포)
song_vocab     ← songs ↔ vocab 매핑 (양방향 링크 핵심)
srs_state      ← 선택적 SRS 상태
learning_stats ← 스트릭, 누적 통계
user_settings  ← 테마, 폰트, 자동 회독 설정
sessions       ← OAuth 세션
```

## 오프라인 정책

- 회독·단어장·라이브러리 열람 → IndexedDB 캐시로 오프라인 OK
- 새 가사 분석·LRCLIB 검색·OAuth → 온라인 필수
- 온라인 복귀 시 D1 백그라운드 동기화

## 향후 확장

- 음성 (TTS) — Web Speech API
- 추천 노래 (난이도·JLPT 분포 기반)
- 핀 페어링 (다른 디바이스 빠른 로그인)

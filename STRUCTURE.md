# aimtotopjlpt — Structure for Design Pass

> 디자인 Claude에게: 이 문서는 앱이 **무엇을 하고**, **어떤 화면이 있고**, **어떤 인터랙션이 있는지** 알려주는 설명서야. 디자인을 바꿀 때 비즈니스 로직(`src/lib/`)은 건드리지 않아도 돼. 시각·레이아웃·컴포넌트만 바꾸면 돼.

## 한 줄 요약

회독식 일본어 단어 PWA. 안드로이드 "회독JLPT"를 쓰던 사용자가, 그 앱에 빠진 두 가지 기능을 채우려고 만든 개인용 도구.

- **오토 모드**: 정해진 시간 안에 "모르겠어"를 안 누르면 자동으로 "알겠어"로 넘어감 (핸즈프리 회독)
- **마스터 처리**: 다시 안 봐도 되는 단어를 영구히 큐에서 빼는 기능 (회독JLPT엔 없음)

## 화면 구성 (4 routes, hash-based SPA)

### `/` Study (메인)
회독 카드 한 장씩 보여주는 화면. 이 화면이 가장 중요해.

- 상단: 통계 (마스터 N · 회독중 N · 큐 N장) + 오토 토글 버튼
- 진행 바: 오토 모드일 때 카운트다운 시각화 (얇은 가로 바)
- **카드 본체** (`Card.svelte`): 탭하면 뜻/요미카타가 보임. 처음엔 한자만.
  - 앞면: 한자(또는 카나) 큰 글자 + "탭하면 뜻과 요미카타가 보여" 안내
  - 뒷면: 요미카타 + 영어 뜻 + JLPT 배지 + 빈도 + 품사
- 하단 3버튼:
  - 모르겠어 (rose 톤)
  - 알겠어 (slate, 기본)
  - ✓ 마스터 (emerald 톤)
- 한 바퀴 끝나면: 통계 + "다시 회독" 버튼

### `/list` List
전체 단어 목록 + 검색 + 필터.

- 검색 입력 (한자/요미카타/영어 뜻)
- 필터 칩: ALL / N5 / N4 / N3 / N2 / N1 / ADDED / MASTERED
- 카드형 리스트 — 각 행에 마스터 토글 버튼 (○ ↔ ✓)

### `/add` Add
JMdict 풀에서 단어를 검색해서 내 학습 큐에 추가.

- 검색 입력 (한자/요미카타/영어)
- 디바운스 120ms
- 추가 버튼: 미추가 = primary, 추가됨 = ghost+disabled

### `/settings` Settings
- 오토 모드 토글 + 대기 시간 슬라이더 (2~20초)
- 학습 범위: JLPT 레벨 칩 multi-select, 마스터 숨김 토글, 추가 단어만 토글
- 테마: system / light / dark
- 핀 동기화 (예정): 자리만 잡혀있고 disabled

### 하단 네비 (`BottomNav.svelte`)
4탭: 학습 🎯 / 목록 📚 / 추가 ➕ / 설정 ⚙️

## 데이터 모델

### `VocabEntry` (`src/types.ts`)
```ts
{
  id: string          // 'jm-1234567' (JMdict) or 'jl-한자-요미' (JLPT-only stub)
  kanji: string
  reading: string     // 히라가나/카타카나
  meanings: string[]  // 영어 뜻, 최대 5개
  pos?: string[]      // 품사 약어 (n, v5, adj-i 등 JMdict 표기)
  jlpt?: 'N5'|'N4'|'N3'|'N2'|'N1'
  freqRank?: number   // 1=가장 빈출
  tags?: string[]
}
```

### `ProgressRow` (사용자 진도)
```ts
{
  id: string         // VocabEntry.id
  mastered: 0 | 1
  lastSeen: number
  reviewCount: number
  knownCount: number
  unknownCount: number
  addedAt: number    // 0이면 자동 노출, >0이면 사용자가 직접 추가
}
```

### `Settings`
오토 모드, 다크 모드, 학습 범위 필터, 핀 디바이스 ID 등.

## 데이터 흐름

```
public/data/vocab.json      ← 빌드 산출물 (3.8MB, gzip 1.2MB)
       ↓ ensureVocabLoaded()
   IndexedDB.vocab (~24,000 rows)
       ↓ getAllVocab() / searchVocab()
   메모리 캐시 (Array)
       ↓ buildQueue(filter)
   학습 큐 (200장 셔플)
       ↓ recordOutcome()
   IndexedDB.progress
```

- 첫 방문 1회만 vocab.json fetch → IndexedDB 적재 (오프라인 동작 OK)
- 모든 검색·필터·회독은 **로컬에서** 동작
- 진도 변경은 IndexedDB 영구 저장
- 향후 D1 동기화는 progress 테이블만 보내면 충분

## 디렉토리

```
aimtotopjlpt/
├── public/
│   ├── data/vocab.json         # 빌드 산출물 (스크립트가 생성)
│   ├── icon-{192,512,512-maskable}.png   # 임시 placeholder, 실제 디자인 교체 권장
│   └── favicon.svg
├── scripts/
│   ├── build-vocab.mjs         # JMdict-eng-common + Bluskyo JLPT → vocab.json
│   ├── make-icons.mjs          # placeholder 아이콘 생성
│   └── .cache/                 # 다운로드 캐시 (gitignore)
├── src/
│   ├── main.ts                 # mount Svelte 5 app
│   ├── App.svelte              # router shell + 데이터 로딩 게이트
│   ├── app.css                 # tailwind base + .btn / .card-surface 유틸
│   ├── types.ts
│   ├── lib/
│   │   ├── db.ts               # Dexie schema (vocab, progress, meta)
│   │   ├── vocab.ts            # vocab fetch + IndexedDB sync + 검색
│   │   ├── study-engine.ts     # 큐 빌드, outcome 기록, 마스터 토글
│   │   └── stores/
│   │       ├── settings.ts     # localStorage 영속 + svelte writable
│   │       └── session.ts      # 현재 학습 세션 상태
│   ├── components/
│   │   ├── BottomNav.svelte
│   │   ├── Card.svelte
│   │   └── AutoTimer.svelte
│   └── routes/
│       ├── Study.svelte
│       ├── List.svelte
│       ├── Add.svelte
│       └── Settings.svelte
├── vite.config.ts              # Vite + svelte + vite-plugin-pwa
├── tailwind.config.js
├── package.json
└── CLAUDE.md
```

## 디자인 가이드라인 (현재의 임시 톤)

지금은 미니멀 슬레이트 톤. 디자인 Claude가 자유롭게 갈아끼워도 돼.

- **타이포**: 한자는 `font-jp` (Noto Sans JP), 한국어 UI는 `font-ko` (Noto Sans KR / Pretendard)
- **컬러**: slate-50 ~ slate-900 / 다크모드는 slate-900 베이스
- **포인트**: 모르겠어 = rose, 마스터 = emerald, 그 외 중성 slate
- **레이아웃**: 모바일 first, max-w-md (~28rem) 중앙 정렬
- **반경**: 카드 rounded-2xl, 버튼 rounded-xl, 칩 rounded-full
- **인터랙션**: 탭 시 active:scale-95~99 미세한 누름

### 디자인 자유도가 큰 곳
- `Card.svelte` — 카드 비주얼이 앱의 얼굴
- `Study.svelte` 하단 3버튼 — 시각적으로 세 액션을 분명히 구분하면 좋아
- 빈 상태(empty state) 일러스트나 아이콘 추가 권장
- 다크모드 톤 다듬기

### 건드리지 않는 게 좋은 곳
- `src/lib/` 전체 (비즈니스 로직)
- `src/types.ts` (스키마)
- `src/lib/study-engine.ts`의 큐/마스터/오토 흐름

## 빌드/실행

```bash
npm install
npm run build:vocab      # vocab.json 생성/갱신 (수 초 ~ 수 분, 첫 회 캐시 다운로드)
npm run dev              # http://localhost:5173
npm run build            # 프로덕션 번들 → dist/
npm run check            # svelte-check (타입 검증)
npm run deploy           # CF Pages 배포 (--branch=main 필수)
```

## 알려진 한계 / 향후 작업

- ~691개 JLPT 단어가 JMdict-eng-common에 없어서 "(meaning pending)" 상태. 필요하면 풀 JMdict-eng (11MB)로 보강 가능.
- 음성(TTS): Web Speech API로 추가 가능. 현재 settings.voiceEnabled만 자리잡혀 있음.
- D1 동기화: settings.pinDeviceId + Workers 엔드포인트로 확장 예정.

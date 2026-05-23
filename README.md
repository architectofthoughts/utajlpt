# utajlpt

가사로 배우고, 회독으로 굳히는 일본어 학습 PWA.

이전 두 앱 [aimtotopjlpt](https://github.com/architectofthoughts/aimtotopjlpt) + [lyricstudy](https://github.com/architectofthoughts/lyricstudy)의 통합 후속작.

## 빠른 시작

```bash
npm install
npm run build:vocab     # 첫 실행 시 ~1분 (JMdict 캐시 다운로드)
npm run dev             # http://localhost:5173
```

## 주요 기능

### 회독 (JLPT 단어)
- JMdict + JLPT N5~N1 + 빈도순, 약 24,000 단어
- **오토 모드**: 일정 시간 내 "모르겠어" 안 누르면 자동 "알겠어"
- **마스터 처리**: 영구히 큐 제외
- 검색·필터·단어 추가
- 오프라인 동작 (PWA)

### 가사 분석
- Gemini AI로 일본 가사 분석 — 로마자/번역/라인별 해석/문법/단어/퀴즈
- LRCLIB 자동 검색 (제목·아티스트만 입력)
- 노래별 JLPT 난이도 점수, 분포
- 분석 결과는 내 라이브러리로 보존

### 양방향 링크
- 가사 단어 → 내 단어장으로 한 번에 추가
- 단어 상세 → 이 단어가 나온 노래 리스트, 가사 라인으로 점프

## 데이터 출처

- [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified) — JMdict (CC-BY-SA-4.0)
- [Bluskyo/JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary) — JLPT 레벨 매핑
- [LRCLIB](https://lrclib.net/) — 가사 데이터베이스
- 원본 JMdict 프로젝트: <https://www.edrdg.org/jmdict/j_jmdict.html>

## 인증

Google OAuth 2.0. 인증된 사용자에게 서버에서 Gemini API를 프록시. 개인 사용 가정.

## 라이선스

코드 MIT, 데이터는 출처 라이선스를 따름.

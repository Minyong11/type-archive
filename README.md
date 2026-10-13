# Minyong Shin — Type Archive

내 폰트를 아카이빙하고, 직접 타이핑해 보고, 글리프의 노드를 움직여 볼 수 있는 포트폴리오 사이트.

## 로컬에서 열기

브라우저 보안 때문에 `index.html`을 더블클릭하면 폰트를 못 읽습니다. 이 폴더에서 로컬 서버를 띄우세요.

```bash
cd ~/Desktop/"2026_라틴 타입 디자인"/portfolio && python3 -m http.server 5190
```

그다음 http://localhost:5190 접속.

## 새 폰트 / 새 버전 추가

1. Glyphs에서 OTF로 내보내기 → `fonts/<폰트이름>/` 에 넣기
2. `fonts/fonts.js` 의 `versions` 맨 위(최신)에 한 줄 추가하거나, 새 폰트 항목을 추가

## 파일 구조

- `index.html` — 페이지 뼈대
- `style.css` — 디자인
- `app.js` — 아카이브 / 타입 테스터 / 글리프 그리드 / 노드 에디터
- `fonts/fonts.js` — 폰트 목록(이름, 설명, 버전)

## 노드 에디터

- 노드/핸들 드래그, Shift+클릭 다중 선택, 화살표(Shift = 10) 이동, ⌘Z
- 빨간 점선 드래그 = advance width
- 휠 = 확대, 빈 곳 드래그 = 이동, 더블클릭 = 맞춤 보기
- 수정하면 폰트가 브라우저에서 다시 만들어져 테스터에 즉시 반영, "Download edited .otf"로 받을 수 있음
- 방문자가 수정한 내용은 저장되지 않음 (새로고침하면 원래대로)

## 주의

`font/` 폴더의 FF Bau, Neue Haas Grotesk, Univers, Optima는 상용 폰트라 사이트에 올리면 안 됩니다. 직접 만든 폰트만 `fonts/` 에 넣으세요.

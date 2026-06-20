# soksak-plugin-overlay-draw

화면 위에 연필로 자유롭게 적고 그리는 **낙서 오버레이** soksak 플러그인.

`position:fixed` 캔버스 한 장을 앱 위에 띄운다(`ui:overlay:screen`). 그리기 모드를 켜면 펜으로
낙서하고, 끄면 클릭은 통과하되 낙서는 화면에 남는다. **DOM 오버레이라 `window.snapshot` 스크린샷에도
그대로 잡힌다.**

## 사용

- **타이틀바 ✏️ 버튼**(우측 컨트롤 라인) — 클릭으로 그리기 모드 켜기/끄기(사람용 진입점).
- 그리기 모드 ON: 하단 툴바(색 8 · 굵기 4 · 지우개 · 되돌리기 · 지우기 · 완료)로 낙서.
- 그리기 모드 OFF: 낙서는 남고 클릭은 통과.

## 커맨드 (CLI / MCP / Skill — 전부 노출)

| 커맨드 | 설명 |
|---|---|
| `pin.toggle {on?}` | 그리기 모드 켜기/끄기(생략=토글) |
| `pin.color {color}` | 펜 색(CSS 색) |
| `pin.width {px}` | 펜 굵기 1~64 |
| `pin.eraser {on?}` | 지우개 모드 |
| `pin.stroke {points,color?,width?,eraser?}` | **프로그램적 낙서 한 획**(AI·E2E — `points`=`[[x,y],...]` 화면 픽셀) |
| `pin.tools {show?}` | 도구(툴바) 가리기/열기 — **캡처 직전 가리기용**(낙서·그리기 모드는 유지) |
| `pin.undo` / `pin.clear` | 마지막 획 / 전부 지우기 |
| `pin.state` | 상태 읽기 |

## 깨끗한 스크린샷 (도구 없이 낙서만)

```
sok plugin.soksak-plugin-overlay-draw.tools '{"show":false}'   # 도구 가리기
sok window.snapshot '{"path":"/tmp/shot.png"}'        # 낙서만 캡처
sok plugin.soksak-plugin-overlay-draw.tools '{"show":true}'    # 도구 다시 열기
```

## 개발

```
npm install
npm test          # strokes.js 순수 로직(cleanPoints/makeStroke/undo/clampWidth)
```

라이브 검증: 노출 커맨드(`pin.stroke`/`pin.tools`) + `window.snapshot` PNG 로 그린다·캡처된다 확인.

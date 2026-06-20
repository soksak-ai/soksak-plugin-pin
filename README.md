# soksak-plugin-overlay-draw

A **freehand drawing overlay** soksak plugin — draw and write anything on screen with a
pen.

Floats a single `position:fixed` canvas above the app (`ui:overlay:screen`). While draw
mode is on, you can annotate with a pen; when off, clicks pass through but the drawing
remains. **Being a DOM overlay, drawings are captured as-is in `window.snapshot`
screenshots.**

## Usage

- **Title bar ✏️ button** (right control line) — click to toggle draw mode on/off (human
  entry point).
- Draw mode ON: annotate using the bottom toolbar (8 colors · 4 widths · eraser · undo ·
  clear · done).
- Draw mode OFF: drawing remains visible; clicks pass through.

## Commands (CLI / MCP / Skill — all exposed)

| Command | Description |
|---|---|
| `pin.toggle {on?}` | Turn draw mode on/off (omit to toggle) |
| `pin.color {color}` | Pen color (CSS color) |
| `pin.width {px}` | Pen width 1–64 |
| `pin.eraser {on?}` | Eraser mode |
| `pin.stroke {points,color?,width?,eraser?}` | **Programmatic single stroke** (AI·E2E — `points`=`[[x,y],...]` screen pixels) |
| `pin.tools {show?}` | Hide/show the toolbar — **use before capture to hide tools** (drawing and draw mode are preserved) |
| `pin.undo` / `pin.clear` | Undo last stroke / clear all |
| `pin.state` | Read current state |

## Clean Screenshot (drawing only, no toolbar)

```
sok plugin.soksak-plugin-overlay-draw.tools '{"show":false}'   # hide toolbar
sok window.snapshot '{"path":"/tmp/shot.png"}'        # capture drawing only
sok plugin.soksak-plugin-overlay-draw.tools '{"show":true}'    # restore toolbar
```

## Development

```
npm install
npm test          # strokes.js pure logic (cleanPoints/makeStroke/undo/clampWidth)
```

Live verification: use the exposed commands (`pin.stroke`/`pin.tools`) + `window.snapshot` PNG to confirm drawing and capture work end-to-end.

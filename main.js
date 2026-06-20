// soksak-plugin-overlay-draw — 화면 위 낙서 오버레이.
//
// sakura 패턴: position:fixed;inset:0 캔버스 1장을 document.body 에 붙인다(DOM 오버레이라 window.snapshot 에
// 잡힘 — 요구사항). 그리기 모드 OFF=pointer-events:none(낙서는 보이되 클릭 통과), ON=auto(펜으로 자유 낙서).
// 모든 기능은 커맨드로 노출(E2E·AI 자가검증) — pin.stroke 로 프로그램적 낙서도 가능(AI 가 화면에 주석).
//
// 좌표계: 화면 픽셀(clientX/Y). 캔버스는 devicePixelRatio 로 또렷하게(논리=CSS px, 물리=*dpr).

export default {
  activate(ctx) {
    const app = ctx.app;

    // ── 캔버스 오버레이 ──
    document.querySelectorAll("#soksak-pin-canvas, #soksak-pin-bar").forEach((e) => e.remove());
    const cv = document.createElement("canvas");
    cv.id = "soksak-pin-canvas";
    // z-index 는 sakura(2147483000)보다 위 — 낙서가 다른 오버레이 위에. 기본 pass-through.
    cv.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:2147483100;pointer-events:none;touch-action:none";
    document.body.appendChild(cv);
    const g = cv.getContext("2d");

    // ── 상태 ──
    const state = {
      drawing: false, // 그리기 모드(pointer-events 토글)
      toolsHidden: false, // 도구(툴바) 일시 숨김 — 캡처 직전 가리기용(그리기 모드·낙서는 유지)
      color: "#ff3b30", // 펜 색(기본 빨강)
      width: 4, // 펜 굵기(px)
      eraser: false, // 지우개 모드
    };
    // strokes = 확정된 획들. 각 stroke = { color, width, eraser, points:[[x,y]...] }. undo/clear 단위.
    let strokes = [];
    let cur = null; // 그리는 중인 stroke(미확정)

    let VW = 0,
      VH = 0,
      dpr = 1;
    function resize() {
      dpr = window.devicePixelRatio || 1;
      VW = window.innerWidth;
      VH = window.innerHeight;
      cv.width = Math.round(VW * dpr);
      cv.height = Math.round(VH * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); // 논리좌표=CSS px
      redraw();
    }

    // 한 stroke 를 캔버스에 그린다(지우개=destination-out 로 픽셀 제거).
    function paint(s) {
      const pts = s.points;
      if (!pts.length) return;
      g.save();
      g.lineCap = "round";
      g.lineJoin = "round";
      g.lineWidth = s.width;
      if (s.eraser) {
        g.globalCompositeOperation = "destination-out";
        g.strokeStyle = "rgba(0,0,0,1)";
      } else {
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = s.color;
      }
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 1) {
        // 점 하나 = 작은 동그라미(탭 낙서)
        g.lineTo(pts[0][0] + 0.01, pts[0][1]);
      } else {
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      }
      g.stroke();
      g.restore();
    }
    function redraw() {
      g.clearRect(0, 0, VW, VH);
      for (const s of strokes) paint(s);
      if (cur) paint(cur);
    }

    // ── 그리기(pointer — wry 에서 확실히 동작. HTML5 DnD 아님) ──
    cv.addEventListener("pointerdown", (e) => {
      if (!state.drawing || e.button !== 0) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      cur = { color: state.color, width: state.width, eraser: state.eraser, points: [[e.clientX, e.clientY]] };
      redraw();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!cur) return;
      cur.points.push([e.clientX, e.clientY]);
      redraw();
    });
    const endStroke = (e) => {
      if (!cur) return;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (cur.points.length) strokes.push(cur);
      cur = null;
      redraw();
    };
    cv.addEventListener("pointerup", endStroke);
    cv.addEventListener("pointercancel", endStroke);

    // ── 툴바(그리기 모드일 때만 보임) ──
    const PALETTE = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#5e5ce6", "#000000", "#ffffff"];
    const WIDTHS = [2, 4, 8, 16];
    const bar = document.createElement("div");
    bar.id = "soksak-pin-bar";
    bar.style.cssText =
      "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483101;display:none;" +
      "align-items:center;gap:8px;padding:7px 10px;border-radius:12px;background:rgba(28,28,30,.92);" +
      "box-shadow:0 8px 30px rgba(0,0,0,.45);font:12px system-ui,-apple-system,sans-serif;color:#eee;" +
      "user-select:none;white-space:nowrap;flex-wrap:nowrap;max-width:none";
    document.body.appendChild(bar);

    function syncBar() {
      // 툴바 = 그리기 모드 AND 도구 숨김 아님(캡처 직전 가리기). pointer-events 는 그리기 모드만 따름.
      bar.style.display = state.drawing && !state.toolsHidden ? "flex" : "none";
      cv.style.pointerEvents = state.drawing ? "auto" : "none";
      cv.style.cursor = state.drawing ? "crosshair" : "default";
      // 스와치·버튼 활성 표시
      bar.querySelectorAll("[data-sw]").forEach((b) => {
        b.style.outline = b.dataset.sw === state.color && !state.eraser ? "2px solid #fff" : "1px solid rgba(255,255,255,.25)";
      });
      bar.querySelectorAll("[data-w]").forEach((b) => {
        b.style.background = Number(b.dataset.w) === state.width ? "rgba(255,255,255,.25)" : "transparent";
      });
      const er = bar.querySelector("[data-eraser]");
      if (er) er.style.background = state.eraser ? "rgba(255,255,255,.25)" : "transparent";
    }
    function mkBtn(label, title) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = title || label;
      b.style.cssText =
        "appearance:none;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eee;" +
        "border-radius:7px;padding:5px 10px;font:inherit;cursor:pointer;white-space:nowrap;flex:0 0 auto;line-height:1";
      return b;
    }
    // 색 스와치
    for (const c of PALETTE) {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.dataset.sw = c;
      sw.title = c;
      sw.style.cssText =
        "width:18px;height:18px;border-radius:50%;flex:0 0 auto;border:1px solid rgba(255,255,255,.25);cursor:pointer;background:" +
        c;
      sw.addEventListener("click", () => {
        state.color = c;
        state.eraser = false;
        syncBar();
      });
      bar.appendChild(sw);
    }
    // 굵기
    const wWrap = document.createElement("div");
    wWrap.style.cssText = "display:flex;gap:2px;margin-left:4px";
    for (const w of WIDTHS) {
      const b = mkBtn("", w + "px");
      b.dataset.w = String(w);
      b.style.padding = "0";
      b.style.width = "24px";
      b.style.height = "24px";
      b.style.flex = "0 0 auto";
      b.style.position = "relative";
      const dot = document.createElement("span");
      dot.style.cssText =
        "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;background:#eee;width:" +
        w +
        "px;height:" +
        w +
        "px";
      b.appendChild(dot);
      b.addEventListener("click", () => {
        state.width = w;
        syncBar();
      });
      wWrap.appendChild(b);
    }
    bar.appendChild(wWrap);
    // 지우개·되돌리기·지우기·완료
    const erBtn = mkBtn("지우개", "지우개 모드");
    erBtn.dataset.eraser = "1";
    erBtn.style.marginLeft = "4px";
    erBtn.addEventListener("click", () => {
      state.eraser = !state.eraser;
      syncBar();
    });
    const undoBtn = mkBtn("되돌리기", "마지막 획 되돌리기");
    undoBtn.addEventListener("click", () => doUndo());
    const clearBtn = mkBtn("지우기", "전부 지우기");
    clearBtn.addEventListener("click", () => doClear());
    const doneBtn = mkBtn("완료", "그리기 모드 끄기");
    doneBtn.style.cssText += ";background:#0a84ff;border-color:#0a84ff;font-weight:600";
    doneBtn.addEventListener("click", () => setDraw(false));
    bar.append(erBtn, undoBtn, clearBtn, doneBtn);

    // ── 동작(커맨드·툴바·타이틀바 버튼 공용) ──
    function setDraw(on) {
      state.drawing = !!on;
      syncBar();
      // 타이틀바 연필 버튼 active 갱신(같은 id 재등록 = 갱신).
      try {
        app.ui.registerHeaderAction({
          id: "draw",
          label: "✏️",
          title: state.drawing ? "낙서 끄기" : "낙서 켜기",
          active: state.drawing,
          onClick: () => setDraw(!state.drawing),
        });
      } catch (_) {}
      // 오버레이 입력 게이트 — 네이티브 webview(브라우저 패널) 위에서도 펜 클릭이 성립하게.
      try {
        app.ui.setOverlayActive(state.drawing);
      } catch (_) {}
    }
    function doUndo() {
      strokes.pop();
      redraw();
    }
    function doClear() {
      strokes = [];
      cur = null;
      redraw();
    }

    window.addEventListener("resize", resize);
    resize();
    syncBar();
    // 타이틀바 연필 버튼 최초 등록(사람용 진입점 — 우측 컨트롤 라인). 클릭=그리기 모드 토글.
    setDraw(false);

    // ── 커맨드(전부 노출 — E2E·AI) ──
    // description = English base (what/when/why). triggers.ko = Korean vocabulary for discovery.
    // i18n two-axis rule: English matching base + per-language trigger words (space-separated).
    const reg = (n, description, triggers, params, h) =>
      ctx.subscriptions.push(app.commands.register(n, { description, triggers, params, handler: h }));

    reg(
      "toggle",
      "Toggle screen doodle overlay — draw lines, text, circles on app/browser/view with a pen. Use when user says they marked, drew, annotated, or doodled on screen, or asks to draw on screen.",
      { ko: "낙서 그리기 표시 주석 켜기 끄기 오버레이" },
      { on: { type: "boolean", description: "true=켜기, false=끄기, 생략=토글" } },
      (p) => {
        setDraw(typeof (p && p.on) === "boolean" ? p.on : !state.drawing);
        return { drawing: state.drawing };
      },
    );
    reg(
      "color",
      "Set doodle pen color — changes the CSS color for subsequent strokes. Switches out of eraser mode. Use when user asks to change pen/stroke color.",
      { ko: "낙서 펜 색 색상 바꾸기 변경" },
      { color: { type: "string", description: "CSS 색(예 #0a84ff, red)" } },
      (p) => {
        if (p && p.color) {
          state.color = String(p.color);
          state.eraser = false;
          syncBar();
        }
        return { color: state.color };
      },
    );
    reg(
      "width",
      "Set doodle pen width — changes stroke thickness in px (1–64). Use when user asks for a thinner or thicker pen.",
      { ko: "낙서 펜 굵기 두께 선 굵기 변경" },
      { px: { type: "number", description: "펜 굵기 1~64" } },
      (p) => {
        const w = Math.max(1, Math.min(64, Math.round(Number(p && p.px) || state.width)));
        state.width = w;
        syncBar();
        return { width: w };
      },
    );
    reg(
      "eraser",
      "Toggle eraser mode — rub out drawn strokes by dragging over them. Distinct from clear (wipes all) and undo (removes last stroke). Use when user asks to erase or rub out part of a doodle.",
      { ko: "지우개 지우기 모드 켜기 끄기" },
      { on: { type: "boolean", description: "true=지우개, false=펜, 생략=토글" } },
      (p) => {
      state.eraser = typeof (p && p.on) === "boolean" ? p.on : !state.eraser;
      syncBar();
      return { eraser: state.eraser };
    });
    reg(
      "stroke",
      "Draw one stroke programmatically via coordinates — lets AI or automation mark/highlight a specific position (logo, button, area) on screen without human drag. Use when user asks AI to annotate or point to something on screen.",
      { ko: "낙서 획 그리기 좌표 프로그램 AI 주석 강조 표시" },
      {
        points: { type: "array", required: true, description: "[[x,y],...] 화면 픽셀 좌표(한 획)" },
        color: { type: "string", description: "이 획 색(생략=현재 색)" },
        width: { type: "number", description: "이 획 굵기(생략=현재 굵기)" },
        eraser: { type: "boolean", description: "이 획 지우개(생략=false)" },
      },
      (p) => {
        // 정제 = strokes.js cleanPoints 와 동일 알고리즘(검증된 명세). 번들러 없는 단일 파일이라 인라인.
        const pts = Array.isArray(p && p.points) ? p.points : [];
        const clean = pts
          .filter((pt) => Array.isArray(pt) && pt.length >= 2) // null·비배열 제거(pt[0] throw·[0,0] 오통과 방지)
          .map((pt) => [Number(pt[0]), Number(pt[1])])
          .filter((pt) => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
        if (!clean.length) return { ok: false, error: "points 필요([[x,y],...])" };
        const s = {
          color: p && p.color ? String(p.color) : state.color,
          width: p && Number.isFinite(Number(p.width)) ? Number(p.width) : state.width,
          eraser: !!(p && p.eraser),
          points: clean,
        };
        strokes.push(s);
        redraw();
        return { ok: true, strokes: strokes.length, points: clean.length };
      },
    );
    reg(
      "tools",
      "Hide or show the doodle toolbar — useful to hide the UI before taking a screenshot so only strokes are visible (drawing mode and strokes are preserved). Pattern: tools(show:false) → snapshot → tools(show:true).",
      { ko: "도구 툴바 숨기기 보이기 스크린샷 캡처 전" },
      { show: { type: "boolean", description: "true=도구 열기, false=가리기, 생략=토글" } },
      (p) => {
        state.toolsHidden = typeof (p && p.show) === "boolean" ? !p.show : !state.toolsHidden;
        syncBar();
        return { toolsHidden: state.toolsHidden, visible: state.drawing && !state.toolsHidden };
      },
    );
    reg("undo", "Undo the last doodle stroke. Use when user says the last mark was wrong or wants it removed.", { ko: "낙서 되돌리기 취소 마지막 획" }, {}, () => {
      doUndo();
      return { strokes: strokes.length };
    });
    reg("clear", "Clear all doodles and annotations from the screen (blank canvas). Use when user asks to remove all marks.", { ko: "낙서 전부 지우기 초기화 다 지워" }, {}, () => {
      doClear();
      return { strokes: 0 };
    });
    reg(
      "state",
      "Read current doodle state — drawing mode, pen color, width, eraser mode, stroke count, toolbar visibility. Use when checking what is drawn or how many strokes are on screen.",
      { ko: "낙서 상태 확인 현재 모드 획 수" },
      {},
      () => ({
        drawing: state.drawing,
        toolsHidden: state.toolsHidden,
        color: state.color,
        width: state.width,
        eraser: state.eraser,
        strokes: strokes.length,
      }),
    );

    // ── 정리 ──
    ctx.subscriptions.push({
      dispose() {
        window.removeEventListener("resize", resize);
        cv.remove();
        bar.remove();
      },
    });
  },
  deactivate() {},
};

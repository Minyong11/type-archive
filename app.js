// Minyong Shin — Type Archive
// Fonts are parsed in the browser with opentype.js; edits in the node editor
// regenerate the font binary and swap it into the type tester live.

const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");
const FONTS = window.FONTS || [];
const loaded = new Map(); // "id|versionIndex" -> { font, buf, family, face, originals, edited }

const PRESETS = {
  "Hamburgefonstiv": "Hamburgefonstiv",
  "Pangram": "The quick brown fox jumps over the lazy dog.",
  "Lowercase": "abcdefghijklmnopqrstuvwxyz",
  "Uppercase": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "Figures": "0123456789",
  "Spacing n": "nnannbnncnndnnennfnngnnhnninnjnnknnlnnmnnonnpnnqnnrnnsnntnnunnvnnwnnxnnynnzn",
  "Spacing o": "oaobocodoeofogohoiojokolomonopoqorosotouovowoxoyozo",
};

// ---------- loading ----------

async function loadVersion(entry, vi) {
  const key = `${entry.id}|${vi}`;
  if (loaded.has(key)) return loaded.get(key);
  const v = entry.versions[vi];
  const buf = v.buffer || (await (await fetch(v.file)).arrayBuffer());
  const font = opentype.parse(buf);
  const family = `live-${entry.id}-${vi}`.replace(/[^\w-]/g, "");
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  const rec = { font, buf, family, face, originals: new Map(), edited: new Set(), seq: 0 };
  loaded.set(key, rec);
  return rec;
}

// ---------- path helpers ----------

const f = (n) => Math.round(n * 100) / 100;
function pathD(cmds) {
  let d = "";
  for (const c of cmds) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${f(c.x)} ${f(-c.y)}`;
    else if (c.type === "C") d += `C${f(c.x1)} ${f(-c.y1)} ${f(c.x2)} ${f(-c.y2)} ${f(c.x)} ${f(-c.y)}`;
    else if (c.type === "Q") d += `Q${f(c.x1)} ${f(-c.y1)} ${f(c.x)} ${f(-c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}

function metrics(font) {
  const os2 = font.tables.os2 || {};
  return {
    upm: font.unitsPerEm,
    asc: font.ascender,
    desc: font.descender,
    cap: os2.sCapHeight || Math.round(font.ascender * 0.9),
    xh: os2.sxHeight || Math.round(font.ascender * 0.65),
  };
}

function glyphSVG(font, glyph) {
  const m = metrics(font);
  const h = m.asc - m.desc;
  const x0 = glyph.advanceWidth / 2 - h / 2;
  return `<svg viewBox="${x0} ${-m.asc} ${h} ${h}"><path d="${pathD(glyph.path.commands)}"/></svg>`;
}

const glyphLabel = (g) => g.name || (g.unicode != null ? `uni${g.unicode.toString(16).toUpperCase()}` : `#${g.index}`);

// ---------- router ----------

window.addEventListener("hashchange", route);
route();

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [page, id, vi] = h.split("/");
  window.scrollTo(0, 0);
  if (page === "font") return renderFont(id, Number(vi) || 0);
  if (page === "about") return renderAbout();
  renderArchive();
}

// ---------- archive ----------

async function renderArchive() {
  app.innerHTML = `
    <div class="archive-head">
      <h1>라틴 타입 디자인 아카이브. 각 폰트를 직접 타이핑해 보고, 글리프의 노드를 움직여 볼 수 있습니다.</h1>
      <span class="mono">${FONTS.length} typeface${FONTS.length === 1 ? "" : "s"}</span>
    </div>
    <div id="list"></div>`;
  const list = $("#list");
  for (const entry of FONTS) {
    const row = document.createElement("a");
    row.className = "archive-row";
    row.href = `#/font/${entry.id}/0`;
    row.innerHTML = `
      <div class="specimen">${entry.sample || entry.name}</div>
      <div class="meta">
        <b>${entry.name}</b>
        <span class="mono">${entry.year} — ${entry.style || ""}</span>
        <span class="mono">${entry.category || ""}</span>
        <span class="mono">${entry.status || ""}${entry.versions.length > 1 ? ` · ${entry.versions.length} versions` : ""}</span>
        <span class="mono glyphs">…</span>
      </div>`;
    list.appendChild(row);
    loadVersion(entry, 0).then((rec) => {
      $(".specimen", row).style.fontFamily = rec.family;
      $(".glyphs", row).textContent = `${rec.font.glyphs.length} glyphs`;
    }).catch((e) => ($(".glyphs", row).textContent = "failed to load: " + e.message));
  }
}

function renderAbout() {
  app.innerHTML = `
    <div class="about">
      <h1>About</h1>
      <p>신민용 — 폰트 디자이너를 지망합니다. (자기소개, 작업 관심사, 연락처를 여기에 적어주세요. 파일: app.js의 renderAbout)</p>
      <p class="mono">Contact — myshin0123@gmail.com</p>
    </div>`;
}

// ---------- font page ----------

async function renderFont(id, vi) {
  const entry = FONTS.find((e) => e.id === id);
  if (!entry) return renderArchive();
  app.innerHTML = `<div class="loading mono">Loading ${entry.name}…</div>`;
  let rec;
  try {
    rec = await loadVersion(entry, vi);
  } catch (e) {
    app.innerHTML = `<div class="loading">폰트를 불러오지 못했어요: ${e.message}<br>로컬 서버로 열었는지 확인하세요 (README 참고).</div>`;
    return;
  }
  const { font, family } = rec;
  const n = font.names;
  const name = (k) => (n[k] && (n[k].en || Object.values(n[k])[0])) || "—";

  app.innerHTML = `
    <section class="font-hero">
      <h1 class="name" style="font-family:${family}">${entry.name}</h1>
      <div class="info">
        <div><span class="mono">Style</span>${entry.style || name("fontSubfamily")}</div>
        <div><span class="mono">Year</span>${entry.year || "—"}</div>
        <div><span class="mono">Category</span>${entry.category || "—"}</div>
        <div><span class="mono">Glyphs</span>${font.glyphs.length}</div>
        <div><span class="mono">UPM</span>${font.unitsPerEm}</div>
        <div><span class="mono">Version</span>
          ${entry.versions.length > 1
            ? `<select id="ver">${entry.versions.map((v, i) => `<option value="${i}" ${i === vi ? "selected" : ""}>${v.label}${v.date ? " · " + v.date : ""}</option>`).join("")}</select>`
            : `${entry.versions[0].label}${entry.versions[0].date ? " · " + entry.versions[0].date : ""}`}
        </div>
      </div>
      ${entry.description ? `<p class="desc">${entry.description}</p>` : ""}
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Type Tester</h2>
        <select id="preset">${Object.keys(PRESETS).map((k) => `<option>${k}</option>`).join("")}</select>
        <span class="ctrl"><label>Size</label><input id="t-size" type="range" min="12" max="320" value="120"><output>120</output></span>
        <span class="ctrl"><label>Tracking</label><input id="t-track" type="range" min="-100" max="300" value="0"><output>0</output></span>
        <span class="ctrl"><label>Leading</label><input id="t-lead" type="range" min="70" max="200" value="110"><output>1.1</output></span>
        <button class="btn" data-align="left">L</button>
        <button class="btn" data-align="center">C</button>
        <button class="btn" data-align="right">R</button>
        <button class="btn" id="t-inv">Invert</button>
      </div>
      <div class="tester" id="tester" contenteditable="true" spellcheck="false" style="font-family:${family}">${entry.sample || "Hamburgefonstiv"}</div>
      <div class="waterfall" id="waterfall" style="font-family:${family}"></div>
    </section>

    <section class="block" id="editor-block">
      <div class="block-head">
        <h2>Node Editor — <span id="ed-name"></span></h2>
        <span class="ctrl"><label>Go to</label><input id="ed-go" maxlength="1" placeholder="a" style="width:34px;border:1px solid var(--ink);background:transparent;text-align:center;border-radius:4px"></span>
        <button class="btn" id="ed-fill">Fill</button>
        <button class="btn" id="ed-nodes">Hide nodes</button>
        <button class="btn" id="ed-undo">Undo</button>
        <button class="btn" id="ed-reset">Reset glyph</button>
        <button class="btn" id="ed-dl">Download edited .otf</button>
      </div>
      <div class="editor">
        <div class="editor-canvas"><svg id="ed-svg"></svg></div>
        <div class="editor-side">
          <div class="big-preview" id="ed-preview" style="font-family:${family}"></div>
          <dl id="ed-info"></dl>
          <p class="help">
            드래그로 노드/핸들 이동 · Shift+클릭 다중 선택<br>
            ←↑→↓ 1 unit · Shift+화살표 10 units<br>
            점선(빨강) 드래그 = 글자 폭(advance width)<br>
            휠/핀치 = 확대 · 빈 곳 드래그 = 이동 · 더블클릭 = 맞춤 보기<br>
            ⌘Z 되돌리기 · 수정 내용은 위 테스터에 실시간 반영
          </p>
          <p class="help">● 원 = 곡선 연결점(smooth) · ■ 사각 = 꺾인 점(corner) · 검은 점 = 시작점 · 파란 점 = 핸들</p>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Glyph Set</h2><span class="mono">${font.glyphs.length} glyphs · click to edit</span></div>
      <div class="glyph-grid" id="grid"></div>
    </section>`;

  if ($("#ver")) $("#ver").onchange = (e) => (location.hash = `#/font/${id}/${e.target.value}`);
  setupTester(entry);
  const editor = setupEditor(rec, entry);
  setupGrid(rec, editor);
}

function setupTester(entry) {
  const tester = $("#tester");
  const wf = $("#waterfall");
  const bind = (sel, fn) => {
    const el = $(sel);
    const out = el.nextElementSibling;
    const update = () => { out.textContent = fn(Number(el.value)); };
    el.addEventListener("input", update);
    update();
  };
  bind("#t-size", (v) => ((tester.style.fontSize = v + "px"), v));
  bind("#t-track", (v) => ((tester.style.letterSpacing = v / 1000 + "em"), v));
  bind("#t-lead", (v) => ((tester.style.lineHeight = v / 100), v / 100));
  document.querySelectorAll("[data-align]").forEach((b) =>
    (b.onclick = () => (tester.style.textAlign = b.dataset.align)));
  $("#t-inv").onclick = (e) => { tester.classList.toggle("invert"); e.target.classList.toggle("on"); };
  $("#preset").onchange = (e) => { tester.textContent = PRESETS[e.target.value]; drawWaterfall(); };

  const drawWaterfall = () => {
    const t = tester.textContent.trim() || entry.name;
    wf.innerHTML = [96, 72, 48, 36, 24, 18, 14, 12]
      .map((s) => `<div><span class="sz mono">${s}</span><span style="font-size:${s}px">${escapeHTML(t)}</span></div>`)
      .join("");
  };
  tester.addEventListener("input", drawWaterfall);
  drawWaterfall();
}

function setupGrid(rec, editor) {
  const grid = $("#grid");
  const { font } = rec;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    const cell = document.createElement("div");
    cell.className = "glyph-cell";
    cell.dataset.i = i;
    cell.title = glyphLabel(g) + (g.unicode != null ? ` U+${g.unicode.toString(16).toUpperCase().padStart(4, "0")}` : "");
    cell.innerHTML = glyphSVG(font, g) + `<span class="gn">${glyphLabel(g)}</span>`;
    cell.onclick = () => {
      editor.open(i);
      $("#editor-block").scrollIntoView({ behavior: "smooth" });
    };
    frag.appendChild(cell);
  }
  grid.appendChild(frag);
  editor.onChange = (i) => {
    const cell = grid.querySelector(`[data-i="${i}"]`);
    if (!cell) return;
    cell.querySelector("svg").outerHTML = glyphSVG(font, font.glyphs.get(i));
    cell.classList.toggle("edited", rec.edited.has(i));
  };
  editor.onOpen = (i) => {
    grid.querySelectorAll(".active").forEach((c) => c.classList.remove("active"));
    grid.querySelector(`[data-i="${i}"]`)?.classList.add("active");
  };
  rec.edited.forEach((i) => grid.querySelector(`[data-i="${i}"]`)?.classList.add("edited"));
  editor.open(editor.defaultIndex);
}

// ---------- node editor ----------

function buildModel(cmds) {
  // Turns opentype path commands into on-curve nodes and off-curve handles.
  // Each point holds refs ({c, kx, ky}) to the command fields it controls.
  const nodes = [], handles = [];
  let start = null, prev = null;
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    if (c.type === "Z") { start = null; continue; }
    if (c.type === "M") {
      prev = start = { kind: "on", refs: [{ c, kx: "x", ky: "y" }], attached: [], start: true };
      nodes.push(start);
      continue;
    }
    const next = cmds[i + 1];
    const s = start.refs[0].c;
    const closes = (!next || next.type === "Z" || next.type === "M") && c.x === s.x && c.y === s.y;
    let n;
    if (closes) { n = start; n.refs.push({ c, kx: "x", ky: "y" }); }
    else { n = { kind: "on", refs: [{ c, kx: "x", ky: "y" }], attached: [] }; nodes.push(n); }
    if (c.type === "C") {
      const h1 = { kind: "off", refs: [{ c, kx: "x1", ky: "y1" }], anchors: [prev] };
      const h2 = { kind: "off", refs: [{ c, kx: "x2", ky: "y2" }], anchors: [n] };
      prev.attached.push(h1);
      n.attached.push(h2);
      handles.push(h1, h2);
    } else if (c.type === "Q") {
      handles.push({ kind: "off", refs: [{ c, kx: "x1", ky: "y1" }], anchors: [prev, n] });
    }
    prev = n;
  }
  for (const n of nodes) n.smooth = isSmooth(n);
  return { points: [...nodes, ...handles], nodes, handles };
}

const pos = (p) => ({ x: p.refs[0].c[p.refs[0].kx], y: p.refs[0].c[p.refs[0].ky] });
function setPos(p, x, y) { for (const r of p.refs) { r.c[r.kx] = x; r.c[r.ky] = y; } }

function isSmooth(n) {
  if (n.attached.length !== 2) return false;
  const o = pos(n), a = pos(n.attached[0]), b = pos(n.attached[1]);
  const ax = a.x - o.x, ay = a.y - o.y, bx = b.x - o.x, by = b.y - o.y;
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (!la || !lb) return false;
  return Math.abs(ax * by - ay * bx) / (la * lb) < 0.03 && ax * bx + ay * by < 0;
}

function snapshot(glyph) {
  return { cmds: glyph.path.commands.map((c) => ({ ...c })), adv: glyph.advanceWidth };
}
function restore(glyph, snap) {
  glyph.path.commands.forEach((c, i) => Object.assign(c, snap.cmds[i]));
  glyph.advanceWidth = snap.adv;
}

function setupEditor(rec, entry) {
  const { font } = rec;
  const m = metrics(font);
  const svg = $("#ed-svg");
  const canvas = svg.parentElement;
  let gi = 0, glyph, model, sel = new Set(), drag = null, undo = [], view = null; // view: null = fit to glyph
  let showFill = false;

  const editor = {
    onChange: () => {},
    onOpen: () => {},
    defaultIndex: Math.max(0, ["a", "n", "A"].map((ch) => font.charToGlyphIndex(ch)).find((i) => i > 0) || 1),
    open(i) {
      gi = i;
      glyph = font.glyphs.get(i);
      if (!rec.originals.has(i)) rec.originals.set(i, snapshot(glyph));
      model = buildModel(glyph.path.commands);
      sel.clear();
      undo = [];
      view = null;
      $("#ed-name").textContent = glyphLabel(glyph);
      $("#ed-preview").textContent = glyph.unicode != null ? String.fromCodePoint(glyph.unicode) : "";
      draw();
      editor.onOpen(i);
    },
  };

  // --- drawing ---
  const aspect = () => canvas.clientWidth / Math.max(canvas.clientHeight, 1);
  function viewBox() {
    if (view) return { ...view, w: view.h * aspect() };
    let h = (m.asc - m.desc) * 1.08;
    const w = Math.max(glyph.advanceWidth * 1.3, h * aspect());
    h = w / aspect();
    const cx = glyph.advanceWidth / 2;
    return { x: cx - w / 2, y: -(m.asc + m.desc) / 2 - h / 2, w, h };
  }

  function draw() {
    const vb = viewBox();
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const scale = canvas.clientHeight ? vb.h / canvas.clientHeight : 1; // font units per px
    const r = 4.5 * scale;
    const lines = [["ascender", m.asc], ["cap", m.cap], ["x-height", m.xh], ["baseline", 0], ["descender", m.desc]];
    let out = "";
    for (const [label, y] of lines) {
      out += `<line class="ed-metric" x1="${vb.x}" x2="${vb.x + vb.w}" y1="${-y}" y2="${-y}"/>`;
      out += `<text class="ed-metric-label" x="${vb.x + 8 * scale}" y="${-y - 4 * scale}" style="font-size:${10 * scale}px">${label} ${y}</text>`;
    }
    out += `<line class="ed-metric" x1="0" x2="0" y1="${vb.y}" y2="${vb.y + vb.h}"/>`;
    const a = glyph.advanceWidth;
    out += `<line class="ed-adv" x1="${a}" x2="${a}" y1="${vb.y}" y2="${vb.y + vb.h}"/>`;
    out += `<line class="ed-adv-hit" data-adv="1" x1="${a}" x2="${a}" y1="${vb.y}" y2="${vb.y + vb.h}"/>`;
    out += `<text class="ed-metric-label" x="${a + 6 * scale}" y="${vb.y + 16 * scale}" style="font-size:${10 * scale}px;fill:var(--accent)">${a}</text>`;
    out += `<path class="ed-fill ${showFill ? "solid" : ""}" d="${pathD(glyph.path.commands)}"/>`;
    out += `<g class="${showFill ? "hide-nodes" : ""}">`;
    for (const h of model.handles) {
      const p = pos(h);
      for (const an of h.anchors) {
        const q = pos(an);
        out += `<line class="ed-handle-line" x1="${q.x}" y1="${-q.y}" x2="${p.x}" y2="${-p.y}"/>`;
      }
    }
    model.points.forEach((p, i) => {
      const { x, y } = pos(p);
      const s = sel.has(p) ? " sel" : "";
      if (p.kind === "off") out += `<circle class="ed-off${s}" data-p="${i}" cx="${x}" cy="${-y}" r="${r * 0.8}"/>`;
      else if (p.smooth) out += `<circle class="ed-on${s}${p.start ? " start" : ""}" data-p="${i}" cx="${x}" cy="${-y}" r="${r}"/>`;
      else out += `<rect class="ed-on${s}${p.start ? " start" : ""}" data-p="${i}" x="${x - r}" y="${-y - r}" width="${r * 2}" height="${r * 2}"/>`;
    });
    out += `</g>`;
    svg.innerHTML = out;
    drawInfo();
  }

  function drawInfo() {
    const bb = glyph.getBoundingBox();
    const one = sel.size === 1 ? pos([...sel][0]) : null;
    $("#ed-info").innerHTML = `
      <dt>Glyph</dt><dd>${glyphLabel(glyph)}</dd>
      <dt>Unicode</dt><dd>${glyph.unicode != null ? "U+" + glyph.unicode.toString(16).toUpperCase().padStart(4, "0") : "—"}</dd>
      <dt>Width</dt><dd>${glyph.advanceWidth}</dd>
      <dt>LSB / RSB</dt><dd>${Math.round(bb.x1)} / ${Math.round(glyph.advanceWidth - bb.x2)}</dd>
      <dt>Nodes</dt><dd>${model.nodes.length} on · ${model.handles.length} off</dd>
      <dt>Selected</dt><dd>${one ? `x ${Math.round(one.x)}  y ${Math.round(one.y)}` : sel.size ? sel.size + " points" : "—"}</dd>
      <dt>Edited</dt><dd>${rec.edited.size} glyph${rec.edited.size === 1 ? "" : "s"}</dd>`;
  }

  // --- interaction ---
  function toFont(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: -p.y };
  }

  function movingSet() {
    // selected points + handles attached to selected nodes
    const set = new Set(sel);
    for (const p of sel) if (p.kind === "on") p.attached.forEach((h) => set.add(h));
    return set;
  }

  function changed() {
    rec.edited.add(gi);
    draw();
    editor.onChange(gi);
    scheduleRebuild();
  }

  svg.addEventListener("pointerdown", (e) => {
    const t = e.target;
    const start = toFont(e);
    if (t.dataset.adv) {
      undo.push(snapshot(glyph));
      drag = { adv: true };
    } else if (t.dataset.p != null) {
      const p = model.points[+t.dataset.p];
      if (e.shiftKey) sel.has(p) ? sel.delete(p) : sel.add(p);
      else if (!sel.has(p)) { sel.clear(); sel.add(p); }
      undo.push(snapshot(glyph));
      const moving = movingSet();
      drag = { start, orig: new Map([...moving].map((q) => [q, pos(q)])), handle: sel.size === 1 && p.kind === "off" ? p : null };
    } else {
      // empty space: drag to pan, click to deselect
      drag = { pan: true, cx: e.clientX, cy: e.clientY, vb: viewBox(), moved: false };
    }
    svg.setPointerCapture(e.pointerId);
    draw();
  });

  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (drag.pan) {
      const k = drag.vb.h / canvas.clientHeight;
      const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      if (drag.moved) { view = { ...drag.vb, x: drag.vb.x - dx * k, y: drag.vb.y - dy * k }; draw(); }
      return;
    }
    const p = toFont(e);
    if (drag.adv) {
      glyph.advanceWidth = Math.max(0, Math.round(p.x));
      return changed();
    }
    const dx = Math.round(p.x - drag.start.x), dy = Math.round(p.y - drag.start.y);
    for (const [q, o] of drag.orig) setPos(q, o.x + dx, o.y + dy);
    if (drag.handle) keepSmooth(drag.handle);
    changed();
  });

  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.pan) { if (!d.moved) { sel.clear(); draw(); } return; }
    if (undo.length && JSON.stringify(undo[undo.length - 1]) === JSON.stringify(snapshot(glyph))) undo.pop();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);

  // Rotate the opposite handle of a smooth node so the curve stays tangent-continuous.
  function keepSmooth(h) {
    const n = h.anchors.length === 1 && h.anchors[0];
    if (!n || !n.smooth) return;
    const other = n.attached.find((a) => a !== h);
    if (!other) return;
    const o = pos(n), hp = pos(h), op = pos(other);
    const len = Math.hypot(op.x - o.x, op.y - o.y);
    const d = Math.hypot(hp.x - o.x, hp.y - o.y);
    if (!d) return;
    setPos(other, Math.round(o.x - ((hp.x - o.x) / d) * len), Math.round(o.y - ((hp.y - o.y) / d) * len));
  }

  document.addEventListener("keydown", (e) => {
    if (!document.body.contains(svg)) return;
    const typing = e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
    if (typing) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); return doUndo(); }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir || !sel.size) return;
    e.preventDefault();
    const k = e.shiftKey ? 10 : 1;
    undo.push(snapshot(glyph));
    for (const q of movingSet()) { const o = pos(q); setPos(q, o.x + dir[0] * k, o.y + dir[1] * k); }
    if (sel.size === 1) keepSmooth([...sel][0]);
    changed();
  });

  function doUndo() {
    const s = undo.pop();
    if (!s) return;
    restore(glyph, s);
    changed();
  }

  $("#ed-undo").onclick = doUndo;
  $("#ed-reset").onclick = () => {
    undo.push(snapshot(glyph));
    restore(glyph, rec.originals.get(gi));
    rec.edited.delete(gi);
    draw();
    editor.onChange(gi);
    scheduleRebuild();
  };
  $("#ed-fill").onclick = (e) => { showFill = !showFill; e.target.classList.toggle("on", showFill); draw(); };
  $("#ed-nodes").onclick = (e) => { svg.classList.toggle("hide-nodes", e.target.classList.toggle("on")); };
  $("#ed-go").addEventListener("input", (e) => {
    const ch = e.target.value;
    if (!ch) return;
    const i = font.charToGlyphIndex(ch);
    if (i > 0) editor.open(i);
    e.target.select();
  });
  $("#ed-dl").onclick = () => {
    const blob = new Blob([font.toArrayBuffer()], { type: "font/otf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entry.name}-${entry.style || "Regular"}-edited.otf`.replace(/\s+/g, "");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const ro = new ResizeObserver(() => {
    if (!document.body.contains(svg)) return ro.disconnect(); // page was re-rendered
    if (glyph && canvas.clientHeight) draw();
  });
  ro.observe(canvas);

  // wheel / pinch zoom around the cursor, double-click empty space to fit
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const vb = viewBox();
    const r = svg.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const z = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
    const h = Math.min(Math.max(vb.h * z, 60), (m.asc - m.desc) * 6), w = h * aspect();
    view = { x: vb.x + fx * vb.w - fx * w, y: vb.y + fy * vb.h - fy * h, h };
    draw();
  }, { passive: false });
  svg.addEventListener("dblclick", (e) => {
    if (e.target.dataset.p == null) { view = null; draw(); }
  });

  // --- live font regeneration ---
  let timer = null, last = 0;
  function scheduleRebuild() {
    if (timer) return;
    timer = setTimeout(() => { timer = null; last = performance.now(); rebuild(); }, Math.max(0, 120 - (performance.now() - last)));
  }
  async function rebuild() {
    const seq = ++rec.seq;
    try {
      const face = new FontFace(rec.family, font.toArrayBuffer());
      await face.load();
      if (seq !== rec.seq) return;
      document.fonts.add(face);
      document.fonts.delete(rec.face);
      rec.face = face;
    } catch (err) {
      console.error("font rebuild failed", err);
    }
  }

  return editor;
}

// ---------- drag & drop any font ----------

let dragDepth = 0;
window.addEventListener("dragenter", (e) => { e.preventDefault(); dragDepth++; document.body.classList.add("dragging"); });
window.addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove("dragging"); } });
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging");
  const file = [...e.dataTransfer.files].find((fl) => /\.(otf|ttf|woff)$/i.test(fl.name));
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const id = "drop-" + Date.now();
  const nameGuess = file.name.replace(/\.\w+$/, "");
  FONTS.push({ id, name: nameGuess, year: new Date().getFullYear(), style: "", category: "Dropped file (not saved)", status: "Local test", sample: nameGuess, versions: [{ label: file.name, buffer }] });
  location.hash = `#/font/${id}/0`;
});

function escapeHTML(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

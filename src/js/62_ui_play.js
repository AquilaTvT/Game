// ---------- the playfield canvas: sheet, ink, tray, and all direct manipulation ----------
const Play = {
  active: false, cv: null, c: null, k: 1, cw: 0, ch: 0, cs: 40, bx: 0, by: 0, slots: [],
  inkLayer: null, inkDirty: true, viewBoard: null, lines: { rows: [], cols: [], diags: [], n: 0 },
  drag: null, kb: null, rinseMode: false, target: null,
  pops: new Map(), strokes: [], hidden: new Set(), flashCells: new Map(), trayAppear: [], trayUid: [], shakeSlot: -1, shakeT: 0,
  ghost: null, lastGhostKey: '', raf: 0, t: 0,

  init() {
    this.cv = $('#play'); this.c = this.cv.getContext('2d');
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('pointercancel', (e) => this.cancelDrag());
    cv.addEventListener('wheel', (e) => { if (this.drag || this.slotAt(e) >= 0) { e.preventDefault(); this.rotate(this.drag ? this.drag.slot : this.slotAt(e), e.deltaY > 0 ? 1 : -1); } }, { passive: false });
    Hud.el.ignite.addEventListener('click', () => Game.ignite());
    Hud.el.rinse.addEventListener('click', () => this.toggleRinse());
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  },
  layout() {
    const run = UI.run;
    if (!run || !this.cv) return;
    const center = Hud.el.center;
    this.cw = center.clientWidth; this.ch = center.clientHeight;
    if (this.cw < 10 || this.ch < 10) return;
    const dpr = window.devicePixelRatio || 1;
    let k = UI.s * dpr;
    const maxPx = 3.6e6;
    if (this.cw * this.ch * k * k > maxPx) k = Math.sqrt(maxPx / (this.cw * this.ch));
    this.k = k;
    const W = Math.round(this.cw * k), H = Math.round(this.ch * k);
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    const bb = Hud.el.boardbox, w = run.w, h = run.h;
    const bw = bb.offsetWidth, bh = bb.offsetHeight;
    const cs = Math.max(12, Math.floor(Math.min((bw - 6) / (w + 1.15), (bh - 6) / (h + 1.2))));
    this.cs = cs;
    this.bx = Math.round(bb.offsetLeft + (bw - w * cs) / 2);
    this.by = Math.round(bb.offsetTop + (bh - h * cs) / 2 - cs * 0.05);
    this.inkDirty = true;
    this.layoutTray();
  },
  layoutTray() {
    const run = UI.run, rd = run && run.round;
    const tb = Hud.el.traybox;
    const n = Math.max(1, rd ? rd.tray.length : stat(run, 'tray'));
    const x0 = tb.offsetLeft, y0 = tb.offsetTop, tw = tb.offsetWidth, th = tb.offsetHeight;
    const sw = tw / n;
    this.slots = [];
    for (let i = 0; i < n; i++) this.slots.push({ x: x0 + i * sw, y: y0, w: sw, h: th });
    this.trayRect = { x: x0, y: y0, w: tw, h: th };
  },
  trayCs(slot) {
    const s = this.slots[slot];
    return Math.max(8, Math.min(this.cs * 0.6, (s.w - 14) / 5.3, (s.h - 36) / 5.3 * 1.25));
  },
  // ---- coordinates
  local(e) { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / UI.s, y: (e.clientY - r.top) / UI.s }; },
  toViewport(x, y) { const r = this.cv.getBoundingClientRect(); return { x: r.left + x * UI.s, y: r.top + y * UI.s }; },
  cellVP(idx) { const w = UI.run.w; return this.toViewport(this.bx + ((idx % w) + 0.5) * this.cs, this.by + (Math.floor(idx / w) + 0.5) * this.cs); },
  slotAt(e) {
    const p = this.local(e);
    for (let i = 0; i < this.slots.length; i++) { const s = this.slots[i]; if (p.x >= s.x && p.x < s.x + s.w && p.y >= s.y - 6 && p.y < s.y + s.h + 6) return i; }
    return -1;
  },
  canAct() { const run = UI.run; return this.active && run && run.phase === 'round' && run.round && !UI.busy && !modalOpen(); },

  // ---- pointer input
  onDown(e) {
    if (!this.canAct()) return;
    Snd.resume();
    if (this.target) {
      const p = this.local(e), run = UI.run;
      const gx = Math.floor((p.x - this.bx) / this.cs), gy = Math.floor((p.y - this.by) / this.cs);
      if (gx >= 0 && gy >= 0 && gx < run.w && gy < run.h && this.target.ok(gy * run.w + gx)) this.target.pick(gy * run.w + gx);
      else Snd.play('bad');
      return;
    }
    if (this.drag) {
      // a second finger (or the other mouse button) turns the block in hand
      if (e.pointerId !== this.drag.id || e.button === 2) this.rotate(this.drag.slot, e.button === 2 ? -1 : 1);
      return;
    }
    const slot = this.slotAt(e);
    const rd = UI.run.round;
    if (slot < 0 || !rd.tray[slot]) { if (this.rinseMode) this.setRinse(false); this.kb = null; return; }
    if (e.button === 2) { this.rotate(slot, -1); return; }
    if (this.rinseMode) { this.setRinse(false); Game.discard(slot); return; }
    const p = this.local(e);
    this.drag = { slot, id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, touch: e.pointerType !== 'mouse', gx: 0, gy: 0, valid: false, onBoard: false, overRinse: false };
    this.kb = null;
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  },
  onMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const p = this.local(e);
    d.x = p.x; d.y = p.y; d.cx = e.clientX; d.cy = e.clientY;
    if (!d.moved) {
      if (Math.hypot(p.x - d.sx, p.y - d.sy) < (d.touch ? 12 : 7)) return;
      if (!slotUsable(UI.run, d.slot)) { this.drag = null; this.nope(d.slot); Snd.play('bad'); return; }
      d.moved = true;
      Snd.play('pick');
      hidePop(); hideTip();
      Hud.el.rinse.classList.toggle('target', UI.run.round.discards > 0);
    }
    this.updateDrag();
  },
  dragPos() {
    // where the block floats: lifted above a finger so it stays visible
    const d = this.drag, g = trayGeom(UI.run, d.slot);
    const lift = d.touch ? (g.h / 2) * this.cs + 46 : this.cs * 0.1;
    return { x: d.x, y: d.y - lift, g };
  },
  updateDrag() {
    const d = this.drag, run = UI.run;
    if (!d || !d.moved) return;
    const { x, y, g } = this.dragPos();
    const snap = this.snap(d.slot, g, x, y);
    d.gx = snap.gx; d.gy = snap.gy; d.valid = snap.valid; d.onBoard = snap.onBoard;
    // over the rinse button?
    const rr = Hud.el.rinse.getBoundingClientRect();
    const vp = this.toViewport(d.x, d.y);
    d.overRinse = run.round.discards > 0 && vp.x >= rr.left - 8 && vp.x <= rr.right + 8 && vp.y >= rr.top - 8 && vp.y <= rr.bottom + 8;
    Hud.el.rinse.classList.toggle('armed', d.overRinse);
    this.setGhost(d.onBoard && !d.overRinse ? { slot: d.slot, gx: d.gx, gy: d.gy, valid: d.valid } : null);
    const t = run.round.tray[d.slot], p = pieceByUid(run, t.uid);
    const vp2 = this.toViewport(x, y);
    FX.setDrag({ geom: g, ink: p.ink, enh: p.enh, x: vp2.x, y: vp2.y, cs: this.cs * UI.s * (d.onBoard ? 1 : 0.86), ok: !d.onBoard || d.valid, marks: PROFILE.settings.marks });
  },
  snap(slot, g, px, py) {
    const run = UI.run, cs = this.cs;
    const fx = (px - this.bx) / cs - g.w / 2, fy = (py - this.by) / cs - g.h / 2;
    const gx = Math.round(fx), gy = Math.round(fy);
    const onBoard = fx > -g.w - 0.6 && fy > -g.h - 0.6 && fx < run.w + 0.6 && fy < run.h + 0.6;
    if (!onBoard) return { gx, gy, valid: false, onBoard: false };
    const blocked = placeBlocked(run, slot);
    if (blocked) return { gx: clamp(gx, 0, run.w - g.w), gy: clamp(gy, 0, run.h - g.h), valid: false, onBoard: true, why: blocked };
    if (fits(run, g, gx, gy)) return { gx, gy, valid: true, onBoard: true };
    // forgiving: the nearest fitting spot within one square
    let best = null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (!fits(run, g, gx + dx, gy + dy)) continue;
      const dist = Math.hypot(gx + dx - fx, gy + dy - fy);
      if (dist < 0.95 && (!best || dist < best.dist)) best = { gx: gx + dx, gy: gy + dy, dist };
    }
    if (best) return { gx: best.gx, gy: best.gy, valid: true, onBoard: true };
    return { gx: clamp(gx, 0, run.w - g.w), gy: clamp(gy, 0, run.h - g.h), valid: false, onBoard: true };
  },
  onUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    try { this.cv.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    this.drag = null;
    Hud.el.rinse.classList.remove('target', 'armed');
    FX.setDrag(null);
    if (!d.moved) { this.rotate(d.slot, 1); return; }
    const g = this.ghost;
    this.setGhost(null);
    if (d.overRinse) { Game.discard(d.slot); return; }
    if (d.onBoard && d.valid) { Game.place(d.slot, d.gx, d.gy); return; }
    if (d.onBoard) { Snd.play('bad'); this.nope(d.slot); const why = placeBlocked(UI.run, d.slot); if (why === 'ink') Game.say(T('say.noink')); else if (why === 'limit') Game.say(T('say.limit')); }
    else Snd.play('back');
  },
  cancelDrag() {
    if (!this.drag) return;
    this.drag = null;
    Hud.el.rinse.classList.remove('target', 'armed');
    FX.setDrag(null);
    this.setGhost(null);
  },
  nope(slot) { this.shakeSlot = slot; this.shakeT = nowMs(); },
  rotate(slot, dir) {
    const run = UI.run;
    if (!this.canAct() || slot < 0) return;
    if (flag(run, 'noRotate')) { Snd.play('bad'); this.nope(slot); Game.say(T('say.norotate')); return; }
    if (!rotateTray(run, slot, dir)) return;
    Snd.play('rotate');
    Game.save();
    if (this.drag && this.drag.slot === slot) this.updateDrag();
    if (this.kb && this.kb.slot === slot) this.kbUpdate();
  },
  flip(slot) {
    const run = UI.run;
    if (!this.canAct() || slot < 0) return;
    if (!flipTray(run, slot)) { if (!stat(run, 'flip')) Game.say(T('say.noflip')); return; }
    Snd.play('rotate');
    Game.save();
    if (this.drag && this.drag.slot === slot) this.updateDrag();
    if (this.kb && this.kb.slot === slot) this.kbUpdate();
  },
  toggleRinse() {
    if (!this.canAct()) return;
    if (this.kb) { const s = this.kb.slot; this.kb = null; this.setGhost(null); Game.discard(s); return; }
    this.setRinse(!this.rinseMode);
    if (this.rinseMode) Game.say(T('say.rinse'));
  },
  setRinse(v) { this.rinseMode = v && UI.run.round.discards > 0; Hud.el.rinse.classList.toggle('armed', this.rinseMode); },

  // ---- keyboard
  key(e) {
    if (!this.canAct()) return false;
    const run = UI.run, rd = run.round, k = e.key;
    const pickSlot = (s) => {
      if (!rd.tray[s]) return;
      if (!slotUsable(run, s)) { this.nope(s); Snd.play('bad'); return; }
      const g = trayGeom(run, s);
      const prev = this.kb;
      this.kb = { slot: s, gx: prev ? prev.gx : Math.floor((run.w - g.w) / 2), gy: prev ? prev.gy : Math.floor((run.h - g.h) / 2) };
      Snd.play('pick');
      this.kbUpdate();
    };
    if (k >= '1' && k <= '9') { pickSlot(+k - 1); return true; }
    if (k === 'Tab') { const n = rd.tray.length; let s = this.kb ? this.kb.slot : -1; for (let i = 0; i < n; i++) { s = (s + (e.shiftKey ? n - 1 : 1)) % n; if (rd.tray[s] && slotUsable(run, s)) break; } pickSlot(s); return true; }
    if (k === 'r' || k === 'R') { const s = this.drag ? this.drag.slot : this.kb ? this.kb.slot : -1; if (s >= 0) this.rotate(s, e.shiftKey ? -1 : 1); return true; }
    if (k === 'e' || k === 'E') { const s = this.drag ? this.drag.slot : this.kb ? this.kb.slot : -1; if (s >= 0) this.rotate(s, -1); return true; }
    if (k === 'f' || k === 'F') { const s = this.drag ? this.drag.slot : this.kb ? this.kb.slot : -1; if (s >= 0) this.flip(s); return true; }
    if (k === 'q' || k === 'Q') { this.toggleRinse(); return true; }
    if (k === 'Escape') { if (this.kb) { this.kb = null; this.setGhost(null); return true; } if (this.rinseMode) { this.setRinse(false); return true; } if (this.drag) { this.cancelDrag(); return true; } return false; }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] };
    if (dirs[k]) {
      if (!this.kb) { const s = rd.tray.findIndex((t, i) => t && slotUsable(run, i)); if (s < 0) return true; pickSlot(s); return true; }
      const g = trayGeom(run, this.kb.slot);
      this.kb.gx = clamp(this.kb.gx + dirs[k][0], 0, run.w - g.w); this.kb.gy = clamp(this.kb.gy + dirs[k][1], 0, run.h - g.h);
      Snd.play('tick');
      this.kbUpdate();
      return true;
    }
    if (k === ' ' || k === 'Enter') {
      if (this.kb) {
        const { slot, gx, gy } = this.kb;
        if (canPlace(run, slot, gx, gy)) { this.setGhost(null); const keep = { gx, gy }; this.kb = null; Game.place(slot, gx, gy); this._kbLast = keep; }
        else { Snd.play('bad'); this.nope(slot); const why = placeBlocked(run, slot); if (why === 'ink') Game.say(T('say.noink')); }
      } else Game.ignite();
      return true;
    }
    return false;
  },
  kbUpdate() {
    const run = UI.run, kb = this.kb;
    if (!kb || !run.round.tray[kb.slot]) { this.kb = null; this.setGhost(null); return; }
    const g = trayGeom(run, kb.slot);
    kb.gx = clamp(kb.gx, 0, run.w - g.w); kb.gy = clamp(kb.gy, 0, run.h - g.h);
    this.setGhost({ slot: kb.slot, gx: kb.gx, gy: kb.gy, valid: canPlace(run, kb.slot, kb.gx, kb.gy), kb: true });
  },

  // ---- ghost preview: where the block would land and what it would write
  setGhost(g) {
    const run = UI.run;
    const key = g ? [g.slot, g.gx, g.gy, g.valid, run.round.tray[g.slot] ? run.round.tray[g.slot].rot + '' + run.round.tray[g.slot].flip : ''].join(',') : '';
    if (key === this.lastGhostKey) return;
    this.lastGhostKey = key;
    this.ghost = g;
    if (!g || !run.round || !run.round.tray[g.slot]) { this.ghost = null; Hud.pattern(); Hud.setInkPreview(0); return; }
    const geom = trayGeom(run, g.slot), sh = trayShape(run, g.slot);
    g.geom = geom;
    g.cost = pieceCost(run, sh);
    g.lines = null;
    Hud.setInkPreview(g.cost);
    if (g.valid) {
      const B = run.round.board.slice();
      for (const [cx, cy] of geom.cells) B[(g.gy + cy) * run.w + g.gx + cx] = { ink: 'mo' };
      const L = findLines(run, B);
      g.lines = L;
      Hud.pattern(patternOf(run, L), true);
    } else Hud.pattern();
  },

  // ---- drawing
  frame(t) {
    this.raf = requestAnimationFrame((tt) => this.frame(tt));
    this.t = t;
    if (!this.active || !UI.run || !UI.run.round || !$('#game').classList.contains('on')) return;
    this.draw();
  },
  buildInk(board) {
    const run = UI.run, w = run.w, h = run.h, cs = this.cs, k = this.k;
    const pad = Math.ceil(cs * 0.4);
    if (!this.inkLayer) this.inkLayer = mkCanvas(1, 1);
    const L = this.inkLayer, W = Math.round((w * cs + pad * 2) * k), H = Math.round((h * cs + pad * 2) * k);
    if (L.width !== W || L.height !== H) { L.width = W; L.height = H; }
    const c = L.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(k, 0, 0, k, pad * k, pad * k);
    const list = [];
    const same = (a, b) => a && b && a.pid && a.pid === b.pid && a.q === b.q && !a.stone && !b.stone;
    for (let i = 0; i < board.length; i++) {
      const cell = board[i];
      if (!cell || this.hidden.has(i)) continue;
      const x = i % w, y = Math.floor(i / w);
      const nb = (y > 0 && same(cell, board[i - w]) && !this.hidden.has(i - w) ? 1 : 0) | (x < w - 1 && same(cell, board[i + 1]) && !this.hidden.has(i + 1) ? 2 : 0) |
        (y < h - 1 && same(cell, board[i + w]) && !this.hidden.has(i + w) ? 4 : 0) | (x > 0 && same(cell, board[i - 1]) && !this.hidden.has(i - 1) ? 8 : 0);
      list.push({ x, y, ink: cell.ink, enh: cell.enh, nb, stone: cell.stone });
    }
    Gfx.paintCells(c, list, cs, 0, 0, { marks: PROFILE.settings.marks });
    this.inkPad = pad;
    this.inkDirty = false;
    this.lines = findLines(run, board);
  },
  draw() {
    const run = UI.run, rd = run.round, c = this.c, k = this.k, cs = this.cs, w = run.w, h = run.h, bx = this.bx, by = this.by, t = this.t;
    const board = this.viewBoard || rd.board;
    if (rd.tray.length !== this.slots.length) this.layoutTray();
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, this.cw, this.ch);
    // paper
    const P = Gfx.paper(w, h, cs, k, run.paper, rd.holes, false);
    c.drawImage(P.cv, bx - P.m - P.pad, by - P.m - P.pad, P.cv.width / k, P.cv.height / k);
    if (this.inkDirty) this.buildInk(board);
    const L = this.lines;
    // margin gauges: how full every row and column is
    const cnt = (idxs) => { let n = 0; for (const i of idxs) if (board[i]) n++; return n; };
    const mg = cs * 0.25;
    for (let y = 0; y < h; y++) {
      const f = cnt(range(w).map((x) => y * w + x)) / w;
      if (f <= 0) continue;
      const full = f >= 1;
      c.fillStyle = full ? '#c0321f' : f >= 0.74 ? 'rgba(190,140,40,0.85)' : 'rgba(90,70,40,0.35)';
      const len = cs * 0.7 * f, yy = by + (y + 0.5) * cs;
      c.fillRect(bx - mg - cs * 0.07, yy - len / 2, cs * 0.07, len);
      c.fillRect(bx + w * cs + mg, yy - len / 2, cs * 0.07, len);
    }
    for (let x = 0; x < w; x++) {
      const f = cnt(range(h).map((y) => y * w + x)) / h;
      if (f <= 0) continue;
      const full = f >= 1;
      c.fillStyle = full ? '#c0321f' : f >= 0.74 ? 'rgba(190,140,40,0.85)' : 'rgba(90,70,40,0.35)';
      const len = cs * 0.7 * f, xx = bx + (x + 0.5) * cs;
      c.fillRect(xx - len / 2, by - mg - cs * 0.07, len, cs * 0.07);
      c.fillRect(xx - len / 2, by + h * cs + mg, len, cs * 0.07);
    }
    // ink
    c.drawImage(this.inkLayer, bx - this.inkPad, by - this.inkPad, this.inkLayer.width / k, this.inkLayer.height / k);
    // freshly placed cells glisten for a moment
    if (this.flashCells.size) {
      for (const [i, t0] of this.flashCells) {
        const u = (t - t0) / 420;
        if (u >= 1) { this.flashCells.delete(i); continue; }
        const x = bx + (i % w) * cs, y = by + Math.floor(i / w) * cs, s = 1 + 0.16 * (1 - u) * (1 - u);
        c.save(); c.globalAlpha = 0.6 * (1 - u); c.fillStyle = '#fff6dc';
        c.translate(x + cs / 2, y + cs / 2); c.scale(s, s);
        c.beginPath(); c.rect(-cs / 2 + 2, -cs / 2 + 2, cs - 4, cs - 4); c.fill(); c.restore();
      }
    }
    // complete lines are strokes waiting to be written: a slow sheen runs along them
    const sheen = (x, y, ww, hh, horiz, ph) => {
      c.save();
      c.beginPath(); c.rect(x, y, ww, hh); c.clip();
      c.fillStyle = 'rgba(255,238,196,0.13)'; c.fillRect(x, y, ww, hh);
      const len = horiz ? ww : hh, p = ((t * 0.00042 + ph) % 1.5) / 1.5, pos = -0.25 * len + p * 1.5 * len;
      const g = horiz ? c.createLinearGradient(x + pos - len * 0.16, 0, x + pos + len * 0.16, 0) : c.createLinearGradient(0, y + pos - len * 0.16, 0, y + pos + len * 0.16);
      g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, 'rgba(255,244,214,0.42)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.fillRect(x, y, ww, hh);
      c.restore();
      c.strokeStyle = 'rgba(243,217,139,0.9)'; c.lineWidth = Math.max(1.2, cs * 0.04);
      c.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
    };
    if (!this.strokes.length) {
      for (const y of L.rows) sheen(bx, by + y * cs, w * cs, cs, true, y * 0.13);
      for (const x of L.cols) sheen(bx + x * cs, by, cs, h * cs, false, x * 0.17 + 0.4);
      if (L.diags.length) {
        c.save(); c.strokeStyle = 'rgba(243,217,139,0.9)'; c.lineWidth = Math.max(2, cs * 0.08); c.setLineDash([cs * 0.2, cs * 0.14]);
        for (const d of L.diags) { c.beginPath(); if (d === 0) { c.moveTo(bx, by); c.lineTo(bx + w * cs, by + h * cs); } else { c.moveTo(bx + w * cs, by); c.lineTo(bx, by + h * cs); } c.stroke(); }
        c.restore();
      }
    }
    // ghost
    const g = this.ghost;
    if (g && g.geom && rd.tray[g.slot]) {
      const p = pieceByUid(run, rd.tray[g.slot].uid);
      if (p) {
        if (g.valid && g.lines) {
          c.fillStyle = 'rgba(255,214,120,0.28)';
          for (const y of g.lines.rows) if (!L.rows.includes(y)) c.fillRect(bx, by + y * cs, w * cs, cs);
          for (const x of g.lines.cols) if (!L.cols.includes(x)) c.fillRect(bx + x * cs, by, cs, h * cs);
        }
        c.save();
        c.globalAlpha = g.valid ? 0.5 + 0.12 * Math.sin(t * 0.008) : 0.3;
        Gfx.piece(c, g.geom, p.ink, p.enh, bx + (g.gx + g.geom.w / 2) * cs, by + (g.gy + g.geom.h / 2) * cs, cs, { flat: true });
        c.restore();
        c.save();
        c.strokeStyle = g.valid ? 'rgba(255,236,170,0.95)' : 'rgba(224,60,40,0.95)'; c.lineWidth = Math.max(2, cs * 0.06);
        if (!g.valid) c.setLineDash([cs * 0.16, cs * 0.12]);
        for (const [cx, cy] of g.geom.cells) c.strokeRect(bx + (g.gx + cx) * cs + 2, by + (g.gy + cy) * cs + 2, cs - 4, cs - 4);
        c.restore();
      }
    }
    // scoring: brush strokes painted over the lines, and cells popping as they are counted
    for (const s of this.strokes) {
      const col = s.col || '#141211', th = cs * 0.74;
      c.save(); c.globalAlpha = s.a == null ? 1 : s.a;
      if (s.scale && s.scale !== 1) { const mx = bx + (w * cs) / 2, my = by + (h * cs) / 2; c.translate(mx, my); c.scale(s.scale, s.scale); c.translate(-mx, -my); }
      if (s.kind === 'row') Gfx.brush(c, bx - cs * 0.12, by + (s.i + 0.5) * cs, bx + w * cs + cs * 0.12, by + (s.i + 0.5) * cs, th, col, s.p, s.i * 7 + 3);
      else if (s.kind === 'col') Gfx.brush(c, bx + (s.i + 0.5) * cs, by - cs * 0.12, bx + (s.i + 0.5) * cs, by + h * cs + cs * 0.12, th, col, s.p, s.i * 13 + 101);
      else if (s.i === 0) Gfx.brush(c, bx, by, bx + w * cs, by + h * cs, th, col, s.p, 501);
      else Gfx.brush(c, bx + w * cs, by, bx, by + h * cs, th, col, s.p, 601);
      c.restore();
    }
    if (this.pops.size) {
      for (const [i, p] of this.pops) {
        const u = (t - p.t0) / 260;
        if (u >= 1) { this.pops.delete(i); continue; }
        const x = bx + (i % w + 0.5) * cs, y = by + (Math.floor(i / w) + 0.5) * cs, s = 0.6 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.15));
        c.save(); c.globalAlpha = (1 - u) * 0.9; c.fillStyle = p.col || '#fff3c9';
        c.beginPath(); c.arc(x, y, cs * 0.34 * s, 0, 7); c.fill();
        c.restore();
      }
    }
    // square-picking mode for items used on the sheet
    if (this.target) {
      c.save();
      for (let i = 0; i < w * h; i++) {
        if (!this.target.ok(i)) continue;
        const x = bx + (i % w) * cs, y = by + Math.floor(i / w) * cs;
        c.fillStyle = `rgba(120,220,170,${0.16 + 0.1 * Math.sin(t * 0.006 + i)})`; c.fillRect(x + 2, y + 2, cs - 4, cs - 4);
        c.strokeStyle = 'rgba(120,220,170,0.9)'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
      }
      c.restore();
    }
    this.drawTray();
  },
  drawTray() {
    const run = UI.run, rd = run.round, c = this.c, t = this.t;
    const tr = this.trayRect;
    if (!tr) return;
    // the brush rest
    c.save();
    const rr = (x, y, ww, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + ww - r, y); c.quadraticCurveTo(x + ww, y, x + ww, y + r); c.lineTo(x + ww, y + hh - r); c.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh); c.lineTo(x + r, y + hh); c.quadraticCurveTo(x, y + hh, x, y + hh - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); };
    const py = tr.y + 8, ph = tr.h - 14;
    rr(tr.x + 2, py, tr.w - 4, ph, 14);
    const gr = c.createLinearGradient(0, py, 0, py + ph);
    gr.addColorStop(0, 'rgba(40,36,38,0.9)'); gr.addColorStop(1, 'rgba(18,17,20,0.92)');
    c.fillStyle = gr; c.fill();
    c.strokeStyle = this.rinseMode ? 'rgba(140,200,250,0.95)' : 'rgba(210,168,74,0.3)'; c.lineWidth = this.rinseMode ? 2.5 : 1; c.stroke();
    c.restore();
    const queue = flag(run, 'queue'), lim = flag(run, 'pieceLimit');
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i], tp = rd.tray[i];
      if (i > 0) { c.fillStyle = 'rgba(210,168,74,0.14)'; c.fillRect(s.x - 0.5, py + 12, 1, ph - 24); }
      const uid = tp ? tp.uid + ':' + (tp.sh || '') : null;
      if (this.trayUid[i] !== uid) { this.trayUid[i] = uid; this.trayAppear[i] = t; }
      if (!tp) continue;
      const p = pieceByUid(run, tp.uid);
      if (!p) continue;
      const dragging = this.drag && this.drag.moved && this.drag.slot === i;
      const kbSel = this.kb && this.kb.slot === i;
      const sh = tp.sh || p.shape, g = geomOf(sh, tp.rot, tp.flip), cost = pieceCost(run, sh);
      const afford = cost <= rd.ink && !(lim && rd.placed >= lim), usable = !queue || i === 0;
      const tcs = this.trayCs(i);
      const ap = clamp((t - (this.trayAppear[i] || 0)) / 260, 0, 1), e = 1 - Math.pow(1 - ap, 3);
      let cx = s.x + s.w / 2, cy = s.y + s.h / 2 - 9 + (1 - e) * 26;
      if (this.shakeSlot === i) { const u = (nowMs() - this.shakeT) / 300; if (u < 1) cx += Math.sin(u * 30) * 6 * (1 - u); else this.shakeSlot = -1; }
      if (this.rinseMode) cy += Math.sin(t * 0.012 + i * 1.3) * 3;
      if (kbSel) { rr(s.x + 6, py + 5, s.w - 12, ph - 10, 10); c.fillStyle = 'rgba(243,217,139,0.13)'; c.fill(); c.strokeStyle = 'rgba(243,217,139,0.8)'; c.lineWidth = 2; c.stroke(); }
      c.save();
      c.globalAlpha = (dragging ? 0.22 : 1) * e * (afford && usable ? 1 : 0.38);
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
      Gfx.piece(c, g, p.ink, p.enh, cx, cy, tcs, { marks: PROFILE.settings.marks, flat: true });
      c.restore();
      // ink cost
      c.save();
      c.globalAlpha = e;
      c.font = `700 ${Math.round(Math.min(19, s.h * 0.13))}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const label = (LANG === 'zh' ? '墨 ' : 'Ink ') + cost;
      const lw = c.measureText(label).width + 16, ly = py + ph - 15;
      rr(s.x + s.w / 2 - lw / 2, ly - 11, lw, 22, 11);
      c.fillStyle = afford ? 'rgba(0,0,0,0.5)' : 'rgba(120,20,10,0.8)'; c.fill();
      c.fillStyle = afford ? '#d9cdb6' : '#ffb7a6'; c.fillText(label, s.x + s.w / 2, ly + 1);
      if (!UI.touch && !this.rinseMode) { c.globalAlpha = 0.4 * e; c.fillStyle = '#efe6d2'; c.font = `700 14px ${FONT_NUM}`; c.textAlign = 'left'; c.fillText(String(i + 1), s.x + 12, py + 15); }
      if (queue && i > 0) { c.globalAlpha = 0.8; c.fillStyle = '#ff9a82'; c.font = `700 ${Math.round(tcs)}px ${FONT_KAI}`; c.textAlign = 'center'; c.fillText(LANG === 'zh' ? '候' : '…', s.x + s.w / 2, s.y + s.h / 2 - 9); }
      c.restore();
    }
  },
};

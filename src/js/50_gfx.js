// ---------- drawing: paper, ink, brush strokes, seals — all procedural ----------
const FONT_KAI = '"STKaiti","KaiTi","Kaiti SC","BiauKai","AR PL UKai CN","Noto Serif CJK SC","Source Han Serif SC","Songti SC","SimSun",serif';
const FONT_UI = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC","WenQuanYi Zen Hei","Segoe UI",system-ui,sans-serif';
const FONT_NUM = '"Georgia","Times New Roman","Songti SC",serif';
const PAPER = { base: '#f1e7cf', hi: '#f8f1de', lo: '#e2d3b2', line: 'rgba(168,52,38,0.62)', lineSoft: 'rgba(168,52,38,0.22)' };

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
// deterministic pseudo-random for stable textures
function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const Gfx = {
  grain: null, grainLight: null, _paper: new Map(), _seal: new Map(),
  init() {
    // mottled grain used inside ink
    const g = mkCanvas(192, 192), c = g.getContext('2d'), R = prng(7);
    const img = c.createImageData(192, 192);
    for (let i = 0; i < 192 * 192; i++) {
      const v = 120 + Math.floor(R() * 135);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    c.globalAlpha = 0.5;
    for (let i = 0; i < 90; i++) {
      const x = R() * 192, y = R() * 192, r = 6 + R() * 26;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      const d = R() < 0.5;
      gr.addColorStop(0, d ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    this.grain = g;
  },

  // ----- the sheet of paper with its ruled grid, special squares and wormholes (cached)
  paper(w, h, cs, k, squares, holes, mark) {
    const key = [w, h, cs, k, squares.join(','), Object.keys(holes).join(','), mark ? 1 : 0, LANG].join('|');
    if (this._paper.has(key)) return this._paper.get(key);
    if (this._paper.size > 6) this._paper.clear();
    const m = cs * 0.42, pad = cs * 0.9;
    const W = w * cs + m * 2, H = h * cs + m * 2;
    const cv = mkCanvas((W + pad * 2) * k, (H + pad * 2) * k), c = cv.getContext('2d');
    c.scale(k, k); c.translate(pad, pad);
    const R = prng(w * 131 + h * 17 + 5);
    // deckled outline
    const outline = () => {
      c.beginPath();
      const step = cs * 0.5, j = cs * 0.022;
      const pts = [];
      const nx = Math.max(2, Math.round(W / step)), ny = Math.max(2, Math.round(H / step));
      const jit = () => (R() - 0.5) * j;
      for (let i = 0; i < nx; i++) pts.push([(i / nx) * W, jit()]);
      for (let i = 0; i < ny; i++) pts.push([W + jit(), (i / ny) * H]);
      for (let i = 0; i < nx; i++) pts.push([W - (i / nx) * W, H + jit()]);
      for (let i = 0; i < ny; i++) pts.push([jit(), H - (i / ny) * H]);
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    };
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = cs * 0.55; c.shadowOffsetY = cs * 0.14;
    outline(); c.fillStyle = PAPER.base; c.fill();
    c.restore();
    c.save(); outline(); c.clip();
    const gr = c.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, PAPER.hi); gr.addColorStop(0.55, PAPER.base); gr.addColorStop(1, PAPER.lo);
    c.fillStyle = gr; c.fillRect(-4, -4, W + 8, H + 8);
    // soft stains
    for (let i = 0; i < 14; i++) {
      const x = R() * W, y = R() * H, r = cs * (1 + R() * 3);
      const g2 = c.createRadialGradient(x, y, 0, x, y, r);
      g2.addColorStop(0, R() < 0.5 ? 'rgba(160,120,60,0.07)' : 'rgba(255,252,240,0.12)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g2; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fibres
    c.lineCap = 'round';
    for (let i = 0; i < w * h * 9; i++) {
      const x = R() * W, y = R() * H, a = R() * Math.PI, l = cs * (0.05 + R() * 0.22);
      c.strokeStyle = R() < 0.6 ? `rgba(120,90,50,${0.05 + R() * 0.09})` : `rgba(255,255,255,${0.1 + R() * 0.16})`;
      c.lineWidth = 0.4 + R() * 0.7;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 3, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    c.translate(m, m);
    // special squares
    for (let i = 0; i < w * h; i++) {
      const id = squares[i];
      if (!id) continue;
      this.square(c, id, (i % w) * cs, Math.floor(i / w) * cs, cs, i);
    }
    // faint guide crosses, like a practice sheet
    c.strokeStyle = PAPER.lineSoft; c.lineWidth = Math.max(0.6, cs * 0.012);
    c.setLineDash([cs * 0.05, cs * 0.07]);
    c.beginPath();
    for (let y = 0; y < h; y++) { c.moveTo(0, (y + 0.5) * cs); c.lineTo(w * cs, (y + 0.5) * cs); }
    for (let x = 0; x < w; x++) { c.moveTo((x + 0.5) * cs, 0); c.lineTo((x + 0.5) * cs, h * cs); }
    c.stroke(); c.setLineDash([]);
    // ruled grid, slightly hand-drawn
    const wob = () => (R() - 0.5) * cs * 0.012;
    c.strokeStyle = PAPER.line; c.lineWidth = Math.max(1, cs * 0.022);
    c.beginPath();
    for (let y = 1; y < h; y++) { c.moveTo(0, y * cs + wob()); c.lineTo(w * cs * 0.5, y * cs + wob()); c.lineTo(w * cs, y * cs + wob()); }
    for (let x = 1; x < w; x++) { c.moveTo(x * cs + wob(), 0); c.lineTo(x * cs + wob(), h * cs * 0.5); c.lineTo(x * cs + wob(), h * cs); }
    c.stroke();
    c.lineWidth = Math.max(1.6, cs * 0.05); c.strokeStyle = 'rgba(160,44,32,0.82)';
    c.strokeRect(0, 0, w * cs, h * cs);
    c.lineWidth = Math.max(0.8, cs * 0.016); c.strokeStyle = 'rgba(160,44,32,0.5)';
    c.strokeRect(-cs * 0.1, -cs * 0.1, w * cs + cs * 0.2, h * cs + cs * 0.2);
    // wormholes
    for (const kk in holes) {
      const i = +kk, x = (i % w) * cs, y = Math.floor(i / w) * cs, RR = prng(i * 97 + 3);
      c.save();
      c.beginPath();
      const n = 11;
      for (let q = 0; q < n; q++) {
        const a = (q / n) * Math.PI * 2, r = cs * (0.3 + RR() * 0.16);
        const px = x + cs / 2 + Math.cos(a) * r, py = y + cs / 2 + Math.sin(a) * r;
        if (q) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = '#17120e'; c.shadowColor = 'rgba(90,50,10,0.9)'; c.shadowBlur = cs * 0.14; c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(120,80,30,0.9)'; c.lineWidth = cs * 0.03; c.stroke();
      c.restore();
    }
    c.restore();
    const res = { cv, pad, m, W, H };
    this._paper.set(key, res);
    return res;
  },
  square(c, id, x, y, cs, seed) {
    const s = SQ[id], R = prng((seed + 1) * 7919), in0 = cs * 0.07;
    c.save();
    c.fillStyle = s.col; c.globalAlpha = 0.13; c.fillRect(x + in0, y + in0, cs - in0 * 2, cs - in0 * 2);
    c.globalAlpha = 0.75; c.strokeStyle = s.col; c.lineWidth = Math.max(1, cs * 0.028);
    if (id === 'wusi' || id === 'zhusi') {
      c.strokeRect(x + in0, y + in0, cs - in0 * 2, cs - in0 * 2);
      c.globalAlpha = 0.4; c.strokeRect(x + in0 * 2, y + in0 * 2, cs - in0 * 4, cs - in0 * 4);
    } else if (id === 'yunwen') {
      c.globalAlpha = 0.6; c.lineWidth = Math.max(1, cs * 0.03);
      for (let i = 0; i < 3; i++) {
        const cx = x + cs * (0.28 + i * 0.22), cy = y + cs * (0.42 + (i % 2) * 0.16), r = cs * 0.13;
        c.beginPath(); c.arc(cx, cy, r, Math.PI * 0.9, Math.PI * 2.4); c.arc(cx + r * 0.4, cy, r * 0.5, Math.PI * 2.4, Math.PI * 0.6, true); c.stroke();
      }
    } else if (id === 'sajin') {
      for (let i = 0; i < 16; i++) {
        c.globalAlpha = 0.5 + R() * 0.5; c.fillStyle = R() < 0.5 ? '#d9b24a' : '#f3d77e';
        const px = x + in0 + R() * (cs - in0 * 2), py = y + in0 + R() * (cs - in0 * 2), r = cs * (0.012 + R() * 0.03);
        c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
      }
    } else if (id === 'die') {
      c.strokeRect(x + in0, y + in0, cs * 0.62, cs * 0.62);
      c.globalAlpha = 0.45; c.strokeRect(x + cs - in0 - cs * 0.62, y + cs - in0 - cs * 0.62, cs * 0.62, cs * 0.62);
    }
    c.globalAlpha = 0.8; c.fillStyle = s.col;
    c.font = `600 ${Math.round(cs * 0.24)}px ${FONT_KAI}`; c.textAlign = 'right'; c.textBaseline = 'bottom';
    c.fillText(s.g, x + cs - in0 * 1.4, y + cs - in0 * 0.9);
    c.restore();
  },

  // ----- ink
  // list: [{x, y, ink, enh, nb, stone}]  nb bitmask of neighbours in the same block: 1 up, 2 right, 4 down, 8 left
  cellRect(c, it, cs, ox, oy, gap) {
    const g = gap == null ? cs * 0.045 : gap, r = cs * 0.2;
    const up = it.nb & 1, rt = it.nb & 2, dn = it.nb & 4, lf = it.nb & 8;
    const x0 = ox + it.x * cs + (lf ? 0 : g), y0 = oy + it.y * cs + (up ? 0 : g);
    const x1 = ox + (it.x + 1) * cs - (rt ? 0 : g), y1 = oy + (it.y + 1) * cs - (dn ? 0 : g);
    const tl = up || lf ? 0 : r, tr = up || rt ? 0 : r, br = dn || rt ? 0 : r, bl = dn || lf ? 0 : r;
    c.moveTo(x0 + tl, y0);
    c.lineTo(x1 - tr, y0); if (tr) c.quadraticCurveTo(x1, y0, x1, y0 + tr);
    c.lineTo(x1, y1 - br); if (br) c.quadraticCurveTo(x1, y1, x1 - br, y1);
    c.lineTo(x0 + bl, y1); if (bl) c.quadraticCurveTo(x0, y1, x0, y1 - bl);
    c.lineTo(x0, y0 + tl); if (tl) c.quadraticCurveTo(x0, y0, x0 + tl, y0);
    c.closePath();
  },
  paintCells(c, list, cs, ox, oy, o) {
    const opt = o || {};
    const byInk = {};
    for (const it of list) {
      if (it.stone) continue;
      (byInk[it.ink] || (byInk[it.ink] = [])).push(it);
    }
    c.save();
    for (const ink in byInk) {
      const K = INK[ink], arr = byInk[ink];
      const solid = arr.filter((it) => it.enh !== 'bai'), hollow = arr.filter((it) => it.enh === 'bai');
      if (solid.length) {
        c.beginPath();
        for (const it of solid) this.cellRect(c, it, cs, ox, oy);
        c.save();
        if (!opt.flat) { c.shadowColor = K.lo; c.shadowBlur = cs * 0.1; }
        if (ink === 'jin') {
          const g = c.createLinearGradient(ox, oy, ox + cs * 3, oy + cs * 3);
          g.addColorStop(0, '#e0bb55'); g.addColorStop(0.5, '#c2932f'); g.addColorStop(1, '#dcb650');
          c.fillStyle = g;
        } else c.fillStyle = K.col;
        c.fill();
        c.restore();
        // mottling inside the ink only
        c.save();
        c.clip();
        if (this.grain) {
          c.globalAlpha = ink === 'mo' ? 0.2 : 0.16;
          c.globalCompositeOperation = ink === 'mo' ? 'screen' : 'multiply';
          const p = c.createPattern(this.grain, 'repeat');
          c.fillStyle = p;
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const it of solid) { x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y); x1 = Math.max(x1, it.x + 1); y1 = Math.max(y1, it.y + 1); }
          c.fillRect(ox + x0 * cs, oy + y0 * cs, (x1 - x0) * cs, (y1 - y0) * cs);
          c.globalCompositeOperation = 'source-over';
        }
        // wet sheen on the upper part of each cell
        for (const it of solid) {
          const x = ox + it.x * cs, y = oy + it.y * cs;
          const g = c.createLinearGradient(0, y, 0, y + cs);
          const a = ink === 'mo' ? 0.2 : 0.26;
          g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(0,0,0,0.16)');
          c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, cs, cs);
        }
        c.restore();
        // darker rim where the ink pools
        c.beginPath();
        for (const it of solid) this.cellRect(c, it, cs, ox, oy);
        c.strokeStyle = K.lo; c.globalAlpha = 0.55; c.lineWidth = Math.max(1, cs * 0.035); c.stroke(); c.globalAlpha = 1;
      }
      if (hollow.length) {
        c.beginPath();
        for (const it of hollow) this.cellRect(c, it, cs, ox, oy, cs * 0.08);
        c.fillStyle = 'rgba(250,244,228,0.85)'; c.fill();
        c.strokeStyle = K.col; c.lineWidth = Math.max(1.5, cs * 0.075); c.stroke();
        c.setLineDash([cs * 0.1, cs * 0.08]); c.strokeStyle = K.hi; c.globalAlpha = 0.6; c.lineWidth = Math.max(1, cs * 0.02);
        c.beginPath();
        for (const it of hollow) c.rect(ox + it.x * cs + cs * 0.22, oy + it.y * cs + cs * 0.22, cs * 0.56, cs * 0.56);
        c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      }
      for (const it of arr) this.enhMark(c, it, cs, ox, oy, K, opt);
      if (opt.marks) for (const it of arr) {
        c.fillStyle = ink === 'jin' ? 'rgba(60,40,0,0.7)' : 'rgba(255,255,255,0.72)';
        c.font = `${Math.round(cs * 0.3)}px ${FONT_UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(K.mark, ox + (it.x + 0.5) * cs, oy + (it.y + 0.5) * cs + cs * 0.02);
      }
    }
    for (const it of list) if (it.stone) this.stone(c, ox + it.x * cs, oy + it.y * cs, cs, it.x * 31 + it.y * 17);
    c.restore();
  },
  enhMark(c, it, cs, ox, oy, K, opt) {
    const e = it.enh;
    if (!e || e === 'bai') return;
    const x = ox + it.x * cs, y = oy + it.y * cs, R = prng(it.x * 53 + it.y * 97 + 11);
    c.save();
    if (e === 'nong') {
      const g = c.createRadialGradient(x + cs * 0.5, y + cs * 0.5, cs * 0.05, x + cs * 0.5, y + cs * 0.5, cs * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x, y, cs, cs);
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = Math.max(1, cs * 0.05); c.lineCap = 'round';
      c.beginPath(); c.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.26, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
    } else if (e === 'fei') {
      c.strokeStyle = 'rgba(248,240,220,0.75)'; c.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        c.lineWidth = Math.max(0.8, cs * (0.018 + R() * 0.03));
        const yy = y + cs * (0.24 + i * 0.17 + (R() - 0.5) * 0.05);
        c.beginPath(); c.moveTo(x + cs * (0.14 + R() * 0.15), yy + cs * 0.06); c.lineTo(x + cs * (0.7 + R() * 0.18), yy - cs * 0.06); c.stroke();
      }
    } else if (e === 'po') {
      c.fillStyle = K.col;
      for (let i = 0; i < 7; i++) {
        const a = R() * Math.PI * 2, d = cs * (0.46 + R() * 0.16), r = cs * (0.025 + R() * 0.05);
        c.globalAlpha = 0.85; c.beginPath(); c.arc(x + cs * 0.5 + Math.cos(a) * d, y + cs * 0.5 + Math.sin(a) * d, r, 0, 7); c.fill();
      }
      c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath(); c.ellipse(x + cs * 0.5, y + cs * 0.5, cs * 0.2, cs * 0.13, 0.5, 0, 7); c.fill();
    } else if (e === 'sa') {
      for (let i = 0; i < 9; i++) {
        c.fillStyle = R() < 0.5 ? '#f6dc8c' : '#d8ae45'; c.globalAlpha = 0.75 + R() * 0.25;
        const r = cs * (0.02 + R() * 0.035);
        c.beginPath(); c.arc(x + cs * (0.15 + R() * 0.7), y + cs * (0.15 + R() * 0.7), r, 0, 7); c.fill();
      }
    } else if (e === 'yin') {
      const s = cs * 0.3, sx = x + cs - s - cs * 0.1, sy = y + cs - s - cs * 0.1;
      c.fillStyle = it.ink === 'zhu' ? '#f4e9cf' : '#c9281a'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;
      c.beginPath(); c.rect(sx, sy, s, s); c.fill(); c.stroke();
      c.fillStyle = it.ink === 'zhu' ? '#c9281a' : '#f4e9cf';
      c.fillRect(sx + s * 0.28, sy + s * 0.28, s * 0.44, s * 0.44);
    } else if (e === 'su') {
      c.strokeStyle = 'rgba(235,225,200,0.5)'; c.lineWidth = Math.max(1, cs * 0.035);
      c.beginPath(); c.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.3, 0, 7); c.stroke();
      c.globalAlpha = 0.5; c.beginPath(); c.arc(x + cs * 0.5, y + cs * 0.5, cs * 0.17, 0, 7); c.stroke();
    }
    c.restore();
  },
  stone(c, x, y, cs, seed) {
    const R = prng(seed * 131 + 9);
    c.save();
    c.beginPath();
    const n = 9;
    for (let q = 0; q < n; q++) {
      const a = (q / n) * Math.PI * 2 + 0.2, r = cs * (0.36 + R() * 0.1);
      const px = x + cs / 2 + Math.cos(a) * r, py = y + cs / 2 + Math.sin(a) * r;
      if (q) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    const g = c.createLinearGradient(x, y, x + cs, y + cs);
    g.addColorStop(0, '#a39b8d'); g.addColorStop(1, '#5d574d');
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = cs * 0.12; c.shadowOffsetY = cs * 0.04;
    c.fillStyle = g; c.fill();
    c.shadowColor = 'transparent'; c.strokeStyle = 'rgba(30,26,22,0.7)'; c.lineWidth = Math.max(1, cs * 0.03); c.stroke();
    c.strokeStyle = 'rgba(30,26,22,0.45)'; c.lineWidth = Math.max(0.7, cs * 0.018);
    c.beginPath(); c.moveTo(x + cs * 0.32, y + cs * 0.4); c.lineTo(x + cs * 0.5, y + cs * 0.52); c.lineTo(x + cs * 0.46, y + cs * 0.7);
    c.moveTo(x + cs * 0.5, y + cs * 0.52); c.lineTo(x + cs * 0.68, y + cs * 0.46); c.stroke();
    c.restore();
  },
  // a loose block (tray, drag ghost, cards): centred on cx, cy
  piece(c, geom, ink, enh, cx, cy, cs, o) {
    const set = new Set(geom.cells.map((p) => p[0] + ',' + p[1]));
    const list = geom.cells.map(([x, y]) => ({
      x, y, ink, enh,
      nb: (set.has(x + ',' + (y - 1)) ? 1 : 0) | (set.has(x + 1 + ',' + y) ? 2 : 0) | (set.has(x + ',' + (y + 1)) ? 4 : 0) | (set.has(x - 1 + ',' + y) ? 8 : 0),
    }));
    this.paintCells(c, list, cs, cx - (geom.w * cs) / 2, cy - (geom.h * cs) / 2, o);
  },
  pieceCanvas(shape, ink, enh, cs, marks) {
    const g = geomOf(shape, 0, 0), k = Math.min(2, window.devicePixelRatio || 1) * 1.3;
    const cv = mkCanvas((g.w * cs + cs) * k, (g.h * cs + cs) * k), c = cv.getContext('2d');
    c.scale(k, k);
    this.piece(c, g, ink, enh, (g.w * cs + cs) / 2, (g.h * cs + cs) / 2, cs, { marks });
    cv.style.width = g.w * cs + cs + 'px'; cv.style.height = g.h * cs + cs + 'px';
    return cv;
  },

  // ----- brush strokes and character glyphs
  // one stroke from (x0,y0) to (x1,y1); p in 0..1 is how much of it has been written
  brush(c, x0, y0, x1, y1, t, color, p, seed, dry) {
    const R = prng((seed || 1) * 2654435761);
    const prog = p == null ? 1 : p;
    if (prog <= 0) return;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const L = len * prog, N = Math.max(6, Math.round(L / (t * 0.5)));
    const top = [], bot = [];
    const w1 = 0.94 + R() * 0.16, w2 = 0.78 + R() * 0.1, w3 = 0.96 + R() * 0.2;
    for (let i = 0; i <= N; i++) {
      const u = i / N, d = u * L, gu = d / len;
      // heavy start, lighter middle, pressed finish
      let wt = gu < 0.12 ? lerp(0.55, w1, gu / 0.12) : gu < 0.5 ? lerp(w1, w2, (gu - 0.12) / 0.38) : gu < 0.9 ? lerp(w2, w3, (gu - 0.5) / 0.4) : lerp(w3, 0.5, (gu - 0.9) / 0.1);
      if (prog < 1 && u > 0.82) wt *= lerp(1, 0.35, (u - 0.82) / 0.18);
      const j1 = (R() - 0.5) * t * 0.07, j2 = (R() - 0.5) * t * 0.07;
      const px = x0 + ux * d, py = y0 + uy * d, h = (t / 2) * wt;
      top.push([px + nx * (h + j1), py + ny * (h + j1)]);
      bot.push([px - nx * (h + j2), py - ny * (h + j2)]);
    }
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) c.lineTo(top[i][0], top[i][1]);
    const e = top.length - 1, ex = x0 + ux * L, ey = y0 + uy * L;
    c.quadraticCurveTo(ex + ux * t * 0.3, ey + uy * t * 0.3, bot[e][0], bot[e][1]);
    for (let i = bot.length - 2; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.quadraticCurveTo(x0 - ux * t * 0.42, y0 - uy * t * 0.42, top[0][0], top[0][1]);
    c.closePath();
    c.fill();
    if (dry !== false && t > 5) {
      // flying white: the hairs of the brush part as it runs dry
      c.globalCompositeOperation = 'destination-out';
      c.lineCap = 'round';
      const k = 3 + Math.floor(R() * 3);
      for (let i = 0; i < k; i++) {
        const off = (R() - 0.5) * t * 0.62, s = 0.45 + R() * 0.3, e2 = Math.min(prog, s + 0.18 + R() * 0.3);
        if (e2 * len <= s * len || s > prog) continue;
        c.globalAlpha = 0.35 + R() * 0.4; c.lineWidth = Math.max(0.6, t * (0.03 + R() * 0.05));
        c.beginPath();
        c.moveTo(x0 + ux * len * s + nx * off, y0 + uy * len * s + ny * off);
        c.lineTo(x0 + ux * len * e2 + nx * off * 0.8, y0 + uy * len * e2 + ny * off * 0.8);
        c.stroke();
      }
    }
    c.restore();
  },
  // lay: {rows, cols, diags} on a w×h sheet, drawn inside the square at x,y with the given size
  glyph(c, lay, w, h, x, y, size, color, o) {
    const opt = o || {};
    const pad = size * 0.04, inner = size - pad * 2;
    const t = Math.min(size * (opt.weight || 0.105), (inner / Math.max(w, h)) * 0.86);
    const prog = opt.prog;
    let si = 0;
    const P = (i) => (prog == null ? 1 : clamp(prog - i, 0, 1));
    for (const r of lay.rows) { const yy = y + pad + ((r + 0.5) / h) * inner; this.brush(c, x + pad * 0.4, yy, x + size - pad * 0.4, yy, t, color, P(si), r * 7 + 3 + (opt.seed || 0), opt.dry); si++; }
    for (const q of lay.cols) { const xx = x + pad + ((q + 0.5) / w) * inner; this.brush(c, xx, y + pad * 0.4, xx, y + size - pad * 0.4, t, color, P(si), q * 13 + 101 + (opt.seed || 0), opt.dry); si++; }
    for (const d of lay.diags || []) {
      if (d === 0) this.brush(c, x + pad, y + pad, x + size - pad, y + size - pad, t, color, P(si), 501, opt.dry);
      else this.brush(c, x + size - pad, y + pad, x + pad, y + size - pad, t, color, P(si), 601, opt.dry);
      si++;
    }
  },
  glyphCanvas(id, size, color, o) {
    const k = Math.min(2, window.devicePixelRatio || 1) * (o && o.k ? o.k : 1.3);
    const cv = mkCanvas(size * k, size * k), c = cv.getContext('2d');
    c.scale(k, k);
    if (id === 'sanbi') {
      // a scribble: strokes that never quite agree
      this.brush(c, size * 0.12, size * 0.3, size * 0.86, size * 0.22, size * 0.09, color, 1, 5);
      this.brush(c, size * 0.2, size * 0.62, size * 0.9, size * 0.72, size * 0.09, color, 1, 9);
      this.brush(c, size * 0.36, size * 0.08, size * 0.3, size * 0.92, size * 0.09, color, 1, 13);
      this.brush(c, size * 0.7, size * 0.14, size * 0.76, size * 0.88, size * 0.09, color, 1, 17);
    } else {
      const lay = o && o.lay ? o.lay : charLayout(id, 8, 8);
      const w = o && o.w ? o.w : 8, h = o && o.h ? o.h : 8;
      this.glyph(c, lay, w, h, 0, 0, size, color, Object.assign({ dry: size >= 40 }, o));
    }
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    return cv;
  },

  // ----- seals
  sealFace(id, size, ed) {
    const key = id + '|' + size + '|' + (ed || '') + '|' + (window.devicePixelRatio || 1);
    if (this._seal.has(key)) return this._seal.get(key);
    if (this._seal.size > 320) this._seal.clear();
    const d = SEALS[id], k = Math.min(2, window.devicePixelRatio || 1) * 1.35;
    const cv = mkCanvas(size * k, size * k), c = cv.getContext('2d');
    c.scale(k, k);
    const R = prng(hashStr(id) + 3);
    const s = size, m = s * 0.06;
    const legendary = d.r === 4, rare = d.r === 3;
    const face = legendary ? ['#ecc65a', '#c9952b'] : rare ? ['#a81f17', '#7c120d'] : ['#c5301f', '#a3231a'];
    const txt = legendary ? '#5a1408' : rare ? '#f6d98a' : '#f8eed6';
    // carved outline: a square nibbled at the edges (leisure seals are oval)
    c.beginPath();
    if (ed === 'xian') c.ellipse(s / 2, s / 2, s / 2 - m, s / 2 - m * 2.2, 0, 0, Math.PI * 2);
    else {
      const pts = [], n = 7, j = s * 0.014, r = s * 0.1;
      const side = (ax, ay, bx, by) => { for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(ax, bx, u) + (R() - 0.5) * j, lerp(ay, by, u) + (R() - 0.5) * j]); } };
      side(m + r, m, s - m - r, m); side(s - m, m + r, s - m, s - m - r); side(s - m - r, s - m, m + r, s - m); side(m, s - m - r, m, m + r);
      pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    }
    const g = c.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, face[0]); g.addColorStop(1, face[1]);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = s * 0.07; c.shadowOffsetY = s * 0.025; c.fillStyle = g; c.fill(); c.restore();
    c.save(); c.clip();
    // text
    const chars = Array.from(d.face || d.zh);
    c.fillStyle = txt; c.textAlign = 'center'; c.textBaseline = 'middle';
    const put = (ch, cx, cy, fs, sy) => {
      c.save(); c.translate(cx, cy); if (sy) c.scale(1, sy);
      c.font = `700 ${Math.round(fs)}px ${FONT_KAI}`; c.fillText(ch, 0, fs * 0.04); c.restore();
    };
    const a = m * 1.9, in0 = s - a * 2;
    if (chars.length === 1) put(chars[0], s / 2, s / 2, in0 * 0.86);
    else if (chars.length === 2) { put(chars[0], s / 2, a + in0 * 0.26, in0 * 0.5); put(chars[1], s / 2, a + in0 * 0.76, in0 * 0.5); }
    else if (chars.length === 3) {
      put(chars[0], a + in0 * 0.75, s / 2, in0 * 0.5, 1.75);
      put(chars[1], a + in0 * 0.25, a + in0 * 0.26, in0 * 0.47); put(chars[2], a + in0 * 0.25, a + in0 * 0.76, in0 * 0.47);
    } else {
      put(chars[0], a + in0 * 0.75, a + in0 * 0.26, in0 * 0.47); put(chars[1], a + in0 * 0.75, a + in0 * 0.76, in0 * 0.47);
      put(chars[2], a + in0 * 0.25, a + in0 * 0.26, in0 * 0.47); put(chars[3], a + in0 * 0.25, a + in0 * 0.76, in0 * 0.47);
    }
    if (d.r >= 2 && ed !== 'xian') { c.strokeStyle = txt; c.globalAlpha = 0.75; c.lineWidth = Math.max(1, s * 0.022); c.strokeRect(a * 0.55, a * 0.55, s - a * 1.1, s - a * 1.1); c.globalAlpha = 1; }
    // wear: flecks where the paste did not take
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 46; i++) {
      c.globalAlpha = 0.25 + R() * 0.5;
      const r = s * (0.004 + R() * 0.014);
      c.beginPath(); c.arc(R() * s, R() * s, r, 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (ed === 'jin') { const gg = c.createLinearGradient(0, 0, s, s); gg.addColorStop(0.3, 'rgba(255,230,140,0)'); gg.addColorStop(0.5, 'rgba(255,236,160,0.5)'); gg.addColorStop(0.7, 'rgba(255,230,140,0)'); c.fillStyle = gg; c.fillRect(0, 0, s, s); }
    if (ed === 'jing') { const gg = c.createLinearGradient(0, s, s, 0); gg.addColorStop(0.3, 'rgba(190,225,255,0)'); gg.addColorStop(0.5, 'rgba(200,232,255,0.42)'); gg.addColorStop(0.7, 'rgba(190,225,255,0)'); c.fillStyle = gg; c.fillRect(0, 0, s, s); }
    if (ed === 'zhu') { c.strokeStyle = 'rgba(255,170,120,0.85)'; c.lineWidth = s * 0.05; c.strokeRect(m, m, s - m * 2, s - m * 2); }
    c.restore();
    this._seal.set(key, cv);
    return cv;
  },
  // DOM-friendly copy of a cached canvas
  sealEl(id, size, ed) {
    const src = this.sealFace(id, size, ed);
    const cv = mkCanvas(src.width, src.height);
    cv.getContext('2d').drawImage(src, 0, 0);
    cv.style.width = size + 'px'; cv.style.height = size + 'px';
    cv.className = 'sealface';
    return cv;
  },
};

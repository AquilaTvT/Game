// ============================================================
//  缚夜 · Nightbind
//  作者 / Author: 藤野京
// ============================================================
const VERSION = '1.0.0';
const AUTHOR = '藤野京';
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const hyp = Math.hypot;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
// a small seeded generator; the whole simulation draws from one of these so a seed replays exactly
function makeRng(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.get = () => s;
  f.set = (v) => { s = v >>> 0; };
  f.int = (n) => Math.floor(f() * n);
  f.range = (a, b) => a + f() * (b - a);
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.weighted = (arr, wf) => {
    let tot = 0;
    for (const a of arr) tot += Math.max(0, wf(a));
    if (tot <= 0) return arr.length ? arr[Math.floor(f() * arr.length)] : null;
    let r = f() * tot;
    for (const a of arr) { r -= Math.max(0, wf(a)); if (r < 0) return a; }
    return arr[arr.length - 1];
  };
  f.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  return f;
}
function makeSeed() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

// ---- geometry
function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
  // returns t along AB (0..1) where it crosses CD, or -1
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return -1;
  const qx = cx - ax, qy = cy - ay;
  const t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}
function polyArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i += 2) { const j = (i + 2) % n; a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1]; }
  return a / 2;
}
function pointInPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, n = pts.length, j = n - 2; i < n; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return hyp(px - (ax + dx * t), py - (ay + dy * t));
}
function distToPoly(pts, x, y) {
  let d = Infinity;
  for (let i = 0, n = pts.length; i < n; i += 2) { const j = (i + 2) % n; const q = distToSeg(x, y, pts[i], pts[i + 1], pts[j], pts[j + 1]); if (q < d) d = q; }
  return d;
}

// ---- text
let LANG = 'zh';
const tx = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[LANG] != null ? o[LANG] : o.zh));
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// markup in descriptions: [k|keyword] [n|number] [w|warning]
const rich = (s) => escHtml(s).replace(/\[(\w)\|([^\]]*)\]/g, (_, k, v) => `<b class="rk-${k}">${v}</b>`).replace(/\n/g, '<br>');
function fmtNum(n) {
  if (!isFinite(n)) return '∞';
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  if (LANG === 'zh') return n < 1e8 ? (n / 1e4).toFixed(n < 1e5 ? 2 : 1) + '万' : (n / 1e8).toFixed(2) + '亿';
  return n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : n < 1e9 ? (n / 1e6).toFixed(2) + 'M' : (n / 1e9).toFixed(2) + 'B';
}
const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

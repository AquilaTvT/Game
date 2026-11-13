// ============================================================
//  方块字 · Block Script
//  作者 / Author: 藤野京
// ============================================================
const VERSION = '1.0.0';
const AUTHOR = '藤野京';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const sum = (arr, f) => { let s = 0; for (let i = 0; i < arr.length; i++) s += f ? f(arr[i], i) : arr[i]; return s; };
const range = (n) => Array.from({ length: n }, (_, i) => i);
const deepClone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}

// ---- seeded random streams stored on the run (serialisable) ----
function rnd(run, k) {
  let s = (run.rng[k] + 0x6D2B79F5) >>> 0;
  run.rng[k] = s;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rndInt = (run, k, n) => Math.floor(rnd(run, k) * n);
const rndPick = (run, k, arr) => arr[rndInt(run, k, arr.length)];
function rndShuffle(run, k, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rndInt(run, k, i + 1);
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function rndWeighted(run, k, arr, wf) {
  let tot = 0;
  for (const a of arr) tot += Math.max(0, wf(a));
  if (tot <= 0) return arr.length ? arr[rndInt(run, k, arr.length)] : null;
  let r = rnd(run, k) * tot;
  for (const a of arr) { r -= Math.max(0, wf(a)); if (r < 0) return a; }
  return arr[arr.length - 1];
}
function makeSeed() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

// ---- number formatting ----
let LANG = 'zh';
function fmtNum(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmtNum(-n);
  if (n < 1e6) {
    const v = Math.floor(n + 1e-9);
    return v.toLocaleString('en-US');
  }
  if (n >= 1e16) {
    const e = Math.floor(Math.log10(n));
    const m = n / Math.pow(10, e);
    return m.toFixed(2) + 'e' + e;
  }
  const sig = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  if (LANG === 'zh') {
    if (n < 1e8) return sig(n / 1e4) + '万';
    if (n < 1e12) return sig(n / 1e8) + '亿';
    return sig(n / 1e12) + '万亿';
  }
  if (n < 1e9) return sig(n / 1e6) + 'M';
  if (n < 1e12) return sig(n / 1e9) + 'B';
  return sig(n / 1e12) + 'T';
}
function fmtMult(m) {
  if (!isFinite(m)) return '∞';
  if (m >= 1e6) return fmtNum(m);
  if (m >= 1000) return Math.round(m).toLocaleString('en-US');
  const r = Math.round(m * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return r >= 100 ? r.toFixed(0) : r >= 10 ? r.toFixed(1) : String(r);
}
const fmtX = (x) => '×' + (Math.round(x * 100) / 100);

// ---- text ----
const tx = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[LANG] != null ? o[LANG] : o.zh));
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// markup: [c|+30 形] [m|+4 神] [x|×2] [g|$3] [k|关键词] [mo|墨] [zhu|朱] [qing|青] [jin|金] [n|备注]
function rich(s) {
  return escHtml(s).replace(/\[(\w+)\|([^\]]*)\]/g, (_, k, v) => `<b class="rk rk-${k}">${v}</b>`).replace(/\n/g, '<br>');
}
const plain = (s) => String(s).replace(/\[(\w+)\|([^\]]*)\]/g, '$2');

// ---------- engine: state, stats, the sheet, and scoring ----------
function flag(run, key) {
  const rd = run.round;
  if (rd && rd.boss) { const v = BOSSES[rd.boss].flags[key]; if (v) return v; }
  const dv = DECKS[run.deckId].flags[key];
  if (dv) return dv;
  for (let i = run.stake; i >= 1; i--) { const f = STAKES[i].flags; if (f && f[key]) return f[key]; }
  for (const s of run.seals) {
    if (rd && rd.sealOff[s.uid]) continue;
    const f = SEALS[s.id].flags;
    if (f && f[key]) return f[key];
  }
  return 0;
}
function stat(run, key) {
  let v = BASE_STATS[key] || 0;
  const add = (m) => { if (m && m[key] != null) v += m[key]; };
  add(DECKS[run.deckId].mods);
  for (let i = 1; i <= run.stake; i++) add(STAKES[i].mods);
  for (const id in run.vouchers) add(VOUCHERS[id].mods);
  const rd = run.round;
  if (rd && rd.boss) add(BOSSES[rd.boss].mods);
  if (rd) add(rd.tmp);
  for (const s of run.seals) {
    if (rd && rd.sealOff[s.uid]) continue;
    add(SEALS[s.id].mods);
  }
  for (const s of run.seals) {
    if (rd && rd.sealOff[s.uid]) continue;
    const d = SEALS[s.id];
    if (d.mod) v = d.mod(run, s, key, v);
  }
  if (key === 'inkMax') return Math.max(20, v);
  if (key === 'ignites' || key === 'tray') return Math.max(1, v);
  if (key === 'discards' || key === 'itemSlots' || key === 'shopSlots' || key === 'freeRerolls' || key === 'peek') return Math.max(0, v);
  if (key === 'sealSlots') return Math.max(1, v);
  if (key === 'discount') return clamp(v, -100, 75);
  return v;
}
function prob(run, a, b) {
  const p = Math.min(1, (a * Math.max(1, stat(run, 'probMul'))) / b);
  return rnd(run, 'proc') < p;
}

// ---- Ink Box (the deck of blocks)
const pieceByUid = (run, uid) => run.deck.find((p) => p.uid === uid) || null;
function addPiece(run, shape, ink, enh) {
  const p = { uid: run.uid++, shape, ink, enh: enh || null };
  run.deck.push(p);
  return p;
}
function removePiece(run, uid) {
  const i = run.deck.findIndex((p) => p.uid === uid);
  if (i < 0) return false;
  run.deck.splice(i, 1);
  syncRound(run);
  return true;
}
// after the Ink Box changes mid-round: drop vanished blocks from tray and draw pile, refill
function syncRound(run) {
  const rd = run.round;
  if (!rd || run.phase !== 'round') return;
  const alive = new Set(run.deck.map((p) => p.uid));
  rd.draw = rd.draw.filter((u) => alive.has(u));
  for (let i = 0; i < rd.tray.length; i++) if (rd.tray[i] && !alive.has(rd.tray[i].uid)) rd.tray[i] = null;
  fillTray(run);
}

// ---- seals
const sealRoom = (run) => run.seals.filter((s) => s.ed !== 'xian').length < stat(run, 'sealSlots');
function addSeal(run, id, ed) {
  const s = { uid: run.uid++, id, ed: ed || null, st: {}, bonus: 0 };
  const d = SEALS[id];
  if (d.init) d.init(s);
  run.seals.push(s);
  run.seen[id] = 1;
  return s;
}
function destroySeal(run, uid) {
  const i = run.seals.findIndex((s) => s.uid === uid);
  if (i >= 0) run.seals.splice(i, 1);
}
function sealSellValue(s) {
  const d = SEALS[s.id];
  return Math.max(1, Math.floor((d.cost + (s.ed ? EDITIONS[s.ed].add : 0)) / 2)) + (s.bonus || 0);
}
function copyTarget(run, s) {
  const i = run.seals.indexOf(s);
  if (i < 0) return null;
  for (let j = i + 1; j < run.seals.length; j++) {
    const t = run.seals[j];
    if (SEALS[t.id].copy) continue;
    if (run.round && run.round.sealOff[t.uid]) return null;
    return t;
  }
  return null;
}
// the seals that act in scoring, in slot order (copies act with a throw-away clone of their model's state)
function scoringSeals(run) {
  const out = [], rd = run.round;
  for (const s of run.seals) {
    if (rd && rd.sealOff[s.uid]) continue;
    const d = SEALS[s.id];
    if (d.copy) {
      const t = copyTarget(run, s);
      out.push(t ? { s: { uid: t.uid, id: t.id, ed: null, st: deepClone(t.st), bonus: 0 }, def: SEALS[t.id], u: s.uid, self: s } : { s, def: {}, u: s.uid, self: s });
    } else out.push({ s, def: d, u: s.uid, self: s });
  }
  return out;
}
const legendaryPool = (run) => run.pool.filter((id) => SEALS[id].r === 4 && !run.seals.some((s) => s.id === id));
function rollSealId(run, stream, rarity, exclude) {
  const owned = new Set(run.seals.map((s) => s.id));
  if (exclude) for (const e of exclude) owned.add(e);
  let r = rarity;
  if (!r) { const x = rnd(run, stream); r = x < 0.7 ? 1 : x < 0.95 ? 2 : 3; }
  const pick = (rr) => {
    const pool = run.pool.filter((id) => SEALS[id].r === rr && !owned.has(id));
    return pool.length ? rndWeighted(run, stream, pool, (id) => SEALS[id].w) : null;
  };
  return pick(r) || pick(1) || pick(2) || pick(3) || 'xinshou';
}
function rollEdition(run, stream) {
  const p = 0.06 + 0.1 * stat(run, 'edRate');
  if (rnd(run, stream) >= p) return null;
  return rndWeighted(run, stream, Object.keys(EDITIONS), (k) => EDITIONS[k].w);
}

// ---- misc helpers used by data
function giveItem(run, id, force) {
  if (!id) return false;
  if (!force && run.items.length >= stat(run, 'itemSlots')) return false;
  run.items.push({ id, uid: run.uid++ });
  return true;
}
function levelUp(run, tier, n) {
  run.tiers[tier] = Math.max(1, run.tiers[tier] + n);
  return run.tiers[tier];
}
function favTier(run) {
  let best = 1, bv = -1;
  for (let t = 1; t <= TIER_MAX; t++) if (run.tierCounts[t] > bv) { bv = run.tierCounts[t]; best = t; }
  return bv > 0 ? best : 2;
}
const distinctChars = (run) => Object.keys(run.charCounts).filter((k) => k !== 'sanbi' && run.charCounts[k] > 0).length;
function addInk(run, v) { if (run.round) run.round.ink = Math.max(0, run.round.ink + v); }

// ---- new run
function newRun(opts) {
  const o = opts || {};
  const deck = DECKS[o.deck || 'kai'];
  const seed = String(o.seed || makeSeed()).toUpperCase();
  const h0 = hashStr(seed);
  const run = {
    v: 1, seed, daily: o.daily || null, tutorial: !!o.tutorial,
    rng: { shuffle: (hashStr(seed + '#s') ^ h0) >>> 0, shop: hashStr(seed + '#h'), boss: hashStr(seed + '#b'), proc: hashStr(seed + '#p'), pack: hashStr(seed + '#k'), misc: hashStr(seed + '#m') },
    deckId: deck.id, stake: o.stake || 0, w: deck.w, h: deck.h,
    ante: 1, blind: 0, phase: 'pick',
    money: deck.money != null ? deck.money : 4,
    deck: [], uid: 1, seals: [], items: [], vouchers: {},
    tiers: [0, 1, 1, 1, 1, 1, 1, 1], tierCounts: [0, 0, 0, 0, 0, 0, 0, 0], lastTier: 0,
    paper: new Array(deck.w * deck.h).fill(null),
    charCounts: {}, seen: {},
    boss: null, bossSeen: [], skipTags: [], tags: { ink: 0, packs: [], reroll: 0, rare: 0, double: 0 },
    shopVoucher: null, round: null, shop: null, pack: null, cash: null,
    endless: false, won: false, lost: null,
    pool: o.pool ? o.pool.slice() : SEAL_ORDER.slice(),
    stats: { ignites: 0, placed: 0, discards: 0, best: 0, bestChar: null, rounds: 0, skips: 0, earned: 0, bought: 0, rerolls: 0, cells: 0, clean: 0, time: 0, maxAnte: 1 },
  };
  for (const [shape, ink] of deck.build()) {
    const p = addPiece(run, shape, ink, null);
    if (deck.randomEnh) p.enh = rndPick(run, 'misc', ENH_IDS);
  }
  if (deck.items) for (const id of deck.items) giveItem(run, id, true);
  if (deck.seals) for (const id of deck.seals) addSeal(run, id, null);
  beginAnte(run);
  return run;
}
function pickBoss(run, ante) {
  const fin = ante % 8 === 0;
  const ok = (id) => !!BOSSES[id].fin === fin && BOSSES[id].min <= ante;
  let pool = BOSS_ORDER.filter((id) => ok(id) && !run.bossSeen.includes(id));
  if (!pool.length) { run.bossSeen = run.bossSeen.filter((id) => !ok(id)); pool = BOSS_ORDER.filter(ok); }
  const id = rndPick(run, 'boss', pool);
  run.bossSeen.push(id);
  return id;
}
function rollVoucher(run) {
  const pool = VOUCHER_ORDER.filter((id) => !run.vouchers[id] && (!VOUCHERS[id].req || run.vouchers[VOUCHERS[id].req]));
  return pool.length ? rndPick(run, 'shop', pool) : null;
}
function beginAnte(run) {
  run.boss = pickBoss(run, run.ante);
  const tags = rndShuffle(run, 'boss', TAG_IDS.slice());
  run.skipTags = [tags[0], tags[1]];
  run.shopVoucher = rollVoucher(run);
  if (run.ante > run.stats.maxAnte) run.stats.maxAnte = run.ante;
}
function blindInfo(run, b) {
  const boss = b === 2 ? run.boss : null;
  let t = anteBase(run.ante) * BLIND_MULT[b];
  for (let i = 1; i <= run.stake; i++) {
    const sc = STAKES[i].flags && STAKES[i].flags.scale;
    if (sc) t *= sc[0] + sc[1] * (Math.min(run.ante, 12) - 1);
  }
  if (boss) {
    t *= BOSSES[boss].targetMul || 1;
    for (let i = 1; i <= run.stake; i++) if (STAKES[i].flags && STAKES[i].flags.bossMul) t *= STAKES[i].flags.bossMul;
  }
  // the very first sheet of a first-ever run is a gentle one
  if (run.tutorial && run.ante === 1 && b === 0) t = Math.min(t, 150);
  let reward = BLIND_REWARD[b];
  if (b === 0) for (let i = 1; i <= run.stake; i++) if (STAKES[i].flags && STAKES[i].flags.noSmallReward) reward = 0;
  return { blind: b, boss, target: roundTarget(t), reward };
}

// ---- round
function startRound(run) {
  if (run.phase !== 'pick') return false;
  const info = blindInfo(run, run.blind);
  const rd = run.round = {
    blind: run.blind, boss: info.boss, target: info.target, reward: info.reward, score: 0,
    inkMax: 0, ink: 0, ignites: 0, discards: 0, discardsUsed: 0, igniteCount: 0,
    board: new Array(run.w * run.h).fill(null), holes: {},
    tray: [], draw: [], placed: 0, placedSince: 0, lastPlaced: null,
    chars: [], yiUsed: {}, buff: 0, tmp: {}, sealOff: {}, best: 0, gotCash: 0,
  };
  run.phase = 'round';
  if (rd.boss && BOSSES[rd.boss].flags.sealOff === 'left' && run.seals.length) rd.sealOff[run.seals[0].uid] = 1;
  if (run.tags.ink) { rd.tmp.inkMax = (rd.tmp.inkMax || 0) + run.tags.ink; run.tags.ink = 0; }
  rd.inkMax = stat(run, 'inkMax');
  rd.ink = rd.inkMax;
  rd.ignites = stat(run, 'ignites');
  rd.discards = stat(run, 'discards');
  if (rd.boss && BOSSES[rd.boss].start) BOSSES[rd.boss].start(run);
  for (const s of run.seals) { const d = SEALS[s.id]; if (d.roundStart) d.roundStart(run, s); }
  fillTray(run);
  return true;
}
function drawOne(run) {
  const rd = run.round;
  if (!rd.draw.length) {
    const held = new Set(rd.tray.filter(Boolean).map((t) => t.uid));
    rd.draw = run.deck.map((p) => p.uid).filter((u) => !held.has(u));
    rndShuffle(run, 'shuffle', rd.draw);
  }
  if (!rd.draw.length) return null;
  const uid = rd.draw.pop();
  const t = { uid, rot: 0, flip: 0 };
  if (flag(run, 'noRotate')) t.rot = rndInt(run, 'shuffle', 4);
  if (flag(run, 'morph') && rnd(run, 'shuffle') < 1 / 3) {
    t.sh = rndPick(run, 'shuffle', ['l5', 'j5', 'v5', 't5', 'p5', 'q5', 'u5', 'x5', 'w5', 'y5', 'n5', 'z5']);
  }
  return t;
}
function fillTray(run) {
  const rd = run.round;
  const size = stat(run, 'tray');
  if (flag(run, 'queue')) {
    rd.tray = rd.tray.filter(Boolean);
    while (rd.tray.length < size) { const t = drawOne(run); if (!t) break; rd.tray.push(t); }
    while (rd.tray.length < size) rd.tray.push(null);
    return;
  }
  while (rd.tray.length < size) rd.tray.push(null);
  if (rd.tray.length > size) {
    // tray shrank: keep what is held, drop empty slots first
    const held = rd.tray.filter(Boolean);
    rd.tray = held.slice(0, Math.max(size, held.length));
    while (rd.tray.length < size) rd.tray.push(null);
  }
  for (let i = 0; i < rd.tray.length; i++) if (!rd.tray[i]) rd.tray[i] = drawOne(run);
}
function trayShape(run, slot) {
  const t = run.round.tray[slot];
  if (!t) return null;
  const p = pieceByUid(run, t.uid);
  return p ? (t.sh || p.shape) : null;
}
function trayGeom(run, slot) {
  const t = run.round.tray[slot];
  const sh = trayShape(run, slot);
  return sh ? geomOf(sh, t.rot, t.flip) : null;
}
const pieceCost = (run, shape) => Math.max(1, SHAPES[shape].n + stat(run, 'costAdd'));
function slotUsable(run, slot) {
  const rd = run.round;
  if (!rd || !rd.tray[slot]) return false;
  if (flag(run, 'queue') && slot !== 0) return false;
  return true;
}
function fits(run, geom, x, y) {
  const rd = run.round, w = run.w, h = run.h;
  for (const [cx, cy] of geom.cells) {
    const X = x + cx, Y = y + cy;
    if (X < 0 || Y < 0 || X >= w || Y >= h) return false;
    const i = Y * w + X;
    if (rd.board[i] || rd.holes[i]) return false;
  }
  return true;
}
function placeBlocked(run, slot) {
  const rd = run.round;
  if (run.phase !== 'round' || !slotUsable(run, slot)) return 'slot';
  const lim = flag(run, 'pieceLimit');
  if (lim && rd.placed >= lim) return 'limit';
  if (pieceCost(run, trayShape(run, slot)) > rd.ink) return 'ink';
  return null;
}
function canPlace(run, slot, x, y) {
  if (placeBlocked(run, slot)) return false;
  return fits(run, trayGeom(run, slot), x, y);
}
function placeBlock(run, slot, x, y) {
  if (!canPlace(run, slot, x, y)) return { ok: false, why: placeBlocked(run, slot) || 'fit' };
  const rd = run.round, w = run.w;
  const t = rd.tray[slot], p = pieceByUid(run, t.uid);
  const shape = t.sh || p.shape, geom = geomOf(shape, t.rot, t.flip);
  const cost = pieceCost(run, shape);
  const before = findLines(run);
  const cells = [];
  for (const [cx, cy] of geom.cells) {
    const i = (y + cy) * w + (x + cx);
    rd.board[i] = { ink: p.ink, enh: p.enh, pid: p.uid, shape, q: rd.placed };
    cells.push(i);
  }
  rd.ink -= cost;
  rd.placed++; rd.placedSince++; rd.lastPlaced = shape;
  run.stats.placed++;
  const ev = [];
  for (const s of run.seals) {
    if (rd.sealOff[s.uid]) continue;
    const d = SEALS[s.id];
    if (d.place) d.place(run, s, { shape, cost, cells });
  }
  if (rd.boss && BOSSES[rd.boss].afterPlace) BOSSES[rd.boss].afterPlace(run, ev);
  if (flag(run, 'queue')) { rd.tray.splice(slot, 1); } else rd.tray[slot] = null;
  fillTray(run);
  const after = findLines(run);
  return { ok: true, ev, cells, cost, shape, ink: p.ink, newLines: after.n - before.n, lines: after };
}
function rotateTray(run, slot, dir) {
  const rd = run.round;
  if (!rd || !rd.tray[slot] || flag(run, 'noRotate')) return false;
  rd.tray[slot].rot = (rd.tray[slot].rot + (dir || 1) + 4) % 4;
  return true;
}
function flipTray(run, slot) {
  const rd = run.round;
  if (!rd || !rd.tray[slot] || !stat(run, 'flip') || flag(run, 'noRotate')) return false;
  rd.tray[slot].flip = rd.tray[slot].flip ? 0 : 1;
  return true;
}
function discardBlock(run, slot) {
  const rd = run.round;
  if (run.phase !== 'round' || !slotUsable(run, slot) || rd.discards <= 0) return { ok: false };
  rd.discards--; rd.discardsUsed++; run.stats.discards++;
  for (const s of run.seals) {
    if (rd.sealOff[s.uid]) continue;
    const d = SEALS[s.id];
    if (d.discard) d.discard(run, s);
  }
  if (flag(run, 'queue')) rd.tray.splice(slot, 1); else rd.tray[slot] = null;
  fillTray(run);
  return { ok: true };
}
function peekList(run, n) {
  const rd = run.round, out = [];
  for (let i = rd.draw.length - 1; i >= 0 && out.length < n; i--) { const p = pieceByUid(run, rd.draw[i]); if (p) out.push(p); }
  return out;
}

// ---- lines and the character they write
function findLines(run, board) {
  const rd = run.round, w = run.w, h = run.h, B = board || rd.board;
  const rows = [], cols = [], diags = [];
  for (let y = 0; y < h; y++) {
    let ok = true;
    for (let x = 0; x < w; x++) if (!B[y * w + x]) { ok = false; break; }
    if (ok) rows.push(y);
  }
  for (let x = 0; x < w; x++) {
    let ok = true;
    for (let y = 0; y < h; y++) if (!B[y * w + x]) { ok = false; break; }
    if (ok) cols.push(x);
  }
  if (w === h && stat(run, 'diag') > 0) {
    let a = true, b = true;
    for (let i = 0; i < w; i++) { if (!B[i * w + i]) a = false; if (!B[i * w + (w - 1 - i)]) b = false; }
    if (a) diags.push(0);
    if (b) diags.push(1);
  }
  return { rows, cols, diags, n: rows.length + cols.length + diags.length };
}
function nullReason(run, id, n) {
  const rd = run.round;
  if (flag(run, 'sanDead') && id === 'sanbi') return 'san';
  const ms = flag(run, 'minStrokes');
  if (ms && n < ms) return 'min';
  if (flag(run, 'noRepeat') && rd.chars.includes(id)) return 'repeat';
  return null;
}
function patternOf(run, L) {
  if (!L.n) return null;
  const cls = classifyLines(run.w, run.h, L.rows, L.cols, L.diags);
  const tier = tierOf(cls.n);
  const lvl = flag(run, 'noLevels') ? 1 : run.tiers[tier];
  return { id: cls.id, n: cls.n, tier, lvl, base: tierBase(tier, lvl), x: CH[cls.id].x, lines: L, nul: nullReason(run, cls.id, cls.n) };
}
const currentPattern = (run) => patternOf(run, findLines(run));

// ---- 挥毫: score every complete line at once
function ignite(run) {
  const rd = run.round;
  if (run.phase !== 'round' || !rd || rd.ignites <= 0) return null;
  const L = findLines(run);
  if (!L.n) return null;
  const w = run.w, h = run.h, B = rd.board;
  const pat = patternOf(run, L);
  const def = CH[pat.id], n = pat.n;
  const ev = [];
  // strokes
  const strokes = [], hit = {};
  const mk = (kind, i, idxs) => { strokes.push({ kind, i, idxs, cells: null, pure: null, si: strokes.length }); for (const k of idxs) hit[k] = (hit[k] || 0) + 1; };
  for (const y of L.rows) mk('row', y, range(w).map((x) => y * w + x));
  for (const x of L.cols) mk('col', x, range(h).map((y) => y * w + x));
  for (const d of L.diags) mk('diag', d, range(w).map((i) => (d === 0 ? i * w + i : i * w + (w - 1 - i))));
  const cx0 = Math.ceil(w / 4), cx1 = w - 1 - cx0, cy0 = Math.ceil(h / 4), cy1 = h - 1 - cy0;
  const info = {};
  const inkDead = flag(run, 'inkDead'), edgeDead = flag(run, 'edgeDead'), rowsDead = flag(run, 'rowsDead'), colsDead = flag(run, 'colsDead');
  for (const k in hit) {
    const i = +k, c = B[i], x = i % w, y = Math.floor(i / w);
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    info[i] = {
      idx: i, x, y, ink: c.ink, enh: c.enh, pid: c.pid, shape: c.shape, stone: !!c.stone,
      node: hit[k] >= 2, edge, corner: (x === 0 || x === w - 1) && (y === 0 || y === h - 1),
      center: x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1, sq: run.paper[i] || null,
      dead: !!c.stone || (inkDead && c.ink === inkDead) || (edgeDead && edge),
    };
  }
  for (const st of strokes) {
    st.cells = st.idxs.map((i) => info[i]);
    let ink = null, pure = true;
    for (const c of st.cells) {
      if (c.stone) { pure = false; break; }
      if (c.enh === 'bai') continue;
      if (ink == null) ink = c.ink; else if (ink !== c.ink) { pure = false; break; }
    }
    st.pure = pure ? (ink || 'mo') : null;
  }
  // aggregates
  const inkCount = {}, pieces = [], seenP = {};
  let nodes = 0;
  for (const k in info) {
    const c = info[k];
    if (c.node) nodes++;
    if (c.stone) continue;
    inkCount[c.ink] = (inkCount[c.ink] || 0) + 1;
    if (c.pid && !seenP[c.pid]) { seenP[c.pid] = 1; pieces.push({ pid: c.pid, shape: c.shape, ink: c.ink, enh: c.enh }); }
  }
  let empty = 0, clutter = 0, remain = 0;
  const strays = [];
  for (let i = 0; i < B.length; i++) {
    if (!B[i]) { if (!rd.holes[i]) empty++; continue; }
    if (hit[i]) continue;
    remain++;
    if (!B[i].stone) { clutter++; strays.push(i); }
  }
  const adj = (arr) => { let p = 0, run2 = 1, best = arr.length ? 1 : 0; for (let i = 1; i < arr.length; i++) { if (arr[i] === arr[i - 1] + 1) { p++; run2++; if (run2 > best) best = run2; } else run2 = 1; } return [p, best]; };
  const [pr, mr] = adj(L.rows), [pc, mc] = adj(L.cols);
  const sc = {
    run, rd, w, h, char: pat.id, def, n, tier: pat.tier, lvl: pat.lvl, rows: L.rows, cols: L.cols, diags: L.diags, strokes,
    chips: pat.base.c, mult: pat.base.m, money: 0, tmp: {}, src: null, laters: [],
    first: rd.igniteCount === 0, igniteIdx: rd.igniteCount, last: rd.ignites === 1,
    isChar: pat.id !== 'sanbi', num: def.num || 0, nodes, empty, clutter, cleanAfter: remain === 0,
    inkCount, pieces, adjPairs: pr + pc, maxRun: Math.max(mr, mc),
    newRound: !rd.chars.includes(pat.id), newRun: !(run.charCounts[pat.id] > 0),
    c(v) { if (!v) return; this.chips += v; ev.push({ t: 'add', k: 'c', v, c: this.chips, m: this.mult, src: this.src }); },
    m(v) { if (!v) return; this.mult += v; ev.push({ t: 'add', k: 'm', v, c: this.chips, m: this.mult, src: this.src }); },
    x(v) { if (!v || v === 1) return; this.mult = Math.min(1e300, Math.round(this.mult * v * 1e4) / 1e4); ev.push({ t: 'add', k: 'x', v, c: this.chips, m: this.mult, src: this.src }); },
    cash(v) { if (!v) return; this.money += v; ev.push({ t: 'add', k: 'g', v, c: this.chips, m: this.mult, src: this.src }); },
    say(txt) { ev.push({ t: 'say', txt, src: this.src }); },
    later(fn) { this.laters.push(fn); },
  };
  const nul = pat.nul;
  ev.push({ t: 'begin', char: pat.id, n, tier: pat.tier, lvl: pat.lvl, c: sc.chips, m: sc.mult, x: def.x, rows: L.rows, cols: L.cols, diags: L.diags, nul, newRun: sc.newRun });
  const seals = scoringSeals(run);
  let charX = def.x;
  if (!nul) {
    if (rd.buff > 0) { sc.src = { k: 'buff' }; sc.m(rd.buff); }
    const poSafe = flag(run, 'poSafe');
    const once = {};
    for (const st of strokes) {
      ev.push({ t: 'stroke', si: st.si, kind: st.kind, i: st.i, idxs: st.idxs });
      const lineDead = (st.kind === 'row' && rowsDead) || (st.kind === 'col' && colsDead);
      for (let pos = 0; pos < st.cells.length; pos++) {
        const c = st.cells[pos];
        if (c.dead || lineDead) { ev.push({ t: 'cell', si: st.si, i: c.idx, pos, rep: 0, dead: true }); continue; }
        let reps = 1 + (c.enh === 'yin' ? 1 : 0) + (c.sq === 'die' ? 1 : 0);
        for (const e of seals) if (e.def.retrig) reps += e.def.retrig(sc, e.s, c, st, pos) || 0;
        for (let r = 0; r < reps; r++) {
          ev.push({ t: 'cell', si: st.si, i: c.idx, pos, rep: r });
          sc.src = { k: 'cell', i: c.idx };
          sc.c(CELL_CHIPS);
          if (c.enh === 'nong') sc.c(12);
          else if (c.enh === 'fei') sc.m(1);
          else if (c.enh === 'po' && !once['po' + c.pid]) { once['po' + c.pid] = 1; sc.x(poSafe ? 2 : 1.5); }
          else if (c.enh === 'sa' && !once['sa' + c.pid]) { once['sa' + c.pid] = 1; sc.cash(1); }
          if (c.sq) {
            sc.src = { k: 'sq', i: c.idx };
            if (c.sq === 'wusi') sc.c(25);
            else if (c.sq === 'zhusi') sc.m(3);
            else if (c.sq === 'yunwen') sc.x(1.2);
            else if (c.sq === 'sajin' && !once['sq' + c.idx]) { once['sq' + c.idx] = 1; sc.cash(1); }
          }
          for (const e of seals) if (e.def.cell) { sc.src = { k: 'seal', u: e.u }; e.def.cell(sc, e.s, c, st, pos); }
        }
      }
      if (st.pure && !lineDead && st.pure !== inkDead) {
        ev.push({ t: 'pure', si: st.si, ink: st.pure });
        sc.src = { k: 'pure', si: st.si, ink: st.pure };
        if (st.pure === 'mo') sc.c(PURE.mo);
        else if (st.pure === 'zhu') sc.m(PURE.zhu);
        else if (st.pure === 'qing') sc.x(PURE.qing);
        else if (st.pure === 'jin' && (once.gold || 0) < 5) { once.gold = (once.gold || 0) + 1; sc.cash(PURE.jin); }
      } else st.pure = null;
      for (const e of seals) if (e.def.stroke) { sc.src = { k: 'seal', u: e.u }; e.def.stroke(sc, e.s, st); }
      ev.push({ t: 'strokeEnd', si: st.si });
    }
    // aged ink left outside the strokes
    for (const i of strays) if (B[i].enh === 'su') { sc.src = { k: 'su', i }; sc.m(2); }
    // seals, left to right
    for (const e of seals) {
      sc.src = { k: 'seal', u: e.u };
      if (e.def.end) e.def.end(sc, e.s);
      const ed = e.self.ed;
      if (ed && ed !== 'xian') {
        sc.src = { k: 'ed', u: e.u };
        if (ed === 'jing') sc.c(40); else if (ed === 'zhu') sc.m(8); else if (ed === 'jin') sc.x(1.5);
      }
    }
    for (const e of seals) if (e.def.charX) charX = e.def.charX(sc, e.s, charX);
    if (charX !== 1) { sc.src = { k: 'char' }; sc.x(charX); }
  }
  const score = nul ? 0 : Math.min(1e300, Math.floor(sc.chips * sc.mult + 1e-6));
  rd.score = Math.min(1e300, rd.score + score);
  if (score > rd.best) rd.best = score;
  if (score > run.stats.best) { run.stats.best = score; run.stats.bestChar = pat.id; }
  ev.push({ t: 'total', c: sc.chips, m: sc.mult, score, sum: rd.score, target: rd.target, nul });
  // clear the strokes
  const cleared = Object.keys(hit).map(Number);
  for (const i of cleared) B[i] = null;
  ev.push({ t: 'clear', cells: cleared });
  run.stats.cells += cleared.length;
  if (sc.cleanAfter) run.stats.clean++;
  // splash blocks may shatter
  if (!nul && !flag(run, 'poSafe')) {
    for (const p of pieces) if (p.enh === 'po' && pieceByUid(run, p.pid) && run.deck.length > 4 && prob(run, 1, 4)) {
      const i = run.deck.findIndex((q) => q.uid === p.pid);
      run.deck.splice(i, 1);
      ev.push({ t: 'shatter', shape: p.shape, ink: p.ink });
    }
  }
  if (sc.money) { run.money += sc.money; run.stats.earned += sc.money; rd.gotCash += sc.money; }
  // the character's own meaning
  let free = false;
  if (!nul && def.yi && !rd.yiUsed[pat.id]) {
    rd.yiUsed[pat.id] = 1;
    const y = { t: 'yi', char: pat.id, yi: def.yi };
    switch (def.yi) {
      case 'ink': addInk(run, 16); break;
      case 'discard': case 'sweep': rd.discards += 1; break;
      case 'money2': run.money += 2; run.stats.earned += 2; y.v = 2; break;
      case 'money4': run.money += 4; run.stats.earned += 4; y.v = 4; break;
      case 'tierUp': y.tier = 1 + rndInt(run, 'misc', TIER_MAX); levelUp(run, y.tier, 1); break;
      case 'tier2': y.tier = 2; levelUp(run, 2, 1); break;
      case 'buff': rd.buff += 6; break;
      case 'tray': rd.tmp.tray = (rd.tmp.tray || 0) + 1; break;
      case 'item': y.item = rndPick(run, 'misc', ITEM_POOL.filter((i) => !ITEMS[i].rare)); y.got = giveItem(run, y.item); break;
      case 'tie': y.item = rndPick(run, 'misc', TIE_IDS); y.got = giveItem(run, y.item); break;
      case 'peek': rd.tmp.peek = Math.max(rd.tmp.peek || 0, 5); break;
      case 'wipe': { const cells = []; for (let i = 0; i < B.length; i++) if (B[i]) { B[i] = null; cells.push(i); } y.cells = cells; break; }
      case 'ignite': free = true; break;
      case 'allTier': for (let t = 1; t <= TIER_MAX; t++) levelUp(run, t, 1); break;
    }
    ev.push(y);
  }
  for (const fn of sc.laters) fn(run, ev);
  if (flag(run, 'wipeAfter')) {
    const cells = [];
    for (let i = 0; i < B.length; i++) if (B[i]) { B[i] = null; cells.push(i); }
    if (cells.length) ev.push({ t: 'wipe', cells });
  }
  if (rd.boss && BOSSES[rd.boss].afterIgnite) BOSSES[rd.boss].afterIgnite(run, ev);
  // bookkeeping
  rd.igniteCount++;
  if (!free) rd.ignites--;
  rd.chars.push(pat.id);
  run.charCounts[pat.id] = (run.charCounts[pat.id] || 0) + 1;
  run.tierCounts[pat.tier]++;
  run.lastTier = pat.tier;
  rd.placedSince = 0; rd.lastPlaced = null;
  run.stats.ignites++;
  syncRound(run);
  const res = { ev, score, char: pat.id, n, nul, chips: sc.chips, mult: sc.mult, won: false, lost: false, rescued: false, newRun: sc.newRun, clean: sc.cleanAfter };
  if (rd.score >= rd.target) { res.won = true; finishRound(run, ev); }
  else if (rd.ignites <= 0) {
    const sv = run.seals.find((s) => SEALS[s.id].rescue && !rd.sealOff[s.uid]);
    if (sv && rd.score >= rd.target / 2) {
      destroySeal(run, sv.uid);
      ev.push({ t: 'rescue', id: sv.id });
      res.won = true; res.rescued = true;
      finishRound(run, ev);
    } else { res.lost = true; loseRun(run); }
  }
  ev.push({ t: 'end', won: res.won, lost: res.lost });
  return res;
}

// can the player still do anything useful this round?
function anyPlacement(run) {
  const rd = run.round;
  for (let s = 0; s < rd.tray.length; s++) {
    if (placeBlocked(run, s)) continue;
    const t = rd.tray[s], sh = trayShape(run, s);
    const rots = flag(run, 'noRotate') ? [t.rot] : [0, 1, 2, 3];
    const flips = stat(run, 'flip') && !flag(run, 'noRotate') ? [0, 1] : [t.flip];
    for (const f of flips) for (const r of rots) {
      const g = geomOf(sh, r, f);
      for (let y = 0; y <= run.h - g.h; y++) for (let x = 0; x <= run.w - g.w; x++) if (fits(run, g, x, y)) return true;
    }
  }
  return false;
}
function hasMove(run) {
  const rd = run.round;
  if (run.phase !== 'round' || !rd) return false;
  if (rd.ignites > 0 && findLines(run).n > 0) return true;
  if (anyPlacement(run)) return true;
  const lim = flag(run, 'pieceLimit');
  if (lim && rd.placed >= lim) return false;
  if (rd.discards > 0 && rd.ink >= 1 && rd.tray.some(Boolean)) return true;
  return false;
}
function loseRun(run) {
  const rd = run.round;
  run.lost = { ante: run.ante, blind: run.blind, boss: rd ? rd.boss : null, score: rd ? rd.score : 0, target: rd ? rd.target : 0 };
  run.phase = 'over';
}
function concede(run) {
  if (run.phase !== 'round') return false;
  const rd = run.round;
  const sv = run.seals.find((s) => SEALS[s.id].rescue && !rd.sealOff[s.uid]);
  if (sv && rd.score >= rd.target / 2) { destroySeal(run, sv.uid); finishRound(run, []); return true; }
  loseRun(run);
  return true;
}

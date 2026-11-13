// ---------- engine: round results, shop, cases, items, progression ----------
function finishRound(run, ev) {
  const rd = run.round;
  const out = ev || [];
  for (const s of run.seals.slice()) {
    const d = SEALS[s.id];
    if (d.roundEnd) d.roundEnd(run, s, out);
  }
  const lines = [];
  if (rd.reward > 0) lines.push({ k: 'blind', v: rd.reward });
  if (rd.ignites > 0) lines.push({ k: 'ignites', n: rd.ignites, v: rd.ignites });
  for (const s of run.seals) {
    const d = SEALS[s.id];
    if (d.payout && !rd.sealOff[s.uid]) { const v = d.payout(run, s); if (v > 0) lines.push({ k: 'seal', id: s.id, v }); }
  }
  if (!flag(run, 'noInterest')) {
    const v = Math.min(stat(run, 'interestCap'), Math.floor(Math.max(0, run.money) / 5));
    if (v > 0) lines.push({ k: 'interest', v });
  }
  let total = sum(lines, (l) => l.v);
  if (run.tags.double) {
    const v = Math.min(15, total);
    run.tags.double = 0;
    if (v > 0) { lines.push({ k: 'double', v }); total += v; }
  }
  run.cash = { lines, total, score: rd.score, target: rd.target, blind: rd.blind, boss: rd.boss, ignitesLeft: rd.ignites, ink: rd.ink };
  run.stats.rounds++;
  run.phase = 'cash';
}
function collectCash(run) {
  if (run.phase !== 'cash') return false;
  run.money += run.cash.total;
  run.stats.earned += run.cash.total;
  const wasBoss = run.cash.blind === 2;
  run.cash = null;
  run.round = null;
  if (wasBoss) {
    run.ante++; run.blind = 0;
    if (run.ante === 9 && !run.endless) { run.won = true; run.phase = 'won'; beginAnte(run); return true; }
    beginAnte(run);
  } else run.blind++;
  enterShop(run);
  return true;
}
function continueEndless(run) {
  if (run.phase !== 'won') return false;
  run.endless = true;
  enterShop(run);
  return true;
}
function skipBlind(run) {
  if (run.phase !== 'pick' || run.blind >= 2) return null;
  const id = run.skipTags[run.blind];
  const tag = TAGS[id];
  if (tag.now) tag.now(run);
  else if (tag.hold === 'ink') run.tags.ink += 30;
  else if (tag.hold === 'pack') run.tags.packs.push(tag.pack);
  else if (tag.hold === 'reroll') run.tags.reroll += 3;
  else if (tag.hold === 'rare') run.tags.rare += 1;
  else if (tag.hold === 'double') run.tags.double = 1;
  run.stats.skips++;
  run.blind++;
  return id;
}

// ---- shop
const priceOf = (run, base) => Math.max(1, Math.round((base * (100 - stat(run, 'discount'))) / 100));
function rollShopItem(run, exclude) {
  const x = rnd(run, 'shop');
  if (x < 0.62) {
    const id = rollSealId(run, 'shop', 0, exclude);
    const ed = rollEdition(run, 'shop');
    return { kind: 'seal', id, ed, price: priceOf(run, SEALS[id].cost + (ed ? EDITIONS[ed].add : 0)), sold: false };
  }
  if (x < 0.78) {
    const id = rnd(run, 'shop') < 0.35 ? 'tie' + favTier(run) : rndPick(run, 'shop', TIE_IDS);
    return { kind: 'tie', id, price: priceOf(run, ITEMS[id].cost), sold: false };
  }
  const id = rndWeighted(run, 'shop', ITEM_POOL, (i) => ITEMS[i].w);
  return { kind: 'wen', id, price: priceOf(run, ITEMS[id].cost), sold: false };
}
function fillShopItems(run) {
  const sh = run.shop;
  const n = stat(run, 'shopSlots');
  sh.items = [];
  const ex = [];
  for (let i = 0; i < n; i++) {
    const it = rollShopItem(run, ex);
    if (it.kind === 'seal') ex.push(it.id);
    sh.items.push(it);
  }
}
function enterShop(run) {
  run.phase = 'shop';
  const sh = run.shop = { items: [], packs: [], voucher: run.shopVoucher, rerolls: 0, free: stat(run, 'freeRerolls') + run.tags.reroll };
  run.tags.reroll = 0;
  fillShopItems(run);
  if (run.tags.rare > 0) {
    run.tags.rare--;
    const id = rollSealId(run, 'shop', 3, sh.items.filter((i) => i.kind === 'seal').map((i) => i.id));
    sh.items[0] = { kind: 'seal', id, ed: null, price: 0, sold: false, gift: true };
  }
  for (let i = 0; i < 2; i++) {
    const id = rndWeighted(run, 'shop', PACK_IDS, (k) => PACKS[k].w);
    sh.packs.push({ id, price: priceOf(run, PACKS[id].cost), sold: false });
  }
  for (const id of run.tags.packs) sh.packs.push({ id, price: 0, sold: false, gift: true });
  run.tags.packs = [];
}
const rerollCost = (run) => (run.shop.free > 0 ? 0 : Math.max(0, 5 + run.shop.rerolls - stat(run, 'rerollOff')));
function shopReroll(run) {
  if (run.phase !== 'shop' || run.pack) return false;
  const c = rerollCost(run);
  if (run.money < c) return false;
  run.money -= c;
  if (run.shop.free > 0) run.shop.free--; else run.shop.rerolls++;
  run.stats.rerolls++;
  fillShopItems(run);
  return true;
}
const noTargetUse = (def) => !def.need && !def.round;
function shopBuy(run, i, useNow) {
  if (run.phase !== 'shop' || run.pack) return { ok: false, why: 'busy' };
  const it = run.shop.items[i];
  if (!it || it.sold) return { ok: false, why: 'gone' };
  if (run.money < it.price) return { ok: false, why: 'money' };
  if (it.kind === 'seal') {
    if (it.ed !== 'xian' && !sealRoom(run)) return { ok: false, why: 'room' };
    addSeal(run, it.id, it.ed);
  } else {
    const def = ITEMS[it.id];
    if (useNow) {
      if (!noTargetUse(def) || (def.can && !def.can(run))) return { ok: false, why: 'use' };
      if (!applyItem(run, def, {})) return { ok: false, why: 'use' };
    } else if (!giveItem(run, it.id)) return { ok: false, why: 'room' };
  }
  run.money -= it.price;
  it.sold = true;
  run.stats.bought++;
  return { ok: true };
}
function buyVoucher(run) {
  if (run.phase !== 'shop' || run.pack) return { ok: false, why: 'busy' };
  const id = run.shop.voucher;
  if (!id) return { ok: false, why: 'gone' };
  const price = priceOf(run, VOUCHERS[id].cost);
  if (run.money < price) return { ok: false, why: 'money' };
  run.money -= price;
  run.vouchers[id] = 1;
  run.shop.voucher = null;
  run.shopVoucher = null;
  run.stats.bought++;
  return { ok: true };
}
function sellSeal(run, uid) {
  const s = run.seals.find((q) => q.uid === uid);
  if (!s || !['shop', 'round', 'pick'].includes(run.phase)) return false;
  const v = sealSellValue(s);
  destroySeal(run, uid);
  run.money += v;
  const d = SEALS[s.id];
  if (d.sold) d.sold(run, s);
  syncRound(run);
  return v;
}
const itemSellValue = (id) => Math.max(1, Math.floor(ITEMS[id].cost / 2));
function sellItem(run, idx) {
  const it = run.items[idx];
  if (!it || !['shop', 'round', 'pick'].includes(run.phase)) return false;
  run.items.splice(idx, 1);
  const v = itemSellValue(it.id);
  run.money += v;
  return v;
}
function moveSeal(run, from, to) {
  if (from === to || from < 0 || to < 0 || from >= run.seals.length || to >= run.seals.length) return false;
  const [s] = run.seals.splice(from, 1);
  run.seals.splice(to, 0, s);
  return true;
}
function leaveShop(run) {
  if (run.phase !== 'shop' || run.pack) return false;
  run.shop = null;
  run.phase = 'pick';
  return true;
}

// ---- cases (booster packs)
function rollPackPiece(run) {
  const ids = Object.keys(SHAPES);
  const shape = rndWeighted(run, 'pack', ids, (k) => SHAPES[k].w * (SHAPES[k].tags.includes('straight') ? 1.6 : 1));
  const ink = rndPick(run, 'pack', INKS);
  const enh = rnd(run, 'pack') < 0.4 ? rndWeighted(run, 'pack', ENH_IDS, (e) => (e === 'yin' || e === 'po' ? 0.6 : 1)) : null;
  return { shape, ink, enh };
}
function openPack(run, i) {
  if (run.phase !== 'shop' || run.pack) return { ok: false, why: 'busy' };
  const pk = run.shop.packs[i];
  if (!pk || pk.sold) return { ok: false, why: 'gone' };
  if (run.money < pk.price) return { ok: false, why: 'money' };
  run.money -= pk.price;
  pk.sold = true;
  run.stats.bought++;
  const def = PACKS[pk.id];
  const choices = [];
  if (def.kind === 'seal') {
    const ex = [];
    for (let k = 0; k < def.n; k++) {
      const x = rnd(run, 'pack');
      const id = rollSealId(run, 'pack', x < 0.6 ? 1 : x < 0.92 ? 2 : 3, ex);
      ex.push(id);
      choices.push({ kind: 'seal', id, ed: rollEdition(run, 'pack') });
    }
  } else if (def.kind === 'tie') {
    const ids = rndShuffle(run, 'pack', TIE_IDS.slice()).slice(0, def.n);
    const fav = 'tie' + favTier(run);
    if (!ids.includes(fav)) ids[0] = fav;
    for (const id of ids) choices.push({ kind: 'tie', id });
  } else if (def.kind === 'wen') {
    const pool = ITEM_POOL.slice();
    for (let k = 0; k < def.n && pool.length; k++) {
      const id = rndWeighted(run, 'pack', pool, (q) => ITEMS[q].w);
      pool.splice(pool.indexOf(id), 1);
      choices.push({ kind: 'wen', id });
    }
  } else {
    for (let k = 0; k < def.n; k++) choices.push(Object.assign({ kind: 'mo' }, rollPackPiece(run)));
  }
  run.pack = { id: pk.id, kind: def.kind, choices, left: def.k };
  return { ok: true };
}
// opt: { use: true, target } to use a studio item straight from the case
function pickPack(run, j, opt) {
  const pk = run.pack;
  if (!pk) return { ok: false, why: 'gone' };
  const ch = pk.choices[j];
  if (!ch || ch.taken) return { ok: false, why: 'gone' };
  if (ch.kind === 'seal') {
    if (ch.ed !== 'xian' && !sealRoom(run)) return { ok: false, why: 'room' };
    addSeal(run, ch.id, ch.ed);
  } else if (ch.kind === 'tie') {
    applyItem(run, ITEMS[ch.id], {});
  } else if (ch.kind === 'wen') {
    const def = ITEMS[ch.id];
    if (opt && opt.use) {
      const u = itemUsable(run, def);
      if (!u.ok) return { ok: false, why: 'use' };
      if (!applyItem(run, def, opt.target || {})) return { ok: false, why: 'use' };
    } else if (!giveItem(run, ch.id)) return { ok: false, why: 'room' };
  } else addPiece(run, ch.shape, ch.ink, ch.enh);
  ch.taken = true;
  pk.left--;
  if (pk.left <= 0 || pk.choices.every((c) => c.taken)) run.pack = null;
  return { ok: true };
}
function closePack(run) { run.pack = null; return true; }

// ---- using items
function itemUsable(run, def) {
  if (def.round && run.phase !== 'round') return { ok: false, why: 'round' };
  if (def.need && def.need.t === 'cell' && run.phase !== 'round') return { ok: false, why: 'round' };
  if (def.can && !def.can(run)) return { ok: false, why: 'cannot' };
  if (!['round', 'shop', 'pick'].includes(run.phase)) return { ok: false, why: 'phase' };
  return { ok: true };
}
function applyItem(run, def, target) {
  const tg = target || {};
  if (def.need) {
    const nd = def.need;
    if (nd.t === 'pieces') {
      if (!tg.pieces || tg.pieces.length < (nd.min || 1) || tg.pieces.length > nd.max) return false;
      if (tg.pieces.some((u) => !pieceByUid(run, u))) return false;
    } else if (nd.t === 'square' || nd.t === 'cell') {
      if (tg.square == null || tg.square < 0 || tg.square >= run.w * run.h) return false;
      if (nd.t === 'cell') {
        const rd = run.round;
        if (!rd) return false;
        if (nd.empty && (rd.board[tg.square] || rd.holes[tg.square])) return false;
      }
    }
  }
  if (!def.use(run, tg)) return false;
  for (const s of run.seals) {
    const d = SEALS[s.id];
    if (d.useItem) d.useItem(run, s, def);
  }
  run.stats.used = (run.stats.used || 0) + 1;
  syncRound(run);
  return true;
}
function useItem(run, idx, target) {
  const it = run.items[idx];
  if (!it) return { ok: false, why: 'gone' };
  const def = ITEMS[it.id];
  const u = itemUsable(run, def);
  if (!u.ok) return u;
  run.items.splice(idx, 1);
  if (!applyItem(run, def, target)) { run.items.splice(idx, 0, it); return { ok: false, why: 'target' }; }
  return { ok: true, id: it.id };
}

// ---- hints: characters within reach of the lines already complete
function charHints(run, limit, known) {
  const rd = run.round;
  if (!rd) return [];
  const w = run.w, h = run.h, L = findLines(run);
  const cur = L.n ? classifyLines(w, h, L.rows, L.cols, L.diags).id : null;
  const hasR = new Set(L.rows), hasC = new Set(L.cols);
  const rowFree = [], colFree = [];
  for (let y = 0; y < h; y++) { let ok = true; for (let x = 0; x < w; x++) if (rd.holes[y * w + x]) ok = false; rowFree.push(ok); }
  for (let x = 0; x < w; x++) { let ok = true; for (let y = 0; y < h; y++) if (rd.holes[y * w + x]) ok = false; colFree.push(ok); }
  const out = [];
  for (const id of CH_ORDER) {
    const def = CH[id];
    if (id === 'sanbi' || id === cur || def.d) continue;
    if (def.secret && !(known && known[id])) continue;
    let best = null;
    for (const rc of charRecipes(id, w, h)) {
      if (rc.rows.length < L.rows.length || rc.cols.length < L.cols.length) continue;
      let ok = true, miss = 0, need = 0;
      for (const y of L.rows) if (!rc.rows.includes(y)) { ok = false; break; }
      if (!ok) continue;
      for (const x of L.cols) if (!rc.cols.includes(x)) { ok = false; break; }
      if (!ok) continue;
      for (const y of rc.rows) if (!hasR.has(y)) { if (!rowFree[y]) { ok = false; break; } miss++; }
      if (!ok) continue;
      for (const x of rc.cols) if (!hasC.has(x)) { if (!colFree[x]) { ok = false; break; } miss++; }
      if (!ok || miss === 0 || miss > 2) continue;
      const seen = new Set();
      for (const y of rc.rows) for (let x = 0; x < w; x++) seen.add(y * w + x);
      for (const x of rc.cols) for (let y = 0; y < h; y++) seen.add(y * w + x);
      for (const i of seen) if (!rd.board[i]) need++;
      if (!best || miss < best.miss || (miss === best.miss && need < best.need)) best = { id, miss, need, rows: rc.rows, cols: rc.cols };
    }
    if (best) out.push(best);
  }
  out.sort((a, b) => a.miss - b.miss || a.need - b.need || CH[b.id].x - CH[a.id].x);
  return out.slice(0, limit || 3);
}

// ---- integrity check (used by the practice bot and tests)
function checkRun(run) {
  const errs = [];
  const bad = (m) => errs.push(m);
  if (!isFinite(run.money)) bad('money');
  if (run.seals.filter((s) => s.ed !== 'xian').length > stat(run, 'sealSlots') + 2) bad('too many seals');
  for (let t = 1; t <= TIER_MAX; t++) if (!(run.tiers[t] >= 1)) bad('tier ' + t);
  const uids = new Set();
  for (const p of run.deck) { if (uids.has(p.uid)) bad('dup uid'); uids.add(p.uid); if (!SHAPES[p.shape]) bad('shape ' + p.shape); if (!INK[p.ink]) bad('ink ' + p.ink); if (p.enh && !ENH[p.enh]) bad('enh'); }
  const rd = run.round;
  if (rd && run.phase === 'round') {
    if (!(rd.ink >= 0)) bad('ink<0');
    if (rd.ignites < 0 || rd.discards < 0) bad('neg counters');
    if (rd.board.length !== run.w * run.h) bad('board size');
    for (const t of rd.tray) if (t && !uids.has(t.uid)) bad('tray ghost');
    const held = rd.tray.filter(Boolean).map((t) => t.uid);
    if (new Set(held).size !== held.length) bad('tray dup');
    for (const u of rd.draw) { if (!uids.has(u)) bad('draw ghost'); if (held.includes(u)) bad('draw/tray overlap'); }
    if (!isFinite(rd.score) || rd.score < 0) bad('score');
  }
  for (const s of run.seals) if (!SEALS[s.id]) bad('seal ' + s.id);
  for (const it of run.items) if (!ITEMS[it.id]) bad('item ' + it.id);
  return errs;
}

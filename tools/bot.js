// A practice bot: plays whole runs through the rules engine.
// Used to shake out rule bugs and to calibrate targets; it is not shipped in the game.
function makeBot(E, profile) {
  const P = Object.assign({
    chars: ['yi', 'gun', 'er', 'dao', 'san', 'chuan', 'si4', 'shi', 'ding', 'shang', 'gong', 'tu', 'gan', 'nian', 'wang', 'feng', 'jing', 'kou', 'kai', 'sa', 'shan', 'jin', 'ri', 'tian', 'mu'],
    spill: 1.0,      // how much stray ink the bot tolerates (higher = tidier)
    greed: 1.25,     // share of the remaining ink it will commit to one character
    simTop: 5,       // candidates checked with a real scoring simulation
    shopSkill: 1,
  }, profile || {});

  const recipeCells = new Map();
  function cellsOf(run, rc) {
    const key = run.w + 'x' + run.h + ':' + rc.rows.join(',') + '|' + rc.cols.join(',');
    let s = recipeCells.get(key);
    if (!s) {
      s = new Set();
      for (const y of rc.rows) for (let x = 0; x < run.w; x++) s.add(y * run.w + x);
      for (const x of rc.cols) for (let y = 0; y < run.h; y++) s.add(y * run.w + x);
      recipeCells.set(key, s);
    }
    return s;
  }
  function cheapValue(run, id, rc) {
    const n = rc.rows.length + rc.cols.length;
    const tier = E.tierOf(n), b = E.tierBase(tier, run.tiers[tier]);
    const trig = rc.rows.length * run.w + rc.cols.length * run.h;
    return (trig * E.CELL_CHIPS + b.c) * b.m * E.CH[id].x;
  }
  function simValue(run, M) {
    const c = E.deepClone(run);
    const B = c.round.board;
    for (const i of M) if (!B[i]) B[i] = { ink: 'mo', enh: null, pid: 0, shape: 'i3' };
    c.round.ignites = Math.max(1, c.round.ignites);
    const r = E.ignite(c);
    return r ? r.score : 0;
  }
  // --- reference scoring: what would a full round of typical characters score with this build?
  function fakeFill(c, rc) {
    const B = c.round.board, w = c.w, h = c.h, deck = c.deck;
    let k = 0;
    const fill = (idxs) => {
      let i = 0;
      while (i < idxs.length) {
        const p = deck[(k * 7 + 3) % deck.length]; k++;
        const n = Math.min(E.SHAPES[p.shape].n, idxs.length - i);
        for (let j = 0; j < n; j++) if (!B[idxs[i + j]]) B[idxs[i + j]] = { ink: p.ink, enh: p.enh, pid: p.uid, shape: p.shape };
        i += n;
      }
    };
    for (const y of rc.rows) fill(E.range(w).map((x) => y * w + x));
    for (const x of rc.cols) fill(E.range(h).map((y) => y * w + x));
  }
  function refRound(run, ids) {
    // returns the total of igniting each listed character once, in order, on a fresh sheet
    const c = E.deepClone(run);
    c.phase = 'pick'; c.blind = 0; c.round = null; c.shop = null; c.pack = null;
    E.startRound(c);
    c.round.target = Infinity;
    let total = 0;
    const per = {};
    for (const id of ids) {
      if (c.phase !== 'round' || c.round.ignites <= 0) break;
      const rcs = E.charRecipes(id, c.w, c.h);
      if (!rcs.length) continue;
      const rc = rcs[Math.floor(rcs.length / 2)];
      c.round.board.fill(null);
      fakeFill(c, rc);
      c.round.ink = Math.max(0, c.round.inkMax - 30);
      const r = E.ignite(c);
      if (r) { total += r.score; per[id] = r.score; }
    }
    return { total, per };
  }
  function favourites(run) {
    // the characters this bot would actually aim for with its ink share
    const ink = E.stat(run, 'inkMax'), n = E.stat(run, 'ignites');
    const share = (ink / n) * P.greed;
    const scored = [];
    for (const id of P.chars) {
      const rcs = E.charRecipes(id, run.w, run.h);
      if (!rcs.length) continue;
      const rc = rcs[0];
      const need = rc.rows.length * run.w + rc.cols.length * run.h - rc.rows.length * rc.cols.length;
      if (need * 1.12 > Math.max(share, 9)) continue;
      scored.push({ id, need });
    }
    return scored;
  }
  function buildValue(run) {
    const favs = favourites(run);
    if (!favs.length) return 0;
    const solo = favs.map((f) => ({ id: f.id, v: refRound(run, [f.id]).total })).sort((a, b) => b.v - a.v);
    const top = solo.slice(0, 3).map((f) => f.id);
    const n = E.stat(run, 'ignites');
    const seq = [];
    for (let i = 0; i < n; i++) seq.push(top[i % top.length]);
    const alt = [];
    for (let i = 0; i < n; i++) alt.push(top[0]);
    return Math.max(refRound(run, seq).total, refRound(run, alt).total);
  }
  function boosts(run) {
    const out = {};
    for (const id of P.chars) {
      const rcs = E.charRecipes(id, run.w, run.h);
      if (!rcs.length) continue;
      const cheap = cheapValue(run, id, rcs[0]);
      const v = refRound(run, [id]).total;
      out[id] = cheap > 0 ? v / cheap : 1;
    }
    return out;
  }
  function choosePlan(run) {
    const rd = run.round, w = run.w, h = run.h, B = rd.board;
    if (!rd._boost) Object.defineProperty(rd, '_boost', { value: P.shopSkill > 0 ? boosts(run) : {}, enumerable: false });
    const boost = rd._boost;
    const L = E.findLines(run);
    const cands = [];
    for (const id of P.chars) {
      for (const rc of E.charRecipes(id, w, h)) {
        if (L.rows.some((y) => !rc.rows.includes(y)) || L.cols.some((x) => !rc.cols.includes(x))) continue;
        const M = cellsOf(run, rc);
        let need = 0, bad = false;
        for (const i of M) { if (rd.holes[i]) { bad = true; break; } if (!B[i]) need++; }
        if (bad || need > rd.ink) continue;
        // lines outside the recipe must not complete by accident
        for (let y = 0; y < h && !bad; y++) {
          if (rc.rows.includes(y)) continue;
          let full = true;
          for (let x = 0; x < w; x++) { const i = y * w + x; if (!B[i] && !M.has(i)) { full = false; break; } }
          if (full) bad = true;
        }
        for (let x = 0; x < w && !bad; x++) {
          if (rc.cols.includes(x)) continue;
          let full = true;
          for (let y = 0; y < h; y++) { const i = y * w + x; if (!B[i] && !M.has(i)) { full = false; break; } }
          if (full) bad = true;
        }
        if (bad) continue;
        cands.push({ id, rc, M, need, v: cheapValue(run, id, rc) * (boost[id] || 1) });
      }
    }
    if (!cands.length) return null;
    const remain = Math.max(0, rd.target - rd.score);
    const share = (rd.ink / Math.max(1, rd.ignites)) * P.greed;
    let pool = cands.filter((c) => c.need * 1.12 <= Math.max(share, 9));
    if (!pool.length) pool = cands.slice().sort((a, b) => a.need - b.need).slice(0, 12);
    pool.sort((a, b) => b.v - a.v || a.need - b.need);
    const top = pool.slice(0, Math.max(1, P.simTop));
    for (const c of top) c.sv = simValue(run, c.M);
    top.sort((a, b) => b.sv - a.sv || a.need - b.need);
    // if something already wins the sheet, take the cheapest such plan
    const winners = top.filter((c) => c.sv >= remain).sort((a, b) => a.need - b.need);
    return winners[0] || top[0];
  }
  function placements(run, plan) {
    const rd = run.round, w = run.w, h = run.h, B = rd.board;
    const out = [];
    const noRot = E.flag(run, 'noRotate');
    const rowCnt = new Array(h).fill(0), colCnt = new Array(w).fill(0);
    for (let i = 0; i < B.length; i++) if (B[i]) { rowCnt[Math.floor(i / w)]++; colCnt[i % w]++; }
    for (let s = 0; s < rd.tray.length; s++) {
      if (E.placeBlocked(run, s)) continue;
      const t = rd.tray[s], sh = E.trayShape(run, s);
      const rots = noRot ? [t.rot] : E.range(4);
      const seen = new Set();
      for (const r of rots) {
        const g = E.geomOf(sh, r, t.flip);
        const k = g.cells.join(';');
        if (seen.has(k)) continue;
        seen.add(k);
        for (let y = 0; y <= h - g.h; y++) for (let x = 0; x <= w - g.w; x++) {
          if (!E.fits(run, g, x, y)) continue;
          let gain = 0, spill = 0, bad = 0;
          const rr = {}, cc = {};
          for (const [cx, cy] of g.cells) {
            const X = x + cx, Y = y + cy, i = Y * w + X;
            if (plan.M.has(i)) gain++; else spill++;
            rr[Y] = (rr[Y] || 0) + 1; cc[X] = (cc[X] || 0) + 1;
          }
          for (const Y in rr) if (!plan.rc.rows.includes(+Y) && rowCnt[Y] + rr[Y] === w) bad++;
          for (const X in cc) if (!plan.rc.cols.includes(+X) && colCnt[X] + cc[X] === h) bad++;
          out.push({ slot: s, rot: r, x, y, gain, spill, bad, score: gain - P.spill * spill - 12 * bad + gain * 0.05 });
        }
      }
    }
    return out;
  }
  function useRoundItems(run) {
    const rd = run.round;
    for (let i = run.items.length - 1; i >= 0; i--) {
      const id = run.items[i].id, def = E.ITEMS[id];
      if (def.kind === 'tie') { E.useItem(run, i, {}); continue; }
      if (id === 'yanmo' && rd.ink < 25) { E.useItem(run, i, {}); continue; }
      if (id === 'huifeng_i' && rd.ignites <= 1) { E.useItem(run, i, {}); continue; }
      if (id === 'xiyan' && rd.discards === 0) { E.useItem(run, i, {}); continue; }
      if (id === 'runge' || id === 'xinde' || id === 'jigulu' || id === 'jinshilu') { E.useItem(run, i, {}); continue; }
      if (def.need && def.need.t === 'pieces') { usePieceItem(run, i, def); continue; }
      if (def.need && def.need.t === 'square') {
        const cx = Math.floor(run.w / 2), cy = Math.floor(run.h / 2);
        const free = [];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = (cy + dy) * run.w + cx + dx; if (!run.paper[q]) free.push(q); }
        if (free.length) E.useItem(run, i, { square: free[Math.floor(E.rnd(run, 'misc') * free.length)] });
      }
    }
  }
  function usePieceItem(run, i, def) {
    const id = def.id;
    const pick = (f, n) => run.deck.filter(f).slice(0, n).map((p) => p.uid);
    let ids;
    if (id === 'kedao') ids = pick((p) => E.hasTag(p.shape, 'snake') || p.shape === 't4', 2);
    else if (id === 'jiechi') ids = pick((p) => !E.hasTag(p.shape, 'straight'), 2);
    else if (id === 'suimo') ids = pick((p) => E.hasTag(p.shape, 'snake') || E.hasTag(p.shape, 'tee'), 1);
    else if (id === 'taben') ids = pick((p) => p.shape === 'i4' || p.shape === 'i3', 1);
    else if (def.enh) ids = pick((p) => !p.enh, def.need.max);
    else { // dyes: push toward the ink of the dye
      const ink = { zhusha: 'zhu', shiqing: 'qing', nijin: 'jin', songyan: 'mo' }[id];
      ids = pick((p) => p.ink !== ink, def.need.max);
    }
    if (ids && ids.length >= (def.need.min || 1)) E.useItem(run, i, { pieces: ids });
  }

  // One decision at a time, so the same brain can also drive the real interface in tests.
  // mem: { plan, stuck } kept by the caller for the length of a round.
  function decide(run, mem) {
    const rd = run.round;
    const L = E.findLines(run);
    if (!mem.plan || mem.stuck >= 2) { mem.plan = choosePlan(run); mem.stuck = 0; }
    else {
      // drop a plan that has become impossible
      let need = 0;
      for (const i of mem.plan.M) if (!rd.board[i]) need++;
      const cur = L.n ? E.classifyLines(run.w, run.h, L.rows, L.cols, L.diags) : null;
      if (need > rd.ink || L.rows.some((y) => !mem.plan.rc.rows.includes(y)) || L.cols.some((x) => !mem.plan.rc.cols.includes(x))) mem.plan = choosePlan(run);
      else if (need === 0 && cur && cur.id !== mem.plan.id) mem.plan = choosePlan(run);
    }
    const plan = mem.plan;
    if (plan) {
      let need = 0;
      for (const i of plan.M) if (!rd.board[i]) need++;
      if (need === 0) { mem.plan = null; if (rd.ignites > 0 && L.n) return { t: 'ignite' }; }
    }
    if (!mem.plan) {
      if (L.n && rd.ignites > 0) return { t: 'ignite' };
      if (!E.hasMove(run)) return { t: 'concede' };
      // nothing sensible: rinse or dump the smallest spill
      const s0 = rd.tray.findIndex((t, s) => t && E.slotUsable(run, s));
      if (rd.discards > 0 && s0 >= 0) return { t: 'discard', slot: s0 };
      const dump = placements(run, { M: new Set(), rc: { rows: [], cols: [] } }).sort((a, b) => a.bad - b.bad || a.spill - b.spill)[0];
      if (dump) return { t: 'place', slot: dump.slot, rot: dump.rot, x: dump.x, y: dump.y };
      return { t: 'concede' };
    }
    const moves = placements(run, plan);
    let best = null;
    for (const m of moves) if (m.gain > 0 && m.score > 0 && (!best || m.score > best.score)) best = m;
    if (best) { mem.stuck = 0; return { t: 'place', slot: best.slot, rot: best.rot, x: best.x, y: best.y }; }
    // no clean move
    if (rd.discards > 0) {
      const per = {};
      for (const m of moves) per[m.slot] = Math.max(per[m.slot] == null ? -1e9 : per[m.slot], m.score);
      let slot = -1, worst = 1e9;
      for (let s = 0; s < rd.tray.length; s++) if (rd.tray[s] && E.slotUsable(run, s)) { const v = per[s] == null ? -1e8 : per[s]; if (v < worst) { worst = v; slot = s; } }
      if (slot >= 0) return { t: 'discard', slot };
    }
    // accept the least messy move that still makes progress, else cash in what we have
    let ok = null;
    for (const m of moves) if (m.gain > 0 && m.bad === 0 && (!ok || m.score > ok.score)) ok = m;
    if (ok) { mem.stuck++; return { t: 'place', slot: ok.slot, rot: ok.rot, x: ok.x, y: ok.y }; }
    if (L.n && rd.ignites > 0) { mem.plan = null; return { t: 'ignite' }; }
    mem.stuck = 2;
    if (!E.hasMove(run)) return { t: 'concede' };
    const dump = moves.sort((a, b) => a.bad - b.bad || b.score - a.score)[0];
    if (dump) { mem.plan = null; return { t: 'place', slot: dump.slot, rot: dump.rot, x: dump.x, y: dump.y }; }
    return { t: 'concede' };
  }
  function playRound(run) {
    let guard = 0;
    const mem = { plan: null, stuck: 0 };
    while (run.phase === 'round' && guard++ < 600) {
      if (run.items.length) useRoundItems(run);
      if (run.phase !== 'round') break;
      const a = decide(run, mem);
      if (a.t === 'ignite') E.ignite(run);
      else if (a.t === 'discard') E.discardBlock(run, a.slot);
      else if (a.t === 'place') {
        run.round.tray[a.slot].rot = a.rot;
        const r = E.placeBlock(run, a.slot, a.x, a.y);
        if (!r.ok) throw new Error('bot placement refused: ' + r.why);
      } else { E.concede(run); break; }
    }
    if (run.phase === 'round') E.concede(run);
  }

  const sealScore = (id) => E.SEALS[id].r * 3 + E.SEALS[id].cost * 0.2;
  function withSeal(run, id, ed, dropUid) {
    const c = E.deepClone(run);
    if (dropUid) E.destroySeal(c, dropUid);
    if (id) E.addSeal(c, id, ed);
    return buildValue(c);
  }
  function shop(run) {
    let guard = 0;
    const smart = P.shopSkill > 0;
    while (run.phase === 'shop' && guard++ < 60) {
      if (run.pack) { takeFromPack(run); continue; }
      const sh = run.shop;
      let acted = false;
      // seals
      if (smart) {
        const base = buildValue(run);
        let best = null;
        for (let i = 0; i < sh.items.length; i++) {
          const it = sh.items[i];
          if (it.sold || it.kind !== 'seal') continue;
          if (it.ed === 'xian' || E.sealRoom(run)) {
            if (run.money < it.price) continue;
            const v = withSeal(run, it.id, it.ed, null) / Math.max(1, base);
            const util = E.SEALS[it.id].end || E.SEALS[it.id].cell || E.SEALS[it.id].stroke || E.SEALS[it.id].retrig || E.SEALS[it.id].charX ? 0 : 0.08;
            if (!best || v + util > best.v) best = { i, v: v + util, drop: null };
          } else {
            for (const w of run.seals) {
              if (w.ed === 'xian') continue;
              if (run.money + E.sealSellValue(w) < it.price) continue;
              const v = withSeal(run, it.id, it.ed, w.uid) / Math.max(1, base);
              if (v > 1.2 && (!best || v > best.v)) best = { i, v, drop: w.uid };
            }
          }
        }
        if (best && best.v >= 1.03) {
          if (best.drop) E.sellSeal(run, best.drop);
          if (E.shopBuy(run, best.i, false).ok) acted = true;
        }
      } else {
        for (let i = 0; i < sh.items.length; i++) {
          const it = sh.items[i];
          if (it.sold || it.kind !== 'seal') continue;
          if ((it.ed === 'xian' || E.sealRoom(run)) && E.shopBuy(run, i, false).ok) acted = true;
        }
      }
      if (sh.voucher && run.money >= E.priceOf(run, E.VOUCHERS[sh.voucher].cost) + (smart ? 4 : 2)) { if (E.buyVoucher(run).ok) acted = true; }
      for (let i = 0; i < sh.items.length; i++) {
        const it = sh.items[i];
        if (it.sold || it.kind === 'seal' || run.money - it.price < 1) continue;
        if (it.kind === 'tie') { if (E.shopBuy(run, i, true).ok) acted = true; }
        else if (run.items.length < E.stat(run, 'itemSlots')) { if (E.shopBuy(run, i, false).ok) acted = true; }
      }
      for (let i = 0; i < sh.packs.length; i++) {
        const pk = sh.packs[i];
        if (pk.sold || run.money < pk.price + 2) continue;
        if (E.openPack(run, i).ok) { acted = true; break; }
      }
      if (run.pack) continue;
      useShopItems(run);
      if (!acted) {
        if (run.money >= E.rerollCost(run) + (smart ? 8 : 12) && sh.rerolls < 4) { E.shopReroll(run); continue; }
        break;
      }
    }
    if (run.pack) E.closePack(run);
    useShopItems(run);
    if (run.phase === 'shop') E.leaveShop(run);
  }
  function useShopItems(run) {
    for (let i = run.items.length - 1; i >= 0; i--) {
      const def = E.ITEMS[run.items[i].id];
      if (def.round || (def.need && def.need.t === 'cell')) continue;
      if (def.kind === 'tie' || !def.need) { E.useItem(run, i, {}); continue; }
      if (def.need.t === 'pieces') usePieceItem(run, i, def);
      else if (def.need.t === 'square') {
        const free = [];
        for (let q = 0; q < run.paper.length; q++) if (!run.paper[q]) free.push(q);
        if (free.length) E.useItem(run, i, { square: free[Math.floor(E.rnd(run, 'misc') * free.length)] });
      }
    }
  }
  function takeFromPack(run) {
    const pk = run.pack;
    let did = false;
    if (pk.kind === 'seal' && P.shopSkill > 0) {
      const base = buildValue(run);
      let best = null;
      pk.choices.forEach((ch, j) => {
        if (ch.taken) return;
        if (ch.ed !== 'xian' && !E.sealRoom(run)) return;
        const v = withSeal(run, ch.id, ch.ed, null) / Math.max(1, base);
        if (!best || v > best.v) best = { j, v };
      });
      if (best && E.pickPack(run, best.j, null).ok) did = true;
    } else if (pk.kind === 'tie') {
      const fav = 'tie' + E.favTier(run);
      let j = pk.choices.findIndex((c) => !c.taken && c.id === fav);
      if (j < 0) j = pk.choices.findIndex((c) => !c.taken);
      if (j >= 0 && E.pickPack(run, j, null).ok) did = true;
    } else {
      for (let j = 0; j < pk.choices.length; j++) {
        const ch = pk.choices[j];
        if (ch.taken) continue;
        if (ch.kind === 'seal' && ch.ed !== 'xian' && !E.sealRoom(run)) continue;
        if (ch.kind === 'wen' && run.items.length >= E.stat(run, 'itemSlots')) continue;
        if (ch.kind === 'mo' && !E.hasTag(ch.shape, 'straight') && P.shopSkill > 0 && j < pk.choices.length - 1) continue;
        if (E.pickPack(run, j, null).ok) { did = true; break; }
      }
    }
    if (!did && run.pack) E.closePack(run);
  }
  function playRun(run, maxAnte) {
    let guard = 0;
    while (guard++ < 400) {
      if (run.phase === 'pick') { E.startRound(run); playRound(run); }
      else if (run.phase === 'cash') E.collectCash(run);
      else if (run.phase === 'shop') shop(run);
      else if (run.phase === 'won') { if (maxAnte && run.ante <= maxAnte) E.continueEndless(run); else break; }
      else break;
      if (maxAnte && run.ante > maxAnte && run.phase !== 'cash') break;
    }
    return run;
  }
  return { playRound, shop, playRun, decide, useRoundItems };
}

module.exports = { makeBot };

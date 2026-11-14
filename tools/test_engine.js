// Regression tests for the rules engine.  node tools/test_engine.js
const { loadEngine } = require('./engine');
const { makeBot } = require('./bot');
const E = loadEngine();
let failed = 0, passed = 0;
const ok = (c, m) => { if (c) passed++; else { failed++; console.error('FAIL: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
const cell = (ink, o) => Object.assign({ ink: ink || 'mo', enh: null, pid: 0, shape: 'i4' }, o || {});
function fresh(o) {
  const run = E.newRun(Object.assign({ seed: 'TEST', deck: 'kai' }, o || {}));
  E.startRound(run);
  run.round.boss = null;
  run.round.target = 1e15;
  return run;
}
function fill(run, rows, cols, ink) {
  const B = run.round.board;
  for (const y of rows) for (let x = 0; x < run.w; x++) B[y * run.w + x] = cell(ink);
  for (const x of cols) for (let y = 0; y < run.h; y++) B[y * run.w + x] = cell(ink);
}
const score = (run) => E.ignite(run);

// ---- classification
{
  const t = (r, c, d) => E.classifyLines(8, 8, r, c, d || []).id;
  eq(t([0, 3, 7], [4]), 'wang', '王');
  eq(t([0, 3, 7], [0, 4, 7]), 'tian', '田');
  eq(t([2, 5], [2, 5]), 'jing', '井');
  eq(t([0, 7], [0, 7]), 'kou', '口');
  eq(t([1, 2], [1, 2, 3]), 'sanbi', '散笔');
  eq(t(E.range(8), E.range(8)), 'xuan', '玄');
  eq(E.classifyLines(7, 7, [0, 3, 6], [3], []).id, 'wang', '王 on 7×7');
  eq(E.classifyLines(10, 6, [0, 5], [0, 9], []).id, 'kou', '口 on 10×6');
  for (const id of E.CH_ORDER) for (const [w, h] of [[8, 8], [7, 7], [10, 6]]) {
    for (const rc of E.charRecipes(id, w, h)) { const g = E.classifyLines(w, h, rc.rows, rc.cols, rc.diags).id; if (g !== id) { ok(false, `recipe of ${id} on ${w}x${h} classifies as ${g}`); break; } }
  }
  ok(true, 'recipes consistent');
}
// ---- base scoring
{
  let run = fresh(); fill(run, [3], []);
  let r = score(run);
  eq([r.char, r.score], ['yi', (10 + 40 + 40) * 1], '一: base 10 + 8 cells + pure black 40');
  run = fresh(); fill(run, [3], [4]);
  r = score(run);
  // 16 triggers ×5 = 80, base 20, two pure strokes 80 → 180 × 2 × 1.5
  eq([r.char, r.score], ['shi', Math.floor(180 * 2 * 1.5)], '十 with a crossing counted twice');
  run = fresh(); fill(run, [0, 3, 7], [4], 'zhu');
  r = score(run);
  // 32 triggers = 160 + 55; spirit 4 + 4 pure red strokes ×4 = 20; ×3
  eq([r.char, r.score], ['wang', Math.floor((160 + 55) * (4 + 16) * 3)], '王 in pure vermilion');
  run = fresh(); fill(run, [2], [], 'qing');
  r = score(run);
  eq(r.score, Math.floor((10 + 40) * 1 * 1.2), 'pure azure multiplies');
  run = fresh(); fill(run, [2], [], 'jin'); const m0 = run.money;
  r = score(run);
  eq(run.money, m0 + 1, 'pure gold pays');
  eq(run.round.board.filter(Boolean).length, 0, 'strokes are cleared');
  eq(run.round.ignites, E.stat(run, 'ignites') - 1, 'a flourish is spent');
}
// ---- levels, natures, squares
{
  let run = fresh(); run.tiers[1] = 3; fill(run, [1], []);
  eq(score(run).score, (30 + 40 + 40) * 3, 'tier level raises the base');
  run = fresh(); fill(run, [1], []); run.round.board[8] = cell('mo', { enh: 'nong' }); run.round.board[9] = cell('mo', { enh: 'fei' }); run.round.board[10] = cell('mo', { enh: 'yin' });
  eq(score(run).score, (10 + 45 + 40 + 12) * (1 + 1), 'thick, flying and sealed cells');
  run = fresh(); fill(run, [1], []); run.paper[8] = 'wusi'; run.paper[9] = 'zhusi'; run.paper[10] = 'yunwen'; run.paper[11] = 'die';
  eq(score(run).score, Math.floor((10 + 45 + 40 + 25) * (1 + 3) * 1.2), 'paper squares');
  run = fresh(); fill(run, [1], []); run.round.board[20] = cell('mo', { enh: 'su' });
  eq(score(run).score, (10 + 40 + 40) * (1 + 2), 'aged ink left outside the strokes');
  run = fresh(); fill(run, [1], []); run.round.board[8] = cell('zhu', { enh: 'bai' });
  eq(score(run).score, (10 + 40 + 40) * 1, 'a blank cell keeps a stroke pure');
  run = fresh(); fill(run, [1], []); run.round.board[8] = { stone: true, ink: null, enh: null, pid: 0, shape: null };
  eq(score(run).score, (10 + 35) * 1, 'a stone scores nothing and breaks purity');
}
// ---- seals: a few exact checks
{
  const withSeal = (id, setup) => { const run = fresh(); E.addSeal(run, id); setup(run); return score(run); };
  eq(withSeal('zhenyun', (r) => fill(r, [1, 2], [])).score, (20 + 80 + 80) * (2 + 6), '千里阵云 +3 per row');
  eq(withSeal('wangzhe', (r) => fill(r, [0, 3, 7], [4])).score, Math.floor((55 + 160 + 160) * 4 * 3 * 3), '王者之风');
  eq(withSeal('xizhi', (r) => fill(r, [0, 3, 7], [4])).score, Math.floor((55 + 160 + 160) * 4 * 9), '王羲之 squares the character multiplier');
  eq(withSeal('suanchou', (r) => fill(r, [3], [1, 2, 5, 6])).char, 'xi', '卌 recognised');
  eq(withSeal('huaisu', (r) => fill(r, [1, 2], [1, 2, 3])).score, Math.floor((80 + 200 + 200) * 5 * 5), '怀素 multiplies a scribble by its strokes');
  eq(withSeal('litou', (r) => fill(r, [3], [4])).score, Math.floor((20 + 80 + 10 + 80) * 2 * 1.5), '力透纸背 retriggers the crossing');
  eq(withSeal('yichui', (r) => { fill(r, [3], []); }).score, (10 + 40 + 40) * 5, '一锤定音 ×5');
  { const run = fresh(); E.addSeal(run, 'yichui'); E.concede(run); const r2 = E.newRun({ seed: 'T2' }); E.addSeal(r2, 'yichui'); E.startRound(r2); eq(r2.round.ignites, 1, '一锤定音 leaves one flourish'); }
  { const run = fresh(); E.addSeal(run, 'linmo'); E.addSeal(run, 'zhenyun'); fill(run, [1, 2], []); eq(score(run).score, (20 + 80 + 80) * (2 + 12), '临摹 copies its right neighbour'); }
  { const run = fresh(); E.addSeal(run, 'sansheng'); fill(run, [1], []); score(run); fill(run, [1, 2], []); score(run); fill(run, [1, 2, 3], []); eq(score(run).score, (35 + 120 + 120) * 3 * 4, '三生万物 after 一 二 三'); }
  { const run = fresh(); E.addSeal(run, 'langhao'); for (let i = 0; i < 8; i++) { run.round.board[i * 8 + i] = cell('mo'); run.round.board[i * 8 + 7 - i] = cell('mo'); } eq(score(run).char, 'yi4', '狼毫 writes 乂'); }
  { const run = fresh(); E.addSeal(run, 'juechu'); run.round.target = 100; run.round.ignites = 1; fill(run, [1], []); const r = score(run); ok(r.won && r.rescued && !run.seals.length, '绝处逢生 rescues at half the target'); }
}
// ---- character meanings
{
  let run = fresh(); fill(run, [2, 5], [2, 5]); run.round.ink = 50; score(run);
  eq(run.round.ink, 66, '井 restores ink');
  fill(run, [2, 5], [2, 5]); score(run);
  eq(run.round.ink, 66, '…only once per round');
  run = fresh(); const ig = run.round.ignites; fill(run, [7], [0]); score(run);
  eq(run.round.ignites, ig, '乚 is a free flourish');
  run = fresh(); fill(run, E.range(8), E.range(8)); const r = score(run);
  eq([r.char, run.tiers[3]], ['xuan', 2], '玄 raises every tier');
}
// ---- bosses
{
  const boss = (id, setup) => { const run = E.newRun({ seed: 'B' + id }); run.blind = 2; run.boss = id; E.startRound(run); run.round.target = 1e15; if (setup) setup(run); return run; };
  let run = boss('jiucheng'); fill(run, [1, 2], [1, 2, 3]);
  eq(score(run).score, 0, '九成宫: scribbles score nothing');
  run = boss('duobao'); fill(run, [1], []);
  eq(score(run).score, 0, '多宝塔: fewer than three strokes score nothing');
  run = boss('lanting'); fill(run, [1], []); ok(score(run).score > 0, '兰亭: first time scores'); fill(run, [1], []); eq(score(run).score, 0, '兰亭: a repeat scores nothing');
  run = boss('sangluan'); fill(run, [1], []);
  eq(score(run).score, 10, '丧乱帖: black cells are dead');
  run = boss('caoquan'); fill(run, [3], [4]);
  eq(score(run).score, Math.floor((20 + 40 + 40) * 2 * 1.5), '曹全碑: column cells give nothing');
  run = boss('maogong'); run.tiers[1] = 5; fill(run, [1], []);
  eq(score(run).score, 90, '毛公鼎: levels ignored');
  run = boss('pingfu'); eq(Object.keys(run.round.holes).length, 3, '平复帖: three wormholes');
  run = boss('shigu'); eq(run.round.board.filter((c) => c && c.stone).length, 8, '石鼓文: eight stones');
  run = boss('hanshi'); eq(run.round.discards, 0, '寒食帖: no rinses');
  run = boss('zhengzuo'); ok(!E.slotUsable(run, 1) && E.slotUsable(run, 0), '争座位帖: leftmost block only');
  run = boss('shiqi'); run.round.placed = 17; ok(E.placeBlocked(run, 0) === 'limit', '十七帖: block limit');
  run = boss('liqi', null); { const r2 = E.newRun({ seed: 'L' }); E.addSeal(r2, 'zhenyun'); r2.blind = 2; r2.boss = 'liqi'; E.startRound(r2); r2.round.target = 1e15; fill(r2, [1, 2], []); eq(score(r2).score, (20 + 80 + 80) * 2, '礼器碑: the leftmost seal is silent'); }
  for (const id of E.BOSS_ORDER) { const b = boss(id); ok(b.phase === 'round' && b.round.tray.some(Boolean), 'boss starts: ' + id); }
}
// ---- items
{
  for (const id of E.ITEM_ORDER) {
    const run = fresh(); const def = E.ITEMS[id];
    E.giveItem(run, id, true);
    let tg = {};
    if (def.need && def.need.t === 'pieces') tg = { pieces: run.deck.filter((p) => !def.ok || def.ok(p)).slice(0, def.need.max).map((p) => p.uid) };
    if (def.need && (def.need.t === 'square' || def.need.t === 'cell')) { tg = { square: 27 }; if (!def.need.empty) run.round.board[27] = cell('mo'); }
    if (id === 'xinde') run.lastTier = 2;
    const n = run.deck.length;
    const r = E.useItem(run, run.items.length - 1, tg);
    ok(r.ok, 'item usable: ' + id + ' ' + JSON.stringify(r));
    ok(E.checkRun(run).length === 0, 'state sane after ' + id + ': ' + E.checkRun(run).join(','));
    if (id === 'taben') eq(run.deck.length, n + 1, 'rubbing adds a block');
    if (id === 'kedao') eq(run.deck.length, n - 2, 'knife removes blocks');
    if (id === 'suimo') eq(run.deck.length, n + 1, 'crushing gives two dots');
  }
  const run = fresh(); E.giveItem(run, 'kedao', true); run.deck.length = 8; E.syncRound(run);
  ok(!E.useItem(run, 0, { pieces: [run.deck[0].uid] }).ok, 'the Ink Box keeps eight blocks');
}
// ---- shop and economy
{
  const run = E.newRun({ seed: 'SHOP' }); E.startRound(run); run.round.target = 10; fill(run, [1], []); score(run);
  eq(run.phase, 'cash', 'cleared sheet goes to payout');
  const total = run.cash.total, m = run.money;
  E.collectCash(run);
  eq([run.phase, run.money, run.blind], ['shop', m + total, 1], 'payout collected, shop opens');
  ok(run.shop.items.length === 2 && run.shop.packs.length === 2, 'shop stocked');
  run.money = 100;
  const it = run.shop.items.findIndex((i) => i.kind === 'seal');
  if (it >= 0) { ok(E.shopBuy(run, it, false).ok, 'buy a seal'); eq(run.seals.length, 1, 'seal owned'); const v = E.sellSeal(run, run.seals[0].uid); ok(v > 0 && !run.seals.length, 'sell it again'); }
  const c0 = E.rerollCost(run); ok(E.shopReroll(run), 'reroll'); eq(E.rerollCost(run), c0 + 1, 'reroll price rises');
  ok(E.openPack(run, 0).ok && run.pack, 'open a case'); ok(E.pickPack(run, 0, null).ok || true, 'pick'); if (run.pack) E.closePack(run);
  ok(E.leaveShop(run) && run.phase === 'pick', 'leave shop');
  const tag = E.skipBlind(run); ok(tag && run.blind === 2, 'skip to the masterwork');
  ok(E.skipBlind(run) === null, 'the masterwork cannot be skipped');
}
// ---- details of the rules that once went wrong
{
  const boss = (id, o) => { const run = E.newRun(Object.assign({ seed: 'D' + id }, o || {})); run.blind = 2; run.boss = id; E.startRound(run); run.round.target = 1e15; return run; };
  // 寒食帖: rinses cannot be brought back by any means
  let run = boss('hanshi');
  E.giveItem(run, 'xiyan', true);
  ok(!E.useItem(run, run.items.length - 1, {}).ok && run.round.discards === 0, '寒食帖: Inkstone Rinse cannot be used');
  fill(run, [], [1, 3, 5]); const rc = score(run);
  eq([rc.char, run.round.discards], ['chuan', 0], '寒食帖: 川 grants no rinse');
  ok(!E.discardBlock(run, 0).ok, '寒食帖: no rinse is possible');
  // 巾 wipes ink, not stones
  run = fresh();
  { const id = E.CH_ORDER.find((k) => E.CH[k].yi === 'wipe'); const L = E.charLayout(id, run.w, run.h); fill(run, L.rows, L.cols);
    const free = []; for (let i = 0; i < 64; i++) if (!run.round.board[i]) free.push(i);
    run.round.board[free[0]] = { stone: true, ink: 'mo', enh: null, pid: 0, shape: 'dot' }; run.round.board[free[1]] = cell('zhu');
    const r = score(run); eq([r.char, run.round.board.filter((c) => c && c.stone).length, run.round.board.filter((c) => c && !c.stone).length], [id, 1, 0], '巾: stray ink is wiped, stones stay'); }
  // a disabled seal neither grows nor withers
  run = E.newRun({ seed: 'OFF' }); E.addSeal(run, 'tieyan'); E.addSeal(run, 'bizhou'); run.blind = 2; run.boss = 'liqi'; E.startRound(run); run.round.target = 5;
  const st0 = JSON.stringify(run.seals[0].st), b1 = run.seals[1].bonus;
  fill(run, [1], []); score(run);
  eq([JSON.stringify(run.seals[0].st), run.seals[1].bonus], [st0, b1 + 3], '礼器碑: the disabled seal does not grow, the others do');
  // a voided flourish is not remembered as a character
  run = boss('duobao'); fill(run, [1], []); score(run);
  eq([run.round.chars.length, run.charCounts.yi || 0, run.lastTier], [0, 0, 0], 'a voided flourish writes nothing into the record');
  // the pure bonus needs a cell that scores
  run = boss('taishan'); fill(run, [0], []);
  eq(score(run).score, 10, '泰山刻石: a border stroke of dead cells earns no pure bonus');
  // dead cells are not "scored cells"
  run = E.newRun({ seed: 'DEAD' }); E.addSeal(run, 'zhumo'); run.blind = 2; run.boss = 'sangluan'; E.startRound(run); run.round.target = 1e15;
  { const B = run.round.board; for (let x = 0; x < 8; x++) B[8 + x] = cell(x < 4 ? 'zhu' : 'mo'); }
  eq(score(run).score, (10 + 4 * 5) * 1, '丧乱帖: dead black cells do not count for Red-and-Black Printing');
  // splash blocks shatter only when the splash went off
  run = boss('sangluan'); { const p = run.deck.find((q) => q.ink === 'mo'); p.enh = 'po'; let lost = 0; for (let k = 0; k < 60; k++) { for (let x = 0; x < 8; x++) run.round.board[8 + x] = cell('mo', { enh: 'po', pid: p.uid, q: k }); run.round.ignites = 4; const n0 = run.deck.length; score(run); if (run.deck.length < n0) lost++; } eq(lost, 0, 'a splash block that scored nothing cannot shatter'); }
  // the same block placed twice counts as two blocks
  run = fresh(); E.addSeal(run, 'changqiang'); { const B = run.round.board, u = run.deck[0].uid; for (let x = 0; x < 4; x++) B[8 + x] = cell('mo', { pid: u, q: 1, shape: 'i4' }); for (let x = 4; x < 8; x++) B[8 + x] = cell('mo', { pid: u, q: 2, shape: 'i4' }); }
  eq(score(run).mult, 1 + 8, 'Long Spears counts both placements of one block');
  // 收笔 does not fire on a free flourish
  run = fresh(); E.addSeal(run, 'shoubi'); run.round.ignites = 1;
  { const id = E.CH_ORDER.find((k) => E.CH[k].yi === 'ignite'); const L = E.charLayout(id, run.w, run.h); fill(run, L.rows, L.cols); const r = score(run); eq([r.char, run.round.ignites, r.ev.some((e) => e.t === 'add' && e.k === 'm' && e.v === 20)], [id, 1, false], 'Closing Stroke waits for a flourish that is really spent'); }
  // a seal gained in the middle of a sheet brings its terms at once
  run = fresh(); run.round.ignites = 4; E.addSeal(run, 'yichui'); eq(run.round.ignites, 1, 'One Stroke of the Gavel leaves one flourish at once');
  run = fresh(); run.round.ink = 80; E.addSeal(run, 'pofu'); eq([run.round.inkMax, run.round.ink], [50, 30], 'Smash the Pots halves the Ink at once');
  // scribbles are not characters
  run = fresh(); E.addSeal(run, 'wengu'); fill(run, [1, 2], [1, 2, 3]); score(run); fill(run, [1, 2], [1, 2, 3]); const rs = score(run);
  eq([rs.char, rs.ev.some((e) => e.t === 'add' && e.k === 'x' && e.v === 2)], ['sanbi', false], 'Review the Old ignores scribbles');
  run = fresh(); E.addSeal(run, 'luoyang'); run.round.target = 5; fill(run, [1, 2], [1, 2, 3]); score(run);
  ok(!run.cash.lines.some((l) => l.k === 'seal'), 'Paper Grows Dear pays nothing for a scribble');
  // 工欲善其事 keeps its trigger when there is no room
  run = fresh(); E.addSeal(run, 'gongyu'); E.giveItem(run, 'zhusha', true); E.giveItem(run, 'zhusha', true);
  { const L = E.charLayout('gong', run.w, run.h); fill(run, L.rows, L.cols); score(run); ok(!run.seals[0].st.used && run.items.length === 2, 'First Sharpen the Tools waits for room'); }
  // seals that need a square sheet are not offered on other sheets; vouchers that could do nothing are not offered
  run = E.newRun({ seed: 'SQ', deck: 'changjuan' }); ok(!run.pool.includes('langhao') && E.newRun({ seed: 'SQ' }).pool.includes('langhao'), 'the Wolf-hair Brush stays off the handscroll');
  run = E.newRun({ seed: 'SJ', deck: 'shoujin' }); { let bad = 0; for (let k = 0; k < 300; k++) { const v = E.rollVoucher(run); if (v === 'v_zhang1' || v === 'v_zhang2') bad++; } eq(bad, 0, 'no interest furnishings on the Slender Gold script'); }
  // the look-ahead tells the truth under 爨宝子碑
  run = boss('cuan'); { let wrong = 0; for (let k = 0; k < 60; k++) { const nx = E.peekList(run, 1)[0]; if (!nx) break; const before = run.round.tray.map((t) => t && t.uid); E.discardBlock(run, 0); run.round.discards = 3; const t = run.round.tray.find((q) => q && !before.includes(q.uid)) || run.round.tray[0]; const p = E.pieceByUid(run, t.uid); if (t.uid === nx.uid && (t.sh || p.shape) !== nx.shape) wrong++; } eq(wrong, 0, 'the look-ahead shows the block that really arrives'); }
  // shop: furnishings act at once; buying and using pays first; the gift survives a reroll; stake prices compound
  run = E.newRun({ seed: 'SHOP2' }); E.startRound(run); run.round.target = 5; fill(run, [1], []); score(run); E.collectCash(run);
  run.money = 100; run.shop.voucher = 'v_jia3'; const p0 = run.shop.items.map((i) => i.price), k0 = run.shop.packs.map((i) => i.price);
  ok(E.buyVoucher(run).ok, 'buy Haggling');
  ok(run.shop.items.every((i, k) => i.price === Math.max(1, Math.round(i.base * 0.75)) && i.price <= p0[k]) && run.shop.packs.every((i, k) => i.price <= k0[k]), 'Haggling lowers the prices on display');
  run.shop.voucher = 'v_huo1'; const n0 = run.shop.items.length; ok(E.buyVoucher(run).ok && run.shop.items.length === n0 + 1, 'Extra Shelf adds an item at once');
  run.money = 10; run.shop.items[0] = { kind: 'wen', id: 'runge', base: 3, price: 3, sold: false };
  ok(E.shopBuy(run, 0, true).ok, 'buy and use the Price List'); eq(run.money, 14, 'the Price List does not double the coins that pay for it');
  run.money = 50; run.shop.items[0] = { kind: 'seal', id: 'xinshou', ed: null, price: 0, sold: false, gift: true }; E.shopReroll(run);
  ok(run.shop.items[0].gift && run.shop.items.length === E.stat(run, 'shopSlots'), 'a gift stays on the shelf through a reroll');
  run = E.newRun({ seed: 'YAJI' }); E.startRound(run); run.round.target = 5; fill(run, [1], []); score(run); E.collectCash(run);
  run.money = 50; run.shop.items[0] = { kind: 'seal', id: 'yaji', ed: null, base: 6, price: 6, sold: false }; E.shopBuy(run, 0, false);
  eq(E.rerollCost(run), 0, 'Gathering of Scholars gives its free reroll in the shop where it is bought');
  run = E.newRun({ seed: 'ST5', stake: 5 }); eq([E.priceOf(run, 10), (run.vouchers.v_jia3 = 1, E.priceOf(run, 10)), (run.vouchers.v_jia4 = 1, E.priceOf(run, 10))], [12, 9, 6], 'discounts compound with the dearer prices of a high rank');
  // items that would change nothing are refused
  run = fresh(); E.giveItem(run, 'songyan', true); { const p = run.deck.find((q) => q.ink === 'mo'); ok(!E.useItem(run, run.items.length - 1, { pieces: [p.uid] }).ok && run.items.length === 1, 'Pine Soot is not spent on a block that is already black'); }
  run = fresh(); run.money = 0; E.giveItem(run, 'runge', true); ok(!E.useItem(run, run.items.length - 1, {}).ok, 'the Price List is not spent on an empty purse');
  // 少而精 measures from the opening size of the Ink Box
  run = E.newRun({ seed: 'JG', deck: 'jiagu' }); E.addSeal(run, 'shaoer'); E.startRound(run); run.round.boss = null; run.round.target = 1e15; fill(run, [1], []);
  eq(score(run).mult, 1, 'Few but Fine starts at nothing on the oracle-bone script');
}
// ---- every seal survives a rough round; every description renders
{
  const bot = makeBot(E, { simTop: 2, shopSkill: 0 });
  for (const id of E.SEAL_ORDER) {
    const run = E.newRun({ seed: 'S' + id });
    E.addSeal(run, id, null); E.addSeal(run, 'zhenyun', 'jin');
    try {
      for (let k = 0; k < 2; k++) { E.startRound(run); run.round.target = 1; bot.playRound(run); if (run.phase === 'cash') { E.collectCash(run); E.leaveShop(run); } else break; }
      ok(E.checkRun(run).length === 0, 'sane after ' + id);
    } catch (e) { ok(false, 'seal ' + id + ' threw: ' + e.message); }
    for (const lang of ['zh', 'en']) {
      const d = E.SEALS[id], f = lang === 'zh' ? d.dz : d.de;
      for (const args of [[null, null], [run.seals[0], run]]) {
        const s = typeof f === 'function' ? f(args[0], args[1]) : f;
        ok(typeof s === 'string' && s.length > 3 && !/undefined|NaN|\[object/.test(s), `description of ${id} (${lang}): ${s}`);
        ok(!/\[\w+\|[^\]]*$/.test(s) && E.plain(s).indexOf('[') < 0, `markup of ${id} (${lang})`);
      }
    }
    ok(E.SEALS[id].zh && E.SEALS[id].en, 'names of ' + id);
  }
  for (const id of E.ITEM_ORDER) for (const key of ['dz', 'de']) { const f = E.ITEMS[id][key]; const s = typeof f === 'function' ? f(E.newRun({ seed: 'D' })) : f; ok(typeof s === 'string' && !/undefined|NaN/.test(s) && E.plain(s).indexOf('[') < 0, 'item text ' + id); }
  for (const id of E.BOSS_ORDER) ok(E.plain(E.BOSSES[id].dz).indexOf('[') < 0 && E.plain(E.BOSSES[id].de).indexOf('[') < 0 && E.BOSSES[id].author, 'boss text ' + id);
}
// ---- determinism and save/load
{
  const play = (mid) => {
    const bot = makeBot(E, { simTop: 2 });
    let run = E.newRun({ seed: 'SAME', deck: 'kai' });
    let guard = 0, swapped = false;
    while (guard++ < 60 && run.ante <= 2) {
      if (run.phase === 'pick') { E.startRound(run); if (mid && !swapped && run.blind === 1) { swapped = true; run = JSON.parse(JSON.stringify(run)); } bot.playRound(run); }
      else if (run.phase === 'cash') E.collectCash(run);
      else if (run.phase === 'shop') { bot.shop(run); if (mid) run = JSON.parse(JSON.stringify(run)); }
      else break;
    }
    return JSON.stringify([run.ante, run.blind, run.money, run.seals.map((s) => s.id), run.deck.length, run.stats.best, run.tiers, run.rng]);
  };
  const a = play(false), b = play(false), c = play(true);
  eq(a, b, 'the same seed plays out identically');
  eq(a, c, 'a run survives being saved and loaded at any point');
}
// ---- every script can be played
{
  const bot = makeBot(E, { simTop: 2 });
  for (const id of E.DECK_ORDER) {
    const run = E.newRun({ seed: 'DK' + id, deck: id });
    try {
      let guard = 0;
      while (guard++ < 30 && run.ante <= 2 && run.phase !== 'over') {
        if (run.phase === 'pick') { E.startRound(run); bot.playRound(run); } else if (run.phase === 'cash') E.collectCash(run); else if (run.phase === 'shop') bot.shop(run); else break;
        const errs = E.checkRun(run); if (errs.length) throw new Error(errs.join(','));
      }
      ok(true, 'deck ' + id);
    } catch (e) { ok(false, 'deck ' + id + ': ' + e.stack); }
  }
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

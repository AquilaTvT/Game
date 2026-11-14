// ---------- 字帖 (copybooks) and 文房 (studio items) ----------
const ITEMS = {};
const ITEM_ORDER = [];
function defItem(id, zh, en, kind, cost, o) {
  ITEMS[id] = Object.assign({ id, zh, en, kind, cost, w: 1 }, o);
  ITEM_ORDER.push(id);
}
// --- copybooks: +1 level to one stroke tier
const TIE_BOOK = [null,
  ['上大人', 'Shang Da Ren'], ['二王帖', 'Model Letters of the Two Wangs'], ['三字经', 'Three-Character Classic'],
  ['四体书势', 'Forces of the Four Scripts'], ['五经文字', 'Characters of the Five Classics'],
  ['六体书论', 'On the Six Scripts'], ['书谱', 'Treatise on Calligraphy']];
for (let t = 1; t <= TIER_MAX; t++) {
  defItem('tie' + t, '《' + TIE_BOOK[t][0] + '》', TIE_BOOK[t][1], 'tie', 3, {
    tier: t,
    dz: (run) => {
      const lv = run ? run.tiers[t] : 1, b = tierBase(t, lv), tr = TIERS[t], k = 1 + (run ? stat(run, 'tieBonus') : 0);
      return `[k|${TIER_NAME.zh[t]}]的字等级 [k|+${k}]\n[n|当前 ${lv} 级：形 ${b.c} × 神 ${b.m}　每级 形+${tr.dc} 神+${tr.dm}]`;
    },
    de: (run) => {
      const lv = run ? run.tiers[t] : 1, b = tierBase(t, lv), tr = TIERS[t], k = 1 + (run ? stat(run, 'tieBonus') : 0);
      return `Characters of [k|${TIER_NAME.en[t]}] gain [k|+${k} level${k > 1 ? 's' : ''}]\n[n|Now Lv.${lv}: ${b.c} Form × ${b.m} Spirit · each level +${tr.dc} / +${tr.dm}]`;
    },
    use(run) { levelUp(run, t, 1 + stat(run, 'tieBonus')); return true; } });
}
const TIE_IDS = range(TIER_MAX).map((i) => 'tie' + (i + 1));

// --- pigments: recolour blocks
const dye = (ink) => function (run, tg) { for (const u of tg.pieces) { const p = pieceByUid(run, u); if (p) p.ink = ink; } return true; };
const notInk = (ink) => (p) => p.ink !== ink;
defItem('zhusha', '朱砂', 'Cinnabar', 'wen', 3, { need: { t: 'pieces', max: 3 },
  dz: '将墨匣中至多 [k|3 块] 墨染为[zhu|朱]色', de: 'Dye up to [k|3 blocks] in your Ink Box [zhu|Vermilion]', use: dye('zhu'), ok: notInk('zhu') });
defItem('shiqing', '石青', 'Azurite', 'wen', 3, { need: { t: 'pieces', max: 3 },
  dz: '将墨匣中至多 [k|3 块] 墨染为[qing|青]色', de: 'Dye up to [k|3 blocks] in your Ink Box [qing|Azure]', use: dye('qing'), ok: notInk('qing') });
defItem('nijin', '泥金', 'Gold Paste', 'wen', 3, { need: { t: 'pieces', max: 3 },
  dz: '将墨匣中至多 [k|3 块] 墨染为[jin|金]色', de: 'Dye up to [k|3 blocks] in your Ink Box [jin|Gold]', use: dye('jin'), ok: notInk('jin') });
defItem('songyan', '松烟', 'Pine Soot', 'wen', 3, { need: { t: 'pieces', max: 3 },
  dz: '将墨匣中至多 [k|3 块] 墨染为[mo|墨]色', de: 'Dye up to [k|3 blocks] in your Ink Box [mo|Black]', use: dye('mo'), ok: notInk('mo') });
// --- ink natures
const enhance = (e) => function (run, tg) { for (const u of tg.pieces) { const p = pieceByUid(run, u); if (p) p.enh = e; } return true; };
const enhItem = (id, zh, en, e, max, w) => defItem(id, zh, en, 'wen', 3, { need: { t: 'pieces', max }, w: w || 1, enh: e,
  dz: `赋予墨匣中至多 [k|${max} 块] 墨[k|「${ENH[e].zh}」]之性\n[n|${plain(ENH[e].dz)}]`, de: `Give up to [k|${max} block${max > 1 ? 's' : ''}] in your Ink Box the [k|${ENH[e].en}] nature\n[n|${plain(ENH[e].de)}]`, use: enhance(e), ok: (p) => p.enh !== e });
enhItem('e_nong', '浓墨', 'Thick Ink', 'nong', 2);
enhItem('e_fei', '飞白', 'Flying White', 'fei', 2);
enhItem('e_po', '泼墨', 'Splashed Ink', 'po', 1, 0.8);
enhItem('e_sa', '洒金', 'Gold Flecks', 'sa', 2);
enhItem('e_bai', '留白', 'Blank Space', 'bai', 2, 0.8);
enhItem('e_yin', '钤印', 'Seal Impression', 'yin', 1, 0.7);
enhItem('e_su', '宿墨', 'Aged Ink', 'su', 2, 0.7);
// --- reshaping the Ink Box
defItem('taben', '拓片', 'Rubbing', 'wen', 3, { need: { t: 'pieces', max: 1, min: 1 },
  dz: '[k|拓印]墨匣中的 1 块墨：获得一块一模一样的', de: '[k|Duplicate] 1 block in your Ink Box',
  use(run, tg) { const p = pieceByUid(run, tg.pieces[0]); if (!p) return false; addPiece(run, p.shape, p.ink, p.enh); return true; } });
defItem('kedao', '刻刀', 'Carving Knife', 'wen', 3, { need: { t: 'pieces', max: 2, min: 1 },
  dz: '[k|销毁]墨匣中至多 2 块墨\n[n|墨匣至少保留 8 块]', de: '[k|Destroy] up to 2 blocks in your Ink Box\n[n|The box keeps at least 8 blocks]',
  can(run) { return run.deck.length > 8; },
  use(run, tg) { let ok = false; for (const u of tg.pieces) { if (run.deck.length <= 8) break; removePiece(run, u); ok = true; } return ok; } });
defItem('jiechi', '戒尺', 'The Ruler', 'wen', 3, { need: { t: 'pieces', max: 2, min: 1 },
  dz: '将墨匣中至多 2 块墨[k|捋直]：变为同格数的直笔', de: '[k|Straighten] up to 2 blocks: each becomes a straight stroke of the same size',
  ok: (p) => !SHAPES[p.shape].tags.includes('straight'),
  use(run, tg) { for (const u of tg.pieces) { const p = pieceByUid(run, u); if (p) p.shape = straightOf(SHAPES[p.shape].n); } return true; } });
defItem('suimo', '碎墨', 'Crushed Ink', 'wen', 3, { need: { t: 'pieces', max: 1, min: 1 },
  dz: '将墨匣中的 1 块墨碾碎，化为 [k|2 个「点」]（同墨色）', de: 'Crush 1 block into [k|2 Dots] of the same ink',
  use(run, tg) { const p = pieceByUid(run, tg.pieces[0]); if (!p) return false; const ink = p.ink; removePiece(run, p.uid); addPiece(run, 'dot', ink, null); addPiece(run, 'dot', ink, null); return true; } });
// --- paper squares
const sqItem = (id, zh, en, sq, w) => defItem(id, zh, en, 'wen', 4, { need: { t: 'square' }, w: w || 1, sq,
  dz: `在纸上选定一格，制成[k|「${SQ[sq].zh}」]（整卷有效）\n[n|${plain(SQ[sq].dz)}]`, de: `Turn one square of your paper into [k|${SQ[sq].en}] for the whole run\n[n|${plain(SQ[sq].de)}]`,
  use(run, tg) { run.paper[tg.square] = sq; return true; } });
sqItem('g_wusi', '乌丝栏', 'Black Ruling', 'wusi');
sqItem('g_zhusi', '朱丝栏', 'Red Ruling', 'zhusi');
sqItem('g_yunwen', '云纹笺', 'Cloud-Grain Paper', 'yunwen', 0.7);
sqItem('g_sajin', '洒金笺', 'Gold-Flecked Paper', 'sajin', 0.8);
sqItem('g_die', '叠影格', 'Echo Square', 'die', 0.6);
// --- in-round tools
defItem('yanmo', '墨锭', 'Ink Stick', 'wen', 3, { round: true,
  dz: '研墨：本局添 [k|25 墨]\n[n|可以超出墨量上限]', de: 'Grind fresh ink: [k|+25 Ink] this round\n[n|May go above your maximum]',
  use(run) { addInk(run, 25); return true; } });
defItem('dianjing_i', '点睛笔', 'Eye-Dotting Brush', 'wen', 4, { round: true, need: { t: 'cell', empty: true },
  dz: '在纸上任选一个空格，点上一格[k|留白]之墨（不耗墨）', de: 'Fill any one empty square with a [k|Blank] cell (costs no Ink)',
  use(run, tg) {
    const rd = run.round;
    if (rd.board[tg.square] || rd.holes[tg.square]) return false;
    rd.board[tg.square] = { ink: 'mo', enh: 'bai', pid: 0, shape: 'dot' };
    rd.lastPlaced = 'dot';
    return true;
  } });
defItem('cihuang', '雌黄', 'Orpiment', 'wen', 3, { round: true, need: { t: 'cell', empty: false },
  dz: '选定一格，涂去以它为中心 [k|3×3] 范围内的所有墨与顽石\n[n|古人以雌黄涂改误字]', de: 'Pick a square: erase all ink and stones in the [k|3×3] area around it\n[n|The ancient correction fluid]',
  use(run, tg) {
    const rd = run.round, w = run.w, h = run.h, cx = tg.square % w, cy = Math.floor(tg.square / w);
    let k = 0;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (rd.board[y * w + x]) { rd.board[y * w + x] = null; k++; }
    }
    return k > 0;
  } });
defItem('huifeng_i', '回锋笔', 'Return-Tip Brush', 'wen', 4, { round: true, w: 0.7,
  dz: '本局 [k|挥毫+1]', de: '[k|+1 Flourish] this round',
  use(run) { run.round.ignites += 1; return true; } });
defItem('xiyan', '洗砚水', 'Inkstone Rinse', 'wen', 3, { round: true,
  dz: '本局 [k|洗笔+2]', de: '[k|+2 Rinses] this round',
  can(run) { return !flag(run, 'noDiscard'); },
  use(run) { return addDiscards(run, 2); } });
// --- fortune
defItem('runge', '润格', 'Price List', 'wen', 3, { w: 0.8,
  dz: (run) => `润笔翻倍（至多 [g|+20 文]）${run ? `\n[n|现在使用可得 ${Math.min(20, Math.max(0, run.money))} 文]` : ''}`,
  de: (run) => `Double your money (up to [g|+$20])${run ? `\n[n|Would give $${Math.min(20, Math.max(0, run.money))} now]` : ''}`,
  can(run) { return run.money > 0; },
  use(run) { run.money += Math.min(20, Math.max(0, run.money)); return true; } });
defItem('xinde', '心得', 'Reflections', 'wen', 3, {
  dz: (run) => `你最近写出的字所属的画数等级 [k|+1]${run && run.lastTier ? `\n[n|当前：${TIER_NAME.zh[run.lastTier]}]` : ''}`,
  de: (run) => `The stroke tier of the last character you wrote gains [k|+1 level]${run && run.lastTier ? `\n[n|Now: ${TIER_NAME.en[run.lastTier]}]` : ''}`,
  can(run) { return !!run.lastTier; },
  use(run) { levelUp(run, run.lastTier, 1); return true; } });
defItem('jigulu', '集古录', 'Record of Antiquities', 'wen', 4, { w: 0.6,
  dz: '获得一枚随机的[k|印]（须有空印位）', de: 'Gain a random [k|seal] (needs an empty slot)',
  can(run) { return sealRoom(run); },
  use(run) { const id = rollSealId(run, 'misc'); if (!id) return false; addSeal(run, id, null); return true; } });
defItem('jinshilu', '金石录', 'Record of Bronze and Stone', 'wen', 5, { w: 0.12, rare: true,
  dz: '获得一枚[k|田黄]之印——书家名宿（须有空印位）', de: 'Gain a [k|Tianhuang] seal — one of the great masters (needs an empty slot)',
  can(run) { return sealRoom(run) && legendaryPool(run).length > 0; },
  use(run) { const pool = legendaryPool(run); if (!pool.length) return false; addSeal(run, rndPick(run, 'misc', pool), null); return true; } });
const ITEM_POOL = ITEM_ORDER.filter((i) => ITEMS[i].kind === 'wen');

// ---------- 文房陈设 (vouchers: permanent upgrades for the run) ----------
const VOUCHERS = {};
const VOUCHER_ORDER = [];
function defVoucher(id, zh, en, o) { VOUCHERS[id] = Object.assign({ id, zh, en, cost: 10 }, o); VOUCHER_ORDER.push(id); }
defVoucher('v_yan1', '端砚', 'Duan Inkstone', { dz: '每局 [k|墨量+15]', de: '[k|+15 Ink] every round', mods: { inkMax: 15 } });
defVoucher('v_yan2', '龙尾砚', 'Dragon-Tail Inkstone', { req: 'v_yan1', dz: '每局再 [k|墨量+15]', de: 'A further [k|+15 Ink] every round', mods: { inkMax: 15 } });
defVoucher('v_xi1', '笔洗', 'Brush Washer', { dz: '每局 [k|洗笔+1]', de: '[k|+1 Rinse] every round', mods: { discards: 1 } });
defVoucher('v_xi2', '青瓷笔洗', 'Celadon Washer', { req: 'v_xi1', dz: '每局再 [k|洗笔+1]', de: 'A further [k|+1 Rinse] every round', mods: { discards: 1 } });
defVoucher('v_zhen1', '镇纸', 'Paperweight', { dz: '每局 [k|挥毫+1]', de: '[k|+1 Flourish] every round', mods: { ignites: 1 } });
defVoucher('v_zhen2', '玉镇纸', 'Jade Paperweight', { req: 'v_zhen1', dz: '每局再 [k|挥毫+1]', de: 'A further [k|+1 Flourish] every round', mods: { ignites: 1 } });
defVoucher('v_jia1', '笔架', 'Brush Rest', { dz: '[k|笔架+1 格]：同时可选的墨块多一块', de: '[k|+1 tray slot]: one more block to choose from', mods: { tray: 1 } });
defVoucher('v_jia2', '笔海', 'Brush Pot', { req: 'v_jia1', dz: '可预见接下来的 [k|2 块] 墨', de: 'Foresee the next [k|2 blocks]', mods: { peek: 2 } });
defVoucher('v_he1', '锦盒', 'Brocade Box', { dz: '[k|文房栏位+1]', de: '[k|+1 item slot]', mods: { itemSlots: 1 } });
defVoucher('v_he2', '多宝格', 'Curio Cabinet', { req: 'v_he1', cost: 14, dz: '[k|印位+1]', de: '[k|+1 seal slot]', mods: { sealSlots: 1 } });
defVoucher('v_jia3', '还价', 'Haggling', { dz: '铺中所有货物 [k|七五折]', de: 'Everything in the shop costs [k|25% less]', mods: { discount: 25 } });
defVoucher('v_jia4', '老主顾', 'Old Patron', { req: 'v_jia3', dz: '铺中所有货物 [k|五折]', de: 'Everything in the shop costs [k|50% less]', mods: { discount: 25 } });
defVoucher('v_huo1', '货架', 'Extra Shelf', { dz: '铺中 [k|多陈列 1 件]货物', de: 'The shop shows [k|1 more] item', mods: { shopSlots: 1 } });
defVoucher('v_huo2', '大货架', 'Long Shelf', { req: 'v_huo1', dz: '铺中 [k|再多陈列 1 件]货物', de: 'The shop shows [k|1 more] item again', mods: { shopSlots: 1 } });
defVoucher('v_zhang1', '账簿', 'Ledger', { dz: '利息上限提升至 [g|10 文]', de: 'Interest cap rises to [g|$10]', mods: { interestCap: 5 } });
defVoucher('v_zhang2', '钱庄', 'Money House', { req: 'v_zhang1', dz: '利息上限提升至 [g|20 文]', de: 'Interest cap rises to [g|$20]', mods: { interestCap: 10 } });
defVoucher('v_shua1', '熟客', 'Regular', { dz: '重刷价格 [g|−2 文]', de: 'Rerolls cost [g|$2 less]', mods: { rerollOff: 2 } });
defVoucher('v_shua2', '座上宾', 'Honoured Guest', { req: 'v_shua1', dz: '重刷价格再 [g|−2 文]', de: 'Rerolls cost a further [g|$2 less]', mods: { rerollOff: 2 } });
defVoucher('v_ta1', '传拓', 'Rubbing Craft', { dz: '铺中的印更常带有[k|拓]（精拓、朱拓、金拓、闲章）', de: 'Seals in the shop are much more likely to carry a [k|rubbing] (edition)', mods: { edRate: 1 } });
defVoucher('v_ta2', '乌金拓', 'Black-Gold Rubbing', { req: 'v_ta1', dz: '带[k|拓]之印更为常见', de: 'Editions become more common still', mods: { edRate: 2 } });

// ---------- 匣 (booster packs) ----------
const PACKS = {
  seal1: { kind: 'seal', n: 2, k: 1, cost: 6, w: 1.2, zh: '印匣', en: 'Seal Case' },
  seal2: { kind: 'seal', n: 4, k: 1, cost: 8, w: 0.6, zh: '大印匣', en: 'Large Seal Case' },
  seal3: { kind: 'seal', n: 4, k: 2, cost: 10, w: 0.2, zh: '珍印匣', en: 'Grand Seal Case' },
  tie1: { kind: 'tie', n: 3, k: 1, cost: 4, w: 1.2, zh: '帖匣', en: 'Copybook Case' },
  tie2: { kind: 'tie', n: 5, k: 1, cost: 6, w: 0.6, zh: '大帖匣', en: 'Large Copybook Case' },
  tie3: { kind: 'tie', n: 5, k: 2, cost: 8, w: 0.2, zh: '珍帖匣', en: 'Grand Copybook Case' },
  wen1: { kind: 'wen', n: 3, k: 1, cost: 4, w: 1.2, zh: '文房匣', en: 'Studio Case' },
  wen2: { kind: 'wen', n: 5, k: 1, cost: 6, w: 0.6, zh: '大文房匣', en: 'Large Studio Case' },
  wen3: { kind: 'wen', n: 5, k: 2, cost: 8, w: 0.2, zh: '珍文房匣', en: 'Grand Studio Case' },
  mo1: { kind: 'mo', n: 3, k: 1, cost: 4, w: 1.1, zh: '墨匣', en: 'Ink Case' },
  mo2: { kind: 'mo', n: 5, k: 1, cost: 6, w: 0.5, zh: '大墨匣', en: 'Large Ink Case' },
  mo3: { kind: 'mo', n: 5, k: 2, cost: 8, w: 0.2, zh: '珍墨匣', en: 'Grand Ink Case' },
};
const PACK_IDS = Object.keys(PACKS);
const PACK_DESC = {
  seal: { zh: (p) => `从 ${p.n} 枚印中选取 ${p.k} 枚`, en: (p) => `Choose ${p.k} of ${p.n} seals` },
  tie: { zh: (p) => `从 ${p.n} 张字帖中选取 ${p.k} 张，立即研习`, en: (p) => `Choose ${p.k} of ${p.n} copybooks; studied at once` },
  wen: { zh: (p) => `从 ${p.n} 件文房中选取 ${p.k} 件`, en: (p) => `Choose ${p.k} of ${p.n} studio items` },
  mo: { zh: (p) => `从 ${p.n} 块墨中选取 ${p.k} 块，收入墨匣`, en: (p) => `Choose ${p.k} of ${p.n} blocks to add to your Ink Box` },
};

// ---------- 题签 (tags granted for skipping a sheet) ----------
const TAGS = {
  t_gold:   { zh: '厚礼', en: 'Handsome Gift', dz: '立即获得 [g|8 文]', de: 'Gain [g|$8] at once', now(run) { run.money += 8; } },
  t_level:  { zh: '顿悟', en: 'Sudden Insight', dz: '你最常写的画数等级 [k|+2]', de: 'Your most-written stroke tier gains [k|+2 levels]', now(run) { levelUp(run, favTier(run), 2); } },
  t_ink:    { zh: '佳墨', en: 'Fine Ink', dz: '下一局 [k|墨量+30]', de: '[k|+30 Ink] next round', hold: 'ink' },
  t_seal:   { zh: '赠印', en: 'Seal Gift', dz: '下一家铺子附赠一只[k|大印匣]', de: 'The next shop adds a free [k|Large Seal Case]', hold: 'pack', pack: 'seal2' },
  t_tie:    { zh: '赠帖', en: 'Copybook Gift', dz: '下一家铺子附赠一只[k|珍帖匣]', de: 'The next shop adds a free [k|Grand Copybook Case]', hold: 'pack', pack: 'tie3' },
  t_wen:    { zh: '赠匣', en: 'Studio Gift', dz: '下一家铺子附赠一只[k|珍文房匣]', de: 'The next shop adds a free [k|Grand Studio Case]', hold: 'pack', pack: 'wen3' },
  t_mo:     { zh: '赠墨', en: 'Ink Gift', dz: '下一家铺子附赠一只[k|珍墨匣]', de: 'The next shop adds a free [k|Grand Ink Case]', hold: 'pack', pack: 'mo3' },
  t_reroll: { zh: '常客', en: 'Free Browsing', dz: '下一家铺子可[k|免费重刷 3 次]', de: '[k|3 free rerolls] in the next shop', hold: 'reroll' },
  t_rare:   { zh: '珍玩', en: 'Rarity', dz: '下一家铺子必有一枚[k|免费]的鸡血石印', de: 'The next shop holds one [k|free] Bloodstone seal', hold: 'rare' },
  t_double: { zh: '重酬', en: 'Double Fee', dz: '下一次过关的结算润笔[k|翻倍]（至多 +15 文）', de: 'Your next sheet payout is [k|doubled] (up to +$15)', hold: 'double' },
};
const TAG_IDS = Object.keys(TAGS);

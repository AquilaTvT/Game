// ---------- 印 (seals): the relics of a run ----------
// rarity: 1 青田石 (common) · 2 寿山石 (uncommon) · 3 鸡血石 (rare) · 4 田黄 (legendary)
const SEALS = {};
const SEAL_ORDER = [];
const RARITY = [null,
  { zh: '青田石', en: 'Qingtian Stone', col: '#7fa08c' },
  { zh: '寿山石', en: 'Shoushan Stone', col: '#d9a441' },
  { zh: '鸡血石', en: 'Bloodstone', col: '#d0453a' },
  { zh: '田黄',   en: 'Tianhuang', col: '#f4d35e' },
];
function defSeal(id, zh, en, r, cost, o) {
  SEALS[id] = Object.assign({ id, zh, en, r, cost, w: 1 }, o);
  SEAL_ORDER.push(id);
}
const hasTag = (shape, tag) => !!SHAPES[shape] && SHAPES[shape].tags.includes(tag);
const midLines = (len) => [Math.floor((len - 1) / 2), Math.ceil((len - 1) / 2)];
const stv = (s, k, d) => (s && s.st && s.st[k] != null ? s.st[k] : d);
const oddsTxt = (run, a, b) => `${Math.min(b, a * (run ? Math.max(1, stat(run, 'probMul')) : 1))}/${b}`;

// ================= 青田石 · common =================
defSeal('xinshou', '信手拈来', 'Offhand', 1, 3, {
  dz: '[m|神+5]', de: '[m|+5 Spirit]',
  end(sc) { sc.m(5); } });
defSeal('zhenyun', '千里阵云', 'Thousand-League Clouds', 1, 5, {
  dz: '每条[k|横] [m|神+3]\n[n|《笔阵图》：横如千里阵云]', de: 'Each [k|row stroke]: [m|+3 Spirit]\n[n|"A horizontal is a bank of cloud a thousand leagues long."]',
  stroke(sc, s, st) { if (st.kind === 'row') sc.m(3); } });
defSeal('kuteng', '万岁枯藤', 'Ten-Thousand-Year Vine', 1, 5, {
  dz: '每条[k|竖] [m|神+3]\n[n|《笔阵图》：竖如万岁枯藤]', de: 'Each [k|column stroke]: [m|+3 Spirit]\n[n|"A vertical is a withered vine ten thousand years old."]',
  stroke(sc, s, st) { if (st.kind === 'col') sc.m(3); } });
defSeal('zhuishi', '高峰坠石', 'Falling Boulder', 1, 4, {
  dz: '每个来自[k|「点」]的格计分时 [c|形+50]\n[n|《笔阵图》：点如高峰坠石]', de: 'Each cell from a [k|Dot] block: [c|+50 Form]\n[n|"A dot is a boulder falling from a high peak."]',
  cell(sc, s, c) { if (c.shape === 'dot') sc.c(50); } });
defSeal('heizi', '白纸黑字', 'Black on White', 1, 4, {
  dz: '每个[mo|墨]色格计分时 [c|形+6]', de: 'Each [mo|Black] cell: [c|+6 Form]',
  cell(sc, s, c) { if (c.ink === 'mo') sc.c(6); } });
defSeal('danshu', '丹书铁券', 'Cinnabar Decree', 1, 5, {
  dz: '每个[zhu|朱]色格计分时 [m|神+1]', de: 'Each [zhu|Vermilion] cell: [m|+1 Spirit]',
  cell(sc, s, c) { if (c.ink === 'zhu') sc.m(1); } });
defSeal('cantou', '蚕头燕尾', 'Silkworm Head, Swallow Tail', 1, 5, {
  dz: '每条[k|横]的首格 [c|形+30]，末格 [m|神+3]', de: 'Each [k|row stroke]: first cell [c|+30 Form], last cell [m|+3 Spirit]',
  cell(sc, s, c, st, pos) { if (st.kind === 'row') { if (pos === 0) sc.c(30); else if (pos === st.cells.length - 1) sc.m(3); } } });
defSeal('zhongfeng', '中锋用笔', 'Centred Tip', 1, 4, {
  dz: '纸面[k|中央]区域的格计分时 [c|形+10]', de: 'Cells in the [k|central] area of the sheet: [c|+10 Form]',
  cell(sc, s, c) { if (c.center) sc.c(10); } });
defSeal('cangfeng', '藏锋', 'Hidden Tip', 1, 4, {
  dz: '纸面[k|四边]上的格计分时 [c|形+8]', de: 'Cells on the [k|outer edge] of the sheet: [c|+8 Form]',
  cell(sc, s, c) { if (c.edge) sc.c(8); } });
defSeal('sanfen', '入木三分', 'Three Tenths Into the Wood', 1, 5, {
  dz: '写出恰为[k|三画]的字时 [m|神+10]', de: 'When you write a character of exactly [k|3 strokes]: [m|+10 Spirit]',
  end(sc) { if (sc.n === 3) sc.m(10); } });
defSeal('ximo', '惜墨如金', 'Ink Dear as Gold', 1, 5, {
  dz: '过关时每剩余 8 墨 [g|+1 文]（至多 6 文）', de: 'On clearing a sheet: [g|+$1] per 8 Ink left (up to $6)',
  payout(run) { return Math.min(6, Math.floor(run.round.ink / 8)); } });
defSeal('zhuji', '字字珠玑', 'Every Word a Pearl', 1, 5, {
  dz: '写出[k|成字]（非散笔）时 [g|+1 文]', de: 'When you write a [k|true character] (not a scribble): [g|+$1]',
  end(sc) { if (sc.isChar) sc.cash(1); } });
defSeal('runbi', '润笔', 'Brush Fee', 1, 4, {
  dz: '每次挥毫 [g|+1 文]', de: 'Every flourish: [g|+$1]',
  end(sc) { sc.cash(1); } });
defSeal('mochi', '墨池', 'Ink Pond', 1, 5, {
  dz: '[k|墨量+15]', de: '[k|+15 Ink] each round', mods: { inkMax: 15 } });
defSeal('yinshou', '引首章', 'Opening Seal', 1, 4, {
  dz: '写出[k|顶行]之横时 [m|神+10]', de: 'When the [k|top row] is one of your strokes: [m|+10 Spirit]',
  end(sc) { if (sc.rows.includes(0)) sc.m(10); } });
defSeal('yaozhang', '腰章', 'Waist Seal', 1, 4, {
  dz: '位于纸面[k|正中]的横与竖，每条 [c|形+40]', de: 'Each stroke through the [k|middle] of the sheet: [c|+40 Form]',
  stroke(sc, s, st) {
    if (st.kind === 'row' && midLines(sc.h).includes(st.i)) sc.c(40);
    else if (st.kind === 'col' && midLines(sc.w).includes(st.i)) sc.c(40);
  } });
defSeal('tanhua', '昙花一现', 'Night-Blooming Cereus', 1, 4, {
  dz: (s, run) => `[m|神+18]\n每局结束时有 ${oddsTxt(run, 1, 6)} 概率凋谢`, de: (s, run) => `[m|+18 Spirit]\n${oddsTxt(run, 1, 6)} chance to wither at the end of each round`,
  end(sc) { sc.m(18); },
  roundEnd(run, s, out) { if (prob(run, 1, 6)) { destroySeal(run, s.uid); out.push({ t: 'sealGone', id: s.id }); } } });
defSeal('zhangfang', '账房先生', 'The Bookkeeper', 1, 4, {
  dz: '写出[k|数字]时获得润笔：一二三亖四 [g|1 文]，十 [g|2 文]，廿 [g|3 文]，卅卌 [g|4 文]', de: 'When you write a [k|numeral]: 一二三亖四 [g|$1], 十 [g|$2], 廿 [g|$3], 卅 卌 [g|$4]',
  end(sc) { if (sc.num) sc.cash(sc.num >= 30 ? 4 : sc.num >= 20 ? 3 : sc.num >= 10 ? 2 : 1); } });
defSeal('fangzheng', '四平八稳', 'Foursquare and Steady', 1, 4, {
  dz: '每个来自[k|方]、[k|砖]、[k|旗]形墨块的格计分时 [c|形+8]', de: 'Each cell from a [k|Square], [k|Brick] or [k|Flag] block: [c|+8 Form]',
  cell(sc, s, c) { if (hasTag(c.shape, 'block')) sc.c(8); } });
defSeal('changqiang', '长枪大戟', 'Long Spears, Great Halberds', 1, 5, {
  dz: '每块参与计分的[k|长笔]（四格以上的直块）[m|神+4]', de: 'Each [k|long straight block] (4+ cells) that scores: [m|+4 Spirit]',
  end(sc) { for (const p of sc.pieces) if (hasTag(p.shape, 'long')) sc.m(4); } });
defSeal('baijun', '百钧弩发', 'Hundredweight Crossbow', 1, 5, {
  dz: '每块参与计分的[k|折]、[k|钩]形墨块 [m|神+3]\n[n|《笔阵图》：折如百钧弩发]', de: 'Each [k|Bend] or [k|Hook] block that scores: [m|+3 Spirit]\n[n|"A turn is a crossbow of a hundred weights let loose."]',
  end(sc) { for (const p of sc.pieces) if (hasTag(p.shape, 'corner')) sc.m(3); } });
defSeal('kaimen', '开门红', 'Auspicious Start', 1, 4, {
  dz: '每局[k|首次]挥毫 [c|形+100]', de: 'Your [k|first] flourish each round: [c|+100 Form]',
  end(sc) { if (sc.first) sc.c(100); } });
defSeal('shoubi', '收笔', 'Closing Stroke', 1, 4, {
  dz: '用掉[k|最后一次]挥毫时 [m|神+20]', de: 'When you spend your [k|last] flourish: [m|+20 Spirit]',
  end(sc) { if (sc.last) sc.m(20); } });
defSeal('bizhou', '敝帚自珍', 'A Cherished Old Broom', 1, 4, {
  dz: (s) => `每局结束时此印售价 [g|+3 文]（当前售价 [g|${s ? sealSellValue(s) : 2} 文]）`, de: (s) => `Gains [g|+$3] sell value at the end of each round (now [g|$${s ? sealSellValue(s) : 2}])`,
  roundEnd(run, s) { s.bonus = (s.bonus || 0) + 3; } });
defSeal('dianshi', '点石成金', 'Stone into Gold', 1, 5, {
  dz: (s, run) => `每个[jin|金]色格计分时有 ${oddsTxt(run, 1, 8)} 概率 [g|+1 文]（每次挥毫至多 5 文）`, de: (s, run) => `Each [jin|Gold] cell: ${oddsTxt(run, 1, 8)} chance of [g|+$1] (up to $5 per flourish)`,
  cell(sc, s, c) { if (c.ink === 'jin' && (sc.tmp.dianshi || 0) < 5 && prob(sc.run, 1, 8)) { sc.tmp.dianshi = (sc.tmp.dianshi || 0) + 1; sc.cash(1); } } });
defSeal('yantian', '砚田', 'Inkstone Field', 1, 5, {
  dz: (s, run) => `每持有 4 文 [c|形+10]（至多 +200）${run ? `\n[n|当前 +${Math.min(200, 10 * Math.floor(Math.max(0, run.money) / 4))}]` : ''}`,
  de: (s, run) => `[c|+10 Form] per $4 you hold (up to +200)${run ? `\n[n|Now +${Math.min(200, 10 * Math.floor(Math.max(0, run.money) / 4))}]` : ''}`,
  end(sc) { const v = Math.min(200, 10 * Math.floor(Math.max(0, sc.run.money) / 4)); if (v > 0) sc.c(v); } });
defSeal('huifeng', '回锋', 'Returning Tip', 1, 5, {
  dz: '每条笔画的[k|末格]再触发一次', de: 'The [k|last cell] of every stroke triggers once more',
  retrig(sc, s, c, st, pos) { return pos === st.cells.length - 1 ? 1 : 0; } });
defSeal('paozhuan', '抛砖引玉', 'Cast a Brick, Draw Jade', 1, 4, {
  dz: '[m|神+3]\n卖出此印时获得两张随机[k|字帖]', de: '[m|+3 Spirit]\nWhen sold: gain two random [k|copybooks]',
  end(sc) { sc.m(3); },
  sold(run) { for (let i = 0; i < 2; i++) giveItem(run, rndPick(run, 'misc', TIE_IDS), true); } });
defSeal('qinglv', '青绿山水', 'Blue-Green Landscape', 1, 4, {
  dz: '每个[qing|青]色格计分时 [c|形+8]', de: 'Each [qing|Azure] cell: [c|+8 Form]',
  cell(sc, s, c) { if (c.ink === 'qing') sc.c(8); } });

// ================= 寿山石 · uncommon =================
defSeal('bizhong', '退笔成冢', 'Tomb of Worn Brushes', 2, 6, {
  dz: (s) => `[k|洗笔+1]\n每次洗笔，此印永久 [c|形+6]（当前 [c|+${stv(s, 'c', 0)}]）`, de: (s) => `[k|+1 Rinse]\nEach rinse permanently adds [c|+6 Form] to this seal (now [c|+${stv(s, 'c', 0)}])`,
  mods: { discards: 1 }, init(s) { s.st.c = 0; },
  discard(run, s) { s.st.c += 6; },
  end(sc, s) { if (s.st.c > 0) sc.c(s.st.c); } });
defSeal('jibai', '计白当黑', 'Count the White as Black', 2, 6, {
  dz: '挥毫时纸上每个[k|空格] [c|形+3]', de: 'When you flourish: [c|+3 Form] for every [k|empty square] on the sheet',
  end(sc) { if (sc.empty > 0) sc.c(3 * sc.empty); } });
defSeal('manzhi', '满纸云烟', 'A Sheet of Cloud and Mist', 2, 6, {
  dz: '挥毫时纸上每个未写入笔画的[k|散墨]格 [m|神+1]（至多 +30）', de: 'When you flourish: [m|+1 Spirit] for every [k|stray cell] outside your strokes (up to +30)',
  end(sc) { if (sc.clutter > 0) sc.m(Math.min(30, sc.clutter)); } });
defSeal('qianjin', '一字千金', 'One Word, a Thousand Gold', 2, 6, {
  dz: '写出[k|一画]的字（一、丨）时 [c|形+150] 并 [g|+2 文]', de: 'When you write a [k|1-stroke] character (一, 丨): [c|+150 Form] and [g|+$2]',
  end(sc) { if (sc.n === 1) { sc.c(150); sc.cash(2); } } });
defSeal('suanchou', '算筹', 'Counting Rods', 2, 7, {
  dz: '写出[k|数字]时，[m|神]增加其数值\n[n|一 1 · 二 2 · 三 3 · 亖四 4 · 十 10 · 廿 20 · 卅 30 · 卌 40]', de: 'When you write a [k|numeral], add its value to [m|Spirit]\n[n|一 1 · 二 2 · 三 3 · 亖/四 4 · 十 10 · 廿 20 · 卅 30 · 卌 40]',
  end(sc) { if (sc.num) sc.m(sc.num); } });
defSeal('shiquan', '十全十美', 'Perfect in Every Way', 2, 6, {
  dz: '每个横竖相交的[k|交点] [m|神+3]（至多 16 个交点）', de: '[m|+3 Spirit] for every [k|crossing] of a row and a column (up to 16 crossings)',
  end(sc) { if (sc.nodes > 0) sc.m(3 * Math.min(16, sc.nodes)); } });
defSeal('wuse', '墨分五色', 'Five Shades of Ink', 2, 7, {
  dz: '计分的格中含[k|三种]墨色 [x|神×1.5]；[k|四种]俱全 [x|神×2]', de: 'If the scored cells include [k|3 inks]: [x|×1.5 Spirit]; all [k|4 inks]: [x|×2 Spirit]',
  end(sc) { const k = Object.keys(sc.inkCount).length; if (k >= 4) sc.x(2); else if (k === 3) sc.x(1.5); } });
defSeal('shizi', '识字', 'Literacy', 2, 6, {
  dz: (s) => `每写出一个此卷尚未写过的字，此印永久 [m|神+3]（当前 [m|+${stv(s, 'm', 0)}]）`, de: (s) => `Each time you write a character new to this run, this seal permanently gains [m|+3 Spirit] (now [m|+${stv(s, 'm', 0)}])`,
  init(s) { s.st.m = 0; },
  end(sc, s) { if (sc.newRun && sc.isChar) s.st.m += 3; if (s.st.m > 0) sc.m(s.st.m); } });
defSeal('linchi', '临池', 'By the Ink Pond', 2, 6, {
  dz: (s) => `每耗 50 墨，此印永久 [c|形+12]（当前 [c|+${stv(s, 'c', 0)}]）\n[n|张芝临池学书，池水尽黑]`, de: (s) => `For every 50 Ink you spend, this seal permanently gains [c|+12 Form] (now [c|+${stv(s, 'c', 0)}])\n[n|Zhang Zhi practised by a pond until its water ran black.]`,
  init(s) { s.st.c = 0; s.st.acc = 0; },
  place(run, s, info) { s.st.acc += info.cost; while (s.st.acc >= 50) { s.st.acc -= 50; s.st.c += 12; } },
  end(sc, s) { if (s.st.c > 0) sc.c(s.st.c); } });
defSeal('tieyan', '铁砚磨穿', 'Worn Through the Iron Inkstone', 2, 6, {
  dz: (s) => `每过一局，此印永久 [m|神+2]（当前 [m|+${stv(s, 'm', 0)}]）`, de: (s) => `After every round this seal permanently gains [m|+2 Spirit] (now [m|+${stv(s, 'm', 0)}])`,
  init(s) { s.st.m = 0; },
  roundEnd(run, s) { s.st.m += 2; },
  end(sc, s) { if (s.st.m > 0) sc.m(s.st.m); } });
defSeal('yiqi', '一气呵成', 'In a Single Breath', 2, 7, {
  dz: '本局尚未[k|洗笔]时 [x|神×1.75]', de: 'If you have not [k|rinsed] this round: [x|×1.75 Spirit]',
  end(sc) { if (!sc.rd.discardsUsed) sc.x(1.75); } });
defSeal('xiabi', '下笔有神', 'The Brush Moves as if Inspired', 2, 7, {
  dz: '每局[k|首次]挥毫 [x|神×2]', de: 'Your [k|first] flourish each round: [x|×2 Spirit]',
  end(sc) { if (sc.first) sc.x(2); } });
defSeal('dianjing', '画龙点睛', 'Dotting the Dragon\'s Eyes', 2, 6, {
  dz: '挥毫前最后落下的墨块是[k|「点」]时 [x|神×2]', de: 'If the last block you placed before the flourish was a [k|Dot]: [x|×2 Spirit]',
  end(sc) { if (sc.rd.lastPlaced === 'dot') sc.x(2); } });
defSeal('longshe', '笔走龙蛇', 'Dragons and Serpents', 2, 7, {
  dz: '每块参与计分的[k|蛇形]墨块（乙、之、阶、曲、弓）[x|神×1.2]（每次挥毫至多 6 块）', de: 'Each [k|serpentine] block that scores (Wave, Zigzag, Stairs, Crook, Bow): [x|×1.2 Spirit] (up to 6 blocks per flourish)',
  end(sc) { let k = 0; for (const p of sc.pieces) if (hasTag(p.shape, 'snake') && k < 6) { k++; sc.x(1.2); } } });
defSeal('shuke', '疏可走马', 'Room for a Horse to Run', 2, 7, {
  dz: '两画以上，且所有并列的笔画[k|互不相邻]时 [x|神×2]', de: 'With 2+ strokes, if no two parallel strokes are [k|adjacent]: [x|×2 Spirit]',
  end(sc) { if (sc.n >= 2 && sc.adjPairs === 0) sc.x(2); } });
defSeal('mibu', '密不透风', 'Not a Breath of Wind', 2, 7, {
  dz: '有[k|三条]以上彼此相邻的并列笔画时 [x|神×2]', de: 'If [k|three or more] parallel strokes lie side by side: [x|×2 Spirit]',
  end(sc) { if (sc.maxRun >= 3) sc.x(2); } });
defSeal('budingshi', '目不识丁', 'Cannot Tell 丁 from a Nail', 2, 6, {
  dz: '写出[k|散笔]时 [x|神×2.5]', de: 'When you write a [k|scribble]: [x|×2.5 Spirit]',
  end(sc) { if (!sc.isChar) sc.x(2.5); } });
defSeal('huadi', '画地为牢', 'A Circle Drawn for a Prison', 2, 7, {
  dz: '写出[k|带框]的字（口日目田四囲）时 [x|神×2]', de: 'When you write a [k|framed] character (口 日 目 田 四 囲): [x|×2 Spirit]',
  end(sc) { if (sc.def.tags.includes('frame')) sc.x(2); } });
defSeal('jingjing', '井井有条', 'Order upon Order', 2, 6, {
  dz: '写出[k|井、开、囲]时，每条笔画 [m|神+5]', de: 'When you write [k|井, 开 or 囲]: [m|+5 Spirit] per stroke',
  end(sc) { if (sc.def.tags.includes('jing')) sc.m(5 * sc.n); } });
defSeal('shanshui', '山高水长', 'Mountains High, Rivers Long', 2, 6, {
  dz: '写出[k|山]或[k|川]时 [c|形+200]、[m|神+8]', de: 'When you write [k|山] or [k|川]: [c|+200 Form] and [m|+8 Spirit]',
  end(sc) { if (sc.char === 'shan' || sc.char === 'chuan') { sc.c(200); sc.m(8); } } });
defSeal('guitian', '解甲归田', 'Home to the Fields', 2, 6, {
  dz: '写出[k|田]时 [m|神+15] 并 [g|+5 文]', de: 'When you write [k|田]: [m|+15 Spirit] and [g|+$5]',
  end(sc) { if (sc.char === 'tian') { sc.m(15); sc.cash(5); } } });
defSeal('gongyu', '工欲善其事', 'First Sharpen the Tools', 2, 6, {
  dz: '每局首次写出[k|工、干、土]时，获得一件随机[k|文房]（须有空位）', de: 'The first time each round you write [k|工, 干 or 土]: gain a random [k|studio item] (needs room)',
  roundStart(run, s) { s.st.used = false; },
  end(sc, s) {
    if (!s.st.used && (sc.char === 'gong' || sc.char === 'gan' || sc.char === 'tu')) {
      s.st.used = true; sc.say({ zh: '利其器', en: 'Tools ready' });
      sc.later((run) => giveItem(run, rndPick(run, 'misc', ITEM_POOL.filter((i) => !ITEMS[i].rare))));
    }
  } });
defSeal('xinxi', '喜新厌旧', 'Love the New', 2, 7, {
  dz: '写出本局[k|尚未写过]的字时 [x|神×1.75]', de: 'When you write a character [k|not yet written] this round: [x|×1.75 Spirit]',
  end(sc) { if (sc.newRound) sc.x(1.75); } });
defSeal('wengu', '温故知新', 'Review the Old', 2, 7, {
  dz: '写出本局[k|已写过]的字时 [x|神×2]', de: 'When you write a character [k|already written] this round: [x|×2 Spirit]',
  end(sc) { if (!sc.newRound) sc.x(2); } });
defSeal('shuneng', '熟能生巧', 'Practice Makes Perfect', 2, 6, {
  dz: '同一个字此卷每多写过一次，写它时 [c|形+15]', de: 'A character gains [c|+15 Form] for every earlier time you wrote it this run',
  end(sc) { const k = sc.run.charCounts[sc.char] || 0; if (k > 0) sc.c(15 * k); } });
defSeal('wanguan', '腰缠万贯', 'Girded with Strings of Cash', 2, 7, {
  dz: (s, run) => `每持有 8 文 [m|神+2]（至多 +30）${run ? `\n[n|当前 +${Math.min(30, 2 * Math.floor(Math.max(0, run.money) / 8))}]` : ''}`,
  de: (s, run) => `[m|+2 Spirit] per $8 you hold (up to +30)${run ? `\n[n|Now +${Math.min(30, 2 * Math.floor(Math.max(0, run.money) / 8))}]` : ''}`,
  end(sc) { const v = Math.min(30, 2 * Math.floor(Math.max(0, sc.run.money) / 8)); if (v > 0) sc.m(v); } });
defSeal('yaji', '文人雅集', 'Gathering of Scholars', 2, 6, {
  dz: '每家铺子的[k|首次重刷]免费', de: 'The [k|first reroll] in every shop is free', mods: { freeRerolls: 1 } });
defSeal('xiong', '胸有成竹', 'Bamboo Fully Formed in the Mind', 2, 5, {
  dz: '可预见接下来的 [k|3 块] 墨', de: 'Foresee the next [k|3 blocks]', mods: { peek: 3 } });
defSeal('jinghua', '镜花水月', 'Flower in the Mirror', 2, 5, {
  dz: '可以[k|镜像翻转]墨块', de: 'You may [k|mirror-flip] blocks', mods: { flip: 1 } });
defSeal('kubi', '枯笔', 'Dry Brush', 2, 7, {
  dz: '[k|墨量−25]\n[x|神×1.75]', de: '[k|−25 Ink] each round\n[x|×1.75 Spirit]', mods: { inkMax: -25 },
  end(sc) { sc.x(1.75); } });
defSeal('yajiao', '压角章', 'Corner Seal', 2, 6, {
  dz: '纸面[k|四角]的格每次计分 [x|神×1.1]', de: 'The [k|four corner] cells of the sheet: [x|×1.1 Spirit] each time they score',
  cell(sc, s, c) { if (c.corner) sc.x(1.1); } });
defSeal('luokuan', '落款章', 'Signature Seal', 2, 6, {
  dz: '写出[k|底行]之横时 [x|神×1.5]', de: 'When the [k|bottom row] is one of your strokes: [x|×1.5 Spirit]',
  end(sc) { if (sc.rows.includes(sc.h - 1)) sc.x(1.5); } });
defSeal('miaohong', '描红', 'Tracing in Red', 2, 7, {
  dz: '[k|第一条]笔画的所有格再触发一次', de: 'Every cell of your [k|first] stroke triggers once more',
  retrig(sc, s, c, st) { return st.si === 0 ? 1 : 0; } });
defSeal('feibaishu', '飞白书', 'Flying-White Script', 2, 6, {
  dz: '每个带[k|墨性]的格计分时 [m|神+2]', de: 'Each cell with an [k|ink nature]: [m|+2 Spirit] when scored',
  cell(sc, s, c) { if (c.enh) sc.m(2); } });
defSeal('jinshang', '锦上添花', 'Flowers upon Brocade', 2, 7, {
  dz: '落在[k|纸格]（乌丝栏、朱丝栏、云纹笺等）上的格再触发一次', de: 'Cells lying on a [k|special square] of your paper trigger once more',
  retrig(sc, s, c) { return c.sq ? 1 : 0; } });
defSeal('shaoer', '少而精', 'Few but Fine', 2, 6, {
  dz: (s, run) => `墨匣中每比 32 块少一块 [m|神+2]${run ? `\n[n|当前 +${2 * Math.max(0, 32 - run.deck.length)}]` : ''}`,
  de: (s, run) => `[m|+2 Spirit] for each block fewer than 32 in your Ink Box${run ? `\n[n|Now +${2 * Math.max(0, 32 - run.deck.length)}]` : ''}`,
  end(sc) { const v = 2 * Math.max(0, 32 - sc.run.deck.length); if (v > 0) sc.m(v); } });
defSeal('juechu', '绝处逢生', 'Life at the Edge of Death', 2, 5, {
  dz: '挥毫用尽而未过关时，若得分已达目标的[k|一半]，仍算过关；此印随即销毁', de: 'If you run out of flourishes with at least [k|half] the target, you pass anyway; this seal is then destroyed',
  rescue: true });
defSeal('qianlong', '乾隆御览', 'Seen by the Qianlong Emperor', 2, 7, {
  dz: (s, run) => `每拥有一枚印 [m|神+5]${run ? `（当前 [m|+${5 * run.seals.length}]）` : ''}\n[n|十全老人，见画必钤]`,
  de: (s, run) => `[m|+5 Spirit] for every seal you own${run ? ` (now [m|+${5 * run.seals.length}])` : ''}\n[n|The emperor stamped every painting he ever saw.]`,
  end(sc) { sc.m(5 * sc.run.seals.length); } });
defSeal('wanjuan', '胸藏万卷', 'Ten Thousand Scrolls Within', 2, 7, {
  dz: (s, run) => `各画数等级每超过 1 级一级 [m|神+2]${run ? `（当前 [m|+${2 * sum(run.tiers.slice(1), (v) => v - 1)}]）` : ''}`,
  de: (s, run) => `[m|+2 Spirit] for every stroke-tier level above 1${run ? ` (now [m|+${2 * sum(run.tiers.slice(1), (v) => v - 1)}])` : ''}`,
  end(sc) { const v = 2 * sum(sc.run.tiers.slice(1), (x) => x - 1); if (v > 0) sc.m(v); } });
defSeal('xueer', '学而时习', 'Learn and Practise', 2, 6, {
  dz: (s) => `每使用一张[k|字帖]，此印永久 [m|神+3]（当前 [m|+${stv(s, 'm', 0)}]）`, de: (s) => `Each [k|copybook] you use permanently adds [m|+3 Spirit] to this seal (now [m|+${stv(s, 'm', 0)}])`,
  init(s) { s.st.m = 0; },
  useItem(run, s, def) { if (def.kind === 'tie') s.st.m += 3; },
  end(sc, s) { if (s.st.m > 0) sc.m(s.st.m); } });
defSeal('lianmian', '连绵不绝', 'Unbroken', 2, 7, {
  dz: '每一对[k|相邻]的并列笔画 [m|神+6]', de: '[m|+6 Spirit] for every pair of [k|adjacent] parallel strokes',
  end(sc) { if (sc.adjPairs > 0) sc.m(6 * sc.adjPairs); } });
defSeal('luoyang', '洛阳纸贵', 'Paper Grows Dear in Luoyang', 2, 6, {
  dz: '过关时，本局每写出一个不同的字 [g|+1 文]（至多 5 文）', de: 'On clearing a sheet: [g|+$1] for each different character written this round (up to $5)',
  payout(run) { return Math.min(5, new Set(run.round.chars).size); } });
defSeal('xiongwu', '胸无点墨', 'Not a Drop of Ink Within', 2, 6, {
  dz: '挥毫时[k|墨已用尽]（剩余 0）则 [x|神×3]', de: 'If you flourish with [k|no Ink left] (exactly 0): [x|×3 Spirit]',
  end(sc) { if (sc.rd.ink === 0) sc.x(3); } });
defSeal('chengshuang', '好事成双', 'Good Things Come in Pairs', 2, 6, {
  dz: '写出恰为[k|二画]的字时 [x|神×2]', de: 'When you write a character of exactly [k|2 strokes]: [x|×2 Spirit]',
  end(sc) { if (sc.n === 2) sc.x(2); } });
defSeal('wuche', '学富五车', 'Five Cartloads of Learning', 2, 6, {
  dz: '写出[k|五画以上]的字时 [m|神+15]', de: 'When you write a character of [k|5+ strokes]: [m|+15 Spirit]',
  end(sc) { if (sc.n >= 5) sc.m(15); } });
defSeal('liushu', '六书', 'The Six Scripts', 2, 7, {
  dz: (s, run) => `此卷已写出 [k|6 个]不同的字时 [x|神×1.5]；[k|12 个]时 [x|神×2]${run ? `\n[n|已写出 ${distinctChars(run)} 个]` : ''}`,
  de: (s, run) => `With [k|6] different characters written this run: [x|×1.5 Spirit]; with [k|12]: [x|×2 Spirit]${run ? `\n[n|Written so far: ${distinctChars(run)}]` : ''}`,
  end(sc) { const k = distinctChars(sc.run) + (sc.newRun && sc.isChar ? 1 : 0); if (k >= 12) sc.x(2); else if (k >= 6) sc.x(1.5); } });
defSeal('qibu', '七步成诗', 'A Poem in Seven Paces', 2, 6, {
  dz: '自上次挥毫起落下的墨块[k|不超过 7 块]时 [x|神×1.75]', de: 'If you placed [k|7 blocks or fewer] since your last flourish: [x|×1.75 Spirit]',
  end(sc) { if (sc.rd.placedSince <= 7) sc.x(1.75); } });
defSeal('xijin', '洗尽铅华', 'All Powder Washed Away', 2, 6, {
  dz: (s) => `每次洗笔，本局 [m|神+4]${s && s.st.m ? `（本局 [m|+${s.st.m}]）` : ''}`, de: (s) => `Each rinse: [m|+4 Spirit] for the rest of the round${s && s.st.m ? ` (now [m|+${s.st.m}])` : ''}`,
  init(s) { s.st.m = 0; },
  roundStart(run, s) { s.st.m = 0; },
  discard(run, s) { s.st.m += 4; },
  end(sc, s) { if (s.st.m > 0) sc.m(s.st.m); } });
defSeal('toubi', '投笔从戎', 'Cast Aside the Brush', 2, 6, {
  dz: '[m|神+4]\n卖出此印时，所有画数等级 [k|+1]', de: '[m|+4 Spirit]\nWhen sold: every stroke tier gains [k|+1 level]',
  end(sc) { sc.m(4); },
  sold(run) { for (let t = 1; t <= TIER_MAX; t++) levelUp(run, t, 1); } });
defSeal('pomo', '泼墨山水', 'Splashed-Ink Landscape', 2, 6, {
  dz: '[k|泼墨]块不再碎裂，其倍率由 ×1.5 提升为 [x|×2]', de: '[k|Splash] blocks never shatter and give [x|×2] instead of ×1.5', flags: { poSafe: 1 } });
defSeal('jinsheng', '金声玉振', 'Bronze Bell, Jade Chime', 2, 7, {
  dz: '本次挥毫中每获得 1 文 [m|神+3]\n[n|只计算排在它左侧已结算的润笔]', de: '[m|+3 Spirit] for every $1 earned during this flourish\n[n|Counts only what has been paid before this seal triggers]',
  end(sc) { if (sc.money > 0) sc.m(3 * sc.money); } });
defSeal('zhumo', '朱墨套印', 'Red-and-Black Printing', 2, 6, {
  dz: '计分的格中同时有[zhu|朱]与[mo|墨]时 [x|神×1.5]', de: 'If the scored cells include both [zhu|Vermilion] and [mo|Black]: [x|×1.5 Spirit]',
  end(sc) { if (sc.inkCount.zhu && sc.inkCount.mo) sc.x(1.5); } });
defSeal('zhupi', '朱批', 'The Vermilion Rescript', 2, 6, {
  dz: '[zhu|纯朱]之笔额外 [m|神+8]', de: 'Each [zhu|pure Vermilion] stroke: an extra [m|+8 Spirit]',
  stroke(sc, s, st) { if (st.pure === 'zhu') sc.m(8); } });
defSeal('mobao', '墨宝', 'Treasured Ink', 2, 6, {
  dz: '[mo|纯墨]之笔额外 [c|形+100]', de: 'Each [mo|pure Black] stroke: an extra [c|+100 Form]',
  stroke(sc, s, st) { if (st.pure === 'mo') sc.c(100); } });
defSeal('qinglan', '青出于蓝', 'Bluer than Indigo', 2, 7, {
  dz: '[qing|纯青]之笔额外 [m|神+6]', de: 'Each [qing|pure Azure] stroke: an extra [m|+6 Spirit]',
  stroke(sc, s, st) { if (st.pure === 'qing') sc.m(6); } });
defSeal('jinbi', '金碧辉煌', 'Gold and Jade Resplendent', 2, 6, {
  dz: '[jin|纯金]之笔额外 [g|+1 文]、[m|神+5]', de: 'Each [jin|pure Gold] stroke: an extra [g|+$1] and [m|+5 Spirit]',
  stroke(sc, s, st) { if (st.pure === 'jin') { sc.cash(1); sc.m(5); } } });

// ================= 鸡血石 · rare =================
defSeal('litou', '力透纸背', 'Force Through the Paper', 3, 8, {
  dz: '[k|交点]上的格每次计分都再触发一次', de: 'Cells at a [k|crossing] trigger once more every time they score',
  retrig(sc, s, c) { return c.node ? 1 : 0; } });
defSeal('sansheng', '三生万物', 'Three Begets All Things', 3, 8, {
  dz: (s) => `一局之内依次写出[k|一]、[k|二]、[k|三]：自写出「三」起，本局每次挥毫 [x|神×4]${s && s.st.p ? `\n[n|进度 ${['', '一', '一 二', '一 二 三'][Math.min(3, s.st.p)]}]` : ''}`,
  de: (s) => `Write [k|一], [k|二], [k|三] in that order within a round: from the 三 onward, every flourish this round gets [x|×4 Spirit]${s && s.st.p ? `\n[n|Progress: ${Math.min(3, s.st.p)}/3]` : ''}`,
  init(s) { s.st.p = 0; },
  roundStart(run, s) { s.st.p = 0; },
  end(sc, s) {
    const want = ['yi', 'er', 'san'][s.st.p];
    if (s.st.p < 3 && sc.char === want) { s.st.p++; if (s.st.p < 3) sc.say({ zh: ['', '道生一', '一生二'][s.st.p], en: ['', 'One', 'Two'][s.st.p] }); }
    if (s.st.p >= 3) sc.x(4);
  } });
defSeal('linmo', '临摹', 'Faithful Copy', 3, 9, {
  dz: (s, run) => `复制[k|右侧]那枚印的能力${copyNote(s, run, 'zh')}`, de: (s, run) => `Copies the ability of the seal to its [k|right]${copyNote(s, run, 'en')}`,
  copy: 'right' });
defSeal('shenlai', '神来之笔', 'A Stroke of Genius', 3, 8, {
  dz: (s, run) => `每次挥毫有 ${oddsTxt(run, 1, 3)} 概率 [x|神×4]`, de: (s, run) => `Every flourish: ${oddsTxt(run, 1, 3)} chance of [x|×4 Spirit]`,
  end(sc) { if (prob(sc.run, 1, 3)) sc.x(4); else sc.say({ zh: '未至', en: 'Not yet' }); } });
defSeal('yichui', '一锤定音', 'One Stroke of the Gavel', 3, 9, {
  dz: '每局只能挥毫 [k|1 次]\n[x|神×5]', de: 'Only [k|1 flourish] per round\n[x|×5 Spirit]',
  mod(run, s, key, v) { return key === 'ignites' ? 1 : v; },
  end(sc) { sc.x(5); } });
defSeal('langhao', '狼毫', 'Wolf-hair Brush', 3, 8, {
  dz: '两条[k|对角线]填满时也成笔画：[k|撇]与[k|捺]\n[n|可写出 丿 乀 乂 米]', de: 'A filled main [k|diagonal] also becomes a stroke\n[n|Unlocks the characters 丿 乀 乂 米]',
  mods: { diag: 1 } });
defSeal('bamian', '八面出锋', 'A Tip on All Eight Sides', 3, 8, {
  dz: '纸面[k|四条边线]每写出一条 [x|神×1.3]', de: '[x|×1.3 Spirit] for each of the sheet\'s [k|four border lines] among your strokes',
  end(sc) {
    let k = 0;
    if (sc.rows.includes(0)) k++; if (sc.rows.includes(sc.h - 1)) k++;
    if (sc.cols.includes(0)) k++; if (sc.cols.includes(sc.w - 1)) k++;
    for (let i = 0; i < k; i++) sc.x(1.3);
  } });
defSeal('tiechu', '铁杵磨针', 'Grinding the Iron Pestle', 3, 8, {
  dz: (s) => `[x|神×${(Math.round(stv(s, 'x', 1) * 100) / 100)}]\n每次挥毫后此印再 [k|+0.06]`, de: (s) => `[x|×${(Math.round(stv(s, 'x', 1) * 100) / 100)} Spirit]\nGrows by [k|+0.06] after every flourish`,
  init(s) { s.st.x = 1; },
  end(sc, s) { if (s.st.x > 1.0001) sc.x(Math.round(s.st.x * 100) / 100); s.st.x += 0.06; } });
defSeal('pofu', '破釜沉舟', 'Smash the Pots, Sink the Boats', 3, 8, {
  dz: '[k|墨量减半]\n[x|神×3]', de: '[k|Ink is halved]\n[x|×3 Spirit]',
  mod(run, s, key, v) { return key === 'inkMax' ? Math.floor(v / 2) : v; },
  end(sc) { sc.x(3); } });
defSeal('wangzhe', '王者之风', 'The Bearing of a King', 3, 8, {
  dz: '写出[k|王]时 [x|神×3]', de: 'When you write [k|王]: [x|×3 Spirit]',
  end(sc) { if (sc.char === 'wang') sc.x(3); } });
defSeal('shoubai', '知白守黑', 'Know the White, Keep the Black', 3, 8, {
  dz: '挥毫后纸面[k|不留一墨]时 [x|神×3]', de: 'If the sheet is left [k|completely empty] by the flourish: [x|×3 Spirit]',
  end(sc) { if (sc.cleanAfter) sc.x(3); } });
defSeal('yigu', '一鼓作气', 'The First Drumbeat', 3, 8, {
  dz: '每局第一次挥毫 [x|神×3]，第二次 [x|神×2]\n[n|一鼓作气，再而衰，三而竭]', de: 'Your first flourish each round: [x|×3 Spirit]; your second: [x|×2 Spirit]\n[n|"The first drum rouses courage, the second weakens it, the third exhausts it."]',
  end(sc) { if (sc.igniteIdx === 0) sc.x(3); else if (sc.igniteIdx === 1) sc.x(2); } });
defSeal('danmo', '淡墨', 'Pale Ink', 3, 9, {
  dz: '每块墨的耗墨 [k|−1]（至少为 1）', de: 'Every block costs [k|1 less Ink] (minimum 1)', mods: { costAdd: -1 } });
defSeal('yisi', '一丝不苟', 'Not One Thread Out of Place', 3, 8, {
  dz: '所有笔画皆为[k|纯色]时 [x|神×2.5]', de: 'If every stroke is [k|pure] in ink: [x|×2.5 Spirit]',
  end(sc) { if (sc.strokes.every((st) => st.pure)) sc.x(2.5); } });
defSeal('shina', '十拿九稳', 'Nine Chances in Ten', 3, 7, {
  dz: '所有[k|概率]翻倍\n[n|1/4 变为 2/4]', de: 'All listed [k|chances] are doubled\n[n|1 in 4 becomes 2 in 4]', mods: { probMul: 1 } });

// ================= 田黄 · legendary =================
defSeal('xizhi', '王羲之', 'Wang Xizhi', 4, 20, {
  dz: '[k|字格倍率]取平方\n[n|王 ×3 → ×9，田 ×4 → ×16……书圣笔下，字字千钧]', de: 'The [k|character multiplier] of what you write is squared\n[n|王 ×3 → ×9, 田 ×4 → ×16 … the Sage of Calligraphy]',
  charX(sc, s, x) { return x * x; } });
defSeal('zhenqing', '颜真卿', 'Yan Zhenqing', 4, 20, {
  dz: '所有[k|横]上的格再触发一次\n[n|颜筋：横轻竖重，气象浑厚]', de: 'Every cell of every [k|row stroke] triggers once more\n[n|"The sinews of Yan"]',
  retrig(sc, s, c, st) { return st.kind === 'row' ? 1 : 0; } });
defSeal('gongquan', '柳公权', 'Liu Gongquan', 4, 20, {
  dz: '所有[k|竖]上的格再触发一次\n[n|柳骨：心正则笔正]', de: 'Every cell of every [k|column stroke] triggers once more\n[n|"The bones of Liu": an upright heart makes an upright brush]',
  retrig(sc, s, c, st) { return st.kind === 'col' ? 1 : 0; } });
defSeal('huaisu', '怀素', 'Huaisu', 4, 20, {
  dz: '写出[k|散笔]时，[x|神×笔画数]\n[n|狂来轻世界，醉里得真如]', de: 'When you write a [k|scribble]: [x|× its stroke count]\n[n|The wild monk of cursive script]',
  end(sc) { if (!sc.isChar && sc.n >= 2) sc.x(sc.n); } });
defSeal('mifu', '米芾', 'Mi Fu', 4, 20, {
  dz: '每次挥毫后回复 [k|笔画数×4] 的墨\n[n|米颠刷字，八面出锋]', de: 'After every flourish, restore Ink equal to [k|4 × strokes]\n[n|"Others write; Mi Fu sweeps."]',
  end(sc) { const v = 4 * sc.n; sc.say({ zh: `回墨 ${v}`, en: `+${v} Ink` }); sc.later((run) => addInk(run, v)); } });
defSeal('zhangxu', '张旭', 'Zhang Xu', 4, 20, {
  dz: '每次挥毫 [x|神×2 至 ×6]（随机）\n[n|脱帽露顶王公前，挥毫落纸如云烟]', de: 'Every flourish: [x|×2 to ×6 Spirit] at random\n[n|The drunken Sage of Cursive]',
  end(sc) { sc.x(2 + rndInt(sc.run, 'proc', 5)); } });
defSeal('weifuren', '卫夫人', 'Lady Wei', 4, 20, {
  dz: '每张[k|字帖]多提升 [k|1 级]\n[n|《笔阵图》作者，王羲之之师]', de: 'Every [k|copybook] grants [k|1 extra level]\n[n|Author of the "Battle Array of the Brush", teacher of Wang Xizhi]',
  mods: { tieBonus: 1 } });

function copyNote(s, run, lang) {
  if (!s || !run) return '';
  const t = copyTarget(run, s);
  if (!t) return lang === 'zh' ? '\n[n|右侧无可复制之印]' : '\n[n|Nothing to copy]';
  return lang === 'zh' ? `\n[n|当前复制：${SEALS[t.id].zh}]` : `\n[n|Copying: ${SEALS[t.id].en}]`;
}

// 拓 (editions of a seal); `te` is the short English label shown on the corner tag
const EDITIONS = {
  jing: { zh: '精拓', en: 'Fine Rubbing', te: 'Fine', dz: '[c|形+40]', de: '[c|+40 Form]', w: 5, add: 2 },
  zhu:  { zh: '朱拓', en: 'Red Rubbing', te: 'Red',  dz: '[m|神+8]', de: '[m|+8 Spirit]', w: 3.5, add: 3 },
  jin:  { zh: '金拓', en: 'Gold Rubbing', te: 'Gold', dz: '[x|神×1.5]', de: '[x|×1.5 Spirit]', w: 1.2, add: 5 },
  xian: { zh: '闲章', en: 'Leisure Seal', te: 'Leisure', dz: '不占印位', de: 'Takes no seal slot', w: 0.6, add: 5 },
};

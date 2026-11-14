// ---------- 字 (characters): the "hands" of the game ----------
// A character is recognised from the set of complete rows (横) and columns (竖).
// Signature = which edge lines are present + how many interior lines:
//   rows: [top, interior count, bottom]   cols: [left, interior count, right]
const CH = {};
const CH_ORDER = [];
const SIG = new Map();
const sigKey = (T, ri, B, L, ci, R, d) => `${T}${ri}${B}|${L}${ci}${R}|${d}`;
function anyLines(k) {
  const out = [];
  for (let a = 0; a <= 1; a++) for (let b = 0; b <= 1; b++) { const i = k - a - b; if (i >= 0) out.push([a, i, b]); }
  return out;
}
const NONE = [[0, 0, 0]];
function defChar(id, g, py, n, x, rowSpecs, colSpecs, o) {
  const def = Object.assign({ id, g, py, n, x, rowSpecs, colSpecs, d: 0, num: 0, tags: [], yi: null, secret: false }, o || {});
  CH[id] = def;
  CH_ORDER.push(id);
  for (const r of rowSpecs) for (const c of colSpecs) {
    const k = sigKey(r[0], r[1], r[2], c[0], c[1], c[2], def.d);
    if (!SIG.has(k)) SIG.set(k, id);
  }
}
// ---- 1 stroke
defChar('yi', '一', 'yī', 1, 1, anyLines(1), NONE, { num: 1, tags: ['num', 'heng'],
  zh: '一', en: 'One', gz: '数之始也。惟初太始，道立于一。', ge: 'The beginning of number. "In the primal beginning the Way was founded upon One."' });
defChar('gun', '丨', 'gǔn', 1, 1, NONE, anyLines(1), { tags: ['shu'],
  zh: '丨', en: 'Rod', gz: '上下通也。引而上行读若囟，引而下行读若退。', ge: 'That which runs through from top to bottom — the bare vertical stroke.' });
// ---- 2 strokes
defChar('er', '二', 'èr', 2, 1, anyLines(2), NONE, { num: 2, tags: ['num', 'heng'],
  zh: '二', en: 'Two', gz: '地之数也。一生二，二生三。', ge: 'The number of Earth. One begets Two, Two begets Three.' });
defChar('dao', '刂', 'dāo', 2, 1, NONE, anyLines(2), { tags: ['shu'],
  zh: '刂', en: 'Blade', gz: '立刀也，「刀」字在右之形。', ge: 'The standing knife — the form the blade takes at the side of a character.' });
defChar('shi', '十', 'shí', 2, 1.5, [[0, 1, 0]], [[0, 1, 0]], { num: 10, tags: ['num', 'cross'],
  zh: '十', en: 'Ten', gz: '数之具也。一为东西，丨为南北，则四方中央备矣。', ge: 'The fullness of number: one line east–west, one north–south, and the four quarters and the centre are complete.' });
defChar('ding', '丁', 'dīng', 2, 1.5, [[1, 0, 0]], [[0, 1, 0]], { tags: ['cross'],
  zh: '丁', en: 'Nail', gz: '夏时万物皆丁实。其形如钉。', ge: 'In summer all things stand firm and full. Its shape is a nail.' });
defChar('shang', '丄', 'shàng', 2, 1.5, [[0, 0, 1]], [[0, 1, 0]], { tags: ['cross'], yi: 'tier2',
  zh: '丄', en: 'Above', gz: '「上」之古字。高也，指事。', ge: 'The ancient form of 上, "above".' });
defChar('han', '厂', 'hǎn', 2, 1.5, [[1, 0, 0]], [[1, 0, 0]], { tags: ['corner'],
  zh: '厂', en: 'Cliff', gz: '山石之厓岩，人可居。', ge: 'A rocky overhang of the mountain, where one may dwell.' });
defChar('zhe', '乛', 'zhé', 2, 1.5, [[1, 0, 0]], [[0, 0, 1]], { tags: ['corner'],
  zh: '乛', en: 'Turn', gz: '横折之笔。百钧弩发。', ge: 'The turning stroke — "a crossbow of a hundred weights let loose".' });
defChar('yin', '乚', 'yǐn', 2, 1.5, [[0, 0, 1]], [[1, 0, 0]], { tags: ['corner'], yi: 'ignite',
  zh: '乚', en: 'Hidden', gz: '「隐」之古字。匿也，象迟曲隐蔽形。', ge: 'The ancient form of 隐, "to hide": a bent line slipping out of sight.' });
defChar('jue', '亅', 'jué', 2, 1.5, [[0, 0, 1]], [[0, 0, 1]], { tags: ['corner'],
  zh: '亅', en: 'Barb', gz: '钩逆者谓之亅。', ge: 'A hook turned back against itself.' });
defChar('bu', '卜', 'bǔ', 2, 1.5, [[0, 1, 0]], [[1, 0, 0], [0, 0, 1]], { tags: ['cross'], yi: 'peek',
  zh: '卜', en: 'Augury', gz: '灼剥龟也，象灸龟之形。甲骨文中左右无别。', ge: 'To scorch the tortoise shell and read its cracks. On oracle bones it faces either way.' });
// ---- 3 strokes
defChar('san', '三', 'sān', 3, 1, anyLines(3), NONE, { num: 3, tags: ['num', 'heng'],
  zh: '三', en: 'Three', gz: '天地人之道也。三生万物。', ge: 'The Way of Heaven, Earth and Man. Three begets the ten thousand things.' });
defChar('chuan', '川', 'chuān', 3, 1, NONE, anyLines(3), { tags: ['shu', 'di'], yi: 'discard',
  zh: '川', en: 'River', gz: '贯穿通流水也。', ge: 'Water that pierces through and flows on.' });
defChar('gong', '工', 'gōng', 3, 2, [[1, 0, 1]], [[0, 1, 0]], { tags: ['cross'],
  zh: '工', en: 'Craft', gz: '巧饰也，象人有规矩也。', ge: 'Skilful work: the image of one who keeps compass and square.' });
defChar('tu', '土', 'tǔ', 3, 1.5, [[0, 1, 1]], [[0, 1, 0]], { tags: ['cross', 'di'],
  zh: '土', en: 'Earth', gz: '地之吐生物者也。', ge: 'That part of the ground which brings forth living things.' });
defChar('gan', '干', 'gān', 3, 1.5, [[1, 1, 0], [0, 2, 0]], [[0, 1, 0]], { tags: ['cross'],
  zh: '干', en: 'Shield', gz: '犯也。一曰盾也。', ge: 'To offend against; also, a shield.' });
defChar('fang', '匚', 'fāng', 3, 2, [[1, 0, 1]], [[1, 0, 0]], { tags: ['frame3'],
  zh: '匚', en: 'Coffer', gz: '受物之器，象形。', ge: 'A vessel that receives things; a pictograph.' });
defChar('jiong', '冂', 'jiōng', 3, 2, [[1, 0, 0]], [[1, 0, 1]], { tags: ['frame3'],
  zh: '冂', en: 'Wilds', gz: '邑外谓之郊，郊外谓之野，野外谓之林，林外谓之冂。', ge: 'Beyond the town the suburbs, beyond those the fields, then the forest — and beyond the forest, this.' });
defChar('kan', '凵', 'kǎn', 3, 2, [[0, 0, 1]], [[1, 0, 1]], { tags: ['frame3'],
  zh: '凵', en: 'Pit', gz: '张口也，象形。', ge: 'An open mouth; a pit in the ground.' });
defChar('ji', '丌', 'jī', 3, 1.5, [[1, 0, 0]], [[0, 2, 0], [1, 1, 0], [0, 1, 1]], { tags: [],
  zh: '丌', en: 'Stand', gz: '下基也，荐物之丌，象形。', ge: 'A base beneath: the stand on which offerings are set.' });
defChar('nian', '廿', 'niàn', 3, 1.5, [[0, 1, 0]], anyLines(2), { num: 20, tags: ['num'],
  zh: '廿', en: 'Twenty', gz: '二十并也。', ge: 'Two tens joined together.' });
// ---- 4 strokes
defChar('si4', '亖', 'sì', 4, 1, anyLines(4), NONE, { num: 4, tags: ['num', 'heng'],
  zh: '亖', en: 'Four (old)', gz: '「四」之古字，积画成数。', ge: 'The ancient form of 四, "four" — simply four strokes piled up.' });
defChar('wang', '王', 'wáng', 4, 3, [[1, 1, 1]], [[0, 1, 0]], { tags: ['cross'],
  zh: '王', en: 'King', gz: '天下所归往也。三画而连其中谓之王：三者天地人也，而参通之者王也。', ge: 'He to whom all under heaven turns. Three lines — Heaven, Earth, Man — and the one who joins them is King.' });
defChar('feng', '丰', 'fēng', 4, 1.5, [[0, 3, 0], [1, 2, 0], [0, 2, 1]], [[0, 1, 0]], { tags: ['cross'], yi: 'money2',
  zh: '丰', en: 'Plenty', gz: '艸盛丰丰也。', ge: 'Grass growing thick and lush: abundance.' });
defChar('ji4', '彐', 'jì', 4, 2, [[1, 1, 1]], [[0, 0, 1]], { tags: [], yi: 'sweep',
  zh: '彐', en: 'Snout', gz: '豕之头，象其锐而上见也。今「雪」「帚」「扫」诸字皆从之。', ge: 'The snout of a boar, pointed and raised. It lives on inside 雪 (snow), 帚 (broom) and 扫 (to sweep).' });
defChar('shan', '山', 'shān', 4, 2.5, [[0, 0, 1]], [[1, 1, 1]], { tags: ['di'],
  zh: '山', en: 'Mountain', gz: '宣也。宣气散，生万物，有石而高。', ge: 'That which spreads the vital breath and gives life to all things; stony and high.' });
defChar('jin', '巾', 'jīn', 4, 2.5, [[1, 0, 0]], [[1, 1, 1]], { tags: [], yi: 'wipe',
  zh: '巾', en: 'Cloth', gz: '佩巾也。拂拭之用。', ge: 'A kerchief worn at the belt — for wiping things clean.' });
defChar('sa', '卅', 'sà', 4, 1.5, [[0, 1, 0]], anyLines(3), { num: 30, tags: ['num'],
  zh: '卅', en: 'Thirty', gz: '三十并也。', ge: 'Three tens joined together.' });
defChar('kou', '口', 'kǒu', 4, 2, [[1, 0, 1]], [[1, 0, 1]], { tags: ['frame'], yi: 'money2',
  zh: '口', en: 'Mouth', gz: '人所以言食也。', ge: 'That with which people speak and eat.' });
defChar('jing', '井', 'jǐng', 4, 2, [[0, 2, 0]], [[0, 2, 0]], { tags: ['di', 'jing'], yi: 'ink',
  zh: '井', en: 'Well', gz: '八家一井，象构韩形。', ge: 'Eight households share one well; the image of its timber frame.' });
defChar('kai', '开', 'kāi', 4, 2, [[1, 1, 0]], [[0, 2, 0]], { tags: ['jing'], yi: 'tie',
  zh: '开', en: 'Open', gz: '张也。开卷有益。', ge: 'To spread apart. "To open a book is always of benefit."' });
// ---- 5 strokes
defChar('ri', '日', 'rì', 5, 3, [[1, 1, 1]], [[1, 0, 1]], { tags: ['frame'], yi: 'buff',
  zh: '日', en: 'Sun', gz: '实也。太阳之精不亏。', ge: 'Fullness: the essence of the great Yang, which never wanes.' });
defChar('xi', '卌', 'xì', 5, 2, [[0, 1, 0]], anyLines(4), { num: 40, tags: ['num'],
  zh: '卌', en: 'Forty', gz: '四十并也。', ge: 'Four tens joined together.' });
defChar('gui', '圭', 'guī', 5, 2, anyLines(4), [[0, 1, 0]], { tags: ['di'], yi: 'tierUp',
  zh: '圭', en: 'Jade Tablet', gz: '瑞玉也，上圆下方。奉为圭臬。', ge: 'The auspicious jade, round above and square below — the very standard of what is right.' });
// ---- 6 strokes
defChar('mu', '目', 'mù', 6, 3.5, [[1, 2, 1]], [[1, 0, 1]], { tags: ['frame'], yi: 'tray',
  zh: '目', en: 'Eye', gz: '人眼，象形。重童子也。', ge: 'The human eye; a pictograph.' });
defChar('tian', '田', 'tián', 6, 4, [[1, 1, 1]], [[1, 1, 1]], { tags: ['frame', 'di'], yi: 'money4',
  zh: '田', en: 'Field', gz: '陈也。树谷曰田，象四口；十，阡陌之制也。', ge: 'Where grain is planted: four plots, and the cross is the path between them.' });
defChar('si', '四', 'sì', 6, 3, [[1, 0, 1]], [[1, 2, 1]], { num: 4, tags: ['frame', 'num'], secret: true,
  zh: '四', en: 'Four', gz: '阴数也，象四分之形。', ge: 'The number of Yin; the image of a thing divided in four.' });
defChar('yong', '用', 'yòng', 6, 3.5, [[1, 2, 0]], [[1, 1, 1]], { tags: [], yi: 'item', secret: true,
  zh: '用', en: 'Use', gz: '可施行也。物尽其用。', ge: 'That which can be put into practice. Let everything serve its purpose.' });
// ---- 8 strokes
defChar('wei', '囲', 'wéi', 8, 5, [[1, 2, 1]], [[1, 2, 1]], { tags: ['frame', 'jing'], secret: true,
  zh: '囲', en: 'Enclosure', gz: '「围」之异体，井在口中。守也。', ge: 'A variant of 围: a well within walls. To surround and to guard.' });
// ---- with the two diagonals (撇 and 捺), available only with the Wolf-hair Brush
defChar('pie', '丿', 'piě', 1, 1.5, NONE, NONE, { d: 2, tags: ['diag'], secret: true,
  zh: '丿', en: 'Left-falling', gz: '右戾也，象左引之形。撇如陆断犀象。', ge: 'The stroke drawn down to the left — "like a rhinoceros horn snapped on dry land".' });
defChar('na', '乀', 'fú', 1, 1.5, NONE, NONE, { d: 1, tags: ['diag'], secret: true,
  zh: '乀', en: 'Right-falling', gz: '左戾也。捺如崩浪雷奔。', ge: 'The stroke pressed down to the right — "like crashing waves and rolling thunder".' });
defChar('yi4', '乂', 'yì', 2, 2.5, NONE, NONE, { d: 3, tags: ['diag'], secret: true,
  zh: '乂', en: 'Order', gz: '芟草也。又治也，安也：俊乂在官。', ge: 'To mow grass; hence to govern, to bring peace.' });
defChar('mi', '米', 'mǐ', 4, 5, [[0, 1, 0]], [[0, 1, 0]], { d: 3, tags: ['diag', 'cross'], secret: true,
  zh: '米', en: 'Rice', gz: '粟实也，象禾实之形。习字者以米字格为范。', ge: 'The grain of millet. Every student of writing begins on rice-pattern squares.' });
// ---- specials
defChar('xuan', '玄', 'xuán', 16, 2.5, [], [], { tags: ['full'], yi: 'allTier', secret: true,
  zh: '玄', en: 'The Dark', gz: '幽远也。黑而有赤色者为玄。满纸皆墨，玄之又玄，众妙之门。', ge: 'The deep and distant. A sheet wholly black: "mystery upon mystery, the gate of all wonders."' });
defChar('sanbi', '〇', '', 0, 1, [], [], { tags: ['san'],
  zh: '散笔', en: 'Scribble', gz: '笔画纵横而不成字。', ge: 'Strokes that cross and scatter, yet form no character.' });
CH.sanbi.g = '';

// 字义 (a character's own meaning-effect, triggers the first time it is written each round)
const YI = {
  ink:     { dz: '汲水：添 [k|16 墨]', de: 'Draw water: [k|+16 Ink]' },
  discard: { dz: '川流：本局 [k|洗笔+1]', de: 'Flow: [k|+1 Rinse] this round' },
  sweep:   { dz: '洒扫：本局 [k|洗笔+1]', de: 'Sweep: [k|+1 Rinse] this round' },
  money2:  { dz: '所获：[g|+2 文]', de: 'Earnings: [g|+$2]' },
  money4:  { dz: '丰收：[g|+4 文]', de: 'Harvest: [g|+$4]' },
  tierUp:  { dz: '圭臬：随机一个画数等级 [k|+1]', de: 'Standard: a random stroke tier gains [k|+1 level]' },
  tier2:   { dz: '上进：二画等级 [k|+1]', de: 'Ascend: the 2-stroke tier gains [k|+1 level]' },
  buff:    { dz: '日新：本局此后每次挥毫 [m|神+6]', de: 'Daybreak: [m|+6 Spirit] on every later flourish this round' },
  tray:    { dz: '洞察：本局 [k|笔架+1 格]', de: 'Insight: [k|+1 tray slot] this round' },
  item:    { dz: '致用：获得一件随机文房（须有空位）', de: 'Put to use: gain a random studio item (needs room)' },
  tie:     { dz: '开卷：获得一张随机字帖（须有空位）', de: 'Open a book: gain a random copybook (needs room)' },
  peek:    { dz: '问卜：本局可预见接下来的 [k|5 块] 墨', de: 'Divine: foresee the next [k|5 blocks] this round' },
  wipe:    { dz: '拂拭：拭去纸上所有散墨', de: 'Wipe: clear all stray ink from the paper' },
  ignite:  { dz: '藏锋：本次挥毫不消耗次数', de: 'Concealed tip: this flourish is free' },
  allTier: { dz: '众妙：所有画数等级 [k|+1]', de: 'Gate of wonders: every stroke tier gains [k|+1 level]' },
};

// classify a set of complete lines on a w×h sheet
function classifyLines(w, h, rows, cols, diags) {
  const nR = rows.length, nC = cols.length, nD = diags ? diags.length : 0;
  const n = nR + nC + nD;
  if (!n) return null;
  if (nR === h && nC === w) return { id: 'xuan', n };
  const T = rows.includes(0) ? 1 : 0, B = rows.includes(h - 1) ? 1 : 0;
  const L = cols.includes(0) ? 1 : 0, R = cols.includes(w - 1) ? 1 : 0;
  let d = 0;
  if (nD) { if (diags.includes(0)) d |= 1; if (diags.includes(1)) d |= 2; }
  const id = SIG.get(sigKey(T, nR - T - B, B, L, nC - L - R, R, d));
  return { id: id || 'sanbi', n };
}

// a canonical layout of a character on a w×h sheet (for diagrams and hints)
function charLayout(id, w, h) {
  const def = CH[id];
  if (id === 'xuan') return { rows: range(h), cols: range(w), diags: [] };
  if (id === 'sanbi') return { rows: [1, 2], cols: [w - 2, w - 1], diags: [] };
  const spread = (spec, len) => {
    const out = [];
    if (spec[0]) out.push(0);
    const k = spec[1];
    for (let i = 0; i < k; i++) out.push(Math.max(1, Math.min(len - 2, Math.round(((i + 1) * (len - 1)) / (k + 1)))));
    if (spec[2]) out.push(len - 1);
    return [...new Set(out)].sort((a, b) => a - b);
  };
  const r = def.rowSpecs[0] || [0, 0, 0];
  const c = def.colSpecs[0] || [0, 0, 0];
  const diags = [];
  if (def.d & 1) diags.push(0);
  if (def.d & 2) diags.push(1);
  return { rows: spread(r, h), cols: spread(c, w), diags };
}

// every concrete placement of a character on a w×h sheet (rows/cols index sets), used by hints and the practice bot
const _recipeCache = new Map();
function charRecipes(id, w, h) {
  const key = id + ':' + w + 'x' + h;
  if (_recipeCache.has(key)) return _recipeCache.get(key);
  const def = CH[id];
  const out = [];
  const combos = (pool, k) => {
    const res = [];
    const rec = (start, acc) => {
      if (acc.length === k) { res.push(acc.slice()); return; }
      for (let i = start; i < pool.length; i++) { acc.push(pool[i]); rec(i + 1, acc); acc.pop(); }
    };
    rec(0, []);
    return res;
  };
  const expand = (spec, len) => {
    if (spec[1] > len - 2) return [];
    const inner = combos(range(len - 2).map((i) => i + 1), spec[1]);
    return inner.map((mid) => {
      const a = [];
      if (spec[0]) a.push(0);
      a.push(...mid);
      if (spec[2]) a.push(len - 1);
      return a;
    });
  };
  if (id === 'xuan') out.push({ rows: range(h), cols: range(w), diags: [] });
  else if (id !== 'sanbi') {
    const diags = [];
    if (def.d & 1) diags.push(0);
    if (def.d & 2) diags.push(1);
    const seen = new Set();
    for (const rs of def.rowSpecs) for (const cs of def.colSpecs) {
      if (SIG.get(sigKey(rs[0], rs[1], rs[2], cs[0], cs[1], cs[2], def.d)) !== id) continue;
      for (const rows of expand(rs, h)) for (const cols of expand(cs, w)) {
        if (rows.length === h && cols.length === w) continue;
        const k2 = rows.join(',') + '|' + cols.join(',');
        if (seen.has(k2)) continue;
        seen.add(k2);
        out.push({ rows, cols, diags });
      }
    }
  }
  _recipeCache.set(key, out);
  return out;
}

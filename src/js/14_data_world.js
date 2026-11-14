// ---------- 永字八法: the eight principles (antes) ----------
const FA = [null,
  { g: '侧', zh: '侧', en: 'Cè · the Dot', lz: '点为侧，如鸟之翻然侧下', le: 'The dot: a bird wheeling down on its side' },
  { g: '勒', zh: '勒', en: 'Lè · the Horizontal', lz: '横为勒，如勒马之用缰', le: 'The horizontal: reining in a horse' },
  { g: '努', zh: '努', en: 'Nǔ · the Vertical', lz: '竖为努，用力也', le: 'The vertical: drawing a crossbow with all one\'s strength' },
  { g: '趯', zh: '趯', en: 'Tì · the Hook', lz: '钩为趯，如人之踢脚', le: 'The hook: a sudden kick of the foot' },
  { g: '策', zh: '策', en: 'Cè · the Rising Stroke', lz: '提为策，如策马之用鞭', le: 'The upward flick: whipping a horse on' },
  { g: '掠', zh: '掠', en: 'Lüè · the Long Sweep', lz: '长撇为掠，如篦之掠发', le: 'The long left sweep: a comb drawn through hair' },
  { g: '啄', zh: '啄', en: 'Zhuó · the Short Peck', lz: '短撇为啄，如鸟之啄物', le: 'The short left stroke: a bird pecking' },
  { g: '磔', zh: '磔', en: 'Zhé · the Pressing Stroke', lz: '捺为磔，磔者，裂牲之谓', le: 'The right-falling stroke: pressing and opening out' },
];
const BLIND_NAME = [
  { zh: '习字', en: 'Practice' },
  { zh: '课业', en: 'Assignment' },
  { zh: '名帖', en: 'Masterwork' },
];
const BLIND_MULT = [1, 1.5, 2];
const BLIND_REWARD = [3, 4, 5];
const ANTE_BASE = [0, 300, 900, 2500, 6000, 12000, 22000, 36000, 56000];
function anteBase(a) {
  if (a <= 8) return ANTE_BASE[a];
  // endless: steepening growth
  let v = ANTE_BASE[8];
  for (let i = 9; i <= a; i++) v *= 2.2 + 0.25 * (i - 9);
  return v;
}
function roundTarget(v) {
  if (v < 1000) return Math.round(v / 10) * 10;
  const e = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / e) * e;
}

// ---------- 名帖 (boss sheets) ----------
const BOSSES = {};
const BOSS_ORDER = [];
function defBoss(id, zh, en, min, o) { BOSSES[id] = Object.assign({ id, zh, en, min, flags: {} }, o); BOSS_ORDER.push(id); }
function scatter(run, n, fn, distinct) {
  const rd = run.round, w = run.w, h = run.h;
  const usedR = new Set(), usedC = new Set();
  let guard = 0;
  while (n > 0 && guard++ < 500) {
    const i = rndInt(run, 'boss', w * h);
    if (rd.board[i] || rd.holes[i]) continue;
    const x = i % w, y = Math.floor(i / w);
    if (distinct && (usedR.has(y) || usedC.has(x))) continue;
    usedR.add(y); usedC.add(x);
    fn(i); n--;
  }
}
const stoneCell = () => ({ stone: true, ink: null, enh: null, pid: 0, shape: null });
defBoss('shigu', '石鼓文', 'Stone Drum Inscriptions', 1, {
  author: { zh: '先秦 · 佚名', en: 'Pre-Qin, anonymous' },
  dz: '开局时纸上散落 [k|8 块顽石]\n[n|顽石占格、可成笔画，但不计分]', de: 'The sheet begins with [k|8 stones]\n[n|Stones fill squares and complete lines, but score nothing]',
  start(run) { scatter(run, 8, (i) => { run.round.board[i] = stoneCell(); }); } });
defBoss('kuaixue', '快雪时晴帖', 'Clearing After Snow', 1, {
  author: { zh: '东晋 · 王羲之', en: 'Wang Xizhi, Eastern Jin' },
  dz: '[k|墨量−25]\n[n|全帖仅二十八字]', de: '[k|−25 Ink]\n[n|The whole letter is only twenty-eight characters]', mods: { inkMax: -25 } });
defBoss('pingfu', '平复帖', 'Letter on Recovery', 1, {
  author: { zh: '西晋 · 陆机', en: 'Lu Ji, Western Jin' },
  dz: '纸上有 [k|3 处虫蛀]：无法落墨，其所在的行与列写不成笔画', de: '[k|3 wormholes] take no ink: their rows and columns can never be completed',
  start(run) { scatter(run, 3, (i) => { run.round.holes[i] = 1; }, true); } });
defBoss('sangluan', '丧乱帖', 'Letter in Turmoil', 1, {
  author: { zh: '东晋 · 王羲之', en: 'Wang Xizhi, Eastern Jin' },
  dz: '[mo|墨]色的格不计分', de: '[mo|Black] cells score nothing', flags: { inkDead: 'mo' } });
defBoss('yatou', '鸭头丸帖', 'Duck-Head Pill Note', 1, {
  author: { zh: '东晋 · 王献之', en: 'Wang Xianzhi, Eastern Jin' },
  dz: '[zhu|朱]色的格不计分', de: '[zhu|Vermilion] cells score nothing', flags: { inkDead: 'zhu' } });
defBoss('zhongqiu', '中秋帖', 'Mid-Autumn Letter', 1, {
  author: { zh: '东晋 · 王献之', en: 'Wang Xianzhi, Eastern Jin' },
  dz: '[qing|青]色的格不计分', de: '[qing|Azure] cells score nothing', flags: { inkDead: 'qing' } });
defBoss('boyuan', '伯远帖', 'Letter to Boyuan', 1, {
  author: { zh: '东晋 · 王珣', en: 'Wang Xun, Eastern Jin' },
  dz: '[jin|金]色的格不计分', de: '[jin|Gold] cells score nothing', flags: { inkDead: 'jin' } });
defBoss('haotai', '好大王碑', 'Stele of King Gwanggaeto', 2, {
  author: { zh: '高句丽 · 佚名', en: 'Anonymous, Goguryeo' },
  dz: '目标分数为平常名帖的 [k|1.5 倍]\n[n|碑高六米有余]', de: 'The target is [k|1.5×] that of an ordinary masterwork\n[n|The stele stands over six metres tall]', targetMul: 1.5 });
defBoss('dutong', '肚痛帖', 'Stomach-ache Note', 2, {
  author: { zh: '唐 · 张旭', en: 'Zhang Xu, Tang' },
  dz: '[k|挥毫−1]\n[n|忽肚痛不可堪]', de: '[k|−1 Flourish]\n[n|"A sudden pain in my belly, quite unbearable…"]', mods: { ignites: -1 } });
defBoss('zixu', '自叙帖', 'Autobiography', 2, {
  author: { zh: '唐 · 怀素', en: 'Huaisu, Tang' },
  dz: '墨块入架时随机转向，且[k|无法旋转]\n[n|狂草，奔蛇走虺]', de: 'Blocks arrive turned at random and [k|cannot be rotated]\n[n|Wild cursive: serpents racing]', flags: { noRotate: 1 } });
defBoss('jiucheng', '九成宫醴泉铭', 'Sweet Spring at Jiucheng Palace', 2, {
  author: { zh: '唐 · 欧阳询', en: 'Ouyang Xun, Tang' },
  dz: '[k|散笔不计分]：只有成字才算数\n[n|楷法极则，法度森严]', de: '[k|Scribbles score nothing]: only true characters count\n[n|The strictest model of regular script]', flags: { sanDead: 1 } });
defBoss('shusu', '蜀素帖', 'Poems on Sichuan Silk', 2, {
  author: { zh: '北宋 · 米芾', en: 'Mi Fu, Northern Song' },
  dz: '每块墨[k|多耗 1 墨]\n[n|蜀素涩滞，极难受墨]', de: 'Every block costs [k|1 more Ink]\n[n|Raw Sichuan silk drinks ink reluctantly]', mods: { costAdd: 1 } });
defBoss('zhangqian', '张迁碑', 'Stele of Zhang Qian', 2, {
  author: { zh: '东汉 · 佚名', en: 'Anonymous, Eastern Han' },
  dz: '[k|笔架−1 格]\n[n|方整朴拙]', de: '[k|−1 tray slot]\n[n|Square, blunt and plain]', mods: { tray: -1 } });
defBoss('zhangmeng', '张猛龙碑', 'Stele of Zhang Menglong', 3, {
  author: { zh: '北魏 · 佚名', en: 'Anonymous, Northern Wei' },
  dz: '每次挥毫后失去 [g|2 文]', de: 'Lose [g|$2] after every flourish',
  afterIgnite(run, out) { const v = Math.min(2, Math.max(0, run.money)); if (v > 0) { run.money -= v; out.push({ t: 'bossCash', v: -v }); } } });
defBoss('duobao', '多宝塔碑', 'Stele of the Many-Treasures Pagoda', 3, {
  author: { zh: '唐 · 颜真卿', en: 'Yan Zhenqing, Tang' },
  dz: '[k|至少三画]的字才计分', de: 'Only characters of [k|3 strokes or more] score', flags: { minStrokes: 3 } });
defBoss('caoquan', '曹全碑', 'Stele of Cao Quan', 3, {
  author: { zh: '东汉 · 佚名', en: 'Anonymous, Eastern Han' },
  dz: '[k|竖]上的格不计分\n[n|隶书重横，蚕头燕尾]', de: 'Cells scored as part of a [k|column] give nothing\n[n|Clerical script lives in its horizontals]', flags: { colsDead: 1 } });
defBoss('xuanmi', '玄秘塔碑', 'Stele of the Xuanmi Pagoda', 3, {
  author: { zh: '唐 · 柳公权', en: 'Liu Gongquan, Tang' },
  dz: '[k|横]上的格不计分\n[n|柳骨挺拔，竖画如铁]', de: 'Cells scored as part of a [k|row] give nothing\n[n|Liu\'s verticals stand like iron]', flags: { rowsDead: 1 } });
defBoss('cuan', '爨宝子碑', 'Stele of Cuan Baozi', 3, {
  author: { zh: '东晋 · 佚名', en: 'Anonymous, Eastern Jin' },
  dz: '入架的墨块有 [k|1/3 概率]变为五格的异形块\n[n|非隶非楷，奇古难名]', de: 'Each block drawn has a [k|1 in 3 chance] of turning into a strange five-cell shape\n[n|Neither clerical nor regular: odd and ancient]', flags: { morph: 1 } });
defBoss('liqi', '礼器碑', 'Stele of Ritual Vessels', 3, {
  author: { zh: '东汉 · 佚名', en: 'Anonymous, Eastern Han' },
  dz: '排在[k|首位]的印在本局失效', de: 'Your [k|first] seal is disabled this round', flags: { sealOff: 'left' } });
defBoss('shiqi', '十七帖', 'The Seventeen Letters', 3, {
  author: { zh: '东晋 · 王羲之', en: 'Wang Xizhi, Eastern Jin' },
  dz: '本局至多落下 [k|17 块]墨', de: 'You may place at most [k|17 blocks] this round', flags: { pieceLimit: 17 } });
defBoss('taishan', '泰山刻石', 'Mount Tai Inscription', 4, {
  author: { zh: '秦 · 李斯', en: 'Li Si, Qin' },
  dz: '纸面[k|四边]上的格不计分\n[n|二千年风化，今仅存十字]', de: 'Cells on the [k|outer edge] of the sheet score nothing\n[n|After two thousand years of weather, ten characters remain]', flags: { edgeDead: 1 } });
defBoss('maogong', '毛公鼎', 'The Mao Gong Ding', 4, {
  author: { zh: '西周 · 佚名', en: 'Anonymous, Western Zhou' },
  dz: '所有[k|画数等级]视为 1 级\n[n|金文古奥，后学难追]', de: 'Every [k|stroke tier] counts as level 1\n[n|Bronze script: too ancient for later learning to reach]', flags: { noLevels: 1 } });
defBoss('magu', '麻姑仙坛记', 'Record of the Magu Altar', 4, {
  author: { zh: '唐 · 颜真卿', en: 'Yan Zhenqing, Tang' },
  dz: '每次挥毫后，纸上剩余的墨[k|全部散去]\n[n|已见东海三为桑田]', de: 'After every flourish, [k|all remaining ink] on the sheet vanishes\n[n|"Thrice have I seen the Eastern Sea turn to mulberry fields."]', flags: { wipeAfter: 1 } });
defBoss('zhengzuo', '争座位帖', 'Dispute over Seating', 4, {
  author: { zh: '唐 · 颜真卿', en: 'Yan Zhenqing, Tang' },
  dz: '只能使用笔架上[k|最左侧]的墨块\n[n|尊卑有序，不可僭越]', de: 'You may only use the [k|leftmost] block on the tray\n[n|Precedence must be observed]', flags: { queue: 1 } });
defBoss('yihe', '瘗鹤铭', 'Crane Burial Inscription', 4, {
  author: { zh: '南朝 · 佚名', en: 'Anonymous, Southern Dynasties' },
  dz: '每落下 [k|6 块]墨，最底一行便被江水冲走\n[n|刻于焦山崖壁，后崩落江中]', de: 'Every [k|6 blocks] you place, the bottom row is washed away by the river\n[n|Carved on a cliff that later fell into the Yangtze]',
  afterPlace(run, out) {
    const rd = run.round;
    if (rd.placed % 6 !== 0) return;
    const y = run.h - 1, cells = [];
    for (let x = 0; x < run.w; x++) { const i = y * run.w + x; if (rd.board[i]) { rd.board[i] = null; cells.push(i); } }
    if (cells.length) out.push({ t: 'wash', cells });
  } });
// finishers: the three greatest works in running script
defBoss('lanting', '兰亭集序', 'Preface to the Orchid Pavilion', 8, {
  fin: true, author: { zh: '东晋 · 王羲之 · 天下第一行书', en: 'Wang Xizhi — "the finest running script under heaven"' },
  dz: '本局[k|重复]写出的字不计分（散笔亦然）\n[n|二十余「之」字，无一雷同]', de: 'A character [k|repeated] this round scores nothing (scribbles too)\n[n|It writes 之 more than twenty times — never twice alike]', flags: { noRepeat: 1 } });
defBoss('jizhi', '祭侄文稿', 'Requiem for My Nephew', 8, {
  fin: true, author: { zh: '唐 · 颜真卿 · 天下第二行书', en: 'Yan Zhenqing — the second finest running script' },
  dz: '每落下 [k|3 块]墨，纸上便多一处[k|涂改]（顽石）\n[n|悲愤所至，涂抹满纸]', de: 'Every [k|3 blocks] you place, a [k|blot] (stone) appears on the sheet\n[n|Written in grief and fury, crossed out again and again]',
  afterPlace(run, out) {
    const rd = run.round;
    if (rd.placed % 3 !== 0) return;
    const free = [];
    for (let i = 0; i < rd.board.length; i++) if (!rd.board[i] && !rd.holes[i]) free.push(i);
    if (!free.length) return;
    const i = rndPick(run, 'boss', free);
    rd.board[i] = stoneCell();
    out.push({ t: 'blot', i });
  } });
defBoss('hanshi', '寒食帖', 'Cold Food Observance', 8, {
  fin: true, author: { zh: '北宋 · 苏轼 · 天下第三行书', en: 'Su Shi — the third finest running script' },
  dz: '[k|无法洗笔]，且 [k|墨量−20]\n[n|空庖煮寒菜，破灶烧湿苇]', de: '[k|No rinses], and [k|−20 Ink]\n[n|"In an empty kitchen I boil cold greens; in a broken stove I burn wet reeds."]', flags: { noDiscard: 1 }, mods: { inkMax: -20 } });

// ---------- 书体 (starting decks) ----------
const DECKS = {};
const DECK_ORDER = [];
function defDeck(id, zh, en, o) { DECKS[id] = Object.assign({ id, zh, en, w: 8, h: 8, mods: {}, flags: {} }, o); DECK_ORDER.push(id); }
const perInk = (shapes, inks) => { const out = []; for (const ink of inks || INKS) for (const s of shapes) out.push([s, ink]); return out; };
defDeck('kai', '楷书', 'Regular Script', {
  dz: '标准的 32 块墨，四色俱全。\n[n|形体方正，笔画平直，可作楷模]', de: 'The standard 32 blocks in all four inks.\n[n|Square, even and upright: the model hand]',
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'l4']) });
defDeck('xing', '行书', 'Running Script', {
  dz: '每局 [k|挥毫+1]，但 [k|墨量−10]。\n[n|行云流水，不疾不徐]', de: '[k|+1 Flourish] every round, but [k|−10 Ink].\n[n|Like drifting cloud and flowing water]',
  mods: { ignites: 1, inkMax: -10 }, unlock: { win: 'kai' },
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'j4']) });
defDeck('li', '隶书', 'Clerical Script', {
  dz: '只有横平竖直的[k|直笔]，但 [k|墨量−15]。\n[n|蚕头燕尾，一波三折]', de: 'Nothing but [k|straight strokes], but [k|−15 Ink].\n[n|Silkworm heads and swallow tails]',
  mods: { inkMax: -15 }, unlock: { win: 'kai' },
  build: () => perInk(['dot', 'i2', 'i2', 'i3', 'i3', 'i4', 'i4', 'i5']) });
defDeck('cao', '草书', 'Cursive Script', {
  dz: '墨块奇崛多变，每局 [k|洗笔+2]、[k|墨量+15]。\n[n|笔走龙蛇，一气呵成]', de: 'Wild, irregular blocks; [k|+2 Rinses] and [k|+15 Ink] every round.\n[n|Dragons and serpents under the brush]',
  mods: { discards: 2, inkMax: 15 }, unlock: { win: 'xing' },
  build: () => {
    const out = [];
    const sets = [['i2', 'i3', 's4', 'z4', 'l4', 'w5', 'n5', 'dot'], ['i2', 'i4', 's4', 'j4', 'z5', 'y5', 't4', 'dot'], ['i3', 'i3', 'z4', 'l4', 'v5', 'u5', 'v3', 'dot'], ['i2', 'i4', 's4', 'j4', 't5', 'p5', 'v3', 'dot']];
    INKS.forEach((ink, k) => sets[k].forEach((s) => out.push([s, ink])));
    return out;
  } });
defDeck('zhuan', '篆书', 'Seal Script', {
  dz: '[k|印位+1]，但每局 [k|挥毫−1]。\n[n|婉而通，圆而匀]', de: '[k|+1 seal slot], but [k|−1 Flourish] every round.\n[n|Rounded, even and unbroken]',
  mods: { sealSlots: 1, ignites: -1 }, unlock: { win: 'li' },
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'l4']) });
defDeck('shoujin', '瘦金体', 'Slender Gold', {
  dz: '所有墨块皆为[jin|金]色，开局 [g|8 文]；但[k|没有利息]，且 [k|墨量−15]。\n[n|宋徽宗所创，瘦硬通神]', de: 'Every block is [jin|Gold] and you start with [g|$8]; but you earn [k|no interest] and have [k|−15 Ink].\n[n|The hand of Emperor Huizong: thin, hard and uncanny]',
  flags: { noInterest: 1 }, money: 8, mods: { inkMax: -15 }, unlock: { ante: 6 },
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'l4'], ['jin', 'jin', 'jin', 'jin']) });
defDeck('weibei', '魏碑', 'Wei Stele Script', {
  dz: '墨块方厚沉重，[k|墨量+30]，开局自带一枚「密不透风」。\n[n|斩钉截铁，雄强朴茂]', de: 'Heavy, blocky pieces, [k|+30 Ink], and you begin with the seal Not a Breath of Wind.\n[n|Cut as if with an axe: blunt and powerful]',
  mods: { inkMax: 30 }, seals: ['mibu'], unlock: { chars: 16 },
  build: () => perInk(['dot', 'i2', 'o4', 'o4', 'o6', 't4', 'l4', 'j4']) });
defDeck('jiagu', '甲骨文', 'Oracle Bone Script', {
  dz: '纸为 [k|7×7] 的龟甲，[k|墨量−28]，开局持有一册《集古录》。\n[n|殷墟卜辞，文字之始]', de: 'The sheet is a [k|7×7] tortoise shell with [k|−28 Ink]; you start with a Record of Antiquities.\n[n|Divinations of the Shang: where writing begins]',
  w: 7, h: 7, mods: { inkMax: -28 }, items: ['jigulu'], unlock: { chars: 24 },
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4']) });
defDeck('changjuan', '长卷', 'The Handscroll', {
  dz: '纸为 [k|10×6] 的横卷：横长竖短，[k|墨量+10]。\n[n|展卷如行千里]', de: 'The sheet is a [k|10×6] scroll: long rows, short columns, [k|+10 Ink].\n[n|To unroll it is to travel a thousand leagues]',
  w: 10, h: 6, mods: { inkMax: 10 }, unlock: { stake: 2 },
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'l4']) });
defDeck('feibai', '飞白书', 'Flying White', {
  dz: '每块墨都带有随机的[k|墨性]；但笔枯墨少，[k|墨量−25]、[k|印位−1]。\n[n|丝丝露白，若飞若动]', de: 'Every block carries a random [k|ink nature]; but the brush runs dry: [k|−25 Ink] and [k|−1 seal slot].\n[n|Streaks of white, as if in flight]',
  mods: { sealSlots: -1, inkMax: -25 }, unlock: { stake: 4 }, randomEnh: true,
  build: () => perInk(['dot', 'i2', 'i3', 'i4', 'v3', 'o4', 't4', 'l4']) });

// ---------- 科第 (difficulty ladder) ----------
const STAKES = [
  { zh: '童生', en: 'Pupil', dz: '基础难度', de: 'The base game' },
  { zh: '秀才', en: 'Licentiate', dz: '「习字」过关不再有润笔', de: 'Practice sheets pay nothing', flags: { noSmallReward: 1 } },
  { zh: '举人', en: 'Provincial Graduate', dz: '目标分数更高，且越往后越高', de: 'Higher targets, growing faster as the run goes on', flags: { scale: [1.25, 0.1] } },
  { zh: '贡士', en: 'Tribute Scholar', dz: '每局 墨量−10', de: '−10 Ink every round', mods: { inkMax: -10 } },
  { zh: '进士', en: 'Metropolitan Graduate', dz: '每局 洗笔−1', de: '−1 Rinse every round', mods: { discards: -1 } },
  { zh: '探花', en: 'Third Laureate', dz: '铺中货物贵两成', de: 'Shop prices rise by 20%', mods: { markup: 20 } },
  { zh: '榜眼', en: 'Second Laureate', dz: '目标分数再度提高', de: 'Targets rise again, and steeply', flags: { scale: [1.5, 0.2] } },
  { zh: '状元', en: 'First Laureate', dz: '名帖的目标为平常的 1.4 倍', de: 'Masterwork targets ×1.4', flags: { bossMul: 1.4 } },
];
const BASE_STATS = {
  inkMax: 100, ignites: 4, discards: 3, tray: 3, sealSlots: 5, itemSlots: 2, interestCap: 5, shopSlots: 2,
  discount: 0, markup: 0, rerollOff: 0, freeRerolls: 0, peek: 0, flip: 0, diag: 0, costAdd: 0, probMul: 1, tieBonus: 0, edRate: 0,
};

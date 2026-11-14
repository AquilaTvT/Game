// ---------- content: yokai, talismans, relics, spirits, stages ----------
const pc = (x) => Math.round(x * 100) + '%';

// ---- 妖 (enemies).  r radius · hp · spd speed · xp souls · ai behaviour · col tint
const FOES = {
  wisp:    { zh: '鬼火', en: 'Wisp', r: 11, hp: 8, spd: 88, xp: 1, ai: 'chase', col: [0.45, 0.85, 1.0], tz: '最寻常的游魂，成群而来。', te: 'The commonest of wandering souls; they come in packs.' },
  lantern: { zh: '提灯', en: 'Lantern', r: 15, hp: 22, spd: 78, xp: 2, ai: 'lunge', col: [1.0, 0.62, 0.25], tz: '会突然扑过来。', te: 'Lunges without warning.' },
  kasa:    { zh: '伞妖', en: 'Umbrella', r: 14, hp: 17, spd: 170, xp: 2, ai: 'hop', col: [0.75, 0.55, 1.0], tz: '一跳一停，不好预判。', te: 'Hops and rests; hard to read.' },
  doll:    { zh: '纸人', en: 'Paper Doll', r: 9, hp: 5, spd: 170, xp: 1, ai: 'zig', col: [1.0, 0.95, 0.85], tz: '又快又脆，排成一列蛇行。', te: 'Fast and frail, snaking along in files.' },
  eye:     { zh: '目目连', en: 'Peering Eye', r: 14, hp: 15, spd: 72, xp: 3, ai: 'shoot', col: [1.0, 0.35, 0.6], tz: '隔着老远吐出鬼弹——鬼弹也能被圈住。', te: 'Spits orbs from afar. The orbs can be sealed too.' },
  tengu:   { zh: '鸦天狗', en: 'Crow Tengu', r: 15, hp: 28, spd: 105, xp: 4, ai: 'dash', col: [0.4, 1.0, 0.7], tz: '蓄力后直线冲刺，会撞断你的墨痕。', te: 'Winds up, then charges in a line — and severs your trail.' },
  bomb:    { zh: '鬼灯', en: 'Ghost Lamp', r: 13, hp: 12, spd: 118, xp: 2, ai: 'chase', col: [1.0, 0.3, 0.2], boom: 1, tz: '死后爆炸。把它和别的妖怪圈在一起。', te: 'Explodes on death. Seal it together with others.' },
  ghost:   { zh: '幽魂', en: 'Shade', r: 14, hp: 24, spd: 100, xp: 3, ai: 'ghost', col: [0.7, 0.8, 1.0], tz: '时隐时现；隐去时封不住。', te: 'Fades in and out; cannot be sealed while faded.' },
  mud:     { zh: '泥田坊', en: 'Mudman', r: 19, hp: 36, spd: 66, xp: 3, ai: 'chase', col: [0.75, 0.6, 0.4], split: 'mudling', tz: '死后裂成两只小的。', te: 'Splits into two when it dies.' },
  mudling: { zh: '泥仔', en: 'Mudling', r: 11, hp: 10, spd: 112, xp: 1, ai: 'chase', col: [0.75, 0.6, 0.4], hidden: 1 },
  bell:    { zh: '钟妖', en: 'Bell', r: 16, hp: 32, spd: 58, xp: 4, ai: 'bell', col: [1.0, 0.85, 0.35], tz: '钟声让周围的妖怪跑得更快。先封它。', te: 'Its toll speeds up everything nearby. Seal it first.' },
  cutter:  { zh: '镰鼬', en: 'Sickle Weasel', r: 11, hp: 14, spd: 235, xp: 3, ai: 'cutter', col: [0.6, 1.0, 0.95], tz: '专门冲着你的墨痕来，一口咬断。', te: 'Goes straight for your trail and bites it through.' },
  oni:     { zh: '小鬼', en: 'Oni', r: 23, hp: 95, spd: 74, xp: 8, ai: 'brute', col: [1.0, 0.25, 0.3], tz: '皮糙肉厚，靠近了会猛冲。', te: 'Thick-skinned; charges when close.' },
  eyeling: { zh: '眼仔', en: 'Eyeling', r: 9, hp: 6, spd: 130, xp: 1, ai: 'chase', col: [1.0, 0.35, 0.6], hidden: 1 },
  foxfire: { zh: '狐火', en: 'Foxfire', r: 10, hp: 9, spd: 140, xp: 1, ai: 'chase', col: [1.0, 0.7, 0.3], hidden: 1 },
  mukseg:  { zh: '百足之节', en: 'Centipede Segment', r: 19, hp: 60, spd: 0, xp: 3, ai: 'part', col: [0.7, 1.0, 0.4], hidden: 1 },
  core:    { zh: '蚀核', en: 'Eclipse Core', r: 17, hp: 70, spd: 0, xp: 5, ai: 'part', col: [0.75, 0.5, 1.0], hidden: 1 },
};
const FOE_IDS = Object.keys(FOES);

// ---- 首领 (bosses)
const BOSSES = {
  hyakume:  { zh: '百目', en: 'Hundred Eyes', r: 40, hp: 220, spd: 46, xp: 40, col: [1.0, 0.35, 0.6], tz: '浑身是眼。它吐出的鬼弹可以一并圈住。', te: 'Eyes all over. Its orbs can be sealed along with it.' },
  mukade:   { zh: '大百足', en: 'Great Centipede', r: 26, hp: 200, spd: 150, xp: 60, col: [0.7, 1.0, 0.4], tz: '身躯会撞断墨痕。趁它盘起来，一节一节地封。', te: 'Its body severs your trail. Seal it segment by segment when it coils.' },
  daitengu: { zh: '大天狗', en: 'Great Tengu', r: 36, hp: 420, spd: 90, xp: 80, col: [0.4, 1.0, 0.7], tz: '冲刺之后会停顿片刻——那就是机会。', te: 'It pauses after each charge. That is your opening.' },
  kyubi:    { zh: '九尾', en: 'Nine Tails', r: 34, hp: 620, spd: 110, xp: 100, col: [1.0, 0.7, 0.3], tz: '幻影封了只会炸出狐火。真身的尾焰更亮。', te: 'Sealing an illusion only bursts into foxfire. The real one burns brighter.' },
  kuubou:   { zh: '空亡', en: 'The Void Sun', r: 42, hp: 1000, spd: 30, xp: 200, col: [0.75, 0.5, 1.0], tz: '夜行的尽头。日蚀之下，结界会一点点缩小。', te: 'The end of the parade. Under its eclipse the arena closes in.' },
};

// ---- 符 (talismans): chosen on level-up, five levels each
// kind: seal (acts when a ring closes) · trail (the stroke itself) · aux (acts on its own) · body
const TALIS = {};
const TALI_IDS = [];
function tali(id, g, zh, en, kind, max, w, d) { TALIS[id] = { id, g, zh, en, kind, max, w, d }; TALI_IDS.push(id); }
tali('power', '封', '封印之力', 'Seal Power', 'seal', 5, 1.2, (l) => ({ zh: `封印伤害 [n|+${25 * l}%]`, en: `Seal damage [n|+${25 * l}%]` }));
tali('multi', '网', '一网打尽', 'Clean Sweep', 'seal', 5, 1.0, (l) => ({ zh: `一圈之内每多一只妖怪，伤害再 [n|+${5 + 3 * l}%]`, en: `Each extra yokai in one ring: [n|+${5 + 3 * l}%] more damage` }));
tali('chain', '雷', '雷符', 'Thunder', 'seal', 5, 1.0, (l) => ({ zh: `被封的妖怪各向圈外最近的 [n|${l}] 只放出雷击，造成封印伤害的 [n|${50 + 10 * l}%]`, en: `Each sealed yokai zaps the [n|${l}] nearest outside the ring for [n|${50 + 10 * l}%] of seal damage` }));
tali('burn', '火', '火符', 'Ember', 'seal', 5, 1.0, (l) => ({ zh: `圈过的地方燃烧 [n|${(2.5 + 0.5 * l).toFixed(1)}] 秒，每秒造成封印伤害的 [n|${25 + 15 * l}%]`, en: `The sealed ground burns for [n|${(2.5 + 0.5 * l).toFixed(1)}]s, dealing [n|${25 + 15 * l}%] of seal damage each second` }));
tali('frost', '冰', '冰符', 'Frost', 'seal', 5, 0.9, (l) => ({ zh: `封印时冻住圈外 [n|${50 + 25 * l}] 距离内的妖怪 [n|${(0.9 + 0.3 * l).toFixed(1)}] 秒`, en: `On sealing, freeze yokai within [n|${50 + 25 * l}] of the ring for [n|${(0.9 + 0.3 * l).toFixed(1)}]s` }));
tali('pull', '风', '风符', 'Gale', 'seal', 5, 0.9, (l) => ({ zh: `封印前先把圈外 [n|${30 + 22 * l}] 距离内的妖怪卷进圈里`, en: `Before sealing, yokai within [n|${30 + 22 * l}] of the ring are swept inside` }));
tali('blast', '爆', '爆符', 'Burst', 'seal', 5, 1.0, (l) => ({ zh: `封印时向外迸出冲击波：圈外 [n|${60 + 25 * l}] 距离内的妖怪受到 [n|${40 + 15 * l}%] 封印伤害并被震退`, en: `Sealing throws a shockwave: yokai within [n|${60 + 25 * l}] outside take [n|${40 + 15 * l}%] seal damage and are thrown back` }));
tali('echo', '响', '回响', 'Echo', 'seal', 5, 0.9, (l) => ({ zh: `封印 0.5 秒后再发作 [n|${l >= 4 ? 2 : 1}] 次，造成 [n|${30 + 12 * l}%] 伤害`, en: `Half a second later the seal strikes [n|${l >= 4 ? 'twice' : 'once'}] more for [n|${30 + 12 * l}%] damage` }));
tali('wisp', '灵', '缚灵', 'Bound Souls', 'seal', 5, 0.8, (l) => ({ zh: `被封杀的妖怪有 [n|${12 + 9 * l}%] 概率化为己用的灵火（至多 [n|${3 + 2 * l}] 团），扑向敌人并爆开`, en: `Sealed kills have a [n|${12 + 9 * l}%] chance to become a friendly flame (up to [n|${3 + 2 * l}]) that hunts and bursts` }));
tali('exec', '决', '裁决', 'Judgement', 'seal', 5, 0.8, (l) => ({ zh: `圈内生命低于 [n|${6 + 6 * l}%] 的妖怪直接消灭；首领受到的封印伤害 [n|+${8 * l}%]`, en: `Yokai in the ring below [n|${6 + 6 * l}%] health perish outright; bosses take [n|+${8 * l}%] seal damage` }));
tali('great', '印', '大印', 'Grand Seal', 'seal', 5, 0.8, (l) => ({ zh: `一圈封住 [n|6] 只以上时，伤害 [n|×${(1.25 + 0.2 * l).toFixed(2)}]`, en: `Sealing [n|6] or more at once: damage [n|×${(1.25 + 0.2 * l).toFixed(2)}]` }));
tali('long', '锋', '长锋', 'Long Tip', 'trail', 5, 1.1, (l) => ({ zh: `墨痕长度 [n|+${18 * l}%]`, en: `Trail length [n|+${18 * l}%]` }));
tali('ink', '焰', '墨焰', 'Ink Flame', 'trail', 5, 1.0, (l) => ({ zh: `碰到墨痕的妖怪被灼烧，每秒造成封印伤害的 [n|${45 + 25 * l}%]`, en: `Yokai touching your trail burn for [n|${45 + 25 * l}%] of seal damage each second` }));
tali('shock', '电', '电丝', 'Live Wire', 'trail', 5, 0.9, (l) => ({ zh: `碰到墨痕的妖怪被麻痹 [n|${(0.4 + 0.2 * l).toFixed(1)}] 秒`, en: `Yokai touching your trail are stunned for [n|${(0.4 + 0.2 * l).toFixed(1)}]s` }));
tali('swift', '疾', '疾笔', 'Swift Brush', 'trail', 5, 0.9, (l) => ({ zh: `移动速度 [n|+${7 * l}%]`, en: `Movement speed [n|+${7 * l}%]` }));
tali('shiki', '式', '式神', 'Shikigami', 'aux', 5, 0.9, (l) => ({ zh: `[n|${l}] 只纸鹤绕身飞行，自动射击最近的妖怪`, en: `[n|${l}] paper crane${l > 1 ? 's' : ''} circle you and fire at the nearest yokai` }));
tali('ward', '护', '护符', 'Wards', 'aux', 5, 0.9, (l) => ({ zh: `[n|${1 + l}] 张护符绕身旋转，碰到的妖怪受到 [n|${40 + 10 * l}%] 封印伤害`, en: `[n|${1 + l}] wards orbit you; yokai they touch take [n|${40 + 10 * l}%] seal damage` }));
tali('bolt', '霆', '落雷', 'Skybolt', 'aux', 5, 0.9, (l) => ({ zh: `每 [n|${(3.4 - 0.45 * l).toFixed(1)}] 秒一道落雷劈向视野内的妖怪，造成 [n|${110 + 30 * l}%] 封印伤害`, en: `Every [n|${(3.4 - 0.45 * l).toFixed(1)}]s lightning strikes a yokai in view for [n|${110 + 30 * l}%] seal damage` }));
tali('vital', '体', '体魄', 'Vitality', 'body', 3, 0.7, () => ({ zh: '生命上限 [n|+1]，并回复 1 点', en: 'Maximum life [n|+1], and heal 1' }));
tali('shield', '壁', '灵壁', 'Spirit Wall', 'body', 5, 0.8, (l) => ({ zh: `一层护盾替你挡下一次伤害，[n|${17 - 2 * l}] 秒后恢复`, en: `A shield absorbs one hit and returns after [n|${17 - 2 * l}]s` }));
tali('dash', '瞬', '瞬步', 'Flash Step', 'body', 5, 0.8, (l) => ({ zh: `冲刺冷却 [n|−${12 * l}%]${l >= 3 ? `，可连续冲刺 [n|${l >= 5 ? 3 : 2}] 次` : ''}`, en: `Dash cooldown [n|−${12 * l}%]${l >= 3 ? `, with [n|${l >= 5 ? 3 : 2}] charges` : ''}` }));
tali('magnet', '引', '引魂', 'Soul Lure', 'body', 5, 0.9, (l) => ({ zh: `拾取范围 [n|+${35 * l}%]，魂的收益 [n|+${5 * l}%]`, en: `Pickup range [n|+${35 * l}%], souls worth [n|+${5 * l}%]` }));

// ---- 进阶 (evolutions): offered once both parents are at their highest level
const EVOS = {
  tenbatsu: { g: '罚', zh: '天罚', en: "Heaven's Wrath", a: 'chain', b: 'bolt', dz: '雷击可再弹跳一次；每次封印，圈内每只妖怪头顶都落下一道雷', de: 'Lightning jumps once more, and every seal calls a bolt onto each yokai inside' },
  gouka:    { g: '业', zh: '业火', en: 'Karmic Fire', a: 'burn', b: 'ink', dz: '一切灼烧额外造成目标生命上限的 [n|4%]（首领 0.6%），墨痕灼烧翻倍', de: 'All burning also deals [n|4%] of the target’s maximum life each second (0.6% to bosses); trail burn is doubled' },
  zero:     { g: '零', zh: '绝对零度', en: 'Absolute Zero', a: 'frost', b: 'pull', dz: '被冻住的妖怪受到的封印伤害 [n|×2]；冰与风的范围 [n|+50%]', de: 'Frozen yokai take [n|×2] seal damage; Frost and Gale reach [n|50%] farther' },
  kodama:   { g: '谺', zh: '万象回声', en: 'Endless Echo', a: 'echo', b: 'great', dz: '回响造成完整伤害，并多发作一次', de: 'Echoes deal full damage, and strike one more time' },
  hyakki:   { g: '主', zh: '百鬼之主', en: 'Lord of Spirits', a: 'wisp', b: 'shiki', dz: '灵火数量上限翻倍，且不再消散；纸鹤射速翻倍', de: 'Twice as many friendly flames, and they never fade; cranes fire twice as fast' },
  mugen:    { g: '无', zh: '无间笔', en: 'Unbroken Stroke', a: 'long', b: 'swift', dz: '封印不再耗去墨痕：一笔之内可以反复成圈', de: 'Sealing no longer spends your trail: one stroke can close ring after ring' },
};
const EVO_IDS = Object.keys(EVOS);

// ---- 神器 (relics): one of three after each boss
const RELICS = {
  first:  { g: '睛', zh: '画龙点睛', en: 'The Final Touch', dz: '4 秒没有封印后，下一圈伤害 [n|×2.5]', de: 'After 4s without sealing, your next ring deals [n|×2.5]' },
  tiny:   { g: '寸', zh: '方寸', en: 'Square Inch', dz: '很小的圈伤害 [n|×2]', de: 'Very small rings deal [n|×2]' },
  huge:   { g: '千', zh: '大千', en: 'Great Thousand', dz: '圈越大伤害越高（至多 [n|+150%]）', de: 'The larger the ring, the harder it hits (up to [n|+150%])' },
  bomb:   { g: '常', zh: '无常', en: 'Impermanence', dz: '被封杀的妖怪爆炸，波及四周 [n|35%] 封印伤害', de: 'Sealed kills explode for [n|35%] of seal damage around them' },
  heal:   { g: '命', zh: '借命', en: 'Borrowed Time', dz: '每封杀 [n|70] 只妖怪回复 1 点生命', de: 'Heal 1 for every [n|70] sealed kills' },
  gold:   { g: '宝', zh: '聚宝', en: 'Hoard', dz: '魂的收益 [n|+30%]', de: 'Souls are worth [n|30%] more' },
  slow:   { g: '定', zh: '定身咒', en: 'Stillness', dz: '一圈封住 5 只以上后，所有妖怪迟缓 [n|1.5] 秒', de: 'After sealing 5 or more at once, every yokai is slowed for [n|1.5]s' },
  tail:   { g: '尾', zh: '九尾', en: 'Nine Tails', dz: '墨痕长度 [n|+40%]，移动速度 [n|−6%]', de: 'Trail [n|+40%], speed [n|−6%]' },
  glass:  { g: '璃', zh: '琉璃心', en: 'Glass Heart', dz: '封印伤害 [n|+60%]，生命上限 [n|−1]', de: 'Seal damage [n|+60%], maximum life [n|−1]' },
  orbit:  { g: '轮', zh: '轮回', en: 'Samsara', dz: '纸鹤与护符各 [n|+2]', de: '[n|+2] cranes and wards' },
  revive: { g: '香', zh: '还魂香', en: 'Soul Incense', dz: '倒下时复生一次，回复 2 点生命', de: 'Rise once from defeat with 2 life' },
  mirror: { g: '镜', zh: '镜花', en: 'Mirror Flower', dz: '被圈住的鬼弹化作追踪弹反击', de: 'Sealed orbs turn into homing shots of your own' },
  combo:  { g: '环', zh: '连环', en: 'Linked Rings', dz: '2.5 秒内连续封印，伤害每次 [n|+20%]（至多 5 层）', de: 'Sealing again within 2.5s adds [n|+20%] damage each time (up to 5 stacks)' },
  thorn:  { g: '棘', zh: '荆棘', en: 'Thorns', dz: '受伤时震退并重创周围的妖怪，无敌时间 [n|+0.6] 秒', de: 'When hit, blast the yokai around you; [n|+0.6]s longer invulnerability' },
};
const RELIC_IDS = Object.keys(RELICS);

// ---- 笔灵 (playable spirits)
const HEROES = {
  fox:     { zh: '白狐', en: 'White Fox', col: [0.6, 0.95, 1.0], hp: 3, spd: 300, trail: 560, start: { echo: 1 }, dz: '均衡。开局带「回响」。', de: 'Balanced. Begins with Echo.' },
  crane:   { zh: '青鸾', en: 'Azure Crane', col: [0.5, 1.0, 0.8], hp: 2, spd: 345, trail: 720, start: { long: 1 }, dz: '又快又长，但只有 2 点生命。', de: 'Fast, with a long trail — and only 2 life.', unlock: { zh: '通过第二场', en: 'Clear the second stage' } },
  turtle:  { zh: '玄龟', en: 'Black Tortoise', col: [0.55, 0.75, 1.0], hp: 5, spd: 258, trail: 500, start: { shield: 1 }, dz: '慢而稳：5 点生命，开局带「灵壁」。', de: 'Slow and steady: 5 life, begins with Spirit Wall.', unlock: { zh: '一局内升到 15 级', en: 'Reach level 15 in one run' } },
  raiju:   { zh: '雷兽', en: 'Thunder Beast', col: [1.0, 0.95, 0.5], hp: 3, spd: 312, trail: 520, start: { shock: 1, chain: 1 }, dz: '开局带「电丝」与「雷符」。', de: 'Begins with Live Wire and Thunder.', unlock: { zh: '一圈封住 12 只妖怪', en: 'Seal 12 yokai in one ring' } },
  lamp:    { zh: '灯灵', en: 'Lamp Spirit', col: [1.0, 0.7, 0.4], hp: 3, spd: 295, trail: 560, start: { ink: 1, burn: 1 }, burnMul: 1.3, dz: '开局带「墨焰」与「火符」，灼烧 +30%。', de: 'Begins with Ink Flame and Ember; burning +30%.', unlock: { zh: '击败大天狗', en: 'Defeat the Great Tengu' } },
  dragon:  { zh: '墨龙', en: 'Ink Dragon', col: [0.8, 0.6, 1.0], hp: 4, spd: 285, trail: 900, start: { ink: 2 }, sealMul: 0.7, dz: '身躯极长，自带「墨焰」；封印伤害 −30%。', de: 'An immense body that burns what it touches; seal damage −30%.', unlock: { zh: '渡过第一夜', en: 'Survive the first night' } },
};
const HERO_IDS = Object.keys(HEROES);

// ---- 场 (stages): waves are [from, until, every, foe, pack size, elite?]
const STAGES = [
  { zh: '竹林夜径', en: 'Bamboo Path', hue: [0.10, 0.32, 0.30], dur: 135, boss: 'hyakume', waves: [
    [0, 135, 4.2, 'wisp', 7], [18, 135, 9, 'wisp', 12], [35, 135, 8, 'lantern', 3], [80, 135, 9, 'kasa', 4], [110, 135, 14, 'lantern', 1, 1]] },
  { zh: '朱门鸟居', en: 'Torii Gate', hue: [0.36, 0.12, 0.16], dur: 150, boss: 'mukade', waves: [
    [0, 150, 4.6, 'wisp', 9], [8, 150, 8, 'doll', 10], [25, 150, 9, 'eye', 2], [45, 150, 8, 'lantern', 4], [70, 150, 9, 'kasa', 5], [95, 150, 11, 'tengu', 2], [120, 150, 15, 'kasa', 1, 1]] },
  { zh: '荒寺', en: 'Ruined Temple', hue: [0.20, 0.16, 0.38], dur: 160, boss: 'daitengu', waves: [
    [0, 160, 5, 'wisp', 11], [5, 160, 8, 'kasa', 5], [20, 160, 8, 'bomb', 4], [40, 160, 9, 'ghost', 4], [60, 160, 9, 'eye', 3], [80, 160, 10, 'tengu', 3], [95, 160, 11, 'cutter', 2], [125, 160, 14, 'ghost', 1, 1]] },
  { zh: '黄泉坂', en: 'Slope of Yomi', hue: [0.34, 0.20, 0.08], dur: 170, boss: 'kyubi', waves: [
    [0, 170, 5, 'doll', 14], [5, 170, 8, 'mud', 3], [20, 170, 12, 'bell', 1], [35, 170, 8, 'ghost', 5], [55, 170, 11, 'oni', 1], [75, 170, 9, 'cutter', 3], [90, 170, 8, 'bomb', 6], [120, 170, 11, 'oni', 2], [135, 170, 15, 'mud', 1, 1]] },
  { zh: '百鬼夜行', en: 'Night Parade', hue: [0.26, 0.10, 0.34], dur: 180, boss: 'kuubou', waves: [
    [0, 180, 4.5, 'wisp', 14], [5, 180, 7, 'doll', 14], [15, 180, 8, 'lantern', 6], [30, 180, 9, 'eye', 4], [45, 180, 9, 'tengu', 3], [60, 180, 9, 'bomb', 6], [75, 180, 12, 'bell', 1], [90, 180, 10, 'oni', 2], [105, 180, 9, 'cutter', 3], [120, 180, 9, 'ghost', 6], [40, 180, 13, 'oni', 1, 1], [140, 180, 10, 'mud', 4]] },
];

// ---- 夜 (difficulty tiers, the "new game plus" ladder)
const NIGHT_MAX = 10;
const nightMods = (n) => ({ hp: 1 + 0.28 * (n - 1), spd: 1 + 0.035 * (n - 1), rate: 1 + 0.1 * (n - 1), elite: 0.02 * (n - 1), shot: 1 + 0.06 * (n - 1), jade: 1 + 0.25 * (n - 1) });
const NIGHT_NAME = { zh: ['', '初夜', '二夜', '三夜', '四夜', '五夜', '六夜', '七夜', '八夜', '九夜', '终夜'], en: ['', 'Night I', 'Night II', 'Night III', 'Night IV', 'Night V', 'Night VI', 'Night VII', 'Night VIII', 'Night IX', 'Final Night'] };

// ---- 神社 (permanent boons bought with jade)
const SHRINE = {
  power:  { g: '咒', zh: '咒力', en: 'Spell Power', max: 5, cost: [30, 60, 110, 180, 280], d: (l) => ({ zh: `封印伤害 +${4 * l}%`, en: `Seal damage +${4 * l}%` }) },
  trail:  { g: '墨', zh: '墨量', en: 'Ink', max: 5, cost: [30, 60, 110, 180, 280], d: (l) => ({ zh: `墨痕长度 +${4 * l}%`, en: `Trail length +${4 * l}%` }) },
  magnet: { g: '引', zh: '引魂', en: 'Lure', max: 5, cost: [20, 40, 80, 130, 200], d: (l) => ({ zh: `拾取范围 +${10 * l}%`, en: `Pickup range +${10 * l}%` }) },
  xp:     { g: '悟', zh: '悟性', en: 'Insight', max: 5, cost: [40, 80, 140, 220, 330], d: (l) => ({ zh: `魂的收益 +${3 * l}%`, en: `Souls worth +${3 * l}%` }) },
  reroll: { g: '改', zh: '改命', en: 'Reroll', max: 3, cost: [50, 140, 300], d: (l) => ({ zh: `每局可重选 ${1 + l} 次`, en: `${1 + l} rerolls each run` }) },
  banish: { g: '驱', zh: '驱除', en: 'Banish', max: 3, cost: [50, 140, 300], d: (l) => ({ zh: `每局可驱除 ${l} 张不想要的符`, en: `Banish ${l} unwanted talisman${l > 1 ? 's' : ''} each run` }) },
  jade:   { g: '缘', zh: '福缘', en: 'Fortune', max: 5, cost: [40, 80, 140, 220, 330], d: (l) => ({ zh: `灵玉收益 +${8 * l}%`, en: `Jade earned +${8 * l}%` }) },
  heart:  { g: '命', zh: '结缘', en: 'Bond', max: 1, cost: [400], d: () => ({ zh: '生命上限 +1', en: 'Maximum life +1' }) },
  charm:  { g: '守', zh: '御守', en: 'Charm', max: 1, cost: [600], d: () => ({ zh: '每局可复生一次（1 点生命）', en: 'Rise once per run with 1 life' }) },
};
const SHRINE_IDS = Object.keys(SHRINE);

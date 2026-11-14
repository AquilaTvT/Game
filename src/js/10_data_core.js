// ---------- inks, ink natures, paper squares, shapes, tiers ----------
const INKS = ['mo', 'zhu', 'qing', 'jin'];
const INK = {
  mo:   { zh: '墨', en: 'Black',     col: '#201d1c', hi: '#4a4542', lo: '#0c0b0b', mark: '●',
          pure: { zh: '纯墨之笔：[c|形+40]', en: 'Pure Black stroke: [c|+40 Form]' } },
  zhu:  { zh: '朱', en: 'Vermilion', col: '#c0321f', hi: '#e8614a', lo: '#7d1a10', mark: '▲',
          pure: { zh: '纯朱之笔：[m|神+4]', en: 'Pure Vermilion stroke: [m|+4 Spirit]' } },
  qing: { zh: '青', en: 'Azure',     col: '#1f5c8f', hi: '#4d92c9', lo: '#0f3558', mark: '◆',
          pure: { zh: '纯青之笔：[x|神×1.2]', en: 'Pure Azure stroke: [x|×1.2 Spirit]' } },
  jin:  { zh: '金', en: 'Gold',      col: '#c79a36', hi: '#f6dc8c', lo: '#8a6316', mark: '★',
          pure: { zh: '纯金之笔：[g|+1 文]（每次挥毫至多 5 文）', en: 'Pure Gold stroke: [g|+$1] (up to $5 per flourish)' } },
};
const PURE = { mo: 40, zhu: 4, qing: 1.2, jin: 1 };
const CELL_CHIPS = 5;

// 墨性 (ink natures, carried by a whole block)
const ENH = {
  nong: { g: '浓', zh: '浓墨', en: 'Thick',   dz: '每格计分时 [c|形+12]', de: 'Each cell: [c|+12 Form] when scored' },
  fei:  { g: '飞', zh: '飞白', en: 'Flying',  dz: '每格计分时 [m|神+1]', de: 'Each cell: [m|+1 Spirit] when scored' },
  po:   { g: '泼', zh: '泼墨', en: 'Splash',  dz: '此块计分时 [x|神×1.5]（每次挥毫一次），之后有 1/4 概率永久碎裂', de: 'When this block scores: [x|×1.5 Spirit] (once per flourish), then 1 in 4 chance to shatter forever' },
  sa:   { g: '洒', zh: '洒金', en: 'Gilded',  dz: '此块计分时 [g|+1 文]（每次挥毫一次）', de: 'When this block scores: [g|+$1] (once per flourish)' },
  bai:  { g: '白', zh: '留白', en: 'Blank',   dz: '判定纯色笔画时可视作任意墨色', de: 'Counts as any ink when checking pure strokes' },
  yin:  { g: '印', zh: '钤印', en: 'Sealed',  dz: '每格计分时额外再触发一次', de: 'Each cell triggers one extra time' },
  su:   { g: '宿', zh: '宿墨', en: 'Aged',    dz: '挥毫时若仍留在纸上未被写入笔画，每格 [m|神+2]', de: 'If left on the paper outside every stroke when you flourish: [m|+2 Spirit] per cell' },
};
const ENH_IDS = Object.keys(ENH);

// 纸格 (special squares engraved on your paper for the whole run)
const SQ = {
  wusi:   { g: '乌', zh: '乌丝栏', en: 'Black Rule',  col: '#3a3531', dz: '此格上的墨计分时 [c|形+25]', de: 'A cell scored on this square: [c|+25 Form]' },
  zhusi:  { g: '朱', zh: '朱丝栏', en: 'Red Rule',    col: '#c0321f', dz: '此格上的墨计分时 [m|神+3]', de: 'A cell scored on this square: [m|+3 Spirit]' },
  yunwen: { g: '云', zh: '云纹笺', en: 'Cloud Grain', col: '#2c6e8f', dz: '此格上的墨计分时 [x|神×1.2]', de: 'A cell scored on this square: [x|×1.2 Spirit]' },
  sajin:  { g: '金', zh: '洒金笺', en: 'Gold Fleck',  col: '#c79a36', dz: '此格上的墨计分时 [g|+1 文]（每次挥毫一次）', de: 'A cell scored on this square: [g|+$1] (once per flourish)' },
  die:    { g: '叠', zh: '叠影格', en: 'Echo',        col: '#6b4a8f', dz: '此格上的墨计分时额外再触发一次', de: 'A cell scored on this square triggers one extra time' },
};
const SQ_IDS = Object.keys(SQ);

// ---------- shapes ----------
const SHAPES = {};
function defShape(id, rows, zh, en, tags, w) {
  const cells = [];
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') cells.push([x, y]); });
  SHAPES[id] = { id, zh, en, tags, n: cells.length, base: cells, w: w == null ? 1 : w, rots: null, frots: null };
}
defShape('dot', ['#'], '点', 'Dot', ['straight', 'dot'], 0.9);
defShape('i2', ['##'], '短笔', 'Short Stroke', ['straight'], 1);
defShape('i3', ['###'], '中笔', 'Stroke', ['straight'], 1);
defShape('i4', ['####'], '长笔', 'Long Stroke', ['straight', 'long'], 0.9);
defShape('i5', ['#####'], '巨笔', 'Great Stroke', ['straight', 'long'], 0.5);
defShape('i6', ['######'], '椽笔', 'Rafter', ['straight', 'long'], 0.15);
defShape('v3', ['#.', '##'], '折', 'Bend', ['corner'], 1);
defShape('o4', ['##', '##'], '方', 'Square', ['block'], 0.9);
defShape('t4', ['###', '.#.'], '丁', 'Tee', ['tee'], 0.9);
defShape('l4', ['#.', '#.', '##'], '钩', 'Hook', ['corner'], 0.8);
defShape('j4', ['.#', '.#', '##'], '反钩', 'Back Hook', ['corner'], 0.8);
defShape('s4', ['.##', '##.'], '乙', 'Wave', ['snake'], 0.7);
defShape('z4', ['##.', '.##'], '之', 'Zigzag', ['snake'], 0.7);
defShape('l5', ['#.', '#.', '#.', '##'], '长钩', 'Long Hook', ['corner'], 0.35);
defShape('j5', ['.#', '.#', '.#', '##'], '反长钩', 'Long Back Hook', ['corner'], 0.35);
defShape('v5', ['#..', '#..', '###'], '大折', 'Great Bend', ['corner'], 0.4);
defShape('t5', ['###', '.#.', '.#.'], '长丁', 'Long Tee', ['tee'], 0.3);
defShape('p5', ['##', '##', '#.'], '旗', 'Flag', ['block'], 0.35);
defShape('q5', ['##', '##', '.#'], '反旗', 'Back Flag', ['block'], 0.35);
defShape('u5', ['#.#', '###'], '凹', 'Hollow', ['corner'], 0.3);
defShape('x5', ['.#.', '###', '.#.'], '十字', 'Cross', ['tee'], 0.25);
defShape('w5', ['#..', '##.', '.##'], '阶', 'Stairs', ['snake'], 0.25);
defShape('y5', ['.#', '##', '.#', '.#'], '卜', 'Spur', ['tee'], 0.25);
defShape('n5', ['.#', '##', '#.', '#.'], '曲', 'Crook', ['snake'], 0.25);
defShape('z5', ['##.', '.#.', '.##'], '弓', 'Bow', ['snake'], 0.25);
defShape('o6', ['###', '###'], '砖', 'Brick', ['block'], 0.25);

function normCells(cs) {
  let mx = Infinity, my = Infinity;
  for (const [x, y] of cs) { if (x < mx) mx = x; if (y < my) my = y; }
  const out = cs.map(([x, y]) => [x - mx, y - my]);
  out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  let w = 0, h = 0;
  for (const [x, y] of out) { if (x + 1 > w) w = x + 1; if (y + 1 > h) h = y + 1; }
  return { cells: out, w, h };
}
(function buildRots() {
  for (const id in SHAPES) {
    const sh = SHAPES[id];
    const mk = (base) => {
      const rots = [];
      let cur = base;
      for (let r = 0; r < 4; r++) {
        rots.push(normCells(cur));
        cur = cur.map(([x, y]) => [-y, x]); // quarter turn clockwise
      }
      return rots;
    };
    sh.rots = mk(sh.base);
    sh.frots = mk(sh.base.map(([x, y]) => [-x, y]));
    const keys = new Set(sh.rots.map((r) => r.cells.join(';')));
    sh.nrot = keys.size;
  }
})();
// oriented geometry for a tray piece
function geomOf(shape, rot, flip) {
  const sh = SHAPES[shape];
  return (flip ? sh.frots : sh.rots)[((rot % 4) + 4) % 4];
}
const straightOf = (n) => (n <= 1 ? 'dot' : n >= 6 ? 'i6' : 'i' + n);

// ---------- stroke tiers (levels are per stroke-count) ----------
const TIERS = [null,
  { c: 10,  m: 1, dc: 10, dm: 1 },
  { c: 20,  m: 2, dc: 15, dm: 1 },
  { c: 35,  m: 3, dc: 20, dm: 2 },
  { c: 55,  m: 4, dc: 25, dm: 2 },
  { c: 80,  m: 5, dc: 30, dm: 3 },
  { c: 110, m: 6, dc: 35, dm: 3 },
  { c: 150, m: 8, dc: 45, dm: 4 },
];
const TIER_MAX = 7;
const TIER_NAME = {
  zh: ['', '一画', '二画', '三画', '四画', '五画', '六画', '七画以上'],
  en: ['', '1 stroke', '2 strokes', '3 strokes', '4 strokes', '5 strokes', '6 strokes', '7+ strokes'],
};
const tierOf = (n) => Math.min(Math.max(n, 1), TIER_MAX);
function tierBase(tier, lvl) {
  const t = TIERS[tier];
  return { c: t.c + (lvl - 1) * t.dc, m: t.m + (lvl - 1) * t.dm };
}

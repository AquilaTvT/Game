// ---------- profile: settings, collection, unlocks, achievements ----------
const SAVE_KEY = 'fangkuaizi.save.v1';
const DEFAULT_SETTINGS = { lang: 'zh', music: 0.6, sfx: 0.8, speed: 1, shake: true, marks: false, reduce: false, hints: true, confirmIgnite: false, haptics: true };
function freshProfile() {
  return {
    v: 1, settings: Object.assign({}, DEFAULT_SETTINGS),
    meta: {
      runs: 0, wins: 0, bestAnte: 0, bestScore: 0, bestScoreChar: null, ignites: 0, placed: 0, cells: 0, clean: 0, earned: 0, time: 0,
      chars: {}, seals: {}, bosses: {}, decks: {}, ach: {}, scribbles: 0, maxSeals: 0, endlessAnte: 0,
      tutorial: 0, tips: {}, daily: {}, history: [],
    },
    run: null,
  };
}
const Store = {
  mem: null, ok: true,
  read() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { this.ok = false; return this.mem; }
  },
  write(o) {
    this.mem = o;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(o)); this.ok = true; } catch (e) { this.ok = false; }
  },
};
let PROFILE = freshProfile();
function migrateProfile(p) {
  const f = freshProfile();
  if (!p || typeof p !== 'object') return f;
  p.settings = Object.assign({}, f.settings, p.settings || {});
  p.meta = Object.assign({}, f.meta, p.meta || {});
  for (const k of ['chars', 'seals', 'bosses', 'decks', 'ach', 'tips', 'daily']) if (!p.meta[k] || typeof p.meta[k] !== 'object') p.meta[k] = {};
  if (!Array.isArray(p.meta.history)) p.meta.history = [];
  if (p.run && (!p.run.rng || !p.run.deck || !DECKS[p.run.deckId] || p.run.v !== 1)) p.run = null;
  if (p.run) {
    // a saved run must be whole; anything doubtful is dropped rather than resumed half-broken
    try {
      const r = p.run;
      r.seals = r.seals.filter((s) => SEALS[s.id]);
      r.items = r.items.filter((i) => ITEMS[i.id]);
      r.deck = r.deck.filter((q) => SHAPES[q.shape] && INK[q.ink]);
      const okPhase = ['pick', 'round', 'cash', 'shop', 'won'].includes(r.phase);
      const rd = r.round;
      const okRound = r.phase !== 'round' && r.phase !== 'cash' ? true : !!rd && Array.isArray(rd.board) && rd.board.length === r.w * r.h && Array.isArray(rd.tray) && Array.isArray(rd.draw) && (!rd.boss || !!BOSSES[rd.boss]);
      const okShop = r.phase !== 'shop' || (!!r.shop && Array.isArray(r.shop.items) && r.shop.items.every((i) => (i.kind === 'seal' ? SEALS[i.id] : ITEMS[i.id])) && r.shop.packs.every((k) => PACKS[k.id]));
      const okText = typeof r.seed === 'string' && /^[A-Z0-9]{1,24}$/.test(r.seed) && Number.isInteger(r.ante) && r.ante >= 1 && [0, 1, 2].includes(r.blind) && typeof r.money === 'number' && isFinite(r.money) && Number.isInteger(r.w) && Number.isInteger(r.h);
      const okMisc = okText && r.deck.length >= 4 && Array.isArray(r.paper) && r.paper.length === r.w * r.h && Array.isArray(r.tiers) && !!BOSSES[r.boss] && !!STAKES[r.stake] && (r.phase !== 'cash' || !!r.cash);
      if (!okPhase || !okRound || !okShop || !okMisc) p.run = null;
    } catch (e) { p.run = null; }
  }
  p.v = 1;
  return p;
}
function loadProfile() {
  const saved = Store.read();
  PROFILE = migrateProfile(saved);
  if (!saved) {
    // first visit: follow the system where it has an opinion
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) PROFILE.settings.reduce = true;
      const l = (navigator.language || 'zh').toLowerCase();
      PROFILE.settings.lang = l.startsWith('zh') ? 'zh' : 'en';
    } catch (e) { /* keep the defaults */ }
  }
  LANG = PROFILE.settings.lang === 'en' ? 'en' : 'zh';
  return PROFILE;
}
let _saveTimer = 0;
function saveProfile(now) {
  if (now) { clearTimeout(_saveTimer); _saveTimer = 0; Store.write(PROFILE); return; }
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => { _saveTimer = 0; Store.write(PROFILE); }, 250);
}
function exportProfile() {
  const json = JSON.stringify(PROFILE);
  return 'FKZ1:' + btoa(unescape(encodeURIComponent(json)));
}
function importProfile(str) {
  try {
    const s = String(str).trim();
    if (!s.startsWith('FKZ1:')) return false;
    const text = decodeURIComponent(escape(atob(s.slice(5))));
    // a save holds only plain names and numbers: anything that looks like markup is refused outright
    if (/[<>]/.test(text)) return false;
    const obj = JSON.parse(text);
    if (!obj || !obj.meta || !obj.settings) return false;
    PROFILE = migrateProfile(obj);
    LANG = PROFILE.settings.lang === 'en' ? 'en' : 'zh';
    saveProfile(true);
    return true;
  } catch (e) { return false; }
}

// ---- achievements
const ACH = {};
const ACH_ORDER = [];
function defAch(id, zh, en, dz, de, o) { ACH[id] = Object.assign({ id, zh, en, dz, de }, o || {}); ACH_ORDER.push(id); }
defAch('first', '落笔', 'First Stroke', '第一次挥毫', 'Flourish for the first time');
defAch('win', '八法初成', 'The Eight Principles', '通关一卷（过第八法）', 'Clear all eight principles in one run');
defAch('shi', '横竖相交', 'Crossroads', '写出「十」', 'Write 十');
defAch('wang', '称王', 'Crowned', '写出「王」', 'Write 王');
defAch('wang5', '王道', 'The Kingly Way', '累计写出 5 次「王」', 'Write 王 five times in total');
defAch('jing', '凿井', 'Digging the Well', '写出「井」', 'Write 井');
defAch('kou', '方框', 'The Frame', '写出「口」', 'Write 口');
defAch('frame', '画地', 'Enclosure', '写出「日」「目」「田」中任意一个', 'Write 日, 目 or 田');
defAch('tian', '阡陌', 'Paths Between Fields', '写出「田」', 'Write 田');
defAch('shanchuan', '山川', 'Mountains and Rivers', '「山」「川」都写出过', 'Have written both 山 and 川');
defAch('nums', '识数', 'Counting', '写出「十」与「廿」', 'Write both 十 and 廿');
defAch('sa', '而立', 'Thirty', '写出「卅」', 'Write 卅');
defAch('yong', '物尽其用', 'Put to Use', '写出隐藏的字「用」', 'Write the hidden character 用');
defAch('si', '四四方方', 'Four Square', '写出隐藏的字「四」', 'Write the hidden character 四');
defAch('wei', '围城', 'The Enclosure', '写出隐藏的字「囲」', 'Write the hidden character 囲');
defAch('xuan', '玄之又玄', 'Mystery upon Mystery', '满纸皆墨：写出「玄」', 'Fill the whole sheet and write 玄');
defAch('mi', '米字格', 'Rice-pattern Square', '写出「米」', 'Write 米');
defAch('chars12', '启蒙', 'Primer', '图鉴中收录 12 个字', 'Collect 12 characters');
defAch('chars20', '识字千百', 'Well Read', '图鉴中收录 20 个字', 'Collect 20 characters');
defAch('chars30', '小学', 'Philology', '图鉴中收录 30 个字', 'Collect 30 characters');
defAch('charsAll', '说文解字', 'The Complete Lexicon', '图鉴中收录全部的字', 'Collect every character');
defAch('seq123', '一生二，二生三', 'One, Two, Three', '一局之内依次写出「一」「二」「三」', 'Write 一, 二, 三 in order within one round');
defAch('clean', '不留余墨', 'Not a Drop Left', '挥毫后纸面不留一墨', 'Leave the sheet completely empty after a flourish');
defAch('pure', '一色', 'One Colour', '一次挥毫的所有笔画（至少两画）皆为纯色', 'Flourish 2+ strokes that are all pure in ink');
defAch('zero', '墨尽', 'The Last Drop', '在墨恰好用尽时挥毫', 'Flourish with exactly 0 Ink left');
defAch('s10k', '力作', 'A Strong Piece', '一次挥毫得分达到 1 万', 'Score 10,000 with one flourish');
defAch('s1m', '神品', 'A Divine Piece', '一次挥毫得分达到 100 万', 'Score 1,000,000 with one flourish');
defAch('s1e9', '逸品', 'Beyond All Grades', '一次挥毫得分达到 10 亿', 'Score 1,000,000,000 with one flourish');
defAch('san8', '狂草', 'Wild Cursive', '写出八画以上的散笔', 'Write a scribble of 8 or more strokes');
defAch('san5', '信笔', 'Careless Brush', '累计写出 5 次散笔', 'Write five scribbles in total');
defAch('seals5', '钤印累累', 'Stamped All Over', '同时拥有 5 枚印', 'Own 5 seals at once');
defAch('ante5', '登堂', 'Into the Hall', '到达第五法', 'Reach the fifth principle');
defAch('ig100', '铁砚', 'Iron Inkstone', '累计挥毫 100 次', 'Flourish 100 times in total');
defAch('ig1000', '池水尽墨', 'The Pond Runs Black', '累计挥毫 1000 次', 'Flourish 1,000 times in total');
defAch('skip', '不屑一顾', 'Not Worth the Ink', '一卷之中跳过 4 局', 'Skip 4 sheets in one run');
defAch('rich', '洛阳纸贵', 'Paper Grows Dear', '同时持有 60 文', 'Hold $60 at once');
defAch('lanting', '兰亭', 'Orchid Pavilion', '击败《兰亭集序》', 'Defeat the Preface to the Orchid Pavilion');
defAch('three', '三大行书', 'The Three Great Running Scripts', '《兰亭集序》《祭侄文稿》《寒食帖》皆已击败', 'Defeat all three finishing masterworks');
defAch('stake4', '金榜题名', 'On the Golden List', '以进士或更高的难度通关', 'Win on Metropolitan Graduate or higher');
defAch('stake7', '状元及第', 'First in the Empire', '以状元难度通关', 'Win on First Laureate');
defAch('decks', '诸体皆备', 'Master of Every Hand', '用 6 种不同的书体通关', 'Win with 6 different scripts');
defAch('endless12', '学无止境', 'No End to Learning', '在无尽模式中到达第十二法', 'Reach principle 12 in endless mode');
defAch('legend', '见贤思齐', 'In the Company of Masters', '拥有一枚田黄之印', 'Own a Tianhuang seal');
defAch('daily', '日课', 'Daily Practice', '完成一次每日一帖', 'Finish a Daily Sheet run');

// seals that must be earned before they appear
const SEAL_LOCK = {
  wangzhe: 'wang5', guitian: 'tian', huadi: 'frame', jingjing: 'jing', shanshui: 'shanchuan', shoubai: 'clean', sansheng: 'seq123',
  langhao: 'chars20', yichui: 's10k', huaisu: 'san8', budingshi: 'san5', linmo: 'win', pofu: 'ante5', tiechu: 'ig100', qianlong: 'seals5',
  liushu: 'chars12', xiongwu: 'zero', yisi: 'pure', bamian: 'kou', suanchou: 'nums', shina: 'win', zhangfang: 'shi',
};
const achHas = (id) => !!PROFILE.meta.ach[id];
const sealUnlocked = (id) => !SEAL_LOCK[id] || achHas(SEAL_LOCK[id]);
const unlockedPool = () => SEAL_ORDER.filter(sealUnlocked);
const metaCharCount = () => Object.keys(PROFILE.meta.chars).filter((k) => k !== 'sanbi').length;
const ALL_CHARS = CH_ORDER.filter((k) => k !== 'sanbi');
function deckUnlocked(id) {
  const u = DECKS[id].unlock, m = PROFILE.meta;
  if (!u) return true;
  if (u.win) return !!(m.decks[u.win] && m.decks[u.win].wins > 0);
  if (u.ante) return m.bestAnte >= u.ante;
  if (u.chars) return metaCharCount() >= u.chars;
  if (u.stake) return Object.values(m.decks).some((d) => d.best != null && d.best >= u.stake);
  return true;
}
function deckUnlockText(id) {
  const u = DECKS[id].unlock;
  if (!u) return '';
  if (u.win) return LANG === 'zh' ? `以「${DECKS[u.win].zh}」通关后解锁` : `Win a run with ${DECKS[u.win].en}`;
  if (u.ante) return LANG === 'zh' ? `到达第${'零一二三四五六七八'[u.ante]}法后解锁` : `Reach principle ${u.ante}`;
  if (u.chars) return LANG === 'zh' ? `图鉴收录 ${u.chars} 个字后解锁（现有 ${metaCharCount()}）` : `Collect ${u.chars} characters (now ${metaCharCount()})`;
  if (u.stake) return LANG === 'zh' ? `以「${STAKES[u.stake].zh}」或更高难度通关后解锁` : `Win on ${STAKES[u.stake].en} or higher`;
  return '';
}
// highest stake available for a deck: one above the best stake won with it
const maxStake = (deckId) => { const d = PROFILE.meta.decks[deckId]; return Math.min(STAKES.length - 1, d && d.best != null ? d.best + 1 : 0); };

// ---- progress hooks (called by the UI layer after engine actions); return newly earned achievements
const _newAch = [];
function grant(id) {
  if (!ACH[id] || PROFILE.meta.ach[id]) return;
  PROFILE.meta.ach[id] = Date.now();
  _newAch.push(id);
}
function takeNewAch() { const a = _newAch.slice(); _newAch.length = 0; return a; }
function metaOnIgnite(run, res) {
  const m = PROFILE.meta;
  m.ignites++;
  grant('first');
  const id = res.char;
  let isNew = false;
  if (id === 'sanbi') {
    m.scribbles++;
    if (m.scribbles >= 5) grant('san5');
    if (res.n >= 8) grant('san8');
  } else {
    if (!m.chars[id]) isNew = true;
    m.chars[id] = (m.chars[id] || 0) + 1;
  }
  if (res.score > m.bestScore) { m.bestScore = res.score; m.bestScoreChar = id; }
  const map = { shi: 'shi', wang: 'wang', jing: 'jing', kou: 'kou', tian: 'tian', sa: 'sa', yong: 'yong', si: 'si', wei: 'wei', xuan: 'xuan', mi: 'mi' };
  if (map[id]) grant(map[id]);
  if (id === 'ri' || id === 'mu' || id === 'tian') grant('frame');
  if ((m.chars.wang || 0) >= 5) grant('wang5');
  if (m.chars.shan && m.chars.chuan) grant('shanchuan');
  if (m.chars.shi && m.chars.nian) grant('nums');
  const cnt = metaCharCount();
  if (cnt >= 12) grant('chars12');
  if (cnt >= 20) grant('chars20');
  if (cnt >= 30) grant('chars30');
  if (cnt >= ALL_CHARS.length) grant('charsAll');
  if (res.clean) { m.clean++; grant('clean'); }
  if (res.score >= 1e4) grant('s10k');
  if (res.score >= 1e6) grant('s1m');
  if (res.score >= 1e9) grant('s1e9');
  if (res.pureAll) grant('pure');
  if (res.inkZero) grant('zero');
  if (res.seq123) grant('seq123');
  if (m.ignites >= 100) grant('ig100');
  if (m.ignites >= 1000) grant('ig1000');
  return isNew;
}
function metaOnState(run) {
  const m = PROFILE.meta;
  if (!run) return;
  for (const s of run.seals) { m.seals[s.id] = 1; if (SEALS[s.id].r === 4) grant('legend'); }
  if (run.seals.length > m.maxSeals) m.maxSeals = run.seals.length;
  if (run.seals.length >= 5) grant('seals5');
  if (run.ante > m.bestAnte && run.ante <= 9) m.bestAnte = Math.min(8, run.ante);
  if (run.ante >= 5) grant('ante5');
  if (run.money >= 60) grant('rich');
  if (run.stats.skips >= 4) grant('skip');
  if (run.endless && run.ante > m.endlessAnte) m.endlessAnte = run.ante;
  if (run.endless && run.ante >= 12) grant('endless12');
}
function metaOnBoss(run, bossId) {
  const m = PROFILE.meta;
  m.bosses[bossId] = (m.bosses[bossId] || 0) + 1;
  if (bossId === 'lanting') grant('lanting');
  if (m.bosses.lanting && m.bosses.jizhi && m.bosses.hanshi) grant('three');
}
function metaOnWin(run) {
  const m = PROFILE.meta;
  m.wins++;
  const d = m.decks[run.deckId] || (m.decks[run.deckId] = { wins: 0, best: null });
  d.wins++;
  if (d.best == null || run.stake > d.best) d.best = run.stake;
  grant('win');
  if (run.stake >= 4) grant('stake4');
  if (run.stake >= 7) grant('stake7');
  if (Object.values(m.decks).filter((x) => x.wins > 0).length >= 6) grant('decks');
  if (run.daily) { grant('daily'); const dd = m.daily[run.daily] || (m.daily[run.daily] = {}); dd.won = 1; }
}
function metaOnRunEnd(run, won) {
  const m = PROFILE.meta;
  m.runs++;
  m.placed += run.stats.placed; m.cells += run.stats.cells; m.earned += run.stats.earned; m.time += run.stats.time || 0;
  m.history.unshift({ t: Date.now(), deck: run.deckId, stake: run.stake, ante: run.ante, won: !!run.won, best: run.stats.best, bestChar: run.stats.bestChar, seed: run.seed, seals: run.seals.map((s) => s.id), daily: run.daily || null });
  if (m.history.length > 30) m.history.length = 30;
  if (run.daily) {
    const dd = m.daily[run.daily] || (m.daily[run.daily] = {});
    dd.ante = Math.max(dd.ante || 0, run.ante); dd.best = Math.max(dd.best || 0, run.stats.best); dd.done = 1;
    grant('daily');
    const keys = Object.keys(m.daily).sort();
    while (keys.length > 40) delete m.daily[keys.shift()];
  }
}
function todayKey() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}
function dailyConfig(key) {
  const h = hashStr('daily' + key);
  const decks = ['kai', 'xing', 'li', 'cao', 'zhuan', 'weibei'];
  return { seed: 'D' + key, deck: decks[h % decks.length], stake: 0, daily: key };
}

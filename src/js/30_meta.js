// ---------- what outlives a run: settings, jade, the shrine, unlocked spirits, feats ----------
const SAVE_KEY = 'nightbind.save.v1';
const DEFAULT_SETTINGS = { lang: 'zh', music: 0.6, sfx: 0.8, shake: true, reduce: false, dmg: true, haptics: true, quality: 0 };
function freshProfile() {
  return { v: 1, settings: Object.assign({}, DEFAULT_SETTINGS), run: null,
    meta: { jade: 0, shrine: {}, heroes: { fox: 1 }, nights: {}, seen: {}, ach: {}, daily: {}, tutorial: 0, hero: 'fox', night: 1,
      stats: { runs: 0, wins: 0, kills: 0, seals: 0, orbs: 0, time: 0, bestRing: 0, bestScore: 0, bosses: 0 } } };
}
const Store = {
  mem: null, ok: true,
  read() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { this.ok = false; return this.mem; } },
  write(o) { this.mem = o; try { localStorage.setItem(SAVE_KEY, JSON.stringify(o)); this.ok = true; } catch (e) { this.ok = false; } },
};
let PROFILE = freshProfile();
function migrateProfile(p) {
  const f = freshProfile();
  if (!p || typeof p !== 'object') return f;
  p.settings = Object.assign({}, f.settings, p.settings || {});
  const m = p.meta = Object.assign({}, f.meta, p.meta || {});
  for (const k of ['shrine', 'heroes', 'nights', 'seen', 'ach', 'daily']) if (!m[k] || typeof m[k] !== 'object') m[k] = {};
  m.stats = Object.assign({}, f.meta.stats, m.stats || {});
  m.heroes.fox = 1;
  m.jade = Math.max(0, Math.floor(+m.jade || 0));
  if (!HEROES[m.hero] || !m.heroes[m.hero]) m.hero = 'fox';
  m.night = clamp(m.night | 0 || 1, 1, NIGHT_MAX);
  // a checkpoint must be whole, or it is dropped
  const r = p.run;
  const good = r && r.v === 1 && typeof r.seed === 'string' && /^[A-Z0-9-]{1,24}$/.test(r.seed) && HEROES[r.hero] && Number.isInteger(r.stage) && r.stage >= 0 && r.stage < 500 && r.lv && typeof r.lv === 'object'
    && Object.keys(r.lv).every((k) => TALIS[k] && r.lv[k] >= 1 && r.lv[k] <= TALIS[k].max) && Object.keys(r.evo || {}).every((k) => EVOS[k]) && Object.keys(r.rel || {}).every((k) => RELICS[k]) && r.stats && typeof r.stats === 'object';
  if (!good) p.run = null;
  p.v = 1;
  return p;
}
function loadProfile() {
  const saved = Store.read();
  PROFILE = migrateProfile(saved);
  if (!saved) {
    try {
      const l = (navigator.language || 'zh').toLowerCase();
      PROFILE.settings.lang = l.startsWith('zh') ? 'zh' : 'en';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) PROFILE.settings.reduce = true;
    } catch (e) { /* keep the defaults */ }
  }
  LANG = PROFILE.settings.lang === 'en' ? 'en' : 'zh';
}
let _saveTimer = 0;
function saveProfile(now) {
  if (now) { clearTimeout(_saveTimer); _saveTimer = 0; Store.write(PROFILE); return; }
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => { _saveTimer = 0; Store.write(PROFILE); }, 300);
}
const exportProfile = () => 'NB1:' + btoa(unescape(encodeURIComponent(JSON.stringify(PROFILE))));
function importProfile(str) {
  try {
    const s = String(str).trim();
    if (!s.startsWith('NB1:')) return false;
    const text = decodeURIComponent(escape(atob(s.slice(4))));
    if (/[<>]/.test(text)) return false;                 // a save holds only plain names and numbers
    const obj = JSON.parse(text);
    if (!obj || !obj.meta || !obj.settings) return false;
    PROFILE = migrateProfile(obj);
    LANG = PROFILE.settings.lang === 'en' ? 'en' : 'zh';
    saveProfile(true);
    return true;
  } catch (e) { return false; }
}

// ---- feats
const ACH = {};
const ACH_IDS = [];
function ach(id, zh, en, dz, de, test) { ACH[id] = { id, zh, en, dz, de, test }; ACH_IDS.push(id); }
// test(m, r): m = lifetime meta, r = the run that just ended (or null between runs)
ach('first', '初试', 'First Ring', '封印第一只妖怪', 'Seal your first yokai', (m) => m.stats.kills >= 1);
ach('ring8', '一网打尽', 'Clean Sweep', '一圈封住 8 只', 'Seal 8 in one ring', (m) => m.stats.bestRing >= 8);
ach('ring15', '天罗地网', 'Heaven’s Net', '一圈封住 15 只', 'Seal 15 in one ring', (m) => m.stats.bestRing >= 15);
ach('ring25', '森罗万象', 'All Creation', '一圈封住 25 只', 'Seal 25 in one ring', (m) => m.stats.bestRing >= 25);
ach('b1', '百目已瞑', 'Eyes Closed', '击败百目', 'Defeat Hundred Eyes', (m) => m.seen.b_hyakume);
ach('b2', '斩足', 'Legless', '击败大百足', 'Defeat the Great Centipede', (m) => m.seen.b_mukade);
ach('b3', '折翼', 'Clipped Wings', '击败大天狗', 'Defeat the Great Tengu', (m) => m.seen.b_daitengu);
ach('b4', '狐狸尾巴', 'By the Tail', '击败九尾', 'Defeat Nine Tails', (m) => m.seen.b_kyubi);
ach('b5', '天明', 'Daybreak', '击败空亡，渡过一夜', 'Defeat the Void Sun and see the dawn', (m) => m.seen.b_kuubou);
ach('n3', '三夜', 'Three Nights', '渡过第三夜', 'Survive Night III', (m) => Object.values(m.nights).some((n) => n >= 3));
ach('n5', '五夜', 'Five Nights', '渡过第五夜', 'Survive Night V', (m) => Object.values(m.nights).some((n) => n >= 5));
ach('n10', '长夜将尽', 'The Longest Night', '渡过终夜', 'Survive the Final Night', (m) => Object.values(m.nights).some((n) => n >= 10));
ach('flawless', '片叶不沾', 'Untouched', '无伤通过一场', 'Clear a stage without being hit', (m, r) => !!r && r.flawless);
ach('lv20', '渐入佳境', 'In the Flow', '一局升到 20 级', 'Reach level 20 in one run', (m, r) => !!r && r.level >= 20);
ach('lv30', '炉火纯青', 'Mastery', '一局升到 30 级', 'Reach level 30 in one run', (m, r) => !!r && r.level >= 30);
ach('evo', '进阶', 'Evolution', '完成一次符的进阶', 'Evolve a talisman', (m, r) => !!r && r.evos >= 1);
ach('evo3', '三花聚顶', 'Three Crowns', '一局完成三次进阶', 'Three evolutions in one run', (m, r) => !!r && r.evos >= 3);
ach('k1k', '千魂', 'A Thousand Souls', '累计封杀 1000 只', 'Seal 1,000 yokai in all', (m) => m.stats.kills >= 1000);
ach('k10k', '万魂', 'Ten Thousand Souls', '累计封杀 10000 只', 'Seal 10,000 yokai in all', (m) => m.stats.kills >= 10000);
ach('orbs', '照单全收', 'Returned to Sender', '累计圈住 200 颗鬼弹', 'Seal 200 orbs in all', (m) => m.stats.orbs >= 200);
ach('hero3', '同行', 'Companions', '解锁 3 位笔灵', 'Unlock 3 spirits', (m) => Object.keys(m.heroes).length >= 3);
ach('heroes', '百灵', 'Every Spirit', '解锁全部笔灵', 'Unlock every spirit', (m) => Object.keys(m.heroes).length >= HERO_IDS.length);
ach('shrine', '香火', 'Devotion', '把神社的一项供奉到顶', 'Raise one shrine boon to its highest rank', (m) => SHRINE_IDS.some((k) => (m.shrine[k] || 0) >= SHRINE[k].max));
ach('daily', '日课', 'Daily Rite', '完成一次每日挑战', 'Finish a daily challenge', (m) => Object.keys(m.daily).length >= 1);
ach('fast', '疾如风', 'Like the Wind', '14 分钟内渡过一夜', 'Survive a night within 14 minutes', (m, r) => !!r && r.won && r.time <= 840);
ach('relic5', '满载而归', 'Laden', '一局持有 5 件神器', 'Hold 5 relics in one run', (m, r) => !!r && r.relics >= 5);
ach('endless', '不知倦', 'Tireless', '在无尽夜行中再击败一个首领', 'Defeat another boss in the endless parade', (m, r) => !!r && r.bosses >= 6);
ach('all8', '八符俱全', 'Full Hand', '一局持有 8 种符', 'Hold 8 different talismans in one run', (m, r) => !!r && r.talis >= 8);
ach('glass', '如履薄冰', 'On Thin Ice', '只剩 1 点生命上限时渡过一夜', 'Survive a night with a maximum life of 1', (m, r) => !!r && r.won && r.maxHp <= 1);
ach('rich', '家有余粮', 'Well Stocked', '同时持有 1000 灵玉', 'Hold 1,000 jade at once', (m) => m.jade >= 1000);

function checkAch(run) {
  const m = PROFILE.meta, got = [];
  for (const id of ACH_IDS) { if (m.ach[id]) continue; let ok = false; try { ok = !!ACH[id].test(m, run || null); } catch (e) { ok = false; } if (ok) { m.ach[id] = 1; got.push(id); } }
  return got;
}
// spirits are earned by what happens in a run
function checkHeroes(r) {
  const m = PROFILE.meta, got = [];
  const give = (id) => { if (!m.heroes[id]) { m.heroes[id] = 1; got.push(id); } };
  if (r.stage >= 2 || r.won) give('crane');
  if (r.level >= 15) give('turtle');
  if (r.maxRing >= 12) give('raiju');
  if (m.seen.b_daitengu) give('lamp');
  if (r.won) give('dragon');
  return got;
}
// the summary of a finished (or abandoned) run, and what it earns
function settleRun(w, won) {
  const m = PROFILE.meta, st = w.stats;
  const r = { won: !!won, hero: w.heroId, night: w.night, stage: w.stage, level: w.level, time: w.t, kills: st.kills, seals: st.seals, maxRing: st.maxRing, bosses: st.bosses, score: st.score,
    evos: Object.keys(w.evo).length, relics: Object.keys(w.rel).length, talis: Object.keys(w.lv).length, maxHp: w.S.maxHp, flawless: !!w.flawlessAny, daily: w.daily };
  r.jade = Math.floor((st.bosses * 28 + st.kills / 22 + w.level * 2 + (won ? 90 : 0)) * w.nm.jade * (1 + 0.08 * (m.shrine.jade || 0)));
  m.jade += r.jade;
  m.stats.runs++; if (won) m.stats.wins++;
  m.stats.kills += st.kills; m.stats.seals += st.seals; m.stats.orbs += st.orbs; m.stats.time += w.t; m.stats.bosses += st.bosses;
  if (st.maxRing > m.stats.bestRing) m.stats.bestRing = st.maxRing;
  if (st.score > m.stats.bestScore) m.stats.bestScore = st.score;
  if (won && !w.daily) m.nights[w.heroId] = Math.max(m.nights[w.heroId] || 0, w.night);
  if (w.daily) { const d = m.daily[w.daily] || (m.daily[w.daily] = { best: 0, n: 0 }); d.n++; if (st.score > d.best) d.best = st.score; if (won) d.won = 1; }
  r.heroes = checkHeroes(r);
  r.ach = checkAch(r);
  PROFILE.run = null;
  saveProfile(true);
  return r;
}
// the highest night a spirit may attempt: one past the highest it has survived
const nightOpen = (hero) => Math.min(NIGHT_MAX, (PROFILE.meta.nights[hero] || 0) + 1);
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyConfig() {
  const key = todayKey(), r = makeRng(hashStr('daily' + key));
  return { key, seed: 'D' + key.replace(/-/g, ''), hero: r.pick(HERO_IDS), night: 2 + r.int(3) };
}
function buyShrine(id) {
  const m = PROFILE.meta, d = SHRINE[id], l = m.shrine[id] || 0;
  if (!d || l >= d.max || m.jade < d.cost[l]) return false;
  m.jade -= d.cost[l]; m.shrine[id] = l + 1;
  checkAch(null);
  saveProfile(true);
  return true;
}

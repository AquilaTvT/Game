// Regression tests for the simulation.  node tools/test_engine.js
const { loadEngine } = require('./engine');
const { makeBot } = require('./bot');
const E = loadEngine();
let failed = 0, passed = 0;
const ok = (c, m) => { if (c) passed++; else { failed++; console.error('FAIL: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
const near = (a, b, m, tol) => ok(Math.abs(a - b) <= (tol || 1e-6), m + ' — got ' + a + ', want ' + b);
const fresh = (o) => { const w = new E.World(Object.assign({ seed: 'TEST', hero: 'fox' }, o || {})); w.quiet = true; w.p.inv = 0; return w; };
const none = { x: 0, y: 0, dash: false };
// walk the spirit once round a circle (a little more than a full turn, so the trail crosses itself)
function ring(w, cx, cy, r, a0) {
  w.p.x = cx + Math.cos(a0 || 0) * r; w.p.y = cy + Math.sin(a0 || 0) * r; w.p.vx = 0; w.p.vy = 0; w.clearTrail();
  const seals0 = w.stats.seals, ev = [];
  const steps = Math.ceil(((2 * Math.PI * r) / (w.S.speed * E.STEP)) * 1.7) + 40;
  for (let i = 0; i < steps; i++) {
    const aim = Math.atan2(w.p.y - cy, w.p.x - cx) + 0.35, tx = cx + Math.cos(aim) * r, ty = cy + Math.sin(aim) * r, d = Math.hypot(tx - w.p.x, ty - w.p.y) || 1;
    w.step({ x: (tx - w.p.x) / d, y: (ty - w.p.y) / d, dash: false });
    for (const e of w.ev) ev.push(e);
    w.ev.length = 0;
    if (w.stats.seals > seals0 || w.phase !== 'play') break;
  }
  return ev;
}

// ---- geometry
{
  ok(E.segHit(0, 0, 10, 0, 5, -5, 5, 5) > 0.49 && E.segHit(0, 0, 10, 0, 5, 1, 5, 5) < 0, 'segments cross / miss');
  const sq = [0, 0, 10, 0, 10, 10, 0, 10];
  eq(Math.abs(E.polyArea(sq)), 100, 'area of a square');
  ok(E.pointInPoly(sq, 5, 5) && !E.pointInPoly(sq, 15, 5), 'point in polygon');
  near(E.distToPoly(sq, 5, -3), 3, 'distance to a polygon');
}
// ---- a ring seals what it encloses
{
  let w = fresh();
  const a = w.addFoe('wisp', 0, 0), far = w.addFoe('wisp', 400, 0);
  a.spd = 0; far.spd = 0;
  const ev = ring(w, 0, 0, 60);
  const s = ev.find((e) => e.t === 'seal');
  ok(!!s && s.n === 1 && a.dead && !far.dead, 'the enclosed wisp is sealed, the far one is not');
  ok(w.tl < 150, 'the ring is spent: the trail starts again');
  eq([w.stats.seals, w.stats.kills, w.stats.maxRing], [1, 1, 1], 'seal statistics');
  // the more in one ring, the harder it hits
  w = fresh(); w.lv = {}; w.recalc();
  const pack = []; for (let i = 0; i < 8; i++) { const e = w.addFoe('wisp', Math.cos(i) * 22, Math.sin(i) * 22); e.spd = 0; e.hp = e.mhp = 1000; pack.push(e); }
  const hp0 = pack[0].hp; ring(w, 0, 0, 68);
  near(hp0 - pack[0].hp, 10 * (1 + 0.05 * 7), 'each extra yokai adds 5%', 1e-6);
  // talismans
  w = fresh(); w.lv = { power: 2, great: 1, multi: 1 }; w.recalc();
  const p2 = []; for (let i = 0; i < 6; i++) { const e = w.addFoe('wisp', Math.cos(i) * 22, Math.sin(i) * 22); e.spd = 0; e.hp = e.mhp = 1000; p2.push(e); }
  const h0 = p2[0].hp; const ev2 = ring(w, 0, 0, 68);
  near(h0 - p2[0].hp, 10 * 1.5 * (1 + 0.13 * 5) * 1.45, 'Seal Power, Clean Sweep and Grand Seal compound', 1e-6);
  ok(ev2.find((e) => e.t === 'seal').great, 'a ring of six is a grand seal');
}
// ---- what a seal sets off
{
  let w = fresh(); w.lv = { echo: 1 }; w.recalc();
  let e = w.addFoe('oni', 0, 0); e.spd = 0; let h = e.hp;
  ring(w, 0, 0, 60); const h1 = e.hp; for (let i = 0; i < 40; i++) w.step(none);
  near(h - h1, 10, 'the seal itself'); near(h1 - e.hp, 10 * 0.42, 'the echo strikes half a second later', 1e-6);
  w = fresh(); w.lv = { burn: 1 }; w.recalc(); e = w.addFoe('oni', 0, 0); e.spd = 0; ring(w, 0, 0, 60); h = e.hp; for (let i = 0; i < 120; i++) w.step(none);
  ok(h - e.hp > 10 * 0.4 * 1.5 && w.zones.length === 1, 'the sealed ground burns');
  w = fresh(); w.lv = { chain: 2 }; w.recalc(); e = w.addFoe('wisp', 0, 0); e.spd = 0; const o1 = w.addFoe('oni', 150, 0), o2 = w.addFoe('oni', -150, 0); o1.spd = o2.spd = 0; const oh = o1.hp;
  const evc = ring(w, 0, 0, 60);
  ok(evc.filter((x) => x.t === 'zap').length === 2 && oh - o1.hp > 0 && oh - o2.hp > 0, 'Thunder leaps to the two nearest outside');
  w = fresh(); w.lv = { frost: 1 }; w.recalc(); e = w.addFoe('wisp', 0, 0); e.spd = 0; const f1 = w.addFoe('oni', 120, 0); f1.spd = 0; ring(w, 0, 0, 60);
  ok(f1.frozen > 0.5, 'Frost freezes those just outside');
  w = fresh(); w.lv = { pull: 2 }; w.recalc(); e = w.addFoe('oni', 110, 0); e.spd = 0; h = e.hp; ring(w, 0, 0, 60);
  ok(h - e.hp > 0 && Math.hypot(e.x, e.y) < 80, 'Gale sweeps the nearest in before the ring bites');
  w = fresh(); w.lv = { blast: 1 }; w.recalc(); w.addFoe('wisp', 0, 0).spd = 0; e = w.addFoe('oni', 130, 0); e.spd = 0; h = e.hp; ring(w, 0, 0, 60);
  near(h - e.hp, 10 * 0.55, 'Burst strikes outside the ring', 1e-6);
  w = fresh(); w.lv = { exec: 1 }; w.recalc(); e = w.addFoe('oni', 0, 0); e.spd = 0; e.hp = e.mhp * 0.2; ring(w, 0, 0, 60);
  ok(e.dead, 'Judgement finishes the weakened');
  w = fresh(); w.lv = { wisp: 5 }; w.recalc(); for (let i = 0; i < 12; i++) w.addFoe('wisp', Math.cos(i) * 20, Math.sin(i) * 20).spd = 0; ring(w, 0, 0, 70);
  ok(w.allies.length > 0 && w.allies.length <= w.S.wispMax, 'Bound Souls raises friendly flames');
  // orbs can be sealed
  w = fresh(); w.shoot(0, 0, 0, 0.001); w.shoot(5, 5, 0, 0.001); w.shoot(300, 0, 0, 0.001); ring(w, 0, 0, 60);
  eq([w.shots.length, w.stats.orbs], [1, 2], 'orbs inside the ring are snuffed out');
}
// ---- being hit
{
  let w = fresh(); const e = w.addFoe('oni', 0, 0); e.spd = 0;
  w.p.x = 5; w.p.y = 0; w.tx.push(1, 2, 3); w.ty.push(1, 2, 3); w.step(none);
  eq([w.p.hp, w.tx.length <= 1, w.p.inv > 1], [2, true, true], 'a touch costs a life, breaks the trail and grants a moment of grace');
  w.p.x = e.x; w.p.y = e.y; for (let i = 0; i < 20; i++) w.step(none);
  eq(w.p.hp, 2, 'no second hit during the grace');
  w = fresh(); w.lv = { shield: 1 }; w.recalc(); w.p.shield = 1; w.addFoe('oni', 0, 0).spd = 0; w.step(none);
  eq([w.p.hp, w.p.shield], [3, 0], 'the Spirit Wall takes the hit');
  w = fresh(); w.revives = 1; w.p.hp = 1; w.addFoe('oni', 0, 0).spd = 0; w.step(none);
  eq([w.phase, w.p.hp, w.revives], ['play', 1, 0], 'a charm brings the spirit back once');
  w.p.inv = 0; w.addFoe('oni', w.p.x, w.p.y).spd = 0; w.step(none);
  eq(w.phase, 'dead', 'and then no more');
  // a dash passes through
  w = fresh(); w.addFoe('oni', 40, 0).spd = 0; w.p.x = 0; w.p.y = 0;
  w.step({ x: 1, y: 0, dash: true }); for (let i = 0; i < 12; i++) w.step({ x: 1, y: 0, dash: false });
  ok(w.p.hp === 3 && w.p.x > 80, 'the dash carries the spirit through unharmed');
}
// ---- levels and choices
{
  const w = fresh(); w.xp = E.xpNeed(1) + 1; w.step(none);
  ok(w.phase === 'choice' && w.pending.choices.length === 3 && new Set(w.pending.choices.map((c) => c.id)).size === 3, 'a level offers three different talismans');
  const c = w.pending.choices[0]; ok(w.choose(0) && w.lv[c.id] === c.to && w.phase === 'play', 'choosing applies it and play resumes');
  w.due = 1; w.rollChoices(); const before = w.pending.choices.map((x) => x.id).join(); w.rerolls = 1; ok(w.reroll() && w.rerolls === 0 && !w.reroll(), 'one reroll, then none'); void before;
  w.banishes = 1; const b = w.pending.choices[0].id; ok(w.banish(0) && w.banned[b] && !w.pending.choices.some((x) => x.id === b), 'a banished talisman does not come back');
  // eight kinds at most; evolutions when both parents are full
  const w2 = fresh(); w2.lv = { power: 1, multi: 1, chain: 5, burn: 1, frost: 1, pull: 1, blast: 1, bolt: 5 }; w2.recalc(); w2.due = 1; w2.rollChoices();
  ok(w2.pending.choices[0].k === 'evo' && w2.pending.choices[0].id === 'tenbatsu', 'an evolution is offered when both parents are full');
  ok(w2.pending.choices.slice(1).every((x) => w2.lv[x.id] > 0), 'with eight kinds held, only those are offered');
  w2.choose(0); ok(w2.evo.tenbatsu === 1 && w2.S.chainJump === 2, 'the evolution takes effect');
  for (const id of E.TALI_IDS) for (let l = 1; l <= E.TALIS[id].max; l++) { const d = E.TALIS[id].d(l); ok(d.zh && d.en && !/undefined|NaN/.test(d.zh + d.en), 'talisman text: ' + id + ' ' + l); }
}
// ---- every yokai lives through a rough half minute; trail cutters cut
{
  for (const k of E.FOE_IDS) {
    const w = fresh(); w.lv = { ink: 2, shock: 2, ward: 2, shiki: 2, bolt: 2, burn: 2, echo: 2, chain: 2, blast: 2, frost: 2, pull: 2, wisp: 3 }; w.recalc();
    for (let i = 0; i < 10; i++) w.addFoe(k, 200 + i * 20, (i % 3) * 30, i === 0 ? { elite: 1 } : null);
    const bot = makeBot(E, { skill: 1 });
    let err = null;
    try { for (let i = 0; i < 1500 && w.phase !== 'dead'; i++) { if (w.phase === 'choice') bot.choose(w); else w.step(bot.input(w)); w.ev.length = 0; if (w.p.hp < 3) w.p.hp = 3; } } catch (e) { err = e; }
    ok(!err, 'foe survives a rough round: ' + k + (err ? ' ' + err.stack : ''));
    ok(w.foes.every((e) => isFinite(e.x) && isFinite(e.y) && isFinite(e.hp)) && isFinite(w.p.x), 'numbers stay finite: ' + k);
  }
  const w = fresh(); const c = w.addFoe('cutter', 300, 0);
  for (let i = 0; i < 60; i++) w.step({ x: -1, y: 0, dash: false });
  const len0 = w.tl; let cut = false;
  for (let i = 0; i < 400 && !cut; i++) { w.step({ x: 0, y: i % 40 < 20 ? 0.4 : -0.4, dash: false }); if (w.ev.some((e) => e.t === 'cut')) cut = true; w.ev.length = 0; if (w.p.hp < 3) { w.p.hp = 3; } }
  ok(cut && w.tl < len0, 'the sickle weasel bites the trail through'); void c;
}
// ---- the stages and their bosses
{
  for (let s = 0; s < E.STAGES.length; s++) {
    const w = new E.World({ seed: 'BOSS' + s, hero: 'fox', stage: s });
    w.lv = { power: 5, multi: 5, long: 5, echo: 5, great: 5, burn: 5, swift: 3, exec: 5 }; w.recalc(); w.p.hp = w.S.maxHp;
    w.stageT = E.STAGES[s].dur - 0.5;
    const bot = makeBot(E, { skill: 1.2 });
    let err = null, sawBoss = false, t0 = w.t, cleared = false;
    try {
      for (let i = 0; i < 60 * 150; i++) {
        if (w.phase === 'choice') { if (w.pending.kind === 'relic') { cleared = true; break; } bot.choose(w); continue; }
        if (w.phase !== 'play') break;
        w.step(bot.input(w));
        if (w.boss) sawBoss = true;
        w.ev.length = 0;
        if (w.p.hp < 3) w.p.hp = 3;       // the bot is clumsy; this checks the fight, not its dodging
      }
      // the bot is no duellist: if the boss still stands, finish the fight with plain rings drawn around it (and around its cores)
      w.quiet = true; w.p.inv = 1e9;
      for (const e of w.foes) if (!e.boss && !e.part && e !== w.boss) e.dead = 1;
      for (let k = 0; k < 160 && w.phase === 'play' && w.boss && !cleared; k++) {
        const b = w.boss; let tg = b;
        if (b.shielded) tg = w.foes.find((e) => e.k === 'core' && !e.dead) || b;
        if (b.k === 'kyubi' && b.s === 0 && !b.struck) { for (let i = 0; i < 20; i++) { w.step(none); w.ev.length = 0; } }
        if (tg !== b) { const oa = tg.oa + 0.22, cx = b.x + Math.cos(oa) * 118, cy = b.y + Math.sin(oa) * 118; ring(w, cx, cy, 58, oa); }
        else ring(w, tg.x, tg.y, tg.r + 36);
        w.p.inv = 1e9;                 // this part checks the fight's rules, not anyone's dodging
        if (w.phase === 'choice') { if (w.pending.kind === 'relic') cleared = true; else bot.choose(w); }
        for (let i = 0; i < 200 && w.phase === 'play' && w.clearT > 0; i++) { w.step(none); w.ev.length = 0; }
        if (w.phase === 'choice' && w.pending.kind === 'relic') cleared = true;
      }
    } catch (e) { err = e; }
    ok(!err, 'boss fight runs: ' + E.STAGES[s].boss + (err ? ' ' + err.stack : ''));
    ok(sawBoss, 'the boss arrives when the stage has run its time: ' + E.STAGES[s].boss);
    ok(cleared || w.phase === 'won', 'the boss can be brought down: ' + E.STAGES[s].boss + ' (hp ' + (w.boss ? w.bossHp().toFixed(2) : '-') + ' after ' + (w.t - t0).toFixed(0) + 's)');
    w.p.inv = 0;
    if (cleared) { const hp = w.p.hp; w.p.hp = 1; const st = w.stage; w.choose(0); ok(w.stage === st + 1 && w.p.hp === 2 && w.foes.length === 0 && Object.keys(w.rel).length === 1, 'a relic is taken, the next stage begins, one life is restored'); void hp; }
    if (s === E.STAGES.length - 1) { ok(w.phase === 'won', 'the last boss ends the night'); w.goEndless(); ok(w.endless && (w.phase === 'choice' || w.phase === 'play'), 'the parade can go on without end'); }
  }
}
// ---- checkpoint, determinism
{
  const run = (seed) => { const w = new E.World({ seed, hero: 'fox' }); const bot = makeBot(E, { skill: 1 }); for (let i = 0; i < 3000 && w.phase !== 'dead'; i++) { if (w.phase === 'choice') bot.choose(w); else w.step(bot.input(w)); w.ev.length = 0; } return [w.t.toFixed(3), w.stats.kills, w.level, w.p.x.toFixed(3), w.foes.length, Object.keys(w.lv).join()]; };
  eq(run('SAME'), run('SAME'), 'the same seed and the same hands give the same night');
  const w = fresh(); w.lv = { power: 3, echo: 2 }; w.rel = { gold: 1 }; w.evo = {}; w.level = 7; w.xp = 3; w.p.hp = 2; w.recalc();
  const cp = JSON.parse(JSON.stringify(w.checkpoint()));
  const w2 = new E.World({ seed: cp.seed, hero: cp.hero, night: cp.night, stage: cp.stage, save: cp });
  eq([w2.lv, w2.rel, w2.level, w2.p.hp, w2.S.power], [w.lv, w.rel, 7, 2, w.S.power], 'a checkpoint restores the build');
}
// ---- what outlives a run
{
  const w = fresh(); w.stats.kills = 220; w.stats.bosses = 2; w.stats.maxRing = 13; w.level = 16; w.stage = 2;
  E.setProfile(E.migrateProfile(null));
  const r = E.settleRun(w, false), m = E.getProfile().meta;
  ok(r.jade > 0 && m.jade === r.jade && m.stats.runs === 1, 'a run pays jade');
  ok(m.heroes.crane && m.heroes.turtle && m.heroes.raiju && !m.heroes.dragon, 'spirits are unlocked by what happened');
  ok(r.ach.includes('ring8') && m.ach.first, 'feats are granted');
  ok(E.buyShrine('magnet') && m.shrine.magnet === 1 && m.jade === r.jade - 20, 'the shrine takes jade');
  const code = 'NB1:' + Buffer.from(JSON.stringify({ meta: { jade: 5 }, settings: {}, run: { seed: '<img src=x>' } })).toString('base64');
  global.btoa = (s) => Buffer.from(s, 'binary').toString('base64'); global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  ok(!E.importProfile(code), 'a save code carrying markup is refused');
  const good = E.migrateProfile({ meta: { jade: 5.7, hero: 'nobody' }, settings: {}, run: { v: 1, seed: 'ABC', hero: 'fox', stage: 1, lv: { bogus: 3 }, stats: {} } });
  eq([good.meta.jade, good.meta.hero, good.run], [5, 'fox', null], 'a doubtful save is cleaned, a doubtful checkpoint dropped');
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

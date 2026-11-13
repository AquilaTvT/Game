// Balance simulation: node tools/sim.js [runs] [deck] [stake] [profile]
const { loadEngine } = require('./engine');
const { makeBot } = require('./bot');

const E = loadEngine();
const N = +process.argv[2] || 200;
const deck = process.argv[3] || 'kai';
const stake = +process.argv[4] || 0;
const profName = process.argv[5] || 'mid';
const PROFILES = {
  novice: { chars: ['yi', 'gun', 'er', 'dao', 'san', 'chuan', 'si4'], spill: 0.6, greed: 1.0, simTop: 2, shopSkill: 0 },
  mid: {},
  expert: { chars: Object.keys(E.CH).filter((k) => k !== 'sanbi' && !E.CH[k].d), spill: 1.3, greed: 1.6, simTop: 8 },
};
const bot = makeBot(E, PROFILES[profName]);

const perBlind = {}; // key ante.blind -> {n, pass, ratios[]}
const deaths = {};
const bossFail = {};
let wins = 0, errors = 0;
const t0 = Date.now();
const sealUse = {}, sealWin = {};
for (let i = 0; i < N; i++) {
  const run = E.newRun({ seed: 'SIM' + deck + stake + profName + i, deck, stake });
  let guard = 0;
  try {
    while (guard++ < 300) {
      if (run.phase === 'pick') {
        const key = run.ante + '.' + run.blind;
        E.startRound(run);
        const rd = run.round;
        const boss = rd.boss;
        bot.playRound(run);
        const errs = E.checkRun(run);
        if (errs.length) throw new Error('integrity: ' + errs.join(', '));
        const s = perBlind[key] || (perBlind[key] = { n: 0, pass: 0, ratios: [] });
        s.n++;
        const score = run.phase === 'over' ? run.lost.score : run.cash.score;
        const target = run.phase === 'over' ? run.lost.target : run.cash.target;
        s.ratios.push(score / target);
        if (run.phase !== 'over') s.pass++;
        else { deaths[key] = (deaths[key] || 0) + 1; if (boss) bossFail[boss] = (bossFail[boss] || 0) + 1; }
      } else if (run.phase === 'cash') E.collectCash(run);
      else if (run.phase === 'shop') { bot.shop(run); const errs = E.checkRun(run); if (errs.length) throw new Error('integrity: ' + errs.join(', ')); }
      else break;
    }
  } catch (e) {
    errors++;
    console.error('run', i, 'seed', run.seed, 'ante', run.ante, 'phase', run.phase, e.stack);
    if (errors > 5) break;
  }
  if (run.won) wins++;
  for (const s of run.seals) { sealUse[s.id] = (sealUse[s.id] || 0) + 1; if (run.won) sealWin[s.id] = (sealWin[s.id] || 0) + 1; }
}
const q = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
console.log(`deck=${deck} stake=${stake} profile=${profName} runs=${N} wins=${wins} (${((100 * wins) / N).toFixed(1)}%) errors=${errors} time=${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('blind   n   pass%   q10   q25   med   q75   q90  (score/target)');
for (const key of Object.keys(perBlind).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b))) {
  const s = perBlind[key];
  const f = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(2)).padStart(6);
  console.log(key.padEnd(5), String(s.n).padStart(4), ((100 * s.pass) / s.n).toFixed(1).padStart(6), f(q(s.ratios, 0.1)), f(q(s.ratios, 0.25)), f(q(s.ratios, 0.5)), f(q(s.ratios, 0.75)), f(q(s.ratios, 0.9)));
}
console.log('boss fails:', JSON.stringify(bossFail));
if (process.argv.includes('--seals')) {
  const rows = Object.keys(sealUse).map((id) => [id, sealUse[id], sealWin[id] || 0]).sort((a, b) => b[2] / b[1] - a[2] / a[1]);
  for (const r of rows) console.log(r[0].padEnd(12), String(r[1]).padStart(4), ((100 * r[2]) / r[1]).toFixed(0).padStart(4) + '%');
}

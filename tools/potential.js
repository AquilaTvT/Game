// Measures how much a bot can score in a full round at each ante (ignoring the target),
// to calibrate the target curve. node tools/potential.js [runs] [deck] [profile]
const { loadEngine } = require('./engine');
const { makeBot } = require('./bot');
const E = loadEngine();
const N = +process.argv[2] || 100, deck = process.argv[3] || 'kai', profName = process.argv[4] || 'mid';
const PROFILES = {
  novice: { chars: ['yi', 'gun', 'er', 'dao', 'san', 'chuan', 'si4'], spill: 0.6, greed: 1.0, simTop: 2, shopSkill: 0 },
  mid: {},
  expert: { chars: Object.keys(E.CH).filter((k) => k !== 'sanbi' && !E.CH[k].d), spill: 1.3, greed: 1.6, simTop: 8 },
};
const bot = makeBot(E, PROFILES[profName]);
const per = {};
for (let i = 0; i < N; i++) {
  const run = E.newRun({ seed: 'POT' + deck + profName + i, deck });
  let guard = 0;
  while (guard++ < 300 && run.ante <= 8) {
    if (run.phase === 'pick') {
      const key = run.ante + '.' + run.blind;
      E.startRound(run);
      const rd = run.round, real = rd.target;
      rd.target = Infinity;
      bot.playRound(run);
      const score = rd.score;
      (per[key] || (per[key] = [])).push({ score, best: rd.best, seals: run.seals.length, money: run.money });
      // always continue, as if the sheet was cleared
      run.phase = 'round'; run.lost = null; rd.target = real;
      E.finishRound(run, []);
    } else if (run.phase === 'cash') E.collectCash(run);
    else if (run.phase === 'shop') bot.shop(run);
    else break;
  }
}
const q = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const f = (v) => (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : v.toFixed(0)).padStart(8);
console.log(`deck=${deck} profile=${profName} runs=${N}`);
console.log('blind  target      q05      q10      q25      med      q75      q90   seals  money');
for (const key of Object.keys(per).sort((a, b) => parseFloat(a) - parseFloat(b))) {
  const s = per[key].map((r) => r.score);
  const [a, b] = key.split('.').map(Number);
  const tg = E.roundTarget(E.anteBase(a) * E.BLIND_MULT[b]);
  console.log(key.padEnd(5), f(tg), f(q(s, 0.05)), f(q(s, 0.1)), f(q(s, 0.25)), f(q(s, 0.5)), f(q(s, 0.75)), f(q(s, 0.9)),
    (per[key].reduce((x, r) => x + r.seals, 0) / per[key].length).toFixed(1).padStart(6), (per[key].reduce((x, r) => x + r.money, 0) / per[key].length).toFixed(0).padStart(6));
}

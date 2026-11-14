// Balance runs: node tools/sim.js [runs] [hero] [night] [skill]
const { loadEngine } = require('./engine');
const { makeBot } = require('./bot');
const E = loadEngine();
const N = +process.argv[2] || 20, hero = process.argv[3] || 'fox', night = +process.argv[4] || 1, skill = +process.argv[5] || 1;
const reach = [0, 0, 0, 0, 0, 0];
let wins = 0, tsum = 0, lsum = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const w = new E.World({ seed: 'SIM' + hero + night + i, hero, night });
  makeBot(E, { skill, mode: process.argv.includes('orbit') ? 'orbit' : '' }).run(w, 2400);
  const s = w.phase === 'won' ? 5 : w.stage;
  reach[s]++; if (w.phase === 'won') wins++;
  tsum += w.t; lsum += w.level;
  if (process.argv.includes('-v')) console.log(i, w.phase, 'stage', w.stage + 1, 't', w.t.toFixed(0), 'lv', w.level, 'kills', w.stats.kills, 'seals', w.stats.seals, 'maxRing', w.stats.maxRing, 'hp', w.p.hp, Object.entries(w.lv).map(([k, v]) => k + v).join(' '));
}
console.log(`hero=${hero} night=${night} skill=${skill} runs=${N} wins=${wins} (${((100 * wins) / N).toFixed(0)}%)  died in stage 1..5: ${reach.slice(0, 5).join(' ')}  avg time ${(tsum / N).toFixed(0)}s  avg level ${(lsum / N).toFixed(1)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);

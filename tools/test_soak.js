// Soak test: the practice bot plays complete runs through the real interface (placing, scoring ceremony,
// payout, shop, endings), so every animation path is exercised with real event streams.
//   node tools/shot.js --steps tools/test_soak.js [--size 390x844 --touch]
const fs = require('fs');
const path = require('path');
module.exports = async ({ page, ev, W, H }) => {
  const dir = path.join(__dirname, '..', 'src', 'js');
  const code = fs.readdirSync(dir).filter((f) => /^[0-2]\d_.*\.js$/.test(f)).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const names = new Set();
  const re = /^(?:function\s+|const\s+|let\s+|class\s+)([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.add(m[1]);
  await ev(`window.__E = { ${[...names].join(', ')} }; 1`);
  await page.evaluate((src) => { const module = { exports: {} }; new Function('module', src)(module); window.__makeBot = module.exports.makeBot; }, fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8'));
  const configs = [
    { seed: 'SOAK1', deck: 'kai', stake: 0 }, { seed: 'SOAK2', deck: 'cao', stake: 0 }, { seed: 'SOAK3', deck: 'jiagu', stake: 0 },
    { seed: 'SOAK4', deck: 'changjuan', stake: 2 }, { seed: 'SOAK5', deck: 'feibai', stake: 0 }, { seed: 'SOAK6', deck: 'zhuan', stake: 1 },
    { seed: 'SOAK7', deck: 'weibei', stake: 0 }, { seed: 'SOAK8', deck: 'shoujin', stake: 0 },
  ];
  const res = await ev(`(async () => {
    const E = window.__E, bot = window.__makeBot(E, { simTop: 3 });
    PROFILE.settings.speed = 4; PROFILE.meta.tutorial = 99; PROFILE.meta.tips.shop = 1;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = [];
    for (const cfg of ${JSON.stringify(configs)}) {
      Game.begin(cfg);
      let guard = 0, ign = 0;
      while (guard++ < 500) {
        const run = UI.run;
        if (!run) break;
        if (run.phase === 'pick') {
          Game.startRound(); await sleep(20);
          const mem = { plan: null, stuck: 0 };
          let g2 = 0;
          while (UI.run === run && run.phase === 'round' && g2++ < 600) {
            if (UI.busy) { Score.fast = true; await sleep(15); continue; }
            if (run.items.length) { bot.useRoundItems(run); Game.afterMeta(); }
            if (run.phase !== 'round') break;
            const a = bot.decide(run, mem);
            if (a.t === 'place') { run.round.tray[a.slot].rot = a.rot; Game.place(a.slot, a.x, a.y); }
            else if (a.t === 'discard') Game.discard(a.slot);
            else if (a.t === 'ignite') { const p = Game.ignite(); Score.fast = true; ign++; await p; }
            else Game.giveUp();
            if (g2 % 8 === 0) await sleep(0);
          }
          await sleep(30);
        } else if (run.phase === 'cash') { await sleep(20); Game.collect(); await sleep(20); }
        else if (run.phase === 'shop') { bot.shop(run); if (run.phase === 'shop') { Game.afterMeta(); Shop.leave(); } else Game.route(); await sleep(10); }
        else if (run.phase === 'won') { await sleep(60); closeAllModals(); if (run.ante >= 11) { Game.abandon(); break; } continueEndless(run); Game.save(); Game.route(); }
        else { await sleep(60); closeAllModals(); break; }
        const errs = E.checkRun(run);
        if (errs.length) throw new Error('integrity: ' + errs.join(','));
      }
      const run = UI.run || {};
      out.push([cfg.seed, cfg.deck, 'ante ' + (run.ante || '-'), run.won ? 'won' : 'lost', 'flourishes ' + ign, 'best ' + (run.stats ? Math.round(run.stats.best) : 0)].join(' '));
      if (UI.run && UI.run.phase !== 'over') { closeAllModals(); Game.abandon(); }
      await sleep(50);
    }
    return JSON.stringify({ out, oops: App._oops, runs: PROFILE.meta.runs, chars: Object.keys(PROFILE.meta.chars).length, ach: Object.keys(PROFILE.meta.ach).length });
  })()`).then(JSON.parse);
  for (const line of res.out) console.log(line);
  console.log('recovered errors:', res.oops, ' runs recorded:', res.runs, ' characters:', res.chars, ' feats:', res.ach);
  if (res.oops) throw new Error('the interface had to recover from an error');
  console.log('soak test passed', W + 'x' + H);
};

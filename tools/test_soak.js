// Soak test: the practice bot plays whole nights through the real interface at high speed, so that every
// effect, every boss and every screen is exercised with real event streams.
//   node tools/shot.js --steps tools/test_soak.js [--size 390x844 --touch]
const fs = require('fs');
const path = require('path');
module.exports = async ({ page, ev, W, H }) => {
  const J = (code) => ev(`JSON.stringify(${code})`).then(JSON.parse);
  await page.waitForTimeout(1200);
  await page.evaluate((src) => { const module = { exports: {} }; new Function('module', src)(module); window.__makeBot = module.exports.makeBot; }, fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8'));
  const configs = [{ hero: 'fox', night: 1, seed: 'SOAK1' }, { hero: 'dragon', night: 5, seed: 'SOAK2' }];
  for (const cfg of configs) {
    await ev(`(() => {
      PROFILE.meta.tutorial = 9; PROFILE.meta.heroes = { fox: 1, crane: 1, turtle: 1, raiju: 1, lamp: 1, dragon: 1 };
      App.begin(${JSON.stringify(cfg)});
      const bot = window.__makeBot({ STEP }, { skill: 1.3 });
      // the bot is clumsy: it is still hit (so those paths run), but it is not allowed to fall — this is about the machinery
      App.input = () => { const w = App.w; if (w.p.hp < 2) w.p.hp = w.S.maxHp; return bot.input(w); };
      App.speed = 8;
      clearInterval(window.__soak);
      let bossT = 0;
      window.__soak = setInterval(() => {
        const w = App.w;
        if (App.mode === 'choice' && UI._pick) UI._pick((Math.random() * w.pending.choices.length) | 0);
        if (App.mode !== 'play') return;
        if (w.boss) { bossT += 0.2 * App.speed; if (bossT > 25) { if (w.boss.shielded) for (const e of w.foes) if (e.k === 'core') w.hurt(e, 1e6, 'seal'); else w.hurt(w.boss, w.boss.mhp * 0.04, 'seal'); } } else bossT = 0;
      }, 200);
    })()`);
    const t0 = Date.now();
    while (Date.now() - t0 < 600000) { if ((await ev('App.mode')) === 'end') break; await page.waitForTimeout(500); }
    const r = await J('({ mode: App.mode, won: !!document.querySelector(".results.won"), stage: App.w.stage, t: Math.round(App.w.t), level: App.w.level, kills: App.w.stats.kills, seals: App.w.stats.seals, ring: App.w.stats.maxRing, bosses: App.w.stats.bosses, talis: Object.keys(App.w.lv).length, evos: Object.keys(App.w.evo).length, relics: Object.keys(App.w.rel).length, oops: App._oops, scale: App.scale })');
    console.log(cfg.hero, 'night', cfg.night, JSON.stringify(r), 'in', Math.round((Date.now() - t0) / 1000) + 's');
    if (r.oops) throw new Error('the interface had to recover from an error');
    if (r.mode !== 'end' || !r.won) throw new Error('the night was not finished: ' + JSON.stringify(r));
    await ev('clearInterval(window.__soak); App.speed = 1; App.toTitle(); 1');
    await page.waitForTimeout(600);
  }
  console.log('soak test passed', W + 'x' + H);
};

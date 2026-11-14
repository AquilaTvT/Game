// Takes the screenshots used in the README.
//   node tools/shot.js --steps tools/screens.js --size 1280x720 --dpr 1.5
//   node tools/shot.js --steps tools/screens.js --size 390x844 --touch --dpr 2
const fs = require('fs');
const path = require('path');
module.exports = async ({ page, ev, W, H }) => {
  const dir = path.join(__dirname, '..', 'docs');
  const land = W > H;
  const snap = (name) => page.screenshot({ path: path.join(dir, name + '.jpg'), type: 'jpeg', quality: 86 });
  await page.waitForTimeout(3200);
  await snap(land ? 'title' : 'phone-title');
  await page.evaluate((src) => { const module = { exports: {} }; new Function('module', src)(module); window.__makeBot = module.exports.makeBot; }, fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8'));
  const play = async (stage, lv, secs, name, pre) => {
    await ev(`(() => { PROFILE.meta.tutorial = 9; App.begin({ hero: 'fox', night: 1, stage: ${stage}, seed: 'DOCS${stage}' }); const w = App.w;
      w.lv = ${JSON.stringify(lv)}; w.level = ${6 + stage * 5}; w.recalc(); w.p.hp = w.S.maxHp; ${pre || ''}
      const bot = window.__makeBot({ STEP }, { skill: 1.3 }); App.input = () => bot.input(App.w);
      clearInterval(window.__keep); window.__keep = setInterval(() => { const w2 = App.w; if (w2.p.hp < w2.S.maxHp) w2.p.hp = w2.S.maxHp; if (App.mode === 'choice' && UI._pick && !window.__hold) UI._pick(0); }, 150); })()`);
    // wait for a good moment: a ring that has just closed around a crowd
    const t0 = Date.now();
    await page.waitForTimeout(secs * 1000);
    while (Date.now() - t0 < (secs + 40) * 1000) { if (await ev('FX.seals.some((s) => !s.echo && s.n >= 6 && s.t > 0.1 && s.t < 0.3)')) break; await page.waitForTimeout(30); }
    await snap(name);
  };
  if (land) {
    await play(0, { echo: 1, power: 1, multi: 1 }, 30, 'play');
    await play(1, { power: 3, chain: 3, burn: 2, echo: 2, ward: 2, long: 2, multi: 2 }, 0, 'boss', 'w.stageT = STAGES[1].dur - 1;');
    await page.waitForTimeout(100);
    await ev('window.__hold = true; App.w.due = 1; 1');
    for (let i = 0; i < 60 && (await ev('App.mode')) !== 'choice'; i++) await page.waitForTimeout(150);
    await page.waitForTimeout(900);
    await snap('choice');
    await ev('window.__hold = false; 1');
  } else await play(2, { power: 2, chain: 2, burn: 2, echo: 2, shiki: 2, long: 2, multi: 2 }, 20, 'phone');
  await ev('clearInterval(window.__keep); 1');
};

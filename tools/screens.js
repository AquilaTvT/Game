// Takes the screenshots used in the README.
//   node tools/shot.js --steps tools/screens.js --size 1280x720 --dpr 1.5
//   node tools/shot.js --steps tools/screens.js --size 390x844 --touch --dpr 2
const path = require('path');
module.exports = async ({ page, ev, W, H }) => {
  const dir = path.join(__dirname, '..', 'docs');
  const land = W > H;
  const snap = (name) => page.screenshot({ path: path.join(dir, name + '.jpg'), type: 'jpeg', quality: 86 });
  await page.waitForTimeout(2200);
  if (land) await snap('title');
  await ev(`(() => { PROFILE.meta.tutorial = 99; PROFILE.meta.tips.shop = 1; Game.begin({ seed: 'FANGKUAIZI', deck: 'kai' }); const run = UI.run;
    run.ante = 3; run.blind = 1; run.money = 23; run.tiers[4] = 3; run.tiers[6] = 2;
    for (const id of ['zhenyun', 'shiquan', 'huadi', 'xiabi']) addSeal(run, id, id === 'huadi' ? 'jin' : null);
    giveItem(run, 'tie6'); giveItem(run, 'zhusha');
    run.paper[27] = 'yunwen'; run.paper[36] = 'zhusi';
    Game.startRound();
    const rd = run.round; rd.target = 5600; rd.score = 2310; rd.ink = 41; rd.ignites = 3; rd.igniteCount = 1; rd.chars = ['wang'];
    const put = (cells, ink, enh, q) => { for (const [x, y] of cells) rd.board[y * 8 + x] = { ink, enh: enh || null, pid: 800 + q, shape: 'i4', q }; };
    const row = (y, x0, n) => Array.from({ length: n }, (_, i) => [x0 + i, y]);
    const col = (x, y0, n) => Array.from({ length: n }, (_, i) => [x, y0 + i]);
    put(row(0, 0, 4), 'zhu', null, 1); put(row(0, 4, 4), 'zhu', null, 2);
    put(row(7, 0, 4), 'mo', null, 3); put(row(7, 4, 3), 'mo', null, 4);
    put(col(0, 1, 3), 'qing', null, 5); put(col(0, 4, 3), 'qing', null, 6);
    put(col(7, 1, 4), 'jin', null, 7); put(col(7, 5, 2), 'jin', 'sa', 8);
    put(row(3, 1, 3), 'mo', 'fei', 9); put(row(3, 4, 3), 'zhu', null, 10);
    put(col(4, 1, 2), 'qing', null, 11); put(col(4, 4, 3), 'mo', 'nong', 12);
    put([[2, 5], [2, 6], [3, 6]], 'jin', null, 13);
    Play.inkDirty = true; Hud.refresh(); Play.layout(); })()`);
  await page.waitForTimeout(900);
  await snap(land ? 'play' : 'phone');
  if (!land) return;
  // complete the last cell and flourish: 田
  await ev(`(() => { const rd = UI.run.round; rd.board[7 * 8 + 7] = { ink: 'mo', enh: null, pid: 804, shape: 'i4', q: 4 }; Play.inkDirty = true; Hud.refresh();
    const orig = Score.stamp.bind(Score); Score.stamp = function (...a) { window.__stamped = true; return orig(...a); }; void Game.ignite(); })()`);
  await page.waitForFunction(() => window.__stamped === true, null, { timeout: 30000 });
  await page.waitForTimeout(330);
  await snap('flourish');
  await page.waitForTimeout(6000);
  await ev(`(() => { const run = UI.run; if (run.phase === 'round') { run.round.target = 1; } })()`);
  await ev(`(() => { const run = UI.run; if (run.phase === 'cash') Game.collect(); })()`);
  await page.waitForTimeout(600);
  if ((await ev('UI.run.phase')) !== 'shop') {
    await ev(`(() => { const run = UI.run, rd = run.round; rd.target = 1; for (let x = 0; x < 8; x++) rd.board[40 + x] = { ink: 'mo', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; void Game.ignite(); })()`);
    for (let i = 0; i < 60 && (await ev('UI.run.phase')) !== 'cash'; i++) { await page.mouse.click(3, 3); await page.waitForTimeout(150); }
    await page.waitForTimeout(1500);
    await ev('Game.collect()');
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(4500);
  await snap('shop');
};

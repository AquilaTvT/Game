// Flow test: tutorial, shop, cases, items, saving, resizing, language, endings.
//   node tools/shot.js --steps tools/test_flow.js [--out dir]
const assert = (c, m) => { if (!c) throw new Error('assert: ' + m); };
module.exports = async ({ page, ev, shot, W, H }) => {
  const J = (code) => ev(`JSON.stringify(${code})`).then(JSON.parse);
  const settle = (ms) => page.waitForTimeout(ms || 250);
  const fastScore = async () => { for (let i = 0; i < 80 && (await ev('UI.busy')); i++) { await page.mouse.click(4, 4); await settle(120); } };
  await settle(500);

  // ---- 1. first run: the tutorial walks along
  await page.click('#btn-new'); await settle();
  if (await page.$('#btn-go')) await page.click('#btn-go'); await settle(500);
  assert(await ev('UI.run.tutorial === true'), 'first run is a tutorial run');
  assert(await ev('!!document.querySelector(".coach")'), 'coach shown on the sheet picker');
  await shot('F01-tut-pick');
  await page.click('#btn-start'); await settle(500);
  assert((await ev('PROFILE.meta.tutorial')) === 1, 'tutorial step 1');
  await shot('F02-tut-round');
  await ev(`(() => { const run = UI.run; for (let s = 0; s < 3; s++) for (let r = 0; r < 4; r++) { run.round.tray[s].rot = r; const g = trayGeom(run, s); if (canPlace(run, s, 0, 8 - g.h)) { Game.place(s, 0, 8 - g.h); return; } } })()`);
  await settle();
  assert((await ev('PROFILE.meta.tutorial')) === 2, 'tutorial step 2 after a placement');
  await ev(`(() => { const run = UI.run, rd = run.round; for (let x = 0; x < 8; x++) if (!rd.board[7 * 8 + x] && x < 7) rd.board[7 * 8 + x] = { ink: 'mo', enh: null, pid: 0, shape: 'dot' };
    rd.board[7 * 8 + 7] = null; for (let s = 0; s < 3; s++) { const t = rd.tray[s]; t.sh = 'dot'; } Play.inkDirty = true; Game.place(0, 7, 7); })()`);
  await settle();
  assert((await ev('PROFILE.meta.tutorial')) === 3, 'tutorial step 3 once a row is full');
  await shot('F03-tut-line');
  await page.click('.coach .btn.gold'); await settle();
  assert((await ev('PROFILE.meta.tutorial')) === 4, 'tutorial step 4');
  await page.click('#btn-ignite'); await settle(300);
  await fastScore();
  assert((await ev('PROFILE.meta.tutorial')) === 5, 'tutorial step 5 after the flourish');
  await shot('F04-tut-score');
  await page.click('.coach .btn.gold'); await settle(150);
  await page.click('.coach .btn.gold'); await settle(150);
  await page.click('.coach .btn.gold'); await settle(150);
  assert((await ev('PROFILE.meta.tutorial')) === 99 && !(await ev('!!document.querySelector(".coach")')), 'tutorial finished');

  // ---- 2. every sound effect can be triggered
  const snd = await ev(`(() => { const names = ['tick','click','back','pick','rotate','place','bad','line','rinse','ignite','stroke','cell','dead','chips','mult','xmult','coin','seal','pure','char','total','count','flame','win','lose','victory','buy','sell','deny','reroll','open','level','ach','paper','stone','shatter','newchar','use','boss'];
    for (const n of names) Snd.play(n, 3); for (const m of ['calm','boss','shop','title']) Snd.setMusic(m); return Snd.ready; })()`);
  assert(snd === true, 'audio engine ready after a gesture');

  // ---- 3. win the sheet, collect, shop
  await ev(`(() => { const run = UI.run, rd = run.round; rd.target = 10; for (let x = 0; x < 8; x++) rd.board[x] = { ink: 'zhu', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; Hud.refresh(); })()`);
  await page.click('#btn-ignite'); await settle(300); await fastScore(); await settle(1200);
  assert((await ev('UI.run.phase')) === 'cash', 'payout view after clearing');
  await page.waitForFunction(() => { const b = document.querySelector('#btn-collect'); return b && !b.disabled; }, null, { timeout: 8000 });
  await page.click('#btn-collect'); await settle(500);
  assert((await ev('UI.run.phase')) === 'shop', 'shop after payout');
  assert(await ev('!!document.querySelector(".coach")'), 'shop tip shown once');
  await page.click('.coach .btn.gold'); await settle(150);
  await ev('UI.run.money = 60; Shop.render(); Hud.refresh(); 1');
  await shot('F05-shop');
  // buy the first thing on the shelf through its card
  const m0 = await ev('UI.run.money');
  await page.click('.goods .good'); await settle(200);
  assert(await ev('document.querySelector("#pop").style.display === "block"'), 'card opens on click');
  await page.click('#pop .btn.red'); await settle(300);
  assert((await ev('UI.run.money')) < m0, 'buying costs money');
  // a case
  await ev(`(() => { const run = UI.run; run.shop.packs[0] = { id: 'wen2', price: 4, sold: false }; Shop.render(); })()`);
  await page.click('.good[data-p="0"]'); await settle(200);
  await page.click('#pop .btn.red'); await settle(600);
  assert(await ev('!!UI.run.pack && modalOpen()'), 'case opened');
  await shot('F06-case');
  await page.click('.pchoice .btn'); await settle(400);
  assert(await ev('!UI.run.pack && !modalOpen()'), 'case closes after choosing');

  // ---- 4. items: dye blocks through the picker, mark a paper square
  await ev(`(() => { const run = UI.run; run.items.length = 0; giveItem(run, 'zhusha', true); giveItem(run, 'g_zhusi', true); Hud.refresh(); })()`);
  const red0 = await ev('UI.run.deck.filter(p => p.ink === "zhu").length');
  await page.click('#side .item:not(.empty)'); await settle(200);
  await page.click('#pop .btn.red'); await settle(300);
  assert(await ev('modalOpen()'), 'block picker opens');
  const pcs = await page.$$('.modal .pc');
  let picked = 0;
  for (const el of pcs) { const uid = await el.getAttribute('data-uid'); if (await ev(`pieceByUid(UI.run, ${uid}).ink !== 'zhu'`)) { await el.click(); if (++picked === 3) break; } }
  await shot('F07-picker');
  await page.click('#btn-target-ok'); await settle(300);
  assert((await ev('UI.run.deck.filter(p => p.ink === "zhu").length')) === red0 + 3, 'three blocks dyed vermilion');
  await page.click('#side .item:not(.empty)'); await settle(200);
  await page.click('#pop .btn.red'); await settle(300);
  await page.click('.paperpick button:nth-child(28)'); await settle(300);
  assert((await ev('UI.run.paper[27]')) === 'zhusi', 'paper square marked');

  // ---- 5. next sheet; an item aimed straight at the sheet
  await page.click('#btn-next'); await settle(400);
  assert((await ev('UI.run.phase')) === 'pick', 'sheet picker after the shop');
  await page.click('#btn-start'); await settle(500);
  await ev(`giveItem(UI.run, 'dianjing_i', true); Hud.refresh(); 1`);
  await page.click('#side .item:not(.empty)'); await settle(200);
  await page.click('#pop .btn.red'); await settle(300);
  assert(await ev('!!Play.target'), 'sheet targeting mode');
  const cp = await J('Play.cellVP(3 * 8 + 4)');
  await page.mouse.click(cp.x, cp.y); await settle(300);
  assert(await ev('!!UI.run.round.board[28] && UI.run.round.board[28].enh === "bai" && !Play.target'), 'blank cell dotted onto the sheet');

  // ---- 6. save, reload, continue exactly where we were
  await ev(`(() => { const run = UI.run; for (let s = 0; s < 3; s++) for (let r = 0; r < 4; r++) { run.round.tray[s].rot = r; const g = trayGeom(run, s); if (canPlace(run, s, 0, 8 - g.h)) { Game.place(s, 0, 8 - g.h); return; } } })()`);
  await settle(400);
  const before = await J('({ ante: UI.run.ante, blind: UI.run.blind, phase: UI.run.phase, ink: UI.run.round.ink, filled: UI.run.round.board.filter(Boolean).length, seed: UI.run.seed, tray: UI.run.round.tray.map(t => t && t.uid), money: UI.run.money, seals: UI.run.seals.length })');
  await ev('saveProfile(true); 1');
  await page.reload(); await settle(900);
  assert(await ev('!!document.querySelector("#btn-continue")'), 'continue offered after reload');
  await shot('F08-title-continue');
  await page.click('#btn-continue'); await settle(600);
  const after = await J('({ ante: UI.run.ante, blind: UI.run.blind, phase: UI.run.phase, ink: UI.run.round.ink, filled: UI.run.round.board.filter(Boolean).length, seed: UI.run.seed, tray: UI.run.round.tray.map(t => t && t.uid), money: UI.run.money, seals: UI.run.seals.length })');
  assert(JSON.stringify(before) === JSON.stringify(after), 'run restored exactly: ' + JSON.stringify([before, after]));
  await shot('F09-resumed');

  // ---- 7. rotate the device / resize the window mid-round
  await page.setViewportSize({ width: 430, height: 900 }); await settle(500);
  assert((await ev('UI.orient')) === 'p' && (await ev('Play.cs')) > 30, 'portrait layout after resize');
  await shot('F10-resized-portrait');
  await page.setViewportSize({ width: 1000, height: 480 }); await settle(500);
  assert((await ev('UI.orient')) === 'l', 'landscape layout after resize');
  await shot('F11-resized-short');
  await page.setViewportSize({ width: 1920, height: 1080 }); await settle(500);
  await shot('F12-resized-1080p');
  await page.setViewportSize({ width: W, height: H }); await settle(400);

  // ---- 8. language switch
  await page.keyboard.press('Escape'); await settle(250);
  assert(await ev('modalOpen()'), 'pause opens with Escape');
  await page.keyboard.press('Escape'); await settle(200);
  await ev('Overlays.settings(); 1'); await settle(300);
  await page.click('.seg button:nth-child(2)'); await settle(600);
  assert((await ev('LANG')) === 'en' && (await ev('document.querySelector("#btn-ignite .t").textContent')) === 'Flourish', 'English interface');
  await shot('F13-english-round');
  await ev('Overlays.dictionary(); 1'); await settle(400); await shot('F14-english-lexicon');
  await ev('closeAllModals(); Overlays.collection(); 1'); await settle(400); await shot('F15-english-collection');
  await ev(`closeAllModals(); 1`);

  // ---- 9. a masterwork, then victory and the endless scroll
  await ev(`(() => { const run = UI.run; concede(run); })()`);
  await ev(`(() => { Game.begin({ seed: 'ENDTEST', deck: 'kai' }); const run = UI.run; run.ante = 8; run.blind = 2; run.boss = 'lanting'; for (const id of ['zhenyun', 'kuteng']) addSeal(run, id); Game.route(); })()`);
  await settle(400);
  await shot('F16-english-pick-boss');
  await page.click('#btn-start'); await settle(600);
  await shot('F17-english-boss-round');
  await ev(`(() => { const run = UI.run, rd = run.round; rd.target = 10; for (let x = 0; x < 8; x++) rd.board[16 + x] = { ink: 'jin', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; Hud.refresh(); })()`);
  await page.click('#btn-ignite'); await settle(300); await fastScore(); await settle(1300);
  await page.waitForFunction(() => { const b = document.querySelector('#btn-collect'); return b && !b.disabled; }, null, { timeout: 8000 });
  await page.click('#btn-collect'); await settle(800);
  assert((await ev('UI.run.phase')) === 'won' && (await ev('modalOpen()')), 'victory screen');
  assert((await ev('PROFILE.meta.wins')) === 1 && (await ev('maxStake("kai")')) === 1, 'win recorded, next rank opened');
  await settle(3000);
  await shot('F18-english-victory');
  await page.click('.modal .btn.gold'); await settle(600);
  assert((await ev('UI.run.phase')) === 'shop' && (await ev('UI.run.endless')) === true && (await ev('UI.run.ante')) === 9, 'endless continues into the shop');
  await page.click('#btn-next'); await settle(400);
  await page.click('#btn-start'); await settle(500);
  // ---- 10. losing
  await ev(`(() => { const run = UI.run, rd = run.round; rd.ignites = 1; for (let x = 0; x < 8; x++) rd.board[16 + x] = { ink: 'mo', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; Hud.refresh(); })()`);
  await page.click('#btn-ignite'); await settle(300); await fastScore(); await settle(1200);
  assert(await ev('modalOpen() && UI.run.phase === "over" && PROFILE.run === null'), 'game over screen, run removed from the save');
  await shot('F19-english-over');
  await page.click('.modal .btn.ghost'); await settle(500);
  assert(await ev('document.querySelector("#menu").classList.contains("on") && !document.querySelector("#btn-continue")'), 'back on the title');
  await shot('F20-english-title');
  assert((await ev('PROFILE.meta.runs')) >= 1, 'runs counted');

  // ---- 11. hammering Enter through a winning flourish only skips the ceremony: the payout is taken once, from the payout view
  await ev(`(() => { const orig = Game.collect.bind(Game); window.__collect = { early: 0, paid: 0 };
    Game.collect = function () { const b = document.querySelector('#btn-collect'), m = UI.run ? UI.run.money : 0;
      const shown = !UI.busy && document.querySelector('#v-cash').classList.contains('on') && !!b && !b.disabled;
      const r = orig(); if (UI.run && UI.run.money !== m) { window.__collect.paid++; if (!shown) window.__collect.early++; } return r; };
    Game.begin({ seed: 'KEYS', deck: 'kai' }); })()`); await settle(400);
  for (let sheet = 0; sheet < 2; sheet++) {
    await page.keyboard.press('Enter'); await settle(500);
    assert((await ev('UI.run.phase')) === 'round', 'Enter starts the sheet');
    await ev(`(() => { const run = UI.run, rd = run.round; rd.target = 10; for (let x = 0; x < 8; x++) rd.board[x] = { ink: 'mo', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; Hud.refresh(); })()`);
    await page.keyboard.press(' '); await settle(60);
    assert(await ev('UI.busy'), 'Space flourishes');
    for (let i = 0; i < 600 && (await ev('UI.run.phase')) !== 'shop'; i++) { await page.keyboard.press('Enter'); await settle(25); }
    const c = await J('window.__collect');
    assert((await ev('UI.run.phase')) === 'shop', 'Enter collects the payout in the end');
    assert(c.early === 0, 'nothing is collected before the payout is on screen (sheet ' + (sheet + 1) + ')');
    assert(c.paid === sheet + 1, 'the payout is taken exactly once (sheet ' + (sheet + 1) + '): ' + JSON.stringify(c));
    assert(!(await ev('!!document.querySelector("#btn-collect")')), 'no stale payout button is left behind');
    await settle(300);
    await page.click('#btn-next'); await settle(400);
  }
  await ev('Game.abandon(); 1'); await settle(300);
  console.log('flow test passed', W + 'x' + H);
};

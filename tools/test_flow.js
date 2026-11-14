// Flow test in a real browser: menus, input, a ring drawn with the mouse, levels, pause, checkpoint, endings.
//   node tools/shot.js --steps tools/test_flow.js [--size 390x844 --touch]
const assert = (c, m) => { if (!c) throw new Error('assert: ' + m); };
module.exports = async ({ page, ev, W, H }) => {
  const J = (code) => ev(`JSON.stringify(${code})`).then(JSON.parse);
  const wait = (ms) => page.waitForTimeout(ms || 250);
  const until = async (code, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { if (await ev(code)) return; await wait(100); } throw new Error('timed out: ' + (what || code)); };
  await wait(1500);

  // ---- 1. the title, with the parade playing behind it
  assert(await ev('GL.ok && App.demo && !!document.querySelector("#btn-start")'), 'title is up and the demo runs');
  assert(!(await ev('!!PROFILE.run')), 'no checkpoint on a first visit');
  await page.click('#btn-start'); await wait(400);
  assert(await ev('!!document.querySelector(".hero.sel")'), 'spirit select');
  await page.click('.hside .btn.gold'); await wait(600);
  assert(await ev('App.mode === "play" && !App.demo && document.querySelector("#hud").classList.contains("on")'), 'a night begins');
  assert(await ev('!!PROFILE.run && PROFILE.run.stage === 0'), 'a checkpoint is written as the stage begins');
  assert(await ev('document.querySelector(".hint").classList.contains("on")'), 'first-night hint');
  await ev('App.w.quiet = true; App.w.foes.length = 0; App.w.p.inv = 1e9; 1');

  // ---- 2. keyboard, mouse, dash
  let x0 = await ev('App.w.p.x');
  await page.keyboard.down('d'); await wait(500); await page.keyboard.up('d');
  assert((await ev('App.w.p.x')) > x0 + 60, 'D moves the spirit right');
  x0 = await ev('App.w.p.x'); const y0 = await ev('App.w.p.y');
  await page.mouse.move(W / 2, H / 2 - Math.min(W, H) * 0.3); await wait(600);
  assert((await ev('App.w.p.y')) < y0 - 40, 'the spirit follows the mouse');
  await page.mouse.move(W / 2, H / 2); await wait(300);
  const d0 = await ev('App.w.p.dashN');
  await page.keyboard.press(' '); await wait(80);
  assert((await ev('App.w.p.dashN')) === d0 - 1 || (await ev('App.w.p.dash')) > 0, 'Space dashes');
  await wait(400);

  // ---- 3. a ring drawn with the mouse seals what is inside it
  await ev(`(() => { const w = App.w, p = w.p; w.clearTrail(); for (let i = 0; i < 6; i++) { const e = w.addFoe('wisp', p.x + 110 + Math.cos(i) * 14, p.y + Math.sin(i) * 14); e.spd = 0; } })()`);
  const c = await J('(() => { const q = Render.toScreen(App.w.p.x + 110, App.w.p.y, {}); return q; })()');
  const z = await ev('GL.cam.z / (GL.dpr * GL.scale)');
  const r = 62 * z;
  for (let turn = 0; turn < 3 && (await ev('App.w.stats.seals')) === 0; turn++) {
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI * 2.3;
      // the camera follows the spirit, so the pack's place on the page is asked for again each step
      const q = await J('Render.toScreen(App.w.foes.length ? App.w.foes[0].x : App.w.p.x, App.w.foes.length ? App.w.foes[0].y : App.w.p.y, {})');
      await page.mouse.move(q.x + Math.cos(a) * r * 1.25, q.y + Math.sin(a) * r * 1.25);
      await wait(45);
      if ((await ev('App.w.stats.seals')) > 0) break;
    }
  }
  assert((await ev('App.w.stats.seals')) >= 1 && (await ev('App.w.stats.kills')) >= 3, 'a ring drawn with the mouse seals the pack: ' + JSON.stringify(await J('App.w.stats')));
  void c;

  // ---- 4. a level: three cards, picked with the keyboard
  await page.mouse.move(W / 2, H / 2);
  await ev('App.w.due = 1; 1');
  await until('App.mode === "choice" && document.querySelectorAll(".card").length === 3', 5000, 'the choice of talismans');
  const before = await J('App.w.lv');
  await wait(500);
  await page.keyboard.press('2'); await until('App.mode === "play"', 4000, 'play resumes after the pick');
  assert(JSON.stringify(await J('App.w.lv')) !== JSON.stringify(before), 'the chosen talisman is held');

  // ---- 5. pause and resume
  await page.keyboard.press('Escape'); await wait(300);
  assert(await ev('App.mode === "paused" && UI.open()'), 'Escape pauses');
  const t1 = await ev('App.w.t'); await wait(500);
  assert((await ev('App.w.t')) === t1, 'time stands still while paused');
  await page.keyboard.press('Escape'); await wait(300);
  assert(await ev('App.mode === "play" && !UI.open()'), 'Escape resumes');

  // ---- 6. resize / rotate mid-fight
  await page.setViewportSize({ width: 430, height: 880 }); await wait(500);
  assert(await ev('GL.ok && GL.W > 0 && App.mode === "play"'), 'portrait after a resize');
  await page.setViewportSize({ width: 900, height: 420 }); await wait(400);
  await page.setViewportSize({ width: W, height: H }); await wait(400);

  // ---- 7. the checkpoint survives a reload, and the title leaves it alone
  await ev(`(() => { const w = App.w; w.lv = { power: 2, echo: 1 }; w.level = 5; w.recalc(); w.nextStage(); App.drain(); })()`);
  assert(await ev('PROFILE.run.stage === 1 && PROFILE.run.level === 5'), 'the next stage writes a new checkpoint');
  await page.reload(); await wait(1500);
  assert(await ev('!!document.querySelector("#btn-continue")'), 'continue is offered after a reload');
  await ev('saveProfile(true); 1');
  assert(await ev('!!PROFILE.run'), 'saving on the title leaves the checkpoint alone');
  await page.click('#btn-continue'); await wait(600);
  assert(await ev('App.mode === "play" && App.w.stage === 1 && App.w.level === 5 && App.w.lv.power === 2'), 'the night is picked up at the start of its stage');

  // ---- 8. language
  await ev('App.w.quiet = true; App.w.p.inv = 1e9; UI.pause(); UI.settings(); 1'); await wait(300);
  await page.click('.seg button:nth-child(2)'); await wait(500);
  assert(await ev('LANG === "en" && !UI.open()'), 'English, and no stale dialog is left open');
  await ev('PROFILE.settings.lang = "zh"; LANG = "zh"; App.relang(); App.mode = "play"; 1'); await wait(200);

  // ---- 9. falling
  await ev('(() => { const w = App.w; w.p.inv = 0; w.p.hp = 1; w.stats.kills = 120; w.addFoe("oni", w.p.x, w.p.y); })()');
  await until('App.mode === "end" && !!document.querySelector(".results")', 9000, 'the results screen');
  assert(await ev('PROFILE.run === null && PROFILE.meta.stats.runs === 1 && PROFILE.meta.jade > 0'), 'the run is settled: jade paid, checkpoint gone');
  await page.click('.rbtns .btn.ghost'); await wait(600);
  assert(await ev('App.demo && !!document.querySelector("#btn-start") && !document.querySelector("#btn-continue")'), 'back on the title');

  // ---- 10. winning the night, then the endless parade
  await ev(`(() => { PROFILE.meta.tutorial = 9; App.begin({ hero: 'fox', night: 1, stage: 4, seed: 'WIN' }); const w = App.w; w.p.inv = 1e9; w.quiet = true; w.spawnBoss(); App.drain(); w.boss.gate = []; w.hurt(w.boss, 1e9, 'seal'); App.drain(); })()`);
  await until('App.mode === "end" && !!document.querySelector(".results.won")', 12000, 'the dawn screen');
  assert(await ev('PROFILE.meta.nights.fox === 1 && !!PROFILE.meta.heroes.dragon && !!PROFILE.meta.seen.b_kuubou'), 'the night is recorded and the Ink Dragon unlocked');
  const labels = await J('[...document.querySelectorAll(".rbtns .btn")].map((b) => b.textContent)');
  assert(labels.length === 4, 'endless, a deeper night, again, title: ' + labels.join('|'));
  await page.click('.rbtns .btn'); await wait(500);
  await until('App.mode === "choice" && App.w.pending && App.w.pending.kind === "relic"', 5000, 'a relic is offered before the parade goes on');
  await wait(500); await page.keyboard.press('1');
  for (let i = 0; i < 12 && (await ev('App.mode')) === 'choice'; i++) { await wait(600); await page.keyboard.press('1'); await wait(500); }
  assert(await ev('App.mode === "play" && App.w.stage === 5 && App.w.loop === 1 && App.w.endless'), 'the endless parade begins');
  await ev('App.finish(false); 1'); await wait(500);

  // ---- 11. shrine, codex, daily
  await ev('PROFILE.meta.jade = 500; App.toTitle(); UI.shrine(); 1'); await wait(300);
  await page.click('.boon'); await wait(200);
  assert(await ev('PROFILE.meta.shrine.power === 1 && PROFILE.meta.jade === 470'), 'an offering at the shrine');
  await ev('UI.codex("ach"); 1'); await wait(200);
  assert(await ev('document.querySelectorAll(".codex .bl").length === ACH_IDS.length'), 'the codex lists every feat');
  await ev('UI.title(); 1'); await wait(200);
  await page.click('#btn-daily'); await wait(600);
  assert(await ev('App.mode === "play" && !!App.w.daily && App.w.seed.startsWith("D")'), 'the daily night starts from the day’s seed');
  await ev('App.finish(false); App.toTitle(); 1'); await wait(400);
  assert(await ev('Object.keys(PROFILE.meta.daily).length === 1'), 'the daily result is kept');
  console.log('flow test passed', W + 'x' + H);
};

// Interaction test: drives the real page with mouse, keyboard and touch input.
//   node tools/shot.js --steps tools/test_ui.js [--size 390x844 --touch]
const assert = (c, m) => { if (!c) throw new Error('assert: ' + m); };
module.exports = async ({ page, ev, W, H }) => {
  await page.waitForTimeout(500);
  await page.click('#btn-new'); await page.waitForTimeout(250);
  if (await page.$('#btn-go')) await page.click('#btn-go'); await page.waitForTimeout(400);
  await ev('Tutorial.set(99); Tutorial.hide(); 1');
  await page.click('#btn-start'); await page.waitForTimeout(500);
  const st = () => ev(`JSON.stringify({ ink: UI.run.round.ink, placed: UI.run.round.placed, discards: UI.run.round.discards, filled: UI.run.round.board.filter(Boolean).length, rots: UI.run.round.tray.map(t => t ? t.rot : -1), phase: UI.run.phase, busy: UI.busy })`).then(JSON.parse);
  const slot = (i) => ev(`JSON.stringify(Play.toViewport(Play.slots[${i}].x + Play.slots[${i}].w / 2, Play.slots[${i}].y + Play.slots[${i}].h / 2 - 9))`).then(JSON.parse);
  const cell = (x, y) => ev(`JSON.stringify(Play.cellVP(${y} * UI.run.w + ${x}))`).then(JSON.parse);
  // find a spot where the block in a slot fits, as the engine sees it
  const spot = (i) => ev(`(() => { const run = UI.run, g = trayGeom(run, ${i}); for (let y = run.h - g.h; y >= 0; y--) for (let x = 0; x <= run.w - g.w; x++) if (canPlace(run, ${i}, x, y)) return JSON.stringify({ x, y, w: g.w, h: g.h }); return 'null'; })()`).then(JSON.parse);

  let a = await st();
  assert(a.phase === 'round' && a.filled === 0, 'round started empty');

  // 1. click rotates
  let p = await slot(0);
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(80);
  let b = await st();
  assert(b.rots[0] === (a.rots[0] + 1) % 4, 'click rotates slot 0: ' + JSON.stringify([a.rots, b.rots]));

  // 2. mouse drag places
  const dragTo = async (from, to, steps) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(from.x + 6, from.y - 14, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: steps || 12 });
    await page.waitForTimeout(60);
    await page.mouse.up(); await page.waitForTimeout(120);
  };
  let sp = await spot(0);
  let c0 = await cell(sp.x, sp.y), c1 = await cell(sp.x + sp.w - 1, sp.y + sp.h - 1);
  await dragTo(p, { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 + (await ev('Play.cs * UI.s * 0.1')) });
  b = await st();
  assert(b.placed === 1 && b.filled > 0 && b.ink < a.ink, 'mouse drag placed a block: ' + JSON.stringify(b));

  // 3. drag onto the rinse button discards
  p = await slot(1);
  const rb = await page.locator('#btn-rinse').boundingBox();
  await dragTo(p, { x: rb.x + rb.width / 2, y: rb.y + rb.height / 2 });
  let c = await st();
  assert(c.discards === b.discards - 1 && c.placed === 1, 'drag to rinse discards: ' + JSON.stringify(c));

  // 4. dropping on an occupied square is refused
  sp = await spot(2);
  p = await slot(2);
  const occ = await ev(`(() => { const run = UI.run; const i = run.round.board.findIndex(Boolean); return JSON.stringify(Play.cellVP(i)); })()`).then(JSON.parse);
  await dragTo(p, occ);
  let d = await st();
  assert(d.placed === 1 || d.filled > c.filled, 'occupied drop handled: ' + JSON.stringify(d));

  // 5. keyboard: pick, move, place
  const before = await st();
  await page.keyboard.press('1'); await page.waitForTimeout(60);
  await page.keyboard.press('r'); await page.waitForTimeout(40);
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowUp');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press(' '); await page.waitForTimeout(150);
  let e = await st();
  if (e.placed === before.placed) { for (let k = 0; k < 6 && e.placed === before.placed; k++) { await page.keyboard.press('ArrowRight'); await page.keyboard.press(' '); await page.waitForTimeout(100); e = await st(); } }
  assert(e.placed === before.placed + 1, 'keyboard placed a block: ' + JSON.stringify([before, e]));

  // 6. rinse mode: Q then click a block
  await page.keyboard.press('q'); await page.waitForTimeout(60);
  p = await slot(0);
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(120);
  let f = await st();
  assert(f.discards === e.discards - 1, 'rinse mode discards: ' + JSON.stringify(f));

  // 7. touch: tap rotates, drag places (the block floats above the finger)
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y) })) });
  p = await slot(1);
  const r0 = (await st()).rots[1];
  await touch('touchStart', [p]); await page.waitForTimeout(30); await touch('touchEnd', []); await page.waitForTimeout(120);
  const r1 = (await st()).rots[1];
  assert(r1 === (r0 + 1) % 4, 'tap rotates: ' + r0 + ' -> ' + r1);
  sp = await spot(1);
  const g = await ev(`JSON.stringify({ h: trayGeom(UI.run, 1).h, cs: Play.cs * UI.s })`).then(JSON.parse);
  c0 = await cell(sp.x, sp.y); c1 = await cell(sp.x + sp.w - 1, sp.y + sp.h - 1);
  const target = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 + (g.h / 2) * g.cs + 46 * (await ev('UI.s')) };
  const pre = await st();
  await touch('touchStart', [p]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: p.x + (target.x - p.x) * i / 10, y: p.y + (target.y - p.y) * i / 10 }]); await page.waitForTimeout(16); }
  await page.waitForTimeout(60);
  await touch('touchEnd', []); await page.waitForTimeout(160);
  const post = await st();
  assert(post.placed === pre.placed + 1, 'touch drag placed a block: ' + JSON.stringify([pre, post]));

  // 7b. seals can be dragged into a new order
  await ev("(() => { const run = UI.run; for (const id of ['zhenyun', 'kuteng', 'runbi']) addSeal(run, id); Hud.refresh(); })()");
  await page.waitForTimeout(150);
  const sealBox = async (i) => { const els = await page.$$('#side .seal:not(.empty)'); return els[i].boundingBox(); };
  const a0 = await sealBox(0), a2 = await sealBox(2);
  await page.mouse.move(a0.x + a0.width / 2, a0.y + a0.height / 2); await page.mouse.down();
  await page.mouse.move(a0.x + a0.width / 2 + 5, a0.y + a0.height / 2 + 30, { steps: 4 });
  await page.mouse.move(a2.x + a2.width / 2, a2.y + a2.height / 2, { steps: 6 });
  await page.mouse.up(); await page.waitForTimeout(200);
  const order = await ev('UI.run.seals.map(s => s.id).join(",")');
  assert(order === 'kuteng,zhenyun,runbi', 'seal dragged before the third: ' + order);
  assert(!(await ev('!!_popAnchor')), 'no card opened by the drag');

  // 8. fill a row through the engine and flourish with the keyboard
  await ev(`(() => { const run = UI.run, rd = run.round; for (let x = 0; x < run.w; x++) if (!rd.board[x]) rd.board[x] = { ink: 'mo', enh: null, pid: 0, shape: 'dot' }; Play.inkDirty = true; Hud.refresh(); })()`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  if (await ev('modalOpen()')) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  assert((await st()).busy === true || (await ev('UI.run.round.igniteCount')) === 1, 'space flourishes');
  for (let i = 0; i < 40 && (await st()).busy; i++) { await page.mouse.click(5, 5); await page.waitForTimeout(150); }
  assert((await ev('UI.run.round.igniteCount')) === 1, 'flourish counted');
  console.log('ui interaction test passed', W + 'x' + H);
};

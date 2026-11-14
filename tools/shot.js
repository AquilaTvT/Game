// Drives the game in headless Chromium for tests and screenshots.
//   node tools/shot.js --out <dir> [--size 1280x720] [--steps steps.js] [--touch] [--dpr 2]
// A test build (node tools/build.js --dev <file>) is made on the fly so the steps can reach the internals.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const out = arg('out', os.tmpdir());
  const [W, H] = arg('size', '1280x720').split('x').map(Number);
  const file = path.join(os.tmpdir(), 'nb-dev-' + process.pid + '.html');
  execFileSync('node', [path.join(__dirname, 'build.js'), '--dev', file], { stdio: 'ignore' });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +arg('dpr', 1), hasTouch: process.argv.includes('--touch'), isMobile: process.argv.includes('--touch'), locale: arg('locale', 'zh-CN') });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
  await page.goto('file://' + file + (arg('hash', '') ? '#' + arg('hash', '') : ''));
  await page.waitForTimeout(700);
  const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); };
  const ev = (code) => page.evaluate((c) => window.__dbg(c), code);
  const steps = arg('steps', null);
  try {
    if (steps) await require(path.resolve(steps))({ page, shot, ev, W, H });
    else { await page.waitForTimeout(1500); await shot('title'); }
  } catch (e) { errors.push('steps: ' + (e.stack || e.message)); }
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 20).join('\n') : 'no errors');
  await browser.close();
  require('fs').unlinkSync(file);
  process.exit(errors.length ? 1 : 0);
})();

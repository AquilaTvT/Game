// Bundles everything under src/ into one self-contained HTML file.
//   node tools/build.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const read = (p) => fs.readFileSync(p, 'utf8');

const jsDir = path.join(src, 'js');
const cssDir = path.join(src, 'css');
const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css')).sort();

const js = jsFiles.map((f) => read(path.join(jsDir, f))).join('\n');
const css = cssFiles.map((f) => read(path.join(cssDir, f))).join('\n');

// a syntax check before anything is written
try { new Function(js); } catch (e) { console.error('JavaScript does not parse:', e.message); process.exit(1); }

// `node tools/build.js --dev <file>` writes a test build that exposes the internals to the test scripts
const devAt = process.argv.indexOf('--dev');
const dev = devAt > 0;
const hook = dev ? '\nwindow.__fkz = (code) => eval(code);' : '';
const body = `(function () {\n'use strict';\n${js}${hook}\n})();`;
if (body.includes('</script')) { console.error('bundle contains a closing script tag'); process.exit(1); }

let html = read(path.join(src, 'index.html'));
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => body);

const out = dev ? path.resolve(process.argv[devAt + 1]) : path.join(root, '方块字.html');
fs.writeFileSync(out, html);
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`built ${path.basename(out)}  ${kb} KB  (${jsFiles.length} scripts, ${cssFiles.length} stylesheets)`);

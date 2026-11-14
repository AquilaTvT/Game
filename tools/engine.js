// Loads the simulation (no DOM) for headless tests and balance runs.
const fs = require('fs');
const path = require('path');
function loadEngine() {
  const dir = path.join(__dirname, '..', 'src', 'js');
  const files = fs.readdirSync(dir).filter((f) => /^[0-3]\d_.*\.js$/.test(f)).sort();
  const code = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const names = new Set();
  const re = /^(?:function\s+|const\s+|let\s+|class\s+)([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.add(m[1]);
  return new Function(`'use strict';\n${code}\nreturn { ${[...names].join(', ')}, getProfile: () => PROFILE, setProfile: (p) => { PROFILE = p; } };`)();
}
module.exports = { loadEngine };

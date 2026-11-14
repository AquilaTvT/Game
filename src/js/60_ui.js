// ---------- interface: small DOM helpers, dialogs, and every screen outside the fight ----------
const $ = (s, r) => (r || document).querySelector(s);
function h(sel, props, ...kids) {
  const parts = sel.match(/[#.]?[^#.]+/g) || ['div'];
  const el = document.createElement(parts[0][0] === '#' || parts[0][0] === '.' ? 'div' : parts.shift());
  for (const p of parts) { if (p[0] === '#') el.id = p.slice(1); else if (p[0] === '.') el.classList.add(p.slice(1)); }
  if (props && (props instanceof Node || typeof props !== 'object')) { kids.unshift(props); props = null; }
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v; else if (k === 'class') { if (v) el.className += ' ' + v; }
    else if (k === 'style') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } } else if (k === 'on') for (const e in v) el.addEventListener(e, v[e]);
    else el.setAttribute(k, v);
  }
  for (const c of kids) { if (c == null || c === false) continue; el.appendChild(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
function mkBtn(label, cls, fn) {
  const b = h('button.btn', { type: 'button', class: cls || '', html: label });
  b.addEventListener('click', (e) => { if (b.disabled) return; Snd.play(cls && cls.includes('ghost') ? 'back' : 'click'); fn(e); });
  return b;
}
const jadeHtml = (n) => `<i class="jade"></i>${fmtNum(n)}`;
// a talisman / relic emblem: a seal-red (or gold, or jade) tile with one character
function emblem(g, kind, size) { return h('div.emb', { class: 'k-' + kind + (size ? ' ' + size : ''), text: g }); }
const pips = (lv, max, next) => { let s = ''; for (let i = 1; i <= max; i++) s += `<i class="${i <= lv ? 'on' : i === next ? 'nx' : ''}"></i>`; return s; };

const UI = {
  mods: [],
  // ---- dialogs
  modal(o) {
    const veil = h('div.veil'), box = h('div.modal', { class: o.cls || '' });
    const api = { el: box, veil, dismiss: o.dismiss !== false, close: (v) => { const i = this.mods.indexOf(api); if (i < 0) return; this.mods.splice(i, 1); veil.remove(); if (o.onClose) o.onClose(v); } };
    if (o.title != null) box.appendChild(h('div.mh', h('div.mt', { html: o.title }), o.sub ? h('div.ms', { html: o.sub }) : null, api.dismiss ? h('button.xbtn', { type: 'button', 'aria-label': 'close', text: '×', on: { click: () => { Snd.play('back'); api.close(); } } }) : null));
    const body = h('div.mb');
    if (typeof o.body === 'function') o.body(body, api); else if (o.body) body.appendChild(o.body);
    box.appendChild(body);
    if (o.buttons) { const f = h('div.mf'); for (const b of o.buttons) f.appendChild(mkBtn(b.label, b.cls || '', () => { if (b.fn) b.fn(api); if (!b.keep) api.close(b.value); })); box.appendChild(f); }
    veil.appendChild(box);
    box.tabIndex = -1;
    veil.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button, input, textarea, [tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) { e.preventDefault(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    });
    if (api.dismiss) veil.addEventListener('pointerdown', (e) => { if (e.target === veil) { Snd.play('back'); api.close(); } });
    $('#modals').appendChild(veil);
    this.mods.push(api);
    try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); box.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    return api;
  },
  open() { return this.mods.length > 0; },
  closeTop() { const m = this.mods[this.mods.length - 1]; if (m && m.dismiss) { Snd.play('back'); m.close(); return true; } return false; },
  closeAll() { let g = 40; while (this.mods.length && g-- > 0) this.mods[this.mods.length - 1].close(); },
  confirm(title, text, yes, danger) {
    return new Promise((res) => {
      let done = false;
      this.modal({ title, cls: 'small', body: h('div.ctext', { html: text }), onClose: () => { if (!done) res(false); },
        buttons: [{ label: T('cancel'), cls: 'ghost', fn: () => { done = true; res(false); } }, { label: yes || T('ok'), cls: danger ? 'red' : 'gold', fn: () => { done = true; res(true); } }] });
    });
  },
  _tq: [],
  toast(o) { this._tq.push(o); if (this._tq.length > 10) this._tq.shift(); this.pump(); },
  pump() {
    const box = $('#toasts');
    while (this._tq.length && box.children.length < 2) {
      const o = this._tq.shift();
      const el = h('div.toast', h('div.ti', { text: o.icon || '印' }), h('div', h('div.tt', { html: o.title || '' }), o.text ? h('div.td', { html: o.text }) : null));
      box.appendChild(el);
      if (o.snd) Snd.play(o.snd);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); this.pump(); }, 350); }, this._tq.length ? 2000 : o.ms || 3000);
    }
  },
  screen(node) { const m = clear($('#menu')); if (node) { m.appendChild(node); m.classList.add('on'); } else m.classList.remove('on'); },

  // ---- title
  title() {
    this.closeAll();
    const m = PROFILE.meta, run = PROFILE.run, dc = dailyConfig(), dd = m.daily[dc.key];
    const list = h('div.mlist');
    const add = (label, sub, cls, fn, id) => { const b = mkBtn(label + (sub ? `<small>${sub}</small>` : ''), cls, fn); if (id) b.id = id; list.appendChild(b); return b; };
    if (run) add(T('m.continue'), T('m.continue.d', nm(HEROES[run.hero]), NIGHT_NAME[LANG][run.night], run.stage + 1), 'gold', () => App.resume(), 'btn-continue');
    add(T('m.start'), '', run ? '' : 'gold', () => this.heroSelect(), 'btn-start');
    add(T('m.daily'), dd ? T('m.daily.best', fmtNum(dd.best)) : T('m.daily.d', nm(HEROES[dc.hero]), NIGHT_NAME[LANG][dc.night]), '', () => App.begin({ hero: dc.hero, night: dc.night, seed: dc.seed, daily: dc.key }), 'btn-daily');
    list.appendChild(h('div.mrow', mkBtn(T('m.shrine'), 'sm', () => this.shrine()), mkBtn(T('m.codex'), 'sm', () => this.codex()), mkBtn(T('m.help'), 'sm', () => this.help()), mkBtn(T('m.settings'), 'sm', () => this.settings())));
    const logo = h('div.logo',
      h('div.enso', { html: '<svg viewBox="0 0 200 200"><circle class="e1" cx="100" cy="100" r="86"/><circle class="e2" cx="100" cy="100" r="74"/></svg>' }),
      h('div.lt', { text: T('title') }), h('div.ls', { text: 'NIGHTBIND' }));
    this.screen(h('div.title', logo, h('div.tag', { text: T('tag') }), list, h('div.foot', h('span.seal', { text: AUTHOR }), h('span', { text: T('by') + ' · v' + VERSION }), h('span.jd', { html: jadeHtml(m.jade) }))));
  },

  // ---- choosing a spirit and a night
  heroSelect() {
    const m = PROFILE.meta;
    let hero = m.hero, night = Math.min(m.night || 1, nightOpen(hero));
    const body = h('div.heroes'), side = h('div.hside');
    const draw = () => {
      clear(body); clear(side);
      for (const id of HERO_IDS) {
        const d = HEROES[id], open = !!m.heroes[id], c = d.col, css = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
        const el = h('button.hero', { type: 'button', class: (id === hero ? 'sel ' : '') + (open ? '' : 'lock'), style: { '--hc': css } },
          h('div.orb'), h('div.hn', { text: open ? nm(d) : '？' }), h('div.hd', { text: open ? (LANG === 'zh' ? d.dz : d.de) : T('hero.locked') + '：' + (d.unlock ? tx(d.unlock) : '') }),
          open ? h('div.hb', { text: m.nights[id] ? T('hero.best', NIGHT_NAME[LANG][m.nights[id]]) : T('hero.none') }) : null);
        el.addEventListener('click', () => { if (!open) { Snd.play('deny'); return; } Snd.play('tick'); hero = id; night = Math.min(night, nightOpen(id)); draw(); });
        body.appendChild(el);
      }
      const d = HEROES[hero], mx = nightOpen(hero);
      const stat = (k, v, of) => h('div.st', h('span', { text: k }), h('i', h('b', { style: { width: clamp((100 * v) / of, 6, 100) + '%' } })));
      side.appendChild(h('div.stats', stat(T('hero.hp'), d.hp, 5), stat(T('hero.spd'), d.spd - 220, 130), stat(T('hero.trail'), d.trail - 380, 520)));
      const nrow = h('div.nights');
      for (let n = 1; n <= NIGHT_MAX; n++) { const b = h('button.nb', { type: 'button', class: (n === night ? 'sel ' : '') + (n > mx ? 'lock' : ''), text: String(n) }); b.addEventListener('click', () => { if (n > mx) { Snd.play('deny'); return; } Snd.play('tick'); night = n; draw(); }); nrow.appendChild(b); }
      side.appendChild(h('div.nlab', { text: NIGHT_NAME[LANG][night] })); side.appendChild(nrow);
      side.appendChild(mkBtn(T('hero.go'), 'gold big', () => { m.hero = hero; m.night = night; saveProfile(); App.begin({ hero, night }); }));
    };
    draw();
    this.screen(h('div.page', h('div.ph', h('div.pt', { text: T('hero.title') }), mkBtn(T('back'), 'ghost sm', () => this.title())), h('div.hwrap', body, side)));
  },

  // ---- the choice of a talisman (on a level) or a relic (after a boss)
  choice(w) {
    const pd = w.pending;
    if (!pd) return;
    const relic = pd.kind === 'relic';
    let banish = false, locked = true;
    const wrap = h('div.choice', { class: relic ? 'relic' : '' });
    const pick = (i) => { if (locked) return; if (banish) { if (w.banish(i)) { Snd.play('back'); redraw(); } else Snd.play('deny'); return; } locked = true; Snd.play(relic ? 'relic' : 'take'); wrap.classList.add('out'); cards[i].classList.add('picked'); setTimeout(() => App.choose(i), 260); };
    let cards = [];
    const redraw = () => {
      clear(wrap); cards = []; banish = false;
      const cur = w.pending;
      wrap.appendChild(h('div.chead', h('div.ct', { text: relic ? T('rel.title') : T('lv.title') }), h('div.cs', { text: relic ? T('rel.sub') : T('lv.sub') + ' · ' + T('hud.lv') + ' ' + w.level })));
      const row = h('div.cards');
      cur.choices.forEach((c, i) => {
        let g, name, kind, tag, desc, pp = '';
        if (c.k === 'tali') { const d = TALIS[c.id]; g = d.g; name = nm(d); kind = d.kind; tag = c.to === 1 ? T('lv.new') : 'Lv ' + c.to; desc = tx(d.d(c.to)); pp = pips(c.to - 1, d.max, c.to); }
        else if (c.k === 'evo') { const d = EVOS[c.id]; g = d.g; name = nm(d); kind = 'evo'; tag = T('lv.evo'); desc = LANG === 'zh' ? d.dz : d.de; }
        else if (c.k === 'relic') { const d = RELICS[c.id]; g = d.g; name = nm(d); kind = 'relic'; tag = T('kind.relic'); desc = LANG === 'zh' ? d.dz : d.de; }
        else { g = '气'; name = T('lv.heal'); kind = 'body'; tag = ''; desc = T('lv.heal.d'); }
        const el = h('button.card', { type: 'button', class: 'k-' + kind, style: { animationDelay: i * 70 + 'ms' } },
          emblem(g, kind, 'big'), h('div.cn', { text: name }), h('div.ck', { html: `<span>${T('kind.' + kind)}</span>${tag ? `<em>${tag}</em>` : ''}` }), pp ? h('div.pips', { html: pp }) : null, h('div.cd', { html: rich(desc) }), h('div.key', { text: String(i + 1) }));
        el.addEventListener('click', () => pick(i));
        row.appendChild(el); cards.push(el);
      });
      wrap.appendChild(row);
      if (!relic) {
        const foot = h('div.cfoot');
        const rb = mkBtn(T('lv.reroll', w.rerolls), 'ghost sm', () => { if (!locked && w.reroll()) redraw(); }); rb.disabled = w.rerolls <= 0;
        const bb = mkBtn(T('lv.banish', w.banishes), 'ghost sm', () => { if (locked || w.banishes <= 0) return; banish = !banish; wrap.classList.toggle('banish', banish); bb.innerHTML = banish ? T('lv.banish.on') : T('lv.banish', w.banishes); }); bb.disabled = w.banishes <= 0;
        foot.append(rb, bb);
        wrap.appendChild(foot);
      }
      locked = true; setTimeout(() => { locked = false; }, 380);
    };
    redraw();
    this._pick = pick;
    this.screen(wrap);
  },

  // ---- pause
  build(w) {
    const box = h('div.buildlist');
    for (const id of Object.keys(w.lv)) { const d = TALIS[id]; box.appendChild(h('div.bl', emblem(d.g, d.kind), h('div', h('div.bn', { html: `${nm(d)} <span class="pips">${pips(w.lv[id], d.max)}</span>` }), h('div.bd', { html: rich(tx(d.d(w.lv[id]))) })))); }
    for (const id of Object.keys(w.evo)) { const d = EVOS[id]; box.appendChild(h('div.bl', emblem(d.g, 'evo'), h('div', h('div.bn', { text: nm(d) }), h('div.bd', { html: rich(LANG === 'zh' ? d.dz : d.de) })))); }
    for (const id of Object.keys(w.rel)) { const d = RELICS[id]; box.appendChild(h('div.bl', emblem(d.g, 'relic'), h('div', h('div.bn', { text: nm(d) }), h('div.bd', { html: rich(LANG === 'zh' ? d.dz : d.de) })))); }
    return box;
  },
  pause() {
    const w = App.w;
    if (!w || App.mode !== 'play' || this.open()) return;
    App.mode = 'paused'; Snd.pause(true);
    this.modal({ title: T('pause.title'), sub: `${nm(w.hero)} · ${NIGHT_NAME[LANG][w.night]} · ${T('hud.stage', w.stage + 1)}`,
      body: (root) => { root.appendChild(h('div.sec', { text: T('pause.build') })); root.appendChild(this.build(w)); },
      onClose: () => { if (App.mode === 'paused') { App.mode = 'play'; Snd.pause(false); App.last = nowMs(); } },
      buttons: [{ label: T('pause.quit'), cls: 'ghost', keep: true, fn: async () => { if (await this.confirm(T('pause.quit'), T('pause.sure'), T('pause.quit'), true)) { App.mode = 'end'; this.closeAll(); App.finish(false); } } },
        { label: T('m.settings'), cls: 'ghost', keep: true, fn: () => this.settings() }, { label: T('pause.resume'), cls: 'gold' }] });
  },

  // ---- the end of a run
  results(r, w) {
    const won = r.won;
    const row = (k, v) => h('div.rs', h('span', { text: k }), h('b', { html: v }));
    const body = h('div.results', { class: won ? 'won' : '' },
      h('div.rt', { text: won ? T('end.won') : T('end.dead') }),
      h('div.rsub', { text: won ? T('end.won.sub', nm(w.hero), NIGHT_NAME[LANG][w.night]) : T('end.dead.sub', w.stage + 1, nm(w.stageDef())) }),
      h('div.rgrid', row(T('end.time'), fmtTime(r.time)), row(T('end.kills'), fmtNum(r.kills)), row(T('end.ring'), String(r.maxRing)), row(T('end.level'), String(r.level)), row(T('end.score'), fmtNum(r.score)), row(T('end.jade'), '+' + jadeHtml(r.jade))),
      this.build(w));
    for (const id of r.heroes) body.appendChild(h('div.unl', { html: '✦ ' + T('end.unlock', nm(HEROES[id])) }));
    for (const id of r.ach) body.appendChild(h('div.unl.a', { html: '✦ ' + T('end.ach', nm(ACH[id])) + ` <small>${LANG === 'zh' ? ACH[id].dz : ACH[id].de}</small>` }));
    const btns = h('div.rbtns');
    if (won && !w.daily) btns.appendChild(mkBtn(T('end.endless'), '', () => App.endless()));
    if (won && !w.daily && w.night < NIGHT_MAX) btns.appendChild(mkBtn(T('end.next'), 'gold', () => { PROFILE.meta.night = w.night + 1; App.begin({ hero: w.heroId, night: w.night + 1 }); }));
    btns.appendChild(mkBtn(T('end.again'), won ? '' : 'gold', () => App.begin({ hero: w.heroId, night: w.night, daily: w.daily, seed: w.daily ? w.seed : null })));
    btns.appendChild(mkBtn(T('end.title'), 'ghost', () => App.toTitle()));
    body.appendChild(btns);
    this.screen(h('div.page.end', body));
  },

  // ---- shrine
  shrine() {
    const m = PROFILE.meta;
    const grid = h('div.shrine'), jd = h('div.pj');
    const draw = () => {
      clear(grid); jd.innerHTML = jadeHtml(m.jade);
      for (const id of SHRINE_IDS) {
        const d = SHRINE[id], l = m.shrine[id] || 0, full = l >= d.max, cost = full ? 0 : d.cost[l];
        const el = h('button.boon', { type: 'button', class: full ? 'full' : m.jade < cost ? 'poor' : '' }, emblem(d.g, 'relic'), h('div.bn', { text: nm(d) }), h('div.pips', { html: pips(l, d.max, l + 1) }),
          h('div.bd', { text: tx(d.d(Math.max(1, full ? l : l + 1))) }), h('div.bc', { html: full ? T('shrine.max') : jadeHtml(cost) }));
        el.addEventListener('click', () => { if (buyShrine(id)) { Snd.play('relic'); draw(); } else Snd.play('deny'); });
        grid.appendChild(el);
      }
    };
    draw();
    this.screen(h('div.page', h('div.ph', h('div.pt', { text: T('shrine.title') }), jd, mkBtn(T('back'), 'ghost sm', () => this.title())), h('div.psub', { text: T('shrine.sub') }), grid));
  },

  // ---- codex
  codex(tab) {
    const m = PROFILE.meta, cur = tab || 'tali';
    const tabs = h('div.tabs');
    for (const k of ['tali', 'foe', 'relic', 'ach']) tabs.appendChild(h('button.tab', { type: 'button', class: k === cur ? 'sel' : '', text: T('codex.' + k), on: { click: () => { Snd.play('tick'); this.codex(k); } } }));
    const list = h('div.codex');
    if (cur === 'tali') {
      for (const id of TALI_IDS) { const d = TALIS[id]; list.appendChild(h('div.bl', emblem(d.g, d.kind), h('div', h('div.bn', { html: `${nm(d)} <small>${T('kind.' + d.kind)}</small>` }), h('div.bd', { html: rich(tx(d.d(1))) + ' → ' + rich(tx(d.d(d.max))) })))); }
      for (const id of EVO_IDS) { const d = EVOS[id]; list.appendChild(h('div.bl', emblem(d.g, 'evo'), h('div', h('div.bn', { html: `${nm(d)} <small>${T('codex.evo', nm(TALIS[d.a]), nm(TALIS[d.b]))}</small>` }), h('div.bd', { html: rich(LANG === 'zh' ? d.dz : d.de) })))); }
    } else if (cur === 'foe') {
      const all = FOE_IDS.filter((k) => !FOES[k].hidden).map((k) => [k, FOES[k], 'f_' + k]).concat(Object.keys(BOSSES).map((k) => [k, BOSSES[k], 'b_' + k]));
      for (const [k, d, key] of all) { const seen = !!m.seen[key]; list.appendChild(h('div.bl', { class: seen ? '' : 'unk' }, h('div.foeic', { style: { background: `radial-gradient(circle at 40% 35%, #fff, rgb(${d.col.map((x) => Math.round(x * 255)).join(',')}) 45%, #111 100%)` } }), h('div', h('div.bn', { text: seen ? nm(d) : '？？？' }), h('div.bd', { text: seen ? (LANG === 'zh' ? d.tz : d.te) : T('codex.unseen') })))); }
    } else if (cur === 'relic') {
      for (const id of RELIC_IDS) { const d = RELICS[id]; list.appendChild(h('div.bl', emblem(d.g, 'relic'), h('div', h('div.bn', { text: nm(d) }), h('div.bd', { html: rich(LANG === 'zh' ? d.dz : d.de) })))); }
    } else {
      for (const id of ACH_IDS) { const d = ACH[id], got = !!m.ach[id]; list.appendChild(h('div.bl', { class: got ? 'got' : 'unk' }, h('div.emb.k-relic', { text: got ? '成' : '・' }), h('div', h('div.bn', { text: nm(d) }), h('div.bd', { text: LANG === 'zh' ? d.dz : d.de })))); }
    }
    this.screen(h('div.page', h('div.ph', h('div.pt', { text: T('codex.title') }), h('div.pj', { text: cur === 'ach' ? Object.keys(m.ach).length + ' / ' + ACH_IDS.length : '' }), mkBtn(T('back'), 'ghost sm', () => this.title())), tabs, list));
  },

  // ---- settings and help (as dialogs, so they can open over a paused fight)
  settings() {
    const S = PROFILE.settings;
    this.modal({ title: T('set.title'), body: (root, api) => {
      const row = (label, ctl) => root.appendChild(h('div.srow', h('div.sl', { text: label }), ctl));
      const seg = (opts, cur, fn) => { const s = h('div.seg'); for (const [v, lab] of opts) s.appendChild(h('button', { type: 'button', class: v === cur ? 'on' : '', text: lab, on: { click: (e) => { Snd.play('tick'); [...s.children].forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); fn(v); saveProfile(); } } })); return s; };
      const onoff = (cur, fn) => seg([[true, T('set.on')], [false, T('set.off')]], !!cur, fn);
      const slider = (cur, fn) => h('input.rng', { type: 'range', min: '0', max: '100', value: String(Math.round(cur * 100)), on: { input: (e) => { fn(+e.target.value / 100); Snd.applyVolumes(); saveProfile(); } } });
      row(T('set.lang'), seg([['zh', '中文'], ['en', 'English']], S.lang, (v) => { S.lang = v; LANG = v; saveProfile(true); this.closeAll(); App.relang(); }));
      row(T('set.music'), slider(S.music, (v) => { S.music = v; }));
      row(T('set.sfx'), slider(S.sfx, (v) => { S.sfx = v; Snd.play('tick'); }));
      row(T('set.quality'), seg([[0, T('set.q0')], [1, T('set.q1')], [2, T('set.q2')]], S.quality, (v) => { S.quality = v; App.resize(); }));
      row(T('set.shake'), onoff(S.shake, (v) => { S.shake = v; }));
      row(T('set.reduce'), onoff(S.reduce, (v) => { S.reduce = v; App.motion(); }));
      row(T('set.dmg'), onoff(S.dmg, (v) => { S.dmg = v; }));
      row(T('set.haptics'), onoff(S.haptics, (v) => { S.haptics = v; }));
      row(T('set.full'), mkBtn(T('set.toggle'), 'sm', () => App.fullscreen()));
      const io = h('div.srow');
      io.append(mkBtn(T('set.export'), 'sm ghost', () => this.exportSave()), mkBtn(T('set.import'), 'sm ghost', () => this.importSave()));
      root.appendChild(io);
    }, buttons: [{ label: T('close'), cls: 'gold' }] });
  },
  exportSave() {
    const code = exportProfile();
    let ta;
    this.modal({ title: T('set.export'), cls: 'small', body: (root) => { ta = h('textarea.code', { readonly: 'readonly' }); ta.value = code; root.appendChild(ta); },
      buttons: [{ label: T('close'), cls: 'ghost' }, { label: T('set.copy'), cls: 'gold', keep: true, fn: () => {
        const ok = () => this.toast({ icon: '存', title: T('set.copied') });
        const old = () => { ta.readOnly = false; ta.focus(); ta.select(); try { ta.setSelectionRange(0, ta.value.length); } catch (e) { /* ignore */ } ta.readOnly = true; let took = false; try { took = document.execCommand('copy'); } catch (e) { took = false; } if (took) ok(); else this.toast({ icon: '存', title: T('set.copyfail') }); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, old); else old();
      } }] });
  },
  importSave() {
    let ta;
    this.modal({ title: T('set.import'), cls: 'small', body: (root) => { ta = h('textarea.code', { placeholder: T('set.paste') }); root.appendChild(ta); },
      buttons: [{ label: T('cancel'), cls: 'ghost' }, { label: T('set.load'), cls: 'gold', keep: true, fn: () => {
        if (importProfile(ta.value)) { this.closeAll(); App.relang(); this.toast({ icon: '存', title: T('set.loaded') }); } else this.toast({ icon: '误', title: T('set.bad') });
      } }] });
  },
  help() { this.modal({ title: T('help.title'), body: h('div.help', { html: T('help.body') }), buttons: [{ label: T('close'), cls: 'gold' }] }); },
};

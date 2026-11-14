// ---------- what stays on screen during the fight ----------
const Hud = {
  el: {}, c: {},
  build() {
    const r = clear($('#hud')), E = this.el = {};
    r.append(
      h('div.xp', E.xp = h('i')),
      h('div.tl', E.lv = h('div.lv'), E.hearts = h('div.hearts')),
      h('div.tc', E.stage = h('div.stg'), E.timer = h('div.tm'), E.boss = h('div.bossbar', E.bossN = h('span'), h('div', E.bossF = h('i')))),
      h('div.tr', E.kills = h('div.kl'), E.pause = h('button.pausebtn', { type: 'button', 'aria-label': 'pause', html: '<i></i><i></i>', on: { click: () => UI.pause() } })),
      E.strip = h('div.strip'),
      E.dash = h('button.dashbtn', { type: 'button', 'aria-label': 'dash', text: '瞬' }),
      E.banner = h('div.banner'), E.hint = h('div.hint'), E.stick = h('div.stick', h('i')));
    E.dash.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); App.dashQ = true; });
    this.c = {};
  },
  show(v) { $('#hud').classList.toggle('on', !!v); },
  set(key, val, fn) { if (this.c[key] !== val) { this.c[key] = val; fn(val); } },
  update(w) {
    const E = this.el, p = w.p, S = w.S;
    this.set('xp', Math.round((1000 * w.xp) / w.need), (v) => { E.xp.style.width = v / 10 + '%'; });
    this.set('lv', w.level, (v) => { E.lv.textContent = T('hud.lv') + ' ' + v; });
    this.set('hp', p.hp + '/' + S.maxHp + '/' + p.shield, () => { let s = ''; for (let i = 0; i < S.maxHp; i++) s += `<i class="${i < p.hp ? 'on' : ''}"></i>`; if (S.shield) s += `<b class="${p.shield ? 'on' : ''}"></b>`; E.hearts.innerHTML = s; });
    this.set('stage', w.stage + ':' + w.loop + LANG, () => { E.stage.textContent = nm(w.stageDef()) + (w.loop ? ' · ' + T('hud.loop', w.loop + 1) : ''); });
    const boss = w.boss;
    this.set('bossOn', boss ? boss.k : '', (k) => { E.boss.classList.toggle('on', !!k); E.timer.classList.toggle('off', !!k); if (k) E.bossN.textContent = nm(BOSSES[k]); });
    if (boss) this.set('bossHp', Math.round(w.bossHp() * 200), (v) => { E.bossF.style.width = v / 2 + '%'; });
    else this.set('time', Math.max(0, Math.ceil(w.stageDef().dur - w.stageT)), (v) => { E.timer.textContent = fmtTime(v); E.timer.classList.toggle('soon', v <= 10); });
    this.set('kills', w.stats.kills, (v) => { E.kills.textContent = fmtNum(v); });
    this.set('build', Object.keys(w.lv).map((k) => k + w.lv[k]).join() + '|' + Object.keys(w.evo).join() + '|' + Object.keys(w.rel).join(), () => {
      clear(E.strip);
      for (const id of Object.keys(w.lv)) { const d = TALIS[id], e = emblem(d.g, d.kind, 'sm'); e.appendChild(h('em', { text: w.lv[id] >= d.max ? '★' : String(w.lv[id]) })); E.strip.appendChild(e); }
      for (const id of Object.keys(w.evo)) E.strip.appendChild(emblem(EVOS[id].g, 'evo', 'sm'));
      for (const id of Object.keys(w.rel)) E.strip.appendChild(emblem(RELICS[id].g, 'relic', 'sm'));
    });
    this.set('dash', p.dashN > 0 ? 100 : Math.round((100 * p.dashT) / S.dashCd), (v) => { E.dash.style.setProperty('--cd', v + '%'); E.dash.classList.toggle('ready', v >= 100); });
  },
  banner(main, sub, cls) {
    const E = this.el;
    E.banner.className = 'banner';
    void E.banner.offsetWidth;
    E.banner.innerHTML = `<div class="b1">${main}</div>${sub ? `<div class="b2">${sub}</div>` : ''}`;
    E.banner.className = 'banner go ' + (cls || '');
  },
  hint(text) { const E = this.el; if (!text) { E.hint.classList.remove('on'); return; } E.hint.textContent = text; E.hint.classList.add('on'); },
  stick(s) {
    const E = this.el;
    if (!s) { E.stick.classList.remove('on'); return; }
    E.stick.classList.add('on');
    E.stick.style.transform = `translate(${s.ox}px, ${s.oy}px)`;
    E.stick.firstChild.style.transform = `translate(${clamp(s.x - s.ox, -56, 56)}px, ${clamp(s.y - s.oy, -56, 56)}px)`;
  },
};

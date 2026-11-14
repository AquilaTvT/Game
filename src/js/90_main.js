// ---------- boot, the frame loop, input, and the flow between screens ----------
const App = {
  w: null, mode: 'title', demo: false, acc: 0, last: 0, keys: {}, ptr: { x: 0, y: 0, mouse: false }, stick: null, dashQ: false, inp: { x: 0, y: 0, dash: false }, q: { x: 0, y: 0 },
  touch: false, scale: 1, slow: 0, tutT: 0, endT: 0, bot: { hold: 0, cx: 0, cy: 0, r: 70, dir: 1, tgt: null },

  boot() {
    loadProfile();
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    const cv = document.getElementById('gl');
    this.glOk = Render.init(cv);
    Hud.build();
    this.motion();
    this.resize();
    try { this.touch = window.matchMedia('(pointer: coarse)').matches; } catch (e) { this.touch = false; }
    document.body.classList.toggle('touch', this.touch);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => { this.keys = {}; this.stick = null; Hud.stick(null); });
    cv.addEventListener('pointerdown', (e) => this.pdown(e));
    window.addEventListener('pointermove', (e) => this.pmove(e));
    window.addEventListener('pointerup', (e) => this.pup(e));
    window.addEventListener('pointercancel', (e) => this.pup(e));
    document.addEventListener('contextmenu', (e) => { if (!(e.target instanceof HTMLTextAreaElement)) e.preventDefault(); });
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(ev, () => Snd.resume(), true);
    document.addEventListener('click', (e) => { const b = e.detail > 0 && e.target instanceof Element ? e.target.closest('button') : null; if (b) b.blur(); }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (this.mode === 'play' && !this.demo) UI.pause(); saveProfile(true); Snd.suspend(); } else { this.last = nowMs(); Snd.resume(); } });
    window.addEventListener('pagehide', () => saveProfile(true));
    window.addEventListener('error', (e) => this.oops(e.error || e.message));
    window.addEventListener('unhandledrejection', (e) => this.oops(e.reason));
    if (!this.glOk) { UI.screen(h('div.page', h('div.nogl', { text: T('nogl') }))); }
    else this.toTitle();
    const boot = document.getElementById('boot');
    requestAnimationFrame(() => requestAnimationFrame(() => { boot.classList.add('gone'); setTimeout(() => boot.remove(), 700); }));
    this.last = nowMs();
    requestAnimationFrame((t) => this.loop(t));
  },
  _oops: 0,
  oops(err) { if (typeof console !== 'undefined') console.error(err); if (this._oops++ < 2) { try { UI.toast({ icon: '误', title: T('oops'), text: escHtml(String(err && err.message ? err.message : err)).slice(0, 100) }); } catch (e) { /* ignore */ } } },
  motion() { document.body.classList.toggle('calm', !!PROFILE.settings.reduce); },
  fullscreen() { const d = document, el = d.documentElement; try { if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) { /* not available */ } },
  relang() {
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    Hud.build();
    if (this.demo || this.mode === 'title') UI.title(); else if (this.mode === 'choice') UI.choice(this.w); else if (this.mode === 'end') this.toTitle();
  },
  resize() {
    if (!this.glOk) return;
    const q = PROFILE.settings.quality;
    const dpr = Math.min(q === 2 ? 1 : 2, window.devicePixelRatio || 1);
    GL.resize(window.innerWidth, window.innerHeight, dpr, q === 2 ? 0.8 : this.scale);
  },

  // ---- flow
  toTitle() {
    UI.closeAll();
    this.mode = 'title'; this.demo = true;
    this.w = new World({ seed: makeSeed(), hero: PROFILE.meta.hero, night: 1 });
    FX.clear(); Render.snap(this.w);
    Hud.show(false); Hud.hint(''); Hud.stick(null);
    Snd.setMusic('title');
    UI.title();
  },
  begin(o) {
    UI.closeAll(); UI.screen(null);
    this.demo = false;
    this.w = new World(Object.assign({ boons: PROFILE.meta.shrine }, o));
    this.enter();
  },
  resume() {
    const s = PROFILE.run;
    if (!s) return;
    UI.closeAll(); UI.screen(null);
    this.demo = false;
    try { this.w = new World({ seed: s.seed, hero: s.hero, night: s.night, daily: s.daily, boons: PROFILE.meta.shrine, stage: s.stage, save: s }); } catch (e) { PROFILE.run = null; saveProfile(true); this.toTitle(); return; }
    this.enter();
  },
  enter() {
    this.mode = 'play'; this.acc = 0; this.endT = 0; this.keys = {}; this.stick = null; this.dashQ = false;
    FX.clear(); Render.snap(this.w);
    Hud.c = {}; Hud.show(true); Hud.update(this.w);
    this.tutT = 0;
    this.drain();
    this.last = nowMs();
  },
  choose(i) {
    const w = this.w;
    if (!w.choose(i)) return;
    this.drain();
    if (w.phase === 'choice') UI.choice(w); else { UI.screen(null); this.mode = 'play'; this.last = nowMs(); }
  },
  finish(won) {
    const w = this.w;
    this.mode = 'end';
    Hud.show(false); Hud.hint(''); Hud.stick(null);
    const r = settleRun(w, won);
    Snd.setMusic(won ? 'won' : 'dead');
    UI.results(r, w);
    if (r.ach.length || r.heroes.length) Snd.play('ach');
  },
  endless() { const w = this.w; UI.screen(null); w.goEndless(); Hud.show(true); this.mode = 'play'; this.endT = 0; this.drain(); if (w.phase === 'choice') { this.mode = 'choice'; UI.choice(w); } this.last = nowMs(); },

  // ---- input
  key(e, down) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (down && e.repeat) { if (k === ' ' || k.startsWith('Arrow')) e.preventDefault(); return; }
    if (down && k === 'Escape') { e.preventDefault(); if (UI.open()) UI.closeTop(); else if (this.mode === 'play' && !this.demo) UI.pause(); return; }
    if (UI.open()) return;
    if (this.mode === 'choice') { if (down && k >= '1' && k <= '3' && UI._pick) UI._pick(+k - 1); return; }
    if (this.mode !== 'play' || this.demo) return;
    this.keys[k] = down;
    if (down && (k === ' ' || k === 'Shift')) this.dashQ = true;
    if (down && k === 'p') UI.pause();
    if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();
    if (down && 'wasd'.includes(k) || k.startsWith('Arrow')) this.ptr.mouse = false;
  },
  pdown(e) {
    if (this.mode !== 'play' || this.demo) return;
    if (e.pointerType === 'mouse') { this.ptr.mouse = true; this.ptr.x = e.clientX; this.ptr.y = e.clientY; this.dashQ = true; return; }
    this.touch = true;
    if (!this.stick) { this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }; Hud.stick(this.stick); }
    else this.dashQ = true;
  },
  pmove(e) {
    if (e.pointerType === 'mouse') { this.ptr.mouse = true; this.ptr.x = e.clientX; this.ptr.y = e.clientY; return; }
    const s = this.stick;
    if (s && s.id === e.pointerId) { s.x = e.clientX; s.y = e.clientY; const dx = s.x - s.ox, dy = s.y - s.oy, d = hyp(dx, dy); if (d > 72) { s.ox = s.x - (dx / d) * 72; s.oy = s.y - (dy / d) * 72; } Hud.stick(s); }
  },
  pup(e) { if (this.stick && this.stick.id === e.pointerId) { this.stick = null; Hud.stick(null); } },
  input() {
    const k = this.keys, inp = this.inp, w = this.w;
    let x = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0), y = (k.s || k.ArrowDown ? 1 : 0) - (k.w || k.ArrowUp ? 1 : 0);
    if (x || y) { const l = hyp(x, y); x /= l; y /= l; }
    else if (this.stick) { const s = this.stick; x = (s.x - s.ox) / 52; y = (s.y - s.oy) / 52; const l = hyp(x, y); if (l > 1) { x /= l; y /= l; } else if (l < 0.14) { x = 0; y = 0; } }
    else if (this.ptr.mouse) {
      const q = Render.toWorld(this.ptr.x, this.ptr.y, this.q), dx = q.x - w.p.x, dy = q.y - w.p.y, d = hyp(dx, dy), m = clamp((d - 8) / 40, 0, 1);
      x = d > 0 ? (dx / d) * m : 0; y = d > 0 ? (dy / d) * m : 0;
    }
    inp.x = x; inp.y = y; inp.dash = this.dashQ; this.dashQ = false;
    return inp;
  },
  // the hands-off pilot that plays behind the title
  autopilot() {
    const w = this.w, p = w.p, b = this.bot, inp = this.inp;
    if ((b.hold -= STEP) <= 0 || !b.tgt || b.tgt.dead) {
      b.hold = 1.3; b.tgt = w.nearestFoe(p.x, p.y, 900);
      if (b.tgt) { let far = 0; for (const e of w.foes) { const d = hyp(e.x - b.tgt.x, e.y - b.tgt.y); if (d < 100 && d + e.r > far) far = d + e.r; } b.cx = b.tgt.x; b.cy = b.tgt.y; b.r = Math.min(Math.max(52, far + 34), (w.S.trail / TAU) * 0.88); if (Math.random() < 0.3) b.dir = -b.dir; }
    }
    let ix = -p.x, iy = -p.y;
    if (b.tgt && !b.tgt.dead) { b.cx += (b.tgt.x - b.cx) * 0.02; b.cy += (b.tgt.y - b.cy) * 0.02; const dx = p.x - b.cx, dy = p.y - b.cy, d = hyp(dx, dy) || 1, rad = clamp((b.r - d) / 40, -1, 1); ix = (-dy / d) * b.dir + (dx / d) * rad; iy = (dx / d) * b.dir + (dy / d) * rad; }
    for (const e of w.foes) { const dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) - e.r; if (d < 34) { ix += (dx / (d + e.r + 1)) * 2; iy += (dy / (d + e.r + 1)) * 2; } }
    const l = hyp(ix, iy) || 1;
    inp.x = ix / l; inp.y = iy / l; inp.dash = false;
    return inp;
  },

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const raw = (now - this.last) / 1000, dt = Math.min(0.05, Math.max(0, raw));
    this.last = now;
    const w = this.w;
    if (!w || !this.glOk) return;
    // if frames keep coming slowly, draw fewer pixels
    if (PROFILE.settings.quality === 0 && (this.mode === 'play' || this.demo)) { this.slow = raw > 0.024 ? this.slow + raw : Math.max(0, this.slow - raw * 0.5); if (this.slow > 2.5 && this.scale > 0.55) { this.scale = this.scale > 0.8 ? 0.75 : 0.55; this.slow = 0; this.resize(); } }
    const running = (this.mode === 'play' || this.demo) && !UI.open();
    if (running && w.phase === 'play') {
      if (FX.hitstop > 0) FX.hitstop -= dt;
      else {
        let ts = 1;
        if (FX.slowmo > 0) { FX.slowmo -= dt; ts = 0.3; }
        const fast = this.speed || 1;                 // (only the test harness sets a speed)
        this.acc += dt * ts * fast;
        let guard = 0;
        while (this.acc >= STEP && guard++ < 5 * fast) { this.acc -= STEP; w.step(this.demo ? this.autopilot() : this.input()); this.drain(); if (w.phase !== 'play') break; }
        if (guard >= 5 * fast) this.acc = 0;
      }
    }
    if (this.demo) {
      if (w.phase === 'choice') w.choose((Math.random() * w.pending.choices.length) | 0);
      if (w.p.hp < w.S.maxHp) w.p.hp = w.S.maxHp;
      if (w.phase !== 'play' && w.phase !== 'choice' || w.stage > 0) this.w = new World({ seed: makeSeed(), hero: PROFILE.meta.hero, night: 1 });
      Render.fade += (0.5 - Render.fade) * 0.06;
    } else {
      Render.fade += (1 - Render.fade) * 0.1;
      if (this.mode === 'play') {
        if (w.phase === 'choice') { this.mode = 'choice'; this.keys = {}; this.stick = null; Hud.stick(null); UI.choice(w); }
        else if (w.phase === 'dead' || w.phase === 'won') { if ((this.endT += dt) > (w.phase === 'won' ? 1.4 : 1.9)) this.finish(w.phase === 'won'); }
        Hud.update(w);
        this.tutor(dt);
      }
    }
    Render.dark += ((this.mode === 'choice' || this.mode === 'paused' ? 0.75 : 0) - Render.dark) * 0.15;
    if (this._dim !== (this.mode === 'choice')) { this._dim = this.mode === 'choice'; $('#hud').classList.toggle('dim', this._dim); }
    FX.update(dt);
    Render.frame(this.w, dt);
  },
  drain() {
    const w = this.w, ev = w.ev, m = PROFILE.meta, demo = this.demo;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      FX.on(e, w);
      if (demo) continue;
      Snd.on(e, w);
      switch (e.t) {
        case 'stage': PROFILE.run = w.checkpoint(); saveProfile(true); Hud.banner(T('ban.stage', LANG === 'zh' ? T('num.' + ((e.i % 5) + 1)) : (e.i % 5) + 1), nm(w.stageDef()), ''); break;
        case 'boss': Hud.banner(T('ban.boss'), nm(BOSSES[e.k]), 'boss'); this.buzz(60); break;
        case 'kill': if (!m.seen['f_' + e.k] && FOES[e.k] && !FOES[e.k].hidden) m.seen['f_' + e.k] = 1; break;
        case 'bossdie': m.seen['b_' + e.k] = 1; this.buzz([40, 40, 80]); break;
        case 'clear': if (e.flawless) w.flawlessAny = 1; Hud.banner(T('ban.clear'), e.flawless ? T('ban.flawless') : '', 'clear'); break;
        case 'hurt': this.buzz(90); break;
        case 'seal': if (e.kills >= 6) this.buzz(25); if (m.tutorial === 2 && e.kills > 0) { m.tutorial = 3; this.tutT = 0; } break;
      }
    }
    ev.length = 0;
  },
  buzz(p) { if (PROFILE.settings.haptics && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } },
  // a few words for the first night, then silence
  tutor(dt) {
    const m = PROFILE.meta, w = this.w;
    if (m.tutorial >= 9) return;
    this.tutT += dt;
    if (m.tutorial === 0) { Hud.hint(T('tut.1')); m.tutorial = 1; this.tutT = 0; }
    else if (m.tutorial === 1 && this.tutT > 3.5) { Hud.hint(T('tut.2')); m.tutorial = 2; }
    else if (m.tutorial === 3) { if (this.tutT < 0.1) Hud.hint(T('tut.3')); if (this.tutT > 4) { Hud.hint(T('tut.4')); m.tutorial = 4; this.tutT = 0; } }
    else if (m.tutorial === 4 && this.tutT > 6) { Hud.hint(''); m.tutorial = 9; saveProfile(); }
    if (w.stage > 0 && m.tutorial < 9) { Hud.hint(''); m.tutorial = 9; saveProfile(); }
  },
};
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot()); else App.boot(); }

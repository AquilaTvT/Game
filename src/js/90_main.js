// ---------- boot ----------
const App = {
  started: false,
  boot() {
    loadProfile();
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    UI.layout();
    initUiCore();
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { UI.touch = true; document.body.classList.add('touch'); }
    Gfx.init();
    FX.init();
    BG.init();
    Hud.build();
    Play.init();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    document.addEventListener('keydown', (e) => this.key(e));
    document.addEventListener('pointerdown', () => { this.wake(); if (Score.playing) Score.fast = true; }, true);
    // some browsers (iOS Safari) unlock sound only on a release or a click, never on the press itself
    for (const ev of ['pointerup', 'touchend', 'click']) document.addEventListener(ev, () => this.wake(), true);
    // a button clicked with the pointer does not keep the keyboard focus (Space stays free for the game)
    document.addEventListener('click', (e) => { const b = e.detail > 0 && e.target instanceof Element ? e.target.closest('button') : null; if (b) b.blur(); }, true);
    // another tab saved while this one sits on the title: show what is really stored
    window.addEventListener('storage', (e) => {
      if (e.key !== SAVE_KEY || UI.run || !$('#menu').classList.contains('on') || modalOpen()) return;
      loadProfile(); Menu.title();
    });
    this.motion();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Game.save(); saveProfile(true); Snd.suspend(); }
      else { Game._tick = nowMs(); if (this.started) Snd.resume(); }
    });
    window.addEventListener('pagehide', () => { Game.save(); saveProfile(true); });
    window.addEventListener('beforeunload', () => { Game.save(); saveProfile(true); });
    window.addEventListener('error', (e) => this.oops(e.error || e.message));
    window.addEventListener('unhandledrejection', (e) => this.oops(e.reason));
    Menu.title();
    const boot = document.getElementById('boot');
    requestAnimationFrame(() => requestAnimationFrame(() => { boot.classList.add('gone'); setTimeout(() => boot.remove(), 600); }));
  },
  wake() {
    // browsers only allow sound after a first gesture
    Snd.resume();
    if (!this.started && Snd.ready) { this.started = true; Snd.startMusic(); }
  },
  resize() {
    UI.layout();
    FX.resize(); BG.resize();
    hidePop(); hideTip();
    Play.cancelDrag();
    if ($('#menu').classList.contains('on')) Menu.title(true);
    else if (UI.run) {
      Hud._patKey = '';
      Hud.refresh();
      Play.layout();
      const p = UI.run.phase;
      if (p === 'pick' && Hud.el.viewPick.classList.contains('on')) Game.showPick();
      else if (p === 'shop') Shop.render();
    }
    Tutorial.relayout();
  },
  // the reduce-motion switch reaches the stylesheet through a class
  motion() { document.body.classList.toggle('calm', !!PROFILE.settings.reduce); },
  relang() {
    document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
    Gfx._paper.clear();
    Tutorial.hide();
    const inMenu = $('#menu').classList.contains('on');
    Hud.build();
    Play.init();
    if (inMenu || !UI.run) Menu.title(); else Game.enter();
  },
  fullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) { /* not available */ }
  },
  key(e) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    this.wake();
    // a held key must not act twice (Space places, then would flourish)
    if (e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return; }
    if (Score.playing) { Score.fast = true; if (e.key === ' ') e.preventDefault(); return; }
    if (UI.busy) { if (e.key === ' ') e.preventDefault(); return; }
    // a control reached with Tab keeps Enter/Space for itself (a button merely clicked with the mouse does not)
    let onControl = false;
    try { onControl = e.target instanceof HTMLElement && !!e.target.closest('button, [role="button"], a, select') && e.target.matches(':focus-visible'); } catch (err) { onControl = false; }
    if (modalOpen()) {
      if (e.key === 'Escape') { closeTopModal(); e.preventDefault(); }
      else if ((e.key === ' ' || e.key === 'Enter') && !(onControl && e.target.closest('#modals'))) e.preventDefault();
      return;
    }
    if (onControl && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === 'Escape' && _popAnchor) { hidePop(); return; }
    if (!$('#game').classList.contains('on') || !UI.run) return;
    const run = UI.run;
    if (run.phase === 'round') {
      if (Play.target) { if (e.key === 'Escape') { Targets.cancel(); e.preventDefault(); } return; }
      if (Play.key(e)) { e.preventDefault(); return; }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (run.phase === 'pick') Game.startRound();
      else if (run.phase === 'cash') { const b = $('#btn-collect'); if (b && !b.disabled) b.click(); }
      return;
    }
    if (e.key === 'Escape') { Overlays.pause(); e.preventDefault(); }
    else if (e.key === 'z' || e.key === 'Z') Overlays.dictionary();
    else if (e.key === 'x' || e.key === 'X') Overlays.deck();
    else if (e.key === 'c' || e.key === 'C') Overlays.runInfo();
  },
  _oops: 0,
  oops(err) {
    // never leave the player locked out because one frame went wrong
    if (typeof console !== 'undefined') console.error(err);
    UI.busy = false;
    Score.playing = false;
    Play.viewBoard = null; Play.strokes.length = 0; Play.hidden.clear(); Play.inkDirty = true;
    if (this._oops++ < 2) { try { toast({ icon: '误', title: T('oops'), text: escHtml(String(err && err.message ? err.message : err)).slice(0, 120), ms: 5000 }); } catch (e) { /* ignore */ } }
  },
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
else App.boot();

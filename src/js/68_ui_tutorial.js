// ---------- first-run coaching: small notes that point at things, never blocking play ----------
const Tutorial = {
  el: null, spot: null, target: null, pad: 8,
  active() { return !!(UI.run && UI.run.tutorial && PROFILE.meta.tutorial < 99); },
  set(v) { PROFILE.meta.tutorial = v; saveProfile(); },
  on(ev, data) {
    const run = UI.run;
    if (!run) return;
    if (ev === 'shop' && !PROFILE.meta.tips.shop) {
      PROFILE.meta.tips.shop = 1; saveProfile();
      const tgt = Hud.el.viewShop.querySelector('.shelf');
      if (tgt) this.show(tgt, T('tut.shop'), [{ label: T('tut.ok'), fn: () => this.hide() }], '');
      return;
    }
    if (!this.active()) return;
    const st = PROFILE.meta.tutorial;
    if (ev === 'pick') {
      if (st === 0) this.show($('#btn-start'), T('tut.1'), [], T('tut.step', 1, 8));
      else this.hide();
    } else if (ev === 'round') {
      if (st <= 1) { this.set(1); this.show(Hud.el.traybox, T('tut.2'), [], T('tut.step', 2, 8)); }
    } else if (ev === 'place') {
      if (st === 1 || st === 2) {
        if (data.lines.n >= 1) this.stepLine();
        else if (st === 1) { this.set(2); this.show(Hud.el.boardbox, T('tut.3'), [], T('tut.step', 3, 8), 'in'); }
      }
    } else if (ev === 'ignite') {
      if (st < 5) {
        this.set(5);
        this.show(Hud.el.char.querySelector('.calc'), T('tut.6'), [{ label: T('tut.next'), fn: () => {
          this.show(Hud.el.rinse, T('tut.7'), [{ label: T('tut.next'), fn: () => {
            this.show(Hud.el.bDict, T('tut.8'), [{ label: T('tut.done'), fn: () => { this.set(99); this.hide(); } }], T('tut.step', 8, 8));
          } }], T('tut.step', 7, 8));
        } }], T('tut.step', 6, 8));
      }
    } else if (ev === 'discard') { /* nothing to teach */ }
  },
  stepLine() {
    this.set(3);
    this.show(Hud.el.char, T('tut.4'), [{ label: T('tut.next'), fn: () => { this.set(4); this.show(Hud.el.ignite, T('tut.5'), [], T('tut.step', 5, 8)); } }], T('tut.step', 4, 8));
  },
  show(target, html, btns, step, mode) {
    this.hide();
    if (!target || !target.isConnected) return;
    this.target = target; this.mode = mode || '';
    const stage = UI.stage;
    this.spot = h('div.spot');
    const row = h('div.cbtns');
    if (this.active()) row.appendChild(mkBtn(T('tut.skip'), 'tiny ghost', () => { this.set(99); this.hide(); }));
    for (const b of btns || []) row.appendChild(mkBtn(b.label, 'tiny gold', b.fn));
    this.el = h('div.coach', step ? h('div.cstep', { text: step }) : null, h('div', { html }), row.children.length ? row : null);
    for (const b of this.el.querySelectorAll('.btn.ghost')) b.style.color = '#5d4a34';
    stage.append(this.spot, this.el);
    this.relayout();
  },
  relayout() {
    if (!this.el || !this.target) return;
    if (!this.target.isConnected) { this.hide(); return; }
    const r = UI.rect(this.target), p = this.pad;
    const s = this.spot.style;
    s.left = r.x - p + 'px'; s.top = r.y - p + 'px'; s.width = r.w + p * 2 + 'px'; s.height = r.h + p * 2 + 'px';
    const el = this.el, bw = el.offsetWidth, bh = el.offsetHeight, gap = 16;
    let x = clamp(r.x + r.w / 2 - bw / 2, 10, UI.W - bw - 10), y;
    if (this.mode === 'in') y = r.y + 14;
    else if (r.y + r.h + gap + bh < UI.H - 8) y = r.y + r.h + gap;
    else if (r.y - gap - bh > 8) y = r.y - gap - bh;
    else { y = clamp(r.y + r.h / 2 - bh / 2, 8, UI.H - bh - 8); x = r.x + r.w + gap + bw < UI.W ? r.x + r.w + gap : Math.max(10, r.x - gap - bw); }
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  },
  hide() {
    if (this.el) this.el.remove();
    if (this.spot) this.spot.remove();
    this.el = null; this.spot = null; this.target = null;
  },
};

// ---------- UI core: stage scaling, element helper, modals, pop-over cards, toasts ----------
function h(tag, attrs, ...kids) {
  // 'div', 'div.a.b', 'button#id.a' — id and classes in any order
  let t = 'div', cls = null, id = null;
  const parts = tag.match(/^[a-z0-9]+|[#.][\w-]+/gi) || [];
  for (const p of parts) {
    if (p[0] === '#') id = p.slice(1);
    else if (p[0] === '.') cls = cls ? cls + ' ' + p.slice(1) : p.slice(1);
    else t = p;
  }
  const e = document.createElement(t);
  if (id) e.id = id;
  if (cls) e.className = cls;
  const a = attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs) ? attrs : null;
  if (a) {
    for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'class') e.className = (e.className ? e.className + ' ' : '') + v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
      else if (k === 'data') for (const d in v) e.dataset[d] = v[d];
      else e.setAttribute(k, v === true ? '' : v);
    }
  } else if (attrs != null) kids.unshift(attrs);
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return e;
}
const $ = (s, root) => (root || document).querySelector(s);
const clear = (e) => { while (e.firstChild) e.removeChild(e.firstChild); return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const coinHtml = (v) => `<span class="coin"></span>${v}`;
const money = (v) => h('span', { html: coinHtml(v) });
// description text of a seal / item for the current language
function sealDesc(id, s, run) { const d = SEALS[id], f = LANG === 'zh' ? d.dz : d.de; return typeof f === 'function' ? f(s || null, run || null) : f; }
function itemDesc(id, run) { const d = ITEMS[id], f = LANG === 'zh' ? d.dz : d.de; return typeof f === 'function' ? f(run || null) : f; }
const dtx = (o) => (LANG === 'zh' ? o.dz : o.de);
const nm = (o) => (LANG === 'zh' ? o.zh : o.en);

const UI = {
  W: 1280, H: 720, s: 1, orient: 'l', stage: null, touch: false, run: null, busy: false,
  layout() {
    // keep clear of notches and the home indicator
    const probe = this._probe || (this._probe = document.body.appendChild(h('div', { style: { position: 'fixed', left: '0', top: '0', width: '0', height: '0', visibility: 'hidden', pointerEvents: 'none', paddingTop: 'env(safe-area-inset-top, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)' } })));
    const cs = getComputedStyle(probe);
    const sa = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    const vw = window.innerWidth - sa.l - sa.r, vh = window.innerHeight - sa.t - sa.b;
    if (vw < 10 || vh < 10) return;
    const asp = vw / vh;
    let W, H, o;
    if (asp >= 1) { o = 'l'; H = 720; W = clamp(Math.round(720 * asp), 1180, 1660); }
    else { o = 'p'; W = 720; H = clamp(Math.round(720 / asp), 1230, 1680); }
    const s = Math.min(vw / W, vh / H);
    const changed = W !== this.W || H !== this.H || o !== this.orient || Math.abs(s - this.s) > 1e-4;
    this.W = W; this.H = H; this.s = s; this.orient = o;
    const st = document.documentElement.style;
    st.setProperty('--W', W + 'px'); st.setProperty('--H', H + 'px'); st.setProperty('--s', String(s));
    st.setProperty('--cx', sa.l + vw / 2 + 'px'); st.setProperty('--cy', sa.t + vh / 2 + 'px');
    document.body.dataset.o = o;
    return changed;
  },
  // viewport point -> stage coordinates
  toStage(cx, cy) {
    const r = this.stage.getBoundingClientRect();
    return { x: (cx - r.left) / this.s, y: (cy - r.top) / this.s };
  },
  // element rect in stage coordinates
  rect(el) {
    const a = el.getBoundingClientRect(), r = this.stage.getBoundingClientRect();
    return { x: (a.left - r.left) / this.s, y: (a.top - r.top) / this.s, w: a.width / this.s, h: a.height / this.s };
  },
  // element centre in viewport coordinates (for effects)
  center(el) { const a = el.getBoundingClientRect(); return { x: a.left + a.width / 2, y: a.top + a.height / 2, w: a.width, h: a.height }; },
  screen(name) {
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === name);
    hidePop(); hideTip();
  },
};

function mkBtn(label, cls, fn, o) {
  const opt = o || {};
  const b = h('button.btn', { class: cls || '', type: 'button' });
  if (label instanceof Node) b.appendChild(label); else b.innerHTML = label;
  b.addEventListener('click', (e) => {
    if (b.disabled) return;
    if (!opt.silent) Snd.play(opt.snd || 'click');
    fn(e);
  });
  return b;
}

// ---- tooltip (mouse hover) and pop-over card (click / tap, with actions)
let _tipTimer = 0, _popAnchor = null;
function placeFloat(box, anchor, prefer) {
  const a = UI.rect(anchor);
  box.style.display = 'block';
  box.style.left = '0px'; box.style.top = '0px';
  const bw = box.offsetWidth, bh = box.offsetHeight, pad = 8, gap = 10;
  let x, y;
  const side = prefer || (UI.orient === 'l' ? 'side' : 'below');
  if (side === 'side') {
    x = a.x + a.w + gap;
    if (x + bw > UI.W - pad) x = a.x - bw - gap;
    if (x < pad) x = clamp(a.x + a.w / 2 - bw / 2, pad, UI.W - bw - pad);
    y = clamp(a.y + a.h / 2 - bh / 2, pad, UI.H - bh - pad);
    if (x < a.x + a.w && x + bw > a.x && y < a.y + a.h && y + bh > a.y) { y = a.y + a.h + gap; if (y + bh > UI.H - pad) y = a.y - bh - gap; }
  } else {
    x = clamp(a.x + a.w / 2 - bw / 2, pad, UI.W - bw - pad);
    y = a.y + a.h + gap;
    if (y + bh > UI.H - pad) y = a.y - bh - gap;
    if (y < pad) y = clamp(a.y + a.h / 2 - bh / 2, pad, UI.H - bh - pad);
  }
  box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(Math.max(pad, y)) + 'px';
}
function cardEl(c) {
  // c: { title, tag, tagCol, body(html), extra(html), actions:[{label, cls, fn, disabled}] , wide }
  const el = h('div.card.onpaper', { class: c.wide ? 'wide' : '' });
  const head = h('div.ch', h('div.cn', { html: c.title || '' }));
  if (c.tag) head.appendChild(h('div.ct', { text: c.tag, style: { background: c.tagCol || '#6b5a44' } }));
  el.appendChild(head);
  if (c.body) el.appendChild(h('div.cd', { html: c.body }));
  if (c.extra) el.appendChild(h('div.cx', { html: c.extra }));
  if (c.actions && c.actions.length) {
    const row = h('div.ca');
    for (const a of c.actions) {
      const b = mkBtn(a.label, 'small ' + (a.cls || ''), () => { hidePop(); a.fn(); }, { snd: a.snd });
      if (a.disabled) b.disabled = true;
      row.appendChild(b);
    }
    el.appendChild(row);
  }
  return el;
}
function showTip(anchor, c) {
  if (UI.touch || _popAnchor === anchor) return;
  const box = $('#tip');
  clear(box).appendChild(cardEl(Object.assign({}, c, { actions: null })));
  placeFloat(box, anchor, c.side);
}
function hideTip() { clearTimeout(_tipTimer); const b = $('#tip'); if (b) b.style.display = 'none'; }
function showPop(anchor, c) {
  hideTip();
  const box = $('#pop');
  clear(box).appendChild(cardEl(c));
  _popAnchor = anchor;
  placeFloat(box, anchor, c.side);
}
function hidePop() { const b = $('#pop'); if (b) { b.style.display = 'none'; clear(b); } _popAnchor = null; }
// attach: hover shows the card; click shows it with actions. getCard() -> card spec or null
function bindCard(el, getCard, o) {
  const opt = o || {};
  el.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(_tipTimer);
    _tipTimer = setTimeout(() => { const c = getCard(); if (c && el.isConnected) showTip(el, c); }, 110);
  });
  el.addEventListener('pointerleave', hideTip);
  const open = () => {
    const c = getCard();
    if (!c) return false;
    if (_popAnchor === el) { hidePop(); return false; }
    Snd.play('tick');
    showPop(el, c);
    return true;
  };
  el.addEventListener('click', (e) => {
    if (opt.noClick || el._suppressClick) return;
    e.stopPropagation();
    open();
  });
  if (!opt.noClick) {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); e.stopPropagation();
      if (open()) { const b = $('#pop').querySelector('button'); if (b) b.focus(); }
    });
  }
  if (opt.hold) {
    // touch: press and hold to read the card (a tap keeps its own meaning)
    let timer = 0;
    const stop = () => { clearTimeout(timer); timer = 0; };
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      stop();
      timer = setTimeout(() => { timer = 0; const c = getCard(); if (c && el.isConnected) { el._held = true; showTip(el, c); } }, 460);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => {
      stop();
      if (el._held) { el._held = false; hideTip(); el._suppressClick = true; setTimeout(() => { el._suppressClick = false; }, 350); }
    });
  }
}

// ---- modals
const _modals = [];
function openModal(o) {
  // o: { title, sub, body: Node | (root, close) => void, buttons: [{label, cls, fn, keep}], cls, width, dismiss (default true), onClose, tabs }
  hidePop(); hideTip();
  const root = $('#modals');
  const veil = h('div.veil');
  const box = h('div.modal.panel', { class: o.cls || '', style: { width: (o.width || 760) + 'px' } });
  const api = { close, el: box, veil, body: null };
  function close(result) {
    const i = _modals.indexOf(api);
    if (i < 0) return;
    _modals.splice(i, 1);
    veil.remove();
    if (o.onClose) o.onClose(result);
  }
  if (o.title != null) {
    const head = h('div.mh', h('div.mt', { html: o.title }));
    if (o.sub) head.appendChild(h('div.ms', { html: o.sub }));
    if (o.dismiss !== false) head.appendChild(h('button.xbtn', { type: 'button', 'aria-label': 'close', text: '×', on: { click: () => { Snd.play('back'); close(); } } }));
    box.appendChild(head);
  }
  const body = h('div.mb.scroll');
  api.body = body;
  if (typeof o.body === 'function') o.body(body, close, api); else if (o.body) body.appendChild(o.body);
  box.appendChild(body);
  if (o.buttons && o.buttons.length) {
    const foot = h('div.mf');
    for (const b of o.buttons) {
      const btn = mkBtn(b.label, b.cls || '', () => { if (b.fn) b.fn(close); if (!b.keep) close(b.value); }, { snd: b.snd });
      if (b.disabled) btn.disabled = true;
      if (b.id) btn.id = b.id;
      foot.appendChild(btn);
    }
    box.appendChild(foot);
    api.foot = foot;
  }
  veil.appendChild(box);
  box.tabIndex = -1;
  veil.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('button, input, textarea, select, [tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
  });
  if (o.dismiss !== false) veil.addEventListener('pointerdown', (e) => { if (e.target === veil) { Snd.play('back'); close(); } });
  api.dismiss = o.dismiss !== false;
  root.appendChild(veil);
  _modals.push(api);
  try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); box.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  return api;
}
const modalOpen = () => _modals.length > 0;
function closeTopModal() { const m = _modals[_modals.length - 1]; if (m && m.dismiss) { Snd.play('back'); m.close(); return true; } return false; }
function closeAllModals() { let guard = 40; while (_modals.length && guard-- > 0) _modals[_modals.length - 1].close(); }
function confirmBox(title, text, yes, no, danger) {
  return new Promise((res) => {
    let done = false;
    openModal({
      title, width: 520, body: h('div', { html: text, style: { fontSize: '21px', lineHeight: '1.5', textAlign: 'center', padding: '6px 4px' } }),
      buttons: [{ label: no || T('cancel'), cls: 'ghost', fn: () => { done = true; res(false); } }, { label: yes || T('ok'), cls: danger ? 'red' : 'gold', fn: () => { done = true; res(true); } }],
      onClose: () => { if (!done) res(false); },
    });
  });
}

// ---- toasts
const _toastQ = [];
function toast(o) {
  // o: { icon (text) | iconEl, title, text, ms, snd }
  _toastQ.push(o);
  if (_toastQ.length > 12) _toastQ.shift();
  pumpToasts();
}
// at most two notes on screen in landscape (three in portrait); the rest wait their turn
function pumpToasts() {
  const box = $('#toasts');
  if (!box) return;
  const max = UI.orient === 'p' ? 3 : 2;
  while (_toastQ.length && box.children.length < max) {
    const o = _toastQ.shift();
    const ic = h('div.ti', { class: o.iconEl ? 'paper' : '' }, o.iconEl || o.icon || '印');
    const el = h('div.toast', ic, h('div', h('div.tt', { html: o.title || '' }), o.text ? h('div.td', { html: o.text }) : null));
    box.appendChild(el);
    if (o.snd) Snd.play(o.snd);
    // a waiting queue moves along a little faster
    const ms = _toastQ.length ? Math.min(o.ms || 3200, 2400) : (o.ms || 3200);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); pumpToasts(); }, 380); }, ms);
  }
}
function showAchievements() {
  for (const id of takeNewAch()) {
    toast({ icon: '成', title: T('ach.got', nm(ACH[id])), text: dtx(ACH[id]), ms: 4200, snd: 'ach' });
    for (const sid in SEAL_LOCK) if (SEAL_LOCK[sid] === id) toast({ iconEl: Gfx.sealEl(sid, 40, null), title: T('seal.unlocked', nm(SEALS[sid])), text: T('seal.unlocked.d'), ms: 4600 });
  }
  for (const id of DECK_ORDER) {
    if (PROFILE.meta.tips['deck_' + id] || !DECKS[id].unlock || !deckUnlocked(id)) continue;
    PROFILE.meta.tips['deck_' + id] = 1;
    toast({ icon: DECKS[id].zh[0], title: T('deck.unlocked', nm(DECKS[id])), text: T('deck.unlocked.d'), ms: 4600, snd: 'ach' });
  }
  saveProfile();
}

// global dismissal of pop-overs
function initUiCore() {
  UI.stage = $('#stage');
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') { UI.touch = true; document.body.classList.add('touch'); } else if (e.pointerType === 'mouse') { UI.touch = false; document.body.classList.remove('touch'); }
    const pop = $('#pop');
    if (_popAnchor && !pop.contains(e.target) && !_popAnchor.contains(e.target)) hidePop();
  }, true);
  document.addEventListener('contextmenu', (e) => { if (!(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLImageElement)) e.preventDefault(); });
  // iOS: block pinch and double-tap zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}

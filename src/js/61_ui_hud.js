// ---------- HUD: sheet info, score, the character being written, ink, seals and items ----------
const strokesLabel = (n) => (n === 1 ? T('char.stroke1') : T('char.strokes', n));
const edTag = (ed) => (LANG === 'zh' ? EDITIONS[ed].zh : EDITIONS[ed].te);
const Hud = {
  el: {},
  build() {
    const g = clear($('#game'));
    const E = this.el = {};
    // top: blind, score, character
    E.blind = h('div.panel.blindcard',
      E.fa = h('div.fa'), E.bname = h('div.nm'), E.bfx = h('div.fx'),
      E.binfo = h('button.infobtn', { type: 'button', text: 'i', 'aria-label': 'info', on: { click: () => { Snd.play('click'); Overlays.sheetInfo(); } } }));
    E.score = h('div.panel.scorecard',
      h('div.row', h('span.lbl', { text: T('hud.score') }), h('span', h('span.lbl', { text: T('hud.target') + ' ' }), E.tgt = h('span.tgt'))),
      E.cur = h('div.cur', { text: '0' }), h('div.bar', E.bar = h('i')));
    E.char = h('div.panel.charcard',
      h('div.who', E.glyph = h('div.glyph.empty'), h('div.meta', E.cname = h('div.cname'), E.csub = h('div.csub'))),
      h('div.calc', E.boxC = h('div.box.form', h('span.t', { text: T('form') }), E.vC = h('span.v', { text: '0' })), h('span.times', { text: '×' }), E.boxM = h('div.box.spirit', h('span.t', { text: T('spirit') }), E.vM = h('span.v', { text: '0' }))),
      E.hints = h('div.hints'));
    g.appendChild(h('div#hudtop', E.blind, E.score, E.char));
    // side: seals and items
    E.sealTitle = h('div.boxtitle');
    E.sealList = h('div.seallist');
    E.itemTitle = h('div.boxtitle');
    E.itemList = h('div.itemlist');
    g.appendChild(h('div#side', h('div.panel.sealbox', E.sealTitle, E.sealList), h('div.panel.itembox', E.itemTitle, E.itemList)));
    // centre: the playfield and the views that replace it
    E.center = h('div#center',
      h('canvas#play'),
      h('div#playui',
        E.boardbox = h('div#boardbox', E.bossline = h('div.bossline.hide'), E.peek = h('div.panel.peekbox.hide')),
        h('div#trayrow',
          E.rinse = h('button#btn-rinse.actbtn', { type: 'button' }, h('span.t', { text: T('rinse') }), E.rinseN = h('span.n'), h('span.k', { text: 'Q' })),
          E.traybox = h('div#traybox', E.trayAnchor = h('div#trayanchor')),
          E.ignite = h('button#btn-ignite.actbtn', { type: 'button' }, h('span.t', { text: T('ignite') }), E.igniteN = h('span.n'), h('span.k', { text: 'Space' })))),
      E.viewPick = h('div.view#v-pick'), E.viewCash = h('div.view#v-cash'), E.viewShop = h('div.view#v-shop'));
    g.appendChild(E.center);
    // resources
    E.ink = h('div.panel.inkcard', h('div.row', h('span.lbl', { text: T('ink') }), h('span.val', E.inkV = h('span'), E.inkMax = h('small'))), h('div.inkbar', E.inkFill = h('i'), E.inkCost = h('b')));
    E.money = h('div.panel.counter.mn', h('div.lbl', { text: T('money') }), E.moneyV = h('div.val'));
    E.runline = h('div.runline');
    const ib = (txt, title, fn) => h('button.iconbtn', { type: 'button', title, 'aria-label': title, text: txt, on: { click: () => { Snd.play('click'); fn(); } } });
    E.btns = h('div.resbtns',
      E.bDict = ib(T('btn.dict.g'), T('btn.dict'), () => Overlays.dictionary()),
      E.bDeck = ib(T('btn.deck.g'), T('btn.deck'), () => Overlays.deck()),
      E.bRun = ib(T('btn.run.g'), T('btn.run'), () => Overlays.runInfo()),
      E.bMenu = ib(T('btn.menu.g'), T('btn.menu'), () => Overlays.pause()));
    // what a stroke written in a single ink is worth
    const key = E.pureKey = h('div.purekey', h('b', { text: T('hud.pure') }));
    const short = { mo: T('form') + '+' + PURE.mo, zhu: T('spirit') + '+' + PURE.zhu, qing: T('spirit') + '×' + PURE.qing, jin: LANG === 'zh' ? '+' + PURE.jin + '文' : '+$' + PURE.jin };
    for (const k of INKS) key.appendChild(h('span', { title: nm(INK[k]) }, h('i', { style: { background: INK[k].col } }), h('em', { text: nm(INK[k]) + ' ' }), short[k]));
    g.appendChild(h('div#res', key, E.ink, h('div.counters', E.money), E.runline, E.btns));
    this._score = 0;
  },
  view(name) {
    const E = this.el;
    Tutorial.hide();
    for (const k of ['viewPick', 'viewCash', 'viewShop']) E[k].classList.remove('on');
    $('#playui').style.visibility = name ? 'hidden' : 'visible';
    $('#play').style.visibility = name ? 'hidden' : 'visible';
    if (name) E[name].classList.add('on');
    Play.active = !name;
    hidePop(); hideTip();
  },
  refresh() {
    const run = UI.run, E = this.el;
    if (!run) return;
    Play.poke();
    const rd = run.round;
    // blind card
    const ante = run.phase === 'won' ? 8 : run.ante;
    const fa = FA[((ante - 1) % 8) + 1];
    clear(E.fa).append(h('span.g', { text: fa.g }), h('span', { text: faName(ante) }));
    const b = rd ? rd.blind : run.blind, bossId = rd ? rd.boss : (b === 2 ? run.boss : null);
    E.blind.classList.toggle('boss', !!bossId);
    if (bossId) { E.bname.textContent = '《' + nm(BOSSES[bossId]) + '》'; E.bfx.innerHTML = rich(dtx(BOSSES[bossId])); }
    else { E.bname.textContent = tx(BLIND_NAME[b]); E.bfx.innerHTML = rich('[n|' + (LANG === 'zh' ? fa.lz : fa.le) + ']'); E.bfx.querySelectorAll('.rk-n').forEach((x) => { x.style.display = 'inline'; }); }
    if (LANG === 'en' && bossId) E.bname.textContent = nm(BOSSES[bossId]);
    // score
    const tgt = rd ? rd.target : blindInfo(run, run.blind).target;
    E.tgt.textContent = fmtNum(tgt);
    this.setScore(rd ? rd.score : 0, false);
    // ink and counters
    const ink = rd ? rd.ink : stat(run, 'inkMax'), mx = rd ? rd.inkMax : stat(run, 'inkMax');
    E.inkV.textContent = Math.round(ink);
    E.inkMax.textContent = ' / ' + mx;
    E.inkFill.style.width = clamp((100 * ink) / Math.max(1, mx), 0, 100) + '%';
    E.ink.classList.toggle('low', !!rd && ink < 12);
    E.inkCost.style.opacity = 0;
    const ig = rd ? rd.ignites : stat(run, 'ignites'), dc = rd ? rd.discards : stat(run, 'discards');
    E.igniteN.textContent = '× ' + ig;
    E.rinseN.textContent = '× ' + dc;
    E.moneyV.innerHTML = coinHtml(run.money);
    E.runline.innerHTML = `<span>${nm(DECKS[run.deckId])} · ${nm(STAKES[run.stake])}</span><span>${run.daily ? T('daily.short') : T('hud.seed') + ' ' + run.seed}</span>`;
    this.renderSeals();
    this.renderItems();
    this.pattern();
    this.buttons();
    // boss reminder over the sheet, and the look-ahead
    if (rd && rd.boss && run.phase === 'round') {
      E.bossline.classList.remove('hide');
      let extra = '';
      const lim = flag(run, 'pieceLimit');
      if (lim) extra = T('boss.limit', rd.placed, lim);
      else if (rd.boss === 'yihe') extra = T('boss.tide', 6 - (rd.placed % 6));
      else if (rd.boss === 'jizhi') extra = T('boss.blot', 3 - (rd.placed % 3));
      E.bossline.innerHTML = rich(dtx(BOSSES[rd.boss]).split('\n')[0]) + (extra ? `<b style="color:#ffd9a0;margin-left:10px">${extra}</b>` : '');
    } else E.bossline.classList.add('hide');
    this.renderPeek();
    this.fitKey();
  },
  // the legend gives way when the cards above need the room: full, then one line without names, then nothing
  fitKey() {
    const k = this.el.pureKey;
    if (!k || UI.orient !== 'l') return;
    const tight = () => k.getBoundingClientRect().top - this.el.char.getBoundingClientRect().bottom < 5 * UI.s;
    k.className = 'purekey';
    if (tight()) { k.classList.add('tight'); if (tight()) k.classList.add('off'); }
  },
  buttons() {
    const run = UI.run, E = this.el, rd = run && run.round;
    const inRound = run && run.phase === 'round' && rd;
    const lines = inRound ? findLines(run).n : 0;
    E.ignite.disabled = !inRound || UI.busy || lines === 0 || rd.ignites <= 0;
    E.ignite.classList.toggle('ready', !!inRound && !UI.busy && lines > 0 && rd.ignites > 0);
    E.rinse.disabled = !inRound || UI.busy || rd.discards <= 0;
    if (inRound) { E.igniteN.textContent = '× ' + rd.ignites; E.rinseN.textContent = '× ' + rd.discards; }
  },
  setInkPreview(cost) {
    const run = UI.run, rd = run && run.round, E = this.el;
    if (!rd || !cost) { E.inkCost.style.opacity = 0; return; }
    const mx = Math.max(1, rd.inkMax), after = Math.max(0, rd.ink - cost);
    E.inkCost.style.left = clamp((100 * after) / mx, 0, 100) + '%';
    E.inkCost.style.width = clamp((100 * Math.min(cost, rd.ink)) / mx, 0, 100) + '%';
    E.inkCost.style.opacity = 1;
  },
  setScore(v, animate) {
    const E = this.el, run = UI.run, rd = run && run.round;
    const tgt = rd ? rd.target : 1;
    const from = this._score;
    this._score = v;
    const apply = (x) => {
      E.cur.textContent = fmtNum(x);
      E.bar.style.width = clamp((100 * x) / Math.max(1, tgt), 0, 100) + '%';
      E.score.classList.toggle('done', !!rd && x >= tgt);
    };
    if (!animate || from === v) { apply(v); return Promise.resolve(); }
    return new Promise((res) => {
      const t0 = nowMs(), dur = 650 / Score.speed();
      const tick = () => {
        const u = clamp((nowMs() - t0) / dur, 0, 1), e = 1 - Math.pow(1 - u, 3);
        apply(from + (v - from) * e);
        if (u < 1) requestAnimationFrame(tick); else { apply(v); res(); }
      };
      tick();
    });
  },
  setCalc(c, m, bump) {
    const E = this.el;
    const sc = fmtNum(c), sm = fmtMult(m);
    if (E.vC.textContent !== sc) { E.vC.textContent = sc; if (bump) this.bump(E.boxC); }
    if (E.vM.textContent !== sm) { E.vM.textContent = sm; if (bump) this.bump(E.boxM); }
    const fit = (el, s) => { el.style.fontSize = s.length > 9 ? '22px' : s.length > 7 ? '27px' : ''; };
    fit(E.vC, sc); fit(E.vM, sm);
  },
  bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
  // the character the completed lines would write right now (pat may be a hypothetical one while dragging)
  pattern(pat, ghost) {
    const run = UI.run, E = this.el;
    if (!run) return;
    const inRound = run.phase === 'round' && run.round;
    const p = pat !== undefined ? pat : (inRound ? currentPattern(run) : null);
    // the hints depend on the whole sheet, so the cache key includes how much of it is inked
    const state = inRound ? ':' + run.round.placed + '.' + run.round.igniteCount + '.' + run.round.board.reduce((n, c) => n + (c ? 1 : 0), 0) + '.' + (PROFILE.settings.hints ? 1 : 0) + UI.orient : '';
    const key = (p ? p.id + ':' + p.lines.rows.join(',') + '|' + p.lines.cols.join(',') + '|' + p.lines.diags.join(',') + ':' + p.lvl + ':' + (p.nul || '') + (ghost ? 'g' : '') : 'none' + (inRound ? 1 : 0)) + state;
    if (this._patKey === key + LANG) return;
    this._patKey = key + LANG;
    clear(E.glyph); clear(E.cname); clear(E.hints);
    E.csub.className = 'csub';
    if (!p) {
      if (!ghost) this._lastChar = null;
      E.glyph.classList.add('empty');
      E.cname.appendChild(h('span', { text: T('hud.nochar'), style: { color: 'var(--dim)', fontSize: '25px' } }));
      E.csub.innerHTML = inRound ? T('hud.nochar.tip') : '';
      this.setCalc(0, 0, false);
      if (inRound && PROFILE.settings.hints) this.renderHints();
      return;
    }
    E.glyph.classList.remove('empty');
    const def = CH[p.id];
    if (!ghost && this._lastChar !== p.id) { E.glyph.classList.remove('flip'); void E.glyph.offsetWidth; E.glyph.classList.add('flip'); }
    if (!ghost) this._lastChar = p.id;
    E.glyph.appendChild(Gfx.glyphCanvas(p.id, 62, p.nul ? '#9c8f7c' : '#1b1918', { lay: p.lines, w: run.w, h: run.h }));
    E.glyph.style.opacity = ghost ? 0.75 : 1;
    E.cname.appendChild(h('span', { text: p.id === 'sanbi' ? T('sanbi') : def.g }));
    E.cname.appendChild(h('small', { text: (p.id === 'sanbi' || LANG === 'zh' ? '' : def.en + ' · ') + T('hud.tier', p.n, p.lvl) }));
    if (def.x !== 1) E.cname.appendChild(h('span.xb', { text: fmtX(def.x) }));
    if (p.nul) { E.csub.classList.add('warn'); E.csub.textContent = T('nul.' + p.nul); }
    else if (def.yi) {
      const used = run.round && run.round.yiUsed[p.id];
      E.csub.innerHTML = `<b>${T('hud.yi')}</b> ` + rich(dtx(YI[def.yi])) + (used ? ` <span style="color:var(--dim2)">${T('hud.yi.used')}</span>` : '');
    } else E.csub.textContent = p.id === 'sanbi' ? T('hud.sanbi.tip') : (LANG === 'zh' ? def.py : def.py + ' · ' + def.en);
    this.setCalc(p.base.c, p.base.m, false);
    if (PROFILE.settings.hints && inRound && !ghost) this.renderHints();
  },
  renderHints() {
    const run = UI.run, E = this.el;
    const list = charHints(run, UI.orient === 'p' ? 2 : 3, PROFILE.meta.chars);
    if (!list.length) return;
    E.hints.appendChild(h('span.hl', { text: T('hud.hints') }));
    const L = findLines(run);
    for (const it of list) {
      const def = CH[it.id];
      const cv = mkCanvas(34 * 3, 34 * 3), c = cv.getContext('2d');
      c.scale(3, 3);
      const have = { rows: it.rows.filter((y) => L.rows.includes(y)), cols: it.cols.filter((x) => L.cols.includes(x)), diags: [] };
      const miss = { rows: it.rows.filter((y) => !L.rows.includes(y)), cols: it.cols.filter((x) => !L.cols.includes(x)), diags: [] };
      Gfx.glyph(c, miss, run.w, run.h, 2, 2, 30, 'rgba(192,50,31,0.55)', { dry: false, weight: 0.1 });
      Gfx.glyph(c, have, run.w, run.h, 2, 2, 30, '#1b1918', { dry: false, weight: 0.1 });
      const el = h('div.hint', cv, h('span', { text: def.g + ' ' + fmtX(def.x) }));
      bindCard(el, () => charCard(it.id, run), { noClick: false });
      E.hints.appendChild(el);
    }
  },
  renderPeek() {
    const run = UI.run, E = this.el, rd = run && run.round;
    clear(E.peek);
    const n = rd && run.phase === 'round' ? stat(run, 'peek') : 0;
    if (!n) { E.peek.classList.add('hide'); return; }
    const list = peekList(run, n);
    if (!list.length) { E.peek.classList.add('hide'); return; }
    E.peek.classList.remove('hide');
    E.peek.appendChild(h('div.t', { text: T('hud.next') }));
    for (const p of list) {
      const cv = Gfx.pieceCanvas(p.shape, p.ink, p.enh, 9, PROFILE.settings.marks, p.rot);
      E.peek.appendChild(cv);
    }
  },
  renderSeals() {
    const run = UI.run, E = this.el;
    const slots = stat(run, 'sealSlots'), used = run.seals.filter((s) => s.ed !== 'xian').length;
    E.sealTitle.innerHTML = `<span>${T('seals')}</span><span class="num">${used}/${slots}</span>`;
    clear(E.sealList);
    const rd = run.round;
    // in portrait the seals share one strip: shrink them when there are many
    const shown = run.seals.length + Math.max(0, slots - used);
    const roomL = (E.sealList.clientHeight || 520) / Math.max(1, shown);
    const size = UI.orient === 'p' ? clamp(Math.floor((UI.W - 250) / Math.max(5, shown)) - 12, 40, 74) : clamp(Math.floor(roomL) - 14, 30, 62);
    E.sealList.classList.toggle('tightseals', UI.orient === 'l' && size < 52);
    E.sealList.classList.toggle('smallseals', UI.orient === 'p' && size < 58);
    E.sealList.style.setProperty('--ss', size + 'px');
    run.seals.forEach((s, i) => {
      const d = SEALS[s.id];
      const el = h('div.seal', { data: { uid: s.uid } }, Gfx.sealEl(s.id, size, s.ed),
        h('div.st', h('div.n', { text: nm(d) }), h('div.d', { html: rich(sealDesc(s.id, s, run).split('\n')[0]) })));
      if (s.ed) el.appendChild(h('span.edtag', { text: edTag(s.ed) }));
      if (rd && rd.sealOff[s.uid]) el.classList.add('off');
      bindCard(el, () => sealCard(s.id, s, run, { owned: true, index: i }));
      this.bindSealDrag(el, i);
      E.sealList.appendChild(el);
    });
    const freeSlots = Math.max(0, slots - used);
    for (let i = 0; i < freeSlots; i++) E.sealList.appendChild(h('div.seal.empty', { text: T('seal.empty') }));
  },
  bindSealDrag(el, index) {
    // drag a seal onto another to reorder (order matters: they act left to right)
    let start = null, moved = false;
    el.addEventListener('pointerdown', (e) => {
      if (UI.busy || e.button > 0) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = false;
    });
    el.addEventListener('pointerleave', () => { if (!moved) start = null; });
    el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { start = null; moved = false; el.classList.remove('dragging'); return; }
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 14 * Math.max(0.6, UI.s)) {
        moved = true; hidePop(); hideTip();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
        el.classList.add('dragging');
      }
      if (moved) {
        const tgt = this.sealAt(e.clientX, e.clientY);
        this.el.sealList.querySelectorAll('.dropbefore').forEach((x) => x.classList.remove('dropbefore'));
        if (tgt && tgt.el !== el) tgt.el.classList.add('dropbefore');
      }
    });
    const end = (e, cancelled) => {
      if (!start || e.pointerId !== start.id) return;
      const wasMoved = moved && !cancelled;
      start = null; moved = false;
      el.classList.remove('dragging');
      this.el.sealList.querySelectorAll('.dropbefore').forEach((x) => x.classList.remove('dropbefore'));
      if (!wasMoved) return;
      el._suppressClick = true; setTimeout(() => { el._suppressClick = false; }, 60);
      const tgt = this.sealAt(e.clientX, e.clientY);
      if (tgt && tgt.index !== index && !UI.busy) {
        moveSeal(UI.run, index, tgt.index > index ? tgt.index - 1 : tgt.index);
        Snd.play('rotate');
        Game.save(); this.renderSeals();
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', (e) => end(e, true));
  },
  sealAt(cx, cy) {
    const kids = [...this.el.sealList.querySelectorAll('.seal:not(.empty)')];
    let best = null;
    kids.forEach((k, i) => {
      const r = k.getBoundingClientRect();
      if (cx >= r.left - 6 && cx <= r.right + 6 && cy >= r.top - 6 && cy <= r.bottom + 6) best = { el: k, index: i };
    });
    return best;
  },
  sealEl(uid) { return this.el.sealList.querySelector(`.seal[data-uid="${uid}"]`); },
  popSeal(uid) { const el = this.sealEl(uid); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } return el; },
  renderItems() {
    const run = UI.run, E = this.el;
    const slots = stat(run, 'itemSlots');
    E.itemTitle.innerHTML = `<span>${T('items')}</span><span class="num">${run.items.length}/${slots}</span>`;
    clear(E.itemList);
    run.items.forEach((it, i) => {
      const el = h('div.item', itemSlip(it.id));
      bindCard(el, () => itemCard(it.id, run, { owned: true, index: i }));
      E.itemList.appendChild(el);
    });
    for (let i = run.items.length; i < slots; i++) E.itemList.appendChild(h('div.item.empty'));
  },
};

// ---- little paper slips for items and copybooks
function itemGlyph(id) {
  const d = ITEMS[id];
  if (d.kind === 'tie') return '一二三四五六七'[d.tier - 1];
  return d.zh[0];
}
function itemSlip(id) {
  const d = ITEMS[id];
  return h('div.slip', { class: d.kind === 'tie' ? 'tie' : '' }, h('div.gl', { text: itemGlyph(id) }), h('div.nm', { text: d.kind === 'tie' ? (LANG === 'zh' ? TIER_NAME.zh[d.tier] : TIER_NAME.en[d.tier]) : nm(d) }));
}

// ---- card specs
function sealCard(id, s, run, o) {
  const d = SEALS[id], opt = o || {};
  const r = RARITY[d.r];
  let body = rich(sealDesc(id, s, run));
  const ed = s ? s.ed : opt.ed;
  let extra = '';
  if (ed) extra += `<b>${nm(EDITIONS[ed])}</b>：${rich(dtx(EDITIONS[ed]))}`;
  if (opt.locked) extra += (extra ? '<br>' : '') + T('seal.locked', dtx(ACH[SEAL_LOCK[id]]));
  const actions = [];
  if (opt.owned && run && s && ['shop', 'round', 'pick'].includes(run.phase) && !UI.busy) {
    const i = opt.index;
    if (run.seals.length > 1) {
      if (i > 0) actions.push({ label: UI.orient === 'l' ? '↑' : '←', cls: 'ghost', snd: 'rotate', fn: () => { moveSeal(run, i, i - 1); Game.save(); Hud.renderSeals(); } });
      if (i < run.seals.length - 1) actions.push({ label: UI.orient === 'l' ? '↓' : '→', cls: 'ghost', snd: 'rotate', fn: () => { moveSeal(run, i, i + 1); Game.save(); Hud.renderSeals(); } });
    }
    actions.push({ label: T('sell') + ' ' + coinHtml(sealSellValue(s)), cls: 'gold', snd: 'sell', fn: () => Game.sellSeal(s.uid) });
  }
  if (opt.actions) actions.push(...opt.actions);
  return { title: nm(d), tag: nm(r), tagCol: d.r === 4 ? '#b8860b' : d.r === 3 ? '#a3231a' : d.r === 2 ? '#8a6a2a' : '#5d7a68', body, extra, actions };
}
function itemCard(id, run, o) {
  const d = ITEMS[id], opt = o || {};
  const actions = [];
  if (opt.owned && run && !UI.busy && ['shop', 'round', 'pick'].includes(run.phase)) {
    const u = itemUsable(run, d);
    actions.push({ label: T('use'), cls: 'red', disabled: !u.ok, snd: 'click', fn: () => Game.useItemFlow(opt.index) });
    actions.push({ label: T('sell') + ' ' + coinHtml(itemSellValue(id)), cls: 'gold', snd: 'sell', fn: () => Game.sellItem(opt.index) });
  }
  if (opt.actions) actions.push(...opt.actions);
  let extra = '';
  if (d.round) extra = T('item.roundonly');
  return { title: nm(d), tag: d.kind === 'tie' ? T('kind.tie') : T('kind.wen'), tagCol: d.kind === 'tie' ? '#2f5f8c' : '#3c7a5f', body: rich(itemDesc(id, run)), extra, actions };
}
function charCard(id, run) {
  const def = CH[id];
  const tier = tierOf(def.n || 1);
  const lvl = run ? run.tiers[tier] : 1, b = tierBase(tier, lvl);
  let body = id === 'sanbi' ? T('sanbi.desc') : `<span style="font-family:var(--f-kai)">${escHtml(LANG === 'zh' ? def.gz : def.ge)}</span>`;
  let extra = id === 'xuan' || id === 'sanbi' ? '' : `${T('hud.tier', def.n, lvl)}：${T('form')} ${b.c} × ${T('spirit')} ${b.m}`;
  if (def.x !== 1) extra += (extra ? '　' : '') + `${T('char.x')} <b style="color:#b3261a">${fmtX(def.x)}</b>`;
  if (def.yi) extra += `<br><b>${T('hud.yi')}</b> ` + rich(dtx(YI[def.yi])) + ` <span style="opacity:.7">${T('char.yi.once')}</span>`;
  if (def.num) extra += `<br>${T('char.num', def.num)}`;
  return { title: (id === 'sanbi' ? T('sanbi') : def.g) + (def.py ? ` <span style="font-family:var(--f-ui);font-size:16px;font-weight:400;opacity:.75">${def.py}${LANG === 'en' ? ' · ' + def.en : ''}</span>` : ''), tag: id === 'sanbi' ? '' : strokesLabel(id === 'xuan' && run ? run.w + run.h : def.n), body, extra };
}
function pieceCard(p) {
  const sh = SHAPES[p.shape];
  let body = `${sh.n === 1 ? T('piece.cell1') : T('piece.cells', sh.n)}　${T('piece.ink')} <b class="rk rk-${p.ink}">${nm(INK[p.ink])}</b>`;
  body += `<br><span class="rk-n rk">${rich(tx(INK[p.ink].pure))}</span>`;
  let extra = '';
  if (p.enh) extra = `<b>${nm(ENH[p.enh])}</b>：${rich(dtx(ENH[p.enh]))}`;
  return { title: nm(sh), tag: T('kind.block'), tagCol: '#4a4540', body, extra };
}

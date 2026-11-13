// ---------- game controller: actions, round flow, sheet selection and payout ----------
const Game = {
  _tick: 0, _sealSig: '',
  save() {
    const run = UI.run;
    if (run) {
      const now = nowMs();
      if (this._tick) run.stats.time += Math.min(60, (now - this._tick) / 1000);
      this._tick = now;
    }
    PROFILE.run = run && run.phase !== 'over' ? run : null;
    saveProfile();
  },
  begin(opts) {
    closeAllModals();
    const run = newRun(Object.assign({ pool: unlockedPool() }, opts));
    UI.run = run;
    this._tick = nowMs();
    this.save();
    this.enter();
  },
  resume() {
    if (!PROFILE.run) return false;
    UI.run = PROFILE.run;
    this._tick = nowMs();
    this.enter();
    return true;
  },
  enter() {
    UI.busy = false;
    UI.screen('game');
    Play.cancelDrag(); Play.kb = null; Play.rinseMode = false; Play.target = null; Play.viewBoard = null; Play.strokes.length = 0; Play.hidden.clear(); Play.pops.clear(); Play.flashCells.clear(); Play.trayUid = [];
    FX.clear();
    Hud._patKey = ''; Hud._score = 0;
    this.route();
  },
  route() {
    const run = UI.run;
    this.hideStuck();
    switch (run.phase) {
      case 'pick': this.showPick(); break;
      case 'round': this.showRound(false); break;
      case 'cash': this.showCash(); break;
      case 'shop': Shop.show(); break;
      case 'won': Hud.refresh(); Menu.victory(); break;
      default: Menu.gameOver(); break;
    }
  },
  mood() {
    const run = UI.run, rd = run.round;
    const m = run.phase === 'shop' ? 'shop' : run.phase === 'round' && rd && rd.boss ? 'boss' : 'calm';
    BG.mood(m); Snd.setMusic(m);
  },
  showRound(fresh) {
    const run = UI.run;
    Hud.view(null);
    Hud._patKey = '';
    Hud.refresh();
    Play.layout();
    this.mood();
    if (fresh && run.round.boss) {
      const b = BOSSES[run.round.boss];
      Snd.play('boss');
      FX.flash('#7a160c', 0.25);
      toast({ icon: '帖', title: '《' + nm(b) + '》', text: rich(dtx(b).split('\n')[0]), ms: 4200 });
    }
    this.checkStuck();
    Tutorial.on('round');
  },
  refresh() {
    Hud.refresh();
    Play.inkDirty = true;
  },

  // ---- actions on the sheet
  place(slot, x, y) {
    const run = UI.run;
    if (UI.busy || run.phase !== 'round') return;
    const r = placeBlock(run, slot, x, y);
    if (!r.ok) { Snd.play('bad'); return; }
    Play.inkDirty = true;
    const u = UI.s;
    for (const i of r.cells) {
      Play.flashCells.set(i, Play.t);
      const p = Play.cellVP(i);
      FX.ink(p.x, p.y, INK[r.ink].col, 2, 130 * u, 3.4 * u);
    }
    Snd.play('place', r.cells.length);
    if (r.newLines > 0) {
      Snd.play('line', r.lines.n);
      BG.pulse(0.22);
      const c = UI.center(Hud.el.glyph);
      FX.ring(c.x, c.y, 'rgba(243,217,139,0.9)', c.w * 0.4, c.w * 1.1, 3 * u, 0.4);
    }
    this.sheetEvents(r.ev);
    this.after();
    Tutorial.on('place', r);
  },
  sheetEvents(ev) {
    const u = UI.s;
    for (const e of ev) {
      if (e.t === 'wash') { Snd.play('rinse'); for (const i of e.cells) { const p = Play.cellVP(i); FX.ink(p.x, p.y, '#6fa8d8', 3, 200 * u, 4 * u); } this.say(T('say.wash')); }
      else if (e.t === 'blot') { Snd.play('stone'); const p = Play.cellVP(e.i); FX.ink(p.x, p.y, '#3a3531', 8, 220 * u, 4 * u); FX.shake(3 * u); }
    }
    if (ev.length) Play.inkDirty = true;
  },
  discard(slot) {
    const run = UI.run;
    if (UI.busy || run.phase !== 'round') return;
    if (run.round.discards <= 0) { Snd.play('deny'); this.say(T('say.norinse')); return; }
    const r = discardBlock(run, slot);
    if (!r.ok) { Snd.play('bad'); Play.nope(slot); return; }
    Snd.play('rinse');
    const c = UI.center(Hud.el.rinse);
    FX.ink(c.x, c.y, '#6fa8d8', 14, 260 * UI.s, 4 * UI.s);
    this.after();
    Tutorial.on('discard');
  },
  after() {
    Hud.refresh();
    this.save();
    metaOnState(UI.run);
    showAchievements();
    this.checkStuck();
  },
  async ignite() {
    const run = UI.run;
    if (UI.busy || run.phase !== 'round' || modalOpen()) return;
    const rd = run.round;
    if (rd.ignites <= 0 || !findLines(run).n) { Snd.play('deny'); if (rd.ignites > 0) this.say(T('say.nolines')); return; }
    if (PROFILE.settings.confirmIgnite) {
      const pat = currentPattern(run);
      const ok = await confirmBox(T('ignite'), T('confirm.ignite', pat.id === 'sanbi' ? T('sanbi') : CH[pat.id].g), T('ignite'), T('cancel'));
      if (!ok) return;
    }
    Play.cancelDrag(); Play.kb = null; Play.setGhost(null); Play.setRinse(false);
    this.hideStuck();
    const snapshot = rd.board.slice();
    const inkZero = rd.ink === 0;
    const res = ignite(run);
    if (!res) return;
    UI.busy = true;
    Play.viewBoard = snapshot; Play.inkDirty = true;
    Hud.buttons();
    hidePop(); hideTip();
    // bookkeeping for the profile
    res.inkZero = inkZero && !res.nul;
    const sts = res.ev.filter((e) => e.t === 'stroke').length, pures = res.ev.filter((e) => e.t === 'pure').length;
    res.pureAll = !res.nul && sts >= 2 && pures === sts;
    const seq = rd.chars; let k = 0;
    for (const id of seq) { if (id === ['yi', 'er', 'san'][k]) k++; if (k === 3) break; }
    res.seq123 = k === 3;
    const isNew = metaOnIgnite(run, res);
    this.save();
    await Score.play(res);
    UI.busy = false;
    if (isNew) toast({ iconEl: Gfx.glyphCanvas(res.char, 34, '#1b1918'), title: T('fx.newchar', CH[res.char].g + (LANG === 'en' ? ' · ' + CH[res.char].en : '')), text: escHtml(LANG === 'zh' ? CH[res.char].gz : CH[res.char].ge), ms: 4800, snd: 'newchar' });
    metaOnState(run);
    if (res.won) {
      if (rd.boss) metaOnBoss(run, rd.boss);
      showAchievements();
      Snd.play('win');
      FX.flash('#fff3d0', 0.2);
      this.save();
      await wait(650);
      this.showCash();
    } else if (res.lost) {
      showAchievements();
      this.save();
      await wait(500);
      this.finish();
    } else {
      this.after();
      Tutorial.on('ignite', res);
    }
  },
  checkStuck() {
    const run = UI.run;
    if (run.phase !== 'round' || UI.busy) { this.hideStuck(); return; }
    if (hasMove(run)) { this.hideStuck(); return; }
    if (this._stuck) return;
    const bar = h('div.panel.stuckbar', h('span', { text: T('stuck') }), mkBtn(T('stuck.end'), 'red small', () => this.giveUp()));
    this._stuck = bar;
    Hud.el.center.appendChild(bar);
  },
  hideStuck() { if (this._stuck) { this._stuck.remove(); this._stuck = null; } },
  giveUp() {
    const run = UI.run;
    if (run.phase !== 'round' || UI.busy) return;
    this.hideStuck();
    concede(run);
    this.save();
    if (run.phase === 'cash') { Snd.play('win'); this.showCash(); } else this.finish();
  },
  say(text) {
    const tb = Hud.el.traybox.getBoundingClientRect();
    FX.text(tb.left + tb.width / 2, tb.top - 6 * UI.s, text, '#f3d98b', 24 * UI.s, { life: 1.5, vy: -18, font: FONT_KAI, weight: 700 });
  },
  // the run is over (lost or abandoned)
  finish() {
    const run = UI.run;
    if (run.phase !== 'over') loseRun(run);
    if (!run.recorded) { run.recorded = true; metaOnRunEnd(run, false); }
    PROFILE.run = null;
    saveProfile(true);
    showAchievements();
    Menu.gameOver();
  },
  abandon() {
    const run = UI.run;
    if (!run) return;
    if (!run.recorded) { run.recorded = true; metaOnRunEnd(run, !!run.won); }
    PROFILE.run = null; UI.run = null;
    saveProfile(true);
    Menu.title();
  },

  // ---- selling and using
  sellSeal(uid) {
    const run = UI.run;
    if (UI.busy) return;
    const el = Hud.sealEl(uid), c = el ? UI.center(el) : null;
    const v = sellSeal(run, uid);
    if (v === false) return;
    if (c) { FX.spark(c.x, c.y, '#ffe08a', 14, 240 * UI.s, 2.4 * UI.s); FX.text(c.x, c.y, '+' + v, '#ffe08a', 26 * UI.s); }
    Hud._sealSig = '';
    this.afterMeta();
  },
  sellItem(idx) {
    const run = UI.run;
    if (UI.busy) return;
    const v = sellItem(run, idx);
    if (v === false) return;
    const c = UI.center(Hud.el.itemList);
    FX.text(c.x, c.y, '+' + v, '#ffe08a', 26 * UI.s);
    this.afterMeta();
  },
  afterMeta() {
    const run = UI.run;
    Hud.refresh(); Play.inkDirty = true;
    if (run.phase === 'shop') Shop.render();
    if (run.phase === 'round') { Play.layoutTray(); this.checkStuck(); }
    this.save();
    metaOnState(run);
    showAchievements();
  },
  async useItemFlow(idx) {
    const run = UI.run;
    if (UI.busy) return;
    const it = run.items[idx];
    if (!it) return;
    const def = ITEMS[it.id];
    const u = itemUsable(run, def);
    if (!u.ok) { Snd.play('deny'); this.say(u.why === 'round' ? T('say.roundonly') : T('say.cannot')); return; }
    const target = await Targets.choose(def);
    if (!target) return;
    const before = this.snapshotForItem(def);
    const r = useItem(run, run.items.findIndex((x) => x.uid === it.uid), target);
    if (!r.ok) { Snd.play('deny'); return; }
    this.itemFeedback(def, before);
    this.afterMeta();
  },
  snapshotForItem(def) { const run = UI.run; return { tiers: run.tiers.slice(), money: run.money, seals: run.seals.length, ink: run.round ? run.round.ink : 0 }; },
  itemFeedback(def, before) {
    const run = UI.run;
    Snd.play(def.kind === 'tie' ? 'level' : 'use');
    let text = '';
    for (let t = 1; t <= TIER_MAX; t++) if (run.tiers[t] !== before.tiers[t]) text = `${LANG === 'zh' ? TIER_NAME.zh[t] : TIER_NAME.en[t]}　Lv.${before.tiers[t]} → <b style="color:var(--gold2)">Lv.${run.tiers[t]}</b>`;
    if (run.money !== before.money) text = (run.money > before.money ? '+' : '') + (run.money - before.money) + (LANG === 'zh' ? ' 文' : ' $');
    if (run.seals.length > before.seals) text = nm(SEALS[run.seals[run.seals.length - 1].id]);
    toast({ icon: itemGlyph(def.id), title: T('fx.used', nm(def)), text, ms: 2400 });
    Play.inkDirty = true;
  },

  // ---- choose the next sheet
  showPick() {
    const run = UI.run, V = clear(Hud.el.viewPick);
    Hud.refresh();
    this.mood();
    const fa = FA[((run.ante - 1) % 8) + 1];
    V.appendChild(h('div.vtitle', { text: faName(run.ante) + ' · ' + fa.g }));
    V.appendChild(h('div.vsub', { text: LANG === 'zh' ? fa.lz : fa.en + ' — ' + fa.le }));
    const row = h('div.sheets');
    for (let b = 0; b < 3; b++) {
      const info = blindInfo(run, b);
      const st = b < run.blind ? 'done' : b === run.blind ? 'now' : 'later';
      const card = h('div.panel.sheet', { class: st + (info.boss ? ' boss' : '') });
      const col = h('div.col');
      col.appendChild(h('div.bn', { text: tx(BLIND_NAME[b]) }));
      if (info.boss) {
        const B = BOSSES[info.boss];
        col.appendChild(h('div.bt', { text: LANG === 'zh' ? '《' + B.zh + '》' : B.en }));
        col.appendChild(h('div.au', { text: tx(B.author) }));
        col.appendChild(h('div.fx', { html: rich(dtx(B)) }));
      }
      const mid = h('div.col');
      mid.appendChild(h('div.tl', { text: T('hud.target') }));
      mid.appendChild(h('div.tg', { text: fmtNum(info.target) }));
      mid.appendChild(h('div.rw', { html: info.reward > 0 ? T('pick.reward', coinHtml(info.reward)) : T('pick.noreward') }));
      const acts = h('div.acts');
      if (st === 'now') {
        const go = mkBtn(T('pick.start'), 'red', () => this.startRound());
        go.id = 'btn-start';
        acts.appendChild(go);
        if (b < 2 && !run.tutorial) {
          const tag = TAGS[run.skipTags[b]];
          acts.appendChild(h('div.skip', { html: `${T('pick.skipfor')} <b>${nm(tag)}</b><br>${rich(dtx(tag))}` }));
          acts.appendChild(mkBtn(T('pick.skip'), 'ghost small', () => this.skip()));
        }
      } else if (st === 'done') card.appendChild(h('div.stamp', { text: T('pick.done') }));
      if (UI.orient === 'p') { const left = h('div.col', col, mid); card.append(left, acts); }
      else card.append(col, mid, acts);
      row.appendChild(card);
    }
    V.appendChild(row);
    V.appendChild(h('div.pickinfo', { html: T('pick.info', nm(DECKS[run.deckId]), nm(STAKES[run.stake]), run.deck.length) }));
    Hud.view('viewPick');
    Tutorial.on('pick');
  },
  startRound() {
    const run = UI.run;
    if (!startRound(run)) return;
    this.save();
    Play.trayUid = [];
    this.showRound(true);
  },
  skip() {
    const run = UI.run;
    const before = this.snapshotForItem({});
    const id = skipBlind(run);
    if (!id) return;
    Snd.play('paper');
    toast({ icon: '签', title: T('pick.skipped', nm(TAGS[id])), text: rich(dtx(TAGS[id])), ms: 3000 });
    this.save();
    metaOnState(run);
    showAchievements();
    this.showPick();
  },

  // ---- payout after a cleared sheet
  showCash() {
    const run = UI.run, cash = run.cash, V = clear(Hud.el.viewCash);
    BG.mood('calm');
    Hud.refresh();
    const card = h('div.panel.cashcard');
    card.appendChild(h('div.hd', { text: T('cash.title') }));
    card.appendChild(h('div.sc', { html: T('cash.score', `<b>${fmtNum(cash.score)}</b>`, fmtNum(cash.target)) }));
    const rows = [];
    for (const l of cash.lines) {
      const label = l.k === 'blind' ? T('cash.blind', cash.boss ? '《' + nm(BOSSES[cash.boss]) + '》' : tx(BLIND_NAME[cash.blind]))
        : l.k === 'ignites' ? T('cash.ignites', l.n) : l.k === 'interest' ? T('cash.interest') : l.k === 'double' ? T('cash.double') : nm(SEALS[l.id]);
      const row = h('div.cashline', h('span', { text: label }), h('span.v', { html: coinHtml('+' + l.v) }));
      rows.push(row); card.appendChild(row);
    }
    if (!cash.lines.length) card.appendChild(h('div.cashline.in', h('span.dim', { text: T('cash.none') }), h('span.v', { html: coinHtml(0) })));
    const tot = h('span.v', { html: coinHtml(0) });
    card.appendChild(h('div.cashtotal', h('span', { text: T('cash.total') }), tot));
    const btn = mkBtn(T('cash.collect'), 'gold', () => this.collect());
    btn.id = 'btn-collect';
    btn.style.width = '100%';
    btn.disabled = true;
    card.appendChild(btn);
    V.appendChild(card);
    Hud.view('viewCash');
    let sum = 0;
    (async () => {
      for (let i = 0; i < rows.length; i++) {
        await wait(220 / Score.speed());
        if (!rows[i].isConnected) return;
        rows[i].classList.add('in');
        sum += cash.lines[i].v;
        tot.innerHTML = coinHtml(sum);
        Snd.play('coin');
      }
      await wait(160);
      btn.disabled = false;
    })();
  },
  collect() {
    const run = UI.run;
    if (run.phase !== 'cash') return;
    const c = UI.center(Hud.el.money);
    FX.spark(c.x, c.y, '#ffe08a', 22, 300 * UI.s, 2.6 * UI.s);
    Snd.play('buy');
    collectCash(run);
    Play.viewBoard = null;
    if (run.phase === 'won' && !run.winRecorded) { run.winRecorded = true; metaOnWin(run); }
    metaOnState(run);
    this.save();
    showAchievements();
    this.route();
  },
};

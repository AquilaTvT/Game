// ---------- the studio shop, cases, and choosing targets for items ----------
const Shop = {
  show() {
    Hud.view('viewShop');
    Game.mood();
    Hud.refresh();
    this.render();
    Tutorial.on('shop');
  },
  render() {
    const run = UI.run, sh = run.shop, V = clear(Hud.el.viewShop);
    if (!sh) return;
    const wrap = h('div.shop');
    const rc = rerollCost(run);
    const reroll = mkBtn(`${T('shop.reroll')} <span class="sub">${rc === 0 ? T('shop.free') : coinHtml(rc)}</span>`, 'jade small', () => this.reroll(), { silent: true });
    reroll.id = 'btn-reroll';
    reroll.disabled = run.money < rc;
    const next = mkBtn(T('shop.next'), 'red', () => this.leave());
    next.id = 'btn-next';
    wrap.appendChild(h('div.shophead', h('div.nm', { text: T('shop.title') }), h('div.acts', reroll, next)));
    const sc = h('div.shopscroll.scroll');
    // goods
    const shelf = h('div.panel.shelf', h('div.lab', h('span', { text: T('shop.goods') }), h('span', { text: T('shop.goods.tip') })));
    const row = h('div.goods');
    sh.items.forEach((it, i) => row.appendChild(this.good(it, i)));
    shelf.appendChild(row);
    sc.appendChild(shelf);
    // voucher and cases
    const shelf2 = h('div.panel.shelf', h('div.lab', h('span', { text: T('shop.cases') }), h('span', { text: T('shop.cases.tip') })));
    const row2 = h('div.goods');
    if (sh.voucher) row2.appendChild(this.voucher(sh.voucher));
    sh.packs.forEach((pk, i) => row2.appendChild(this.pack(pk, i)));
    shelf2.appendChild(row2);
    sc.appendChild(shelf2);
    wrap.appendChild(sc);
    V.appendChild(wrap);
    if (run.pack && !this._packModal) this.packModal();
  },
  priceEl(price, gift) {
    const run = UI.run;
    if (price === 0) return h('div.price.free', { text: gift ? T('shop.gift') : T('shop.free') });
    return h('div.price', { class: run.money < price ? 'cant' : '', html: coinHtml(price) });
  },
  good(it, i) {
    const run = UI.run;
    if (it.kind === 'seal') {
      const d = SEALS[it.id];
      const el = h('div.good.gseal', { class: it.sold ? 'sold' : '', data: { i } },
        h('div.body', Gfx.sealEl(it.id, 84, it.ed), h('div.gn', { text: nm(d) }), h('span.rar', { style: { background: RARITY[d.r].col } }), it.ed ? h('span.edtag', { text: nm(EDITIONS[it.ed]), style: { left: 'auto', right: '4px', top: '4px' } }) : null),
        this.priceEl(it.price, it.gift));
      bindCard(el, () => sealCard(it.id, null, run, { ed: it.ed, actions: [{ label: `${T('buy')} ${it.price ? coinHtml(it.price) : ''}`, cls: 'red', silent: true, fn: () => this.buy(i, false) }] }));
      return el;
    }
    const d = ITEMS[it.id];
    const el = h('div.good.slipgood', { class: it.sold ? 'sold' : '', data: { i } }, h('div.body', itemSlip(it.id)), h('div.gn', { text: nm(d) }), this.priceEl(it.price, it.gift));
    bindCard(el, () => {
      const acts = [{ label: `${T('buy')} ${coinHtml(it.price)}`, cls: 'red', fn: () => this.buy(i, false) }];
      if (noTargetUse(d)) acts.push({ label: T('buyuse'), cls: 'gold', fn: () => this.buy(i, true) });
      return itemCard(it.id, run, { actions: acts });
    });
    return el;
  },
  voucher(id) {
    const run = UI.run, d = VOUCHERS[id], price = priceOf(run, d.cost);
    const el = h('div.good', h('div.body', h('div.vouch', h('div.pg', { text: d.zh[0] }), h('div.pn', { text: nm(d) }))), this.priceEl(price));
    bindCard(el, () => ({ title: nm(d), tag: T('kind.voucher'), tagCol: '#8a6316', body: rich(dtx(d)), extra: T('shop.voucher.note'), actions: [{ label: `${T('buy')} ${coinHtml(price)}`, cls: 'red', fn: () => this.buyVoucher() }] }));
    return el;
  },
  packArt(id) {
    const d = PACKS[id];
    const g = { seal: '印', tie: '帖', wen: '房', mo: '墨' }[d.kind];
    return h('div.packart.k-' + d.kind, h('div.pg', { text: g }), h('div.pn', { text: nm(d) }), h('div.pk', { text: T('pack.pick', d.k, d.n) }));
  },
  pack(pk, i) {
    const run = UI.run, d = PACKS[pk.id];
    const el = h('div.good', { class: pk.sold ? 'sold' : '', data: { p: i } }, h('div.body', this.packArt(pk.id)), this.priceEl(pk.price, pk.gift));
    bindCard(el, () => ({ title: nm(d), tag: T('kind.pack'), tagCol: '#5d4a34', body: tx(PACK_DESC[d.kind])(d), actions: [{ label: `${T('shop.open')} ${pk.price ? coinHtml(pk.price) : ''}`, cls: 'red', fn: () => this.open(i) }] }));
    return el;
  },
  why(r) {
    Snd.play('deny');
    const m = { money: 'say.nomoney', room: 'say.noroom', use: 'say.cannot' }[r.why];
    if (m) toast({ icon: '否', title: T(m), ms: 1600 });
  },
  buy(i, useNow) {
    const run = UI.run;
    const el = Hud.el.viewShop.querySelector(`.good[data-i="${i}"]`);
    const c = el ? UI.center(el) : null;
    const it = run.shop.items[i];
    const before = Game.snapshotForItem({});
    const r = shopBuy(run, i, useNow);
    if (!r.ok) { this.why(r); return; }
    Snd.play('buy');
    if (c) FX.spark(c.x, c.y, '#ffe08a', 16, 260 * UI.s, 2.4 * UI.s);
    if (useNow && it.kind !== 'seal') Game.itemFeedback(ITEMS[it.id], before);
    Game.afterMeta();
  },
  buyVoucher() {
    const run = UI.run;
    const r = buyVoucher(run);
    if (!r.ok) { this.why(r); return; }
    Snd.play('buy'); Snd.play('level');
    Game.afterMeta();
  },
  reroll() {
    const run = UI.run;
    if (!shopReroll(run)) { Snd.play('deny'); return; }
    Snd.play('reroll');
    Game.afterMeta();
  },
  open(i) {
    const run = UI.run;
    const r = openPack(run, i);
    if (!r.ok) { this.why(r); return; }
    Snd.play('open');
    Game.afterMeta();
  },
  leave() {
    const run = UI.run;
    if (!leaveShop(run)) return;
    Game.save();
    Game.showPick();
  },

  // ---- an opened case
  packModal() {
    const run = UI.run;
    if (!run.pack) return;
    const def = PACKS[run.pack.id];
    const m = this._packModal = openModal({
      title: nm(def), sub: '', dismiss: false, width: Math.min(UI.W - 30, 190 * run.pack.choices.length + 60),
      body: (root) => { this._packRoot = root; },
      buttons: [{ label: T('pack.skip'), cls: 'ghost', keep: true, fn: () => { closePack(run); this.packDone(); } }],
    });
    this.packRender();
    return m;
  },
  packDone() {
    const m = this._packModal;
    this._packModal = null; this._packRoot = null;
    if (m) m.close();
    Game.afterMeta();
  },
  packRender() {
    const run = UI.run, pk = run.pack, root = this._packRoot;
    if (!pk || !root) { this.packDone(); return; }
    clear(root);
    const sub = this._packModal.el.querySelector('.ms');
    if (sub) sub.textContent = T('pack.left', pk.left);
    const row = h('div.packchoices');
    pk.choices.forEach((ch, j) => {
      const el = h('div.pchoice', { class: ch.taken ? 'taken' : '', style: { animationDelay: j * 70 + 'ms' } });
      const btns = h('div.btns');
      const take = (label, opt, cls) => btns.appendChild(mkBtn(label, 'small ' + (cls || 'red'), () => this.pick(j, opt)));
      if (ch.kind === 'seal') {
        const d = SEALS[ch.id];
        el.append(Gfx.sealEl(ch.id, 88, ch.ed), h('div.pn2', { text: nm(d) }), h('div.pd', { html: rich(sealDesc(ch.id, null, run)) + (ch.ed ? `<br><b>${nm(EDITIONS[ch.ed])}</b> ${rich(dtx(EDITIONS[ch.ed]))}` : '') }));
        el.appendChild(h('span.rar', { style: { background: RARITY[d.r].col, position: 'absolute', left: '8px', top: '8px', width: '12px', height: '12px', borderRadius: '50%' } }));
        take(T('pack.take'));
      } else if (ch.kind === 'tie' || ch.kind === 'wen') {
        const d = ITEMS[ch.id];
        el.append(h('div', { style: { width: '92px', height: '116px' } }, itemSlip(ch.id)), h('div.pn2', { text: nm(d) }), h('div.pd', { html: rich(itemDesc(ch.id, run)) }));
        if (ch.kind === 'tie') take(T('pack.study'));
        else {
          const room = run.items.length < stat(run, 'itemSlots');
          const b1 = mkBtn(T('pack.keep'), 'small red', () => this.pick(j, null));
          b1.disabled = !room;
          btns.appendChild(b1);
          const u = itemUsable(run, d);
          if (u.ok) btns.appendChild(mkBtn(T('use'), 'small gold', () => this.pickUse(j)));
        }
      } else {
        const cv = Gfx.pieceCanvas(ch.shape, ch.ink, ch.enh, 15, PROFILE.settings.marks);
        el.append(h('div.pcv', cv), h('div.pn2', { html: `<span class="rk rk-${ch.ink}">${nm(INK[ch.ink])}</span> · ${nm(SHAPES[ch.shape])}` }), h('div.pd', { html: ch.enh ? `<b>${nm(ENH[ch.enh])}</b>：${rich(dtx(ENH[ch.enh]))}` : `<span class="rk-n rk">${T('piece.cells', SHAPES[ch.shape].n)}</span>` }));
        take(T('pack.keep'));
      }
      el.appendChild(btns);
      row.appendChild(el);
    });
    root.appendChild(row);
  },
  pick(j, opt) {
    const run = UI.run, ch = run.pack.choices[j];
    const before = Game.snapshotForItem({});
    const r = pickPack(run, j, opt);
    if (!r.ok) { this.why(r); return; }
    Snd.play('buy');
    if (ch.kind === 'tie' || (opt && opt.use)) Game.itemFeedback(ITEMS[ch.id], before);
    Hud.refresh();
    Game.save(); metaOnState(run); showAchievements();
    if (run.pack) this.packRender(); else this.packDone();
  },
  async pickUse(j) {
    const run = UI.run, ch = run.pack.choices[j], def = ITEMS[ch.id];
    const target = await Targets.choose(def);
    if (!target) return;
    this.pick(j, { use: true, target });
  },
};

// ---- choosing what an item acts on
const Targets = {
  choose(def) {
    if (!def.need) return Promise.resolve({});
    if (def.need.t === 'pieces') return this.pieces(def);
    return this.square(def);
  },
  pieces(def) {
    const run = UI.run, nd = def.need, min = nd.min || 1;
    return new Promise((res) => {
      const sel = new Set();
      let done = false, okBtn = null, grid = null;
      const order = { mo: 0, zhu: 1, qing: 2, jin: 3 };
      const list = run.deck.slice().sort((a, b) => order[a.ink] - order[b.ink] || SHAPES[a.shape].n - SHAPES[b.shape].n || a.shape.localeCompare(b.shape));
      const upd = () => {
        okBtn.disabled = sel.size < min;
        okBtn.innerHTML = `${T('ok')} <span class="sub">${sel.size}/${nd.max}</span>`;
        grid.querySelectorAll('.pc').forEach((e) => e.classList.toggle('sel', sel.has(+e.dataset.uid)));
      };
      const m = openModal({
        title: nm(def), sub: T('target.pieces', nd.max), width: Math.min(UI.W - 30, 860),
        body: (root) => {
          root.appendChild(h('div', { html: rich(itemDesc(def.id, run)), style: { marginBottom: '10px', fontSize: '18px', color: '#e8dcc6' } }));
          grid = h('div.deckgrid');
          for (const p of list) {
            const el = h('div.pc', { data: { uid: p.uid } }, Gfx.pieceCanvas(p.shape, p.ink, p.enh, UI.orient === 'p' ? 19 : 15, PROFILE.settings.marks));
            if (p.enh) el.appendChild(h('span.tg', { text: ENH[p.enh].g }));
            el.addEventListener('click', () => {
              if (sel.has(p.uid)) sel.delete(p.uid);
              else { if (nd.max === 1) sel.clear(); if (sel.size >= nd.max) { Snd.play('bad'); return; } sel.add(p.uid); }
              Snd.play('tick'); upd();
            });
            bindCard(el, () => pieceCard(p), { noClick: true });
            grid.appendChild(el);
          }
          root.appendChild(grid);
        },
        buttons: [{ label: T('cancel'), cls: 'ghost' }, { label: T('ok'), cls: 'gold', id: 'btn-target-ok', fn: () => { done = true; res({ pieces: [...sel] }); } }],
        onClose: () => { if (!done) res(null); },
      });
      okBtn = m.foot.querySelector('#btn-target-ok');
      upd();
    });
  },
  square(def) {
    const run = UI.run, nd = def.need, rd = run.round, inRound = run.phase === 'round' && rd;
    const ok = (i) => {
      if (inRound && rd.holes[i]) return false;
      if (nd.t === 'cell') return nd.empty ? !rd.board[i] : true;
      return true;
    };
    if (inRound && Play.active && !modalOpen()) {
      // pick straight on the sheet
      return new Promise((res) => {
        const bar = h('div.panel.stuckbar', { style: { borderColor: 'rgba(120,220,170,0.7)' } }, h('span', { text: T('target.square', nm(def)), style: { color: '#b6ecd4' } }),
          mkBtn(T('cancel'), 'ghost small', () => finish(null)));
        const finish = (v) => { Play.target = null; bar.remove(); res(v == null ? null : { square: v }); };
        Hud.el.center.appendChild(bar);
        Play.target = { ok, pick: (i) => { Snd.play('click'); finish(i); } };
      });
    }
    return new Promise((res) => {
      let done = false;
      openModal({
        title: nm(def), sub: T('target.square.sub'), width: Math.min(UI.W - 30, 620),
        body: (root, close) => {
          root.appendChild(h('div', { html: rich(itemDesc(def.id, run)), style: { marginBottom: '12px', fontSize: '18px', color: '#e8dcc6', textAlign: 'center' } }));
          const cell = Math.floor(Math.min(56, (Math.min(UI.W - 90, 560)) / run.w - 4));
          const grid = h('div.paperpick', { style: { gridTemplateColumns: `repeat(${run.w}, ${cell}px)`, width: 'max-content' } });
          for (let i = 0; i < run.w * run.h; i++) {
            const sq = run.paper[i];
            const b = h('button', { type: 'button', style: { width: cell + 'px', height: cell + 'px' }, text: sq ? SQ[sq].g : '' });
            if (sq) { b.classList.add('has'); b.style.setProperty('--sq', SQ[sq].col); }
            if (inRound && rd.board[i]) { b.classList.add('ink'); b.classList.add(rd.board[i].stone ? 'stone' : rd.board[i].ink); }
            if (!ok(i)) b.disabled = true;
            b.addEventListener('click', () => { Snd.play('click'); done = true; res({ square: i }); close(); });
            grid.appendChild(b);
          }
          root.appendChild(grid);
        },
        buttons: [{ label: T('cancel'), cls: 'ghost' }],
        onClose: () => { if (!done) res(null); },
      });
    });
  },
};

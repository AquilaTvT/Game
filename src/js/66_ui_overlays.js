// ---------- overlays: Ink Box, lexicon, run record, collection, settings, help ----------
function recipeText(id) {
  const def = CH[id], zh = LANG === 'zh';
  if (id === 'xuan') return T('recipe.full');
  if (id === 'sanbi') return T('recipe.san');
  const tot = (s) => s[0] + s[1] + s[2];
  const one = (s, row) => {
    const out = [];
    if (row) {
      if (s[0]) out.push(zh ? '顶横' : 'the top row');
      if (s[1]) out.push(zh ? `中间${s[1] > 1 ? s[1] + '条' : '一条'}横` : `${s[1]} inner row${s[1] > 1 ? 's' : ''}`);
      if (s[2]) out.push(zh ? '底横' : 'the bottom row');
    } else {
      if (s[0]) out.push(zh ? '左竖' : 'the left column');
      if (s[1]) out.push(zh ? `中间${s[1] > 1 ? s[1] + '条' : '一条'}竖` : `${s[1]} inner column${s[1] > 1 ? 's' : ''}`);
      if (s[2]) out.push(zh ? '右竖' : 'the right column');
    }
    return out.join(zh ? '、' : ', ');
  };
  const part = (specs, row) => {
    if (!specs.length) return '';
    const n = tot(specs[0]);
    if (!n) return '';
    if (specs.length === anyLines(n).length) return zh ? `任意${n}条${row ? '横' : '竖'}` : `any ${n} ${row ? 'row' : 'column'}${n > 1 ? 's' : ''}`;
    return specs.map((sp) => one(sp, row)).join(zh ? ' 或 ' : ' or ');
  };
  const parts = [part(def.rowSpecs, true), part(def.colSpecs, false)];
  if (def.d === 1) parts.push(zh ? '捺（左上至右下的对角线）' : 'the ↘ diagonal');
  if (def.d === 2) parts.push(zh ? '撇（右上至左下的对角线）' : 'the ↙ diagonal');
  if (def.d === 3) parts.push(zh ? '两条对角线' : 'both diagonals');
  return parts.filter(Boolean).join(zh ? ' ＋ ' : '  +  ');
}
const charKnown = (id) => !!PROFILE.meta.chars[id];

const Overlays = {
  // ---- the Ink Box
  deck() {
    const run = UI.run;
    if (!run) return;
    const rd = run.phase === 'round' ? run.round : null;
    const inDraw = rd ? new Set(rd.draw) : null, inTray = rd ? new Set(rd.tray.filter(Boolean).map((t) => t.uid)) : null;
    const cells = sum(run.deck, (p) => SHAPES[p.shape].n);
    openModal({
      title: T('deck.title'), sub: T('deck.sub', run.deck.length, cells) + (rd ? ' · ' + T('deck.left', rd.draw.length) : ''), width: Math.min(UI.W - 30, 900),
      body: (root) => {
        const order = { mo: 0, zhu: 1, qing: 2, jin: 3 };
        const row = h('div.inkrow');
        for (const ink of INKS) {
          const n = run.deck.filter((p) => p.ink === ink).length;
          row.appendChild(h('span', { html: `<i class="inkdot" style="background:${INK[ink].col}"></i>${nm(INK[ink])} <b>${n}</b> · ${plain(tx(INK[ink].pure))}` }));
        }
        root.appendChild(row);
        const grid = h('div.deckgrid');
        const list = run.deck.slice().sort((a, b) => order[a.ink] - order[b.ink] || SHAPES[a.shape].n - SHAPES[b.shape].n || a.shape.localeCompare(b.shape));
        for (const p of list) {
          const el = h('div.pc', Gfx.pieceCanvas(p.shape, p.ink, p.enh, 15, PROFILE.settings.marks));
          if (p.enh) el.appendChild(h('span.tg', { text: ENH[p.enh].g }));
          if (rd && !inDraw.has(p.uid) && !inTray.has(p.uid)) el.classList.add('gone');
          if (rd && inTray.has(p.uid)) el.appendChild(h('span.cnt', { text: T('deck.intray') }));
          bindCard(el, () => pieceCard(p));
          grid.appendChild(el);
        }
        root.appendChild(grid);
        if (rd) root.appendChild(h('div.dim', { text: T('deck.note'), style: { marginTop: '12px', fontSize: '16px' } }));
      },
    });
  },

  // ---- lexicon
  dictBody(root, run) {
    const w = run ? run.w : 8, hh = run ? run.h : 8;
    const groups = {};
    for (const id of CH_ORDER) {
      if (id === 'sanbi') continue;
      const def = CH[id];
      const key = def.d ? 'd' : id === 'xuan' ? 'x' : String(Math.min(def.n, 7));
      (groups[key] || (groups[key] = [])).push(id);
    }
    const sec = (title, sub, ids) => {
      root.appendChild(h('div.dsec', title, h('small', { text: sub || '' })));
      const grid = h('div.dictgrid');
      for (const id of ids) {
        const def = CH[id], known = charKnown(id), hidden = def.secret && !known;
        const cv = hidden ? Gfx.glyphCanvas('sanbi', 78, '#6b5a44') : Gfx.glyphCanvas(id, 78, known ? '#1b1918' : '#6b5a44', { lay: charLayout(id, w, hh), w, h: hh });
        const el = h('div.dch', { class: (known ? '' : 'unk ') + (hidden ? 'secret' : '') }, cv,
          h('div.dn', { text: hidden ? '？' : def.g }), h('div.dx', { text: hidden ? '' : fmtX(def.x) }),
          h('div.dc', { text: known ? T('dict.count', PROFILE.meta.chars[id]) : hidden ? T('dict.secret') : T('dict.unwritten') }));
        if (!hidden) el.addEventListener('click', () => { Snd.play('click'); this.charDetail(id, run); });
        grid.appendChild(el);
      }
      root.appendChild(grid);
    };
    root.appendChild(h('div', { html: T('dict.intro'), style: { fontSize: '18px', color: '#e8dcc6', lineHeight: '1.5', marginBottom: '6px' } }));
    for (let n = 1; n <= 7; n++) {
      const ids = groups[String(n)];
      if (!ids) continue;
      const lvl = run ? run.tiers[n] : 1, b = tierBase(n, lvl);
      sec(LANG === 'zh' ? TIER_NAME.zh[n] : TIER_NAME.en[n], `Lv.${lvl} · ${T('form')} ${b.c} × ${T('spirit')} ${b.m}`, ids);
    }
    sec(T('dict.full'), '', groups.x);
    sec(T('dict.diag'), T('dict.diag.sub'), groups.d);
    root.appendChild(h('div.dsec', T('sanbi')));
    root.appendChild(h('div', { html: T('sanbi.desc'), style: { fontSize: '18px', color: '#e8dcc6' } }));
  },
  dictionary() {
    const run = UI.run;
    const known = ALL_CHARS.filter(charKnown).length;
    openModal({ title: T('dict.title'), sub: T('dict.sub', known, ALL_CHARS.length), width: Math.min(UI.W - 30, 940), body: (root) => this.dictBody(root, run) });
  },
  charDetail(id, run) {
    const def = CH[id], w = run ? run.w : 8, hh = run ? run.h : 8;
    const tier = tierOf(def.n), lvl = run ? run.tiers[tier] : 1, b = tierBase(tier, lvl);
    openModal({
      title: T('dict.title'), width: Math.min(UI.W - 30, 700),
      body: (root) => {
        const cv = Gfx.glyphCanvas(id, 150, '#1b1918', { lay: charLayout(id, w, hh), w, h: hh, k: 2 });
        const right = h('div', { style: { flex: '1', minWidth: '0' } });
        right.appendChild(h('div', h('span.big', { text: def.g }), h('span.py', { text: def.py + (LANG === 'en' ? ' · ' + def.en : '') })));
        right.appendChild(h('div.gl', { text: LANG === 'zh' ? def.gz : def.ge }));
        right.appendChild(h('div.ln', { html: `<b style="color:var(--gold2)">${T('dict.recipe')}</b>　${escHtml(recipeText(id))}` }));
        right.appendChild(h('div.ln', { html: `<b style="color:var(--gold2)">${T('dict.base')}</b>　${id === 'xuan' ? T('dict.xuan.base') : T('hud.tier', def.n, lvl) + '：'}<span class="rk rk-c">${T('form')} ${b.c}</span> × <span class="rk rk-m">${T('spirit')} ${b.m}</span>` }));
        right.appendChild(h('div.ln', { html: `<b style="color:var(--gold2)">${T('char.x')}</b>　<span class="rk rk-x">${fmtX(def.x)}</span>` + (def.x === 1 ? ` <span class="dim">${T('dict.plain')}</span>` : '') }));
        if (def.yi) right.appendChild(h('div.ln', { html: `<b style="color:var(--gold2)">${T('hud.yi')}</b>　${rich(dtx(YI[def.yi]))} <span class="dim">${T('char.yi.once')}</span>` }));
        if (def.num) right.appendChild(h('div.ln', { html: `<span class="dim">${T('char.num', def.num)}</span>` }));
        right.appendChild(h('div.ln', { html: `<span class="dim">${charKnown(id) ? T('dict.count', PROFILE.meta.chars[id]) : T('dict.unwritten')}</span>` }));
        root.appendChild(h('div.chardetail', cv, right));
      },
    });
  },

  // ---- the run so far
  runInfo() {
    const run = UI.run;
    if (!run) return;
    let tab = 'tiers';
    const m = openModal({
      title: T('run.title'), width: Math.min(UI.W - 30, 760),
      body: (root) => {
        const tabs = h('div.tabs', { style: { padding: '0 0 10px' } });
        const pane = h('div');
        const show = () => {
          clear(pane);
          tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.k === tab));
          if (tab === 'tiers') {
            const tb = h('table.tiertab');
            tb.appendChild(h('tr', h('th', { text: T('run.tier') }), h('th', { text: T('run.level') }), h('th', { text: T('form') }), h('th', { text: T('spirit') }), h('th', { text: T('run.written') })));
            for (let t = 1; t <= TIER_MAX; t++) {
              const b = tierBase(t, run.tiers[t]);
              tb.appendChild(h('tr', h('td', { text: LANG === 'zh' ? TIER_NAME.zh[t] : TIER_NAME.en[t] }), h('td.lv', { text: 'Lv.' + run.tiers[t] }), h('td.cf', { text: b.c }), h('td.cs', { text: b.m }), h('td', { text: run.tierCounts[t] })));
            }
            pane.appendChild(tb);
            pane.appendChild(h('div.dim', { html: T('run.tier.note'), style: { marginTop: '12px', fontSize: '17px', lineHeight: '1.5' } }));
            const ink = h('div', { style: { marginTop: '14px', fontSize: '18px', lineHeight: '1.7' } });
            for (const k of INKS) ink.appendChild(h('div', { html: `<i class="inkdot" style="background:${INK[k].col}"></i>` + rich(tx(INK[k].pure)) }));
            pane.appendChild(ink);
          } else if (tab === 'run') {
            const dl = h('dl.kv');
            const add = (k, v) => { dl.appendChild(h('dt', { text: k })); dl.appendChild(h('dd', { html: v })); };
            add(T('run.deck'), `<span class="kai">${nm(DECKS[run.deckId])}</span>`);
            add(T('run.stake'), `<span class="kai">${nm(STAKES[run.stake])}</span>`);
            add(T('hud.seed'), run.daily ? T('daily.short') + ' ' + run.daily : run.seed);
            add(T('run.ante'), `${run.ante} / 8` + (run.endless ? ' · ' + T('run.endless') : ''));
            add(T('run.best'), fmtNum(run.stats.best) + (run.stats.bestChar ? ` <span class="kai">（${run.stats.bestChar === 'sanbi' ? T('sanbi') : CH[run.stats.bestChar].g}）</span>` : ''));
            add(T('run.ignites'), String(run.stats.ignites));
            add(T('run.placed'), String(run.stats.placed));
            add(T('run.earned'), coinHtml(run.stats.earned));
            const chars = Object.keys(run.charCounts).sort((a, b) => run.charCounts[b] - run.charCounts[a]);
            add(T('run.chars'), chars.length ? chars.map((id) => `<span class="kai" style="font-size:22px">${id === 'sanbi' ? T('sanbi') : CH[id].g}</span><span class="dim" style="font-weight:400">×${run.charCounts[id]}</span>`).join('　') : '—');
            const vs = Object.keys(run.vouchers);
            add(T('run.vouchers'), vs.length ? vs.map((id) => `<span class="kai">${nm(VOUCHERS[id])}</span>`).join('、') : '—');
            pane.appendChild(dl);
            if (vs.length) { const box = h('div', { style: { marginTop: '10px', fontSize: '16.5px', color: '#e8dcc6', lineHeight: '1.6' } }); for (const id of vs) box.appendChild(h('div', { html: `<b class="kai">${nm(VOUCHERS[id])}</b>　${rich(dtx(VOUCHERS[id]))}` })); pane.appendChild(box); }
          } else {
            const cell = Math.floor(Math.min(52, (Math.min(UI.W - 90, 560)) / run.w - 4));
            const grid = h('div.paperpick', { style: { gridTemplateColumns: `repeat(${run.w}, ${cell}px)`, width: 'max-content' } });
            let n = 0;
            for (let i = 0; i < run.w * run.h; i++) {
              const sq = run.paper[i];
              const b = h('button', { type: 'button', style: { width: cell + 'px', height: cell + 'px', cursor: 'default' }, text: sq ? SQ[sq].g : '' });
              if (sq) { n++; b.classList.add('has'); b.style.setProperty('--sq', SQ[sq].col); bindCard(b, () => ({ title: nm(SQ[sq]), tag: T('kind.square'), body: rich(dtx(SQ[sq])) })); }
              grid.appendChild(b);
            }
            pane.appendChild(grid);
            pane.appendChild(h('div.dim', { html: n ? T('run.paper.note') : T('run.paper.none'), style: { marginTop: '12px', fontSize: '17px', textAlign: 'center', lineHeight: '1.5' } }));
          }
        };
        for (const [k, label] of [['tiers', T('run.tab.tiers')], ['run', T('run.tab.run')], ['paper', T('run.tab.paper')]]) {
          tabs.appendChild(h('button.tab', { type: 'button', text: label, data: { k }, on: { click: () => { Snd.play('tick'); tab = k; show(); } } }));
        }
        root.append(tabs, pane);
        show();
      },
    });
    return m;
  },
  sheetInfo() {
    const run = UI.run;
    if (!run) return;
    const rd = run.round, b = rd ? rd.blind : run.blind, bossId = rd ? rd.boss : (b === 2 ? run.boss : null);
    const info = blindInfo(run, b);
    const fa = FA[((run.ante - 1) % 8) + 1];
    openModal({
      title: bossId ? (LANG === 'zh' ? '《' + BOSSES[bossId].zh + '》' : BOSSES[bossId].en) : tx(BLIND_NAME[b]), width: Math.min(UI.W - 30, 620),
      body: (root) => {
        if (bossId) {
          const B = BOSSES[bossId];
          root.appendChild(h('div.dim', { text: tx(B.author), style: { marginBottom: '8px' } }));
          root.appendChild(h('div', { html: rich(dtx(B)), style: { fontSize: '21px', lineHeight: '1.55' } }));
        } else root.appendChild(h('div', { html: T('sheet.plain'), style: { fontSize: '20px', lineHeight: '1.55' } }));
        root.appendChild(h('div', { style: { marginTop: '14px', fontSize: '19px', lineHeight: '1.7' }, html: `${T('hud.target')}　<b class="num" style="color:var(--gold2);font-size:26px">${fmtNum(rd ? rd.target : info.target)}</b><br>${info.reward > 0 ? T('pick.reward', coinHtml(info.reward)) : T('pick.noreward')}` }));
        root.appendChild(h('div', { style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)', fontFamily: 'var(--f-kai)', fontSize: '19px', color: '#d9cdb6', lineHeight: '1.6' }, html: `<b style="color:var(--gold2)">${faName(run.ante)} · ${fa.g}</b>　${escHtml(LANG === 'zh' ? fa.lz : fa.en + ' — ' + fa.le)}` }));
      },
    });
  },

  // ---- pause
  pause() {
    const run = UI.run;
    const m = openModal({
      title: T('pause.title'), width: 440,
      body: (root, close) => {
        const col = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
        const add = (label, cls, fn) => { const b = mkBtn(label, cls, fn); b.style.width = '100%'; col.appendChild(b); };
        add(T('pause.resume'), 'gold', () => close());
        add(T('menu.settings'), '', () => this.settings());
        add(T('menu.help'), '', () => this.help());
        add(T('menu.collection'), '', () => this.collection());
        add(T('pause.title2'), '', () => { close(); Game.save(); saveProfile(true); Menu.title(); });
        if (run) add(T('pause.abandon'), 'ghost', async () => { if (await confirmBox(T('pause.abandon'), T('pause.abandon.q'), T('pause.abandon.y'), T('cancel'), true)) { closeAllModals(); Game.abandon(); } });
        root.appendChild(col);
        if (run) root.appendChild(h('div.dim', { text: T('pause.saved'), style: { marginTop: '12px', fontSize: '15.5px', textAlign: 'center' } }));
      },
    });
    return m;
  },

  // ---- settings
  settings() {
    const S = PROFILE.settings;
    openModal({
      title: T('menu.settings'), width: Math.min(UI.W - 30, 640),
      body: (root, close) => {
        const row = (label, sub, ctl) => root.appendChild(h('div.setrow', h('div.sl', label, sub ? h('small', { text: sub }) : null), ctl));
        const seg = (opts, cur, fn) => {
          const el = h('div.seg');
          for (const [v, label] of opts) el.appendChild(h('button', { type: 'button', class: v === cur ? 'on' : '', text: label, on: { click: () => { Snd.play('tick'); el.querySelectorAll('button').forEach((b) => b.classList.remove('on')); el.children[opts.findIndex((o) => o[0] === v)].classList.add('on'); fn(v); saveProfile(); } } }));
          return el;
        };
        const slider = (cur, fn) => {
          const el = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(cur * 100) });
          const paint = () => el.style.setProperty('--p', el.value + '%');
          paint();
          el.addEventListener('input', () => { paint(); fn(el.value / 100); Snd.applyVolumes(); });
          el.addEventListener('change', () => { saveProfile(); Snd.play('chips', 3); });
          return el;
        };
        const onoff = (cur, fn) => seg([[true, T('on')], [false, T('off')]], !!cur, fn);
        row(T('set.lang'), null, seg([['zh', '中文'], ['en', 'English']], S.lang, (v) => { S.lang = v; LANG = v; saveProfile(true); close(); App.relang(); }));
        row(T('set.music'), null, slider(S.music, (v) => { S.music = v; }));
        row(T('set.sfx'), null, slider(S.sfx, (v) => { S.sfx = v; }));
        row(T('set.speed'), T('set.speed.d'), seg([[1, '1×'], [2, '2×'], [4, '4×']], S.speed, (v) => { S.speed = v; }));
        row(T('set.hints'), T('set.hints.d'), onoff(S.hints, (v) => { S.hints = v; Hud._patKey = ''; if (UI.run) Hud.pattern(); }));
        row(T('set.marks'), T('set.marks.d'), onoff(S.marks, (v) => { S.marks = v; Play.inkDirty = true; }));
        row(T('set.shake'), null, onoff(S.shake, (v) => { S.shake = v; }));
        row(T('set.reduce'), T('set.reduce.d'), onoff(S.reduce, (v) => { S.reduce = v; }));
        row(T('set.confirm'), T('set.confirm.d'), onoff(S.confirmIgnite, (v) => { S.confirmIgnite = v; }));
        if (document.fullscreenEnabled || document.webkitFullscreenEnabled) row(T('set.full'), null, mkBtn(T('set.full.b'), 'small', () => App.fullscreen()));
        row(T('set.data'), Store.ok ? T('set.data.d') : T('set.data.bad'), h('div', { style: { display: 'flex', gap: '8px' } }, mkBtn(T('set.export'), 'small', () => this.exportSave()), mkBtn(T('set.import'), 'small', () => this.importSave())));
        row(T('set.reset'), T('set.reset.d'), mkBtn(T('set.reset.b'), 'small ghost', async () => {
          if (await confirmBox(T('set.reset'), T('set.reset.q'), T('set.reset.y'), T('cancel'), true)) { const keep = PROFILE.settings; PROFILE = freshProfile(); PROFILE.settings = keep; UI.run = null; saveProfile(true); closeAllModals(); Menu.title(); }
        }));
      },
    });
  },
  exportSave() {
    const code = exportProfile();
    openModal({
      title: T('set.export'), width: Math.min(UI.W - 30, 620),
      body: (root) => {
        root.appendChild(h('div', { text: T('set.export.d'), style: { fontSize: '18px', marginBottom: '10px', color: '#e8dcc6' } }));
        const ta = h('textarea.code', { readonly: true });
        ta.value = code;
        root.appendChild(ta);
        setTimeout(() => { ta.focus(); ta.select(); }, 50);
      },
      buttons: [{ label: T('set.copy'), cls: 'gold', keep: true, fn: () => {
        const done = () => toast({ icon: '存', title: T('set.copied'), ms: 1800 });
        const ta = document.querySelector('textarea.code');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => { ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* manual copy */ } });
        else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* manual copy */ } }
      } }, { label: T('close'), cls: 'ghost' }],
    });
  },
  importSave() {
    let ta = null;
    openModal({
      title: T('set.import'), width: Math.min(UI.W - 30, 620),
      body: (root) => {
        root.appendChild(h('div', { text: T('set.import.d'), style: { fontSize: '18px', marginBottom: '10px', color: '#e8dcc6' } }));
        ta = h('textarea.code', { placeholder: 'FKZ1:…' });
        root.appendChild(ta);
      },
      buttons: [{ label: T('cancel'), cls: 'ghost' }, { label: T('set.import'), cls: 'gold', keep: true, fn: () => {
        if (importProfile(ta.value)) { UI.run = null; closeAllModals(); App.relang(); toast({ icon: '存', title: T('set.imported'), ms: 2200, snd: 'level' }); }
        else { Snd.play('deny'); toast({ icon: '否', title: T('set.import.bad'), ms: 2200 }); }
      } }],
    });
  },

  // ---- how to play
  help() {
    openModal({
      title: T('menu.help'), width: Math.min(UI.W - 30, 820),
      body: (root) => {
        const box = h('div.help');
        const g = (id) => { const d = h('div'); d.appendChild(Gfx.glyphCanvas(id, 70, '#1b1918')); d.appendChild(document.createTextNode(CH[id].g + ' ' + fmtX(CH[id].x))); return d; };
        const html = (s) => { const d = h('div'); d.innerHTML = s; return d; };
        box.appendChild(html(T('help.1')));
        box.appendChild(h('div.ex', g('yi'), g('gun'), g('er'), g('shi'), g('gong'), g('wang'), g('jing'), g('kou'), g('tian')));
        box.appendChild(html(T('help.2')));
        root.appendChild(box);
      },
    });
  },

  // ---- collection
  collection() {
    let tab = 'seals';
    const M = PROFILE.meta;
    openModal({
      title: T('menu.collection'), width: Math.min(UI.W - 30, 980),
      body: (root) => {
        const tabs = h('div.tabs', { style: { padding: '0 0 10px' } });
        const pane = h('div');
        const show = () => {
          clear(pane);
          tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.k === tab));
          if (tab === 'seals') {
            const seen = SEAL_ORDER.filter((id) => M.seals[id]).length;
            pane.appendChild(h('div.dim', { text: T('col.seals', seen, SEAL_ORDER.length), style: { marginBottom: '10px', fontSize: '17px' } }));
            for (let r = 1; r <= 4; r++) {
              pane.appendChild(h('div.dsec', { style: { color: RARITY[r].col } }, nm(RARITY[r])));
              const grid = h('div.sealgrid');
              for (const id of SEAL_ORDER.filter((x) => SEALS[x].r === r)) {
                const locked = !sealUnlocked(id), got = !!M.seals[id];
                const el = h('div.sg', { class: locked ? 'locked' : got ? '' : 'unseen' }, Gfx.sealEl(id, 72, null), h('div.n', { text: locked ? T('col.locked') : got ? nm(SEALS[id]) : '？？？' }));
                bindCard(el, () => (locked ? { title: T('col.locked'), body: T('seal.locked', dtx(ACH[SEAL_LOCK[id]])) } : got ? sealCard(id, null, null) : { title: '？？？', body: T('col.unseen') }));
                grid.appendChild(el);
              }
              pane.appendChild(grid);
            }
          } else if (tab === 'chars') this.dictBody(pane, null);
          else if (tab === 'bosses') {
            const grid = h('div.bosslist');
            for (const id of BOSS_ORDER) {
              const B = BOSSES[id], n = M.bosses[id] || 0;
              grid.appendChild(h('div.bl', { class: n ? '' : 'unk' }, h('div.bn', h('span', { text: LANG === 'zh' ? '《' + B.zh + '》' : B.en }), h('small', { text: n ? T('col.beaten', n) : '' })), h('div.ba', { text: tx(B.author) }), h('div.bd', { html: rich(dtx(B)) })));
            }
            pane.appendChild(grid);
          } else if (tab === 'ach') {
            const got = ACH_ORDER.filter(achHas).length;
            pane.appendChild(h('div.dim', { text: T('col.ach', got, ACH_ORDER.length), style: { marginBottom: '10px', fontSize: '17px' } }));
            const grid = h('div.achlist');
            for (const id of ACH_ORDER) {
              const a = ACH[id], ok = achHas(id);
              const lockOf = Object.keys(SEAL_LOCK).filter((s) => SEAL_LOCK[s] === id);
              grid.appendChild(h('div.ach', { class: ok ? 'got' : '' }, h('div.ic', { text: ok ? '成' : '·' }), h('div', h('div.an', { text: nm(a) }), h('div.ad', { html: escHtml(dtx(a)) + (lockOf.length ? `<br><span style="color:var(--gold)">${T('col.unlocks', lockOf.map((s) => nm(SEALS[s])).join(LANG === 'zh' ? '、' : ', '))}</span>` : '') }))));
            }
            pane.appendChild(grid);
          } else {
            const dl = h('dl.kv');
            const add = (k, v) => { dl.appendChild(h('dt', { text: k })); dl.appendChild(h('dd', { html: v })); };
            add(T('stat.runs'), String(M.runs));
            add(T('stat.wins'), String(M.wins));
            add(T('stat.bestAnte'), M.bestAnte ? T('hud.fa', T('num.' + Math.min(8, M.bestAnte))) : '—');
            if (M.endlessAnte > 8) add(T('stat.endless'), String(M.endlessAnte));
            add(T('stat.bestScore'), fmtNum(M.bestScore) + (M.bestScoreChar ? ` <span class="kai">（${M.bestScoreChar === 'sanbi' ? T('sanbi') : CH[M.bestScoreChar].g}）</span>` : ''));
            add(T('stat.ignites'), String(M.ignites));
            add(T('stat.placed'), String(M.placed));
            add(T('stat.cells'), fmtNum(M.cells));
            add(T('stat.clean'), String(M.clean));
            add(T('stat.time'), T('stat.time.v', Math.floor(M.time / 3600), Math.floor((M.time % 3600) / 60)));
            pane.appendChild(dl);
            const decks = DECK_ORDER.filter((id) => M.decks[id] && M.decks[id].wins);
            if (decks.length) {
              pane.appendChild(h('div.dsec', T('stat.decks')));
              pane.appendChild(h('div', { style: { fontSize: '18.5px', lineHeight: '1.8' }, html: decks.map((id) => `<span class="kai" style="font-size:22px">${nm(DECKS[id])}</span>　${T('stat.deck.v', M.decks[id].wins, nm(STAKES[M.decks[id].best || 0]))}`).join('<br>') }));
            }
            if (M.history.length) {
              pane.appendChild(h('div.dsec', T('stat.history')));
              const list = h('div', { style: { fontSize: '17px', lineHeight: '1.75' } });
              for (const r of M.history.slice(0, 12)) {
                const d = new Date(r.t);
                list.appendChild(h('div', { html: `<span class="dim num">${d.getMonth() + 1}/${d.getDate()}</span>　<span class="kai">${nm(DECKS[r.deck] || DECKS.kai)} · ${nm(STAKES[r.stake] || STAKES[0])}</span>　${r.won ? `<b style="color:var(--gold2)">${T('stat.won')}</b>` : T('stat.lostat', r.ante)}　<span class="dim">${T('stat.bestScore')} ${fmtNum(r.best || 0)}</span>` }));
              }
              pane.appendChild(list);
            }
          }
        };
        for (const [k, label] of [['seals', T('col.tab.seals')], ['chars', T('col.tab.chars')], ['bosses', T('col.tab.bosses')], ['ach', T('col.tab.ach')], ['stats', T('col.tab.stats')]]) {
          tabs.appendChild(h('button.tab', { type: 'button', text: label, data: { k }, on: { click: () => { Snd.play('tick'); tab = k; show(); } } }));
        }
        root.append(tabs, pane);
        show();
      },
    });
  },
};

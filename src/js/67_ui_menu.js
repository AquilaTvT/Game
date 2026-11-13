// ---------- title screen, starting a run, and the two ways a run ends ----------
const LOGO = {
  fang: ['......#......', '......#......', '#############', '....#........', '....#........', '....########.', '....#......#.', '...#.......#.', '...#.......#.', '..#........#.', '..#........#.', '.#......#..#.', '#........###.'],
  kuai: ['..#.....#....', '..#.....#....', '..#..#######.', '#####...#..#.', '..#.....#..#.', '..#.....#..#.', '..#.#########', '..#.....#....', '..#....#.#...', '..#....#.#...', '..##..#...#..', '###..#.....#.', '....#.......#'],
  zi:   ['......#......', '......#......', '#############', '#...........#', '#..#######..#', '.........#...', '.......##....', '......#......', '#############', '......#......', '......#......', '......#......', '....###......'],
};
const QUOTES = [
  { zh: '书之妙道，神采为上，形质次之。——王僧虔', en: '"In the wondrous way of writing, spirit comes first and form second." — Wang Sengqian' },
  { zh: '意在笔前，然后作字。——王羲之', en: '"Let the idea come before the brush; then write." — Wang Xizhi' },
  { zh: '疏处可以走马，密处不使透风。——邓石如', en: '"Leave room where a horse could run; pack close where no wind could pass." — Deng Shiru' },
  { zh: '计白当黑，奇趣乃出。——邓石如', en: '"Count the white as black, and wonder appears." — Deng Shiru' },
  { zh: '心正则笔正。——柳公权', en: '"When the heart is upright, the brush is upright." — Liu Gongquan' },
  { zh: '人书俱老。——孙过庭', en: '"The writer and the writing ripen together." — Sun Guoting' },
  { zh: '我书意造本无法，点画信手烦推求。——苏轼', en: '"My writing is made from the mind and keeps no rule." — Su Shi' },
  { zh: '学书须先楷法，作字必先大字。', en: 'To learn writing, begin with the regular hand; to write well, begin large.' },
  { zh: '池水尽墨，不过从头再来。', en: 'When the pond has run black with ink — begin again.' },
  { zh: '退笔如山未足珍，读书万卷始通神。——苏轼', en: '"A mountain of worn brushes is not the prize; ten thousand scrolls make the spirit." — Su Shi' },
];
const Menu = {
  logoCanvas(cell) {
    const pad = cell * 1.3, sq = cell * 13 + pad * 2, gap = cell * 1.1;
    const W = sq * 3 + gap * 2 + 24, H = sq + 30;
    const k = Math.min(3, (window.devicePixelRatio || 1) * UI.s * 1.2);
    const cv = mkCanvas(W * k, H * k);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const c = cv.getContext('2d');
    const glyphs = [LOGO.fang, LOGO.kuai, LOGO.zi];
    const inks = ['mo', 'mo', 'mo'];
    const accent = [[6, 0, 'zhu'], [6, 1, 'zhu']];
    const lists = glyphs.map((rows, gi) => {
      const on = (x, y) => y >= 0 && y < 13 && x >= 0 && x < 13 && rows[y][x] === '#';
      const list = [];
      for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
        if (!on(x, y)) continue;
        let ink = inks[gi];
        if (gi !== 1 && accent.some((a) => a[0] === x && a[1] === y)) ink = 'zhu';
        if (gi === 1 && ((x === 8 && y < 2) || (y === 11 && x < 3) || (x === 3 && y === 10))) ink = gi === 1 && y < 2 ? 'zhu' : 'mo';
        list.push({ x, y, ink, enh: null, nb: (on(x, y - 1) ? 1 : 0) | (on(x + 1, y) ? 2 : 0) | (on(x, y + 1) ? 4 : 0) | (on(x - 1, y) ? 8 : 0), d: Math.hypot(x - 6, y - 6) });
      }
      return list;
    });
    const R = prng(42);
    const paper = (ox) => {
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
      const g = c.createLinearGradient(ox, 12, ox + sq, 12 + sq);
      g.addColorStop(0, PAPER.hi); g.addColorStop(1, PAPER.lo);
      c.fillStyle = g; c.fillRect(ox, 12, sq, sq);
      c.restore();
      for (let i = 0; i < 160; i++) {
        c.strokeStyle = R() < 0.6 ? `rgba(120,90,50,${0.05 + R() * 0.08})` : `rgba(255,255,255,${0.1 + R() * 0.15})`;
        c.lineWidth = 0.5 + R() * 0.6;
        const x = ox + R() * sq, y = 12 + R() * sq, a = R() * 3.14, l = 3 + R() * 9;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      }
      c.strokeStyle = 'rgba(160,44,32,0.8)'; c.lineWidth = 2.2; c.strokeRect(ox + pad * 0.42, 12 + pad * 0.42, sq - pad * 0.84, sq - pad * 0.84);
      c.strokeStyle = 'rgba(160,44,32,0.3)'; c.lineWidth = 1; c.setLineDash([5, 6]);
      c.beginPath(); c.moveTo(ox + sq / 2, 12 + pad * 0.42); c.lineTo(ox + sq / 2, 12 + sq - pad * 0.42); c.moveTo(ox + pad * 0.42, 12 + sq / 2); c.lineTo(ox + sq - pad * 0.42, 12 + sq / 2); c.stroke();
      c.setLineDash([]);
    };
    const draw = (prog) => {
      c.setTransform(k, 0, 0, k, 0, 0);
      c.clearRect(0, 0, W, H);
      lists.forEach((list, gi) => {
        const ox = 12 + gi * (sq + gap);
        paper(ox);
        const p = clamp(prog * 1.5 - gi * 0.22, 0, 1);
        const vis = list.filter((it) => it.d / 9 <= p * 1.25);
        Gfx.paintCells(c, vis, cell, ox + pad, 12 + pad, {});
      });
    };
    return { cv, draw, W, H };
  },
  authorSeal(size) {
    // 藤野京印
    const k = Math.min(3, window.devicePixelRatio || 1) * 1.6;
    const cv = mkCanvas(size * k, size * k), c = cv.getContext('2d');
    c.scale(k, k);
    const R = prng(20261113), s = size, m = s * 0.05;
    c.beginPath();
    const pts = [], n = 8, j = s * 0.014, r = s * 0.08;
    const side = (ax, ay, bx, by) => { for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(ax, bx, u) + (R() - 0.5) * j, lerp(ay, by, u) + (R() - 0.5) * j]); } };
    side(m + r, m, s - m - r, m); side(s - m, m + r, s - m, s - m - r); side(s - m - r, s - m, m + r, s - m); side(m, s - m - r, m, m + r);
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    const g = c.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#cf3524'); g.addColorStop(1, '#a3231a');
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    c.fillStyle = '#f8eed6'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const a = s * 0.1, in0 = s - a * 2, fs = in0 * 0.47;
    c.font = `700 ${Math.round(fs)}px ${FONT_KAI}`;
    const put = (ch, cx, cy) => c.fillText(ch, cx, cy + fs * 0.04);
    put('藤', a + in0 * 0.75, a + in0 * 0.26); put('野', a + in0 * 0.75, a + in0 * 0.76);
    put('京', a + in0 * 0.25, a + in0 * 0.26); put('印', a + in0 * 0.25, a + in0 * 0.76);
    c.strokeStyle = '#f8eed6'; c.globalAlpha = 0.8; c.lineWidth = s * 0.02; c.strokeRect(a * 0.5, a * 0.5, s - a, s - a);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 60; i++) { c.globalAlpha = 0.25 + R() * 0.5; c.beginPath(); c.arc(R() * s, R() * s, s * (0.004 + R() * 0.013), 0, 7); c.fill(); }
    c.restore();
    cv.className = 'authorseal';
    cv.title = AUTHOR;
    return cv;
  },
  title() {
    closeAllModals();
    UI.screen('menu');
    BG.mood('title'); Snd.setMusic('title');
    Tutorial.hide();
    const root = clear($('#menu'));
    const cell = UI.orient === 'p' ? 13.4 : 12.6;
    const logo = this.logoCanvas(cell);
    const lg = h('div.logo', logo.cv, h('div.sub', { text: 'Block Script' }), h('div.tag', { text: T('title.tag') }), this.authorSeal(84));
    const list = h('div.menulist');
    const add = (label, cls, fn, id) => { const b = mkBtn(label, cls, fn); if (id) b.id = id; list.appendChild(b); return b; };
    const run = PROFILE.run;
    if (run) add(`${T('menu.continue')}<small>${T('menu.continue.d', nm(DECKS[run.deckId]), run.ante > 8 ? run.ante : T('num.' + run.ante))}</small>`, 'gold', () => Game.resume(), 'btn-continue');
    add(T('menu.new'), 'red', () => this.setup(), 'btn-new');
    const dk = todayKey(), dd = PROFILE.meta.daily[dk];
    add(`${T('menu.daily')}<small>${dd && dd.done ? T('menu.daily.done', dd.ante > 8 ? 8 : dd.ante) : T('menu.daily.d')}</small>`, '', () => this.daily(), 'btn-daily');
    list.appendChild(h('div.rowbtns', mkBtn(T('menu.collection'), '', () => Overlays.collection()), mkBtn(T('menu.help'), '', () => Overlays.help()), mkBtn(T('menu.settings'), '', () => Overlays.settings())));
    root.appendChild(h('div.title', lg, list));
    root.appendChild(h('div.credit', { html: `${T('title.credit', `<b>${AUTHOR}</b>`)}　·　v${VERSION}` }));
    // the title writes itself, block by block
    const t0 = nowMs();
    const anim = () => {
      if (!logo.cv.isConnected) return;
      const u = clamp((nowMs() - t0) / 1500, 0, 1);
      logo.draw(PROFILE.settings.reduce ? 1 : u);
      if (u < 1 && !PROFILE.settings.reduce) requestAnimationFrame(anim);
    };
    anim();
  },
  async daily() {
    const key = todayKey(), cfg = dailyConfig(key);
    if (PROFILE.run && !(await confirmBox(T('menu.daily'), T('menu.overwrite'), T('ok'), T('cancel'), true))) return;
    if (PROFILE.run) { UI.run = PROFILE.run; Game.abandon(); }
    Game.begin(cfg);
  },
  setup() {
    const M = PROFILE.meta;
    let deck = PROFILE.settings.lastDeck && deckUnlocked(PROFILE.settings.lastDeck) ? PROFILE.settings.lastDeck : 'kai';
    let stake = Math.min(PROFILE.settings.lastStake || 0, maxStake(deck));
    openModal({
      title: T('setup.title'), width: Math.min(UI.W - 30, 860),
      body: (root) => {
        const box = h('div.setup');
        const decks = h('div.decks'), info = h('div.deckinfo'), stakes = h('div.stakes'), sinfo = h('div.stakeinfo');
        const seed = h('input.txt', { type: 'text', maxlength: 12, placeholder: T('setup.seed.ph'), autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
        const paint = () => {
          clear(decks);
          for (const id of DECK_ORDER) {
            const d = DECKS[id], ok = deckUnlocked(id), rec = M.decks[id];
            const el = h('div.deck', { class: (id === deck ? 'on ' : '') + (ok ? '' : 'lock') }, h('div.dg', { text: d.zh[0] }), h('div.dn2', { text: ok ? nm(d) : '？' }));
            if (rec && rec.wins) el.appendChild(h('span.won', { text: nm(STAKES[rec.best || 0]) }));
            el.addEventListener('click', () => { Snd.play('tick'); deck = id; stake = Math.min(stake, maxStake(deck)); paint(); });
            decks.appendChild(el);
          }
          const d = DECKS[deck], ok = deckUnlocked(deck);
          info.innerHTML = `<div class="dt">${ok ? nm(d) : '？？？'}${d.w !== 8 || d.h !== 8 ? `　<span class="num" style="font-size:18px;color:var(--dim)">${d.w}×${d.h}</span>` : ''}</div>` + (ok ? rich(dtx(d)) : `<span class="dim">${deckUnlockText(deck)}</span>`);
          clear(stakes);
          const mx = ok ? maxStake(deck) : -1;
          STAKES.forEach((s, i) => {
            const b = h('button.stake', { type: 'button', class: i === stake ? 'on' : '', text: nm(s) });
            b.disabled = i > mx;
            b.addEventListener('click', () => { Snd.play('tick'); stake = i; paint(); });
            stakes.appendChild(b);
          });
          const lines = [];
          for (let i = 1; i <= stake; i++) lines.push(`<b>${nm(STAKES[i])}</b>：${dtx(STAKES[i])}`);
          sinfo.innerHTML = stake === 0 ? dtx(STAKES[0]) + (mx < STAKES.length - 1 && ok ? `<br>${T('setup.stake.unlock')}` : '') : lines.join('；');
          const go = $('#btn-go');
          if (go) go.disabled = !ok;
        };
        box.append(h('div.dsec', { style: { margin: '0' } }, T('setup.deck')), decks, info, h('div.dsec', { style: { margin: '4px 0 0' } }, T('setup.stake')), stakes, sinfo,
          h('div.seedrow', h('span', { text: T('setup.seed') }), seed, h('span', { text: T('setup.seed.d'), style: { fontSize: '15.5px' } })));
        root.appendChild(box);
        this._setup = { get: () => ({ deck, stake, seed: seed.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') }) };
        setTimeout(paint, 0);
      },
      buttons: [{ label: T('cancel'), cls: 'ghost' }, { label: T('setup.go'), cls: 'red', id: 'btn-go', keep: true, fn: async (close) => {
        const o = this._setup.get();
        if (!deckUnlocked(o.deck)) return;
        if (PROFILE.run && !(await confirmBox(T('menu.new'), T('menu.overwrite'), T('ok'), T('cancel'), true))) return;
        if (PROFILE.run) { const old = PROFILE.run; if (!old.recorded) { old.recorded = true; metaOnRunEnd(old, !!old.won); } PROFILE.run = null; }
        PROFILE.settings.lastDeck = o.deck; PROFILE.settings.lastStake = o.stake;
        const first = !PROFILE.meta.tutorial && !o.seed;
        closeAllModals();
        Game.begin({ deck: o.deck, stake: o.stake, seed: o.seed || undefined, tutorial: first });
      } }],
    });
  },
  endStats(run) {
    const box = h('div.endstats');
    const add = (k, v) => box.appendChild(h('div', k, h('b', { html: v })));
    add(T('end.ante'), faName(run.ante));
    add(T('run.best'), fmtNum(run.stats.best) + (run.stats.bestChar ? ` <span class="kai" style="font-size:20px">${run.stats.bestChar === 'sanbi' ? T('sanbi') : CH[run.stats.bestChar].g}</span>` : ''));
    add(T('end.chars'), String(distinctChars(run)));
    add(T('run.ignites'), String(run.stats.ignites));
    add(T('end.rounds'), String(run.stats.rounds));
    add(T('hud.seed'), run.daily ? T('daily.short') : run.seed);
    return box;
  },
  endSeals(run) {
    const row = h('div.endseals');
    for (const s of run.seals) { const el = Gfx.sealEl(s.id, 56, s.ed); bindCard(el, () => sealCard(s.id, s, run), { noClick: true }); row.appendChild(el); }
    return row;
  },
  gameOver() {
    const run = UI.run;
    if (!run) { this.title(); return; }
    closeAllModals();
    Tutorial.hide();
    BG.mood('over'); Snd.setMusic('title');
    Snd.play('lose');
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const lost = run.lost || {};
    openModal({
      dismiss: false, width: Math.min(UI.W - 30, 720),
      body: (root) => {
        const w = h('div.endwrap.lose');
        w.appendChild(h('div.big', { text: T('end.lose') }));
        const where = lost.boss ? (LANG === 'zh' ? '《' + BOSSES[lost.boss].zh + '》' : BOSSES[lost.boss].en) : tx(BLIND_NAME[lost.blind || 0]);
        w.appendChild(h('div', { html: T('end.lose.at', where, fmtNum(lost.score || 0), fmtNum(lost.target || 0)), style: { fontSize: '20px', color: '#d9cdb6' } }));
        w.appendChild(this.endStats(run));
        if (run.seals.length) w.appendChild(this.endSeals(run));
        w.appendChild(h('div.quote', { text: tx(q) }));
        root.appendChild(w);
      },
      buttons: [
        { label: T('end.title'), cls: 'ghost', keep: true, fn: () => { closeAllModals(); UI.run = null; Menu.title(); } },
        { label: T('end.again'), cls: 'red', keep: true, fn: () => { closeAllModals(); const o = run.daily ? dailyConfig(run.daily) : { deck: run.deckId, stake: run.stake }; UI.run = null; Game.begin(o); } },
      ],
    });
  },
  // 永: the eight strokes of the eight principles
  yong(size, prog) {
    const k = Math.min(3, window.devicePixelRatio || 1) * 1.5;
    const cv = mkCanvas(size * k, size * k), c = cv.getContext('2d');
    cv.style.width = size + 'px'; cv.style.height = size + 'px'; cv.className = 'yong';
    const S = [
      [0.46, 0.07, 0.56, 0.17, 0.1], [0.27, 0.31, 0.55, 0.30, 0.085], [0.53, 0.29, 0.53, 0.86, 0.095], [0.535, 0.86, 0.41, 0.77, 0.07],
      [0.13, 0.55, 0.40, 0.45, 0.075], [0.40, 0.45, 0.11, 0.87, 0.085], [0.82, 0.30, 0.60, 0.47, 0.075], [0.57, 0.46, 0.92, 0.88, 0.1],
    ];
    const draw = (p) => {
      c.setTransform(k, 0, 0, k, 0, 0);
      c.clearRect(0, 0, size, size);
      S.forEach((s, i) => Gfx.brush(c, s[0] * size, s[1] * size, s[2] * size, s[3] * size, s[4] * size, i < p ? '#f3d98b' : 'rgba(243,217,139,0.13)', i < Math.floor(p) ? 1 : i === Math.floor(p) ? p - Math.floor(p) : 1, i * 31 + 7, i < p));
    };
    draw(prog);
    return { cv, draw };
  },
  victory() {
    const run = UI.run;
    closeAllModals();
    Tutorial.hide();
    BG.mood('win'); Snd.setMusic('title');
    Snd.play('victory');
    FX.flash('#f3d98b', 0.3);
    openModal({
      dismiss: false, width: Math.min(UI.W - 30, 760),
      body: (root) => {
        const w = h('div.endwrap.win');
        const y = this.yong(UI.orient === 'p' ? 230 : 170, 0);
        w.appendChild(y.cv);
        w.appendChild(h('div.big', { text: T('end.win') }));
        w.appendChild(h('div', { html: T('end.win.d', nm(DECKS[run.deckId]), nm(STAKES[run.stake])), style: { fontSize: '20px', color: '#e8dcc6' } }));
        w.appendChild(this.endStats(run));
        if (run.seals.length) w.appendChild(this.endSeals(run));
        const nxt = run.stake < STAKES.length - 1 ? T('end.win.next', nm(STAKES[run.stake + 1])) : T('end.win.top');
        w.appendChild(h('div.quote', { html: nxt }));
        root.appendChild(w);
        const t0 = nowMs();
        const anim = () => {
          if (!y.cv.isConnected) return;
          const p = clamp((nowMs() - t0 - 500) / 2600, 0, 1) * 8;
          y.draw(PROFILE.settings.reduce ? 8 : p);
          if (p < 8) requestAnimationFrame(anim);
        };
        setTimeout(anim, 30);
        const burst = () => { if (!y.cv.isConnected) return; const c = UI.center(y.cv); FX.spark(c.x + (Math.random() - 0.5) * c.w * 2, c.y + (Math.random() - 0.5) * c.h, Math.random() < 0.5 ? '#f3d98b' : '#ff9a6a', 18, 260 * UI.s, 2.6 * UI.s); };
        for (let i = 0; i < 9; i++) setTimeout(burst, 400 + i * 330);
      },
      buttons: [
        { label: T('end.title'), cls: 'ghost', keep: true, fn: () => { closeAllModals(); Game.abandon(); } },
        { label: T('end.endless'), cls: 'gold', keep: true, fn: () => { closeAllModals(); continueEndless(run); Game.save(); Game.route(); } },
      ],
    });
  },
};

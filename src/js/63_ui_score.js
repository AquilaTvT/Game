// ---------- the flourish: plays back the engine's scoring events as a little ceremony ----------
const Score = {
  fast: false, playing: false,
  speed() { return (PROFILE.settings.speed || 1) * (this.fast ? 7 : 1); },
  wait(ms) { const d = ms / this.speed(); return d < 4 ? Promise.resolve() : wait(d); },
  srcPos(src) {
    // viewport position of whatever caused an effect
    const cs = Play.cs * UI.s;
    if (!src) return null;
    if (src.k === 'cell' || src.k === 'sq' || src.k === 'su') { const p = Play.cellVP(src.i); return { x: p.x, y: p.y - cs * 0.28, size: cs * 0.42 }; }
    if (src.k === 'seal' || src.k === 'ed') { const el = Hud.sealEl(src.u); if (!el) return null; const c = UI.center(el.querySelector('.sealface') || el); return { x: c.x, y: c.y - c.h * 0.42, size: Math.max(20, c.h * 0.42), seal: src.u }; }
    if (src.k === 'pure') {
      const st = this.cur && this.cur.strokes[src.si], run = UI.run;
      if (!st) return null;
      const p = st.kind === 'row' ? Play.toViewport(Play.bx + run.w * Play.cs + Play.cs * 0.1, Play.by + (st.i + 0.5) * Play.cs) : st.kind === 'col' ? Play.toViewport(Play.bx + (st.i + 0.5) * Play.cs, Play.by + run.h * Play.cs + Play.cs * 0.15) : Play.toViewport(Play.bx + run.w * Play.cs * 0.5, Play.by + run.h * Play.cs * 0.5);
      return { x: p.x - (st.kind === 'row' ? cs * 0.5 : 0), y: p.y - (st.kind === 'col' ? cs * 0.5 : 0), size: cs * 0.44 };
    }
    if (src.k === 'char') { const run = UI.run, p = Play.toViewport(Play.bx + run.w * Play.cs * 0.5, Play.by + run.h * Play.cs * 0.5); return { x: p.x, y: p.y, size: cs * 1.5, big: true }; }
    const c = UI.center(Hud.el.glyph);
    return { x: c.x, y: c.y - c.h * 0.3, size: Math.max(18, c.h * 0.36) };
  },
  async play(res) {
    const run = UI.run, w = run.w, h = run.h;
    this.playing = true; this.fast = false;
    this.cur = { strokes: [] };
    let cellN = 0, addN = 0, lastCellAt = 0;
    const colOf = { c: '#8cc8f8', m: '#ff9a82', x: '#ffd27a', g: '#ffe08a' };
    const u = UI.s;
    const strokeMap = {};
    const boardVP = Play.toViewport(Play.bx + w * Play.cs * 0.5, Play.by + h * Play.cs * 0.5);
    for (let i = 0; i < res.ev.length; i++) {
      const e = res.ev[i];
      switch (e.t) {
        case 'begin': {
          Snd.play('ignite');
          BG.pulse(0.5);
          FX.shake(3 * u);
          Hud.setCalc(e.c, e.m, true);
          if (e.nul) {
            FX.text(boardVP.x, boardVP.y, T('nul.' + e.nul), '#ff8a73', 34 * u, { life: 1.3, vy: -30, font: FONT_KAI });
            Snd.play('deny');
            await this.wait(700);
          } else await this.wait(160);
          break;
        }
        case 'stroke': {
          const s = { kind: e.kind, i: e.i, p: 0, a: 1 };
          strokeMap[e.si] = s;
          this.cur.strokes[e.si] = s;
          Play.strokes.push(s);
          Snd.play('stroke', e.si);
          // the brush runs a little ahead of the counting
          const n = e.idxs.length, per = clamp(46 - cellN * 0.45, 15, 46);
          const dur = (n * per * 0.9) / this.speed(), t0 = nowMs();
          const tick = () => { const q = clamp((nowMs() - t0) / Math.max(1, dur), 0, 1); s.p = Math.max(s.p, 0.06 + 0.94 * q); if (q < 1 && this.playing) requestAnimationFrame(tick); };
          tick();
          break;
        }
        case 'cell': {
          cellN++;
          const p = Play.cellVP(e.i);
          if (e.dead) { Play.pops.set(e.i, { t0: Play.t, col: '#6b6359' }); Snd.play('dead'); }
          else {
            Play.pops.set(e.i, { t0: Play.t, col: e.rep ? '#ffd27a' : '#fff3c9' });
            Snd.play('cell', cellN);
            if (e.rep) FX.text(p.x, p.y + Play.cs * u * 0.2, T('fx.again'), '#ffd27a', Play.cs * u * 0.3, { life: 0.5, vy: -30, font: FONT_KAI });
          }
          lastCellAt = nowMs();
          await this.wait(clamp(46 - cellN * 0.45, 15, 46));
          break;
        }
        case 'add': {
          addN++;
          Hud.setCalc(e.c, e.m, true);
          const pos = this.srcPos(e.src);
          const base = e.src && e.src.k === 'cell' && e.k === 'c' && e.v === CELL_CHIPS;
          const txt = e.k === 'x' ? fmtX(e.v) : e.k === 'g' ? '+' + e.v + (LANG === 'zh' ? '文' : '$') : '+' + fmtMult(e.v);
          if (pos) {
            const size = pos.size * (base ? 0.72 : e.k === 'x' ? 1.3 : 1);
            const jx = base ? 0 : (Math.random() - 0.5) * pos.size * 0.8;
            FX.text(pos.x + jx, pos.y, txt, colOf[e.k], size, { life: base ? 0.45 : pos.big ? 1.2 : 0.8, vy: base ? -40 : -62 });
            if (pos.seal) { Hud.popSeal(pos.seal); FX.ring(pos.x, pos.y + pos.size, 'rgba(255,190,120,0.9)', pos.size * 0.6, pos.size * 1.8, 3 * u, 0.35); }
            if (e.k === 'x') FX.spark(pos.x, pos.y, '#ffd27a', pos.big ? 40 : 12, (pos.big ? 420 : 220) * u, 2.4 * u);
            if (e.k === 'g') FX.spark(pos.x, pos.y, '#ffe08a', 8, 160 * u, 2 * u);
          }
          if (e.src && e.src.k === 'char') {
            // the character multiplier: the written glyph flares
            Snd.play('char', UI.run.lastTier);
            FX.shake(Math.min(14, 5 + Math.log10(Math.max(10, e.c * e.m))) * u);
            FX.flash('#fff3d0', 0.16);
            FX.ring(boardVP.x, boardVP.y, 'rgba(255,214,120,0.9)', Play.cs * u, Play.cs * u * 5.5, 6 * u, 0.6);
            BG.pulse(0.9);
            for (const s of Play.strokes) { s.base = s.col; s.col = '#7a160c'; }
            await this.wait(430);
            for (const s of Play.strokes) s.col = s.base;
          } else if (!base) {
            if (e.k === 'x') Snd.play('xmult', addN); else if (e.k === 'g') Snd.play('coin'); else if (e.k === 'm') Snd.play('mult', addN); else Snd.play('chips', addN);
            if (pos && pos.seal) { Snd.play('seal'); await this.wait(200); }
            else if (e.src && e.src.k === 'pure') await this.wait(150);
            else if (e.src && (e.src.k === 'buff' || e.src.k === 'su')) await this.wait(120);
            else await this.wait(e.k === 'x' ? 90 : 34);
          }
          break;
        }
        case 'say': {
          const pos = this.srcPos(e.src);
          if (pos) { FX.text(pos.x, pos.y - pos.size * 0.5, tx(e.txt), '#f3e6c8', pos.size * 0.8, { life: 0.9, vy: -50, font: FONT_KAI }); if (pos.seal) Hud.popSeal(pos.seal); }
          await this.wait(180);
          break;
        }
        case 'pure': {
          Snd.play('pure');
          const s = strokeMap[e.si];
          if (s) { s.col = INK[e.ink].col; }
          const pos = this.srcPos({ k: 'pure', si: e.si });
          if (pos) FX.text(pos.x, pos.y - pos.size * 0.9, T('fx.pure', nm(INK[e.ink])), INK[e.ink].hi, pos.size * 0.8, { life: 0.9, vy: -34, font: FONT_KAI });
          break;
        }
        case 'strokeEnd': {
          const s = strokeMap[e.si];
          if (s) s.p = 1;
          await this.wait(70);
          break;
        }
        case 'total': {
          await this.wait(220);
          if (!e.nul) {
            Snd.play('total');
            const big = fmtNum(e.score);
            const size = clamp(74 - big.length * 2.2, 38, 74) * u;
            FX.text(boardVP.x, boardVP.y, big, '#fff3c9', size, { life: 1.15, vy: -22, edge: 'rgba(60,12,6,0.95)' });
            FX.ink(boardVP.x, boardVP.y, '#1b1918', 26, 520 * u, 7 * u);
            const mag = Math.log10(Math.max(10, e.score));
            FX.shake(Math.min(18, 2 + mag * 1.6) * u);
            BG.pulse(Math.min(1.6, 0.2 + mag * 0.14));
            await this.wait(520);
          }
          const before = Hud._score;
          const done = Hud.setScore(e.sum, true);
          if (before < e.target && e.sum >= e.target) {
            const sc = UI.center(Hud.el.score);
            Snd.play('flame');
            const burn = () => { if (!this.playing) return; FX.rise(sc.x, sc.y + sc.h * 0.3, Math.random() < 0.5 ? '#ffb05a' : '#ff6a3c', 5, sc.w * 0.9, 4 * u); };
            const iv = setInterval(burn, 40);
            setTimeout(() => clearInterval(iv), 1400);
            FX.flash('#ffb05a', 0.14);
          }
          await done;
          break;
        }
        case 'clear': {
          // the strokes lift off the paper and the ink they were written with is gone
          const cells = e.cells;
          const board = Play.viewBoard;
          for (const i of cells) {
            const p = Play.cellVP(i), cell = board && board[i];
            if (cell && Math.random() < (cells.length > 40 ? 0.4 : 0.8)) FX.ink(p.x, p.y, cell.stone ? '#8a8378' : INK[cell.ink].col, 3, 210 * u, 4.5 * u);
            Play.hidden.add(i);
          }
          Play.inkDirty = true;
          const t0 = nowMs(), dur = 360 / this.speed();
          await new Promise((r) => {
            const tick = () => {
              const q = clamp((nowMs() - t0) / Math.max(1, dur), 0, 1);
              for (const s of Play.strokes) { s.a = 1 - q; s.scale = 1 + 0.07 * q; }
              if (q < 1) requestAnimationFrame(tick); else r();
            };
            tick();
          });
          Play.strokes.length = 0;
          if (board) for (const i of cells) board[i] = null;
          for (const i of cells) Play.hidden.delete(i);
          Play.inkDirty = true;
          break;
        }
        case 'shatter': {
          Snd.play('shatter');
          FX.text(boardVP.x, boardVP.y - Play.cs * u, T('fx.shatter', nm(SHAPES[e.shape])), '#ff9a82', 26 * u, { life: 1.3, vy: -30, font: FONT_KAI });
          await this.wait(350);
          break;
        }
        case 'yi': {
          const c = UI.center(Hud.el.glyph);
          const d = YI[e.yi];
          Snd.play(e.yi.startsWith('money') ? 'coin' : 'level');
          FX.ring(c.x, c.y, 'rgba(120,220,170,0.9)', c.w * 0.4, c.w * 1.3, 4 * u, 0.5);
          toast({ iconEl: Gfx.glyphCanvas(e.char, 34, '#1b1918'), title: T('fx.yi', CH[e.char].g), text: rich(dtx(d)) + (e.item ? (e.got ? ' — ' + nm(ITEMS[e.item]) : ' — ' + T('fx.noroom')) : e.tier ? ' — ' + (LANG === 'zh' ? TIER_NAME.zh[e.tier] : TIER_NAME.en[e.tier]) : ''), ms: 2600 });
          if (e.cells) { for (const i of e.cells) { const p = Play.cellVP(i); FX.ink(p.x, p.y, '#c9bfa8', 2, 160 * u, 4 * u); if (Play.viewBoard) Play.viewBoard[i] = null; } Play.inkDirty = true; }
          await this.wait(300);
          break;
        }
        case 'wipe': case 'wash': {
          Snd.play('rinse');
          for (const i of e.cells) { const p = Play.cellVP(i); FX.ink(p.x, p.y, '#6fa8d8', 2, 180 * u, 4 * u); if (Play.viewBoard) Play.viewBoard[i] = null; }
          Play.inkDirty = true;
          await this.wait(260);
          break;
        }
        case 'bossCash': {
          const c = UI.center(Hud.el.money);
          Snd.play('deny');
          FX.text(c.x, c.y, e.v + (LANG === 'zh' ? '文' : '$'), '#ff8a73', 26 * u, { life: 1 });
          break;
        }
        case 'sealGone': {
          toast({ icon: '逝', title: T('fx.sealgone', nm(SEALS[e.id])), ms: 2600 });
          break;
        }
        case 'rescue': {
          Snd.play('level');
          toast({ icon: '生', title: nm(SEALS[e.id]), text: T('fx.rescue'), ms: 3200 });
          await this.wait(500);
          break;
        }
        default: break;
      }
    }
    Play.strokes.length = 0; Play.hidden.clear(); Play.viewBoard = null; Play.inkDirty = true;
    this.playing = false; this.fast = false; this.cur = null;
  },
};

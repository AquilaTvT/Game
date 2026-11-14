// ---------- the simulation, second half: the parade, its behaviours, the bosses, and the helpers that fight beside you ----------
const CELL = 72;
const cellKey = (x, y) => (Math.floor(x / CELL) + 512) * 1024 + Math.floor(y / CELL) + 512;

Object.assign(World.prototype, {
  addFoe(k, x, y, o) {
    const bdef = BOSSES[k], def = bdef || FOES[k];
    const m = bdef ? this.nm.hp * (1 + 1.5 * this.loop) : this.hpMul();
    const e = { k, def, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: def.r, hp: def.hp * m, mhp: 0, spd: def.spd * this.nm.spd, xp: def.xp, t: 0, s: 0, st: this.rng.range(0.6, 2.4), a: 0, ph: this.rng() * TAU,
      fl: 0, frozen: 0, stun: 0, fade: 0, dead: 0, elite: 0, boss: bdef ? 1 : 0, wcd: 0, tcd: 0, haste: 0, lx: 0, ly: 0, tele: 0 };
    if (o) Object.assign(e, o);
    if (e.elite) { e.r *= 1.45; e.hp *= 5; e.xp *= 6; }
    e.mhp = e.hp;
    this.foes.push(e);
    return e;
  },
  shoot(x, y, ang, sp, o) {
    const b = { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 6, life: 7, ally: 0 };
    if (o) Object.assign(b, o);
    this.shots.push(b);
    return b;
  },
  nearestFoe(x, y, maxD, skip) {
    let best = null, bd = maxD * maxD;
    for (const e of this.foes) { if (e.dead || e.fade || e === skip) continue; const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  },

  // ---- who comes, and when
  director(dt) {
    const st = this.stageDef(), T = this.stageT, cap = 230 + 22 * this.night;
    if (this.clearT > 0 || this.quiet) return;
    // the first stage of a night opens gently
    const ease = this.stage === 0 && !this.loop ? 0.55 + 0.45 * Math.min(1, T / 70) : 1;
    const rate = this.nm.rate * (this.bossOn ? 0.45 : 1) * (1 + 0.4 * this.loop) * ease;
    for (let j = 0; j < st.waves.length; j++) {
      const w = st.waves[j];
      if (T < w[0] || (this.bossOn && j > 1)) continue;
      if ((this.wt[j] -= dt * rate) > 0) continue;
      this.wt[j] = w[2] * this.rng.range(0.85, 1.15);
      if (this.foes.length < cap || w[5]) this.spawnPack(w[3], w[4], w[5]);
    }
    if (!this.bossOn && T >= st.dur) this.spawnBoss();
  },
  spawnPoint() {
    const p = this.p, a = this.rng() * TAU, lim = this.arenaR + 200;
    let x = p.x + Math.cos(a) * SPAWN_R, y = p.y + Math.sin(a) * SPAWN_R, d = hyp(x, y);
    if (d > lim) { x *= lim / d; y *= lim / d; }
    if (hyp(x - p.x, y - p.y) < 560) { x = p.x - Math.cos(a) * SPAWN_R; y = p.y - Math.sin(a) * SPAWN_R; d = hyp(x, y); if (d > lim) { x *= lim / d; y *= lim / d; } }
    return { x, y, a };
  },
  spawnPack(k, n, elite) {
    const s = this.spawnPoint(), def = FOES[k], rng = this.rng;
    if (elite) { for (let i = 0; i < n; i++) this.addFoe(k, s.x + rng.range(-30, 30), s.y + rng.range(-30, 30), { elite: 1 }); this.ev.push({ t: 'elite', x: s.x, y: s.y }); return; }
    const cnt = Math.max(1, Math.round(n * rng.range(0.8, 1.2)));
    const lucky = rng.chance(this.nm.elite) ? rng.int(cnt) : -1;
    for (let i = 0; i < cnt; i++) {
      let x, y;
      if (def.ai === 'zig') { x = s.x + Math.cos(s.a) * i * 24; y = s.y + Math.sin(s.a) * i * 24; } else { const q = rng() * TAU, rr = Math.sqrt(rng()) * 15 * Math.sqrt(cnt); x = s.x + Math.cos(q) * rr; y = s.y + Math.sin(q) * rr; }
      this.addFoe(k, x, y, i === lucky ? { elite: 1 } : null);
    }
  },

  buildGrid() {
    const g = this._g || (this._g = new Map()), used = this._gu || (this._gu = []);
    for (const a of used) a.length = 0;
    used.length = 0;
    for (const e of this.foes) {
      if (e.dead) continue;
      const key = cellKey(e.x, e.y);
      let a = g.get(key);
      if (!a) g.set(key, a = []);
      if (!a.length) used.push(a);
      a.push(e);
    }
    return g;
  },
  // which trail points lie in which cell (only built when something needs to know)
  buildTrailGrid() {
    const g = this._tg || (this._tg = new Map()), used = this._tgu || (this._tgu = []);
    for (const a of used) a.length = 0;
    used.length = 0;
    const tx = this.tx, ty = this.ty;
    for (let i = 0; i < tx.length; i++) {
      const key = cellKey(tx[i], ty[i]);
      let a = g.get(key);
      if (!a) g.set(key, a = []);
      if (!a.length) used.push(a);
      a.push(i);
    }
    return g;
  },
  trailTouch(x, y, r) {
    const g = this._tg, tx = this.tx, ty = this.ty, rr = (r + 7) * (r + 7);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const a = g.get((cx + ox + 512) * 1024 + cy + oy + 512);
      if (!a) continue;
      for (let j = 0; j < a.length; j++) { const i = a[j]; if ((tx[i] - x) * (tx[i] - x) + (ty[i] - y) * (ty[i] - y) < rr) return i; }
    }
    return -1;
  },

  updateFoes(dt) {
    const p = this.p, foes = this.foes, S = this.S, rng = this.rng;
    const slow = this.slowAll > 0 ? 0.5 : 1;
    const g = this.buildGrid();
    const needTrail = (S.ink || S.shock || this.cutters > 0 || this.bossParts) && this.tx.length > 3;
    if (needTrail) this.buildTrailGrid();
    this.cutters = 0;
    if (this.cutCd > 0) this.cutCd -= dt;
    for (let n = foes.length, i = 0; i < n; i++) {
      const e = foes[i];
      if (e.dead) continue;
      const def = e.def;
      e.t += dt;
      if (e.fl > 0) e.fl -= dt;
      if (e.wcd > 0) e.wcd -= dt;
      if (e.tcd > 0) e.tcd -= dt;
      if (e.haste > 0) e.haste -= dt;
      if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.86; e.ky *= 0.86; if (Math.abs(e.kx) + Math.abs(e.ky) < 8) { e.kx = 0; e.ky = 0; } }
      // the stroke itself can burn and stun
      if (needTrail && (S.ink || S.shock) && !e.fade && this.trailTouch(e.x, e.y, e.r) >= 0) {
        if (S.ink) this.hurt(e, (S.power * S.ink + e.mhp * S.pct * (e.boss ? 0.15 : 1)) * dt, 'ink');
        if (S.shock && e.tcd <= 0 && !e.boss && def.ai !== 'part') { e.stun = Math.max(e.stun, S.shock); e.tcd = 2.5; this.ev.push({ t: 'shock', x: e.x, y: e.y }); }
        if (e.dead) continue;
      }
      if (def.ai === 'part') continue;
      if (e.boss) { BOSS_AI[e.k](this, e, dt, slow); continue; }
      const dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
      if (e.frozen > 0) { e.frozen -= dt; continue; }
      if (e.stun > 0) { e.stun -= dt; continue; }
      let sp = e.spd * slow * (e.haste > 0 ? 1.45 : 1), mx = ux, my = uy;
      e.tele = 0;
      switch (def.ai) {
        case 'chase': { const w = Math.sin(e.t * 2.3 + e.ph) * 0.35; mx = ux - uy * w; my = uy + ux * w; break; }
        case 'zig': { const w = Math.sin(e.t * 5 + e.ph) * 0.95; mx = ux - uy * w; my = uy + ux * w; break; }
        case 'hop': { e.st -= dt; if (e.s === 0) { if (e.st <= 0) { e.s = 1; e.st = 0.5; } } else { sp = 0; if (e.st <= 0) { e.s = 0; e.st = 0.32; } } break; }
        case 'ghost': { e.fade = (e.t + e.ph) % 3.8 > 2.3 ? 1 : 0; const w = Math.sin(e.t * 1.7 + e.ph) * 0.5; mx = ux - uy * w; my = uy + ux * w; break; }
        case 'bell': {
          e.st -= dt;
          if (e.st <= 0) { e.st = 1; this.ev.push({ t: 'toll', x: e.x, y: e.y }); for (const q of foes) if (!q.dead && q !== e && hyp(q.x - e.x, q.y - e.y) < 190) q.haste = 1.2; }
          if (d < 240) { mx = -ux * 0.5; my = -uy * 0.5; }
          break;
        }
        case 'lunge': case 'brute': {
          const br = def.ai === 'brute';
          e.st -= dt;
          if (e.s === 0) { if (e.st <= 0 && d < (br ? 210 : 320)) { e.s = 1; e.st = br ? 0.6 : 0.55; e.lx = ux; e.ly = uy; } }
          else if (e.s === 1) { sp = 0; e.tele = 1; if (e.st <= 0) { e.s = 2; e.st = br ? 0.55 : 0.42; } }
          else { mx = e.lx; my = e.ly; sp = e.spd * slow * (br ? 3.2 : 3.4); if (e.st <= 0) { e.s = 0; e.st = rng.range(2.2, 3.4); } }
          break;
        }
        case 'shoot': {
          if (d < 210) { mx = -ux; my = -uy; sp *= 0.7; } else if (d < 330) { const sg = e.ph > Math.PI ? 1 : -1; mx = -uy * sg; my = ux * sg; sp *= 0.5; }
          e.st -= dt;
          if (e.s === 0) { if (e.st <= 0 && d < 540) { e.s = 1; e.st = 0.4; } }
          else { sp = 0; e.tele = 1; if (e.st <= 0) { e.s = 0; e.st = rng.range(2.5, 3.3); this.shoot(e.x + ux * e.r, e.y + uy * e.r, Math.atan2(uy, ux), 150 * this.nm.shot); this.ev.push({ t: 'shot', x: e.x, y: e.y }); } }
          break;
        }
        case 'dash': {
          e.st -= dt;
          if (e.s === 0) { if (e.st <= 0 && d < 430) { e.s = 1; e.st = 0.7; e.lx = ux; e.ly = uy; } }
          else if (e.s === 1) { sp = 0; e.tele = 2; if (e.st <= 0) { e.s = 2; e.st = 0.55; this.ev.push({ t: 'swoop', x: e.x, y: e.y }); } }
          else if (e.s === 2) {
            mx = e.lx; my = e.ly; sp = 560 * slow; e.tele = 3;
            this.cutters++;
            if (needTrail && this.cutCd <= 0) { const k = this.trailTouch(e.x, e.y, e.r); if (k > 0) { this.cutTrail(k, e.x, e.y); this.cutCd = 0.4; } }
            if (e.st <= 0) { e.s = 3; e.st = 0.7; }
          } else { sp = 0; if (e.st <= 0) { e.s = 0; e.st = rng.range(2.4, 3.6); } }
          break;
        }
        case 'cutter': {
          const n2 = this.tx.length;
          if (e.tcd <= 0 && this.tl > 130 && n2 > 8) {
            this.cutters++;
            const idx = Math.floor(n2 * 0.45), qx = this.tx[idx] - e.x, qy = this.ty[idx] - e.y, qd = hyp(qx, qy) || 1;
            mx = qx / qd; my = qy / qd;
            if (qd < 14 + e.r) { this.cutTrail(idx, e.x, e.y); e.tcd = 3.6; }
          }
          break;
        }
      }
      e.vx = mx * sp; e.vy = my * sp;
      e.x += e.vx * dt; e.y += e.vy * dt;
      // do not stand inside one another
      const gx = Math.floor(e.x / CELL), gy = Math.floor(e.y / CELL), hx = e.x - gx * CELL < CELL / 2 ? -1 : 1, hy = e.y - gy * CELL < CELL / 2 ? -1 : 1;
      for (let c2 = 0; c2 < 4; c2++) {
        const a = g.get((gx + (c2 & 1 ? hx : 0) + 512) * 1024 + gy + (c2 & 2 ? hy : 0) + 512);
        if (!a) continue;
        for (let j = 0; j < a.length; j++) {
          const q = a[j];
          if (q === e || q.dead || q.boss) continue;
          const qx = e.x - q.x, qy = e.y - q.y, rr = (e.r + q.r) * 0.92, dd = qx * qx + qy * qy;
          if (dd < rr * rr && dd > 0.01) { const ds = Math.sqrt(dd), push = (rr - ds) * 0.4; e.x += (qx / ds) * push; e.y += (qy / ds) * push; }
        }
      }
      if (!e.fade && d < e.r * 0.85 + 7) this.hitPlayer(e.x, e.y);
    }
    // sweep the fallen out of the list
    let w = 0;
    for (let i = 0; i < foes.length; i++) if (!foes[i].dead) foes[w++] = foes[i];
    foes.length = w;
  },

  updateShots(dt) {
    const p = this.p, shots = this.shots, g = this._g;
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      if (!b) continue;
      b.life -= dt;
      if (b.home && (b.rt = (b.rt || 0) - dt) <= 0) { b.rt = 0.15; const tg = this.nearestFoe(b.x, b.y, 420); if (tg) { const a = Math.atan2(tg.y - b.y, tg.x - b.x), sp = hyp(b.vx, b.vy) || 300; b.vx = lerp(b.vx, Math.cos(a) * sp, 0.5); b.vy = lerp(b.vy, Math.sin(a) * sp, 0.5); } }
      b.x += b.vx * dt; b.y += b.vy * dt;
      let gone = b.life <= 0 || hyp(b.x, b.y) > ARENA + 420;
      if (!gone && !b.ally) { if (hyp(b.x - p.x, b.y - p.y) < b.r + 9) { gone = true; this.hitPlayer(b.x, b.y); } }
      else if (!gone) {
        const cx = Math.floor(b.x / CELL), cy = Math.floor(b.y / CELL);
        outer: for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const a = g && g.get((cx + ox + 512) * 1024 + cy + oy + 512);
          if (!a) continue;
          for (const e of a) if (!e.dead && !e.fade && hyp(e.x - b.x, e.y - b.y) < e.r + b.r) { this.hurt(e, b.dmg, 'shot'); this.ev.push({ t: 'spark', x: b.x, y: b.y }); gone = true; break outer; }
        }
      }
      if (gone && shots[i] === b) { shots[i] = shots[shots.length - 1]; shots.pop(); }
    }
  },

  // ---- the helpers: wards, cranes, skybolts, bound flames
  wardPos(i, out) { const n = this.S.ward, a = -this.t * 2.6 + (i * TAU) / n; out.x = this.p.x + Math.cos(a) * 78; out.y = this.p.y + Math.sin(a) * 78; return out; },
  shikiPos(i, out) { const n = this.S.shiki, a = this.t * 1.7 + (i * TAU) / n; out.x = this.p.x + Math.cos(a) * 44; out.y = this.p.y + Math.sin(a) * 44 * 0.8 - 6; return out; },
  updateAux(dt) {
    const S = this.S, p = this.p, g = this._g, q = this._q || (this._q = { x: 0, y: 0 });
    for (let i = 0; i < S.ward; i++) {
      this.wardPos(i, q);
      const cx = Math.floor(q.x / CELL), cy = Math.floor(q.y / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const a = g.get((cx + ox + 512) * 1024 + cy + oy + 512);
        if (!a) continue;
        for (const e of a) if (!e.dead && !e.fade && e.wcd <= 0 && hyp(e.x - q.x, e.y - q.y) < e.r + 14) { e.wcd = 0.45; this.hurt(e, S.power * S.wardMul, 'ward'); this.ev.push({ t: 'spark', x: q.x, y: q.y }); }
      }
    }
    for (let i = 0; i < S.shiki; i++) {
      if ((this.shikiT[i] = (this.shikiT[i] == null ? 0.3 + i * 0.2 : this.shikiT[i]) - dt) > 0) continue;
      const tg = this.nearestFoe(p.x, p.y, 440);
      if (!tg) { this.shikiT[i] = 0.2; continue; }
      this.shikiT[i] = S.shikiRate;
      this.shikiPos(i, q);
      this.shoot(q.x, q.y, Math.atan2(tg.y - q.y, tg.x - q.x), 620, { ally: 1, dmg: S.power * 0.4, life: 1.1, r: 5 });
    }
    if (S.bolt && (this.boltT -= dt) <= 0) {
      this.boltT = S.bolt;
      const c = this.foes.filter((e) => !e.dead && !e.fade && hyp(e.x - p.x, e.y - p.y) < 540);
      if (c.length) {
        const tg = this.rng.pick(c), x = tg.x, y = tg.y;
        this.ev.push({ t: 'bolt', x, y });
        this.hurt(tg, S.power * S.boltMul, 'bolt');
        for (const e of c) if (e !== tg && !e.dead && hyp(e.x - x, e.y - y) < 62) this.hurt(e, S.power * S.boltMul * 0.5, 'bolt');
      } else this.boltT = 0.4;
    }
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const w = this.allies[i];
      w.life -= dt;
      if ((w.rt -= dt) <= 0 || !w.tgt || w.tgt.dead) { w.rt = 0.4; w.tgt = this.nearestFoe(w.x, w.y, 700); }
      const tx = w.tgt ? w.tgt.x : p.x + Math.cos(this.t * 2 + i) * 60, ty = w.tgt ? w.tgt.y : p.y + Math.sin(this.t * 2 + i) * 60;
      const d = hyp(tx - w.x, ty - w.y) || 1, sp = 300;
      w.vx = lerp(w.vx, ((tx - w.x) / d) * sp, 0.12); w.vy = lerp(w.vy, ((ty - w.y) / d) * sp, 0.12);
      w.x += w.vx * dt; w.y += w.vy * dt;
      let gone = w.life <= 0;
      if (w.tgt && d < w.tgt.r + 12) {
        gone = true;
        this.ev.push({ t: 'boom', x: w.x, y: w.y, r: 46, small: 1 });
        for (const e of this.foes) if (!e.dead && !e.fade && hyp(e.x - w.x, e.y - w.y) < 46 + e.r) this.hurt(e, S.power * (e === w.tgt ? w.dmg : w.dmg * 0.5), 'wisp');
      }
      if (gone) { this.allies[i] = this.allies[this.allies.length - 1]; this.allies.pop(); }
    }
  },
  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      if ((z.tick -= dt) <= 0) {
        z.tick = 0.25;
        for (const e of this.foes) {
          if (e.dead || e.fade || e.x < z.minx || e.x > z.maxx || e.y < z.miny || e.y > z.maxy || !pointInPoly(z.poly, e.x, e.y)) continue;
          this.hurt(e, (z.dps + e.mhp * this.S.pct * (e.boss ? 0.15 : 1)) * 0.25, 'burn');
        }
      }
      if (z.t <= 0) { this.zones[i] = this.zones[this.zones.length - 1]; this.zones.pop(); }
    }
  },

  // ---- bosses
  spawnBoss() {
    const st = this.stageDef(), p = this.p;
    this.bossOn = true;
    const a = this.rng() * TAU;
    let x = p.x + Math.cos(a) * 560, y = p.y + Math.sin(a) * 560;
    const d = hyp(x, y), lim = this.arenaR - 160;
    if (d > lim) { x *= lim / d; y *= lim / d; }
    if (hyp(x - p.x, y - p.y) < 380) { x = -p.x * 0.4; y = -p.y * 0.4; }
    const b = this.addFoe(st.boss, x, y, { st: 2.2, heavy: 1 });
    this.boss = b;
    if (st.boss === 'mukade') {
      this.bossParts = [];
      b.hp = b.mhp = b.hp;
      for (let i = 0; i < 13; i++) this.bossParts.push(this.addFoe('mukseg', x - Math.cos(a) * 24 * (i + 1), y - Math.sin(a) * 24 * (i + 1), { heavy: 1, part: 1, hp: FOES.mukseg.hp * this.nm.hp * (1 + 1.5 * this.loop) }));
      for (const s of this.bossParts) s.mhp = s.hp;
      b.a = a + Math.PI;
    }
    if (st.boss === 'kyubi') { b.real = 1; b.s = -1; b.st = 1.2; b.cyc = 0; }
    if (st.boss === 'kuubou') { b.x = 0; b.y = -260; if (hyp(b.x - p.x, b.y - p.y) < 380) b.y = 260; b.ba = 0; b.bt = 0; b.gate = [0.66, 0.33]; }
    this.ev.push({ t: 'boss', k: st.boss, x: b.x, y: b.y });
  },
  bossHp() {
    const b = this.boss;
    if (!b) return 0;
    let hp = Math.max(0, b.hp), mx = b.mhp;
    if (this.bossParts && b.k === 'mukade') for (const s of this.bossParts) { mx += s.mhp; if (!s.dead) hp += Math.max(0, s.hp); }
    return hp / mx;
  },
});

const BOSS_AI = {
  hyakume(w, e, dt, slow) {
    const p = w.p, dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (e.frozen > 0) e.frozen = 0;
    e.x += ux * e.spd * slow * dt; e.y += uy * e.spd * slow * dt;
    if (d < e.r + 10) w.hitPlayer(e.x, e.y);
    if ((e.st -= dt) > 0) { e.tele = e.st < 0.5 ? 1 : 0; return; }
    const rage = e.hp < e.mhp * 0.5;
    e.s = (e.s + 1) % 2;
    if (e.s) {
      const n = rage ? 18 : 13, off = w.rng() * TAU;
      for (let i = 0; i < n; i++) w.shoot(e.x, e.y, off + (i * TAU) / n, 112 * w.nm.shot);
      if (rage) for (const j of [-0.22, 0, 0.22]) w.shoot(e.x, e.y, Math.atan2(uy, ux) + j, 175 * w.nm.shot);
    } else for (let i = 0, n = rage ? 7 : 5; i < n; i++) { const a = w.rng() * TAU; w.addFoe('eyeling', e.x + Math.cos(a) * 62, e.y + Math.sin(a) * 62); }
    e.st = rage ? 2.5 : 3.4;
    w.ev.push({ t: 'cast', x: e.x, y: e.y });
  },

  mukade(w, e, dt, slow) {
    const p = w.p;
    e.st -= dt;
    if (e.st <= 0) { e.s = e.s ? 0 : 1; e.st = e.s ? 3.8 : 5.2; e.turn = w.rng.chance(0.5) ? 1 : -1; if (e.s) w.ev.push({ t: 'cast', x: e.x, y: e.y }); }
    let sp, want, tr;
    if (e.s) { sp = 108; want = e.a + (e.turn || 1) * 2; tr = 2.7; }
    else { sp = e.spd; want = Math.atan2(p.y + p.vy * 0.4 - e.y, p.x + p.vx * 0.4 - e.x); tr = 1.9; }
    if (hyp(e.x, e.y) > w.arenaR - 110) { want = Math.atan2(-e.y, -e.x); tr = 3.2; }
    e.a += clamp(angDiff(e.a, want), -tr * dt, tr * dt);
    e.x += Math.cos(e.a) * sp * slow * dt; e.y += Math.sin(e.a) * sp * slow * dt;
    let prev = e;
    const parts = w.bossParts, live = [e];
    for (const s of parts) {
      if (s.dead) continue;
      const dx = prev.x - s.x, dy = prev.y - s.y, d = hyp(dx, dy) || 1;
      if (d > 24) { s.x = prev.x - (dx / d) * 24; s.y = prev.y - (dy / d) * 24; }
      s.a = Math.atan2(dy, dx);
      prev = s; live.push(s);
    }
    for (const s of live) {
      if (hyp(p.x - s.x, p.y - s.y) < s.r + 9) w.hitPlayer(s.x, s.y);
      if (w.cutCd <= 0 && w.tx.length > 3) { const k = w.trailTouch(s.x, s.y, s.r - 6); if (k > 0) { w.cutTrail(k, s.x, s.y); w.cutCd = 0.5; } }
    }
  },

  daitengu(w, e, dt, slow) {
    const p = w.p, dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const rage = e.hp < e.mhp * 0.5;
    e.st -= dt; e.tele = 0; e.guard = 0.5;
    if (d < e.r + 10) w.hitPlayer(e.x, e.y);
    if (e.s === 0) {
      const want = 290, k = d > want + 40 ? 1 : d < want - 40 ? -1 : 0, sg = e.ph > Math.PI ? 1 : -1;
      e.x += (ux * k - uy * sg * 0.7) * e.spd * slow * dt; e.y += (uy * k + ux * sg * 0.7) * e.spd * slow * dt;
      if ((e.fan = (e.fan == null ? 0.7 : e.fan) - dt) <= 0) { e.fan = 0.75; const a0 = Math.atan2(uy, ux); for (let i = -2; i <= 2; i++) w.shoot(e.x, e.y, a0 + i * 0.17, 195 * w.nm.shot); w.ev.push({ t: 'shot', x: e.x, y: e.y }); }
      if (e.st <= 0) { e.s = 1; e.st = 0.8; e.lx = ux; e.ly = uy; e.ph = w.rng() * TAU; }
    } else if (e.s === 1) {
      e.tele = 2;
      if (e.st > 0.25) { e.lx = ux; e.ly = uy; }
      if (e.st <= 0) { e.s = 2; e.st = 0.78; w.ev.push({ t: 'swoop', x: e.x, y: e.y }); }
    } else if (e.s === 2) {
      e.tele = 3;
      e.x += e.lx * 820 * slow * dt; e.y += e.ly * 820 * slow * dt;
      const dc = hyp(e.x, e.y); if (dc > w.arenaR - 40) { e.x *= (w.arenaR - 40) / dc; e.y *= (w.arenaR - 40) / dc; e.st = 0; }
      if (w.cutCd <= 0 && w.tx.length > 3) { const k = w.trailTouch(e.x, e.y, e.r); if (k > 0) { w.cutTrail(k, e.x, e.y); w.cutCd = 0.4; } }
      if (e.st <= 0) {
        if (rage && !e.twice && w.rng.chance(0.6)) { e.twice = 1; e.s = 1; e.st = 0.6; e.lx = ux; e.ly = uy; }
        else { e.twice = 0; e.s = 3; e.st = rage ? 1.8 : 2.2; if (rage && w.rng.chance(0.5)) for (let i = 0; i < 2; i++) { const a = w.rng() * TAU; w.addFoe('tengu', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90); } }
      }
    } else {
      e.guard = 1.5; e.tele = 4;       // winded: this is the opening
      if (e.st <= 0) { e.s = 0; e.st = rage ? 1.5 : 2.0; }
    }
  },

  kyubi(w, e, dt, slow) {
    const p = w.p;
    e.st -= dt; e.guard = 1; e.tele = 0;
    if (hyp(p.x - e.x, p.y - e.y) < e.r + 10) w.hitPlayer(e.x, e.y);
    if (e.s === -1 || (e.s === 1 && e.st <= 0)) {
      // split: the fox and its shadows take up a ring around the ground's centre
      e.s = 0; e.st = 15; e.struck = 0;
      const n = Math.min(6, 3 + (e.cyc++)), R = Math.min(330, w.arenaR - 200), a0 = w.rng() * TAU, real = w.rng.int(n + 1);
      e.kin = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i * TAU) / (n + 1);
        if (i === real) { e.ra = a; e.rr = R; }
        else e.kin.push(w.addFoe('kyubi', Math.cos(a) * R, Math.sin(a) * R, { illu: 1, boss: 0, hp: 1, r: 28, ra: a, rr: R, st: 1 + i * 0.5, noDrop: 1, heavy: 1, part: 1, def: Object.assign({}, BOSSES.kyubi, { ai: 'part' }) }));
      }
      w.ev.push({ t: 'cast', x: e.x, y: e.y });
    }
    if (e.s === 0) {
      const all = [e].concat(e.kin.filter((k) => !k.dead));
      for (const k of all) {
        k.ra += 0.62 * clamp(Math.sin(e.t * 1.05) * 2.2, 0, 1) * slow * dt;
        const tx = Math.cos(k.ra) * k.rr, ty = Math.sin(k.ra) * k.rr;
        k.x = lerp(k.x, tx, 0.08); k.y = lerp(k.y, ty, 0.08);
        if (k !== e) { k.t += dt; if (k.fl > 0) k.fl -= dt; if (hyp(p.x - k.x, p.y - k.y) < k.r + 9) w.hitPlayer(k.x, k.y); }
        if ((k.ft = (k.ft == null ? 1.5 + w.rng() * 2 : k.ft) - dt) <= 0) { k.ft = 2.4; w.shoot(k.x, k.y, Math.atan2(p.y - k.y, p.x - k.x), 150 * w.nm.shot); }
      }
      if (e.struck || e.st <= 0) {
        // caught (or the dance has run its course): the shadows scatter and the fox reels
        for (const k of e.kin) if (!k.dead) { k.dead = 1; w.ev.push({ t: 'kill', x: k.x, y: k.y, r: k.r, col: e.def.col, k: 'kyubi', illu: 1 }); }
        e.kin = [];
        e.s = 1; e.st = e.struck ? 3.4 : 1.2; e.sa = w.rng() * TAU; e.sp = 0;
        if (e.struck) w.ev.push({ t: 'stagger', x: e.x, y: e.y });
      }
    } else {
      e.guard = 1.5; e.tele = 4;
      e.sa += 2.4 * dt;
      if ((e.sp -= dt) <= 0) { e.sp = 0.13; w.shoot(e.x, e.y, e.sa, 128 * w.nm.shot); w.shoot(e.x, e.y, e.sa + Math.PI, 128 * w.nm.shot); }
    }
  },

  kuubou(w, e, dt, slow) {
    const p = w.p, dx = p.x - e.x, dy = p.y - e.y, d = hyp(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const f = e.hp / e.mhp;
    e.x += ux * e.spd * slow * dt; e.y += uy * e.spd * slow * dt;
    if (d < e.r + 10) w.hitPlayer(e.x, e.y);
    // the eclipse closes the ground in
    const want = lerp(620, ARENA, clamp(f, 0, 1));
    if (w.arenaR > want) w.arenaR = Math.max(want, w.arenaR - 14 * dt);
    // cores: while any lives, the sun cannot be harmed
    if (!e.shielded && e.gate.length && f <= e.gate[0]) {
      e.gate.shift(); e.shielded = 1; e.cores = [];
      for (let i = 0; i < 3; i++) e.cores.push(w.addFoe('core', e.x, e.y, { heavy: 1, part: 1, oa: (i * TAU) / 3, hp: FOES.core.hp * w.nm.hp * (1 + 1.5 * w.loop) }));
      for (const c of e.cores) c.mhp = c.hp;
      w.ev.push({ t: 'cores', x: e.x, y: e.y });
    }
    if (e.shielded) {
      let alive = 0;
      for (const c of e.cores) { if (c.dead) continue; alive++; c.oa += 0.36 * slow * dt; c.x = e.x + Math.cos(c.oa) * 118; c.y = e.y + Math.sin(c.oa) * 118; if (hyp(p.x - c.x, p.y - c.y) < c.r + 9) w.hitPlayer(c.x, c.y); }
      if (!alive) { e.shielded = 0; e.stun = 0; w.ev.push({ t: 'stagger', x: e.x, y: e.y }); }
    }
    // two slow beams once it is half spent
    if (f < 0.5) {
      e.bt = Math.min(1, e.bt + dt / 1.6);
      e.ba += 0.32 * slow * dt;
      if (e.bt >= 1) for (let k = 0; k < 2; k++) { const a = e.ba + k * Math.PI; if (distToSeg(p.x, p.y, e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, e.x + Math.cos(a) * 1500, e.y + Math.sin(a) * 1500) < 13) w.hitPlayer(e.x, e.y); }
    }
    if ((e.st -= dt) > 0) { e.tele = e.st < 0.5 ? 1 : 0; return; }
    e.st = f < 0.33 ? 2.3 : 3.1;
    const pick = e.s = (e.s + 1) % 4;
    w.ev.push({ t: 'cast', x: e.x, y: e.y });
    if (pick === 0) { w.spawnPack('wisp', 9); w.spawnPack('lantern', 2); }
    else if (pick === 1) {
      const n = 26, off = w.rng() * TAU, gap = w.rng.int(n);
      for (let i = 0; i < n; i++) { const q = (i - gap + n) % n; if (q < 4 || (q >= 13 && q < 17)) continue; w.shoot(e.x, e.y, off + (i * TAU) / n, 108 * w.nm.shot); }
    } else if (pick === 2) { const a0 = Math.atan2(uy, ux); for (let i = 0; i < 6; i++) w.shoot(e.x + ux * e.r, e.y + uy * e.r, a0 + (i - 2.5) * 0.05, (150 + i * 22) * w.nm.shot); }
    else { w.spawnPack('doll', 8); if (f < 0.6) w.spawnPack('oni', 1); }
  },
};

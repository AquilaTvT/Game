// ---------- the simulation: no drawing, no sound, no DOM — it only pushes events for the front end ----------
const ARENA = 1100;          // radius of the warded ground
const SPAWN_R = 760;         // yokai appear this far from the spirit
const STEP = 1 / 60;
const STAGE_HP = [1, 1.6, 2.4, 3.4, 4.6];
const xpNeed = (l) => Math.floor(5 + l * 4 + l * l * 0.45);

class World {
  constructor(o) {
    this.seed = String(o.seed || makeSeed());
    this.rng = makeRng(hashStr(this.seed));
    this.heroId = HEROES[o.hero] ? o.hero : 'fox';
    this.hero = HEROES[this.heroId];
    this.night = clamp(o.night || 1, 1, NIGHT_MAX);
    this.nm = nightMods(this.night);
    this.daily = o.daily || null;
    this.boons = o.boons || {};
    this.endless = false;
    this.t = 0; this.stage = 0; this.stageT = 0; this.loop = 0;
    this.phase = 'play';             // play · choice · dead · won
    this.pending = null;
    this.lv = Object.assign({}, this.hero.start);
    this.evo = {}; this.rel = {}; this.banned = {};
    this.rerolls = 1 + (this.boons.reroll || 0); this.banishes = this.boons.banish || 0;
    this.revives = this.boons.charm ? 1 : 0;
    this.level = 1; this.xp = 0; this.need = xpNeed(1); this.due = 0;
    this.stats = { kills: 0, seals: 0, maxRing: 0, orbs: 0, hits: 0, dmg: 0, bosses: 0, stageHits: 0, score: 0 };
    this.p = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, hp: 1, inv: 1.2, dash: 0, dashN: 1, dashT: 0, dx: 0, dy: -1, shield: 0, shieldT: 0, slowT: 0 };
    this.recalc();
    this.p.hp = this.S.maxHp;
    this.p.shield = this.S.shield ? 1 : 0;
    this.tx = []; this.ty = []; this.tl = 0;          // the trail
    this.foes = []; this.shots = []; this.souls = []; this.zones = []; this.allies = []; this.timers = [];
    this.boss = null; this.bossParts = null;
    this.ev = [];
    this.lastSeal = -9; this.combo = 0; this.sealedKills = 0; this.healCount = 0;
    this.slowAll = 0; this.boltT = 2; this.shikiT = []; this.arenaR = ARENA;
    this.wt = []; this.bossOn = false; this.clearT = 0; this.cutCd = 0; this.cutters = 0;
    this.beginStage(o.stage || 0);
    if (o.save) this.restore(o.save);
  }

  // ---- derived numbers: everything a talisman, relic or boon changes ends up here
  recalc() {
    const H = this.hero, B = this.boons, R = this.rel, E = this.evo;
    const lv = (k) => this.lv[k] || 0;
    const S = this.S = {};
    S.power = 10 * (1 + 0.25 * lv('power')) * (1 + 0.04 * (B.power || 0)) * (H.sealMul || 1) * (R.glass ? 1.6 : 1);
    S.multi = 0.05 + (lv('multi') ? 0.05 + 0.03 * lv('multi') : 0);
    S.trail = H.trail * (1 + 0.18 * lv('long')) * (1 + 0.04 * (B.trail || 0)) * (R.tail ? 1.4 : 1);
    S.speed = H.spd * (1 + 0.07 * lv('swift')) * (R.tail ? 0.94 : 1);
    S.agil = 12 + 1.2 * lv('swift');
    S.magnet = 95 * (1 + 0.35 * lv('magnet')) * (1 + 0.1 * (B.magnet || 0));
    S.xpMul = (1 + 0.05 * lv('magnet')) * (1 + 0.03 * (B.xp || 0)) * (R.gold ? 1.3 : 1);
    S.maxHp = Math.max(1, H.hp + lv('vital') + (B.heart || 0) - (R.glass ? 1 : 0));
    S.dashCd = 2.6 * (1 - 0.12 * lv('dash'));
    S.dashMax = lv('dash') >= 5 ? 3 : lv('dash') >= 3 ? 2 : 1;
    S.chain = lv('chain'); S.chainMul = 0.5 + 0.1 * lv('chain'); S.chainJump = E.tenbatsu ? 2 : 1;
    const bm = H.burnMul || 1, reach = E.zero ? 1.5 : 1;
    S.burn = lv('burn') ? (0.25 + 0.15 * lv('burn')) * bm : 0; S.burnDur = 2.5 + 0.5 * lv('burn');
    S.frost = lv('frost') ? (50 + 25 * lv('frost')) * reach : 0; S.frostDur = 0.9 + 0.3 * lv('frost');
    S.pull = lv('pull') ? (30 + 22 * lv('pull')) * reach : 0;
    S.blast = lv('blast') ? 60 + 25 * lv('blast') : 0; S.blastMul = 0.4 + 0.15 * lv('blast');
    S.echo = lv('echo') ? (lv('echo') >= 4 ? 2 : 1) + (E.kodama ? 1 : 0) : 0; S.echoMul = E.kodama ? 1 : 0.3 + 0.12 * lv('echo');
    S.wisp = lv('wisp') ? 0.12 + 0.09 * lv('wisp') : 0; S.wispMax = lv('wisp') ? (3 + 2 * lv('wisp')) * (E.hyakki ? 2 : 1) : 0;
    S.exec = lv('exec') ? 0.06 + 0.06 * lv('exec') : 0; S.execBoss = 0.08 * lv('exec');
    S.great = lv('great') ? 1.25 + 0.2 * lv('great') : 0;
    S.ink = lv('ink') ? (0.45 + 0.25 * lv('ink')) * bm * (E.gouka ? 2 : 1) : 0;
    S.shock = lv('shock') ? 0.4 + 0.2 * lv('shock') : 0;
    S.shiki = lv('shiki') ? lv('shiki') + (R.orbit ? 2 : 0) : 0; S.shikiRate = E.hyakki ? 0.45 : 0.9;
    S.ward = lv('ward') ? 1 + lv('ward') + (R.orbit ? 2 : 0) : 0; S.wardMul = 0.4 + 0.1 * lv('ward');
    S.bolt = lv('bolt') ? 3.4 - 0.45 * lv('bolt') : 0; S.boltMul = 1.1 + 0.3 * lv('bolt');
    S.shield = lv('shield') ? 17 - 2 * lv('shield') : 0;
    S.pct = E.gouka ? 0.04 : 0;
    S.inv = 1.5 + (R.thorn ? 0.6 : 0);
  }

  // ---- one fixed step.  inp: { x, y } wanted direction (length 0..1), dash: pressed this step
  step(inp) {
    if (this.phase !== 'play') return;
    const dt = STEP;
    this.t += dt; this.stageT += dt;
    if (this.slowAll > 0) this.slowAll -= dt;
    this.movePlayer(dt, inp);
    this.director(dt);
    this.updateFoes(dt);
    this.updateShots(dt);
    this.updateAux(dt);
    this.updateZones(dt);
    this.updateSouls(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      if (!tm) continue;
      if ((tm.t -= dt) <= 0) { this.timers[i] = this.timers[this.timers.length - 1]; this.timers.pop(); this.fire(tm); }
    }
    if (this.clearT > 0 && (this.clearT -= dt) <= 0) this.stageCleared();
    if (this.due > 0 && this.phase === 'play' && !this.clearT) this.rollChoices();
  }

  movePlayer(dt, inp) {
    const p = this.p, S = this.S;
    if (p.inv > 0) p.inv -= dt;
    if (p.slowT > 0) p.slowT -= dt;
    // dash charges come back one at a time
    if (p.dashN < S.dashMax) { p.dashT += dt; if (p.dashT >= S.dashCd) { p.dashT = 0; p.dashN++; } }
    if (S.shield && !p.shield) { p.shieldT += dt; if (p.shieldT >= S.shield) { p.shield = 1; p.shieldT = 0; this.ev.push({ t: 'shieldUp' }); } }
    let ix = inp.x || 0, iy = inp.y || 0;
    const il = hyp(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }
    if (il > 0.05) { const n = hyp(ix, iy) || 1; p.dx = ix / n; p.dy = iy / n; }
    if (inp.dash && p.dashN > 0 && p.dash <= 0) {
      p.dashN--; p.dash = 0.2; p.inv = Math.max(p.inv, 0.32);
      p.ddx = p.dx; p.ddy = p.dy;
      this.ev.push({ t: 'dash', x: p.x, y: p.y });
    }
    if (p.dash > 0) {
      p.dash -= dt;
      const sp = S.speed * 3.1;
      p.vx = p.ddx * sp; p.vy = p.ddy * sp;
    } else {
      const sp = S.speed * (p.slowT > 0 ? 0.55 : 1), k = 1 - Math.exp(-dt * S.agil);
      p.vx += (ix * sp - p.vx) * k; p.vy += (iy * sp - p.vy) * k;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const d = hyp(p.x, p.y), lim = this.arenaR - 16;
    if (d > lim) { p.x *= lim / d; p.y *= lim / d; }
    if (hyp(p.vx, p.vy) > 30) p.a = Math.atan2(p.vy, p.vx);
    // lay the trail
    const n = this.tx.length;
    if (!n) { this.tx.push(p.x); this.ty.push(p.y); return; }
    const lx = this.tx[n - 1], ly = this.ty[n - 1], seg = hyp(p.x - lx, p.y - ly);
    if (seg < 7) return;
    this.tx.push(p.x); this.ty.push(p.y); this.tl += seg;
    while (this.tl > S.trail && this.tx.length > 2) {
      this.tl -= hyp(this.tx[1] - this.tx[0], this.ty[1] - this.ty[0]);
      this.tx.shift(); this.ty.shift();
    }
    this.checkLoop();
  }

  // did the newest piece of the trail cross an older one?  if so the ground between becomes a seal
  checkLoop() {
    const tx = this.tx, ty = this.ty, n = tx.length;
    if (n < 6) return;
    const ax = tx[n - 2], ay = ty[n - 2], bx = tx[n - 1], by = ty[n - 1];
    for (let k = n - 5; k >= 0; k--) {
      let t = segHit(ax, ay, bx, by, tx[k], ty[k], tx[k + 1], ty[k + 1]);
      // a near miss closes the ring too: brushing the older stroke is enough
      if (t < 0 && k < n - 14 && (tx[k] - bx) * (tx[k] - bx) + (ty[k] - by) * (ty[k] - by) < 144) t = 1;
      if (t < 0) continue;
      const X = ax + (bx - ax) * t, Y = ay + (by - ay) * t;
      const poly = [X, Y];
      for (let i = k + 1; i <= n - 2; i++) poly.push(tx[i], ty[i]);
      if (poly.length < 8 || Math.abs(polyArea(poly)) < 700) return;
      if (!this.evo.mugen) {
        // the ring is spent: the stroke goes on from where it closed
        const hx = tx[n - 1], hy = ty[n - 1];
        tx.length = k + 1; ty.length = k + 1;
        tx.push(X, hx); ty.push(Y, hy);
        let l = 0;
        for (let i = 1; i < tx.length; i++) l += hyp(tx[i] - tx[i - 1], ty[i] - ty[i - 1]);
        this.tl = l;
      }
      this.seal(poly, 1, false);
      return;
    }
  }

  cutTrail(i, x, y) {
    // everything behind the cut is lost
    if (i <= 0 || i >= this.tx.length) return;
    this.tx.splice(0, i); this.ty.splice(0, i);
    let l = 0;
    for (let k = 1; k < this.tx.length; k++) l += hyp(this.tx[k] - this.tx[k - 1], this.ty[k] - this.ty[k - 1]);
    this.tl = l;
    this.ev.push({ t: 'cut', x, y });
  }
  clearTrail() { this.tx.length = 0; this.ty.length = 0; this.tl = 0; }

  // ---- 封: resolve a closed ring
  seal(poly, mul, echo) {
    const S = this.S, R = this.rel, foes = this.foes;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i += 2) { const x = poly[i], y = poly[i + 1]; cx += x; cy += y; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    cx /= poly.length / 2; cy /= poly.length / 2;
    const area = Math.abs(polyArea(poly));
    const reach = Math.max(S.pull, S.frost, S.blast, S.chain ? 230 : 0) + 40;
    const inside = [], near = [];
    for (const e of foes) {
      if (e.dead || e.x < minx - reach || e.x > maxx + reach || e.y < miny - reach || e.y > maxy + reach) continue;
      const inPoly = pointInPoly(poly, e.x, e.y);
      const d = inPoly ? 0 : distToPoly(poly, e.x, e.y);
      if (inPoly || d < e.r * 0.5) { if (!e.fade) inside.push(e); } else { e._d = d; near.push(e); }
    }
    // 风: sweep the nearest ones in before the ring bites
    if (S.pull && !echo) {
      for (let i = near.length - 1; i >= 0; i--) {
        const e = near[i];
        if (e._d > S.pull || e.boss || e.fade) continue;
        for (let k = 0; k < 6 && !pointInPoly(poly, e.x, e.y); k++) { e.x = lerp(e.x, cx, 0.35); e.y = lerp(e.y, cy, 0.35); }
        inside.push(e); near[i] = near[near.length - 1]; near.pop();
      }
    }
    const n = inside.length;
    let dmg = S.power * mul * (1 + S.multi * Math.min(Math.max(0, n - 1), 24));
    const great = n >= 6 && S.great > 0;
    if (great) dmg *= S.great;
    if (!echo) {
      if (R.first && this.t - this.lastSeal > 4) dmg *= 2.5;
      if (R.tiny && area < 9000) dmg *= 2;
      if (R.huge) dmg *= 1 + Math.min(1.5, area / 100000);
      if (R.combo) { this.combo = this.t - this.lastSeal < 2.5 ? Math.min(5, this.combo + 1) : 0; dmg *= 1 + 0.2 * this.combo; }
      this.lastSeal = this.t;
      this.stats.seals++;
      if (n > this.stats.maxRing) this.stats.maxRing = n;
    }
    let kills = 0;
    const base = dmg;
    for (const e of inside) {
      let d = base;
      if (e.frozen > 0 && this.evo.zero) d *= 2;
      if (e.boss) d *= 1 + S.execBoss;
      this.hurt(e, d, 'seal');
      if (!e.dead && S.exec && !e.boss && e.hp < e.mhp * S.exec) this.kill(e, 'seal');
      if (e.dead) kills++;
    }
    // orbs caught in the ring are snuffed out (or turned back)
    let orbs = 0;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const b = this.shots[i];
      if (b.ally || b.x < minx || b.x > maxx || b.y < miny || b.y > maxy || !pointInPoly(poly, b.x, b.y)) continue;
      orbs++;
      if (R.mirror) { b.ally = 1; b.dmg = S.power; b.home = 1; b.life = 3; b.vx = -b.vx; b.vy = -b.vy; } else { this.shots[i] = this.shots[this.shots.length - 1]; this.shots.pop(); if (orbs % 3 === 0) this.dropSoul(b.x, b.y, 1); }
    }
    this.stats.orbs += orbs;
    if (n || orbs || !echo) this.ev.push({ t: 'seal', poly, n, kills, orbs, cx, cy, area, great, echo, dmg: base });
    if (n) {
      // 雷
      if (S.chain) {
        let src = 0;
        for (const e of inside) {
          if (src++ >= 10) break;
          let fx = e.x, fy = e.y;
          const used = [];
          for (let j = 0; j < S.chain * S.chainJump; j++) {
            let best = null, bd = 230 * 230;
            for (const q of near) { if (q.dead || q.fade || used.includes(q)) continue; const dd = (q.x - fx) * (q.x - fx) + (q.y - fy) * (q.y - fy); if (dd < bd) { bd = dd; best = q; } }
            if (!best) break;
            used.push(best);
            this.ev.push({ t: 'zap', x1: fx, y1: fy, x2: best.x, y2: best.y });
            this.hurt(best, base * S.chainMul, 'zap');
            if (S.chainJump > 1 && j % 2 === 0) { fx = best.x; fy = best.y; }
          }
          if (this.evo.tenbatsu && !echo) { this.ev.push({ t: 'bolt', x: e.x, y: e.y }); if (!e.dead) this.hurt(e, base * 0.6, 'bolt'); }
        }
      }
      // 缚灵
      if (S.wisp && kills) for (let k = 0; k < kills && this.allies.length < S.wispMax; k++) if (this.rng.chance(S.wisp)) this.allies.push({ x: cx + this.rng.range(-20, 20), y: cy + this.rng.range(-20, 20), vx: 0, vy: 0, life: this.evo.hyakki ? 1e9 : 9, tgt: null, rt: 0, dmg: 0.8 });
    }
    if (!echo) {
      // 冰 / 爆 reach outward from the ring
      if (S.frost) { let any = 0; for (const e of near) if (!e.dead && e._d < S.frost && !e.boss) { e.frozen = Math.max(e.frozen, S.frostDur); any = 1; } if (any || n) this.ev.push({ t: 'frost', poly, r: S.frost }); }
      if (S.blast) {
        for (const e of near) if (!e.dead && e._d < S.blast) { this.hurt(e, base * S.blastMul, 'blast'); if (!e.boss && !e.dead) { const dd = hyp(e.x - cx, e.y - cy) || 1; e.kx = ((e.x - cx) / dd) * 260; e.ky = ((e.y - cy) / dd) * 260; } }
        this.ev.push({ t: 'blast', poly, cx, cy, r: S.blast });
      }
      if (S.burn) this.zones.push({ poly, minx, miny, maxx, maxy, t: S.burnDur, dps: S.power * S.burn, tick: 0 });
      for (let k = 1; k <= S.echo; k++) this.timers.push({ t: 0.5 * k, f: 'echo', poly, mul: S.echoMul });
      if (R.slow && n >= 5) this.slowAll = 1.5;
    }
    return n;
  }

  fire(tm) {
    if (tm.f === 'echo') this.seal(tm.poly, tm.mul, true);
    else if (tm.f === 'boom') this.boom(tm.x, tm.y, tm.r, tm.dmg, !!tm.pl);
    else if (tm.f === 'spawn') this.addFoe(tm.k, tm.x, tm.y, tm.o);
  }
  boom(x, y, r, dmg, hurtsPlayer) {
    this.ev.push({ t: 'boom', x, y, r });
    for (const e of this.foes) if (!e.dead && !e.fade && hyp(e.x - x, e.y - y) < r + e.r) this.hurt(e, dmg, 'boom');
    if (hurtsPlayer && hyp(this.p.x - x, this.p.y - y) < r * 0.8) this.hitPlayer(x, y);
  }

  // ---- damage
  hurt(e, d, src) {
    if (e.dead || e.fade || d <= 0) return;
    const dot = src === 'burn' || src === 'ink';
    if (e.illu) { this.kill(e, src); return; }
    if (e.guard) d *= e.guard;
    if (e.boss && e.shielded) { if (!dot) this.ev.push({ t: 'block', x: e.x, y: e.y }); return; }
    e.hp -= d; if (!dot || e.fl <= 0) e.fl = dot ? 0.06 : 0.14;
    this.stats.dmg += d;
    if (e.real && src === 'seal') e.struck = 1;
    if (!dot && (e.boss || e.elite || e.part)) this.ev.push({ t: 'dmg', x: e.x, y: e.y - e.r, v: d, src, big: !!e.boss });
    if (e.hp <= 0) this.kill(e, src);
  }
  kill(e, src) {
    if (e.dead) return;
    e.dead = 1;
    const def = e.def;
    if (e.illu) { this.ev.push({ t: 'kill', x: e.x, y: e.y, r: e.r, col: def.col, k: e.k, illu: 1 }); if (src !== 'clear') for (let i = 0; i < 3; i++) this.timers.push({ t: 0.05 * i, f: 'spawn', k: 'foxfire', x: e.x + this.rng.range(-26, 26), y: e.y + this.rng.range(-26, 26) }); return; }
    this.stats.kills++; this.stats.score += Math.round(e.xp * 10 * (1 + 0.5 * this.stage));
    if (src === 'seal') {
      this.sealedKills++;
      if (this.rel.heal && ++this.healCount >= 70) { this.healCount = 0; this.heal(1); }
      if (this.rel.bomb) this.timers.push({ t: 0.08, f: 'boom', x: e.x, y: e.y, r: 70, dmg: this.S.power * 0.35 });
    }
    this.ev.push({ t: 'kill', x: e.x, y: e.y, r: e.r, col: def.col, k: e.k, elite: e.elite, boss: !!e.boss, src });
    if (!e.noDrop) {
      let v = e.xp;
      const n = Math.min(4, Math.max(1, Math.ceil(v / 2)));
      for (let i = 0; i < n; i++) this.dropSoul(e.x + this.rng.range(-e.r, e.r), e.y + this.rng.range(-e.r, e.r), v / n);
      if (this.p.hp < this.S.maxHp && this.rng.chance(e.elite ? 0.35 : 0.012)) this.souls.push({ x: e.x, y: e.y, vx: 0, vy: 0, v: 0, heart: 1, t: 0 });
    }
    if (def.split) for (let i = 0; i < 2; i++) this.timers.push({ t: 0.02, f: 'spawn', k: def.split, x: e.x + (i ? 14 : -14), y: e.y + this.rng.range(-8, 8) });
    if (def.boom) this.timers.push({ t: 0.32, f: 'boom', x: e.x, y: e.y, r: 78, dmg: 22 * STAGE_HP[this.stage % STAGES.length] * this.nm.hp, pl: 1 });
    if (e.boss) this.bossDied(e);
  }
  dropSoul(x, y, v) {
    if (this.souls.length > 420) { const s = this.souls[this.rng.int(this.souls.length)]; if (!s.heart) { s.v += v; return; } }
    const a = this.rng() * TAU, sp = this.rng.range(40, 150);
    this.souls.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v, t: 0 });
  }
  heal(n) {
    const p = this.p;
    if (p.hp >= this.S.maxHp) return false;
    p.hp = Math.min(this.S.maxHp, p.hp + n);
    this.ev.push({ t: 'heal' });
    return true;
  }
  hitPlayer(x, y) {
    const p = this.p;
    if (p.inv > 0 || this.phase !== 'play') return false;
    if (p.shield) { p.shield = 0; p.shieldT = 0; p.inv = 0.7; this.ev.push({ t: 'shield', x: p.x, y: p.y }); this.shove(150, 0); return false; }
    p.hp--; p.inv = this.S.inv;
    this.stats.hits++; this.stats.stageHits++;
    this.clearTrail();
    this.shove(this.rel.thorn ? 230 : 150, this.rel.thorn ? this.S.power * 2 : 0);
    this.ev.push({ t: 'hurt', x: p.x, y: p.y, hp: p.hp });
    if (p.hp <= 0) {
      if (this.revives > 0 || this.rel.revive) {
        if (this.rel.revive) { delete this.rel.revive; p.hp = Math.min(2, this.S.maxHp); } else { this.revives--; p.hp = 1; }
        p.inv = 3; this.shove(320, this.S.power * 6);
        this.ev.push({ t: 'revive', x: p.x, y: p.y });
      } else { this.phase = 'dead'; this.ev.push({ t: 'dead', x: p.x, y: p.y }); }
    }
    return true;
  }
  // throw back what crowds the spirit (after a hit, so one touch never becomes three)
  shove(r, dmg) {
    const p = this.p;
    for (const e of this.foes) {
      if (e.dead || e.boss) continue;
      const d = hyp(e.x - p.x, e.y - p.y);
      if (d > r + e.r) continue;
      const k = 420 / (d || 1);
      e.kx = (e.x - p.x) * k; e.ky = (e.y - p.y) * k; e.stun = Math.max(e.stun, 0.5);
      if (dmg) this.hurt(e, dmg, 'thorn');
    }
    // orbs nearby are only marked: the list may be in the middle of being walked
    for (const b of this.shots) if (!b.ally && hyp(b.x - p.x, b.y - p.y) < r) b.life = 0;
  }

  // ---- souls and levels
  updateSouls(dt) {
    const p = this.p, m = this.S.magnet, all = this.clearT > 0;
    let got = 0;
    for (let i = this.souls.length - 1; i >= 0; i--) {
      const s = this.souls[i];
      s.t += dt;
      const dx = p.x - s.x, dy = p.y - s.y, d = hyp(dx, dy) || 1;
      if (all || s.pull || d < m) {
        s.pull = 1;
        const sp = Math.min(900, 260 + s.t * 500 + (all ? 500 : 0));
        s.vx = (dx / d) * sp; s.vy = (dy / d) * sp;
      } else { s.vx *= 0.9; s.vy *= 0.9; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (d < 20) {
        if (s.heart) { if (!this.heal(1)) this.xp += 3; } else { this.xp += s.v * this.S.xpMul; got++; }
        this.souls[i] = this.souls[this.souls.length - 1]; this.souls.pop();
      }
    }
    if (got) this.ev.push({ t: 'soul', n: got });
    while (this.xp >= this.need) { this.xp -= this.need; this.level++; this.need = xpNeed(this.level); this.due++; }
  }
  rollChoices() {
    const lv = (k) => this.lv[k] || 0;
    const owned = Object.keys(this.lv).length;
    const pool = TALI_IDS.filter((id) => !this.banned[id] && lv(id) < TALIS[id].max && (lv(id) > 0 || owned < 8));
    const out = [];
    for (const id of EVO_IDS) { const e = EVOS[id]; if (!this.evo[id] && lv(e.a) >= TALIS[e.a].max && lv(e.b) >= TALIS[e.b].max) { out.push({ k: 'evo', id }); break; } }
    while (out.length < 3 && pool.length) {
      const id = this.rng.weighted(pool, (q) => TALIS[q].w * (lv(q) > 0 ? 1.7 : 1));
      pool.splice(pool.indexOf(id), 1);
      out.push({ k: 'tali', id, to: lv(id) + 1 });
    }
    if (!out.length) out.push({ k: 'heal' });
    this.pending = { kind: 'level', choices: out };
    this.phase = 'choice';
    this.ev.push({ t: 'level', level: this.level });
  }
  rollRelics() {
    const pool = RELIC_IDS.filter((id) => !this.rel[id] && !this.relUsed[id]);
    this.rng.shuffle(pool);
    this.pending = { kind: 'relic', choices: pool.slice(0, 3).map((id) => ({ k: 'relic', id })) };
    this.phase = 'choice';
  }
  choose(i) {
    const pd = this.pending;
    if (!pd || !pd.choices[i]) return false;
    const c = pd.choices[i], p = this.p;
    if (c.k === 'tali') {
      this.lv[c.id] = c.to;
      if (c.id === 'vital') { this.recalc(); p.hp = Math.min(this.S.maxHp, p.hp + 1); }
    } else if (c.k === 'evo') this.evo[c.id] = 1;
    else if (c.k === 'heal') { if (!this.heal(1)) this.xp += this.need * 0.3; }
    else if (c.k === 'relic') { this.rel[c.id] = 1; this.relUsed[c.id] = 1; }
    this.recalc();
    if (p.hp > this.S.maxHp) p.hp = this.S.maxHp;
    if (this.S.shield && c.id === 'shield' && c.to === 1) p.shield = 1;
    this.pending = null; this.phase = 'play';
    this.ev.push({ t: 'took', c });
    if (pd.kind === 'level') { this.due--; p.inv = Math.max(p.inv, 0.6); if (this.due > 0) this.rollChoices(); } else this.nextStage();
    return true;
  }
  reroll() {
    if (!this.pending || this.pending.kind !== 'level' || this.rerolls <= 0) return false;
    this.rerolls--; this.rollChoices(); return true;
  }
  banish(i) {
    const pd = this.pending;
    if (!pd || pd.kind !== 'level' || this.banishes <= 0 || !pd.choices[i] || pd.choices[i].k !== 'tali') return false;
    this.banishes--; this.banned[pd.choices[i].id] = 1; this.rollChoices(); return true;
  }

  // ---- stages
  beginStage(i) {
    this.stage = i; this.stageT = 0; this.bossOn = false; this.boss = null; this.bossParts = null; this.arenaR = ARENA;
    this.relUsed = this.relUsed || {};
    const st = this.stageDef();
    this.wt = st.waves.map(() => 0.4);
    this.stats.stageHits = 0;
    this.ev.push({ t: 'stage', i, loop: this.loop });
  }
  stageDef() { return STAGES[this.stage % STAGES.length]; }
  hpMul() { return STAGE_HP[this.stage % STAGES.length] * this.nm.hp * (1 + 1.5 * this.loop); }
  bossDied(b) {
    this.stats.bosses++;
    this.stats.score += 500 * (this.stage + 1) * this.night;
    this.ev.push({ t: 'bossdie', x: b.x, y: b.y, k: b.k });
    this.boss = null; this.bossParts = null;
    // everything left of the parade is swept away
    for (const e of this.foes) if (!e.dead) { e.noDrop = e.xp < 2; this.kill(e, 'clear'); }
    for (const b of this.shots) b.life = 0;
    this.timers = this.timers.filter((tm) => tm.f === 'echo');
    this.clearT = 2.2;
  }
  stageCleared() {
    this.clearT = 0;
    this.ev.push({ t: 'clear', i: this.stage, flawless: this.stats.stageHits === 0 });
    if (this.stage % STAGES.length === STAGES.length - 1 && !this.endless) { this.phase = 'won'; this.ev.push({ t: 'won' }); return; }
    this.rollRelics();
    if (!this.pending.choices.length) { this.pending = null; this.phase = 'play'; this.nextStage(); }
  }
  nextStage() {
    this.foes.length = 0; this.shots.length = 0; this.zones.length = 0; this.timers.length = 0;
    this.clearTrail();
    this.heal(1);
    if ((this.stage + 1) % STAGES.length === 0) this.loop++;
    this.beginStage(this.stage + 1);
    this.p.inv = 1.5;
  }
  // after the final night is survived the parade may go round again, harder each time
  goEndless() { if (this.phase !== 'won') return; this.endless = true; this.phase = 'play'; this.rollRelics(); if (!this.pending.choices.length) { this.pending = null; this.phase = 'play'; this.nextStage(); } }

  // ---- checkpoint: a run can be picked up again from the start of its current stage
  checkpoint() {
    return { v: 1, seed: this.seed, rs: this.rng.get(), hero: this.heroId, night: this.night, daily: this.daily, stage: this.stage, loop: this.loop, endless: this.endless, t: this.t,
      lv: this.lv, evo: this.evo, rel: this.rel, relUsed: this.relUsed, banned: this.banned, rerolls: this.rerolls, banishes: this.banishes, revives: this.revives,
      level: this.level, xp: this.xp, due: this.due, hp: this.p.hp, stats: this.stats, healCount: this.healCount };
  }
  restore(s) {
    this.rng.set(s.rs); this.loop = s.loop || 0; this.endless = !!s.endless; this.t = s.t || 0;
    this.lv = Object.assign({}, s.lv); this.evo = Object.assign({}, s.evo); this.rel = Object.assign({}, s.rel); this.relUsed = Object.assign({}, s.relUsed); this.banned = Object.assign({}, s.banned);
    this.rerolls = s.rerolls | 0; this.banishes = s.banishes | 0; this.revives = s.revives | 0;
    this.level = Math.max(1, s.level | 0); this.xp = +s.xp || 0; this.need = xpNeed(this.level); this.due = s.due | 0;
    this.stats = Object.assign(this.stats, s.stats); this.healCount = s.healCount | 0;
    this.recalc();
    this.p.hp = clamp(s.hp | 0, 1, this.S.maxHp);
    this.p.shield = this.S.shield ? 1 : 0;
  }
}

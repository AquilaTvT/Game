// A practice bot: it circles the nearest pack, closes rings, sidesteps what is about to touch it.
// It plays far worse than a person at dodging, but it never tires — good enough to measure the curve.
function makeBot(E, opt) {
  const o = Object.assign({ skill: 1, pick: null }, opt || {});
  const st = { cx: 0, cy: 0, r: 80, dir: 1, hold: 0 };
  const prio = o.pick || ['power', 'multi', 'long', 'echo', 'great', 'burn', 'chain', 'blast', 'swift', 'vital', 'shield', 'magnet', 'ward', 'shiki', 'bolt', 'ink', 'frost', 'pull', 'wisp', 'exec', 'dash', 'shock'];
  function choose(w) {
    const c = w.pending.choices;
    let best = 0, bs = -1;
    for (let i = 0; i < c.length; i++) {
      let s = 0;
      if (c[i].k === 'evo') s = 100; else if (c[i].k === 'relic') s = 10 + w.rng() * 0; else if (c[i].k === 'tali') s = 50 - prio.indexOf(c[i].id) + (w.lv[c[i].id] ? 6 : 0);
      if (s > bs) { bs = s; best = i; }
    }
    w.choose(best);
  }
  // "orbit" style: run rings around a centre that drifts toward where the yokai are thickest; pursuers end up inside the ring
  function orbit(w) {
    const p = w.p, S = w.S, foes = w.foes;
    const R = Math.min((S.trail / (2 * Math.PI)) * 0.9, 96);
    if (st.ox == null) { st.ox = p.x - R; st.oy = p.y; }
    let sx = 0, sy = 0, n = 0;
    const boss = w.boss && !w.boss.shielded ? w.boss : null;
    for (const e of foes) { if (e.dead || e.fade) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 420) { const wgt = (e === boss ? 12 : e.k === 'core' ? 12 : 1) / (60 + d); sx += e.x * wgt; sy += e.y * wgt; n += wgt; } }
    if (n > 0) { const tx = sx / n, ty = sy / n, dx = tx - st.ox, dy = ty - st.oy, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, 90 * E.STEP); st.ox += (dx / d) * sp; st.oy += (dy / d) * sp; }
    else { st.ox += (0 - st.ox) * 0.002; st.oy += (0 - st.oy) * 0.002; }
    const lim = w.arenaR - R - 30, od = Math.hypot(st.ox, st.oy); if (od > lim) { st.ox *= lim / od; st.oy *= lim / od; }
    const dx = p.x - st.ox, dy = p.y - st.oy, d = Math.hypot(dx, dy) || 1, rad = Math.max(-1, Math.min(1, (R - d) / 30));
    let ix = (-dy / d) * st.dir + (dx / d) * rad, iy = (dx / d) * st.dir + (dy / d) * rad, danger = 0;
    // sidestep what stands in the way, looking a little ahead along the path
    const hx = p.x + p.vx * 0.12, hy = p.y + p.vy * 0.12, look = 26 + 12 * o.skill;
    for (const e of foes) { if (e.dead || e.fade) continue; const ex = e.x + e.vx * 0.12, ey = e.y + e.vy * 0.12, qx = hx - ex, qy = hy - ey, q = Math.hypot(qx, qy) - e.r; if (q < look) { const k = ((look - q) / look) * 2.6 * o.skill; ix += (qx / (q + e.r + 1)) * k; iy += (qy / (q + e.r + 1)) * k; if (q < 12) danger = 1; } }
    for (const b of w.shots) { if (b.ally) continue; const qx = hx - (b.x + b.vx * 0.12), qy = hy - (b.y + b.vy * 0.12), q = Math.hypot(qx, qy); if (q < 60) { ix += (qx / q) * 1.6 * o.skill; iy += (qy / q) * 1.6 * o.skill; if (q < 16) danger = 1; } }
    const l = Math.hypot(ix, iy) || 1;
    return { x: ix / l, y: iy / l, dash: danger && p.dashN > 0 && w.rng() < 0.6 * o.skill };
  }
  function input(w) {
    if (o.mode === 'orbit') return orbit(w);
    const p = w.p, S = w.S, foes = w.foes;
    // nearest threat and a pack to circle
    let near = null, nd = 1e9;
    for (const e of foes) { if (e.dead || e.fade) continue; const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r; if (d < nd) { nd = d; near = e; } }
    if ((st.hold -= E.STEP) <= 0 || !st.tgt || st.tgt.dead) {
      st.hold = 1.2;
      // centre of the densest handful near the closest foe (or the boss)
      let anchor = w.boss && Math.hypot(w.boss.x - p.x, w.boss.y - p.y) < 700 && w.rng() < 0.7 ? w.boss : near;
      if (w.boss && w.boss.shielded) { let bd = 1e9; for (const e of foes) if (e.k === 'core' && !e.dead) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; anchor = e; } } }
      st.tgt = anchor;
      if (anchor) {
        let sx = 0, sy = 0, n = 0, far = 0;
        for (const e of foes) { if (e.dead) continue; const d = Math.hypot(e.x - anchor.x, e.y - anchor.y); if (d < 110) { sx += e.x; sy += e.y; n++; } }
        st.cx = sx / n; st.cy = sy / n;
        for (const e of foes) { if (e.dead) continue; const d = Math.hypot(e.x - st.cx, e.y - st.cy); if (d < 110 && d + e.r > far) far = d + e.r; }
        st.r = Math.min(Math.max(50, far + 34), (S.trail / (2 * Math.PI)) * 0.88);
        if (w.rng() < 0.3) st.dir = -st.dir;
      }
    }
    let ix = 0, iy = 0;
    if (st.tgt && !st.tgt.dead) {
      // follow the pack's centre as it moves, and run the circle around it
      const tx = st.tgt.x, ty = st.tgt.y;
      st.cx += (tx - st.cx) * 0.02; st.cy += (ty - st.cy) * 0.02;
      const dx = p.x - st.cx, dy = p.y - st.cy, d = Math.hypot(dx, dy) || 1;
      const rad = (st.r - d) / 40;
      ix = (-dy / d) * st.dir + (dx / d) * Math.max(-1, Math.min(1, rad));
      iy = (dx / d) * st.dir + (dy / d) * Math.max(-1, Math.min(1, rad));
    } else { ix = -p.x; iy = -p.y; }
    // step away from whatever is about to touch
    let ax = 0, ay = 0, danger = 0;
    const look = 20 + 12 * o.skill;
    for (const e of foes) { if (e.dead || e.fade) continue; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) - e.r; if (d < look) { const k = (look - d) / look; ax += (dx / (d + e.r + 1)) * k * 2.2; ay += (dy / (d + e.r + 1)) * k * 2.2; if (d < 16) danger = 1; } }
    for (const b of w.shots) { if (b.ally) continue; const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy); if (d < 70) { ax += (dx / d) * 1.5; ay += (dy / d) * 1.5; if (d < 18) danger = 1; } }
    ix += ax * o.skill; iy += ay * o.skill;
    const l = Math.hypot(ix, iy) || 1;
    return { x: ix / l, y: iy / l, dash: danger && p.dashN > 0 && w.rng() < 0.5 * o.skill };
  }
  function run(w, maxT) {
    const lim = maxT || 3600;
    while (w.t < lim) {
      if (w.phase === 'choice') { choose(w); continue; }
      if (w.phase !== 'play') break;
      w.step(input(w));
      w.ev.length = 0;
    }
    return w;
  }
  return { input, choose, run };
}
module.exports = { makeBot };

// ---------- drawing the night: camera, the stroke, seals, yokai, particles, and the effects that answer the simulation ----------
const BODY = { hyakume: 82, mukade: 62, daitengu: 44, kyubi: 52, kuubou: 46, oni: 31, mud: 33, mudling: 30, mukseg: 28, core: 30, bell: 30, tengu: 24, cutter: 23, eye: 34, eyeling: 30, wisp: 24, foxfire: 24 };
const SEAL_COL = [1.0, 0.42, 0.22];
const VIEW = 540;            // world units across the shorter side of the screen

// ear clipping, for filling the ring a stroke encloses
function triangulate(p) {
  const n = p.length >> 1, out = [];
  if (n < 3) return out;
  const V = new Array(n);
  if (polyArea(p) > 0) for (let i = 0; i < n; i++) V[i] = i; else for (let i = 0; i < n; i++) V[i] = n - 1 - i;
  let nv = n, count = 2 * nv;
  for (let v = nv - 1; nv > 2;) {
    if (count-- <= 0) break;
    let u = v; if (nv <= u) u = 0;
    v = u + 1; if (nv <= v) v = 0;
    let w = v + 1; if (nv <= w) w = 0;
    const ax = p[V[u] * 2], ay = p[V[u] * 2 + 1], bx = p[V[v] * 2], by = p[V[v] * 2 + 1], cx = p[V[w] * 2], cy = p[V[w] * 2 + 1];
    let ear = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 1e-9;
    for (let k = 0; ear && k < nv; k++) {
      if (k === u || k === v || k === w) continue;
      const px = p[V[k] * 2], py = p[V[k] * 2 + 1];
      const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) ear = false;
    }
    if (ear) { out.push(V[u], V[v], V[w]); for (let s = v, t = v + 1; t < nv; s++, t++) V[s] = V[t]; nv--; count = 2 * nv; }
  }
  return out;
}
function thin(poly, max) {
  const n = poly.length >> 1;
  if (n <= max) return poly;
  const step = Math.ceil(n / max), out = [];
  for (let i = 0; i < n; i += step) out.push(poly[i * 2], poly[i * 2 + 1]);
  return out;
}

const FX = {
  MAXP: 5000, pn: 0, head: 0,
  seals: [], rings: [], bolts: [], texts: [], rips: [], ghosts: [],
  shake: 0, flash: 0, hurt: 0, hitstop: 0, slowmo: 0, chroma: 0, time: 0,
  init() {
    const N = this.MAXP;
    this.px = new Float32Array(N); this.py = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N);
    this.life = new Float32Array(N); this.max = new Float32Array(N); this.size = new Float32Array(N); this.drag = new Float32Array(N);
    this.cr = new Float32Array(N); this.cg = new Float32Array(N); this.cb = new Float32Array(N); this.kind = new Uint8Array(N);
  },
  clear() { this.life.fill(0); this.seals.length = 0; this.rings.length = 0; this.bolts.length = 0; this.texts.length = 0; this.rips.length = 0; this.ghosts.length = 0; this.shake = 0; this.flash = 0; this.hurt = 0; this.hitstop = 0; this.slowmo = 0; },
  part(x, y, vx, vy, life, size, r, g, b, kind, drag) {
    const i = this.head; this.head = (i + 1) % this.MAXP;
    this.px[i] = x; this.py[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = life; this.max[i] = life; this.size[i] = size; this.cr[i] = r; this.cg[i] = g; this.cb[i] = b; this.kind[i] = kind || 0; this.drag[i] = drag == null ? 2.5 : drag;
  },
  burst(x, y, n, sp, col, size, life, kind) {
    const few = PROFILE.settings.reduce ? 0.4 : 1;
    for (let i = 0, m = Math.ceil(n * few); i < m; i++) { const a = Math.random() * TAU, s = sp * (0.25 + Math.random() * 0.75); this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.7), col[0], col[1], col[2], kind); }
  },
  ring(x, y, r0, r1, life, col, w) { this.rings.push({ x, y, r0, r1, t: 0, life, col, w: w || 1 }); },
  rip(x, y, str, life) { if (this.rips.length < 6 && !PROFILE.settings.reduce) this.rips.push({ x, y, t: 0, life: life || 0.6, str }); },
  text(str, x, y, size, col, life) { this.texts.push({ str, x, y, size, col, t: 0, life: life || 1 }); },
  bolt(x1, y1, x2, y2, col, w, life) {
    const pts = [x1, y1], d = hyp(x2 - x1, y2 - y1), n = Math.max(2, Math.floor(d / 22)), nx = -(y2 - y1) / (d || 1), ny = (x2 - x1) / (d || 1);
    for (let i = 1; i < n; i++) { const t = i / n, j = (Math.random() - 0.5) * 26; pts.push(lerp(x1, x2, t) + nx * j, lerp(y1, y2, t) + ny * j); }
    pts.push(x2, y2);
    this.bolts.push({ pts, col, w: w || 4, t: 0, life: life || 0.22 });
  },
  kick(s) { if (PROFILE.settings.shake) this.shake = Math.max(this.shake, s); },

  // every event the simulation raises is answered here with light (and by the sound module with sound)
  on(e, w) {
    switch (e.t) {
      case 'seal': {
        const poly = thin(e.poly, 70), R = Math.sqrt(e.area / Math.PI);
        const col = e.great ? [1.0, 0.82, 0.3] : e.echo ? [0.55, 0.8, 1.0] : SEAL_COL;
        this.seals.push({ poly, tri: triangulate(poly), cx: e.cx, cy: e.cy, R, t: 0, life: e.echo ? 0.55 : 0.95, col, n: e.n, rot: Math.random() * TAU, echo: e.echo });
        for (let i = 0; i < poly.length; i += 2) { const dx = poly[i] - e.cx, dy = poly[i + 1] - e.cy, d = hyp(dx, dy) || 1; if (Math.random() < 0.8) this.part(poly[i], poly[i + 1], (dx / d) * (40 + Math.random() * 140), (dy / d) * (40 + Math.random() * 140), 0.35 + Math.random() * 0.5, 5 + Math.random() * 5, col[0], col[1], col[2], 1); }
        if (!e.echo) {
          const k = Math.min(1, e.n / 10);
          this.rip(e.cx, e.cy, 0.012 + 0.03 * k, 0.55);
          this.kick(3 + 13 * k);
          if (e.n >= 6) { this.hitstop = Math.max(this.hitstop, e.n >= 12 ? 0.09 : 0.05); this.flash = Math.max(this.flash, 0.08 + 0.1 * k); }
          this.chroma = Math.max(this.chroma, 0.3 + 0.9 * k);
          if (e.n >= 3) this.text('封×' + e.n, e.cx, e.cy - R * 0.2, clamp(30 + e.n * 2.2, 34, 74), e.great ? [1.0, 0.86, 0.35] : [1, 0.95, 0.9], 1.1);
        }
        break;
      }
      case 'kill': {
        const c = e.col, big = e.boss ? 3 : e.elite ? 1.8 : 1;
        this.burst(e.x, e.y, (e.illu ? 8 : 10) * big, 210 * big, c, 7 * big, 0.55, 0);
        this.burst(e.x, e.y, 5 * big, 320 * big, [1, 1, 1], 4, 0.3, 1);
        this.ring(e.x, e.y, e.r * 0.6, e.r * (e.boss ? 7 : 2.6), e.boss ? 0.7 : 0.28, c, e.boss ? 3 : 1);
        if (e.boss) { this.rip(e.x, e.y, 0.06, 1.2); this.kick(26); this.flash = 0.5; this.slowmo = 1.4; this.hitstop = 0.12; for (let i = 0; i < 5; i++) this.ring(e.x, e.y, 20, 240 + i * 90, 0.6 + i * 0.16, [1, 0.9, 0.7], 2); }
        break;
      }
      case 'dmg': if (PROFILE.settings.dmg && (e.big || e.v >= 8)) this.text(String(Math.round(e.v)), e.x + (Math.random() - 0.5) * 30, e.y - 10, e.big ? 26 : 20, e.src === 'seal' ? [1, 0.9, 0.6] : [0.8, 0.9, 1], 0.7); break;
      case 'zap': this.bolt(e.x1, e.y1, e.x2, e.y2, [0.7, 0.9, 1.0], 4, 0.2); this.burst(e.x2, e.y2, 4, 160, [0.7, 0.9, 1], 4, 0.25, 1); break;
      case 'bolt': this.bolt(e.x + (Math.random() - 0.5) * 60, e.y - 520, e.x, e.y, [0.85, 0.92, 1.0], 7, 0.26); this.ring(e.x, e.y, 8, 70, 0.3, [0.8, 0.9, 1], 2); this.burst(e.x, e.y, 10, 260, [0.8, 0.9, 1], 5, 0.35, 1); this.kick(4); this.flash = Math.max(this.flash, 0.05); break;
      case 'boom': this.ring(e.x, e.y, 6, e.r, 0.3, e.small ? [0.5, 1, 0.8] : [1, 0.6, 0.25], 2.4); this.burst(e.x, e.y, e.small ? 8 : 18, e.r * 3.2, e.small ? [0.5, 1, 0.8] : [1, 0.55, 0.2], 7, 0.45, 0); if (!e.small) { this.kick(6); this.rip(e.x, e.y, 0.012, 0.4); } break;
      case 'blast': this.ring(e.cx, e.cy, 10, Math.sqrt(Math.abs(polyArea(e.poly)) / Math.PI) + e.r, 0.4, [1, 0.8, 0.5], 3); break;
      case 'frost': { const p = e.poly; for (let i = 0; i < p.length; i += 4) this.part(p[i], p[i + 1], (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.7, 6, 0.6, 0.9, 1, 0, 1.5); break; }
      case 'spark': this.burst(e.x, e.y, 3, 150, [0.9, 0.95, 1], 4, 0.22, 1); break;
      case 'shock': this.burst(e.x, e.y, 4, 120, [1, 1, 0.6], 4, 0.25, 1); break;
      case 'cut': this.burst(e.x, e.y, 14, 240, [1, 0.3, 0.3], 5, 0.4, 1); this.ring(e.x, e.y, 4, 46, 0.25, [1, 0.3, 0.3], 2); this.text('断', e.x, e.y - 20, 30, [1, 0.45, 0.4], 0.7); this.kick(5); break;
      case 'hurt': this.hurt = 1; this.kick(18); this.hitstop = 0.1; this.rip(e.x, e.y, 0.03, 0.5); this.burst(e.x, e.y, 26, 380, [1, 0.3, 0.25], 7, 0.6, 0); this.ring(e.x, e.y, 10, 170, 0.35, [1, 0.3, 0.25], 3); break;
      case 'shield': this.ring(e.x, e.y, 20, 150, 0.35, [0.5, 0.9, 1], 3); this.burst(e.x, e.y, 20, 300, [0.5, 0.9, 1], 6, 0.5, 1); this.kick(8); break;
      case 'revive': this.flash = 0.6; this.ring(e.x, e.y, 20, 420, 0.7, [1, 0.9, 0.6], 4); this.rip(e.x, e.y, 0.05, 0.9); this.burst(e.x, e.y, 50, 460, [1, 0.9, 0.6], 8, 0.9, 0); break;
      case 'dead': this.flash = 0.35; this.kick(30); this.slowmo = 1.6; this.rip(e.x, e.y, 0.06, 1.2); this.burst(e.x, e.y, 80, 520, w.hero.col, 9, 1.2, 0); break;
      case 'dash': this.burst(e.x, e.y, 8, 140, w.hero.col, 6, 0.35, 0); break;
      case 'level': this.ring(w.p.x, w.p.y, 20, 260, 0.6, [1, 0.9, 0.5], 3); this.burst(w.p.x, w.p.y, 30, 300, [1, 0.9, 0.5], 6, 0.7, 1); break;
      case 'heal': this.ring(w.p.x, w.p.y, 90, 16, 0.5, [1, 0.45, 0.55], 3); break;
      case 'boss': this.flash = 0.25; this.kick(14); this.rip(e.x, e.y, 0.04, 1.0); for (let i = 0; i < 3; i++) this.ring(e.x, e.y, 300 - i * 60, 30, 0.7 + i * 0.15, [1, 0.3, 0.3], 3); break;
      case 'cast': this.ring(e.x, e.y, 20, 130, 0.35, [1, 0.5, 0.8], 2); break;
      case 'stagger': this.ring(e.x, e.y, 30, 260, 0.5, [1, 0.9, 0.5], 4); this.kick(10); this.flash = Math.max(this.flash, 0.12); break;
      case 'cores': this.ring(e.x, e.y, 200, 40, 0.6, [0.8, 0.5, 1], 4); break;
      case 'toll': this.ring(e.x, e.y, 20, 190, 0.6, [1, 0.85, 0.35], 2); break;
      case 'elite': this.ring(e.x, e.y, 120, 20, 0.6, [1, 0.3, 0.2], 3); break;
      case 'block': this.ring(e.x, e.y, 40, 70, 0.2, [0.8, 0.6, 1], 2); break;
      case 'clear': this.flash = Math.max(this.flash, 0.2); break;
    }
  },
  update(dt) {
    this.time += dt;
    const { px, py, vx, vy, life, drag } = this;
    for (let i = 0; i < this.MAXP; i++) { if (life[i] <= 0) continue; life[i] -= dt; const k = Math.exp(-drag[i] * dt); vx[i] *= k; vy[i] *= k; px[i] += vx[i] * dt; py[i] += vy[i] * dt; }
    const age = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if ((arr[i].t += dt) >= arr[i].life) arr.splice(i, 1); };
    age(this.seals); age(this.rings); age(this.bolts); age(this.texts); age(this.rips); age(this.ghosts);
    this.shake *= Math.exp(-dt * 9); this.flash *= Math.exp(-dt * 7); this.hurt *= Math.exp(-dt * 3.2); this.chroma *= Math.exp(-dt * 4);
  },
};

const Render = {
  cam: { x: 0, y: 0 }, fade: 1, dark: 0, q: { x: 0, y: 0 }, rip: new Float32Array(24),
  init(cv) {
    if (!GL.init(cv)) return false;
    GL.setAtlas(Art.build());
    GL.onRestore = () => GL.setAtlas(Art.cv);
    FX.init();
    return true;
  },
  snap(w) { this.cam.x = w.p.x; this.cam.y = w.p.y; },
  frame(w, dt) {
    if (!GL.ok) return;
    const gl = GL.gl, S = Art.S, F = GL.fbo, p = w.p, T = FX.time;
    const z = Math.min(GL.W, GL.H) / VIEW;
    const k = 1 - Math.exp(-dt * 6);
    this.cam.x += (p.x + p.vx * 0.16 - this.cam.x) * k; this.cam.y += (p.y + p.vy * 0.16 - this.cam.y) * k;
    const sh = FX.shake / z * GL.dpr;
    GL.cam.x = this.cam.x + (Math.random() - 0.5) * sh; GL.cam.y = this.cam.y + (Math.random() - 0.5) * sh; GL.cam.z = z;
    const vw = GL.W / z / 2 + 90, vh = GL.H / z / 2 + 90, cx = GL.cam.x, cy = GL.cam.y;
    const seen = (x, y, r) => x > cx - vw - r && x < cx + vw + r && y > cy - vh - r && y < cy + vh + r;

    // ---- the ground
    GL.pass(GL.prog.bg, F.scene);
    const B = GL.prog.bg.u, hue = w.stageDef().hue;
    gl.disable(gl.BLEND);
    gl.uniform2f(B.uRes, GL.W, GL.H); gl.uniform2f(B.uCam, cx, cy); gl.uniform1f(B.uZoom, z); gl.uniform1f(B.uTime, T);
    gl.uniform3f(B.uHue, hue[0], hue[1], hue[2]); gl.uniform1f(B.uArena, w.arenaR); gl.uniform2f(B.uPl, p.x, p.y); gl.uniform1f(B.uDark, this.dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ---- everything that is a sprite or a strip of light
    GL.begin();
    const hc = w.hero.col;
    // burning ground
    for (const zn of w.zones) {
      if (!zn._p) { zn._p = thin(zn.poly, 50); zn._t = triangulate(zn._p); }
      const a = Math.min(1, zn.t * 1.5) * (0.07 + 0.03 * Math.sin(T * 17 + zn.minx)), c = glow(1.0, 0.42, 0.1, a), P = zn._p, I = zn._t;
      for (let i = 0, m2 = P.length; i < m2; i += 2) { const j = (i + 2) % m2; GL.line(S.band, P[i], P[i + 1], P[j], P[j + 1], 7, glow(1.0, 0.5, 0.15, Math.min(1, zn.t * 1.5) * (0.4 + 0.25 * Math.sin(T * 9 + i)))); }
      for (let i = 0; i < I.length; i += 3) GL.quad(P[I[i] * 2], P[I[i] * 2 + 1], P[I[i + 1] * 2], P[I[i + 1] * 2 + 1], P[I[i + 2] * 2], P[I[i + 2] * 2 + 1], P[I[i + 2] * 2], P[I[i + 2] * 2 + 1], S.white, c);
      for (let q3 = 0; q3 < 2; q3++) { const j = (Math.random() * (P.length >> 1)) | 0; FX.part(lerp(P[j * 2], (zn.minx + zn.maxx) / 2, Math.random()), lerp(P[j * 2 + 1], (zn.miny + zn.maxy) / 2, Math.random()), 0, -40 - Math.random() * 60, 0.5, 5, 1, 0.5, 0.15, 0, 1); }
    }
    // seals: the lit ground, its edge, the turning script
    for (const s of FX.seals) {
      const u = s.t / s.life, f = u < 0.12 ? 1 : Math.pow(1 - (u - 0.12) / 0.88, 1.6), c = s.col;
      const fill = glow(c[0], c[1], c[2], (u < 0.1 ? 0.42 : 0.26 * f)), P = s.poly, I = s.tri;
      for (let i = 0; i < I.length; i += 3) GL.quad(P[I[i] * 2], P[I[i] * 2 + 1], P[I[i + 1] * 2], P[I[i + 1] * 2 + 1], P[I[i + 2] * 2], P[I[i + 2] * 2 + 1], P[I[i + 2] * 2], P[I[i + 2] * 2 + 1], S.white, fill);
      const ec = glow(lerp(c[0], 1, 0.5), lerp(c[1], 1, 0.5), lerp(c[2], 1, 0.5), 0.95 * f), ew = 3 + 7 * f;
      for (let i = 0, n = P.length; i < n; i += 2) { const j = (i + 2) % n; GL.line(S.band, P[i], P[i + 1], P[j], P[j + 1], ew, ec); }
      if (!s.echo) {
        const grow = easeOut(Math.min(1, u * 3.5)), d = s.R * 2.5 * grow;
        GL.spr(S.rune, s.cx, s.cy, d, d, s.rot + s.t * 1.4, glow(c[0], c[1], c[2], 0.95 * f));
        GL.spr(S.rune2, s.cx, s.cy, d * 0.52, d * 0.52, -s.rot - s.t * 2.4, glow(1, 0.9, 0.75, 0.8 * f));
        GL.spr(S.glow, s.cx, s.cy, d * 1.6, d * 1.6, 0, glow(c[0], c[1], c[2], 0.3 * f));
      }
    }
    // souls
    for (const s of w.souls) {
      if (!seen(s.x, s.y, 20)) continue;
      if (s.heart) { GL.spr(S.glow, s.x, s.y, 60, 60, 0, glow(1, 0.3, 0.4, 0.5)); GL.spr(S.heart, s.x, s.y + Math.sin(T * 4) * 2, 26, 26, 0, rgba(1, 1, 1, 1)); }
      else { const sz = 13 + Math.min(10, s.v * 2) + Math.sin(T * 9 + s.x) * 1.5; GL.spr(S.soul, s.x, s.y, sz * 1.9, sz * 1.9, 0, glow(1, 1, 1, 0.9)); }
    }
    // the stroke: a wide soft band of the spirit's colour, and a white-hot core
    const tx = w.tx, ty = w.ty, n = tx.length;
    if (n > 1) {
      const blink = p.inv > 0 && p.hp > 0 ? 0.55 : 1;
      for (let pass = 0; pass < 2; pass++) {
        let lx0 = 0, ly0 = 0, rx0 = 0, ry0 = 0;
        for (let i = 0; i <= n; i++) {
          const x = i < n ? tx[i] : p.x, y = i < n ? ty[i] : p.y;
          const ax = i > 0 ? tx[i - 1] : x, ay = i > 0 ? ty[i - 1] : y, bx = i < n - 1 ? tx[i + 1] : p.x, by = i < n - 1 ? ty[i + 1] : p.y;
          let dx = bx - ax, dy = by - ay; const d = hyp(dx, dy) || 1; dx /= d; dy /= d;
          const u = i / n, wd = (pass ? 4 + 8 * u : 16 + 30 * u) * 0.5;
          const lx = x - dy * wd, ly = y + dx * wd, rx = x + dy * wd, ry = y - dx * wd;
          if (i > 0) {
            const a = (pass ? 0.35 + 0.65 * u : 0.1 + 0.22 * u) * blink;
            const col = pass ? glow(lerp(hc[0], 1, 0.75), lerp(hc[1], 1, 0.75), lerp(hc[2], 1, 0.75), a) : glow(hc[0], hc[1], hc[2], a);
            GL.quad(lx0, ly0, lx, ly, rx0, ry0, rx, ry, S.band, col);
          }
          lx0 = lx; ly0 = ly; rx0 = rx; ry0 = ry;
        }
      }
      // embers fall from it
      if (Math.random() < 0.6 && hyp(p.vx, p.vy) > 60) FX.part(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, -p.vx * 0.15 + (Math.random() - 0.5) * 40, -p.vy * 0.15 + (Math.random() - 0.5) * 40, 0.45, 4, hc[0], hc[1], hc[2], 0, 2);
    }
    // yokai
    for (const e of w.foes) {
      if (e.dead) continue;
      const r = e.r, big = !!BOSSES[e.k];
      if (!seen(e.x, e.y, r * 5 + (e.k === 'kuubou' ? 1600 : 0))) continue;
      const def = e.def, c = def.col, sp = S[e.k] || S.wisp, body = BODY[e.k] || 30, sz = (sp.w * r) / body;
      let a = e.fade ? 0.22 : 1, rot = 0, sx = sz, sy = sz, oy = 0;
      if (e.illu) a = 0.82 + 0.1 * Math.sin(T * 13 + e.ph);
      const wob = 1 + 0.055 * Math.sin(e.t * 6 + e.ph);
      if (e.k === 'cutter') rot = e.t * 11;
      else if (e.k === 'mukseg' || e.k === 'mukade') rot = e.a;
      else if (e.k === 'core') rot = e.t * 2;
      else if (e.k === 'kuubou') rot = T * 0.25;
      else if (e.k === 'wisp' || e.k === 'foxfire' || e.k === 'ghost') { oy = Math.sin(e.t * 4 + e.ph) * 3; sy = sz * wob; }
      else if (e.k === 'tengu') { if (p.x < e.x) sx = -sz; sy = sz * wob; }
      else if (e.k === 'kasa' && e.s === 0) oy = -Math.abs(Math.sin(e.t * 9)) * 9;
      else sy = sz * wob;
      if (e.elite) GL.spr(S.glow, e.x, e.y, r * 6.5, r * 6.5, 0, glow(1, 0.25, 0.15, 0.5 + 0.2 * Math.sin(T * 6)));
      if (big) GL.spr(S.glow, e.x, e.y, r * 7, r * 7, 0, glow(c[0], c[1], c[2], e.real ? 0.5 : 0.26));
      else GL.spr(S.glow, e.x, e.y, r * 3.6, r * 3.6, 0, glow(c[0], c[1], c[2], 0.16 * a));
      if (e.tele === 1) GL.spr(S.ring, e.x, e.y, r * 5, r * 5, 0, glow(1, 0.9, 0.8, 0.5 + 0.5 * Math.sin(T * 40)));
      if (e.tele === 2) { const al = 0.35 + 0.35 * Math.sin(T * 30); GL.line(S.band, e.x, e.y, e.x + e.lx * 900, e.y + e.ly * 900, big ? 26 : 9, glow(1, 0.2, 0.15, al * 0.5)); GL.line(S.band, e.x, e.y, e.x + e.lx * 900, e.y + e.ly * 900, 2, glow(1, 0.6, 0.5, al)); }
      if (e.tele === 3) { for (let i = 1; i <= 4; i++) GL.spr(sp, e.x - e.lx * i * (big ? 34 : 16), e.y - e.ly * i * (big ? 34 : 16), sx, sy, rot, glow(c[0], c[1], c[2], 0.3 - i * 0.06)); }
      if (e.tele === 4) GL.spr(S.ring, e.x, e.y, r * 4.4 + Math.sin(T * 8) * 6, r * 4.4 + Math.sin(T * 8) * 6, T, glow(1, 0.85, 0.4, 0.8));
      if (e.k === 'kuubou' && e.bt > 0) for (let q = 0; q < 2; q++) { const an = e.ba + q * Math.PI, x1 = e.x + Math.cos(an) * r, y1 = e.y + Math.sin(an) * r, x2 = e.x + Math.cos(an) * 1500, y2 = e.y + Math.sin(an) * 1500, on = e.bt >= 1; GL.line(S.band, x1, y1, x2, y2, on ? 44 : 10, glow(0.6, 0.3, 1, on ? 0.35 : 0.18 * e.bt)); if (on) GL.line(S.band, x1, y1, x2, y2, 12 + Math.sin(T * 30) * 3, glow(1, 0.9, 1, 0.95)); }
      const fr = e.frozen > 0;
      GL.spr(sp, e.x, e.y + oy, sx, sy, rot, rgba(fr ? 0.6 : 1, fr ? 0.85 : 1, 1, a));
      if (e.fl > 0) GL.spr(sp, e.x, e.y + oy, sx, sy, rot, glow(1, 1, 1, Math.min(1, e.fl / 0.1)));
      if (fr) GL.spr(S.ring, e.x, e.y, r * 3.4, r * 3.4, 0, glow(0.6, 0.9, 1, 0.8));
      if (e.stun > 0) for (let q2 = 0; q2 < 2; q2++) GL.spr(S.dot, e.x + Math.cos(T * 9 + q2 * Math.PI) * r * 0.9, e.y - r - 6 + Math.sin(T * 9 + q2 * Math.PI) * 3, 7, 7, 0, glow(1, 1, 0.5, 0.95));
      if (e.shielded) GL.spr(S.ring, e.x, e.y, r * 5.2, r * 5.2, -T * 1.5, glow(0.8, 0.5, 1, 0.9));
      if (e.haste > 0) GL.spr(S.spark, e.x, e.y + r, 34, 9, Math.PI / 2, glow(1, 0.85, 0.35, 0.7));
    }
    // their orbs and your shots
    for (const b of w.shots) {
      if (!seen(b.x, b.y, 30)) continue;
      if (b.ally) GL.spr(S.spark, b.x, b.y, 44, 12, Math.atan2(b.vy, b.vx), glow(hc[0], hc[1], hc[2], 1));
      else { GL.spr(S.glow, b.x, b.y, 46, 46, 0, glow(1, 0.2, 0.55, 0.45)); GL.spr(S.shot, b.x, b.y, 24 + Math.sin(T * 20 + b.x) * 2, 24 + Math.sin(T * 20 + b.x) * 2, 0, rgba(1, 1, 1, 1)); }
    }
    // helpers
    const q = this.q;
    for (let i = 0; i < w.S.ward; i++) { w.wardPos(i, q); GL.spr(S.glow, q.x, q.y, 50, 50, 0, glow(1, 0.8, 0.4, 0.4)); GL.spr(S.ward, q.x, q.y, 34, 34, T * 3 + i, rgba(1, 1, 1, 1)); }
    for (let i = 0; i < w.S.shiki; i++) { w.shikiPos(i, q); GL.spr(S.crane, q.x, q.y, 30, 30 * (0.75 + 0.25 * Math.sin(T * 16 + i)), 0, rgba(1, 1, 1, 1)); }
    for (const a of w.allies) { GL.spr(S.glow, a.x, a.y, 44, 44, 0, glow(0.4, 1, 0.75, 0.5)); GL.spr(S.wisp, a.x, a.y, 30, 30, 0, rgba(0.6, 1, 0.8, 1)); }
    // the spirit
    if (w.phase !== 'dead') {
      const vis = p.inv > 0 && p.dash <= 0 ? 0.45 + 0.55 * Math.abs(Math.sin(T * 26)) : 1;
      for (const g of FX.ghosts) GL.spr(S.head, g.x, g.y, 70, 70, g.a, glow(hc[0], hc[1], hc[2], 0.5 * (1 - g.t / g.life)));
      if (p.dash > 0 && FX.ghosts.length < 12) FX.ghosts.push({ x: p.x, y: p.y, a: p.a, t: 0, life: 0.28 });
      GL.spr(S.glow, p.x, p.y, 150, 150, 0, glow(hc[0], hc[1], hc[2], 0.42 * vis));
      GL.spr(S.head, p.x, p.y, 66, 66, p.a, glow(hc[0], hc[1], hc[2], vis));
      GL.spr(S.head, p.x + Math.cos(p.a) * 3, p.y + Math.sin(p.a) * 3, 44, 44, p.a, glow(1, 1, 1, vis));
      if (p.shield) GL.spr(S.ring, p.x, p.y, 62, 62, T * 2, glow(0.5, 0.9, 1, 0.9));
      // dash pips under the spirit
      for (let i = 0; i < w.S.dashMax; i++) { const on = i < p.dashN, ax = p.x + (i - (w.S.dashMax - 1) / 2) * 12; GL.spr(S.dot, ax, p.y + 30, 7, 7, 0, glow(hc[0], hc[1], hc[2], on ? 0.95 : 0.22)); }
    }
    // particles
    {
      const { px, py, vx, vy, life, max, size, cr, cg, cb, kind } = FX;
      for (let i = 0; i < FX.MAXP; i++) {
        if (life[i] <= 0) continue;
        const u = life[i] / max[i], s = size[i] * (0.4 + 0.6 * u);
        if (kind[i]) GL.spr(S.spark, px[i], py[i], s * 6 + hyp(vx[i], vy[i]) * 0.05, s * 1.5, Math.atan2(vy[i], vx[i]), glow(cr[i], cg[i], cb[i], u));
        else GL.spr(S.glow, px[i], py[i], s * 4, s * 4, 0, glow(cr[i], cg[i], cb[i], u * 0.9));
      }
    }
    for (const r of FX.rings) { const u = r.t / r.life, rr = lerp(r.r0, r.r1, easeOut(u)) * 2 * (256 / 216); GL.spr(S.ring, r.x, r.y, rr, rr, 0, glow(r.col[0], r.col[1], r.col[2], (1 - u) * Math.min(1, r.w))); }
    for (const b of FX.bolts) { const a = 1 - b.t / b.life, P = b.pts; for (let i = 0; i < P.length - 2; i += 2) { GL.line(S.band, P[i], P[i + 1], P[i + 2], P[i + 3], b.w * 3, glow(b.col[0], b.col[1], b.col[2], a * 0.35)); GL.line(S.band, P[i], P[i + 1], P[i + 2], P[i + 3], b.w * 0.7, glow(1, 1, 1, a)); } }
    for (const t of FX.texts) {
      const u = t.t / t.life, pop = u < 0.15 ? 0.6 + 2.7 * u : 1, a = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1, y = t.y - 46 * easeOut(u);
      const hgt = t.size * pop;
      let wsum = 0; const ws = [];
      for (const ch of t.str) { const g = S['g' + ch]; const cw = g ? (hgt * g.w) / g.h * (g.w === 48 ? 0.78 : 0.9) : hgt * 0.4; ws.push(cw); wsum += cw; }
      let x = t.x - wsum / 2, k2 = 0;
      for (const ch of t.str) { const g = S['g' + ch], cw = ws[k2++]; if (g) GL.spr(g, x + cw / 2, y, (hgt * g.w) / g.h, hgt, 0, rgba(t.col[0], t.col[1], t.col[2], a)); x += cw; }
    }
    GL.flush();

    // ---- bloom, then the last pass to the screen
    const BL = GL.prog.blur.u;
    gl.disable(gl.BLEND);
    GL.pass(GL.prog.blur, F.a1); GL.bind(0, F.scene.t, BL.uTex); gl.uniform2f(BL.uDir, 1 / F.a1.w, 0); gl.uniform1f(BL.uCut, 0.6); gl.drawArrays(gl.TRIANGLES, 0, 3);
    GL.pass(GL.prog.blur, F.b1); GL.bind(0, F.a1.t, BL.uTex); gl.uniform2f(BL.uDir, 0, 1 / F.a1.h); gl.uniform1f(BL.uCut, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    GL.pass(GL.prog.blur, F.a2); GL.bind(0, F.b1.t, BL.uTex); gl.uniform2f(BL.uDir, 1.2 / F.a2.w, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    GL.pass(GL.prog.blur, F.b2); GL.bind(0, F.a2.t, BL.uTex); gl.uniform2f(BL.uDir, 0, 1.2 / F.a2.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    GL.pass(GL.prog.post, null);
    const P2 = GL.prog.post.u;
    GL.bind(0, F.scene.t, P2.uScene); GL.bind(1, F.b1.t, P2.uB1); GL.bind(2, F.b2.t, P2.uB2);
    gl.uniform2f(P2.uRes, GL.W, GL.H); gl.uniform1f(P2.uTime, T);
    const low = w.phase === 'play' && p.hp === 1 && w.S.maxHp > 1 ? 0.16 + 0.1 * Math.sin(T * 5) : 0;
    gl.uniform1f(P2.uFlash, FX.flash); gl.uniform1f(P2.uHurt, Math.max(FX.hurt * 0.8, low)); gl.uniform1f(P2.uChroma, 0.01 + FX.chroma * 0.1); gl.uniform1f(P2.uGrain, 0.02); gl.uniform1f(P2.uFade, this.fade);
    const R = this.rip; R.fill(0);
    for (let i = 0; i < FX.rips.length && i < 6; i++) { const r = FX.rips[i], u = r.t / r.life; R[i * 4] = 0.5 + ((r.x - cx) * z) / GL.W; R[i * 4 + 1] = 0.5 - ((r.y - cy) * z) / GL.H; R[i * 4 + 2] = 0.02 + u * 0.75; R[i * 4 + 3] = r.str * (1 - u); }
    gl.uniform4fv(P2.uRip, R);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  // where a world point lands on the page (for the pointer and for DOM that follows the action)
  toScreen(x, y, out) { const z = GL.cam.z / (GL.dpr * GL.scale); out.x = (x - GL.cam.x) * z + GL.W / (2 * GL.dpr * GL.scale); out.y = (y - GL.cam.y) * z + GL.H / (2 * GL.dpr * GL.scale); return out; },
  toWorld(sx, sy, out) { const z = GL.cam.z / (GL.dpr * GL.scale); out.x = (sx - GL.W / (2 * GL.dpr * GL.scale)) / z + this.cam.x; out.y = (sy - GL.H / (2 * GL.dpr * GL.scale)) / z + this.cam.y; return out; },
};

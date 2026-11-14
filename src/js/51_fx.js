// ---------- effects layer: ink splashes, sparks, floating numbers, screen shake ----------
const FX = (() => {
  let cv = null, c = null, k = 1, W = 0, H = 0, raf = 0, last = 0;
  const parts = [], texts = [], rings = [], custom = [];
  let drag = null, flashA = 0, flashCol = '#fff', shake = 0, shakeT = 0, stageEl = null;
  function init() {
    cv = document.getElementById('fx'); c = cv.getContext('2d');
    stageEl = document.getElementById('stage');
    resize();
  }
  function resize() {
    if (!cv) return;
    k = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    if (drag) kick();
  }
  const busy = () => parts.length || texts.length || rings.length || custom.length || drag || flashA > 0.004 || shake > 0.05;
  function kick() { if (!raf && cv) { last = nowMs(); raf = requestAnimationFrame(loop); } }
  function loop(t) {
    const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000));
    last = t;
    step(dt); draw(dt);
    if (busy()) raf = requestAnimationFrame(loop);
    else { raf = 0; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); setShake(0, 0); }
  }
  function setShake(x, y) { if (stageEl) { stageEl.style.setProperty('--shx', x.toFixed(1) + 'px'); stageEl.style.setProperty('--shy', y.toFixed(1) + 'px'); } }
  function step(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      const f = Math.pow(p.drag, dt * 60);
      p.vx *= f; p.vy *= f;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) { texts.splice(i, 1); continue; }
      t.y += t.vy * dt; t.vy *= Math.pow(0.9, dt * 60);
    }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life -= dt; if (r.life <= 0) rings.splice(i, 1); }
    if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.4);
    if (shake > 0) {
      shakeT += dt;
      shake *= Math.pow(0.0008, dt);
      if (shake < 0.05) { shake = 0; setShake(0, 0); }
      else setShake(Math.sin(shakeT * 71) * shake, Math.cos(shakeT * 53) * shake);
    }
  }
  function draw(dt) {
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, W, H);
    if (flashA > 0.004) { c.globalAlpha = flashA; c.fillStyle = flashCol; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    for (const r of rings) {
      const u = 1 - r.life / r.max;
      c.globalAlpha = (1 - u) * r.a; c.strokeStyle = r.col; c.lineWidth = r.w * (1 - u * 0.6);
      c.beginPath(); c.arc(r.x, r.y, lerp(r.r0, r.r1, 1 - Math.pow(1 - u, 3)), 0, 7); c.stroke();
    }
    c.globalAlpha = 1;
    for (const p of parts) {
      const u = p.life / p.max;
      if (p.add) c.globalCompositeOperation = 'lighter';
      c.globalAlpha = p.a * (p.fade ? Math.min(1, u * 2) : 1);
      c.fillStyle = p.col;
      const r = p.r * (p.shrink ? 0.3 + 0.7 * u : 1);
      c.beginPath();
      if (p.streak) { const sp = Math.hypot(p.vx, p.vy) || 1; c.ellipse(p.x, p.y, r * (1 + sp * 0.006), r, Math.atan2(p.vy, p.vx), 0, 7); }
      else c.arc(p.x, p.y, r, 0, 7);
      c.fill();
      if (p.add) c.globalCompositeOperation = 'source-over';
    }
    c.globalAlpha = 1;
    for (let i = custom.length - 1; i >= 0; i--) { if (custom[i](c, dt) === false) custom.splice(i, 1); }
    if (drag) {
      c.save();
      c.globalAlpha = drag.ok === false ? 0.78 : 0.96;
      c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = drag.cs * 0.5; c.shadowOffsetY = drag.cs * 0.28;
      Gfx.piece(c, drag.geom, drag.ink, drag.enh, drag.x, drag.y, drag.cs, { marks: drag.marks, flat: true });
      c.restore();
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const t of texts) {
      const u = 1 - t.life / t.max;
      const pop = u < 0.14 ? lerp(0.4, 1.25, u / 0.14) : u < 0.26 ? lerp(1.25, 1, (u - 0.14) / 0.12) : 1;
      c.globalAlpha = u > 0.72 ? (1 - u) / 0.28 : 1;
      c.font = `${t.weight} ${Math.round(t.size * pop)}px ${t.font}`;
      c.lineWidth = Math.max(2, t.size * 0.2); c.strokeStyle = t.edge;
      c.strokeText(t.txt, t.x, t.y); c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y);
    }
    c.globalAlpha = 1;
  }
  const reduce = () => PROFILE.settings.reduce;
  return {
    init, resize, kick,
    ink(x, y, col, n, power, size) {
      const cnt = reduce() ? Math.ceil(n / 3) : n;
      for (let i = 0; i < cnt; i++) {
        const a = Math.random() * Math.PI * 2, sp = power * (0.25 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.2, g: power * 1.6, drag: 0.93, r: (size || 4) * (0.35 + Math.random() * 0.9), life: 0.35 + Math.random() * 0.5, max: 0.85, col, a: 0.9, shrink: true, fade: true, streak: true });
      }
      if (parts.length > 900) parts.splice(0, parts.length - 900);
      kick();
    },
    spark(x, y, col, n, power, size) {
      const cnt = reduce() ? Math.ceil(n / 3) : n;
      for (let i = 0; i < cnt; i++) {
        const a = Math.random() * Math.PI * 2, sp = power * (0.3 + Math.random());
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -power * 0.2, drag: 0.9, r: (size || 2.2) * (0.5 + Math.random()), life: 0.4 + Math.random() * 0.6, max: 1, col, a: 1, shrink: true, fade: true, add: true });
      }
      kick();
    },
    rise(x, y, col, n, spread, size) {
      // embers drifting upward (score on fire)
      if (reduce()) n = Math.ceil(n / 4);
      for (let i = 0; i < n; i++) {
        parts.push({ x: x + (Math.random() - 0.5) * spread, y, vx: (Math.random() - 0.5) * 40, vy: -(60 + Math.random() * 160), g: -40, drag: 0.97, r: (size || 3) * (0.5 + Math.random()), life: 0.5 + Math.random() * 0.8, max: 1.3, col, a: 0.9, shrink: true, fade: true, add: true });
      }
      kick();
    },
    text(x, y, txt, col, size, o) {
      const q = o || {};
      texts.push({ x, y, txt, col, size, vy: q.vy == null ? -70 : q.vy, life: q.life || 0.85, max: q.life || 0.85, edge: q.edge || 'rgba(12,10,9,0.9)', weight: q.weight || 800, font: q.font || FONT_NUM });
      if (texts.length > 80) texts.splice(0, texts.length - 80);
      kick();
    },
    ring(x, y, col, r0, r1, w, life, a) { rings.push({ x, y, col, r0, r1, w: w || 3, life: life || 0.45, max: life || 0.45, a: a == null ? 0.9 : a }); kick(); },
    flash(col, a) { if (reduce()) a *= 0.35; flashCol = col; flashA = Math.max(flashA, a); kick(); },
    shake(m) { if (!PROFILE.settings.shake || reduce()) return; shake = Math.max(shake, m); kick(); },
    add(fn) { custom.push(fn); kick(); },
    setDrag(d) { drag = d; kick(); },
    clear() { parts.length = 0; texts.length = 0; rings.length = 0; custom.length = 0; drag = null; flashA = 0; },
  };
})();

// ---------- background: slow ink drifting in dark water (WebGL, with a plain fallback) ----------
const BG = (() => {
  let cv = null, gl = null, prog = null, uR = null, uT = null, uTint = null, uAmp = null, raf = 0, t0 = 0, lastDraw = 0;
  // quality steps down by itself on machines that cannot keep up
  let level = 0, lastRaf = 0, ema = 16, checkAt = 0;
  const QUAL = [[0.6, 40], [0.42, 66], [0.3, 100], [0.2, 160]];
  let tint = [0.2, 0.17, 0.12], tintTo = [0.2, 0.17, 0.12], amp = 1, ampTo = 1, pulse = 0, alive = false;
  const TINTS = { title: [0.21, 0.18, 0.13], calm: [0.18, 0.16, 0.13], shop: [0.09, 0.19, 0.16], boss: [0.32, 0.08, 0.06], win: [0.3, 0.24, 0.1], over: [0.1, 0.1, 0.13] };
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r; uniform float t; uniform vec3 tint; uniform float amp;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / r.y;
  vec2 q = vec2(fbm(uv*1.5 + vec2(0.0, t*0.021)), fbm(uv*1.5 + vec2(5.2, 1.3 - t*0.016)));
  vec2 w = vec2(fbm(uv*1.3 + 3.0*q + vec2(1.7, 9.2) + t*0.013), fbm(uv*1.3 + 3.0*q + vec2(8.3, 2.8) - t*0.011));
  float f = fbm(uv*1.15 + 3.2*w);
  float ink = smoothstep(0.32, 0.98, f + 0.28*length(q));
  vec3 base = vec3(0.050, 0.052, 0.060);
  vec3 col = mix(base, base + tint, ink*amp*0.8);
  col += tint * 0.5 * pow(w.x, 3.0) * amp;
  col += vec3(0.9, 0.75, 0.45) * pow(max(0.0, f - 0.62), 2.0) * 0.5 * amp;
  vec2 c = gl_FragCoord.xy / r - 0.5;
  col *= 1.0 - dot(c, c) * 1.25;
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.014;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;
  function init() {
    cv = document.getElementById('bg');
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) || cv.getContext('experimental-webgl');
      if (!gl) throw new Error('no webgl');
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uR = gl.getUniformLocation(prog, 'r'); uT = gl.getUniformLocation(prog, 't'); uTint = gl.getUniformLocation(prog, 'tint'); uAmp = gl.getUniformLocation(prog, 'amp');
      if (!cv._bound) {
        // registered once: a restored context must not pile up handlers
        cv._bound = true;
        cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); alive = false; });
        cv.addEventListener('webglcontextrestored', () => { gl = null; init(); });
      }
      alive = true;
      resize();
      t0 = nowMs() - Math.random() * 500000;
      if (!raf) raf = requestAnimationFrame(loop);
    } catch (e) {
      gl = null; alive = false;
      document.body.classList.add('nogl');
    }
  }
  function resize() {
    if (!gl) return;
    const sc = Math.min(1, 900 / Math.max(window.innerWidth, window.innerHeight)) * QUAL[level][0];
    cv.width = Math.max(64, Math.round(window.innerWidth * sc));
    cv.height = Math.max(64, Math.round(window.innerHeight * sc));
    gl.viewport(0, 0, cv.width, cv.height);
    lastDraw = 0;
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!alive || document.hidden) { lastRaf = 0; return; }
    if (lastRaf) { const d = t - lastRaf; if (d < 250) ema += (d - ema) * 0.04; }
    lastRaf = t;
    if (t > checkAt) {
      checkAt = t + 3000;
      if (ema > 27 && level < QUAL.length - 1 && t - t0 > 0) { level++; ema = 16; resize(); }
    }
    const slow = PROFILE.settings.reduce;
    if (t - lastDraw < (slow ? 200 : QUAL[level][1])) return;
    const dt = Math.min(0.2, (t - lastDraw) / 1000);
    lastDraw = t;
    for (let i = 0; i < 3; i++) tint[i] += (tintTo[i] - tint[i]) * Math.min(1, dt * 1.6);
    pulse *= Math.pow(0.12, dt);
    amp += (ampTo + pulse - amp) * Math.min(1, dt * 3);
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, ((t - t0) / 1000) % 100000);
    gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(uAmp, amp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {
    init, resize,
    mood(name) { tintTo = (TINTS[name] || TINTS.calm).slice(); document.body.dataset.mood = name; },
    pulse(v) { pulse = Math.min(2.2, pulse + v); },
  };
})();

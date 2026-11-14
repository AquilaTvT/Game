// ---------- WebGL: one sprite batch, a night-ground shader, and a bloom / ripple post pass ----------
const GL = {
  gl: null, cv: null, ok: false, W: 2, H: 2, dpr: 1, scale: 1,
  MAXQ: 12000, n: 0, f32: null, u32: null, vbo: null, ibo: null,
  prog: {}, fbo: {}, tex: null, cam: { x: 0, y: 0, z: 1 },

  init(cv) {
    this.cv = cv;
    const opt = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
    let gl = null;
    try { gl = cv.getContext('webgl', opt) || cv.getContext('experimental-webgl', opt); } catch (e) { gl = null; }
    if (!gl) return false;
    this.gl = gl;
    if (!cv._bound) {
      cv._bound = true;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; });
      cv.addEventListener('webglcontextrestored', () => { this.setup(); if (this.onRestore) this.onRestore(); });
    }
    return this.setup();
  },
  setup() {
    const gl = this.gl;
    const buf = new ArrayBuffer(this.MAXQ * 4 * 20);
    this.f32 = new Float32Array(buf); this.u32 = new Uint32Array(buf);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    const idx = new Uint16Array(this.MAXQ * 6);
    for (let i = 0, v = 0; i < idx.length; i += 6, v += 4) { idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v + 2; idx[i + 4] = v + 1; idx[i + 5] = v + 3; }
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    // a full-screen triangle for the shader passes
    this.tri = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const P = this.prog = {};
    P.spr = this.program(SH.sprV, SH.sprF, ['aPos', 'aUv', 'aCol'], ['uView', 'uTex']);
    P.bg = this.program(SH.fullV, SH.bgF, ['aPos'], ['uRes', 'uCam', 'uZoom', 'uTime', 'uHue', 'uArena', 'uPl', 'uDark']);
    P.blur = this.program(SH.fullV, SH.blurF, ['aPos'], ['uTex', 'uDir', 'uCut']);
    P.post = this.program(SH.fullV, SH.postF, ['aPos'], ['uScene', 'uB1', 'uB2', 'uRes', 'uTime', 'uFlash', 'uHurt', 'uChroma', 'uRip', 'uGrain', 'uFade']);
    if (!P.spr || !P.bg || !P.blur || !P.post) return false;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.ok = true;
    this.fbo = {};
    this.sized = '';
    return true;
  },
  program(vs, fs, attrs, unis) {
    const gl = this.gl;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (typeof console !== 'undefined') console.error(gl.getShaderInfoLog(s)); return null; } return s; };
    const a = mk(gl.VERTEX_SHADER, vs), b = mk(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    const p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    attrs.forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (typeof console !== 'undefined') console.error(gl.getProgramInfoLog(p)); return null; }
    const o = { p, u: {} };
    for (const n of unis) o.u[n] = gl.getUniformLocation(p, n);
    return o;
  },
  // the atlas canvas becomes the one texture every sprite is cut from
  setAtlas(canvas) {
    const gl = this.gl;
    if (!this.tex) this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
  },
  target(w, h) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(2, w), Math.max(2, h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { f, t, w: Math.max(2, w), h: Math.max(2, h) };
  },
  resize(cssW, cssH, dpr, scale) {
    const cv = this.cv;
    this.dpr = dpr; this.scale = scale;
    const W = Math.max(2, Math.round(cssW * dpr * scale)), H = Math.max(2, Math.round(cssH * dpr * scale));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    this.W = W; this.H = H;
    if (!this.ok) return;
    const key = W + 'x' + H;
    if (this.sized === key) return;
    this.sized = key;
    const gl = this.gl, F = this.fbo;
    for (const k in F) { gl.deleteFramebuffer(F[k].f); gl.deleteTexture(F[k].t); }
    F.scene = this.target(W, H);
    F.a1 = this.target(W >> 1, H >> 1); F.b1 = this.target(W >> 1, H >> 1);
    F.a2 = this.target(W >> 3, H >> 3); F.b2 = this.target(W >> 3, H >> 3);
  },

  // ---- sprite batch (premultiplied; alpha 0 means "add light")
  begin() {
    const gl = this.gl, P = this.prog.spr, c = this.cam;
    gl.useProgram(P.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 8);
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 20, 16);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(P.u.uTex, 0);
    gl.uniform4f(P.u.uView, (2 * c.z) / this.W, (-2 * c.z) / this.H, (-2 * c.z * c.x) / this.W, (2 * c.z * c.y) / this.H);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.n = 0;
  },
  flush() {
    if (!this.n) return;
    const gl = this.gl;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32.subarray(0, this.n * 20));
    gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_SHORT, 0);
    this.n = 0;
  },
  // four corners given directly (ribbons, polygons, beams)
  quad(x0, y0, x1, y1, x2, y2, x3, y3, s, col) {
    if (this.n >= this.MAXQ) this.flush();
    const f = this.f32, u = this.u32;
    let o = this.n * 20;
    f[o] = x0; f[o + 1] = y0; f[o + 2] = s.u0; f[o + 3] = s.v0; u[o + 4] = col;
    f[o + 5] = x1; f[o + 6] = y1; f[o + 7] = s.u1; f[o + 8] = s.v0; u[o + 9] = col;
    f[o + 10] = x2; f[o + 11] = y2; f[o + 12] = s.u0; f[o + 13] = s.v1; u[o + 14] = col;
    f[o + 15] = x3; f[o + 16] = y3; f[o + 17] = s.u1; f[o + 18] = s.v1; u[o + 19] = col;
    this.n++;
  },
  // a sprite centred at (x, y), w × h world units, turned by rot
  spr(s, x, y, w, h, rot, col) {
    if (this.n >= this.MAXQ) this.flush();
    const f = this.f32, u = this.u32, hw = w * 0.5, hh = h * 0.5;
    let ax = hw, ay = 0, bx = 0, by = hh;
    if (rot) { const c = Math.cos(rot), sn = Math.sin(rot); ax = c * hw; ay = sn * hw; bx = -sn * hh; by = c * hh; }
    let o = this.n * 20;
    f[o] = x - ax - bx; f[o + 1] = y - ay - by; f[o + 2] = s.u0; f[o + 3] = s.v0; u[o + 4] = col;
    f[o + 5] = x + ax - bx; f[o + 6] = y + ay - by; f[o + 7] = s.u1; f[o + 8] = s.v0; u[o + 9] = col;
    f[o + 10] = x - ax + bx; f[o + 11] = y - ay + by; f[o + 12] = s.u0; f[o + 13] = s.v1; u[o + 14] = col;
    f[o + 15] = x + ax + bx; f[o + 16] = y + ay + by; f[o + 17] = s.u1; f[o + 18] = s.v1; u[o + 19] = col;
    this.n++;
  },
  // a line as a thin quad of light
  line(s, x0, y0, x1, y1, w, col) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * w * 0.5, ny = (dx / d) * w * 0.5;
    this.quad(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x0 - nx, y0 - ny, x1 - nx, y1 - ny, s, col);
  },

  pass(prog, target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : this.W, target ? target.h : this.H);
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri);
    gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  },
  bind(unit, tex, loc) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); },
};

// colours for the batch: premultiplied, packed as bytes.  add = light that only brightens
function rgba(r, g, b, a) {
  const k = a * 255;
  return (((a * 255) & 255) << 24 | ((clamp(b, 0, 1) * k) & 255) << 16 | ((clamp(g, 0, 1) * k) & 255) << 8 | ((clamp(r, 0, 1) * k) & 255)) >>> 0;
}
function glow(r, g, b, a) {
  const k = a * 255;
  return ((Math.min(255, b * k) & 255) << 16 | (Math.min(255, g * k) & 255) << 8 | (Math.min(255, r * k) & 255)) >>> 0;
}

const SH = {
  sprV: `attribute vec2 aPos; attribute vec2 aUv; attribute vec4 aCol; uniform vec4 uView; varying vec2 vUv; varying vec4 vCol;
void main(){ vUv = aUv; vCol = aCol; gl_Position = vec4(aPos * uView.xy + uView.zw, 0.0, 1.0); }`,
  sprF: `precision mediump float; uniform sampler2D uTex; varying vec2 vUv; varying vec4 vCol;
void main(){ vec4 t = texture2D(uTex, vUv); gl_FragColor = vec4(t.rgb * vCol.rgb, t.a * vCol.a); }`,
  fullV: `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`,

  // the ground of the night: mist, a faint ritual pattern, the warded edge
  bgF: `precision highp float;
uniform vec2 uRes; uniform vec2 uCam; uniform float uZoom; uniform float uTime; uniform vec3 uHue; uniform float uArena; uniform vec2 uPl; uniform float uDark;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; } return s; }
void main(){
  vec2 wp = (gl_FragCoord.xy - uRes * 0.5) / uZoom * vec2(1.0, -1.0) + uCam;
  float r = length(wp);
  float t = uTime;
  // drifting mist in two layers
  float m1 = fbm(wp * 0.0017 + vec2(t * 0.011, -t * 0.007));
  float m2 = fbm(wp * 0.0046 - vec2(t * 0.02, t * 0.013) + m1 * 1.4);
  vec3 base = uHue * 0.30 + vec3(0.02, 0.024, 0.045);
  vec3 col = base * (0.5 + 1.1 * m1) + uHue * 0.42 * pow(m2, 2.0);
  // the ritual ground: rings and spokes, very faint, breathing
  float ring = abs(fract(r / 220.0 - 0.5) - 0.5) * 220.0;
  float ang = atan(wp.y, wp.x);
  float spoke = abs(fract(ang / 6.2831853 * 12.0 - 0.5) - 0.5) * r * 0.5236;
  float lines = smoothstep(2.2, 0.0, ring) * 0.55 + smoothstep(1.8, 0.0, spoke) * 0.4 * smoothstep(120.0, 320.0, r);
  // small tiles like worn paving
  vec2 gq = abs(fract(wp / 72.0) - 0.5) * 72.0;
  float tile = smoothstep(1.4, 0.0, min(gq.x, gq.y)) * 0.18;
  float breathe = 0.75 + 0.25 * sin(t * 0.6 + r * 0.004);
  col += (uHue * 0.7 + 0.16) * (lines * breathe + tile) * 0.42;
  // motes
  vec2 sp = wp * 0.02 + vec2(t * 0.05, t * 0.03); vec2 si = floor(sp); float sh = hash(si);
  float star = smoothstep(0.06, 0.0, length(fract(sp) - 0.5 - (vec2(hash(si + 3.1), hash(si + 7.7)) - 0.5) * 0.7)) * step(0.86, sh);
  col += vec3(0.7, 0.8, 1.0) * star * (0.3 + 0.3 * sin(t * 2.0 + sh * 40.0));
  // light the spirit carries
  float pl = exp(-length(wp - uPl) / 300.0);
  col += (uHue * 0.6 + vec3(0.04, 0.06, 0.09)) * pl * 0.9;
  // the warded edge: a rope of light, and the dark beyond it
  float e = r - uArena;
  float rope = exp(-abs(e) * 0.22) * (0.7 + 0.3 * sin(ang * 420.0 + t * 2.0)) + exp(-abs(e) * 0.035) * 0.28;
  col += vec3(1.0, 0.36, 0.22) * rope * 0.95;
  float outF = smoothstep(0.0, 260.0, e);
  col = mix(col, vec3(0.012, 0.004, 0.012) + vec3(0.10, 0.02, 0.04) * fbm(wp * 0.004 + t * 0.03), outF * 0.92);
  col *= 1.0 - uDark * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`,

  blurF: `precision mediump float; uniform sampler2D uTex; uniform vec2 uDir; uniform float uCut; varying vec2 vUv;
void main(){
  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;
  c += (texture2D(uTex, vUv + uDir * 1.3846).rgb + texture2D(uTex, vUv - uDir * 1.3846).rgb) * 0.316216;
  c += (texture2D(uTex, vUv + uDir * 3.2308).rgb + texture2D(uTex, vUv - uDir * 3.2308).rgb) * 0.070270;
  if (uCut > 0.0) { float l = max(c.r, max(c.g, c.b)); c *= smoothstep(uCut, uCut + 0.35, l); }
  gl_FragColor = vec4(c, 1.0);
}`,

  postF: `precision highp float;
uniform sampler2D uScene; uniform sampler2D uB1; uniform sampler2D uB2; uniform vec2 uRes; uniform float uTime; uniform float uFlash; uniform float uHurt; uniform float uChroma; uniform vec4 uRip[6]; uniform float uGrain; uniform float uFade;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec2 uv = vUv; vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  // shock rings bend the picture as they pass
  for (int i = 0; i < 6; i++){
    vec4 rp = uRip[i];
    if (rp.w != 0.0) { vec2 d = (uv - rp.xy) * asp; float l = length(d); float band = smoothstep(0.09, 0.0, abs(l - rp.z)); uv += normalize(d + 1e-5) / asp * band * rp.w; }
  }
  vec2 cd = (uv - 0.5); float ca = uChroma * dot(cd, cd);
  vec3 c = vec3(texture2D(uScene, uv + cd * ca).r, texture2D(uScene, uv).g, texture2D(uScene, uv - cd * ca).b);
  vec3 b = texture2D(uB1, uv).rgb * 0.7 + texture2D(uB2, uv).rgb * 1.25;
  c += b;
  c = 1.0 - exp(-c * 1.25);                               // soft shoulder instead of a hard clip
  float v = smoothstep(1.25, 0.25, length(cd * vec2(1.0, 1.15)) * 1.55);
  c *= 0.68 + 0.32 * v;
  c += vec3(1.0, 0.95, 0.85) * uFlash;
  c = mix(c, vec3(0.9, 0.08, 0.06), uHurt * (1.0 - v) * 0.9);
  c += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uGrain;
  c *= uFade;
  gl_FragColor = vec4(c, 1.0);
}`,
};

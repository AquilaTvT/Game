// ---------- every picture in the game is painted here, once, into one atlas ----------
const FONT_KAI = '"Kaiti SC", STKaiti, KaiTi, "AR PL UKai CN", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", SimSun, serif';
const FONT_NUM = 'Georgia, "Times New Roman", "Noto Serif", serif';

const Art = {
  cv: null, S: {}, px: 2, py: 2, rowH: 0, SIZE: 2048,
  add(id, w, h, fn) {
    if (this.px + w + 2 > this.SIZE) { this.px = 2; this.py += this.rowH + 2; this.rowH = 0; }
    const c = this.c, x = this.px, y = this.py;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.translate(x + w / 2, y + h / 2);
    fn(c, w / 128);
    c.restore();
    this.S[id] = { u0: (x + 0.5) / this.SIZE, v0: (y + 0.5) / this.SIZE, u1: (x + w - 0.5) / this.SIZE, v1: (y + h - 0.5) / this.SIZE, w, h };
    this.px += w + 2; if (h > this.rowH) this.rowH = h;
  },
  build() {
    const cv = this.cv = document.createElement('canvas');
    cv.width = cv.height = this.SIZE;
    const c = this.c = cv.getContext('2d');
    this.S = {}; this.px = 2; this.py = 2; this.rowH = 0;
    const A = (id, s, fn) => this.add(id, s, s, fn);

    // ---- light
    A('glow', 128, (c) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.62)'); g.addColorStop(0.45, 'rgba(255,255,255,0.2)'); g.addColorStop(0.75, 'rgba(255,255,255,0.045)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-64, -64, 128, 128); });
    A('dot', 32, (c) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 15); g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-16, -16, 32, 32); });
    this.add('spark', 96, 24, (c) => { const g = c.createLinearGradient(-48, 0, 48, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 46, 4.5, 0, 0, TAU); c.fill(); });
    A('ring', 256, (c) => { c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 14; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 108, 0, TAU); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 108, 0, TAU); c.stroke(); });
    this.add('white', 16, 16, (c) => { c.fillStyle = '#fff'; c.fillRect(-8, -8, 16, 16); });
    { const s = this.S.white, m = 5 / this.SIZE; s.u0 += m; s.v0 += m; s.u1 -= m; s.v1 -= m; }
    // a strip that is solid along its middle and fades to nothing at both edges: every ribbon and line of light is cut from it
    this.add('band', 16, 32, (c) => { const g = c.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0.75)'); g.addColorStop(0.5, '#fff'); g.addColorStop(0.7, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-8, -16, 16, 32); });
    { const s = this.S.band, m = 4 / this.SIZE; s.u0 += m; s.u1 -= m; }
    A('smoke', 128, (c) => { for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 14 + (i * 7) % 20, x = Math.cos(a) * r, y = Math.sin(a) * r, rr = 26 + (i * 5) % 14; const g = c.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-64, -64, 128, 128); } });

    // ---- the seal: rings of script and a five-pointed star
    A('rune', 512, (c) => {
      c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 10;
      c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 236, 0, TAU); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 222, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 170, 0, TAU); c.stroke();
      const txt = '封印结界镇魔灭妖急急如律令敕';
      c.font = `700 34px ${FONT_KAI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < txt.length; i++) { c.save(); c.rotate((i * TAU) / txt.length); c.fillText(txt[i], 0, -196); c.restore(); }
      c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + ((i * 2) % 5) * (TAU / 5); const x = Math.cos(a) * 168, y = Math.sin(a) * 168; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU / 5); c.beginPath(); c.arc(Math.cos(a) * 168, Math.sin(a) * 168, 9, 0, TAU); c.fill(); }
      c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 64, 0, TAU); c.stroke();
    });
    A('rune2', 256, (c) => {
      c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 8; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 112, 0, TAU); c.stroke();
      for (let i = 0; i < 8; i++) { c.save(); c.rotate((i * TAU) / 8); for (let k = 0; k < 3; k++) { const y = -98 + k * 9, broken = (i >> k) & 1; c.beginPath(); if (broken) { c.moveTo(-16, y); c.lineTo(-4, y); c.moveTo(4, y); c.lineTo(16, y); } else { c.moveTo(-16, y); c.lineTo(16, y); } c.stroke(); } c.restore(); }
      c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 66, 0, TAU); c.stroke();
      for (let i = 0; i < 24; i++) { c.save(); c.rotate((i * TAU) / 24); c.beginPath(); c.moveTo(0, -66); c.lineTo(0, -58); c.stroke(); c.restore(); }
    });

    // ---- shared bits
    const eye = (c, x, y, r, iris, lx, ly) => {
      c.save(); c.shadowBlur = 0;
      c.fillStyle = '#fff8ee'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.fillStyle = iris; c.beginPath(); c.arc(x + (lx || 0), y + (ly || 0), r * 0.58, 0, TAU); c.fill();
      c.fillStyle = '#12060a'; c.beginPath(); c.arc(x + (lx || 0), y + (ly || 0), r * 0.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(x + (lx || 0) - r * 0.2, y + (ly || 0) - r * 0.25, r * 0.14, 0, TAU); c.fill();
      c.restore();
    };
    const lit = (c, col, blur) => { c.shadowColor = col; c.shadowBlur = blur; };
    const grad = (c, x, y, r, a, b, m) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, a); if (m) g.addColorStop(0.55, m); g.addColorStop(1, b); return g; };
    const flame = (c, core, mid, edge) => {
      c.scale(0.8, 0.8);
      lit(c, mid, 22);
      c.beginPath(); c.moveTo(0, 36); c.bezierCurveTo(-34, 30, -30, -4, -10, -18); c.bezierCurveTo(-12, -32, -2, -40, 8, -50); c.bezierCurveTo(4, -32, 18, -26, 24, -8); c.bezierCurveTo(34, 12, 26, 34, 0, 36); c.closePath();
      c.fillStyle = grad(c, 0, 12, 46, core, edge, mid); c.fill();
      c.shadowBlur = 0; c.fillStyle = core; c.beginPath(); c.ellipse(0, 16, 12, 15, 0, 0, TAU); c.fill();
    };

    // ---- 妖
    A('wisp', 128, (c) => { flame(c, '#f4ffff', '#58d4ff', 'rgba(40,110,255,0.25)'); c.fillStyle = '#0c2440'; c.beginPath(); c.ellipse(-7, 12, 3.4, 5, 0, 0, TAU); c.ellipse(7, 12, 3.4, 5, 0, 0, TAU); c.fill(); });
    A('foxfire', 128, (c) => { flame(c, '#fffbe6', '#ffb040', 'rgba(255,70,20,0.25)'); c.fillStyle = '#4a1604'; c.beginPath(); c.ellipse(-7, 12, 3.4, 5, 0, 0, TAU); c.ellipse(7, 12, 3.4, 5, 0, 0, TAU); c.fill(); });
    A('lantern', 128, (c) => {
      lit(c, '#ff9a30', 20);
      c.fillStyle = grad(c, -6, -8, 42, '#ffe9a8', '#d8481a', '#ff9c38'); c.beginPath(); c.ellipse(0, 0, 27, 34, 0, 0, TAU); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(110,30,8,0.55)'; c.lineWidth = 1.6;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(0, i * 8.5, 27 * Math.sqrt(1 - (i * 8.5 / 34) ** 2), 3, 0, 0, Math.PI); c.stroke(); }
      c.fillStyle = '#1c0f0c'; c.fillRect(-13, -40, 26, 8); c.fillRect(-11, 32, 22, 7);
      c.fillStyle = '#20080a'; c.beginPath(); c.ellipse(0, 15, 13, 5, 0, 0, TAU); c.fill();
      c.fillStyle = '#e23a4a'; c.beginPath(); c.moveTo(-5, 15); c.quadraticCurveTo(-7, 34, 1, 36); c.quadraticCurveTo(8, 34, 5, 15); c.fill();
      eye(c, 0, -8, 11, '#b3261a', 1, 2);
    });
    A('kasa', 128, (c) => {
      c.strokeStyle = '#d8b48a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 18); c.lineTo(0, 44); c.stroke();
      c.fillStyle = '#c9a070'; c.fillRect(-10, 43, 22, 5);
      lit(c, '#a070ff', 16);
      c.beginPath(); c.moveTo(0, -48); c.lineTo(-36, 12); c.quadraticCurveTo(-27, 22, -18, 12); c.quadraticCurveTo(-9, 22, 0, 12); c.quadraticCurveTo(9, 22, 18, 12); c.quadraticCurveTo(27, 22, 36, 12); c.closePath();
      c.fillStyle = grad(c, -8, -14, 52, '#d9b8ff', '#5a2ea8', '#8f5ae0'); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(40,12,90,0.55)'; c.lineWidth = 1.4;
      for (const x of [-18, 0, 18]) { c.beginPath(); c.moveTo(0, -48); c.lineTo(x, 12); c.stroke(); }
      eye(c, 0, -8, 10, '#ffcf3a', 1, 1);
      c.fillStyle = '#e23a4a'; c.beginPath(); c.moveTo(-4, 6); c.quadraticCurveTo(-5, 22, 2, 22); c.quadraticCurveTo(7, 20, 4, 6); c.fill();
    });
    A('doll', 128, (c) => {
      lit(c, '#fff0d0', 12);
      c.fillStyle = '#fff6e2'; c.beginPath();
      c.arc(0, -26, 12, 0, TAU);
      c.moveTo(-6, -16); c.lineTo(-36, -8); c.lineTo(-34, 2); c.lineTo(-8, -2); c.lineTo(-14, 40); c.lineTo(-3, 40); c.lineTo(0, 14); c.lineTo(3, 40); c.lineTo(14, 40); c.lineTo(8, -2); c.lineTo(34, 2); c.lineTo(36, -8); c.lineTo(6, -16); c.closePath(); c.fill();
      c.shadowBlur = 0; c.strokeStyle = '#d02a22'; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4, -29); c.lineTo(4, -23); c.moveTo(4, -29); c.lineTo(-4, -23); c.moveTo(0, -8); c.lineTo(0, 8); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke();
    });
    const eyeBall = (c, r) => {
      lit(c, '#ff4f8a', 16);
      c.fillStyle = grad(c, -r * 0.2, -r * 0.2, r, '#fff6f2', '#e9a0b0', '#ffe2e2'); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(200,40,70,0.55)'; c.lineWidth = r * 0.05;
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.75, Math.sin(a + 0.3) * r * 0.75, Math.cos(a + 0.1) * r * 0.55, Math.sin(a + 0.1) * r * 0.55); c.stroke(); }
      c.fillStyle = grad(c, 0, 0, r * 0.56, '#ff8ac0', '#a01058', '#ff3f8f'); c.beginPath(); c.arc(0, 0, r * 0.56, 0, TAU); c.fill();
      c.fillStyle = '#16040c'; c.beginPath(); c.ellipse(0, 0, r * 0.13, r * 0.42, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(-r * 0.2, -r * 0.24, r * 0.1, 0, TAU); c.fill();
    };
    A('eye', 128, (c) => eyeBall(c, 34));
    A('eyeling', 128, (c) => eyeBall(c, 30));
    A('tengu', 128, (c) => {
      c.scale(0.88, 0.88);
      c.fillStyle = '#16202c'; lit(c, '#40ffb0', 14);
      c.beginPath(); c.moveTo(-14, -6); c.lineTo(-54, -26); c.lineTo(-44, -6); c.lineTo(-56, 2); c.lineTo(-40, 8); c.lineTo(-48, 20); c.lineTo(-14, 12); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.fillStyle = grad(c, -6, -8, 30, '#3a5868', '#0e1620'); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#ffc93a'; c.beginPath(); c.moveTo(16, -9); c.lineTo(54, 3); c.lineTo(16, 13); c.closePath(); c.fill();
      c.strokeStyle = '#7a4a08'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(18, 2); c.lineTo(50, 3); c.stroke();
      c.fillStyle = '#d0281e'; c.beginPath(); c.moveTo(-8, -30); c.lineTo(6, -30); c.lineTo(10, -20); c.lineTo(-12, -20); c.closePath(); c.fill();
      c.fillStyle = '#ff3a2a'; lit(c, '#ff3a2a', 8); c.beginPath(); c.arc(6, -6, 5.5, 0, TAU); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(7.5, -7.5, 1.6, 0, TAU); c.fill();
    });
    A('bomb', 128, (c) => {
      lit(c, '#ff4a2a', 20);
      c.fillStyle = grad(c, -8, -8, 36, '#ffb08a', '#b01810', '#f0402a'); c.beginPath(); c.arc(0, 4, 28, 0, TAU); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(90,10,6,0.5)'; c.lineWidth = 1.6;
      for (const k of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(0, 4, Math.abs(Math.sin(k)) * 28 + 0.5, 28, 0, 0, TAU); c.stroke(); }
      c.strokeStyle = '#5a3a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(6, -36, 14, -34); c.stroke();
      c.fillStyle = '#fff3a0'; lit(c, '#ffd040', 14); c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, r = i % 2 ? 4 : 10; c.lineTo(15 + Math.cos(a) * r, -35 + Math.sin(a) * r); } c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff6d8';
      c.beginPath(); c.moveTo(-17, -4); c.lineTo(-4, 2); c.lineTo(-15, 8); c.closePath(); c.fill(); c.beginPath(); c.moveTo(17, -4); c.lineTo(4, 2); c.lineTo(15, 8); c.closePath(); c.fill();
      c.fillStyle = '#2a0606'; c.beginPath(); c.moveTo(-12, 16); c.lineTo(-6, 21); c.lineTo(0, 16); c.lineTo(6, 21); c.lineTo(12, 16); c.lineTo(8, 24); c.lineTo(-8, 24); c.closePath(); c.fill();
    });
    A('ghost', 128, (c) => {
      lit(c, '#b8d0ff', 20);
      c.beginPath(); c.moveTo(-28, 30); c.lineTo(-28, -8); c.arc(0, -8, 28, Math.PI, 0); c.lineTo(28, 30); c.quadraticCurveTo(21, 40, 14, 30); c.quadraticCurveTo(7, 40, 0, 30); c.quadraticCurveTo(-7, 40, -14, 30); c.quadraticCurveTo(-21, 40, -28, 30); c.closePath();
      c.fillStyle = grad(c, -8, -16, 52, '#ffffff', 'rgba(120,150,230,0.75)', '#dfe8ff'); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#18203c';
      c.beginPath(); c.ellipse(-10, -8, 5, 8, 0, 0, TAU); c.ellipse(10, -8, 5, 8, 0, 0, TAU); c.ellipse(0, 10, 4.5, 6.5, 0, 0, TAU); c.fill();
    });
    const mud = (c, k) => {
      lit(c, '#c09050', 12);
      c.fillStyle = grad(c, -8, -10, 46, '#d9b27a', '#4a3018', '#8a6238');
      c.beginPath(); c.arc(0, 6, 30 * k, 0, TAU); c.arc(-20 * k, -8 * k, 16 * k, 0, TAU); c.arc(18 * k, -12 * k, 18 * k, 0, TAU); c.arc(0, -22 * k, 14 * k, 0, TAU); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#3a2410'; c.beginPath(); c.ellipse(0, 20 * k, 13 * k, 6 * k, 0, 0, TAU); c.fill();
      eye(c, 2, -6 * k, 11 * k, '#6aa02a', 0, 2);
      c.fillStyle = '#6e4c28'; for (const x of [-30, 30]) { c.beginPath(); c.arc(x * k, 22 * k, 6 * k, 0, TAU); c.fill(); }
    };
    A('mud', 128, (c) => mud(c, 1.15));
    A('mudling', 128, (c) => mud(c, 1.0));
    A('bell', 128, (c) => {
      c.strokeStyle = '#8a6a22'; c.lineWidth = 5; c.beginPath(); c.arc(0, -36, 7, 0, TAU); c.stroke();
      lit(c, '#ffd860', 18);
      c.beginPath(); c.moveTo(-16, -30); c.quadraticCurveTo(0, -36, 16, -30); c.quadraticCurveTo(22, 4, 32, 26); c.quadraticCurveTo(0, 36, -32, 26); c.quadraticCurveTo(-22, 4, -16, -30); c.closePath();
      c.fillStyle = grad(c, -8, -12, 54, '#fff0b0', '#6a4e14', '#d8aa3c'); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(70,46,6,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-19, -14); c.quadraticCurveTo(0, -9, 19, -14); c.moveTo(-27, 16); c.quadraticCurveTo(0, 23, 27, 16); c.stroke();
      eye(c, 0, 2, 10, '#c0321f', 0, 1);
    });
    A('cutter', 128, (c) => {
      c.scale(0.9, 0.9);
      lit(c, '#7affee', 16);
      for (let i = 0; i < 3; i++) { c.save(); c.rotate((i * TAU) / 3); c.beginPath(); c.moveTo(4, -6); c.quadraticCurveTo(30, -34, 50, -6); c.quadraticCurveTo(28, -18, 8, 6); c.closePath(); c.fillStyle = grad(c, 26, -14, 30, '#ffffff', '#1a9a90', '#9ffff0'); c.fill(); c.restore(); }
      c.fillStyle = '#e8fff8'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#083030'; c.beginPath(); c.arc(-4, -1, 2.4, 0, TAU); c.arc(4, -1, 2.4, 0, TAU); c.fill();
    });
    A('oni', 128, (c) => {
      c.fillStyle = '#f4e6c4'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 12, -26); c.quadraticCurveTo(s * 20, -50, s * 30, -54); c.quadraticCurveTo(s * 30, -34, s * 26, -22); c.closePath(); c.fill(); }
      lit(c, '#ff3040', 18);
      c.beginPath(); c.moveTo(-30, -18); c.quadraticCurveTo(-34, -32, -14, -32); c.lineTo(14, -32); c.quadraticCurveTo(34, -32, 30, -18); c.lineTo(30, 14); c.quadraticCurveTo(26, 38, 0, 38); c.quadraticCurveTo(-26, 38, -30, 14); c.closePath();
      c.fillStyle = grad(c, -8, -12, 54, '#ff8a80', '#7a0c14', '#e02a34'); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#1c0406';
      c.beginPath(); c.moveTo(-26, -18); c.lineTo(-6, -8); c.lineTo(-8, -3); c.lineTo(-27, -10); c.closePath(); c.fill(); c.beginPath(); c.moveTo(26, -18); c.lineTo(6, -8); c.lineTo(8, -3); c.lineTo(27, -10); c.closePath(); c.fill();
      c.fillStyle = '#ffe14a'; c.beginPath(); c.ellipse(-13, -1, 7, 5, 0.2, 0, TAU); c.ellipse(13, -1, 7, 5, -0.2, 0, TAU); c.fill();
      c.fillStyle = '#1c0406'; c.beginPath(); c.arc(-12, -1, 2.4, 0, TAU); c.arc(12, -1, 2.4, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-18, 16); c.quadraticCurveTo(0, 30, 18, 16); c.quadraticCurveTo(0, 22, -18, 16); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-13, 19); c.lineTo(-10, 8); c.lineTo(-7, 21); c.closePath(); c.fill(); c.beginPath(); c.moveTo(13, 19); c.lineTo(10, 8); c.lineTo(7, 21); c.closePath(); c.fill();
    });
    A('mukseg', 128, (c) => {
      c.strokeStyle = '#d8e860'; c.lineWidth = 4; c.lineCap = 'round';
      for (const s of [-1, 1]) for (const x of [-12, 0, 12]) { c.beginPath(); c.moveTo(x, s * 18); c.quadraticCurveTo(x - 6, s * 34, x - 14, s * 44); c.stroke(); }
      lit(c, '#b0ff50', 14);
      c.fillStyle = grad(c, -6, -8, 40, '#f0ffb0', '#2a5010', '#8ad030'); c.beginPath(); c.ellipse(0, 0, 30, 23, 0, 0, TAU); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(20,50,8,0.6)'; c.lineWidth = 2.4;
      for (const x of [-11, 4, 17]) { c.beginPath(); c.ellipse(x, 0, 5, 21, 0, -1.2, 1.2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-8, -9, 12, 4, -0.2, 0, TAU); c.fill();
    });
    A('core', 128, (c) => {
      lit(c, '#c080ff', 26);
      c.beginPath(); c.moveTo(0, -38); c.lineTo(26, 0); c.lineTo(0, 38); c.lineTo(-26, 0); c.closePath(); c.fillStyle = grad(c, -4, -8, 40, '#ffffff', '#4a1a9a', '#c090ff'); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -38); c.lineTo(0, 38); c.moveTo(-26, 0); c.lineTo(26, 0); c.stroke();
    });

    // ---- 首领 (drawn on 256 cells; the scale passed in is 2)
    A('hyakume', 256, (c) => {
      c.scale(0.86, 0.86);
      lit(c, '#ff5a9a', 30);
      c.fillStyle = grad(c, -20, -24, 130, '#ffb0c8', '#5a1040', '#c8407a');
      c.beginPath(); for (let i = 0; i < 9; i++) { const a = (i * TAU) / 9; c.arc(Math.cos(a) * 52, Math.sin(a) * 52, 44 + (i % 3) * 6, 0, TAU); } c.arc(0, 0, 70, 0, TAU); c.fill();
      c.shadowBlur = 0;
      const E = [[0, -8, 30, '#ffd23a'], [-58, -34, 17, '#ff3f8f'], [56, -40, 19, '#7ae0ff'], [-66, 30, 15, '#b0ff50'], [62, 34, 18, '#ff8a3a'], [-22, 62, 14, '#ff3f8f'], [26, 66, 13, '#ffd23a'], [-10, -72, 14, '#7ae0ff'], [84, -4, 11, '#ff3f8f'], [-90, -4, 11, '#ffd23a']];
      for (const e of E) { c.fillStyle = 'rgba(60,8,36,0.55)'; c.beginPath(); c.arc(e[0], e[1], e[2] + 4, 0, TAU); c.fill(); eye(c, e[0], e[1], e[2], e[3], (e[0] % 5) - 2, (e[1] % 4) - 1); }
    });
    A('mukade', 256, (c) => {
      c.strokeStyle = '#f0e060'; c.lineWidth = 7; c.lineCap = 'round';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(44, s * 22); c.quadraticCurveTo(96, s * 58, 112, s * 12); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(30, s * 34); c.quadraticCurveTo(70, s * 96, 104, s * 104); c.stroke(); c.lineWidth = 7; }
      lit(c, '#c0ff50', 26);
      c.fillStyle = grad(c, -10, -14, 86, '#f6ffb8', '#3a2408', '#a8c830'); c.beginPath(); c.ellipse(0, 0, 66, 52, 0, 0, TAU); c.fill();
      c.shadowBlur = 0; c.fillStyle = 'rgba(70,20,6,0.5)'; c.beginPath(); c.ellipse(-12, 0, 40, 46, 0, 0, TAU); c.fill();
      for (const p of [[30, -24, 9], [30, 24, 9], [46, -9, 6], [46, 9, 6]]) { c.fillStyle = '#ff2a1a'; lit(c, '#ff2a1a', 12); c.beginPath(); c.arc(p[0], p[1], p[2], 0, TAU); c.fill(); c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0] + 2, p[1] - 2, p[2] * 0.3, 0, TAU); c.fill(); }
    });
    A('daitengu', 256, (c) => {
      c.scale(0.8, 0.8);
      c.fillStyle = '#141c28'; lit(c, '#40ffb0', 22);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 40, -10); for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.42; c.lineTo(s * (56 + Math.cos(a) * 68), -6 + Math.sin(a) * 82); c.lineTo(s * (50 + Math.cos(a + 0.2) * 44), -6 + Math.sin(a + 0.2) * 54); } c.closePath(); c.fill(); }
      lit(c, '#ff4030', 22);
      c.fillStyle = grad(c, -14, -24, 96, '#ff9a80', '#7a0e0c', '#e23424'); c.beginPath(); c.ellipse(0, 0, 54, 66, 0, 0, TAU); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#16161c'; c.beginPath(); c.moveTo(-18, -74); c.lineTo(18, -74); c.lineTo(24, -52); c.lineTo(-24, -52); c.closePath(); c.fill();
      c.fillStyle = grad(c, -4, 10, 40, '#ffb0a0', '#a81810', '#f04a38'); c.beginPath(); c.ellipse(0, 26, 13, 40, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -32); c.quadraticCurveTo(s * 30, -50, s * 50, -30); c.quadraticCurveTo(s * 30, -38, s * 10, -24); c.closePath(); c.fill(); c.beginPath(); c.moveTo(s * 10, 44); c.quadraticCurveTo(s * 34, 44, s * 46, 66); c.quadraticCurveTo(s * 28, 58, s * 8, 56); c.closePath(); c.fill(); }
      for (const s of [-1, 1]) { c.fillStyle = '#ffe14a'; c.beginPath(); c.ellipse(s * 26, -14, 12, 8, s * 0.25, 0, TAU); c.fill(); c.fillStyle = '#1a0606'; c.beginPath(); c.arc(s * 25, -13, 4, 0, TAU); c.fill(); }
    });
    A('kyubi', 256, (c) => {
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.3;
        c.save(); c.translate(0, 30); c.rotate(a + Math.PI / 2);
        lit(c, '#ffae40', 16);
        const g = c.createLinearGradient(0, 0, 0, -118); g.addColorStop(0, '#d86a18'); g.addColorStop(0.7, '#ffc860'); g.addColorStop(1, '#fffbe8');
        c.fillStyle = g; c.beginPath(); c.moveTo(-9, 0); c.bezierCurveTo(-24, -50, -16, -96, 0, -118); c.bezierCurveTo(16, -96, 24, -50, 9, 0); c.closePath(); c.fill();
        c.restore();
      }
      lit(c, '#fff0d0', 18);
      c.fillStyle = '#fffaf0';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 20, -28); c.lineTo(s * 50, -84); c.lineTo(s * 56, -22); c.closePath(); c.fill(); }
      c.beginPath(); c.moveTo(0, 78); c.bezierCurveTo(-30, 62, -64, 30, -58, -14); c.bezierCurveTo(-52, -44, -24, -52, 0, -50); c.bezierCurveTo(24, -52, 52, -44, 58, -14); c.bezierCurveTo(64, 30, 30, 62, 0, 78); c.closePath(); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#d82a22';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 30, -34); c.lineTo(s * 47, -68); c.lineTo(s * 50, -30); c.closePath(); c.fill(); }
      c.beginPath(); c.moveTo(0, -40); c.lineTo(8, -22); c.lineTo(0, -12); c.lineTo(-8, -22); c.closePath(); c.fill();
      c.strokeStyle = '#d82a22'; c.lineWidth = 4; c.lineCap = 'round';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 34, 22); c.lineTo(s * 52, 16); c.moveTo(s * 32, 32); c.lineTo(s * 50, 32); c.stroke(); }
      for (const s of [-1, 1]) { c.fillStyle = '#d82a22'; c.beginPath(); c.moveTo(s * 10, 0); c.quadraticCurveTo(s * 30, -20, s * 46, -8); c.quadraticCurveTo(s * 30, 8, s * 10, 0); c.fill(); c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(s * 14, 0); c.quadraticCurveTo(s * 30, -12, s * 40, -6); c.quadraticCurveTo(s * 28, 4, s * 14, 0); c.fill(); c.fillStyle = '#140606'; c.beginPath(); c.ellipse(s * 28, -3, 2.4, 5, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#1a0a0a'; c.beginPath(); c.ellipse(0, 54, 6, 4, 0, 0, TAU); c.fill();
    });
    A('kuubou', 256, (c) => {
      c.scale(0.78, 0.78);
      lit(c, '#b070ff', 30);
      c.fillStyle = grad(c, 0, 0, 126, '#ffffff', 'rgba(110,40,220,0)', '#c8a0ff');
      c.beginPath(); for (let i = 0; i < 40; i++) { const a = (i * TAU) / 40, r = i % 2 ? 84 : 112 + (i % 6) * 2.4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = grad(c, 0, 0, 82, '#1a0830', '#020108', '#0a0418'); c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(220,190,255,0.9)'; c.lineWidth = 3; lit(c, '#d0a0ff', 16); c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.stroke();
      c.fillStyle = grad(c, 0, 0, 44, '#ffffff', '#6a20d0', '#e0c0ff'); c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(24, 0, 0, 46); c.quadraticCurveTo(-24, 0, 0, -46); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#05010c'; c.beginPath(); c.ellipse(0, 0, 4.5, 30, 0, 0, TAU); c.fill();
    });

    // ---- yours
    A('head', 128, (c) => { lit(c, '#fff', 18); const g = c.createLinearGradient(-50, 0, 20, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.85)'); g.addColorStop(1, '#fff'); c.fillStyle = g; c.beginPath(); c.moveTo(-52, 0); c.quadraticCurveTo(-10, -17, 14, -13); c.arc(12, 0, 13, -Math.PI / 2, Math.PI / 2); c.quadraticCurveTo(-10, 17, -52, 0); c.closePath(); c.fill(); });
    A('crane', 128, (c) => { lit(c, '#fff', 12); c.fillStyle = '#fffdf4'; c.beginPath(); c.moveTo(0, 10); c.lineTo(-44, -22); c.lineTo(-8, -4); c.lineTo(0, -30); c.lineTo(8, -4); c.lineTo(44, -22); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-6, 6); c.lineTo(6, 6); c.lineTo(22, 34); c.lineTo(0, 16); c.lineTo(-26, 30); c.closePath(); c.fill(); c.shadowBlur = 0; c.strokeStyle = 'rgba(200,60,40,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 16); c.stroke(); });
    A('ward', 128, (c) => { lit(c, '#ffe9a0', 14); c.fillStyle = '#fff3d0'; c.fillRect(-14, -34, 28, 68); c.shadowBlur = 0; c.strokeStyle = '#d02a22'; c.lineWidth = 2; c.strokeRect(-10, -30, 20, 60); c.fillStyle = '#d02a22'; c.font = `700 22px ${FONT_KAI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('封', 0, -10); c.fillText('敕', 0, 14); });
    A('shot', 64, (c) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffd0ea'); g.addColorStop(0.5, '#ff3f9a'); g.addColorStop(0.75, 'rgba(210,20,110,0.35)'); g.addColorStop(1, 'rgba(210,20,110,0)'); c.fillStyle = g; c.fillRect(-32, -32, 64, 64); });
    A('soul', 64, (c) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 28); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#c8fff0'); g.addColorStop(0.55, '#3fe8b0'); g.addColorStop(1, 'rgba(30,200,150,0)'); c.fillStyle = g; c.fillRect(-32, -32, 64, 64); });
    A('heart', 64, (c) => { lit(c, '#ff5070', 12); c.fillStyle = grad(c, -4, -6, 26, '#ffd0d8', '#c01030', '#ff4a6a'); c.beginPath(); c.moveTo(0, 20); c.bezierCurveTo(-30, -2, -18, -24, 0, -8); c.bezierCurveTo(18, -24, 30, -2, 0, 20); c.fill(); });

    // ---- glyphs for the calls that fly up
    const glyph = (ch, font) => (c) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,4,2,0.9)'; c.lineWidth = 7; c.strokeText(ch, 0, 3); c.fillStyle = '#fff'; c.fillText(ch, 0, 3); };
    for (const ch of '封灭破连斩雷') A('g' + ch, 96, glyph(ch, `700 78px ${FONT_KAI}`));
    for (const ch of '0123456789×') this.add('g' + ch, 48, 64, glyph(ch, `700 52px ${FONT_NUM}`));
    return cv;
  },
};

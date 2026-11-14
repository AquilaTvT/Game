// ---------- sound: everything is synthesised — plucked strings, bells, drums, breath — and the music writes itself ----------
const Snd = (() => {
  let ctx = null, out = null, sfx = null, mus = null, ready = false, held = false;
  let mode = 'title', nextT = 0, step = 0, timer = 0, heat = 0, soulN = 0, soulT = 0, last = {};
  const KS = {};
  const SCALE = [0, 1, 5, 7, 8];                       // the miyako-bushi scale
  const hz = (semi) => 146.83 * Math.pow(2, semi / 12);  // from D3
  const note = (deg) => hz(SCALE[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5));

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
    out = ctx.createGain(); out.gain.value = 0.9;
    out.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); mus = ctx.createGain();
    sfx.connect(out); mus.connect(out);
    // a little room: two feedback delays
    const dl = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
    dl.delayTime.value = 0.27; fb.gain.value = 0.34; lp.type = 'lowpass'; lp.frequency.value = 1800; wet.gain.value = 0.22;
    mus.connect(dl); sfx.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(out);
    ready = true;
    applyVolumes();
    nextT = ctx.currentTime + 0.1;
    if (!timer) timer = setInterval(schedule, 60);
  }
  function applyVolumes() {
    if (!ready) return;
    const S = PROFILE.settings;
    sfx.gain.value = S.sfx * 0.9; mus.gain.value = held ? S.music * 0.25 : S.music * 0.55;
  }
  function resume() { if (!ctx) init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
  function pause(v) { held = !!v; applyVolumes(); }

  // ---- voices
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(f, dur, type, vol, t, to, bus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    env(g, t, 0.006, vol, dur);
    o.connect(g); g.connect(bus || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  let nbuf = null;
  function noise(dur, vol, t, freq, q, type, to, bus) {
    if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = nbuf; s.loop = true;
    f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus || sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // a plucked string (Karplus–Strong), rendered once per pitch and kept
  function pluck(f, vol, t, bus, bright) {
    const key = Math.round(f) + (bright ? 'b' : '');
    let b = KS[key];
    if (!b) {
      const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 1.5);
      b = ctx.createBuffer(1, len, sr);
      const d = b.getChannelData(0), ring = new Float32Array(N);
      for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (bright ? 1 : 0.5 + 0.5 * Math.sin((i / N) * Math.PI));
      const damp = bright ? 0.997 : 0.994;
      for (let i = 0, k = 0; i < len; i++) { const n2 = (k + 1) % N; d[i] = ring[k]; ring[k] = (ring[k] + ring[n2]) * 0.5 * damp; k = n2; }
      KS[key] = b;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    s.connect(g); g.connect(bus || sfx); s.start(t);
  }
  function bell(f, vol, t, dur, bus) { for (const [m, v] of [[1, 1], [2.01, 0.5], [2.99, 0.3], [4.2, 0.18], [5.4, 0.1]]) tone(f * m, (dur || 1.2) / Math.sqrt(m), 'sine', vol * v, t, 0, bus); }
  function drum(f, vol, t, bus, long) { tone(f * 2.4, long ? 0.5 : 0.28, 'sine', vol, t, f, bus); noise(0.07, vol * 0.6, t, 900, 0.7, 'lowpass', 200, bus); }

  // ---- effects by name
  function play(name, k) {
    if (!ready || ctx.state !== 'running') return;
    const t = ctx.currentTime, x = k == null ? 1 : k;
    // the same sound is not stacked on itself within a few hundredths of a second
    if (last[name] && t - last[name] < 0.03) return;
    last[name] = t;
    switch (name) {
      case 'tick': tone(1400, 0.04, 'sine', 0.1, t); break;
      case 'click': pluck(note(7), 0.3, t); break;
      case 'back': pluck(note(3), 0.22, t); break;
      case 'deny': tone(180, 0.12, 'square', 0.1, t, 120); break;
      case 'take': pluck(note(5), 0.35, t, sfx, true); pluck(note(7), 0.3, t + 0.07, sfx, true); pluck(note(10), 0.3, t + 0.14, sfx, true); break;
      case 'relic': bell(note(5), 0.22, t, 1.8); bell(note(8), 0.16, t + 0.12, 1.8); break;
      case 'ach': for (let i = 0; i < 4; i++) pluck(note(5 + i * 2), 0.3, t + i * 0.09, sfx, true); break;
      case 'seal': {
        const n = Math.min(14, x);
        drum(64 + n * 2, 0.5 + 0.03 * n, t, sfx, n >= 6);
        bell(note(5 + Math.min(9, Math.floor(n / 2))), 0.1 + 0.012 * n, t + 0.02, 1.0 + 0.06 * n);
        noise(0.35, 0.12 + 0.012 * n, t, 2400, 0.8, 'bandpass', 500);
        if (n >= 6) { bell(note(0) / 2, 0.22, t, 2.4); tone(55, 0.5, 'sine', 0.4, t, 30); }
        break;
      }
      case 'echo': bell(note(8), 0.07, t, 0.7); noise(0.2, 0.06, t, 3000, 1, 'bandpass', 900); break;
      case 'soul': { if (t - soulT > 0.5) soulN = 0; soulT = t; pluck(note(5 + (soulN % 10)), 0.11, t, sfx, true); soulN++; break; }
      case 'level': for (let i = 0; i < 5; i++) pluck(note(5 + i), 0.3, t + i * 0.06, sfx, true); bell(note(10), 0.14, t + 0.3, 1.6); break;
      case 'hurt': tone(140, 0.35, 'sawtooth', 0.32, t, 50); noise(0.3, 0.3, t, 500, 0.7, 'lowpass', 120); tone(233, 0.3, 'square', 0.08, t); break;
      case 'shield': bell(1320, 0.14, t, 0.6); noise(0.2, 0.14, t, 5000, 2, 'bandpass', 2000); break;
      case 'dash': noise(0.22, 0.2, t, 600, 0.9, 'bandpass', 3200); break;
      case 'cut': noise(0.06, 0.3, t, 4000, 1.5, 'highpass'); tone(700, 0.18, 'triangle', 0.16, t, 180); break;
      case 'zap': noise(0.1, 0.13, t, 3500, 3, 'bandpass', 1200); break;
      case 'bolt': noise(0.14, 0.22, t, 4200, 2, 'bandpass', 900); noise(0.6, 0.2, t + 0.03, 300, 0.6, 'lowpass', 70); break;
      case 'boom': tone(110, 0.4, 'sine', 0.42, t, 34); noise(0.4, 0.3, t, 700, 0.6, 'lowpass', 90); break;
      case 'shot': tone(520, 0.12, 'triangle', 0.07, t, 240); break;
      case 'swoop': noise(0.4, 0.18, t, 300, 1.2, 'bandpass', 2400); break;
      case 'toll': bell(note(0), 0.12, t, 1.6); break;
      case 'frost': for (let i = 0; i < 4; i++) tone(2200 + i * 420, 0.3, 'sine', 0.04, t + i * 0.03); break;
      case 'heal': pluck(note(5), 0.25, t, sfx, true); pluck(note(9), 0.25, t + 0.12, sfx, true); break;
      case 'boss': for (let i = 0; i < 7; i++) drum(52, 0.3 + i * 0.05, t + i * (0.2 - i * 0.02), sfx, i === 6); tone(55, 2.2, 'sawtooth', 0.12, t, 49); bell(note(1) / 2, 0.2, t + 1.0, 3); break;
      case 'bossdie': bell(note(0) / 2, 0.4, t, 4); bell(note(7), 0.2, t + 0.1, 3); noise(1.2, 0.25, t, 4000, 0.6, 'bandpass', 300); drum(48, 0.7, t, sfx, true); break;
      case 'clear': for (let i = 0; i < 6; i++) pluck(note(5 + [0, 2, 3, 5, 7, 10][i]), 0.3, t + i * 0.1, sfx, true); break;
      case 'dead': tone(196, 1.6, 'sawtooth', 0.14, t, 49); bell(note(1) / 2, 0.3, t + 0.2, 4); break;
      case 'won': for (let i = 0; i < 8; i++) { pluck(note(5 + i), 0.3, t + i * 0.11, sfx, true); } bell(note(10), 0.2, t + 0.9, 3); bell(note(12), 0.16, t + 1.1, 3); break;
      case 'revive': bell(note(5), 0.3, t, 2); bell(note(8), 0.2, t + 0.1, 2); bell(note(10), 0.2, t + 0.2, 2); break;
      case 'cast': tone(300, 0.3, 'triangle', 0.08, t, 600); break;
    }
  }
  // what the simulation reports is given a voice
  function on(e, w) {
    switch (e.t) {
      case 'seal': if (e.echo) play('echo'); else play('seal', e.n); break;
      case 'soul': play('soul'); break;
      case 'level': play('level'); break;
      case 'hurt': play('hurt'); break;
      case 'shield': play('shield'); break;
      case 'dash': play('dash'); break;
      case 'cut': play('cut'); break;
      case 'zap': play('zap'); break;
      case 'bolt': play('bolt'); break;
      case 'boom': if (!e.small) play('boom'); break;
      case 'shot': play('shot'); break;
      case 'swoop': play('swoop'); break;
      case 'toll': play('toll'); break;
      case 'frost': play('frost'); break;
      case 'heal': play('heal'); break;
      case 'boss': play('boss'); setMusic('boss'); break;
      case 'bossdie': play('bossdie'); setMusic('play'); break;
      case 'clear': play('clear'); break;
      case 'stage': setMusic('play'); break;
      case 'dead': play('dead'); break;
      case 'won': play('won'); break;
      case 'revive': play('revive'); break;
      case 'cast': play('cast'); break;
    }
    if (w) heat = clamp(w.foes.length / 160, 0, 1);
  }
  function setMusic(m) { mode = m; }

  // ---- the music: a drone, a koto wandering the scale, drums that thicken as the night does
  let deg = 5, phrase = 0;
  function schedule() {
    if (!ready || ctx.state !== 'running' || PROFILE.settings.music <= 0) return;
    const boss = mode === 'boss', calm = mode === 'title' || mode === 'dead' || mode === 'won';
    const bpm = boss ? 132 : calm ? 66 : 96 + heat * 14, sixteenth = 60 / bpm / 4;
    if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) {
      const t = nextT, s = step % 32, beat = s % 4 === 0;
      // drone: root and fifth, renewed every two bars
      if (s === 0) { const root = boss ? note(-5) : note(-5 + (phrase % 4 === 3 ? 1 : 0)); for (const [f, v] of [[root, 0.05], [root * 1.498, 0.03], [root * 2.005, 0.02]]) tone(f, sixteenth * 34, 'sawtooth', v * (calm ? 0.8 : 1), t, 0, lpBus()); phrase++; }
      // koto
      const dens = calm ? 0.16 : boss ? 0.5 : 0.3 + heat * 0.25;
      if ((s % 2 === 0 || boss) && Math.random() < dens) { deg = clamp(deg + [-2, -1, -1, 1, 1, 2, 3][(Math.random() * 7) | 0], 2, 14); pluck(note(deg), 0.2 + Math.random() * 0.1, t, mus, Math.random() < 0.3); if (Math.random() < 0.18) pluck(note(deg + 2), 0.14, t + sixteenth, mus); }
      // drums
      if (!calm) {
        const lvl = boss ? 1 : heat;
        if (s % 8 === 0) drum(58, 0.34, t, mus, true);
        if (lvl > 0.25 && s % 8 === 4) drum(88, 0.2, t, mus);
        if (lvl > 0.5 && (s % 8 === 6 || s % 16 === 11)) drum(120, 0.14, t, mus);
        if (boss && s % 2 === 1) noise(0.04, 0.05, t, 6000, 1, 'highpass', 0, mus);
        if (boss && s % 32 === 28) for (let i = 0; i < 4; i++) drum(70 + i * 8, 0.2, t + i * sixteenth, mus);
      }
      // a breath of flute now and then
      if (s === 16 && Math.random() < (calm ? 0.5 : 0.25)) { const f = note(10 + ((Math.random() * 4) | 0)); const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.25); l.frequency.value = 5.2; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 2.2); o.connect(g); g.connect(mus); o.start(t); l.start(t); o.stop(t + 2.3); l.stop(t + 2.3); noise(1.6, 0.012, t, f * 2, 3, 'bandpass', 0, mus); }
      void beat;
      nextT += sixteenth; step++;
    }
  }
  let _lp = null;
  function lpBus() { if (!_lp) { _lp = ctx.createBiquadFilter(); _lp.type = 'lowpass'; _lp.frequency.value = 520; _lp.Q.value = 0.7; _lp.connect(mus); } return _lp; }

  return { init, resume, suspend, pause, play, on, setMusic, applyVolumes, get ready() { return ready; }, _ctx: () => ctx };
})();

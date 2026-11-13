// ---------- sound: everything is synthesised (plucked strings, bells, drums, breath) ----------
const Snd = (() => {
  let ctx = null, master = null, sfxBus = null, musBus = null, verb = null, verbIn = null, comp = null;
  let ready = false, muted = false;
  const bufCache = new Map();
  const PENTA = [0, 2, 4, 7, 9];
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const degMidi = (root, d) => root + 12 * Math.floor(d / 5) + PENTA[((d % 5) + 5) % 5];

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ctx.createGain(); master.gain.value = 0.9;
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); musBus = ctx.createGain();
      sfxBus.connect(master); musBus.connect(master);
      verb = ctx.createConvolver(); verb.buffer = makeIR(2.6);
      verbIn = ctx.createGain(); verbIn.gain.value = 1;
      const vOut = ctx.createGain(); vOut.gain.value = 0.55;
      verbIn.connect(verb); verb.connect(vOut); vOut.connect(master);
      applyVolumes();
      ready = true;
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function makeIR(sec) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = Math.random() * 2 - 1;
        lp += (0.55 - 0.45 * t) * (n - lp);
        d[i] = lp * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
      }
    }
    return b;
  }
  function applyVolumes() {
    if (!ctx) return;
    const s = PROFILE.settings;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(muted ? 0 : s.sfx * s.sfx, t, 0.03);
    musBus.gain.setTargetAtTime(muted ? 0 : s.music * s.music * 0.7, t, 0.08);
  }
  function resume() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }

  // Karplus–Strong plucked string, rendered once per pitch and cached
  function pluckBuf(midi, kind) {
    const key = kind + ':' + midi;
    let b = bufCache.get(key);
    if (b) return b;
    const sr = ctx.sampleRate, f = midiHz(midi);
    const N = Math.max(2, Math.round(sr / f));
    const dur = kind === 'pipa' ? 0.9 : kind === 'qin' ? 3.4 : 2.4;
    const len = Math.floor(sr * dur);
    b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0), line = new Float32Array(N);
    const bright = kind === 'qin' ? 0.28 : kind === 'pipa' ? 0.75 : 0.5;
    let lp = 0;
    for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; lp += bright * (n - lp); line[i] = lp; }
    // remove DC, normalise the excitation
    let mean = 0, peak = 0;
    for (let i = 0; i < N; i++) mean += line[i];
    mean /= N;
    for (let i = 0; i < N; i++) { line[i] -= mean; peak = Math.max(peak, Math.abs(line[i])); }
    for (let i = 0; i < N; i++) line[i] /= peak || 1;
    const damp = kind === 'pipa' ? 0.988 : kind === 'qin' ? 0.9975 : 0.9962;
    const blend = kind === 'qin' ? 0.52 : 0.5;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx], nx = line[idx + 1 < N ? idx + 1 : 0];
      line[idx] = damp * (blend * cur + (1 - blend) * nx);
      d[i] = cur;
      if (++idx >= N) idx = 0;
    }
    const fade = Math.floor(sr * 0.08);
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
    for (let i = 0; i < 24; i++) d[i] *= i / 24;
    bufCache.set(key, b);
    return b;
  }
  function out(node, bus, wet) {
    node.connect(bus);
    if (wet > 0) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verbIn); }
  }
  function pluck(midi, vol, when, kind, bus, wet, bend) {
    if (!ready) return;
    const t = Math.max(ctx.currentTime, when || 0);
    const src = ctx.createBufferSource();
    src.buffer = pluckBuf(clamp(Math.round(midi), 28, 100), kind || 'zheng');
    const g = ctx.createGain(); g.gain.value = vol;
    if (bend) { src.detune.setValueAtTime(bend, t); src.detune.exponentialRampToValueAtTime(0.01, t + 0.12); }
    src.connect(g); out(g, bus || sfxBus, wet == null ? 0.25 : wet);
    src.start(t);
    return src;
  }
  function tone(type, f0, f1, dur, vol, when, bus, wet, attack) {
    if (!ready) return;
    const t = Math.max(ctx.currentTime, when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const a = attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); out(g, bus || sfxBus, wet || 0);
    o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, vol, f0, f1, q, type, when, bus, wet) {
    if (!ready) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = Math.max(ctx.currentTime, when || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); out(g, bus || sfxBus, wet || 0);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  // struck bronze: a few inharmonic partials
  function bell(f, vol, dur, when, bus, wet) {
    if (!ready) return;
    const t = Math.max(ctx.currentTime, when || 0);
    const parts = [[1, 1], [2.02, 0.5], [2.76, 0.35], [4.07, 0.2], [5.4, 0.12]];
    const g = ctx.createGain(); g.gain.value = vol;
    for (const [r, a] of parts) {
      const o = ctx.createOscillator(), pg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * r;
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.exponentialRampToValueAtTime(a, t + 0.003);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + dur / (0.6 + r * 0.4));
      o.connect(pg); pg.connect(g);
      o.start(t); o.stop(t + dur + 0.1);
    }
    out(g, bus || sfxBus, wet == null ? 0.35 : wet);
  }
  function drum(f, vol, dur, when, bus) {
    tone('sine', f * 2.2, f, dur, vol, when, bus, 0.15);
    noise(0.05, vol * 0.5, 900, 300, 0.7, 'lowpass', when, bus);
  }

  // ---- sound effects
  let lastCell = 0;
  const fx = {
    tick() { tone('sine', 1500, 1200, 0.03, 0.04); },
    click() { tone('triangle', 900, 520, 0.05, 0.14); noise(0.02, 0.06, 3000, 3000, 1, 'highpass'); },
    back() { tone('triangle', 520, 380, 0.06, 0.12); },
    pick() { noise(0.07, 0.1, 2600, 4200, 0.8, 'bandpass'); tone('sine', 660, 760, 0.05, 0.05); },
    rotate() { tone('triangle', 1100, 700, 0.04, 0.12); noise(0.03, 0.05, 5000, 2500, 1, 'bandpass'); },
    place(n) {
      tone('sine', 190, 72, 0.13, 0.5);
      noise(0.11, 0.2, 1500, 500, 0.7, 'bandpass');
      pluck(degMidi(50, 2 + (n || 0) % 5), 0.12, 0, 'qin', sfxBus, 0.3);
    },
    bad() { tone('square', 160, 110, 0.1, 0.08); tone('sine', 120, 80, 0.14, 0.25); },
    line(k) {
      const d = 5 + Math.min(12, k);
      pluck(degMidi(62, d), 0.3, 0, 'zheng', sfxBus, 0.4, 30);
      pluck(degMidi(62, d + 2), 0.16, ctx ? ctx.currentTime + 0.07 : 0, 'zheng', sfxBus, 0.4);
      bell(midiHz(degMidi(86, k % 5)), 0.05, 0.9);
    },
    rinse() { noise(0.35, 0.22, 2400, 300, 0.9, 'lowpass', 0, sfxBus, 0.2); tone('sine', 500, 180, 0.2, 0.08); },
    ignite() {
      noise(0.5, 0.3, 300, 5200, 0.9, 'bandpass', 0, sfxBus, 0.3);
      drum(62, 0.8, 0.5);
      lastCell = 0;
    },
    stroke(k) { noise(0.26, 0.2, 700 + k * 90, 3600, 1.2, 'bandpass', 0, sfxBus, 0.2); },
    cell(k) {
      // a rising pentatonic run, as if raking the strings of a zheng
      const d = k % 20;
      const m = degMidi(57, d);
      lastCell = k;
      pluck(m, 0.2 + Math.min(0.14, k * 0.004), 0, 'zheng', sfxBus, 0.28, 18);
    },
    dead() { tone('sine', 150, 110, 0.05, 0.1); },
    chips(k) { pluck(degMidi(69, (k || 0) % 10), 0.14, 0, 'pipa', sfxBus, 0.2); },
    mult(k) { bell(midiHz(degMidi(69, (k || 0) % 10)), 0.14, 0.7); },
    xmult(k) {
      const m = degMidi(57, (k || 0) % 8);
      bell(midiHz(m), 0.24, 1.3); bell(midiHz(m + 7), 0.14, 1.1);
      tone('sine', 110, 55, 0.4, 0.3);
    },
    coin() { tone('sine', 2640, 2640, 0.09, 0.09); tone('sine', 3520, 3520, 0.16, 0.08, ctx ? ctx.currentTime + 0.06 : 0); tone('sine', 5280, 5280, 0.1, 0.03, ctx ? ctx.currentTime + 0.06 : 0); },
    seal() { tone('sine', 150, 58, 0.16, 0.55); noise(0.04, 0.16, 1800, 900, 0.8, 'bandpass'); },
    pure() { bell(midiHz(88), 0.07, 0.8); pluck(81, 0.16, 0, 'zheng', sfxBus, 0.4); },
    char(tier) {
      drum(48, 0.95, 0.7);
      const t = ctx ? ctx.currentTime : 0;
      if (tier >= 3) { bell(midiHz(38), 0.3, 3.2, t, sfxBus, 0.6); bell(midiHz(38) * 1.012, 0.2, 3.2, t, sfxBus, 0.6); }
      const root = 50;
      [0, 2, 4].forEach((d, i) => pluck(degMidi(root, d * 2 + (tier > 3 ? 5 : 0)), 0.3, t + 0.02 + i * 0.045, 'zheng', sfxBus, 0.5, 25));
    },
    total() { const t = ctx ? ctx.currentTime : 0; for (let i = 0; i < 6; i++) pluck(degMidi(62, 3 + i * 2), 0.22, t + i * 0.05, 'zheng', sfxBus, 0.4); },
    count(p) { tone('sine', 700 + 900 * p, 760 + 900 * p, 0.035, 0.06); },
    flame() { noise(0.9, 0.2, 500, 2600, 0.6, 'bandpass', 0, sfxBus, 0.4); bell(midiHz(50), 0.2, 2.2); },
    win() {
      const t = ctx ? ctx.currentTime : 0;
      [0, 1, 2, 3, 4, 5, 7, 9].forEach((d, i) => pluck(degMidi(62, d), 0.3, t + i * 0.085, 'zheng', sfxBus, 0.5, 20));
      [5, 7, 9].forEach((d) => pluck(degMidi(62, d), 0.26, t + 0.82, 'zheng', sfxBus, 0.6));
      bell(midiHz(74), 0.12, 2.4, t + 0.82);
      drum(55, 0.5, 0.5, t + 0.82);
    },
    lose() {
      const t = ctx ? ctx.currentTime : 0;
      [9, 7, 5, 3].forEach((d, i) => pluck(degMidi(47, d) - (i === 3 ? 1 : 0), 0.34, t + i * 0.3, 'qin', sfxBus, 0.6, -30));
      bell(midiHz(35), 0.3, 3.6, t + 1.0, sfxBus, 0.7);
    },
    victory() {
      const t = ctx ? ctx.currentTime : 0;
      const seq = [0, 2, 4, 5, 7, 9, 10, 12, 14];
      seq.forEach((d, i) => pluck(degMidi(50, d), 0.34, t + i * 0.11, 'zheng', sfxBus, 0.6, 22));
      [0, 5, 7, 10, 12].forEach((d) => pluck(degMidi(50, d), 0.3, t + 1.15, 'zheng', sfxBus, 0.7));
      bell(midiHz(38), 0.36, 4.5, t + 1.15, sfxBus, 0.7); bell(midiHz(62), 0.2, 3.5, t + 1.15, sfxBus, 0.7);
      drum(45, 0.9, 0.9, t + 1.15);
    },
    buy() { fx.coin(); tone('triangle', 500, 700, 0.07, 0.1); },
    sell() { tone('sine', 1760, 1320, 0.1, 0.09); tone('sine', 2640, 2640, 0.1, 0.06, ctx ? ctx.currentTime + 0.05 : 0); },
    deny() { tone('sine', 220, 180, 0.09, 0.2); tone('sine', 196, 150, 0.12, 0.2, ctx ? ctx.currentTime + 0.09 : 0); },
    reroll() { const t = ctx ? ctx.currentTime : 0; for (let i = 0; i < 4; i++) noise(0.06, 0.12, 2500 + i * 500, 4500, 1, 'bandpass', t + i * 0.05); },
    open() { noise(0.4, 0.2, 500, 4500, 0.8, 'bandpass', 0, sfxBus, 0.3); const t = ctx ? ctx.currentTime : 0; [4, 6, 8].forEach((d, i) => bell(midiHz(degMidi(74, d)), 0.08, 1.0, t + 0.12 + i * 0.07)); },
    level() { const t = ctx ? ctx.currentTime : 0; [2, 4, 7, 9].forEach((d, i) => pluck(degMidi(69, d), 0.24, t + i * 0.06, 'zheng', sfxBus, 0.5)); bell(midiHz(86), 0.07, 1.2, t + 0.24); },
    ach() { const t = ctx ? ctx.currentTime : 0; [0, 4, 7].forEach((d, i) => bell(midiHz(degMidi(74, d)), 0.12, 1.8, t + i * 0.09)); },
    paper() { noise(0.16, 0.12, 1800, 5000, 0.7, 'bandpass'); },
    stone() { tone('sine', 120, 60, 0.16, 0.4); noise(0.08, 0.2, 600, 200, 0.6, 'lowpass'); },
    shatter() { noise(0.3, 0.25, 5000, 1200, 0.8, 'highpass'); bell(midiHz(96), 0.08, 0.5); },
    newchar() { const t = ctx ? ctx.currentTime : 0; [0, 2, 4, 7, 9, 12].forEach((d, i) => bell(midiHz(degMidi(74, d)), 0.07, 1.4, t + i * 0.055)); },
    use() { noise(0.2, 0.14, 800, 3500, 1, 'bandpass', 0, sfxBus, 0.3); pluck(74, 0.2, 0, 'zheng', sfxBus, 0.5); },
    boss() { drum(40, 1, 1.1); bell(midiHz(33), 0.4, 4, 0, sfxBus, 0.7); bell(midiHz(33) * 1.02, 0.25, 4, 0, sfxBus, 0.7); },
  };
  function play(name, a) {
    if (!ready || muted || ctx.state !== 'running') return;
    const f = fx[name];
    if (f) { try { f(a); } catch (e) { /* audio must never break the game */ } }
  }

  // ---- generative music
  const music = { on: false, mode: 'calm', timer: 0, next: 0, beat: 0, phrase: [], pIdx: 0, rest: 0, last: 5, droneG: null, droneNodes: [], bar: 0 };
  const MODES = {
    title: { root: 50, bpm: 46, dens: 0.55, drum: 0, kind: 'qin', drone: [38, 45], low: 3, hi: 13 },
    calm:  { root: 50, bpm: 54, dens: 0.62, drum: 0, kind: 'zheng', drone: [38, 45], low: 4, hi: 15 },
    shop:  { root: 55, bpm: 72, dens: 0.8, drum: 0, kind: 'pipa', drone: [43, 50], low: 5, hi: 16 },
    boss:  { root: 47, bpm: 66, dens: 0.72, drum: 1, kind: 'zheng', drone: [35, 42], low: 3, hi: 14, minor: true },
  };
  function startDrone(md) {
    stopDrone();
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.085, t + 4);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const nodes = [];
    md.drone.forEach((m, i) => {
      for (const det of [-4, 5]) {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = midiHz(m); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = i === 0 ? 0.5 : 0.3;
        o.connect(og); og.connect(lp); o.start(t); nodes.push(o);
      }
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain); lfo.start(t); nodes.push(lfo);
    lp.connect(g); out(g, musBus, 0.5);
    music.droneG = g; music.droneNodes = nodes;
  }
  function stopDrone() {
    if (!music.droneG) return;
    const t = ctx.currentTime, g = music.droneG, nodes = music.droneNodes;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0.0001, t, 0.6);
    setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (e) { /* already stopped */ } } try { g.disconnect(); } catch (e) { /* gone */ } }, 3500);
    music.droneG = null; music.droneNodes = [];
  }
  function newPhrase(md) {
    const n = 3 + Math.floor(Math.random() * 5);
    const ph = [];
    let d = music.last;
    for (let i = 0; i < n; i++) {
      const step = [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(Math.random() * 8)];
      d = clamp(d + step, md.low, md.hi);
      const len = [1, 1, 2, 2, 0.5, 0.5, 3][Math.floor(Math.random() * 7)];
      ph.push({ d, len });
    }
    // phrases like to come home to the tonic or the fifth
    const home = [5, 8, 10, 3][Math.floor(Math.random() * 4)];
    ph[ph.length - 1] = { d: clamp(home, md.low, md.hi), len: 3 };
    music.last = ph[ph.length - 1].d;
    return ph;
  }
  function breath(midi, dur, vol, when) {
    // a bamboo flute: a sine with a little vibrato and a breath of noise
    const t = when, f = midiHz(midi);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 4.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.008, t + dur * 0.6);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = f * 2; g2.gain.value = 0.18;
    o2.connect(g2); g2.connect(g);
    o.connect(g); out(g, musBus, 0.7);
    o.start(t); o2.start(t); lfo.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    noise(dur, vol * 0.25, f * 2, f * 2, 3, 'bandpass', t, musBus, 0.5);
  }
  function schedule() {
    if (!music.on || !ready) return;
    if (ctx.state !== 'running') return;
    const md = MODES[music.mode] || MODES.calm;
    const spb = 60 / md.bpm;
    if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.1;
    while (music.next < ctx.currentTime + 0.5) {
      const t = music.next;
      if (md.drum && music.beat % 2 === 0) { tone('sine', 110, 46, 0.5, music.beat % 8 === 0 ? 0.42 : 0.2, t, musBus, 0.3); }
      if (music.rest > 0) { music.rest -= 0.5; }
      else {
        if (music.pIdx >= music.phrase.length) {
          music.phrase = Math.random() < md.dens ? newPhrase(md) : [];
          music.pIdx = 0;
          if (!music.phrase.length) music.rest = 2 + Math.floor(Math.random() * 4);
          else if (Math.random() < 0.22 && music.mode !== 'shop') {
            const d = music.phrase[0].d + 5;
            breath(degMidi(md.root + (md.minor ? 0 : 0), clamp(d, 8, 17)), spb * 4, 0.035, t + spb * 0.5);
          }
        }
        const nt = music.phrase[music.pIdx];
        if (nt) {
          const midi = degMidi(md.root, nt.d) - (md.minor && nt.d % 5 === 2 ? 1 : 0);
          const v = 0.2 + Math.random() * 0.1;
          pluck(midi, v, t, md.kind, musBus, 0.55, Math.random() < 0.3 ? 28 : 0);
          if (Math.random() < 0.18) pluck(midi - 12, v * 0.7, t + 0.01, 'qin', musBus, 0.5);
          if (md.kind === 'pipa' && Math.random() < 0.4) pluck(midi, v * 0.6, t + spb * 0.25, 'pipa', musBus, 0.4);
          if (Math.random() < 0.07) bell(midiHz(midi + 24), 0.02, 1.6, t + spb * 0.5, musBus, 0.6);
          music.rest = nt.len - 0.5;
          music.pIdx++;
          if (music.pIdx >= music.phrase.length) music.rest += 1 + Math.floor(Math.random() * 3);
        }
      }
      music.beat++;
      music.next += spb * 0.5;
    }
  }
  function setMusic(mode) {
    if (!ready) { music.mode = mode; return; }
    if (music.mode === mode && music.on) return;
    music.mode = mode;
    if (music.on) { startDrone(MODES[mode] || MODES.calm); music.phrase = []; music.pIdx = 0; music.rest = 2; }
  }
  function startMusic() {
    if (!ready || music.on) return;
    music.on = true;
    music.next = ctx.currentTime + 0.3; music.rest = 2; music.phrase = []; music.pIdx = 0;
    startDrone(MODES[music.mode] || MODES.calm);
    music.timer = setInterval(schedule, 120);
  }
  function stopMusic() {
    if (!music.on) return;
    music.on = false;
    clearInterval(music.timer);
    if (ready) stopDrone();
  }
  return {
    init, resume, suspend, play, applyVolumes, setMusic, startMusic, stopMusic,
    get ready() { return ready; },
    get running() { return !!ctx && ctx.state === 'running'; },
    setMuted(v) { muted = v; applyVolumes(); },
    _ctx: () => ctx,
  };
})();

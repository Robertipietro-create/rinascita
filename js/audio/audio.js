/* =========================================================
   audio.js — tutti i suoni sono sintetizzati con Web Audio API
   Due famiglie:
   - "voci continue" degli strumenti (spugna, getto, aspirapolvere,
     raschietto) che seguono la velocità del dito
   - "one-shot": pop, toc, tonfi, campanelli, cristalli, vetro...
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;

  const A = { ctx: null, master: null, ready: false, muted: false, voices: {} };

  // Su iPhone l'audio si sblocca solo dentro un gesto dell'utente
  A.unlock = function () {
    if (A.ready) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.8;
    // un compressore morbido tiene tutto piacevole anche con tanti suoni
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    // riverbero corto sintetico: rende i suoni "di stanza"
    A.verb = A.ctx.createConvolver();
    A.verb.buffer = A.impulse(1.4, 3);
    A.verbGain = A.ctx.createGain(); A.verbGain.gain.value = 0.18;
    A.master.connect(comp);
    A.master.connect(A.verbGain); A.verbGain.connect(A.verb); A.verb.connect(comp);
    comp.connect(A.ctx.destination);
    A.noise = A.makeNoise(2);
    A.brown = A.makeBrown(2);
    A.ready = true;
    // buffer silenzioso: trucco per sbloccare iOS
    const s = A.ctx.createBufferSource(); s.buffer = A.ctx.createBuffer(1, 1, 22050); s.connect(A.master); s.start(0);
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.ready) A.master.gain.setTargetAtTime(m ? 0 : 0.8, A.ctx.currentTime, 0.05);
  };

  A.makeNoise = function (sec) {
    const n = A.ctx.sampleRate * sec, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  A.makeBrown = function (sec) {
    const n = A.ctx.sampleRate * sec, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  };
  A.impulse = function (sec, decay) {
    const rate = A.ctx.sampleRate, n = rate * sec, b = A.ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  };

  // ---------- mattoncini ----------
  const now = () => A.ctx.currentTime;
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f0, f1, t, a, d, vol, dest) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    env(g, t, a, vol, d);
    o.connect(g); g.connect(dest || A.master);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function noiseHit(filterType, freq, q, t, a, d, vol, buf, f1) {
    const s = A.ctx.createBufferSource(); s.buffer = buf || A.noise;
    s.playbackRate.value = 1;
    const f = A.ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    const g = A.ctx.createGain(); env(g, t, a, vol, d);
    s.connect(f); f.connect(g); g.connect(A.master);
    const off = Math.random() * 1.5;
    s.start(t, off); s.stop(t + a + d + 0.05);
  }

  // ---------- voci continue degli strumenti ----------
  // ogni voce ha un gain principale che segue "intensità" (velocità del dito)
  function makeVoice(kind) {
    const c = A.ctx, out = c.createGain(); out.gain.value = 0; out.connect(A.master);
    const v = { kind, out, nodes: [], level: 0 };
    const loopNoise = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random()); v.nodes.push(s); return s; };
    if (kind === 'sponge') {
      // sfregamento umido: rumore passabanda modulato + "squeak" occasionali
      const s = loopNoise(A.noise);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 3500;
      s.connect(f); f.connect(f2); f2.connect(out);
      v.filter = f;
    } else if (kind === 'washer') {
      // getto: sibilo acuto + rombo della pompa
      const s = loopNoise(A.noise);
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g1 = c.createGain(); g1.gain.value = 0.7;
      s.connect(f); f.connect(g1); g1.connect(out);
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58; o.start();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      const g2 = c.createGain(); g2.gain.value = 0.35;
      o.connect(lp); lp.connect(g2); g2.connect(out);
      v.nodes.push(o); v.filter = f; v.osc = o;
    } else if (kind === 'vacuum') {
      // motore che ronza e sale di tono quando aspira
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; o.start();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 3;
      const g1 = c.createGain(); g1.gain.value = 0.25;
      o.connect(lp); lp.connect(g1); g1.connect(out);
      const s = loopNoise(A.noise);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
      const g2 = c.createGain(); g2.gain.value = 0.6;
      s.connect(bp); bp.connect(g2); g2.connect(out);
      v.nodes.push(o); v.osc = o; v.filter = bp; v.lp = lp;
    } else if (kind === 'scraper') {
      // raschiare: rumore granuloso passabanda con modulazione d'ampiezza veloce
      const s = loopNoise(A.noise);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2.5;
      const am = c.createGain(); am.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 34; lfo.start();
      const lfoG = c.createGain(); lfoG.gain.value = 0.45;
      lfo.connect(lfoG); lfoG.connect(am.gain);
      s.connect(bp); bp.connect(am); am.connect(out);
      v.nodes.push(lfo); v.filter = bp; v.lfo = lfo;
    } else if (kind === 'shovel') {
      // pala nel fango: rumore marrone, cupo e "molle"
      const s = loopNoise(A.brown);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 4;
      s.connect(lp); lp.connect(out);
      v.filter = lp;
    } else if (kind === 'roller') {
      // rullo: fruscio appiccicoso
      const s = loopNoise(A.noise);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.8;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
      s.connect(bp); bp.connect(lp); lp.connect(out);
      v.filter = bp;
    } else if (kind === 'wind') {
      // vento lontano per l'atmosfera della scoperta
      const s = loopNoise(A.noise);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 6;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.13; lfo.start();
      const lg = c.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(bp.frequency);
      s.connect(bp); bp.connect(out);
      v.nodes.push(lfo); v.filter = bp;
    }
    return v;
  }

  // imposta il livello (0..1) e un parametro "vivacità" (0..1) di una voce continua
  A.voice = function (kind, level, bright) {
    if (!A.ready) return;
    let v = A.voices[kind];
    if (!v) { if (level <= 0) return; v = A.voices[kind] = makeVoice(kind); }
    const t = now();
    const vols = { sponge: 0.5, washer: 0.32, vacuum: 0.35, scraper: 0.45, shovel: 0.9, roller: 0.5, wind: 0.25 };
    v.out.gain.setTargetAtTime(Math.max(0, level) * (vols[kind] || 0.4), t, level > v.level ? 0.03 : 0.12);
    v.level = level;
    const b = bright === undefined ? 0.5 : bright;
    if (kind === 'sponge') v.filter.frequency.setTargetAtTime(900 + b * 1600, t, 0.05);
    if (kind === 'washer') { v.filter.frequency.setTargetAtTime(2000 + b * 2500, t, 0.08); }
    if (kind === 'vacuum') { v.osc.frequency.setTargetAtTime(110 + b * 70, t, 0.2); v.filter.frequency.setTargetAtTime(700 + b * 1400, t, 0.1); }
    if (kind === 'scraper') { v.filter.frequency.setTargetAtTime(1800 + b * 2400, t, 0.03); v.lfo.frequency.setTargetAtTime(18 + b * 40, t, 0.05); }
    if (kind === 'shovel') v.filter.frequency.setTargetAtTime(250 + b * 500, t, 0.05);
    if (kind === 'roller') v.filter.frequency.setTargetAtTime(500 + b * 600, t, 0.05);
  };
  A.stopVoices = function () { for (const k in A.voices) A.voice(k, 0); };

  // ---------- one-shot ----------
  const S = {};
  // bolla che scoppia
  S.pop = (pitch) => { const t = now(), p = pitch || U.rand(0.8, 1.4); tone('sine', 500 * p, 1300 * p, t, 0.003, 0.06, 0.18); };
  // il "toc" di una tessera/doga posata
  S.toc = (pitch) => {
    const t = now(), p = pitch || U.rand(0.9, 1.1);
    tone('sine', 520 * p, 260 * p, t, 0.002, 0.09, 0.4);
    noiseHit('bandpass', 2200 * p, 3, t, 0.001, 0.04, 0.25);
  };
  // clic d'interfaccia
  S.click = () => { const t = now(); tone('triangle', 900, 700, t, 0.002, 0.05, 0.18); };
  S.soft = () => { const t = now(); tone('sine', 660, 620, t, 0.005, 0.12, 0.12); };
  // tonfo sordo (oggetti che cadono)
  S.thud = (w) => {
    const t = now(), k = w || 1;
    tone('sine', 140 / k, 50, t, 0.003, 0.18, 0.55);
    noiseHit('lowpass', 900, 1, t, 0.001, 0.1, 0.4 * k);
  };
  // rumore di metallo nel cassone
  S.clank = () => {
    const t = now();
    [1, 2.76, 5.4].forEach((m, i) => tone('triangle', 180 * m * U.rand(0.95, 1.05), null, t, 0.002, 0.35 / (i + 1), 0.12));
    noiseHit('bandpass', 1500, 1.5, t, 0.001, 0.08, 0.35);
  };
  // pala che si infila / zolla che cade
  S.splat = () => {
    const t = now();
    noiseHit('lowpass', 700, 2, t, 0.003, 0.14, 0.6, A.brown, 200);
    tone('sine', 90, 55, t, 0.004, 0.12, 0.35);
  };
  // goccia
  S.drop = () => { const t = now(), f = U.rand(900, 1500); tone('sine', f, f * 1.9, t, 0.002, 0.05, 0.1); };
  // scaglia di vernice che si stacca
  S.flake = () => { const t = now(); noiseHit('highpass', 4000, 1, t, 0.001, 0.03, 0.15); };
  // whoosh
  S.whoosh = (up) => { const t = now(); noiseHit('bandpass', up ? 400 : 2000, 1.5, t, 0.08, 0.3, 0.3, null, up ? 2400 : 300); };
  // campanello: parziali inarmoniche con decadimento lungo
  S.bell = (freq, vol) => {
    const t = now(), f = freq || 880, v = vol || 0.2;
    [[1, 1], [2.0, 0.5], [3.01, 0.3], [4.2, 0.18], [5.43, 0.1]].forEach(([m, a]) => tone('sine', f * m, null, t, 0.003, 1.6 / Math.sqrt(m), v * a));
  };
  // ding dei traguardi 25/50/75/100
  S.milestone = (step) => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const n = notes[U.clamp(step, 0, 3)];
    S.bell(n, 0.2);
    if (step >= 3) setTimeout(() => S.bell(n * 1.5, 0.14), 120);
  };
  // luccichio cristallino quando una superficie arriva al 100%
  S.sparkle = () => {
    const base = [1318.5, 1567.98, 2093, 2637, 3135.96];
    base.forEach((f, i) => setTimeout(() => { if (A.ready) tone('sine', f, null, now(), 0.002, 0.5, 0.08); }, i * 55));
  };
  // accordo di completamento fase
  S.complete = () => {
    const ch = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    ch.forEach((f, i) => setTimeout(() => { if (A.ready) S.bell(f, 0.13); }, i * 90));
  };
  // vetro nuovo che si incastra
  S.glass = () => {
    const t = now();
    [2400, 3200, 4100].forEach((f, i) => tone('sine', f, null, t + i * 0.02, 0.001, 0.6, 0.07));
    noiseHit('highpass', 6000, 1, t, 0.001, 0.05, 0.12);
  };
  // colpo di martello / asse che si spacca
  S.crack = () => {
    const t = now();
    noiseHit('bandpass', 1200, 0.8, t, 0.001, 0.12, 0.7);
    tone('square', 160, 60, t, 0.001, 0.08, 0.15);
  };
  S.hammer = () => {
    const t = now();
    tone('triangle', 260, 120, t, 0.001, 0.08, 0.35);
    noiseHit('bandpass', 2500, 2, t, 0.001, 0.05, 0.4);
  };
  // spatola di stucco
  S.putty = () => { const t = now(); noiseHit('bandpass', 900, 1.5, t, 0.01, 0.12, 0.25, A.brown, 1600); };
  // carta da parati che si srotola
  S.unroll = () => { const t = now(); noiseHit('bandpass', 1500, 0.9, t, 0.02, 0.45, 0.2, null, 600); tone('sine', 300, 200, t + 0.45, 0.002, 0.08, 0.2); };
  // camion che porta via il cassone
  S.truck = () => {
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), lp = A.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(45, t); o.frequency.linearRampToValueAtTime(70, t + 1.2); o.frequency.linearRampToValueAtTime(50, t + 2.6);
    lp.type = 'lowpass'; lp.frequency.value = 300;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.connect(lp); lp.connect(g); g.connect(A.master); o.start(t); o.stop(t + 3);
    S.clank();
  };
  // cardini che cigolano (imposte, porte)
  S.creak = () => {
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), bp = A.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t);
    for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(100 + Math.random() * 80, t + i * 0.07);
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    o.connect(bp); bp.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.7);
  };
  // uccellini fuori dalla finestra
  S.birds = () => {
    [0, 0.18, 0.5, 0.62].forEach(d => setTimeout(() => { if (A.ready) { const f = U.rand(2600, 3400); tone('sine', f, f * 1.25, now(), 0.01, 0.07, 0.05); } }, d * 1000));
  };
  // interruttore della luce
  S.switch = () => { const t = now(); noiseHit('highpass', 3000, 1, t, 0.001, 0.02, 0.3); tone('sine', 1800, 1600, t, 0.001, 0.03, 0.08); };
  // fusa del gatto
  S.purr = () => {
    const t = now();
    const s = A.ctx.createBufferSource(); s.buffer = A.brown;
    const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const am = A.ctx.createGain(); am.gain.value = 0.4;
    const lfo = A.ctx.createOscillator(); lfo.frequency.value = 24; const lg = A.ctx.createGain(); lg.gain.value = 0.4;
    lfo.connect(lg); lg.connect(am.gain);
    const g = A.ctx.createGain(); env(g, t, 0.3, 0.5, 1.6);
    s.connect(lp); lp.connect(am); am.connect(g); g.connect(A.master);
    s.start(t); lfo.start(t); s.stop(t + 2); lfo.stop(t + 2);
  };
  // pianta che cresce: piccola scala ascendente
  S.grow = () => { [784, 988, 1175].forEach((f, i) => setTimeout(() => { if (A.ready) tone('sine', f, f * 1.02, now(), 0.01, 0.15, 0.08); }, i * 70)); };
  // stella guadagnata
  S.star = (i) => { const f = [880, 1108.7, 1318.5][i] || 880; S.bell(f, 0.22); setTimeout(() => S.sparkle(), 80); };

  A.play = function (name, a, b) {
    if (!A.ready || A.muted) return;
    const fn = S[name];
    if (fn) { try { fn(a, b); } catch (e) { /* un suono non deve mai rompere il gioco */ } }
  };

  R.Audio = A;
})(window.R);

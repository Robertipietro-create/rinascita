/* =========================================================
   main.js — regia del gioco
   carica il luogo a passi (barra di caricamento), gestisce le
   fasi, l'atmosfera (luce, sfondo), la camera e le foto.
   Debug: index.html#fase=pulizia salta a una fase.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Sc = R.Scene, P = R.P;

  const G = {
    room: null, lv: null,
    phaseIdx: -1, phase: null,
    env: { bg0: [74, 65, 82], bg1: [43, 38, 51], dark: 0.78, tint: [18, 12, 28], beam: 1, beamCol: [255, 225, 160], motes: 1 },
    lightsExtra: [],
    photos: {},
    margins: { top: 70, bottom: 120 }
  };

  // ordine delle fasi (Rivelazione compresa)
  G.PHASES = ['discovery', 'clearing', 'cleaning', 'repair', 'build', 'decor', 'reveal'];
  G.PHASE_NAMES = { discovery: 'Scoperta', clearing: 'Sgombero', cleaning: 'Pulizia', repair: 'Riparazione', build: 'Costruzione', decor: 'Arredo', reveal: 'Rivelazione' };
  const ALIAS = { scoperta: 'discovery', sgombero: 'clearing', pulizia: 'cleaning', riparazione: 'repair', costruzione: 'build', arredo: 'decor', rivelazione: 'reveal' };
  R.Phases = R.Phases || {};

  // ---------------- avvio ----------------
  function boot() {
    E.init(document.getElementById('game'));
    UI.init();
    E.onResize = () => { if (G.room) G.fitCamera(false, G.camWithSkip); };
    E.update = update;
    E.onInput = () => R.Story.input();
    E.draw = draw;
    titleScreen();
    loadLevel(R.Levels.salotto);
  }

  // schermata del titolo: luce calda e pulviscolo
  function titleScreen() {
    const cv = document.getElementById('title-bg'), ctx = cv.getContext('2d');
    const motes = [];
    for (let i = 0; i < 60; i++) motes.push({ x: Math.random(), y: Math.random(), s: U.rand(0.5, 2), p: U.rand(0, 6) });
    let alive = true;
    G.stopTitle = () => { alive = false; };
    const tick = () => {
      if (!alive) return;
      const w = cv.width = innerWidth, h = cv.height = innerHeight;
      const g = ctx.createRadialGradient(w * 0.7, h * 0.2, 10, w * 0.5, h * 0.5, Math.max(w, h));
      g.addColorStop(0, '#6b5260'); g.addColorStop(0.5, '#3a3140'); g.addColorStop(1, '#221d29');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // raggio di luce
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(w * 0.8, 0, w * 0.3, h);
      bg.addColorStop(0, 'rgba(255,220,160,0.18)'); bg.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(w * 0.7, 0); ctx.lineTo(w * 0.95, 0); ctx.lineTo(w * 0.55, h); ctx.lineTo(w * 0.1, h); ctx.fill();
      const t = performance.now() / 1000;
      for (const m of motes) {
        const x = (m.x + Math.sin(t * 0.2 + m.p) * 0.02) * w, y = ((m.y - t * 0.01 * m.s) % 1 + 1) % 1 * h;
        ctx.fillStyle = `rgba(255,235,200,${0.3 + Math.sin(t + m.p) * 0.25})`;
        ctx.beginPath(); ctx.arc(x, y, m.s, 0, U.TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(tick);
    };
    tick();
  }

  // generazione a passi, cedendo il controllo al browser tra un passo e l'altro
  function loadLevel(lv) {
    G.lv = lv;
    R.Story.reset();
    const room = new R.Room(lv);
    const steps = room.steps();
    const fill = document.getElementById('loading-fill');
    let i = 0;
    const run = () => {
      const t0 = performance.now();
      while (i < steps.length && performance.now() - t0 < 30) { steps[i](); i++; }
      fill.style.width = (i / steps.length * 100) + '%';
      if (i < steps.length) setTimeout(run, 0);
      else ready(room);
    };
    setTimeout(run, 30);
  }

  function ready(room) {
    G.room = room;
    G.fitCamera(true, false);
    const btn = document.getElementById('btn-start');
    document.getElementById('loading').classList.add('hidden');
    btn.classList.remove('hidden');
    const jump = (location.hash.match(/fase=(\w+)/) || [])[1];
    const start = () => {
      R.Audio.unlock();
      R.Audio.play('soft');
      document.getElementById('title-screen').classList.add('fade');
      setTimeout(() => { document.getElementById('title-screen').classList.add('hidden'); G.stopTitle(); }, 900);
      if (jump) G.jumpTo(ALIAS[jump] || jump);
      else G.goPhase(0);
    };
    btn.addEventListener('click', start, { once: true });
    if (/auto/.test(location.hash)) start(); // per i test automatici
  }

  // ---------------- fasi ----------------
  G.goPhase = function (idx) {
    if (G.phase && G.phase.exit) G.phase.exit(G);
    E.clearTimers();
    UI.hideAll();
    UI.showProgress(false);
    R.Audio.stopVoices();
    G.phaseIdx = idx;
    const id = G.PHASES[idx];
    G.phase = R.Phases[id];
    E.handler = G.phase;
    UI.setPhase(G.PHASE_NAMES[id], idx, G.PHASES.length);
    if (idx > 0) UI.card('Fase ' + idx + ' di ' + (G.PHASES.length - 1), G.PHASE_NAMES[id], G.phase.subtitle || '');
    G.phase.enter(G);
  };
  G.next = function () {
    R.Audio.play('whoosh', true);
    G.goPhase(G.phaseIdx + 1);
  };
  // salto diretto (debug): completa all'istante le fasi precedenti
  G.jumpTo = function (id) {
    const idx = Math.max(0, G.PHASES.indexOf(id));
    for (let i = 0; i < idx; i++) { const ph = R.Phases[G.PHASES[i]]; if (ph.skip) ph.skip(G); }
    if (idx > 1) G.setMood('day', 0.01);
    G.goPhase(idx);
  };

  // ---------------- atmosfera ----------------
  G.setMood = function (name, dur, extra) {
    const m = Sc.MOODS[name];
    const to = { dark: m.dark };
    const b0 = U.hex(m.bg[0]), b1 = U.hex(m.bg[1]);
    const env = G.env;
    const from = { bg0: env.bg0.slice(), bg1: env.bg1.slice(), tint: env.tint.slice() };
    const k = { t: 0 };
    E.tween(k, { t: 1 }, dur || 1.5, U.ease.inOutQuad);
    E.tween(env, Object.assign(to, extra || {}), dur || 1.5, U.ease.inOutQuad);
    G.moodLerp = () => {
      env.bg0 = U.mix(from.bg0, b0, k.t); env.bg1 = U.mix(from.bg1, b1, k.t); env.tint = U.mix(from.tint, m.tint, k.t);
      if (k.t >= 1) G.moodLerp = null;
    };
  };

  // ---------------- camera ----------------
  G.camWithSkip = false;
  G.fitCamera = function (withSkip, animate, extraBottom) {
    G.camWithSkip = withSkip;
    const b = G.room.bounds(withSkip);
    const top = G.margins.top + 10, bottom = (extraBottom !== undefined ? extraBottom : G.margins.bottom) + 10;
    const aw = E.w - 8, ah = Math.max(100, E.h - top - bottom);
    const z = Math.min(aw / (b.x1 - b.x0) * (withSkip ? 1 : 1.05), ah / (b.y1 - b.y0)) * 0.99; // in verticale tagliamo appena gli spigoli esterni
    const c = E.cam;
    c.fitZoom = z;
    const target = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, zoom: z };
    E.camBounds = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    const vcy = (top + (E.h - bottom)) / 2 / E.h;
    if (animate) {
      E.tween(E, { viewCenterY: vcy }, 1.2, U.ease.inOutCubic);
      E.tween(c, target, 1.2, U.ease.inOutCubic);
    } else { E.viewCenterY = vcy; Object.assign(c, target); }
  };

  // ---------------- ciclo ----------------
  function update(dt) {
    const room = G.room;
    if (!room) return;
    room.time += dt;
    if (G.moodLerp) G.moodLerp();
    if (G.phase && G.phase.update) G.phase.update(dt, G);
    R.Story.update(dt, G);
    // il gatto alla finestra: si fa vedere ogni tanto, finché la casa non è pronta
    if (room.winState) {
      const on = G.phaseIdx >= 1 && G.phaseIdx <= 4 && (room.time % 34) < 7;
      room.winState.cat = U.lerp(room.winState.cat || 0, on ? 1 : 0, Math.min(1, dt * 2));
    }
    P.update(dt);
    Sc.updateMotes(dt, G.lv, G.env.motes);
    for (const s of room.surfaces) s.dry(dt);
    for (const p of room.people) R.People.update(p, dt);
  }

  // composizione di un fotogramma su un contesto qualunque (schermo o foto)
  G.render = function (ctx, w, h, dpr, camM, opt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Sc.drawBackground(ctx, w, h, [U.rgb(G.env.bg0), U.rgb(G.env.bg1)]);
    G.room.draw(ctx, camM, Object.assign({
      motes: G.env.motes > 0.05,
      overObjects: (c) => { if (G.phase && G.phase.drawWorld) G.phase.drawWorld(c, G); R.Story.drawGlimmer(c); },
      underObjects: G.phase && G.phase.underObjects ? (c) => G.phase.underObjects(c, G) : null
    }, opt || {}));
    const lights = G.room.itemLights().concat(G.lightsExtra);
    Sc.drawLight(ctx, camM, G.lv, { dark: G.env.dark, tint: G.env.tint, beam: G.env.beam, beamCol: G.env.beamCol, lights }, w, h, dpr);
  };

  function draw(ctx) {
    if (!G.room) return;
    G.render(ctx, E.w, E.h, E.dpr, E.camMatrix());
    if (G.phase && G.phase.drawOver) {
      ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
      G.phase.drawOver(ctx, G);
    }
    if (G.flash > 0) { // flash della fotografia
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,255,255,${G.flash})`;
      ctx.fillRect(0, 0, E.canvas.width, E.canvas.height);
    }
  }

  // foto del diorama (per l'album e per lo slider prima/dopo)
  G.photo = function (w, h) {
    w = w || 640; h = h || 480;
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    const b = G.room.bounds(false);
    const z = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * 0.9;
    const camM = [z, 0, 0, z, w / 2 - (b.x0 + b.x1) / 2 * z, h / 2 - (b.y0 + b.y1) / 2 * z];
    G.render(ctx, w, h, 1, camM, { noParticles: true, overObjects: null, underObjects: null });
    return c.toDataURL('image/jpeg', 0.82);
  };
  G.shutter = function () {
    G.flash = 0.9;
    E.tween(G, { flash: 0 }, 0.6, U.ease.outQuad);
    R.Audio.play('switch'); R.Audio.play('whoosh');
  };

  // punto di contatto → coordinate vista, con l'eventuale offset per il touch
  G.pointView = function (e, offset) {
    const off = e.type === 'touch' || e.type === 'pen' ? (offset || 0) : 0;
    const v = E.screenToView(e.x, e.y - off);
    return { vx: v[0], vy: v[1], sx: e.x, sy: e.y - off };
  };

  R.G = G;
  window.addEventListener('load', boot);
})(window.R);

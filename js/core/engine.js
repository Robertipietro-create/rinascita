/* =========================================================
   engine.js — cuore del motore
   - canvas a tutto schermo con pixel ratio limitato (60 fps su iPhone)
   - loop con dt
   - camera: pan/zoom con due dita, rotellina, "punch" di feedback
   - input unificato mouse/touch (Pointer Events)
   - tween e timer
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;

  const E = {
    canvas: null, ctx: null,
    w: 0, h: 0, dpr: 1,
    time: 0, dt: 0,
    // camera in coordinate "vista" (le coordinate isometriche prima dello zoom)
    cam: { x: 0, y: 0, zoom: 1, fitZoom: 1, minZoom: 0.6, maxZoom: 3, punch: 0, shake: 0 },
    camLocked: false,   // durante le inquadrature cinematiche
    handler: null,      // chi riceve l'input (la fase corrente)
    pointers: new Map(),
    gesture: null,
    tweens: [],
    timers: [],
    onResize: null,
    update: null,
    draw: null
  };

  E.init = function (canvas) {
    E.canvas = canvas;
    E.ctx = canvas.getContext('2d');
    E.resize();
    window.addEventListener('resize', E.resize);
    window.addEventListener('orientationchange', () => setTimeout(E.resize, 200));
    E.bindInput();
    let last = performance.now();
    const loop = (now) => {
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.05) dt = 0.05; // dopo una pausa non "saltiamo"
      E.dt = dt; E.time += dt;
      E.step(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  E.resize = function () {
    const dpr = window.devicePixelRatio || 1; // sempre la risoluzione piena dello schermo
    const w = window.innerWidth, h = window.innerHeight;
    E.w = w; E.h = h; E.dpr = dpr;
    E.canvas.width = Math.round(w * dpr);
    E.canvas.height = Math.round(h * dpr);
    E.canvas.style.width = w + 'px';
    E.canvas.style.height = h + 'px';
    if (E.onResize) E.onResize();
  };

  // ---------- Camera ----------
  // matrice vista → pixel del canvas
  E.camMatrix = function () {
    const c = E.cam;
    const z = c.zoom * (1 + c.punch) * E.dpr;
    let sx = 0, sy = 0;
    if (c.shake > 0) { sx = U.rand(-1, 1) * c.shake; sy = U.rand(-1, 1) * c.shake; }
    // il centro dello schermo è un po' più in alto per lasciare spazio alla barra strumenti
    const cx = E.w / 2 + sx, cy = E.h * E.viewCenterY + sy;
    return [z, 0, 0, z, (cx - c.x * c.zoom * (1 + c.punch)) * E.dpr, (cy - c.y * c.zoom * (1 + c.punch)) * E.dpr];
  };
  E.viewCenterY = 0.5;
  E.screenToView = function (sx, sy) {
    const m = E.camMatrix();
    const inv = U.matInv(m);
    return U.matApply(inv, sx * E.dpr, sy * E.dpr);
  };
  E.viewToScreen = function (vx, vy) {
    const m = E.camMatrix();
    const p = U.matApply(m, vx, vy);
    return [p[0] / E.dpr, p[1] / E.dpr];
  };
  // piccolo "colpo" di zoom: feedback fisico dei gesti
  E.punch = function (a) { E.cam.punch = Math.min(0.04, E.cam.punch + a); };
  E.shake = function (a) { E.cam.shake = Math.max(E.cam.shake, a); };

  // ---------- Input ----------
  E.bindInput = function () {
    const cv = E.canvas;
    const pos = e => ({ x: e.clientX, y: e.clientY });
    const ev = (p, e) => {
      const v = E.screenToView(p.x, p.y);
      return { x: p.x, y: p.y, vx: v[0], vy: v[1], id: e.pointerId, type: e.pointerType, t: E.time };
    };

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      R.Audio && R.Audio.unlock();
      if (E.onInput) E.onInput();
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      E.pointers.set(e.pointerId, pos(e));
      if (E.pointers.size === 2 && !E.camLocked) {
        // inizia il gesto a due dita: annulla l'azione del dito singolo
        if (E.handler && E.handler.cancel) E.handler.cancel();
        E.gesture = E.gestureState();
      } else if (E.pointers.size === 1) {
        E.gesture = null;
        if (E.handler && E.handler.down) E.handler.down(ev(pos(e), e));
      }
    }, { passive: false });

    cv.addEventListener('pointermove', e => {
      e.preventDefault();
      const p = pos(e);
      if (E.pointers.has(e.pointerId)) E.pointers.set(e.pointerId, p);
      if (E.gesture && E.pointers.size >= 2) {
        const g = E.gestureState();
        const c = E.cam;
        const nz = U.clamp(E.gesture.zoom * g.d / E.gesture.d, c.minZoom * c.fitZoom, c.maxZoom * c.fitZoom);
        c.zoom = nz;
        // il punto sotto il centro delle dita resta fermo
        c.x = E.gesture.vx - (g.cx - E.w / 2) / nz;
        c.y = E.gesture.vy - (g.cy - E.h * E.viewCenterY) / nz;
        E.clampCam();
        return;
      }
      if (E.pointers.size <= 1 && E.handler && E.handler.move) {
        E.handler.move(ev(p, e), E.pointers.has(e.pointerId));
      }
    }, { passive: false });

    const up = e => {
      const had = E.pointers.has(e.pointerId);
      E.pointers.delete(e.pointerId);
      if (E.gesture) {
        if (E.pointers.size < 2) E.gesture = null;
        return;
      }
      if (had && E.handler && E.handler.up) E.handler.up(ev(pos(e), e));
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', e => {
      E.pointers.delete(e.pointerId);
      E.gesture = null;
      if (E.handler && E.handler.cancel) E.handler.cancel();
    });
    cv.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse' && E.handler && E.handler.hover) E.handler.hover(null);
    });

    // rotellina = zoom verso il cursore
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      if (E.camLocked) return;
      const c = E.cam;
      const before = E.screenToView(e.clientX, e.clientY);
      c.zoom = U.clamp(c.zoom * Math.exp(-e.deltaY * 0.0015), c.minZoom * c.fitZoom, c.maxZoom * c.fitZoom);
      const after = E.screenToView(e.clientX, e.clientY);
      c.x += before[0] - after[0]; c.y += before[1] - after[1];
      E.clampCam();
    }, { passive: false });

    // niente menu contestuale / zoom del browser
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
  };

  E.gestureState = function () {
    const ps = [...E.pointers.values()];
    const a = ps[0], b = ps[1];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const v = E.screenToView(cx, cy);
    return { d: Math.max(20, U.dist(a.x, a.y, b.x, b.y)), cx, cy, vx: v[0], vy: v[1], zoom: E.cam.zoom };
  };

  // la camera non deve perdere di vista il diorama
  E.camBounds = { x0: -400, y0: -400, x1: 400, y1: 400 };
  E.clampCam = function () {
    const b = E.camBounds, c = E.cam;
    c.x = U.clamp(c.x, b.x0, b.x1);
    c.y = U.clamp(c.y, b.y0, b.y1);
  };

  // ---------- Tween & timer ----------
  // E.tween(obj, {prop: valoreFinale}, durata, easing, alFinire)
  E.tween = function (obj, to, dur, ease, done) {
    const from = {};
    for (const k in to) from[k] = obj[k];
    const tw = { obj, from, to, dur: Math.max(0.0001, dur), t: 0, ease: ease || U.ease.inOutCubic, done };
    E.tweens.push(tw);
    return tw;
  };
  E.after = function (sec, fn) { const t = { t: sec, fn }; E.timers.push(t); return t; };
  E.clearTimers = function () { E.timers.length = 0; };

  E.step = function (dt) {
    // tween
    for (let i = E.tweens.length - 1; i >= 0; i--) {
      const tw = E.tweens[i];
      tw.t += dt;
      const k = tw.ease(Math.min(1, tw.t / tw.dur));
      for (const p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * k;
      if (tw.t >= tw.dur) { E.tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    // timer
    for (let i = E.timers.length - 1; i >= 0; i--) {
      const t = E.timers[i];
      t.t -= dt;
      if (t.t <= 0) { E.timers.splice(i, 1); t.fn(); }
    }
    // smorzamento dei feedback di camera
    const c = E.cam;
    c.punch *= Math.pow(0.0005, dt);
    c.shake = Math.max(0, c.shake - dt * 30);

    if (E.update) E.update(dt);
    const ctx = E.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (E.draw) E.draw(ctx);
  };

  R.E = E;
})(window.R);

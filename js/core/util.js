/* =========================================================
   util.js — strumenti matematici condivisi
   Namespace globale R: gli script sono "classici" (non moduli ES)
   così il gioco funziona anche aperto con doppio clic (file://).
   ========================================================= */
window.R = window.R || {};

(function (R) {
  'use strict';

  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => U.clamp((v - a) / (b - a), 0, 1);
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.TAU = Math.PI * 2;

  // --- Easing: le transizioni morbide sono metà del game feel ---
  U.ease = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (U.TAU / 3)) + 1,
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    }
  };

  // --- RNG con seed (mulberry32): stesso seed = stesso luogo ---
  U.rng = function (seed) {
    let a = (typeof seed === 'string' ? U.hashStr(seed) : seed) >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  };
  U.hashStr = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  U.rand = (lo, hi) => lo + Math.random() * (hi - lo);
  U.randInt = (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // --- Rumore a valori su griglia con fbm (texture procedurali) ---
  // Restituisce una funzione noise(x, y) in [0,1], periodica su "period" celle
  // così le texture si ripetono senza cuciture.
  U.makeNoise = function (seed, period) {
    const r = U.rng(seed);
    const P = period || 256;
    const g = new Float32Array(P * P);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const sm = t => t * t * (3 - 2 * t);
    const val = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = sm(x - xi), yf = sm(y - yi);
      const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P;
      const x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
      const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
      return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    };
    const fbm = (x, y, oct) => {
      let s = 0, amp = 0.5, f = 1, tot = 0;
      for (let o = 0; o < (oct || 4); o++) {
        s += val(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2;
      }
      return s / tot;
    };
    return { val, fbm };
  };

  // --- Colori ---
  U.hex = function (h) {
    if (Array.isArray(h)) return h;
    if (h.startsWith('rgb')) { const n = h.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2]]; }
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgb = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  U.mix = (c1, c2, t) => [U.lerp(c1[0], c2[0], t), U.lerp(c1[1], c2[1], t), U.lerp(c1[2], c2[2], t)];
  U.shade = (c, k) => k >= 0 ? U.mix(c, [255, 255, 255], k) : U.mix(c, [0, 0, 0], -k);
  // scorciatoia: colore esadecimale schiarito/scurito → stringa css
  U.sh = (hex, k, a) => U.rgb(U.shade(U.hex(hex), k), a);

  // --- Canvas fuori schermo ---
  U.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  };

  // --- Matrici affini 2D [a,b,c,d,e,f] come in setTransform ---
  U.matMul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
  ];
  U.matInv = function (m) {
    const det = m[0] * m[3] - m[1] * m[2];
    if (Math.abs(det) < 1e-12) return [1, 0, 0, 1, 0, 0];
    const id = 1 / det;
    return [m[3] * id, -m[1] * id, -m[2] * id, m[0] * id,
      (m[2] * m[5] - m[3] * m[4]) * id, (m[1] * m[4] - m[0] * m[5]) * id];
  };
  U.matApply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

  // Vibrazione (dove supportata: Android; su iPhone Safari è silenziosamente ignorata)
  U.vibrate = function (ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* niente */ }
  };

  R.U = U;
})(window.R);

/* =========================================================
   textures.js — tutta la grafica "materica" è generata qui
   Intonaci, assi di legno, materiali da pavimento, carte da
   parati, viste dalla finestra e soprattutto i tipi di SPORCO.
   Ogni texture è un canvas fuori schermo.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;
  const T = {};

  // riempie un canvas pixel per pixel: fn(x, y, out) scrive out[0..3]
  function pix(w, h, fn) {
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data, o = [0, 0, 0, 0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        o[3] = 255;
        fn(x, y, o);
        const i = (y * w + x) * 4;
        d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = o[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  T.pix = pix;

  // rumore a bassa risoluzione ingrandito: veloce e morbido
  function softNoise(w, h, seed, scale, oct) {
    const sw = Math.ceil(w / 4), sh = Math.ceil(h / 4), N = U.makeNoise(seed, 256);
    const small = pix(sw, sh, (x, y, o) => {
      const v = N.fbm(x / scale * 4, y / scale * 4, oct || 4) * 255;
      o[0] = o[1] = o[2] = v; o[3] = 255;
    });
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, w, h);
    return c;
  }

  // ================= SUPERFICI PULITE =================

  // intonaco caldo con leggere variazioni (base delle pareti)
  T.plaster = function (w, h, seed, col) {
    const base = U.hex(col || '#e9dcc6');
    const N = U.makeNoise(seed, 256);
    return pix(w, h, (x, y, o) => {
      const n = N.fbm(x / 40, y / 40, 4), f = N.val(x / 3, y / 3);
      const k = (n - 0.5) * 0.12 + (f - 0.5) * 0.04;
      o[0] = base[0] * (1 + k); o[1] = base[1] * (1 + k); o[2] = base[2] * (1 + k);
    });
  };

  // vecchio pavimento di assi (pulito ma vissuto)
  T.oldPlanks = function (w, h, seed) {
    const r = U.rng(seed), N = U.makeNoise(seed + 7, 256);
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    const pw = 32; // larghezza asse = mezza unità
    const grain = pix(w, h, (x, y, o) => {
      const g = N.fbm(x / 90, y / 6, 3);
      const v = 128 + Math.sin(g * 30) * 40 + (N.val(x / 2, y / 2) - 0.5) * 30;
      o[0] = o[1] = o[2] = v;
    });
    for (let row = 0; row * pw < h; row++) {
      let x = -r.int(0, 200);
      while (x < w) {
        const len = r.int(130, 260);
        const tone = r.range(-0.12, 0.1);
        const col = U.shade(U.hex('#b98a5e'), tone);
        ctx.fillStyle = U.rgb(col);
        ctx.fillRect(x, row * pw, len, pw);
        x += len;
      }
    }
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(grain, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // fughe tra le assi
    ctx.fillStyle = 'rgba(60,35,20,0.55)';
    const r2 = U.rng(seed);
    for (let row = 0; row * pw < h; row++) {
      ctx.fillRect(0, row * pw, w, 1.5);
      let x = -r2.int(0, 200);
      while (x < w) { const len = r2.int(130, 260); r2.range(0, 1); ctx.fillRect(x, row * pw, 1.5, pw); x += len; }
    }
    // chiodini
    ctx.fillStyle = 'rgba(70,50,40,0.6)';
    for (let i = 0; i < 80; i++) { ctx.beginPath(); ctx.arc(r.range(0, w), Math.floor(r.range(0, h / pw)) * pw + pw / 2, 1.3, 0, U.TAU); ctx.fill(); }
    return c;
  };

  // ================= MATERIALI DA PAVIMENTO =================
  // tutte le texture sono a celle di 1 unità (64 px): la posa
  // avviene cella per cella, ma il disegno è continuo.

  function woodPlank(ctx, x, y, w, h, col, N, along, r) {
    ctx.fillStyle = U.rgb(col);
    ctx.fillRect(x, y, w, h);
    // venature
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = U.rgb(U.shade(col, -0.18), 0.35);
    ctx.lineWidth = 0.8;
    const n = 4 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      const off = r();
      if (along === 'h') {
        const yy = y + h * (i + 0.5) / n;
        ctx.moveTo(x, yy);
        for (let t = 0; t <= w; t += 6) ctx.lineTo(x + t, yy + Math.sin(t / 18 + off * 9) * 1.4 + (N.val((x + t) / 20, yy / 4) - 0.5) * 2);
      } else {
        const xx = x + w * (i + 0.5) / n;
        ctx.moveTo(xx, y);
        for (let t = 0; t <= h; t += 6) ctx.lineTo(xx + Math.sin(t / 18 + off * 9) * 1.4 + (N.val(xx / 4, (y + t) / 20) - 0.5) * 2, y + t);
      }
      ctx.stroke();
    }
    // bisello luminoso e ombra
    const g = along === 'h' ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.15, 'rgba(255,255,255,0)');
    g.addColorStop(0.85, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,40,25,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // parquet a spina di pesce: tassellatura esatta di listelli L×W
  T.herringbone = function (w, h, seed) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed), N = U.makeNoise(seed, 256);
    const W = 16, L = 64;
    const base = U.hex('#c99a66');
    ctx.fillStyle = '#7a5235'; ctx.fillRect(0, 0, w, h);
    for (let m = -Math.ceil((w + h) / L) - 2; m <= Math.ceil((w + h) / L) + 2; m++) {
      for (let k = -Math.ceil((w + h) / W) - 8; k <= Math.ceil((w + h) / W) + 8; k++) {
        const hx = k * W + m * L, hy = k * W - m * L;
        if (hx > w || hy > h + L || hx + L < 0 || hy + L < -L) continue;
        const c1 = U.shade(base, r.range(-0.13, 0.1));
        if (hx < w && hy < h && hx + L > 0 && hy + W > 0) woodPlank(ctx, hx, hy, L, W, c1, N, 'h', r);
        const vx = hx, vy = hy + W;
        const c2 = U.shade(base, r.range(-0.13, 0.1));
        if (vx < w && vy < h && vx + W > 0 && vy + L > 0) woodPlank(ctx, vx, vy, W, L, c2, N, 'v', r);
      }
    }
    return c;
  };

  // cotto: piastrelle quadrate di terracotta, ognuna diversa
  T.cotto = function (w, h, seed) {
    const r = U.rng(seed), N = U.makeNoise(seed, 256);
    const c = pix(w, h, (x, y, o) => {
      const n = N.fbm(x / 14, y / 14, 3);
      const tx = x >> 6, ty = y >> 6;
      const tv = (U.hashStr(tx + ',' + ty + seed) % 1000) / 1000;
      const base = U.mix([196, 112, 74], [214, 140, 96], tv);
      const k = (n - 0.5) * 0.25;
      o[0] = base[0] * (1 + k); o[1] = base[1] * (1 + k); o[2] = base[2] * (1 + k);
    });
    const ctx = c.getContext('2d');
    for (let ty = 0; ty < h; ty += 64) for (let tx = 0; tx < w; tx += 64) {
      // bordo smussato
      const g = ctx.createLinearGradient(tx, ty, tx + 64, ty + 64);
      g.addColorStop(0, 'rgba(255,230,200,0.18)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,20,10,0.2)');
      ctx.fillStyle = g; ctx.fillRect(tx + 2, ty + 2, 60, 60);
      // piccole macchie di cottura
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(120,50,30,${r.range(0.05, 0.12)})`;
        ctx.beginPath(); ctx.arc(tx + r.range(8, 56), ty + r.range(8, 56), r.range(3, 9), 0, U.TAU); ctx.fill();
      }
    }
    // fughe
    ctx.fillStyle = '#d8c8b0';
    for (let i = 0; i <= w; i += 64) ctx.fillRect(i - 1.5, 0, 3, h);
    for (let j = 0; j <= h; j += 64) ctx.fillRect(0, j - 1.5, w, 3);
    return c;
  };

  // cementine decorate: motivo a simmetria 4 (fiore + quarti di cerchio)
  T.cementine = function (w, h, seed) {
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    const P = { bg: '#efe6d4', a: '#3f6f8f', b: '#c9724b', d: '#8fb3a6' };
    for (let ty = 0; ty < h; ty += 64) for (let tx = 0; tx < w; tx += 64) {
      ctx.save();
      ctx.translate(tx + 32, ty + 32);
      ctx.fillStyle = P.bg; ctx.fillRect(-32, -32, 64, 64);
      for (let q = 0; q < 4; q++) {
        ctx.save(); ctx.rotate(q * Math.PI / 2);
        // quarto di cerchio nell'angolo
        ctx.fillStyle = P.a; ctx.beginPath(); ctx.moveTo(32, 32); ctx.arc(32, 32, 20, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = P.bg; ctx.beginPath(); ctx.moveTo(32, 32); ctx.arc(32, 32, 13, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = P.b; ctx.beginPath(); ctx.moveTo(32, 32); ctx.arc(32, 32, 7, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
        // petalo
        ctx.fillStyle = P.d;
        ctx.beginPath(); ctx.ellipse(0, -14, 5, 11, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = P.a;
        ctx.beginPath(); ctx.ellipse(0, -14, 2, 6, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = P.b; ctx.beginPath(); ctx.arc(0, 0, 5, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    // patina d'uso
    const n = softNoise(w, h, seed, 80);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.18; ctx.drawImage(n, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(120,110,95,0.5)';
    for (let i = 0; i <= w; i += 64) ctx.fillRect(i - 1, 0, 2, h);
    for (let j = 0; j <= h; j += 64) ctx.fillRect(0, j - 1, w, 2);
    return c;
  };

  // legno di recupero: assi di toni diversi, qualcuna con vecchia vernice
  T.reclaimed = function (w, h, seed) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed), N = U.makeNoise(seed, 256);
    const tones = ['#a7835c', '#8c6a4f', '#c4a07a', '#7d6a5c', '#b58f6a', '#9a7b66'];
    const pw = 22;
    for (let y = 0; y < h; y += pw) {
      let x = -r.int(0, 100);
      while (x < w) {
        const len = r.int(70, 170);
        const col = U.shade(U.hex(r.pick(tones)), r.range(-0.08, 0.08));
        woodPlank(ctx, x, y, len, pw, col, N, 'h', r);
        if (r.chance(0.15)) { // tracce di vernice antica
          ctx.fillStyle = U.rgb(U.hex(r.pick(['#6f9fa8', '#d9c9a3', '#b8746a'])), 0.35);
          ctx.fillRect(x + r.range(0, len * 0.5), y + 3, r.range(10, len * 0.4), pw - 6);
        }
        x += len;
      }
    }
    return c;
  };

  // microcemento: superficie continua velata
  T.microcement = function (w, h, seed) {
    const N = U.makeNoise(seed, 256);
    const base = U.hex('#cfc6b8');
    return pix(w, h, (x, y, o) => {
      const n = N.fbm(x / 70, y / 70, 5), f = N.val(x / 2.5, y / 2.5);
      const sw = Math.sin((x + y) / 23 + n * 8) * 0.02;
      const k = (n - 0.5) * 0.16 + (f - 0.5) * 0.03 + sw;
      o[0] = base[0] * (1 + k); o[1] = base[1] * (1 + k); o[2] = base[2] * (1 + k);
    });
  };

  T.FLOORS = {
    spina: { name: 'Spina di pesce', fn: T.herringbone, style: ['nordico', 'mediterraneo', 'boho'] },
    cotto: { name: 'Cotto', fn: T.cotto, style: ['mediterraneo', 'boho'] },
    cementine: { name: 'Cementine', fn: T.cementine, style: ['mediterraneo', 'boho'] },
    recupero: { name: 'Legno di recupero', fn: T.reclaimed, style: ['boho', 'nordico'] },
    microcemento: { name: 'Microcemento', fn: T.microcement, style: ['nordico'] }
  };

  // ================= CARTE DA PARATI =================
  T.wallpaper = function (kind, w, h) {
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    if (kind === 'fiori') {
      ctx.fillStyle = '#b9cbb3'; ctx.fillRect(0, 0, w, h);
      const r = U.rng(11);
      for (let y = 0; y < h + 40; y += 40) for (let x = 0; x < w + 40; x += 40) {
        const ox = x + ((y / 40) % 2) * 20;
        ctx.save(); ctx.translate(ox, y);
        ctx.strokeStyle = '#7d9a78'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, 8, 2, 14); ctx.stroke();
        ctx.fillStyle = '#8fae88'; ctx.beginPath(); ctx.ellipse(5, 8, 4, 2, 0.8, 0, U.TAU); ctx.fill();
        const fc = r.pick(['#f3e3dc', '#efc9c1', '#f6eacb']);
        for (let p = 0; p < 5; p++) { ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(Math.cos(p * 1.256) * 3.5, Math.sin(p * 1.256) * 3.5, 2.8, 0, U.TAU); ctx.fill(); }
        ctx.fillStyle = '#e2b25c'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
    } else if (kind === 'righe') {
      for (let x = 0; x < w; x += 32) {
        ctx.fillStyle = '#f2e3d5'; ctx.fillRect(x, 0, 32, h);
        ctx.fillStyle = '#e4bfb0'; ctx.fillRect(x + 4, 0, 10, h);
        ctx.fillStyle = '#d8a796'; ctx.fillRect(x + 17, 0, 2, h);
      }
    } else if (kind === 'ventagli') { // art déco
      ctx.fillStyle = '#2f4f5a'; ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h + 32; y += 24) for (let x = -32; x < w + 32; x += 48) {
        const ox = x + ((y / 24) % 2) * 24;
        ctx.save(); ctx.translate(ox, y);
        for (let k = 4; k >= 1; k--) {
          ctx.fillStyle = k % 2 ? '#d9b26f' : '#2f4f5a';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, k * 6, Math.PI, 0); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    } else if (kind === 'foglie') { // tropicale
      ctx.fillStyle = '#f1ead9'; ctx.fillRect(0, 0, w, h);
      const r = U.rng(5);
      for (let i = 0; i < (w * h) / 900; i++) {
        const x = r.range(0, w), y = r.range(0, h), a = r.range(0, U.TAU), s = r.range(8, 16);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = r.pick(['#6f9d7a', '#4f7d63', '#93b58a']);
        ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.4, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
        ctx.restore();
      }
    }
    // grana della carta
    const n = softNoise(w, h, 3, 30, 3);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.08; ctx.drawImage(n, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    return c;
  };
  T.WALLPAPERS = {
    fiori: { name: 'Fiorellini', style: ['cottage', 'boho', 'mediterraneo'] },
    righe: { name: 'Righe cipria', style: ['nordico', 'cottage'] },
    ventagli: { name: 'Ventagli déco', style: ['midcentury'] },
    foglie: { name: 'Foglie', style: ['boho', 'tropicale'] }
  };
  T.PAINTS = [
    { id: 'salvia', name: 'Salvia', hex: '#a9bfa3', style: ['nordico', 'boho', 'cottage'] },
    { id: 'cipria', name: 'Cipria', hex: '#e8c4b8', style: ['boho', 'cottage'] },
    { id: 'latte', name: 'Latte', hex: '#f3ece0', style: ['nordico', 'mediterraneo'] },
    { id: 'terracotta', name: 'Terracotta', hex: '#d39a7a', style: ['mediterraneo', 'boho'] },
    { id: 'cielo', name: 'Cielo', hex: '#a9c6d6', style: ['mediterraneo', 'nordico'] },
    { id: 'ocra', name: 'Ocra', hex: '#e2bf7a', style: ['boho', 'midcentury'] }
  ];

  // ================= SPORCO =================
  // Ogni funzione restituisce un canvas con alfa = quantità di sporco.

  // polvere: velo grigio-beige quasi uniforme con impronte e aloni
  T.dust = function (w, h, seed, amount) {
    const N = U.makeNoise(seed, 256), a0 = amount || 0.8;
    const c = pix(w, h, (x, y, o) => {
      const n = N.fbm(x / 60, y / 60, 4), g = N.val(x / 1.7, y / 1.7);
      const a = U.clamp(a0 * (0.75 + (n - 0.5) * 0.9) + (g - 0.5) * 0.12, 0, 1);
      o[0] = 168 + g * 20; o[1] = 158 + g * 18; o[2] = 142 + g * 14; o[3] = a * 255;
    });
    return c;
  };

  // ragnatele: fili sottili negli angoli alti
  T.cobweb = function (w, h, seed, corners) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed);
    (corners || [[0, 0]]).forEach(([cx, cy]) => {
      const sx = cx > w / 2 ? -1 : 1;
      const R0 = r.range(90, 140);
      const spokes = 7;
      ctx.strokeStyle = 'rgba(235,232,225,0.85)';
      ctx.lineWidth = 1.1;
      const ang = [];
      for (let i = 0; i < spokes; i++) ang.push((i / (spokes - 1)) * Math.PI / 2);
      ang.forEach(a => {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sx * Math.cos(a) * R0, cy + Math.sin(a) * R0); ctx.stroke();
      });
      for (let ring = 1; ring < 7; ring++) {
        const rr = R0 * ring / 7;
        ctx.beginPath();
        ang.forEach((a, i) => {
          const sag = i > 0 ? 0.9 : 1;
          const x = cx + sx * Math.cos(a) * rr * sag, y = cy + Math.sin(a) * rr * sag;
          if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(cx + sx * Math.cos(a - 0.13) * rr * 0.86, cy + Math.sin(a - 0.13) * rr * 0.86, x, y);
        });
        ctx.stroke();
      }
      // fiocchi di polvere impigliati
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0);
      g.addColorStop(0, 'rgba(200,195,185,0.55)'); g.addColorStop(1, 'rgba(200,195,185,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, U.TAU); ctx.fill();
    });
    return c;
  };

  // fango: chiazze spesse, marroni, lucide d'acqua
  T.mud = function (w, h, seed, blobs) {
    const N = U.makeNoise(seed, 256);
    const r = U.rng(seed + 3);
    const centers = [];
    for (let i = 0; i < (blobs || 5); i++) centers.push([r.range(0.1, 0.9) * w, r.range(0.15, 0.95) * h, r.range(60, 120)]);
    return pix(w, h, (x, y, o) => {
      let m = 0;
      for (const c of centers) { const d = Math.hypot(x - c[0], y - c[1]) / c[2]; m = Math.max(m, 1 - d); }
      const n = N.fbm(x / 30, y / 30, 4);
      const v = m + (n - 0.5) * 0.9;
      const a = U.clamp((v - 0.05) * 4, 0, 1);
      const wet = N.val(x / 8, y / 8);
      const hl = wet > 0.72 ? (wet - 0.72) * 2.4 : 0; // riflessi umidi
      const dark = U.clamp(v, 0, 1);
      o[0] = 105 - dark * 30 + hl * 90; o[1] = 78 - dark * 25 + hl * 80; o[2] = 50 - dark * 18 + hl * 70;
      o[3] = a * 250;
    });
  };

  // macchie: aloni ad anello (vino, caffè, umidità)
  T.stains = function (w, h, seed, n) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed);
    for (let i = 0; i < (n || 6); i++) {
      const x = r.range(40, w - 40), y = r.range(40, h - 40), rr = r.range(14, 40);
      const col = r.pick([[110, 40, 50], [90, 60, 35], [70, 70, 50]]);
      const g = ctx.createRadialGradient(x, y, rr * 0.2, x, y, rr);
      g.addColorStop(0, U.rgb(col, 0.35)); g.addColorStop(0.8, U.rgb(col, 0.55)); g.addColorStop(1, U.rgb(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * r.range(0.7, 1), r.range(0, 3), 0, U.TAU); ctx.fill();
      // schizzi intorno
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = U.rgb(col, 0.45);
        ctx.beginPath(); ctx.arc(x + r.range(-rr, rr) * 1.6, y + r.range(-rr, rr) * 1.6, r.range(1.5, 4), 0, U.TAU); ctx.fill();
      }
    }
    return c;
  };

  // muffa: grappoli di puntini verde-nero, più fitta in basso e negli angoli
  T.mold = function (w, h, seed, where) {
    const N = U.makeNoise(seed, 256);
    return pix(w, h, (x, y, o) => {
      const fy = y / h;
      let bias = where === 'top' ? 1 - fy : fy;
      if (where === 'corner') bias = Math.max(fy, 1 - x / w) * 0.9;
      const n = N.fbm(x / 26, y / 26, 4), sp = N.val(x / 2.2, y / 2.2);
      const v = n * 0.9 + bias * 0.6 - 0.82;
      const a = U.clamp(v * 3.2, 0, 1) * (0.55 + sp * 0.6);
      const g = N.val(x / 7 + 50, y / 7);
      o[0] = 40 + g * 30; o[1] = 62 + g * 40; o[2] = 40 + g * 20; o[3] = U.clamp(a, 0, 1) * 255;
    });
  };

  // aloni d'acqua dall'alto (colature giallastre)
  T.grime = function (w, h, seed) {
    const N = U.makeNoise(seed, 256);
    const r = U.rng(seed);
    const streaks = [];
    for (let i = 0; i < 6; i++) streaks.push([r.range(0, w), r.range(20, 50), r.range(0.4, 1)]);
    return pix(w, h, (x, y, o) => {
      let s = 0;
      for (const st of streaks) {
        const dx = Math.abs(x - st[0] + Math.sin(y / 30) * 6) / st[1];
        s = Math.max(s, (1 - dx) * st[2] * (1 - y / h * 0.6));
      }
      const n = N.fbm(x / 40, y / 18, 4);
      const top = Math.max(0, 1 - y / (h * 0.35)) * 0.5;
      const a = U.clamp((s + top) * (0.5 + n) - 0.15, 0, 0.75);
      o[0] = 150; o[1] = 128; o[2] = 80; o[3] = a * 255;
    });
  };

  // graffiti: tratti di bomboletta con colature
  T.graffiti = function (w, h, seed, area) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), r = U.rng(seed);
    const ar = area || [0.1, 0.25, 0.9, 0.85];
    const cols = ['#e2557b', '#3b8ccf', '#f2b134', '#59b36b', '#8a5cc2'];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let s = 0; s < 4; s++) {
      const col = cols[s % cols.length];
      ctx.strokeStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.lineWidth = r.range(7, 12);
      const x0 = U.lerp(ar[0], ar[2], r()) * w, y0 = U.lerp(ar[1], ar[3], r()) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      let x = x0, y = y0;
      for (let k = 0; k < 5; k++) {
        const nx = x + r.range(-70, 90), ny = y + r.range(-45, 45);
        ctx.bezierCurveTo(x + r.range(-50, 50), y + r.range(-60, 60), nx + r.range(-50, 50), ny + r.range(-60, 60), nx, ny);
        x = U.clamp(nx, 20, w - 20); y = U.clamp(ny, 20, h - 30);
        // colature
        if (r.chance(0.6)) {
          ctx.save(); ctx.shadowBlur = 0; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r.range(-1, 1), y + r.range(12, 40)); ctx.stroke();
          ctx.restore();
          ctx.beginPath(); ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // una "tag" a stella
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4;
    const sx = U.lerp(ar[0], ar[2], 0.6) * w, sy = U.lerp(ar[1], ar[3], 0.4) * h;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; ctx.lineTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26); }
    ctx.stroke();
    return c;
  };

  // vernice scrostata: vecchio strato verdino con crepe e scaglie
  T.peel = function (w, h, seed, col) {
    const N = U.makeNoise(seed, 256), base = U.hex(col || '#9fb59a');
    return pix(w, h, (x, y, o) => {
      const n = N.fbm(x / 34, y / 34, 5);
      const cr = Math.abs(N.fbm(x / 12 + 7, y / 12, 3) - 0.5); // crepe = linee di livello del rumore
      let a = n > 0.36 ? 1 : 0;
      if (cr < 0.025) a = 0.2;
      const edge = U.clamp((n - 0.36) * 25, 0, 1);
      const k = (N.val(x / 3, y / 3) - 0.5) * 0.1 - (1 - edge) * 0.25 + (1 - y / h) * 0.05;
      o[0] = base[0] * (1 + k); o[1] = base[1] * (1 + k); o[2] = base[2] * (1 + k);
      o[3] = a * (0.4 + edge * 0.6) * 255;
    });
  };

  // colore medio di ogni tipo di sporco (per particelle e scaglie)
  T.DIRT_COLORS = {
    dust: '#b3a894', cobweb: '#e6e2da', mud: '#6b4e32', stain: '#7a4040',
    mold: '#3e5a3c', grime: '#a08a55', graffiti: '#e2557b', peel: '#9fb59a', leaves: '#b8873e', sand: '#e0c896', algae: '#5f8a4a'
  };
  T.DIRT_NAMES = {
    dust: 'la polvere', cobweb: 'le ragnatele', mud: 'il fango', stain: 'le macchie', mold: 'la muffa',
    grime: 'gli aloni', graffiti: 'i graffiti', peel: 'la vernice scrostata'
  };

  // ================= VISTA DALLA FINESTRA =================
  // mode: 'day' | 'sunset' | 'night' ; dark = 0..1 (scoperta)
  T.windowView = function (w, h, mode, scenery) {
    const c = U.canvas(w, h), ctx = c.getContext('2d');
    const skies = {
      day: ['#9fd0ea', '#d8eef5', '#f8efd9'],
      sunset: ['#6a6fb0', '#e8907a', '#f7cf8f'],
      night: ['#151b3a', '#253063', '#3d3f6e']
    };
    const s = skies[mode] || skies.day;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, s[0]); g.addColorStop(0.6, s[1]); g.addColorStop(1, s[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (mode === 'night') {
      const r = U.rng(9);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,240,${r.range(0.3, 0.9)})`; ctx.fillRect(r.range(0, w), r.range(0, h * 0.6), 1.2, 1.2); }
      ctx.fillStyle = '#f4efd8'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.25, 9, 0, U.TAU); ctx.fill();
      ctx.fillStyle = s[0]; ctx.beginPath(); ctx.arc(w * 0.72 + 4, h * 0.25 - 2, 8, 0, U.TAU); ctx.fill();
    } else {
      const sy = mode === 'sunset' ? h * 0.62 : h * 0.22;
      const sg = ctx.createRadialGradient(w * 0.7, sy, 2, w * 0.7, sy, 40);
      sg.addColorStop(0, mode === 'sunset' ? 'rgba(255,220,150,1)' : 'rgba(255,255,230,1)');
      sg.addColorStop(0.25, mode === 'sunset' ? 'rgba(255,190,120,0.7)' : 'rgba(255,250,220,0.6)');
      sg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      // nuvole morbide
      ctx.fillStyle = mode === 'sunset' ? 'rgba(255,200,190,0.5)' : 'rgba(255,255,255,0.7)';
      [[0.2, 0.2], [0.5, 0.12]].forEach(([cx, cy]) => {
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(w * cx + k * 9, h * cy + (k % 2) * 3, 12, 6, 0, 0, U.TAU); ctx.fill(); }
      });
    }
    // colline a strati (prospettiva aerea)
    const hills = mode === 'night'
      ? ['#2c3560', '#222a4d', '#1a2140']
      : mode === 'sunset' ? ['#b47a8a', '#8a5e74', '#5f4a5e'] : ['#a9c7b5', '#86ad8f', '#66926f'];
    const sc = scenery || 'colline';
    hills.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const base = h * (0.55 + i * 0.13);
        const y = base - Math.sin(x / (30 + i * 9) + i * 2) * 8 - Math.sin(x / 13 + i) * 3 - (sc === 'montagna' ? Math.abs(Math.sin(x / 25 + i)) * 30 : 0);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    });
    // un albero vicino
    const tc = mode === 'night' ? '#141a33' : mode === 'sunset' ? '#4a3a4a' : '#557d5c';
    ctx.fillStyle = tc;
    ctx.fillRect(w * 0.18, h * 0.6, 3, h * 0.4);
    [[0, 0, 13], [-8, 6, 10], [8, 5, 10], [0, -9, 9]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(w * 0.18 + 1.5 + dx, h * 0.55 + dy, r, 0, U.TAU); ctx.fill(); });
    return c;
  };

  // ================= PENNELLI =================
  // timbro morbido radiale (alfa = forza)
  T.softBrush = function (r, hard) {
    const c = U.canvas(r * 2, r * 2), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(hard || 0.5, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, r * 2, r * 2);
    return c;
  };
  // timbro "spugna": morbido e bucherellato
  T.spongeBrush = function (r) {
    const c = T.softBrush(r, 0.35), ctx = c.getContext('2d'), rn = U.rng(4);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rn.range(0.2, 0.6)})`;
      ctx.beginPath(); ctx.arc(rn.range(0, r * 2), rn.range(0, r * 2), rn.range(1, r * 0.18), 0, U.TAU); ctx.fill();
    }
    return c;
  };
  // timbro rullo: rettangolo con bordo sfrangiato
  T.rollerBrush = function (w, h) {
    const c = U.canvas(w, h), ctx = c.getContext('2d'), rn = U.rng(8);
    for (let x = 0; x < w; x++) {
      const a = 0.85 + rn.range(-0.1, 0.15);
      const e = Math.min(1, x / 6, (w - x) / 6);
      ctx.fillStyle = `rgba(0,0,0,${U.clamp(a * e, 0, 1)})`;
      ctx.fillRect(x, 0, 1, h);
    }
    return c;
  };

  R.T = T;
})(window.R);

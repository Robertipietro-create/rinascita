/* =========================================================
   icons.js — icone degli strumenti disegnate a codice
   Le stesse funzioni disegnano il cursore nel gioco e le icone
   dei pulsanti (convertite in immagine una volta sola).
   Coordinate: centro (0,0), scala ~ 1 = 40 px.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;
  const I = {};

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  I.rr = rr;

  I.draw = {
    spugna(ctx, t) {
      ctx.rotate(-0.25 + Math.sin((t || 0) * 20) * 0.04);
      ctx.fillStyle = '#f2c84b'; rr(ctx, -18, -8, 36, 20, 6); ctx.fill();
      ctx.fillStyle = '#5aa86a'; rr(ctx, -18, -14, 36, 9, 4); ctx.fill();
      ctx.fillStyle = 'rgba(190,140,40,0.5)';
      [[-10, 2], [-2, 6], [6, 1], [12, 7], [-13, 8], [2, -1]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, U.TAU); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(ctx, -15, -12, 20, 2.5, 1); ctx.fill();
    },
    idropulitrice(ctx) {
      ctx.rotate(-0.6);
      ctx.fillStyle = '#7d8a96'; rr(ctx, -4, -26, 6, 30, 2); ctx.fill();          // lancia
      ctx.fillStyle = '#e8b33d'; rr(ctx, -9, 2, 16, 12, 4); ctx.fill();            // impugnatura
      ctx.fillStyle = '#3f4a55'; rr(ctx, -6, 12, 9, 14, 3); ctx.fill();
      ctx.fillStyle = '#2f3740'; rr(ctx, -5, -30, 8, 6, 2); ctx.fill();            // ugello
      ctx.fillStyle = 'rgba(160,210,240,0.9)';
      ctx.beginPath(); ctx.moveTo(-1, -31); ctx.lineTo(-7, -44); ctx.lineTo(6, -44); ctx.closePath(); ctx.fill();
    },
    aspirapolvere(ctx) {
      ctx.strokeStyle = '#6f7d8c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, -6); ctx.quadraticCurveTo(20, 4, 14, 22); ctx.stroke();
      ctx.fillStyle = '#d35d5d'; rr(ctx, 4, 12, 22, 16, 7); ctx.fill();
      ctx.fillStyle = '#3d4650'; rr(ctx, -20, -14, 28, 10, 4); ctx.fill();
      ctx.fillStyle = '#2a3036'; ctx.fillRect(-18, -6, 24, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-16, -12, 18, 2);
    },
    raschietto(ctx) {
      ctx.rotate(0.5);
      ctx.fillStyle = '#b5c0c8'; ctx.beginPath(); ctx.moveTo(-12, -22); ctx.lineTo(12, -22); ctx.lineTo(7, -8); ctx.lineTo(-7, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-11, -22, 22, 2);
      ctx.fillStyle = '#4e86b8'; rr(ctx, -5, -9, 10, 30, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-3, -6, 2, 22);
    },
    pala(ctx) {
      ctx.rotate(0.7);
      ctx.fillStyle = '#8a6a4a'; rr(ctx, -2.5, -4, 5, 32, 2); ctx.fill();
      ctx.fillStyle = '#5d6a74'; ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.lineTo(9, -24); ctx.quadraticCurveTo(0, -32, -9, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-8, -20, 3, 12);
      ctx.fillStyle = '#3e2e22'; rr(ctx, -6, 26, 12, 5, 2); ctx.fill();
    },
    mano(ctx) {
      ctx.fillStyle = '#f0c9a8';
      rr(ctx, -12, -6, 24, 22, 9); ctx.fill();
      for (let i = 0; i < 4; i++) { rr(ctx, -12 + i * 6.3, -20 + Math.abs(i - 1.5) * 2, 5.5, 18, 2.7); ctx.fill(); }
      ctx.save(); ctx.rotate(-0.7); rr(ctx, -20, 0, 6, 14, 3); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(160,100,70,0.35)'; ctx.lineWidth = 1; rr(ctx, -12, -6, 24, 22, 9); ctx.stroke();
    },
    spatola(ctx) {
      ctx.rotate(-0.5);
      ctx.fillStyle = '#c9d2d8'; ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(14, -26); ctx.lineTo(6, -6); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f5efe4'; ctx.fillRect(-12, -26, 24, 5);
      ctx.fillStyle = '#c4703f'; rr(ctx, -4, -7, 8, 28, 3); ctx.fill();
    },
    martello(ctx) {
      ctx.rotate(-0.6);
      ctx.fillStyle = '#9c7350'; rr(ctx, -3, -10, 6, 34, 2); ctx.fill();
      ctx.fillStyle = '#5b6670'; rr(ctx, -15, -20, 30, 11, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-13, -18, 26, 2);
    },
    vetro(ctx) {
      ctx.fillStyle = 'rgba(190,225,240,0.85)'; rr(ctx, -16, -18, 32, 36, 3); ctx.fill();
      ctx.strokeStyle = '#efe7da'; ctx.lineWidth = 3; rr(ctx, -16, -18, 32, 36, 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(6, -10); ctx.moveTo(0, 12); ctx.lineTo(10, -2); ctx.stroke();
    },
    rullo(ctx) {
      ctx.fillStyle = '#8a8f96'; ctx.fillRect(-2, -4, 4, 14); ctx.fillRect(-2, -6, 16, 4);
      ctx.fillStyle = '#c4703f'; rr(ctx, -4, 9, 8, 18, 3); ctx.fill();
      ctx.fillStyle = I.paintColor || '#a9bfa3'; rr(ctx, -20, -22, 36, 16, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-17, -20, 30, 3);
    },
    carta(ctx) {
      ctx.fillStyle = '#e8d9c4'; rr(ctx, -16, -20, 22, 40, 2); ctx.fill();
      ctx.fillStyle = '#b9cbb3'; ctx.fillRect(-14, -18, 18, 36);
      ctx.fillStyle = '#f3e3dc'; [[-8, -10], [0, 0], [-8, 10]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, U.TAU); ctx.fill(); });
      ctx.fillStyle = '#d8c6ad'; rr(ctx, 4, -20, 12, 40, 6); ctx.fill();
    },
    posa(ctx) {
      ctx.fillStyle = '#c99a66'; ctx.save(); ctx.rotate(0.6); rr(ctx, -18, -6, 30, 10, 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#b5845a'; ctx.save(); ctx.rotate(-0.6); rr(ctx, -10, 2, 30, 10, 2); ctx.fill(); ctx.restore();
    },
    lampadina(ctx) {
      ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, -6, 13, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#9aa3ab'; rr(ctx, -6, 6, 12, 10, 2); ctx.fill();
      ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(0, 2); ctx.lineTo(4, -4); ctx.stroke();
    },
    lettera(ctx) {
      ctx.rotate(-0.12);
      ctx.fillStyle = '#efe1c4'; rr(ctx, -22, -15, 44, 30, 3); ctx.fill();
      ctx.strokeStyle = '#c9b48f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-22, -14); ctx.lineTo(0, 3); ctx.lineTo(22, -14); ctx.stroke();
      ctx.fillStyle = '#b8473f'; ctx.beginPath(); ctx.arc(0, 4, 5, 0, U.TAU); ctx.fill(); // ceralacca
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-1.5, 2.5, 1.6, 0, U.TAU); ctx.fill();
    },
    chiave(ctx) {
      ctx.rotate(-0.6);
      ctx.strokeStyle = '#a77b3c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(-12, 0, 8, 0, U.TAU); ctx.stroke();
      ctx.fillStyle = '#a77b3c'; ctx.fillRect(-4, -2.5, 26, 5); ctx.fillRect(14, 2, 4, 7); ctx.fillRect(8, 2, 4, 5);
      ctx.fillStyle = '#e8dcc0'; rr(ctx, -26, 8, 14, 10, 2); ctx.fill(); // etichetta
    },
    foto(ctx) {
      ctx.rotate(0.1);
      ctx.fillStyle = '#f3ecdc'; ctx.fillRect(-18, -20, 36, 42);
      const g = ctx.createLinearGradient(0, -16, 0, 12);
      g.addColorStop(0, '#d9b98b'); g.addColorStop(1, '#a5815a');
      ctx.fillStyle = g; ctx.fillRect(-15, -17, 30, 29);
      ctx.fillStyle = '#6b5440';
      ctx.beginPath(); ctx.arc(-5, -5, 4.5, 0, U.TAU); ctx.fill(); ctx.fillRect(-9, -1, 9, 13);
      ctx.beginPath(); ctx.arc(6, -3, 4, 0, U.TAU); ctx.fill(); ctx.fillRect(2, 1, 8, 11);
    },
    moneta(ctx) {
      ctx.fillStyle = '#9a7a32'; ctx.beginPath(); ctx.arc(1, 2, 18, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#d4ae55'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#a7843a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, U.TAU); ctx.stroke();
      ctx.fillStyle = '#8f6f2a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('100', 0, 5);
    },
    diario(ctx) {
      ctx.fillStyle = '#9b5d4b'; rr(ctx, -16, -20, 32, 40, 4); ctx.fill();
      ctx.fillStyle = '#f3ead9'; ctx.fillRect(12, -17, 4, 34);
      ctx.fillStyle = '#7d4637'; ctx.fillRect(-16, -20, 6, 40);
      ctx.fillStyle = '#e7c46a'; ctx.beginPath(); ctx.arc(3, -4, 6, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#c9a85a'; ctx.fillRect(-4, 10, 14, 3);
    }
  };

  // icona come data URL per i pulsanti
  const cache = {};
  I.url = function (name, size) {
    const k = name + (I.paintColor || '') + size;
    if (cache[k]) return cache[k];
    const s = size || 96, c = U.canvas(s, s), ctx = c.getContext('2d');
    ctx.translate(s / 2, s / 2); ctx.scale(s / 64, s / 64);
    if (I.draw[name]) I.draw[name](ctx, 0);
    return (cache[k] = c.toDataURL());
  };

  R.Icons = I;
})(window.R);

/* =========================================================
   people.js — gli abitanti: sagome morbide e stilizzate
   che entrano dalla porta, camminano e si siedono.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, Iso = R.Iso;
  const People = {};

  // p = { x, y, col, h, path: [[x,y]...], speed, sit (altezza seduta), walk }
  People.update = function (p, dt) {
    if (p.path && p.path.length) {
      const t = p.path[0], dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy);
      const sp = (p.speed || 1.4) * dt;
      if (d <= sp) { p.x = t[0]; p.y = t[1]; p.path.shift(); if (!p.path.length && p.onArrive) p.onArrive(p); }
      else { p.x += dx / d * sp; p.y += dy / d * sp; p.walk = (p.walk || 0) + dt * 9; p.face = Iso.p(dx, dy, 0)[0] >= 0 ? 1 : -1; }
    }
    if (p.fadeIn !== undefined && p.fadeIn < 1) p.fadeIn = Math.min(1, p.fadeIn + dt * 1.5);
  };

  People.draw = function (ctx, p, time) {
    const S = Iso.S, h = p.h || 1;
    const z = p.seatZ || 0;
    const moving = p.path && p.path.length;
    const sw = moving ? Math.sin(p.walk || 0) : 0;
    const bob = moving ? Math.abs(Math.cos(p.walk || 0)) * 2 : Math.sin(time * 1.6 + p.x) * 0.6;
    ctx.globalAlpha = p.fadeIn === undefined ? 1 : p.fadeIn;
    Iso.shadow(ctx, p.x, p.y, z, 0.35, 0.35, 0.25);
    const q = Iso.p(p.x, p.y, z);
    const col = U.hex(p.col);
    ctx.save();
    ctx.translate(q[0], q[1] - bob);
    if (p.face < 0) ctx.scale(-1, 1);
    const sc = S / 40 * h;
    ctx.scale(sc, sc);
    ctx.lineCap = 'round';
    if (p.seated) {
      // gambe piegate in avanti
      ctx.strokeStyle = U.rgb(U.shade(col, -0.35)); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-2, -26); ctx.lineTo(10, -24); ctx.lineTo(11, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -26); ctx.lineTo(14, -23); ctx.lineTo(15, -5); ctx.stroke();
    } else {
      ctx.strokeStyle = U.rgb(U.shade(col, -0.35)); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-3, -28); ctx.lineTo(-3 + sw * 6, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -28); ctx.lineTo(3 - sw * 6, 0); ctx.stroke();
    }
    // corpo
    const g = ctx.createLinearGradient(-10, -60, 10, -24);
    g.addColorStop(0, U.rgb(U.shade(col, 0.2))); g.addColorStop(1, U.rgb(col));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, -26); ctx.quadraticCurveTo(-12, -54, 0, -56); ctx.quadraticCurveTo(12, -54, 10, -26); ctx.closePath(); ctx.fill();
    // braccia
    ctx.strokeStyle = U.rgb(U.shade(col, -0.08)); ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(-10 - sw * 4, -32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -50); ctx.lineTo(10 + sw * 4, -32); ctx.stroke();
    // testa
    ctx.fillStyle = '#f0cdb0';
    ctx.beginPath(); ctx.arc(0, -64, 8, 0, U.TAU); ctx.fill();
    ctx.fillStyle = U.rgb(U.shade(col, -0.45));
    ctx.beginPath(); ctx.arc(0, -66, 8.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  R.People = People;
})(window.R);

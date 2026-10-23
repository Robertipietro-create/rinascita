/* =========================================================
   particles.js — bolle, schizzi, gocce, scaglie, polvere,
   scintille. Vivono in coordinate "vista" (come il diorama).
   Un unico array con tetto massimo: niente cali di fps.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;

  const P = { list: [], max: 700 };

  P.clear = function () { P.list.length = 0; };

  // aggiunge una particella; o = { x, y, vx, vy, life, size, color, kind, ... }
  P.add = function (o) {
    if (P.list.length >= P.max) P.list.shift();
    o.age = 0;
    o.life = o.life || 1;
    o.vx = o.vx || 0; o.vy = o.vy || 0;
    o.g = o.g || 0;
    o.rot = o.rot || 0; o.vr = o.vr || 0;
    o.alpha = o.alpha === undefined ? 1 : o.alpha;
    P.list.push(o);
    return o;
  };

  // ---- ricette ----
  P.bubbles = function (x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      P.add({ kind: 'bubble', x: x + U.rand(-spread, spread), y: y + U.rand(-spread, spread) * 0.7,
        vx: U.rand(-6, 6), vy: U.rand(-14, -2), size: U.rand(1.5, 5), life: U.rand(0.7, 1.8), wob: U.rand(0, 6) });
    }
  };
  P.splash = function (x, y, n, color, power) {
    const p = power || 1;
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU), s = U.rand(30, 120) * p;
      P.add({ kind: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - U.rand(20, 80) * p, g: 420,
        size: U.rand(1, 2.6), life: U.rand(0.3, 0.7), color: color || 'rgba(200,230,255,0.9)' });
    }
  };
  // goccia che cola lungo la parete
  P.drip = function (x, y, color) {
    P.add({ kind: 'drip', x, y, vx: 0, vy: U.rand(8, 20), g: 25, size: U.rand(1.2, 2.2), life: U.rand(1, 2.2),
      color: color || 'rgba(190,215,235,0.8)', trail: [] });
  };
  // particella di polvere risucchiata verso (tx, ty)
  P.suck = function (x, y, tx, ty, color) {
    P.add({ kind: 'suck', x, y, tx, ty, vx: U.rand(-20, 20), vy: U.rand(-20, 20), size: U.rand(1, 2.6),
      life: 0.6, color: color || '#b3a894' });
  };
  // scaglia di vernice che si stacca e cade ruotando
  P.flake = function (x, y, color, floorY) {
    P.add({ kind: 'flake', x, y, vx: U.rand(-40, 40), vy: U.rand(-60, -10), g: 300, size: U.rand(2, 5),
      w: U.rand(0.5, 1), rot: U.rand(0, 6), vr: U.rand(-12, 12), life: U.rand(1.2, 2), color, floorY });
  };
  // zolla di fango che vola in arco verso un mucchio
  P.clump = function (x, y, tx, ty, color, done) {
    const dur = U.rand(0.45, 0.65);
    P.add({ kind: 'clump', x0: x, y0: y, x, y, tx, ty, dur, life: dur, size: U.rand(3, 6), color, done, rot: U.rand(0, 6) });
  };
  P.dustPuff = function (x, y, n, color) {
    for (let i = 0; i < n; i++) {
      P.add({ kind: 'puff', x: x + U.rand(-6, 6), y: y + U.rand(-4, 4), vx: U.rand(-25, 25), vy: U.rand(-30, -5),
        size: U.rand(4, 10), life: U.rand(0.6, 1.2), color: color || 'rgba(190,175,150,0.5)' });
    }
  };
  P.sparkle = function (x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      P.add({ kind: 'spark', x: x + U.rand(-spread, spread), y: y + U.rand(-spread, spread), vx: U.rand(-8, 8), vy: U.rand(-20, -4),
        size: U.rand(2, 5), life: U.rand(0.5, 1.1), rot: U.rand(0, 1) });
    }
  };
  P.chips = function (x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(-Math.PI, 0), s = U.rand(60, 180);
      P.add({ kind: 'flake', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, size: U.rand(2, 6), w: U.rand(0.4, 1),
        rot: U.rand(0, 6), vr: U.rand(-15, 15), life: U.rand(0.6, 1.1), color, floorY: y + U.rand(10, 30) });
    }
  };
  P.leaf = function (x, y, color) {
    P.add({ kind: 'leaf', x, y, vx: U.rand(-10, 10), vy: U.rand(5, 15), size: U.rand(3, 5), life: U.rand(2, 4), rot: U.rand(0, 6), vr: U.rand(-2, 2), color });
  };

  P.update = function (dt) {
    const L = P.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) {
        if (p.kind === 'bubble' && Math.random() < 0.25) R.Audio.play('pop');
        if (p.kind === 'clump' && p.done) p.done();
        L.splice(i, 1);
        continue;
      }
      if (p.kind === 'suck') {
        // accelera verso il bocchettone
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx += dx / d * 900 * dt; p.vy += dy / d * 900 * dt;
        p.vx *= 0.9; p.vy *= 0.9;
        if (d < 6) { L.splice(i, 1); continue; }
      } else if (p.kind === 'clump') {
        const t = p.age / p.dur;
        p.x = U.lerp(p.x0, p.tx, t);
        p.y = U.lerp(p.y0, p.ty, t) - Math.sin(t * Math.PI) * 50;
        p.rot += dt * 8;
        continue;
      } else if (p.kind === 'bubble') {
        p.wob += dt * 6;
        p.vx = Math.sin(p.wob) * 6;
        p.vy *= 0.97;
      } else if (p.kind === 'leaf') {
        p.vx = Math.sin(p.age * 2 + p.rot) * 14;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.floorY !== undefined && p.y > p.floorY) { p.y = p.floorY; p.vy *= -0.25; p.vx *= 0.6; p.vr *= 0.5; }
      if (p.kind === 'drip' && p.trail) { p.trail.push(p.x, p.y); if (p.trail.length > 16) p.trail.splice(0, 2); }
    }
  };

  P.draw = function (ctx) {
    const L = P.list;
    for (let i = 0; i < L.length; i++) {
      const p = L[i], t = p.age / p.life, fade = 1 - t;
      switch (p.kind) {
        case 'bubble': {
          ctx.globalAlpha = Math.min(1, fade * 2) * 0.85;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.7;
          ctx.fillStyle = 'rgba(230,245,255,0.35)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, U.TAU); ctx.fill();
          break;
        }
        case 'drop': case 'suck': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill();
          break;
        }
        case 'drip': {
          ctx.globalAlpha = Math.min(1, fade * 1.5);
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k < p.trail.length; k += 2) { if (k === 0) ctx.moveTo(p.trail[k], p.trail[k + 1]); else ctx.lineTo(p.trail[k], p.trail[k + 1]); }
          ctx.stroke();
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.9, 0, U.TAU); ctx.fill();
          break;
        }
        case 'flake': case 'clump': case 'leaf': {
          ctx.globalAlpha = Math.min(1, fade * 3);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.kind === 'clump') {
            ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.75, 0, 0, U.TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,240,220,0.25)'; ctx.beginPath(); ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.3, 0, U.TAU); ctx.fill();
          } else if (p.kind === 'leaf') {
            ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, U.TAU); ctx.fill();
          } else {
            ctx.scale(1, Math.abs(Math.cos(p.rot * 1.3)) * p.w + 0.15);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }
          ctx.restore();
          break;
        }
        case 'puff': {
          ctx.globalAlpha = fade * 0.6;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + t), 0, U.TAU); ctx.fill();
          break;
        }
        case 'spark': {
          ctx.globalAlpha = Math.sin(t * Math.PI);
          const s = p.size * (0.6 + Math.sin(t * Math.PI) * 0.6);
          ctx.fillStyle = '#fffbe8';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s); ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s); ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s); ctx.fill();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  R.P = P;
})(window.R);

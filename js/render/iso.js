/* =========================================================
   iso.js — proiezione isometrica 2:1 e solidi di base
   Mondo: x verso destra-giù, y verso sinistra-giù, z verso l'alto.
   Una unità del mondo ≈ 1/2 metro. S = pixel "vista" per unità.
   Ogni piano (pavimento, pareti) è una trasformazione AFFINE:
   così ogni superficie ha la sua texture e il dito si
   ri-proietta esattamente nello spazio della texture.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U;

  const Iso = { S: 40, PPU: 64 }; // PPU = pixel di texture per unità

  // punto 3D → coordinate vista
  Iso.p = function (x, y, z) {
    const S = Iso.S;
    return [(x - y) * S, (x + y) * S * 0.5 - (z || 0) * S];
  };
  // coordinate vista sul piano z → punto del mondo (x, y)
  Iso.unproject = function (vx, vy, z) {
    const S = Iso.S;
    const a = vx / S, b = (vy + (z || 0) * S) / (S * 0.5);
    return [(a + b) / 2, (b - a) / 2];
  };

  // ---- matrici texture → vista per i tre piani della stanza ----
  // pavimento: u lungo x, v lungo y
  Iso.floorM = function (ppu) {
    const S = Iso.S, k = 1 / (ppu || Iso.PPU);
    return [S * k, S * 0.5 * k, -S * k, S * 0.5 * k, 0, 0];
  };
  // parete di fondo (piano y=0): u lungo x, v verso il basso da quota H
  Iso.wallBackM = function (H, ppu) {
    const S = Iso.S, k = 1 / (ppu || Iso.PPU);
    return [S * k, S * 0.5 * k, 0, S * k, 0, -H * S];
  };
  // parete sinistra (piano x=0): u lungo y, v verso il basso da quota H
  Iso.wallLeftM = function (H, ppu) {
    const S = Iso.S, k = 1 / (ppu || Iso.PPU);
    return [-S * k, S * 0.5 * k, 0, S * k, 0, -H * S];
  };

  // ---- poligoni ----
  // open = true: linea spezzata (non richiusa), per i filetti e i bordi
  Iso.path = function (ctx, pts, open) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const q = Iso.p(pts[i][0], pts[i][1], pts[i][2]);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    if (!open) ctx.closePath();
  };
  Iso.poly = function (ctx, pts, fill, stroke, lw) {
    Iso.path(ctx, pts);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  };

  // colore come array [r,g,b] oppure '#hex'
  const C = c => (typeof c === 'string' ? U.hex(c) : c);

  // parallelepipedo [x..x+w] × [y..y+d] × [z..z+h]
  // facce visibili: sopra, quella a +y (sinistra-giù) e quella a +x (destra-giù)
  Iso.box = function (ctx, x, y, z, w, d, h, col, o) {
    const c = C(col);
    o = o || {};
    const top = o.top ? C(o.top) : U.shade(c, 0.14);
    const left = o.left ? C(o.left) : c;
    const right = o.right ? C(o.right) : U.shade(c, -0.16);
    const a = o.alpha === undefined ? 1 : o.alpha;
    // faccia +y
    Iso.poly(ctx, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], U.rgb(left, a));
    // faccia +x
    Iso.poly(ctx, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], U.rgb(right, a));
    // sopra
    Iso.poly(ctx, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], U.rgb(top, a));
    if (o.edge !== false && h > 0.05) {
      // filo di luce sullo spigolo frontale: dà morbidezza "da diorama"
      ctx.strokeStyle = U.rgb(U.shade(top, 0.25), 0.55 * a);
      ctx.lineWidth = 0.8;
      Iso.path(ctx, [[x, y + d, z + h], [x + w, y + d, z + h], [x + w, y, z + h]], true);
      ctx.stroke();
    }
  };

  // ombra morbida a terra (ellisse)
  Iso.shadow = function (ctx, x, y, z, rx, ry, a) {
    const q = Iso.p(x, y, z || 0), S = Iso.S;
    ctx.save();
    ctx.translate(q[0], q[1]);
    ctx.scale(1, 0.5);
    const r = Math.max(rx, ry) * S * 1.414;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(40,25,30,${a === undefined ? 0.28 : a})`);
    g.addColorStop(1, 'rgba(40,25,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill();
    ctx.restore();
  };

  // ellisse orizzontale (cerchio sul piano z)
  Iso.disk = function (ctx, x, y, z, r, fill, stroke) {
    const q = Iso.p(x, y, z), S = Iso.S;
    ctx.beginPath();
    ctx.ellipse(q[0], q[1], r * S * 1.414, r * S * 0.707, 0, 0, U.TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  };

  // cilindro verticale
  Iso.cyl = function (ctx, x, y, z, r, h, col, topCol) {
    const c = C(col), S = Iso.S;
    const b = Iso.p(x, y, z), t = Iso.p(x, y, z + h);
    const rx = r * S * 1.414, ry = r * S * 0.707;
    const g = ctx.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
    g.addColorStop(0, U.rgb(U.shade(c, 0.05)));
    g.addColorStop(0.45, U.rgb(U.shade(c, 0.15)));
    g.addColorStop(1, U.rgb(U.shade(c, -0.25)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI);
    ctx.lineTo(t[0] - rx, t[1]);
    ctx.ellipse(t[0], t[1], rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(t[0], t[1], rx, ry, 0, 0, U.TAU);
    ctx.fillStyle = topCol ? (typeof topCol === 'string' ? topCol : U.rgb(topCol)) : U.rgb(U.shade(c, 0.2));
    ctx.fill();
  };

  // sfera/cespuglio morbido (fogliame, cuscini, gatto...)
  Iso.ball = function (ctx, x, y, z, r, col, hl) {
    const c = C(col), S = Iso.S;
    const q = Iso.p(x, y, z);
    const R0 = r * S * 1.2;
    const g = ctx.createRadialGradient(q[0] - R0 * 0.35, q[1] - R0 * 0.4, R0 * 0.1, q[0], q[1], R0);
    g.addColorStop(0, U.rgb(U.shade(c, hl === undefined ? 0.3 : hl)));
    g.addColorStop(0.7, U.rgb(c));
    g.addColorStop(1, U.rgb(U.shade(c, -0.25)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(q[0], q[1], R0, 0, U.TAU); ctx.fill();
  };

  // punto centrale dello schermo del piano di una parete (per hit test)
  Iso.pointInPoly = function (px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  R.Iso = Iso;
})(window.R);

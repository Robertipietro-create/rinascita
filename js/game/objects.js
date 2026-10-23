/* =========================================================
   objects.js — tutto ciò che sta "dentro" la stanza:
   - DETRITI dello sgombero (sacchi, bottiglie, pneumatici...)
   - CATALOGO dei MOBILI, descritti come primitive (scatole,
     cilindri, sfere, pannelli) in coordinate locali: la
     rotazione di 90° diventa una semplice trasformazione e
     ogni mobile funziona in tutti e quattro gli orientamenti.
   - STILI: ogni stile è una tavolozza applicata agli stessi mobili.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, Iso = R.Iso;
  const O = {};

  // ======================= DETRITI =======================
  // size = raggio in unità (presa e fisica), vol = quanto riempie il cassone
  O.DEBRIS = {
    sacco: { name: 'Sacco', size: 0.45, vol: 1.2, weight: 1.2, sound: 'thud' },
    bottiglia: { name: 'Bottiglia', size: 0.28, vol: 0.3, weight: 0.4, sound: 'clank' },
    pneumatico: { name: 'Pneumatico', size: 0.5, vol: 1.4, weight: 1.4, sound: 'thud' },
    sedia: { name: 'Sedia rotta', size: 0.55, vol: 1.5, weight: 1.1, sound: 'crack' },
    assi: { name: 'Assi', size: 0.6, vol: 1.2, weight: 1.0, sound: 'thud' },
    calcinacci: { name: 'Calcinacci', size: 0.4, vol: 0.8, weight: 1.6, sound: 'thud' },
    scatola: { name: 'Scatolone', size: 0.45, vol: 1.0, weight: 0.6, sound: 'thud' },
    giornali: { name: 'Giornali', size: 0.35, vol: 0.5, weight: 0.5, sound: 'thud' },
    lattina: { name: 'Lattina', size: 0.22, vol: 0.2, weight: 0.3, sound: 'clank' },
    ramo: { name: 'Ramo secco', size: 0.55, vol: 0.7, weight: 0.5, sound: 'crack' }
  };

  // disegna un detrito alla sua posizione (o.x, o.y, o.z); o.a = variazione
  O.drawDebris = function (ctx, o, alpha) {
    const k = o.kind, x = o.x, y = o.y, z = o.z || 0, a = o.a || 0;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    if (o.z > 0.02 || o.lift) Iso.shadow(ctx, x, y, 0, O.DEBRIS[k].size, O.DEBRIS[k].size, 0.2);
    else Iso.shadow(ctx, x, y, 0, O.DEBRIS[k].size * 0.9, O.DEBRIS[k].size * 0.9, 0.3);
    const q = Iso.p(x, y, z), S = Iso.S;
    switch (k) {
      case 'sacco': {
        const col = a > 0.5 ? [52, 58, 50] : [40, 42, 48];
        const r0 = 0.42 * S;
        const g = ctx.createRadialGradient(q[0] - r0 * 0.4, q[1] - r0 * 0.9, 2, q[0], q[1] - r0 * 0.5, r0 * 1.3);
        g.addColorStop(0, U.rgb(U.shade(col, 0.45))); g.addColorStop(0.5, U.rgb(col)); g.addColorStop(1, U.rgb(U.shade(col, -0.4)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(q[0] - r0, q[1]);
        ctx.bezierCurveTo(q[0] - r0 * 1.2, q[1] - r0 * 1.1, q[0] - r0 * 0.3, q[1] - r0 * 1.5, q[0], q[1] - r0 * 1.35);
        ctx.bezierCurveTo(q[0] + r0 * 0.4, q[1] - r0 * 1.5, q[0] + r0 * 1.25, q[1] - r0 * 1.0, q[0] + r0, q[1]);
        ctx.quadraticCurveTo(q[0], q[1] + r0 * 0.45, q[0] - r0, q[1]);
        ctx.fill();
        // nodo
        ctx.fillStyle = U.rgb(U.shade(col, 0.15));
        ctx.beginPath(); ctx.ellipse(q[0] + 1, q[1] - r0 * 1.4, 4, 3, 0.3, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(q[0] - 2, q[1] - r0 * 1.45); ctx.lineTo(q[0] - 6, q[1] - r0 * 1.75); ctx.lineTo(q[0] + 1, q[1] - r0 * 1.55); ctx.fill();
        // pieghe lucide
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(q[0] - r0 * 0.5, q[1] - r0 * 1.0); ctx.quadraticCurveTo(q[0] - r0 * 0.2, q[1] - r0 * 0.5, q[0] - r0 * 0.45, q[1] - r0 * 0.1); ctx.stroke();
        break;
      }
      case 'bottiglia': case 'lattina': {
        ctx.save(); ctx.translate(q[0], q[1] - 3); ctx.rotate(a * 3 - 0.4);
        if (k === 'bottiglia') {
          ctx.fillStyle = 'rgba(70,130,80,0.85)';
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -4, 18, 8, 3) : ctx.rect(-11, -4, 18, 8); ctx.fill();
          ctx.fillRect(6, -2, 7, 4);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-9, -3, 14, 1.5);
          ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-6, -4, 6, 8);
        } else {
          ctx.fillStyle = '#c94f4f'; ctx.fillRect(-6, -4, 12, 8);
          ctx.fillStyle = '#ddd'; ctx.fillRect(-7, -4, 2, 8); ctx.fillRect(5, -4, 2, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-5, -3, 10, 1.5);
        }
        ctx.restore();
        break;
      }
      case 'pneumatico': {
        const t = 0.22;
        Iso.disk(ctx, x, y, z, 0.48, '#26262a');
        Iso.disk(ctx, x, y, z + t, 0.48, '#3a3a40');
        ctx.fillStyle = '#26262a';
        const l = Iso.p(x, y, z), lt = Iso.p(x, y, z + t);
        ctx.fillRect(l[0] - 0.48 * S * 1.414, lt[1], 0.48 * S * 2.828, l[1] - lt[1]);
        Iso.disk(ctx, x, y, z + t, 0.48, '#3a3a40');
        Iso.disk(ctx, x, y, z + t, 0.24, '#1a1a1e');
        // battistrada
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        Iso.disk(ctx, x, y, z + t, 0.38, null, 'rgba(255,255,255,0.1)');
        break;
      }
      case 'sedia': {
        const w = '#8a6446';
        Iso.box(ctx, x - 0.4, y - 0.4, z + 0.0, 0.08, 0.08, 0.5, w);
        Iso.box(ctx, x + 0.3, y - 0.4, z, 0.08, 0.08, 0.32, w); // gamba rotta
        Iso.box(ctx, x - 0.4, y + 0.3, z, 0.08, 0.08, 0.5, w);
        Iso.box(ctx, x - 0.45, y - 0.45, z + 0.5, 0.85, 0.85, 0.08, '#9c7352');
        // seduta sfondata
        Iso.poly(ctx, [[x - 0.25, y - 0.25, z + 0.581], [x + 0.25, y - 0.25, z + 0.581], [x + 0.25, y + 0.25, z + 0.581], [x - 0.25, y + 0.25, z + 0.581]], 'rgba(40,25,15,0.7)');
        // schienale caduto di lato
        Iso.box(ctx, x + 0.45, y - 0.5, z, 0.12, 0.9, 0.08, '#7a583e');
        break;
      }
      case 'assi': {
        const cs = ['#8c6b4e', '#a07d5b', '#76583f'];
        Iso.box(ctx, x - 0.7, y - 0.2, z, 1.4, 0.22, 0.07, cs[0]);
        Iso.box(ctx, x - 0.15, y - 0.65, z + 0.07, 0.22, 1.3, 0.07, cs[1]);
        Iso.box(ctx, x - 0.6, y + 0.15, z + 0.14, 1.2, 0.2, 0.07, cs[2]);
        break;
      }
      case 'calcinacci': {
        const r = U.rng(Math.floor(a * 1000) + 3);
        for (let i = 0; i < 7; i++) {
          const dx = r.range(-0.3, 0.3), dy = r.range(-0.3, 0.3), s = r.range(0.12, 0.26);
          Iso.box(ctx, x + dx - s / 2, y + dy - s / 2, z + (i > 4 ? 0.15 : 0), s, s, s * 0.8, r.pick(['#b8aea0', '#a39889', '#c9bfb0', '#b06a50']));
        }
        break;
      }
      case 'scatola': {
        Iso.box(ctx, x - 0.4, y - 0.35, z, 0.8, 0.7, 0.55, '#c49a6c');
        // lembi aperti
        Iso.poly(ctx, [[x - 0.4, y + 0.35, z + 0.55], [x + 0.4, y + 0.35, z + 0.55], [x + 0.4, y + 0.6, z + 0.75], [x - 0.4, y + 0.6, z + 0.75]], '#d6ad80');
        Iso.poly(ctx, [[x + 0.4, y - 0.35, z + 0.55], [x + 0.4, y + 0.35, z + 0.55], [x + 0.62, y + 0.35, z + 0.72], [x + 0.62, y - 0.35, z + 0.72]], '#b38a5e');
        ctx.strokeStyle = 'rgba(120,80,40,0.5)';
        Iso.path(ctx, [[x - 0.4, y + 0.35, z + 0.3], [x + 0.4, y + 0.35, z + 0.3]]); ctx.stroke();
        break;
      }
      case 'giornali': {
        for (let i = 0; i < 4; i++) {
          const o2 = (i % 2 ? 0.05 : -0.05);
          Iso.box(ctx, x - 0.32 + o2, y - 0.25 - o2, z + i * 0.05, 0.64, 0.5, 0.05, i % 2 ? '#e8e2d2' : '#d9d1bd', { edge: false });
        }
        ctx.fillStyle = 'rgba(60,60,60,0.35)';
        const tq = Iso.p(x, y, z + 0.2);
        ctx.fillRect(tq[0] - 8, tq[1] - 2, 16, 1.5); ctx.fillRect(tq[0] - 6, tq[1] + 1, 12, 1);
        break;
      }
      case 'ramo': {
        ctx.strokeStyle = '#6b4b33'; ctx.lineCap = 'round';
        const p1 = Iso.p(x - 0.6, y + 0.1, z + 0.05), p2 = Iso.p(x + 0.6, y - 0.1, z + 0.05);
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
        ctx.lineWidth = 2;
        [[0.2, -0.3], [-0.2, 0.3], [0.4, 0.25]].forEach(([dx, dy]) => {
          const b = Iso.p(x + dx * 0.6, y, z + 0.05), e = Iso.p(x + dx, y + dy, z + 0.05);
          ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
          ctx.fillStyle = '#a8894a'; ctx.beginPath(); ctx.ellipse(e[0], e[1], 3, 1.6, 0.5, 0, U.TAU); ctx.fill();
        });
        break;
      }
    }
    ctx.globalAlpha = 1;
  };

  // ======================= STILI =======================
  O.STYLES = {
    nordico: { name: 'Nordico', wood: '#dcbf96', wood2: '#b8936a', fab: '#dcd8d0', fab2: '#9fb1ba', metal: '#3b3b3e', acc: '#e7c46a', pot: '#eeebe5', rug: '#ece5d8', rug2: '#9aa8a2', leaf: '#6f9c74' },
    boho: { name: 'Boho', wood: '#a7784f', wood2: '#7d5638', fab: '#dca37e', fab2: '#c26a4e', metal: '#b38d4c', acc: '#e7b45c', pot: '#c97e5e', rug: '#d6a676', rug2: '#8a4f38', leaf: '#5f8f5c', rattan: '#c9a467' },
    mediterraneo: { name: 'Mediterraneo', wood: '#c9a27a', wood2: '#9a7552', fab: '#f2ede3', fab2: '#3f6fa0', metal: '#2f3d4a', acc: '#e9a23b', pot: '#d7744f', rug: '#f1e7d4', rug2: '#3f6fa0', leaf: '#5d9466' }
  };

  // ======================= MOBILI =======================
  // Ogni mobile: footprint w×d (unità), cat, layer ('floor' | 'rug' | 'wall' | 'pet')
  // parts(s, t) → elenco di primitive in coordinate locali. s = tavolozza dello stile.
  const box = (x, y, z, w, d, h, c, o) => ({ t: 'box', x, y, z, w, d, h, c, o });
  const cyl = (x, y, z, r, h, c, top) => ({ t: 'cyl', x, y, z, r, h, c, top });
  const ball = (x, y, z, r, c) => ({ t: 'ball', x, y, z, r, c });
  // pannello su una faccia verticale (per cassetti, focolare, libri)
  const panel = (face, at, a0, a1, z0, z1, c) => ({ t: 'panel', face, at, a0, a1, z0, z1, c });

  O.ITEMS = {
    divano: {
      name: 'Divano', cat: 'sedute', w: 3, d: 1.4, layer: 'floor', seat: 0.55,
      parts: (s) => [
        box(0.1, 0.1, 0, 0.12, 0.12, 0.18, s.wood2), box(2.78, 0.1, 0, 0.12, 0.12, 0.18, s.wood2),
        box(0.1, 1.18, 0, 0.12, 0.12, 0.18, s.wood2), box(2.78, 1.18, 0, 0.12, 0.12, 0.18, s.wood2),
        box(0, 0, 0.18, 3, 0.45, 0.85, s.fab),             // schienale (lato y=0)
        box(0, 0.45, 0.18, 3, 0.95, 0.3, U.sh(s.fab, -0.05)),     // base
        box(0.3, 0.45, 0.48, 1.2, 0.85, 0.16, U.sh(s.fab, 0.06)), // cuscini
        box(1.5, 0.45, 0.48, 1.2, 0.85, 0.16, U.sh(s.fab, 0.06)),
        box(0, 0.45, 0.18, 0.3, 0.95, 0.55, s.fab), box(2.7, 0.45, 0.18, 0.3, 0.95, 0.55, s.fab), // braccioli
        box(0.45, 0.2, 0.62, 0.5, 0.25, 0.45, s.fab2), box(2.05, 0.2, 0.62, 0.5, 0.25, 0.45, s.acc) // cuscini decorativi
      ]
    },
    poltrona: {
      name: 'Poltrona', cat: 'sedute', w: 1.5, d: 1.4, layer: 'floor', seat: 0.55,
      parts: (s) => [
        box(0.1, 0.1, 0, 0.1, 0.1, 0.2, s.wood2), box(1.3, 0.1, 0, 0.1, 0.1, 0.2, s.wood2),
        box(0.1, 1.2, 0, 0.1, 0.1, 0.2, s.wood2), box(1.3, 1.2, 0, 0.1, 0.1, 0.2, s.wood2),
        box(0, 0, 0.2, 1.5, 0.35, 0.9, s.fab2),
        box(0, 0.35, 0.2, 1.5, 1.05, 0.3, U.sh(s.fab2, -0.06)),
        box(0.25, 0.35, 0.5, 1.0, 0.85, 0.14, U.sh(s.fab2, 0.08)),
        box(0, 0.35, 0.2, 0.25, 1.05, 0.5, s.fab2), box(1.25, 0.35, 0.2, 0.25, 1.05, 0.5, s.fab2),
        box(0.5, 0.15, 0.64, 0.5, 0.22, 0.38, s.acc)
      ]
    },
    tavolino: {
      name: 'Tavolino', cat: 'tavoli', w: 1.6, d: 1.0, layer: 'floor', seat: 0.42,
      parts: (s) => [
        box(0.1, 0.1, 0, 0.1, 0.1, 0.36, s.wood2), box(1.4, 0.1, 0, 0.1, 0.1, 0.36, s.wood2),
        box(0.1, 0.8, 0, 0.1, 0.1, 0.36, s.wood2), box(1.4, 0.8, 0, 0.1, 0.1, 0.36, s.wood2),
        box(0.1, 0.1, 0.1, 1.4, 0.8, 0.04, U.sh(s.wood2, 0.1)), // ripiano basso
        box(0, 0, 0.36, 1.6, 1.0, 0.07, s.wood),
        box(0.25, 0.3, 0.43, 0.45, 0.32, 0.12, s.fab2), // libri
        box(0.28, 0.33, 0.55, 0.4, 0.28, 0.06, s.acc),
        cyl(1.15, 0.5, 0.43, 0.13, 0.22, s.pot), ball(1.15, 0.5, 0.75, 0.16, s.leaf)
      ]
    },
    tappeto: {
      name: 'Tappeto', cat: 'tessili', w: 4, d: 3, layer: 'rug',
      parts: (s) => [
        box(0, 0, 0, 4, 3, 0.03, s.rug, { edge: false }),
        box(0.25, 0.25, 0.03, 3.5, 2.5, 0.005, s.rug2, { edge: false }),
        box(0.45, 0.45, 0.035, 3.1, 2.1, 0.005, s.rug, { edge: false }),
        box(1.4, 1.0, 0.04, 1.2, 1.0, 0.005, s.acc, { edge: false })
      ]
    },
    tappetoTondo: {
      name: 'Tappeto tondo', cat: 'tessili', w: 2.5, d: 2.5, layer: 'rug',
      parts: (s) => [
        { t: 'disk', x: 1.25, y: 1.25, z: 0.02, r: 1.2, c: s.rug2 },
        { t: 'disk', x: 1.25, y: 1.25, z: 0.025, r: 1.0, c: s.rug },
        { t: 'disk', x: 1.25, y: 1.25, z: 0.03, r: 0.6, c: s.acc },
        { t: 'disk', x: 1.25, y: 1.25, z: 0.035, r: 0.35, c: s.rug }
      ]
    },
    lampada: {
      name: 'Lampada', cat: 'luci', w: 0.8, d: 0.8, layer: 'floor',
      light: { z: 2.3, r: 4.2, col: [255, 196, 120] },
      parts: (s) => [
        cyl(0.4, 0.4, 0, 0.28, 0.05, s.metal),
        cyl(0.4, 0.4, 0.05, 0.04, 2.0, s.metal),
        cyl(0.4, 0.4, 1.95, 0.32, 0.45, s.fab, U.sh(s.fab, 0.3))
      ]
    },
    lampadaTavolo: {
      name: 'Abat-jour', cat: 'luci', w: 0.8, d: 0.8, layer: 'floor',
      light: { z: 1.3, r: 3.2, col: [255, 190, 110] },
      parts: (s) => [
        box(0.05, 0.05, 0, 0.7, 0.7, 0.7, s.wood), // comodino
        panel('+y', 0.75, 0.15, 0.65, 0.35, 0.6, U.sh(s.wood, -0.12)),
        cyl(0.4, 0.4, 0.7, 0.14, 0.25, s.pot),
        cyl(0.4, 0.4, 0.95, 0.24, 0.3, s.fab, U.sh(s.fab, 0.3))
      ]
    },
    pianta: {
      name: 'Pianta grande', cat: 'piante', w: 1, d: 1, layer: 'floor', grows: true,
      parts: (s, g) => [
        cyl(0.5, 0.5, 0, 0.32, 0.6, s.pot),
        cyl(0.5, 0.5, 0.6, 0.3, 0.02, '#5a4030'),
        ball(0.5, 0.5, 0.6 + 0.9 * g, 0.42 * g, s.leaf), ball(0.3, 0.6, 0.6 + 1.3 * g, 0.36 * g, U.sh(s.leaf, 0.1)),
        ball(0.65, 0.35, 0.6 + 1.5 * g, 0.34 * g, U.sh(s.leaf, -0.05)), ball(0.5, 0.5, 0.6 + 1.9 * g, 0.28 * g, U.sh(s.leaf, 0.15))
      ]
    },
    monstera: {
      name: 'Monstera', cat: 'piante', w: 1.2, d: 1.2, layer: 'floor', grows: true, leafy: true,
      parts: (s, g) => [
        cyl(0.6, 0.6, 0, 0.3, 0.45, s.rattan || s.pot),
        { t: 'leaves', x: 0.6, y: 0.6, z: 0.45, g, c: s.leaf }
      ]
    },
    libreria: {
      name: 'Libreria', cat: 'mobili', w: 2, d: 0.6, layer: 'floor', wallSide: true,
      parts: (s) => {
        const p = [box(0, 0, 0, 2, 0.6, 3.0, s.wood)];
        const r = U.rng(5);
        for (let sh = 0; sh < 4; sh++) {
          const z = 0.15 + sh * 0.72;
          p.push(panel('+y', 0.6, 0.08, 1.92, z, z + 0.6, U.sh(s.wood, -0.35)));
          let a = 0.12;
          while (a < 1.8) {
            const bw = r.range(0.07, 0.14), bh = r.range(0.4, 0.55);
            if (r.chance(0.15)) { a += 0.15; continue; }
            p.push(panel('+y', 0.6, a, Math.min(1.88, a + bw), z, z + bh, r.pick([s.fab2, s.acc, s.wood2, '#c46a5a', '#e8dcc4', s.leaf])));
            a += bw + 0.01;
          }
        }
        return p;
      }
    },
    credenza: {
      name: 'Credenza', cat: 'mobili', w: 2.4, d: 0.8, layer: 'floor', wallSide: true,
      parts: (s) => [
        box(0.1, 0.1, 0, 0.1, 0.1, 0.25, s.wood2), box(2.2, 0.1, 0, 0.1, 0.1, 0.25, s.wood2),
        box(0.1, 0.6, 0, 0.1, 0.1, 0.25, s.wood2), box(2.2, 0.6, 0, 0.1, 0.1, 0.25, s.wood2),
        box(0, 0, 0.25, 2.4, 0.8, 0.85, s.wood),
        panel('+y', 0.8, 0.08, 1.18, 0.33, 1.02, U.sh(s.wood, 0.08)), panel('+y', 0.8, 1.22, 2.32, 0.33, 1.02, U.sh(s.wood, 0.08)),
        cyl(0.5, 0.4, 1.1, 0.14, 0.35, s.pot), ball(0.5, 0.4, 1.55, 0.2, s.leaf),
        box(1.4, 0.25, 1.1, 0.5, 0.35, 0.08, s.fab2), box(1.45, 0.28, 1.18, 0.4, 0.3, 0.06, s.acc)
      ]
    },
    camino: {
      name: 'Camino', cat: 'mobili', w: 2.4, d: 0.8, layer: 'floor', wallSide: true, fire: true,
      light: { z: 0.6, r: 4.5, col: [255, 150, 70], flicker: true },
      parts: (s) => [
        box(-0.1, -0.05, 0, 2.6, 1.05, 0.12, '#b9aea0'),
        box(0, 0, 0.12, 2.4, 0.7, 1.7, '#e9e1d4'),
        box(-0.1, -0.05, 1.82, 2.6, 0.85, 0.12, s.wood),
        panel('+y', 0.7, 0.5, 1.9, 0.18, 1.15, '#2a1d18'),
        { t: 'fire', face: '+y', at: 0.7, a: 1.2, z: 0.2 },
        cyl(0.4, 0.35, 1.94, 0.1, 0.4, s.pot), box(1.7, 0.25, 1.94, 0.12, 0.3, 0.45, s.acc)
      ]
    },
    pouf: {
      name: 'Pouf', cat: 'sedute', w: 0.8, d: 0.8, layer: 'floor', seat: 0.45,
      parts: (s) => [cyl(0.4, 0.4, 0, 0.36, 0.42, s.fab2, U.sh(s.fab2, 0.2))]
    },
    gatto: {
      name: 'Gatto', cat: 'amici', w: 0.8, d: 0.8, layer: 'pet',
      parts: () => [{ t: 'cat', x: 0.4, y: 0.4 }]
    },
    // --- oggetti da parete (disegnati nello spazio della parete) ---
    quadro: { name: 'Quadro', cat: 'pareti', layer: 'wall', ww: 1.4, wh: 1.0, defV: 1.5 },
    specchio: { name: 'Specchio', cat: 'pareti', layer: 'wall', ww: 1.0, wh: 1.0, defV: 1.4 },
    mensola: { name: 'Mensola', cat: 'pareti', layer: 'wall', ww: 1.8, wh: 0.7, defV: 1.5 },
    tende: { name: 'Tende', cat: 'pareti', layer: 'wall', ww: 0, wh: 0, window: true }
  };

  // ---------- rotazione di primitive ----------
  // ruota di 90° in senso orario un footprint W×D: (x,y) → (D − y, x)
  function rotPart(p, W, D) {
    const q = Object.assign({}, p);
    if (p.t === 'box') { q.x = D - p.y - p.d; q.y = p.x; q.w = p.d; q.d = p.w; }
    else if (p.t === 'panel' || p.t === 'fire') {
      // facce: +y → -x, +x → +y, -y → +x, -x → -y
      const map = { '+y': '-x', '+x': '+y', '-y': '+x', '-x': '-y' };
      q.face = map[p.face];
      if (p.face === '+y' || p.face === '-y') { q.at = D - p.at; } else { q.at = p.at; }
      if (p.t === 'panel') {
        if (p.face === '+y' || p.face === '-y') { q.a0 = p.a0; q.a1 = p.a1; } // x → y
        else { q.a0 = D - p.a1; q.a1 = D - p.a0; } // y → x
      } else {
        if (p.face === '+x' || p.face === '-x') q.a = D - p.a;
      }
    } else { q.x = D - p.y; q.y = p.x; }
    return q;
  }
  O.partsFor = function (def, style, rot, grow) {
    let parts = def.parts(style, grow === undefined ? 1 : grow);
    let W = def.w, D = def.d;
    for (let i = 0; i < (rot || 0); i++) { parts = parts.map(p => rotPart(p, W, D)); const t = W; W = D; D = t; }
    return { parts, W, D };
  };
  O.footprint = function (def, rot) { return (rot || 0) % 2 ? [def.d, def.w] : [def.w, def.d]; };

  // ---------- disegno di un mobile ----------
  // it = { id, x, y, rot, style, grow, t, z }
  O.drawItem = function (ctx, it, time, opt) {
    const def = O.ITEMS[it.id];
    const s = O.STYLES[it.style] || O.STYLES.nordico;
    if (def.layer === 'pet') { O.drawCat(ctx, it, time); return; }
    const pr = O.partsFor(def, s, it.rot, it.grow);
    const X = it.x, Y = it.y, Z = it.z || 0;
    const alpha = opt && opt.alpha !== undefined ? opt.alpha : 1;
    if (def.layer !== 'rug') Iso.shadow(ctx, X + pr.W / 2, Y + pr.D / 2, 0, pr.W * 0.55, pr.D * 0.55, 0.25 * alpha);
    if (alpha < 1) ctx.globalAlpha = alpha;
    // ordina: scatole/cilindri dal fondo verso il davanti
    const solids = pr.parts.filter(p => p.t !== 'panel' && p.t !== 'fire');
    solids.sort((a, b) => key(a) - key(b));
    for (const p of solids) drawPart(ctx, p, X, Y, Z, s, time, it);
    for (const p of pr.parts) if (p.t === 'panel' || p.t === 'fire') drawPanel(ctx, p, X, Y, Z, time);
    ctx.globalAlpha = 1;
  };
  function key(p) {
    if (p.t === 'box') return (p.x + p.w * 0.5) + (p.y + p.d * 0.5) + p.z * 0.3 + (p.w + p.d) * 0.1;
    return p.x + p.y + (p.z || 0) * 0.3;
  }
  function drawPart(ctx, p, X, Y, Z, s, time, it) {
    switch (p.t) {
      case 'box': Iso.box(ctx, X + p.x, Y + p.y, Z + p.z, p.w, p.d, p.h, p.c, p.o); break;
      case 'cyl': Iso.cyl(ctx, X + p.x, Y + p.y, Z + p.z, p.r, p.h, p.c, p.top); break;
      case 'ball': if (p.r > 0.01) Iso.ball(ctx, X + p.x, Y + p.y, Z + p.z, p.r, p.c); break;
      case 'disk': Iso.disk(ctx, X + p.x, Y + p.y, Z + p.z, p.r, typeof p.c === 'string' ? p.c : U.rgb(p.c)); break;
      case 'leaves': drawLeaves(ctx, X + p.x, Y + p.y, Z + p.z, p.g, p.c, time); break;
    }
  }
  function drawPanel(ctx, p, X, Y, Z, time) {
    if (p.face !== '+x' && p.face !== '+y') return; // facce nascoste
    if (p.t === 'fire') { drawFire(ctx, p, X, Y, Z, time); return; }
    const c = p.c;
    if (p.face === '+y') Iso.poly(ctx, [[X + p.a0, Y + p.at + 0.001, Z + p.z0], [X + p.a1, Y + p.at + 0.001, Z + p.z0], [X + p.a1, Y + p.at + 0.001, Z + p.z1], [X + p.a0, Y + p.at + 0.001, Z + p.z1]], c);
    else Iso.poly(ctx, [[X + p.at + 0.001, Y + p.a0, Z + p.z0], [X + p.at + 0.001, Y + p.a1, Z + p.z0], [X + p.at + 0.001, Y + p.a1, Z + p.z1], [X + p.at + 0.001, Y + p.a0, Z + p.z1]], c);
  }
  // fiamme del camino: lingue che tremolano
  function drawFire(ctx, p, X, Y, Z, time) {
    const pos = (a, z) => p.face === '+y' ? Iso.p(X + a, Y + p.at, Z + z) : Iso.p(X + p.at, Y + a, Z + z);
    const b = pos(p.a, p.z);
    // ceppi
    ctx.fillStyle = '#5a3a26';
    ctx.fillRect(b[0] - 16, b[1] - 4, 32, 5);
    for (let i = 0; i < 5; i++) {
      const ph = time * (5 + i) + i * 1.7;
      const h = 14 + Math.sin(ph) * 4 + Math.sin(ph * 2.3) * 2;
      const dx = (i - 2) * 6 + Math.sin(ph * 0.7) * 1.5;
      const g = ctx.createLinearGradient(0, b[1], 0, b[1] - h);
      g.addColorStop(0, 'rgba(255,200,90,0.95)'); g.addColorStop(0.6, 'rgba(255,120,50,0.8)'); g.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(b[0] + dx - 5, b[1] - 3);
      ctx.quadraticCurveTo(b[0] + dx - 4, b[1] - h * 0.6, b[0] + dx + Math.sin(ph) * 2, b[1] - h);
      ctx.quadraticCurveTo(b[0] + dx + 4, b[1] - h * 0.6, b[0] + dx + 5, b[1] - 3);
      ctx.fill();
    }
  }
  // foglie grandi della monstera, si aprono crescendo
  function drawLeaves(ctx, x, y, z, g, col, time) {
    const c = U.hex(typeof col === 'string' ? col : '#5d9466');
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = i / n * U.TAU + 0.3;
      const len = (0.6 + (i % 3) * 0.15) * g;
      const sway = Math.sin(time * 1.2 + i) * 0.03;
      const base = Iso.p(x, y, z + 0.2 * g);
      const tip = Iso.p(x + Math.cos(a + sway) * len * 0.8, y + Math.sin(a + sway) * len * 0.8, z + (0.7 + (i % 2) * 0.5) * g);
      ctx.strokeStyle = U.rgb(U.shade(c, -0.25)); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(Math.atan2(tip[1] - base[1], tip[0] - base[0]));
      ctx.fillStyle = U.rgb(U.shade(c, (i % 3) * 0.07 - 0.05));
      const L = 16 * g, Wd = 11 * g;
      ctx.beginPath(); ctx.ellipse(0, 0, L, Wd, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
      // tagli tipici della monstera
      ctx.strokeStyle = U.rgb(U.shade(c, -0.3)); ctx.lineWidth = 1.2;
      for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(-L * 0.2, k * Wd * 0.95); ctx.lineTo(-L * 0.05, k * Wd * 0.5); ctx.stroke(); }
      ctx.restore();
    }
  }

  // ---------- il gatto ----------
  O.drawCat = function (ctx, it, time) {
    const x = it.x + 0.4, y = it.y + 0.4, z = it.z || 0;
    const br = 1 + Math.sin(time * 2.2) * 0.04; // respiro
    Iso.shadow(ctx, x, y, z, 0.35, 0.35, 0.25);
    const q = Iso.p(x, y, z), S = Iso.S;
    const col = it.catColor || [214, 140, 72];
    ctx.save(); ctx.translate(q[0], q[1] - 6);
    // coda che oscilla
    ctx.strokeStyle = U.rgb(U.shade(col, -0.1)); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, 2);
    ctx.quadraticCurveTo(18, 4 + Math.sin(time * 1.5) * 3, 14, 9 + Math.sin(time * 1.5) * 2); ctx.stroke();
    // corpo acciambellato
    const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 16);
    g.addColorStop(0, U.rgb(U.shade(col, 0.3))); g.addColorStop(1, U.rgb(U.shade(col, -0.15)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 14 * br, 9 * br, 0, 0, U.TAU); ctx.fill();
    // strisce
    ctx.strokeStyle = U.rgb(U.shade(col, -0.25), 0.5); ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(2 + i * 4, -2, 6, -2.2, -1.2); ctx.stroke(); }
    // testa appoggiata
    ctx.fillStyle = U.rgb(U.shade(col, 0.1));
    ctx.beginPath(); ctx.ellipse(-10, 2, 6.5, 5.5, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-15, -1); ctx.lineTo(-14, -8); ctx.lineTo(-10, -3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-6, -8); ctx.lineTo(-5, -1); ctx.fill();
    // occhi chiusi
    ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-12, 2, 1.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8, 2, 1.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    // "z z z" ogni tanto
    const zt = (time * 0.4) % 1;
    if (zt < 0.6) {
      ctx.globalAlpha = Math.sin(zt / 0.6 * Math.PI) * 0.6;
      ctx.fillStyle = '#6a5a7a'; ctx.font = 'bold 8px sans-serif';
      ctx.fillText('z', q[0] - 16 + zt * 8, q[1] - 18 - zt * 16);
      ctx.globalAlpha = 1;
    }
    void S;
  };

  // ---------- oggetti da parete (in coordinate texture della parete) ----------
  // w = { id, u, v (centro, unità), style, wall }
  O.drawWallItem = function (ctx, w, ppu, time, win) {
    const def = O.ITEMS[w.id], s = O.STYLES[w.style] || O.STYLES.nordico;
    const cx = w.u * ppu, cy = w.v * ppu, W = def.ww * ppu, H = def.wh * ppu;
    ctx.save();
    if (w.id === 'quadro') {
      ctx.fillStyle = 'rgba(40,25,20,0.25)'; ctx.fillRect(cx - W / 2 + 4, cy - H / 2 + 6, W, H);
      ctx.fillStyle = s.wood2; ctx.fillRect(cx - W / 2, cy - H / 2, W, H);
      ctx.fillStyle = '#f4efe6'; ctx.fillRect(cx - W / 2 + 6, cy - H / 2 + 6, W - 12, H - 12);
      // arte astratta nello stile scelto
      ctx.beginPath(); ctx.rect(cx - W / 2 + 12, cy - H / 2 + 12, W - 24, H - 24); ctx.clip();
      ctx.fillStyle = s.rug; ctx.fillRect(cx - W / 2, cy - H / 2, W, H);
      ctx.fillStyle = s.fab2; ctx.beginPath(); ctx.arc(cx - W * 0.12, cy + H * 0.05, H * 0.28, 0, U.TAU); ctx.fill();
      ctx.fillStyle = s.acc; ctx.beginPath(); ctx.arc(cx + W * 0.18, cy - H * 0.12, H * 0.16, 0, U.TAU); ctx.fill();
      ctx.fillStyle = s.leaf; ctx.fillRect(cx - W / 2, cy + H * 0.18, W, H * 0.4);
    } else if (w.id === 'specchio') {
      ctx.fillStyle = 'rgba(40,25,20,0.25)'; ctx.beginPath(); ctx.arc(cx + 4, cy + 6, W / 2, 0, U.TAU); ctx.fill();
      ctx.fillStyle = s.rattan || s.metal; ctx.beginPath(); ctx.arc(cx, cy, W / 2, 0, U.TAU); ctx.fill();
      const g = ctx.createLinearGradient(cx - W / 2, cy - H / 2, cx + W / 2, cy + H / 2);
      g.addColorStop(0, '#dfe9ee'); g.addColorStop(0.45, '#b9ccd6'); g.addColorStop(0.5, '#eef5f8'); g.addColorStop(1, '#9fb5c2');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, W / 2 - 7, 0, U.TAU); ctx.fill();
    } else if (w.id === 'mensola') {
      ctx.fillStyle = 'rgba(40,25,20,0.25)'; ctx.fillRect(cx - W / 2 + 3, cy + H / 2 - 4, W, 10);
      ctx.fillStyle = s.wood; ctx.fillRect(cx - W / 2, cy + H / 2 - 8, W, 8);
      // barattoli, libri, piantina
      const r = U.rng(3);
      let x = cx - W / 2 + 6;
      while (x < cx + W / 2 - 14) {
        const k = r.int(0, 2), bw = 10 + r.int(0, 8), bh = 14 + r.int(0, 18);
        if (k === 0) { ctx.fillStyle = r.pick([s.fab2, s.acc, s.wood2]); ctx.fillRect(x, cy + H / 2 - 8 - bh, bw * 0.6, bh); x += bw * 0.6 + 1; }
        else if (k === 1) { ctx.fillStyle = 'rgba(220,235,240,0.75)'; ctx.fillRect(x, cy + H / 2 - 8 - bh * 0.8, bw, bh * 0.8); ctx.fillStyle = s.acc; ctx.fillRect(x, cy + H / 2 - 8 - bh * 0.8, bw, 3); ctx.fillStyle = 'rgba(180,120,70,0.6)'; ctx.fillRect(x + 2, cy + H / 2 - 8 - bh * 0.45, bw - 4, bh * 0.45 - 2); x += bw + 4; }
        else { ctx.fillStyle = s.pot; ctx.fillRect(x, cy + H / 2 - 20, 12, 12); ctx.fillStyle = s.leaf; ctx.beginPath(); ctx.arc(x + 6, cy + H / 2 - 24, 8, 0, U.TAU); ctx.fill(); x += 16; }
      }
    } else if (w.id === 'tende' && win) {
      // tende ai lati della finestra, mosse da un filo d'aria
      const x0 = win.x0 - 24, x1 = win.x1 + 24, y0 = win.y0 - 18, y1 = win.y1 + 34;
      ctx.fillStyle = s.metal; ctx.fillRect(x0 - 8, y0 - 4, x1 - x0 + 16, 5);
      const drawSide = (xa, dir) => {
        const sway = Math.sin(time * 0.9 + dir) * 4;
        ctx.fillStyle = U.sh(s.fab, 0.1, 0.95);
        ctx.beginPath(); ctx.moveTo(xa, y0);
        ctx.lineTo(xa + dir * 34, y0);
        ctx.quadraticCurveTo(xa + dir * (20 + sway), (y0 + y1) / 2, xa + dir * (30 + sway), y1);
        ctx.lineTo(xa - dir * 2, y1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = U.sh(s.fab, -0.12, 0.6); ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(xa + dir * k * 8, y0); ctx.quadraticCurveTo(xa + dir * (k * 6 + sway * 0.5), (y0 + y1) / 2, xa + dir * (k * 7 + sway), y1); ctx.stroke(); }
      };
      drawSide(x0, 1); drawSide(x1, -1);
    }
    ctx.restore();
  };

  // anteprima di un mobile per il catalogo
  O.thumb = function (id, style, size) {
    const c = U.canvas(size, size), ctx = c.getContext('2d');
    const def = O.ITEMS[id];
    if (def.layer === 'wall') {
      const fake = { id, u: 1, v: 1, style };
      const sc = size / (def.window ? 2.6 : Math.max(def.ww, def.wh) * 1.5 * 64) ;
      ctx.translate(size / 2, size / 2);
      if (def.window) {
        ctx.scale(size / 220, size / 220);
        const win = { x0: -50, x1: 50, y0: -50, y1: 50 };
        ctx.fillStyle = '#cfe6f0'; ctx.fillRect(-50, -50, 100, 100);
        O.drawWallItem(ctx, { id, u: 0, v: 0, style }, 64, 0.5, win);
      } else {
        ctx.scale(sc, sc); ctx.translate(-64, -64);
        O.drawWallItem(ctx, fake, 64, 0, null);
      }
      return c;
    }
    const S0 = Iso.S;
    const fp = [def.w, def.d];
    const span = (fp[0] + fp[1]) * 1.0 + 1.6;
    Iso.S = size / span / 1.15;
    const cx = Iso.p(fp[0] / 2, fp[1] / 2, 0.6);
    ctx.translate(size / 2 - cx[0], size / 2 - cx[1] + size * 0.06);
    O.drawItem(ctx, { id, x: 0, y: 0, rot: 0, style, grow: 1 }, 0.5);
    Iso.S = S0;
    return c;
  };

  R.O = O;
})(window.R);

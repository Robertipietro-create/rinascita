/* =========================================================
   scene.js — disegna il diorama completo
   sfondo → basamento → pareti (con spessore) → pavimento →
   oggetti ordinati per profondità → particelle → LUCE
   La luce è un canvas a metà risoluzione: buio + "buchi" per
   finestra e lampade, poi bagliori additivi caldi.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, Iso = R.Iso;
  const Sc = {};

  Sc.lightCanvas = null;
  Sc.motes = [];

  // ---------------- ambiente (orario/atmosfera) ----------------
  // ogni "mood" definisce sfondo, buio e colore della notte
  Sc.MOODS = {
    ruin: { bg: ['#4a4152', '#2b2633'], dark: 0.78, tint: [18, 12, 28] },
    day: { bg: ['#f6e7d7', '#e9d3c2'], dark: 0, tint: [30, 20, 40] },
    sunset: { bg: ['#f2b9a0', '#9e7fa6'], dark: 0.25, tint: [70, 30, 60] },
    night: { bg: ['#29304f', '#161a30'], dark: 0.72, tint: [10, 14, 40] }
  };

  // ---------------- basamento e pareti ----------------
  const WT = 0.35; // spessore muri
  const SLAB = 0.6; // spessore del "taglio" del diorama

  Sc.drawShell = function (ctx, lv, pal) {
    const W = lv.room.W, D = lv.room.D, H = lv.room.H;
    // ombra morbida sotto il diorama
    ctx.save();
    const c = Iso.p(W / 2, D / 2, -SLAB);
    ctx.translate(c[0], c[1] + 30); ctx.scale(1, 0.5);
    const rr = (W + D) * Iso.S * 0.85;
    const g = ctx.createRadialGradient(0, 0, rr * 0.3, 0, 0, rr);
    g.addColorStop(0, 'rgba(40,20,40,0.25)'); g.addColorStop(1, 'rgba(40,20,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rr, 0, U.TAU); ctx.fill();
    ctx.restore();

    // basamento (terra/fondazione) visibile sul taglio
    const sl = U.hex(pal.slab);
    Iso.poly(ctx, [[-WT, D, 0], [W, D, 0], [W, D, -SLAB], [-WT, D, -SLAB]], U.rgb(sl));
    Iso.poly(ctx, [[W, -WT, 0], [W, D, 0], [W, D, -SLAB], [W, -WT, -SLAB]], U.rgb(U.shade(sl, -0.15)));
    // strati di terra sul taglio
    ctx.strokeStyle = U.rgb(U.shade(sl, -0.12), 0.6); ctx.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      const z = -SLAB * k / 3;
      Iso.path(ctx, [[-WT, D, z], [W, D, z], [W, -WT, z]], true); ctx.stroke();
    }
    // bordo del pavimento (listello chiaro sul taglio)
    Iso.poly(ctx, [[-WT, D, 0], [W, D, 0], [W, D, -0.08], [-WT, D, -0.08]], U.rgb(U.shade(sl, 0.25)));
    Iso.poly(ctx, [[W, -WT, 0], [W, D, 0], [W, D, -0.08], [W, -WT, -0.08]], U.rgb(U.shade(sl, 0.12)));
  };

  // spessori e cimase delle pareti (disegnati dopo le superfici)
  Sc.drawWallCaps = function (ctx, lv, pal) {
    const W = lv.room.W, D = lv.room.D, H = lv.room.H;
    const cap = U.hex(pal.cap);
    // testa del muro di fondo
    Iso.poly(ctx, [[-WT, -WT, H], [W, -WT, H], [W, 0, H], [0, 0, H], [0, D, H], [-WT, D, H]], U.rgb(cap));
    // testate frontali (spessore visibile)
    Iso.poly(ctx, [[W, -WT, -SLAB], [W, 0, -SLAB], [W, 0, H], [W, -WT, H]], U.rgb(U.shade(cap, -0.2)));
    Iso.poly(ctx, [[-WT, D, -SLAB], [0, D, -SLAB], [0, D, H], [-WT, D, H]], U.rgb(U.shade(cap, -0.08)));
    // filo di luce
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    Iso.path(ctx, [[-WT, D, H], [0, D, H], [0, 0, H], [W, 0, H], [W, -WT, H]], true); ctx.stroke();
  };

  // battiscopa (dopo la costruzione)
  Sc.drawSkirting = function (ctx, lv, col) {
    const W = lv.room.W, D = lv.room.D, h = 0.18, t = 0.06;
    Iso.box(ctx, 0, 0, 0, W, t, h, col, { edge: false });
    Iso.box(ctx, 0, 0, 0, t, D, h, col, { edge: false });
  };

  // ---------------- finestra e porta (nello spazio texture della parete) ----------------
  // win = { x0, y0, x1, y1 } in px texture; state = { panes: [bool...], view canvas, dirt }
  Sc.drawWindow = function (ctx, win, st, time) {
    const { x0, y0, x1, y1 } = win;
    const w = x1 - x0, h = y1 - y0;
    // vano: ombra interna
    ctx.fillStyle = '#5a4a44'; ctx.fillRect(x0 - 10, y0 - 10, w + 20, h + 20);
    // vista
    if (st.view) ctx.drawImage(st.view, x0, y0, w, h);
    // un gatto nero che ogni tanto sbircia dal davanzale esterno
    if (st.cat > 0.01) {
      const cx = x0 + w * 0.78, cy = y1 - 2 + (1 - st.cat) * 22;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      ctx.fillStyle = '#231e26';
      ctx.beginPath(); ctx.ellipse(cx, cy, 13, 11, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 12, cy - 4); ctx.lineTo(cx - 9, cy - 16); ctx.lineTo(cx - 3, cy - 9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 12, cy - 4); ctx.lineTo(cx + 9, cy - 16); ctx.lineTo(cx + 3, cy - 9); ctx.fill();
      ctx.fillStyle = '#e8d36a';
      const blink = (time % 4) < 0.15 ? 0.3 : 1;
      ctx.beginPath(); ctx.ellipse(cx - 5, cy - 4, 2.2, 2.4 * blink, 0, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 5, cy - 4, 2.2, 2.4 * blink, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    // vetri (2×2)
    const pw = w / 2, ph = h / 2;
    for (let i = 0; i < 4; i++) {
      const px = x0 + (i % 2) * pw, py = y0 + (i >> 1) * ph;
      const pane = st.panes ? st.panes[i] : 1;
      if (pane === 0) {
        // vetro rotto: schegge triangolari rimaste nel telaio
        ctx.fillStyle = 'rgba(200,225,235,0.35)';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + pw * 0.45, py); ctx.lineTo(px, py + ph * 0.6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + pw, py + ph); ctx.lineTo(px + pw * 0.6, py + ph); ctx.lineTo(px + pw, py + ph * 0.35); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px + pw * 0.45, py); ctx.lineTo(px, py + ph * 0.6); ctx.stroke();
      } else {
        const a = typeof pane === 'number' ? pane : 1; // animazione di inserimento
        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
        const off = (1 - a) * -ph;
        ctx.fillStyle = 'rgba(210,235,245,0.18)'; ctx.fillRect(px, py + off, pw, ph);
        // riflesso diagonale
        const g = ctx.createLinearGradient(px, py + off, px + pw, py + ph + off);
        g.addColorStop(0.2, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
        g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.15)'); g.addColorStop(0.65, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(px, py + off, pw, ph);
        ctx.restore();
      }
    }
    // imposte di legno chiuse: lasciano passare solo fili di luce
    if (st.shutters > 0.01) {
      const k = st.shutters;
      [[x0, 1], [x1, -1]].forEach(([edge, dir]) => {
        const sw = pw * k;
        const xa = dir > 0 ? edge : edge - sw;
        ctx.fillStyle = '#6f5440'; ctx.fillRect(xa, y0, sw, h);
        ctx.fillStyle = 'rgba(255,235,190,0.55)';
        for (let yy = y0 + 9; yy < y1 - 4; yy += 11) ctx.fillRect(xa + 3, yy, Math.max(0, sw - 6), 1.4); // fessure tra le stecche
        ctx.fillStyle = 'rgba(40,25,15,0.35)';
        for (let yy = y0 + 4; yy < y1 - 4; yy += 11) ctx.fillRect(xa + 3, yy, Math.max(0, sw - 6), 4);
      });
    }
    // telaio
    const fc = st.frame || '#efe7da';
    ctx.fillStyle = fc;
    ctx.fillRect(x0 - 8, y0 - 8, w + 16, 8); ctx.fillRect(x0 - 8, y1, w + 16, 8);
    ctx.fillRect(x0 - 8, y0, 8, h); ctx.fillRect(x1, y0, 8, h);
    ctx.fillRect(x0 + pw - 3, y0, 6, h); ctx.fillRect(x0, y0 + ph - 3, w, 6);
    // davanzale
    ctx.fillStyle = U.sh(fc, -0.08); ctx.fillRect(x0 - 16, y1 + 8, w + 32, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x0 - 16, y1 + 17, w + 32, 5);
  };

  Sc.drawDoor = function (ctx, door, st) {
    const { x0, y0, x1, y1 } = door;
    const w = x1 - x0, h = y1 - y0;
    ctx.fillStyle = st.frame || '#d9cbb4';
    ctx.fillRect(x0 - 9, y0 - 9, w + 18, h + 9);
    // anta
    const c = U.hex(st.color || '#8a6a52');
    ctx.fillStyle = U.rgb(c); ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = U.rgb(U.shade(c, -0.25)); ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 12, y0 + 12, w - 24, h * 0.4);
    ctx.strokeRect(x0 + 12, y0 + h * 0.48, w - 24, h * 0.45);
    ctx.fillStyle = '#d8b56a'; ctx.beginPath(); ctx.arc(x0 + 12, y0 + h * 0.52, 4, 0, U.TAU); ctx.fill();
    if (st.open) { // porta aperta (arrivo abitanti): luce calda dal corridoio
      ctx.fillStyle = `rgba(255,214,150,${st.open})`; ctx.fillRect(x0, y0, w, h);
    }
  };

  // ---------------- cassone dello sgombero ----------------
  Sc.drawSkip = function (ctx, sk, time) {
    if (!sk || sk.gone) return;
    const x = sk.x + sk.ox, y = sk.y, w = sk.w, d = sk.d, h = sk.h, z = sk.z || 0;
    const col = U.hex('#e0a54b');
    Iso.shadow(ctx, x + w / 2, y + d / 2, 0, w * 0.6, d * 0.6, 0.3);
    // pareti interne (dietro)
    Iso.poly(ctx, [[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]], U.rgb(U.shade(col, -0.35)));
    Iso.poly(ctx, [[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]], U.rgb(U.shade(col, -0.25)));
    Iso.poly(ctx, [[x, y, z + 0.05], [x + w, y, z + 0.05], [x + w, y + d, z + 0.05], [x, y + d, z + 0.05]], U.rgb(U.shade(col, -0.45)));
    // contenuto (impilato)
    const inner = sk.contents.slice().sort((a, b) => (a.x + a.y + a.z * 2) - (b.x + b.y + b.z * 2));
    for (const o of inner) R.O.drawDebris(ctx, o);
    // pareti frontali
    Iso.poly(ctx, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], U.rgb(col));
    Iso.poly(ctx, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], U.rgb(U.shade(col, -0.15)));
    // nervature
    ctx.strokeStyle = U.rgb(U.shade(col, -0.25), 0.7); ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { Iso.path(ctx, [[x + w * i / 4, y + d, z + 0.1], [x + w * i / 4, y + d, z + h - 0.1]]); ctx.stroke(); }
    for (let i = 1; i < 3; i++) { Iso.path(ctx, [[x + w, y + d * i / 3, z + 0.1], [x + w, y + d * i / 3, z + h - 0.1]]); ctx.stroke(); }
    // bordo superiore
    ctx.strokeStyle = U.rgb(U.shade(col, 0.3)); ctx.lineWidth = 2;
    Iso.path(ctx, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]); ctx.stroke();
    // evidenziazione quando ci si trascina sopra un detrito
    if (sk.hot > 0) {
      ctx.globalAlpha = sk.hot * (0.5 + Math.sin(time * 10) * 0.2);
      Iso.poly(ctx, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], 'rgba(255,240,180,0.6)', 'rgba(255,255,255,0.9)', 2);
      ctx.globalAlpha = 1;
    }
    // barra di riempimento sul fianco
    const f = U.clamp(sk.fill / sk.cap, 0, 1);
    Iso.poly(ctx, [[x + w + 0.01, y + 0.3, z + 0.2], [x + w + 0.01, y + 0.3 + (d - 0.6) * f, z + 0.2], [x + w + 0.01, y + 0.3 + (d - 0.6) * f, z + 0.35], [x + w + 0.01, y + 0.3, z + 0.35]], 'rgba(255,255,255,0.75)');
  };

  // mucchio di fango (fase pulizia, pala)
  Sc.drawHeap = function (ctx, hp) {
    if (!hp || hp.size <= 0.01) return;
    const s = Math.sqrt(hp.size) * (hp.pop || 1);
    Iso.shadow(ctx, hp.x, hp.y, 0, 0.6 * s, 0.6 * s, 0.3);
    const r = U.rng(4);
    const n = Math.min(14, 3 + Math.floor(hp.size * 6));
    for (let i = 0; i < n; i++) {
      const a = r.range(0, U.TAU), d = r.range(0, 0.35) * s;
      const z = (1 - d / (0.4 * s + 0.01)) * 0.25 * s;
      Iso.ball(ctx, hp.x + Math.cos(a) * d, hp.y + Math.sin(a) * d, z, r.range(0.15, 0.26) * s, r.pick(['#6b4e32', '#5c432b', '#7a5a3a']), 0.2);
    }
  };

  // ---------------- polvere sospesa ----------------
  Sc.updateMotes = function (dt, lv, amount) {
    const W = lv.room.W, D = lv.room.D, H = lv.room.H;
    const target = Math.round(70 * amount);
    while (Sc.motes.length < target) Sc.motes.push({ x: U.rand(0, W), y: U.rand(0, D), z: U.rand(0.2, H), ph: U.rand(0, 6), s: U.rand(0.6, 1.8) });
    if (Sc.motes.length > target) Sc.motes.length = target;
    for (const m of Sc.motes) {
      m.ph += dt * 0.5;
      m.x += Math.sin(m.ph) * dt * 0.08; m.y += Math.cos(m.ph * 0.7) * dt * 0.08; m.z += Math.sin(m.ph * 1.3) * dt * 0.05;
      if (m.z < 0.1) m.z = H;
    }
  };
  Sc.drawMotes = function (ctx, lit) {
    ctx.fillStyle = lit ? 'rgba(255,240,200,0.75)' : 'rgba(230,220,200,0.35)';
    for (const m of Sc.motes) {
      const q = Iso.p(m.x, m.y, m.z);
      ctx.globalAlpha = 0.35 + Math.sin(m.ph * 3) * 0.3;
      ctx.beginPath(); ctx.arc(q[0], q[1], m.s, 0, U.TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ---------------- luce ----------------
  // geometria del fascio di luce dalla finestra (inviluppo convesso)
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }
  Sc.beamGeometry = function (lv) {
    const wn = lv.windowWorld; // {x0,x1,z0,z1} sulla parete di fondo (y=0)
    if (!wn) return null;
    const dir = [0.35, 1, -0.75];
    const toFloor = (x, z) => { const t = z / -dir[2]; return [x + dir[0] * t, dir[1] * t, 0]; };
    const corners = [[wn.x0, 0, wn.z0], [wn.x1, 0, wn.z0], [wn.x1, 0, wn.z1], [wn.x0, 0, wn.z1]];
    const floor = corners.map(c => toFloor(c[0], c[2]));
    const all = corners.concat(floor).map(c => Iso.p(c[0], c[1], c[2]));
    return { hull: hull(all), floor: floor.map(c => Iso.p(c[0], c[1], 0)), top: Iso.p((wn.x0 + wn.x1) / 2, 0, wn.z1), bottom: Iso.p((floor[0][0] + floor[2][0]) / 2, (floor[0][1] + floor[2][1]) / 2, 0) };
  };

  // L = { dark, tint, beam (0..1), lights: [{x,y,z,r,col,i}] }
  Sc.drawLight = function (ctx, camM, lv, L, w, h, dpr) {
    const beam = Sc.beamGeometry(lv);
    const zoom = camM[0];
    // 1) fascio additivo dorato (visibile anche di giorno)
    if (beam && L.beam > 0) {
      ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(beam.top[0], beam.top[1], beam.bottom[0], beam.bottom[1]);
      const bc = L.beamCol || [255, 225, 160];
      g.addColorStop(0, U.rgb(bc, 0.22 * L.beam)); g.addColorStop(1, U.rgb(bc, 0.04 * L.beam));
      ctx.fillStyle = g;
      ctx.beginPath(); beam.hull.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.rgb(bc, 0.16 * L.beam);
      ctx.beginPath(); beam.floor.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (L.dark <= 0.01) return;
    // 2) buio con "buchi" di luce, a piena risoluzione
    const lw = Math.ceil(w * dpr), lh = Math.ceil(h * dpr);
    if (!Sc.lightCanvas || Sc.lightCanvas.width !== lw || Sc.lightCanvas.height !== lh) Sc.lightCanvas = U.canvas(lw, lh);
    const lc = Sc.lightCanvas, l = lc.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, lw, lh);
    l.fillStyle = U.rgb(L.tint, L.dark);
    l.fillRect(0, 0, lw, lh);
    const k = 1; // il canvas della luce ha gli stessi pixel dello schermo
    l.setTransform(camM[0] * k, camM[1] * k, camM[2] * k, camM[3] * k, camM[4] * k, camM[5] * k);
    l.globalCompositeOperation = 'destination-out';
    if (beam && L.beam > 0) {
      const g = l.createLinearGradient(beam.top[0], beam.top[1], beam.bottom[0], beam.bottom[1]);
      g.addColorStop(0, `rgba(0,0,0,${0.85 * L.beam})`); g.addColorStop(1, `rgba(0,0,0,${0.45 * L.beam})`);
      l.fillStyle = g;
      l.beginPath(); beam.hull.forEach((p, i) => i ? l.lineTo(p[0], p[1]) : l.moveTo(p[0], p[1])); l.closePath(); l.fill();
    }
    for (const li of L.lights) {
      if (li.i <= 0) continue;
      const q = Iso.p(li.x, li.y, li.z);
      const rr = li.r * Iso.S;
      const fl = li.flicker ? 1 + Math.sin(R.E.time * 13 + li.x) * 0.04 + Math.sin(R.E.time * 7.3) * 0.03 : 1;
      const g = l.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr * fl);
      g.addColorStop(0, `rgba(0,0,0,${li.i})`); g.addColorStop(0.5, `rgba(0,0,0,${li.i * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.beginPath(); l.arc(q[0], q[1], rr * fl, 0, U.TAU); l.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lc, 0, 0);
    // 3) bagliore caldo additivo delle lampade
    ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
    ctx.globalCompositeOperation = 'lighter';
    for (const li of L.lights) {
      if (li.i <= 0) continue;
      const q = Iso.p(li.x, li.y, li.z);
      const rr = li.r * Iso.S * 0.8;
      const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr);
      g.addColorStop(0, U.rgb(li.col, 0.35 * li.i)); g.addColorStop(0.3, U.rgb(li.col, 0.12 * li.i)); g.addColorStop(1, U.rgb(li.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, U.TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    void zoom;
  };

  // sfondo a gradiente con vignetta
  Sc.drawBackground = function (ctx, w, h, bg) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,10,30,0.25)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  };

  R.Scene = Sc;
})(window.R);

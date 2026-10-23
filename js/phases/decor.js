/* =========================================================
   Fase 5 — ARREDO
   Catalogo per stile (Nordico, Boho, Mediterraneo) in un
   cassetto in basso. Tocca un mobile: cade nella stanza con un
   rimbalzo. Trascinalo: si aggancia alla griglia (0,5 unità),
   l'impronta è verde se c'è posto, rossa se no. Ruota ⟳, togli ✕.
   Oggetti da parete scorrono sulle pareti; il gatto si accoccola
   sopra divani, poltrone, pouf e tappeti.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, P = R.P, A = R.Audio, O = R.O;

  const Ph = { subtitle: 'Rendila casa' };
  const St = R.Story;
  let style = 'nordico', sel = null, drag = null, thumbs = {}, cat = 'tutti';
  const SNAP = 0.5;

  Ph.enter = function (G) {
    sel = null; drag = null;
    G.env.motes = 0;
    UI.showProgress(true);
    UI.setProgress(progress(G), true);
    openCatalog(G);
    E.after(3.0, () => St.nextThought(G.lv, 'decor'));
    E.after(9.0, () => St.nextThought(G.lv, 'decor'));
  };

  function sheetH() { return Math.min(E.h * 0.36, 250); }

  function openCatalog(G) {
    const lv = G.lv;
    let html = '<div class="tabs">';
    for (const k in O.STYLES) html += `<button class="tab ${k === style ? 'on' : ''}" data-s="${k}">${O.STYLES[k].name}</button>`;
    html += '</div><div class="grid compact">';
    lv.decor.catalog.forEach(id => {
      html += `<button class="choice" data-id="${id}"><canvas width="136" height="136"></canvas>${O.ITEMS[id].name}</button>`;
    });
    html += '</div>';
    UI.openSheet(html, el => {
      el.style.maxHeight = sheetH() + 'px';
      el.querySelectorAll('.tab').forEach(t => t.onclick = () => {
        A.play('click'); style = t.dataset.s;
        el.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
        drawThumbs(el);
        if (sel) { sel.style = style; A.play('soft'); restyleFx(sel, G); }
      });
      el.querySelectorAll('.choice').forEach(b => b.onclick = () => { A.play('click'); addItem(b.dataset.id, G); });
      drawThumbs(el);
    });
    G.fitCamera(false, true, sheetH() + 10);
  }
  function drawThumbs(el) {
    el.querySelectorAll('.choice').forEach(b => {
      const id = b.dataset.id, k = id + style;
      if (!thumbs[k]) thumbs[k] = O.thumb(id, style, 136);
      const cv = b.querySelector('canvas'), c = cv.getContext('2d');
      c.clearRect(0, 0, 136, 136); c.drawImage(thumbs[k], 0, 0);
    });
  }

  // ---------- regole di posizionamento ----------
  function fp(it) { return O.footprint(O.ITEMS[it.id], it.rot); }
  function overlaps(a, b) {
    const fa = fp(a), fb = fp(b);
    return a.x < b.x + fb[0] - 0.01 && b.x < a.x + fa[0] - 0.01 && a.y < b.y + fb[1] - 0.01 && b.y < a.y + fa[1] - 0.01;
  }
  function valid(it, room) {
    const def = O.ITEMS[it.id];
    if (def.layer === 'wall') return validWall(it, room);
    const f = fp(it);
    if (it.x < 0 || it.y < 0 || it.x + f[0] > room.W + 0.001 || it.y + f[1] > room.D + 0.001) return false;
    if (def.layer === 'pet') return true;
    for (const o of room.items) {
      if (o === it) continue;
      const od = O.ITEMS[o.id];
      if (od.layer !== def.layer || od.layer === 'wall') continue;
      if (overlaps(it, o)) return false;
    }
    return true;
  }
  function wallRect(it) { const d = O.ITEMS[it.id]; return [it.u - d.ww / 2, it.v - d.wh / 2, it.u + d.ww / 2, it.v + d.wh / 2]; }
  function validWall(it, room) {
    const def = O.ITEMS[it.id];
    if (def.window) return true;
    const s = room.byId[it.wall], r = wallRect(it);
    if (r[0] < 0.1 || r[1] < 0.2 || r[2] > s.wu - 0.1 || r[3] > s.hu - 0.4) return false;
    const hit = (a) => r[0] < a[2] && a[0] < r[2] && r[1] < a[3] && a[1] < r[3];
    if (it.wall === 'wallBack' && room.win) { const w = room.win, k = 1 / room.ppu; if (hit([w.x0 * k - 0.3, w.y0 * k - 0.3, w.x1 * k + 0.3, w.y1 * k + 0.5])) return false; }
    if (it.wall === 'wallLeft' && room.door) { const d = room.door, k = 1 / room.ppu; if (hit([d.x0 * k - 0.2, d.y0 * k - 0.2, d.x1 * k + 0.2, d.y1 * k])) return false; }
    for (const o of room.wallItems) if (o !== it && o.wall === it.wall && !O.ITEMS[o.id].window && hit(wallRect(o))) return false;
    return true;
  }

  // il gatto si accoccola sulla cosa più alta sotto di lui
  function catZ(it, room) {
    let z = 0;
    for (const o of room.items) {
      if (o === it) continue;
      const d = O.ITEMS[o.id];
      if (d.layer === 'wall' || d.layer === 'pet') continue;
      const f = fp(o), cx = it.x + 0.4, cy = it.y + 0.4;
      if (cx > o.x && cx < o.x + f[0] && cy > o.y && cy < o.y + f[1]) z = Math.max(z, d.layer === 'rug' ? 0.04 : (d.seat || 0));
    }
    return z;
  }

  // ---------- aggiunta ----------
  function addItem(id, G) {
    const room = G.room, def = O.ITEMS[id];
    if (def.window) {
      if (room.wallItems.some(w => w.id === 'tende')) { UI.toast('Le tende ci sono già'); return; }
      const it = { id, wall: 'wallBack', u: 0, v: 0, style };
      room.wallItems.push(it); room.items.push(it);
      A.play('unroll'); sparkleWin(room);
      afterChange(G); return;
    }
    if (id === 'gatto' && room.items.some(i => i.id === 'gatto')) { UI.toast('Un gatto basta e avanza 🐈'); return; }
    if (def.layer === 'wall') {
      const it = { id, wall: 'wallBack', u: 1.2, v: def.defV, style };
      if (!placeWall(it, room)) { UI.toast('Non c\'è più spazio sulle pareti'); return; }
      room.wallItems.push(it); room.items.push(it);
      A.play('hammer'); E.after(0.15, () => A.play('hammer'));
      select(it, G); afterChange(G); return;
    }
    const it = { id, x: 0, y: 0, rot: 0, style, grow: def.grows ? 0 : 1, z: 0, drop: 1 };
    if (!findSpot(it, room)) { UI.toast('Non c\'è più posto: prova a togliere qualcosa'); return; }
    room.items.push(it);
    // cade dall'alto con un rimbalzo
    E.tween(it, { drop: 0 }, 0.6, U.ease.outBounce);
    E.after(0.25, () => { A.play('thud', 0.8); const q = Iso.p(it.x + fp(it)[0] / 2, it.y + fp(it)[1] / 2, 0); P.dustPuff(q[0], q[1], 5, 'rgba(240,230,215,0.5)'); });
    if (def.grows) E.after(0.5, () => { A.play('grow'); E.tween(it, { grow: 1 }, 1.3, U.ease.outElastic); });
    if (id === 'gatto') E.after(0.7, () => A.play('purr'));
    if (def.light) E.after(0.65, () => A.play('switch'));
    select(it, G);
    afterChange(G);
  }
  // cerca il posto libero più vicino al centro (spirale sulla griglia)
  function findSpot(it, room) {
    const def = O.ITEMS[it.id];
    const againstWall = def.wallSide || it.id === 'divano';
    const f = fp(it), cx = room.W / 2 - f[0] / 2, cy = room.D / 2 - f[1] / 2;
    const cand = [];
    for (let y = 0; y + f[1] <= room.D + 0.001; y += SNAP) for (let x = 0; x + f[0] <= room.W + 0.001; x += SNAP) {
      // libreria, credenza, camino e divano preferiscono stare contro la parete di fondo
      const d = againstWall ? y * 3 + Math.abs(x - cx) : U.dist(x, y, cx, cy) + U.rand(0, 1.2);
      cand.push([x, y, d]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    for (const c of cand) { it.x = c[0]; it.y = c[1]; if (valid(it, room)) { if (it.id === 'gatto') it.baseZ = catZ(it, room); return true; } }
    return false;
  }
  function placeWall(it, room) {
    for (const wall of ['wallBack', 'wallLeft']) {
      const s = room.byId[wall];
      for (let u = 0.9; u < s.wu - 0.5; u += 0.25) { it.wall = wall; it.u = u; if (validWall(it, room)) return true; }
    }
    return false;
  }
  function sparkleWin(room) {
    if (!room.win) return;
    const w = room.win, q = room.wallBack.toView((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2);
    P.sparkle(q[0], q[1], 10, 40);
  }
  function restyleFx(it, G) {
    const q = itemScreenAnchor(it, G.room, true);
    if (q) P.sparkle(q.vx, q.vy, 8, 20);
  }

  // ---------- selezione ----------
  function select(it, G) {
    sel = it;
    updateFloat(G);
  }
  function itemScreenAnchor(it, room, viewOnly) {
    const def = O.ITEMS[it.id];
    let v;
    if (def.layer === 'wall') {
      if (def.window) return null;
      const s = room.byId[it.wall];
      v = s.toView(it.u * room.ppu, (it.v - def.wh / 2) * room.ppu);
    } else {
      const f = fp(it);
      v = Iso.p(it.x + f[0] / 2, it.y + f[1] / 2, def.layer === 'rug' ? 0.2 : 1.6);
    }
    if (viewOnly) return { vx: v[0], vy: v[1] };
    const sp = E.viewToScreen(v[0], v[1]);
    return { x: sp[0], y: sp[1] - 8 };
  }
  function updateFloat(G) {
    if (!sel || drag) { UI.floatAt(null); return; }
    const a = itemScreenAnchor(sel, G.room);
    if (!a) { UI.floatAt(null); return; }
    UI.floatAt(a.x, a.y, () => rotate(G), () => remove(G));
    const isWall = O.ITEMS[sel.id].layer === 'wall';
    document.getElementById('btn-rotate').style.display = isWall || sel.id === 'gatto' ? 'none' : '';
  }
  function rotate(G) {
    const it = sel, room = G.room;
    if (!it) return;
    const old = { rot: it.rot, x: it.x, y: it.y };
    it.rot = (it.rot + 1) % 4;
    // mantiene il centro e, se serve, si sposta di poco per trovare posto
    const f0 = O.footprint(O.ITEMS[it.id], old.rot), f1 = fp(it);
    it.x = snap(old.x + f0[0] / 2 - f1[0] / 2); it.y = snap(old.y + f0[1] / 2 - f1[1] / 2);
    if (!valid(it, room) && !nudge(it, room)) { Object.assign(it, old); UI.toast('Non gira: manca spazio'); A.play('soft'); return; }
    A.play('toc', 1.2);
    afterChange(G);
  }
  function nudge(it, room) {
    const ox = it.x, oy = it.y;
    for (let r = SNAP; r <= 2; r += SNAP) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
      it.x = ox + dx; it.y = oy + dy;
      if (valid(it, room)) return true;
    }
    it.x = ox; it.y = oy;
    return false;
  }
  function remove(G) {
    const it = sel, room = G.room;
    if (!it) return;
    const a = itemScreenAnchor(it, room, true);
    room.items.splice(room.items.indexOf(it), 1);
    const wi = room.wallItems.indexOf(it); if (wi >= 0) room.wallItems.splice(wi, 1);
    if (a) P.dustPuff(a.vx, a.vy + 20, 10, 'rgba(240,230,215,0.6)');
    A.play('whoosh');
    sel = null; updateFloat(G); afterChange(G);
  }
  const snap = v => Math.round(v / SNAP) * SNAP;

  // ---------- hit test ----------
  function hitItem(vx, vy, room) {
    // prima gli oggetti da parete e quelli davanti
    for (let i = room.wallItems.length - 1; i >= 0; i--) {
      const w = room.wallItems[i], def = O.ITEMS[w.id];
      if (def.window) continue;
      const s = room.byId[w.wall], uv = s.toUV(vx, vy), r = wallRect(w), k = room.ppu;
      if (uv[0] >= r[0] * k && uv[0] <= r[2] * k && uv[1] >= r[1] * k && uv[1] <= r[3] * k) return w;
    }
    const list = room.items.filter(it => O.ITEMS[it.id].layer !== 'wall').sort((a, b) => {
      const la = O.ITEMS[a.id].layer === 'rug' ? -100 : 0, lb = O.ITEMS[b.id].layer === 'rug' ? -100 : 0;
      return (lb + b.x + b.y) - (la + a.x + a.y);
    });
    for (const it of list) {
      const f = fp(it), def = O.ITEMS[it.id];
      const h = def.layer === 'rug' ? 0.05 : def.layer === 'pet' ? 0.6 : 1.2;
      const z = it.baseZ || 0;
      const pts = [[it.x, it.y, z], [it.x + f[0], it.y, z], [it.x + f[0], it.y + f[1], z], [it.x, it.y + f[1], z],
        [it.x, it.y, z + h], [it.x + f[0], it.y, z + h], [it.x + f[0], it.y + f[1], z + h], [it.x, it.y + f[1], z + h]].map(p => Iso.p(p[0], p[1], p[2]));
      // inviluppo grossolano: rettangolo dei punti proiettati ristretto un po'
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (Math.abs(vx - cx) < (x1 - x0) * 0.42 && Math.abs(vy - cy) < (y1 - y0) * 0.45) return it;
    }
    return null;
  }

  // ---------- input ----------
  Ph.down = function (e) {
    const G = R.G, room = G.room;
    const it = hitItem(e.vx, e.vy, room);
    if (!it) { sel = null; updateFloat(G); return; }
    select(it, G);
    const def = O.ITEMS[it.id];
    if (def.window) return;
    if (def.layer === 'wall') drag = { it, wall: true, start: { wall: it.wall, u: it.u, v: it.v } };
    else {
      const fl = Iso.unproject(e.vx, e.vy, 0);
      drag = { it, ox: it.x - fl[0], oy: it.y - fl[1], start: { x: it.x, y: it.y } };
      it.lift = 0.25;
    }
    if (it.id === 'gatto') A.play('purr');
    A.play('soft');
    updateFloat(G);
  };
  Ph.move = function (e, pressed) {
    const G = R.G, room = G.room;
    if (!pressed || !drag) return;
    const it = drag.it;
    if (drag.wall) {
      const hit = room.surfaceAt(e.vx, e.vy);
      if (hit && hit.s.kind !== 'floor') {
        it.wall = hit.s.id;
        it.u = Math.round(hit.u / room.ppu * 4) / 4; it.v = Math.round(hit.v / room.ppu * 4) / 4;
      }
      it.bad = !validWall(it, room);
    } else {
      const fl = Iso.unproject(e.vx, e.vy, 0);
      const nx = snap(fl[0] + drag.ox), ny = snap(fl[1] + drag.oy);
      if (nx !== it.x || ny !== it.y) { it.x = nx; it.y = ny; A.play('toc', 1.6); }
      it.bad = !valid(it, room);
      if (it.id === 'gatto') it.baseZ = catZ(it, room);
    }
  };
  Ph.up = function () {
    const G = R.G;
    if (!drag) return;
    const it = drag.it;
    if (it.bad) { Object.assign(it, drag.start); it.bad = false; UI.toast('Lì non ci sta: torna al suo posto'); A.play('soft'); }
    else { A.play('thud', 0.6); U.vibrate(8); }
    if (it.id === 'gatto') it.baseZ = catZ(it, G.room);
    it.lift = 0;
    drag = null;
    updateFloat(G);
    afterChange(G);
  };
  Ph.cancel = Ph.up;

  // ---------- punteggio di completezza ----------
  function progress(G) {
    const items = G.room.items;
    const cats = new Set(items.map(i => O.ITEMS[i.id].cat));
    return U.clamp(items.length / 10 * 0.6 + cats.size / 6 * 0.4, 0, 1);
  }
  function afterChange(G) {
    UI.setProgress(progress(G));
    if (G.room.items.length >= G.lv.decor.minItems && !Ph.ready) {
      Ph.ready = true;
      UI.next('Fatto: mostramela!', () => G.next(), 'top');
    }
  }

  Ph.update = function (dt, G) {
    const room = G.room;
    for (const it of room.items) {
      const def = O.ITEMS[it.id];
      if (def.layer === 'wall') continue;
      it.z = (it.baseZ || 0) + (it.drop || 0) * 3 + (it.lift || 0);
    }
    if (sel) updateFloat(G);
  };

  // impronta verde/rossa sotto l'oggetto selezionato
  Ph.drawWorld = function () {};
  Ph.underObjects = function (ctx, G) {
    if (!sel) return;
    const room = G.room, def = O.ITEMS[sel.id];
    const bad = sel.bad;
    const col = bad ? 'rgba(230,90,80,' : 'rgba(140,210,150,';
    const a = 0.35 + Math.sin(E.time * 6) * 0.12;
    if (def.layer === 'wall') {
      if (def.window) return;
      const s = room.byId[sel.wall], r = wallRect(sel), k = room.ppu;
      const o = [s.toView(r[0] * k, r[1] * k), s.toView(r[2] * k, r[1] * k), s.toView(r[2] * k, r[3] * k), s.toView(r[0] * k, r[3] * k)];
      ctx.strokeStyle = col + '0.9)'; ctx.lineWidth = 2; ctx.fillStyle = col + a * 0.5 + ')';
      ctx.beginPath(); o.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
      return;
    }
    const f = fp(sel);
    Iso.poly(ctx, [[sel.x, sel.y, 0.01], [sel.x + f[0], sel.y, 0.01], [sel.x + f[0], sel.y + f[1], 0.01], [sel.x, sel.y + f[1], 0.01]], col + a + ')', col + '0.95)', 2);
  };

  Ph.exit = function (G) { sel = null; drag = null; UI.floatAt(null); UI.closeSheet(); Ph.ready = false; G.fitCamera(false, true); };

  // salto (debug): un salotto già arredato
  Ph.skip = function (G) {
    const room = G.room;
    const add = (id, x, y, rot, st) => room.items.push({ id, x, y, rot: rot || 0, style: st || 'nordico', grow: 1, z: 0 });
    add('tappeto', 2, 2.5, 0); add('divano', 2.5, 0.5, 0); add('tavolino', 3.5, 3.0, 0); add('poltrona', 6, 3, 1);
    add('lampada', 1.0, 0.5, 0); add('pianta', 0.5, 5.5, 0); add('monstera', 6.5, 0.5, 0); add('libreria', 0, 2.5, 3);
    const cat = { id: 'gatto', x: 3.0, y: 1.0, rot: 0, style: 'nordico', z: 0, baseZ: 0.55 }; room.items.push(cat);
    const w1 = { id: 'quadro', wall: 'wallBack', u: 1.6, v: 1.5, style: 'nordico' }, w2 = { id: 'tende', wall: 'wallBack', u: 0, v: 0, style: 'nordico' };
    room.wallItems.push(w1, w2); room.items.push(w1, w2);
    for (const it of room.items) if (O.ITEMS[it.id].layer !== 'wall') it.z = it.baseZ || 0;
  };

  R.Phases.decor = Ph;
})(window.R);

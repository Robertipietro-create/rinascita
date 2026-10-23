/* =========================================================
   Fase 1 — SGOMBERO
   Trascina i detriti nel cassone. Fisica semplice: gli oggetti
   lasciati cadere rimbalzano; quelli nel cassone volano in arco
   e si impilano. A cassone pieno arriva il camion.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, P = R.P, O = R.O, A = R.Audio;

  const Ph = { subtitle: 'Fare spazio' };
  const St = R.Story;
  let grab = null, hover = null, flying = [], finished = false, tutorial = true, tutT = 0;

  Ph.enter = function (G) {
    grab = null; hover = null; flying = []; finished = false; tutorial = true; tutT = 0;
    G.setMood('ruin', 1.5, { dark: 0.3 });
    G.env.motes = 0.7;
    G.fitCamera(true, true);
    UI.showProgress(true);
    UI.setProgress(0, true);
    E.after(3.0, () => St.nextThought(G.lv, 'clearing'));
  };

  // oggetto sotto il dito (il più "davanti")
  function pick(vx, vy, room) {
    let best = null, bk = -1e9;
    for (const d of room.debris) {
      const def = O.DEBRIS[d.kind];
      const q = Iso.p(d.x, d.y, d.z + def.size * 0.6);
      const r = def.size * Iso.S * 1.6 + 8;
      if (U.dist(vx, vy, q[0], q[1]) < r && d.x + d.y > bk) { best = d; bk = d.x + d.y; }
    }
    return best;
  }

  function overSkip(vx, vy, room) {
    const s = room.skip;
    if (!s || s.gone) return false;
    const pts = [[s.x, s.y, s.h], [s.x + s.w, s.y, s.h], [s.x + s.w, s.y + s.d, s.h], [s.x + s.w, s.y + s.d, 0], [s.x, s.y + s.d, 0], [s.x, s.y + s.d, s.h]]
      .map(p => Iso.p(p[0], p[1], p[2]));
    // margine generoso: le dita non sono precise
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const grown = pts.map(p => [cx + (p[0] - cx) * 1.25, cy + (p[1] - cy) * 1.25]);
    return Iso.pointInPoly(vx, vy, grown);
  }

  Ph.down = function (e) {
    const G = R.G, room = G.room;
    if (finished) return;
    if (R.Phases.cleaning.tryDoor(e, G)) return;
    const d = pick(e.vx, e.vy, room);
    if (!d) return;
    // sotto/dentro questo oggetto c'era qualcosa
    if (d.hides && !St.found.has(d.hides)) {
      const id = d.hides, q = Iso.p(d.x, d.y, 0.3);
      d.z = 0.5; E.tween(d, { z: 0 }, 0.5, U.ease.outBounce);
      A.play('soft');
      St.find(Object.assign({ id }, G.lv.story.finds[id]), q);
      d.hides = null;
      tutorial = false;
      return;
    }
    const fl = Iso.unproject(e.vx, e.vy, 0);
    grab = { d, ox: d.x - fl[0], oy: d.y - fl[1], lastV: [e.vx, e.vy], vel: [0, 0] };
    room.held = d;
    d.lift = 1;
    E.tween(d, { z: 0.7 }, 0.18, U.ease.outQuad);
    A.play('soft'); U.vibrate(8);
    P.dustPuff(Iso.p(d.x, d.y, 0)[0], Iso.p(d.x, d.y, 0)[1], 5);
    tutorial = false;
  };

  Ph.move = function (e, pressed) {
    const G = R.G, room = G.room;
    if (!grab) {
      if (e.type === 'mouse') hover = pick(e.vx, e.vy, room);
      return;
    }
    const d = grab.d;
    const fl = Iso.unproject(e.vx, e.vy + 0.7 * Iso.S, 0);
    const tx = fl[0] + grab.ox, ty = fl[1] + grab.oy;
    grab.vel = [tx - d.x, ty - d.y];
    d.x = tx; d.y = ty;
    room.skip.hot = overSkip(e.vx, e.vy, room) ? 1 : 0;
    void pressed;
  };

  Ph.up = function (e) {
    const G = R.G, room = G.room;
    if (!grab) return;
    const d = grab.d;
    room.held = null; d.lift = 0;
    if (overSkip(e.vx, e.vy, room)) throwInSkip(d, room, G);
    else {
      // rilascio: torna dentro la stanza e cade con un piccolo slancio
      d.vx = U.clamp(grab.vel[0] * 30, -4, 4); d.vy = U.clamp(grab.vel[1] * 30, -4, 4); d.vz = 0.5;
      d.falling = true;
    }
    room.skip.hot = 0;
    grab = null;
  };
  Ph.cancel = function () { if (grab) Ph.up({ vx: -1e6, vy: -1e6 }); };

  function throwInSkip(d, room, G) {
    const s = room.skip, def = O.DEBRIS[d.kind];
    room.debris.splice(room.debris.indexOf(d), 1);
    const fillFrac = s.fill / s.cap;
    const target = {
      x: s.x + U.rand(0.5, s.w - 0.5), y: s.y + U.rand(0.5, s.d - 0.5),
      z: 0.1 + fillFrac * (s.h - 0.3)
    };
    s.fill += def.vol;
    const fly = { d, from: { x: d.x, y: d.y, z: d.z }, to: target, t: 0 };
    flying.push(fly);
    A.play('whoosh');
    UI.setProgress(s.fill / s.cap);
    void G;
  }

  function land(fly, room) {
    const s = room.skip, d = fly.d, def = O.DEBRIS[d.kind];
    d.x = fly.to.x; d.y = fly.to.y; d.z = fly.to.z;
    s.contents.push(d);
    A.play(def.sound === 'clank' ? 'clank' : 'thud', def.weight);
    const q = Iso.p(d.x, d.y, d.z);
    P.dustPuff(q[0], q[1], 8);
    E.punch(0.012); U.vibrate(15);
    // il cassone "sobbalza"
    s.z = -0.06; E.tween(s, { z: 0 }, 0.35, U.ease.outElastic);
    if (!room.debris.length && !finished) finishPhase(room);
  }

  function finishPhase(room) {
    finished = true;
    const G = R.G;
    St.think('Finalmente si respira. Sento un motore, fuori.');
    A.play('complete');
    E.after(1.2, () => {
      A.play('truck');
      E.shake(3);
      E.tween(room.skip, { ox: 14 }, 2.4, U.ease.inQuad, () => {
        room.skip.gone = true;
        G.fitCamera(false, true);
        E.after(0.9, () => UI.next('Avanti: pulizia', () => G.next()));
      });
    });
  }

  Ph.update = function (dt, G) {
    const room = G.room, W = room.W, D = room.D;
    // voli verso il cassone (arco)
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt / 0.55;
      const t = Math.min(1, f.t), d = f.d;
      d.x = U.lerp(f.from.x, f.to.x, t); d.y = U.lerp(f.from.y, f.to.y, t);
      d.z = U.lerp(f.from.z, f.to.z, t) + Math.sin(t * Math.PI) * 1.6;
      d.a += dt * 3;
      if (f.t >= 1) { flying.splice(i, 1); land(f, room); }
    }
    // oggetti in volo appartengono ancora alla scena: li disegniamo come "held" temporanei
    // caduta con rimbalzo
    for (const d of room.debris) {
      if (!d.falling) continue;
      d.vz -= 14 * dt;
      d.z += d.vz * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vx *= 0.96; d.vy *= 0.96;
      d.x = U.clamp(d.x, 0.4, W - 0.4); d.y = U.clamp(d.y, 0.4, D - 0.4);
      if (d.z <= 0) {
        d.z = 0;
        if (Math.abs(d.vz) > 1.2) {
          const def = O.DEBRIS[d.kind];
          A.play(def.sound === 'clank' ? 'clank' : 'thud', def.weight * 0.7);
          const q = Iso.p(d.x, d.y, 0);
          P.dustPuff(q[0], q[1], 4);
          d.vz = -d.vz * 0.35;
        } else { d.vz = 0; d.falling = false; }
      }
    }
    if (tutorial) tutT += dt;
  };

  // gli oggetti in volo vanno disegnati sopra al cassone
  Ph.drawWorld = function (ctx) {
    for (const f of flying) O.drawDebris(ctx, f.d);
    if (hover && !grab && R.G.room.debris.includes(hover)) {
      const def = O.DEBRIS[hover.kind];
      const q = Iso.p(hover.x, hover.y, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(q[0], q[1], def.size * Iso.S * 1.5, def.size * Iso.S * 0.75, 0, 0, U.TAU); ctx.stroke();
    }
  };

  // luccichio se si resta fermi: un oggetto che nasconde qualcosa, oppure il cassone
  Ph.hintSpot = function (G) {
    const room = G.room;
    if (finished) return null;
    const h = room.debris.find(d => d.hides && !St.found.has(d.hides));
    if (h && (!grab)) return Iso.p(h.x, h.y, 0.4);
    const s = room.skip;
    if (tutorial && s) return Iso.p(s.x + s.w / 2, s.y + s.d / 2, s.h);
    const d = room.debris[0];
    return d ? Iso.p(d.x, d.y, 0.4) : null;
  };

  Ph.exit = function () { grab = null; };

  Ph.skip = function (G) {
    const room = G.room;
    room.debris.length = 0;
    if (room.skip) room.skip.gone = true;
    // gli oggetti nascosti sotto i detriti si considerano trovati
    for (const id of ['spugna', 'pala', 'lettera-1975']) { St.found.add(id); (G.lv.story.finds[id].gives || []).forEach(t => St.inv.add(t)); }
  };

  R.Phases.clearing = Ph;
})(window.R);

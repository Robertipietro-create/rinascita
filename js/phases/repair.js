/* =========================================================
   Fase 3 — RIPARAZIONE
   Strumento contestuale: sotto il dito compare quello giusto.
   - crepe: passa la spatola lungo la crepa → stucco
   - vetri rotti: tocca il riquadro → vetro nuovo che scende
   - assi marce: tre colpi di martello → si spaccano
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, P = R.P, A = R.Audio;

  const Ph = { subtitle: 'Rimettere insieme' };
  const St = R.Story;
  let drag = null, hoverTarget = null, finished = false, pulse = 0;

  Ph.enter = function (G) {
    drag = null; finished = false;
    G.env.motes = 0.05;
    G.fitCamera(false, true);
    UI.showProgress(true);
    UI.setProgress(progress(G.room), true);
    E.after(3.0, () => St.nextThought(G.lv, 'repair'));
  };

  function counts(room) {
    const panes = room.winState ? room.winState.panes : [];
    return {
      cracks: room.cracks.length, cracksDone: room.cracks.filter(c => c.done).length,
      panes: panes.filter((p, i) => room.lv.window.broken[i] === 0).length,
      panesDone: panes.filter((p, i) => room.lv.window.broken[i] === 0 && p >= 1).length,
      planks: room.rotten.length, planksDone: room.rotten.filter(p => p.broken).length
    };
  }
  function progress(room) {
    const c = counts(room);
    const crackFill = room.cracks.reduce((s, k) => s + (k.done ? 1 : k.filled.filter(f => f >= 1).length / k.filled.length), 0);
    const tot = c.cracks + c.panes + c.planks;
    return tot ? (crackFill + c.panesDone + c.planksDone) / tot : 1;
  }
  function refreshTasks() { /* niente lista di compiti: si esplora */ }
  function refreshTasksOld(room) {
    const c = counts(room);
    UI.setTasks([
      { text: `Stucca le crepe ${c.cracksDone}/${c.cracks}`, done: c.cracksDone === c.cracks },
      { text: `Vetri nuovi ${c.panesDone}/${c.panes}`, done: c.panesDone === c.panes },
      { text: `Assi marce ${c.planksDone}/${c.planks}`, done: c.planksDone === c.planks }
    ]);
  }

  // ---------- cosa c'è sotto il dito ----------
  function target(vx, vy, room) {
    const hit = room.surfaceAt(vx, vy, 6);
    if (!hit) return null;
    const s = hit.s, u = hit.u, v = hit.v;
    if (s.id === 'floor') {
      for (const p of room.rotten) if (!p.broken && u >= p.x - 6 && u <= p.x + p.w + 6 && v >= p.y - 8 && v <= p.y + p.h + 8) return { kind: 'plank', p, tool: 'martello' };
    }
    if (s.id === 'wallBack' && room.win) {
      const w = room.win, pw = (w.x1 - w.x0) / 2, ph = (w.y1 - w.y0) / 2;
      for (let i = 0; i < 4; i++) {
        const px = w.x0 + (i % 2) * pw, py = w.y0 + (i >> 1) * ph;
        if (room.winState.panes[i] === 0 && u >= px && u <= px + pw && v >= py && v <= py + ph) return { kind: 'pane', i, tool: 'vetro' };
      }
    }
    for (const c of room.cracks) {
      if (c.done || c.wall !== s.id) continue;
      for (const p of c.pts) if (U.dist(p[0], p[1], u, v) < 26) return { kind: 'crack', c, s, tool: 'spatola' };
    }
    return null;
  }

  Ph.down = function (e) {
    const G = R.G, room = G.room;
    if (finished) return;
    if (R.Phases.cleaning.tryDoor(e, G)) return;
    const t = target(e.vx, e.vy, room);
    hoverTarget = { e, t };
    if (!t) return;
    // senza gli attrezzi di Nino si può solo guardare
    if (!St.has('attrezzi') && t.kind !== 'pane') { St.think('Servirebbero degli attrezzi. Nino doveva pur tenerli da qualche parte…'); hoverTarget = null; return; }
    if (t.kind === 'plank') hitPlank(t.p, e, room);
    else if (t.kind === 'pane') placePane(t.i, room);
    else if (t.kind === 'crack') { drag = t; fillAt(t, e.vx, e.vy, room); }
    afterAction(G);
  };
  Ph.move = function (e, pressed) {
    const room = R.G.room;
    hoverTarget = { e, t: target(e.vx, e.vy, room) };
    if (!pressed || !drag) return;
    fillAt(drag, e.vx, e.vy, room);
    afterAction(R.G);
  };
  Ph.up = function (e) {
    drag = null; A.voice('roller', 0);
    if (!e || e.type !== 'mouse') hoverTarget = null;
  };
  Ph.cancel = Ph.up;
  Ph.hover = function (e) { if (!e) hoverTarget = null; };

  // ---------- azioni ----------
  function hitPlank(p, e, room) {
    p.hp--;
    p.shake = 0.25; E.tween(p, { shake: 0 }, 0.25);
    const q = room.floor.toView(p.x + p.w / 2, p.y + p.h / 2);
    E.shake(p.hp <= 0 ? 4 : 1.5); E.punch(0.01); U.vibrate(p.hp <= 0 ? 30 : 12);
    if (p.hp > 0) {
      A.play('hammer');
      P.chips(q[0], q[1], 6, '#6d5640');
    } else {
      p.broken = true;
      A.play('crack'); A.play('thud', 1.2);
      // sotto una delle assi c'è la scatola di latta con le lettere
      if (p === room.rotten[0] && !St.found.has('latta')) E.after(0.9, () => St.find(Object.assign({ id: 'latta' }, room.lv.story.finds.latta), q));
      P.chips(q[0], q[1], 22, '#5e4a36');
      P.dustPuff(q[0], q[1], 12);

    }
    void e;
  }
  function placePane(i, room) {
    room.winState.panes[i] = 0.01;
    const k = { v: 0.01 };
    E.tween(k, { v: 1 }, 0.55, U.ease.outBounce, () => {
      room.winState.panes[i] = 1;
      const w = room.win, pw = (w.x1 - w.x0) / 2, ph = (w.y1 - w.y0) / 2;
      const q = room.wallBack.toView(w.x0 + (i % 2) * pw + pw / 2, w.y0 + (i >> 1) * ph + ph / 2);
      P.sparkle(q[0], q[1], 8, 14);
      A.play('glass');
      afterAction(R.G);
    });
    k.upd = () => { room.winState.panes[i] = Math.max(0.01, k.v); };
    paneAnims.push(k);
    A.play('whoosh', true);
  }
  const paneAnims = [];

  function fillAt(t, vx, vy, room) {
    const c = t.c, s = room.byId[c.wall];
    const uv = s.toUV(vx, vy);
    let any = false;
    for (let i = 0; i < c.filled.length; i++) {
      if (c.filled[i] >= 1) continue;
      const a = c.pts[i], b = c.pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (U.dist(mx, my, uv[0], uv[1]) < 28) {
        c.filled[i] = Math.min(1, c.filled[i] + 0.34);
        any = true;
        if (c.filled[i] >= 1) {
          const q = s.toView(mx, my);
          P.add({ kind: 'puff', x: q[0], y: q[1], vx: 0, vy: -5, size: 3, life: 0.4, color: 'rgba(250,245,235,0.8)' });
        }
      }
    }
    if (any) {
      A.voice('roller', 0.6, 0.3);
      if (Math.random() < 0.25) A.play('putty');
    }
    if (!c.done && c.filled.every(f => f >= 1)) {
      c.done = true;
      A.play('sparkle'); U.vibrate([8, 20, 8]);

      // lo stucco si "fonde" con il muro
      E.after(0.4, () => E.tween(c, { fade: 0 }, 1.4, U.ease.inOutQuad));
      const mid = c.pts[c.pts.length >> 1], q = s.toView(mid[0], mid[1]);
      P.sparkle(q[0], q[1], 10, 30);
      drag = null;
    }
  }

  function afterAction(G) {
    const room = G.room;
    UI.setProgress(progress(room));
    refreshTasks(room);
    const c = counts(room);
    if (!finished && c.cracksDone === c.cracks && c.panesDone === c.panes && c.planksDone === c.planks) {
      finished = true;
      A.voice('roller', 0);
      E.after(0.7, () => {
        A.play('complete');
        St.think('La casa sta di nuovo in piedi. Ora tocca a me scegliere come sarà.');
        E.after(1.2, () => UI.next('Avanti: costruzione', () => G.next()));
      });
    }
  }

  Ph.update = function (dt) {
    pulse += dt;
    for (let i = paneAnims.length - 1; i >= 0; i--) { paneAnims[i].upd(); if (paneAnims[i].v >= 1) paneAnims.splice(i, 1); }
  };

  // cerchi luminosi sui compiti rimasti
  Ph.hintSpot = function (G) {
    const room = G.room;
    if (finished) return null;
    if (!St.has('attrezzi') && room.door) { const d = room.door; return room.wallLeft.toView((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2); }
    if (room.win) {
      const w = room.win, pw = (w.x1 - w.x0) / 2, ph = (w.y1 - w.y0) / 2;
      const i = room.winState.panes.findIndex(p => p === 0);
      if (i >= 0) return room.wallBack.toView(w.x0 + (i % 2) * pw + pw / 2, w.y0 + (i >> 1) * ph + ph / 2);
    }
    for (const c of room.cracks) { if (c.done) continue; const i = c.filled.findIndex(f => f < 1); if (i >= 0) return room.byId[c.wall].toView(c.pts[i][0], c.pts[i][1]); }
    const p = room.rotten.find(x => !x.broken);
    return p ? room.floor.toView(p.x + p.w / 2, p.y + p.h / 2) : null;
  };

  Ph.drawWorld = function (ctx, G) {
    return; // nessun segnale fisso: si scopre toccando
    if (finished) return;
    const room = G.room, ring = (q, r) => {
      const k = (pulse * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,236,170,${0.9 * (1 - k)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(q[0], q[1], r * (0.6 + k * 0.6), r * (0.6 + k * 0.6) * 0.7, 0, 0, U.TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,236,170,0.25)';
      ctx.beginPath(); ctx.ellipse(q[0], q[1], r * 0.35, r * 0.25, 0, 0, U.TAU); ctx.fill();
    };
    for (const p of room.rotten) if (!p.broken) ring(room.floor.toView(p.x + p.w / 2, p.y + p.h / 2), 18);
    if (room.win) {
      const w = room.win, pw = (w.x1 - w.x0) / 2, ph = (w.y1 - w.y0) / 2;
      room.winState.panes.forEach((p, i) => { if (p === 0) ring(room.wallBack.toView(w.x0 + (i % 2) * pw + pw / 2, w.y0 + (i >> 1) * ph + ph / 2), 14); });
    }
    for (const c of room.cracks) {
      if (c.done) continue;
      const i = c.filled.findIndex(f => f < 1);
      if (i >= 0) ring(room.byId[c.wall].toView(c.pts[i][0], c.pts[i][1]), 16);
    }
  };

  // icona dello strumento contestuale sotto il dito
  Ph.drawOver = function (ctx) {
    if (!hoverTarget || !hoverTarget.t || finished) return;
    const e = hoverTarget.e;
    ctx.save(); ctx.translate(e.x + 14, e.y + 4);
    if (hoverTarget.t.tool === 'martello') ctx.rotate(Math.sin(R.E.time * 8) * 0.1);
    R.Icons.draw[hoverTarget.t.tool](ctx);
    ctx.restore();
  };

  Ph.exit = function () { drag = null; hoverTarget = null; UI.setTasks(null); A.voice('roller', 0); };

  Ph.skip = function (G) {
    const room = G.room;
    for (const c of room.cracks) { c.filled.fill(1); c.done = true; c.fade = 0; }
    if (room.winState) room.winState.panes = [1, 1, 1, 1];
    for (const p of room.rotten) p.broken = true;
    St.inv.add('attrezzi'); St.inv.add('aspirapolvere'); St.inv.add('raschietto'); St.found.add('ripostiglio'); St.found.add('latta');
  };

  R.Phases.repair = Ph;
})(window.R);

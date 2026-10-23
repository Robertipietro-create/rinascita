/* =========================================================
   Fase 2 — PULIZIA  (il cuore "satisfying" del gioco)
   - il gesto viene campionato lungo il tragitto del dito
     (nessun buco anche con movimenti veloci)
   - ogni campione timbra la maschera della superficie sotto il dito
   - effetti: schiuma, getto con schizzi e colature, risucchio,
     scaglie, zolle di fango verso il mucchio
   - la stanza si illumina man mano che si pulisce
   - al 97% un livello si dissolve da solo; al 100% la superficie luccica
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, P = R.P, A = R.Audio, T = R.T, Tools = R.Tools;

  const Ph = { subtitle: 'Sotto la polvere' };
  const St = R.Story;
  let tool = null, stroke = null, measureT = 0, finished = false;
  let wrong = {}, hinted = {}, shovelAcc = 0, speed = 0, workRate = 0, dripT = 0, hapticT = 0;
  let hoverPt = null, sparkT = 0, lastFrac = 0, idleT = 0, hintSpot = null;

  Ph.active = false;
  const DONE_MSG = {
    dust: 'Via la polvere!', mud: 'Niente più fango!', stain: 'Macchie sparite!', mold: 'Addio muffa!',
    grime: 'Aloni lavati via!', graffiti: 'Graffiti cancellati!', peel: 'Vernice vecchia rimossa!', cobweb: 'Ragnatele aspirate!'
  };

  Ph.enter = function (G) {
    finished = false; wrong = {}; hinted = {}; shovelAcc = 0; stroke = null; lastFrac = 0; idleT = 0; hintSpot = null;
    G.env.motes = 0.6;
    G.setMood('ruin', 1.2, { dark: 0.3 });
    G.fitCamera(false, true);
    UI.showProgress(true);
    const frac = G.room.totalCleanFraction();
    UI.setProgress(frac, true);
    tool = null;
    Ph.active = true;
    buildToolbar();
    E.after(3.0, () => St.nextThought(G.lv, 'cleaning'));
  };

  // barra con gli attrezzi TROVATI; gli altri sono sagome spente da scoprire
  function buildToolbar() {
    const owned = Tools.order.filter(id => St.has(id));
    if (!tool || !St.has(tool.id)) tool = owned.length ? Tools.defs[owned[0]] : null;
    const items = Tools.order.map(id => ({ id, icon: Tools.defs[id].icon, label: St.has(id) ? Tools.defs[id].name : '?', locked: !St.has(id) }));
    UI.toolbar(items, tool ? tool.id : null, id => {
      if (!St.has(id)) { St.think(R.G.lv.story.thoughts.locked); UI.setActiveTool(tool ? tool.id : null); return; }
      selectTool(id);
    });
  }
  Ph.refreshTools = buildToolbar;

  // la porta del ripostiglio (usata anche da sgombero e riparazione)
  Ph.tryDoor = function (e, G) {
    const room = G.room;
    if (!room.door || St.found.has('ripostiglio')) return false;
    const hit = room.surfaceAt(e.vx, e.vy, 6);
    if (!hit || hit.s.id !== 'wallLeft') return false;
    const d = room.door;
    if (hit.u < d.x0 - 10 || hit.u > d.x1 + 10 || hit.v < d.y0 - 10) return false;
    A.play('creak');
    E.tween(room.doorState, { open: 0.6 }, 0.4, U.ease.outQuad, () => E.after(1.2, () => E.tween(room.doorState, { open: 0 }, 0.6)));
    const q = hit.s.toView((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2);
    E.after(0.5, () => St.find(Object.assign({ id: 'ripostiglio' }, G.lv.story.finds.ripostiglio), q, () => { if (Ph.active) buildToolbar(); }));
    return true;
  };

  Ph.hintSpot = function (G) {
    const room = G.room;
    if (finished) return null;
    // prima le cose da scoprire, poi lo sporco rimasto
    if (!St.found.has('ripostiglio') && room.door && (St.inv.size < 2 || lastFrac > 0.25)) {
      const d = room.door; return room.wallLeft.toView((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2);
    }
    for (const c of room.collectibles) {
      if (c.found || room.collectibleExposure(c) < 0.75) continue;
      return room.byId[c.surface].toView(c.u * room.ppu, c.v * room.ppu);
    }
    const h = dirtiestSpot(room);
    return h ? [h.vx, h.vy] : null;
  };

  function selectTool(id) {
    tool = Tools.defs[id];
    A.stopVoices();
  }

  // ---------- input ----------
  Ph.down = function (e) {
    const G = R.G;
    if (finished && !G.room.collectibles.some(c => !c.found)) return;
    // prima: c'è un tesoro scoperto sotto il dito?
    if (tryCollect(e, G)) return;
    if (Ph.tryDoor(e, G)) return;
    if (finished) return;
    if (!tool) { St.think(G.lv.story.thoughts.locked); return; }
    const pt = G.pointView(e, tool.offset);
    stroke = { last: pt, t: E.time, moved: 0 };
    stamp(pt.vx, pt.vy, pt.vx, pt.vy, G, 1);
    E.punch(0.004);
  };
  Ph.move = function (e, pressed) {
    const G = R.G;
    if (!tool) return;
    const pt = G.pointView(e, tool.offset);
    hoverPt = pt;
    if (!stroke || !pressed) return;
    const d = U.dist(stroke.last.sx, stroke.last.sy, pt.sx, pt.sy);
    const dtm = Math.max(0.008, E.time - stroke.t);
    speed = U.lerp(speed, d / dtm, 0.3);
    segment(stroke.last, pt, G);
    stroke.moved += d;
    stroke.last = pt; stroke.t = E.time;
  };
  Ph.up = function (e) {
    stroke = null; speed = 0;
    if (!e || e.type !== 'mouse') hoverPt = null; // su touch il cursore sparisce col dito
  };
  Ph.cancel = function () { stroke = null; speed = 0; };
  Ph.hover = function (e) { if (!e) hoverPt = null; };

  // campiona il tratto in passi regolari (in coordinate vista)
  function segment(a, b, G) {
    const rView = tool.radius * Iso.S;
    const step = Math.max(1.5, rView * tool.spacing * 2);
    const len = U.dist(a.vx, a.vy, b.vx, b.vy);
    const n = Math.min(80, Math.ceil(len / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      stamp(U.lerp(a.vx, b.vx, t), U.lerp(a.vy, b.vy, t), a.vx, a.vy, G, 1 / Math.max(1, n * 0.15));
    }
  }

  // un timbro nel punto (vx,vy); (px,py) = punto precedente per la direzione
  function stamp(vx, vy, px, py, G, fxScale) {
    const room = G.room;
    const hit = room.surfaceAt(vx, vy);
    if (!hit) return null;
    const s = hit.s;
    if (tool.floorOnly && s.kind !== 'floor') {
      if (!hinted.floorOnly) { hinted.floorOnly = true; St.think('Con la pala sui muri? Meglio di no.'); }
      return null;
    }
    let ang;
    if (tool.stamp === 'blade') {
      // la lama sta di traverso rispetto al movimento
      const a = s.toUV(px, py), b = [hit.u, hit.v];
      ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      if (!isFinite(ang) || (a[0] === b[0] && a[1] === b[1])) ang = 0;
    }
    const res = s.brush(hit.u, hit.v, tool, Tools.stamp(tool), ang);
    effects(res, vx, vy, s, hit, G, fxScale);
    // strumento poco adatto: dopo un po' arriva il suggerimento
    if (res.wrong && res.work < 0.15) {
      wrong[res.wrong] = (wrong[res.wrong] || 0) + 1;
      if (wrong[res.wrong] > 30 && !hinted[res.wrong]) {
        hinted[res.wrong] = true;
        // niente nomi: un pensiero vago e, se l'attrezzo giusto è già in tasca, un piccolo sussulto del suo pulsante
        const owned = Tools.order.filter(id => St.has(id));
        const best = Tools.bestFor(res.wrong, owned);
        St.think(G.lv.story.thoughts.cleaningStuck);
        if (best && best !== tool.id && (Tools.defs[best].eff[res.wrong] || 0) >= 0.6) UI.wiggleTool(best);
      }
    }
    return res;
  }

  // ---------- effetti di ogni strumento ----------
  function effects(res, vx, vy, s, hit, G, k) {
    const w = res.work;
    const col = res.hit ? T.DIRT_COLORS[res.hit] : null;
    workRate = Math.max(workRate, w);
    const rView = tool.radius * Iso.S;
    switch (tool.id) {
      case 'spugna':
        if (Math.random() < 0.55 * k + w * 0.5) P.bubbles(vx, vy, 1 + (w > 0.2 ? 1 : 0), rView * 0.8);
        if (w > 0.3 && Math.random() < 0.08) P.add({ kind: 'drop', x: vx, y: vy, vx: U.rand(-20, 20), vy: U.rand(-30, 0), g: 300, size: 1.6, life: 0.5, color: col || 'rgba(255,255,255,0.8)' });
        break;
      case 'idropulitrice':
        if (Math.random() < 0.6) P.splash(vx, vy, 2, w > 0.15 ? U.sh(col, 0.2, 0.85) : 'rgba(205,230,250,0.9)', 0.8);
        if (s.kind !== 'floor' && Math.random() < 0.08) P.drip(vx + U.rand(-3, 3), vy, w > 0.1 ? U.sh(col, 0.15, 0.8) : undefined);
        break;
      case 'aspirapolvere':
        if (Math.random() < 0.5 + w) {
          const a = U.rand(0, U.TAU), r = rView * U.rand(0.9, 1.6);
          P.suck(vx + Math.cos(a) * r, vy + Math.sin(a) * r * 0.6, vx, vy, w > 0.05 ? col : 'rgba(200,190,170,0.6)');
        }
        break;
      case 'raschietto':
        if (w > 0.05 && Math.random() < 0.35 + w) {
          const fy = s.kind === 'floor' ? vy + 12 : s.toView(hit.u, s.th)[1];
          P.flake(vx, vy, U.sh(col, U.rand(-0.1, 0.15)), fy + U.rand(-4, 8));
          if (Math.random() < 0.3) A.play('flake');
        }
        break;
      case 'pala':
        if (w > 0) {
          shovelAcc += w;
          if (shovelAcc > 0.9 && G.room.heap) {
            shovelAcc = 0;
            const hp = G.room.heap, hq = Iso.p(hp.x, hp.y, 0.2);
            A.play('splat');
            P.clump(vx, vy, hq[0], hq[1], U.pick(['#6b4e32', '#5c432b', '#7a5a3a']), () => {
              hp.size = Math.min(2.2, hp.size + 0.12);
              hp.pop = 1.15; E.tween(hp, { pop: 1 }, 0.3, U.ease.outQuad);
              A.play('thud', 0.6);
            });
          }
        }
        break;
    }
    // vibrazione leggera quando lo sporco cede
    if (w > 0.2 && E.time - hapticT > 0.12) { U.vibrate(4); hapticT = E.time; E.punch(0.0015); }
  }

  // ---------- collezionabili ----------
  function tryCollect(e, G) {
    const room = G.room;
    for (const c of room.collectibles) {
      if (c.found || room.collectibleExposure(c) < 0.75) continue;
      const s = room.byId[c.surface];
      const q = s.toView(c.u * room.ppu, c.v * room.ppu);
      const sp = E.viewToScreen(q[0], q[1]);
      if (U.dist(sp[0], sp[1], e.x, e.y) < 38) {
        c.found = true;
        room.floor.dirtyCache = true;
        St.find(c, q, () => { if (c.gives) buildToolbar(); });
        return true;
      }
    }
    return false;
  }

  // ---------- ciclo ----------
  Ph.update = function (dt, G) {
    const room = G.room;
    // azione continua a dito fermo (getto, aspirazione)
    if (stroke && tool.continuous && !finished) {
      const p = stroke.last;
      const r = stamp(p.vx + U.rand(-1, 1), p.vy + U.rand(-1, 1), p.vx, p.vy, G, 0.6);
      void r;
    }
    // voci continue
    if (stroke && !finished) {
      const lvl = tool.continuous ? 0.85 + Math.min(0.15, speed / 3000) : U.clamp(speed / 700, 0, 1);
      A.voice(tool.voice, lvl, U.clamp(workRate * 1.5, 0, 1));
    } else if (tool) A.voice(tool.voice, 0);
    workRate *= Math.pow(0.02, dt);
    speed *= Math.pow(0.05, dt);

    // misura (4–6 volte al secondo) e completamento dei livelli
    measureT += dt;
    if (measureT > 0.16) {
      measureT = 0;
      for (const s of room.surfaces) {
        const fin = s.measure();
        for (const L of fin) {
          s.finishLayer(L, () => checkSurface(s, G));
          UI.toast(DONE_MSG[L.type] || 'Pulito!', 1800);
          A.play('bell', 784, 0.12);
        }
        // superficie quasi perfetta: gli ultimi residui sparsi li regaliamo
        if (!s.done && s.cleanFraction() >= 0.94) {
          for (const L of s.layers) if (!L.done) s.finishLayer(L, () => checkSurface(s, G));
        }
      }
      const frac = room.totalCleanFraction();
      // fermo da un po' con poco sporco rimasto? mostriamo dove
      if (frac > lastFrac + 0.002) idleT = 0;
      UI.setProgress(frac);
      // la stanza si illumina pulendo
      if (!finished) G.env.dark = 0.3 * Math.pow(1 - frac, 1.3);
      G.env.motes = 0.6 * (1 - frac) + 0.05;
      lastFrac = frac;
    }

    // (il luccichio per chi resta fermo lo gestisce la Storia tramite hintSpot)

    // tesori che luccicano quando vengono scoperti
    sparkT += dt;
    if (sparkT > 0.35) {
      sparkT = 0;
      for (const c of room.collectibles) {
        if (c.found || room.collectibleExposure(c) < 0.75) continue;
        const s = room.byId[c.surface], q = s.toView(c.u * room.ppu, c.v * room.ppu);
        P.sparkle(q[0], q[1], 2, 8);
        if (!c.hinted) { c.hinted = true; St.once('luccica', 'C\'è qualcosa, lì sotto.'); A.play('sparkle'); }
      }
    }
  };

  // la cella più sporca tra tutti i livelli non finiti (dalla griglia di misura)
  function dirtiestSpot(room) {
    let best = null, bv = 0;
    for (const s of room.surfaces) for (const L of s.layers) {
      if (L.done) continue;
      for (let i = 0; i < L.grid.length; i++) {
        const v = L.grid[i] * (L.type === 'cobweb' ? 1 : 0.8);
        if (v > bv) { bv = v; best = { s, u: (i % L.gw + 0.5) * 8, v: (Math.floor(i / L.gw) + 0.5) * 8 }; }
      }
    }
    if (!best) return null;
    const q = best.s.toView(best.u, best.v);
    return { vx: q[0], vy: q[1], t: 0 };
  }

  Ph.drawWorld = function (ctx) {
    if (!hintSpot || finished || hintSpot.t > 4) return;
    const k = (hintSpot.t * 1.3) % 1;
    ctx.strokeStyle = `rgba(255,236,170,${0.95 * (1 - k)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(hintSpot.vx, hintSpot.vy, 8 + k * 22, (8 + k * 22) * 0.7, 0, 0, U.TAU); ctx.stroke();
  };

  function checkSurface(s, G) {
    if (s.done || !s.allClean()) return;
    s.done = true;
    s.startShine();
    A.play('sparkle');
    U.vibrate([10, 30, 10]);
    const o = s.outline();
    for (let i = 0; i < 18; i++) {
      const a = U.rand(0, 1), b = U.rand(0, 1);
      const x = U.lerp(U.lerp(o[0][0], o[1][0], a), U.lerp(o[3][0], o[2][0], a), b);
      const y = U.lerp(U.lerp(o[0][1], o[1][1], a), U.lerp(o[3][1], o[2][1], a), b);
      P.sparkle(x, y, 1, 4);
    }
    const names = { floor: 'Il pavimento brilla!', wallBack: 'La parete di fondo è come nuova!', wallLeft: 'La parete sinistra respira di nuovo!' };
    UI.toast(names[s.id] || 'Splendente!', 2200);
    if (G.room.surfaces.every(x => x.done)) allDone(G);
  }

  function allDone(G) {
    if (finished) return;
    finished = true;
    stroke = null;
    A.stopVoices();
    E.after(0.8, () => {
      A.play('complete');
      G.setMood('day', 2.0, { dark: 0 });
      // il mucchio di fango viene portato via con una carriola immaginaria: puff!
      const hp = G.room.heap;
      if (hp && hp.size > 0) {
        const q = Iso.p(hp.x, hp.y, 0.2);
        E.tween(hp, { size: 0 }, 0.6, U.ease.inQuad, () => { P.dustPuff(q[0], q[1], 14, 'rgba(120,90,60,0.5)'); A.play('whoosh'); });
      }
      const left = G.room.collectibles.filter(c => !c.found).length;
      St.think(left ? 'Che luce. Eppure qualcosa brilla ancora, sul pavimento…' : 'Che luce. Adesso sembra di sentirla, la casa.');
      E.after(1.4, () => UI.next('Avanti: riparazioni', () => G.next()));
    });
  }

  // ---------- disegno del cursore/strumento ----------
  Ph.drawOver = function (ctx, G) {
    const pt = stroke ? stroke.last : hoverPt;
    if (!pt || finished || UI.modalOpen()) return;
    const sx = pt.sx, sy = pt.sy;
    const z = E.cam.zoom;
    const r = tool.radius * Iso.S * z;
    // anello dell'area di lavoro
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.1, r * 0.8, 0, 0, U.TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    if (tool.id === 'idropulitrice') {
      // la lancia parte dal basso a destra: il getto colpisce il punto
      const nx = sx + 34, ny = sy + 46;
      if (stroke) {
        const g = ctx.createLinearGradient(nx, ny, sx, sy);
        g.addColorStop(0, 'rgba(220,240,255,0.95)'); g.addColorStop(1, 'rgba(200,230,255,0.4)');
        ctx.strokeStyle = g; ctx.lineWidth = 3 + Math.sin(E.time * 60) * 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.fillStyle = 'rgba(235,248,255,0.7)';
        ctx.beginPath(); ctx.arc(sx, sy, 5 + Math.random() * 3, 0, U.TAU); ctx.fill();
      }
      ctx.translate(nx + 6, ny + 14); ctx.scale(0.9, 0.9);
      R.Icons.draw.idropulitrice(ctx);
    } else if (tool.id === 'aspirapolvere') {
      ctx.translate(sx + 2, sy + 4);
      if (stroke) ctx.translate(U.rand(-0.8, 0.8), U.rand(-0.8, 0.8));
      R.Icons.draw.aspirapolvere(ctx);
    } else if (tool.id === 'raschietto') {
      ctx.translate(sx + 6, sy + 16);
      R.Icons.draw.raschietto(ctx);
    } else if (tool.id === 'pala') {
      ctx.translate(sx + 10, sy + 18);
      R.Icons.draw.pala(ctx);
    } else {
      ctx.translate(sx, sy);
      R.Icons.draw.spugna(ctx, stroke ? E.time : 0);
    }
    ctx.restore();
  };

  Ph.exit = function () { stroke = null; A.stopVoices(); Ph.active = false; };

  // salto (debug): tutto pulito all'istante
  Ph.skip = function (G) {
    for (const s of G.room.surfaces) {
      for (const L of s.layers) { L.ctx.clearRect(0, 0, L.c.width, L.c.height); L.done = true; L.fade = 0; L.rem = 0; }
      s.done = true;
    }
    G.env.dark = 0;
  };

  R.Phases.cleaning = Ph;
})(window.R);

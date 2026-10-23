/* =========================================================
   Fase 0 — SCOPERTA
   Buio quasi totale, imposte chiuse: solo fili di luce tra le
   stecche. La camera arretra lentamente, si scatta la foto del
   PRIMA. Nessuna istruzione: un pensiero, e se si resta fermi
   un luccichio sulla finestra. Toccandola le imposte si aprono.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, A = R.Audio, St = R.Story;

  const Ph = { subtitle: '' };
  let photoTaken = false, opened = false, taps = 0;

  Ph.enter = function (G) {
    photoTaken = false; opened = false; taps = 0;
    const lv = G.lv, room = G.room;
    if (room.winState) room.winState.shutters = 1;
    G.env.motes = 1;
    G.env.dark = 0.88; G.env.beam = 0.22;
    G.fitCamera(false, false);
    const fit = { x: E.cam.x, y: E.cam.y, zoom: E.cam.zoom };
    const w = lv.windowWorld;
    const wc = Iso.p((w.x0 + w.x1) / 2, 1.5, (w.z0 + w.z1) / 2 - 0.8);
    E.cam.x = wc[0]; E.cam.y = wc[1]; E.cam.zoom = fit.zoom * 2.1;
    E.camLocked = true;
    A.voice('wind', 0.8);
    UI.card('Capitolo ' + lv.chapter, lv.name, '');
    E.tween(E.cam, fit, 6.5, U.ease.inOutCubic, () => takePhoto(G));
  };

  function takePhoto(G) {
    if (photoTaken) return;
    photoTaken = true;
    E.camLocked = false;
    G.photos.before = G.photo();
    G.shutter();
    const intro = G.lv.story.intro;
    intro.forEach((t, i) => E.after(1.2 + i * 4, () => St.think(t)));
  }

  function onWindow(e, G) {
    const room = G.room, hit = room.surfaceAt(e.vx, e.vy, 10);
    if (!hit || hit.s.id !== 'wallBack' || !room.win) return false;
    const w = room.win, pad = 30;
    return hit.u > w.x0 - pad && hit.u < w.x1 + pad && hit.v > w.y0 - pad && hit.v < w.y1 + pad;
  }

  function openShutters(G) {
    opened = true;
    const room = G.room;
    A.play('creak'); E.after(0.25, () => A.play('creak'));
    E.tween(room.winState, { shutters: 0 }, 1.1, U.ease.outBack);
    E.tween(G.env, { dark: 0.45, beam: 1 }, 1.6, U.ease.inOutQuad);
    E.punch(0.01); U.vibrate(15);
    E.after(1.0, () => { A.voice('wind', 0.35); A.play('birds'); });
    const q = room.wallBack.toView((room.win.x0 + room.win.x1) / 2, (room.win.y0 + room.win.y1) / 2);
    R.P.dustPuff(q[0], q[1] + 20, 14, 'rgba(255,240,210,0.5)');
    E.after(2.0, () => St.think('Ecco. Adesso si vede quanto lavoro c\'è.'));
    E.after(4.5, () => UI.next('Cominciamo', () => G.next()));
  }

  Ph.down = function (e) {
    const G = R.G;
    if (!photoTaken) { // un tocco salta l'inquadratura
      E.tweens.length = 0;
      G.fitCamera(false, false);
      takePhoto(G);
      return;
    }
    if (opened) return;
    if (onWindow(e, G)) { openShutters(G); return; }
    // toccare altrove: la stanza "risponde" con un pensiero
    taps++;
    if (taps === 1 || taps % 4 === 0) St.nextThought(G.lv, 'discovery');
  };

  Ph.hintSpot = function (G) {
    if (!photoTaken || opened) return null;
    const r = G.room;
    return r.wallBack.toView((r.win.x0 + r.win.x1) / 2, (r.win.y0 + r.win.y1) / 2);
  };

  Ph.update = function (dt, G) {
    if (!opened) return;
    if (Math.random() < dt * 0.8) {
      const w = G.lv.windowWorld;
      const q = Iso.p(U.rand(w.x0, w.x1), 0.1, U.rand(w.z0, w.z1));
      R.P.leaf(q[0], q[1], U.pick(['#b8873e', '#a8743a', '#c9a05a']));
    }
  };

  Ph.exit = function () { A.voice('wind', 0); E.camLocked = false; };

  Ph.skip = function (G) { G.photos.before = G.photo(); if (G.room.winState) G.room.winState.shutters = 0; };

  R.Phases = R.Phases || {};
  R.Phases.discovery = Ph;
})(window.R);

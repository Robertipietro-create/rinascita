/* =========================================================
   Fase 4 — COSTRUZIONE
   1) pavimento: scegli il materiale e posalo trascinando il dito,
      tessera dopo tessera (caduta con rimbalzo + "toc");
      all'85% le ultime si posano da sole a cascata
   2) parete di fondo e 3) parete sinistra: pittura a rullo
      (strisce che si fondono) o carta da parati a teli che si srotolano
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, P = R.P, A = R.Audio, T = R.T;

  const Ph = { subtitle: 'Una pelle nuova' };
  const St = R.Story;
  const STEPS = ['floor', 'wallBack', 'wallLeft'];
  let step = 0, mode = null, drag = null, finishedStep = false, tocN = 0, lastCell = null, autoDone = false;
  const CELL = 64;

  Ph.enter = function (G) {
    step = 0;
    G.choices = G.choices || {};
    G.env.motes = 0;
    startStep(G);
  };

  function sheetMargin() { return Math.min(E.h * 0.46, 330) + 10; }

  function startStep(G) {
    finishedStep = false; drag = null; mode = null; autoDone = false;
    const id = STEPS[step];
    UI.toolbar(null);
    UI.setProgress(0, true);
    UI.showProgress(true);
    G.fitCamera(false, true, sheetMargin());
    if (id === 'floor') openFloorSheet(G);
    else openWallSheet(G, id);
  }

  // ---------------- PAVIMENTO ----------------
  function openFloorSheet(G) {
    const mats = G.lv.floors;
    let html = '<h3>Scegli il pavimento</h3><div class="grid">';
    mats.forEach(m => { html += `<button class="choice" data-m="${m}"><canvas width="128" height="128"></canvas>${T.FLOORS[m].name}</button>`; });
    html += '</div>';
    UI.openSheet(html, el => {
      el.querySelectorAll('.choice').forEach(b => {
        const m = b.dataset.m, cv = b.querySelector('canvas');
        // anteprima: un pezzo vero del materiale
        setTimeout(() => cv.getContext('2d').drawImage(T.FLOORS[m].fn(128, 128, 7), 0, 0), 0);
        b.onclick = () => { A.play('click'); chooseFloor(G, m); };
      });
    });
  }

  function chooseFloor(G, m) {
    const room = G.room, fl = room.floor;
    G.choices.floor = m;
    UI.closeSheet();
    G.fitCamera(false, true);
    const tex = T.FLOORS[m].fn(fl.tw, fl.th, G.lv.seed + 300);
    const prev = room.floorFinish;
    const baked = prev && prev.baked ? prev.baked : U.canvas(fl.tw, fl.th);
    const ff = { mat: m, tex, baked, cw: Math.ceil(fl.tw / CELL), ch: Math.ceil(fl.th / CELL) };
    ff.cells = new Uint8Array(ff.cw * ff.ch);
    ff.baked.getContext('2d').clearRect(0, 0, fl.tw, fl.th);
    room.floorFinish = ff;
    room.floorAnim.length = 0;
    fl.finish = (ctx) => ctx.drawImage(ff.baked, 0, 0);
    mode = 'tiles';
    UI.toolbar([{ id: 'posa', icon: 'posa', label: 'Posa' }, { id: 'cambia', icon: 'mano', label: 'Cambia' }], 'posa', id => {
      if (id === 'cambia') { openFloorSheet(G); G.fitCamera(false, true, sheetMargin()); UI.setActiveTool('posa'); }
    });
    UI.setProgress(0, true);
    St.think('Una tessera dopo l\'altra.');
  }

  function layAround(u, v, G) {
    const ff = G.room.floorFinish;
    const cx0 = Math.floor(u / CELL), cy0 = Math.floor(v / CELL);
    const cand = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = cx0 + dx, cy = cy0 + dy;
      if (cx < 0 || cy < 0 || cx >= ff.cw || cy >= ff.ch) continue;
      const d = U.dist((cx + 0.5) * CELL, (cy + 0.5) * CELL, u, v);
      if (d < CELL * 0.95 && ff.cells[cy * ff.cw + cx] === 0) cand.push({ cx, cy, d });
    }
    cand.sort((a, b) => a.d - b.d);
    cand.forEach((c, i) => queueCell(c.cx, c.cy, -i * 0.05, G));
    lastCell = [cx0, cy0];
  }
  function queueCell(cx, cy, delay, G) {
    const room = G.room, ff = room.floorFinish;
    ff.cells[cy * ff.cw + cx] = 1;
    room.floorAnim.push({ cx, cy, t: delay, tocked: false });
  }

  function updateTiles(dt, G) {
    const room = G.room, ff = room.floorFinish;
    if (!ff) return;
    const bctx = ff.baked.getContext('2d');
    for (let i = room.floorAnim.length - 1; i >= 0; i--) {
      const a = room.floorAnim[i];
      a.t += dt * 2.6;
      if (!a.tocked && a.t >= 0.36) {
        a.tocked = true;
        // un "toc" per tessera, ma senza saturare durante la cascata
        if (!autoDone || (tocN++ % 2 === 0)) A.play('toc', 0.85 + ((a.cx + a.cy) % 5) * 0.06);
        const q = room.floor.toView((a.cx + 0.5) * CELL, (a.cy + 0.5) * CELL);
        if (Math.random() < 0.5) P.dustPuff(q[0], q[1], 2, 'rgba(230,215,190,0.5)');
        if (!autoDone) { E.punch(0.002); U.vibrate(5); }
      }
      if (a.t >= 1) {
        bctx.drawImage(ff.tex, a.cx * CELL, a.cy * CELL, CELL, CELL, a.cx * CELL, a.cy * CELL, CELL, CELL);
        ff.cells[a.cy * ff.cw + a.cx] = 2;
        room.floorAnim.splice(i, 1);
      }
    }
    let laid = 0;
    for (let i = 0; i < ff.cells.length; i++) if (ff.cells[i]) laid++;
    const frac = laid / ff.cells.length;
    UI.setProgress(frac);
    // all'85%: le ultime tessere si posano da sole, a onda
    if (frac >= 0.85 && !autoDone) {
      autoDone = true;
      drag = null;
      const rest = [];
      const lc = lastCell || [0, 0];
      for (let cy = 0; cy < ff.ch; cy++) for (let cx = 0; cx < ff.cw; cx++) if (!ff.cells[cy * ff.cw + cx]) rest.push({ cx, cy, d: U.dist(cx, cy, lc[0], lc[1]) });
      rest.sort((a, b) => a.d - b.d);
      rest.forEach((c, i) => queueCell(c.cx, c.cy, -i * 0.045, G));

    }
    const settled = ff.cells.every(c => c === 2);
    if (settled && !finishedStep) {
      finishedStep = true;
      room.skirting = '#f3ece0';
      A.play('sparkle');
      room.floor.startShine();
      U.vibrate([10, 30, 10]);
      UI.toast('Pavimento posato!', 2000);
      E.after(1.4, () => { step++; startStep(G); });
    }
  }

  // ---------------- PARETI ----------------
  function openWallSheet(G, wid) {
    const lv = G.lv, name = wid === 'wallBack' ? 'la parete di fondo' : 'la parete sinistra';
    let html = `<h3>Come rivestiamo ${name}?</h3><div class="grid">`;
    lv.walls.paints.forEach(id => {
      const p = T.PAINTS.find(x => x.id === id);
      html += `<button class="choice" data-k="paint" data-id="${id}"><div class="sw" style="background:${p.hex}"></div>${p.name}<small>pittura</small></button>`;
    });
    lv.walls.papers.forEach(id => {
      html += `<button class="choice" data-k="paper" data-id="${id}"><canvas width="128" height="128"></canvas>${T.WALLPAPERS[id].name}<small>carta</small></button>`;
    });
    html += '</div>';
    UI.openSheet(html, el => {
      el.querySelectorAll('.choice').forEach(b => {
        const cv = b.querySelector('canvas');
        if (cv) setTimeout(() => cv.getContext('2d').drawImage(T.wallpaper(b.dataset.id, 128, 128), 0, 0), 0);
        b.onclick = () => { A.play('click'); chooseWall(G, wid, b.dataset.k, b.dataset.id); };
      });
    });
    // pulsazione sulla parete da rivestire
    G.highlightWall = wid;
  }

  function chooseWall(G, wid, kind, id) {
    const room = G.room, s = room.byId[wid];
    G.choices[wid] = { kind, id };
    UI.closeSheet();
    G.fitCamera(false, true);
    G.highlightWall = null;
    const fd = { kind, id, canvas: U.canvas(s.tw, s.th), blend: 0, strips: [] };
    if (kind === 'paint') {
      const col = T.PAINTS.find(x => x.id === id).hex;
      fd.color = col;
      // timbro del rullo già colorato
      const st = T.rollerBrush(60, 12), sc = st.getContext('2d');
      sc.globalCompositeOperation = 'source-in'; sc.fillStyle = col; sc.fillRect(0, 0, 60, 12);
      fd.stamp = st;
      fd.small = U.canvas(Math.ceil(s.tw / 8), Math.ceil(s.th / 8));
      R.Icons.paintColor = col;
      mode = 'paint';
      UI.toolbar([{ id: 'rullo', icon: 'rullo', label: 'Rullo' }, { id: 'cambia', icon: 'mano', label: 'Cambia' }], 'rullo', b => {
        if (b === 'cambia') { openWallSheet(G, wid); G.fitCamera(false, true, sheetMargin()); UI.setActiveTool('rullo'); }
      });
      St.think('Il colore va steso con calma.');
    } else {
      fd.paper = T.wallpaper(id, s.tw, s.th);
      const n = Math.ceil(s.tw / CELL);
      for (let i = 0; i < n; i++) fd.strips.push({ i, p: 0, state: 0 });
      mode = 'paper';
      UI.toolbar([{ id: 'carta', icon: 'carta', label: 'Carta' }, { id: 'cambia', icon: 'mano', label: 'Cambia' }], 'carta', b => {
        if (b === 'cambia') { openWallSheet(G, wid); G.fitCamera(false, true, sheetMargin()); UI.setActiveTool('carta'); }
      });
      St.think('Un telo alla volta, dall\'alto in basso.');
    }
    s.finishData = fd;
    s.finish = (ctx) => {
      if (fd.kind === 'paint') {
        ctx.globalAlpha = 0.93;
        ctx.drawImage(fd.canvas, 0, 0);
        if (fd.blend > 0) { ctx.globalAlpha = 0.93 * fd.blend; ctx.fillStyle = fd.color; ctx.fillRect(0, 0, s.tw, s.th); }
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(fd.canvas, 0, 0);
        for (const st of fd.strips) {
          if (st.state !== 1) continue;
          const x = st.i * CELL, h = s.th * st.p;
          ctx.drawImage(fd.paper, x, 0, CELL, Math.max(1, h), x, 0, CELL, Math.max(1, h));
          // il rotolo che scende
          const g = ctx.createLinearGradient(0, h - 8, 0, h + 8);
          g.addColorStop(0, '#d8cbb6'); g.addColorStop(0.5, '#f6efe3'); g.addColorStop(1, '#b8a88f');
          ctx.fillStyle = g; ctx.fillRect(x - 2, h - 8, CELL + 4, 16);
          ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 2, h + 8, CELL + 4, 4);
        }
      }
    };
    s.paintMeasureT = 0;
    UI.setProgress(0, true);
  }

  function paintAt(s, u, v, pu, pv) {
    const fd = s.finishData, c = fd.canvas.getContext('2d');
    const ang = Math.atan2(v - pv, u - pu) + Math.PI / 2;
    const len = U.dist(u, v, pu, pv), n = Math.max(1, Math.ceil(len / 4));
    for (let i = 1; i <= n; i++) {
      const x = U.lerp(pu, u, i / n), y = U.lerp(pv, v, i / n);
      c.save(); c.translate(x, y); c.rotate(isFinite(ang) && len > 0.5 ? ang : 0);
      c.globalAlpha = 0.32;
      c.drawImage(fd.stamp, -30, -6);
      c.restore();
    }
    fd.dirty = true;
    if (Math.random() < 0.04) { const q = s.toView(u, v); P.drip(q[0], q[1] + 4, U.sh(fd.color, -0.05, 0.9)); }
  }
  function paintCoverage(s) {
    const fd = s.finishData, sc = fd.small.getContext('2d', { willReadFrequently: true });
    sc.globalCompositeOperation = 'copy';
    sc.drawImage(fd.canvas, 0, 0, fd.small.width, fd.small.height);
    const d = sc.getImageData(0, 0, fd.small.width, fd.small.height).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i] > 200 ? 1 : d[i] / 255 * 0.8;
    return sum / (d.length / 4);
  }

  function startStrip(s, idx, G) {
    const st = s.finishData.strips[idx];
    if (!st || st.state) return;
    st.state = 1;
    A.play('unroll');
    E.tween(st, { p: 1 }, 0.7, U.ease.inOutQuad, () => {
      st.state = 2;
      const c = s.finishData.canvas.getContext('2d');
      c.drawImage(s.finishData.paper, st.i * CELL, 0, CELL, s.th, st.i * CELL, 0, CELL, s.th);
      const q = s.toView(st.i * CELL + CELL / 2, s.th - 10);
      P.dustPuff(q[0], q[1], 3, 'rgba(240,230,215,0.5)');
      A.play('toc', 0.7);
      checkWallDone(s, G);
    });
  }

  function checkWallDone(s, G) {
    const fd = s.finishData;
    let frac;
    if (fd.kind === 'paper') frac = fd.strips.filter(x => x.state === 2).length / fd.strips.length;
    else frac = Math.min(1, paintCoverage(s) / 0.9);
    if (!finishedStep) UI.setProgress(frac);
    if (fd.kind === 'paint' && frac >= 1 && !finishedStep) {
      // le ultime strisce si fondono in un colore uniforme
      finishedStep = true; drag = null;
      A.voice('roller', 0);
      E.tween(fd, { blend: 1 }, 1.0, U.ease.inOutQuad, () => {
        const c = fd.canvas.getContext('2d');
        c.globalAlpha = 1; c.fillStyle = fd.color; c.fillRect(0, 0, s.tw, s.th);
        fd.blend = 0;
        wallDone(s, G);
      });
    } else if (fd.kind === 'paper' && frac >= 1 && !finishedStep) {
      finishedStep = true;
      wallDone(s, G);
    }
  }

  function wallDone(s, G) {
    s.startShine();
    A.play('sparkle'); U.vibrate([10, 30, 10]);
    UI.setProgress(1);
    UI.toast(s.id === 'wallBack' ? 'Parete di fondo finita!' : 'Parete sinistra finita!', 2000);
    E.after(1.3, () => {
      step++;
      if (step < STEPS.length) startStep(G);
      else finishPhase(G);
    });
  }

  function finishPhase(G) {
    const room = G.room;
    UI.toolbar(null);
    // telai di porta e finestra riverniciati
    if (room.winState) room.winState.frame = '#f7f2ea';
    if (room.doorState) { room.doorState.color = '#efe6d8'; room.doorState.frame = '#f7f2ea'; }
    A.play('complete');
    St.think('Adesso è una casa vuota. Manca solo la vita.');
    E.after(1.2, () => UI.next('Avanti: arredo', () => G.next()));
  }

  // ---------------- input ----------------
  Ph.down = function (e) {
    const G = R.G;
    if (UI.sheetOpen() || finishedStep) return;
    drag = { last: null };
    Ph.move(e, true);
  };
  Ph.move = function (e, pressed) {
    const G = R.G, room = G.room;
    if (!pressed || !drag || finishedStep) return;
    const id = STEPS[step];
    if (mode === 'tiles') {
      const uv = room.floor.toUV(e.vx, e.vy);
      if (room.floor.inside(uv[0], uv[1], 10) && !autoDone) layAround(uv[0], uv[1], G);
    } else if (mode === 'paint' || mode === 'paper') {
      const s = room.byId[id];
      const uv = s.toUV(e.vx, e.vy);
      if (!s.inside(uv[0], uv[1], 4)) { drag.last = null; return; }
      if (mode === 'paint') {
        const last = drag.last || uv;
        paintAt(s, uv[0], uv[1], last[0], last[1]);
        A.voice('roller', U.clamp(U.dist(uv[0], uv[1], last[0], last[1]) / 12, 0.2, 1), 0.5);
      } else {
        startStrip(s, Math.floor(uv[0] / CELL), G);
      }
      drag.last = uv;
    }
  };
  Ph.up = function () { drag = null; A.voice('roller', 0); };
  Ph.cancel = Ph.up;

  Ph.update = function (dt, G) {
    if (mode === 'tiles') updateTiles(dt, G);
    if (mode === 'paint' && !finishedStep) {
      const s = G.room.byId[STEPS[step]];
      s.paintMeasureT += dt;
      if (s.paintMeasureT > 0.2 && s.finishData.dirty) { s.paintMeasureT = 0; s.finishData.dirty = false; checkWallDone(s, G); }
    }
  };

  // contorno pulsante della parete da scegliere
  Ph.drawWorld = function (ctx, G) {
    const wid = G.highlightWall;
    if (!wid) return;
    const o = G.room.byId[wid].outline();
    ctx.strokeStyle = `rgba(255,236,170,${0.5 + Math.sin(E.time * 4) * 0.35})`; ctx.lineWidth = 3;
    ctx.beginPath(); o.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
  };

  // luccichio: il centro della superficie su cui lavorare
  Ph.hintSpot = function (G) {
    if (UI.sheetOpen() || finishedStep || !mode) return null;
    const s = G.room.byId[STEPS[step]];
    if (mode === 'paper' && s.finishData) {
      const st = s.finishData.strips.find(x => !x.state);
      if (st) return s.toView(st.i * CELL + CELL / 2, s.th * 0.4);
    }
    return s.toView(s.tw / 2, s.th / 2);
  };

  Ph.exit = function (G) { drag = null; A.voice('roller', 0); G.highlightWall = null; };

  // salto (debug): scelte di gusto predefinite
  Ph.skip = function (G) {
    const room = G.room;
    G.choices = { floor: 'spina', wallBack: { kind: 'paint', id: 'salvia' }, wallLeft: { kind: 'paper', id: 'fiori' } };
    const fl = room.floor, tex = T.FLOORS.spina.fn(fl.tw, fl.th, G.lv.seed + 300);
    room.floorFinish = { tex, baked: tex };
    fl.finish = (ctx) => ctx.drawImage(tex, 0, 0);
    const p = T.PAINTS.find(x => x.id === 'salvia').hex;
    room.wallBack.finish = (ctx) => { ctx.globalAlpha = 0.93; ctx.fillStyle = p; ctx.fillRect(0, 0, room.wallBack.tw, room.wallBack.th); ctx.globalAlpha = 1; };
    const paper = T.wallpaper('fiori', room.wallLeft.tw, room.wallLeft.th);
    room.wallLeft.finish = (ctx) => ctx.drawImage(paper, 0, 0);
    room.skirting = '#f3ece0';
    if (room.winState) room.winState.frame = '#f7f2ea';
    if (room.doorState) { room.doorState.color = '#efe6d8'; room.doorState.frame = '#f7f2ea'; }
  };

  R.Phases.build = Ph;
})(window.R);

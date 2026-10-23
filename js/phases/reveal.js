/* =========================================================
   Fase 6 — RIVELAZIONE  (il premio emotivo)
   tramonto → notte → le lampade si accendono una a una →
   la porta si apre, entrano gli abitanti e si siedono →
   foto del DOPO, slider prima/dopo, stelle, album.
   Le stelle: Pulizia (pulito + ricordi trovati),
   Completezza (quantità e varietà di arredi),
   Armonia (coerenza di stile tra mobili, pavimento e pareti).
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, Iso = R.Iso, A = R.Audio, O = R.O, T = R.T;

  const Ph = { subtitle: '' };
  let result = null;

  Ph.enter = function (G) {
    const room = G.room;
    UI.hideAll();
    UI.showProgress(false);
    G.fitCamera(false, true, 40);
    for (const l of room.itemLights()) l.it.lightOn = 0;
    room.people.length = 0;
    // 1) tramonto
    E.after(1.0, () => { G.setMood('sunset', 3.0, { beam: 0.8 }); G.env.beamCol = [255, 170, 120]; room.setView('sunset'); A.play('whoosh', true); });
    // 2) notte
    E.after(4.5, () => { G.setMood('night', 3.0, { beam: 0 }); E.after(1.4, () => room.setView('night')); });
    // 3) luci una a una
    const lights = room.itemLights();
    let t = 7.6;
    lights.forEach((l, i) => {
      E.after(t + i * 0.8, () => {
        A.play('switch');
        E.tween(l.it, { lightOn: 1 }, 0.35, U.ease.outQuad);
        // piccolo sfarfallio iniziale
        E.after(0.1, () => { l.it.lightOn = 0.3; E.tween(l.it, { lightOn: 1 }, 0.3); });
      });
    });
    if (!lights.length) { // nessuna lampada: una luce calda dal soffitto
      E.after(t, () => { A.play('switch'); G.lightsExtra = [{ x: room.W / 2, y: room.D / 2, z: room.H - 0.4, r: 6, col: [255, 200, 140], i: 1 }]; });
    }
    t += lights.length * 0.8 + 1.0;
    // 4) arrivano gli abitanti
    E.after(t, () => residentsArrive(G));
    E.after(t + 6.5, () => finale(G));
  };

  function seatSpots(room) {
    const spots = [];
    for (const it of room.items) {
      const def = O.ITEMS[it.id];
      if (!def.seat || def.layer !== 'floor' || it.id === 'tavolino') continue;
      const f = O.footprint(def, it.rot);
      if (it.id === 'divano') {
        // due posti lungo il lato lungo
        if (f[0] > f[1]) { spots.push([it.x + f[0] * 0.33, it.y + f[1] * 0.55, def.seat]); spots.push([it.x + f[0] * 0.67, it.y + f[1] * 0.55, def.seat]); }
        else { spots.push([it.x + f[0] * 0.55, it.y + f[1] * 0.33, def.seat]); spots.push([it.x + f[0] * 0.55, it.y + f[1] * 0.67, def.seat]); }
      } else spots.push([it.x + f[0] / 2, it.y + f[1] / 2, def.seat]);
    }
    return spots;
  }

  function residentsArrive(G) {
    const room = G.room, lv = G.lv;
    if (!room.doorWorld) return;
    E.tween(room.doorState, { open: 0.85 }, 0.8, U.ease.outQuad);
    A.play('switch');
    const spots = seatSpots(room);
    const dy = (room.doorWorld.y0 + room.doorWorld.y1) / 2;
    lv.residents.forEach((r, i) => {
      E.after(0.6 + i * 1.1, () => {
        const sp = spots[i] || [room.W / 2 + i * 0.8, room.D / 2 + 0.6, 0];
        const p = { x: 0.15, y: dy, col: r.col, h: r.h, fadeIn: 0, speed: 1.5, path: [[0.9, dy], [sp[0], Math.max(sp[1], 0.8) + 0.9], [sp[0], sp[1]]] };
        p.onArrive = () => { p.seated = sp[2] > 0; p.seatZ = sp[2] * 0.6; A.play('soft'); if (i === 0 && room.items.some(it => it.id === 'gatto')) E.after(0.8, () => A.play('purr')); };
        room.people.push(p);
        A.play('toc', 0.6); E.after(0.35, () => A.play('toc', 0.65));
      });
    });
    // se nessun gatto è stato messo, ne arriva uno dalla porta: era quello che guardava dalla finestra
    if (!room.items.some(it => it.id === 'gatto')) {
      E.after(2.6, () => {
        const sp = spots[lv.residents.length] || spots[0] || [room.W / 2, room.D / 2, 0.04];
        const cat = { id: 'gatto', x: sp[0] - 0.4, y: sp[1] - 0.4, rot: 0, style: 'boho', z: sp[2] || 0.04, baseZ: sp[2] || 0.04, catColor: [70, 64, 72] };
        room.items.push(cat);
        R.P.sparkle(R.Iso.p(sp[0], sp[1], 0.5)[0], R.Iso.p(sp[0], sp[1], 0.5)[1], 8, 14);
        A.play('purr');
        E.after(1.2, () => R.Story.think('Un gatto nero si è infilato dalla porta. Si accoccola come se fosse casa sua. Briciola II.'));
      });
    }
    E.after(3.6, () => E.tween(room.doorState, { open: 0 }, 1.0));
  }

  // ---------- punteggio ----------
  function score(G) {
    const room = G.room;
    const all = R.Story.allMemories(G.lv);
    const found = all.filter(m => R.Story.found.has(m.id)).length, tot = all.length;
    const pul = 2 + (tot && found === tot ? 1 : 0) - (tot && found === 0 ? 1 : 0);
    const items = room.items;
    const cats = new Set(items.map(i => O.ITEMS[i.id].cat));
    const comp = items.length >= 10 && cats.size >= 6 ? 3 : items.length >= 7 && cats.size >= 4 ? 2 : 1;
    // stile dominante e coerenza
    const cnt = {};
    for (const i of items) cnt[i.style] = (cnt[i.style] || 0) + 1;
    let dom = 'nordico', best = 0;
    for (const k in cnt) if (cnt[k] > best) { best = cnt[k]; dom = k; }
    let coh = items.length ? best / items.length : 0;
    const ch = G.choices || {};
    let bonus = 0;
    if (ch.floor && T.FLOORS[ch.floor].style.includes(dom)) bonus++;
    for (const w of ['wallBack', 'wallLeft']) {
      const c = ch[w];
      if (!c) continue;
      const st = c.kind === 'paint' ? (T.PAINTS.find(p => p.id === c.id) || {}).style : (T.WALLPAPERS[c.id] || {}).style;
      if (st && st.includes(dom)) bonus++;
    }
    coh = coh * 0.7 + bonus / 3 * 0.3;
    const arm = coh >= 0.8 ? 3 : coh >= 0.55 ? 2 : 1;
    const stars = Math.round((pul + comp + arm) / 3);
    return { pul, comp, arm, stars, dom, found, tot };
  }

  function starsHtml(n, delay) {
    let h = '';
    for (let i = 0; i < 3; i++) h += i < n ? `<b style="animation-delay:${delay + i * 0.18}s">★</b>` : '★';
    return h;
  }

  function finale(G) {
    const room = G.room, lv = G.lv;
    G.photos.after = G.photo();
    G.shutter();
    result = score(G);
    // l'album salva foto più piccole per non riempire la memoria
    const small = (url) => new Promise(res => {
      const img = new Image();
      img.onload = () => { const c = U.canvas(400, 300); c.getContext('2d').drawImage(img, 0, 0, 400, 300); res(c.toDataURL('image/jpeg', 0.75)); };
      img.onerror = () => res(url);
      img.src = url;
    });
    Promise.all([small(G.photos.before), small(G.photos.after)]).then(([b, a]) => {
      R.Save.levelDone(lv.id, { name: lv.name, before: b, after: a, stars: result.stars });
    });
    E.after(1.0, () => showResults(G));
  }

  function showResults(G) {
    const lv = G.lv, r = result;
    const styleName = O.STYLES[r.dom] ? O.STYLES[r.dom].name : '';
    UI.modal(`
      <h2>${lv.name}</h2>
      <div class="ba" id="ba">
        <img src="${G.photos.before}" alt="prima">
        <div class="after-wrap"><img src="${G.photos.after}" alt="dopo"></div>
        <div class="handle"></div>
        <span class="lbl" style="left:10px">PRIMA</span><span class="lbl" style="right:10px">DOPO</span>
      </div>
      <div class="stars">
        <div class="line"><span>Pulizia${r.tot ? ` · ricordi ${r.found}/${r.tot}` : ''}</span><span class="s">${starsHtml(r.pul, 0.3)}</span></div>
        <div class="line"><span>Completezza</span><span class="s">${starsHtml(r.comp, 0.9)}</span></div>
        <div class="line"><span>Armonia${styleName ? ' · ' + styleName.toLowerCase() : ''}</span><span class="s">${starsHtml(r.arm, 1.5)}</span></div>
      </div>
      <p>${lv.ending}</p>
      <p style="font-size:13px;text-align:center">📔 Aggiunto all'album dei prima/dopo</p>
      <div class="row">
        <button class="btn ghost" id="r-stay">Resta a guardare</button>
        <button class="btn" id="r-again">Ricomincia</button>
      </div>
      <p style="font-size:12px;text-align:center;color:#a09092">Prossimi luoghi in arrivo: il canale, la villa a sfioro, il faro…</p>`,
    box => {
      // slider prima/dopo trascinabile
      const ba = box.querySelector('#ba'), wrap = ba.querySelector('.after-wrap'), hd = ba.querySelector('.handle');
      const set = (x) => {
        const rc = ba.getBoundingClientRect();
        const f = U.clamp((x - rc.left) / rc.width, 0, 1);
        wrap.style.clipPath = `inset(0 0 0 ${f * 100}%)`;
        hd.style.left = (f * 100) + '%';
      };
      let on = false;
      ba.addEventListener('pointerdown', e => { on = true; ba.setPointerCapture(e.pointerId); set(e.clientX); A.play('soft'); });
      ba.addEventListener('pointermove', e => { if (on) set(e.clientX); });
      ba.addEventListener('pointerup', () => { on = false; });
      // animazione iniziale dello slider: un "respiro" da prima a dopo
      const k = { f: 0.95 };
      E.tween(k, { f: 0.05 }, 1.6, U.ease.inOutCubic);
      const anim = () => { if (!on) { wrap.style.clipPath = `inset(0 0 0 ${k.f * 100}%)`; hd.style.left = (k.f * 100) + '%'; } if (k.f > 0.051) requestAnimationFrame(anim); };
      requestAnimationFrame(anim);
      [r.pul, r.comp, r.arm].forEach((n, i) => { for (let s = 0; s < n; s++) setTimeout(() => A.play('star', s), (300 + i * 600 + s * 180)); });
      box.querySelector('#r-stay').onclick = () => { A.play('click'); UI.closeModal(); UI.next('Rivedi il risultato', () => showResults(G), true); };
      box.querySelector('#r-again').onclick = () => { A.play('click'); location.hash = ''; location.reload(); };
    });
  }

  Ph.update = function () {};
  Ph.down = function () {};
  Ph.exit = function () {};

  R.Phases.reveal = Ph;
})(window.R);

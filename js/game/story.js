/* =========================================================
   story.js — la storia e l'esplorazione
   - chi gioca non riceve istruzioni: riceve PENSIERI vaghi
   - gli attrezzi non sono dati: si TROVANO (sotto i detriti,
     nel fango, dietro una porta) e ognuno racconta un pezzo
     della vita di chi abitava la casa
   - se si resta fermi a lungo, un luccichio indica dove guardare
     (mai una freccia, mai "fai questo")
   - il DIARIO raccoglie tutto ciò che è stato trovato
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, E = R.E, UI = R.UI, P = R.P, A = R.Audio;

  const S = {
    inv: new Set(),     // attrezzi trovati
    found: new Set(),   // ricordi trovati (id)
    idle: 0, glimmer: null, said: {}, thoughtIdx: {}
  };

  S.reset = function () {
    S.inv = new Set(); S.found = new Set(); S.idle = 0; S.glimmer = null; S.said = {}; S.thoughtIdx = {};
  };
  S.has = id => S.inv.has(id);

  // tutti i ricordi del livello: oggetti nascosti + collezionabili nello sporco
  S.allMemories = function (lv) {
    const out = [];
    const f = lv.story.finds;
    for (const id in f) out.push(Object.assign({ id }, f[id]));
    for (const c of lv.collectibles || []) out.push(c);
    return out;
  };

  // ---------- trovare qualcosa ----------
  // def = { id, icon, title, text, gives }, at = punto vista per le scintille
  S.find = function (def, at, onClose) {
    if (S.found.has(def.id)) { if (onClose) onClose(); return false; }
    S.found.add(def.id);
    const gives = def.gives || [];
    gives.forEach(g => S.inv.add(g));
    if (at) P.sparkle(at[0], at[1], 16, 14);
    A.play('sparkle'); A.play('bell', 988, 0.14);
    U.vibrate([10, 40, 10]);
    const tools = gives.filter(g => R.Tools.defs[g]).map(g => R.Tools.defs[g]);
    const toolsHtml = tools.length
      ? `<div class="found-tools">${tools.map(t => `<div><img src="${R.Icons.url(t.icon, 144)}" alt=""><span>${t.name}</span></div>`).join('')}</div>` : '';
    const isLetter = def.icon === 'lettera' || def.icon === 'foto' || def.icon === 'moneta';
    UI.modal(`
      <div class="found-head"><img src="${R.Icons.url(def.icon || 'lettera', 144)}" alt=""><h2>${def.title}</h2></div>
      <div class="${isLetter ? 'letter' : 'found-text'}">${def.text.replace(/\n/g, '<br>')}</div>
      ${toolsHtml}
      <div class="row"><button class="btn" id="m-ok">Continua</button></div>`,
    box => box.querySelector('#m-ok').onclick = () => {
      A.play('click'); UI.closeModal();
      UI.pulseJournal();
      if (onClose) onClose();
    });
    return true;
  };

  // ---------- pensieri ----------
  S.think = function (text, ms) { if (text) UI.thought(text, ms); };
  // il prossimo pensiero della lista di una fase (a rotazione, senza ripetere subito)
  S.nextThought = function (lv, key) {
    const list = lv.story.thoughts[key];
    if (!list || !list.length) return;
    const i = S.thoughtIdx[key] || 0;
    S.thoughtIdx[key] = i + 1;
    S.think(list[i % list.length]);
  };
  // pensiero detto una volta sola
  S.once = function (key, text, ms) { if (S.said[key]) return; S.said[key] = true; S.think(text, ms); };

  // ---------- inattività: luccichio e pensieri ----------
  // la fase può offrire hintSpot(G) → [vx, vy] del punto più interessante
  S.input = function () { S.idle = 0; };
  S.update = function (dt, G) {
    if (UI.modalOpen() || UI.sheetOpen() || !G.phase) { S.idle = 0; return; }
    S.idle += dt;
    if (S.glimmer) { S.glimmer.t += dt; if (S.glimmer.t > 4) S.glimmer = null; }
    if (S.idle > 10 && !S.glimmer && G.phase.hintSpot) {
      const p = G.phase.hintSpot(G);
      if (p) { S.glimmer = { vx: p[0], vy: p[1], t: 0 }; P.sparkle(p[0], p[1], 6, 10); A.play('sparkle'); }
    }
    if (S.idle > 22) {
      S.idle = 4; // il prossimo luccichio arriverà un po' prima
      S.nextThought(G.lv, G.PHASES[G.phaseIdx]);
    }
  };
  S.drawGlimmer = function (ctx) {
    const g = S.glimmer;
    if (!g) return;
    const k = (g.t * 1.1) % 1;
    ctx.strokeStyle = `rgba(255,236,170,${0.85 * (1 - k) * Math.min(1, (4 - g.t))})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(g.vx, g.vy, 6 + k * 24, (6 + k * 24) * 0.7, 0, 0, U.TAU); ctx.stroke();
  };

  // ---------- diario ----------
  S.journal = function (lv) {
    const all = S.allMemories(lv);
    const got = all.filter(m => S.found.has(m.id));
    let html = `<h2>Diario della casa</h2><p>${got.length} ricordi su ${all.length}</p><div class="journal">`;
    got.forEach(m => {
      html += `<div class="jitem"><img src="${R.Icons.url(m.icon || 'lettera', 96)}" alt=""><div><b>${m.title}</b><span>${m.text.replace(/\n/g, '<br>')}</span></div></div>`;
    });
    for (let i = got.length; i < all.length; i++) html += '<div class="jitem missing"><div class="q">?</div><div><b>Ancora da scoprire</b></div></div>';
    html += '</div><div class="row"><button class="btn" id="m-ok">Chiudi</button></div>';
    UI.modal(html, box => box.querySelector('#m-ok').onclick = () => { A.play('click'); UI.closeModal(); });
  };

  R.Story = S;
})(window.R);

/* =========================================================
   tools.js — gli strumenti di pulizia
   radius: raggio in unità del mondo; power: forza per timbro;
   spacing: distanza tra i timbri (frazione del raggio);
   eff: efficacia per tipo di sporco (lo strumento giusto dà
   il piacere, quello sbagliato funziona appena: mai bloccante);
   continuous: agisce anche a dito fermo (getto, aspirazione);
   offset: su touch il punto d'azione sta sopra il dito,
   così il dito non copre lo sporco.
   ========================================================= */
(function (R) {
  'use strict';
  const T = R.T, Iso = R.Iso;

  const Tools = {};

  Tools.defs = {
    spugna: {
      id: 'spugna', name: 'Spugna', art: 'la spugna', icon: 'spugna', voice: 'sponge',
      radius: 0.42, power: 0.11, spacing: 0.2, wet: 0.35, stamp: 'sponge',
      eff: { dust: 0.6, cobweb: 0.35, mud: 0.2, stain: 1, mold: 0.8, grime: 1, graffiti: 0.3, peel: 0.04 },
      hint: 'Strofina avanti e indietro: la schiuma scioglie macchie, aloni e muffa.'
    },
    idropulitrice: {
      id: 'idropulitrice', name: 'Idropulitrice', art: 'l\'idropulitrice', icon: 'idropulitrice', voice: 'washer',
      radius: 0.15, power: 0.6, spacing: 0.25, wet: 0.7, stamp: 'hard', continuous: true, offset: 70,
      eff: { dust: 1, cobweb: 0.7, mud: 0.55, stain: 0.8, mold: 1, grime: 1, graffiti: 1, peel: 0.18 },
      hint: 'Tieni premuto e trascina: il getto scopre strisce nette. Perfetto sui graffiti.'
    },
    aspirapolvere: {
      id: 'aspirapolvere', name: 'Aspirapolvere', art: 'l\'aspirapolvere', icon: 'aspirapolvere', voice: 'vacuum',
      radius: 0.62, power: 0.2, spacing: 0.22, stamp: 'soft', continuous: true,
      eff: { dust: 1, cobweb: 1, mud: 0.03, stain: 0, mold: 0.1, grime: 0.1, graffiti: 0, peel: 0.05 },
      hint: 'Passa lentamente: polvere e ragnatele vengono risucchiate.'
    },
    raschietto: {
      id: 'raschietto', name: 'Raschietto', art: 'il raschietto', icon: 'raschietto', voice: 'scraper',
      radius: 0.26, power: 0.55, spacing: 0.18, stamp: 'blade', offset: 40,
      eff: { peel: 1, mold: 0.35, mud: 0.25, graffiti: 0.25, dust: 0.25, cobweb: 0.3, stain: 0.2, grime: 0.15 },
      hint: 'Raschia la vecchia vernice: si stacca a scaglie.'
    },
    pala: {
      id: 'pala', name: 'Pala', art: 'la pala', icon: 'pala', voice: 'shovel', floorOnly: true,
      radius: 0.55, power: 0.45, spacing: 0.25, stamp: 'soft',
      eff: { mud: 1, dust: 0.12, stain: 0, mold: 0, grime: 0, graffiti: 0, peel: 0, cobweb: 0 },
      hint: 'Spala il fango: finisce in un mucchietto nell\'angolo.'
    }
  };
  Tools.order = ['spugna', 'aspirapolvere', 'idropulitrice', 'raschietto', 'pala'];

  // suggerimento: lo strumento migliore per un tipo di sporco
  Tools.bestFor = function (type, available) {
    let best = null, be = 0;
    for (const id of available) { const e = Tools.defs[id].eff[type] || 0; if (e > be) { be = e; best = id; } }
    return best;
  };

  // timbri (canvas) costruiti una volta per strumento
  const stamps = {};
  Tools.stamp = function (tool) {
    if (stamps[tool.id]) return stamps[tool.id];
    const r = Math.round(tool.radius * Iso.PPU);
    let c;
    if (tool.stamp === 'sponge') c = T.spongeBrush(r);
    else if (tool.stamp === 'hard') c = T.softBrush(r, 0.8);
    else if (tool.stamp === 'blade') {
      // lama: rettangolo stretto e lungo (ruotato secondo la direzione del gesto)
      c = R.U.canvas(r * 2, Math.max(6, r * 0.5));
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, r * 2, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, 'rgba(0,0,0,1)'); g.addColorStop(0.85, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, r * 2, c.height);
    } else c = T.softBrush(r, 0.45);
    return (stamps[tool.id] = c);
  };

  R.Tools = Tools;
})(window.R);

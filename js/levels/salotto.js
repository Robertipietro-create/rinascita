/* =========================================================
   Livello 1 — IL SALOTTO DI NONNA ADELE (tutorial)
   Coordinate: unità del mondo (≈ 50 cm).
   Pareti: u lungo la parete, v dall'alto verso il basso.
   ========================================================= */
(function (R) {
  'use strict';
  R.Levels = R.Levels || {};

  R.Levels.salotto = {
    id: 'salotto',
    chapter: 1,
    name: 'Il salotto di nonna Adele',
    intro: 'Chiuso da trent\'anni. È ora di riaprire le finestre.',
    seed: 1974,
    room: { W: 8, D: 7, H: 4.6 },
    palette: { slab: '#9a7b63', cap: '#efe4d3' },
    plaster: '#eadcc5',
    scenery: 'colline',

    window: { u: 4.9, w: 2.4, top: 0.9, h: 2.0, broken: [0, 1, 0, 1] },
    door: { u: 5.3, w: 1.5, h: 3.4 },

    // sporco per superficie (ordine = ordine di disegno)
    dirt: {
      floor: [
        { type: 'stain', n: 7 },
        { type: 'dust', amount: 0.78 },
        { type: 'mud', blobs: 4 }
      ],
      wallBack: [
        { type: 'grime' },
        { type: 'mold', where: 'bottom' },
        { type: 'graffiti', area: [0.05, 0.32, 0.4, 0.9] },
        { type: 'cobweb', corners: [[0, 0]] }
      ],
      wallLeft: [
        { type: 'peel', color: '#a3b89c' },
        { type: 'dust', amount: 0.32 },
        { type: 'cobweb', corners: [[0, 0]] }
      ]
    },

    debris: [
      { kind: 'sacco', x: 1.4, y: 1.8 }, { kind: 'sacco', x: 6.3, y: 5.6, a: 0.8 },
      { kind: 'bottiglia', x: 3.6, y: 4.3 }, { kind: 'bottiglia', x: 4.3, y: 1.5 },
      { kind: 'lattina', x: 2.7, y: 5.7 }, { kind: 'pneumatico', x: 5.8, y: 2.6 },
      { kind: 'sedia', x: 2.3, y: 3.1 }, { kind: 'assi', x: 4.6, y: 5.2, hides: 'pala' },
      { kind: 'calcinacci', x: 1.3, y: 5.3, a: 0.3 }, { kind: 'scatola', x: 6.7, y: 1.2, hides: 'spugna' },
      { kind: 'giornali', x: 3.4, y: 2.0, hides: 'lettera-1975' }, { kind: 'ramo', x: 5.0, y: 4.0 }
    ],
    skip: { x: 9.0, y: 1.2, w: 2.4, d: 3.6, h: 1.3 },
    heap: { x: 7.2, y: 6.2 },

    cracks: [
      { wall: 'wallBack', pts: [[1.1, 0.5], [1.7, 1.5], [1.35, 2.4], [1.9, 3.2]] },
      { wall: 'wallLeft', pts: [[1.4, 1.6], [2.4, 2.2], [2.9, 3.3]] }
    ],
    rotten: [
      { u: 2.0, row: 8, len: 2.2 }, { u: 2.5, row: 9, len: 2.0 },
      { u: 5.0, row: 3, len: 1.8 }, { u: 5.4, row: 4, len: 1.6 }
    ],

    collectibles: [
      { id: 'foto-adele', surface: 'floor', u: 5.7, v: 4.5, icon: 'foto', title: 'Una vecchia fotografia',
        text: 'Estate 1974. Una donna ride su un divano a fiori, un gatto rosso in braccio. Sul retro, a matita: «Adele e Briciola, il primo giorno nella casa nuova».' },
      { id: 'lire-1956', surface: 'floor', u: 1.6, v: 5.6, icon: 'moneta', title: '100 lire del 1956',
        text: 'Era incastrata tra due assi. Forse caduta da una tasca, forse messa lì apposta, per portare fortuna alla casa.' },
      { id: 'chiave-cantina', surface: 'floor', u: 2.6, v: 3.4, icon: 'chiave', title: 'Una chiave arrugginita',
        text: 'Dal fango spunta una chiave con un\'etichetta scolorita: «cantina». Laggiù Nino teneva le sue macchine. C\'è ancora la sua idropulitrice, avvolta in un telo.',
        gives: ['idropulitrice'] }
    ],

    // ---------------- LA STORIA ----------------
    // Il giocatore è chi ha ereditato la casa. Nessuna istruzione esplicita:
    // pensieri, oggetti trovati, lettere. Gli attrezzi si scoprono esplorando.
    story: {
      // cose da scoprire: debris.hides, collectibles, punti speciali (porta, finestra, sotto le assi)
      finds: {
        'spugna': { icon: 'spugna', title: 'Un secchio e una spugna', text: 'Dentro lo scatolone c\'è il secchio di Adele, con una spugna gialla ancora morbida. Come se l\'avesse lasciata lì ieri.', gives: ['spugna'] },
        'pala': { icon: 'pala', title: 'La pala di Nino', text: 'Sotto le assi c\'è una pala. Il manico è consumato proprio dove la teneva lui.', gives: ['pala'] },
        'lettera-1975': { icon: 'lettera', title: 'Lettera, primavera 1975', text: 'Caro Nino, la casa è piccola, ma la luce di questa finestra vale tutto. Briciola ha già scelto il suo posto: il davanzale. Torna presto, ti aspetto per cena. — A.' },
        'ripostiglio': { icon: 'aspirapolvere', title: 'Il ripostiglio', text: 'Dietro la porta, nel sottoscala: un aspirapolvere arancione degli anni Ottanta e la cassetta degli attrezzi di Nino. Raschietto, spatola, martello. Tutto in ordine.', gives: ['aspirapolvere', 'raschietto', 'attrezzi'] },
        'latta': { icon: 'lettera', title: 'Una scatola di latta', text: 'Sotto le assi marce, una scatola di biscotti piena di lettere legate con un nastro. L\'ultima è indirizzata a te.\n\n«A chi riaprirà le finestre: non lasciare che la casa resti al buio. Metti un divano dove batte il sole, e tieni un posto per un gatto. — Adele, 1994»' }
      },
      // pensieri: guidano senza dire cosa fare
      intro: ['Trent\'anni di silenzio.', 'Le imposte sono chiuse. Da qualche parte filtra un filo di luce…'],
      thoughts: {
        discovery: ['Qui dentro non si vede niente.', 'Quel filo di luce… viene dalla finestra.'],
        clearing: ['Prima di tutto, fare spazio.', 'Quanta roba accumulata. Chissà cosa c\'è sotto.', 'Il cassone fuori aspetta.'],
        cleaning: ['Sotto la polvere c\'è ancora la casa di Adele.', 'Certe macchie non vengono via con le mani.', 'Chissà dove teneva le sue cose Nino…', 'Quella porta. Non l\'ho ancora aperta.'],
        cleaningStuck: 'Questo non viene via così… forse serve altro.',
        locked: 'Non l\'ho ancora trovato. Devo cercare meglio.',
        repair: ['La casa ha qualche ferita.', 'Il vento entra ancora dalla finestra.', 'Quelle assi scricchiolano in modo strano.'],
        build: ['Ora si può scegliere. Cosa le sarebbe piaciuto?'],
        decor: ['Un divano dove batte il sole…', 'E un posto per un gatto.']
      },
      cat: 'Briciola II'
    },

    decor: {
      minItems: 5,
      catalog: ['divano', 'poltrona', 'tavolino', 'tappeto', 'tappetoTondo', 'lampada', 'lampadaTavolo', 'pianta', 'monstera',
        'libreria', 'credenza', 'camino', 'pouf', 'gatto', 'quadro', 'specchio', 'mensola', 'tende']
    },
    floors: ['spina', 'cotto', 'cementine', 'recupero', 'microcemento'],
    walls: { paints: ['salvia', 'cipria', 'latte', 'terracotta', 'cielo', 'ocra'], papers: ['fiori', 'righe', 'foglie', 'ventagli'] },

    residents: [{ col: '#c98f7a', h: 1.0 }, { col: '#7f9db3', h: 1.1 }],
    ending: 'Le finestre sono di nuovo aperte. Questa sera, nel salotto di Adele, si torna a ridere.'
  };
})(window.R);

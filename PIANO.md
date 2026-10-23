# RINASCITA — Piano del progetto

Gioco rilassante di pulizia e ristrutturazione: luoghi abbandonati che rinascono, gesto dopo gesto.
Priorità assoluta: il **game feel** del prima/dopo.

## Scelte tecniche (e perché)

| Scelta | Motivo |
|---|---|
| HTML + CSS + JS vanilla, **script classici** (non ES module) con un namespace globale `R` | I moduli ES non si caricano da `file://` (blocco CORS): così il gioco parte anche con doppio clic su `index.html`. Ogni file resta un modulo logico separato. |
| Canvas 2D, proiezione isometrica 2:1 | Ogni superficie (pavimento, pareti) è un **piano**: in isometria un piano è una trasformazione affine, quindi ogni superficie vive nella *sua* texture (spazio UV) e viene disegnata con `setTransform`. Le maschere di sporco stanno nello stesso spazio UV: strofinare = invertire la matrice e cancellare nella texture. Preciso ed economico. |
| Sporco = più livelli-maschera per superficie (polvere, fango, muffa, graffiti, vernice scrostata, macchie, ragnatele) | Ogni strumento ha un'efficacia diversa per tipo di sporco: lo strumento giusto dà il piacere, quello sbagliato funziona appena (mai bloccante, solo un suggerimento). |
| Percentuale pulita misurata su una copia ridotta (48×48) della maschera, solo per i livelli modificati, ~4 volte al secondo | `getImageData` su 512×512 a ogni frame ucciderebbe l'iPhone; sul ridotto costa quasi zero ed è accurato. |
| "Ultimi pixel" regalati: sotto il 3% residuo il livello si dissolve da solo | Inseguire gli ultimi puntini è frustrante, non rilassante. |
| Texture e suoni 100% procedurali (rumore fbm, Web Audio) | Vincolo "niente asset" e peso minimo per la PWA. |
| DOM per l'interfaccia, canvas per il mondo | Pulsanti grandi, accessibili e nitidi su iPhone senza ridisegnarli a mano. |
| Pixel ratio limitato a 2 | 60 fps su iPhone. |

## Struttura

```
index.html            avvio, ordine degli script
css/style.css         interfaccia
js/core/util.js       matematica, RNG con seed, rumore, easing, colori
js/core/engine.js     loop, canvas, camera (pinch/zoom), input, tween
js/audio/audio.js     sintetizzatore Web Audio (scrub, getto, risucchio, pop, toc, campanelli…)
js/render/iso.js      proiezione isometrica, trasformazioni delle superfici, solidi
js/render/textures.js texture procedurali (intonaco, legno, materiali, carte da parati, sporco)
js/render/particles.js particelle (bolle, schizzi, scaglie, polvere, scintille)
js/render/scene.js    disegno del diorama, luce, finestra, porta
js/game/surface.js    superficie con livelli di sporco e pittura, pennello, misura
js/game/tools.js      strumenti di pulizia ed effetti
js/game/objects.js    detriti e catalogo mobili (disegno procedurale per stili)
js/phases/*.js        una fase per file: scoperta, sgombero, pulizia, riparazione, costruzione, arredo, rivelazione
js/levels/*.js        luoghi fatti a mano
js/generator/         (M4) generatore procedurale con seed
js/save/save.js       salvataggio localStorage
js/ui/ui.js           HUD, barre, pannelli, transizioni
js/main.js            avvio e regia del livello
```

## Storia ed esplorazione (principio guida)
- **Mai istruzioni esplicite.** Chi gioca riceve *pensieri* vaghi (voce interiore, in corsivo), non ordini.
- **Gli attrezzi si trovano**, non si ricevono: sotto i detriti, nel fango, dietro una porta. Ogni ritrovamento racconta un pezzo della vita di chi abitava il luogo (lettere, foto, oggetti) e finisce nel **Diario**.
- **Se si resta fermi** ~10 s compare solo un luccichio sul punto più interessante; dopo ~20 s un altro pensiero. Mai frecce.
- Gli attrezzi non ancora trovati appaiono come sagome spente "?" nella barra: si sa che esistono, non dove sono.
- **Qualità grafica sempre al massimo**, nessuna impostazione per il giocatore.

Salotto: Adele (la nonna), Nino (il marito, le sue macchine in cantina), Briciola (la gatta). Ritrovamenti: lettera del 1975 sotto i giornali, spugna nello scatolone, pala sotto le assi, aspirapolvere e attrezzi nel ripostiglio dietro la porta, foto e 100 lire sotto la polvere, chiave della cantina nel fango (→ idropulitrice), scatola di latta con l'ultima lettera sotto un'asse marcia. Un gatto nero sbircia ogni tanto dalla finestra: alla fine entra e resta.

## Fasi di un luogo
1. **Scoperta** – buio, polvere sospesa, raggio di luce; foto del PRIMA.
2. **Sgombero** – detriti trascinabili con fisica semplice → cassone che si riempie e viene portato via.
3. **Pulizia** – maschere di sporco, 5 strumenti, particelle, luccichio al 100%. La stanza si illumina man mano che si pulisce.
4. **Riparazione** – crepe da stuccare, vetri, assi marce da demolire (e scavo nei livelli sotterranei).
5. **Costruzione** – pavimento tessera per tessera, pittura a rullo, carta da parati che si srotola.
6. **Arredo** – catalogo, griglia isometrica con snap, rotazione, stili.
7. **Rivelazione** – luci una a una, tramonto → notte, abitanti, slider prima/dopo, stelle.

## Milestone
1. **Motore + Salotto completo** in tutte le fasi, curato al massimo nella pulizia. ✅ *fatto*
2. Strumenti sbloccabili, monete, salvataggio, album prima/dopo, collezionabili.
3. Canale, Villa a sfioro, Faro, Tana sotterranea (scavo a strati).
4. Generatore procedurale con seed + richieste dei clienti.
5. PWA offline, audio rifinito e musica, modalità Zen, giorno/notte e meteo.
6. Tutti gli altri luoghi e rifinitura.

## Come provarlo
- Doppio clic su `index.html`, oppure: `cd ~/rinascita && python3 -m http.server 8000` → http://localhost:8000
- Su iPhone (stessa rete Wi-Fi): http://IP-DEL-MAC:8000 (l'IP si legge con `ipconfig getifaddr en0`)
- Saltare a una fase (per provare): `index.html#fase=pulizia` (anche `sgombero`, `riparazione`, `costruzione`, `arredo`, `rivelazione`); le fasi precedenti vengono completate all'istante con scelte predefinite.
- Gesti: un dito = strumento; due dita = zoom e spostamento; rotellina = zoom.

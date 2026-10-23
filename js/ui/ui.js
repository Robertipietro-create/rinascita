/* =========================================================
   ui.js — interfaccia DOM sopra il canvas
   barra di fase, barra di avanzamento con traguardi 25/50/75/100,
   barra strumenti, pannelli di scelta, toast, cartellini, modali.
   ========================================================= */
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);
  const UI = { milestone: -1, lastFrac: 0 };

  UI.init = function () {
    UI.el = {
      top: $('topbar'), phaseName: $('phase-name'), dots: $('phase-dots'),
      prog: $('progress'), fill: $('progress-fill'), pct: $('progress-pct'),
      tasks: $('tasks'), toolbar: $('toolbar'), sheet: $('sheet'), next: $('btn-next'),
      toast: $('toast'), card: $('card'), modal: $('modal'), float: $('float-btns'),
      mute: $('btn-mute'), thought: $('thought'), journal: $('btn-journal')
    };
    UI.el.journal.querySelector('img').src = R.Icons.url('diario', 96);
    UI.el.journal.addEventListener('click', () => { R.Audio.unlock(); R.Audio.play('click'); R.Story.journal(R.G.lv); });
    UI.el.mute.addEventListener('click', () => {
      R.Audio.unlock();
      const m = !R.Audio.muted;
      R.Audio.setMuted(m);
      UI.el.mute.classList.toggle('off', m);
      R.Save.setSetting('muted', m);
    });
    if (R.Save.getSetting('muted')) { R.Audio.muted = true; UI.el.mute.classList.add('off'); }
  };

  // ---------- fase ----------
  UI.setPhase = function (name, idx, total) {
    UI.el.top.classList.remove('hidden');
    UI.el.phaseName.textContent = name;
    let h = '';
    for (let i = 0; i < total; i++) h += `<b class="${i < idx ? 'on' : i === idx ? 'now' : ''}"></b>`;
    UI.el.dots.innerHTML = h;
  };

  // ---------- avanzamento ----------
  UI.showProgress = function (on) {
    UI.el.prog.classList.toggle('hidden', !on);
    if (on) { UI.milestone = -1; UI.setProgress(0, true); }
  };
  // frac 0..1; suona il "ding" ai traguardi
  UI.setProgress = function (frac, silent) {
    frac = Math.max(0, Math.min(1, frac));
    UI.el.fill.style.width = (frac * 100).toFixed(1) + '%';
    UI.el.pct.textContent = Math.floor(frac * 100 + 0.0001) + '%';
    const m = frac >= 0.999 ? 3 : frac >= 0.75 ? 2 : frac >= 0.5 ? 1 : frac >= 0.25 ? 0 : -1;
    if (m > UI.milestone) {
      if (!silent) {
        for (let k = UI.milestone + 1; k <= m; k++) setTimeout(() => R.Audio.play('milestone', k), (k - UI.milestone - 1) * 160);
        UI.el.prog.classList.remove('pulse'); void UI.el.prog.offsetWidth; UI.el.prog.classList.add('pulse');
        R.U.vibrate(m === 3 ? [20, 40, 20] : 12);
      }
      UI.milestone = m;
    }
    UI.lastFrac = frac;
  };

  // ---------- compiti ----------
  UI.setTasks = function (list) {
    if (!list || !list.length) { UI.el.tasks.classList.add('hidden'); return; }
    UI.el.tasks.classList.remove('hidden');
    UI.el.tasks.innerHTML = list.map(t => `<div class="${t.done ? 'done' : ''}">${t.done ? '✓ ' : ''}${t.text}</div>`).join('');
  };

  // ---------- barra strumenti ----------
  // items: [{ id, icon (nome icona), label, swatch (colore) }]
  UI.toolbar = function (items, active, onSelect) {
    const tb = UI.el.toolbar;
    if (!items) { tb.classList.add('hidden'); return; }
    tb.classList.remove('hidden');
    tb.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'tool' + (it.id === active ? ' active' : '') + (it.locked ? ' locked' : '');
      b.dataset.id = it.id;
      if (it.swatch) b.innerHTML = `<div class="swatch" style="background:${it.swatch}"></div><span>${it.label}</span>`;
      else b.innerHTML = `<img src="${R.Icons.url(it.icon, 96)}" alt=""><span>${it.label}</span>`;
      b.addEventListener('click', () => {
        R.Audio.unlock(); R.Audio.play('click');
        UI.setActiveTool(it.id);
        onSelect(it.id);
      });
      tb.appendChild(b);
    });
  };
  UI.setActiveTool = function (id) {
    [...UI.el.toolbar.children].forEach(b => b.classList.toggle('active', b.dataset.id === id));
  };
  UI.wiggleTool = function (id) {
    const b = [...UI.el.toolbar.children].find(x => x.dataset.id === id);
    if (!b) return;
    b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle');
  };

  // ---------- pannello ----------
  UI.openSheet = function (html, bind) {
    const s = UI.el.sheet;
    s.innerHTML = html;
    s.classList.remove('hidden');
    s.classList.add('closed');
    void s.offsetWidth;
    s.classList.remove('closed');
    if (bind) bind(s);
  };
  UI.closeSheet = function () {
    const s = UI.el.sheet;
    if (s.classList.contains('hidden')) return;
    s.classList.add('closed');
    setTimeout(() => { if (s.classList.contains('closed')) s.classList.add('hidden'); }, 380);
  };
  UI.sheetOpen = () => !UI.el.sheet.classList.contains('hidden') && !UI.el.sheet.classList.contains('closed');

  // ---------- avanti ----------
  // pos: undefined (sopra la barra strumenti) | true/'low' (in basso) | 'top' (sotto la barra di fase)
  UI.next = function (label, onClick, pos) {
    const b = UI.el.next;
    if (!label) { b.classList.add('hidden'); b.onclick = null; return; }
    b.textContent = label;
    b.classList.toggle('low', pos === true || pos === 'low');
    b.classList.toggle('top', pos === 'top');
    b.classList.remove('hidden');
    b.onclick = () => { R.Audio.play('click'); b.classList.add('hidden'); b.onclick = null; onClick(); };
  };

  // ---------- toast ----------
  let toastT = null;
  UI.toast = function (text, ms) {
    const t = UI.el.toast;
    t.textContent = text;
    t.classList.toggle('top', UI.sheetOpen()); // con il pannello aperto il messaggio sta in alto
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms || 2600);
  };

  // ---------- pensieri (la voce interiore di chi gioca) ----------
  let thoughtT = null;
  UI.thought = function (text, ms) {
    const t = UI.el.thought;
    t.textContent = text;
    t.classList.remove('hidden', 'show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(thoughtT);
    thoughtT = setTimeout(() => t.classList.remove('show'), ms || Math.max(3200, text.length * 70));
  };
  UI.pulseJournal = function () {
    const j = UI.el.journal;
    j.classList.remove('pulse'); void j.offsetWidth; j.classList.add('pulse');
  };

  // ---------- cartellino di fase ----------
  UI.card = function (kicker, title, sub) {
    const c = UI.el.card;
    c.classList.add('hidden');
    c.querySelector('.card-kicker').textContent = kicker || '';
    c.querySelector('.card-title').textContent = title || '';
    c.querySelector('.card-sub').textContent = sub || '';
    void c.offsetWidth;
    c.classList.remove('hidden');
    clearTimeout(UI.cardT);
    UI.cardT = setTimeout(() => c.classList.add('hidden'), 2700);
  };

  // ---------- modale ----------
  UI.modal = function (html, bind) {
    const m = UI.el.modal;
    m.querySelector('.modal-box').innerHTML = html;
    m.classList.remove('hidden');
    if (bind) bind(m.querySelector('.modal-box'));
  };
  UI.closeModal = function () { UI.el.modal.classList.add('hidden'); };
  UI.modalOpen = () => !UI.el.modal.classList.contains('hidden');

  // ---------- pulsanti flottanti ----------
  UI.floatAt = function (x, y, onRotate, onRemove) {
    const f = UI.el.float;
    if (x === null) { f.classList.add('hidden'); return; }
    f.classList.remove('hidden');
    f.style.left = x + 'px'; f.style.top = y + 'px';
    $('btn-rotate').onclick = () => { R.Audio.play('click'); onRotate(); };
    $('btn-remove').onclick = () => { R.Audio.play('click'); onRemove(); };
  };

  UI.hideAll = function () {
    UI.toolbar(null); UI.closeSheet(); UI.next(null); UI.setTasks(null); UI.floatAt(null);
  };

  R.UI = UI;
})(window.R);

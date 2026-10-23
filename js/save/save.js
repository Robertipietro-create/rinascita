/* =========================================================
   save.js — salvataggio in localStorage
   M1: impostazioni e luoghi completati (con foto dell'album).
   M2 estenderà con monete, strumenti, progressi a metà fase.
   Ogni accesso è protetto: in navigazione privata il gioco
   deve funzionare comunque.
   ========================================================= */
(function (R) {
  'use strict';
  const KEY = 'rinascita.v1';
  const Save = { data: null };

  function load() {
    if (Save.data) return Save.data;
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    Save.data = Object.assign({ settings: {}, levels: {}, album: [] }, d || {});
    return Save.data;
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(Save.data)); }
    catch (e) {
      // spazio esaurito: sacrifichiamo le foto più vecchie dell'album
      if (Save.data.album.length > 1) { Save.data.album.shift(); write(); }
    }
  }

  Save.getSetting = k => load().settings[k];
  Save.setSetting = (k, v) => { load().settings[k] = v; write(); };

  Save.levelDone = function (id, result) {
    const d = load();
    const prev = d.levels[id];
    d.levels[id] = { stars: Math.max(result.stars, prev ? prev.stars : 0), at: Date.now() };
    d.album = d.album.filter(a => a.id !== id);
    d.album.push({ id, name: result.name, before: result.before, after: result.after, stars: result.stars, at: Date.now() });
    write();
  };
  Save.get = () => load();

  R.Save = Save;
})(window.R);

/* =========================================================
   room.js — lo stato completo di un luogo
   Costruisce superfici, sporco, finestra, porta, crepe, assi
   marce, detriti, cassone, collezionabili, arredi; sa disegnarsi
   con qualsiasi matrice di camera (schermo o foto dell'album).
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, Iso = R.Iso, T = R.T, Sc = R.Scene, O = R.O;

  class Room {
    constructor(lv) {
      this.lv = lv;
      const { W, D, H } = lv.room;
      this.W = W; this.D = D; this.H = H;
      this.ppu = Iso.PPU;
      this.debris = []; this.items = []; this.wallItems = [];
      this.skip = null; this.heap = null; this.held = null;
      this.cracks = []; this.rotten = []; this.collectibles = [];
      this.light = { dark: 0, tint: [20, 15, 30], beam: 1, lights: [] };
      this.view = 'day';
      this.time = 0;
      this.skirting = null;
      this.people = [];
      this.floorAnim = [];
    }

    // generazione a passi (per mostrare la barra di caricamento)
    steps() {
      const lv = this.lv, ppu = this.ppu, W = this.W, D = this.D, H = this.H;
      const st = [];
      st.push(() => {
        this.floor = new R.Surface({ id: 'floor', kind: 'floor', name: 'pavimento', wu: W, hu: D });
        this.wallBack = new R.Surface({ id: 'wallBack', kind: 'wallBack', name: 'parete di fondo', wu: W, hu: H, H });
        this.wallLeft = new R.Surface({ id: 'wallLeft', kind: 'wallLeft', name: 'parete sinistra', wu: D, hu: H, H });
        this.surfaces = [this.floor, this.wallBack, this.wallLeft];
        this.byId = { floor: this.floor, wallBack: this.wallBack, wallLeft: this.wallLeft };
      });
      st.push(() => { this.floor.base = T.oldPlanks(this.floor.tw, this.floor.th, lv.seed); });
      st.push(() => {
        this.wallBack.base = T.plaster(this.wallBack.tw, this.wallBack.th, lv.seed + 1, lv.plaster);
        this.wallLeft.base = T.plaster(this.wallLeft.tw, this.wallLeft.th, lv.seed + 2, U.rgb(U.shade(U.hex(lv.plaster), -0.04)));
      });
      // finestra e porta
      st.push(() => {
        const w = lv.window, d = lv.door;
        if (w) {
          this.win = { x0: (w.u - w.w / 2) * ppu, x1: (w.u + w.w / 2) * ppu, y0: w.top * ppu, y1: (w.top + w.h) * ppu };
          this.windowWorld = { x0: w.u - w.w / 2, x1: w.u + w.w / 2, z0: H - w.top - w.h, z1: H - w.top };
          this.lv.windowWorld = this.windowWorld;
          this.winState = { panes: (w.broken || [1, 1, 1, 1]).slice(), view: null, frame: '#cdbfa9' };
          this.setView('day');
          this.wallBack.over.push((ctx) => Sc.drawWindow(ctx, this.win, this.winState, this.time));
        }
        if (d) {
          this.door = { x0: (d.u - d.w / 2) * ppu, x1: (d.u + d.w / 2) * ppu, y0: (H - d.h) * ppu, y1: H * ppu };
          this.doorWorld = { y0: d.u - d.w / 2, y1: d.u + d.w / 2, h: d.h };
          this.doorState = { color: '#7d6250', frame: '#cbbba2', open: 0 };
          this.wallLeft.over.push((ctx) => Sc.drawDoor(ctx, this.door, this.doorState));
        }
        // oggetti da parete
        for (const s of [this.wallBack, this.wallLeft]) {
          s.over.push((ctx) => {
            for (const wi of this.wallItems) if (wi.wall === s.id) O.drawWallItem(ctx, wi, ppu, this.time, this.win);
          });
        }
      });
      // crepe da stuccare
      st.push(() => {
        (lv.cracks || []).forEach((c, ci) => {
          const r = U.rng(lv.seed + 50 + ci), pts = [];
          for (let i = 0; i < c.pts.length - 1; i++) {
            const a = c.pts[i], b = c.pts[i + 1];
            const n = 8;
            for (let k = 0; k < n; k++) {
              const t = k / n;
              pts.push([(U.lerp(a[0], b[0], t) + r.range(-0.08, 0.08)) * ppu, (U.lerp(a[1], b[1], t) + r.range(-0.08, 0.08)) * ppu]);
            }
          }
          const last = c.pts[c.pts.length - 1];
          pts.push([last[0] * ppu, last[1] * ppu]);
          const crack = { wall: c.wall, pts, filled: new Array(pts.length - 1).fill(0), done: false, fade: 1 };
          // diramazioni
          crack.branches = [];
          for (let i = 2; i < pts.length - 2; i += 4) {
            const p = pts[i], a = r.range(0, U.TAU), l = r.range(10, 22);
            crack.branches.push([p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l]);
          }
          this.cracks.push(crack);
        });
        for (const s of [this.wallBack, this.wallLeft]) {
          s.under.push((ctx) => {
            for (const c of this.cracks) if (c.wall === s.id) this.drawCrack(ctx, c);
          });
        }
      });
      // assi marce
      st.push(() => {
        (lv.rotten || []).forEach(p => {
          this.rotten.push({ x: p.u * ppu, y: p.row * 32, w: p.len * ppu, h: 32, hp: 3, broken: false, shake: 0 });
        });
        this.floor.under.push((ctx) => { for (const p of this.rotten) this.drawRotten(ctx, p); });
        // collezionabili (sotto lo sporco)
        (lv.collectibles || []).forEach(c => this.collectibles.push(Object.assign({ found: false, glow: 0 }, c)));
        this.floor.under.push((ctx) => this.drawCollectibles(ctx, 'floor'));
      });
      // sporco: un passo per livello (sono le texture più costose)
      const dirtSpec = lv.dirt || {};
      for (const sid of ['floor', 'wallBack', 'wallLeft']) {
        (dirtSpec[sid] || []).forEach((d, i) => {
          st.push(() => {
            const s = this.byId[sid], seed = lv.seed + 100 + i * 17 + sid.length;
            let c;
            switch (d.type) {
              case 'dust': c = T.dust(s.tw, s.th, seed, d.amount); break;
              case 'mud': c = T.mud(s.tw, s.th, seed, d.blobs); break;
              case 'stain': c = T.stains(s.tw, s.th, seed, d.n); break;
              case 'mold': c = T.mold(s.tw, s.th, seed, d.where); break;
              case 'grime': c = T.grime(s.tw, s.th, seed); break;
              case 'graffiti': c = T.graffiti(s.tw, s.th, seed, d.area); break;
              case 'peel': c = T.peel(s.tw, s.th, seed, d.color); break;
              case 'cobweb': c = T.cobweb(s.tw, s.th, seed, (d.corners || [[0, 0]]).map(p => [p[0] * s.tw, p[1] * s.th])); break;
            }
            if (c) s.addDirt(d.type, c);
          });
        });
      }
      // detriti
      st.push(() => {
        const r = U.rng(lv.seed + 9);
        (lv.debris || []).forEach(d => {
          this.debris.push({ kind: d.kind, x: d.x, y: d.y, z: 0, vz: 0, vx: 0, vy: 0, a: d.a !== undefined ? d.a : r(), lift: 0, hides: d.hides || null });
        });
        if (lv.skip) this.skip = Object.assign({ ox: 0, z: 0, contents: [], fill: 0, cap: 1, hot: 0, gone: false }, lv.skip);
        if (this.skip) this.skip.cap = this.debris.reduce((s, d) => s + O.DEBRIS[d.kind].vol, 0);
        if (lv.heap) this.heap = { x: lv.heap.x, y: lv.heap.y, size: 0, pop: 1 };
      });
      return st;
    }

    setView(mode) {
      this.view = mode;
      if (this.win) this.winState.view = T.windowView(Math.round(this.win.x1 - this.win.x0), Math.round(this.win.y1 - this.win.y0), mode, this.lv.scenery);
    }

    // ---------- crepe ----------
    drawCrack(ctx, c) {
      if (c.fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = c.fade;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (!c.done) {
        // crepa: ombra scura + bordo chiaro
        ctx.strokeStyle = 'rgba(255,250,240,0.35)'; ctx.lineWidth = 5;
        ctx.beginPath(); c.pts.forEach((p, i) => i ? ctx.lineTo(p[0] + 1, p[1] + 1) : ctx.moveTo(p[0] + 1, p[1] + 1)); ctx.stroke();
        ctx.strokeStyle = '#3f3029'; ctx.lineWidth = 3;
        ctx.beginPath(); c.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        ctx.lineWidth = 1.5;
        for (const b of c.branches) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[2], b[3]); ctx.stroke(); }
      }
      // stucco steso (segmenti riempiti)
      ctx.strokeStyle = '#f4eee4'; ctx.lineWidth = 9;
      for (let i = 0; i < c.filled.length; i++) {
        const f = c.filled[i];
        if (f <= 0) continue;
        ctx.globalAlpha = c.fade * Math.min(1, f);
        const a = c.pts[i], b = c.pts[i + 1];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      ctx.restore();
    }

    // ---------- assi marce ----------
    drawRotten(ctx, p) {
      const sh = p.shake > 0 ? Math.sin(p.shake * 60) * p.shake * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      if (p.broken) {
        // buco: sottofondo scuro con travetti
        ctx.fillStyle = '#2e2420'; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#4a3a30';
        for (let x = p.x + 20; x < p.x + p.w; x += 48) ctx.fillRect(x, p.y, 10, p.h);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(p.x, p.y, p.w, 6);
      } else {
        ctx.fillStyle = 'rgba(70,60,35,0.55)'; ctx.fillRect(p.x, p.y + 1, p.w, p.h - 2);
        ctx.fillStyle = 'rgba(60,80,50,0.25)';
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(p.x + (i * 37 % p.w), p.y + 8 + (i * 13 % 18), 5 + i % 3 * 2, 0, U.TAU); ctx.fill(); }
        // crepe che aumentano a ogni colpo
        ctx.strokeStyle = 'rgba(30,20,15,0.8)'; ctx.lineWidth = 1.5;
        const n = 3 - p.hp;
        for (let k = 0; k <= n; k++) {
          ctx.beginPath();
          const cx = p.x + p.w * (0.25 + k * 0.25);
          ctx.moveTo(cx, p.y + 2); ctx.lineTo(cx + 6, p.y + 12); ctx.lineTo(cx - 3, p.y + 20); ctx.lineTo(cx + 4, p.y + p.h - 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ---------- collezionabili ----------
    drawCollectibles(ctx, sid) {
      for (const c of this.collectibles) {
        if (c.found || c.surface !== sid) continue;
        const x = c.u * this.ppu, y = c.v * this.ppu;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
        if (c.icon === 'chiave') {
          ctx.scale(0.55, 0.55); R.Icons.draw.chiave(ctx);
        } else if (c.icon === 'moneta') {
          ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = '#8f6f2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 6, 0, U.TAU); ctx.stroke();
        } else {
          // vecchia polaroid
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-15, -17, 34, 38);
          ctx.fillStyle = '#f3ecdc'; ctx.fillRect(-17, -19, 34, 38);
          const g = ctx.createLinearGradient(0, -15, 0, 10);
          g.addColorStop(0, '#d9b98b'); g.addColorStop(1, '#a5815a');
          ctx.fillStyle = g; ctx.fillRect(-14, -16, 28, 26);
          ctx.fillStyle = '#6b5440';
          ctx.beginPath(); ctx.arc(-4, -4, 4, 0, U.TAU); ctx.fill(); ctx.fillRect(-8, 0, 8, 10);
          ctx.beginPath(); ctx.arc(6, -2, 3.5, 0, U.TAU); ctx.fill(); ctx.fillRect(3, 1, 7, 9);
        }
        ctx.restore();
      }
    }
    // quanto è scoperto un collezionabile (0..1)
    collectibleExposure(c) {
      const s = this.byId[c.surface];
      let dirt = 0;
      for (const L of s.layers) if (!L.done) dirt = Math.max(dirt, s.dirtAround(L, c.u * this.ppu, c.v * this.ppu, 14));
      return 1 - dirt;
    }

    // ---------- profondità e disegno ----------
    drawables() {
      const list = [];
      for (const d of this.debris) if (d !== this.held) list.push({ k: d.x + d.y, f: ctx => O.drawDebris(ctx, d) });
      for (const it of this.items) {
        const def = O.ITEMS[it.id];
        if (def.layer === 'wall') continue;
        const fp = O.footprint(def, it.rot);
        let k = it.x + fp[0] / 2 + it.y + fp[1] / 2;
        if (def.layer === 'rug') k = -100 + k * 0.01;
        if (def.layer === 'pet') k += 0.5 + (it.z || 0);
        list.push({ k, f: ctx => O.drawItem(ctx, it, this.time, { alpha: it.ghost ? 0.6 : 1 }), it });
      }
      if (this.heap && this.heap.size > 0) list.push({ k: this.heap.x + this.heap.y, f: ctx => Sc.drawHeap(ctx, this.heap) });
      for (const p of this.people) list.push({ k: p.x + p.y + 0.2, f: ctx => R.People.draw(ctx, p, this.time) });
      list.sort((a, b) => a.k - b.k);
      return list;
    }

    // disegna tutto con la matrice camM (vista → pixel)
    draw(ctx, camM, opt) {
      opt = opt || {};
      ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      Sc.drawShell(ctx, this.lv, this.lv.palette);
      this.wallLeft.draw(ctx, camM, opt);
      this.wallBack.draw(ctx, camM, opt);
      ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      Sc.drawWallCaps(ctx, this.lv, this.lv.palette);
      this.floor.draw(ctx, camM, opt);
      ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      // tessere in volo durante la posa del pavimento
      if (this.floorAnim.length) this.drawFloorAnim(ctx, camM);
      ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5]);
      if (this.skirting) Sc.drawSkirting(ctx, this.lv, this.skirting);
      if (opt.underObjects) opt.underObjects(ctx);
      for (const d of this.drawables()) d.f(ctx);
      if (this.skip) Sc.drawSkip(ctx, this.skip, this.time);
      if (this.held) O.drawDebris(ctx, this.held);
      if (opt.overObjects) opt.overObjects(ctx);
      if (!opt.noParticles) R.P.draw(ctx);
      if (opt.motes) Sc.drawMotes(ctx, true);
    }

    drawFloorAnim(ctx, camM) {
      const fl = this.floor, fin = this.floorFinish;
      for (const a of this.floorAnim) {
        const t = U.clamp(a.t, 0, 1);
        const lift = (1 - U.ease.outBounce(t)) * 40;
        const sc = 1 + (1 - U.ease.outCubic(t)) * 0.15;
        ctx.setTransform(camM[0], camM[1], camM[2], camM[3], camM[4], camM[5] - lift * camM[3]);
        const m = fl.M;
        const cx = (a.cx + 0.5) * 64, cy = (a.cy + 0.5) * 64;
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.globalAlpha = U.clamp(t * 3, 0, 1);
        ctx.drawImage(fin.tex, a.cx * 64, a.cy * 64, 64, 64, a.cx * 64, a.cy * 64, 64, 64);
        ctx.globalAlpha = 1;
      }
    }

    // riquadro (coordinate vista) che contiene il diorama
    bounds(withSkip) {
      const W = this.W, D = this.D, H = this.H;
      const pts = [[-0.4, -0.4, H], [W, -0.4, H], [-0.4, D, H], [W, D, -0.6], [-0.4, D, -0.6], [W, -0.4, -0.6]];
      if (withSkip && this.skip) {
        const s = this.skip;
        pts.push([s.x + s.w, s.y, s.h], [s.x + s.w, s.y + s.d, 0], [s.x, s.y + s.d, 0]);
      }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of pts) { const q = Iso.p(p[0], p[1], p[2]); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      return { x0, y0, x1, y1 };
    }

    // superficie sotto un punto vista (le pareti hanno priorità sopra il pavimento)
    surfaceAt(vx, vy, pad) {
      for (const s of [this.floor, this.wallBack, this.wallLeft]) {
        const uv = s.toUV(vx, vy);
        if (s.inside(uv[0], uv[1], pad || 0)) return { s, u: uv[0], v: uv[1] };
      }
      return null;
    }

    totalCleanFraction() {
      let tot = 0, left = 0;
      for (const s of this.surfaces) { tot += s.totalDirt(); left += s.remainingDirt(); }
      return tot > 0 ? 1 - left / tot : 1;
    }

    // luci emesse dai mobili (lampade, camino)
    itemLights() {
      const out = [];
      for (const it of this.items) {
        const def = O.ITEMS[it.id];
        if (!def.light) continue;
        const fp = O.footprint(def, it.rot);
        out.push({ x: it.x + fp[0] / 2, y: it.y + fp[1] / 2, z: def.light.z, r: def.light.r, col: def.light.col, i: it.lightOn === undefined ? 1 : it.lightOn, flicker: def.light.flicker, it });
      }
      return out;
    }
  }

  R.Room = Room;
})(window.R);

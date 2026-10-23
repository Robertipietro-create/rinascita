/* =========================================================
   surface.js — una superficie del diorama (pavimento o parete)
   Ordine di disegno nello spazio texture (UV):
     base pulita → "under" (crepe, assi marce) → finitura
     (pavimento nuovo, pittura, carta) → "over" (finestra, porta,
     quadri) → bagnato → livelli di SPORCO → luccichio
   Lo sporco è una maschera: strofinare = destination-out.
   ========================================================= */
(function (R) {
  'use strict';
  const U = R.U, Iso = R.Iso;

  const CELL = 8; // risoluzione della griglia di misura (px di texture per cella)

  class Surface {
    constructor(o) {
      this.id = o.id;
      this.kind = o.kind;            // 'floor' | 'wallBack' | 'wallLeft'
      this.name = o.name || o.id;
      this.wu = o.wu; this.hu = o.hu; // dimensioni in unità del mondo
      this.ppu = o.ppu || Iso.PPU;
      this.tw = Math.round(this.wu * this.ppu);
      this.th = Math.round(this.hu * this.ppu);
      this.H = o.H || 0;
      this.M = this.kind === 'floor' ? Iso.floorM(this.ppu)
        : this.kind === 'wallBack' ? Iso.wallBackM(this.H, this.ppu) : Iso.wallLeftM(this.H, this.ppu);
      this.inv = U.matInv(this.M);
      this.base = null;
      this.under = []; this.finish = null; this.over = [];
      this.layers = [];
      // strato "bagnato": a bassa risoluzione, si asciuga col tempo
      this.wet = U.canvas(Math.ceil(this.tw / 4), Math.ceil(this.th / 4));
      this.wetCtx = this.wet.getContext('2d');
      this.wetAmt = 0;
      this.shine = -1;  // luccichio: -1 spento, 0..1 in corso
      this.done = false;
      this.small = U.canvas(Math.ceil(this.tw / CELL), Math.ceil(this.th / CELL));
      this.smallCtx = this.small.getContext('2d', { willReadFrequently: true });
    }

    // ----- conversioni -----
    toUV(vx, vy) { return U.matApply(this.inv, vx, vy); }
    toView(u, v) { return U.matApply(this.M, u, v); }
    inside(u, v, pad) { const p = pad || 0; return u >= -p && v >= -p && u <= this.tw + p && v <= this.th + p; }
    // contorno in coordinate vista (per hit test e clip)
    outline() {
      return [this.toView(0, 0), this.toView(this.tw, 0), this.toView(this.tw, this.th), this.toView(0, this.th)];
    }

    // ----- sporco -----
    addDirt(type, canvas, opt) {
      const L = {
        type, c: canvas, ctx: canvas.getContext('2d'),
        init: 0, rem: 1, done: false, fade: 1, dirty: true,
        gw: this.small.width, gh: this.small.height, grid: null,
        hidden: opt && opt.hidden
      };
      this.layers.push(L);
      this.measureLayer(L);
      L.init = L.sum;
      if (L.init < 1) { L.done = true; L.rem = 0; }
      return L;
    }
    measureLayer(L) {
      const s = this.smallCtx;
      s.globalCompositeOperation = 'copy';
      s.drawImage(L.c, 0, 0, this.small.width, this.small.height);
      const d = s.getImageData(0, 0, this.small.width, this.small.height).data;
      if (!L.grid) L.grid = new Uint8Array(L.gw * L.gh);
      let sum = 0;
      for (let i = 0, j = 3; i < L.grid.length; i++, j += 4) { L.grid[i] = d[j]; sum += d[j]; }
      L.sum = sum;
      if (L.init > 0) L.rem = sum / L.init;
      L.dirty = false;
    }
    // misura i livelli modificati; restituisce i livelli appena completati
    measure() {
      const finished = [];
      for (const L of this.layers) {
        if (L.done || !L.dirty) continue;
        this.measureLayer(L);
        if (L.rem <= 0.06) finished.push(L);
      }
      return finished;
    }
    // sporco (0..1) del livello sotto il punto u,v (dall'ultima misura)
    dirtAt(L, u, v) {
      const gx = U.clamp((u / CELL) | 0, 0, L.gw - 1), gy = U.clamp((v / CELL) | 0, 0, L.gh - 1);
      return L.grid[gy * L.gw + gx] / 255;
    }
    dirtAround(L, u, v, r) {
      let m = 0;
      const steps = [[0, 0], [r * 0.6, 0], [-r * 0.6, 0], [0, r * 0.6], [0, -r * 0.6]];
      for (const s of steps) m = Math.max(m, this.dirtAt(L, u + s[0], v + s[1]));
      return m;
    }
    // frazione pulita della superficie (pesata sulla quantità iniziale)
    cleanFraction() {
      let tot = 0, left = 0;
      for (const L of this.layers) { tot += L.init; left += L.done ? 0 : L.init * L.rem; }
      return tot > 0 ? 1 - left / tot : 1;
    }
    totalDirt() { let t = 0; for (const L of this.layers) t += L.init; return t; }
    remainingDirt() { let t = 0; for (const L of this.layers) t += L.done ? 0 : L.init * L.rem; return t; }

    // completa un livello con una dissolvenza: "gli ultimi puntini li regaliamo"
    finishLayer(L, onEnd) {
      if (L.done) return;
      L.done = true;
      R.E.tween(L, { fade: 0 }, 0.8, U.ease.inOutQuad, () => {
        L.ctx.clearRect(0, 0, L.c.width, L.c.height);
        L.rem = 0;
        if (onEnd) onEnd();
      });
    }
    allClean() { return this.layers.every(L => L.done); }

    // ----- pennello -----
    // stamp: canvas timbro; r: raggio in px texture; power: forza 0..1
    // ang: rotazione del timbro (raschietto); restituisce {work, hit, wrong}
    brush(u, v, tool, stamp, ang) {
      const r = stamp.width / 2;
      const res = { work: 0, hit: null, wrong: null, hitAmt: 0 };
      if (!this.inside(u, v, r)) return res;
      for (const L of this.layers) {
        if (L.done) continue;
        const local = this.dirtAround(L, u, v, r);
        if (local < 0.02) continue;
        const eff = tool.eff[L.type] || 0;
        if (eff < 0.3 && local > 0.25 && !res.wrong) res.wrong = L.type;
        if (eff <= 0) continue;
        const ctx = L.ctx;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = U.clamp(tool.power * eff, 0, 1);
        if (ang !== undefined) {
          ctx.save(); ctx.translate(u, v); ctx.rotate(ang); ctx.drawImage(stamp, -r, -stamp.height / 2); ctx.restore();
        } else {
          ctx.drawImage(stamp, u - r, v - stamp.height / 2);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        L.dirty = true;
        const w = local * eff;
        res.work += w;
        if (w > res.hitAmt) { res.hitAmt = w; res.hit = L.type; }
      }
      // il bagnato rende la superficie appena lavata scura e lucida
      if (tool.wet) {
        const wc = this.wetCtx;
        const g = wc.createRadialGradient(u / 4, v / 4, 0, u / 4, v / 4, r / 4 * 1.2);
        g.addColorStop(0, `rgba(0,0,0,${tool.wet})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        wc.fillStyle = g; wc.fillRect(u / 4 - r / 3, v / 4 - r / 3, r / 1.5, r / 1.5);
        this.wetAmt = 1;
      }
      return res;
    }

    // asciugatura: fa svanire lo strato bagnato a poco a poco
    dry(dt) {
      if (this.wetAmt <= 0) return;
      this.dryAcc = (this.dryAcc || 0) + dt;
      if (this.dryAcc > 0.12) {
        this.wetCtx.globalCompositeOperation = 'destination-out';
        this.wetCtx.fillStyle = 'rgba(0,0,0,0.06)';
        this.wetCtx.fillRect(0, 0, this.wet.width, this.wet.height);
        this.wetCtx.globalCompositeOperation = 'source-over';
        this.dryAcc = 0;
        this.wetAmt -= 0.012;
        if (this.wetAmt <= 0) this.wetCtx.clearRect(0, 0, this.wet.width, this.wet.height);
      }
    }

    startShine() { this.shine = 0; R.E.tween(this, { shine: 1 }, 1.1, U.ease.inOutQuad, () => { this.shine = -1; }); }

    // ----- disegno -----
    draw(ctx, camM, opt) {
      const m = U.matMul(camM, this.M);
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      if (this.base) ctx.drawImage(this.base, 0, 0);
      for (const f of this.under) f(ctx, this);
      if (this.finish) this.finish(ctx, this);
      for (const f of this.over) f(ctx, this);
      if (this.wetAmt > 0) {
        ctx.globalAlpha = 0.28;
        ctx.drawImage(this.wet, 0, 0, this.tw, this.th);
        ctx.globalAlpha = 1;
      }
      if (!opt || !opt.noDirt) {
        for (const L of this.layers) {
          if (L.hidden) continue;
          if (L.done && L.fade <= 0) continue;
          ctx.globalAlpha = L.fade;
          ctx.drawImage(L.c, 0, 0);
        }
        ctx.globalAlpha = 1;
      }
      if (this.shine >= 0) {
        // banda di luce diagonale che attraversa la superficie
        const x = U.lerp(-this.tw * 0.5, this.tw * 1.5, this.shine);
        const g = ctx.createLinearGradient(x - 80, 0, x + 80, this.th * 0.4);
        g.addColorStop(0, 'rgba(255,255,240,0)');
        g.addColorStop(0.5, 'rgba(255,255,240,0.55)');
        g.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g; ctx.fillRect(0, 0, this.tw, this.th);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  R.Surface = Surface;
})(window.R);

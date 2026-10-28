'use strict';
// Dynamic backgrounds.
// ---- dynamic backgrounds ----
// 1) the sky travels from day to dusk as you get through a level (a slow loop in the Gauntlet and menu)
// 2) every theme has its own animated parallax scenery (skylines, windmills, aurora, volcanoes, jellyfish ...)
// 3) it reacts: sun and lights pulse with the music, speed streaks when you dash, lightning in the storm
const HEXC = {}, H2 = Array.from({ length: 256 }, (_, i) => (i < 16 ? '0' : '') + i.toString(16));
function hexRgb(h) { let v = HEXC[h]; if (!v) v = HEXC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; return v; }
function mixc(a, b, k) {
  const x = hexRgb(a), y = hexRgb(b);
  return '#' + H2[(x[0] + (y[0] - x[0]) * k) | 0] + H2[(x[1] + (y[1] - x[1]) * k) | 0] + H2[(x[2] + (y[2] - x[2]) * k) | 0];
}
function rgbaOf(h, a) { const x = hexRgb(h); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }

// where each theme ends up by the end of the level (sky top, sky bottom, far hills, near hills), plus which scenery it uses
const BG_DUSK = {
  dawn:    { sky: ['#5a3f8f', '#ffb07a'], far: '#b86a8c', mid: '#7a4a7e', cloud: '#ffc7a8', stars: 1, scn: 'city' },
  mill:    { sky: ['#f0b66e', '#d98a6a'], far: '#c59a6a', mid: '#8f6a58', cloud: '#ffd2a0', stars: 1, scn: 'farm' },
  forge:   { sky: ['#4a1210', '#ff7a1c'], far: '#7a2f22', mid: '#4b1f1e', scn: 'factory' },
  sky:     { sky: ['#4a62c8', '#ffc4a0'], far: '#c8a0c8', mid: '#8f80c0', cloud: '#ffd5c0', stars: 1, scn: 'islands' },
  crystal: { sky: ['#2a1250', '#a24bb8'], far: '#6b3a98', mid: '#4a2a7a', scn: 'spires' },
  night:   { sky: ['#0c1030', '#6a3a78'], far: '#34264a', mid: '#241a3a', scn: 'nightcity' },
  prism:   { sky: ['#0f1a4d', '#3fc8d9'], far: '#2a4a8c', mid: '#18306a', scn: 'shards' },
  frost:   { sky: ['#4f5fae', '#f0b8d0'], far: '#8a8cc8', mid: '#6a6eb0', cloud: '#ffd8ea', stars: 1, scn: 'aurora' },
  gear:    { sky: ['#1c1410', '#a8632a'], far: '#6a4426', mid: '#3d2a1a', scn: 'shafts' },
  grid:    { sky: ['#1a0630', '#7a1a6a'], far: '#2a0a3e', mid: '#1a0630', scn: 'retro' },
  storm:   { sky: ['#10141f', '#4b5878'], far: '#2b3550', mid: '#1d2540', scn: 'storm' },
  inferno: { sky: ['#2a0608', '#c2310c'], far: '#6a1a10', mid: '#3d0e0b', scn: 'volcano' },
  deep:    { sky: ['#010a10', '#04303f'], far: '#05242f', mid: '#03181f', scn: 'reef' },
  neon:    { sky: ['#060a2a', '#6a1a6a'], far: '#1a0a3a', mid: '#0f0524', scn: 'neon' },
  vault:   { sky: ['#1a1204', '#6a4a14'], far: '#3d2e12', mid: '#2a1f0b', scn: 'vault' }
};
for (const k in BG_DUSK) if (THEMES[k]) THEMES[k].dusk = BG_DUSK[k];

// ---------- helpers ----------
const yBase = (vh, cyr, par, base) => clamp(vh * base - cyr * par * .3, vh * .25, vh * 1.15);
function ridgeAt(vh, cyr, par, base, cx, amp, freq, seed, sx) {   // height of a ridge() at screen x
  const wx = sx + cx * par;
  return yBase(vh, cyr, par, base) + Math.sin(wx * freq + seed) * amp + Math.sin(wx * freq * 2.3 + seed * 1.7) * amp * .5 + Math.sin(wx * freq * .45 + seed * .3) * amp * .8;
}
function cells(vw, off, cell, fn) {       // endless scenery: one slot every `cell` px of the parallax layer
  const k0 = Math.floor((off - cell * 2) / cell), k1 = Math.ceil((off + vw + cell * 2) / cell);
  for (let k = k0; k <= k1; k++) fn(k * cell - off, k);
}
// well-mixed hash for scenery placement (hash2 clusters for neighbouring cells)
const rh = (k, s) => { let h = Math.imul(k | 0, 0x9E3779B1) ^ Math.imul(s | 0, 0x85EBCA6B); h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

function sunDisc(c, vw, vh, cyr, S, o) {
  const e = S.e, a = Math.sin(Math.PI * e), k = 1 - a;
  const x = vw * (o.x0 + (o.x1 - o.x0) * e), y = vh * (o.lo - (o.lo - o.hi) * a) - cyr * .03;
  const col = mixc(o.c0, o.c1, k), r = o.r * (1 + .05 * S.beat) * (1 + .22 * k);
  const g = c.createRadialGradient(x, y, r * .3, x, y, r * 4);
  g.addColorStop(0, rgbaOf(col, .5)); g.addColorStop(1, rgbaOf(col, 0));
  c.fillStyle = g; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function moonDisc(c, vw, vh, cyr, S, o) {
  const e = S.e, x = vw * (o.x0 + (o.x1 - o.x0) * e), y = vh * (o.lo - (o.lo - o.hi) * Math.sin(Math.PI * e)) - cyr * .03, r = o.r;
  const g = c.createRadialGradient(x, y, r * .6, x, y, r * 3.6);
  g.addColorStop(0, 'rgba(200,215,255,' + (.28 + .12 * S.bass).toFixed(3) + ')'); g.addColorStop(1, 'rgba(200,215,255,0)');
  c.fillStyle = g; c.fillRect(x - r * 3.6, y - r * 3.6, r * 7.2, r * 7.2);
  c.fillStyle = '#eef1ff'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,130,190,.22)';
  c.beginPath(); c.arc(x - r * .3, y - r * .2, r * .22, 0, TAU); c.arc(x + r * .35, y + r * .25, r * .16, 0, TAU); c.arc(x + r * .1, y - r * .5, r * .1, 0, TAU); c.fill();
}
function shootingStar(c, vw, vh, t, cx) {
  if (REDUCED) return;
  const per = 8, n = Math.floor(t / per), p = (t - n * per) / .7;
  if (p > 1 || rh(n, 99) < .3) return;
  const x0 = vw * (.15 + .7 * rh(n, 3)), y0 = vh * (.05 + .25 * rh(n, 4)), dx = 210 * p, dy = 90 * p;
  const g = c.createLinearGradient(x0 + dx, y0 + dy, x0 + dx - 70, y0 + dy - 30);
  g.addColorStop(0, 'rgba(255,255,255,' + (1 - p).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.strokeStyle = g; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x0 + dx, y0 + dy); c.lineTo(x0 + dx - 70, y0 + dy - 30); c.stroke();
}
function birds(c, vw, vh, cx, cyr, t, col) {
  c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
  for (let f = 0; f < 3; f++) {
    const sp = 26 + f * 9, bx = ((t * sp + f * 391 - cx * .04) % (vw + 360) + vw + 360) % (vw + 360) - 180, by = vh * (.14 + f * .09) - cyr * .05 + Math.sin(t * .5 + f) * 8;
    for (let i = 0; i < 5; i++) {
      const x = bx - i * 15, y = by + (i % 2 ? 1 : -1) * i * 4.5, fl = Math.sin(t * 8 + i * .8 + f) * 3.6;
      c.moveTo(x - 6, y + fl); c.lineTo(x, y); c.lineTo(x + 6, y + fl);
    }
  }
  c.stroke();
}
function skyline(c, vw, vh, cx, cyr, t, par, base, cell, hmin, hmax, body, seed, o) {
  const yo = yBase(vh, cyr, par, base), wins = [], blink = [];
  c.fillStyle = body; c.beginPath();
  cells(vw, cx * par, cell, (x, k) => {
    const r1 = rh(k, seed), r2 = rh(k, seed + 7), r3 = rh(k, seed + 13);
    const w = cell * (.58 + .34 * r1), h = hmin + (hmax - hmin) * r2, y = yo - h;
    c.rect(x, y, w, h + vh);
    if (r3 < .2) c.rect(x + w * .46, y - 20, 2, 20);
    else if (r3 < .36) c.rect(x + w * .18, y - 9, w * .64, 9);
    else if (r3 < .48) { c.rect(x + w * .28, y - 14, w * .44, 10); c.rect(x + w * .3, y - 4, 2, 4); c.rect(x + w * .66, y - 4, 2, 4); }
    if (o.beacon && r2 > .86) blink.push(x + w * .47 + 1, y - 21);
    if (o.lit > .02) {
      const cols = Math.max(1, ((w - 6) / 9) | 0), rows = Math.min(9, ((h - 8) / 13) | 0);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const hv = rh(k * 17 + q, r * 31 + seed);
        if (hv < o.lit && (!o.flick || hv > .06 || (((t * 1.6 + hv * 90) | 0) & 1))) wins.push(x + 4 + q * 9, y + 6 + r * 13);
      }
    }
  });
  c.fill();
  if (wins.length) { c.fillStyle = o.win; c.beginPath(); for (let i = 0; i < wins.length; i += 2) c.rect(wins[i], wins[i + 1], 5, 7); c.fill(); }
  if (blink.length && Math.sin(t * 3) > -.2) { c.fillStyle = '#ff4a4a'; c.beginPath(); for (let i = 0; i < blink.length; i += 2) c.arc(blink[i], blink[i + 1], 2, 0, TAU); c.fill(); }
}
function smoke(c, x, y, t, k, rgb, n, rise) {
  for (let i = 0; i < n; i++) {
    const u = (t * .22 + i / n + rh(k, 5)) % 1, px = x + Math.sin(u * 6 + k) * 8 + u * 36, py = y - u * rise, r = 5 + u * 17;
    c.fillStyle = 'rgba(' + rgb + ',' + ((1 - u) * .3).toFixed(3) + ')'; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
  }
}
function windmill(c, x, y, s, ang, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 9 * s, y); c.lineTo(x - 5 * s, y - 36 * s); c.lineTo(x + 5 * s, y - 36 * s); c.lineTo(x + 9 * s, y); c.closePath(); c.fill();
  c.save(); c.translate(x, y - 36 * s); c.rotate(ang);
  for (let b = 0; b < 4; b++) { c.rotate(Math.PI / 2); c.fillRect(-1.6 * s, 2 * s, 3.2 * s, 30 * s); c.fillRect(1.6 * s, 14 * s, 8 * s, 15 * s); }
  c.restore();
  c.beginPath(); c.arc(x, y - 36 * s, 3.4 * s, 0, TAU); c.fill();
}
function shafts(c, vw, vh, cx, t, rgb, a, n) {
  for (let i = 0; i < n; i++) {
    const x = ((((i * 331 + 60) - cx * .06 + Math.sin(t * .2 + i * 2) * 30) % (vw + 400)) + vw + 400) % (vw + 400) - 200;
    const g = c.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 210, vh); c.lineTo(x + 70, vh); c.closePath(); c.fill();
  }
}

// ---------- scenery per theme ----------
// back: sky objects · far / mid: parallax layers before and after the near hills · top: in front of everything in the background
const SCN = {
  city: {
    back(c, th, vw, vh, cx, cyr, t, S) { sunDisc(c, vw, vh, cyr, S, { x0: .18, x1: .82, lo: .66, hi: .2, r: 40, c0: '#fff0c0', c1: '#ff7a3a' }); },
    far(c, th, vw, vh, cx, cyr, t, S) { skyline(c, vw, vh, cx, cyr, t, .14, .70, 54, 46, 140, mixc(S.cFar, '#5a3a78', .28), 3, { lit: S.e * .25, win: '#ffd9a0' }); },
    mid(c, th, vw, vh, cx, cyr, t, S) { skyline(c, vw, vh, cx, cyr, t, .3, .86, 42, 40, 110, mixc(S.cMid, '#1a1230', .35), 8, { lit: .05 + S.e * .75, win: '#ffe3a0', beacon: 1 }); },
    top(c, th, vw, vh, cx, cyr, t, S) { birds(c, vw, vh, cx, cyr, t, rgbaOf(mixc('#202838', '#0c0c18', S.e), .5)); }
  },
  farm: {
    back(c, th, vw, vh, cx, cyr, t, S) { sunDisc(c, vw, vh, cyr, S, { x0: .85, x1: .2, lo: .7, hi: .22, r: 34, c0: '#fffbd0', c1: '#ff9a4a' }); },
    mid(c, th, vw, vh, cx, cyr, t, S) {
      c.fillStyle = mixc(S.cMid, '#10201a', .45);
      cells(vw, cx * .26, 460, (x, k) => {
        const h = rh(k, 5); if (h < .35) return;
        const wy = ridgeAt(vh, cyr, .26, .74, cx, 30, .009, 4.1, x);
        windmill(c, x, wy + 4, .85 + h * .5, t * (.5 + .3 * Math.sin(t * .2 + k)) + k, c.fillStyle);
      });
    },
    top(c, th, vw, vh, cx, cyr, t, S) { birds(c, vw, vh, cx, cyr, t, 'rgba(24,40,32,.5)'); }
  },
  factory: {
    far(c, th, vw, vh, cx, cyr, t, S) {
      const yo = yBase(vh, cyr, .16, .72), body = mixc(S.cFar, '#120808', .45), smk = [];
      c.fillStyle = body; c.beginPath(); const lit = [];
      cells(vw, cx * .16, 150, (x, k) => {
        const r = rh(k, 21), w = 80 + r * 60, h = 50 + rh(k, 22) * 50;
        c.rect(x, yo - h, w, h + vh); c.rect(x + 10, yo - h - 24, w * .5, 24);
        const cxm = x + w * .72, ch = 70 + rh(k, 23) * 60; c.rect(cxm, yo - ch - h * .3, 14, ch + vh); c.rect(cxm - 2, yo - ch - h * .3, 18, 5);
        smk.push(cxm + 7, yo - ch - h * .3, k);
        for (let i = 0; i < 4; i++) if (rh(k * 7 + i, 24) < .7) lit.push(x + 10 + i * 14, yo - h + 12);
      });
      c.fill();
      c.fillStyle = 'rgba(255,170,60,' + (.55 + .25 * S.bass).toFixed(2) + ')'; c.beginPath(); for (let i = 0; i < lit.length; i += 2) c.rect(lit[i], lit[i + 1], 6, 9); c.fill();
      for (let i = 0; i < smk.length; i += 3) smoke(c, smk[i], smk[i + 1], t, smk[i + 2], '34,24,26', 5, 100);
    },
    mid(c, th, vw, vh, cx, cyr, t, S) {     // furnace glow along the ground
      const g = c.createLinearGradient(0, vh, 0, vh * .5); const a = .22 + .3 * S.bass + .08 * S.e;
      g.addColorStop(0, 'rgba(255,120,30,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.fillRect(0, vh * .5, vw, vh * .5);
    }
  },
  islands: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      sunDisc(c, vw, vh, cyr, S, { x0: .3, x1: .75, lo: .55, hi: .16, r: 36, c0: '#fffbe0', c1: '#ffb070' });
      // a blimp
      const bx = ((t * 12 + 200 - cx * .03) % (vw + 700) + vw + 700) % (vw + 700) - 350, by = vh * .22 - cyr * .04 + Math.sin(t * .4) * 7;
      c.fillStyle = mixc('#e8412e', '#8a3a7a', S.e); c.beginPath(); c.ellipse(bx, by, 46, 15, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(bx - 30, by - 3, 60, 4);
      c.fillStyle = '#2a2f45'; c.fillRect(bx - 9, by + 14, 18, 6); c.fillRect(bx + 42, by - 3, 2, 6);
      c.beginPath(); c.moveTo(bx - 44, by); c.lineTo(bx - 58, by - 10); c.lineTo(bx - 58, by + 10); c.fill();
    },
    far(c, th, vw, vh, cx, cyr, t, S) {
      for (const L of [{ par: .09, cell: 600, y: .34, s: 1 }, { par: .17, cell: 480, y: .5, s: 1.25 }]) {
        cells(vw, cx * L.par, L.cell, (x, k) => {
          const h = rh(k, 31 + L.cell); if (h < .38) return;
          const w = (110 + h * 120) * L.s, y = vh * L.y + (rh(k, 32) - .5) * vh * .22 - cyr * L.par * .3 + Math.sin(t * .5 + k * 2) * 4;
          c.fillStyle = mixc('#6a5a4a', '#1a1220', .12 + S.e * .4); c.beginPath(); c.moveTo(x - w * .5, y); c.lineTo(x + w * .5, y); c.lineTo(x + w * .18, y + w * .34); c.lineTo(x - w * .06, y + w * .46); c.lineTo(x - w * .3, y + w * .26); c.closePath(); c.fill();
          c.fillStyle = mixc('#7ecb7a', '#4a7a6a', S.e); c.fillRect(x - w * .5, y - 5, w, 7);
          c.beginPath(); c.moveTo(x - w * .08, y - 5); c.lineTo(x - w * .02, y - 26 * L.s); c.lineTo(x + w * .04, y - 5); c.fill();
          c.beginPath(); c.moveTo(x + w * .12, y - 5); c.lineTo(x + w * .17, y - 20 * L.s); c.lineTo(x + w * .22, y - 5); c.fill();
        });
      }
    },
    top(c, th, vw, vh, cx, cyr, t, S) { birds(c, vw, vh, cx, cyr, t, 'rgba(30,40,70,.45)'); }
  },
  spires: {
    far(c, th, vw, vh, cx, cyr, t, S) {
      const yo = yBase(vh, cyr, .15, .8);
      cells(vw, cx * .15, 210, (x, k) => {
        const n = 1 + ((rh(k, 41) * 3) | 0);
        for (let i = 0; i < n; i++) {
          const w = 26 + rh(k, 42 + i) * 40, h = 90 + rh(k, 45 + i) * 150, bx = x + i * 34 - 20;
          c.fillStyle = mixc(S.cFar, '#8f7aff', .22); c.beginPath(); c.moveTo(bx - w / 2, yo); c.lineTo(bx - w * .12, yo - h); c.lineTo(bx, yo); c.fill();
          c.fillStyle = mixc(S.cFar, '#0a0820', .3); c.beginPath(); c.moveTo(bx, yo); c.lineTo(bx - w * .12, yo - h); c.lineTo(bx + w * .3, yo - h * .86); c.lineTo(bx + w / 2, yo); c.fill();
          const gl = (.35 + .5 * S.bass) * (.6 + .4 * Math.sin(t * 1.3 + k + i));
          c.fillStyle = 'rgba(111,227,255,' + (gl * .5).toFixed(3) + ')'; c.beginPath(); c.arc(bx - w * .12, yo - h, 5 + 8 * gl, 0, TAU); c.fill();
        }
      });
    },
    mid(c, th, vw, vh, cx, cyr, t, S) {      // drifting motes
      c.fillStyle = 'rgba(160,230,255,.5)';
      for (let i = 0; i < 26; i++) {
        const x = (((i * 211 - cx * (.1 + (i % 3) * .05) + Math.sin(t * .6 + i) * 16) % vw) + vw) % vw, y = vh - ((t * (10 + i % 5 * 6) + i * 53) % (vh + 20)) + 10, s = 1.4 + (i % 3) * .8 + S.hi * 1.2;
        c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-s, -s, s * 2, s * 2); c.restore();
      }
    },
    top(c, th, vw, vh, cx, cyr, t, S) { shootingStar(c, vw, vh, t, cx); }
  },
  nightcity: {
    back(c, th, vw, vh, cx, cyr, t, S) { moonDisc(c, vw, vh, cyr, S, { x0: .22, x1: .8, lo: .5, hi: .16, r: 30 }); shootingStar(c, vw, vh, t, cx); },
    far(c, th, vw, vh, cx, cyr, t, S) { skyline(c, vw, vh, cx, cyr, t, .14, .72, 52, 50, 150, mixc(S.cFar, '#04040c', .3), 11, { lit: .22 + S.e * .15, win: '#ffe29a', flick: 1 }); },
    mid(c, th, vw, vh, cx, cyr, t, S) { skyline(c, vw, vh, cx, cyr, t, .3, .88, 40, 40, 120, mixc(S.cMid, '#04040c', .35), 17, { lit: .4 + S.e * .2, win: '#ffd27a', beacon: 1, flick: 1 }); }
  },
  shards: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      for (let i = 0; i < 8; i++) {
        const x = ((((i * 197 + 80) - cx * (.05 + i * .01) + t * 5) % (vw + 300)) + vw + 300) % (vw + 300) - 150, y = vh * (.18 + (i * 37 % 60) / 100) - cyr * .05, s = 40 + (i % 3) * 26;
        c.save(); c.translate(x, y); c.rotate(t * .1 * (i % 2 ? 1 : -1) + i);
        c.fillStyle = 'hsla(' + ((i * 47 + t * 20) % 360).toFixed(0) + ',85%,68%,' + (.07 + .1 * S.bass).toFixed(3) + ')';
        c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .87, s * .5); c.lineTo(-s * .87, s * .5); c.closePath(); c.fill(); c.restore();
      }
      shootingStar(c, vw, vh, t, cx);
    }
  },
  aurora: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      const a = .06 + .22 * smooth(.15, .9, S.e);
      for (let r = 0; r < 3; r++) {
        const hue = [150, 175, 285][r], y0 = vh * (.12 + r * .07), g = c.createLinearGradient(0, y0 - 40, 0, y0 + vh * .42);
        g.addColorStop(0, 'hsla(' + hue + ',90%,65%,0)'); g.addColorStop(.3, 'hsla(' + hue + ',90%,65%,' + (a * (.7 + .5 * S.mid)).toFixed(3) + ')'); g.addColorStop(1, 'hsla(' + hue + ',90%,65%,0)');
        c.fillStyle = g; c.beginPath();
        const bot = [];
        for (let x = -12; x < vw + 24; x += 14) {      // a curtain: wavy upper edge, hanging lower edge
          const w = x + cx * .04, y = y0 + Math.sin(w * .008 + t * .35 + r * 2) * 26 + Math.sin(w * .02 - t * .6 + r) * 9 - cyr * .04;
          c.lineTo(x, y); bot.push(x, y + vh * (.2 + .1 * Math.sin(w * .013 + t * .5 + r * 3)));
        }
        for (let i = bot.length - 2; i >= 0; i -= 2) c.lineTo(bot[i], bot[i + 1]);
        c.closePath(); c.fill();
      }
    },
    far(c, th, vw, vh, cx, cyr, t, S) {     // snowy peaks
      const yo = yBase(vh, cyr, .1, .62);
      c.fillStyle = mixc(S.cFar, '#ffffff', .25); c.beginPath();
      cells(vw, cx * .1, 300, (x, k) => { const h = 90 + rh(k, 51) * 110, w = 150 + rh(k, 52) * 90; c.moveTo(x - w / 2, yo + 40); c.lineTo(x, yo - h); c.lineTo(x + w / 2, yo + 40); });
      c.fill();
      c.fillStyle = '#ffffff'; c.globalAlpha = .75; c.beginPath();
      cells(vw, cx * .1, 300, (x, k) => { const h = 90 + rh(k, 51) * 110, w = 150 + rh(k, 52) * 90; c.moveTo(x - w * .13, yo - h * .72); c.lineTo(x, yo - h); c.lineTo(x + w * .13, yo - h * .72); c.lineTo(x + w * .04, yo - h * .66); c.lineTo(x - w * .04, yo - h * .74); });
      c.fill(); c.globalAlpha = 1;
    }
  },
  shafts: {
    back(c, th, vw, vh, cx, cyr, t, S) { shafts(c, vw, vh, cx, t, '255,190,110', .05 + .07 * S.e + .05 * S.bass, 4); }
  },
  retro: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      const hy = vh * .6 - cyr * .02, r = vh * .26, sx = vw * .5 - cx * .01;
      const g = c.createLinearGradient(0, hy - r, 0, hy); g.addColorStop(0, '#ffe45a'); g.addColorStop(.55, '#ff6aa8'); g.addColorStop(1, '#b43cff');
      c.save(); c.beginPath(); c.rect(0, hy - r - 4, vw, r + 4); c.clip();
      c.globalAlpha = .75 + .15 * S.beat; c.fillStyle = g; c.beginPath(); c.arc(sx, hy, r, 0, TAU); c.fill(); c.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const yy = hy - r * (.1 + i * .15), hh = 6.5 - i * .95; c.fillStyle = mixc(S.sky0, S.sky1, clamp(yy / vh, 0, 1)); c.fillRect(sx - r, yy - hh / 2, r * 2, hh); }      // retro slits, wider towards the horizon
      c.restore();
    },
    far(c, th, vw, vh, cx, cyr, t, S) {       // equalizer skyline: the bars are the music
      const hy = yBase(vh, cyr, .1, .66), n = 16, bw = vw / n;
      for (let i = 0; i < n; i++) {
        const idle = .1 + .06 * Math.sin(t * 2 + i * .7), v = Math.max(S.spec[i], idle), h = v * vh * .3;
        c.fillStyle = 'hsla(' + (190 + i * 9) + ',90%,62%,' + (.2 + .3 * v).toFixed(3) + ')'; c.fillRect(i * bw + 2, hy - h, bw - 4, h + vh);
      }
    }
  },
  storm: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      for (let i = 0; i < 9; i++) {
        const x = ((((i * 197) - cx * .05 + t * 7) % (vw + 500)) + vw + 500) % (vw + 500) - 250, y = vh * (.06 + (i % 3) * .05) - cyr * .04, w = 190 + (i % 4) * 50;
        c.fillStyle = rgbaOf(mixc('#1a2038', '#0a0e1c', S.e), .55); c.beginPath(); c.ellipse(x, y, w, 34, 0, 0, TAU); c.ellipse(x + w * .5, y + 14, w * .6, 28, 0, 0, TAU); c.ellipse(x - w * .5, y + 12, w * .55, 26, 0, 0, TAU); c.fill();
      }
    },
    top: null     // lightning is handled in drawBackground (it needs the flash state)
  },
  volcano: {
    far(c, th, vw, vh, cx, cyr, t, S) {
      const yo = yBase(vh, cyr, .13, .76);
      cells(vw, cx * .13, 620, (x, k) => {
        const h = rh(k, 61); if (h < .25) return;
        const bw = 340 + h * 160, hh = 150 + h * 110, tw = 58;
        c.fillStyle = mixc(S.cFar, '#000000', .25); c.beginPath(); c.moveTo(x - bw / 2, yo + 60); c.lineTo(x - tw / 2, yo - hh); c.lineTo(x + tw / 2, yo - hh); c.lineTo(x + bw / 2, yo + 60); c.fill();
        const a = .5 + .4 * S.bass, g = c.createRadialGradient(x, yo - hh, 2, x, yo - hh, 70);
        g.addColorStop(0, 'rgba(255,170,60,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,90,20,0)');
        c.fillStyle = g; c.fillRect(x - 70, yo - hh - 70, 140, 140);
        c.strokeStyle = 'rgba(255,120,40,' + (.5 + .3 * S.bass).toFixed(2) + ')'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 8, yo - hh + 2); c.lineTo(x - 22, yo - hh * .6); c.lineTo(x - 14, yo - hh * .3); c.stroke();
        smoke(c, x, yo - hh, t, k + 40, '60,24,22', 6, 130);
      });
    },
    mid(c, th, vw, vh, cx, cyr, t, S) {
      const g = c.createLinearGradient(0, vh, 0, vh * .45), a = .28 + .3 * S.bass + .1 * S.e;
      g.addColorStop(0, 'rgba(255,90,20,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.fillRect(0, vh * .45, vw, vh * .55);
    }
  },
  reef: {
    back(c, th, vw, vh, cx, cyr, t, S) { shafts(c, vw, vh, cx, t, '120,230,255', .08 + .06 * S.bass, 3); },
    far(c, th, vw, vh, cx, cyr, t, S) {       // fish schools and a couple of jellyfish
      c.fillStyle = 'rgba(120,230,220,.22)'; c.beginPath();
      for (let f = 0; f < 3; f++) {
        const dir = f % 2 ? -1 : 1, sp = 24 + f * 10, bx = ((t * sp * dir + f * 400 - cx * .08) % (vw + 400) + vw + 400) % (vw + 400) - 200, by = vh * (.3 + f * .16) - cyr * .05 + Math.sin(t * .6 + f) * 10;
        for (let i = 0; i < 7; i++) {
          const x = bx - dir * (i % 4) * 22 - dir * (i >> 2) * 11, y = by + ((i * 37) % 5 - 2) * 9 + Math.sin(t * 2 + i) * 2;
          c.moveTo(x + 9 * dir, y); c.ellipse(x, y, 9, 4, 0, 0, TAU); c.moveTo(x - 7 * dir, y); c.lineTo(x - 15 * dir, y - 4 + Math.sin(t * 9 + i) * 1.5); c.lineTo(x - 15 * dir, y + 4);
        }
      }
      c.fill();
      for (let j = 0; j < 2; j++) {
        const x = ((((j * 560 + 200) - cx * .1 + Math.sin(t * .3 + j) * 40) % (vw + 300)) + vw + 300) % (vw + 300) - 150, pu = Math.sin(t * 1.8 + j * 2), y = vh * (.3 + j * .25) - cyr * .05 - pu * 6, glow = .2 + .25 * S.bass;
        const gr = c.createRadialGradient(x, y, 2, x, y, 40); gr.addColorStop(0, 'rgba(170,255,240,' + (glow * .8).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(170,255,240,0)'); c.fillStyle = gr; c.fillRect(x - 40, y - 40, 80, 80);
        c.fillStyle = 'rgba(150,255,235,' + (.3 + .15 * S.bass).toFixed(2) + ')'; c.beginPath(); c.ellipse(x, y, 17, 12 + pu * 2, 0, Math.PI, 0); c.fill();
        c.strokeStyle = 'rgba(150,255,235,.3)'; c.lineWidth = 1.4; c.beginPath();
        for (let i = -2; i <= 2; i++) { c.moveTo(x + i * 6, y); for (let s = 1; s <= 6; s++) c.lineTo(x + i * 6 + Math.sin(t * 2 + s * .9 + i) * 4, y + s * 6); }
        c.stroke();
      }
    },
    mid(c, th, vw, vh, cx, cyr, t, S) {       // swaying kelp
      c.strokeStyle = mixc('#0a4a4a', '#04202a', S.e); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
      cells(vw, cx * .3, 120, (x, k) => {
        if (rh(k, 71) < .3) return;
        const h = 90 + rh(k, 72) * 120; c.moveTo(x, vh + 4);
        for (let s = 1; s <= 8; s++) c.lineTo(x + Math.sin(t * .9 + k + s * .5) * s * 2.4, vh + 4 - h * s / 8);
      });
      c.stroke();
    }
  },
  neon: {
    far(c, th, vw, vh, cx, cyr, t, S) { skyline(c, vw, vh, cx, cyr, t, .14, .72, 56, 60, 170, mixc(S.cFar, '#06020c', .25), 23, { lit: .3, win: '#ff8ad8', flick: 1 }); },
    mid(c, th, vw, vh, cx, cyr, t, S) {
      skyline(c, vw, vh, cx, cyr, t, .3, .9, 46, 50, 130, mixc(S.cMid, '#06020c', .3), 29, { lit: .45, win: '#6df0ff', flick: 1, beacon: 1 });
      const yo = yBase(vh, cyr, .3, .9), cols = ['#ff3d9a', '#3dffe0', '#ffcf3a', '#9a5bff'];
      cells(vw, cx * .3, 46, (x, k) => {                    // neon signs: glow halo + bright core, flicker now and then
        const r = rh(k, 83); if (r > .22) return;
        const h = 50 + rh(k, 30) * 80, w = 46 * (.58 + .34 * rh(k, 29)), col = cols[(r * 100 | 0) % 4];
        const fl = rh(k, 5) < .3 && Math.sin(t * 23 + k) > .7 ? .35 : 1, a = (.55 + .35 * S.beat) * fl;
        c.fillStyle = rgbaOf(col, (a * .22).toFixed(3)); c.fillRect(x - 4, yo - h + 10, w + 8, 30);
        c.fillStyle = rgbaOf(col, a.toFixed(3)); c.fillRect(x + 4, yo - h + 18, w - 8, 3); c.fillRect(x + 4, yo - h + 28, w - 14, 3);
      });
    },
    top(c, th, vw, vh, cx, cyr, t, S) { shootingStar(c, vw, vh, t, cx); }
  },
  vault: {
    back(c, th, vw, vh, cx, cyr, t, S) {
      const x = vw * .72 - cx * .02, y = vh * .45 - cyr * .03, R = vh * .42;
      c.save(); c.translate(x, y); c.rotate(t * .05); c.strokeStyle = 'rgba(216,169,58,' + (.1 + .06 * S.bass).toFixed(3) + ')'; c.fillStyle = c.strokeStyle;
      c.lineWidth = 8; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, R * .72, 0, TAU); c.stroke();
      for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.fillRect(-4, R * .12, 8, R * .62); c.beginPath(); c.arc(0, R, 9, 0, TAU); c.fill(); }
      c.beginPath(); c.arc(0, 0, R * .14, 0, TAU); c.fill(); c.restore();
      for (let i = 0; i < 2; i++) {        // searchlights sweeping from the top corners
        const ox = i ? vw : 0, ang = (i ? Math.PI * 1.5 : Math.PI * .5) + Math.sin(t * .5 + i * 2) * .4, len = vh * 1.5, g = c.createLinearGradient(ox, 0, ox + Math.cos(ang) * len, Math.sin(ang) * len);
        g.addColorStop(0, 'rgba(255,225,150,.2)'); g.addColorStop(1, 'rgba(255,225,150,0)'); c.fillStyle = g;
        c.beginPath(); c.moveTo(ox, 0); c.lineTo(ox + Math.cos(ang - .09) * len, Math.sin(ang - .09) * len); c.lineTo(ox + Math.cos(ang + .09) * len, Math.sin(ang + .09) * len); c.closePath(); c.fill();
      }
    }
  }
};

// ---------- state: progress, music, speed ----------
const BG = (() => {
  const S = { e: 0, beat: 0, bass: 0, mid: 0, hi: 0, spec: new Float32Array(16), dash: 0, dir: 1, cp: 0, flash: 0, cFar: '#000000', cMid: '#000000', sky0: '#000000', sky1: '#000000' };
  let lvl = null, ps = 0, sx = 0, sy = 0, ex = 0, ey = 0;
  let bolt = null, boltAt = 3;
  const M = {
    s: S, force: null,
    cp() { S.cp = 1; },
    tick(dt, w, menu) {
      const L = w.L;
      if (L !== lvl) {      // new level: find the way from start to exit
        lvl = L; const ex0 = L.ents.find((e) => e.t === 'exit');
        sx = (L.start.x + .5) * T; sy = (L.start.y + .5) * T; ex = ex0 ? (ex0.x + .5) * T : sx + L.W * T; ey = ex0 ? ex0.y * T : sy; ps = -1;
      }
      let p;
      if (M.force != null) p = M.force;
      else if (menu) p = .5 - .5 * Math.cos(G.t * TAU / 70);
      else if (G.mode === 'gaunt') p = .5 - .5 * Math.cos(((w.p.x - sx) / 9000) * TAU);
      else { const dx = ex - sx, dy = ey - sy, d2 = dx * dx + dy * dy || 1; p = clamp(((w.p.x + w.p.w / 2 - sx) * dx + (w.p.y - sy) * dy) / d2, 0, 1); }
      if (ps < 0 || M.force != null) ps = p; else ps += (p - ps) * (1 - Math.exp(-dt * 1.2));
      S.e = ps * ps * (3 - 2 * ps);
      if (typeof Mus !== 'undefined') { const f = Mus.fx(dt); S.beat = f.beat; S.bass = f.bass; S.mid = f.mid; S.hi = f.hi; S.spec = f.spec; }
      const spd = menu ? 0 : Math.abs(w.p.vx), dashing = !menu && (w.p.dashT > 0);
      S.dash += ((dashing ? 1 : clamp((spd - 330) / 300, 0, .5)) - S.dash) * (1 - Math.exp(-dt * (dashing ? 14 : 5)));
      if (spd > 30) S.dir = w.p.vx > 0 ? 1 : -1;
      S.cp = Math.max(0, S.cp - dt * .9);
    }
  };
  // lightning: a bolt every 5-11 s with a quick double flash, never more than 3 flashes a second
  M.lightning = (c, vw, vh, t) => {
    S.flash = 0; if (REDUCED) return;
    if (!bolt && t > boltAt) {
      const x0 = vw * (.15 + .7 * Math.random()), pts = [[x0, -6]]; let x = x0, y = -6;
      while (y < vh * .62) { y += 24 + Math.random() * 26; x += (Math.random() - .5) * 46; pts.push([x, y]); }
      const br = pts[2 + ((Math.random() * (pts.length - 3)) | 0)] || pts[1], b2 = [br]; let bx = br[0], by = br[1];
      for (let i = 0; i < 4; i++) { by += 18 + Math.random() * 20; bx += (Math.random() < .5 ? -1 : 1) * (10 + Math.random() * 22); b2.push([bx, by]); }
      bolt = { t0: t, pts, b2 }; boltAt = t + 5 + Math.random() * 6;
      setTimeout(() => { try { Snd.play('thunder'); } catch (e) { /* ignore */ } }, 450 + Math.random() * 700);
    }
    if (bolt) {
      const p = t - bolt.t0;
      if (p > .5 || p < 0) { bolt = null; return; }
      const f = p < .06 ? p / .06 : p < .14 ? 1 - (p - .06) / .08 * .75 : p < .22 ? .25 + (p - .14) / .08 * .65 : Math.max(0, .9 - (p - .22) / .28 * .9);
      S.flash = f;
      c.strokeStyle = 'rgba(235,240,255,' + Math.min(1, f * 1.25).toFixed(3) + ')'; c.lineWidth = 2.6; c.lineJoin = 'round'; c.beginPath();
      bolt.pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); bolt.b2.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
      c.strokeStyle = 'rgba(160,185,255,' + (f * .3).toFixed(3) + ')'; c.lineWidth = 9; c.stroke();
    }
  };
  return M;
})();

function drawBackground(ctx, th, vw, vh, cx, cy, midY, t) {
  const S = BG.s, e = S.e, d = th.dusk, cyr = cy - midY, sc = d && SCN[d.scn];
  const c0 = d ? mixc(th.sky[0], d.sky[0], e) : th.sky[0], c1 = d ? mixc(th.sky[1], d.sky[1], e) : th.sky[1];
  S.sky0 = c0; S.sky1 = c1; S.cFar = d ? mixc(th.far, d.far, e) : th.far; S.cMid = d ? mixc(th.mid, d.mid, e) : th.mid;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  const sa = th.stars ? 1 : (d && d.stars ? smooth(.55, .95, e) : 0);
  if (sa > .01) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) {
      const px = ((i * 977) % 1000) / 1000, py = ((i * 613) % 1000) / 1000;
      const sx = (((px * vw * 1.6 - cx * .03) % vw) + vw) % vw;
      const sy = (((py * vh * 1.4 - cyr * .02) % vh) + vh) % vh;
      ctx.globalAlpha = sa * (.25 + .6 * Math.abs(Math.sin(t * 1.2 + i * 1.3)));
      const s = i % 7 === 0 ? 2.2 : 1.2;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
  }
  if (sc && sc.back) sc.back(ctx, th, vw, vh, cx, cyr, t, S);
  if (th.cloud) {
    const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(th.cloud);
    const base = m ? '#' + H2[+m[1]] + H2[+m[2]] + H2[+m[3]] : '#ffffff', ca = m ? +m[4] : .75;
    ctx.globalAlpha = ca * (1 - .25 * e); ctx.fillStyle = d && d.cloud ? mixc(base, d.cloud, e) : base;
    for (let i = 0; i < 7; i++) {
      const w = 90 + (i * 53) % 90;
      const x = ((((i * 331 + t * (6 + i)) - cx * .22) % (vw + 300)) + vw + 300) % (vw + 300) - 150;
      const y = vh * (.08 + ((i * 37) % 40) / 100) - cyr * .08;
      ctx.beginPath();
      ctx.moveTo(x + w * .5, y); ctx.ellipse(x, y, w * .5, w * .16, 0, 0, TAU);
      ctx.moveTo(x - w * .22 + w * .3, y + 4); ctx.ellipse(x - w * .22, y + 4, w * .3, w * .13, 0, 0, TAU);
      ctx.moveTo(x + w * .24 + w * .28, y + 5); ctx.ellipse(x + w * .24, y + 5, w * .28, w * .12, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ridge(ctx, vw, vh, cx, cyr, .12, .62, 26, .006, S.cFar, 1.3);
  if (sc && sc.far) sc.far(ctx, th, vw, vh, cx, cyr, t, S);
  ridge(ctx, vw, vh, cx, cyr, .26, .74, 30, .009, S.cMid, 4.1);
  if (sc && sc.mid) sc.mid(ctx, th, vw, vh, cx, cyr, t, S);
  if (th.fx && BGFX[th.fx]) BGFX[th.fx](ctx, th, vw, vh, cx, cyr, t);
  if (th.embers) {
    for (let i = 0; i < 46; i++) {
      const sp = 24 + (i % 5) * 14;
      const x = (((i * 131 + Math.sin(t * .8 + i) * 22 - cx * .15) % vw) + vw) % vw;
      const y = vh - ((t * sp + i * 97) % (vh + 40)) + 20;
      ctx.globalAlpha = .35 + .5 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = i % 3 ? '#ff9a2e' : '#ffd34a';
      ctx.fillRect(x, y, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;
  }
  if (sc && sc.top) sc.top(ctx, th, vw, vh, cx, cyr, t, S);
  if (d && d.scn === 'storm') {
    BG.lightning(ctx, vw, vh, t);
    if (S.flash > 0) { ctx.fillStyle = 'rgba(205,220,255,' + (S.flash * .2).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
  }
  // speed streaks while dashing
  if (S.dash > .08 && !REDUCED) {
    ctx.strokeStyle = 'rgba(255,255,255,' + (S.dash * .16).toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const y = ((i * 137 + 40) % 1000) / 1000 * vh, len = 70 + (i % 4) * 40, x = ((((i * 211) - S.dir * t * (900 + i * 70)) % (vw + 300)) + vw + 300) % (vw + 300) - 150;
      ctx.moveTo(x, y); ctx.lineTo(x + len * S.dash, y);
    }
    ctx.stroke();
  }
  // checkpoint: the whole backdrop lights up for a moment
  if (S.cp > .01) { ctx.fillStyle = rgbaOf(th.accent, (S.cp * .16).toFixed(3)); ctx.fillRect(0, 0, vw, vh); }
}

'use strict';
// World rendering: themes, tiles, entities.
// ---- world rendering: themes, backgrounds, tiles, entities ----
const TAU = Math.PI * 2;
const THEMES = {
  dawn:    { sky: ['#ffd9ae', '#a8d6f0'], far: '#f1bba2', mid: '#d99aa4', tile: '#2e3b52', hi: '#55709a', lo: '#1c2535', accent: '#ff6a3d', ink: '#141824', out: '#fff6e8', band: '#e8412e', cloud: 'rgba(255,255,255,.75)' },
  mill:    { sky: ['#eaf2c6', '#82c1a2'], far: '#a6cfa8', mid: '#5e9c84', tile: '#34423b', hi: '#62826c', lo: '#1f2924', accent: '#f5a524', ink: '#10201a', out: '#f3ffe6', band: '#e8412e', cloud: 'rgba(255,255,255,.55)' },
  forge:   { sky: ['#3a1416', '#c24a1c'], far: '#6b2a22', mid: '#411b1d', tile: '#2b2427', hi: '#6b564c', lo: '#171315', accent: '#ffb02e', ink: '#f6ede6', out: '#1a0c0c', band: '#ff5a3c', embers: 1 },
  sky:     { sky: ['#68bfff', '#eef8ff'], far: '#bfe0f5', mid: '#93c4ec', tile: '#3a4d76', hi: '#7a96d0', lo: '#24325a', accent: '#ff7a59', ink: '#101828', out: '#ffffff', band: '#e8412e', cloud: 'rgba(255,255,255,.9)' },
  crystal: { sky: ['#151132', '#4b3a96'], far: '#3b2f80', mid: '#2a2269', tile: '#25294f', hi: '#6f78dc', lo: '#14172f', accent: '#6fe3ff', ink: '#eef2ff', out: '#0c0a22', band: '#ff5f8a', stars: 1 },
  night:   { sky: ['#070a1b', '#2b2054'], far: '#1d1a3c', mid: '#141231', tile: '#1d2036', hi: '#4d5388', lo: '#0e0f1b', accent: '#ff4d6d', ink: '#f2f4ff', out: '#080912', band: '#ff4d6d', stars: 1 }
};

const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function ridge(ctx, vw, vh, cx, cy, par, base, amp, freq, color, seed) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, vh);
  const yo = clamp(vh * base - cy * par * .3, vh * .25, vh * 1.15);
  for (let sx = 0; sx <= vw + 8; sx += 8) {
    const wx = sx + cx * par;
    const h = Math.sin(wx * freq + seed) * amp + Math.sin(wx * freq * 2.3 + seed * 1.7) * amp * .5 + Math.sin(wx * freq * .45 + seed * .3) * amp * .8;
    ctx.lineTo(sx, yo + h);
  }
  ctx.lineTo(vw, vh); ctx.closePath(); ctx.fill();
}

// drawBackground() lives in 04-render-bg.js

function flame(ctx, bx, by, w, h, t, s) {
  const cols = ['#e8421c', '#ff8a1f', '#ffd34a'];
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * .28, wob = Math.sin(t * 10 + s + i * 1.7) * w * .12;
    const hh = h * k * (.85 + .15 * Math.sin(t * 13 + s * 2 + i));
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.moveTo(bx - w * .5 * k, by);
    ctx.bezierCurveTo(bx - w * .55 * k, by - hh * .45, bx - w * .15 * k + wob, by - hh * .65, bx + wob * 1.4, by - hh);
    ctx.bezierCurveTo(bx + w * .15 * k + wob, by - hh * .65, bx + w * .55 * k, by - hh * .45, bx + w * .5 * k, by);
    ctx.closePath(); ctx.fill();
  }
}

function drawSpikeTile(ctx, c, x, y) {
  ctx.save(); ctx.translate(x + T / 2, y + T / 2);
  ctx.rotate(c === '^' ? 0 : c === 'v' ? Math.PI : c === '<' ? -Math.PI / 2 : Math.PI / 2);
  ctx.fillStyle = '#6d788c'; ctx.fillRect(-16, 12, 32, 4);
  for (let i = 0; i < 3; i++) {
    const bx = -16 + i * 10.67;
    ctx.fillStyle = '#e1e7f0'; ctx.beginPath(); ctx.moveTo(bx, 12); ctx.lineTo(bx + 5.3, -10); ctx.lineTo(bx + 5.3, 12); ctx.fill();
    ctx.fillStyle = '#9aa6bb'; ctx.beginPath(); ctx.moveTo(bx + 5.3, -10); ctx.lineTo(bx + 10.67, 12); ctx.lineTo(bx + 5.3, 12); ctx.fill();
  }
  ctx.restore();
}

function drawTiles(ctx, L, th, x0, y0, x1, y1, t, w) {
  const tx0 = Math.max(0, Math.floor(x0 / T)), tx1 = Math.min(L.W - 1, Math.floor(x1 / T));
  const ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(L.H - 1, Math.floor(y1 / T));
  const isS = (x, y) => x < 0 || x >= L.W || y >= L.H ? true : y < 0 ? false : '#{}'.includes(L.g[y][x]);
  for (let ty = ty0; ty <= ty1; ty++) {
    const row = L.g[ty];
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = row[tx];
      if (c === '.' || c === 'w' || c === '%') continue;
      const x = tx * T, y = ty * T;
      if (c === '#' || c === '{' || c === '}') {
        ctx.fillStyle = th.tile; ctx.fillRect(x, y, T, T);
        const h = hash2(tx, ty);
        if (h < .2) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(x, y, T, T); }
        else if (h > .8) { ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x, y, T, T); }
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x + T - 1, y, 1, T);
        if (!isS(tx, ty - 1)) { ctx.fillStyle = th.hi; ctx.fillRect(x, y, T, 5); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y, T, 1.5); }
        if (!isS(tx, ty + 1)) { ctx.fillStyle = th.lo; ctx.fillRect(x, y + T - 4, T, 4); }
        if (!isS(tx - 1, ty)) { ctx.fillStyle = th.hi; ctx.globalAlpha = .55; ctx.fillRect(x, y, 2, T); ctx.globalAlpha = 1; }
        if (!isS(tx + 1, ty)) { ctx.fillStyle = th.lo; ctx.fillRect(x + T - 3, y, 3, T); }
        if (c !== '#') {
          const e = w && w.emits.find(q => q.tx === tx && q.ty === ty);
          const dir = c === '}' ? 1 : -1;
          ctx.fillStyle = th.lo; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
          const gx = dir > 0 ? x + T - 9 : x + 9;
          ctx.fillStyle = e && e.warn ? '#ffe27a' : '#0b0b12';
          ctx.beginPath(); ctx.arc(gx, y + T / 2, 7, 0, TAU); ctx.fill();
          ctx.strokeStyle = th.accent; ctx.lineWidth = 2.5; ctx.stroke();
          if (e && e.warn) { ctx.globalAlpha = .4; ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(gx + dir * 6, y + T / 2, 12, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        }
      } else if (c === '~') {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 4, y + T - 5, T - 8, 5);
        flame(ctx, x + T / 2, y + T - 3, 26, 30, t, tx * 3.1);
      } else {
        drawSpikeTile(ctx, c, x, y);
      }
    }
  }
}

function drawSaw(ctx, s, th) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
  const n = 12, step = TAU / n, ro = s.r + 2, ri = s.r - 4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i * step;
    ctx.lineTo(Math.cos(a) * ro, Math.sin(a) * ro);
    ctx.lineTo(Math.cos(a + step * .55) * ri, Math.sin(a + step * .55) * ri);
    ctx.lineTo(Math.cos(a + step) * ri, Math.sin(a + step) * ri);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, ro);
  g.addColorStop(0, '#f4f7fb'); g.addColorStop(1, '#8d99ae');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#4a5468'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(0, 0, s.r * .32, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2b3243';
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + .5; ctx.beginPath(); ctx.arc(Math.cos(a) * s.r * .6, Math.sin(a) * s.r * .6, 2.4, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawEntities(ctx, w, th, t) {
  // rails under moving things
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
  for (const s of w.saws) if (s.ax) { ctx.beginPath(); if (s.ax === 'x') { ctx.moveTo(s.b0, s.y); ctx.lineTo(s.b1, s.y); } else { ctx.moveTo(s.x, s.b0); ctx.lineTo(s.x, s.b1); } ctx.stroke(); }
  for (const s of w.solids) if (s.k === 'plat') { ctx.beginPath(); if (s.ax === 'x') { ctx.moveTo(s.b0, s.y + 8); ctx.lineTo(s.b1 + s.w, s.y + 8); } else { const cx = s.x + s.w / 2; ctx.moveTo(cx, s.b0); ctx.lineTo(cx, s.b1 + 8); } ctx.stroke(); }
  ctx.restore();

  drawExtrasUnder(ctx, w, th, t);
  // exit portal
  if (w.exit) {
    const e = w.exit, cx = e.x + T / 2, cy = e.y + T;
    const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
    gl.addColorStop(0, th.accent); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = .55 + .15 * Math.sin(t * 4); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 46, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = th.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy, 17, 30, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 9]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(cx, cy, 11, 23, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  // checkpoints
  for (const c of w.cps) {
    const px = c.tx * T + 10, base = (c.ty + 1) * T, top = (c.ty - 1) * T + 6;
    ctx.fillStyle = '#6b7487'; ctx.fillRect(px - 2, top, 4, base - top);
    ctx.fillStyle = '#4a5265'; ctx.fillRect(px - 6, base - 5, 12, 5);
    const fy = c.on ? lerp(base - 18, top + 2, c.t) : base - 18;
    const fl = Math.sin(t * 6 + c.tx) * 2.5;
    ctx.fillStyle = c.on ? th.accent : '#9aa3b5';
    ctx.beginPath(); ctx.moveTo(px + 2, fy); ctx.quadraticCurveTo(px + 12, fy + 2 + fl, px + 22, fy + 7 + fl); ctx.quadraticCurveTo(px + 12, fy + 10 + fl, px + 2, fy + 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.on ? '#fff' : '#6b7487'; ctx.beginPath(); ctx.arc(px, top, 3.5, 0, TAU); ctx.fill();
  }
  // springs
  for (const s of w.springs) {
    const sq = s.a > 0 ? s.a / .3 : 0, padY = s.y + 3 + sq * 8;
    ctx.fillStyle = '#3c4458'; ctx.fillRect(s.x - 1, s.y + 12, s.w + 2, 6);
    ctx.strokeStyle = '#c3cad8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 5, s.y + 12);
    for (let i = 0; i < 4; i++) { ctx.lineTo(s.x + s.w - 5, padY + 3 + ((s.y + 12 - padY - 3) * (i + .5) / 4)); ctx.lineTo(s.x + 5, padY + 3 + ((s.y + 12 - padY - 3) * (i + 1) / 4)); }
    ctx.stroke();
    ctx.fillStyle = th.accent; ctx.fillRect(s.x - 2, padY, s.w + 4, 5);
  }
  // solids: platforms + crumbling blocks
  for (const s of w.solids) {
    if (s.k === 'plat') {
      ctx.fillStyle = '#272f43'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = th.accent; ctx.fillRect(s.x, s.y, s.w, 4);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(s.x, s.y, s.w, 1.5);
      ctx.fillStyle = '#8791a6'; for (let i = 8; i < s.w; i += 16) ctx.fillRect(s.x + i - 1.5, s.y + 8, 3, 3);
    } else if (s.k === 'fall' && s.st < 3) {
      const sh = s.st === 1 ? Math.sin(t * 70) * 1.6 : 0;
      ctx.save(); ctx.translate(s.x + sh, s.y);
      if (s.st === 2) ctx.globalAlpha = Math.max(.15, 1 - s.vy / 700);
      ctx.fillStyle = '#5a4a3e'; ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#8b7260'; ctx.fillRect(0, 0, T, 4); ctx.fillRect(0, 0, 3, T);
      ctx.fillStyle = '#3f332b'; ctx.fillRect(0, T - 3, T, 3); ctx.fillRect(T - 3, 0, 3, T);
      ctx.strokeStyle = '#3f332b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(T - 5, T - 5); ctx.moveTo(T - 5, 5); ctx.lineTo(5, T - 5); ctx.stroke();
      if (s.st >= 1) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(T / 2, 0); ctx.lineTo(T / 2 - 4, 12); ctx.lineTo(T / 2 + 3, 20); ctx.stroke(); }
      ctx.restore();
    }
  }
  // glider pickups
  for (const k of w.picks) {
    if (k.got) continue;
    const by = Math.sin(t * 3) * 3;
    const gl = ctx.createRadialGradient(k.x, k.y + by, 2, k.x, k.y + by, 24);
    gl.addColorStop(0, 'rgba(255,255,255,.8)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(k.x, k.y + by, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = th.accent; ctx.beginPath(); ctx.moveTo(k.x - 15, k.y + by + 5); ctx.lineTo(k.x, k.y + by - 10); ctx.lineTo(k.x + 15, k.y + by + 5); ctx.lineTo(k.x, k.y + by + 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
  }
  // fire jets
  for (const j of w.jets) {
    const bx = j.tx * T + T / 2, by = (j.ty + 1) * T;
    ctx.fillStyle = '#1b1517'; ctx.fillRect(bx - 11, by - 6, 22, 6);
    ctx.fillStyle = '#4a3b3b'; for (let i = -8; i <= 6; i += 5) ctx.fillRect(bx + i, by - 5, 3, 3);
    if (j.on) flame(ctx, bx, by - 4, 28, 2 * T + 4, t, j.tx);
    else if (j.warn) {
      flame(ctx, bx, by - 4, 14, 14 + 6 * Math.sin(t * 40), t, j.tx);
      ctx.fillStyle = '#ffd34a'; for (let i = 0; i < 3; i++) ctx.fillRect(bx + Math.sin(t * 30 + i * 2) * 8, by - 12 - ((t * 60 + i * 9) % 18), 2, 2);
    }
  }
  // saws
  for (const s of w.saws) drawSaw(ctx, s, th);
  // darts
  for (const d of w.darts) {
    ctx.save(); ctx.translate(d.x + d.w / 2, d.y + d.h / 2); if (d.dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = th.accent; ctx.fillRect(-12, -3, 14, 6);
    ctx.fillStyle = '#e8edf6'; ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(13, 0); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-20, -1, 8, 2);
    ctx.restore();
  }
  drawExtrasOver(ctx, w, th, t);
}

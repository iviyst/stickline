'use strict';
// World 3 rendering: water, coins, trophies, VIP cards, light traps.
// ---- drawing for the second wave of elements: water, secret walls, coins, trophies, VIP cards + doors, red/green light traps ----

// light cones go behind the tiles so they read as light, not as objects
function drawLightCones(ctx, w, t) {
  for (const l of w.lights) {
    const col = l.st === 'g' ? '61,255,138' : l.st === 'y' ? '255,210,58' : '255,58,58';
    const a = l.st === 'r' ? .2 + .06 * Math.sin(t * 20) : l.st === 'y' ? .12 + .1 * (Math.sin(t * 18) > 0 ? 1 : 0) : .1;
    const bot = Math.min(l.y1, w.L.H * T);
    const gr = ctx.createLinearGradient(0, l.y, 0, bot);
    gr.addColorStop(0, 'rgba(' + col + ',' + (a * 1.6).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + col + ',' + (a * .5).toFixed(3) + ')');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(l.x - 8, l.y + 8); ctx.lineTo(l.x + 8, l.y + 8); ctx.lineTo(l.z1, bot); ctx.lineTo(l.z0, bot); ctx.closePath(); ctx.fill();
  }
}

function drawLamp(ctx, l, t) {
  const x = l.x, y = l.y;
  ctx.fillStyle = '#14161f'; ctx.strokeStyle = '#3b4157'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 15, y - 13, 30, 24, 6) : ctx.rect(x - 15, y - 13, 30, 24); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b4157'; ctx.fillRect(x - 2, y - 13 - 10, 4, 10);
  const col = l.st === 'g' ? '#3dff8a' : l.st === 'y' ? '#ffd23a' : '#ff3a3a';
  const blink = l.st === 'y' && Math.sin(t * 18) < 0;
  const gl = ctx.createRadialGradient(x, y, 1, x, y, 30);
  gl.addColorStop(0, blink ? 'rgba(0,0,0,0)' : col); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = .55; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = blink ? '#5a4a1a' : col; ctx.beginPath(); ctx.arc(x, y - 1, 8, 0, TAU); ctx.fill();
  if (l.st === 'r') {   // the watching eye: a pupil that tracks downward
    ctx.fillStyle = '#2a0000'; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 2.3) * 2.5, y + 1, 2.6, 5, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - 3, y - 4, 2, 0, TAU); ctx.fill();
}

function drawCoin(ctx, c, t) {
  if (c.got) return;
  const y = c.y + Math.sin(t * 3.4 + c.i * .7) * 2, sq = Math.abs(Math.cos(t * 3 + c.i * .5));
  const rx = 7.5 * (.25 + .75 * sq);
  ctx.fillStyle = '#b77b00'; ctx.beginPath(); ctx.ellipse(c.x + 1, y + 1, rx, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.ellipse(c.x, y, rx, 8, 0, 0, TAU); ctx.fill();
  if (sq > .4) { ctx.fillStyle = '#fff3b0'; ctx.fillRect(c.x - rx * .25, y - 4.5, Math.max(1, rx * .3), 9); }
}

function drawTrophy(ctx, tr, t, have) {
  if (!tr || tr.got) return;
  const x = tr.x, y = tr.y + Math.sin(t * 2.4) * 3;
  if (have) {
    ctx.strokeStyle = 'rgba(255,207,58,.55)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 10, y - 11); ctx.lineTo(x + 10, y - 11); ctx.lineTo(x + 6, y + 3); ctx.lineTo(x - 6, y + 3); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  const gl = ctx.createRadialGradient(x, y, 2, x, y, 36);
  gl.addColorStop(0, 'rgba(255,214,80,.7)'); gl.addColorStop(1, 'rgba(255,214,80,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 36, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = '#7a4d00'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 11, y - 12); ctx.lineTo(x + 11, y - 12); ctx.quadraticCurveTo(x + 10, y + 3, x, y + 4); ctx.quadraticCurveTo(x - 10, y + 3, x - 11, y - 12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 12, y - 6, 4.5, Math.PI * .5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 12, y - 6, 4.5, -Math.PI * .5, Math.PI * .5); ctx.stroke();
  ctx.fillRect(x - 2, y + 4, 4, 5); ctx.fillRect(x - 7, y + 9, 14, 4); ctx.strokeRect(x - 7, y + 9, 14, 4);
  ctx.fillStyle = '#fff6c8'; ctx.fillRect(x - 6, y - 10, 3, 9);
  const tw = (t * 1.3) % 1; if (tw < .3) { const k = Math.sin(tw / .3 * Math.PI); ctx.fillStyle = '#fff'; ctx.fillRect(x + 7 - 6 * k, y - 15, 12 * k, 1.6); ctx.fillRect(x + 7 - .8, y - 15 - 6 * k + .8, 1.6, 12 * k); }
}

function drawCard(ctx, k, t) {
  if (k.got) return;
  const x = k.x, y = k.y + Math.sin(t * 2.8) * 2.5, tilt = Math.sin(t * 1.7) * .15;
  const gl = ctx.createRadialGradient(x, y, 2, x, y, 30);
  gl.addColorStop(0, 'rgba(190,120,255,.6)'); gl.addColorStop(1, 'rgba(190,120,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.fillStyle = '#7b3cff'; ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-13, -9, 26, 18, 3) : ctx.rect(-13, -9, 26, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffcf3a'; ctx.fillRect(-10, -5, 6, 5);
  ctx.fillStyle = '#fff'; ctx.font = '700 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIP', 4, 1);
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-10, 4, 20, 1.5);
  ctx.restore();
}

function drawDoor(ctx, s, t, th) {
  const h = s.h * (1 - (s.openT || 0));
  if (h < 1 && !s.solid) return;
  ctx.fillStyle = '#2b2f45'; ctx.fillRect(s.x, s.y, s.w, h);
  ctx.fillStyle = '#7b3cff';
  for (let yy = s.y + 6; yy < s.y + h - 4; yy += 14) ctx.fillRect(s.x + 3, yy, s.w - 6, 4);
  ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, Math.max(0, h - 2));
  if (s.solid) {
    const cy = s.y + s.h / 2;
    ctx.fillStyle = '#14161f'; ctx.fillRect(s.x + s.w / 2 - 5, cy - 8, 10, 16);
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff3a3a' : '#7a1b1b'; ctx.beginPath(); ctx.arc(s.x + s.w / 2, cy - 3, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffcf3a'; ctx.font = '700 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VIP', s.x + s.w / 2, cy + 6);
  }
}

function drawVex8Over(ctx, w, th, t) {
  for (const s of w.solids) if (s.k === 'door') drawDoor(ctx, s, t, th);
  for (const l of w.lights) drawLamp(ctx, l, t);
  for (const c of w.coins) drawCoin(ctx, c, t);
  for (const k of w.cards) drawCard(ctx, k, t);
  drawTrophy(ctx, w.trophy, t, w.trophyHave);
}

// water and secret walls draw over the player: you're submerged, or hidden in a passage
function drawOverlayTiles(ctx, L, th, x0, y0, x1, y1, t, w) {
  const tx0 = Math.max(0, Math.floor(x0 / T)), tx1 = Math.min(L.W - 1, Math.floor(x1 / T));
  const ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(L.H - 1, Math.floor(y1 / T));
  const p = w && w.p, pcx = p ? p.x + p.w / 2 : -1e9, pcy = p ? p.y + p.h / 2 : -1e9;
  for (let ty = ty0; ty <= ty1; ty++) {
    const row = L.g[ty];
    for (let tx = tx0; tx <= tx1; tx++) {
      const c = row[tx];
      if (c !== 'w' && c !== '%') continue;
      const x = tx * T, y = ty * T;
      if (c === 'w') {
        const surf = ty === 0 || L.g[ty - 1][tx] !== 'w';
        ctx.fillStyle = 'rgba(38,128,255,.38)'; ctx.fillRect(x, y, T, T);
        if (surf) {
          ctx.fillStyle = 'rgba(160,220,255,.75)';
          ctx.beginPath(); ctx.moveTo(x, y + 3);
          for (let i = 0; i <= 8; i++) ctx.lineTo(x + i * 4, y + 2 + Math.sin(t * 3 + (tx * 8 + i) * .55) * 1.6);
          ctx.lineTo(x + T, y + 5); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill();
        } else if (hash2(tx, ty) > .86) {
          const k = ((t * .5 + hash2(ty, tx)) % 1);
          ctx.fillStyle = 'rgba(200,235,255,.45)'; ctx.beginPath(); ctx.arc(x + 8 + hash2(tx + 3, ty) * 16, y + T - k * T, 2, 0, TAU); ctx.fill();
        }
      } else {
        // looks like a wall, but you can walk through it; it fades when you're close
        const d = Math.hypot(x + T / 2 - pcx, y + T / 2 - pcy);
        ctx.globalAlpha = d < 70 ? .3 : d < 110 ? .3 + (d - 70) / 40 * .7 : 1;
        ctx.fillStyle = th.tile; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x + T - 1, y, 1, T);
        const isS = (a, b) => b >= 0 && b < L.H && a >= 0 && a < L.W && '#{}%'.includes(L.g[b][a]);
        if (!isS(tx, ty - 1)) { ctx.fillStyle = th.hi; ctx.fillRect(x, y, T, 5); }
        if (hash2(tx, ty) > .7) { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(x, y, T, T); }
        ctx.globalAlpha = 1;
      }
    }
  }
}

// breath bubbles over the head while underwater
function drawBreath(ctx, p, t) {
  if (!p || p.air >= K.AIR - .01) return;
  const n = 5, full = p.air / K.AIR * n, x = p.x + p.w / 2 - (n - 1) * 5, y = p.y - 26;
  for (let i = 0; i < n; i++) {
    const f = clamp(full - i, 0, 1);
    ctx.strokeStyle = p.air < 1.5 && Math.sin(t * 16) > 0 ? '#ff6b6b' : 'rgba(220,240,255,.9)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x + i * 10, y, 4, 0, TAU); ctx.stroke();
    if (f > 0) { ctx.fillStyle = 'rgba(140,210,255,' + (.35 + .55 * f).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x + i * 10, y, 4 * f, 0, TAU); ctx.fill(); }
  }
}

// ---------- world 3 themes ----------
Object.assign(THEMES, {
  deep:  { sky: ['#03202c', '#0e5a6e'], far: '#0b3f50', mid: '#072e3b', tile: '#1b3a44', hi: '#4fd1c5', lo: '#0b1d23', accent: '#5ef0d6', ink: '#ecfffb', out: '#04141a', band: '#ff6b5a', fx: 'bubbles' },
  neon:  { sky: ['#12051f', '#3a0f4a'], far: '#2a0b3a', mid: '#1c0729', tile: '#241634', hi: '#d46bff', lo: '#120a1c', accent: '#ffcf3a', ink: '#fff4ff', out: '#0b0412', band: '#3dff8a', stars: 1, fx: 'grid' },
  vault: { sky: ['#0e0b06', '#3b2c12'], far: '#2b210f', mid: '#1c160a', tile: '#2a2418', hi: '#d8a93a', lo: '#14110a', accent: '#ffcf3a', ink: '#fff8e6', out: '#0d0a04', band: '#7b3cff', fx: 'ash' }
});
BGFX.bubbles = function (ctx, th, vw, vh, cx, cy, t) {
  ctx.fillStyle = 'rgba(180,240,255,.18)';
  for (let i = 0; i < 46; i++) {
    const dep = .06 + (i % 4) * .05, sp = 18 + (i % 6) * 9;
    const x = (((i * 173 + Math.sin(t * .9 + i) * 10 - cx * dep) % vw) + vw) % vw;
    const y = vh - ((((t * sp + i * 97) - cy * dep * .3) % (vh + 40)) + vh + 40) % (vh + 40) + 20;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, TAU); ctx.fill();
  }
  // light shafts from above
  for (let i = 0; i < 4; i++) {
    const x = (((i * 331 - cx * .05) % (vw + 300)) + vw + 300) % (vw + 300) - 150;
    const g = ctx.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, 'rgba(120,230,255,.10)'); g.addColorStop(1, 'rgba(120,230,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 140 + Math.sin(t * .4 + i) * 20, vh); ctx.lineTo(x + 40, vh); ctx.closePath(); ctx.fill();
  }
};

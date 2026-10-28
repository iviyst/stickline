'use strict';
// World 2 rendering: effects, gems, orbs, lasers, crushers, belts, ice, fans.
// ---- world 2 look: themes, background effects, and drawing for gems, orbs, lasers, crushers, belts, ice, fans, chase wall ----
Object.assign(THEMES, {
  prism:   { sky: ['#1a0f3d', '#c93f9a'], far: '#5b2a8c', mid: '#35185f', tile: '#2a2150', hi: '#8f6bff', lo: '#150f2e', accent: '#4de8ff', ink: '#f4f0ff', out: '#0e0820', band: '#ffd34a', stars: 1, fx: 'prism' },
  frost:   { sky: ['#bfe6ff', '#f4fbff'], far: '#b4d6ee', mid: '#8fbfe0', tile: '#35506e', hi: '#a9d8ff', lo: '#1f3148', accent: '#3fb6ff', ink: '#10213a', out: '#ffffff', band: '#e8412e', cloud: 'rgba(255,255,255,.85)', fx: 'snow' },
  gear:    { sky: ['#2a2118', '#7a5630'], far: '#523b24', mid: '#35271a', tile: '#3d332b', hi: '#a6835a', lo: '#1e1812', accent: '#ffb02e', ink: '#f4e8d8', out: '#150f08', band: '#ff5a3c', fx: 'gears' },
  grid:    { sky: ['#04121a', '#0c3447'], far: '#0a2a38', mid: '#07202b', tile: '#14283a', hi: '#3fd2ff', lo: '#08131d', accent: '#ff3b6b', ink: '#e6fbff', out: '#03090d', band: '#ff3b6b', fx: 'grid' },
  storm:   { sky: ['#222c46', '#8296ba'], far: '#4d5d82', mid: '#38466a', tile: '#2a3450', hi: '#7d92c8', lo: '#171d30', accent: '#ffd34a', ink: '#f0f4ff', out: '#0b0f1c', band: '#ffd34a', cloud: 'rgba(40,50,80,.55)', fx: 'rain' },
  inferno: { sky: ['#1c0508', '#7a1414'], far: '#4a0f12', mid: '#2e080b', tile: '#2b1618', hi: '#a8544a', lo: '#140809', accent: '#ff7a2e', ink: '#fff0e6', out: '#120405', band: '#ffd34a', embers: 1, fx: 'ash' }
});

// ---------- background effects (screen space, parallax) ----------
const BGFX = {
  prism(ctx, th, vw, vh, cx, cy, t) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = ((((i * 211 + t * 14) - cx * .08) % (vw + 400)) + vw + 400) % (vw + 400) - 200;
      const g = ctx.createLinearGradient(x, 0, x + 120, vh);
      const h = (i * 52 + t * 12) % 360;
      g.addColorStop(0, 'hsla(' + h + ',90%,65%,0)'); g.addColorStop(.5, 'hsla(' + h + ',90%,65%,' + (.13 + .12 * BG.s.bass).toFixed(3) + ')'); g.addColorStop(1, 'hsla(' + h + ',90%,65%,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 330, vh); ctx.lineTo(x + 200, vh); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  snow(ctx, th, vw, vh, cx, cy, t) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const sp = 22 + (i % 5) * 12, dep = .1 + (i % 4) * .08;
      const x = (((i * 137 + Math.sin(t * .7 + i) * 18 - cx * dep) % vw) + vw) % vw;
      const y = ((t * sp + i * 83) % (vh + 20)) - 10;
      ctx.globalAlpha = .5 + (i % 3) * .15;
      const s = 1.5 + (i % 3) * .7;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  },
  rain(ctx, th, vw, vh, cx, cy, t) {
    ctx.strokeStyle = 'rgba(210,225,255,.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const sp = 520 + (i % 5) * 80;
      const x = (((i * 97 - t * 140 - cx * .25) % (vw + 60)) + vw + 60) % (vw + 60) - 20;
      const y = ((t * sp + i * 131) % (vh + 60)) - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 22);
    }
    ctx.stroke();
  },
  gears(ctx, th, vw, vh, cx, cy, t) {
    ctx.save(); ctx.globalAlpha = .13 + .09 * BG.s.bass;
    for (let i = 0; i < 5; i++) {
      const r = 70 + (i % 3) * 40, gx = ((((i * 310 + 90) - cx * (.12 + i * .02)) % (vw + 500)) + vw + 500) % (vw + 500) - 250;
      const gy = vh * (.25 + (i % 3) * .22) - cy * .05;
      const dir = i % 2 ? 1 : -1, n = 10 + (i % 3) * 2;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * .18 * dir);
      ctx.fillStyle = th.hi; ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const a = k * TAU / n, w = TAU / n * .3;
        ctx.lineTo(Math.cos(a - w) * r * .86, Math.sin(a - w) * r * .86); ctx.lineTo(Math.cos(a - w * .6) * r, Math.sin(a - w * .6) * r);
        ctx.lineTo(Math.cos(a + w * .6) * r, Math.sin(a + w * .6) * r); ctx.lineTo(Math.cos(a + w) * r * .86, Math.sin(a + w) * r * .86);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },
  grid(ctx, th, vw, vh, cx, cy, t) {
    ctx.save(); ctx.strokeStyle = 'rgba(63,210,255,.10)'; ctx.lineWidth = 1;
    const s = 64, ox = -((cx * .3) % s), oy = -((cy * .15 + t * 8) % s);
    ctx.beginPath();
    for (let x = ox; x < vw; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, vh); }
    for (let y = oy; y < vh; y += s) { ctx.moveTo(0, y); ctx.lineTo(vw, y); }
    ctx.stroke(); ctx.restore();
  },
  ash(ctx, th, vw, vh, cx, cy, t) {
    ctx.fillStyle = 'rgba(255,200,170,.5)';
    for (let i = 0; i < 40; i++) {
      const x = (((i * 173 - t * 30 - cx * .2) % vw) + vw) % vw, y = ((t * (18 + i % 4 * 8) + i * 71) % (vh + 20)) - 10;
      ctx.fillRect(x, y, 2, 2);
    }
  }
};

// ---------- pickups ----------
function drawGem(ctx, g, t, th) {
  if (g.got) return;
  const by = Math.sin(t * 3 + g.i) * 2.5, x = g.x, y = g.y + by;
  if (g.have) {   // collected on an earlier run: just a hollow outline
    ctx.strokeStyle = 'rgba(255,120,200,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  const gl = ctx.createRadialGradient(x, y, 2, x, y, 26);
  gl.addColorStop(0, 'rgba(255,110,200,.65)'); gl.addColorStop(1, 'rgba(255,110,200,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
  const sq = Math.cos(t * 2.2 + g.i);        // slow spin: squeeze the width
  const hw = 10 * (.45 + .55 * Math.abs(sq));
  ctx.fillStyle = '#ff5fb8'; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + hw, y - 2); ctx.lineTo(x, y + 13); ctx.lineTo(x - hw, y - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffa6dc'; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + hw, y - 2); ctx.lineTo(x, y - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c92f8a'; ctx.beginPath(); ctx.moveTo(x - hw, y - 2); ctx.lineTo(x, y - 2); ctx.lineTo(x, y + 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + hw, y - 2); ctx.lineTo(x, y + 13); ctx.lineTo(x - hw, y - 2); ctx.closePath(); ctx.stroke();
  const tw = (t * 1.6 + g.i * .37) % 1;       // twinkle
  if (tw < .25) { const k = Math.sin(tw / .25 * Math.PI); ctx.fillStyle = '#fff'; ctx.fillRect(x + 6 - 5 * k, y - 8 - .75, 10 * k, 1.5); ctx.fillRect(x + 6 - .75, y - 8 - 5 * k, 1.5, 10 * k); }
}

function drawCrystal(ctx, k, t) {
  const by = Math.sin(t * 3.3 + k.x * .01) * 2.5, x = k.x, y = k.y + by;
  if (k.t > 0) {   // respawning: faint outline that fills back in
    const f = 1 - k.t / 2.4;
    ctx.globalAlpha = .25 + .35 * f; ctx.strokeStyle = '#6fe3ff'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    return;
  }
  const gl = ctx.createRadialGradient(x, y, 2, x, y, 28);
  gl.addColorStop(0, 'rgba(111,227,255,.7)'); gl.addColorStop(1, 'rgba(111,227,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 28, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6fe3ff'; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9faff'; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 9, y); ctx.lineTo(x, y - 1); ctx.lineTo(x - 3, y - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a9ec2'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x, y + 13); ctx.lineTo(x, y - 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.stroke();
}

function drawOrb(ctx, o, t) {
  const x = o.x, y = o.y + Math.sin(t * 2.6 + o.x * .02) * 2, cd = o.t > 0, pul = 1 + Math.sin(t * 6) * .06 + (o.a > 0 ? o.a / .3 * .35 : 0);
  ctx.globalAlpha = cd ? .35 : 1;
  if (!cd) {
    const gl = ctx.createRadialGradient(x, y, 3, x, y, 30);
    gl.addColorStop(0, 'rgba(120,255,160,.6)'); gl.addColorStop(1, 'rgba(120,255,160,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = '#7dffa6'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(x, y, 11 * pul, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.arc(x, y, 16 * pul, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#d6ffe3'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
  // little up chevron: "jump here"
  ctx.strokeStyle = '#1b5a35'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - 3.5, y + 1.5); ctx.lineTo(x, y - 2); ctx.lineTo(x + 3.5, y + 1.5); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------- hazards + surfaces ----------
function drawLaser(ctx, l, t) {
  const h = l.ax === 'h';
  const cap = (x, y) => {
    ctx.fillStyle = '#242a3c'; ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = '#3d465e'; ctx.fillRect(x - 10, y - 10, 20, 4);
    ctx.fillStyle = '#12151f'; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = l.on ? '#fff' : l.warn ? '#ff8a9a' : '#7a2a3c'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  };
  if (l.on) {
    const r = l.rect, fl = .85 + .15 * Math.sin(t * 60);
    ctx.save(); ctx.globalAlpha = .38 * fl; ctx.fillStyle = '#ff2f55';
    if (h) ctx.fillRect(r.x, r.y - 7, r.w, r.h + 14); else ctx.fillRect(r.x - 7, r.y, r.w + 14, r.h);
    ctx.globalAlpha = 1; ctx.fillStyle = '#ff5f7e'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#fff'; if (h) ctx.fillRect(r.x, r.y + 1.5, r.w, r.h - 3); else ctx.fillRect(r.x + 1.5, r.y, r.w - 3, r.h);
    ctx.restore();
  } else if (l.warn) {
    const r = l.rect, on = Math.sin(t * 50) > 0;
    ctx.save(); ctx.globalAlpha = on ? .75 : .25; ctx.fillStyle = '#ff5f7e';
    if (h) ctx.fillRect(r.x, r.y + 2, r.w, 2); else ctx.fillRect(r.x + 2, r.y, 2, r.h);
    ctx.restore();
  } else {
    const r = l.rect;
    ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#ff5f7e';
    if (h) ctx.fillRect(r.x, r.y + 2, r.w, 2); else ctx.fillRect(r.x + 2, r.y, 2, r.h);
    ctx.restore();
  }
  cap(l.x0, l.y0); cap(l.x1, l.y1);
}

function drawCrusher(ctx, s, th, t) {
  const x = s.x + (s.warn ? Math.sin(t * 90) * 1.6 : 0), y = s.y, w = s.w, h = s.h;
  // rod up to the housing
  ctx.fillStyle = '#4a5268'; ctx.fillRect(x + w / 2 - 4, y - 160, 8, 160);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + w / 2 - 4, y - 160, 2, 160);
  // body
  ctx.fillStyle = '#2a2f41'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#58617c'; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = '#171a27'; ctx.fillRect(x, y + h - 9, w, 9);
  // hazard stripes
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + h - 9, w, 9); ctx.clip();
  ctx.fillStyle = '#ffc94a';
  for (let i = -2; i < w / 10 + 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 14, y + h); ctx.lineTo(x + i * 14 + 7, y + h); ctx.lineTo(x + i * 14 + 16, y + h - 9); ctx.lineTo(x + i * 14 + 9, y + h - 9); ctx.fill(); }
  ctx.restore();
  // rivets + warning lamp
  ctx.fillStyle = '#8791a6'; for (let i = 8; i < w; i += 16) ctx.fillRect(x + i - 1.5, y + 11, 3, 3);
  ctx.fillStyle = s.warn && Math.sin(t * 40) > 0 ? '#ff5f7e' : '#5a2232'; ctx.beginPath(); ctx.arc(x + w / 2, y + 17, 3.4, 0, TAU); ctx.fill();
  // teeth
  ctx.fillStyle = '#c9d2e3';
  for (let i = 0; i < w / 16; i++) { ctx.beginPath(); ctx.moveTo(x + i * 16 + 1, y + h); ctx.lineTo(x + i * 16 + 8, y + h + 7); ctx.lineTo(x + i * 16 + 15, y + h); ctx.fill(); }
  // danger shadow on the floor while it shakes
  if (s.warn) { ctx.globalAlpha = .22; ctx.fillStyle = '#ff2f55'; ctx.fillRect(x, y + h + 8, w, s.dist); ctx.globalAlpha = 1; }
}

function drawBelts(ctx, w, t) {
  for (const b of w.belts) {
    ctx.fillStyle = '#15171f'; ctx.fillRect(b.x, b.y, b.w, 8);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, 8); ctx.clip();
    ctx.strokeStyle = '#ffc94a'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    const off = (t * K.BELT * b.dir) % 16;
    for (let i = -1; i < b.w / 16 + 1; i++) {
      const cx = b.x + i * 16 + off + 8;
      ctx.beginPath(); ctx.moveTo(cx - 3 * b.dir, b.y + 1.5); ctx.lineTo(cx + 3 * b.dir, b.y + 4); ctx.lineTo(cx - 3 * b.dir, b.y + 6.5); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#6a7388'; ctx.beginPath(); ctx.arc(b.x + 1, b.y + 4, 4, 0, TAU); ctx.arc(b.x + b.w - 1, b.y + 4, 4, 0, TAU); ctx.fill();
  }
}

function drawIce(ctx, w, t) {
  for (const i of w.ices) {
    const g = ctx.createLinearGradient(0, i.y, 0, i.y + 8);
    g.addColorStop(0, '#e8fbff'); g.addColorStop(1, '#8fd6f5');
    ctx.fillStyle = g; ctx.fillRect(i.x, i.y, i.w, 8);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < i.w / 24; k++) { const sx = i.x + 6 + k * 24; ctx.fillRect(sx, i.y + 1.5, 9, 1.5); }
    const sh = ((t * 0.5 + i.x * .003) % 1) * (i.w + 40) - 20;       // a glint sweeping along
    ctx.save(); ctx.beginPath(); ctx.rect(i.x, i.y, i.w, 8); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(i.x + sh, i.y + 8); ctx.lineTo(i.x + sh + 6, i.y); ctx.lineTo(i.x + sh + 12, i.y); ctx.lineTo(i.x + sh + 6, i.y + 8); ctx.fill();
    ctx.restore();
  }
}

function drawFans(ctx, w, th, t) {
  for (const f of w.fans) {
    const g = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
    g.addColorStop(0, 'rgba(190,235,255,0)'); g.addColorStop(1, 'rgba(190,235,255,.30)');
    ctx.fillStyle = g; ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const n = Math.max(2, Math.round(f.w / 14));
    for (let i = 0; i < n; i++) {
      const sx = f.x + (i + .5) * f.w / n + Math.sin(t * 2 + i * 2) * 3;
      const k = ((t * 1.7 + i * .37) % 1);
      const y1 = f.y + f.h - k * f.h, y0 = Math.min(f.y + f.h, y1 + 22);
      ctx.globalAlpha = Math.sin(k * Math.PI) * .9;
      ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // grille + blades at the bottom
    const by = f.y + f.h;
    ctx.fillStyle = '#232a3d'; ctx.fillRect(f.x - 2, by - 8, f.w + 4, 8);
    ctx.fillStyle = '#4a5572'; ctx.fillRect(f.x - 2, by - 8, f.w + 4, 2);
    ctx.fillStyle = '#9aa7c4';
    const bl = Math.max(1, Math.floor(f.w / 18));
    for (let i = 0; i < bl; i++) {
      const cx = f.x + (i + .5) * f.w / bl, ww = Math.abs(Math.cos(t * 14 + i)) * 12 + 2;
      ctx.fillRect(cx - ww / 2, by - 7, ww, 3);
    }
  }
}

function drawChase(ctx, w, t) {
  const ch = w.chase; if (!ch) return;
  const L = w.L, top = -300, bot = L.H * T + 300, x = ch.x;
  const g = ctx.createLinearGradient(x - 340, 0, x + 30, 0);
  g.addColorStop(0, 'rgba(20,2,6,1)'); g.addColorStop(.75, 'rgba(70,8,12,.96)'); g.addColorStop(1, 'rgba(120,16,16,.88)');
  ctx.fillStyle = g; ctx.fillRect(x - 3000, top, 3000 + 4, bot - top);
  // jagged leading edge
  ctx.fillStyle = '#ff5a2e'; ctx.beginPath(); ctx.moveTo(x - 4, top);
  const sy = 26;
  for (let y = top, i = 0; y <= bot; y += sy, i++) {
    const wob = Math.sin(t * 7 + i * 1.9) * 7 + Math.sin(t * 3.1 + i * .7) * 6;
    ctx.lineTo(x + 12 + wob + (i % 2 ? 10 : 0), y);
  }
  ctx.lineTo(x - 4, bot); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(x - 10, top);
  for (let y = top, i = 0; y <= bot; y += sy, i++) {
    const wob = Math.sin(t * 8 + i * 2.3) * 5 + Math.sin(t * 2.6 + i) * 4;
    ctx.lineTo(x + 2 + wob + (i % 2 ? 6 : 0), y);
  }
  ctx.lineTo(x - 10, bot); ctx.closePath(); ctx.fill();
  // glow ahead of the wall
  const gl = ctx.createLinearGradient(x, 0, x + 140, 0);
  gl.addColorStop(0, 'rgba(255,90,40,.32)'); gl.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = gl; ctx.fillRect(x, top, 140, bot - top);
}

// called from drawEntities (world coordinates)
function drawExtrasUnder(ctx, w, th, t) { drawBelts(ctx, w, t); drawIce(ctx, w, t); drawFans(ctx, w, th, t); }
function drawExtrasOver(ctx, w, th, t) {
  for (const s of w.solids) if (s.k === 'crush') drawCrusher(ctx, s, th, t);
  for (const l of w.lasers) drawLaser(ctx, l, t);
  for (const g of w.gems) drawGem(ctx, g, t, th);
  for (const k of w.crystals) drawCrystal(ctx, k, t);
  for (const o of w.orbs) drawOrb(ctx, o, t);
  drawVex8Over(ctx, w, th, t);
  drawChase(ctx, w, t);
}

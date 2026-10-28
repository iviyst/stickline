'use strict';
// Weapons on screen.
// ---- weapons on screen: the sprite in the hand, its power animation, the swing trail, the impact burst, shop icons ----
WIMG.cbs = [];
// load the atlas: through fetch + createImageBitmap when possible, otherwise a plain Image (also what works when the page is opened from a file)
(() => {
  const done = (img) => { WIMG.img = img; WIMG.ok = true; for (const f of WIMG.cbs) { try { f(); } catch (e) { /* ignore */ } } };
  const viaImage = () => { if (typeof Image === 'undefined') return; const im = new Image(); im.onload = () => done(im); im.src = WIMG.src; };
  try {
    if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return viaImage();
    fetch(WIMG.src).then((r) => r.blob()).then((b) => createImageBitmap(b)).then(done).catch(viaImage);
  } catch (e) { viaImage(); }
})();

const WFXCOL = {
  none: ['#ffffff', '#cfd6e4'], fire: ['#ff7a1a', '#ffd34a'], ice: ['#7fdcff', '#eafcff'], volt: ['#4db8ff', '#fff3a0'],
  plasma: ['#5ee1ff', '#ffffff'], void: ['#9b4dff', '#ff3fd0'], poison: ['#58e04a', '#d4ff7a'], gold: ['#ffcf3a', '#fff6c0'],
  blood: ['#ff3350', '#8a0018'], arcane: ['#b57cff', '#6fe0ff'], sonic: ['#7ab0ff', '#e9f2ff'], rainbow: ['#ff6ad5', '#6af0ff']
};
const whash = (n) => { n = Math.imul(n ^ 61, 0x45d9f3b); n ^= n >>> 15; n = Math.imul(n, 0x2c1b3c6d); n ^= n >>> 12; return (n >>> 0) / 4294967296; };
function wfxInfo(W) {
  if (W._x) return W._x;
  const kinds = (W.fx || '').split('+').filter(Boolean), k0 = kinds[0] || 'none', base = WFXCOL[k0] || WFXCOL.none;
  const c1 = W.c1 || base[0];
  const c2 = W.c2 || (kinds[1] ? WFXCOL[kinds[1]][0] : base[1]);
  return (W._x = { kinds, k0, c1, c2, glow: kinds.length > 0 || W.tier >= 2 });
}
// where a point of the sprite (atlas px, relative to the sprite's corner) lands in the stickman's drawing space
function wpt(F, px, py) {
  const sp = F.sp, qx = px - sp.gx, qy = py - sp.gy;
  const x = (qx * sp.ca + qy * sp.sa) * sp.S, y = (-qx * sp.sa + qy * sp.ca) * sp.S * F.flip;
  return [F.x + x * F.cA - y * F.sA, F.y + x * F.sA + y * F.cA];
}
function wstar(ctx, x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .22, y - r * .22); ctx.lineTo(x + r, y); ctx.lineTo(x + r * .22, y + r * .22);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * .22, y + r * .22); ctx.lineTo(x - r, y); ctx.lineTo(x - r * .22, y - r * .22); ctx.closePath(); ctx.fill();
}
function wflame(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r * 2.3); ctx.quadraticCurveTo(x + r * 1.15, y - r * .1, x, y + r * .8); ctx.quadraticCurveTo(x - r * 1.15, y - r * .1, x, y - r * 2.3); ctx.fill(); }
const wdot = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(.2, r), 0, TAU); ctx.fill(); };

// the power animation, drawn on top of the sprite (time-based, so it needs no state); act = 1 at rest, more while swinging
function drawWeaponFx(ctx, F, t, act) {
  const W = F.W, X = wfxInfo(W), sp = W.sp, hp = [];
  for (let i = 0; i < 8; i++) hp.push(wpt(F, sp.hot[i * 2], sp.hot[i * 2 + 1]));
  const hc = wpt(F, sp.cx, sp.cy), tip = hp[0], seed = (W.id.charCodeAt(3) * 7 + W.id.charCodeAt(2) * 13) | 0, k0 = X.k0;
  ctx.save();
  for (const k of X.kinds) {
    const c1 = k === X.k0 ? X.c1 : (WFXCOL[k] || WFXCOL.none)[0], c2 = k === X.k0 ? X.c2 : (WFXCOL[k] || WFXCOL.none)[1];
    if (k === 'fire') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
        const ph = (t * 1.7 + i * .31 + j * .5 + whash(seed + i) ) % 1, p = hp[i];
        const x = p[0] + (whash(i * 7 + j + seed) - .5) * 3 + Math.sin(t * 9 + i) * 1.4 * ph, y = p[1] - ph * 10 * (1 + (act - 1) * .5);
        ctx.globalAlpha = (1 - ph) * .9; ctx.fillStyle = ph < .3 ? c2 : c1; wflame(ctx, x, y, (1 - ph) * 1.7 * (.85 + (act - 1) * .2) + .35);
      }
    } else if (k === 'ice') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const tw = Math.max(0, Math.sin(t * 3.2 + i * 1.9 + seed)), a = tw * tw * tw;
        if (a > .03) { ctx.globalAlpha = a; ctx.fillStyle = c2; wstar(ctx, hp[i][0], hp[i][1], 1.2 + a * 2.6); }
        const ph = (t * .9 + i * .37) % 1;
        ctx.globalAlpha = (1 - ph) * .8; ctx.fillStyle = c1; wdot(ctx, hp[i][0] + (whash(i + seed) - .5) * 5, hp[i][1] + ph * 12, 1.1);
      }
    } else if (k === 'volt') {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const sd = Math.floor(t * 22) + seed, n = act > 1.2 ? 4 : 2;
      for (let q = 0; q < n; q++) {
        const a = hp[(whash(sd * 3 + q) * 8) | 0], b = hp[(whash(sd * 5 + q + 9) * 8) | 0];
        if (a === b) continue;
        const pts = [a]; for (let s = 1; s < 4; s++) pts.push([lerp(a[0], b[0], s / 4) + (whash(sd + q * 17 + s) - .5) * 6, lerp(a[1], b[1], s / 4) + (whash(sd + q * 31 + s * 3) - .5) * 6]); pts.push(b);
        for (const [lw, col, al] of [[2.6, c1, .5], [1, c2, 1]]) { ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]); ctx.stroke(); }
      }
      ctx.globalAlpha = .9; ctx.fillStyle = c2; for (let i = 0; i < 2; i++) { const p = hp[(whash(sd + i * 11) * 8) | 0]; wdot(ctx, p[0] + (whash(sd + i) - .5) * 5, p[1] + (whash(sd + i * 5) - .5) * 5, 1); }
    } else if (k === 'plasma') {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const a = wpt(F, sp.hx + sp.ca * sp.Lx * .3, sp.hy + sp.sa * sp.Lx * .3), tp = [lerp(tip[0], wpt(F, sp.hx, sp.hy)[0], .06), lerp(tip[1], wpt(F, sp.hx, sp.hy)[1], .06)], pul = .5 + .5 * Math.sin(t * 11 + seed);
      ctx.globalAlpha = .16 + .12 * pul; ctx.strokeStyle = c1; ctx.lineWidth = 6 + pul * 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
      ctx.globalAlpha = .3 + .15 * pul; ctx.strokeStyle = c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
    } else if (k === 'void') {
      for (let i = 0; i < 6; i++) {
        const ph = (t * .8 + i * .17) % 1, an = t * 3 + i * 1.05 + seed, rad = 3 + 12 * (1 - ph) * (.7 + .3 * whash(i + seed));
        const x = hc[0] + Math.cos(an) * rad, y = hc[1] + Math.sin(an) * rad * .8, r = 1.3 + ph * 1.2;
        ctx.globalAlpha = Math.min(1, ph * 3) * .9; ctx.fillStyle = '#14002b'; wdot(ctx, x, y, r + .8);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - ph) * .9; ctx.fillStyle = i % 2 ? c1 : c2; wdot(ctx, x, y, r * .6); ctx.globalCompositeOperation = 'source-over';
      }
      const g = ctx.createRadialGradient(hc[0], hc[1], 0, hc[0], hc[1], 14 + 2 * Math.sin(t * 5)); g.addColorStop(0, 'rgba(155,77,255,.22)'); g.addColorStop(1, 'rgba(155,77,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(hc[0] - 18, hc[1] - 18, 36, 36);
    } else if (k === 'poison') {
      for (let i = 0; i < 5; i++) {
        const ph = (t * .7 + i * .21 + whash(i + seed)) % 1, p = hp[(i * 3) % 8];
        ctx.globalAlpha = 1 - ph * ph; ctx.fillStyle = c1; wdot(ctx, p[0], p[1] + ph * 15, 1.8 * (1 - .4 * ph));
        const p2 = (t * .5 + i * .33) % 1; ctx.globalAlpha = (1 - p2) * .8; ctx.strokeStyle = c2; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(hp[(i * 2 + 1) % 8][0] + Math.sin(t * 4 + i) * 1.2, hp[(i * 2 + 1) % 8][1] - p2 * 9, 1.3, 0, TAU); ctx.stroke();
      }
    } else if (k === 'gold') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) { const tw = Math.max(0, Math.sin(t * 2.6 + i * 2.3 + seed)), a = tw * tw * tw; if (a > .03) { ctx.globalAlpha = a; ctx.fillStyle = i % 3 ? c2 : c1; wstar(ctx, hp[i][0], hp[i][1], 1.4 + a * 2.8); } }
    } else if (k === 'blood') {
      for (let i = 0; i < 4; i++) {
        const ph = (t * .6 + i * .27 + whash(i + seed)) % 1, p = hp[(i * 2 + 1) % 8];
        ctx.globalAlpha = 1 - ph * ph; ctx.fillStyle = i % 2 ? c1 : '#a00022'; wdot(ctx, p[0], p[1] + ph * ph * 16, 1.7 * (1 - .3 * ph));
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .12 + .08 * Math.sin(t * 4); ctx.fillStyle = c1; wdot(ctx, hc[0], hc[1], 11);
    } else if (k === 'arcane') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const an = t * 2.2 + i * 1.26 + seed, p = hp[(i * 3) % 8], rad = 4 + 2 * Math.sin(t * 3 + i);
        for (let q = 0; q < 3; q++) { ctx.globalAlpha = (1 - q * .3) * .9; ctx.fillStyle = i % 2 ? c1 : c2; wdot(ctx, p[0] + Math.cos(an - q * .35) * rad, p[1] + Math.sin(an - q * .35) * rad * .7, 1.4 - q * .35); }
      }
    } else if (k === 'sonic') {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.3 + i / 3) % 1; ctx.globalAlpha = (1 - ph) * .8; ctx.strokeStyle = i ? c1 : c2; ctx.lineWidth = 1.5 * (1 - ph) + .4;
        ctx.beginPath(); ctx.arc(tip[0] - Math.cos(F.A) * 2, tip[1] - Math.sin(F.A) * 2, 2 + ph * 15, F.A - .95, F.A + .95); ctx.stroke();
      }
    } else if (k === 'rainbow') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) { const tw = Math.max(0, Math.sin(t * 3 + i * 2.1 + seed)), a = tw * tw * tw; if (a > .03) { ctx.globalAlpha = a; ctx.fillStyle = 'hsl(' + Math.floor((t * 200 + i * 47) % 360) + ',95%,65%)'; wstar(ctx, hp[i][0], hp[i][1], 1.4 + a * 3); } }
      ctx.globalAlpha = .16; ctx.fillStyle = 'hsl(' + Math.floor((t * 150) % 360) + ',95%,60%)'; wdot(ctx, hc[0], hc[1], 12);
    }
  }
  ctx.restore();
}

// the weapon in the hand: ready stance when idle, follows the arm through a swing; elbow/hand are in the stickman's drawing space
function drawHeldWeapon(ctx, d, elbow, hand) {
  const W = WEAPONS[d.wpn]; if (!W || !W.sp || !WIMG.ok) return;
  const X = wfxInfo(W), sp = W.sp, f = d.f, t = d.t, h = d.hold || (d.hold = {});
  const dt = clamp(t - (h.wt == null ? t : h.wt), 0, .05); h.wt = t;
  const swinging = d.atk > 0, tgt = (swinging || d.carry) ? 1 : 0, u = swinging ? 1 - d.atk / SWING_T : 0;
  if (h.ww == null) h.ww = tgt;
  h.ww += (tgt - h.ww) * (1 - Math.exp(-dt * (tgt > h.ww ? 32 : 9)));
  const armA = Math.atan2(hand.y - elbow.y, (hand.x - elbow.x) * f);
  const ready = -.92 - clamp((d.vy || 0) / 1400, -.25, .3);
  const da = Math.atan2(Math.sin(armA - ready), Math.cos(armA - ready));
  const phi = ready + da * h.ww;
  const A = f > 0 ? phi : Math.PI - phi, flip = f > 0 ? 1 : -1;
  let hx = hand.x, hy = hand.y, extra = 0;
  if (W.spin) {                                    // spinning weapons float just ahead of the hand and turn
    extra = (swinging ? u * TAU * 2.2 + t * 5 : t * 2.4) * flip;
    hx += Math.cos(A) * 11; hy += Math.sin(A) * 11;
  }
  const rot = A + extra;
  const F = { W, sp, x: hx, y: hy, A: rot, cA: Math.cos(rot), sA: Math.sin(rot), flip };
  ctx.save();
  // aura for the high tiers
  if (X.kinds.length && W.tier >= 3) {
    const hc = wpt(F, sp.cx, sp.cy), r = sp.Lx * sp.S * .6 * (1 + .06 * Math.sin(t * 4)), g = ctx.createRadialGradient(hc[0], hc[1], 0, hc[0], hc[1], r);
    const hue = Math.floor((t * 150) % 360), a0 = (W.tier === 5 ? .38 : W.tier === 4 ? .28 : .2) * (swinging ? 1.5 : 1);
    g.addColorStop(0, X.k0 === 'rainbow' ? 'hsla(' + hue + ',95%,60%,' + a0 + ')' : rgbaOf(X.c1, a0)); g.addColorStop(.55, X.k0 === 'rainbow' ? 'hsla(' + hue + ',95%,60%,' + a0 * .35 + ')' : rgbaOf(X.c1, a0 * .35)); g.addColorStop(1, X.k0 === 'rainbow' ? 'hsla(' + hue + ',95%,60%,0)' : rgbaOf(X.c1, 0));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hc[0], hc[1], r, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(sp.S, flip * sp.S); ctx.rotate(-sp.ang * Math.PI / 180); ctx.translate(-sp.gx, -sp.gy);
  ctx.drawImage(WIMG.img, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);
  if (X.glow) {                                    // breathe: lift the baked-in glow
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (X.k0 === 'plasma' ? .3 : .16) + .12 * Math.sin(t * 5.5 + W.cost);
    ctx.drawImage(WIMG.img, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);
  }
  ctx.restore();
  if (X.kinds.length) drawWeaponFx(ctx, F, t, swinging ? 1.6 : 1);
}

// a still picture of the weapon (as drawn on the sheet) fitted into a box: shop cards
function drawWeaponIcon(ctx, id, x, y, w, h) {
  const W = WEAPONS[id]; if (!W || !W.sp || !WIMG.ok) return;
  const sp = W.sp, s = Math.min((w - 6) / sp.w, (h - 6) / sp.h, 1.1);
  const dw = sp.w * s, dh = sp.h * s;
  ctx.drawImage(WIMG.img, sp.x, sp.y, sp.w, sp.h, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ---- swing trail: coloured by the weapon's power ----
function drawSmear(ctx, p, wpn, th) {
  const W = WEAPONS[wpn] || WEAPONS.fists, u = 1 - p.atkT / SWING_T, f = p.face || 1, X = wfxInfo(W), k = X.k0, fade = 1 - u;
  const cx = p.x + p.w / 2, cy = p.y + 12, r = W.reach + 6;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (W.cls === 'gun') {                           // the blaster fires a beam instead of an arc
    const ang = -.18, x0 = cx + f * 14, y0 = cy + 6, L = W.reach + 8, len = L * Math.min(1, u * 3.2);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lw, col, al] of [[7, X.c1, .45], [3, '#ffffff', .95]]) { ctx.globalAlpha = al * fade * 1.3; ctx.strokeStyle = col; ctx.lineWidth = lw * (1 - u * .5); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + f * len, y0 + Math.sin(ang) * len); ctx.stroke(); }
    ctx.globalAlpha = fade; ctx.fillStyle = '#fff'; wdot(ctx, x0 + f * 3, y0, 4 * fade);
    ctx.restore(); return;
  }
  const a0 = -Math.PI / 2 - .5, a1 = a0 + (Math.PI * .95) * Math.min(1, u * 1.25);
  const arc = (rr) => { ctx.beginPath(); if (f > 0) ctx.arc(cx, cy, rr, a0, a1); else ctx.arc(cx, cy, rr, Math.PI - a1, Math.PI - a0); };
  const along = (q, rr) => { const a = a0 + (a1 - a0) * q; return [cx + f * Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
  const band = (rr, lw, col, al, comp) => { ctx.globalCompositeOperation = comp || 'source-over'; ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw; arc(rr); ctx.stroke(); };
  const bits = (n, col, size, rise, star) => {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const q = (i + .5) / n, pt = along(q * Math.min(1, u * 1.25), r + (whash(i + 3) - .5) * 8); ctx.globalAlpha = fade * (.5 + .5 * whash(i)); if (star) wstar(ctx, pt[0], pt[1] - rise * u * (.5 + whash(i)), size * (1 - u * .5) + .6); else wdot(ctx, pt[0], pt[1] - rise * u * (.5 + whash(i + 9)), size * (1 - u * .6) + .4); }
  };
  const wide = 7 + W.tier * 1.4;
  if (k === 'none' || !k) { band(r, 7 * (1 - u * .5), '#ffffff', .45 * fade); }
  else if (k === 'plasma') { band(r, (wide + 5) * (1 - u * .4), X.c1, .55 * fade, 'lighter'); band(r, 4.5, X.c2, .95 * fade, 'lighter'); }
  else if (k === 'fire') { band(r, wide + 4, X.c1, .5 * fade, 'lighter'); band(r, 4, X.c2, .7 * fade, 'lighter'); bits(8, X.c2, 2.2, 16, false); }
  else if (k === 'ice') { band(r, wide + 2, X.c1, .45 * fade, 'lighter'); band(r, 3.4, '#ffffff', .9 * fade, 'lighter'); bits(6, X.c2, 2.4, 6, true); }
  else if (k === 'volt') {
    band(r, wide, X.c1, .3 * fade, 'lighter'); ctx.globalCompositeOperation = 'lighter';
    for (const [lw, col, al] of [[3.6, X.c1, .6], [1.5, X.c2, 1]]) {
      ctx.globalAlpha = al * fade; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const q = i / 14 * Math.min(1, u * 1.25), pt = along(q, r + (i % 2 ? 1 : -1) * Math.random() * 5); if (i) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); }
      ctx.stroke();
    }
  } else if (k === 'void') { band(r, wide + 5, '#14002a', .72 * fade); band(r, 3, X.c1, .95 * fade, 'lighter'); band(r + 5, 1.6, X.c2, .7 * fade, 'lighter'); bits(5, X.c2, 1.8, -8, false); }
  else if (k === 'poison') { band(r, wide + 1, X.c1, .45 * fade, 'lighter'); band(r, 2.6, X.c2, .8 * fade, 'lighter'); bits(6, X.c1, 2, -14, false); }
  else if (k === 'gold') { band(r, wide, X.c1, .42 * fade, 'lighter'); band(r, 3, X.c2, .95 * fade, 'lighter'); bits(7, X.c2, 2.4, 4, true); }
  else if (k === 'blood') { band(r, wide + 2, '#7a0016', .6 * fade); band(r, 3, X.c1, .9 * fade, 'lighter'); bits(6, X.c1, 1.8, -16, false); }
  else if (k === 'arcane') { band(r, wide, X.c1, .45 * fade, 'lighter'); band(r, 3, X.c2, .9 * fade, 'lighter'); bits(6, X.c2, 2, 4, false); }
  else if (k === 'sonic') { for (let i = -1; i <= 1; i++) band(r + i * 5, 2 * (1 - u * .4), i ? X.c1 : X.c2, .75 * fade, 'lighter'); }
  else if (k === 'rainbow') {
    const n = 7;
    for (let i = 0; i < n; i++) { const q0 = i / n, q1 = (i + 1.15) / n; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6 * fade; ctx.strokeStyle = 'hsl(' + Math.floor(i * 51) + ',95%,60%)'; ctx.lineWidth = wide + 2; const A0 = a0 + (a1 - a0) * q0, A1 = a0 + (a1 - a0) * Math.min(1, q1); ctx.beginPath(); if (f > 0) ctx.arc(cx, cy, r, A0, A1); else ctx.arc(cx, cy, r, Math.PI - A1, Math.PI - A0); ctx.stroke(); }
    band(r, 3, '#ffffff', .8 * fade, 'lighter');
  }
  ctx.restore();
}

// ---- impact burst when a hit lands (x, y = where; dir = which way the victim flies) ----
function wpnImpact(x, y, wid, dir) {
  const W = WEAPONS[wid] || WEAPONS.fists, X = wfxInfo(W), k = X.k0, c1 = X.c1, c2 = X.c2, d = dir || 1;
  const sp = (n, cols, spd, o) => { for (let i = 0; i < n; i++) emit('spark', x, y, Object.assign({ vx: rand(-spd, spd) + d * spd * .25, vy: o && o.rise ? -rand(40, spd * 1.4) : rand(-spd, spd * .3), g: 420, max: rand(.3, .65), s: rand(2, 3.6), col: cols[i % cols.length] }, o || {})); };
  const ring = (grow, col, max, s) => emit('ring', x, y, { s: s || 4, grow, max: max || .3, col });
  if (k === 'none' || !k) { sp(14, ['#ffd34a'], 240); ring(26, '#fff'); }
  else if (k === 'fire') { sp(14, [c1, c2], 200, { g: -140, rise: 1 }); ring(34, c1); for (let i = 0; i < 5; i++) emit('dot', x + rand(-6, 6), y, { vx: rand(-20, 20), vy: -rand(20, 70), max: .6, s: rand(3, 5), col: 'rgba(70,45,35,.55)' }); }
  else if (k === 'ice') { sp(16, [c2, c1, '#ffffff'], 230, { g: 260 }); ring(30, c2); }
  else if (k === 'volt') { sp(18, [c2, c1], 400, { g: 40, max: rand(.2, .45) }); ring(24, c1, .22); ring(44, c2, .34); }
  else if (k === 'plasma') { sp(12, [c1, '#ffffff'], 260, { g: 120 }); ring(40, c1, .32, 3); }
  else if (k === 'void') { for (let i = 0; i < 12; i++) { const a = rand(0, TAU); emit('spark', x + Math.cos(a) * 24, y + Math.sin(a) * 24, { vx: -Math.cos(a) * 190, vy: -Math.sin(a) * 190, g: 0, max: .22, s: rand(2, 3.4), col: i % 2 ? c1 : c2 }); } ring(26, c1, .3, 10); ring(12, '#14002a', .25, 2); }
  else if (k === 'poison') { sp(12, [c1, c2], 140, { g: 560 }); ring(22, c1, .28); }
  else if (k === 'gold') { sp(16, [c2, c1], 260, { g: 300 }); ring(30, c1); }
  else if (k === 'blood') { sp(16, [c1, '#a00022'], 240, { g: 640 }); ring(24, '#a00022', .26); }
  else if (k === 'arcane') { sp(14, [c1, c2], 230, { g: 120 }); ring(32, c1); }
  else if (k === 'sonic') { ring(22, c2, .28, 3); ring(40, c1, .38, 3); ring(58, c1, .5, 3); sp(6, [c2], 200); }
  else if (k === 'rainbow') { for (let i = 0; i < 18; i++) emit('spark', x, y, { vx: rand(-260, 260), vy: rand(-260, 80), g: 300, max: rand(.3, .7), s: rand(2, 3.8), col: 'hsl(' + Math.floor(rand(0, 360)) + ',95%,62%)' }); ring(36, '#fff'); }
  if (W.tier >= 4) ring(54, c1, .45, 6);          // legendary and mythic hits always make a bigger splash
  if (X.kinds.length > 1) sp(8, [WFXCOL[X.kinds[1]][0]], 260);
}
// which swing sound goes with a weapon
function wpnSwingSfx(wid) {
  const k = wfxInfo(WEAPONS[wid] || WEAPONS.fists).k0;
  return k === 'volt' ? 'sw_volt' : k === 'fire' ? 'sw_fire' : k === 'ice' ? 'sw_ice' : (k === 'void' || k === 'arcane') ? 'sw_void' : (k === 'plasma' || k === 'sonic') ? 'sw_plasma' : k === 'gold' || k === 'rainbow' ? 'sw_gold' : 'swing';
}

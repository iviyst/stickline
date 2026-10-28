'use strict';
// Stickman drawing and particles.
// ---- stickman drawing + particles ----
function limb(o, f, a, b, l1, l2) {
  const x1 = o.x + Math.sin(a) * f * l1, y1 = o.y + Math.cos(a) * l1, a2 = a + b;
  return [o, { x: x1, y: y1 }, { x: x1 + Math.sin(a2) * f * l2, y: y1 + Math.cos(a2) * l2 }];
}

const POSE_N = 13;
const poseVec = (P) => [P.hipH, P.lean, P.hx, P.tilt, P.arms[0][0], P.arms[0][1], P.arms[1][0], P.arms[1][1], P.legs[0][0], P.legs[0][1], P.legs[1][0], P.legs[1][1], P.wing ? 1 : 0];
const vecPose = (v) => ({ hipH: v[0], lean: v[1], hx: v[2], tilt: v[3], arms: [[v[4], v[5]], [v[6], v[7]]], legs: [[v[8], v[9]], [v[10], v[11]]], wing: v[12] });
const AIR_RISE = { hipH: 15, lean: .2, hx: 0, arms: [[2.5, -.2], [-2.3, .2]], legs: [[1.0, -1.25], [-.35, -1.0]], tilt: .1 };
const AIR_FALL = { hipH: 16, lean: .05, hx: 0, arms: [[1.9, .1], [-1.7, -.1]], legs: [[.45, -.5], [-.3, -.2]], tilt: 0 };
const DASH_POSE = { hipH: 12.5, lean: 1.18, hx: 0, arms: [[-1.95, .25], [-1.65, .2]], legs: [[-1.15, .15], [-.7, .35]], tilt: .22 };
const WALL_KICK = { hipH: 14.5, lean: .32, hx: 0, arms: [[2.8, -.3], [-2.2, .3]], legs: [[1.15, -1.35], [-.2, -.9]], tilt: .12 };

function stickPose(p, t) {
  const P = stickPose0(p, t);
  if (!(p.atkT > 0)) return P;
  const u = 1 - p.atkT / .2;                     // overhead swing: from behind-up to forward-down
  const Q = Object.assign({}, P, { arms: [[3.7 - u * 2.9, -.12], P.arms[1]], lean: P.lean + .12 * Math.sin(u * Math.PI) });
  return Q;
}
function stickPose0(p, t) {
  const sp = clamp(Math.abs(p.vx) / K.RUN, 0, 1);
  if (p.dashT > 0) return DASH_POSE;
  if (p.hang) return { hipH: 21, lean: .12, hx: .5, arms: [[2.95, .05], [2.75, .1]], legs: [[.35 + Math.sin(t * 3) * .08, .25], [-.15, .35]], tilt: -.15 };
  if (p.sliding && Math.abs(p.vx) < 150) { const k = Math.sin(p.phase * 1.4) * .25 * clamp(Math.abs(p.vx) / 110, 0, 1); return { hipH: 9, lean: .55, hx: 0, arms: [[.9 + k, -1.0], [.5 - k, -.9]], legs: [[1.55 + k, -2.2], [1.05 - k, -2.0]], tilt: -.1 }; }
  if (p.swim && !p.onGround) { const s = Math.sin(t * 7), q = clamp(Math.abs(p.vx) / 140, 0, 1); return { hipH: 15, lean: .35 + q * .75, hx: 0, arms: [[2.2 + s * .7, -.4], [2.2 - s * .7, -.4]], legs: [[.4 + s * .35, -.4], [-.2 - s * .35, -.3]], tilt: .1 }; }
  if (p.sliding) return { hipH: 4.6, lean: -1.15, hx: -1, arms: [[1.5, .3], [-1.4, .3]], legs: [[1.35, .12], [1.25, -.15]], tilt: -.2 };
  if (p.gliding) return { hipH: 14, lean: .55, hx: 0, arms: [[3.0, 0], [2.85, 0]], legs: [[-.55, -.1], [-.75, -.05]], tilt: 0, wing: true };
  if (p.wallSliding) return { hipH: 15, lean: .15, hx: 1.5, arms: [[2.9, -.1], [2.6, .2]], legs: [[.35, -1.0], [.05, -.3]], tilt: 0 };
  if (!p.onGround) {
    if (p.wlock > 0 && p.vy < 0) return WALL_KICK;
    // one continuous air pose: tucked while rising fast, opening up through the apex, braced on the way down
    const u = clamp((p.vy + 340) / 620, 0, 1), a = poseVec(AIR_RISE), b = poseVec(AIR_FALL);
    return vecPose(a.map((x, i) => x + (b[i] - x) * u));
  }
  if (sp < .08) {
    const b = Math.sin(t * 2.4);
    return { hipH: 16 - b * .35, lean: .04 + b * .012, hx: 0, arms: [[.15 + b * .05, .25], [-.12, .2]], legs: [[.12, -.05], [-.1, 0]], tilt: 0 };
  }
  const s = Math.sin(p.phase), c = Math.cos(p.phase);
  const leg = (ss, cc) => [sp * ss, -(.2 + .95 * Math.max(0, cc)) * sp - .05];
  return { hipH: 16 - 1.2 * sp + 1.6 * sp * Math.abs(c), lean: .1 + .3 * sp, hx: 0, arms: [[-.9 * s * sp, 1.0], [.9 * s * sp, 1.0]], legs: [leg(s, c), leg(-s, -c)], tilt: 0 };
}

// Moving between poses never snaps: when the state changes the old pose becomes an offset that melts away,
// so the running cycle itself is untouched (no lag) but every transition eases.
function poseKey(p) {
  return p.dashT > 0 ? 'd' : p.sliding ? 's' : p.gliding ? 'g' : p.wallSliding ? 'w' : !p.onGround ? (p.wlock > 0 && p.vy < 0 ? 'k' : 'a') : Math.abs(p.vx) < K.RUN * .08 ? 'i' : 'r';
}
function smoothPose(p, P, t) {
  const tv = poseVec(P), key = poseKey(p);
  let v = p.vis;
  if (!v) v = p.vis = { key, off: new Array(POSE_N).fill(0), out: tv.slice(), t };
  const dt = clamp(t - v.t, 0, .05); v.t = t;
  if (key !== v.key) { for (let i = 0; i < POSE_N; i++) v.off[i] = v.out[i] - tv[i]; v.key = key; }
  const k = Math.exp(-dt * (key === 'k' || key === 'w' || key === 'd' ? 24 : 15));
  for (let i = 0; i < POSE_N; i++) { v.off[i] *= k; v.out[i] = tv[i] + v.off[i]; }
  return vecPose(v.out);
}

// look = cosmetics chosen in the wardrobe (set by the game); the headband turns pale blue while the dash is spent
const Look = { band: null, hat: 'none', trail: 'none', skin: null, wpn: 'fists' };
const BAND_SPENT = '#8db3ff';

function drawStick(ctx, p, th, t) {
  const P = smoothPose(p, stickPose(p, t), t);
  const sq = p.landT > 0 ? 1 - .14 * (p.landT / .14) : 1;
  const st = p.stretchT > 0 ? p.stretchT / .12 : 0;      // launch stretch right after a jump
  const spent = p.dashes < 1 && !p.onGround;
  if (Look.skin) th = Object.assign({}, th, Look.skin);
  if (p.atkT > 0) drawSmear(ctx, p, Look.wpn, th);
  renderStick(ctx, { x: p.x + p.w / 2, y: p.y + p.h, f: p.face || 1, P, sq, st, shadow: p.onGround, vx: p.vx, vy: p.vy, t, th, wpn: Look.wpn, atk: p.atkT, hold: p, carry: !!(p.dashT > 0 || p.sliding || p.gliding || p.hang || p.wallSliding), stun: p.stunT > 0,
    band: spent ? BAND_SPENT : (Look.band === 'rainbow' ? 'hsl(' + Math.floor((t * 170) % 360) + ',92%,60%)' : (Look.band || th.band)), hat: Look.hat });
}

// draws a stickman from a pose; also used for dash afterimages (tint = flat colour, alpha)
function renderStick(ctx, d) {
  const { P, th, t } = d, f = d.f;
  const ink = d.tint || th.ink, out = d.tint || th.out, band = d.tint || d.band || th.band;
  ctx.save();
  if (d.alpha != null) ctx.globalAlpha = d.alpha;
  ctx.translate(d.x, d.y);
  ctx.scale((1 / d.sq) * (1 - .09 * d.st), d.sq * (1 + .15 * d.st));
  if (d.shadow && !d.tint) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, -1, 9, 2.4, 0, 0, TAU); ctx.fill(); }
  const hip = { x: P.hx * f, y: -P.hipH };
  const sh = { x: hip.x + Math.sin(P.lean) * f * 10, y: hip.y - Math.cos(P.lean) * 10 };
  const ha = P.lean * 1.1 + P.tilt;
  const head = { x: sh.x + Math.sin(ha) * f * 6.4, y: sh.y - Math.cos(ha) * 6.4 };
  const lines = [
    limb(sh, f, P.arms[1][0], P.arms[1][1], 7, 7),
    limb(hip, f, P.legs[1][0], P.legs[1][1], 8, 8),
    [hip, sh],
    limb(hip, f, P.legs[0][0], P.legs[0][1], 8, 8),
    limb(sh, f, P.arms[0][0], P.arms[0][1], 7, 7)
  ];
  const path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  if (P.wing > .02) {
    const wa = clamp(P.wing, 0, 1), wy = sh.y - 14 * wa;
    ctx.fillStyle = d.tint || th.accent; ctx.strokeStyle = out; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(sh.x + f * 32 * wa, wy + 5); ctx.lineTo(sh.x - f * 2, wy - 10 * wa); ctx.lineTo(sh.x - f * 28 * wa, wy + 4); ctx.lineTo(sh.x - f * 2, wy + 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (!d.tint) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sh.x + f * 30 * wa, wy + 5); ctx.lineTo(sh.x - f * 2, wy + 1); ctx.stroke(); }
  }
  // outline pass, then ink pass
  ctx.strokeStyle = out; ctx.lineWidth = 6.4;
  for (const l of lines) { path(l); ctx.stroke(); }
  ctx.fillStyle = out; ctx.beginPath(); ctx.arc(head.x, head.y, 6.8, 0, TAU); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 3.6;
  for (const l of lines) { path(l); ctx.stroke(); }
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(head.x, head.y, 5.3, 0, TAU); ctx.fill();
  // headband + eye
  ctx.save();
  ctx.beginPath(); ctx.arc(head.x, head.y, 5.3, 0, TAU); ctx.clip();
  ctx.translate(head.x, head.y); ctx.rotate(ha * f);
  ctx.fillStyle = band; ctx.fillRect(-7, -3.4, 14, 2.6);
  if (!d.tint) { ctx.fillStyle = out; ctx.fillRect(f * 1.6 - 1.1, -0.6, 2.4, 2.2); }
  ctx.restore();
  // weapon in the front hand
  if (d.wpn && d.wpn !== 'fists' && !d.tint) drawHeldWeapon(ctx, d, lines[4][1], lines[4][2]);
  if (d.stun && !d.tint) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(head.x + Math.cos(a) * 9, head.y - 10 + Math.sin(a) * 3, 2, 0, TAU); ctx.fill(); } }
  // hat (cosmetic), drawn in the head's tilted frame
  if (d.hat && d.hat !== 'none' && !d.tint) drawHat(ctx, d.hat, head, ha, f, th, band);
  // band tails
  const sp = clamp(Math.abs(d.vx) / K.RUN, 0, 1.6);
  const kx = head.x - f * 4.6, ky = head.y - 2.1;
  ctx.strokeStyle = band; ctx.lineWidth = 2.4;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath(); ctx.moveTo(kx, ky);
    let x = kx, y = ky + k * .8;
    const back = (d.vx === 0 ? -f : -Math.sign(d.vx));
    for (let i = 1; i <= 4; i++) {
      x += back * (2.2 + sp * 3.2);
      y += (.5 + k * .5) + clamp(d.vy / 500, -1, 1) * -1.6 + Math.sin(t * 14 - i * 1.15 + k * 1.7) * (.7 + sp * 1.6);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawHat(ctx, kind, head, ha, f, th, band) {
  ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(ha * f * 1); ctx.scale(f, 1);
  if (kind === 'cap') {
    ctx.fillStyle = '#e8412e'; ctx.beginPath(); ctx.arc(0, -.5, 5.9, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillRect(2, -2.4, 8, 2.2);
  } else if (kind === 'crown') {
    ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(-5.5, -11); ctx.lineTo(-2.6, -7.6); ctx.lineTo(0, -12.4); ctx.lineTo(2.6, -7.6); ctx.lineTo(5.5, -11); ctx.lineTo(5, -4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1; ctx.stroke();
  } else if (kind === 'cone') {
    ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(0, -14); ctx.lineTo(5, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-3.4, -8.2, 6.8, 1.6);
  } else if (kind === 'halo') {
    ctx.strokeStyle = '#fff3a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -10.5, 6, 2, 0, 0, TAU); ctx.stroke();
  } else if (kind === 'antenna') {
    ctx.strokeStyle = th.out; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(1, -11); ctx.stroke();
    ctx.strokeStyle = th.ink; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(1, -12, 2.6, 0, TAU); ctx.fill();
  } else if (kind === 'wizard') {
    ctx.fillStyle = '#5b3ec9'; ctx.beginPath(); ctx.moveTo(-6.4, -3.6); ctx.lineTo(1, -17); ctx.lineTo(6.4, -3.6); ctx.closePath(); ctx.fill();
    ctx.fillRect(-8, -4.6, 16, 2.2);
    ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(.5, -9, 1.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------- particles ----------
function updateParts(parts, dt, L) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.life += dt;
    if (q.life >= q.max) { parts.splice(i, 1); continue; }
    q.vy += q.g * dt;
    q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt;
    if (q.k === 'bone' && L) {
      if (solidTile(L, Math.floor(q.x / T), Math.floor((q.y + 3) / T)) && q.vy > 0) { q.vy *= -.35; q.vx *= .7; q.va *= .6; q.y -= 2; }
    }
  }
}

function drawParts(ctx, parts, th) {
  for (const q of parts) {
    const k = q.life / q.max, al = clamp(1 - k, 0, 1);
    if (q.k === 'dot') {
      ctx.globalAlpha = al * .8; ctx.fillStyle = q.col;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (1 - k * .5), 0, TAU); ctx.fill();
    } else if (q.k === 'spark') {
      ctx.globalAlpha = al; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
    } else if (q.k === 'ring') {
      ctx.globalAlpha = al * .8; ctx.strokeStyle = q.col; ctx.lineWidth = 3 * (1 - k) + .5;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s + k * q.grow, 0, TAU); ctx.stroke();
    } else if (q.k === 'bone') {
      ctx.globalAlpha = k > .75 ? al * 4 : 1;
      const dx = Math.cos(q.a) * q.len / 2, dy = Math.sin(q.a) * q.len / 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = th.out; ctx.lineWidth = 6.2; ctx.beginPath(); ctx.moveTo(q.x - dx, q.y - dy); ctx.lineTo(q.x + dx, q.y + dy); ctx.stroke();
      ctx.strokeStyle = th.ink; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(q.x - dx, q.y - dy); ctx.lineTo(q.x + dx, q.y + dy); ctx.stroke();
      if (q.head) { ctx.fillStyle = th.out; ctx.beginPath(); ctx.arc(q.x, q.y, 6.6, 0, TAU); ctx.fill(); ctx.fillStyle = th.ink; ctx.beginPath(); ctx.arc(q.x, q.y, 5.2, 0, TAU); ctx.fill(); ctx.fillStyle = th.band; ctx.fillRect(q.x - 5, q.y - 3, 10, 2.4); }
    } else if (q.k === 'line') {
      ctx.globalAlpha = al * .8; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.len / 2, q.y - q.s / 2, q.len, q.s);
    } else if (q.k === 'ghost') {
      renderStick(ctx, Object.assign({}, q.snap, { alpha: al * q.a0, tint: q.col, th }));
    } else if (q.k === 'conf') {
      ctx.globalAlpha = al; ctx.fillStyle = q.col;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillRect(-3, -1.6, 6, 3.2); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

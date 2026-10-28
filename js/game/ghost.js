'use strict';
// Best-run ghost and player trail.
function recordGhost(w) {
  const p = w.p, r = G.rec;
  r.x.push(Math.round(p.x + p.w / 2)); r.y.push(Math.round(p.y + p.h));
  r.f.push((p.onGround ? 1 : 0) | (p.sliding ? 2 : 0) | (p.wallSliding ? 4 : 0) | (p.gliding ? 8 : 0) | (p.dashT > 0 ? 16 : 0) | (p.face < 0 ? 32 : 0) | (w.dead ? 64 : 0));
}
function drawGhost(w) {
  const g = G.gh;
  if (!g || !g.x || !Store.d.opt.ghost || G.state === 'menu') return;
  const f = w.t * 20, i = Math.floor(f);
  if (i >= g.x.length - 1 || i < 0) return;
  const a = f - i, fl = g.f[i];
  if (fl & 64) return;
  const x = lerp(g.x[i], g.x[i + 1], a), y = lerp(g.y[i], g.y[i + 1], a);
  const vx = (g.x[i + 1] - g.x[i]) * 20, vy = (g.y[i + 1] - g.y[i]) * 20;
  const gp = G.gp || (G.gp = { phase: 0, lt: G.t });
  const dtf = clamp(G.t - gp.lt, 0, .05); gp.lt = G.t;
  Object.assign(gp, { vx, vy, onGround: !!(fl & 1), sliding: !!(fl & 2), wallSliding: !!(fl & 4), gliding: !!(fl & 8), dashT: fl & 16 ? 1 : 0, wlock: 0, face: fl & 32 ? -1 : 1, landT: 0, stretchT: 0, dashes: 1, x: x - PW / 2, y: y - PH, w: PW, h: PH });
  if (gp.onGround && !gp.sliding) gp.phase += Math.abs(vx) * dtf * .052; else if (!gp.onGround) gp.phase += dtf * 2;
  const P = smoothPose(gp, stickPose(gp, G.t), G.t);
  renderStick(ctx, { x, y, f: gp.face, P, sq: 1, st: 0, shadow: false, vx, vy, t: G.t, th: G.th, tint: '#bfeaff', alpha: .38 });
}
function trailFx(p, dt) {
  const fast = Math.hypot(p.vx, p.vy) > 150 && !p.onGround || Math.abs(p.vx) > 180;
  G.trailT -= dt;
  if (!fast || G.trailT > 0) return;
  const k = Look.trail, x = p.x + p.w / 2, y = p.y + p.h * .55;
  G.trailT = .035;
  if (k === 'spark') emit('spark', x + rand(-4, 4), y + rand(-8, 8), { vx: rand(-30, 30), vy: rand(-30, 30), g: 100, max: .5, s: rand(2, 3.6), col: Math.random() < .5 ? '#ffe27a' : '#fff' });
  else if (k === 'rainbow') emit('dot', x - p.face * 4, y, { max: .45, s: 4.2, col: 'hsl(' + Math.floor((G.t * 300) % 360) + ',95%,62%)' });
  else if (k === 'ember') emit('dot', x + rand(-4, 4), y + rand(-4, 12), { vx: rand(-20, 20), vy: -rand(20, 70), max: .6, s: rand(2, 3.4), col: Math.random() < .5 ? '#ff9a2e' : '#ffd34a' });
  else if (k === 'bubble') emit('ring', x + rand(-6, 6), y + rand(-10, 10), { s: 2, grow: 7, max: .55, col: '#9fe6ff', vy: -22 });
  else if (k === 'ghost') afterimage(p, '#bfeaff', .3), G.trailT = .07;
}

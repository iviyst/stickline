'use strict';
// One simulation step of a whole world.
function stepWorld(w, c, dt) {
  const p = w.p;
  if (!w.won) w.t += dt;
  else w.winT += dt;
  stepEntities(w, dt);
  stepMovers(w, dt);
  if (w.won) return;
  if (w.dead) { w.deadT += dt; if (w.deadT > .95) respawn(w); return; }

  tickCombat(p, dt);
  if (p.stunT > 0) c = { x: 0, jump: false, down: false, jumpEdge: false, dashEdge: false, dashDir: 0 };   // stunned: no control
  stepPlayer(w, c, dt);

  // springs
  for (const s of w.springs) {
    if (p.vy >= 0 && ovl({ x: p.x, y: p.y + p.h - 6, w: p.w, h: 10 }, s)) {
      if (p.sliding && canStand(w, p)) endSlide(p);
      p.vy = -K.SPRING; p.onGround = false; p.canCut = false; p.coyote = 0; s.a = .3;
      w.events.push({ t: 'spring', x: s.x + s.w / 2, y: s.y });
    }
  }
  // pickups
  for (const k of w.picks) {
    if (!k.got && Math.hypot(k.x - (p.x + p.w / 2), k.y - (p.y + p.h / 2)) < 26) {
      k.got = true; p.glider = K.GLIDE_TIME;
      w.events.push({ t: 'glider', x: k.x, y: k.y });
    }
  }
  // collectibles + pads
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  for (const g of w.gems) if (!g.got && Math.hypot(g.x - pcx, g.y - pcy) < 30) { g.got = true; w.gemCount++; w.events.push({ t: 'gem', x: g.x, y: g.y, n: w.gemCount, i: g.i }); }
  for (const k of w.crystals) if (k.t <= 0 && Math.hypot(k.x - pcx, k.y - pcy) < 30 && p.dashes < 1) { p.dashes = 1; k.t = 2.4; w.events.push({ t: 'crystal', x: k.x, y: k.y }); }
  for (const o of w.orbs) if (o.t <= 0 && p.jbuf > 0 && Math.hypot(o.x - pcx, o.y - pcy) < 30) {
    p.vy = -K.ORB; p.jbuf = 0; p.onGround = false; p.canCut = false; p.coyote = 0; p.dashes = Math.max(p.dashes, 1); p.dashT = 0; p.stretchT = .12;
    o.t = .8; o.a = .3; w.events.push({ t: 'orb', x: o.x, y: o.y });
  }
  for (const c of w.coins) if (!c.got && Math.hypot(c.x - pcx, c.y - pcy) < 26) { c.got = true; w.coinCount++; w.events.push({ t: 'coin', x: c.x, y: c.y }); }
  if (w.trophy && !w.trophy.got && Math.hypot(w.trophy.x - pcx, w.trophy.y - pcy) < 30) { w.trophy.got = true; w.events.push({ t: 'trophy', x: w.trophy.x, y: w.trophy.y }); }
  for (const k of w.cards) if (!k.got && Math.hypot(k.x - pcx, k.y - pcy) < 28) {
    k.got = true; w.hasCard = true; w.events.push({ t: 'card', x: k.x, y: k.y });
    for (const s of w.solids) if (s.k === 'door' && s.solid) { s.solid = false; w.events.push({ t: 'door', x: s.x + s.w / 2, y: s.y + s.h / 2 }); }
  }
  // red light: anything moving inside a watched zone while the light is red gets zapped
  for (const l of w.lights) if (l.st === 'r' && l.grace <= 0 && pcx > l.z0 && pcx < l.z1 && pcy > l.y0 && pcy < l.y1 && Math.hypot(p.vx + (p.onGround ? p.belt : 0), p.onGround || p.hang ? 0 : p.vy) > 40) { w.events.push({ t: 'zap', x: l.x, y: l.y, px: pcx, py: pcy }); kill(w, 'light'); return; }
  if (w.chase) {
    const ch = w.chase;
    if (ch.delay > 0) ch.delay -= dt; else ch.x += Math.min(ch.max, ch.spd + ch.ramp * Math.max(0, ch.x) / T) * dt;
    if (pcx < ch.x) { kill(w, 'chase'); return; }
  }
  // checkpoints
  const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
  w.cps.forEach((cp, i) => {
    if (!cp.on && ovl(pb, cp)) {
      cp.on = true; cp.t = 0; w.cpIndex = i;
      w.respawn = { x: cp.tx * T + (T - PW) / 2, y: (cp.ty + 1) * T - PH };
      w.events.push({ t: 'cp', x: cp.tx * T + T / 2, y: cp.ty * T });
    }
  });
  // exit
  if (w.exit && ovl(pb, w.exit)) { w.won = true; w.winT = 0; w.events.push({ t: 'win', x: w.exit.x + T / 2, y: w.exit.y + T }); return; }
  // hazards
  if (touchingHazard(w)) { kill(w, 'hazard'); return; }
  if (p.y > w.L.H * T + 120) { kill(w, 'fall'); return; }
  if (rectSolid(w, p.x + 2, p.y + 2, p.w - 4, p.h - 4)) { kill(w, 'crush'); return; }
}

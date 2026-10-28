'use strict';
// The player controller (one fixed step).
// ---------- player ----------
function stepPlayer(w, c, dt) {
  const p = w.p;
  const dir = c.x > .2 ? 1 : c.x < -.2 ? -1 : 0;
  const mag = clamp((Math.abs(c.x) - .18) / .6, .32, 1);      // analog sticks can walk slowly
  p.coyote = Math.max(0, p.coyote - dt);
  p.jbuf = Math.max(0, p.jbuf - dt);
  p.wcoyote = Math.max(0, p.wcoyote - dt);
  p.wlock = Math.max(0, p.wlock - dt);
  p.landT = Math.max(0, p.landT - dt);
  p.stretchT = Math.max(0, p.stretchT - dt);
  p.dashCool = Math.max(0, p.dashCool - dt);
  if (c.jumpEdge) p.jbuf = K.BUFFER;
  if (c.dashEdge) { p.dbuf = .1; p.dbufDir = c.dashDir || 0; } else p.dbuf = Math.max(0, p.dbuf - dt);

  // ground probe
  const wasGround = p.onGround;
  p.onGround = p.vy >= 0 && rectSolid(w, p.x, p.y + p.h, p.w, 1);
  p.ride = null; p.belt = 0; p.ice = false;
  if (p.onGround) {
    const fy = p.y + p.h;
    for (const s of w.solids) if (s.solid && p.x < s.x + s.w && p.x + p.w > s.x && Math.abs(fy - s.y) < 1.5) { p.ride = s; break; }
    for (const b of w.belts) if (p.x + p.w > b.x && p.x < b.x + b.w && Math.abs(fy - b.y) < 3) { p.belt = b.dir * K.BELT; break; }
    for (const i of w.ices) if (p.x + p.w > i.x && p.x < i.x + i.w && Math.abs(fy - i.y) < 3) { p.ice = true; break; }
    p.coyote = K.COYOTE; p.canCut = false; p.gliding = false;
    if (!wasGround && p.impact > 360) { w.events.push({ t: 'land', x: p.x + p.w / 2, y: fy, s: p.impact }); p.landT = .14; }
    p.impact = 0;
  }

  // water: swim, hold your breath
  const L = w.L, pcx0 = p.x + p.w / 2, wasSwim = p.swim;
  p.swim = waterAt(L, pcx0, p.y + p.h * .55);
  if (p.swim !== wasSwim && Math.abs(p.vy) > 60) w.events.push({ t: 'splash', x: pcx0, y: Math.floor((p.y + p.h * .55) / T) * T + (p.swim ? 0 : T), big: p.swim });
  if (waterAt(L, pcx0, p.y + 4)) { p.air -= dt; if (p.air <= 0) { p.air = 0; kill(w, 'drown'); return; } }
  else p.air = Math.min(K.AIR, p.air + dt * 3);
  if (p.swim) { p.glider = 0; if (p.sliding && canStand(w, p)) endSlide(p); }

  // ledge catch: hang from a ledge edge, then climb up, drop or kick away
  p.hangCool = Math.max(0, p.hangCool - dt);
  if (p.hang) {
    const side = p.hang;
    p.vx = 0; p.vy = 0; p.dashes = 1; p.wallSliding = false; p.face = side; p.gliding = false; p.coyote = 0;
    const tx = side > 0 ? Math.floor((p.x + p.w + 1) / T) : Math.floor((p.x - 1) / T), ty = Math.floor((p.y - 2) / T);
    if (!solidTile(L, tx, ty)) { p.hang = 0; }                                        // ledge vanished (shouldn't happen with tiles)
    else if (c.down) { p.hang = 0; p.hangCool = .3; }
    else if (p.jbuf > 0 && dir === -side) {
      p.hang = 0; p.hangCool = .3; p.jbuf = 0; p.vy = -K.WJY; p.vx = -side * K.WJ_AWAY; p.face = -side; p.wlock = K.WLOCK; p.canCut = true; p.stretchT = .12;
      w.events.push({ t: 'wjump', x: p.x + (side > 0 ? p.w : 0), y: p.y + p.h * .5, side });
    } else if (p.jbuf > 0 || (dir === side && p.hangT > .12)) {
      p.hang = 0; p.hangCool = .35; p.jbuf = 0; p.vy = -560; p.vx = side * 150; p.canCut = false; p.stretchT = .1;
      w.events.push({ t: 'climb', x: p.x + p.w / 2, y: p.y });
    }
    if (p.hang) { p.hangT += dt; if (p.dbuf > 0 && w.L.dash !== false) { p.hang = 0; p.hangCool = .3; } else return; }
  }

  // wall probe
  let wallDir = 0;
  if (!p.onGround && !p.sliding && !p.swim) {
    if (rectSolid(w, p.x - 1, p.y + 6, 1, p.h - 12)) wallDir = -1;
    else if (rectSolid(w, p.x + p.w, p.y + 6, 1, p.h - 12)) wallDir = 1;
  }
  p.wallSliding = false;
  if (wallDir) {
    p.wcoyote = K.WCOYOTE; p.wallSide = wallDir;
    if (p.vy > 0 && dir === wallDir && p.wlock <= 0) p.wallSliding = true;
  }
  p.wsT = p.wallSliding ? p.wsT + dt : 0;
  // grab a ledge while falling past its top edge (not while pushing away from it)
  if (!p.onGround && !p.swim && !p.sliding && p.vy >= 0 && p.hangCool <= 0 && p.dashT <= 0 && !p.hang) {
    const hand = p.y - 14;
    for (const side of [1, -1]) {
      if (dir === -side) continue;
      const tx = side > 0 ? Math.floor((p.x + p.w + 1) / T) : Math.floor((p.x - 1) / T);
      const gap = side > 0 ? tx * T - (p.x + p.w) : p.x - (tx + 1) * T;
      if (gap > 1.5 || gap < -.5) continue;
      const ty = Math.floor((hand + 13) / T), top = ty * T;
      if (hand < top - 10 || hand > top + 13) continue;
      if (!solidTile(L, tx, ty) || solidTile(L, tx, ty - 1) || solidTile(L, tx, ty - 2)) continue;
      if (rectSolid(w, p.x, top - 6, p.w, 6)) continue;
      p.hang = side; p.hangT = 0; p.y = top + 4; p.vx = 0; p.vy = 0; p.wallSliding = false; p.dashes = 1; p.face = side;
      w.events.push({ t: 'grab', x: p.x + (side > 0 ? p.w : 0), y: top });
      return;
    }
  }

  // ---- dash: one charge, refilled by ground, walls and crystals ----
  if ((p.onGround || wallDir) && p.dashT <= 0) p.dashes = 1;
  if (p.dbuf > 0 && w.L.dash !== false && p.dashT <= 0 && p.dashes > 0 && (!p.sliding || canStand(w, p))) {
    const dd = p.dbufDir || dir || p.face; p.dbuf = 0;
    if (p.sliding) endSlide(p);
    p.dashes--; p.dashT = K.DASH_T; p.dashDir = dd; p.face = dd; p.vx = dd * K.DASH_V; p.vy = 0;
    p.wallSliding = false; p.gliding = false; p.canCut = false; p.jbuf = Math.min(p.jbuf, K.BUFFER);
    w.events.push({ t: 'dash', x: p.x + p.w / 2, y: p.y + p.h / 2, dir: dd, air: !p.onGround });
  }
  let dashEnd = false;
  if (p.dashT > 0) { p.dashT -= dt; if (p.dashT <= 0) { p.dashT = 0; dashEnd = true; } }
  let dashing = p.dashT > 0 || dashEnd;

  // slide start / end
  if (c.down && p.onGround && !p.sliding && !dashing) startSlide(w, p);
  let stand = true;
  if (p.sliding) {
    p.slideT += dt;
    stand = canStand(w, p);
    if (stand && (!c.down || !p.onGround)) endSlide(p);
  }

  // swimming: a jump press is a stroke, or a leap out at the surface
  if (p.swim && p.jbuf > 0 && !p.onGround && !dashing) {
    const surf = !waterAt(L, pcx0, p.y - 4);
    p.vy = surf ? -K.JUMP * .9 : -K.STROKE; p.jbuf = 0; p.canCut = surf; p.stretchT = .1;
    w.events.push({ t: 'swim', x: pcx0, y: p.y + p.h / 2, surf });
  }
  // jumping
  if (p.jbuf > 0 && (!p.sliding || stand)) {
    if (p.coyote > 0) {
      const slideJ = p.sliding && Math.abs(p.vx) > 120, hyper = dashing;
      if (p.sliding) endSlide(p);
      p.vy = -K.JUMP * (hyper ? K.HYPER_Y : 1);
      if (hyper) { p.vx = p.dashDir * K.HYPER_V; p.dashT = 0; dashEnd = false; dashing = false; }
      else if (slideJ) p.vx = Math.sign(p.vx) * Math.max(Math.abs(p.vx) * 1.15, K.SLIDE_JUMP);
      p.coyote = 0; p.jbuf = 0; p.onGround = false; p.canCut = true; p.ride = null; p.stretchT = .12;
      w.events.push({ t: 'jump', x: p.x + p.w / 2, y: p.y + p.h, hyper, slide: slideJ });
    } else if (p.wcoyote > 0 && !p.onGround && !dashing) {
      const away = -p.wallSide;
      // pushing into the wall = a climbing hop, pushing away = a long kick, neutral = in between
      const kick = dir === p.wallSide ? K.WJ_CLIMB : dir === away ? K.WJ_AWAY : K.WJ_NEUTRAL;
      p.vy = -K.WJY; p.vx = away * kick; p.face = away;
      p.wlock = K.WLOCK; p.wcoyote = 0; p.jbuf = 0; p.canCut = true; p.wallSliding = false; p.wsT = 0; p.stretchT = .12;
      p.dashes = 1;
      w.events.push({ t: 'wjump', x: p.x + (p.wallSide > 0 ? p.w : 0), y: p.y + p.h * .5, side: p.wallSide });
    }
  }

  // horizontal control
  let hdir = dir;
  if (p.wlock > 0 && dir === p.wallSide) hdir = 0;       // can't cancel the kick straight away
  if (dashing) {
    p.vx = p.dashDir * K.DASH_V; p.vy = 0;
  } else if (p.sliding) {
    p.vx = approach(p.vx, 0, K.SLIDE_FRIC * (p.ice ? .22 : 1) * dt);
    if (Math.abs(p.vx) < K.CRAWL && dir) p.vx = approach(p.vx, dir * K.CRAWL, 2200 * dt);
    if (Math.abs(p.vx) > 8) p.face = Math.sign(p.vx);
  } else if (p.wlock > 0 && hdir === 0) {
    /* keep the wall-kick momentum */
  } else {
    const acc = p.onGround ? (p.ice ? K.ICE_ACC : K.ACC_G) : K.ACC_A;
    if (hdir) {
      p.face = hdir;
      const tgt = hdir * K.RUN * mag * (p.swim ? K.SWIM_RUN : 1);
      if (p.vx * hdir > Math.abs(tgt) + 4) p.vx = approach(p.vx, tgt, (p.onGround ? (p.ice ? 200 : K.OVER_G) : K.OVER_A) * dt);   // fast from a dash / slide-jump: bleed speed slowly
      else p.vx = approach(p.vx, tgt, acc * (p.vx * hdir < 0 ? 1.7 : 1) * dt);
    } else {
      p.vx = approach(p.vx, 0, (p.onGround ? (p.ice ? K.ICE_FRIC : K.FRIC_G) : K.DRAG_A) * dt);
    }
  }

  // gravity: lighter while rising and holding jump, floaty at the apex, heavier on the way down
  p.gliding = false;
  if (!p.onGround && !dashing && p.swim) {
    p.vy = approach(p.vy, c.jump ? -K.SWIM_UP : K.SWIM_SINK, (p.vy < -K.SWIM_UP ? 1100 : 700) * dt);
  } else if (!p.onGround && !dashing) {
    let g;
    if (p.vy < 0) {
      g = K.GRAV_UP;
      if (p.canCut && !c.jump) g *= K.CUT;                       // let go early = smooth short hop
      else if (c.jump && p.vy > -K.HANG_V) g *= K.HANG;
    } else {
      g = K.GRAV_DN;
      if (c.jump && p.vy < K.HANG_V) g *= K.HANG;
    }
    p.vy = Math.min(p.vy + g * dt, K.MAXFALL);
    if (p.wallSliding) {
      const cap = Math.min(K.WSLIDE, 48 + p.wsT * 300);          // grabs the wall, then slowly picks up speed
      if (p.vy > cap) p.vy = Math.max(cap, p.vy - 3600 * dt);
    } else if (p.glider > 0 && c.jump && p.vy > 0 && p.wlock <= 0 && !p.sliding) {
      p.gliding = true;
      p.vy = Math.min(p.vy, K.GLIDE_FALL);
      const tv = (dir || p.face) * K.GLIDE_V;
      p.vx = approach(p.vx, tv, 900 * dt);
      p.glider = Math.max(0, p.glider - dt);
    }
  }
  // updraft fans lift anything inside them
  p.inFan = false;
  for (const f of w.fans) if (ovl(p, f)) { p.inFan = true; break; }
  if (p.inFan && !dashing && p.vy > -K.FAN_MAXUP) { p.vy = Math.max(-K.FAN_MAXUP, p.vy - K.FAN_UP * dt); p.canCut = false; p.onGround = false; }
  if (p.onGround && p.vy > 0) p.vy = 0;

  // integrate (conveyor belts carry whoever stands on them)
  const vy0 = p.vy;
  if (moveX(w, p, (p.vx + (p.onGround ? p.belt : 0)) * dt, true)) { p.vx = 0; if (dashing) { p.dashT = 0; dashEnd = false; } }
  const y0 = p.y, dy = p.vy * dt;
  const hy = moveY(w, p, dy);
  if (hy === 1) { p.impact = Math.max(p.impact, vy0); p.vy = 0; }
  else if (hy === -1) {
    // bumped a ceiling: slide around a corner if we only clipped it
    const iy = y0 + dy;
    let done = false;
    for (let n = 2; n <= 8 && !done; n += 2) {
      for (const sgn of [1, -1]) {
        if (!rectSolid(w, p.x + sgn * n, iy, p.w, p.h)) { p.x += sgn * n; p.y = iy; done = true; break; }
      }
    }
    if (!done) { p.vy = Math.max(p.vy, 0); p.canCut = false; }
  }
  if (dashEnd && p.vx !== 0) p.vx = p.dashDir * K.DASH_END;
  if (p.vy >= 0) p.canCut = false;
  if (p.onGround && !p.sliding) p.phase += Math.abs(p.vx) * dt * .052;
  else if (!p.onGround) p.phase += dt * 2;
}

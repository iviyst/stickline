'use strict';
// Traps, moving platforms, crushers and other entities.
// ---------- entities ----------
function stepEntities(w, dt) {
  const L = w.L;
  for (const s of w.saws) {
    s.a += dt * 14;
    if (s.ax === 'x') { s.x += s.dir * s.spd * dt; if (s.x >= s.b1) { s.x = s.b1; s.dir = -1; } else if (s.x <= s.b0) { s.x = s.b0; s.dir = 1; } }
    else if (s.ax === 'y') { s.y += s.dir * s.spd * dt; if (s.y >= s.b1) { s.y = s.b1; s.dir = -1; } else if (s.y <= s.b0) { s.y = s.b0; s.dir = 1; } }
  }
  for (const j of w.jets) {
    j.tm += dt;
    const c = j.tm % 2.9;
    j.warn = c >= 1.55 && c < 1.9;
    j.on = c >= 1.9;
  }
  for (const e of w.emits) {
    e.cd -= dt;
    e.warn = e.cd < .4;
    if (e.cd <= 0) {
      e.cd = e.period;
      w.darts.push({ x: e.tx * T + T / 2 + e.dir * (T / 2) - 12, y: e.ty * T + T / 2 - 5, w: 24, h: 10, vx: e.dir * 250, dir: e.dir });
      w.events.push({ t: 'dart', x: e.tx * T + T / 2, y: e.ty * T + T / 2 });
    }
  }
  for (let i = w.darts.length - 1; i >= 0; i--) {
    const d = w.darts[i];
    d.x += d.vx * dt;
    const fx = d.vx > 0 ? d.x + d.w : d.x;
    if (solidTile(L, Math.floor(fx / T), Math.floor((d.y + 5) / T)) || d.x < -50 || d.x > L.W * T + 50) w.darts.splice(i, 1);
  }
  for (const s of w.springs) s.a = Math.max(0, s.a - dt);
  for (const c of w.cps) if (c.on) c.t = Math.min(1, c.t + dt * 3);
  for (const l of w.lasers) {
    const c = (w.t + l.ph) % l.period, on0 = l.period * (1 - l.onF);
    l.warn = c >= on0 - .45 && c < on0;
    const on = c >= on0;
    if (on && !l.on) w.events.push({ t: 'laser', x: (l.x0 + l.x1) / 2, y: (l.y0 + l.y1) / 2 });
    l.on = on;
  }
  for (const o of w.orbs) { o.t = Math.max(0, o.t - dt); o.a = Math.max(0, o.a - dt); }
  for (const k of w.crystals) k.t = Math.max(0, k.t - dt);
  for (const l of w.lights) {
    const per = l.g + .7 + l.r, u = (((w.t + l.ph) % per) + per) % per;
    const st = u < l.g ? 'g' : u < l.g + .7 ? 'y' : 'r';
    if (st !== l.st) { l.st = st; if (st === 'r') { l.grace = .14; w.events.push({ t: 'red', x: l.x, y: l.y }); } else if (st === 'g') w.events.push({ t: 'green', x: l.x, y: l.y }); }
    if (st === 'r') l.grace -= dt;
  }
  for (const s of w.solids) if (s.k === 'door' && !s.solid) s.openT = Math.min(1, s.openT + dt * 2.5);
}

function stepMovers(w, dt) {
  const p = w.p, L = w.L;
  for (const s of w.solids) {
    if (s.k === 'plat' || s.k === 'crush') {
      const px = s.x, py = s.y;
      if (s.k === 'crush') {
        // rest, shake, slam down fast, hold, rise slowly (all derived from the world clock so it never drifts)
        const u = (w.t + s.ph) % s.cyc, tA = s.rest, tB = tA + .4, tC = tB + s.slam, tD = tC + .35;
        let y;
        s.warn = u >= tA && u < tB;
        if (u < tB) y = s.y0;
        else if (u < tC) y = s.y0 + s.dist * ((u - tB) / s.slam);
        else if (u < tD) y = s.y0 + s.dist;
        else y = s.y0 + s.dist * (1 - (u - tD) / s.rise);
        const st = u >= tC && u < tD ? 1 : 0;
        if (st && !s.st) w.events.push({ t: 'slam', x: s.x + s.w / 2, y: s.y0 + s.dist + T });
        s.st = st; s.y = y;
      } else if (s.ax === 'x') {
        s.x += s.dir * s.spd * dt;
        if (s.x >= s.b1) { s.x = s.b1; s.dir = -1; } else if (s.x <= s.b0) { s.x = s.b0; s.dir = 1; }
      } else {
        s.y += s.dir * s.spd * dt;
        if (s.y >= s.b1) { s.y = s.b1; s.dir = -1; } else if (s.y <= s.b0) { s.y = s.b0; s.dir = 1; }
      }
      s.dx = s.x - px; s.dy = s.y - py;
      if (w.dead) continue;
      if (p.ride === s) {
        moveX(w, p, s.dx);
        p.y = s.y - p.h;
      } else if (ovl(p, s)) {
        if (s.dx) moveX(w, p, s.dx > 0 ? s.x + s.w - p.x : s.x - (p.x + p.w));
        else if (s.dy > 0) moveY(w, p, s.y + s.h - p.y);
        else if (s.dy < 0) moveY(w, p, s.y - (p.y + p.h));
        if (ovl(p, s) || rectSolid(w, p.x + 1, p.y + 1, p.w - 2, p.h - 2)) kill(w, 'crush');
      }
    } else if (s.k === 'fall') {
      if (s.st === 0) {
        if (!w.dead && p.ride === s) { s.st = 1; s.tm = 0; w.events.push({ t: 'crumble', x: s.x + T / 2, y: s.y }); }
      } else if (s.st === 1) {
        s.tm += dt;
        if (s.tm > .5) { s.st = 2; s.solid = false; s.vy = 0; }
      } else if (s.st === 2) {
        s.vy += 1500 * dt; s.y += s.vy * dt;
        if (s.y > L.H * T + 200) { s.st = 3; s.tm = 0; }
      } else {
        s.tm += dt;
        if (s.tm > 3) {
          const box = { x: s.hx, y: s.hy, w: s.w, h: s.h };
          if (w.dead || !ovl(p, box)) { s.st = 0; s.x = s.hx; s.y = s.hy; s.solid = true; s.vy = 0; }
        }
      }
    }
  }
}

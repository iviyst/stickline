'use strict';
// Movement with tile and solid collision; slide helpers.
// ---------- movement with tile + solid collision ----------
function moveX(w, e, dx, step) {
  if (!dx) return false;
  const L = w.L;
  const tx0 = e.x + dx;
  e.x = tx0;
  let hit = false;
  const ty0 = Math.floor(e.y / T), ty1 = Math.floor((e.y + e.h - .01) / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w - .01) / T);
    for (let ty = ty0; ty <= ty1; ty++) if (solidTile(L, tx, ty)) { e.x = tx * T - e.w; hit = true; break; }
  } else {
    const tx = Math.floor(e.x / T);
    for (let ty = ty0; ty <= ty1; ty++) if (solidTile(L, tx, ty)) { e.x = (tx + 1) * T; hit = true; break; }
  }
  for (const s of w.solids) if (s.solid && ovl(e, s)) { e.x = dx > 0 ? s.x - e.w : s.x + s.w; hit = true; }
  // ledge forgiveness: if we only clipped a ledge top, pop up onto it instead of stopping
  if (hit && step && e.vy >= -220) {
    for (let up = 3; up <= 10; up += 3.5) {
      if (!rectSolid(w, tx0, e.y - up, e.w, e.h)) { e.x = tx0; e.y -= up; moveY(w, e, up + .02); hit = false; break; }
    }
  }
  return hit;
}

function moveY(w, e, dy) {
  if (!dy) return 0;
  const L = w.L;
  e.y += dy;
  let hit = 0;
  const tx0 = Math.floor(e.x / T), tx1 = Math.floor((e.x + e.w - .01) / T);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - .01) / T);
    for (let tx = tx0; tx <= tx1; tx++) if (solidTile(L, tx, ty)) { e.y = ty * T - e.h; hit = 1; break; }
  } else {
    const ty = Math.floor(e.y / T);
    for (let tx = tx0; tx <= tx1; tx++) if (solidTile(L, tx, ty)) { e.y = (ty + 1) * T; hit = -1; break; }
  }
  for (const s of w.solids) if (s.solid && ovl(e, s)) {
    if (dy > 0) { e.y = s.y - e.h; hit = 1; } else { e.y = s.y + s.h; hit = -1; }
  }
  return hit;
}

// ---------- slide helpers ----------
function canStand(w, p) { return !rectSolid(w, p.x, p.y + p.h - PH, p.w, PH - 1); }
function startSlide(w, p) {
  if (p.sliding) return;
  p.sliding = true; p.slideT = 0;
  p.y += PH - PSH; p.h = PSH;
  if (Math.abs(p.vx) > 60) { p.vx = Math.sign(p.vx) * Math.max(Math.abs(p.vx), K.SLIDE_V); w.events.push({ t: 'slide', x: p.x + p.w / 2, y: p.y + p.h }); }
}
function endSlide(p) {
  if (!p.sliding) return;
  p.sliding = false;
  p.y -= PH - PSH; p.h = PH;
}

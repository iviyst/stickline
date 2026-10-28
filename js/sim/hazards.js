'use strict';
// Hazard hit-testing.
// ---------- hazards ----------
function hazRect(c, tx, ty) {
  const x = tx * T, y = ty * T;
  switch (c) {
    case '^': return { x: x + 5, y: y + 12, w: 22, h: 20 };
    case 'v': return { x: x + 5, y, w: 22, h: 20 };
    case '<': return { x, y: y + 5, w: 20, h: 22 };
    case '>': return { x: x + 12, y: y + 5, w: 20, h: 22 };
    case '~': return { x: x + 6, y: y + 10, w: 20, h: 22 };
  }
  return null;
}

function touchingHazard(w) {
  const p = w.p, L = w.L;
  const hb = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 3 };
  const tx0 = Math.floor(hb.x / T), tx1 = Math.floor((hb.x + hb.w) / T);
  const ty0 = Math.floor(hb.y / T), ty1 = Math.floor((hb.y + hb.h) / T);
  for (let ty = ty0; ty <= ty1; ty++) {
    if (ty < 0 || ty >= L.H) continue;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= L.W) continue;
      const c = L.g[ty][tx];
      if (c === '.' || c === '#') continue;
      const r = hazRect(c, tx, ty);
      if (r && ovl(hb, r)) return true;
    }
  }
  for (const s of w.saws) {
    const cx = clamp(s.x, hb.x, hb.x + hb.w), cy = clamp(s.y, hb.y, hb.y + hb.h);
    const dx = s.x - cx, dy = s.y - cy, rr = s.r - 2;
    if (dx * dx + dy * dy < rr * rr) return true;
  }
  for (const j of w.jets) if (j.on && ovl(hb, { x: j.tx * T + 7, y: (j.ty - 1) * T + 4, w: 18, h: 2 * T - 4 })) return true;
  for (const d of w.darts) if (ovl(hb, d)) return true;
  for (const l of w.lasers) if (l.on && ovl(hb, l.rect)) return true;
  return false;
}

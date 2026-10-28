'use strict';
// Camera.
// ---------- camera ----------
function camTarget(w) {
  const p = w.p, L = w.L, hx = vw / 2 / scale, hy = vh / 2 / scale;
  let tx = p.x + p.w / 2 + clamp(p.vx * .3, -100, 100);
  let ty = p.y + p.h / 2 + clamp(p.vy * .12, -20, 80) + hy * (G.touchOn ? .24 : .08);
  const LW = L.W * T, LH = L.H * T;
  tx = LW <= hx * 2 ? LW / 2 : clamp(tx, hx, LW - hx);
  const lo = hy - 140, hi = LH + 150 - hy;
  ty = hi < lo ? (lo + hi) / 2 : clamp(ty, lo, hi);
  return { x: tx, y: ty };
}

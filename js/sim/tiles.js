'use strict';
// Tile and solid queries.
// ---- world simulation (no DOM) ----
function solidTile(L, tx, ty) {
  if (tx < 0 || tx >= L.W) return true;
  if (ty < 0 || ty >= L.H) return false;
  const c = L.g[ty][tx];
  return c === '#' || c === '{' || c === '}';
}

function waterAt(L, x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return tx >= 0 && ty >= 0 && tx < L.W && ty < L.H && L.g[ty][tx] === 'w';
}

function rectSolid(w, x, y, ww, hh) {
  const L = w.L;
  const tx0 = Math.floor(x / T), tx1 = Math.floor((x + ww - .01) / T);
  const ty0 = Math.floor(y / T), ty1 = Math.floor((y + hh - .01) / T);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (solidTile(L, tx, ty)) return true;
  for (const s of w.solids) if (s.solid && x < s.x + s.w && x + ww > s.x && y < s.y + s.h && y + hh > s.y) return true;
  return false;
}

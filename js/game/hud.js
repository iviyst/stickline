'use strict';
// HUD.
// ---------- hud ----------
let lastHud = '';
function updateHud(force) {
  const w = G.w; if (!w) return;
  const s = G.mode === 'gaunt' ? G.gDist + ' m · ' + '♥'.repeat(Math.max(0, 3 - w.deaths)) + '♡'.repeat(Math.min(3, w.deaths)) + ' · ' + fmt(w.t) : w.deaths + (w.deaths === 1 ? ' death' : ' deaths') + ' · ' + fmt(w.t);
  if (force || s !== lastHud) { lastHud = s; $('hudStat').textContent = s; }
  const hg = $('hudGems');
  if (G.mode === 'gaunt') { const b = G.gDaily ? Store.d.gaunt.daily[G.gSeed] || 0 : Store.d.gaunt.best || 0, t = 'BEST ' + Math.max(b, 0) + ' m'; if (hg.textContent !== t) hg.textContent = t; }
  else if (w.gems.length || w.coins.length) { const t = (w.gems.length ? '◆ ' + w.gemCount + ' / ' + w.gems.length : '') + (w.coins.length ? '   ● ' + w.coinCount : '') + (w.trophy && w.trophy.got ? '   🏆' : ''); if (hg.textContent !== t) hg.textContent = t; }
  const gl = $('glide'), has = w.p.glider > 0 && w.p.glider < K.GLIDE_TIME + .01 && w.picks.some((k) => k.got);
  if (gl.hidden === has) gl.hidden = !has;
  if (has) $('glideBar').style.transform = 'scaleX(' + clamp(w.p.glider / K.GLIDE_TIME, 0, 1).toFixed(3) + ')';
}

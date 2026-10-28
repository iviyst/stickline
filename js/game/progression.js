'use strict';
// Worlds, stars, unlocks.
// ---------- progression ----------
const WORLDS = [{ n: 1, name: 'The Climb', blurb: 'Learn the moves' }, { n: 2, name: 'Overdrive', blurb: 'Dash, orbs, lasers, ice' }, { n: 3, name: 'Undertow', blurb: 'Water, red lights, VIP doors' }];
const cleared = (i) => !!Store.d.best[i];
const gemsTotalIn = (i) => LEVELS[i].ents.filter((e) => e.t === 'gem').length;
const gemsBanked = (i) => (Store.d.gems[i] || []).filter(Boolean).length;
const goalsOf = (i) => {
  const b = Store.d.best[i], L = LEVELS[i], gt = gemsTotalIn(i);
  return [!!b, !!b && gt > 0 && gemsBanked(i) >= gt, !!b && L.par > 0 && b.t <= L.par];
};
const starsOf = (i) => goalsOf(i).filter(Boolean).length;
function unlocked(i) {
  if (Store.d.opt.unlock) return true;
  const L = LEVELS[i];
  if (L.world === 1) return true;
  return cleared(i - 1);
}
const totalStars = () => LEVELS.reduce((n, _, i) => n + starsOf(i), 0);
const totalGems = () => Store.gemTotal();
const allGems = () => LEVELS.reduce((n, _, i) => n + gemsTotalIn(i), 0);
function lockText(i) { const L = LEVELS[i], prev = LEVELS[i - 1]; return prev && prev.world !== L.world ? 'Clear Act ' + i + ' to open World ' + L.world : 'Clear Act ' + i + ' first'; }

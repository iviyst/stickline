'use strict';
// Gauntlet run flow.
// ---------- gauntlet ----------
const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function startGauntlet(daily) {
  G.gDaily = daily; G.gSeed = daily ? dayKey() : (Math.random() * 2147483647) | 0;
  startLevel(-1, makeGauntlet(G.gSeed));
}
function refreshGaunt() {
  const g = Store.d.gaunt, today = g.daily[dayKey()] || 0;
  $('gauntBest').textContent = 'Best ever: ' + (g.best || 0) + ' m · Today\'s daily best: ' + today + ' m';
}
function gauntOver(cleared) {
  if (G.state !== 'play') return;
  const w = G.w, dist = cleared ? w.L.W - 13 : G.gDist, g = Store.d.gaunt;
  const oldBest = g.best || 0, key = G.gDaily ? G.gSeed : null, oldDay = key ? g.daily[key] || 0 : 0;
  g.best = Math.max(oldBest, dist);
  const earnG = Math.floor(dist / 100); Store.d.gemBonus += earnG; Store.d.coinBank += w.coinCount;
  if (key) { g.daily[key] = Math.max(oldDay, dist); const ks = Object.keys(g.daily).sort(); while (ks.length > 14) delete g.daily[ks.shift()]; }
  Store.save();
  G.state = 'win'; if (typeof Mus !== 'undefined') Mus.duck(true);
  Snd.play(cleared ? 'win' : 'cp');
  $('grTitle').textContent = cleared ? 'Gauntlet cleared!' : 'Run over';
  $('grDist').textContent = dist + ' m'; $('grTime').textContent = fmt(w.t);
  $('grBest').textContent = (key ? g.daily[key] : g.best) + ' m';
  $('grBestL').textContent = key ? 'Daily best' : 'Best';
  const rec = key ? dist > oldDay : dist > oldBest;
  $('grNote').textContent = rec ? (key ? 'New best for today\'s run.' : 'New personal best.') : 'Best ever: ' + g.best + ' m. Every run is different, except the daily one.';
  if (rec) setTimeout(() => Snd.play('star'), 300);
  $('grNote').textContent += '  Earned ◆ ' + earnG + ' and ● ' + w.coinCount + '.';
  $('bGAgain').textContent = G.gDaily ? 'Retry daily run' : 'New random run';
  show('pGres', 'bGAgain');
}

'use strict';
// Menu / level flow: start, pause, resume, finish.
function pickDemo() {
  const pool = LEVELS.map((_, k) => k).filter((k) => !LEVELS[k].chase);
  const i = pool[Math.floor(Math.random() * pool.length)];
  G.demo = makeWorld(LEVELS[i]); G.th = THEMES[LEVELS[i].theme];
}
function toMenu(id, focusId, keepRoom) {
  if (G.mode === 'race') { if (typeof Net !== 'undefined') { if (keepRoom) Net.raceEnded(); else Net.leave(); } Race.stop(); G.mode = 'act'; }
  G.state = 'menu'; G.w = null; $('hud').hidden = true;
  $('toast').classList.remove('show'); $('banner').classList.remove('show');
  pickDemo(); show(id, focusId); refreshMain();
  if (typeof Mus !== 'undefined') { Mus.duck(false); Mus.play('menu'); }
}

// ---------- level flow ----------
function startLevel(i, GL) {
  const L = GL || LEVELS[i];
  G.mode = GL ? 'gaunt' : 'act'; G.gDist = 0;
  G.idx = i; G.w = makeWorld(L); G.th = THEMES[L.theme]; G.world = L.world;
  const have = GL ? [] : Store.d.gems[i] || [];
  for (const g of G.w.gems) g.have = !!have[g.i];
  G.parts.length = 0; G.shown = {}; G.fade = 1; G.snap = true; G.acc = 0; G.winT = 0; G.pendJump = false; G.pendDash = false; G.pendDashDir = 0; G.shake = 0; G.dustT = 0; G.afterT = 0; G.trailT = 0; G.introT = 0;
  G.rec = { x: [], y: [], f: [] }; G.recN = 0; G.gp = null;
  G.gh = !GL && Store.d.opt.ghost ? Store.getGhost(i) : null;
  G.state = 'play';
  show(null);
  if (Store.d.opt.fs !== 'off' && !G.fsOff) enterFs(true);
  $('hud').hidden = false;
  $('hudAct').textContent = GL ? 'GAUNTLET · ' + (G.gDaily ? 'DAILY' : 'RANDOM') : 'ACT ' + (i + 1) + ' · ' + L.name.toUpperCase();
  const hg = $('hudGems'); hg.hidden = !GL && !G.w.gems.length && !G.w.coins.length;
  G.w.trophyHave = !GL && !!Store.d.trophies[i];
  Input.clearEdges();
  if (GL) banner('GAUNTLET', G.gDaily ? 'Daily run' : 'Random run'); else banner('ACT ' + (i + 1), L.name);
  G.hintAt = G.t + 2.6;
  updateHud(true);
  const t = camTarget(G.w); G.cam.x = t.x; G.cam.y = t.y;
  if (typeof Mus !== 'undefined') { Mus.duck(false); Mus.play(L.theme); }
}
function pause() {
  if (G.state !== 'play') return;
  G.state = 'paused'; if (typeof Mus !== 'undefined') Mus.duck(true);
  $('bRestart').hidden = G.mode === 'race'; $('bPauseActs').hidden = G.mode === 'race'; $('bPauseMenu').textContent = G.mode === 'race' ? 'Leave race' : 'Main menu';
  $('pauseSub').textContent = G.mode === 'race' ? 'Head to head · the race keeps going' + (G.raceR && !G.raceR.online ? ' (the CPU racers wait while you\'re paused)' : '') : G.mode === 'gaunt' ? 'Gauntlet · ' + G.gDist + ' m · ' + (3 - G.w.deaths) + ' of 3 lives left' : 'Act ' + (G.idx + 1) + ' · ' + G.w.L.name + ' · ' + G.w.deaths + (G.w.deaths === 1 ? ' death' : ' deaths');
  show('pPause', 'bResume');
}
function resume() {
  if (G.state !== 'paused') return;
  G.state = 'play'; show(null); Input.clearEdges(); G.acc = 0; if (typeof Mus !== 'undefined') Mus.duck(false);
}
function finishLevel() {
  if (G.mode === 'race') { Race.finish(); return; }
  if (G.mode === 'gaunt') { gauntOver(true); return; }
  const w = G.w, i = G.idx, t = w.t, d = w.deaths, L = w.L;
  const old = Store.d.best[i], before = goalsOf(i), oldWorld2 = LEVELS.some((l, k) => l.world === 2 && unlocked(k)), oldWorld3 = LEVELS.some((l, k) => l.world === 3 && unlocked(k));
  // bank gems (they only count once the act is cleared) and the best time
  const arr = Store.d.gems[i] || (Store.d.gems[i] = new Array(gemsTotalIn(i)).fill(false));
  let newGems = 0;
  for (const g of w.gems) if (g.got && !arr[g.i]) { arr[g.i] = true; newGems++; }
  const ca = Store.d.coins[i] || (Store.d.coins[i] = []);
  let newCoins = 0;
  for (const c of w.coins) if (c.got && !ca[c.i]) { ca[c.i] = 1; newCoins++; }
  Store.d.coinBank += newCoins; G.lastCoins = newCoins;
  const newTrophy = !!(w.trophy && w.trophy.got && !Store.d.trophies[i]);
  if (newTrophy) Store.d.trophies[i] = true;
  const faster = !old || t < old.t;
  if (faster) {
    Store.d.best[i] = { t, deaths: d };
    if (G.rec && G.rec.x.length > 4) Store.setGhost(i, G.rec);
  }
  Store.save();
  G.state = 'win'; if (typeof Mus !== 'undefined') Mus.duck(true);
  const after = goalsOf(i), last = i >= LEVELS.length - 1;
  $('winTitle').textContent = last ? 'Final act cleared' : 'Act ' + (i + 1) + ' complete';
  $('winTime').textContent = fmt(t);
  $('winDeaths').textContent = String(d);
  $('winGems').textContent = gemsTotalIn(i) ? gemsBanked(i) + '/' + gemsTotalIn(i) : '–';
  const rows = [['Clear the act', ''], ['Find all 3 gems', gemsTotalIn(i) ? '' : ''], ['Beat the par time', L.par ? fmt(L.par) : '']];
  $('winGoals').innerHTML = '';
  rows.forEach((r, k) => {
    const li = document.createElement('li'); li.className = after[k] ? '' : 'no';
    const label = k === 1 ? 'Find all ' + gemsTotalIn(i) + ' gems (' + gemsBanked(i) + '/' + gemsTotalIn(i) + ')' : k === 2 ? 'Under par ' + fmt(L.par) + (after[2] || !faster ? '' : '') : r[0];
    li.innerHTML = '<span class="star' + (after[k] ? ' on' : '') + '">★</span><span class="t"></span>' + (after[k] && !before[k] ? '<em>NEW</em>' : '');
    li.querySelector('.t').textContent = label;
    $('winGoals').appendChild(li);
  });
  const newStars = after.filter((v, k) => v && !before[k]).length;
  if (newStars) setTimeout(() => Snd.play('star'), 250);
  const nowWorld2 = LEVELS.some((l, k) => l.world === 2 && unlocked(k));
  const nowWorld3 = LEVELS.some((l, k) => l.world === 3 && unlocked(k));
  $('winBest').textContent = ((nowWorld2 && !oldWorld2) ? 'World 2 unlocked: Overdrive.' : (nowWorld3 && !oldWorld3) ? 'World 3 unlocked: Undertow.' : !old ? 'First clear.' : t < old.t ? 'New best time, ' + fmt(old.t - t).replace(/^0:/, '') + ' faster.' : 'Best: ' + fmt(old.t))
    + (G.lastCoins ? ' +' + G.lastCoins + ' coins.' : '') + (newTrophy ? ' Secret trophy found!' : '');
  if (nowWorld3 && !oldWorld3) setTimeout(() => Snd.play('unlock'), 600);
  if (nowWorld2 && !oldWorld2) setTimeout(() => Snd.play('unlock'), 600);
  $('bNext').hidden = last;
  show('pWin', last ? 'bRetry' : 'bNext');
  buildActs(); refreshMain();
  if (typeof Wardrobe !== 'undefined') Wardrobe.check(true);
}

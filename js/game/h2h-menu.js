'use strict';
// Head to Head menu helpers.
// ---------- head to head menu ----------
function refreshRace() {
  const W = WEAPONS[Look.wpn] || WEAPONS.fists;
  $('raceWpn').textContent = 'Your weapon: ' + W.name + '. ' + W.blurb + ' Buy more in the Store.';
  $('raceRec').textContent = 'Record: ' + Store.d.h2h.w + ' wins, ' + Store.d.h2h.l + ' losses';
  $('raceWho').textContent = 'Playing as ' + (Store.d.name || 'Player') + '.';
  if (typeof Net !== 'undefined') Net.refresh();
}

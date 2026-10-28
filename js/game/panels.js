'use strict';
// Menu panels and keyboard / controller menu navigation.
// ---------- panels + menu navigation ----------
const PANELS = ['pAuth', 'pMain', 'pActs', 'pGaunt', 'pGres', 'pRace', 'pLobby', 'pRres', 'pShop', 'pWard', 'pHelp', 'pOpts', 'pPause', 'pWin'];
let curPanel = null;
function show(id, focusId) {
  for (const p of PANELS) $(p).hidden = p !== id;
  curPanel = id ? $(id) : null;
  Input.menuMode = !!id;
  if (typeof Wardrobe !== 'undefined') Wardrobe.vis(id === 'pWard');
  if (typeof Shop !== 'undefined') Shop.vis(id === 'pShop');
  if (id) {
    const f = (focusId && $(focusId)) || curPanel.querySelector('button:not(.back)') || curPanel.querySelector('button');
    const cd = curPanel.querySelector('.card'); if (cd) cd.scrollTop = 0;
    if (f) f.focus({ preventScroll: true });
  }
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  updateTouchUI();
}
function navMove(dir) {
  if (!curPanel) return;
  const els = [...curPanel.querySelectorAll('button, input, select')].filter((b) => !b.hidden && !b.disabled && b.offsetParent !== null);
  if (!els.length) return;
  const cur = document.activeElement;
  if (!els.includes(cur)) { els[0].focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bs = 1e9;
  for (const e of els) {
    if (e === cur) continue;
    const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
    const horiz = dir === 'left' || dir === 'right';
    const ok = dir === 'left' ? dx < -4 : dir === 'right' ? dx > 4 : dir === 'up' ? dy < -4 : dy > 4;
    if (!ok) continue;
    const s = (horiz ? Math.abs(dx) : Math.abs(dy)) + (horiz ? Math.abs(dy) : Math.abs(dx)) * 2.2;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { best.focus(); Snd.play('ui'); if (best.scrollIntoView) best.scrollIntoView({ block: 'nearest' }); }
}
function menuBack() {
  Snd.play('back');
  const id = curPanel && curPanel.id;
  if (id === 'pActs' || id === 'pHelp' || id === 'pOpts' || id === 'pWard' || id === 'pGaunt' || id === 'pShop') show('pMain', 'bPlay');
  else if (id === 'pRace') { if (typeof Net !== 'undefined') Net.cancel(); show('pMain', 'bPlay'); }
  else if (id === 'pAuth') Auth.back();
  else if (id === 'pLobby') Lobby.leave();
  else if (id === 'pRres') toMenu('pRace', 'bRBots');
  else if (id === 'pGres') toMenu('pGaunt');
  else if (id === 'pPause') resume();
  else if (id === 'pWin') toMenu('pActs');
}
function menuAction(a) {
  if (a === 'up' || a === 'down' || a === 'left' || a === 'right') navMove(a);
  else if (a === 'ok') { const f = document.activeElement; if (f && curPanel && curPanel.contains(f)) f.click(); else navMove('down'); }
  else if (a === 'back') menuBack();
  else if (a === 'start' && curPanel && curPanel.id === 'pPause') resume();
}
Input.onMenu = menuAction;

addEventListener('keydown', (e) => {
  Snd.init(); if (typeof Mus !== 'undefined') Mus.sync();
  if (e.code === 'KeyM' && !e.repeat) { toggleSound(); return; }
  if (e.code === 'KeyF' && !e.repeat && G.state === 'play') { toggleFs(); return; }
  if (G.state === 'play') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) { if (e.code === 'Escape') e.target.blur(); return; }
  const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  if (map[e.code]) { e.preventDefault(); navMove(map[e.code]); }
  else if (e.code === 'Escape') { e.preventDefault(); menuBack(); }
});
addEventListener('pointerdown', () => { Snd.init(); if (typeof Mus !== 'undefined') Mus.sync(); });

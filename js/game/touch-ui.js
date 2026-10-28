'use strict';
// Touch control visibility.
// ---------- touch visibility ----------
function updateTouchUI() {
  const o = Store.d.opt.touch;
  G.touchOn = o === 'on' || (o === 'auto' && Input.lastDevice === 'touch');
  const vis = G.touchOn && G.state === 'play';
  document.body.classList.toggle('notouch', !vis);
  if (!vis) Input.resetTouch();
}
Input.onDevice = updateTouchUI;

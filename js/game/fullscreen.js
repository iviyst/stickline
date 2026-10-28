'use strict';
// Full screen.
// ---------- full screen ----------
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function fsRequest() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!fn) return Promise.reject(new Error('unsupported'));
  try { return Promise.resolve(fn.call(el, { navigationUI: 'hide' })); } catch (e) { return Promise.reject(e); }
}
function fsExit() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  try { if (fn) return Promise.resolve(fn.call(document)); } catch (e) { /* ignore */ }
  return Promise.resolve();
}
function fsFailed() {
  const ios = /iPhone|iPod/.test(navigator.userAgent);
  toast(ios ? 'iPhone browsers cannot go full screen. Use Share, then Add to Home Screen' : 'Full screen is blocked here. Try opening the page in its own tab', 4200);
}
// quiet = automatic attempt when a level starts: never nags if the browser says no
function enterFs(quiet) {
  if (fsEl()) return;
  fsRequest().then(() => {
    try { if (screen.orientation && screen.orientation.lock && G.touchOn) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignore */ }
  }).catch(() => { if (!quiet) fsFailed(); });
}
function toggleFs() {
  G.fsSelf = performance.now();
  if (fsEl()) { G.fsOff = true; fsExit(); } else { G.fsOff = false; enterFs(false); }
}
function onFsChange() {
  setTimeout(resize, 60);
  const on = !!fsEl();
  $('bFsMenu').textContent = on ? 'Exit full screen' : 'Full screen';
  // leaving full screen with Esc or a swipe pauses the run (our own button does not)
  if (!on) {
    if (performance.now() - (G.fsSelf || -1e9) > 600) G.fsOff = true;
    if (G.state === 'play' && performance.now() - (G.fsSelf || -1e9) > 600) pause();
  }
}
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

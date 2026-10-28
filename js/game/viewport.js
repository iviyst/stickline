'use strict';
// Canvas sizing.
function resize() {
  const r = cv.getBoundingClientRect();
  vw = Math.max(1, r.width); vh = Math.max(1, r.height); cvLeft = r.left;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  scale = Math.min(vw / 720, vh / 450);
  if (vh > vw) scale = Math.max(scale, vw / 540);
  scale = clamp(scale, .42, 2.4);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));
if (window.visualViewport) visualViewport.addEventListener('resize', resize);

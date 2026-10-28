'use strict';
// Start-up.
(function init() {
  resize();
  Input.bindMouse(cv); Input.bindTouch();
  Input.mouseTarget = () => cvLeft + vw / 2 + (G.w ? (G.w.p.x + G.w.p.w / 2 - G.cam.x) * scale : 0);
  pickDemo();
  if (typeof Wardrobe !== 'undefined') Wardrobe.init();
  if (typeof Shop !== 'undefined') Shop.init();
  Auth.boot();                                 // carry on as the saved player, or ask who is playing (nothing is saved until someone is signed in)
  if (typeof Mus !== 'undefined') Mus.play('menu');
  requestAnimationFrame(frame);
})();

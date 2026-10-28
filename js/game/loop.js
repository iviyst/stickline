'use strict';
// Main loop.
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, Math.max(0, (ts - (G.last || ts)) / 1000));
  G.last = ts; G.t += dt;
  const c = Input.poll(dt);
  if (G.state === 'play') update(dt, c);
  else if (G.state === 'menu') demoUpdate(dt);
  if (G.fade > 0) G.fade -= dt * 1.8;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.5);
  const ref = G.state === 'menu' ? G.demo : G.w;
  if (ref) { updateParts(G.parts, dt, ref.L); BG.tick(dt, ref, G.state === 'menu'); }
  render();
}

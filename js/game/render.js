'use strict';
// Frame rendering.
// ---------- render ----------
function render() {
  const w = G.state === 'menu' ? G.demo : G.w;
  if (!w) return;
  const L = w.L, th = G.th;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground(ctx, th, vw, vh, G.cam.x, G.cam.y, L.H * T / 2, G.t);
  const sx = G.shake > 0 ? rand(-1, 1) * G.shake * 12 : 0, sy = G.shake > 0 ? rand(-1, 1) * G.shake * 12 : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (vw / 2 - (G.cam.x + sx) * scale), dpr * (vh / 2 - (G.cam.y + sy) * scale));
  const x0 = G.cam.x - vw / 2 / scale - T, x1 = G.cam.x + vw / 2 / scale + T;
  const y0 = G.cam.y - vh / 2 / scale - T, y1 = G.cam.y + vh / 2 / scale + T;
  drawLightCones(ctx, w, G.t);
  drawTiles(ctx, L, th, x0, y0, x1, y1, G.t, w);
  drawEntities(ctx, w, th, G.t);
  if (G.state !== 'menu') drawGhost(w);
  if (G.state !== 'menu' && G.mode === 'race') Race.draw(ctx, th, G.t);
  if (G.state !== 'menu' && !w.dead) drawStick(ctx, w.p, th, G.t);
  drawOverlayTiles(ctx, L, th, x0, y0, x1, y1, G.t, G.state !== 'menu' ? w : null);
  if (G.state !== 'menu' && !w.dead) drawBreath(ctx, w.p, G.t);
  drawParts(ctx, G.parts, th);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.state !== 'menu' && w.chase && !w.won) {   // red edge glow when the wall closes in
    const gap = (w.p.x + w.p.w / 2) - w.chase.x, v = clamp(1 - gap / 520, 0, 1);
    if (v > 0) { const gr = ctx.createLinearGradient(0, 0, vw * .45, 0); gr.addColorStop(0, 'rgba(255,40,30,' + (v * .55).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, vw * .45, vh); }
  }
  let a = G.fade > 0 ? Math.min(1, G.fade) : 0;
  if (G.state !== 'menu' && w.dead && w.deadT > .55) a = Math.max(a, Math.min(.92, (w.deadT - .55) / .38));
  if (a > 0) { ctx.fillStyle = 'rgba(8,10,24,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
}

'use strict';
// Per-frame update.
// ---------- per-frame update ----------
function update(dt, c) {
  const w = G.w, p = w.p;
  if (c.pauseEdge) { pause(); return; }
  if (G.mode === 'race' && Race.preUpdate(dt)) {             // countdown: everyone waits on the line
    const t = camTarget(w); G.cam.x += (t.x - G.cam.x) * .2; G.cam.y += (t.y - G.cam.y) * .2; updateHud(false); return;
  }
  if (G.mode === 'gaunt' && w.dead && w.deaths >= 3) {          // out of lives: let the death play out, then show the run
    w.deadT += dt; if (w.deadT > 1.25) gauntOver(false);
    const t = camTarget(w); G.cam.x += (t.x - G.cam.x) * .1; G.cam.y += (t.y - G.cam.y) * .1;
    return;
  }
  if (c.restartEdge && !w.won && !w.dead && G.mode !== 'gaunt') kill(w, 'reset');
  G.pendJump = G.pendJump || c.jumpEdge;
  if (c.atkEdge && !w.dead && !w.won && startSwing(p, Look.wpn)) { Snd.play(wpnSwingSfx(Look.wpn)); w.events.push({ t: 'swing', x: p.x + p.w / 2, y: p.y + 14 }); }
  if (p.atkT > 0) for (let i = w.darts.length - 1; i >= 0; i--) if (ovl(swingBox(p, Look.wpn), w.darts[i])) { const d = w.darts[i]; sparks(d.x + d.w / 2, d.y + 5, 10, '#ffd34a', 200); w.darts.splice(i, 1); Snd.play('clang'); }
  if (c.dashEdge) { G.pendDash = true; G.pendDashDir = c.dashDir; }
  G.acc += dt;
  let n = 0;
  while (G.acc >= DT && n < 12) {
    stepWorld(w, { x: c.x, jump: c.jump, down: c.down, jumpEdge: G.pendJump, dashEdge: G.pendDash, dashDir: G.pendDashDir }, DT);
    if (G.mode === 'race') Race.fixed();
    G.pendJump = false; G.pendDash = false; G.pendDashDir = 0; G.acc -= DT; n++;
    if (G.mode === 'act' && !w.won && ++G.recN % 6 === 0) recordGhost(w);
    if (w.events.length) handleEvents(w);
    if (G.mode === 'gaunt') {
      if (!w.dead) G.gDist = Math.max(G.gDist, Math.floor(w.p.x / T) - 3);
      else if (w.deaths >= 3) break;
    }
  }
  if (n === 12) G.acc = 0;
  if (G.mode === 'race') Race.update(dt);

  if (!w.dead && !w.won) {
    G.dustT -= dt;
    const fx = p.x + p.w / 2, fy = p.y + p.h;
    if (G.dustT <= 0) {
      if (p.onGround && p.sliding && Math.abs(p.vx) > 60) { dust(fx, fy, 2, p.face); G.dustT = .05; }
      else if (p.onGround && !p.sliding && Math.abs(p.vx) > 140) { dust(fx, fy, 1, p.face); G.dustT = .11; }
      else if (p.wallSliding) { sparks(fx + p.face * 8, p.y + p.h * .7, 1, G.th.hi, 40); G.dustT = .06; }
    }
    // dash afterimages + wardrobe trail
    if (p.dashT > 0) { G.afterT -= dt; if (G.afterT <= 0) { afterimage(p, p.dashes < 1 ? '#8db3ff' : '#ffffff', .55); G.afterT = .028; } }
    if (Look.trail !== 'none') trailFx(p, dt);
    // first-time tips for new objects
    G.introT -= dt;
    if (G.introT <= 0 && G.t > G.hintAt && G.t > (G.toastUntil || 0)) {
      G.introT = .4;
      for (const it of INTROS) if (!Store.d.seen[it[0]] && introNear(w, it[0])) { toastOnce(it[0], it[1], 3800); break; }
    }
    // learn-to-slide: remember the first slide, and keep reminding near the first low gap until then
    if (p.sliding && !Store.d.opt.slid) { Store.d.opt.slid = true; Store.save(); $('tc').classList.add('learned'); toast('Nice slide', 1200); }
    if (G.idx === 0 && !Store.d.opt.slid && G.t > G.hintAt && p.x / T > 28 && p.x / T < 41 && G.t > (G.slideHintT || 0)) { G.slideHintT = G.t + 5; toast(hintText('slide'), 4200); }
    // hints wait for the act banner to clear, then show the latest one the player has reached
    const hs = HINTS[G.idx];
    if (hs && G.t > G.hintAt) {
      let k = -1;
      for (let i = 0; i < hs.length; i++) if (p.x / T >= hs[i][0]) k = i;
      if (k >= 0 && !G.shown['h' + hs[k][1]]) { for (let i = 0; i <= k; i++) G.shown['h' + hs[i][1]] = 1; toast(hintText(hs[k][1]), 3800); }
    }
  }
  if (w.won) { G.winT += dt; if (G.winT > 1.5) finishLevel(); }
  const t = camTarget(w), k = G.snap ? 1 : 1 - Math.exp(-dt * 6.5), ky = G.snap ? 1 : 1 - Math.exp(-dt * 5);
  G.cam.x += (t.x - G.cam.x) * k; G.cam.y += (t.y - G.cam.y) * ky; G.snap = false;
  updateHud(false);
}
function demoUpdate(dt) {
  const d = G.demo, L = d.L;
  stepEntities(d, dt); d.events.length = 0;
  const span = Math.max(0, L.W * T - vw / scale - 400);
  G.cam.x = vw / 2 / scale + 200 + (Math.sin(G.t * .05) * .5 + .5) * span;
  G.cam.y = (L.start.y + 1) * T - vh / scale * .2;
}

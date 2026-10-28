'use strict';
// Particles and world event effects.
// ---------- effects ----------
function emit(k, x, y, o) { G.parts.push(Object.assign({ k, x, y, vx: 0, vy: 0, g: 0, life: 0, max: .5, s: 2, col: '#fff', a: 0, va: 0, len: 0, grow: 0 }, o)); }
function dust(x, y, n, dir) { for (let i = 0; i < n; i++) emit('dot', x + rand(-5, 5), y - 1, { vx: rand(-45, 45) - dir * 25, vy: -rand(8, 60), g: 120, max: rand(.3, .55), s: rand(1.8, 3.6), col: G.th.hi }); }
function sparks(x, y, n, col, sp) { for (let i = 0; i < n; i++) emit('spark', x, y, { vx: rand(-sp, sp), vy: rand(-sp, sp * .3), g: 420, max: rand(.3, .65), s: rand(2, 3.6), col }); }
function confetti(x, y, n) { const cols = [G.th.accent, '#ffc94a', '#ffffff', '#6fe3ff', '#ff5a8a']; for (let i = 0; i < n; i++) emit('conf', x, y, { vx: rand(-240, 240), vy: -rand(120, 460), g: 520, va: rand(-9, 9), a: rand(0, TAU), max: rand(1.1, 1.9), col: cols[i % cols.length] }); }
function afterimage(p, col, a0) {
  const P = p.vis ? vecPose(p.vis.out) : stickPose(p, G.t);
  emit('ghost', p.x + p.w / 2, p.y + p.h, { max: .3, col, a0, snap: { x: p.x + p.w / 2, y: p.y + p.h, f: p.face || 1, P, sq: 1, st: 0, shadow: false, vx: p.vx, vy: p.vy, t: G.t, band: col } });
}
function burst(e) {
  const bones = [{ len: 11 }, { len: 13 }, { len: 13 }, { len: 15 }, { len: 15 }, { len: 0, head: true }];
  for (const b of bones) emit('bone', e.x + rand(-4, 4), e.y + rand(-10, 6), { vx: e.vx * .4 + rand(-200, 200), vy: -rand(120, 420), g: 1500, va: rand(-14, 14), a: rand(0, TAU), len: b.len, max: 2.2, head: !!b.head });
  emit('ring', e.x, e.y, { s: 6, grow: 40, max: .45, col: G.th.accent });
  sparks(e.x, e.y, 14, G.th.accent, 260);
}
function handleEvents(w) {
  const p = w.p;
  for (const e of w.events) {
    switch (e.t) {
      case 'jump':
        if (e.hyper) {
          Snd.play('hyper'); dust(e.x, e.y, 7, p.face); sparks(e.x, e.y, 8, G.th.accent, 200);
          emit('ring', e.x, e.y, { s: 5, grow: 30, max: .35, col: G.th.accent });
          if (!G.shown.hy) { G.shown.hy = 1; toastOnce('hyper', 'Hyper jump! Dash, then jump before it ends', 3200); }
        } else if (e.slide) {
          Snd.play('sjump'); dust(e.x, e.y, 6, p.face);
          if (!G.shown.sj) { G.shown.sj = 1; toastOnce('sjump', 'Slide jump! Extra speed and distance', 3000); }
        } else { Snd.play('jump'); dust(e.x, e.y, 4, 0); }
        break;
      case 'dash':
        Snd.play('dash');
        for (let i = 0; i < 6; i++) emit('line', e.x - e.dir * rand(2, 16), e.y + rand(-15, 15), { vx: -e.dir * rand(120, 260), len: rand(14, 34), s: 1.8, max: .26, col: '#fff' });
        if (!e.air) dust(e.x, p.y + p.h, 5, e.dir);
        emit('ring', e.x, e.y, { s: 4, grow: 26, max: .28, col: '#fff' });
        if (!REDUCED) G.shake = Math.max(G.shake, .06);
        G.afterT = 0;
        if (!Store.d.seen.hyper && !e.air && Store.d.seen.dashed) setTimeout(() => { if (G.state === 'play') toastOnce('hyper', 'Hyper jump: dash on the ground, then jump', 3600); }, 700);
        if (!Store.d.seen.dashed) { Store.d.seen.dashed = 1; Store.save(); }
        break;
      case 'wjump': Snd.play('wjump'); sparks(e.x, e.y, 7, G.th.hi, 140); break;
      case 'land': dust(e.x, e.y, Math.min(9, 3 + Math.floor(e.s / 180)), 0); if (e.s > 520) Snd.play('land'); break;
      case 'slide': Snd.play('slide'); dust(e.x, e.y, 5, w.p.face); break;
      case 'hurt': Snd.play('hurt'); sparks(e.x, e.y, 6, '#ff6b6b', 200); wpnImpact(e.x, e.y, e.wid, Math.sign(e.kx) || 1); if (!REDUCED) G.shake = Math.max(G.shake, .25); break;
      case 'die': if (G.mode === 'gaunt' && w.deaths < 3) toast((3 - w.deaths) + (w.deaths === 2 ? ' life' : ' lives') + ' left', 1600); Snd.play('die'); if (typeof Mus !== 'undefined') Mus.hit(); burst(e); G.shake = REDUCED ? 0 : .4; break;
      case 'respawn': G.fade = .7; G.snap = true; emit('ring', e.x + PW / 2, e.y + PH / 2, { s: 4, grow: 34, max: .5, col: '#fff' }); break;
      case 'cp': Snd.play('cp'); BG.cp(); sparks(e.x, e.y - 20, 16, G.th.accent, 220); toast('Checkpoint', 1300); break;
      case 'win': Snd.play('win'); confetti(e.x, e.y - 20, 60); break;
      case 'spring': Snd.play('spring'); emit('ring', e.x, e.y + 10, { s: 6, grow: 26, max: .35, col: '#fff' }); break;
      case 'glider': Snd.play('glider'); sparks(e.x, e.y, 12, '#ffffff', 200); if (!G.shown.glider) { G.shown.glider = 1; toast('Hang glider! Hold jump in the air to glide', 3600); } break;
      case 'dart': if (Math.abs(e.x - G.cam.x) < 520) Snd.play('dart'); break;
      case 'crumble': Snd.play('crumble'); sparks(e.x, e.y + 20, 6, '#8b7260', 80); break;
      case 'gem':
        Snd.play('gem'); sparks(e.x, e.y, 18, '#ff8fd0', 260); sparks(e.x, e.y, 8, '#ffffff', 180);
        emit('ring', e.x, e.y, { s: 6, grow: 40, max: .5, col: '#ff8fd0' });
        { const hg = $('hudGems'); hg.classList.remove('pop'); void hg.offsetWidth; hg.classList.add('pop'); }
        updateHud(true);
        toast(e.n >= w.gems.length ? 'All gems found! Now finish the act' : 'Gem ' + e.n + ' of ' + w.gems.length, 1600);
        break;
      case 'coin': Snd.play('coin'); sparks(e.x, e.y, 5, '#ffcf3a', 120); updateHud(true); break;
      case 'trophy': Snd.play('trophy'); confetti(e.x, e.y, 40); emit('ring', e.x, e.y, { s: 8, grow: 60, max: .6, col: '#ffcf3a' }); toast(w.trophyHave ? 'Trophy (already yours)' : 'Secret trophy found!', 2400); updateHud(true); break;
      case 'card': Snd.play('card'); sparks(e.x, e.y, 16, '#b98cff', 220); toast('VIP card! VIP doors are open', 2400); break;
      case 'door': setTimeout(() => Snd.play('door'), 250); break;
      case 'red': if (Math.abs(e.x - w.p.x) < 700) Snd.play('red'); break;
      case 'green': if (Math.abs(e.x - w.p.x) < 700) Snd.play('green'); break;
      case 'zap': Snd.play('zap'); emit('line', (e.x + e.px) / 2, (e.y + e.py) / 2, { len: 10, s: 3, max: .3, col: '#ff3a3a' }); break;
      case 'splash': Snd.play('splash'); for (let i = 0; i < (e.big ? 14 : 8); i++) emit('dot', e.x + rand(-12, 12), e.y, { vx: rand(-90, 90), vy: -rand(80, 260), g: 900, max: rand(.35, .6), s: rand(2, 3.5), col: '#9fd8ff' }); break;
      case 'swim': Snd.play('swim'); for (let i = 0; i < 3; i++) emit('ring', e.x + rand(-6, 6), e.y + rand(-4, 8), { s: 1.5, grow: 5, max: .6, col: '#cfeeff', vy: -40 }); break;
      case 'grab': Snd.play('grab'); dust(e.x, e.y + 2, 3, 0); break;
      case 'climb': Snd.play('climb'); break;
      case 'crystal': Snd.play('crystal'); sparks(e.x, e.y, 10, '#6fe3ff', 200); emit('ring', e.x, e.y, { s: 5, grow: 30, max: .35, col: '#6fe3ff' }); break;
      case 'orb': Snd.play('orb'); sparks(e.x, e.y, 14, '#7dffa6', 240); emit('ring', e.x, e.y, { s: 6, grow: 42, max: .4, col: '#7dffa6' }); if (!REDUCED) G.shake = Math.max(G.shake, .05); break;
      case 'laser': if (Math.abs(e.x - G.cam.x) < 620) Snd.play('laser'); break;
      case 'slam':
        if (Math.abs(e.x - G.cam.x) < 700) { Snd.play('slam'); if (!REDUCED) G.shake = Math.max(G.shake, .22); }
        for (let i = 0; i < 8; i++) emit('dot', e.x + rand(-40, 40), e.y, { vx: rand(-90, 90), vy: -rand(20, 120), g: 300, max: rand(.3, .6), s: rand(2, 4), col: G.th.hi });
        break;
    }
  }
  w.events.length = 0;
}

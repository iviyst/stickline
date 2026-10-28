'use strict';
// Wardrobe screen.
// ---- wardrobe: headbands, trails and hats unlocked by collecting gems ----
const Wardrobe = (() => {
  // [id, name, gems needed]
  const ITEMS = {
    band: [['default', 'Classic', 0], ['#38bdf8', 'Sky', 1], ['#9be564', 'Lime', 4], ['#b388ff', 'Violet', 8], ['#ff6fb5', 'Pink', 13], ['#ffc94a', 'Gold', 19], ['rainbow', 'Prism', 30]],
    trail: [['none', 'None', 0], ['spark', 'Sparks', 3], ['ember', 'Embers', 6], ['bubble', 'Bubbles', 10], ['ghost', 'Echo', 15], ['rainbow', 'Rainbow', 24]],
    hat: [['none', 'None', 0], ['cap', 'Cap', 2], ['cone', 'Party', 5], ['antenna', 'Antenna', 8], ['halo', 'Halo', 12], ['wizard', 'Wizard', 17], ['crown', 'Crown', 28]]
  };
  const KINDS = [['band', 'wBand', 'headband'], ['trail', 'wTrail', 'trail'], ['hat', 'wHat', 'hat']];
  const have = () => Store.gemLife();
  const isOpen = (it) => it[2] <= have();

  function apply() {
    const c = Store.d.cos;
    for (const [k] of KINDS) {
      const it = ITEMS[k].find((x) => x[0] === c[k]);
      if (!it || !isOpen(it)) c[k] = ITEMS[k][0][0];
    }
    Look.band = c.band === 'default' ? null : c.band;
    Look.trail = c.trail;
    Look.hat = c.hat;
    badge();
  }
  const unlockedCount = () => KINDS.reduce((n, [k]) => n + ITEMS[k].filter((it) => it[2] > 0 && isOpen(it)).length, 0);
  function badge() { const d = $('wardDot'); if (d) d.hidden = unlockedCount() <= (Store.d.cos.seen || 0); }

  // ----- panel -----
  function swatch(id) {
    const i = document.createElement('i');
    i.style.background = id === 'default' ? '#e8412e' : id === 'rainbow' ? 'conic-gradient(#ff5a5a,#ffd34a,#6bdc6b,#4cc9f0,#b388ff,#ff5a5a)' : id;
    return i;
  }
  function build() {
    for (const [k, box] of KINDS) {
      const el = $(box); el.textContent = '';
      for (const it of ITEMS[k]) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.dataset.k = k; b.dataset.id = it[0];
        if (k === 'band') b.appendChild(swatch(it[0]));
        b.appendChild(document.createTextNode(it[1]));
        if (!isOpen(it)) {
          b.classList.add('locked');
          const s = document.createElement('small'); s.textContent = '◆ ' + it[2]; b.appendChild(s);
        }
        b.addEventListener('click', () => pick(k, it));
        el.appendChild(b);
      }
    }
    refresh();
    $('wardSub').textContent = '◆ ' + have() + ' gems · new looks unlock as you collect more';
  }
  function refresh() {
    for (const b of document.querySelectorAll('#pWard .chip')) b.classList.toggle('on', Store.d.cos[b.dataset.k] === b.dataset.id);
  }
  function pick(k, it) {
    Snd.init();
    if (!isOpen(it)) { Snd.play('back'); $('wardMsg').textContent = it[1] + ' unlocks at ' + it[2] + ' gems. You have ' + have() + '.'; return; }
    Snd.play('ui'); $('wardMsg').textContent = '';
    Store.d.cos[k] = it[0]; Store.save(); apply(); refresh();
  }

  // ----- live preview: the stickman runs in place so trails and the headband show off -----
  let raf = 0, last = 0, t = 0, trT = 0, th = 'dawn';
  const parts = [], gp = { vx: K.RUN, vy: 0, onGround: true, sliding: false, wallSliding: false, gliding: false, dashT: 0, wlock: 0, face: 1, landT: 0, stretchT: 0, dashes: 1, x: 0, y: -PH, w: PW, h: PH, phase: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (ts - (last || ts)) / 1000)); last = ts; t += dt;
    draw(dt);
  }
  function draw(dt) {
    const cv = $('wardCv'), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'), T_ = THEMES[th];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, T_.sky[0]); g.addColorStop(1, T_.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const gy = h * .82;
    ctx.fillStyle = T_.tile; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = T_.hi; ctx.fillRect(0, gy, w, 2);
    ctx.fillStyle = T_.lo; for (let i = 0; i < 9; i++) ctx.fillRect(((i * 40 - t * 235 * .6) % (w + 40) + w + 40) % (w + 40) - 20, gy + 6, 16, 2);
    const S = h * .52 / 40;
    ctx.save(); ctx.translate(w * .55, gy); ctx.scale(S, S);
    // trail
    gp.phase += gp.vx * dt * .052;
    trT -= dt;
    const k = Store.d.cos.trail;
    if (k !== 'none' && trT <= 0) {
      trT = .035;
      const cx = -2, cy = -22;
      const add = (kind, x, y, o) => parts.push(Object.assign({ k: kind, x, y, vx: -150, vy: 0, g: 0, life: 0, max: .5, s: 2, col: '#fff', a: 0, va: 0, len: 0, grow: 0 }, o));
      if (k === 'spark') add('spark', cx + rnd(-4, 4), cy + rnd(-8, 8), { vx: -150 + rnd(-30, 30), vy: rnd(-30, 30), g: 100, s: rnd(2, 3.6), col: Math.random() < .5 ? '#ffe27a' : '#fff' });
      else if (k === 'rainbow') add('dot', cx - 4, cy, { max: .45, s: 4.2, col: 'hsl(' + Math.floor((t * 300) % 360) + ',95%,62%)' });
      else if (k === 'ember') add('dot', cx + rnd(-4, 4), cy + rnd(-4, 12), { vx: -150 + rnd(-20, 20), vy: -rnd(20, 70), max: .6, s: rnd(2, 3.4), col: Math.random() < .5 ? '#ff9a2e' : '#ffd34a' });
      else if (k === 'bubble') add('ring', cx + rnd(-6, 6), cy + rnd(-10, 10), { s: 2, grow: 7, max: .55, col: '#9fe6ff', vy: -22 });
    }
    updateParts(parts, dt, null);
    drawParts(ctx, parts, T_);
    const P = smoothPose(gp, stickPose(gp, t), t);
    const band = Look.band === 'rainbow' ? 'hsl(' + Math.floor((t * 170) % 360) + ',92%,60%)' : (Look.band || T_.band);
    if (k === 'ghost') for (let i = 2; i >= 1; i--) renderStick(ctx, { x: -i * 13, y: 0, f: 1, P, sq: 1, st: 0, shadow: false, vx: gp.vx, vy: 0, t, th: T_, tint: '#bfeaff', alpha: .34 / i });
    renderStick(ctx, { x: 0, y: 0, f: 1, P, sq: 1, st: 0, shadow: true, vx: gp.vx, vy: 0, t, th: T_, band, hat: Look.hat });
    ctx.restore();
  }
  function vis(on) {
    if (on) {
      parts.length = 0; Store.d.cos.seen = unlockedCount(); Store.save(); badge();
      $('wardMsg').textContent = ''; build();
      if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  const themeKeys = Object.keys(THEMES);
  function init() {
    const cv = $('wardCv');
    if (cv) cv.addEventListener('click', () => { th = themeKeys[(themeKeys.indexOf(th) + 1) % themeKeys.length]; Snd.init(); Snd.play('ui'); });
  }

  // called after every clear: announce looks that the new gems unlocked
  function check(announce) {
    const g = have(), prev = Store.d.cos.n || 0, fresh = [];
    for (const [k, , noun] of KINDS) for (const it of ITEMS[k]) if (it[2] > prev && it[2] <= g) fresh.push(it[1] + ' ' + noun);
    Store.d.cos.n = g; Store.save();
    if (announce && fresh.length) {
      const el = $('winBest');
      el.textContent += ' New look unlocked: ' + (fresh.length > 2 ? fresh.slice(0, 2).join(', ') + ' and ' + (fresh.length - 2) + ' more' : fresh.join(' and ')) + '. Find it in the Wardrobe.';
      setTimeout(() => Snd.play('unlock'), 1100);
    }
    badge();
  }
  return { apply, check, vis, init, ITEMS };
})();

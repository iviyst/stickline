'use strict';
// Store screen.
// ---- store: melee weapons for gems, skins for coins ----
const SKINS = [
  ['none', 'Classic', 0, null],
  ['shadow', 'Shadow', 60, { ink: '#0b0b14', out: '#9a8cff' }],
  ['snow', 'Snow', 60, { ink: '#ffffff', out: '#1b2233' }],
  ['mint', 'Mint', 90, { ink: '#7dffc8', out: '#06281c' }],
  ['lava', 'Lava', 140, { ink: '#ff6a2a', out: '#2a0a00' }],
  ['neon', 'Neon', 180, { ink: '#39e6ff', out: '#2a0040' }],
  ['gold', 'Gold', 240, { ink: '#ffcf3a', out: '#4a2e00' }],
  ['phantom', 'Phantom', 300, { ink: 'rgba(230,245,255,.55)', out: 'rgba(80,120,170,.85)' }],
  ['void', 'Void', 400, { ink: '#000000', out: '#ff3a6b' }]
];
const Shop = (() => {
  let tab = 'wpn', tf = 0, armed = null, raf = 0, last = 0, t = 0, swingT = 0, preview = null, shown = false;
  const owned = (id) => !!Store.d.owned[id];
  // the first store sold 8 weapons with other ids: refund them as gems so nobody loses out, then they can pick again from the 100
  function migrate() {
    let refund = 0; const o = Store.d.owned;
    for (const k in WEAPON_LEGACY_COST) if (o[k]) { refund += WEAPON_LEGACY_COST[k]; delete o[k]; }
    if (!refund) return;
    Store.d.gemSpent = Math.max(0, (Store.d.gemSpent || 0) - refund);
    Store.d.seen.refund = (Store.d.seen.refund || 0) + refund;
    if (!WEAPONS[Store.d.cos.wpn] || !owned(Store.d.cos.wpn)) Store.d.cos.wpn = 'fists';
    Store.save();
  }
  function applyLook() {
    const sk = SKINS.find((s) => s[0] === Store.d.cos.skin);
    Look.skin = sk && sk[3] && owned(sk[0]) ? sk[3] : null;
    Look.wpn = WEAPONS[Store.d.cos.wpn] && owned(Store.d.cos.wpn) ? Store.d.cos.wpn : 'fists';
  }
  const q5 = (v, a, b) => Math.round(clamp((v - a) / (b - a), 0, 1) * 5);
  const sc = (W) => [q5(W.reach, 24, 66), q5(1 / W.cd, 1, 4.2), q5(W.kb, 200, 780)];
  function bars(W) {
    const v = sc(W), row = (n, k) => '<span class="bar"><i style="width:' + (k * 20) + '%"></i></span><small>' + n + '</small>';
    return '<span class="stats3">' + row('reach', v[0]) + row('speed', v[1]) + row('power', v[2]) + '</span>';
  }
  function tierChips() {
    const box = $('shopTiers'); box.textContent = '';
    box.style.display = tab === 'wpn' ? '' : 'none';
    if (tab !== 'wpn') return;
    const mk = (key, label, col, n) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tchip' + (tf === key ? ' on' : ''); b.style.setProperty('--tc', col);
      b.textContent = label + ' ' + n; b.addEventListener('click', () => { Snd.init(); Snd.play('ui'); tf = key; preview = null; armed = null; build(); });
      box.appendChild(b);
    };
    mk('owned', 'Owned', '#ffffff', WEAPON_ORDER.filter(owned).length);
    TIERS.forEach((T_, i) => { const ids = WEAPON_ORDER.filter((id) => WEAPONS[id].tier === i && id !== 'fists'); mk(i, T_.name, T_.col, ids.filter(owned).length + '/' + ids.length); });
  }
  function build() {
    const g = $('shopGrid'); g.textContent = '';
    $('shopSub').textContent = '◆ ' + Store.gemWallet() + ' gems to spend   ·   ● ' + Store.d.coinBank + ' coins';
    for (const b of document.querySelectorAll('#shopTabs .wtab')) b.classList.toggle('on', b.dataset.tab === tab);
    tierChips();
    const items = tab === 'wpn'
      ? WEAPON_ORDER.filter((k) => tf === 'owned' ? owned(k) : WEAPONS[k].tier === tf).map((k) => [k, WEAPONS[k].name, WEAPONS[k].cost, WEAPONS[k]])
      : SKINS;
    for (const it of items) {
      const [id, name, cost] = it, own = owned(id), eq = tab === 'wpn' ? Store.d.cos.wpn === id : Store.d.cos.skin === id;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sitem' + (eq ? ' on' : '') + (own ? '' : ' locked');
      const price = own ? (eq ? 'Equipped' : 'Owned') : (tab === 'wpn' ? '◆ ' : '● ') + cost;
      b.innerHTML = (tab === 'wpn' ? '<canvas class="wic" width="200" height="72"></canvas>' : '') + '<span class="nm"></span><span class="pr"></span>' + (tab === 'wpn' ? '<span class="pw"></span>' + bars(it[3]) : '<span class="sw"></span>');
      b.querySelector('.nm').textContent = name; b.querySelector('.pr').textContent = price;
      if (tab === 'wpn') {
        const W = it[3], T_ = TIERS[W.tier], pw = b.querySelector('.pw');
        pw.textContent = W.power ? W.power + ' power' : (id === 'fists' ? 'No weapon' : T_.name); pw.style.color = W.power ? (wfxInfo(W).c1) : T_.col;
        b.style.setProperty('--tc', T_.col);
        const cv = b.querySelector('.wic'); drawWeaponIcon(cv.getContext('2d'), id, 0, 0, cv.width, cv.height);
      } else { const sw = b.querySelector('.sw'); const c = it[3] || { ink: '#f2f4ff', out: '#141824' }; sw.style.background = c.ink; sw.style.borderColor = c.out; }
      b.addEventListener('click', () => pick(id, name, cost));
      b.addEventListener('focus', () => { preview = id; info(); });
      b.addEventListener('mouseenter', () => { preview = id; info(); });
      g.appendChild(b);
    }
    info();
  }
  // the details of whatever is being previewed
  function info() {
    const box = $('shopInfo'); if (!box) return;
    if (tab !== 'wpn') { box.textContent = ''; return; }
    const id = preview || Store.d.cos.wpn, W = WEAPONS[id] || WEAPONS.fists, T_ = TIERS[W.tier];
    box.innerHTML = '<b class="in"></b><span class="it"></span><span class="ib2"></span>';
    const nm = box.querySelector('.in'); nm.textContent = W.name; nm.style.color = T_.col;
    box.querySelector('.it').textContent = id === 'fists' ? 'Free' : T_.name + ' · ' + W.cls;
    box.querySelector('.ib2').textContent = W.blurb;
  }
  function pick(id, name, cost) {
    Snd.init(); preview = id;
    const isW = tab === 'wpn', msg = $('shopMsg');
    if (owned(id)) {
      if (isW) Store.d.cos.wpn = id; else Store.d.cos.skin = id;
      Store.save(); applyLook(); Snd.play('ui'); msg.textContent = name + ' equipped.'; armed = null; build(); return;
    }
    const have = isW ? Store.gemWallet() : Store.d.coinBank;
    if (have < cost) { Snd.play('back'); msg.textContent = 'You need ' + (cost - have) + (isW ? ' more gems.' : ' more coins.') + (isW ? ' Earn them in acts, the Gauntlet and head-to-head races.' : ' Grab them in acts and the Gauntlet.'); armed = null; return; }
    if (armed !== id) { armed = id; Snd.play('ui'); msg.textContent = 'Tap again to buy ' + name + ' for ' + (isW ? '◆ ' : '● ') + cost + '.'; return; }
    if (isW) Store.d.gemSpent += cost; else Store.d.coinBank -= cost;
    Store.d.owned[id] = 1;
    if (isW) Store.d.cos.wpn = id; else Store.d.cos.skin = id;
    Store.save(); applyLook(); armed = null; Snd.play('buy');
    msg.textContent = name + ' bought and equipped!';
    build();
  }
  // preview: the stickman with the focused item, swinging every so often
  const gp = { vx: 0, vy: 0, onGround: true, sliding: false, wallSliding: false, gliding: false, dashT: 0, wlock: 0, face: 1, landT: 0, stretchT: 0, dashes: 1, x: 0, y: -PH, w: PW, h: PH, phase: 0, atkT: 0 };
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (ts - (last || ts)) / 1000)); last = ts; t += dt;
    const cv = $('shopCv'), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let th = THEMES.night;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const gy = h * .8; ctx.fillStyle = th.tile; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = th.hi; ctx.fillRect(0, gy, w, 2);
    const isW = tab === 'wpn', id = preview || (isW ? Store.d.cos.wpn : Store.d.cos.skin);
    const wpn = isW ? id : Look.wpn;
    const sk = isW ? Look.skin : ((SKINS.find((s) => s[0] === id) || [])[3] || null);
    if (sk) th = Object.assign({}, th, sk);
    swingT -= dt; if (swingT <= 0) { swingT = 1.3; gp.atkT = .2; }
    gp.atkT = Math.max(0, gp.atkT - dt);
    const S = h * .5 / 40;
    ctx.save(); ctx.translate(w * .4, gy); ctx.scale(S, S);
    const P = smoothPose(gp, stickPose(gp, t), t);
    if (gp.atkT > 0) drawSmear(ctx, Object.assign({}, gp, { x: -PW / 2, y: -PH }), wpn, th);
    renderStick(ctx, { x: 0, y: 0, f: 1, P, sq: 1, st: 0, shadow: true, vx: 0, vy: 0, t, th, band: Look.band || th.band, hat: Look.hat, wpn, atk: gp.atkT, hold: gp });
    ctx.restore();
  }
  function vis(on) {
    shown = on;
    if (on) {
      preview = null; armed = null; tf = WEAPONS[Store.d.cos.wpn] ? WEAPONS[Store.d.cos.wpn].tier : 0;
      $('shopMsg').textContent = Store.d.seen.refund ? 'The store has 100 new weapons. Your old ones were refunded: +' + Store.d.seen.refund + ' gems.' : '';
      Store.d.seen.refund = 0; Store.save(); build(); if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function init() {
    for (const b of document.querySelectorAll('#shopTabs .wtab')) b.addEventListener('click', () => { Snd.init(); Snd.play('ui'); tab = b.dataset.tab; preview = null; armed = null; $('shopMsg').textContent = ''; build(); });
    migrate(); applyLook();
    WIMG.cbs.push(() => { if (shown) build(); });
  }
  const profile = () => { migrate(); applyLook(); };      // a different player signed in: re-read their purchases
  return { init, vis, applyLook, build, profile };
})();

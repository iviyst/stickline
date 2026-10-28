'use strict';
// Tips and first-time hints.
// ---------- hints ----------
const HINTS = { 0: [[0, 'move'], [11, 'jump'], [18, 'dash'], [27, 'slide'], [64, 'wall']], 3: [[2, 'glide']], 6: [[0, 'dash'], [38, 'crystalchain']] };
function hintText(k) {
  const d = Input.lastDevice, ms = Store.d.opt.mouse && d === 'mouse';
  const H = {
    move: { keyboard: 'Run with A / D or the arrow keys', mouse: 'Mouse steering: you run toward your cursor', gamepad: 'Run with the left stick or D-pad', touch: 'Press and drag on the left side to run' },
    jump: { keyboard: 'Jump with Space. Hold it for a higher jump', mouse: 'Left click to jump. Hold for a higher jump', gamepad: 'Jump with A. Hold it for a higher jump', touch: 'Touch the right side to jump. Keep holding for more height' },
    dash: { keyboard: 'Dash with Shift or C. You get one per air time', mouse: 'Dash with Shift or the middle mouse button', gamepad: 'Dash with Y, a bumper or a trigger', touch: 'Flick the right stick sideways to dash' },
    slide: { keyboard: 'Slide under low gaps with S or the down arrow', mouse: 'Hold right click to slide under low gaps', gamepad: 'Slide under low gaps with B or X', touch: 'Swipe down on the right side to slide while running' },
    crystalchain: { all: 'Dash, grab the crystal, then dash again' },
    wall: { all: 'Jump at a wall, then press jump again to wall-jump' },
    glide: { all: 'Hold jump in the air to glide on the hang glider' }
  }[k];
  return H.all || H[ms ? 'mouse' : (d === 'mouse' ? 'keyboard' : d)] || H.keyboard;
}
// one-time tips, shown the first time something new comes into view (remembered between sessions)
const INTROS = [
  ['gem', 'Gems hide off the main path. Find all 3 in an act for a star'],
  ['crystal', 'Dash crystals give your dash back in mid-air'],
  ['orb', 'Press jump inside a green orb for a big boost and a fresh dash'],
  ['belt', 'Conveyor belts carry you. Run against them, or ride them'],
  ['ice', 'Ice is slippery: start slowing down early'],
  ['fan', 'Updraft fans lift you. Step in and steer with left and right'],
  ['laser', 'Lasers flicker before they fire. Watch the blink'],
  ['crusher', 'Crushers shake, then slam. Cross when they rise'],
  ['chase', 'The wall behind you is deadly. Keep moving!'],
  ['coin', 'Coins buy skins in the Store'],
  ['water', 'In water, press jump to swim up. Watch your breath bubbles!'],
  ['light', 'Red light: freeze! Anything moving in its beam gets zapped'],
  ['card', 'Grab the VIP card to open VIP doors']
];
function introNear(w, k) {
  const p = w.p, px = p.x + p.w / 2, py = p.y + p.h / 2, R = 560;
  const box = (x0, y0, x1, y1) => x1 > px - R && x0 < px + R && y1 > py - 420 && y0 < py + 420;
  switch (k) {
    case 'gem': return w.gems.some((g) => box(g.x, g.y, g.x, g.y));
    case 'crystal': return w.crystals.some((g) => box(g.x, g.y, g.x, g.y));
    case 'orb': return w.orbs.some((g) => box(g.x, g.y, g.x, g.y));
    case 'belt': return w.belts.some((b) => box(b.x, b.y, b.x + b.w, b.y));
    case 'ice': return w.ices.some((b) => box(b.x, b.y, b.x + b.w, b.y));
    case 'fan': return w.fans.some((f) => box(f.x, f.y, f.x + f.w, f.y + f.h));
    case 'laser': return w.lasers.some((l) => box(l.x0, l.y0, l.x1, l.y1));
    case 'crusher': return w.solids.some((c) => c.k === 'crush' && box(c.x, c.y0, c.x + c.w, c.y0 + c.dist));
    case 'chase': return !!w.chase;
    case 'water': { const L = w.L, x0 = Math.max(0, Math.floor((px - R) / T)), x1 = Math.min(L.W - 1, Math.floor((px + R) / T)), y0 = Math.max(0, Math.floor((py - 400) / T)), y1 = Math.min(L.H - 1, Math.floor((py + 400) / T)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (L.g[y][x] === 'w') return true; return false; }
    case 'light': return w.lights.some((l) => box(l.z0, l.y, l.z1, l.y));
    case 'card': return w.cards.some((k) => box(k.x, k.y, k.x, k.y)) || w.solids.some((s) => s.k === 'door' && box(s.x, s.y, s.x, s.y));
    case 'coin': return w.coins.some((c) => box(c.x, c.y, c.x, c.y));
  }
  return false;
}
function toastOnce(key, msg, ms) {
  if (Store.d.seen[key]) return false;
  Store.d.seen[key] = 1; Store.save(); toast(msg, ms); G.toastUntil = G.t + (ms || 3200) / 1000; return true;
}

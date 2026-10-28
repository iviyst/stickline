'use strict';
// Level DSL + World 1 (acts 1-6).
// ---- level DSL + the six acts ----
// Tile chars: # solid  ^ v < > spikes  ~ flame  { } dart emitter (solid)
function Lvl(name, sub, W, H, theme) {
  const g = Array.from({ length: H }, () => new Array(W).fill('.'));
  const L = { name, sub, W, H, theme, g, ents: [], start: null, world: Lvl.world, par: 0, chase: null };
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; return L; };
  const fill = (x, y, w, h, c = '#') => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); return L; };
  const ent = (o) => { L.ents.push(o); return L; };
  Object.assign(L, {
    set, fill,
    ground: (x0, x1, y) => fill(x0, y, x1 - x0, H - y),
    block: (x, y, w, h) => fill(x, y, w, h),
    spikes: (x, y, n = 1) => fill(x, y, n, 1, '^'),
    cspikes: (x, y, n = 1) => fill(x, y, n, 1, 'v'),
    lspikes: (x, y, n = 1) => fill(x, y, 1, n, '<'),
    rspikes: (x, y, n = 1) => fill(x, y, 1, n, '>'),
    flames: (x, y, n = 1) => fill(x, y, n, 1, '~'),
    emit: (x, y, dir, ph = 1, period = 2.4) => { set(x, y, dir > 0 ? '}' : '{'); return ent({ t: 'emit', x, y, dir, ph, period }); },
    saw: (x, y, r = 15) => ent({ t: 'saw', x, y, r }),
    sawH: (x, y, x2, spd = 90, r = 15) => ent({ t: 'saw', x, y, x2, ax: 'x', spd, r }),
    sawV: (x, y, y2, spd = 90, r = 15) => ent({ t: 'saw', x, y, y2, ax: 'y', spd, r }),
    plat: (x, y, n, x2, spd = 70) => ent({ t: 'plat', x, y, n, x2, ax: 'x', spd }),
    lift: (x, y, n, y2, spd = 70) => ent({ t: 'plat', x, y, n, y2, ax: 'y', spd }),
    fall: (x, y, n) => ent({ t: 'fall', x, y, n }),
    spring: (x, y) => ent({ t: 'spring', x, y }),
    cp: (x, y) => ent({ t: 'cp', x, y }),
    glider: (x, y) => ent({ t: 'glider', x, y }),
    jet: (x, y, ph = 0) => ent({ t: 'jet', x, y, ph }),
    gem: (x, y) => ent({ t: 'gem', x, y }),
    crystal: (x, y) => ent({ t: 'crystal', x, y }),
    orb: (x, y) => ent({ t: 'orb', x, y }),
    laser: (x, y, len, ax = 'h', ph = 0, period = 3, on = .45) => ent({ t: 'laser', x, y, len, ax, ph, period, on }),
    crusher: (x, y, n, drop, ph = 0, rest = 1.6) => ent({ t: 'crusher', x, y, n, drop, ph, rest }),
    belt: (x, y, n, dir = 1) => ent({ t: 'belt', x, y, n, dir }),
    ice: (x, y, n) => ent({ t: 'ice', x, y, n }),
    fan: (x, y, wd, ht) => ent({ t: 'fan', x, y, wd, ht }),
    coin: (x, y) => ent({ t: 'coin', x, y }),
    coins: (x0, x1, y, step = 2) => { for (let x = x0; x <= x1; x += step) ent({ t: 'coin', x, y }); return L; },
    trophy: (x, y) => ent({ t: 'trophy', x, y }),
    card: (x, y) => ent({ t: 'card', x, y }),
    door: (x, y, h = 3) => ent({ t: 'door', x, y, h }),
    light: (x, y, x0, x1, ph = 0, g = 2.4, r = 1.8, y0 = 0, y1 = H) => ent({ t: 'light', x, y, x0, x1, ph, g, r, y0, y1 }),
    water: (x, y, w, h) => fill(x, y, w, h, 'w'),
    fake: (x, y, w, h) => fill(x, y, w, h, '%'),
    chaseWall: (speed, x0 = -6, delay = 1.6) => { L.chase = { speed, x0, delay }; return L; },
    setPar: (sec) => { L.par = sec; return L; },
    start: (x, y) => { L.start = { x, y }; return L; },
    exit: (x, y) => ent({ t: 'exit', x, y })
  });
  return L;
}

const LEVELS = [];
Lvl.world = 1;

// ---------- Act 1 : Rooftop Run ----------
(function () {
  const L = Lvl('Rooftop Run', 'Learn the ropes', 96, 24, 'dawn');
  L.ground(0, 16, 18).ground(18, 45, 18).ground(48, 62, 18).ground(68, 80, 18).ground(80, 96, 8);
  L.start(3, 17).setPar(30);
  L.spikes(24, 17, 2).cp(29, 17);
  L.block(34, 9, 6, 8);                 // low slab: slide under it
  L.spikes(53, 17, 3);
  L.fall(62, 18, 6);                    // crumbling bridge
  L.cp(70, 17);
  L.block(75, 8, 2, 8);                 // wall-jump shaft (3 wide)
  L.exit(92, 7);
  L.gem(25, 14).gem(36, 8).gem(78, 4);               // arc over the spikes, top of the slab, overshoot the shaft
  LEVELS.push(L);
})();

// ---------- Act 2 : Sawmill ----------
(function () {
  const L = Lvl('Sawmill', 'Mind the blades', 110, 24, 'mill');
  L.ground(0, 24, 18).ground(27, 40, 18).ground(58, 75, 18).ground(78, 110, 8);
  L.start(3, 17).setPar(30);
  L.saw(12, 17).sawH(16, 17, 20).cp(22, 17);
  L.sawV(25, 14, 18);                   // blade crossing the first gap
  L.cp(28, 17).sawH(31, 17, 36);
  L.plat(41, 18, 3, 44).plat(50, 18, 3, 53);
  L.sawH(42, 13, 53, 80);
  L.cp(60, 17).spikes(63, 17, 2).saw(67, 17);
  L.lift(75, 18, 3, 8);
  L.saw(74, 13).saw(74, 9);
  L.cp(80, 7).sawH(83, 7, 87).cp(90, 7).spikes(93, 7, 2).sawH(97, 7, 101);
  L.exit(106, 7);
  L.gem(16, 13).gem(25, 13);                        // over the saws, over the gap blade
  L.block(46, 22, 5, 2).spring(49, 21).gem(47, 21);   // an island in the pit: dive for it, spring back up
  LEVELS.push(L);
})();

// ---------- Act 3 : Ember Works ----------
(function () {
  const L = Lvl('Ember Works', 'Feel the heat', 100, 24, 'forge');
  L.ground(0, 42, 18).ground(52, 60, 18).ground(78, 100, 13);
  L.start(3, 17).setPar(30);
  L.flames(11, 17, 2).cp(15, 17);
  L.jet(21, 17, 0).jet(26, 17, 1.45).jet(31, 17, 0.7).cp(37, 17);
  L.fall(42, 18, 3).fall(47, 18, 3);
  L.cp(54, 17);
  L.block(63, 18, 3, 1).block(69, 18, 3, 1).block(74, 18, 3, 1);
  L.spring(76, 17);
  L.emit(78, 17, -1, 1.2, 2.4).emit(78, 15, -1, 2.6, 3.6);
  L.cp(80, 12).jet(84, 12, 0).jet(89, 12, 1.45).flames(93, 12, 2);
  L.exit(97, 12);
  L.gem(26, 13).gem(75, 11).gem(86, 9);
  LEVELS.push(L);
})();

// ---------- Act 4 : Skybridge ----------
(function () {
  const L = Lvl('Skybridge', 'Take to the air', 140, 30, 'sky');
  L.ground(0, 16, 12).ground(50, 66, 19).ground(66, 76, 14).ground(102, 114, 14).ground(132, 140, 19);
  L.start(3, 11).setPar(55);
  L.cp(10, 11).glider(13, 11);
  L.saw(26, 15).saw(36, 18).sawV(44, 14, 19);
  L.cp(52, 18).spring(63, 18);
  L.plat(78, 14, 3, 82).plat(87, 14, 3, 91).plat(96, 14, 3, 99);
  L.sawH(80, 11, 98, 80);
  L.cp(104, 13).glider(111, 13);
  L.saw(121, 16).saw(127, 17);
  L.exit(137, 18);
  L.gem(27, 12).gem(40, 13).gem(116, 10);
  LEVELS.push(L);
})();

// ---------- Act 5 : Crystal Shaft ----------
(function () {
  const L = Lvl('Crystal Shaft', 'Climb, climb, climb', 48, 68, 'crystal');
  L.ground(0, 48, 64);
  L.start(3, 63).setPar(45);
  L.block(10, 44, 2, 18).block(15, 44, 2, 20);      // shaft 1 (interior x12..14)
  L.lspikes(14, 52, 2).rspikes(12, 57, 2);
  L.block(17, 44, 31, 2).cp(22, 43);
  L.block(33, 26, 2, 16).block(38, 26, 10, 18);     // shaft 2 (interior x35..37)
  L.emit(34, 36, 1, 0.8, 2.6).emit(34, 31, 1, 2.0, 2.6);
  L.block(12, 26, 23, 2).cp(30, 25);
  L.block(0, 8, 12, 18).block(15, 8, 2, 16);        // shaft 3 (interior x12..14)
  L.sawH(12, 18, 14, 60).sawH(12, 13, 14, 60);
  L.block(15, 8, 8, 2).fall(23, 8, 6).block(29, 8, 16, 2);
  L.cp(18, 7).exit(42, 7);
  L.gem(13, 55).gem(36, 33).gem(4, 7);
  LEVELS.push(L);
})();

// ---------- Act 6 : Citadel ----------
(function () {
  const L = Lvl('Citadel', 'Everything at once', 150, 30, 'night');
  L.ground(0, 22, 18).ground(25, 70, 18).ground(96, 115, 18);
  L.ground(115, 128, 6).ground(133, 150, 6);
  L.start(3, 17).setPar(55);
  L.sawH(8, 17, 12).spikes(16, 17, 2).cp(20, 17);
  L.fall(22, 18, 3);
  L.jet(28, 17, 0).jet(33, 17, 1.45).sawV(38, 13, 17).flames(41, 17, 2).cp(43, 17);
  L.block(46, 9, 10, 8);                           // slide tunnel x46..55
  L.spikes(60, 17, 2);
  L.plat(72, 18, 3, 76).plat(80, 18, 3, 84).plat(89, 18, 3, 92);
  L.sawH(74, 13, 90, 80);
  L.cp(98, 17);
  L.block(110, 6, 2, 10).block(115, 6, 2, 12);     // shaft x112..114
  L.rspikes(112, 11, 2).lspikes(114, 8, 2);
  L.emit(111, 12, 1, 1, 2.6);
  L.spikes(120, 5, 2).sawH(124, 5, 126, 70);
  L.fall(128, 6, 5).cp(135, 5);
  L.jet(138, 5, 0).jet(142, 5, 1.45);
  L.exit(147, 5);
  L.gem(50, 8).gem(113, 3).gem(140, 2);
  LEVELS.push(L);
})();

function validateLevel(L) {
  const errs = [];
  if (!L.start) errs.push('no start');
  if (!L.ents.some(e => e.t === 'exit')) errs.push('no exit');
  const solid = (x, y) => x < 0 || x >= L.W ? true : y < 0 || y >= L.H ? false : '#{}'.includes(L.g[y][x]);
  const chk = (e, what) => {
    if (L.g[e.y][e.x] !== '.') errs.push(what + ' inside tile at ' + e.x + ',' + e.y + ' (' + L.g[e.y][e.x] + ')');
    if (!solid(e.x, e.y + 1)) errs.push(what + ' not standing on solid at ' + e.x + ',' + e.y);
  };
  if (L.start) chk(L.start, 'start');
  for (const e of L.ents) if (['cp', 'exit', 'spring', 'jet'].includes(e.t)) chk(e, e.t);
  return errs;
}

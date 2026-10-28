'use strict';
// Gauntlet / race course generator.
// ---- Gauntlet: an endless-feeling run stitched together from hazard chunks, seeded so a day's run is the same for everyone ----
const GAUNT_THEMES = ['dawn', 'mill', 'forge', 'sky', 'crystal', 'night', 'prism', 'frost', 'gear', 'grid', 'storm', 'inferno'];
function gauntRng(seed) {
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// chunk templates: (L, x, f, d, r) → [new x, new floor row]. Every chunk starts and ends on solid ground at row f.
// min = the difficulty (0..1) from which a template may appear.
const CHUNKS = {
  spikes: { min: 0, fn(L, x, f, d, r) {
    L.ground(x, x + 13, f);
    const n1 = 1 + Math.floor(r() * (1.5 + d)), n2 = 1 + Math.floor(r() * (1.5 + d));
    L.spikes(x + 4, f - 1, Math.min(3, n1));
    if (d > .25) L.spikes(x + 9, f - 1, Math.min(3, n2));
    return [x + 13, f];
  } },
  gap: { min: 0, fn(L, x, f, d, r) {
    let f2 = f + [0, 0, 1, -1, 2][Math.floor(r() * 5)]; f2 = clamp(f2, 12, 24);
    const g = Math.min(f2 < f ? 3 : 4, 2 + Math.floor(r() * (1.6 + d * 1.5)));
    L.ground(x, x + 3, f).ground(x + 3 + g, x + 6 + g, f2);
    return [x + 6 + g, f2];
  } },
  fallBridge: { min: 0, fn(L, x, f, d, r) {
    const n = 5 + Math.floor(r() * 3);
    L.ground(x, x + 3, f).fall(x + 3, f, n).ground(x + 3 + n, x + 6 + n, f);
    return [x + 6 + n, f];
  } },
  slit: { min: 0, fn(L, x, f, d, r) {
    const n = 4 + Math.floor(r() * (2 + d * 3));
    L.ground(x, x + n + 7, f).fill(x + 4, 0, n, f - 1);
    if (d > .5) L.spikes(x + n + 5, f - 1, 1);
    return [x + n + 7, f];
  } },
  drop: { min: 0, fn(L, x, f, d, r) {
    const f2 = Math.min(24, f + 3 + Math.floor(r() * 3));
    L.ground(x, x + 4, f).ground(x + 4, x + 12, f2);
    if (d > .3) L.spikes(x + 8, f2 - 1, 1 + (d > .7 ? 1 : 0));
    return [x + 12, f2];
  } },
  shaft: { min: .1, fn(L, x, f, d, r) {
    const rise = 4 + Math.floor(r() * 3);
    if (f - rise < 10) return CHUNKS.drop.fn(L, x, f, d, r);
    const f2 = f - rise;
    L.ground(x, x + 8, f).fill(x + 3, f2 - 3, 2, rise).ground(x + 8, x + 13, f2);
    return [x + 13, f2];
  } },
  belt: { min: .1, fn(L, x, f, d, r) {
    const dir = r() < .6 ? -1 : 1;
    L.ground(x, x + 13, f).belt(x + 1, f, 11, dir).spikes(x + 6, f - 1, dir < 0 ? 2 : 3);
    return [x + 13, f];
  } },
  sawRun: { min: .1, fn(L, x, f, d, r) {
    L.ground(x, x + 13, f).sawH(x + 3, f - 1, x + 9, Math.round(80 + 60 * d));
    return [x + 13, f];
  } },
  sawPit: { min: .15, fn(L, x, f, d, r) {
    L.ground(x, x + 3, f).ground(x + 6, x + 9, f).sawV(x + 4, f - 4, f + 1, Math.round(70 + 50 * d));
    return [x + 9, f];
  } },
  ice: { min: .2, fn(L, x, f, d, r) {
    L.ground(x, x + 11, f).ice(x, f, 11).spikes(x + 5, f - 1, 2).ground(x + 14, x + 17, f);
    return [x + 17, f];
  } },
  plat: { min: .2, fn(L, x, f, d, r) {
    L.ground(x, x + 3, f).plat(x + 3, f, 3, x + 9, Math.round(70 + 30 * d)).ground(x + 12, x + 15, f);
    return [x + 15, f];
  } },
  crushers: { min: .25, fn(L, x, f, d, r) {
    const ph = r() * 3;
    L.ground(x, x + 17, f);
    for (let i = 0; i < 3; i++) { const cx = x + 3 + i * 5; L.fill(cx, 0, 2, f - 4).crusher(cx, f - 4, 2, 3, +((ph + i * 1.1) % 3.2).toFixed(2)); }
    return [x + 17, f];
  } },
  dashGap: { min: .3, fn(L, x, f, d, r) {
    const g = 6 + (d > .7 && r() < .5 ? 1 : 0);
    L.ground(x, x + 4, f).ground(x + 4 + g, x + 8 + g, f);
    return [x + 8 + g, f];
  } },
  lasers: { min: .3, fn(L, x, f, d, r) {
    const ph = r() * 3;
    L.ground(x, x + 15, f);
    for (let i = 0; i < 2; i++) { const gx = x + 4 + i * 6; L.fill(gx, 0, 1, f - 6).laser(gx, f - 7, 7, 'v', +((ph + i * 1.2) % 3).toFixed(2), 3, .45); }
    return [x + 15, f];
  } },
  orbPit: { min: .35, fn(L, x, f, d, r) {
    L.ground(x, x + 3, f).orb(x + 7, f - 3).ground(x + 11, x + 14, f);
    return [x + 14, f];
  } },
  fan: { min: .4, fn(L, x, f, d, r) {
    if (f - 7 < 10) return CHUNKS.drop.fn(L, x, f, d, r);
    L.ground(x, x + 10, f).fan(x + 6, f - 11, 3, 11).ground(x + 10, x + 15, f - 7);
    return [x + 15, f - 7];
  } },
  crystalChain: { min: .55, fn(L, x, f, d, r) {
    L.ground(x, x + 3, f).crystal(x + 9, f - 3).ground(x + 15, x + 18, f);
    return [x + 18, f];
  } }
};

function makeGauntlet(seed, opt) {
  opt = opt || {};
  const r = gauntRng(seed), N = opt.chunks || 60, H = 30;
  const theme = opt.theme || GAUNT_THEMES[Math.floor(r() * GAUNT_THEMES.length)];
  const L = Lvl(opt.race ? 'Race' : 'Gauntlet', 'How far can you go?', N * 22 + 40, H, theme);
  L.world = 0; L.gaunt = true; L.seed = seed;
  let x = 0, f = 20;
  L.ground(0, 9, f).start(3, f - 1);
  x = 9;
  const names = Object.keys(CHUNKS);
  let prev = '';
  L.marks = [];
  for (let i = 0; i < N; i++) {
    const d = opt.d != null ? opt.d : Math.min(opt.dmax || 1, i / (opt.ramp || 28));
    const pool = opt.only || names.filter((n) => CHUNKS[n].min <= d + 1e-9 && n !== prev);
    const name = pool[Math.floor(r() * pool.length)];
    L.cp(x + 1, f - 1);
    L.ground(x, x + 2, f);        // every chunk starts with a short landing strip
    if (!opt.noCoins) L.coin(x, f - 2);
    L.marks.push({ x: x + 1, i, name });
    [x, f] = CHUNKS[name].fn(L, x + 2, f, d, r);
    prev = name;
  }
  L.ground(x, x + 10, f).exit(x + 7, f - 1);
  x += 10;
  // trim the grid to the length actually used
  L.W = x; for (const row of L.g) row.length = x;
  if (!opt.noChase) { L.chaseWall(120, -10, 3); L.chase.ramp = .11; L.chase.max = 205; }
  return L;
}

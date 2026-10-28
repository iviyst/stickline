'use strict';
// Canvas, global game state, small helpers.
// ---- game flow: UI, camera, effects, main loop ----
const cv = $('cv'), ctx = cv.getContext('2d');
const G = { state: 'menu', idx: 0, w: null, demo: null, cam: { x: 0, y: 0 }, parts: [], t: 0, shake: 0, fade: 0, winT: 0, acc: 0, pendJump: false, pendDash: false, pendDashDir: 0, afterT: 0, trailT: 0, world: 1, rec: null, recN: 0, gh: null, gp: null, introT: 0, shown: {}, snap: true, th: THEMES.dawn, next: 0, touchOn: false, dustT: 0, last: 0 };
let vw = 1, vh = 1, dpr = 1, scale = 1, cvLeft = 0;
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const rand = (a, b) => a + Math.random() * (b - a);

'use strict';
// Shared constants and tiny helpers (used by the simulation, the renderer and the tests).
// ---- shared constants + helpers (browser + headless test) ----
const T = 32;              // tile size in world px
const DT = 1 / 120;        // fixed simulation step
const PW = 18, PH = 38, PSH = 18;   // player width, standing height, sliding height
const K = {
  GRAV: 1900, MAXFALL: 900,
  GRAV_UP: 1750, GRAV_DN: 2350, CUT: 3.5, HANG: .6, HANG_V: 110,
  RUN: 235, ACC_G: 2600, ACC_A: 1500, FRIC_G: 2400, DRAG_A: 260,
  JUMP: 625, COYOTE: 0.12, BUFFER: 0.15,
  WSLIDE: 105, WJY: 600, WJ_AWAY: 300, WJ_NEUTRAL: 235, WJ_CLIMB: 165, WLOCK: 0.11, WCOYOTE: 0.12,
  SLIDE_V: 340, SLIDE_FRIC: 340, CRAWL: 110, SLIDE_JUMP: 400,
  DASH_V: 560, DASH_T: .15, DASH_END: 340, HYPER_V: 470, HYPER_Y: .86, OVER_G: 700, OVER_A: 170, ORB: 700,
  BELT: 95, FAN_UP: 4700, FAN_MAXUP: 330, ICE_ACC: 560, ICE_FRIC: 255,
  GLIDE_FALL: 70, GLIDE_V: 270, GLIDE_TIME: 7,
  SPRING: 880,
  AIR: 5, SWIM_SINK: 75, SWIM_UP: 120, STROKE: 300, SWIM_RUN: .62
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const ovl = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const lerp = (a, b, t) => a + (b - a) * t;

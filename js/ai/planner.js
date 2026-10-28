'use strict';
// Route planner for the CPU racers.
//
// A bot never "replays a recording": it is a real racer in its own copy of the course (see bot.js) and is driven by controller inputs, so every trap,
// pit and laser can hurt it exactly like it hurts you. This file finds those inputs. It runs a small Go-Explore search over the real simulation
// (checkpoint to checkpoint): states are remembered in an archive, random short input "segments" are tried from the most promising ones, and the
// fastest way to each goal is kept. The result is a list of segments the bot can play back frame by frame, and the search can be started again
// from any state, which is how a bot recovers after it was knocked back, fumbled a jump or died.
//
// segment = { n: frames, x: run direction (-1, 0, 1), d: 1 while holding down/slide, ev: [[frame, 0 jump | 1 dash, seconds the jump is held], ...] }

const PLAN_NEUTRAL = Object.freeze({ x: 0, jump: false, down: false, jumpEdge: false, dashEdge: false, dashDir: 0 });
function routeClone(w) { const { L, ...rest } = w; const c = structuredClone(rest); c.L = L; return c; }

// turns segments into one input per frame (the search and the live bot use this very same code, so a plan always plays back exactly as found)
class SegPlayer {
  constructor() { this.seg = null; this.i = 0; this.held = 0; this.c = { x: 0, jump: false, down: false, jumpEdge: false, dashEdge: false, dashDir: 0 }; }
  load(seg) { this.seg = seg; this.i = 0; this.held = 0; }
  get done() { return !this.seg || this.i >= this.seg.n; }
  next() {
    const s = this.seg, c = this.c; let je = false, de = false;
    for (const e of s.ev) if (e[0] === this.i) { if (e[1] === 0) { je = true; this.held = e[2]; } else de = true; }
    c.x = s.x; c.down = !!s.d; c.jumpEdge = je; c.dashEdge = de; c.jump = this.held > 0;
    this.held -= DT; this.i++;
    return c;
  }
}

class RoutePlanner {
  // opt: { tries: candidate routes compared per goal (more = faster route, more work), salt: makes every bot search differently }
  constructor(L, seed, opt) {
    opt = opt || {};
    this.L = L; this.tries = opt.tries || 2;
    this.rnd = gauntRng(((seed | 0) ^ 0x5bd1e995) + Math.imul(opt.salt | 0, 0x9e3779b1));
    const cps = L.ents.filter((e) => e.t === 'cp'), ex = L.ents.find((e) => e.t === 'exit');
    this.goals = cps.map((e, i) => ({ x: (e.x + .5) * T, y: e.y * T, done: (w) => w.cpIndex >= i })).concat([{ x: (ex.x + .5) * T, y: ex.y * T, done: (w) => w.won }]);
    this.timeDep = L.ents.some((e) => ['laser', 'crusher', 'jet', 'emit', 'plat', 'saw', 'light'].includes(e.t));
    this.sp = new SegPlayer();
    this.state = 'idle'; this.segs = []; this.queued = 0; this.epoch = 0;
    this.cur = null; this.curNode = null; this.emitted = null; this.gi = 0;
    this.archive = null; this.cells = null; this.cands = []; this.iters = 0;
  }
  get progress() { return this.goals.length ? Math.min(1, this.gi / this.goals.length) : 1; }
  get done() { return this.state === 'done'; }
  get failed() { return this.state === 'failed'; }
  get searching() { return this.state === 'search'; }
  // start planning from `world` (a clone that is allowed to be consumed): everything planned before is forgotten
  begin(world) {
    this.epoch++; this.segs = []; this.queued = 0;
    this.cur = world; this.curNode = null; this.emitted = null; this.cands = [];
    this.gi = Math.max(0, world.cpIndex + 1);
    if (world.won) { this.state = 'done'; return; }
    this.state = 'search'; this._restart();
  }
  keyOf(w) {
    const p = w.p;
    let k = (p.x / 16 | 0) + ',' + (p.y / 16 | 0) + ',' + (p.onGround ? 1 : 0) + (p.wallSliding ? 'w' : '') + (p.sliding ? 's' : '') + (p.dashes > 0 ? 'd' : '') + (p.hang ? 'h' : '') + (p.swim ? 'q' + (p.air | 0) : '');
    if (this.timeDep) k += ',' + ((w.t % 3) / .5 | 0);
    if (!p.onGround && !p.wallSliding) k += ',' + (p.vy / 160 | 0) + ',' + (p.vx / 160 | 0);
    return k;
  }
  score(w) { const g = this.goals[this.gi]; return -(Math.abs(w.p.x - g.x) + Math.abs(w.p.y - g.y) * 1.2); }
  _restart() {
    this.archive = new Map(); const c = routeClone(this.cur);
    this.archive.set(this.keyOf(c), { w: c, v: 0, s: this.score(c), node: this.curNode });
    this.cells = [...this.archive.keys()]; this.iters = 0;
  }
  // one random segment on world w: returns 'dead' | 'goal' | 'ok'  (seg.n is cut short at the frame the goal was reached)
  _run(w, seg) {
    const sp = this.sp, goal = this.goals[this.gi]; sp.load(seg);
    for (let i = 0; i < seg.n; i++) {
      stepWorld(w, sp.next(), DT); w.events.length = 0;
      if (w.dead) return 'dead';
      if (goal.done(w)) { seg.n = i + 1; return 'goal'; }
    }
    return 'ok';
  }
  _gen(x0) {
    const rnd = this.rnd, n = Math.round((.1 + rnd() * .6) / DT), ev = [];
    if (rnd() < .5) ev.push([0, 0, rnd() < .3 ? .5 : rnd() * .45]);
    if (rnd() < .3) ev.push([(rnd() * n) | 0, rnd() < .5 ? 1 : 0, rnd() * .45]);
    const d = rnd() < .1 ? 1 : 0;
    const x = rnd() < .15 ? (rnd() < .5 ? 1 : -1) : x0;
    return { n: n + 10, x, d, ev };
  }
  _take(c) {                       // the chosen way to the current goal becomes part of the plan
    const out = [];
    for (let nd = c.node; nd && nd !== this.emitted; nd = nd.prev) out.push(nd.seg);
    for (let i = out.length - 1; i >= 0; i--) { this.segs.push(out[i]); this.queued += out[i].n; }
    this.cur = c.w; this.curNode = c.node; this.emitted = c.node; this.cands = [];
    this.gi++;
    if (this.gi >= this.goals.length) { this.state = 'done'; return; }
    this._restart();
  }
  // one search step
  iterate() {
    const rnd = this.rnd, archive = this.archive, cells = this.cells;
    this.iters++;
    let cell = null;
    if (rnd() < .45) { let bs = -1e9; for (let i = 0; i < 20; i++) { const c = archive.get(cells[(rnd() * cells.length) | 0]); if (c.s > bs) { bs = c.s; cell = c; } } }
    else { let bv = 1e9; for (let i = 0; i < 20; i++) { const c = archive.get(cells[(rnd() * cells.length) | 0]); if (c.v < bv) { bv = c.v; cell = c; } } }
    cell.v++;
    const w = routeClone(cell.w);
    let node = cell.node, x = rnd() < .75 ? 1 : (rnd() < .5 ? -1 : 0);
    const segs = 1 + ((rnd() * 4) | 0);
    for (let s = 0; s < segs; s++) {
      const seg = this._gen(x), r = this._run(w, seg);
      if (r === 'dead') break;
      node = { prev: node, seg };
      if (r === 'goal') {                                    // reached it: keep the fastest of a few tries, then aim for the next goal
        const nz = { n: 2, x: 0, d: 0, ev: [] };
        this.sp.load(nz); for (let k = 0; k < 2; k++) { stepWorld(w, this.sp.next(), DT); w.events.length = 0; }
        node = { prev: node, seg: nz };
        this.cands.push({ w, node });
        if (this.cands.length < this.tries && this.iters < 4000) { this._restart(); return; }
        this._take(this.cands.reduce((a, b) => (b.w.t < a.w.t ? b : a)));
        return;
      }
      x = seg.x;
      const p = w.p;
      if (p.onGround || p.wallSliding || p.hang || rnd() < .18) { const k = this.keyOf(w); if (!archive.has(k)) { archive.set(k, { w: routeClone(w), v: 0, s: this.score(w), node }); cells.push(k); } }
    }
    if (this.iters > 6000 && this.cands.length) this._take(this.cands.reduce((a, b) => (b.w.t < a.w.t ? b : a)));
    else if (this.iters > 9000) this.state = 'failed';
  }
  // search for up to `ms` milliseconds
  work(ms) {
    const t0 = performance.now();
    while (this.state === 'search') { this.iterate(); if (performance.now() - t0 >= ms) break; }
  }
  shift() { const s = this.segs.shift(); if (s) this.queued -= s.n; return s || null; }
}

'use strict';
// A CPU racer. It lives in its own copy of the course, stepped in lock-step with yours, and is steered with ordinary controller inputs, so it
// obeys every rule you do: spikes, saws, lasers, crushers, falling floors and pits kill it and it respawns at its last checkpoint.
// Its inputs come from a RoutePlanner (planner.js). Whenever the bot is knocked off its plan (hit, fumble, death) it stands still while a new
// plan is searched from the exact state it will be in, then carries on.
const BOT_LEVELS = {
  easy:   { name: 'Easy',   fumble: .085, delay: [.9, 1.8],  tries: 1, aggro: .6,  wpn: ['w007', 'w031', 'w001'] },
  normal: { name: 'Normal', fumble: .03,  delay: [.3, .8],   tries: 2, aggro: 1,   wpn: ['w002', 'w017', 'w011'] },
  hard:   { name: 'Hard',   fumble: .008, delay: [0, .25],   tries: 3, aggro: 1.5, wpn: ['w052', 'w046', 'w004'] }
};
const BOT_LOOKAHEAD = 600;        // frames of plan to keep ready ahead of the bot (5 s)
const BOT_LEAD = 96;              // frames a bot stands still after being derailed, before its new plan starts (grows if the search is slow)

class Bot {
  // opt: { level: 'easy' | 'normal' | 'hard', seed, slot, name, wpn }
  constructor(L, opt) {
    const lv = BOT_LEVELS[opt.level] || BOT_LEVELS.normal;
    this.L = L; this.level = BOT_LEVELS[opt.level] ? opt.level : 'normal'; this.cfg = lv; this.slot = opt.slot | 0; this.name = opt.name || 'CPU';
    this.rnd = gauntRng(((opt.seed | 0) ^ 0x2545f491) + Math.imul(this.slot + 1, 0x85ebca6b));
    this.wpn = opt.wpn || lv.wpn[Math.floor(this.rnd() * lv.wpn.length)];
    this.w = makeWorld(L);
    this.planner = new RoutePlanner(L, opt.seed, { tries: lv.tries, salt: this.slot + 1 });
    this.sp = new SegPlayer();
    this.idle = 0; this.lead = BOT_LEAD; this.dirty = false; this.deadSeen = false; this.stuck = 0; this.fin = false; this.finT = 0; this.replans = 0; this.fumbles = 0;
    this.sp.load({ n: 0, x: 0, d: 0, ev: [] });
    // the opening plan starts after a reaction delay (easier bots are slower off the line)
    const d0 = Math.round((lv.delay[0] + this.rnd() * (lv.delay[1] - lv.delay[0])) / DT);
    const w0 = routeClone(this.w);
    for (let i = 0; i < d0; i++) { stepWorld(w0, PLAN_NEUTRAL, DT); w0.events.length = 0; }
    this.idle = d0; this.planner.begin(w0);
  }
  get p() { return this.w.p; }
  // enough of the opening plan exists for the race to start
  get ready() { return this.planner.queued >= 360 || this.planner.done || this.planner.failed; }
  get progress() { return this.planner.progress; }
  // does the planner want CPU time? (it plans ahead of the bot, never further than the lookahead)
  get hungry() { return this.planner.searching && this.planner.queued < BOT_LOOKAHEAD; }
  work(ms) { if (this.hungry) this.planner.work(ms); }

  // knocked back by a weapon: the plan is void
  hit(kx, ky, stun, wid) {
    if (this.w.dead || this.w.won) return false;
    applyHit(this.w, kx, ky, stun, wid);
    this.dirty = true;
    return true;
  }
  // stand still, work out where the bot will be once it has settled, and plan from there.
  // Call it before the bot's step is taken: the snapshot is the state at the start of this step, and this step counts as the first idle frame.
  replan(why) {
    this.replans++;
    const snap = routeClone(this.w);
    let n = 0, ok = false;
    while (n < 720) {
      stepWorld(snap, PLAN_NEUTRAL, DT); snap.events.length = 0; n++;
      if (n >= this.lead && !snap.dead && snap.p.stunT <= 0 && snap.p.onGround) { ok = true; break; }
    }
    this.sp.load({ n: 0, x: 0, d: 0, ev: [] });
    if (!ok) {                                             // never settles (should not happen): wait, and after a second failure reset the bot
      this.planner.segs = []; this.planner.queued = 0; this.planner.state = 'idle';
      this.idle = 30;
      if (++this.stuck >= 2) { this.stuck = 0; kill(this.w, 'stuck'); }
      return;
    }
    this.stuck = 0;
    this.idle = n; this.planner.begin(snap);
  }
  // one fixed step
  step() {
    const w = this.w;
    if (w.won) { if (!this.fin) { this.fin = true; this.finT = w.t; } return; }
    if (this.dirty) { this.dirty = false; this.replan('hit'); }
    else if (w.dead) { if (!this.deadSeen) { this.deadSeen = true; this.replan('death'); } }
    else this.deadSeen = false;
    stepWorld(w, this.input(), DT);
  }
  input() {
    if (this.idle > 0) {
      this.idle--;
      if (this.idle === 0 && !this.planner.segs.length && !this.planner.done && !this.w.dead) { this.lead = Math.min(480, Math.round(this.lead * 1.6)); this.replan('late'); this.idle--; }   // the search took longer than the pause
      return PLAN_NEUTRAL;
    }
    if (this.sp.done) {
      const s = this.planner.shift();
      if (!s) {
        if (this.w.won || this.w.dead) return PLAN_NEUTRAL;
        if (this.planner.failed) { kill(this.w, 'lost'); return PLAN_NEUTRAL; }
        this.replan('starved'); this.idle--; return PLAN_NEUTRAL;
      }
      this.sp.load(s);
      this.lead = Math.max(BOT_LEAD, Math.round(this.lead * .85));
    }
    const c = this.sp.next();
    if ((c.jumpEdge || c.dashEdge) && this.rnd() < this.cfg.fumble) { this.fumbles++; this.replan('fumble'); this.idle--; return PLAN_NEUTRAL; }   // missed the timing
    return c;
  }
}

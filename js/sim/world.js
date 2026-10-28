'use strict';
// World construction, spawning, respawning, death.
function makeWorld(L) {
  const w = {
    L, t: 0, events: [], deaths: 0, dead: false, deadT: 0, won: false, winT: 0,
    solids: [], saws: [], jets: [], emits: [], darts: [], springs: [], cps: [], picks: [],
    gems: [], crystals: [], orbs: [], lasers: [], belts: [], ices: [], fans: [], chase: null, gemCount: 0, coins: [], coinCount: 0, cards: [], hasCard: false, lights: [], trophy: null,
    exit: null, p: null, respawn: null, cpIndex: -1
  };
  if (L.chase) w.chase = { x: L.chase.x0 * T, x0: L.chase.x0 * T, spd: L.chase.speed, delay: L.chase.delay, d0: L.chase.delay, ramp: L.chase.ramp || 0, max: L.chase.max || 1e9 };
  for (const e of L.ents) {
    switch (e.t) {
      case 'saw': {
        const s = { x: (e.x + .5) * T, y: (e.y + .5) * T, r: e.r || 15, a: Math.random() * 6, ax: null, b0: 0, b1: 0, dir: 1, spd: e.spd || 90 };
        if (e.ax === 'x') { s.ax = 'x'; s.b0 = (e.x + .5) * T; s.b1 = (e.x2 + .5) * T; }
        if (e.ax === 'y') { s.ax = 'y'; s.b0 = (e.y + .5) * T; s.b1 = (e.y2 + .5) * T; }
        w.saws.push(s); break;
      }
      case 'plat': {
        const s = { k: 'plat', x: e.x * T, y: e.y * T, w: e.n * T, h: 16, solid: true, dx: 0, dy: 0, dir: 1, spd: e.spd || 70, ax: e.ax };
        if (e.ax === 'x') { s.b0 = e.x * T; s.b1 = e.x2 * T; } else { s.b0 = e.y * T; s.b1 = e.y2 * T; }
        w.solids.push(s); break;
      }
      case 'fall':
        for (let i = 0; i < e.n; i++) w.solids.push({ k: 'fall', x: (e.x + i) * T, y: e.y * T, w: T, h: T, hx: (e.x + i) * T, hy: e.y * T, st: 0, tm: 0, vy: 0, solid: true, dx: 0, dy: 0 });
        break;
      case 'spring': w.springs.push({ x: e.x * T + 2, y: e.y * T + 18, w: 28, h: 14, a: 0 }); break;
      case 'cp': w.cps.push({ tx: e.x, ty: e.y, x: e.x * T - 4, y: (e.y - 1) * T, w: T + 8, h: 2 * T, on: false, t: 0 }); break;
      case 'glider': w.picks.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, got: false }); break;
      case 'jet': w.jets.push({ tx: e.x, ty: e.y, tm: e.ph || 0, on: false, warn: false }); break;
      case 'emit': w.emits.push({ tx: e.x, ty: e.y, dir: e.dir, cd: e.ph || 1, period: e.period || 2.4, warn: false }); break;
      case 'exit': w.exit = { x: e.x * T, y: (e.y - 1) * T, w: T, h: 2 * T }; break;
      case 'gem': w.gems.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, got: false, i: w.gems.length }); break;
      case 'crystal': w.crystals.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, t: 0 }); break;
      case 'orb': w.orbs.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, t: 0, a: 0 }); break;
      case 'laser': {
        const h = e.ax === 'h';
        w.lasers.push({ ax: e.ax, x0: (e.x + .5) * T, y0: (e.y + .5) * T, x1: (e.x + (h ? e.len : 0) + .5) * T, y1: (e.y + (h ? 0 : e.len) + .5) * T,
          rect: h ? { x: (e.x + .5) * T, y: (e.y + .5) * T - 3, w: e.len * T, h: 6 } : { x: (e.x + .5) * T - 3, y: (e.y + .5) * T, w: 6, h: e.len * T },
          ph: e.ph, period: e.period, onF: e.on, on: false, warn: false });
        break;
      }
      case 'crusher': {
        const dist = e.drop * T, slam = dist / 1500, rise = dist / 140;
        w.solids.push({ k: 'crush', x: e.x * T, y: e.y * T, w: e.n * T, h: T, y0: e.y * T, dist, solid: true, dx: 0, dy: 0, ph: e.ph, rest: e.rest, slam, rise, cyc: e.rest + .4 + slam + .35 + rise, warn: false, st: 0 });
        break;
      }
      case 'belt': w.belts.push({ x: e.x * T, y: e.y * T, w: e.n * T, dir: e.dir }); break;
      case 'ice': w.ices.push({ x: e.x * T, y: e.y * T, w: e.n * T }); break;
      case 'coin': w.coins.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, got: false, i: w.coins.length }); break;
      case 'trophy': w.trophy = { x: (e.x + .5) * T, y: (e.y + .5) * T, got: false }; break;
      case 'card': w.cards.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, got: false }); break;
      case 'door': w.solids.push({ k: 'door', x: e.x * T + 6, y: e.y * T, w: T - 12, h: e.h * T, solid: true, dx: 0, dy: 0, openT: 0 }); break;
      case 'light': w.lights.push({ x: (e.x + .5) * T, y: (e.y + .5) * T, z0: e.x0 * T, z1: (e.x1 + 1) * T, y0: e.y0 * T, y1: e.y1 * T, ph: e.ph, g: e.g, r: e.r, st: 'g', grace: 0 }); break;
      case 'fan': w.fans.push({ x: e.x * T, y: e.y * T, w: e.wd * T, h: e.ht * T }); break;
    }
  }
  w.respawn = { x: L.start.x * T + (T - PW) / 2, y: (L.start.y + 1) * T - PH };
  spawnPlayer(w);
  return w;
}

function spawnPlayer(w) {
  w.p = {
    x: w.respawn.x, y: w.respawn.y, w: PW, h: PH, vx: 0, vy: 0, face: 1,
    onGround: false, coyote: 0, jbuf: 0, wcoyote: 0, wlock: 0, wallSide: 0, wallSliding: false,
    sliding: false, slideT: 0, canCut: false, wsT: 0, stretchT: 0, glider: 0, gliding: false, ride: null,
    phase: 0, landT: 0, impact: 0, grounded: false,
    dashes: 1, dashT: 0, dashDir: 1, dashCool: 0, dbuf: 0, dbufDir: 0, inFan: false, belt: 0, ice: false,
    swim: false, air: K.AIR, hang: 0, hangCool: 0
  };
}

function respawn(w) {
  for (const s of w.solids) if (s.k === 'fall') { s.x = s.hx; s.y = s.hy; s.st = 0; s.tm = 0; s.vy = 0; s.solid = true; }
  w.darts.length = 0;
  for (const k of w.picks) k.got = false;
  for (const e of w.emits) e.cd = Math.max(e.cd, 1);
  for (const o of w.orbs) o.t = 0;
  for (const c of w.crystals) c.t = 0;
  if (w.chase) { w.chase.x = w.cpIndex < 0 ? w.chase.x0 : w.respawn.x - 440; w.chase.delay = w.cpIndex < 0 ? w.chase.d0 : 1.3; }
  w.dead = false; w.deadT = 0;
  spawnPlayer(w);
  w.events.push({ t: 'respawn', x: w.p.x, y: w.p.y });
}

function kill(w, why) {
  if (w.dead || w.won) return;
  const p = w.p;
  w.dead = true; w.deadT = 0; w.deaths++;
  w.events.push({ t: 'die', x: p.x + p.w / 2, y: p.y + p.h / 2, vx: p.vx, vy: p.vy, why });
}

'use strict';
// ---- Head to Head: up to four racers over the same seeded course. You are racer 0. The others are CPU racers (their own copy of the course, see ai/bot.js)
// or other players online (a live "ghost" of their position, the knockback is decided by their own game). First to the exit wins. ----
const RACE_OPT = { chunks: 12, noChase: true, ramp: 14, dmax: .75, race: true, noCoins: true };
const RACE_MAX = 4;
// every slot has its own colour: the headband and name tag of that racer, their dot on the progress bar and their row in the lobby.
// (You keep your own wardrobe look on screen; the colour is still yours on the bar.)
const RACER_LOOK = [
  { col: '#ff5a3c', ink: '#ffd9d2', out: '#2a0a12' },
  { col: '#3dd6ff', ink: '#d6f3ff', out: '#06222e' },
  { col: '#7dffa6', ink: '#dcffe9', out: '#062a16' },
  { col: '#c08bff', ink: '#eadcff', out: '#1c0f33' }
];
const BOT_NAMES = ['Bolt', 'Nova', 'Rusty'];
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

const Race = (() => {
  let R = null;            // the current race
  let prepTimer = 0, prepCancel = null;

  // ----- racers -----
  // kind: 'me' (your world is G.w) · 'cpu' (r.bot has its own world) · 'net' (another player online, r.buf holds their positions)
  function newRacer(kind, id, name, wpn, slot) {
    return {
      kind, id, name, wpn: wpnId(wpn), slot: slot | 0, look: RACER_LOOK[(slot | 0) % RACER_LOOK.length],
      x: 0, y: 0, f: 1, face: 1, vx: 0, vy: 0, atkT: 0, atkCd: 0, atkHit: false, stunT: 0, ox: 0, oy: 0, kvx: 0, kvy: 0,
      fin: false, finT: 0, prog: 0, gp: null, buf: [], bot: null, left: false, place: 0
    };
  }
  const myName = () => (Store.d.name || 'Player');
  const alive = (r) => r.kind === 'me' ? !!G.w && !G.w.dead && !G.w.won : r.kind === 'cpu' ? !r.bot.w.dead && !r.bot.w.won : !r.left && !(r.f & 64);
  const bodyP = (r) => r.kind === 'me' ? G.w.p : r.kind === 'cpu' ? r.bot.w.p : null;
  // feet-centre, height
  function feet(r) {
    if (r.kind === 'net') return { cx: r.x + r.ox, fy: r.y + r.oy, h: PH };
    const p = bodyP(r); return { cx: p.x + p.w / 2, fy: p.y + p.h, h: p.h };
  }
  const exitX = () => R.L.ents.find((e) => e.t === 'exit').x * T;
  const progressOf = (r) => { if (r.fin) return 1; const x0 = R.L.start.x * T; return clamp((feet(r).cx - x0) / (exitX() - x0), 0, 1); };

  // ----- starting -----
  function start(seed, L, racers, startAt, online) {
    R = { seed, L, racers, me: racers[0], over: false, decided: null, why: null, endAt: 0, claiming: false, hitsLanded: 0, startAt, online: !!online, specs: null };
    G.raceR = R;
    startLevel(-1, L);
    G.mode = 'race';
    $('hudAct').textContent = 'HEAD TO HEAD · ' + racers.length + ' RACERS';
    $('hudGems').hidden = false;
    banner('HEAD TO HEAD', racers.length > 2 ? racers.length + ' racers' : 'vs ' + racers[1].name);
    G.raceCount = 4;
    buildBar();
  }
  // offline: you against 1 to 3 CPU racers. specs = [{ level: 'easy' | 'normal' | 'hard' }, ...]
  function startLocal(specs, status) {
    cancelPrep();
    status = status || (() => {});
    const seed = (Math.random() * 2147483647) | 0, L = makeGauntlet(seed, RACE_OPT);
    const racers = [newRacer('me', 'me', myName(), Look.wpn, 0)];
    specs.slice(0, RACE_MAX - 1).forEach((s, i) => {
      const bot = new Bot(L, { level: s.level, seed, slot: i, name: BOT_NAMES[i] });
      const r = newRacer('cpu', 'b' + (i + 1), BOT_NAMES[i], bot.wpn, i + 1);
      r.bot = bot; racers.push(r);
    });
    prepBots(racers.filter((r) => r.bot).map((r) => r.bot), status).then((ok) => { if (ok) { start(seed, L, racers, performance.now() + 3200, false); R.specs = specs; } });
  }
  // let every CPU racer plan its opening before the countdown starts (a second or two; the planning goes on during the countdown).
  // Resolves true when they are ready, false if it was cancelled.
  function prepBots(bots, status) {
    return new Promise((resolve) => {
      const step = () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 14 && !bots.every((b) => b.ready)) for (const b of bots) if (!b.ready) b.work(3);
        if (!bots.every((b) => b.ready)) {
          const pc = bots.length ? Math.round(bots.reduce((s, b) => s + Math.min(1, b.planner.queued / 360), 0) / bots.length * 100) : 100;
          status('Scouting the course… ' + pc + '%'); prepTimer = setTimeout(step, 0); return;
        }
        prepTimer = 0; status(''); resolve(true);
      };
      prepCancel = () => resolve(false);
      prepTimer = setTimeout(step, 20);
    });
  }
  function cancelPrep() { if (prepTimer) { clearTimeout(prepTimer); prepTimer = 0; } if (prepCancel) { prepCancel(); prepCancel = null; } }

  // ----- per-frame update while racing (called from the game loop) -----
  // returns true while the countdown is running (the world must not step)
  function preUpdate(dt) {
    if (!R) return false;
    const now = performance.now(), left = (R.startAt - now) / 1000;
    if (left > 0) {
      workBots(8);
      const n = Math.ceil(left);
      if (n !== G.raceCount && n <= 3) { G.raceCount = n; banner('GET READY', String(n)); Snd.play('count'); }
      return true;
    }
    if (G.raceCount !== 0) { G.raceCount = 0; banner('', 'GO!'); Snd.play('go'); R.goT = now; }
    return false;
  }
  function raceTime() { return R && R.goT ? (performance.now() - R.goT) / 1000 : 0; }

  // give the CPU racers' planners a few milliseconds, emptiest first
  function workBots(ms) {
    if (!R) return;
    const hungry = R.racers.filter((r) => r.bot && r.bot.hungry).sort((a, b) => a.bot.planner.queued - b.bot.planner.queued);
    if (hungry.some((r) => r.bot.planner.queued === 0)) ms = Math.max(ms, 7);     // a racer with no plan left (just knocked off course) gets more time, so it is back on its way quickly
    const t0 = performance.now();
    for (let i = 0; i < hungry.length; i++) {
      const left = ms - (performance.now() - t0); if (left <= 0.2) break;
      hungry[i].bot.work(Math.max(1, left / (hungry.length - i)));
    }
  }

  // one fixed simulation step for every CPU racer, in lock-step with your own world
  function fixed() {
    if (!R || R.over) return;
    for (const r of R.racers) if (r.kind === 'cpu') { r.bot.step(); if (r.bot.w.events.length) botEvents(r); }
  }
  const near = (x) => Math.abs(x - G.cam.x) < 560;
  function botEvents(r) {
    const w = r.bot.w;
    for (const e of w.events) {
      if (e.t === 'die') { burst(e); if (near(e.x)) { Snd.play('die'); } }
      else if (e.t === 'respawn') emit('ring', e.x + PW / 2, e.y + PH / 2, { s: 4, grow: 34, max: .5, col: r.look.col });
      else if (e.t === 'hurt') { sparks(e.x, e.y, 6, '#ff6b6b', 200); wpnImpact(e.x, e.y, e.wid, Math.sign(e.kx) || 1); if (near(e.x)) Snd.play('hurt'); }
      else if (e.t === 'win') { confetti(e.x, e.y - 20, 40); }
      else if (e.t === 'cp') { sparks(e.x, e.y - 20, 8, r.look.col, 160); }
    }
    w.events.length = 0;
  }

  function update(dt) {
    if (!R || !G.w) return;
    const w = G.w, me = R.me;
    if (R.online && typeof Net !== 'undefined') Net.tick(w);
    for (const r of R.racers) {
      if (r.kind !== 'net') continue;
      Net.updateRival(r, dt);
      // knockback offset springs back toward where the other player really is
      r.ox += r.kvx * dt; r.oy += r.kvy * dt; r.kvy += 1400 * dt;
      if (r.oy > 0 && r.kvy > 0) { r.oy = 0; r.kvy = 0; }
      r.kvx *= Math.exp(-dt * 3);
      if (r.stunT <= 0) { r.ox *= Math.exp(-dt * 6); r.oy *= Math.exp(-dt * 6); }
      r.atkT = Math.max(0, r.atkT - dt); r.stunT = Math.max(0, r.stunT - dt);
    }
    workBots(3);
    combat(dt);
    // who has reached the exit: the earliest on the race clock is the winner (online, the room settles it)
    const fresh = [];
    if (w.won && !me.fin) { me.fin = true; me.finT = w.t; fresh.push(me); }
    for (const r of R.racers) if (r.kind === 'cpu' && r.bot.fin && !r.fin) { r.fin = true; r.finT = r.bot.finT; fresh.push(r); }
    if (fresh.length) declare(fresh.sort((a, b) => a.finT - b.finT)[0]);
    if (R.decided && !R.over && performance.now() >= R.endAt) showResult(R.decided, R.why);
    // positions
    for (const r of R.racers) r.prog = progressOf(r);
    const order = R.racers.slice().sort((a, b) => (b.fin - a.fin) || (a.fin && b.fin ? a.finT - b.finT : b.prog - a.prog));
    order.forEach((r, i) => { r.place = i + 1; });
    const txt = R.racers.length > 1 ? ordinal(me.place) + ' of ' + R.racers.length + '   ·   ' + Math.round(me.prog * 100) + '%' : '';
    if ($('hudGems').textContent !== txt) $('hudGems').textContent = txt;
    barUpdate();
  }

  // ----- fighting -----
  function combat(dt) {
    const rs = R.racers, w = G.w;
    // CPU racers decide when to swing: at anyone close in front of them
    for (const a of rs) {
      if (a.kind !== 'cpu') continue;
      const bw = a.bot.w, bp = bw.p;
      if (bw.dead || bw.won || bp.stunT > 0 || bp.atkCd > 0 || a.fin) continue;
      const W = WEAPONS[a.wpn] || WEAPONS.fists, ax = bp.x + bp.w / 2;
      for (const v of rs) {
        if (v === a || !alive(v) || v.fin) continue;
        const b = feet(v), dx = b.cx - ax, dy = bp.y + bp.h - b.fy;
        if (Math.abs(dx) < W.reach + 12 && Math.abs(dy) < 44 && (Math.sign(dx) === (bp.face || 1) || Math.abs(dx) < 8) && Math.random() < dt * 3.2 * a.bot.cfg.aggro) {
          if (startSwing(bp, a.wpn)) { if (near(ax)) Snd.play(wpnSwingSfx(a.wpn)); }
          break;
        }
      }
    }
    // live swings (yours and the CPU racers'; other players' swings are resolved by their own game)
    for (const a of rs) {
      if (a.kind === 'net' || !alive(a) || a.fin) continue;
      const pa = bodyP(a);
      if (!(pa.atkT > 0) || pa.atkHit) continue;
      const W = WEAPONS[a.wpn] || WEAPONS.fists;
      let landed = false;
      for (const v of rs) {
        if (v === a || !alive(v) || v.fin) continue;
        const b = feet(v);
        if (!swingHits(pa, a.wpn, b.cx, b.fy, b.h)) continue;
        landed = true;
        const dir = pa.face || 1;
        if (v.kind === 'me') applyHit(w, dir * W.kb, W.up, W.stun, a.wpn);
        else if (v.kind === 'cpu') v.bot.hit(dir * W.kb, W.up, W.stun, a.wpn);
        else if (typeof Net !== 'undefined') { Net.sendHit(v.id, dir * W.kb, W.up, W.stun, a.wpn); v.stunT = W.stun; v.kvx = dir * W.kb; v.kvy = -W.up; wpnImpact(b.cx, b.fy - 24, a.wpn, dir); }
        if (a.kind === 'me') { wpnImpact(b.cx, b.fy - 24, a.wpn, dir); R.hitsLanded++; }
      }
      if (landed) {
        pa.atkHit = true;
        if (a.kind === 'me') { Snd.play('hit'); if (!REDUCED) G.shake = Math.max(G.shake, .18); }
      }
    }
  }

  // ----- drawing the other racers -----
  function drawLabel(ctx, r, x, top) {
    ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
    const wd = ctx.measureText(r.name).width + 10;
    ctx.fillStyle = 'rgba(10,12,28,.7)'; ctx.fillRect(x - wd / 2, top - 30, wd, 15);
    ctx.fillStyle = r.look.col; ctx.fillText(r.name, x, top - 19);
  }
  function drawBot(ctx, th, t, r) {
    const bw = r.bot.w, p = bw.p;
    if (bw.dead) return;
    if (bw.won && bw.winT > 1.2) return;
    const P = smoothPose(p, stickPose(p, t), t);
    const rth = Object.assign({}, th, { ink: r.look.ink, out: r.look.out });
    const sq = p.landT > 0 ? 1 - .14 * (p.landT / .14) : 1, st = p.stretchT > 0 ? p.stretchT / .12 : 0;
    if (p.atkT > 0) drawSmear(ctx, p, r.wpn, rth);
    const x = p.x + p.w / 2, y = p.y + p.h;
    renderStick(ctx, { x, y, f: p.face || 1, P, sq, st, shadow: p.onGround, vx: p.vx, vy: p.vy, t, th: rth, band: r.look.col, wpn: r.wpn, atk: p.atkT, hold: p, carry: !!(p.dashT > 0 || p.sliding || p.gliding || p.hang || p.wallSliding), stun: p.stunT > 0 });
    drawLabel(ctx, r, x, y - PH);
  }
  function drawNet(ctx, th, t, r) {
    const x = r.x + r.ox, y = r.y + r.oy, fl = r.f;
    if (fl & 64) return;
    const gp = r.gp || (r.gp = { phase: 0, lt: t });
    const dtf = clamp(t - gp.lt, 0, .05); gp.lt = t;
    Object.assign(gp, { vx: r.vx || 0, vy: r.vy || 0, onGround: !!(fl & 1), sliding: !!(fl & 2), wallSliding: !!(fl & 4), gliding: !!(fl & 8), dashT: fl & 16 ? 1 : 0, hang: fl & 128 ? r.face : 0, swim: !!(fl & 256), wlock: 0, face: r.face, landT: 0, stretchT: 0, dashes: 1, atkT: r.atkT, x: x - PW / 2, y: y - PH, w: PW, h: PH });
    if (r.stunT > 0) { gp.onGround = false; gp.vy = -100; }
    if (gp.onGround && !gp.sliding) gp.phase += Math.abs(gp.vx) * dtf * .052; else gp.phase += dtf * 2;
    const P = smoothPose(gp, stickPose(gp, t), t);
    const rth = Object.assign({}, th, { ink: r.look.ink, out: r.look.out });
    if (r.atkT > 0) drawSmear(ctx, gp, r.wpn, rth);
    renderStick(ctx, { x, y, f: r.face, P, sq: 1, st: 0, shadow: gp.onGround, vx: gp.vx, vy: gp.vy, t, th: rth, band: r.look.col, wpn: r.wpn, atk: r.atkT, hold: gp, carry: !!(gp.dashT > 0 || gp.sliding || gp.gliding || gp.hang || gp.wallSliding), stun: r.stunT > 0 });
    drawLabel(ctx, r, x, y - PH);
  }
  function draw(ctx, th, t) {
    if (!R) return;
    for (const r of R.racers) { if (r.kind === 'cpu') drawBot(ctx, th, t, r); else if (r.kind === 'net' && !r.left) drawNet(ctx, th, t, r); }
  }

  // ----- the progress bar along the top: everyone's dot on the way to the flag -----
  let bar = null;
  function buildBar() {
    const el = $('raceBar'); el.textContent = ''; el.hidden = false;
    const tr = document.createElement('div'); tr.className = 'rb-track'; el.appendChild(tr);
    const fl = document.createElement('span'); fl.className = 'rb-flag'; fl.textContent = '⚑'; tr.appendChild(fl);
    bar = [];
    R.racers.slice().reverse().forEach((r) => {
      const d = document.createElement('i'); d.className = 'rb-dot' + (r.kind === 'me' ? ' me' : ''); d.style.setProperty('--c', r.look.col);
      d.title = r.name; d.textContent = r.kind === 'me' ? 'YOU' : r.name.slice(0, 1).toUpperCase();
      tr.appendChild(d); bar.push({ r, d });
    });
  }
  function barUpdate() {
    if (!bar) return;
    for (const b of bar) b.d.style.left = (b.r.prog * 100).toFixed(1) + '%';
  }
  function hideBar() { bar = null; const el = $('raceBar'); if (el) { el.hidden = true; el.textContent = ''; } }

  // ----- the end of a race -----
  // racer r reached the exit. Offline the race clock decides; online the room does (the first claim wins, see Net.claim)
  function declare(r) {
    if (!R || R.decided || R.claiming) return;
    if (R.online && typeof Net !== 'undefined' && Net.inRoom()) {
      R.claiming = true;
      const RR = R;
      Net.claim(r.id, r.finT).then((ok) => { if (R === RR) { R.claiming = false; if (ok) decide(r); } }).catch(() => { if (R === RR) { R.claiming = false; decide(r); } });
    } else decide(r);
  }
  function decide(r, why) {
    if (!R || R.decided) return;
    R.decided = r; R.why = why || null;
    R.endAt = performance.now() + (r.kind === 'me' ? 1500 : 500);        // let the winner's moment play out
  }
  // somebody else's win arrived from the room
  function remoteWin(id, t) {
    if (!R) return;
    const r = R.racers.find((x) => x.id === id); if (!r) return;
    r.fin = true; r.finT = t; decide(r);
  }
  // another player left mid-race; if nobody is left to race against, you take it
  function racerLeft(id, name) {
    if (!R || R.over) return;
    const r = R.racers.find((x) => x.id === id); if (!r) return;
    r.left = true; toast((name || r.name) + ' left the race', 2400);
    if (!R.racers.some((x) => x !== R.me && !x.left)) { R.decided = null; showResult(R.me, (name || 'The other player') + ' left the race.'); }
  }
  // the game loop asks once the winner's moment is over; explicit calls end it now
  function finish(winner, why) {
    if (!R || R.over) return;
    if (winner) { R.decided = winner; R.why = why || null; }
    if (R.decided) showResult(R.decided, R.why);
  }
  function showResult(winner, why) {
    const me = R.me;
    R.over = true; R.winner = winner;
    const won = winner === me;
    for (const r of R.racers) { r.prog = progressOf(r); }
    const order = R.racers.slice().sort((a, b) => (b === winner) - (a === winner) || (b.fin - a.fin) || (a.fin && b.fin ? a.finT - b.finT : b.prog - a.prog));
    const myPlace = order.indexOf(me) + 1, gems = won ? 3 : 1;
    Store.d.gemBonus += gems; Store.d.h2h[won ? 'w' : 'l']++; Store.save();
    G.state = 'win'; if (typeof Mus !== 'undefined') Mus.duck(true);
    Snd.play(won ? 'win' : 'die');
    if (won && G.w) confetti(G.w.p.x + 9, G.w.p.y, 60);
    $('rrTitle').textContent = won ? 'You win!' : R.racers.length > 2 ? 'You finished ' + ordinal(myPlace) : 'You lose';
    const list = $('rrList'); list.textContent = '';
    order.forEach((r, i) => {
      const li = document.createElement('li'); if (r === me) li.className = 'me';
      const t = r.fin || r === winner ? fmt(r === me && !r.finT ? raceTime() : (r.finT || 0)) : Math.round(r.prog * 100) + '%';
      li.innerHTML = '<b class="pl"></b><i class="sw"></i><span class="nm"></span><span class="tm"></span>';
      li.querySelector('.pl').textContent = String(i + 1);
      li.querySelector('.sw').style.background = r.look.col;
      li.querySelector('.nm').textContent = r === me ? r.name + ' (you)' : r.name;
      li.querySelector('.tm').textContent = r === winner ? t : t;
      list.appendChild(li);
    });
    $('rrGems').textContent = '+' + gems;
    $('rrNote').textContent = (why || (won ? 'First to the exit.' : winner.name + ' reached the exit first.')) + '  Record: ' + Store.d.h2h.w + ' wins, ' + Store.d.h2h.l + ' losses.' + (R.hitsLanded ? '  You landed ' + R.hitsLanded + (R.hitsLanded === 1 ? ' hit.' : ' hits.') : '');
    $('bRRematch').hidden = !(R.online ? (typeof Net !== 'undefined' && Net.inRoom()) : true);
    $('bRRematch').textContent = R.online ? 'Back to lobby' : 'Rematch';
    hideBar();
    show('pRres', 'bRRematch');
  }
  function stop() { cancelPrep(); R = null; G.raceR = null; hideBar(); }
  function rematch() {
    if (!R) return;
    if (!R.online) { const lv = (R.specs || [{ level: 'normal' }]).map((s) => s.level); toMenu('pRace'); Lobby.beginLocal(lv); Lobby.ctrl.start(); }   // same line-up, new course
    else if (typeof Net !== 'undefined') Net.backToLobby();
  }
  return { start, startLocal, prepBots, cancelPrep, declare, remoteWin, racerLeft, preUpdate, update, fixed, draw, finish, raceTime, stop, rematch, newRacer, alive, feet, botEvents, workBots, get R() { return R; } };
})();

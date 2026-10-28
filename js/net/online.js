'use strict';
// Online Head to Head over Firebase Realtime Database (Syncwave's project, under stickline/h4/): up to four racers per room, humans and CPU racers mixed.
//
//   h4/<ROOM>/m        settings, written by the host: h (host uid) · s course seed · st wait|go · at race start (server clock, ms) · c created · pub 1 for quick match · rd race number · auto auto-start time
//   h4/<ROOM>/slots/N  who races in slot N (0-3, 0 = host): { u id, n name, k 'h' human | 'b' CPU, w weapon, lv CPU level }
//   h4/<ROOM>/p/<id>   live position of a racer, ~12 times a second (a CPU racer's is written by the host, id b1-b3)
//   h4/<ROOM>/hits     weapon hits { to, kx, ky, st, t, wp }: the victim's own game applies the knockback (the host's for a CPU racer)
//   h4/<ROOM>/win      the first racer at the exit { u, t, at } (claimed with a transaction)
//   h4pub/<ROOM>       quick-match index of public rooms that still have a free slot
// The host's game runs the CPU racers and everyone else sees them as live positions, like any other player.
const Net = (() => {
  const CFG = {
    apiKey: 'AIzaSyBGg_BwcQphZ_nY4eDT2owa71MY01fSMkw', authDomain: 'syncwave-83ac4.firebaseapp.com',
    databaseURL: 'https://syncwave-83ac4-default-rtdb.firebaseio.com', projectId: 'syncwave-83ac4',
    storageBucket: 'syncwave-83ac4.firebasestorage.app', messagingSenderId: '646300095464', appId: '1:646300095464:web:54009840db654a8c6a0a5d'
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const ROOT = 'stickline';
  const VER = 4;
  const test = window.STICKLINE_FB_TEST || null;
  let app = null, db = null, uid = null, tsOff = 0, connecting = null;
  let room = null;       // the room I am in (see attach)

  const sNow = () => Date.now() + tsOff;
  const dbg = (...a) => { if (test) console.log('[net]', ...a); };
  const myName = () => (Store.d.name || 'Player').slice(0, 12);
  const status = (t, waiting) => { const s = $('raceStatus'); if (s) s.textContent = t || ''; const c = $('bRCancel'); if (c) c.hidden = !waiting; };
  const genId = (n) => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('offline')); document.head.appendChild(s); }); }
  const wname = (w) => (WEAPONS[wpnId(w)] || WEAPONS.fists).name;

  async function connect() {
    if (db) return;
    if (connecting) return connecting;
    connecting = (async () => {
      const base = (test && test.sdk) || SDK;
      if (!window.firebase || !window.firebase.database) {
        await loadScript(base + 'firebase-app-compat.js');
        if (!test) await loadScript(base + 'firebase-auth-compat.js');
        await loadScript(base + 'firebase-database-compat.js');
      }
      const fb = window.firebase;
      app = fb.apps.find((a) => a.name === 'stickline') || fb.initializeApp(test ? { databaseURL: test.databaseURL, projectId: 'demo-stickline', apiKey: 'test' } : CFG, 'stickline');
      if (test) uid = 'u' + Math.random().toString(36).slice(2, 10);
      else {
        const auth = app.auth();
        if (!auth.currentUser) await auth.signInAnonymously();
        uid = auth.currentUser.uid;
      }
      db = app.database();
      db.ref('.info/serverTimeOffset').on('value', (s) => { tsOff = s.val() || 0; });
      // tidy up: rooms older than three hours are removed by whoever connects next
      db.ref(ROOT + '/h4').orderByChild('m/c').endAt(Date.now() - 3 * 3600e3).limitToFirst(25).once('value', (snap) => snap.forEach((c) => { c.ref.remove().catch(() => {}); }), () => {});
    })();
    try { await connecting; } catch (e) { connecting = null; db = null; throw e; }
  }
  function fail(e) {
    const msg = String(e && (e.code || e.message) || e);
    if (e && e.friendly) status(e.friendly);
    else if (/offline|load|network/i.test(msg)) status('Online play needs the hosted version of the game (it can\'t connect from here). Race CPU racers meanwhile!');
    else if (/permission|PERMISSION/i.test(msg)) status('The database refused access. The Stickline rules need to be published in Firebase (see firebase/README.md).');
    else if (/admin-restricted|operation-not-allowed/i.test(msg)) status('Anonymous sign-in is switched off in Firebase.');
    else status('Couldn\'t connect: ' + msg.slice(0, 80));
  }
  const friendly = (t) => { const e = new Error(t); e.friendly = t; return e; };

  // ----- getting into a room -----
  const mySlotObj = () => ({ u: uid, n: myName(), k: 'h', w: Look.wpn });
  async function create(pub) {
    if (room) return;
    status('Connecting…', true);
    try { await connect(); } catch (e) { fail(e); return; }
    try {
      let id = null;
      for (let k = 0; k < 8 && !id; k++) {
        const c = genId(4), ref = db.ref(ROOT + '/h4/' + c);
        await ref.once('value');
        const r = await ref.transaction((cur) => cur ? undefined : { m: { h: uid, s: (Math.random() * 2147483647) | 0, st: 'wait', c: sNow(), pub: pub ? 1 : 0, rd: 0, ver: VER }, slots: { 0: mySlotObj() } });
        if (r.committed) id = c;
      }
      if (!id) throw friendly('Couldn\'t find a free room code. Try again.');
      attach(id, true, 0);
      status('', false);
      Lobby.open(ctrl);
    } catch (e) { fail(e); }
  }
  async function join(code) {
    if (room) return;
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { status('Type the 4-letter room code your friend sees.'); return; }
    status('Connecting…', true);
    try { await connect(); } catch (e) { fail(e); return; }
    try { await joinRoom(code); status('', false); Lobby.open(ctrl); } catch (e) { fail(e); }
  }
  // claim the first free slot (1-3) of a waiting room, then listen to it
  async function joinRoom(id) {
    const ref = db.ref(ROOT + '/h4/' + id);
    const ms = await ref.child('m').once('value'), m = ms.val();
    if (!m) throw friendly('That room doesn\'t exist.');
    if (m.h === uid) throw friendly('That\'s your own room.');
    if (m.st !== 'wait') throw friendly('A race is running in that room. Try again in a moment.');
    let slot = 0;
    for (let i = 1; i <= 3 && !slot; i++) {
      await ref.child('slots/' + i).once('value');
      const r = await ref.child('slots/' + i).transaction((cur) => cur ? undefined : mySlotObj());
      if (r.committed) slot = i;
    }
    if (!slot) throw friendly('That room is full.');
    dbg('joined', id, 'slot', slot);
    attach(id, false, slot);
  }
  // quick match: join a public room that is waiting for racers, otherwise open one
  async function quick() {
    if (room) return;
    status('Looking for a race…', true);
    try { await connect(); } catch (e) { fail(e); return; }
    try {
      const found = await findPublic();
      for (const id of found) {
        try { await joinRoom(id); status('', false); Lobby.open(ctrl); return; } catch (e) { dbg('skip', id, e.message); }
      }
      await create(true);
    } catch (e) { fail(e); }
  }
  // public rooms that look alive and have room, oldest first
  async function findPublic(maxAge) {
    const snap = await db.ref(ROOT + '/h4pub').orderByChild('t').startAt(sNow() - (maxAge || 40000)).limitToLast(20).once('value');
    const rows = [];
    snap.forEach((c) => { const v = c.val(); if (v && v.h !== uid && v.n < 4) rows.push({ id: c.key, c: v.c || 0 }); });
    rows.sort((a, b) => a.c - b.c || (a.id < b.id ? -1 : 1));
    return rows.map((r) => r.id);
  }

  // ----- a room's listeners -----
  function attach(id, host, slot) {
    const ref = db.ref(ROOT + '/h4/' + id);
    room = { id, host, ref, mySlot: slot, m: { st: 'wait', rd: 0, pub: 0 }, slots: [null, null, null, null], offs: [], timers: [], at: 0, byId: {}, racing: false, starting: false, pend: null, prepText: '', seq: {}, lastSend: 0, pubOn: false, closed: false };
    const on = (path, ev, fn) => { const q = ref.child(path); q.on(ev, fn); room.offs.push(() => q.off(ev, fn)); };
    if (host) { ref.onDisconnect().remove(); db.ref(ROOT + '/h4pub/' + id).onDisconnect().remove(); }
    else { ref.child('slots/' + slot).onDisconnect().remove(); ref.child('p/' + uid).onDisconnect().remove(); }
    on('m', 'value', (s) => {
      const m = s.val();
      if (!m) { if (room && !room.closed && !room.host) roomClosed('The host closed the room.'); return; }
      room.m = m;
      if (m.st === 'go' && m.at && m.at !== room.at) { room.at = m.at; begin(m); }
      changed();
    });
    on('slots', 'value', (s) => {
      const v = s.val() || {}, prev = room.slots;
      room.slots = [0, 1, 2, 3].map((i) => v[i] || null);
      if (!room.host && room.slots[room.mySlot] && room.slots[room.mySlot].u !== uid) { roomClosed('You were removed from the room.'); return; }
      if (!room.host && !room.slots[room.mySlot] && !room.leaving) { roomClosed('You were removed from the room.'); return; }
      if (room.racing) for (let i = 0; i < 4; i++) if (prev[i] && prev[i].k === 'h' && prev[i].u !== uid && (!room.slots[i] || room.slots[i].u !== prev[i].u)) Race.racerLeft(prev[i].u, prev[i].n);
      changed();
    });
    on('win', 'value', (s) => {
      const v = s.val(); if (!v || !room || v.at !== room.at) return;
      const mine = v.u === uid || (room.host && room.byId[v.u] && room.byId[v.u].kind === 'cpu');
      if (!mine) Race.remoteWin(v.u, v.t);                // (my own claims are settled by the claim itself, so a refused claim cannot show up as a win)
      if (room.host && room.resetFor !== v.at) {          // the room opens again for the next race
        room.resetFor = v.at; const rd = room.m.rd;
        room.timers.push(setTimeout(() => { if (room && room.m.rd === rd) ref.child('m').update({ st: 'wait', auto: null }).then(() => { if (room) publish(); }).catch(() => {}); }, 1800));
      }
    });
    room.timers.push(setInterval(heartbeat, 1000));
    if (host) { publish(); }
    changed();
  }
  const humans = () => room ? room.slots.filter((s) => s && s.k === 'h').length : 0;
  const filled = () => room ? room.slots.filter(Boolean).length : 0;
  function changed() {
    if (!room) return;
    if (room.host) hostWatch();
    if (curPanel && curPanel.id === 'pLobby' && Lobby.active() === ctrl) Lobby.render();
  }
  function roomClosed(msg) {
    if (!room || room.closed) return;
    const racing = G.mode === 'race' && Race.R;
    detach();
    if (racing || (curPanel && curPanel.id === 'pLobby') || (curPanel && curPanel.id === 'pRres')) { toMenu('pRace', 'bRQuick'); }
    status(msg);
  }
  const heartbeat = () => {
    if (!room) return;
    if (room.host) {
      if (room.m.pub && room.m.st === 'wait' && humans() < 4 && sNow() - (room.pubT || 0) > 15000) publish();
      if (room.m.auto && room.m.st === 'wait' && !room.starting && sNow() >= room.m.auto) startRace();
      if (room.m.pub && room.m.st === 'wait' && humans() === 1 && !room.starting && !room.merging && room.m.rd === 0 && sNow() - room.m.c > 2500 && sNow() - (room.scanT || 0) > 3000) { room.scanT = sNow(); mergeScan(); }
    }
    if (curPanel && curPanel.id === 'pLobby' && Lobby.active() === ctrl && room.m.auto) Lobby.render();       // the auto-start countdown
  };

  // ----- the host's housekeeping -----
  function publish() {
    if (!room || !room.host || !room.m.pub || room.m.st !== 'wait') return;
    room.pubT = sNow();
    const ref = db.ref(ROOT + '/h4pub/' + room.id);
    if (humans() >= 4) { ref.remove().catch(() => {}); room.pubOn = false; return; }
    ref.set({ h: uid, t: sNow(), n: humans(), c: room.m.c || sNow() }).catch(() => {});
    room.pubOn = true;
  }
  function unpublish() { if (room && room.host && room.pubOn) { db.ref(ROOT + '/h4pub/' + room.id).remove().catch(() => {}); room.pubOn = false; } }
  // a public room starts by itself shortly after the second human arrives (the first race only; after that the host starts each race)
  function hostWatch() {
    if (!room.host || room.m.st !== 'wait' || room.starting) return;
    const h = humans();
    if (room.m.pub && room.m.rd === 0) {
      const want = h >= 4 ? sNow() + 3000 : h >= 2 ? sNow() + 10000 : null;
      if (want && (!room.m.auto || (h >= 4 && room.m.auto > want))) room.ref.child('m/auto').set(want).catch(() => {});
      else if (!want && room.m.auto) room.ref.child('m/auto').remove().catch(() => {});
    }
    if (room.m.pub && sNow() - (room.pubT || 0) > 1500) publish();       // keep the listed player count current
  }
  // two people who press Quick match at the same moment each open a room: the younger room folds into the older one
  async function mergeScan() {
    if (!room || room.merging) return;
    room.merging = true;
    try {
      const mine = room, list = await findPublic(30000);
      for (const id of list) {
        if (id === mine.id || !room || room !== mine || humans() !== 1 || mine.m.st !== 'wait') break;
        const theirs = (await db.ref(ROOT + '/h4pub/' + id).once('value')).val();
        if (!theirs || theirs.c > (mine.m.c || 0) || (theirs.c === mine.m.c && id > mine.id)) continue;       // only the younger room moves
        try {
          const ref = db.ref(ROOT + '/h4/' + id);
          let slot = 0;
          for (let i = 1; i <= 3 && !slot; i++) { await ref.child('slots/' + i).once('value'); const r = await ref.child('slots/' + i).transaction((cur) => cur ? undefined : mySlotObj()); if (r.committed) slot = i; }
          if (!slot) continue;
          if (room !== mine || humans() !== 1) { ref.child('slots/' + slot).remove().catch(() => {}); break; }      // somebody joined mine in the meantime: stay
          dbg('merging into', id);
          dismantle(true);
          attach(id, false, slot);
          Lobby.open(ctrl);
          return;
        } catch (e) { dbg('merge failed', e.message); }
      }
    } catch (e) { dbg('scan failed', e.message); }
    if (room) room.merging = false;
  }

  // ----- the lobby, as the Lobby screen sees it -----
  const ctrl = {
    view() {
      const r = room, m = r.m || {}, host = r.host, waiting = m.st === 'wait', n = filled();
      const slots = r.slots.map((s, i) => !s ? { kind: 'empty' } : s.k === 'b' ? { kind: 'bot', name: s.n, level: s.lv || 'normal' } : { kind: s.u === uid ? 'me' : 'human', name: s.n, detail: wname(s.w), host: i === 0 });
      let st = '';
      if (r.starting) st = r.prepText || 'Starting…';
      else if (m.auto && waiting) st = 'The race starts in ' + Math.max(0, Math.ceil((m.auto - sNow()) / 1000)) + ' s';
      else if (!host) st = 'Waiting for the host to start the race.';
      else if (n < 2) st = m.pub ? 'Waiting for other players. You can add CPU racers and start right away.' : 'Share the room code with your friends, or add CPU racers.';
      else st = 'Ready when you are.';
      return {
        title: m.pub ? 'Quick match' : 'Private room', code: m.pub ? '' : r.id, sub: m.pub ? 'Online · public room' : 'Online · up to 4 racers',
        slots, canAdd: host && waiting && !r.starting && n < 4, canEdit: host && waiting && !r.starting, canStart: host && waiting && !r.starting && n >= 2, startText: host ? 'Start race' : '',
        status: st, busy: r.starting, waiting: true, leaveText: host ? 'Close room' : 'Leave room'
      };
    },
    add(i) {
      if (!room || !room.host || room.slots[i]) return;
      const prev = room.slots.filter((s) => s && s.k === 'b').pop();
      room.ref.child('slots/' + i).set({ u: 'b' + i, n: BOT_NAMES[i - 1] || 'CPU', k: 'b', lv: prev ? prev.lv : 'normal' }).catch(() => {});
    },
    cycle(i) {
      const s = room && room.slots[i]; if (!s || s.k !== 'b' || !room.host) return;
      const lv = ['easy', 'normal', 'hard']; room.ref.child('slots/' + i + '/lv').set(lv[(lv.indexOf(s.lv) + 1) % 3]).catch(() => {});
    },
    remove(i) { if (room && room.host && room.slots[i] && room.slots[i].k === 'b') room.ref.child('slots/' + i).remove().catch(() => {}); },
    start() { startRace(); },
    leave() { Lobby.close(); cancel(); show('pRace', 'bRQuick'); }
  };

  // ----- starting a race (host) -----
  async function startRace() {
    if (!room || !room.host || room.starting || room.m.st !== 'wait' || filled() < 2) return;
    const mine = room;
    room.starting = true; room.prepText = 'Scouting the course… 0%'; changed();
    try {
      const seed = (Math.random() * 2147483647) | 0, L = makeGauntlet(seed, RACE_OPT), bots = {};
      room.slots.forEach((s, i) => { if (s && s.k === 'b') bots[s.u] = new Bot(L, { level: s.lv, seed, slot: i - 1, name: s.n }); });
      await Race.prepBots(Object.values(bots), (t) => { if (room === mine) { room.prepText = t; if (curPanel && curPanel.id === 'pLobby') Lobby.render(); } });
      if (room !== mine) return;
      room.pend = { seed, L, bots };
      unpublish();
      await room.ref.update({ 'm/st': 'go', 'm/s': seed, 'm/at': sNow() + 4000, 'm/rd': (room.m.rd || 0) + 1, 'm/auto': null, win: null });
    } catch (e) { fail(e); }
    if (room === mine) { room.starting = false; changed(); }
  }
  // everyone (host included) starts the race when the settings say go
  function begin(m) {
    const L = room.pend && room.pend.seed === m.s ? room.pend.L : makeGauntlet(m.s, RACE_OPT);
    const me = Race.newRacer('me', uid, myName(), Look.wpn, room.mySlot), racers = [me];
    room.byId = {}; room.seq = {};
    room.slots.forEach((s, i) => {
      if (!s || s.u === uid) return;
      let r;
      if (s.k === 'b' && room.host && room.pend && room.pend.bots[s.u]) { r = Race.newRacer('cpu', s.u, s.n, room.pend.bots[s.u].wpn, i); r.bot = room.pend.bots[s.u]; }
      else r = Race.newRacer('net', s.u, s.n, s.w, i);
      racers.push(r); room.byId[s.u] = r;
    });
    raceListeners(m);
    room.racing = true; room.lastSend = 0;
    if (room.host) unpublish();
    Lobby.close();
    Race.start(m.s, L, racers, performance.now() + (m.at - sNow()), true);
  }
  function raceListeners(m) {
    for (const f of room.rOffs || []) f();
    room.rOffs = [];
    const rd = m.rd, at = m.at, ref = room.ref;
    const pf = (s) => {
      const v = s.val(), r = room && room.byId[s.key];
      if (!v || !r || v.r !== rd) return;
      r.buf.push(Object.assign({ t: performance.now() }, v)); if (r.buf.length > 40) r.buf.splice(0, r.buf.length - 40);
    };
    ref.child('p').on('child_added', pf); ref.child('p').on('child_changed', pf);
    room.rOffs.push(() => { ref.child('p').off('child_added', pf); ref.child('p').off('child_changed', pf); });
    const hf = (s) => {
      const h = s.val(); if (!h || !room || !G.w || h.t < at - 1500) { dbg('hit ignored', JSON.stringify(h), 'at', at); return; }
      if (h.to === uid) { if (!G.w.dead && G.state !== 'win') applyHit(G.w, h.kx, h.ky, h.st, wpnId(h.wp)); }
      else if (room.host) { const r = room.byId[h.to]; if (r && r.bot && !r.fin) r.bot.hit(h.kx, h.ky, h.st, wpnId(h.wp)); }
    };
    ref.child('hits').on('child_added', hf);
    room.rOffs.push(() => ref.child('hits').off('child_added', hf));
  }
  function raceEnded() {
    if (!room) return;
    for (const f of room.rOffs || []) f();
    room.rOffs = []; room.racing = false;
    if (room.host) room.pend = null;
  }

  // ----- during the race -----
  const flagsOf = (p, dead) => (p.onGround ? 1 : 0) | (p.sliding ? 2 : 0) | (p.wallSliding ? 4 : 0) | (p.gliding ? 8 : 0) | (p.dashT > 0 ? 16 : 0) | (p.face < 0 ? 32 : 0) | (dead ? 64 : 0) | (p.hang ? 128 : 0) | (p.swim ? 256 : 0);
  function pack(id, p, dead, wpn, rd) {
    const q = room.seq[id] || (room.seq[id] = { n: 0, was: false });
    return { x: Math.round(p.x + p.w / 2), y: Math.round(p.y + p.h), f: flagsOf(p, dead), a: q.n, s: p.stunT > 0 ? 1 : 0, w: wpn, r: rd };
  }
  function swingEdges(w) {
    const mine = room.seq[uid] || (room.seq[uid] = { n: 0, was: false }), atk = w.p.atkT > 0;
    if (atk && !mine.was) mine.n++; mine.was = atk;
    if (room.host && Race.R) for (const r of Race.R.racers) if (r.kind === 'cpu') { const q = room.seq[r.id] || (room.seq[r.id] = { n: 0, was: false }), a = r.bot.w.p.atkT > 0; if (a && !q.was) q.n++; q.was = a; }
  }
  function tick(w) {
    if (!room || !db || !w || !room.racing) return;
    swingEdges(w);
    const now = performance.now();
    if (now - room.lastSend < 80) return;
    room.lastSend = now;
    const rd = room.m.rd | 0, upd = {};
    upd[uid] = pack(uid, w.p, w.dead, Look.wpn, rd);
    if (room.host && Race.R) for (const r of Race.R.racers) if (r.kind === 'cpu') upd[r.id] = pack(r.id, r.bot.w.p, r.bot.w.dead, r.wpn, rd);
    room.ref.child('p').update(upd).catch(() => {});
  }
  function updateRival(r, dt) {
    const b = r.buf; if (!b.length) return;
    const rt = performance.now() - 120;                 // render a little in the past so movement stays smooth
    let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
    const s1 = b[i], s0 = b[Math.max(0, i - 1)];
    const a = s1.t === s0.t ? 1 : clamp((rt - s0.t) / (s1.t - s0.t), 0, 1);
    const nx = lerp(s0.x, s1.x, a), ny = lerp(s0.y, s1.y, a);
    if (!r.seen) { r.x = nx; r.y = ny; r.seen = true; }
    r.vx = (nx - r.x) / Math.max(dt, .001); r.vy = (ny - r.y) / Math.max(dt, .001);
    r.x = nx; r.y = ny; r.f = s1.f; r.face = s1.f & 32 ? -1 : 1; r.wpn = wpnId(s1.w || r.wpn);
    if (s1.a !== r.lastA) { if (r.lastA !== undefined) { r.atkT = SWING_T; if (Math.abs(r.x - G.cam.x) < 620) Snd.play(wpnSwingSfx(r.wpn)); } r.lastA = s1.a; }
    if (s1.s) r.stunT = Math.max(r.stunT, .12);
    if (s1.f & 64) { r.x = s1.x; r.y = s1.y; }
  }
  function sendHit(to, kx, ky, st, wid) {
    if (!room) return;
    room.ref.child('hits').push({ to, kx: Math.round(kx), ky: Math.round(ky), st: +st.toFixed(2), t: sNow(), wp: wid || 'fists' }).catch(() => {});
  }
  async function claim(id, t) {
    if (!room) return true;
    await room.ref.child('win').once('value');
    const at = room.at;
    const r = await room.ref.child('win').transaction((cur) => cur ? undefined : { u: id, t: +t.toFixed(2), at });
    return r.committed;
  }

  // ----- leaving -----
  function detach() {
    if (!room) return;
    room.closed = true;
    for (const f of room.offs) f();
    for (const f of room.rOffs || []) f();
    for (const t of room.timers) { clearTimeout(t); clearInterval(t); }
    room = null;
  }
  // take my place out of the room (the host closes it)
  function dismantle(silent) {
    if (!room) return;
    const r = room;
    r.leaving = true;
    try {
      if (r.host) { r.ref.onDisconnect().cancel(); db.ref(ROOT + '/h4pub/' + r.id).onDisconnect().cancel(); r.ref.remove().catch(() => {}); db.ref(ROOT + '/h4pub/' + r.id).remove().catch(() => {}); }
      else { r.ref.child('slots/' + r.mySlot).onDisconnect().cancel(); r.ref.child('p/' + uid).onDisconnect().cancel(); r.ref.child('slots/' + r.mySlot).remove().catch(() => {}); r.ref.child('p/' + uid).remove().catch(() => {}); }
    } catch (e) { /* offline: the server clears it when we drop */ }
    detach();
    if (!silent) status('');
  }
  function cancel() { if (!room) { status(''); return; } dismantle(); }
  function leave() { dismantle(true); }
  function backToLobby() {
    if (!room) return;
    toMenu('pRace', 'bRQuick', true);
    Lobby.open(ctrl);
  }
  function refresh() { if (!room) status(''); }
  const inRoom = () => !!room;
  return { quick, create: () => create(false), join, cancel, leave, refresh, updateRival, sendHit, claim, inRoom, backToLobby, raceEnded, tick, ctrl, get room() { return room; }, get uid() { return uid; } };
})();

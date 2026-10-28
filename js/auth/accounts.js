'use strict';
// Player accounts: a player name plus a 4-6 digit PIN, kept on this device (like the profiles on a games console).
// Nothing is sent anywhere. The PIN and the security answer are never stored as typed: each is salted and run through PBKDF2-HMAC-SHA256.
// Forgot the name or PIN? Answer your own security question (case does not matter) and choose a new name and PIN; your progress stays.
//   Accounts.register({ name, pin, q, answer, remember }) · .login(name, pin, remember) · .resume() · .logout()
//   .resetList() · .resetCheck(id, answer) · .resetApply(id, name, pin, remember) · .checkName(name) · .checkPin(pin)
// Every call that can fail resolves to { ok: false, error } (never throws for bad input) and the wrong-guess limits lock a name or an answer for a while.
const Accounts = (() => {
  const KEY = 'stickline.accounts.v1', SESS = 'stickline.session';
  const ITER = 25000;
  const MAX_TRIES = 5, LOCK_MS = 30000, LOCK_MAX = 15 * 60000;
  const QUESTIONS = [
    'What was the name of your first pet?', 'What city were you born in?', 'What was your first teacher\'s last name?',
    'What is your favourite food?', 'What was the make of your first bike or car?', 'What is the name of your best childhood friend?',
    'What street did you grow up on?', 'What is your favourite movie?'
  ];
  const env = {
    ls: (() => { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })(),
    ss: (() => { try { const k = '__t'; sessionStorage.setItem(k, '1'); sessionStorage.removeItem(k); return sessionStorage; } catch (e) { return null; } })(),
    subtle: (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.importKey === 'function') ? crypto.subtle : null,
    rand: (a) => { if (typeof crypto !== 'undefined' && crypto.getRandomValues) return crypto.getRandomValues(a); for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; },
    now: () => Date.now()
  };
  let resetToken = null;                // proof that the security question was just answered (memory only)
  let mem = null;                       // when storage is blocked (private window), accounts last until the page closes
  const blank = () => ({ v: 1, list: [], active: null, remember: false, legacy: null, tries: {} });
  function load() {
    try {
      const s = env.ls && env.ls.getItem(KEY);
      if (s) { const o = JSON.parse(s); if (o && Array.isArray(o.list)) return Object.assign(blank(), o, { tries: o.tries || {} }); }
    } catch (e) { /* corrupt or blocked: start clean */ }
    return mem || blank();
  }
  let db = load();
  const save = () => { mem = db; try { if (env.ls) env.ls.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };

  // ----- hashing -----
  const hex = (u8) => Array.prototype.map.call(u8, (b) => (b < 16 ? '0' : '') + b.toString(16)).join('');
  const unhex = (s) => { const a = new Uint8Array(s.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; };
  const utf8 = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(unescape(encodeURIComponent(s)), (c) => c.charCodeAt(0)));
  // SHA-256 / HMAC / PBKDF2 in plain JS, for browsers without WebCrypto (it needs https). Same output as the real thing.
  const K256 = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const W256 = new Uint32Array(64);
  function sha256Block(h, b, o) {            // one 64-byte block of b (starting at o) folded into the 8-word state h
    for (let i = 0; i < 16; i++) W256[i] = (b[o + i * 4] << 24) | (b[o + i * 4 + 1] << 16) | (b[o + i * 4 + 2] << 8) | b[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const a = W256[i - 15], c = W256[i - 2];
      W256[i] = (W256[i - 16] + (((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)) + W256[i - 7] + (((c >>> 17) | (c << 15)) ^ ((c >>> 19) | (c << 13)) ^ (c >>> 10))) | 0;
    }
    let a = h[0], b2 = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K256[i] + W256[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b2) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }
  const H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  function sha256(msg, state, prefixLen) {   // msg: Uint8Array. state/prefixLen resume after a 64-byte prefix already absorbed (HMAC pads)
    const h = state ? state.slice() : H0.slice(), total = (prefixLen || 0) + msg.length;
    const padded = new Uint8Array(((msg.length + 9 + 63) >> 6) << 6);
    padded.set(msg); padded[msg.length] = 0x80;
    const bits = total * 8, dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(bits / 4294967296)); dv.setUint32(padded.length - 4, bits >>> 0);
    for (let o = 0; o < padded.length; o += 64) sha256Block(h, padded, o);
    const out = new Uint8Array(32), od = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) od.setUint32(i * 4, h[i] >>> 0);
    return out;
  }
  function pbkdf2Js(pw, salt, iter) {
    const key = new Uint8Array(64); key.set(pw.length > 64 ? sha256(pw) : pw);
    const ip = key.map((x) => x ^ 0x36), op = key.map((x) => x ^ 0x5c);
    const si = H0.slice(), so = H0.slice(); sha256Block(si, ip, 0); sha256Block(so, op, 0);
    const hmac = (m) => sha256(sha256(m, si, 64), so, 64);
    const first = new Uint8Array(salt.length + 4); first.set(salt); first[first.length - 1] = 1;
    let u = hmac(first); const t = u.slice();
    for (let i = 1; i < iter; i++) { u = hmac(u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; }
    return t;
  }
  async function pbkdf2(secret, saltHex, iter) {
    const pw = utf8(secret), salt = unhex(saltHex);
    if (env.subtle) {
      try {
        const k = await env.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
        return hex(new Uint8Array(await env.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256)));
      } catch (e) { /* fall through to the plain JS version */ }
    }
    await new Promise((r) => setTimeout(r, 0));
    return hex(pbkdf2Js(pw, salt, iter));
  }
  const newSalt = () => hex(env.rand(new Uint8Array(16)));
  const newId = () => hex(env.rand(new Uint8Array(4)));
  const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

  // ----- the rules for names, PINs and answers -----
  const cleanName = (n) => String(n == null ? '' : n).normalize('NFC').replace(/\s+/g, ' ').trim();
  const nameKey = (n) => cleanName(n).toLowerCase();
  const normAnswer = (a) => String(a == null ? '' : a).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();     // not case sensitive, and stray spaces do not matter
  function checkName(n, exceptId) {
    n = cleanName(n);
    if (n.length < 3) return { ok: false, error: 'Your player name needs at least 3 characters.' };
    if (n.length > 12) return { ok: false, error: 'Your player name can be at most 12 characters.' };
    if (!/^[A-Za-z0-9 _.\-]+$/.test(n)) return { ok: false, error: 'Use letters, numbers, spaces and . _ - only.' };
    if (!/[A-Za-z0-9]/.test(n)) return { ok: false, error: 'Your player name needs a letter or a number.' };
    if (db.list.some((a) => a.id !== exceptId && a.nameKey === nameKey(n))) return { ok: false, error: 'That name is taken on this device. Pick another one.' };
    return { ok: true, value: n };
  }
  function checkPin(p) {
    p = String(p == null ? '' : p);
    if (!/^[0-9]{4,6}$/.test(p)) return { ok: false, error: 'Your PIN must be 4 to 6 digits (numbers only).' };
    return { ok: true, value: p };
  }
  function checkQuestion(q, answer) {
    q = String(q == null ? '' : q).replace(/\s+/g, ' ').trim();
    if (q.length < 6) return { ok: false, error: 'Choose a security question, or write your own (at least 6 characters).' };
    if (q.length > 80) return { ok: false, error: 'Your security question is too long (80 characters at most).' };
    if (normAnswer(answer).length < 2) return { ok: false, error: 'Your answer needs at least 2 characters.' };
    if (normAnswer(answer).length > 60) return { ok: false, error: 'Your answer is too long (60 characters at most).' };
    return { ok: true, value: q };
  }

  // ----- wrong-guess limits (kept per name or per answer, so a wrong guess at a name that does not exist looks the same as a real one) -----
  function lockLeft(key) { const t = db.tries[key]; return t && t.until > env.now() ? Math.ceil((t.until - env.now()) / 1000) : 0; }
  function failed(key) {
    const t = db.tries[key] || (db.tries[key] = { n: 0, until: 0 });
    t.n++;
    if (t.n % MAX_TRIES === 0) t.until = env.now() + Math.min(LOCK_MAX, LOCK_MS * Math.pow(2, t.n / MAX_TRIES - 1));
    save();
    return t.until > env.now() ? Math.ceil((t.until - env.now()) / 1000) : 0;
  }
  const cleared = (key) => { if (db.tries[key]) { delete db.tries[key]; save(); } };
  const lockMsg = (s) => 'Too many wrong tries. Wait ' + (s >= 90 ? Math.ceil(s / 60) + ' minutes' : s + ' seconds') + ' and try again.';
  const left = (key) => MAX_TRIES - ((db.tries[key] ? db.tries[key].n : 0) % MAX_TRIES);

  // ----- signing in and out -----
  const pub = (a) => a ? { id: a.id, name: a.name, created: a.created, last: a.last } : null;
  const byId = (id) => db.list.find((a) => a.id === id) || null;
  function setActive(a, remember) {
    a.last = env.now();
    db.remember = !!remember;
    if (remember) { db.active = a.id; try { env.ss && env.ss.removeItem(SESS); } catch (e) { /* ignore */ } }
    else { db.active = null; try { env.ss && env.ss.setItem(SESS, a.id); } catch (e) { /* ignore */ } }
    save();
  }
  let current = null;
  async function register(o) {
    const nm = checkName(o.name); if (!nm.ok) return nm;
    const pn = checkPin(o.pin); if (!pn.ok) return pn;
    if (o.pin2 != null && String(o.pin2) !== String(o.pin)) return { ok: false, error: 'The two PINs are different. Type the same PIN twice.' };
    const qa = checkQuestion(o.q, o.answer); if (!qa.ok) return qa;
    const salt = newSalt(), qsalt = newSalt();
    const a = { id: newId(), name: nm.value, nameKey: nameKey(nm.value), salt, iter: ITER, hash: await pbkdf2(pn.value, salt, ITER), q: qa.value, qsalt, ahash: await pbkdf2(normAnswer(o.answer), qsalt, ITER), created: env.now(), last: env.now() };
    if (db.list.some((x) => x.nameKey === a.nameKey)) return { ok: false, error: 'That name is taken on this device. Pick another one.' };   // (raced with another tab)
    db.list.push(a);
    let legacy = false;
    if (!db.legacy) { db.legacy = a.id; legacy = true; }                  // the first account takes over any progress saved before accounts existed
    setActive(a, o.remember); current = a;
    return { ok: true, account: pub(a), legacy };
  }
  async function login(name, pin, remember) {
    const key = 'pin:' + nameKey(name);
    const wait = lockLeft(key); if (wait) return { ok: false, locked: wait, error: lockMsg(wait) };
    const a = db.list.find((x) => x.nameKey === nameKey(name));
    let good = false;
    if (a && /^[0-9]{4,6}$/.test(String(pin))) good = same(await pbkdf2(String(pin), a.salt, a.iter), a.hash);
    else await pbkdf2(String(pin), newSalt(), ITER);                       // same work whether or not the name exists
    if (!good) {
      const w = failed(key);
      return { ok: false, locked: w, error: w ? lockMsg(w) : 'That name and PIN do not match. ' + left(key) + (left(key) === 1 ? ' try' : ' tries') + ' left before a short wait.' };
    }
    cleared(key); setActive(a, remember); current = a;
    return { ok: true, account: pub(a) };
  }
  // pick up where this device left off: the "stay signed in" account, or this tab's session
  function resume() {
    let id = null;
    try { id = (db.remember && db.active) || (env.ss && env.ss.getItem(SESS)); } catch (e) { /* ignore */ }
    const a = id && byId(id);
    if (!a) return null;
    current = a; a.last = env.now(); save();
    return pub(a);
  }
  function logout() { current = null; db.active = null; try { env.ss && env.ss.removeItem(SESS); } catch (e) { /* ignore */ } save(); }

  // ----- forgot the name or the PIN -----
  // the player cannot be asked for their name, so the choices are the security questions (with a hint of the name)
  function resetList() {
    return db.list.map((a) => ({ id: a.id, q: a.q, hint: a.name.charAt(0) + '•'.repeat(Math.max(0, a.name.length - 1)), created: a.created, last: a.last }));
  }
  async function resetCheck(id, answer) {
    const a = byId(id); if (!a) return { ok: false, error: 'That account is not on this device any more.' };
    const key = 'ans:' + a.id;
    const wait = lockLeft(key); if (wait) return { ok: false, locked: wait, error: lockMsg(wait) };
    const good = same(await pbkdf2(normAnswer(answer), a.qsalt, a.iter), a.ahash);
    if (!good) { const w = failed(key); return { ok: false, locked: w, error: w ? lockMsg(w) : 'That is not the answer you gave. ' + left(key) + (left(key) === 1 ? ' try' : ' tries') + ' left before a short wait.' }; }
    cleared(key);
    const token = hex(env.rand(new Uint8Array(12)));
    resetToken = { id: a.id, token, until: env.now() + 10 * 60000 };       // the answer is only remembered for ten minutes, in memory
    return { ok: true, token };
  }
  async function resetApply(id, token, name, pin, pin2, remember) {
    const a = byId(id);
    if (!a || !resetToken || resetToken.id !== id || resetToken.token !== token || resetToken.until < env.now()) return { ok: false, error: 'Please answer your security question again.', expired: true };
    const nm = checkName(name, a.id); if (!nm.ok) return nm;
    const pn = checkPin(pin); if (!pn.ok) return pn;
    if (pin2 != null && String(pin2) !== String(pin)) return { ok: false, error: 'The two PINs are different. Type the same PIN twice.' };
    a.name = nm.value; a.nameKey = nameKey(nm.value); a.salt = newSalt(); a.iter = ITER; a.hash = await pbkdf2(pn.value, a.salt, ITER);
    resetToken = null;
    for (const k of Object.keys(db.tries)) if (k === 'pin:' + a.nameKey || k === 'ans:' + a.id) delete db.tries[k];
    setActive(a, remember); current = a;
    return { ok: true, account: pub(a) };
  }

  return {
    QUESTIONS, ITER, MAX_TRIES, register, login, resume, logout, resetList, resetCheck, resetApply, checkName, checkPin, checkQuestion, normAnswer, cleanName,
    get current() { return current ? pub(current) : null; }, get list() { return db.list.map(pub); }, get count() { return db.list.length; },
    get legacyOwner() { return db.legacy; }, get remember() { return db.remember; }, get persistent() { return !!env.ls; },
    _pbkdf2: pbkdf2, _pbkdf2Js: (s, salt, it) => hex(pbkdf2Js(utf8(s), unhex(salt), it)), _env: env, _db: () => db, _reload: () => { db = load(); }
  };
})();

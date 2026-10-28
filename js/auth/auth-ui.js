'use strict';
// The player screens: log in, new player, and "forgot your name or PIN?". Talks to Accounts (auth/accounts.js) and loads the chosen
// player's save into Store. Nothing in the game runs until a player is signed in.
//   Auth.boot()          called once at start-up: carry on as the saved player, or show the log in / new player screen
//   Auth.open(view)      show the screen ('login' | 'register')
//   Auth.switchPlayer()  main menu "Switch player"       Auth.logout()  Options "Log out"
//   Auth.back()          Back / Escape / controller B
const Auth = (() => {
  const VIEWS = ['aLogin', 'aRegister', 'aResetPick', 'aResetAnswer', 'aResetNew'];
  const OWN = '__own';
  let view = 'aLogin', busy = false, resetId = null, resetToken = null;

  const hasPlayer = () => !!Store.id;                       // somebody is signed in (so Cancel makes sense)
  const err = (msg) => { const e = document.querySelector('#' + view + ' .aerr'); if (e) e.textContent = msg || ''; };
  const field = (id) => $(id).value;
  const digits = (el) => { const v = el.value.replace(/[^0-9]/g, '').slice(0, 6); if (v !== el.value) el.value = v; };

  function setBusy(on, btnId, txt) {
    busy = on;
    const f = $(view), b = btnId && $(btnId);
    for (const el of f.querySelectorAll('button, input, select')) el.disabled = on;
    if (b) { if (on) { b.dataset.t = b.textContent; b.textContent = txt; } else if (b.dataset.t) { b.textContent = b.dataset.t; delete b.dataset.t; } }
    f.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function go(v, focusId) {
    view = v; $('toast').classList.remove('show');
    for (const id of VIEWS) $(id).hidden = id !== v;
    err('');
    if (curPanel && curPanel.id === 'pAuth') {
      const c = $('pAuth').querySelector('.card'); if (c) c.scrollTop = 0;
      const f = focusId && $(focusId); if (f) f.focus({ preventScroll: true });
    }
  }

  // ----- log in -----
  function recent() {
    const box = $('aRecent'); box.textContent = '';
    const list = Accounts.list.slice().sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 6);
    for (const a of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = a.name; b.dataset.name = a.name;
      b.setAttribute('aria-label', 'Log in as ' + a.name);
      box.appendChild(b);
    }
  }
  function openLogin() {
    recent();
    $('aName').value = ''; $('aPin').value = '';
    $('bACancel').hidden = !hasPlayer();
    $('bAForgot').hidden = Accounts.count === 0;
    show('pAuth', null);
    go('aLogin');
    const first = $('aRecent').querySelector('.chip');
    (first && Accounts.count === 1 ? $('aPin') : $('aName')).focus({ preventScroll: true });
    if (first && Accounts.count === 1) $('aName').value = first.dataset.name;
  }
  $('aRecent').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c || busy) return;
    Snd.init(); Snd.play('ui');
    $('aName').value = c.dataset.name; $('aPin').value = ''; $('aPin').focus();
    for (const x of $('aRecent').children) x.classList.toggle('on', x === c);
  });
  $('aLogin').addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    const name = field('aName'), pin = field('aPin');
    if (!Accounts.cleanName(name)) { err('Type your player name.'); $('aName').focus(); return; }
    if (!pin) { err('Type your PIN.'); $('aPin').focus(); return; }
    setBusy(true, 'bALogin', 'Checking…'); err('');
    let r; try { r = await Accounts.login(name, pin, $('aStay').checked); } catch (x) { r = { ok: false, error: 'Something went wrong. Please try again.' }; }
    setBusy(false, 'bALogin');
    if (!r.ok) { err(r.error); $('aPin').value = ''; $('aPin').focus(); Snd.play('back'); return; }
    enter(r.account);
  });
  $('bANew').addEventListener('click', () => { if (!busy) { Snd.init(); Snd.play('ui'); openRegister(); } });
  $('bAForgot').addEventListener('click', () => { if (!busy) { Snd.init(); Snd.play('ui'); openResetPick(); } });
  $('bACancel').addEventListener('click', () => { if (!busy) { Snd.play('back'); show('pMain', 'bPlay'); } });

  // ----- new player -----
  function fillQuestions() {
    const s = $('rQ'); if (s.options.length) return;
    for (const q of Accounts.QUESTIONS) s.add(new Option(q, q));
    s.add(new Option('Write my own question…', OWN));
  }
  function openRegister() {
    fillQuestions();
    for (const id of ['rName', 'rPin', 'rPin2', 'rA', 'rQOwn']) $(id).value = '';
    $('rQ').selectedIndex = 0; $('rQOwnW').hidden = true;
    $('aLegacy').hidden = !(Store.hasLegacy() && !Accounts.legacyOwner);
    $('aNoStore').hidden = Accounts.persistent;
    $('bRegBack').hidden = Accounts.count === 0 && !hasPlayer();
    $('aRegSub').textContent = Accounts.count === 0 ? 'Welcome! Choose a player name and a PIN. They stay on this device.' : 'Choose a player name and a PIN. They stay on this device.';
    show('pAuth', null);
    go('aRegister', 'rName');
  }
  $('rQ').addEventListener('change', () => { const own = $('rQ').value === OWN; $('rQOwnW').hidden = !own; if (own) $('rQOwn').focus(); });
  $('aRegister').addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    const q = $('rQ').value === OWN ? field('rQOwn') : $('rQ').value;
    // check everything that is quick to check first, so the message is instant
    const nm = Accounts.checkName(field('rName')); if (!nm.ok) { err(nm.error); $('rName').focus(); return; }
    const pn = Accounts.checkPin(field('rPin')); if (!pn.ok) { err(pn.error); $('rPin').focus(); return; }
    if (field('rPin') !== field('rPin2')) { err('The two PINs are different. Type the same PIN twice.'); $('rPin2').focus(); return; }
    const qa = Accounts.checkQuestion(q, field('rA')); if (!qa.ok) { err(qa.error); ($('rQ').value === OWN && q.trim().length < 6 ? $('rQOwn') : $('rA')).focus(); return; }
    setBusy(true, 'bRegister', 'Creating…'); err('');
    let r; try { r = await Accounts.register({ name: field('rName'), pin: field('rPin'), pin2: field('rPin2'), q, answer: field('rA'), remember: $('rStay').checked }); } catch (x) { r = { ok: false, error: 'Something went wrong. Please try again.' }; }
    setBusy(false, 'bRegister');
    if (!r.ok) { err(r.error); Snd.play('back'); return; }
    enter(r.account, { fresh: true });
  });
  $('bRegBack').addEventListener('click', () => { if (!busy) { Snd.play('back'); openLogin(); } });

  // ----- forgot the name or the PIN -----
  function openResetPick() {
    const box = $('aResetList'); box.textContent = '';
    const list = Accounts.resetList();
    for (const a of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.dataset.id = a.id;
      const t = document.createElement('span'); t.textContent = a.q;
      const s = document.createElement('small'); s.textContent = 'Player name starts with ' + a.hint.charAt(0) + ' · ' + a.hint.length + ' characters';
      b.append(t, s); box.appendChild(b);
    }
    if (!list.length) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'There are no players on this device yet.'; box.appendChild(p); }
    resetId = null; resetToken = null;
    show('pAuth', null);
    go('aResetPick', list.length ? null : 'bResetBack1');
    const f = box.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  $('aResetList').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]'); if (!b || busy) return;
    Snd.init(); Snd.play('ui');
    resetId = b.dataset.id; $('aResetQ').textContent = b.querySelector('span').textContent; $('xA').value = '';
    go('aResetAnswer', 'xA');
  });
  $('aResetAnswer').addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    if (!field('xA').trim()) { err('Type your answer.'); $('xA').focus(); return; }
    setBusy(true, 'bResetCheck', 'Checking…'); err('');
    let r; try { r = await Accounts.resetCheck(resetId, field('xA')); } catch (x) { r = { ok: false, error: 'Something went wrong. Please try again.' }; }
    setBusy(false, 'bResetCheck');
    if (!r.ok) { err(r.error); $('xA').focus(); $('xA').select(); Snd.play('back'); return; }
    resetToken = r.token; $('xA').value = '';
    for (const id of ['nName', 'nPin', 'nPin2']) $(id).value = '';
    Snd.play('unlock');
    go('aResetNew', 'nName');
  });
  $('aResetNew').addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    const nm = Accounts.checkName(field('nName'), resetId); if (!nm.ok) { err(nm.error); $('nName').focus(); return; }
    const pn = Accounts.checkPin(field('nPin')); if (!pn.ok) { err(pn.error); $('nPin').focus(); return; }
    if (field('nPin') !== field('nPin2')) { err('The two PINs are different. Type the same PIN twice.'); $('nPin2').focus(); return; }
    setBusy(true, 'bResetSave', 'Saving…'); err('');
    let r; try { r = await Accounts.resetApply(resetId, resetToken, field('nName'), field('nPin'), field('nPin2'), $('nStay').checked); } catch (x) { r = { ok: false, error: 'Something went wrong. Please try again.' }; }
    setBusy(false, 'bResetSave');
    if (!r.ok) {
      if (r.expired) { openResetPick(); err(r.error); return; }
      err(r.error); Snd.play('back'); return;
    }
    enter(r.account, { reset: true });
  });
  $('bResetBack1').addEventListener('click', () => { if (!busy) { Snd.play('back'); openLogin(); } });
  $('bResetBack2').addEventListener('click', () => { if (!busy) { Snd.play('back'); resetId = null; openResetPick(); } });
  $('bResetBack3').addEventListener('click', () => { if (!busy) { Snd.play('back'); resetId = null; resetToken = null; openLogin(); } });

  // show / hide the PIN while typing, and keep the PIN boxes to digits
  for (const f of document.querySelectorAll('#pAuth form')) {
    const sp = f.querySelector('.showpin');
    if (sp) sp.addEventListener('change', () => { for (const i of f.querySelectorAll('input[inputmode=numeric]')) i.type = sp.checked ? 'text' : 'password'; });
    for (const i of f.querySelectorAll('input[inputmode=numeric]')) i.addEventListener('input', () => digits(i));
  }

  // ----- signed in: load this player's save into the game -----
  function applyProfile() {
    if (typeof Wardrobe !== 'undefined') { Wardrobe.apply(); Wardrobe.check(false); }
    if (typeof Shop !== 'undefined') Shop.profile();
    buildActs(); refreshMain(); refreshOpts();
    $('tc').classList.toggle('learned', !!Store.d.opt.slid);
    updateTouchUI();
    if (typeof Mus !== 'undefined') Mus.sync();
    const who = Accounts.current;
    $('who').hidden = !who; $('whoName').textContent = who ? who.name : '';
    $('oLogout').hidden = !who;
  }
  function enter(acc, o) {
    o = o || {};
    if (Store.id) Store.save();
    const r = Store.bind(acc.id, acc.name, Accounts.legacyOwner === acc.id);
    applyProfile();
    for (const id of ['aName', 'aPin', 'rPin', 'rPin2', 'rA', 'xA', 'nPin', 'nPin2']) $(id).value = '';
    resetId = null; resetToken = null;
    show('pMain', 'bPlay');
    if (r.imported) toast('Welcome, ' + acc.name + '! Your earlier progress is on this player now.', 4800);
    else if (o.fresh) toast('Welcome, ' + acc.name + '!', 2400);
    else if (o.reset) toast('Saved. You are ' + acc.name + ' now.', 2600);
    else if (!o.quiet) toast('Welcome back, ' + acc.name + '!', 2000);
  }

  function boot() {
    const acc = Accounts.resume();
    if (acc) { enter(acc, { quiet: true }); return; }
    applyProfile();                                              // no player yet: the screens show the defaults behind the card
    if (Accounts.count) openLogin(); else openRegister();
  }
  function switchPlayer() { if (typeof Net !== 'undefined') Net.leave(); openLogin(); }
  function logout() {
    if (typeof Net !== 'undefined') Net.leave();
    Store.save(); Accounts.logout(); Store.unbind(); applyProfile();
    if (Accounts.count) openLogin(); else openRegister();
  }
  function back() {
    if (busy) return;
    if (view === 'aLogin') { if (hasPlayer()) show('pMain', 'bPlay'); }
    else if (view === 'aRegister') { if (Accounts.count || hasPlayer()) openLogin(); }
    else if (view === 'aResetPick') openLogin();
    else if (view === 'aResetAnswer') { resetId = null; openResetPick(); }
    else if (view === 'aResetNew') { resetId = null; resetToken = null; openLogin(); }
  }

  $('bWho').addEventListener('click', () => { Snd.init(); Snd.play('ui'); switchPlayer(); });
  $('oLogout').addEventListener('click', () => { Snd.init(); Snd.play('ui'); logout(); });

  return { boot, open: (v) => (v === 'register' ? openRegister() : openLogin()), switchPlayer, logout, back, applyProfile, enter, get view() { return view; }, get busy() { return busy; } };
})();

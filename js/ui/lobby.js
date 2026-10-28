'use strict';
// The Head to Head lobby: four racer slots, you in the first one. Offline it fills the other slots with CPU racers (this file);
// online the room supplies the slots (net/online.js). Both feed the same screen through a small controller:
//   view() -> { title, sub, code, slots: [{ kind: 'me'|'human'|'bot'|'empty', name, level, detail, host }], canAdd, canStart, startText, status, busy }
//   add(i) · cycle(i) · remove(i) · start() · leave()
const Lobby = (() => {
  let ctrl = null;
  const LV = ['easy', 'normal', 'hard'];
  const LVN = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

  function open(c) { ctrl = c; render(); show('pLobby', 'bLbStart'); }
  function close() { ctrl = null; }
  function active() { return ctrl; }

  function slotEl(s, i, v) {
    const el = document.createElement('div');
    el.className = 'lb-slot ' + s.kind; el.dataset.i = i;
    el.style.setProperty('--c', RACER_LOOK[i % RACER_LOOK.length].col);
    const sw = document.createElement('i'); sw.className = 'sw';
    const who = document.createElement('div'); who.className = 'lb-who';
    const nm = document.createElement('b'), dt = document.createElement('small');
    const acts = document.createElement('div'); acts.className = 'lb-acts';
    const btn = (txt, act, cls, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (cls ? ' ' + cls : ''); b.textContent = txt; b.dataset.act = act; b.dataset.i = i; if (label) b.setAttribute('aria-label', label); if (v.busy) b.disabled = true; acts.appendChild(b); };
    if (s.kind === 'empty') {
      nm.textContent = v.canAdd ? 'Open slot' : v.waiting ? 'Waiting for a player…' : 'Empty'; dt.textContent = v.canAdd ? 'Add a CPU racer, or wait for a player to join' : '';
      if (v.canAdd) btn('+ CPU racer', 'add', '', 'Add a CPU racer');
    } else if (s.kind === 'bot') {
      nm.textContent = s.name; dt.textContent = 'CPU racer';
      if (v.canEdit) { btn(LVN[s.level] || 'Normal', 'cycle', 'lv-' + s.level, 'CPU difficulty: ' + (LVN[s.level] || 'Normal') + '. Tap to change'); btn('✕', 'remove', 'x', 'Remove this CPU racer'); }
      else { dt.textContent = 'CPU racer · ' + (LVN[s.level] || 'Normal'); }
    } else {
      nm.textContent = s.name + (s.kind === 'me' ? ' (you)' : ''); dt.textContent = [s.host ? 'Host' : '', s.detail || ''].filter(Boolean).join(' · ');
    }
    who.append(nm, dt); el.append(sw, who, acts);
    return el;
  }

  function render() {
    if (!ctrl) return;
    const v = ctrl.view();
    $('lbTitle').textContent = v.title || 'Head to Head';
    const sub = $('lbSub'); sub.textContent = '';
    if (v.code) { sub.append('Room code '); const c = document.createElement('span'); c.className = 'lb-code'; c.textContent = v.code; sub.appendChild(c); if (v.sub) sub.append('  ·  ' + v.sub); }
    else sub.textContent = v.sub || '';
    const box = $('lbSlots'), focus = document.activeElement && box.contains(document.activeElement) ? document.activeElement.dataset.act + ':' + document.activeElement.dataset.i : '';
    box.textContent = '';
    v.slots.forEach((s, i) => box.appendChild(slotEl(s, i, v)));
    $('lbStatus').textContent = v.status || '';
    const st = $('bLbStart'); st.hidden = !v.canStart && !v.startText; st.disabled = !!v.busy || !v.canStart; st.textContent = v.startText || 'Start race';
    $('bLbLeave').textContent = v.leaveText || 'Back';
    if (focus) { const [a, i] = focus.split(':'); const b = box.querySelector('button[data-act="' + a + '"][data-i="' + i + '"]') || box.querySelector('button:not([disabled])'); if (b) b.focus({ preventScroll: true }); }
  }

  $('lbSlots').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b || !ctrl || b.disabled) return;
    const i = +b.dataset.i; Snd.play('ui');
    if (b.dataset.act === 'add') ctrl.add(i); else if (b.dataset.act === 'cycle') ctrl.cycle(i); else if (b.dataset.act === 'remove') ctrl.remove(i);
    render();
  });
  $('bLbStart').addEventListener('click', () => { if (ctrl) { ctrl.start(); render(); } });
  $('bLbLeave').addEventListener('click', () => leave());
  function leave() { if (ctrl) ctrl.leave(); }

  // ----- offline: you against 1 to 3 CPU racers -----
  const Local = (() => {
    let bots = [], busy = false, status = '';
    const save = () => { try { Store.d.opt.h2hBots = bots.slice(); Store.save(); } catch (e) { /* storage is optional */ } };
    return {
      begin(levels) {
        const saved = (Store.d.opt && Array.isArray(Store.d.opt.h2hBots)) ? Store.d.opt.h2hBots : null;
        bots = (levels || saved || ['normal']).filter((l) => LV.includes(l)).slice(0, RACE_MAX - 1);
        if (!bots.length) bots = ['normal'];
        busy = false; status = '';
        open(this);
      },
      view() {
        const slots = [{ kind: 'me', name: myNameNow(), detail: (WEAPONS[Look.wpn] || WEAPONS.fists).name }];
        for (let i = 0; i < RACE_MAX - 1; i++) slots.push(bots[i] ? { kind: 'bot', name: BOT_NAMES[i], level: bots[i] } : { kind: 'empty' });
        return { title: 'Head to Head', sub: 'Offline · you against up to 3 CPU racers', slots, canAdd: bots.length < RACE_MAX - 1, canEdit: true, canStart: bots.length > 0, status, busy };
      },
      add() { if (bots.length < RACE_MAX - 1) { bots.push(bots[bots.length - 1] || 'normal'); save(); } },
      cycle(i) { const k = i - 1; if (bots[k]) { bots[k] = LV[(LV.indexOf(bots[k]) + 1) % LV.length]; save(); } },
      remove(i) { const k = i - 1; if (bots[k]) { bots.splice(k, 1); save(); } },
      start() {
        if (busy || !bots.length) return;
        busy = true; status = 'Scouting the course… 0%';
        Race.startLocal(bots.map((level) => ({ level })), (t) => { status = t; if (curPanel && curPanel.id === 'pLobby') render(); });
      },
      leave() { Race.cancelPrep(); busy = false; status = ''; close(); show('pRace', 'bRBots'); }
    };
  })();
  const myNameNow = () => Store.d.name || 'Player';
  function beginLocal(levels) { Local.begin(levels); }

  return { open, close, render, active, beginLocal, leave, myNameNow, get ctrl() { return ctrl; } };
})();

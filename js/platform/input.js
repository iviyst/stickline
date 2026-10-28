'use strict';
// Keyboard, mouse, gamepad and touch input.
const Input = (() => {
  const keys = new Set();
  const touch = { x: 0, lj: false, ld: false, rj: false, rd: false, hold: 0 };   // hold: short jump press from a quick tap   // analog run, jump/slide from the left and right sticks
  const mouse = { cx: 0, left: false, right: false, active: false };
  const pad = { x: 0, jump: false, down: false, prev: {}, nav: { dir: null, t: 0 } };
  const I = {
    lastDevice: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) ? 'touch' : 'keyboard',
    jumpEdge: false, pauseEdge: false, restartEdge: false, dashEdge: false, dashDir: 0, atkEdge: false,
    menuMode: true, onMenu: null, mouseTarget: null,   // mouseTarget: () => screen x of player
    padConnected: false, keys, touch, mouse
  };
  const setDev = (d) => { if (I.lastDevice !== d) { I.lastDevice = d; if (I.onDevice) I.onDevice(d); } };
  const JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
  const DOWN = ['ArrowDown', 'KeyS', 'KeyX'];
  const DASH = ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyK', 'KeyL'];
  const ATK = ['KeyJ', 'KeyE', 'KeyV'];
  const LEFT = ['ArrowLeft', 'KeyA'], RIGHT = ['ArrowRight', 'KeyD'];
  const any = (list) => list.some((k) => keys.has(k));

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    setDev('keyboard');
    if (!e.repeat) {
      if (JUMP.includes(e.code)) I.jumpEdge = true;
      if (DASH.includes(e.code)) { I.dashEdge = true; I.dashDir = 0; }
      if (ATK.includes(e.code)) I.atkEdge = true;
      if ((e.code === 'Escape' || e.code === 'KeyP') && !I.menuMode) I.pauseEdge = true;
      if (e.code === 'KeyR' && !I.menuMode) I.restartEdge = true;
    }
    keys.add(e.code);
    if (!I.menuMode && (JUMP.includes(e.code) || DOWN.includes(e.code) || DASH.includes(e.code) || LEFT.includes(e.code) || RIGHT.includes(e.code) || e.code === 'Space')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys.delete(e.code); });
  addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; I.resetTouch(); });

  // ---- mouse (steering is optional; menus always work with the mouse) ----
  function bindMouse(el) {
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.cx = e.clientX; mouse.active = true; setDev('mouse'); } });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      setDev('mouse'); mouse.cx = e.clientX;
      if (e.button === 0) { mouse.left = true; I.jumpEdge = true; } else if (e.button === 2) mouse.right = true; else if (e.button === 1) { I.dashEdge = true; I.dashDir = 0; }
      e.preventDefault();
    });
    addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') return; if (e.button === 0) mouse.left = false; else if (e.button === 2) mouse.right = false; });
  }

  // ---- touch controls: two floating joysticks ----
  // Left half of the screen: drag to run (analog), push far up to jump, far down to slide (one-thumb play).
  // Right half: touch to jump (hold = higher / glide), swipe down to slide, swipe up out of a slide to jump.
  const R = 42;                                   // full throw of a stick in px
  const stk = { L: null, R: null };
  function bindTouch() {
    const tc = $('tc');
    const mark = (e) => { if (e.pointerType === 'touch' || e.pointerType === 'pen') setDev('touch'); };
    const clampP = (v, a, b) => v < a ? a : v > b ? b : v;

    function make(side) {
      const zone = $(side === 'L' ? 'tzL' : 'tzR'), el = $(side === 'L' ? 'stL' : 'stR'), knob = el.querySelector('.knob');
      const s = { id: null, ox: 0, oy: 0, nx: 0, ny: 0, t0: 0, mode: '', armed: true };
      const paint = () => {
        el.style.transform = 'translate3d(' + (s.ox - 60) + 'px,' + (s.oy - 60) + 'px,0)';
        knob.style.transform = 'translate3d(' + (s.nx * R).toFixed(1) + 'px,' + (s.ny * R).toFixed(1) + 'px,0)';
        el.classList.toggle('j', side === 'L' ? touch.lj : touch.rj);
        el.classList.toggle('d', side === 'L' ? touch.ld : touch.rd);
      };
      const fireJump = () => { if (side === 'L' ? touch.lj : touch.rj) return; if (side === 'L') touch.lj = true; else touch.rj = true; I.jumpEdge = true; };
      const logic = () => {
        const ax = Math.abs(s.nx);
        if (side === 'L') {
          touch.x = ax < .16 ? 0 : Math.sign(s.nx) * clampP((ax - .12) / .72, 0, 1);
          if (!touch.lj) { if (s.ny < -.62 && -s.ny > ax * .7) fireJump(); }
          else if (s.ny > -.35) touch.lj = false;
          if (!touch.ld) { if (s.ny > .42 && s.ny > ax * .4) touch.ld = true; }
          else if (s.ny < .22) touch.ld = false;
        } else {
          // a sideways flick is a dash: easy before the jump/slide decision, firmer while a jump is held
          if (s.armed && ax > (s.mode === 'wait' || s.mode === 'free' ? .24 : .6) && ax > Math.abs(s.ny) * 1.15) {
            s.armed = false; I.dashEdge = true; I.dashDir = Math.sign(s.nx);
            if (s.mode === 'wait') s.mode = 'free';
          } else if (ax < .25) s.armed = true;
          if (s.mode === 'wait') {
            if (s.ny < -.18) { s.mode = 'jump'; fireJump(); }
            else if (s.ny > .2) s.mode = 'slide';
          } else if (s.mode === 'free') {
            if (s.ny < -.3) { s.mode = 'jump'; fireJump(); }
            else if (s.ny > .3) s.mode = 'slide';
          } else if (s.mode === 'jump') {
            if (s.ny > .38) { s.mode = 'slide'; touch.rj = false; }
          } else if (s.mode === 'slide') {
            if (s.ny < -.55) { s.mode = 'jump'; touch.rd = false; fireJump(); }
          }
          touch.rd = s.mode === 'slide' && s.ny > .08;
        }
        paint();
      };
      s.tick = () => {   // a plain touch becomes a jump after ~75 ms (up to 170 ms while the thumb is drifting downward, so slow swipes still slide), so taps and swipes can be told apart
        if (side === 'R' && s.id !== null && s.mode === 'wait' && performance.now() - s.t0 >= (s.ny * R >= 2.5 ? 170 : 75)) { s.mode = 'jump'; fireJump(); paint(); }
      };
      s.reset = () => {
        s.id = null; s.nx = s.ny = 0; s.mode = '';
        if (side === 'L') { touch.x = 0; touch.lj = touch.ld = false; } else { touch.rj = touch.rd = false; }
        el.classList.remove('on', 'j', 'd'); tc.classList.remove('act' + side);
      };
      zone.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        mark(e); e.preventDefault();
        if (s.id !== null) return;
        s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY; s.nx = s.ny = 0; s.t0 = performance.now(); s.mode = side === 'R' ? 'wait' : ''; s.armed = true; s.maxd = 0;
        try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        tc.classList.add('used' + side, 'act' + side);
        el.classList.add('on'); logic();
      });
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== s.id) return;
        let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
        const d = Math.hypot(dx, dy);
        if (d > R) { const k = (d - R) / d; s.ox += dx * k; s.oy += dy * k; dx -= dx * k; dy -= dy * k; }   // the base follows a thumb that overshoots
        s.nx = dx / R; s.ny = dy / R; s.maxd = Math.max(s.maxd || 0, Math.hypot(dx, dy));
        logic();
      });
      const end = (e) => {
        if (e.pointerId !== s.id) return;
        if (side === 'R' && s.mode === 'wait' && e.type === 'pointerup') { touch.hold = .12; I.jumpEdge = true; }   // a quick tap is a medium jump
        if (side === 'L' && e.type === 'pointerup' && performance.now() - s.t0 < 220 && (s.maxd || 0) < 14) I.atkEdge = true;   // a quick tap on the left = attack
        s.reset();
      };
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => zone.addEventListener(n, end));
      stk[side] = s;
    }
    make('L'); make('R');
    tc.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  I.resetTouch = () => { if (stk.L) stk.L.reset(); if (stk.R) stk.R.reset(); touch.x = 0; touch.hold = 0; touch.lj = touch.ld = touch.rj = touch.rd = false; };

  // ---- gamepad ----
  addEventListener('gamepadconnected', () => { I.padConnected = true; setDev('gamepad'); });
  addEventListener('gamepaddisconnected', () => { I.padConnected = !!firstPad(); });
  function firstPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of list) if (g && g.connected) return g;
    return null;
  }
  function pollPad(dt) {
    const g = firstPad();
    pad.x = 0; pad.jump = false; pad.down = false;
    if (!g) { I.padConnected = false; return; }
    I.padConnected = true;
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    const dz = .28;
    const left = ax < -dz || b(14), right = ax > dz || b(15);
    const up = ay < -.6 || b(12), down = ay > .6 || b(13);
    pad.x = left ? (ax < -dz ? ax : -1) : right ? (ax > dz ? ax : 1) : 0;
    pad.jump = b(0) || b(12) || b(5) || ay < -.7;
    pad.down = b(1) || down;
    const dashB = b(3) || b(4) || b(6) || b(7);
    const cur = { a: b(0), bb: b(1), start: b(9), sel: b(8), up, down, left, right, jump: pad.jump, dash: dashB, atk: b(2) };
    const pv = pad.prev;
    const act = cur.a || cur.bb || cur.start || cur.sel || cur.up || cur.down || cur.left || cur.right || Math.abs(ax) > .5;
    if (act) setDev('gamepad');
    if (cur.jump && !pv.jump) I.jumpEdge = true;
    if (cur.dash && !pv.dash) { I.dashEdge = true; I.dashDir = 0; }
    if (cur.atk && !pv.atk) I.atkEdge = true;
    if (dashB) setDev('gamepad');
    if (cur.start && !pv.start && !I.menuMode) I.pauseEdge = true;
    if (cur.sel && !pv.sel && !I.menuMode) I.restartEdge = true;
    if (I.menuMode && I.onMenu) {
      if (cur.a && !pv.a) I.onMenu('ok');
      if (cur.bb && !pv.bb) I.onMenu('back');
      if (cur.start && !pv.start) I.onMenu('start');
      const d = cur.up ? 'up' : cur.down ? 'down' : cur.left ? 'left' : cur.right ? 'right' : null;
      if (d !== pad.nav.dir) { pad.nav.dir = d; pad.nav.t = .38; if (d) I.onMenu(d); }
      else if (d) { pad.nav.t -= dt; if (pad.nav.t <= 0) { pad.nav.t = .13; I.onMenu(d); } }
    }
    pad.prev = cur;
  }

  // one frame of combined controls
  I.poll = (dt) => {
    pollPad(dt);
    if (stk.R) stk.R.tick();
    let x = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0);
    if (!x) x = touch.x;
    if (!x && Math.abs(pad.x) > .01) x = pad.x;
    let jump = any(JUMP) || touch.lj || touch.rj || touch.hold > 0 || pad.jump;
    touch.hold = Math.max(0, touch.hold - dt);
    let down = any(DOWN) || touch.ld || touch.rd || pad.down;
    if (Store.d.opt.mouse && I.lastDevice === 'mouse' && mouse.active) {
      if (!x && I.mouseTarget) { const d = mouse.cx - I.mouseTarget(); x = Math.abs(d) < 26 ? 0 : d > 0 ? 1 : -1; }
      jump = jump || mouse.left; down = down || mouse.right;
    }
    const c = { x, jump, down, jumpEdge: I.jumpEdge, pauseEdge: I.pauseEdge, restartEdge: I.restartEdge, dashEdge: I.dashEdge, dashDir: I.dashDir, atkEdge: I.atkEdge };
    I.jumpEdge = I.pauseEdge = I.restartEdge = I.dashEdge = I.atkEdge = false; I.dashDir = 0;
    return c;
  };
  I.clearEdges = () => { I.jumpEdge = I.pauseEdge = I.restartEdge = I.dashEdge = I.atkEdge = false; I.dashDir = 0; };
  I.bindMouse = bindMouse; I.bindTouch = bindTouch;
  return I;
})();

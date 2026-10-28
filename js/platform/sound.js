'use strict';
// Sound effects.
const Snd = (() => {
  let ac = null, master = null, nbuf = null;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .32; master.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate);
      const d = nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function tone(f0, f1, dur, type, vol, delay) {
    if (!ac || !Store.d.opt.sound) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || .2, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .03);
  }
  function noise(dur, vol, lp, delay) {
    if (!ac || !Store.d.opt.sound) return;
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = nbuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp || 1500;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .03);
  }
  const fx = {
    thunder: () => { noise(1.6, .16, 260); noise(.9, .1, 120, .35); },
    jump: () => tone(300, 640, .15, 'square', .11),
    wjump: () => { tone(260, 700, .16, 'square', .11); noise(.06, .08, 3000); },
    land: () => noise(.09, .2, 450),
    slide: () => noise(.28, .1, 1000),
    die: () => { noise(.4, .3, 2400); tone(320, 50, .45, 'sawtooth', .13); },
    cp: () => { tone(523, 523, .1, 'triangle', .22); tone(784, 784, .22, 'triangle', .22, .1); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .22, 'triangle', .22, i * .09)),
    spring: () => tone(180, 900, .22, 'sine', .25),
    glider: () => [440, 660, 880].forEach((f, i) => tone(f, f * 1.02, .14, 'triangle', .2, i * .06)),
    dart: () => tone(950, 380, .12, 'square', .05),
    crumble: () => noise(.22, .16, 650),
    dash: () => { noise(.16, .14, 4200); tone(520, 180, .13, 'sawtooth', .07); },
    hyper: () => { tone(280, 900, .17, 'square', .1); noise(.1, .1, 5000); },
    sjump: () => { tone(240, 560, .14, 'triangle', .14); noise(.07, .07, 2200); },
    gem: () => [988, 1319, 1760].forEach((f, i) => tone(f, f, .16, 'triangle', .17, i * .06)),
    crystal: () => { tone(1200, 1800, .12, 'sine', .14); tone(1800, 2400, .1, 'sine', .08, .05); },
    orb: () => { tone(300, 1100, .18, 'sine', .22); tone(600, 1500, .14, 'triangle', .1, .03); },
    laser: () => tone(1500, 700, .07, 'sawtooth', .025),
    slam: () => { noise(.3, .34, 380); tone(110, 40, .26, 'square', .2); },
    star: () => [784, 988, 1175].forEach((f, i) => tone(f, f, .2, 'triangle', .16, i * .1)),
    unlock: () => [523, 784, 1047, 1568].forEach((f, i) => tone(f, f, .2, 'square', .08, i * .08)),
    coin: () => { tone(1320, 1320, .05, 'square', .06); tone(1760, 1760, .1, 'square', .06, .05); },
    trophy: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, .18, 'triangle', .18, i * .08)),
    card: () => { tone(880, 1320, .12, 'triangle', .16); tone(1320, 1760, .12, 'triangle', .12, .1); },
    door: () => { noise(.35, .14, 900); tone(160, 260, .3, 'square', .06); },
    red: () => { tone(880, 880, .08, 'square', .07); tone(660, 660, .14, 'square', .07, .1); },
    green: () => tone(660, 990, .1, 'triangle', .07),
    zap: () => { noise(.25, .25, 6000); tone(1800, 200, .3, 'sawtooth', .1); },
    splash: () => noise(.3, .2, 1600),
    swim: () => noise(.12, .07, 900),
    grab: () => noise(.06, .1, 2500),
    climb: () => tone(260, 420, .1, 'triangle', .08),
    buy: () => [784, 988, 1319].forEach((f, i) => tone(f, f, .12, 'square', .07, i * .06)),
    swing: () => noise(.12, .12, 5200),
    sw_fire: () => { noise(.2, .14, 2600); tone(300, 140, .18, 'sawtooth', .05); },
    sw_ice: () => { noise(.1, .1, 7000); tone(2400, 3200, .1, 'triangle', .05); },
    sw_volt: () => { noise(.1, .12, 6500); tone(1500, 500, .12, 'sawtooth', .05); },
    sw_void: () => { noise(.18, .1, 1500); tone(200, 90, .2, 'sine', .1); },
    sw_plasma: () => { tone(520, 880, .16, 'sawtooth', .05); tone(260, 440, .16, 'sine', .08); },
    sw_gold: () => { noise(.1, .1, 6000); tone(1760, 2200, .1, 'triangle', .05); },
    clang: () => { tone(1800, 1500, .12, 'square', .06); tone(2400, 2000, .08, 'triangle', .05, .02); },
    hit: () => { noise(.14, .3, 1800); tone(220, 90, .16, 'square', .14); },
    hurt: () => { noise(.18, .26, 1200); tone(180, 70, .2, 'sawtooth', .1); },
    count: () => tone(660, 660, .12, 'square', .1),
    go: () => { tone(990, 990, .25, 'square', .11); tone(1320, 1320, .25, 'triangle', .08); },
    ui: () => tone(620, 620, .05, 'square', .07),
    back: () => tone(420, 300, .07, 'square', .07)
  };
  return { init, audio: () => ac ? { ac, master } : null, play(n) { try { if (fx[n]) fx[n](); } catch (e) { /* ignore */ } } };
})();

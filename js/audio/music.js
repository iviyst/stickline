'use strict';
// Music: the soundtrack plus the generated fallback loops.
// ---- procedural chiptune: every theme is a small generative loop (bass + arpeggio + lead + drums), scheduled with Web Audio ----
const Mus = (() => {
  const SC = {
    maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10],
    phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], hmin: [0, 2, 3, 5, 7, 8, 11]
  };
  // bass: 16-step pattern per bar · dr: 0 none, 1 light, 2 full · arpR: 1 = every 16th, 2 = every 8th · prog: chord roots as scale degrees, one per bar
  const SONGS = {
    menu:    { bpm: 96,  root: 57, sc: 'dor', prog: [0, 3, 5, 4], bass: '1000000010000000', bassW: 'triangle', dr: 0, arpW: 'triangle', arpR: 2, arpP: [0, 1, 2, 3, 2, 1, 2, 1], leadW: 'sine', lead: .8 },
    dawn:    { bpm: 116, root: 60, sc: 'maj', prog: [0, 5, 3, 4], bass: '1001001010010010', bassW: 'triangle', dr: 1, arpW: 'square', arpR: 2, arpP: [0, 1, 2, 3, 2, 1, 3, 2], leadW: 'square', lead: 1 },
    mill:    { bpm: 126, root: 57, sc: 'min', prog: [0, 5, 3, 6], bass: '1010101010101010', bassW: 'square', dr: 2, arpW: 'square', arpR: 2, arpP: [0, 2, 1, 3, 0, 2, 3, 1], leadW: 'square', lead: 1 },
    forge:   { bpm: 112, root: 52, sc: 'phr', prog: [0, 1, 0, 5], bass: '1010101010101011', bassW: 'sawtooth', dr: 2, arpW: 'square', arpR: 2, arpP: [0, 0, 2, 0, 3, 0, 2, 0], leadW: 'sawtooth', lead: .9 },
    sky:     { bpm: 108, root: 62, sc: 'lyd', prog: [0, 1, 4, 0], bass: '1000100010001000', bassW: 'triangle', dr: 1, arpW: 'triangle', arpR: 1, arpP: [0, 1, 2, 3, 2, 1, 0, 1], leadW: 'triangle', lead: 1 },
    crystal: { bpm: 100, root: 59, sc: 'dor', prog: [0, 3, 2, 4], bass: '1000001010000010', bassW: 'triangle', dr: 1, arpW: 'sine', arpR: 1, arpP: [0, 1, 2, 3, 2, 3, 1, 2], leadW: 'sine', lead: 1 },
    night:   { bpm: 124, root: 55, sc: 'min', prog: [0, 5, 6, 4], bass: '1001001010010010', bassW: 'sawtooth', dr: 2, arpW: 'square', arpR: 2, arpP: [0, 2, 3, 2, 1, 2, 3, 1], leadW: 'square', lead: 1 },
    prism:   { bpm: 128, root: 64, sc: 'maj', prog: [0, 4, 5, 3], bass: '1010100110101001', bassW: 'square', dr: 2, arpW: 'square', arpR: 1, arpP: [0, 1, 2, 3, 2, 1, 2, 3], leadW: 'triangle', lead: 1 },
    frost:   { bpm: 92,  root: 57, sc: 'min', prog: [0, 5, 2, 6], bass: '1000000010000000', bassW: 'sine', dr: 1, arpW: 'sine', arpR: 2, arpP: [0, 2, 3, 1, 3, 2, 1, 0], leadW: 'sine', lead: .9 },
    gear:    { bpm: 132, root: 50, sc: 'min', prog: [0, 0, 5, 4], bass: '1011101110111011', bassW: 'square', dr: 2, arpW: 'square', arpR: 2, arpP: [0, 3, 0, 2, 0, 3, 0, 1], leadW: 'square', lead: .9 },
    grid:    { bpm: 134, root: 57, sc: 'min', prog: [0, 3, 5, 4], bass: '1110111011101110', bassW: 'sawtooth', dr: 2, arpW: 'square', arpR: 1, arpP: [0, 1, 2, 3, 0, 1, 2, 3], leadW: 'sawtooth', lead: .9 },
    storm:   { bpm: 120, root: 55, sc: 'dor', prog: [0, 6, 3, 4], bass: '1001001010010010', bassW: 'sawtooth', dr: 2, arpW: 'triangle', arpR: 1, arpP: [0, 2, 3, 1, 2, 3, 1, 0], leadW: 'square', lead: 1 },
    deep:    { bpm: 98,  root: 55, sc: 'dor', prog: [0, 2, 3, 2], bass: '1000100010001010', bassW: 'triangle', dr: 1, arpW: 'sine', arpR: 1, arpP: [0, 2, 3, 2, 1, 2, 3, 1], leadW: 'sine', lead: .9 },
    neon:    { bpm: 130, root: 58, sc: 'min', prog: [0, 5, 3, 4], bass: '1010101110101011', bassW: 'square', dr: 2, arpW: 'square', arpR: 1, arpP: [0, 1, 2, 3, 2, 1, 3, 2], leadW: 'square', lead: 1 },
    vault:   { bpm: 136, root: 52, sc: 'hmin', prog: [0, 3, 4, 0], bass: '1001101010011010', bassW: 'sawtooth', dr: 2, arpW: 'square', arpR: 2, arpP: [0, 2, 1, 3, 2, 3, 1, 0], leadW: 'sawtooth', lead: 1 },
    inferno: { bpm: 140, root: 57, sc: 'hmin', prog: [0, 5, 0, 4], bass: '1011101110111011', bassW: 'sawtooth', dr: 2, arpW: 'square', arpR: 1, arpP: [0, 2, 1, 3, 2, 3, 1, 2], leadW: 'sawtooth', lead: 1 }
  };
  const rng = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = (str) => { let h = 7; for (let i = 0; i < str.length; i++) h = Math.imul(h, 31) + str.charCodeAt(i) | 0; return h; };
  // four 16-step lead phrases per song (-99 = rest), built once from the song's name so each theme keeps its own tune
  function phrases(name) {
    const out = [];
    for (let v = 0; v < 4; v++) {
      const r = rng(hash(name) + v * 977), m = [];
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0) m.push(r() < .82 ? [0, 2, 4, 7][Math.floor(r() * 4)] : -99);
        else if (i % 2 === 0) m.push(r() < .55 ? Math.floor(r() * 6) : -99);
        else m.push(r() < .16 ? Math.floor(r() * 6) : -99);
      }
      out.push(m);
    }
    return out;
  }
  for (const k in SONGS) SONGS[k].ph = phrases(k);

  let ac = null, bus = null, filt = null, nbuf = null, timer = 0, song = null, want = null, step = 0, nextT = 0, ducked = false, hidden = false;
  // real songs (js/data/tracks.js): decoded once, played as an endless jukebox that carries on across levels and retries. The generated themes above are only the fallback if decoding fails.
  let tkBus = null, tkBufs = null, tkState = 'idle', cur = null, resumeIdx = -1, resumePos = 0;
  let pre = null, an = null, fbuf = null;       // everything audible passes `pre`, which a spectrum analyser listens to (backgrounds dance to it)
  const XF = .7;     // hand-over overlap between songs, seconds
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const degMidi = (S, root, d) => { const oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return root + SC[S][i] + 12 * oct; };

  function setup() {
    const a = Snd.audio(); if (!a) return false;
    if (ac === a.ac) return true;
    ac = a.ac;
    bus = ac.createGain(); bus.gain.value = 0;
    filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 20000; filt.Q.value = .5;
    bus.connect(filt); filt.connect(a.master);
    pre = ac.createGain(); pre.connect(bus);
    an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .55; pre.connect(an); fbuf = new Uint8Array(an.frequencyBinCount);
    tkBus = ac.createGain(); tkBus.gain.value = .65; tkBus.connect(pre);
    tkBufs = null; tkState = 'idle'; cur = null;
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function level() { return Store.d.opt.music && !hidden ? (ducked ? .22 : .62) : 0; }
  function applyLevel(fast) {
    if (!bus) return;
    const t = ac.currentTime;
    bus.gain.setTargetAtTime(level(), t, fast ? .03 : .25);
    filt.frequency.setTargetAtTime(ducked ? 700 : 20000, t, .12);
  }

  function note(type, f, t, dur, vol, atk) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (atk || .006));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(pre); o.start(t); o.stop(t + dur + .03);
  }
  function kick(t, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + .11);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .17);
    o.connect(g); g.connect(pre); o.start(t); o.stop(t + .2);
  }
  function hiss(t, dur, vol, type, freq) {
    const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(pre); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }

  function playStep(t) {
    const S = song, st = step, s16 = st % 16, bar = Math.floor(st / 16) % 4, loop = Math.floor(st / 64);
    const sd = 60 / S.bpm / 4, chord = S.prog[bar];
    // bass
    if (S.bass[s16] === '1') note(S.bassW, mtof(degMidi(S.sc, S.root, chord) - 12), t, sd * 1.9, .2, .004);
    // arpeggio over the chord tones, an octave up
    if (s16 % S.arpR === 0) {
      const k = (st / S.arpR | 0) % S.arpP.length, tone = [0, 2, 4, 7][S.arpP[k]];
      note(S.arpW, mtof(degMidi(S.sc, S.root, chord + tone) + 12), t, sd * (S.arpR === 1 ? 1.6 : 2.4), S.arpW === 'sine' ? .1 : .045, .004);
    }
    // lead joins after the first pass, and the phrase changes every pass
    if (loop >= 1 && S.lead) {
      const ph = S.ph[((loop - 1) * 2 + (bar >> 1)) % 4], d = ph[s16];
      if (d !== -99) {
        let len = 1; while (len < 4 && ph[(s16 + len) % 16] === -99 && s16 + len < 16) len++;
        note(S.leadW, mtof(degMidi(S.sc, S.root, chord + d) + 24), t, sd * len * .92, (S.leadW === 'sine' ? .12 : .055) * S.lead, .008);
      }
    }
    // drums
    if (S.dr >= 1) {
      if (s16 === 0 || s16 === 8) kick(t, .5);
      if (S.dr === 2 && (s16 === 6 || s16 === 14) && bar % 2 === 1) kick(t, .32);
      if (S.dr === 2 && (s16 === 4 || s16 === 12)) { hiss(t, .1, .22, 'bandpass', 1900); note('triangle', 190, t, .07, .16, .002); }
      if (S.dr === 2 && bar === 3 && loop % 2 === 1 && s16 >= 12) hiss(t, .06, .08 + (s16 - 12) * .05, 'bandpass', 2300);   // fill
      if (s16 % (S.dr === 2 ? 2 : 4) === (S.dr === 2 ? 0 : 2)) hiss(t, .035, S.dr === 2 ? .09 : .06, 'highpass', 7500);
    }
  }

  // ---- the songs ----
  // each track is a URL (a real file when hosted, a data: URL in the single-file edition): fetched, then decoded once
  function fetchBuf(url) { return fetch(url).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }); }
  function load() {
    if (tkState !== 'idle') return;
    if (typeof TRACKS === 'undefined' || !TRACKS.length) { tkState = 'failed'; return; }
    tkState = 'loading';
    const ctx = ac;
    Promise.all(TRACKS.map((t) => fetchBuf(t.url).then((buf) => new Promise((ok, no) => { try { const p = ctx.decodeAudioData(buf, ok, no); if (p && p.catch) p.catch(no); } catch (e) { no(e); } }))))
      .then((bufs) => { if (ctx !== ac) return; tkBufs = bufs; tkState = 'ready'; if (timer) startSong(); })
      .catch(() => { if (ctx !== ac) return; tkState = 'failed'; nextT = ac.currentTime + .08; });
  }
  function voice(i, off, fade) {
    const t = ac.currentTime, s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = tkBufs[i]; s.connect(g); g.connect(tkBus);
    g.gain.setValueAtTime(fade ? .0001 : 1, t); if (fade) g.gain.linearRampToValueAtTime(1, t + fade);
    s.start(t, off);
    s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { /* ignore */ } };
    return { s, g, i, t0: t - off, dur: tkBufs[i].duration };
  }
  function fadeOut(v, d) {
    const t = ac.currentTime;
    try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + d); v.s.stop(t + d + .05); } catch (e) { /* already stopped */ }
  }
  function startSong() {
    if (cur || !tkBufs) return;
    if (resumeIdx < 0) resumeIdx = Math.random() < .5 ? 0 : 1;
    resumeIdx %= tkBufs.length;
    cur = voice(resumeIdx, resumePos % tkBufs[resumeIdx].duration, .08);
  }
  function tickSong() {
    if (!cur) return;
    if (ac.currentTime - cur.t0 >= cur.dur - XF) {          // hand over to the next song
      const n = (cur.i + 1) % tkBufs.length;
      fadeOut(cur, XF); cur = voice(n, 0, .5);
    }
  }
  function haltSong() {
    if (!cur) return;
    resumeIdx = cur.i; resumePos = Math.max(0, ac.currentTime - cur.t0);
    fadeOut(cur, .06); cur = null;
  }

  function tick() {
    if (!ac) return;
    if (tkState === 'ready') { tickSong(); return; }
    if (tkState !== 'failed' || !song) return;               // 'loading': stay quiet for the moment the songs take to decode
    const now = ac.currentTime;
    if (nextT < now - .15) nextT = now + .05;           // woke up from a throttled tab: don't replay the backlog
    while (nextT < now + .2) { playStep(nextT); step++; nextT += 60 / song.bpm / 4; }
  }
  function run() {
    if (timer || !setup()) return;
    load();
    nextT = ac.currentTime + .08;
    timer = setInterval(tick, 40);
    if (tkState === 'ready') startSong();
    applyLevel(false);
  }
  function halt() { if (timer) { clearInterval(timer); timer = 0; } haltSong(); if (bus) bus.gain.setTargetAtTime(0, ac.currentTime, .05); }

  // ---- what the music is doing right now, for the backgrounds: smoothed bass / mid / high, a decaying beat pulse and 16 spectrum bands (all 0..1) ----
  const FX = { bass: 0, mid: 0, hi: 0, beat: 0, spec: new Float32Array(16) };
  const EDGE = Array.from({ length: 17 }, (_, i) => Math.max(1, Math.floor(Math.pow(64, i / 16))));
  let fAvg = 0, fLast = -9;
  const AG = Array.from({ length: 19 }, () => ({ avg: -1, dev: 0 }));      // per-band auto-gain: how far above or below its own recent average a band is (0.5 = average), whatever the song's volume
  function agc(st, v, dt) {
    if (st.avg < 0) st.avg = v;
    st.avg += (v - st.avg) * (1 - Math.exp(-dt * .8));
    st.dev += (Math.abs(v - st.avg) - st.dev) * (1 - Math.exp(-dt * .25));
    return Math.min(1, Math.max(0, .5 + (v - st.avg) / (3 * Math.max(5, st.dev))));
  }
  const sm = (cur, v, dt, up, down) => cur + (v - cur) * (1 - Math.exp(-dt * (v > cur ? up : down)));
  function analyse(dt) {
    const live = an && timer && (cur !== null || tkState === 'failed');
    if (!live || ducked) {                                   // silent, loading or ducked: let everything settle
      FX.bass = sm(FX.bass, 0, dt, 9, 4); FX.mid = sm(FX.mid, 0, dt, 9, 4); FX.hi = sm(FX.hi, 0, dt, 9, 4); FX.beat *= Math.exp(-dt * 6);
      for (let i = 0; i < 16; i++) FX.spec[i] = sm(FX.spec[i], 0, dt, 9, 4);
      return FX;
    }
    an.getByteFrequencyData(fbuf);
    let m = 0, h = 0; for (let i = 3; i < 24; i++) m += fbuf[i]; for (let i = 24; i < 90; i++) h += fbuf[i];
    const nb = agc(AG[16], (fbuf[0] + fbuf[1] + fbuf[2]) / 3, dt);
    FX.bass = sm(FX.bass, nb, dt, 30, 7);
    FX.mid = sm(FX.mid, agc(AG[17], m / 21, dt), dt, 24, 6);
    FX.hi = sm(FX.hi, agc(AG[18], h / 66, dt), dt, 24, 6);
    const onset = nb - fAvg; fAvg = sm(fAvg, nb, dt, 3, 3);
    FX.beat *= Math.exp(-dt * 6);
    if (onset > .25 && ac.currentTime - fLast > .22) { FX.beat = 1; fLast = ac.currentTime; }
    for (let i = 0; i < 16; i++) {
      const a = EDGE[i], z = Math.max(EDGE[i + 1], a + 1); let mx = 0;
      for (let j = a; j < z; j++) if (fbuf[j] > mx) mx = fbuf[j];
      FX.spec[i] = sm(FX.spec[i], agc(AG[i], mx, dt), dt, 26, 6);
    }
    return FX;
  }

  const M = {
    fx: analyse,
    play(name) {
      const s = SONGS[name] || SONGS.dawn;
      if (want === name && song === s && timer) return;
      want = name; song = s; step = 0;
      if (Store.d.opt.music) run();
    },
    sync() {
      if (!Store.d.opt.music || hidden) { if (timer) halt(); return; }
      if (want && !timer) run();
      applyLevel(false);
    },
    stop() { want = null; halt(); },
    duck(on) { ducked = !!on; applyLevel(true); },
    hit() {       // a dip in the filter when you die
      if (!ac || !timer) return;
      const t = ac.currentTime;
      filt.frequency.cancelScheduledValues(t); filt.frequency.setValueAtTime(380, t); filt.frequency.setTargetAtTime(ducked ? 700 : 20000, t + .3, .2);
    },
    get songs() { return Object.keys(SONGS); },
    get state() { return { mode: tkState, playing: !!cur, track: cur ? cur.i : resumeIdx, pos: cur && ac ? ac.currentTime - cur.t0 : resumePos, running: !!timer }; }
  };
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (hidden) { if (timer) halt(); } else M.sync();
  });
  return M;
})();

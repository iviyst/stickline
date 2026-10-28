'use strict';
// Saved progress, one save per player account (see auth/accounts.js). Until a player signs in nothing is loaded and nothing is written.
// Saves live in this browser's localStorage under stickline.p.<account id>.v2 (and .ghost.<act> for best-run ghosts).
const Store = (() => {
  const LEGACY = 'stickline.v2', LEGACY_V1 = 'stickline.v1', LEGACY_GHOST = 'stickline.ghost.';     // the single-player saves from before accounts existed
  let key = null, gkey = null, pid = null;
  const defaults = () => ({
    best: {}, gems: {}, seen: {}, cos: { band: 'default', trail: 'none', hat: 'none', skin: 'none', wpn: 'fists' }, gaunt: { best: 0, daily: {} },
    coins: {}, trophies: {}, coinBank: 0, gemBonus: 0, gemSpent: 0, owned: { fists: 1, none: 1 }, name: '', h2h: { w: 0, l: 0 },
    opt: { sound: true, music: true, mouse: false, touch: 'auto', fs: 'auto', unlock: false, ghost: true }
  });
  const d = defaults();                         // the object the whole game reads; it keeps its identity when a player signs in or out
  const ls = () => { try { return localStorage; } catch (e) { return null; } };
  const get = (k) => { try { const s = ls(); return s ? s.getItem(k) : null; } catch (e) { return null; } };
  const set = (k, v) => { try { const s = ls(); if (s) s.setItem(k, v); } catch (e) { /* storage unavailable */ } };
  const del = (k) => { try { const s = ls(); if (s) s.removeItem(k); } catch (e) { /* ignore */ } };
  function fill(raw) {
    let s = null; try { s = JSON.parse(raw); } catch (e) { /* corrupt save: start fresh */ }
    if (!s || typeof s !== 'object') return;
    d.best = s.best || {}; d.gems = s.gems || {}; d.seen = s.seen || {};
    for (const k of ['coins', 'trophies', 'owned', 'h2h']) if (s[k]) d[k] = Object.assign(d[k], s[k]);
    for (const k of ['coinBank', 'gemBonus', 'gemSpent', 'name']) if (s[k] != null) d[k] = s[k];
    Object.assign(d.cos, s.cos || {}); Object.assign(d.gaunt, s.gaunt || {}); Object.assign(d.opt, s.opt || {});
  }
  const hasLegacy = () => !!(get(LEGACY) || get(LEGACY_V1));
  // load a player's save. importOld: also take over the pre-accounts save of this browser (only offered to the first account)
  function bind(id, name, importOld) {
    pid = id; key = 'stickline.p.' + id + '.v2'; gkey = 'stickline.p.' + id + '.ghost.';
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, defaults());
    let raw = get(key), imported = false;
    if (!raw && importOld) {
      raw = get(LEGACY) || get(LEGACY_V1);
      if (raw) { imported = true; for (let i = 0; i < 40; i++) { const g = get(LEGACY_GHOST + i); if (g) set(gkey + i, g); } const g2 = get(LEGACY_GHOST + 'g'); if (g2) set(gkey + 'g', g2); }
    }
    if (raw) fill(raw);
    d.name = name || d.name || '';
    save();
    return { imported };
  }
  function unbind() { key = null; gkey = null; pid = null; for (const k of Object.keys(d)) delete d[k]; Object.assign(d, defaults()); }
  const save = () => { if (key) set(key, JSON.stringify(d)); };
  const getGhost = (k) => { if (!gkey) return null; try { return JSON.parse(get(gkey + k)); } catch (e) { return null; } };
  const setGhost = (k, g) => { if (gkey) set(gkey + k, JSON.stringify(g)); };
  const gemTotal = () => { let n = 0; for (const k in d.gems) for (const v of d.gems[k]) if (v) n++; return n; };
  const reset = () => {
    d.best = {}; d.gems = {}; d.seen = {}; d.gaunt = { best: 0, daily: {} }; d.coins = {}; d.trophies = {}; d.coinBank = 0; d.gemBonus = 0; d.gemSpent = 0; d.owned = { fists: 1, none: 1 }; d.cos.skin = 'none'; d.cos.wpn = 'fists';
    if (gkey) { for (let i = 0; i < 40; i++) del(gkey + i); del(gkey + 'g'); }
    save();
  };
  const gemLife = () => gemTotal() + (d.gemBonus || 0);                 // every gem ever earned (wardrobe unlocks)
  const gemWallet = () => Math.max(0, gemLife() - (d.gemSpent || 0));   // gems you can spend in the store
  return { d, save, bind, unbind, hasLegacy, getGhost, setGhost, gemTotal, gemLife, gemWallet, reset, get id() { return pid; } };
})();

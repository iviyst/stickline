'use strict';
// Melee weapons and combat.
// ---- melee weapons + combat (pure; used by head-to-head races, the CPU rival and online play) ----
// The 100 weapons come from the supplied sprite sheet (01f-wdata.js). What you see is what you hit: a weapon's reach is worked out
// from how long its sprite is drawn, and its class (sword, hammer, scythe...) sets the speed and knockback.
// reach: px in front of the body · cd: seconds between swings · kb/up: knockback · stun: seconds without control · cost: gems
const TIERS = [
  { name: 'Common', col: '#b9c2d2' }, { name: 'Uncommon', col: '#5fe07a' }, { name: 'Rare', col: '#4ea6ff' },
  { name: 'Epic', col: '#b479ff' }, { name: 'Legendary', col: '#ffc94a' }, { name: 'Mythic', col: '#ff55d6' }
];
// class: base cd / knockback / lift / stun, where it is gripped (fraction of the shaft from the butt), drawn size, reach multiplier
const WCLS = {
  dagger:  { cd: .26, kb: 220, up: 150, stun: .30, gf: .16, sc: .85, rm: 1,    blurb: 'Fast and short.' },
  dual:    { cd: .30, kb: 250, up: 165, stun: .32, gf: .15, sc: .90, rm: 1,    blurb: 'Twin blades, quick recovery.' },
  claws:   { cd: .24, kb: 230, up: 150, stun: .30, gf: .14, sc: .95, rm: 1,    blurb: 'Lightning-quick slashes.' },
  sword:   { cd: .46, kb: 370, up: 230, stun: .42, gf: .17, sc: 1,   rm: 1,    blurb: 'Balanced and reliable.' },
  saber:   { cd: .34, kb: 340, up: 210, stun: .40, gf: .15, sc: 1,   rm: 1,    blurb: 'Quick and precise.' },
  great:   { cd: .62, kb: 450, up: 270, stun: .50, gf: .15, sc: 1.1, rm: 1,    blurb: 'Heavy, long, hits hard.' },
  cleaver: { cd: .50, kb: 420, up: 240, stun: .50, gf: .20, sc: 1,   rm: 1,    blurb: 'Chops hard and quick.' },
  axe:     { cd: .72, kb: 560, up: 300, stun: .60, gf: .20, sc: 1.05, rm: 1,   blurb: 'Sends them flying.' },
  pick:    { cd: .66, kb: 480, up: 280, stun: .55, gf: .22, sc: 1.05, rm: 1,   blurb: 'Hooks and heavy hits.' },
  mace:    { cd: .70, kb: 520, up: 300, stun: .60, gf: .20, sc: 1.05, rm: 1,   blurb: 'Crushing blows.' },
  hammer:  { cd: .95, kb: 700, up: 420, stun: .85, gf: .20, sc: 1.1, rm: 1,    blurb: 'Slow. Devastating.' },
  flail:   { cd: .64, kb: 400, up: 250, stun: .50, gf: .20, sc: 1.05, rm: 1,   blurb: 'A wide, whipping arc.' },
  baton:   { cd: .30, kb: 280, up: 170, stun: .38, gf: .30, sc: 1.1, rm: 1,    blurb: 'Rapid strikes.' },
  spear:   { cd: .62, kb: 330, up: 190, stun: .42, gf: .32, sc: 1.5, rm: 1.1,  blurb: 'Pokes from far away.' },
  pole:    { cd: .70, kb: 430, up: 250, stun: .52, gf: .30, sc: 1.4, rm: 1.1,  blurb: 'Long reach, heavy head.' },
  scythe:  { cd: .70, kb: 520, up: 340, stun: .65, gf: .30, sc: 1.25, rm: 1.05, blurb: 'Huge arc, huge reach.' },
  thrown:  { cd: .45, kb: 330, up: 220, stun: .42, gf: .12, sc: 1,   rm: 1,    blurb: 'A spinning edge.' },
  gun:     { cd: .50, kb: 300, up: 200, stun: .40, gf: .15, sc: 1,   rm: 1,    blurb: 'Blasts a beam.', reach: 48 }
};
// powers: stat tweaks that go with the animation (kb / up / cd are multipliers, stun / reach are added)
const WFXSTAT = {
  none:    { blurb: '' },
  fire:    { kb: 1.12, up: 1.10, name: 'Flame',   blurb: 'Burning hits blast rivals back.' },
  ice:     { stun: .18,          name: 'Frost',   blurb: 'Frozen rivals stay stunned longer.' },
  volt:    { cd: .90,            name: 'Storm',   blurb: 'Crackling energy: swings recover faster.' },
  plasma:  { cd: .92, reach: 2,  name: 'Plasma',  blurb: 'A humming energy blade. Fast and precise.' },
  void:    { reach: 5,           name: 'Void',    blurb: 'Pulls at the air: extra reach.' },
  poison:  { stun: .12, kb: .95, name: 'Venom',   blurb: 'Venom slows rivals down: long stun.' },
  gold:    { cd: .93, kb: 1.04,  name: 'Gilded',  blurb: 'Gleaming steel. Swift and sharp.' },
  blood:   { kb: 1.15,           name: 'Blood',   blurb: 'Hungry steel. Heavy knockback.' },
  arcane:  { reach: 3, stun: .06, name: 'Arcane', blurb: 'Humming with magic: extra reach and stun.' },
  sonic:   { reach: 5,           name: 'Sonic',   blurb: 'Sound waves stretch its reach.' },
  rainbow: { kb: 1.08, cd: .94, reach: 3, name: 'Prism', blurb: 'Prismatic power: faster, farther, harder.' }
};
const WSC = .37 / WSHEET.sc;           // world px per atlas px for a 1.0-size weapon
const WPN_MAXLEN = 66;                 // longest a weapon is ever drawn (world px)

const WEAPONS = {
  fists: { id: 'fists', name: 'Fists', tier: 0, cls: 'fists', fx: 'none', cost: 0, reach: 24, cd: .42, kb: 230, up: 170, stun: .28, blurb: 'Quick jabs. Free.', sp: null }
};
const WEAPON_ORDER = ['fists'];
(() => {
  for (const r of WSHEET.rows) {
    const [id, name, tier, cls, fx, c1, c2, cost, flags, x, y, w, h, hx, hy, ang, Lx, cx, cy, hot] = r;
    const C = WCLS[cls], fxs = fx.split('+').map((k) => WFXSTAT[k] || WFXSTAT.none);
    const S = Math.min(WSC * C.sc, WPN_MAXLEN / Lx);             // world px per atlas px for this weapon
    const gx = hx + Math.cos(ang * Math.PI / 180) * C.gf * Lx, gy = hy + Math.sin(ang * Math.PI / 180) * C.gf * Lx;   // where the hand holds it
    let reach = C.reach || Math.round((14 + (1 - C.gf) * Lx * S) * .88 * C.rm);
    let cd = C.cd * (1 - .02 * tier), kb = C.kb * (1 + .03 * tier), up = C.up, stun = C.stun + .01 * tier;
    reach += tier;
    for (const q of fxs) { cd *= q.cd || 1; kb *= q.kb || 1; up *= q.up || 1; stun += q.stun || 0; reach += q.reach || 0; }
    const pw = fxs.map((q) => q.name).filter(Boolean).join(' + ');
    WEAPONS[id] = {
      id, name, tier, cls, fx, c1, c2, cost, spin: /spin/.test(flags),
      reach: Math.min(80, Math.round(reach)), cd: +Math.max(.22, cd).toFixed(2), kb: Math.round(Math.min(780, kb)), up: Math.round(Math.min(470, up)), stun: +Math.min(.95, stun).toFixed(2),
      power: pw, blurb: fxs.map((q) => q.blurb).filter(Boolean).join(' ') || C.blurb,
      sp: { x, y, w, h, hx, hy, ang, Lx, cx, cy, hot, S, ca: Math.cos(ang * Math.PI / 180), sa: Math.sin(ang * Math.PI / 180), gx: /spin/.test(flags) ? cx : gx, gy: /spin/.test(flags) ? cy : gy }   // spinning weapons are held at the middle of the head
    };
    WEAPON_ORDER.push(id);
  }
  // ids from the first version of the store still resolve (old saves, other players on an older build)
  const old = { bat: 'w031', knife: 'w007', sword: 'w002', spear: 'w017', axe: 'w011', katana: 'w004', hammer: 'w012', scythe: 'w021' };
  for (const k in old) WEAPONS[k] = WEAPONS[old[k]];
})();
const WEAPON_LEGACY_COST = { bat: 2, knife: 4, sword: 8, spear: 12, axe: 15, katana: 20, hammer: 25, scythe: 32 };   // what the old store charged (refunded on load)
const wpnId = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(WEAPONS, id)) ? id : 'fists';   // never trust an id that came over the network
const wpnTier = (id) => TIERS[(WEAPONS[id] || WEAPONS.fists).tier];
const SWING_T = .2;     // how long a swing is "live"

// start a swing if the cooldown allows; returns true when a swing began
function startSwing(p, wpn) {
  if (p.atkCd > 0 || p.stunT > 0 || p.hang) return false;
  const W = WEAPONS[wpn] || WEAPONS.fists;
  p.atkT = SWING_T; p.atkCd = W.cd; p.atkHit = false; p.atkWpn = wpn;
  return true;
}
function tickCombat(p, dt) {
  p.atkT = Math.max(0, (p.atkT || 0) - dt);
  p.atkCd = Math.max(0, (p.atkCd || 0) - dt);
  p.stunT = Math.max(0, (p.stunT || 0) - dt);
}
// the swing's hit box, in front of the attacker
function swingBox(p, wpn) {
  const W = WEAPONS[wpn] || WEAPONS.fists, f = p.face || 1, cx = p.x + p.w / 2;
  return { x: f > 0 ? cx : cx - W.reach - 4, y: p.y - 10, w: W.reach + 4, h: p.h + 16 };
}
// does attacker p (live swing, not yet landed) reach a body at (bx, by) feet-centre?
function swingHits(p, wpn, bx, by, bh) {
  if (!(p.atkT > 0) || p.atkHit) return false;
  const b = swingBox(p, wpn), h = bh || PH;
  return ovl(b, { x: bx - PW / 2, y: by - h, w: PW, h });
}
// knock a player back (the victim's own simulation applies this); wid = the attacker's weapon, only used for the impact effect
function applyHit(w, kx, ky, stun, wid) {
  const p = w.p;
  if (w.dead || w.won) return;
  if (p.sliding && canStand(w, p)) endSlide(p);
  p.hang = 0; p.hangCool = .3; p.dashT = 0; p.gliding = false;
  p.vx = kx; p.vy = -ky; p.onGround = false; p.coyote = 0; p.canCut = false;
  p.stunT = Math.max(p.stunT || 0, stun);
  w.events.push({ t: 'hurt', x: p.x + p.w / 2, y: p.y + p.h / 2, kx, wid: wid || 'fists' });
}

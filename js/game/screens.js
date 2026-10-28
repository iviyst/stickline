'use strict';
// Act select, main menu and options screens.
// ---------- screens ----------
function buildActs() {
  const tabs = $('worldTabs'); tabs.innerHTML = '';
  for (const W of WORLDS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wtab' + (W.n === G.world ? ' on' : '');
    const first = LEVELS.findIndex((l) => l.world === W.n);
    const open = first >= 0 && unlocked(first);
    b.innerHTML = '<small></small><b></b>'; b.querySelector('small').textContent = 'WORLD ' + W.n + (open ? '' : ' · LOCKED'); b.querySelector('b').textContent = W.name;
    b.addEventListener('click', () => { Snd.init(); Snd.play('ui'); G.world = W.n; buildActs(); const t2 = [...$('worldTabs').children][W.n - 1]; if (t2) t2.focus({ preventScroll: true }); });
    tabs.appendChild(b);
  }
  $('actsSub').textContent = '★ ' + totalStars() + '/' + LEVELS.length * 3 + '   ·   ◆ ' + totalGems() + '/' + allGems() + '   ·   🏆 ' + Object.keys(Store.d.trophies).length + '/' + LEVELS.filter((l) => l.ents.some((e) => e.t === 'trophy')).length + '   ·   clear it, find all 3 gems, beat the par time';
  const g = $('actGrid'); g.innerHTML = '';
  LEVELS.forEach((L, i) => {
    if (L.world !== G.world) return;
    const open = unlocked(i), best = Store.d.best[i];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'act' + (open ? '' : ' locked');
    b.innerHTML = '<span class="an"></span><span class="nm"></span><span class="sb"></span><span class="st"></span>';
    b.querySelector('.an').textContent = 'ACT ' + (i + 1);
    b.querySelector('.nm').textContent = L.name;
    b.querySelector('.sb').textContent = open ? L.sub : lockText(i);
    if (open) {
      const gt = gemsTotalIn(i);
      b.querySelector('.st').innerHTML = starHTML(starsOf(i)) + (gt ? ' &nbsp;<span class="gm">◆ ' + gemsBanked(i) + '/' + gt + '</span>' : '') + (best ? ' &nbsp;' + fmt(best.t) : '') + (L.ents.some((e) => e.t === 'trophy') ? ' &nbsp;<span title="Secret trophy">' + (Store.d.trophies[i] ? '🏆' : '<span style="opacity:.35">🏆</span>') + '</span>' : '');
    }
    b.addEventListener('click', () => {
      Snd.init();
      if (!open) { Snd.play('back'); toast(lockText(i) + ', or switch on Unlock all acts in Options', 3000); return; }
      Snd.play('ui'); startLevel(i);
    });
    g.appendChild(b);
  });
}
function refreshMain() {
  let open = LEVELS.findIndex((_, i) => unlocked(i) && !cleared(i));
  if (open < 0) open = 0;
  G.next = open;
  const any = Object.keys(Store.d.best).length;
  $('bPlay').textContent = any ? (cleared(LEVELS.length - 1) && open === 0 ? 'Play · Act 1' : 'Continue · Act ' + (open + 1)) : 'Play';
}
function refreshOpts() {
  $('oSoundV').textContent = Store.d.opt.sound ? 'On' : 'Off';
  $('oMusicV').textContent = Store.d.opt.music ? 'On' : 'Off';
  $('oGhostV').textContent = Store.d.opt.ghost ? 'On' : 'Off';
  $('oUnlockV').textContent = Store.d.opt.unlock ? 'On' : 'Off';
  $('oMouseV').textContent = Store.d.opt.mouse ? 'On' : 'Off';
  $('oFsV').textContent = Store.d.opt.fs === 'off' ? 'Off' : 'On';
  $('oTouchV').textContent = { auto: 'Auto', on: 'Always', off: 'Hidden' }[Store.d.opt.touch] || 'Auto';
  $('bSnd').classList.toggle('muted', !Store.d.opt.sound && !Store.d.opt.music);
}
function toggleSound() {            // M key / speaker button: everything on, or everything off
  const on = !(Store.d.opt.sound || Store.d.opt.music);
  Store.d.opt.sound = on; Store.d.opt.music = on; Store.save(); refreshOpts();
  if (typeof Mus !== 'undefined') Mus.sync();
  if (on) { Snd.init(); Snd.play('ui'); }
}

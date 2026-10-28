'use strict';
// Button wiring.
// ---------- wiring ----------
const on = (id, fn) => $(id).addEventListener('click', () => { Snd.init(); Snd.play('ui'); fn(); });
on('bPlay', () => startLevel(G.next));
on('bActs', () => show('pActs'));
on('bActsBack', () => show('pMain', 'bPlay'));
on('bWard', () => show('pWard'));
on('bRace', () => { refreshRace(); show('pRace', 'bRBots'); });
on('bRaceBack', () => { if (typeof Net !== 'undefined') Net.cancel(); show('pMain', 'bPlay'); });
on('bRBots', () => Lobby.beginLocal());
on('bRQuick', () => { if (typeof Net !== 'undefined') Net.quick(); });
on('bRCreate', () => { if (typeof Net !== 'undefined') Net.create(); });
on('bRJoin', () => { if (typeof Net !== 'undefined') Net.join($('raceCode').value); });
on('bRCancel', () => { if (typeof Net !== 'undefined') Net.cancel(); });
on('bRRematch', () => Race.rematch());
on('bRMenu', () => toMenu('pRace', 'bRBots'));
on('bShop', () => show('pShop'));
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-back]'); if (b) menuBack(); });
on('bShopBack', () => show('pMain', 'bPlay'));
on('bGaunt', () => { refreshGaunt(); show('pGaunt', 'bGDaily'); });
on('bGDaily', () => startGauntlet(true));
on('bGRandom', () => startGauntlet(false));
on('bGBack', () => show('pMain', 'bPlay'));
on('bGAgain', () => startGauntlet(G.gDaily));
on('bGMenu', () => toMenu('pGaunt', 'bGDaily'));
on('bWardBack', () => show('pMain', 'bPlay'));
on('bHelp', () => show('pHelp', 'bHelpBack'));
on('bHelpBack', () => show('pMain', 'bPlay'));
on('bOpts', () => { refreshOpts(); show('pOpts', 'oSound'); });
on('bOptsBack', () => show('pMain', 'bPlay'));
on('oSound', toggleSound);
on('oMusic', () => { Store.d.opt.music = !Store.d.opt.music; Store.save(); refreshOpts(); if (typeof Mus !== 'undefined') Mus.sync(); });
on('oGhost', () => { Store.d.opt.ghost = !Store.d.opt.ghost; Store.save(); refreshOpts(); });
on('oUnlock', () => { Store.d.opt.unlock = !Store.d.opt.unlock; Store.save(); refreshOpts(); buildActs(); refreshMain(); });
on('oMouse', () => { Store.d.opt.mouse = !Store.d.opt.mouse; Store.save(); refreshOpts(); });
on('oFs', () => { Store.d.opt.fs = Store.d.opt.fs === 'off' ? 'auto' : 'off'; Store.save(); G.fsOff = false; refreshOpts(); });
on('oTouch', () => { const o = Store.d.opt.touch; Store.d.opt.touch = o === 'auto' ? 'on' : o === 'on' ? 'off' : 'auto'; Store.save(); refreshOpts(); updateTouchUI(); });
let resetArm = false;
on('oReset', () => {
  if (!resetArm) { resetArm = true; $('oResetV').textContent = 'Tap again'; setTimeout(() => { resetArm = false; $('oResetV').textContent = 'Reset'; }, 3000); }
  else { Store.reset(); Store.d.cos.n = 0; Store.d.cos.seen = 0; if (typeof Wardrobe !== 'undefined') Wardrobe.apply(); if (typeof Shop !== 'undefined') Shop.applyLook(); resetArm = false; $('oResetV').textContent = 'Done'; buildActs(); refreshMain(); setTimeout(() => { $('oResetV').textContent = 'Reset'; }, 1500); }
});
on('bResume', resume);
on('bRestart', () => G.mode === 'gaunt' ? startGauntlet(G.gDaily) : startLevel(G.idx));
on('bPauseActs', () => toMenu('pActs'));
on('bPauseMenu', () => G.mode === 'race' ? toMenu('pRace', 'bRBots') : toMenu('pMain', 'bPlay'));
on('bNext', () => startLevel(Math.min(LEVELS.length - 1, G.idx + 1)));
on('bRetry', () => startLevel(G.idx));
on('bWinActs', () => toMenu('pActs'));
$('bPause').addEventListener('click', (e) => { e.currentTarget.blur(); pause(); });
$('bSnd').addEventListener('click', (e) => { e.currentTarget.blur(); toggleSound(); });
on('bFsMenu', toggleFs);
$('bFs').addEventListener('click', (e) => { e.currentTarget.blur(); toggleFs(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

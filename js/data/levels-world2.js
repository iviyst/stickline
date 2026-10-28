'use strict';
// World 2: Overdrive (acts 7-12).
// ---- World 2 : Overdrive (acts 7-12) ----
Lvl.world = 2;

// ---------- Act 7 : Prism Run ----------
(function () {
  const F = 28;                                      // floor top row
  const L = Lvl('Prism Run', 'Dash through the neon', 170, 34, 'prism');
  L.start(3, F - 1).setPar(60);
  L.ground(0, 15, F).ground(22, 36, F);              // first dash: a 7-wide pit
  L.gem(18, F - 3);
  L.cp(26, F - 1).spikes(31, F - 1, 2);
  L.ground(47, 67, F).crystal(42, F - 3);            // 11-wide pit with a crystal in the middle
  L.spikes(55, F - 1, 3).cp(61, F - 1);
  // the prism bridge: crystals and an orb over a spiked chasm
  L.spikes(67, 33, 29);
  L.crystal(73, F - 3).crystal(79, F - 2);
  L.block(76, 31, 5, 3).spring(79, 30).gem(77, 30);  // secret island: dive for the gem, spring back up
  L.orb(85, F - 4).crystal(91, F - 9);
  L.block(96, 23, 10, 11).cp(99, 22);                // landing island
  // orb ladder up to the pillar
  L.orb(109, 19).orb(113, 13);
  L.block(116, 11, 10, 23);
  L.orb(121, 7).gem(123, 3);                         // orb above the pillar: a gem in the sky
  L.cp(118, 10);
  // dash across to the far ledge, then the run home
  L.block(134, 14, 7, 20).cp(136, 13);
  L.ground(141, 170, F);
  L.sawV(154, 21, 26, 80).spikes(150, F - 1, 8);
  L.cp(146, F - 1);
  L.exit(166, F - 1);
  LEVELS.push(L);
})();

// ---------- Act 8 : Frostline ----------
(function () {
  const F = 20;
  const L = Lvl('Frostline', 'Slippery when fast', 185, 26, 'frost');
  L.start(3, F - 1).setPar(45);
  // ice runway into the first pit
  L.ground(0, 31, F).ice(7, F, 24);
  L.gem(33, F - 3);
  L.ground(36, 62, F).ice(36, F, 14).spikes(46, F - 1, 3).cp(40, F - 1);
  // the slide tunnel (one tile high) with a secret shaft
  L.ice(62, F, 22).cp(64, F - 1);
  L.ground(62, 112, F);
  L.block(70, 6, 6, F - 1 - 6).block(78, 6, 6, F - 1 - 6);
  L.block(76, 4, 2, 2).gem(76, 7);                  // closed shaft top: wall-jump up to the gem
  L.spikes(100, F - 1, 2);
  // frozen saws on a long ice floor
  L.ice(84, F, 31).cp(88, F - 1);
  L.sawH(94, F - 1, 98, 70).spikes(103, F - 1, 3).sawH(108, F - 1, 113, 80);
  // ice islands over a spiked trench
  L.ground(112, 116, F).ice(112, F, 4);
  L.ground(121, 125, F).ice(121, F, 4).cp(122, F - 1);
  L.ground(131, 135, F).ice(131, F, 4);
  L.ground(141, 145, F).ice(141, F, 4);
  L.sawV(128, F - 6, F - 2, 90);
  L.spikes(116, 25, 5).spikes(125, 25, 6).spikes(135, 25, 6);
  // the big crossing: crystal in the middle, a stone with a gem to land on
  L.ground(158, 182, F);
  L.crystal(151, F - 3).block(154, F - 2, 1, 1).gem(154, F - 3).cp(161, F - 1);
  L.exit(177, F - 1);
  LEVELS.push(L);
})();

// ---------- Act 9 : Gearworks ----------
(function () {
  const F = 28;
  const L = Lvl('Gearworks', 'Timing is everything', 185, 34, 'gear');
  L.start(3, F - 1).setPar(65);
  // A: a conveyor launch into a pit
  L.ground(0, 15, F).belt(6, F, 9, 1);
  L.gem(18, F - 3);
  L.ground(22, 77, F).belt(22, F, 10, -1).cp(33, F - 1);
  // B: the crusher run, on a belt that carries you into them
  L.belt(40, F, 30, 1);
  L.crusher(44, F - 5, 2, 4, 0).crusher(52, F - 5, 2, 4, 1.1).crusher(60, F - 5, 2, 4, 2.2).crusher(68, F - 5, 2, 4, 0.6);
  // C: the conveyor tower over a spiked pit
  L.spikes(77, 33, 20);
  L.block(77, F - 3, 6, 1).belt(77, F - 3, 6, -1);
  L.block(86, F - 6, 6, 1).belt(86, F - 6, 6, 1);
  L.block(77, F - 9, 6, 1).belt(77, F - 9, 6, -1);
  L.block(86, F - 12, 8, 1).cp(89, F - 13);
  L.sawV(84, 19, 25, 70);
  L.gem(72, F - 11);
  // D: the high bridge, crushers overhead, belt against you
  L.block(101, 16, 41, 2).belt(101, 16, 41, -1);
  L.crusher(108, 11, 2, 4, 0).crusher(116, 11, 2, 4, 1.1).crusher(124, 11, 2, 4, 2.2).crusher(132, 11, 2, 4, 0.6);
  L.gem(124, 13);
  // E: the double gate
  L.ground(146, 185, F).cp(148, F - 1).belt(150, F, 20, -1);
  L.crusher(156, F - 5, 2, 4, 0).crusher(166, F - 5, 2, 4, 1.7);
  L.exit(178, F - 1);
  LEVELS.push(L);
})();

// ---------- Act 10 : Laser Grid ----------
(function () {
  const F = 22, U = 8;                              // lower and upper floor rows
  const L = Lvl('Laser Grid', 'Wait for the blink', 200, 30, 'grid');
  L.start(3, F - 1).setPar(85);
  // S1: the corridor, three lasers and a secret shaft in the ceiling
  L.ground(0, 46, F).block(0, 0, 89, 17);
  L.fill(27, 8, 2, 9, '.');                         // shaft x27..28 up to a gem
  L.block(26, F - 3, 4, 3);                         // a step to reach it
  L.gem(27, 9);
  L.laser(14, 16, 6, 'v', 0, 3, .45).laser(20, 16, 6, 'v', .8, 3, .45).laser(34, 16, 6, 'v', 1.6, 3, .45);
  L.cp(10, F - 1).cp(41, F - 1);
  // S2: two pits with lasers in the middle
  L.ground(53, 62, F).ground(74, 112, F);
  L.laser(49, 16, 6, 'v', .4, 3, .45).cp(56, F - 1);
  L.crystal(67, F - 3).laser(70, 16, 6, 'v', 1.5, 3, .45);
  L.cp(78, F - 1);
  // S3: the grid room: climb past four sweeping beams
  L.block(89, 0, 111, 3).block(89, 3, 1, 15).block(121, 8, 1, 14);
  L.ground(112, 166, U).ground(178, 200, U);
  L.block(94, F - 3, 5, 1).block(104, F - 6, 5, 1).block(94, F - 9, 5, 1).block(104, F - 12, 5, 1);
  L.laser(89, 17, 32, 'h', 0, 3, .45).laser(89, 14, 32, 'h', .75, 3, .45).laser(89, 11, 32, 'h', 1.5, 3, .45).laser(89, 8, 32, 'h', 2.25, 3, .45);
  L.block(94, 7, 4, 1).gem(95, 6);
  L.cp(114, U - 1);
  // S4: rhythm corridor (the wave of off-windows travels at running speed)
  for (let i = 0; i < 6; i++) { const x = 126 + i * 5, ph = (((.6 - (x - 121) / 7.34) % 3) + 3) % 3; L.laser(x, 2, 6, 'v', +ph.toFixed(2), 3, .45); }
  L.fill(143, 8, 2, 6, '.').fill(139, 14, 10, 3, '.');      // secret basement under the floor
  L.gem(141, 15);
  L.cp(124, U - 1).cp(158, U - 1);
  // S5: last pit: crystal and a beam
  L.crystal(171, 5).laser(173, 2, 6, 'v', 0, 3, .45);
  L.cp(180, U - 1);
  L.exit(195, U - 1);
  LEVELS.push(L);
})();

// ---------- Act 11 : Windfall ----------
(function () {
  const F = 34;
  const L = Lvl('Windfall', 'Ride the updraft', 190, 40, 'storm');
  L.start(3, F - 1).setPar(60);
  L.ground(0, 41, F);
  // S1: a first fan with a gem on the ledge it lifts you to
  L.fan(12, 24, 3, 10).block(16, 24, 7, 1).gem(19, 23).cp(25, F - 1);
  // S2: the fan shaft; spikes on the walls punish drifting
  L.block(27, 8, 2, 23).block(33, 6, 10, 2).block(33, 8, 2, 26);
  L.fan(30, 7, 2, 27);
  L.rspikes(29, 24, 3).lspikes(32, 18, 3).rspikes(29, 12, 3).lspikes(32, 8, 3);
  // S3: the glider flight
  L.glider(40, 5);
  L.spikes(43, 39, 55);
  L.saw(56, 9).sawV(70, 12, 17, 60).saw(84, 16);
  L.block(64, 16, 3, 1).block(90, 21, 3, 1);
  L.gem(78, 25);
  L.ground(98, 133, 31).cp(100, 30);
  // S4: storm islands
  L.fan(127, 18, 2, 13).block(131, 17, 7, 1);
  L.orb(141, 13);
  L.block(144, 10, 7, 1).cp(146, 9);
  L.fan(148, 4, 2, 6).block(152, 4, 10, 1);
  L.block(158, 12, 2, 1).gem(158, 11).orb(160, 8);
  L.crystal(165, 5);
  L.block(170, 4, 22, 1).sawH(174, 3, 180, 70).cp(172, 3);
  L.exit(186, 3);
  LEVELS.push(L);
})();

// ---------- Act 12 : The Pursuer ----------
(function () {
  const F = 22;
  const L = Lvl('The Pursuer', 'Do not look back', 215, 28, 'inferno');
  L.start(3, F - 1).setPar(55).chaseWall(165, -9, 2.0);
  // S1: warm-up sprint, then a slide gap
  L.ground(0, 37, F).spikes(14, F - 1, 2).spikes(24, F - 1, 3);
  L.block(31, 11, 6, 10);
  // S2: a dash pit and spike beds
  L.ground(44, 72, F).cp(47, F - 1).spikes(52, F - 1, 2).spikes(60, F - 1, 4).gem(62, F - 5).sawH(65, F - 1, 69, 90);
  // S3: the climbing shaft
  L.ground(72, 81, F);
  L.block(74, 6, 2, 14).block(79, 6, 2, 16).block(68, 6, 8, 1);
  L.rspikes(76, 14, 2).lspikes(78, 10, 2);
  L.gem(77, 3);
  // S4: the high run
  L.block(79, 6, 30, 1).cp(84, 5).spikes(88, 5, 3).sawH(96, 5, 100, 80);
  L.crystal(112, 4);
  L.block(117, 6, 12, 1).cp(119, 5);
  // S5: belts and a chasm of crystals
  L.ground(132, 160, F).cp(133, F - 1).belt(136, F, 12, -1).spikes(150, F - 1, 2);
  L.spikes(160, 27, 16);
  L.crystal(163, 19).orb(168, 16).crystal(172, 18);
  L.block(167, 25, 3, 3).spring(168, 24).gem(167, 24);
  L.cp(178, F - 1);
  // S6: final sprint
  L.spikes(184, F - 1, 3).sawH(190, F - 1, 194, 100);
  L.ground(176, 200, F);
  L.ground(208, 215, F).cp(209, F - 1);
  L.exit(212, F - 1);
  LEVELS.push(L);
})();

'use strict';
// World 3: Undertow (acts 13-15).
// ---- World 3 "Undertow": water + breath, red/green light traps, ledge catches, VIP cards and doors, secret trophies ----
Lvl.world = 3;

// ---------- Act 13 : Floodworks ----------
(function () {
  const F = 22;
  const L = Lvl('Floodworks', 'Hold your breath', 180, 30, 'deep');
  L.start(3, F - 1).setPar(70);
  // S1: a pool with spikes on the bottom; a gem between them
  L.ground(0, 20, F).ground(20, 35, F + 6).water(20, F, 15, 6);
  L.spikes(21, F + 5, 7).spikes(30, F + 5, 4).gem(28, F + 4);
  L.coins(4, 18, F - 1, 2).coins(22, 33, F - 2, 3);
  // S2: the first underwater tunnel (14 tiles, about 3 seconds of breath)
  L.ground(35, 48, F).cp(37, F - 1);
  L.ground(48, 68, F + 5).water(48, F, 20, 5).block(51, 12, 14, 11);
  L.coins(52, 63, F + 2, 3);
  // S3: a five-high wall: jump, catch the ledge, climb
  L.ground(68, 80, F).cp(70, F - 1).coins(71, 77, F - 1, 2);
  L.ground(80, 120, F - 5);
  L.block(86, F - 10, 3, 5).gem(87, F - 11);                         // pillar: ledge-catch it for a gem
  // S4: the first red light: stop while it glares
  L.block(100, 0, 1, 9).light(100, 9, 91, 113, 0, 2.6, 1.8);
  L.coins(92, 112, F - 6, 4).cp(114, F - 6);
  // S5: the long dive with one air pocket and a secret air chamber holding the trophy
  L.ground(120, 124, F - 5);
  L.ground(124, 156, F + 5).water(124, F - 5, 32, 10).block(127, 8, 26, 10);
  L.fill(139, 15, 3, 2, '.');                                          // air pocket in the ceiling
  L.spikes(130, F + 4, 6).gem(133, F + 1);
  L.fake(146, 13, 3, 5).trophy(147, 14);                               // looks like ceiling; swim up into it
  L.coins(128, 137, F, 3).coins(143, 152, F, 3);
  // S6: out of the water, a last light and a ledge, then the exit
  L.ground(156, 180, F - 5).cp(158, F - 6);
  L.block(166, 0, 1, 8).light(166, 8, 160, 172, 1.2, 2.2, 1.6);
  L.block(172, F - 10, 8, 5).exit(176, F - 11);
  L.coins(160, 170, F - 6, 2);
  LEVELS.push(L);
})();

// ---------- Act 14 : Red Light ----------
(function () {
  const F = 20;
  const L = Lvl('Red Light', 'Freeze when it glares', 190, 26, 'neon');
  L.start(3, F - 1).setPar(75);
  // S1: one long zone
  L.ground(0, 34, F).block(17, 0, 1, 8).light(17, 8, 8, 30, 0, 2.4, 1.6);
  L.coins(4, 30, F - 1, 3);
  // S2: three ledge-catch pillars under a slow light (hanging still counts as standing still)
  L.ground(37, 82, F).cp(38, F - 1);
  L.block(45, F - 5, 3, 5).block(55, F - 5, 3, 5).block(65, F - 5, 3, 5);
  L.block(56, 0, 1, 7).light(56, 7, 42, 74, .8, 3, 1.6);
  L.gem(56, F - 9).coins(46, 47, F - 6, 1).coins(66, 67, F - 6, 1);
  // S3: the VIP card at the top of a wall-jump shaft
  L.cp(78, F - 1);
  L.block(84, 6, 2, 11).block(89, 4, 2, 16);                           // shaft x86..88
  L.card(87, 6).coins(87, 87, 9, 1).coins(87, 87, 13, 1);
  // S4: the VIP room: a sealed room on the floor; climb over its roof, or open it with the card
  L.ground(91, 140, F).cp(93, F - 1);
  L.block(100, F - 5, 14, 1).block(113, F - 4, 1, 4).door(100, F - 4, 4);
  L.trophy(108, F - 2).gem(104, F - 2).coins(102, 111, F - 1, 3);
  L.gem(156, F - 9);                                                   // over the spike pit, between the last two pillars
  // S5: lights + lasers + crushers
  L.cp(118, F - 1);
  L.block(126, 0, 1, 8).light(126, 8, 118, 136, .5, 2.2, 1.6);
  L.block(122, 0, 1, F - 6).laser(122, F - 7, 7, 'v', 0, 3, .45);
  L.fill(131, 0, 2, F - 4).crusher(131, F - 4, 2, 3, 1.4);
  L.ground(140, 190, F).cp(142, F - 1);
  L.block(150, F - 5, 4, 5).block(160, F - 5, 4, 5);
  L.block(157, 0, 1, 7).light(157, 7, 146, 170, 0, 2.4, 1.5);
  L.spikes(154, F - 1, 6);
  L.coins(147, 169, F - 7, 3);
  L.exit(186, F - 1);
  LEVELS.push(L);
})();

// ---------- Act 15 : VIP Tower ----------
(function () {
  const L = Lvl('VIP Tower', 'Members only', 50, 62, 'vault');
  L.fill(0, 0, 2, 62).fill(48, 0, 2, 62);
  L.ground(0, 50, 56).start(4, 55).setPar(80);
  // basement: dive under the wall through the flooded pit
  L.water(14, 56, 12, 4).block(19, 48, 2, 9);
  L.coins(4, 12, 55, 2).coins(15, 24, 58, 3).cp(28, 55);
  // ledge-catch stairs under a red light
  L.block(32, 51, 4, 5).block(38, 46, 4, 5);
  L.block(44, 27, 1, 12).light(44, 39, 26, 47, 0, 2.6, 1.6, 36, 56);
  L.gem(40, 43).coins(33, 34, 50, 1).coins(39, 40, 45, 1);
  // walkway B (leftward) with two crushers
  L.block(7, 41, 30, 1).cp(34, 40);
  L.fill(28, 27, 2, 10).crusher(28, 37, 2, 3, 0).fill(19, 27, 2, 10).crusher(19, 37, 2, 3, 1.4);
  L.coins(12, 34, 40, 4);
  // the wall-jump shaft (x7..9); a fake wall at its foot hides the trophy
  L.block(2, 14, 5, 23).block(2, 37, 5, 4).block(2, 41, 5, 1);
  L.fake(2, 37, 5, 4).trophy(3, 39);
  L.block(10, 27, 1, 11);
  L.card(8, 24).coins(8, 8, 32, 1).coins(8, 8, 28, 1);
  // walkway C (rightward): a little pool, a light, and the VIP door to the exit
  L.block(10, 26, 38, 1).cp(12, 25);
  L.block(22, 24, 1, 2).block(29, 24, 1, 2).water(23, 24, 6, 2).gem(26, 25);
  L.block(32, 10, 1, 6).light(32, 16, 11, 41, .5, 2.4, 1.4, 14, 26);
  L.coins(13, 40, 25, 3);
  L.block(42, 21, 6, 1).door(42, 22, 4).exit(45, 25);
  LEVELS.push(L);
})();

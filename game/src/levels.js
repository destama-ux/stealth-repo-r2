'use strict';
/* LAMPBLACK: The Gilded Vault — levels.js
 * One job: the five heist levels (floors of the Gilded Vault) as pure data.
 * Every level lists its wall blocks (cover), shadow zones, lamps, treasures,
 * guard patrol routes, sweeping cameras, laser tripwires, gadget allowance,
 * player start and exit. Coordinates are grid tiles on a 30 x 18 floor;
 * buildHeistLevel expands the compact rows below into the objects the
 * engine consumes. Totals across the campaign: 20 guards, 30 treasures. */

/* expandWallRects: [[x,y,w,h], ...] -> wall block objects in tiles. */
function expandWallRects(rectRows) {
  return rectRows.map(function (row) { return { x: row[0], y: row[1], w: row[2], h: row[3] }; });
}

/* expandShadowRects: [[x,y,w,h], ...] -> shadow zone objects in tiles. */
function expandShadowRects(rectRows) {
  return rectRows.map(function (row) { return { x: row[0], y: row[1], w: row[2], h: row[3] }; });
}

/* expandTreasureList: [[x,y,name,value], ...] -> treasure objects. */
function expandTreasureList(treasureRows) {
  return treasureRows.map(function (row, index) {
    return { id: index, x: row[0], y: row[1], name: row[2], value: row[3], taken: false };
  });
}

/* expandGuardPatrols: [[[x,y],...], ...] -> one patrol route per guard. */
function expandGuardPatrols(patrolRows) {
  return patrolRows.map(function (route) {
    return { route: route.map(function (point) { return { x: point[0], y: point[1] }; }) };
  });
}

/* expandCameraList: [[x,y,baseAngleDeg,sweepDeg], ...] -> camera objects. */
function expandCameraList(cameraRows) {
  return cameraRows.map(function (row) {
    return { x: row[0], y: row[1], baseAngle: row[2] * Math.PI / 180, sweep: row[3] * Math.PI / 180 };
  });
}

/* expandLaserList: [[x1,y1,x2,y2], ...] -> tripwire segments in tiles. */
function expandLaserList(laserRows) {
  return laserRows.map(function (row) { return { x1: row[0], y1: row[1], x2: row[2], y2: row[3] }; });
}

/* expandLampList: [[x,y,radiusTiles], ...] -> lamp objects. */
function expandLampList(lampRows) {
  return lampRows.map(function (row) { return { x: row[0], y: row[1], r: row[2] }; });
}

/* buildHeistLevel: assemble one level definition from its compact rows. */
function buildHeistLevel(rawLevel) {
  return {
    name: rawLevel.name,
    subtitle: rawLevel.subtitle,
    intro: rawLevel.intro,
    requiredLoot: rawLevel.requiredLoot,
    playerStart: { x: rawLevel.start[0], y: rawLevel.start[1] },
    exit: { x: rawLevel.exit[0], y: rawLevel.exit[1] },
    walls: expandWallRects(rawLevel.walls),
    shadows: expandShadowRects(rawLevel.shadows),
    lamps: expandLampList(rawLevel.lamps),
    treasures: expandTreasureList(rawLevel.treasures),
    guards: expandGuardPatrols(rawLevel.patrols),
    cameras: expandCameraList(rawLevel.cameras),
    lasers: expandLaserList(rawLevel.lasers),
    gadgets: { pebble: rawLevel.gadgets[0], smoke: rawLevel.gadgets[1], emp: rawLevel.gadgets[2] },
  };
}

const FIVE_HEISTS = [
  buildHeistLevel({
    name: 'Floor I — The Lobby of Coins',
    subtitle: 'A warm-up vault of brass and lamplight',
    intro: 'Slip past the lobby watch. Take 400 in coin and reach the green lift door.',
    requiredLoot: 400, start: [1, 13], exit: [28, 15],
    walls: [[5, 4, 4, 2], [13, 3, 5, 2], [21, 5, 4, 2], [6, 10, 5, 2], [15, 11, 4, 2], [23, 12, 3, 2], [12, 7, 1, 4], [19, 8, 1, 3]],
    shadows: [[2, 12, 3, 4], [24, 2, 4, 3], [11, 14, 5, 3], [20, 15, 6, 2], [1, 1, 3, 3]],
    lamps: [[7, 2, 4], [16, 6, 4], [25, 9, 4], [18, 14, 4]],
    treasures: [[4, 3, 'Brass Abacus', 100], [11, 5, 'Coin of the First Mint', 150], [20, 4, 'Gilded Teapot', 100], [8, 13, 'Ivory Ledger', 200], [26, 15, 'Lobby Strongbox', 150]],
    patrols: [
      [[3, 2], [11, 2], [11, 6], [3, 6]],
      [[21, 10], [27, 10], [27, 16], [21, 16]],
      [[2, 8], [5, 8], [5, 16], [2, 16]],
    ],
    cameras: [[28, 1, 140, 55]],
    lasers: [[20, 11, 20, 14]],
    gadgets: [2, 1, 1],
  }),
  buildHeistLevel({
    name: 'Floor II — The Portrait Gallery',
    subtitle: 'Paintings watch. So do the cameras.',
    intro: 'The gallery cameras sweep the long hall. Shadows under the portraits are your friends. Take 600.',
    requiredLoot: 600, start: [1, 9], exit: [28, 9],
    walls: [[4, 3, 6, 2], [12, 3, 6, 2], [20, 3, 6, 2], [4, 13, 6, 2], [12, 13, 6, 2], [20, 13, 6, 2], [14, 7, 2, 4], [8, 8, 1, 2], [21, 8, 1, 2]],
    shadows: [[1, 1, 4, 3], [25, 1, 4, 3], [1, 14, 4, 3], [25, 14, 4, 3], [13, 1, 4, 2], [13, 15, 4, 2]],
    lamps: [[7, 6, 4], [22, 6, 4], [7, 12, 4], [22, 12, 4], [15, 9, 3]],
    treasures: [[7, 2, 'Portrait of Duchess Vane', 200], [15, 2, 'Miniature in Gold Leaf', 150], [22, 2, 'The Smiling Forger', 200], [7, 16, 'Landscape with Hidden Saint', 150], [22, 16, 'Portrait of the Vault Keeper', 250], [15, 16, 'Charcoal Madonna', 100]],
    patrols: [
      [[2, 6], [12, 6], [12, 8], [2, 8]],
      [[17, 10], [27, 10], [27, 12], [17, 12]],
      [[6, 11], [6, 16], [10, 16], [10, 11]],
      [[23, 2], [23, 6], [19, 6], [19, 2]],
    ],
    cameras: [[15, 1, 90, 65], [15, 17, 270, 65]],
    lasers: [[11, 7, 11, 10], [18, 7, 18, 10]],
    gadgets: [2, 2, 1],
  }),
  buildHeistLevel({
    name: 'Floor III — The Clockwork Archive',
    subtitle: 'Paper, gears, and patient men with torches',
    intro: 'The archive stacks make a maze of cover. Cross two laser lines and lift 750 in sealed bonds.',
    requiredLoot: 750, start: [2, 16], exit: [27, 1],
    walls: [[4, 4, 2, 9], [8, 2, 2, 9], [12, 6, 2, 9], [16, 2, 2, 9], [20, 6, 2, 9], [24, 2, 2, 9], [6, 14, 2, 1], [14, 3, 2, 1], [22, 13, 2, 1]],
    shadows: [[5, 13, 3, 4], [13, 13, 3, 4], [21, 3, 3, 3], [1, 1, 3, 4], [26, 14, 3, 3]],
    lamps: [[6, 8, 3], [14, 10, 3], [22, 8, 3], [10, 15, 3], [26, 4, 3]],
    treasures: [[6, 2, 'Sealed Bearer Bonds', 250], [10, 13, 'Clockwork Heart', 200], [14, 4, 'Archive Master Key', 150], [18, 13, 'Ledger of Debts', 200], [22, 4, 'Brass Orrery', 250], [27, 9, 'Forged Deed Cache', 150]],
    patrols: [
      [[2, 2], [6, 2], [6, 6], [2, 6]],
      [[10, 8], [14, 8], [14, 12], [10, 12]],
      [[18, 3], [22, 3], [22, 7], [18, 7]],
      [[24, 11], [28, 11], [28, 15], [24, 15]],
    ],
    cameras: [[15, 9, 0, 80]],
    lasers: [[10, 14, 10, 17], [19, 0, 19, 3]],
    gadgets: [3, 2, 1],
  }),
  buildHeistLevel({
    name: 'Floor IV — The Flooded Reliquary',
    subtitle: 'Ankle-deep water. Every step is a ripple of noise.',
    intro: 'Relics under glass, guards on the dry walkways. The centre crossing is watched by two cameras. Take 900.',
    requiredLoot: 900, start: [1, 16], exit: [28, 1],
    walls: [[6, 5, 5, 3], [19, 5, 5, 3], [6, 11, 5, 3], [19, 11, 5, 3], [13, 8, 4, 2], [14, 1, 2, 3], [14, 14, 2, 3]],
    shadows: [[1, 5, 3, 8], [26, 5, 3, 8], [12, 11, 6, 3], [12, 4, 6, 3]],
    lamps: [[8, 3, 4], [21, 3, 4], [8, 15, 4], [21, 15, 4]],
    treasures: [[8, 6, 'Relic of Saint Corin', 250], [21, 6, 'Jeweled Monstrance', 300], [8, 12, 'Drowned Saint Icon', 200], [21, 12, 'Pearl Reliquary', 250], [15, 9, 'The Flood Chalice', 300], [15, 16, 'Pilgrim Ring Cache', 150]],
    patrols: [
      [[3, 3], [12, 3], [12, 5], [3, 5]],
      [[17, 12], [26, 12], [26, 14], [17, 14]],
      [[3, 12], [3, 15], [10, 15], [10, 12]],
      [[20, 2], [27, 2], [27, 5], [20, 5]],
    ],
    cameras: [[1, 1, 55, 50], [28, 16, 235, 50]],
    lasers: [[13, 5, 16, 5], [13, 12, 16, 12]],
    gadgets: [3, 2, 2],
  }),
  buildHeistLevel({
    name: 'Floor V — The Gilded Vault',
    subtitle: 'The heart of it. Everything you have learned, at once.',
    intro: 'Five guards, three cameras, a web of lasers — and the Lampblack Crown. Take 1200 and vanish.',
    requiredLoot: 1200, start: [1, 16], exit: [15, 1],
    walls: [[5, 5, 4, 4], [21, 5, 4, 4], [5, 12, 4, 3], [21, 12, 4, 3], [12, 7, 6, 4], [14, 13, 2, 3], [2, 8, 2, 2], [26, 8, 2, 2]],
    shadows: [[1, 1, 4, 4], [25, 1, 4, 4], [10, 14, 3, 3], [17, 14, 3, 3], [10, 2, 3, 3], [17, 2, 3, 3], [13, 11, 4, 1]],
    lamps: [[10, 5, 4], [19, 5, 4], [7, 10, 3], [22, 10, 3], [15, 15, 4]],
    treasures: [[7, 7, 'Emerald of the Ninth Door', 300], [22, 7, 'Sapphire Regalia', 300], [7, 13, 'Opal Strongbox', 250], [22, 13, 'Ruby Diadem', 300], [15, 9, 'The Lampblack Crown', 500], [3, 3, 'Vault Keeper Signet', 200], [26, 3, 'Golden Astrolabe', 250]],
    patrols: [
      [[2, 6], [10, 6], [10, 10], [2, 10]],
      [[19, 6], [27, 6], [27, 10], [19, 10]],
      [[6, 11], [6, 16], [12, 16], [12, 11]],
      [[18, 11], [24, 11], [24, 16], [18, 16]],
      [[11, 2], [18, 2], [18, 5], [11, 5]],
    ],
    cameras: [[15, 17, 270, 70], [1, 9, 0, 45], [28, 9, 180, 45]],
    lasers: [[11, 7, 11, 10], [18, 7, 18, 10], [13, 13, 16, 13]],
    gadgets: [3, 3, 2],
  }),
];

/* countCampaignTotals: guards and treasures across all five heists. */
function countCampaignTotals() {
  let guards = 0; let treasures = 0;
  for (const level of FIVE_HEISTS) { guards += level.guards.length; treasures += level.treasures.length; }
  return { guards, treasures, levels: FIVE_HEISTS.length };
}

window.LB_LEVELS = { FIVE_HEISTS, countCampaignTotals };

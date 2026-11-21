'use strict';
/* LAMPBLACK: The Gilded Vault — main.js
 * One job: own the game state and the loop. Builds a floor's runtime state
 * from levels.js data, steps the player, guards, cameras, lasers, gadgets
 * and detection each frame, handles treasure pickup, the exit, scoring
 * (loot + time bonus + ghost bonus + 1–3 stars), the campaign across all
 * five floors, the HUD, and the deterministic ?shot= screenshot modes. */

const mainCfg = window.LB_CONFIG;
const mainLevels = window.LB_LEVELS.FIVE_HEISTS;

let gameState = null;
let campaignScore = 0;
let campaignTreasures = 0;
let lastFrameTimeMs = 0;
let shotInfo = { mode: null, seed: 1 };
let endShotResult = null;

/* tilesRectToPixels: expand a tile rect (plus the map border) to pixels. */
function tilesRectToPixels(rect) {
  const tile = mainCfg.TILE_SIZE_PX;
  return { x: rect.x * tile, y: rect.y * tile, w: rect.w * tile, h: rect.h * tile };
}

/* buildBorderWallRectsTiles: the outer walls of every floor. */
function buildBorderWallRectsTiles() {
  return [
    { x: 0, y: 0, w: mainCfg.GRID_COLUMNS, h: 1 },
    { x: 0, y: mainCfg.GRID_ROWS - 1, w: mainCfg.GRID_COLUMNS, h: 1 },
    { x: 0, y: 0, w: 1, h: mainCfg.GRID_ROWS },
    { x: mainCfg.GRID_COLUMNS - 1, y: 0, w: 1, h: mainCfg.GRID_ROWS },
  ];
}

/* createGuardRuntime: a guard at the first waypoint of its patrol route. */
function createGuardRuntime(patrolDef, rng) {
  const routePx = patrolDef.route.map(function (point) { return mainCfg.tileToPixelCenter(point.x, point.y); });
  return {
    x: routePx[0].x, y: routePx[0].y, angle: 0, routePx,
    waypointIndex: 1 % routePx.length, mode: 'patrol', pauseTimer: 0,
    investigateX: 0, investigateY: 0, searchTimer: 0, searchBaseAngle: 0,
    phase: rng() * Math.PI * 2, seenStrength: 0, lastSeenX: 0, lastSeenY: 0, stuckTimer: 0,
  };
}

/* createCameraRuntime: a camera at its post with a random sweep phase. */
function createCameraRuntime(cameraDef, rng) {
  const post = mainCfg.tileToPixelCenter(cameraDef.x, cameraDef.y);
  return { x: post.x, y: post.y, baseAngle: cameraDef.baseAngle, sweep: cameraDef.sweep, angle: cameraDef.baseAngle, phase: rng() * Math.PI * 2 };
}

/* loadLevelIntoState: build fresh runtime state for one floor index. */
function loadLevelIntoState(levelIndex, seed) {
  const level = mainLevels[levelIndex];
  const rng = mainCfg.createSeededRandomGenerator(seed * 7919 + levelIndex * 131 + 7);
  const wallRectsTiles = buildBorderWallRectsTiles().concat(level.walls);
  const startPx = mainCfg.tileToPixelCenter(level.playerStart.x, level.playerStart.y);
  gameState = {
    screen: 'intro',
    paused: false,
    frozen: false,
    levelIndex,
    level,
    elapsed: 0,
    detection: 0,
    detections: 0,
    loot: 0,
    wasSeenRecently: 0,
    seenByCamera: false,
    playerOnLaser: false,
    pebbleTargeting: false,
    hintTimer: 0,
    hintText: '',
    stepSoundTimer: 0,
    player: { x: startPx.x, y: startPx.y },
    wallRectsPx: wallRectsTiles.map(tilesRectToPixels),
    shadowRectsPx: level.shadows.map(tilesRectToPixels),
    lampsPx: level.lamps.map(function (lamp) {
      const centre = mainCfg.tileToPixelCenter(lamp.x, lamp.y);
      return { x: centre.x, y: centre.y, r: lamp.r };
    }),
    treasures: level.treasures.map(function (treasure) {
      const centre = mainCfg.tileToPixelCenter(treasure.x, treasure.y);
      return { id: treasure.id, name: treasure.name, value: treasure.value, x: centre.x, y: centre.y, taken: false };
    }),
    guards: level.guards.map(function (patrolDef) { return createGuardRuntime(patrolDef, rng); }),
    cameras: level.cameras.map(function (cameraDef) { return createCameraRuntime(cameraDef, rng); }),
    lasersPx: level.lasers.map(function (laser) {
      const a = mainCfg.tileToPixelCenter(laser.x1, laser.y1);
      const b = mainCfg.tileToPixelCenter(laser.x2, laser.y2);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
    exitPx: tilesRectToPixels({ x: level.exit.x, y: level.exit.y, w: 1, h: 1 }),
    gadgets: { pebble: level.gadgets.pebble, smoke: level.gadgets.smoke, emp: level.gadgets.emp },
    smokeTimer: 0, smokeX: 0, smokeY: 0, empTimer: 0, pebbleMark: null,
    lastResult: null,
  };
  return gameState;
}

/* restartCurrentLevel: rebuild the floor, keeping the detection count so
 * the ghost bonus stays lost once a floor has caught you. */
function restartCurrentLevel() {
  const detections = gameState ? gameState.detections : 0;
  loadLevelIntoState(gameState ? gameState.levelIndex : 0, shotInfo.seed);
  gameState.detections = detections;
  gameState.screen = 'play';
}

/* computeLevelResult: score a finished floor — loot, time bonus, ghost
 * bonus (zero full detections) and a 1–3 star rating. */
function computeLevelResult(state) {
  const timeBonus = Math.max(0, Math.round(600 - state.elapsed * 2));
  const ghost = state.detections === 0;
  const ghostBonus = ghost ? 300 : 0;
  let stars = 1;
  if (state.loot >= state.level.requiredLoot + 150) stars += 1;
  if (ghost) stars += 1;
  stars = Math.min(3, stars);
  const taken = state.treasures.filter(function (t) { return t.taken; }).length;
  return {
    isFinal: state.levelIndex === mainLevels.length - 1,
    stars, loot: state.loot, timeBonus, ghostBonus, ghost,
    levelScore: state.loot + timeBonus + ghostBonus,
    totalScore: campaignScore + state.loot + timeBonus + ghostBonus,
    treasuresTaken: taken, treasuresTotal: state.treasures.length,
  };
}

/* completeCurrentLevel: bank the floor's score and show its result card. */
function completeCurrentLevel() {
  const result = computeLevelResult(gameState);
  gameState.lastResult = result;
  campaignScore = result.totalScore;
  campaignTreasures += result.treasuresTaken;
  gameState.screen = result.isFinal ? 'victory' : 'complete';
  window.LB_AUDIO.playLevelCompleteSound();
}

/* advanceFromScreen: Enter/click behaviour per screen. */
function advanceFromScreen() {
  if (!gameState) return;
  if (gameState.screen === 'title') {
    gameState.screen = 'intro';
    window.LB_AUDIO.playUiClickSound();
  } else if (gameState.screen === 'intro') {
    gameState.screen = 'play';
    window.LB_AUDIO.playUiClickSound();
  } else if (gameState.screen === 'caught') {
    restartCurrentLevel();
  } else if (gameState.screen === 'complete') {
    loadLevelIntoState(gameState.levelIndex + 1, shotInfo.seed);
    gameState.screen = 'intro';
  } else if (gameState.screen === 'victory') {
    campaignScore = 0; campaignTreasures = 0;
    loadLevelIntoState(0, shotInfo.seed);
    gameState.screen = 'title';
  }
}

/* handleActionCommand: one-shot keys from input.js (gadgets, pause, ...). */
function handleActionCommand(action) {
  if (!gameState) return;
  if (action === 'advance') { advanceFromScreen(); return; }
  if (action === 'mute') {
    const muted = window.LB_AUDIO.toggleAudioMuted();
    showHint(muted ? 'Sound muted' : 'Sound on');
    return;
  }
  if (gameState.screen !== 'play') return;
  if (action === 'pause') { gameState.paused = !gameState.paused; return; }
  if (action === 'restart') { restartCurrentLevel(); return; }
  if (gameState.paused) return;
  if (action === 'pebble-mode') {
    if (gameState.gadgets.pebble > 0) {
      gameState.pebbleTargeting = true;
      showHint('Pebble ready — click where it should land');
    } else showHint('No pebbles left on this floor');
  }
  if (action === 'smoke') {
    if (!window.LB_GADGETS.deploySmokeBomb(gameState)) showHint('No smoke bombs left');
  }
  if (action === 'emp') {
    if (!window.LB_GADGETS.fireEmpCharge(gameState)) showHint('No EMP charges left');
    else showHint('EMP! Cameras and lasers are dark');
  }
}

/* showHint: transient message in the HUD and state. */
function showHint(text) {
  if (!gameState) return;
  gameState.hintText = text;
  gameState.hintTimer = 2.6;
}

/* updatePlayerMovement: WASD/arrows with wall collision, plus the soft
 * footstep tick that gives away your own position to your ears. */
function updatePlayerMovement(dt) {
  const move = window.LB_INPUT.readMovementVector();
  if (!move.moving) return;
  const step = mainCfg.PLAYER_SPEED_PX_PER_SEC * dt;
  const nextX = gameState.player.x + move.dx * step;
  const nextY = gameState.player.y + move.dy * step;
  if (!window.LB_GUARDS.circleHitsWalls(gameState.wallRectsPx, nextX, gameState.player.y, mainCfg.PLAYER_RADIUS_PX)) gameState.player.x = nextX;
  if (!window.LB_GUARDS.circleHitsWalls(gameState.wallRectsPx, gameState.player.x, nextY, mainCfg.PLAYER_RADIUS_PX)) gameState.player.y = nextY;
  gameState.stepSoundTimer -= dt;
  if (gameState.stepSoundTimer <= 0) {
    gameState.stepSoundTimer = 0.34;
    window.LB_AUDIO.playPebbleClink();
  }
}

/* updateTreasurePickup: walking over a treasure steals it. */
function updateTreasurePickup() {
  for (const treasure of gameState.treasures) {
    if (treasure.taken) continue;
    if (Math.hypot(treasure.x - gameState.player.x, treasure.y - gameState.player.y) < 22) {
      treasure.taken = true;
      gameState.loot += treasure.value;
      showHint('Stole ' + treasure.name + ' (+' + treasure.value + ')');
      window.LB_AUDIO.playTreasurePickupSound();
    }
  }
}

/* updateExitAndCaught: reaching the exit with the loot target completes
 * the floor; a full detection meter means caught. */
function updateExitAndCaught(dt) {
  const exit = gameState.exitPx;
  const insideExit = gameState.player.x > exit.x && gameState.player.x < exit.x + exit.w &&
    gameState.player.y > exit.y && gameState.player.y < exit.y + exit.h;
  if (insideExit) {
    if (gameState.loot >= gameState.level.requiredLoot) { completeCurrentLevel(); return; }
    if (gameState.hintTimer <= 0) showHint('The lift needs ' + gameState.level.requiredLoot + ' loot — you carry ' + gameState.loot);
  }
  const caught = window.LB_GUARDS.updateDetectionMeter(gameState, dt);
  if (window.LB_GUARDS.checkLaserTripwires(gameState)) {
    window.LB_AUDIO.playAlarmStingSound();
    showHint('Laser tripped! Detection surges');
  }
  if (caught) {
    gameState.detections += 1;
    gameState.screen = 'caught';
    window.LB_AUDIO.playCaughtSound();
  }
}

/* updatePlayFrame: one simulation step while the floor is live. */
function updatePlayFrame(dt) {
  gameState.elapsed += dt;
  if (gameState.hintTimer > 0) gameState.hintTimer -= dt;
  updatePlayerMovement(dt);
  const click = window.LB_INPUT.consumeCanvasClick();
  if (click && gameState.pebbleTargeting) {
    window.LB_GADGETS.throwPebbleToPoint(gameState, click.x, click.y);
    gameState.pebbleTargeting = false;
  }
  for (const guard of gameState.guards) window.LB_GUARDS.updateOneGuard(gameState, guard, dt);
  window.LB_GUARDS.updateCamerasSweep(gameState, dt);
  window.LB_GADGETS.updateGadgetTimers(gameState, dt);
  updateTreasurePickup();
  updateExitAndCaught(dt);
}

/* updateHudDom: mirror state into the DOM HUD above the canvas. */
function updateHudDom() {
  if (!gameState) return;
  const setText = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText('hud-level', gameState.level.name);
  setText('hud-loot', 'Loot ' + gameState.loot + ' / ' + gameState.level.requiredLoot);
  setText('hud-gadgets', 'Pebble ' + gameState.gadgets.pebble + ' · Smoke ' + gameState.gadgets.smoke + ' · EMP ' + gameState.gadgets.emp +
    (gameState.empTimer > 0 ? ' · EMP ' + gameState.empTimer.toFixed(0) + 's' : ''));
  setText('hud-score', 'Score ' + (campaignScore + gameState.loot));
  setText('hud-hint', gameState.hintTimer > 0 ? gameState.hintText : (window.LB_GUARDS.pointInShadow(gameState, gameState.player.x, gameState.player.y) ? 'You are hidden in shadow' : ''));
  const fill = document.getElementById('hud-detection-fill');
  if (fill) {
    fill.style.width = gameState.detection.toFixed(0) + '%';
    fill.style.background = gameState.detection > 66 ? '#ff4030' : gameState.detection > 33 ? '#ffb03a' : '#3fd68c';
  }
}

/* renderCurrentFrame: draw whichever screen the state is on. */
function renderCurrentFrame(ctx) {
  const render = window.LB_RENDER;
  if (gameState.screen === 'title') render.drawTitleScreenScene(ctx, gameState);
  else if (gameState.screen === 'intro') render.drawLevelIntroCard(ctx, gameState);
  else if (gameState.screen === 'caught') render.drawCaughtOverlay(ctx, gameState);
  else if (gameState.screen === 'complete') render.drawLevelCompleteScreenScene(ctx, gameState, gameState.lastResult);
  else if (gameState.screen === 'victory') render.drawVictoryScreenScene(ctx, gameState, gameState.lastResult || endShotResult);
  else {
    render.drawPlayScene(ctx, gameState);
    if (gameState.paused) render.drawPausedOverlay(ctx, gameState);
  }
}

/* mainAnimationLoop: requestAnimationFrame driver with a clamped step. */
function mainAnimationLoop(ctx, timestampMs) {
  const dt = Math.min(0.05, Math.max(0, (timestampMs - lastFrameTimeMs) / 1000 || 0));
  lastFrameTimeMs = timestampMs;
  if (gameState && !gameState.frozen) {
    if (gameState.screen === 'play' && !gameState.paused) updatePlayFrame(dt);
    else if (gameState.screen === 'title' || gameState.screen === 'intro') gameState.elapsed += dt * 0.25;
  }
  if (gameState) {
    renderCurrentFrame(ctx);
    updateHudDom();
  }
  requestAnimationFrame(function (nextMs) { mainAnimationLoop(ctx, nextMs); });
}

/* setupShotModeIfRequested: freeze a deterministic frame for screenshots. */
function setupShotModeIfRequested() {
  if (!shotInfo.mode) return;
  const rng = mainCfg.createSeededRandomGenerator(shotInfo.seed * 4243 + 11);
  if (shotInfo.mode === 'start') {
    window.LB_SHOTS.poseGuardsMidPatrol(gameState, rng);
    gameState.screen = 'title';
    gameState.frozen = true;
    gameState.elapsed = 9;
  } else if (shotInfo.mode === 'play') {
    window.LB_SHOTS.applyPlayShotPose(gameState, rng);
    gameState.screen = 'play';
    gameState.frozen = true;
  } else if (shotInfo.mode === 'end') {
    window.LB_SHOTS.poseGuardsMidPatrol(gameState, rng);
    endShotResult = window.LB_SHOTS.buildEndShotResult(gameState);
    gameState.lastResult = endShotResult;
    gameState.screen = 'victory';
    gameState.frozen = true;
    gameState.elapsed = 9;
  }
}

/* bootLampblackGame: entry point — canvas, input, first floor, loop. */
function bootLampblackGame() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  shotInfo = window.LB_SHOTS.parseShotModeFromUrl(window.location.search);
  loadLevelIntoState(0, shotInfo.seed);
  gameState.screen = 'title';
  window.LB_INPUT.bindInputToCanvas(canvas, {
    onAction: handleActionCommand,
    // Any first gesture unlocks WebAudio (browsers require one before a
    // context may start), so bleeps work from the first keypress onward.
    onAnyKey: function () { window.LB_AUDIO.unlockAudioOnFirstGesture(); },
  });
  canvas.addEventListener('mousedown', function () {
    if (gameState && gameState.screen !== 'play') advanceFromScreen();
  });
  bindHudButtons();
  setupShotModeIfRequested();
  requestAnimationFrame(function (ms) { mainAnimationLoop(ctx, ms); });
}

/* bindHudButtons: pause / restart / mute buttons in the HUD bar. */
function bindHudButtons() {
  const bind = function (id, action) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { handleActionCommand(action); });
  };
  bind('btn-pause', 'pause');
  bind('btn-restart', 'restart');
  bind('btn-mute', 'mute');
}

document.addEventListener('DOMContentLoaded', bootLampblackGame);

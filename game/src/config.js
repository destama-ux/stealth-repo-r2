'use strict';
/* LAMPBLACK: The Gilded Vault — config.js
 * One job: every shared constant of the game (grid, palette, tuning) plus the
 * seeded random generator that makes screenshot modes deterministic.
 * Loaded first; every other script reads window.LB_CONFIG from here. */

const TILE_SIZE_PX = 32;
const GRID_COLUMNS = 30;
const GRID_ROWS = 18;
const CANVAS_WIDTH_PX = TILE_SIZE_PX * GRID_COLUMNS;   // 960
const CANVAS_HEIGHT_PX = TILE_SIZE_PX * GRID_ROWS;     // 576

const PLAYER_SPEED_PX_PER_SEC = 148;
const PLAYER_RADIUS_PX = 11;
const GUARD_SPEED_PX_PER_SEC = 62;
const GUARD_INVESTIGATE_SPEED_PX_PER_SEC = 96;
const GUARD_VISION_RANGE_PX = 168;
const GUARD_VISION_HALF_ANGLE_RAD = 0.62;              // ~71 degree cone
const SHADOW_VISION_RANGE_PX = 34;                     // hidden in shadow past ~1 tile
const CAMERA_VISION_RANGE_PX = 150;
const CAMERA_VISION_HALF_ANGLE_RAD = 0.5;

const DETECTION_MAX = 100;
const DETECTION_GAIN_PER_SEC = 46;                     // guard eyes on you
const DETECTION_CAMERA_GAIN_PER_SEC = 62;              // cameras fill it faster
const DETECTION_DECAY_PER_SEC = 26;                    // break line of sight to recover
const LASER_DETECTION_PENALTY = 55;

const SMOKE_RADIUS_PX = 118;
const SMOKE_DURATION_SEC = 4.5;
const EMP_DURATION_SEC = 7;
const PEBBLE_NOISE_RADIUS_PX = 230;

const PALETTE_DEEP_NIGHT = {
  floorA: '#23202b', floorB: '#272433', floorLine: '#1b1924',
  shadowFill: 'rgba(5,6,14,0.62)', shadowEdge: '#0a0b18',
  wallFace: '#4a4258', wallTop: '#6b5f7d', wallEdge: '#17131f',
  lampGlow: 'rgba(255,186,92,', lampCore: '#ffd489',
  coneCalm: 'rgba(255,214,120,0.20)', coneAlert: 'rgba(255,84,60,0.34)',
  coneCamera: 'rgba(120,190,255,0.20)',
  treasureGold: '#ffcf5a', treasureSpark: '#fff3b0',
  exitGreen: '#3fd68c', playerTeal: '#39d0c4', guardRed: '#c8433c',
  guardUniform: '#7e2f35', laserRed: '#ff3b30', textCream: '#f3e9d2',
};

/* createSeededRandomGenerator: mulberry32 — same seed, same stream, always. */
function createSeededRandomGenerator(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandomFloat() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* tileToPixelCenter: grid tile (col,row) -> pixel centre of that tile. */
function tileToPixelCenter(tileX, tileY) {
  return { x: tileX * TILE_SIZE_PX + TILE_SIZE_PX / 2, y: tileY * TILE_SIZE_PX + TILE_SIZE_PX / 2 };
}

/* parseSeedFromUrl: ?seed=123 -> 123 (defaults to 1). */
function parseSeedFromUrl(searchText) {
  const params = new URLSearchParams(searchText || '');
  const raw = parseInt(params.get('seed') || '1', 10);
  return Number.isFinite(raw) ? raw : 1;
}

window.LB_CONFIG = {
  TILE_SIZE_PX, GRID_COLUMNS, GRID_ROWS, CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX,
  PLAYER_SPEED_PX_PER_SEC, PLAYER_RADIUS_PX,
  GUARD_SPEED_PX_PER_SEC, GUARD_INVESTIGATE_SPEED_PX_PER_SEC,
  GUARD_VISION_RANGE_PX, GUARD_VISION_HALF_ANGLE_RAD,
  SHADOW_VISION_RANGE_PX, CAMERA_VISION_RANGE_PX, CAMERA_VISION_HALF_ANGLE_RAD,
  DETECTION_MAX, DETECTION_GAIN_PER_SEC, DETECTION_CAMERA_GAIN_PER_SEC,
  DETECTION_DECAY_PER_SEC, LASER_DETECTION_PENALTY,
  SMOKE_RADIUS_PX, SMOKE_DURATION_SEC, EMP_DURATION_SEC, PEBBLE_NOISE_RADIUS_PX,
  PALETTE_DEEP_NIGHT, createSeededRandomGenerator, tileToPixelCenter, parseSeedFromUrl,
};

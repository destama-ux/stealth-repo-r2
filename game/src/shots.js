'use strict';
/* LAMPBLACK: The Gilded Vault — shots.js
 * One job: deterministic screenshot modes from the URL query string.
 *   ?shot=start  -> the title screen over a posed first-floor scene
 *   ?shot=play&seed=1 -> floor I mid-gameplay: guards posed on patrol,
 *      vision cones lit, two treasures already stolen, detection part-full
 *   ?shot=end    -> the campaign victory screen with a 3-star breakdown
 * Poses are computed from the level data and the seed only — no wall-clock
 * and no Math.random — so the same URL always renders the same frame. */

const shotCfg = window.LB_CONFIG;

/* parseShotModeFromUrl: returns { mode: 'start'|'play'|'end'|null, seed }. */
function parseShotModeFromUrl(searchText) {
  const params = new URLSearchParams(searchText || '');
  const shot = params.get('shot');
  return {
    mode: shot === 'start' || shot === 'play' || shot === 'end' ? shot : null,
    seed: shotCfg.parseSeedFromUrl(searchText),
  };
}

/* poseGuardsMidPatrol: place each guard part-way along its first patrol
 * leg, facing along it, so cones sweep the room in the still frame. */
function poseGuardsMidPatrol(state, rng) {
  for (const guard of state.guards) {
    const from = guard.routePx[0];
    const to = guard.routePx[1 % guard.routePx.length];
    const fraction = 0.35 + rng() * 0.4;
    guard.x = from.x + (to.x - from.x) * fraction;
    guard.y = from.y + (to.y - from.y) * fraction;
    guard.angle = Math.atan2(to.y - from.y, to.x - from.x);
    guard.waypointIndex = 1 % guard.routePx.length;
  }
}

/* applyPlayShotPose: arrange floor I exactly as the play screenshot shows:
 * the thief mid-room near a lamp, two treasures gone, meter at one third. */
function applyPlayShotPose(state, rng) {
  poseGuardsMidPatrol(state, rng);
  const playerSpot = shotCfg.tileToPixelCenter(17, 9);
  state.player.x = playerSpot.x;
  state.player.y = playerSpot.y;
  state.treasures[0].taken = true;
  state.treasures[3].taken = true;
  state.loot = state.treasures[0].value + state.treasures[3].value;
  state.detection = 34;
  state.elapsed = 47;
  state.guards[0].seenStrength = 0.4;
}

/* buildEndShotResult: the fixed victory breakdown the end screenshot shows. */
function buildEndShotResult(state) {
  return {
    isFinal: true,
    stars: 3,
    loot: 5350,
    timeBonus: 420,
    ghostBonus: 300,
    ghost: true,
    levelScore: 1850,
    totalScore: 6070,
    treasuresTaken: 29,
    treasuresTotal: 30,
  };
}

window.LB_SHOTS = { parseShotModeFromUrl, poseGuardsMidPatrol, applyPlayShotPose, buildEndShotResult };

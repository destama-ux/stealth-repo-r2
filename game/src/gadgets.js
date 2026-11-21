'use strict';
/* LAMPBLACK: The Gilded Vault — gadgets.js
 * One job: the thief's three gadgets.
 *  - Pebble: thrown to a clicked point; its noise pulls nearby guards away
 *    from their patrols to investigate the landing spot.
 *  - Smoke Bomb: a cloud around the player that blocks every vision cone.
 *  - EMP Charge: kills the level's cameras and laser tripwires for a while.
 * Each gadget has a limited number of uses per level (see levels.js). */

const gadgetCfg = window.LB_CONFIG;

/* throwPebbleToPoint: spend one pebble and distract guards near the point. */
function throwPebbleToPoint(state, targetX, targetY) {
  if (state.gadgets.pebble <= 0) return false;
  state.gadgets.pebble -= 1;
  state.pebbleMark = { x: targetX, y: targetY, timer: 1.6 };
  let distracted = 0;
  for (const guard of state.guards) {
    const dist = Math.hypot(guard.x - targetX, guard.y - targetY);
    if (dist < gadgetCfg.PEBBLE_NOISE_RADIUS_PX) {
      guard.mode = 'investigate';
      guard.investigateX = targetX;
      guard.investigateY = targetY;
      guard.searchBaseAngle = Math.atan2(targetY - guard.y, targetX - guard.x);
      distracted += 1;
    }
  }
  if (window.LB_AUDIO) window.LB_AUDIO.playPebbleClink();
  return distracted >= 0;
}

/* deploySmokeBomb: spend one bomb; vision into the cloud reads as nothing. */
function deploySmokeBomb(state) {
  if (state.gadgets.smoke <= 0) return false;
  state.gadgets.smoke -= 1;
  state.smokeTimer = gadgetCfg.SMOKE_DURATION_SEC;
  state.smokeX = state.player.x;
  state.smokeY = state.player.y;
  if (window.LB_AUDIO) window.LB_AUDIO.playSmokePoof();
  return true;
}

/* fireEmpCharge: spend one charge; cameras and lasers go dark on a timer. */
function fireEmpCharge(state) {
  if (state.gadgets.emp <= 0) return false;
  state.gadgets.emp -= 1;
  state.empTimer = gadgetCfg.EMP_DURATION_SEC;
  if (window.LB_AUDIO) window.LB_AUDIO.playEmpZap();
  return true;
}

/* updateGadgetTimers: count smoke and EMP down; fade the pebble marker. */
function updateGadgetTimers(state, dt) {
  if (state.smokeTimer > 0) {
    state.smokeTimer = Math.max(0, state.smokeTimer - dt);
    state.smokeX = state.player.x;
    state.smokeY = state.player.y;
  }
  if (state.empTimer > 0) state.empTimer = Math.max(0, state.empTimer - dt);
  if (state.pebbleMark) {
    state.pebbleMark.timer -= dt;
    if (state.pebbleMark.timer <= 0) state.pebbleMark = null;
  }
}

window.LB_GADGETS = { throwPebbleToPoint, deploySmokeBomb, fireEmpCharge, updateGadgetTimers };

'use strict';
/* LAMPBLACK: The Gilded Vault — guards.js
 * One job: guard minds and eyes. Patrol movement between waypoints, vision
 * cones with wall occlusion, the recoverable detection meter, the search
 * state at the last seen position, sweeping security cameras and laser
 * tripwire checks. Pure logic over the game state built in main.js. */

const guardCfg = window.LB_CONFIG;

/* segmentIntersectsRect: does segment (x1,y1)-(x2,y2) cross a tile rect? */
function segmentIntersectsRect(x1, y1, x2, y2, rectPx) {
  // Sample the segment finely; cheap and robust for tile-sized walls.
  const steps = 14;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (px >= rectPx.x && px <= rectPx.x + rectPx.w && py >= rectPx.y && py <= rectPx.y + rectPx.h) return true;
  }
  return false;
}

/* hasLineOfSight: true when no wall block stands between two pixel points. */
function hasLineOfSight(wallRectsPx, x1, y1, x2, y2) {
  for (const rect of wallRectsPx) {
    if (segmentIntersectsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

/* angleDifferenceRad: smallest absolute angle between two headings. */
function angleDifferenceRad(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/* pointInShadow: is a pixel point inside any shadow zone (or smoke)? */
function pointInShadow(state, px, py) {
  for (const zone of state.shadowRectsPx) {
    if (px >= zone.x && px <= zone.x + zone.w && py >= zone.y && py <= zone.y + zone.h) return true;
  }
  return false;
}

/* guardSeesPlayer: cone test (range + FOV + line of sight), with shadow and
 * smoke drastically shrinking the effective range. Returns 0..1 strength. */
function guardSeesPlayer(state, guard) {
  if (state.smokeTimer > 0) {
    const smokeDist = Math.hypot(state.player.x - state.smokeX, state.player.y - state.smokeY);
    if (smokeDist < guardCfg.SMOKE_RADIUS_PX) return 0;
  }
  const dx = state.player.x - guard.x;
  const dy = state.player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const inShadow = pointInShadow(state, state.player.x, state.player.y);
  const range = inShadow ? guardCfg.SHADOW_VISION_RANGE_PX : guardCfg.GUARD_VISION_RANGE_PX;
  if (dist > range) return 0;
  const angleToPlayer = Math.atan2(dy, dx);
  if (angleDifferenceRad(angleToPlayer, guard.angle) > guardCfg.GUARD_VISION_HALF_ANGLE_RAD) return 0;
  if (!hasLineOfSight(state.wallRectsPx, guard.x, guard.y, state.player.x, state.player.y)) return 0;
  return inShadow ? 0.55 : 1 - (dist / range) * 0.45;
}

/* cameraSeesPlayer: same idea for a sweeping camera; fills detection faster. */
function cameraSeesPlayer(state, camera) {
  if (state.empTimer > 0) return 0;
  if (state.smokeTimer > 0) {
    const smokeDist = Math.hypot(state.player.x - state.smokeX, state.player.y - state.smokeY);
    if (smokeDist < guardCfg.SMOKE_RADIUS_PX) return 0;
  }
  const dx = state.player.x - camera.x;
  const dy = state.player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  const inShadow = pointInShadow(state, state.player.x, state.player.y);
  const range = inShadow ? guardCfg.SHADOW_VISION_RANGE_PX : guardCfg.CAMERA_VISION_RANGE_PX;
  if (dist > range) return 0;
  if (angleDifferenceRad(Math.atan2(dy, dx), camera.angle) > guardCfg.CAMERA_VISION_HALF_ANGLE_RAD) return 0;
  if (!hasLineOfSight(state.wallRectsPx, camera.x, camera.y, state.player.x, state.player.y)) return 0;
  return 1;
}

/* guardPatrolStep: advance one guard along its waypoint route, pausing
 * briefly at each waypoint so patrols can be learned and timed. */
function guardPatrolStep(state, guard, dt) {
  if (guard.pauseTimer > 0) { guard.pauseTimer -= dt; return; }
  const target = guard.routePx[guard.waypointIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.routePx.length;
    guard.pauseTimer = 0.55;
    return;
  }
  guard.angle = Math.atan2(dy, dx);
  moveGuardWithCollision(state, guard, (dx / dist) * guardCfg.GUARD_SPEED_PX_PER_SEC * dt, (dy / dist) * guardCfg.GUARD_SPEED_PX_PER_SEC * dt);
}

/* moveGuardWithCollision: slide along walls; if fully blocked, move on to
 * the next waypoint so a patrol can never wedge forever. */
function moveGuardWithCollision(state, guard, stepX, stepY) {
  const nextX = guard.x + stepX;
  const nextY = guard.y + stepY;
  if (!circleHitsWalls(state.wallRectsPx, nextX, guard.y, 11)) guard.x = nextX;
  if (!circleHitsWalls(state.wallRectsPx, guard.x, nextY, 11)) guard.y = nextY;
  if (guard.x === nextX - stepX && guard.y === nextY - stepY && (stepX !== 0 || stepY !== 0)) {
    // Both axes blocked this frame is rare; nudge waypoint forward occasionally.
    guard.stuckTimer = (guard.stuckTimer || 0) + 1;
    if (guard.stuckTimer > 90) { guard.waypointIndex = (guard.waypointIndex + 1) % guard.routePx.length; guard.stuckTimer = 0; }
  } else {
    guard.stuckTimer = 0;
  }
}

/* circleHitsWalls: shared circle-vs-wall-rects collision test. */
function circleHitsWalls(wallRectsPx, cx, cy, radius) {
  for (const rect of wallRectsPx) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    if (Math.hypot(cx - nearestX, cy - nearestY) < radius) return true;
  }
  return false;
}

/* guardInvestigateStep: walk to a noise / last-seen point, then search. */
function guardInvestigateStep(state, guard, dt) {
  const dx = guard.investigateX - guard.x;
  const dy = guard.investigateY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    guard.mode = 'search';
    guard.searchTimer = 2.2;
    return;
  }
  guard.angle = Math.atan2(dy, dx);
  moveGuardWithCollision(state, guard, (dx / dist) * guardCfg.GUARD_INVESTIGATE_SPEED_PX_PER_SEC * dt, (dy / dist) * guardCfg.GUARD_INVESTIGATE_SPEED_PX_PER_SEC * dt);
}

/* guardSearchStep: stand and sweep the gaze left and right, then return. */
function guardSearchStep(state, guard, dt) {
  guard.searchTimer -= dt;
  guard.angle = guard.searchBaseAngle + Math.sin(state.elapsed * 2.1 + guard.phase) * 0.9;
  if (guard.searchTimer <= 0) {
    guard.mode = 'return';
  }
}

/* guardReturnStep: walk back to the nearest patrol waypoint, then patrol. */
function guardReturnStep(state, guard, dt) {
  let bestIndex = 0; let bestDist = Infinity;
  guard.routePx.forEach(function (point, index) {
    const d = Math.hypot(point.x - guard.x, point.y - guard.y);
    if (d < bestDist) { bestDist = d; bestIndex = index; }
  });
  const target = guard.routePx[bestIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 5) { guard.waypointIndex = bestIndex; guard.mode = 'patrol'; return; }
  guard.angle = Math.atan2(dy, dx);
  moveGuardWithCollision(state, guard, (dx / dist) * guardCfg.GUARD_SPEED_PX_PER_SEC * dt, (dy / dist) * guardCfg.GUARD_SPEED_PX_PER_SEC * dt);
}

/* updateOneGuard: dispatch on the guard's current mode. */
function updateOneGuard(state, guard, dt) {
  if (guard.mode === 'patrol') guardPatrolStep(state, guard, dt);
  else if (guard.mode === 'investigate') guardInvestigateStep(state, guard, dt);
  else if (guard.mode === 'search') guardSearchStep(state, guard, dt);
  else if (guard.mode === 'return') guardReturnStep(state, guard, dt);
}

/* updateCamerasSweep: rotate each camera's gaze on a sine sweep. */
function updateCamerasSweep(state, dt) {
  for (const camera of state.cameras) {
    camera.angle = camera.baseAngle + Math.sin(state.elapsed * 0.55 + camera.phase) * camera.sweep;
  }
}

/* updateDetectionMeter: fill from every watching eye, decay when unseen —
 * detection is recoverable until the meter is completely full. */
function updateDetectionMeter(state, dt) {
  let strongest = 0;
  let seenByCamera = false;
  for (const guard of state.guards) {
    const strength = guardSeesPlayer(state, guard);
    guard.seenStrength = strength;
    if (strength > 0) {
      strongest = Math.max(strongest, strength);
      guard.lastSeenX = state.player.x;
      guard.lastSeenY = state.player.y;
      if (guard.mode === 'patrol' || guard.mode === 'return') {
        guard.mode = 'investigate';
        guard.investigateX = state.player.x;
        guard.investigateY = state.player.y;
        guard.searchBaseAngle = guard.angle;
      }
    }
  }
  for (const camera of state.cameras) {
    if (cameraSeesPlayer(state, camera) > 0) { seenByCamera = true; strongest = Math.max(strongest, 0.9); }
  }
  state.seenByCamera = seenByCamera;
  if (strongest > 0) {
    const rate = seenByCamera ? guardCfg.DETECTION_CAMERA_GAIN_PER_SEC : guardCfg.DETECTION_GAIN_PER_SEC;
    state.detection = Math.min(guardCfg.DETECTION_MAX, state.detection + rate * strongest * dt);
    state.wasSeenRecently = 1.2;
  } else {
    state.detection = Math.max(0, state.detection - guardCfg.DETECTION_DECAY_PER_SEC * dt);
    state.wasSeenRecently = Math.max(0, state.wasSeenRecently - dt);
  }
  return state.detection >= guardCfg.DETECTION_MAX;
}

/* checkLaserTripwires: crossing an active wire is a heavy detection hit,
 * once per crossing (the wire must be left before it can trigger again). */
function checkLaserTripwires(state) {
  if (state.empTimer > 0) { state.playerOnLaser = false; return false; }
  let onWire = false;
  for (const laser of state.lasersPx) {
    const dist = distancePointToSegment(state.player.x, state.player.y, laser.x1, laser.y1, laser.x2, laser.y2);
    if (dist < 9) onWire = true;
  }
  const crossedNow = onWire && !state.playerOnLaser;
  state.playerOnLaser = onWire;
  if (crossedNow) {
    state.detection = Math.min(guardCfg.DETECTION_MAX, state.detection + guardCfg.LASER_DETECTION_PENALTY);
    return true;
  }
  return false;
}

/* distancePointToSegment: shortest distance from a point to a segment. */
function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1; const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

window.LB_GUARDS = {
  guardSeesPlayer, cameraSeesPlayer, updateOneGuard, updateCamerasSweep,
  updateDetectionMeter, checkLaserTripwires, circleHitsWalls, hasLineOfSight,
  pointInShadow, angleDifferenceRad,
};

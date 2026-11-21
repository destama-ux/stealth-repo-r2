'use strict';
/* LAMPBLACK: The Gilded Vault — render.js
 * One job: draw everything. The lamplit floor and its shadow zones, wall
 * cover, raycast-clipped vision cones for guards and cameras, laser wires,
 * treasures, the exit door, the thief, gadget effects, and every screen
 * (title, intro, caught, level complete, campaign victory) on the canvas
 * itself — so screenshots are honest renders of the game. */

const renderCfg = window.LB_CONFIG;
const renderPalette = renderCfg.PALETTE_DEEP_NIGHT;

/* castVisionConePolygon: march rays across the cone; each ray stops at the
 * first wall, so cones bend around cover exactly as the vision test does. */
function castVisionConePolygon(state, originX, originY, facingAngle, halfAngle, rangePx) {
  const points = [{ x: originX, y: originY }];
  const rayCount = 26;
  for (let i = 0; i <= rayCount; i++) {
    const angle = facingAngle - halfAngle + (2 * halfAngle * i) / rayCount;
    const stepX = Math.cos(angle);
    const stepY = Math.sin(angle);
    let travelled = 0;
    let px = originX; let py = originY;
    while (travelled < rangePx) {
      travelled += 6;
      px = originX + stepX * travelled;
      py = originY + stepY * travelled;
      if (pointInsideAnyWall(state, px, py)) break;
    }
    points.push({ x: px, y: py });
  }
  return points;
}

/* pointInsideAnyWall: is a pixel point inside a wall block (or off-map)? */
function pointInsideAnyWall(state, px, py) {
  if (px < 0 || py < 0 || px >= renderCfg.CANVAS_WIDTH_PX || py >= renderCfg.CANVAS_HEIGHT_PX) return true;
  for (const rect of state.wallRectsPx) {
    if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) return true;
  }
  return false;
}

/* drawVisionConeFilled: fill one clipped cone polygon in a given colour. */
function drawVisionConeFilled(ctx, state, originX, originY, facingAngle, halfAngle, rangePx, fillStyle) {
  const polygon = castVisionConePolygon(state, originX, originY, facingAngle, halfAngle, rangePx);
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

/* drawFloorTiles: two-tone checker floor with a faint grid. */
function drawFloorTiles(ctx) {
  const tile = renderCfg.TILE_SIZE_PX;
  for (let row = 0; row < renderCfg.GRID_ROWS; row++) {
    for (let col = 0; col < renderCfg.GRID_COLUMNS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? renderPalette.floorA : renderPalette.floorB;
      ctx.fillRect(col * tile, row * tile, tile, tile);
    }
  }
  ctx.strokeStyle = renderPalette.floorLine;
  ctx.lineWidth = 1;
  for (let col = 0; col <= renderCfg.GRID_COLUMNS; col++) {
    ctx.beginPath(); ctx.moveTo(col * tile, 0); ctx.lineTo(col * tile, renderCfg.CANVAS_HEIGHT_PX); ctx.stroke();
  }
  for (let row = 0; row <= renderCfg.GRID_ROWS; row++) {
    ctx.beginPath(); ctx.moveTo(0, row * tile); ctx.lineTo(renderCfg.CANVAS_WIDTH_PX, row * tile); ctx.stroke();
  }
}

/* drawShadowZones: visibly darker pools where the thief is hard to see. */
function drawShadowZones(ctx, state) {
  for (const zone of state.shadowRectsPx) {
    ctx.fillStyle = renderPalette.shadowFill;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = renderPalette.shadowEdge;
    ctx.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.w - 1, zone.h - 1);
  }
}

/* drawLampLightGlows: warm radial lamplight over floor and shadow alike. */
function drawLampLightGlows(ctx, state) {
  for (const lamp of state.lampsPx) {
    const radius = lamp.r * renderCfg.TILE_SIZE_PX;
    const gradient = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, radius);
    gradient.addColorStop(0, renderPalette.lampGlow + '0.34)');
    gradient.addColorStop(0.55, renderPalette.lampGlow + '0.13)');
    gradient.addColorStop(1, renderPalette.lampGlow + '0)');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = renderPalette.lampCore;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

/* drawWallBlocks: stone cover blocks with a lit top edge. */
function drawWallBlocks(ctx, state) {
  for (const rect of state.wallRectsPx) {
    ctx.fillStyle = renderPalette.wallFace;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = renderPalette.wallTop;
    ctx.fillRect(rect.x, rect.y, rect.w, 4);
    ctx.strokeStyle = renderPalette.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
}

/* drawExitDoor: the green lift door, glowing once the loot target is met. */
function drawExitDoor(ctx, state) {
  const exit = state.exitPx;
  const ready = state.loot >= state.level.requiredLoot;
  ctx.fillStyle = ready ? renderPalette.exitGreen : '#1d4d33';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = ready ? '#b8ffd9' : '#2c7a52';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x + 2, exit.y + 2, exit.w - 4, exit.h - 4);
  ctx.fillStyle = ready ? '#06281a' : '#9fd8bb';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 4);
}

/* drawTreasureGems: gold diamonds with a soft glow; taken ones vanish. */
function drawTreasureGems(ctx, state) {
  for (const treasure of state.treasures) {
    if (treasure.taken) continue;
    const pulse = 1 + Math.sin(state.elapsed * 3 + treasure.id) * 0.12;
    ctx.save();
    ctx.translate(treasure.x, treasure.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(255,207,90,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = renderPalette.treasureGold;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = renderPalette.treasureSpark;
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3.5, 0); ctx.lineTo(0, 5); ctx.lineTo(-3.5, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* drawLaserTripwires: red beams between emitter posts (dark under EMP). */
function drawLaserTripwires(ctx, state) {
  const active = state.empTimer <= 0;
  for (const laser of state.lasersPx) {
    ctx.strokeStyle = active ? renderPalette.laserRed : 'rgba(255,59,48,0.18)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(laser.x1, laser.y1); ctx.lineTo(laser.x2, laser.y2); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(laser.x1, laser.y1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(laser.x2, laser.y2, 4, 0, Math.PI * 2); ctx.fill();
  }
}

/* drawSecurityCameras: wall cameras with pale blue sweeping cones. */
function drawSecurityCameras(ctx, state) {
  for (const camera of state.cameras) {
    if (state.empTimer <= 0) {
      const inShadow = window.LB_GUARDS.pointInShadow(state, state.player.x, state.player.y);
      const range = inShadow ? renderCfg.SHADOW_VISION_RANGE_PX : renderCfg.CAMERA_VISION_RANGE_PX;
      drawVisionConeFilled(ctx, state, camera.x, camera.y, camera.angle, renderCfg.CAMERA_VISION_HALF_ANGLE_RAD, range, renderPalette.coneCamera);
    }
    ctx.fillStyle = '#2b3444';
    ctx.fillRect(camera.x - 7, camera.y - 7, 14, 14);
    ctx.fillStyle = state.empTimer > 0 ? '#555' : '#9fd0ff';
    ctx.beginPath(); ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

/* drawGuardFigures: uniformed guards, gaze tick, and a ! when suspicious. */
function drawGuardFigures(ctx, state) {
  for (const guard of state.guards) {
    const alert = guard.seenStrength > 0 || guard.mode === 'investigate' || guard.mode === 'search';
    const inShadowNow = window.LB_GUARDS.pointInShadow(state, state.player.x, state.player.y);
    const range = inShadowNow ? renderCfg.SHADOW_VISION_RANGE_PX : renderCfg.GUARD_VISION_RANGE_PX;
    drawVisionConeFilled(ctx, state, guard.x, guard.y, guard.angle, renderCfg.GUARD_VISION_HALF_ANGLE_RAD,
      state.smokeTimer > 0 && Math.hypot(state.player.x - state.smokeX, state.player.y - state.smokeY) < renderCfg.SMOKE_RADIUS_PX ? 26 : range,
      alert ? renderPalette.coneAlert : renderPalette.coneCalm);
    ctx.fillStyle = renderPalette.guardUniform;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = renderPalette.guardRed;
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(guard.x, guard.y - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 15, guard.y + Math.sin(guard.angle) * 15);
    ctx.stroke();
    if (alert) {
      ctx.fillStyle = '#ffdf4d';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 17);
    } else if (guard.mode === 'search') {
      ctx.fillStyle = '#cfe8ff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 17);
    }
  }
}

/* drawPlayerThief: the teal-hooded thief; dimmer while hiding in shadow. */
function drawPlayerThief(ctx, state) {
  const hiding = window.LB_GUARDS.pointInShadow(state, state.player.x, state.player.y);
  ctx.save();
  ctx.globalAlpha = hiding ? 0.55 : 1;
  ctx.fillStyle = renderPalette.playerTeal;
  ctx.beginPath(); ctx.arc(state.player.x, state.player.y, renderCfg.PLAYER_RADIUS_PX, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0c3a37';
  ctx.beginPath(); ctx.arc(state.player.x, state.player.y - 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9c9';
  ctx.beginPath(); ctx.arc(state.player.x, state.player.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (hiding) {
    ctx.fillStyle = '#9adfe8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('hidden', state.player.x, state.player.y - 18);
  }
}

/* drawSmokeCloud: the smoke bomb's vision-blocking cloud. */
function drawSmokeCloud(ctx, state) {
  if (state.smokeTimer <= 0) return;
  const gradient = ctx.createRadialGradient(state.smokeX, state.smokeY, 8, state.smokeX, state.smokeY, renderCfg.SMOKE_RADIUS_PX);
  gradient.addColorStop(0, 'rgba(210,214,226,0.88)');
  gradient.addColorStop(1, 'rgba(210,214,226,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(state.smokeX, state.smokeY, renderCfg.SMOKE_RADIUS_PX, 0, Math.PI * 2); ctx.fill();
}

/* drawPebbleMarker: expanding rings where the thrown pebble landed. */
function drawPebbleMarker(ctx, state) {
  if (!state.pebbleMark) return;
  const age = 1.6 - state.pebbleMark.timer;
  ctx.strokeStyle = 'rgba(255,240,190,0.8)';
  for (let ring = 0; ring < 3; ring++) {
    ctx.beginPath();
    ctx.arc(state.pebbleMark.x, state.pebbleMark.y, 6 + ((age * 46 + ring * 14) % 42), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ddd6c2';
  ctx.beginPath(); ctx.arc(state.pebbleMark.x, state.pebbleMark.y, 3, 0, Math.PI * 2); ctx.fill();
}

/* drawDetectionVignette: red edge pulse as the detection meter climbs. */
function drawDetectionVignette(ctx, state) {
  if (state.detection <= 4) return;
  const strength = Math.min(0.5, state.detection / 200);
  const gradient = ctx.createRadialGradient(480, 288, 240, 480, 288, 620);
  gradient.addColorStop(0, 'rgba(255,40,30,0)');
  gradient.addColorStop(1, 'rgba(255,40,30,' + strength.toFixed(3) + ')');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
}

/* drawPlayScene: the full top-down stealth scene, layer by layer. */
function drawPlayScene(ctx, state) {
  drawFloorTiles(ctx);
  drawShadowZones(ctx, state);
  drawExitDoor(ctx, state);
  drawTreasureGems(ctx, state);
  drawLaserTripwires(ctx, state);
  drawSecurityCameras(ctx, state);
  drawGuardFigures(ctx, state);
  drawWallBlocks(ctx, state);
  drawLampLightGlows(ctx, state);
  drawPebbleMarker(ctx, state);
  drawSmokeCloud(ctx, state);
  drawPlayerThief(ctx, state);
  drawDetectionVignette(ctx, state);
  if (state.pebbleTargeting) drawPebbleTargetingHint(ctx, state);
}

/* drawPebbleTargetingHint: prompt shown while aiming a pebble throw. */
function drawPebbleTargetingHint(ctx, state) {
  const mouse = window.LB_INPUT.getMousePosition();
  ctx.strokeStyle = 'rgba(255,240,190,0.9)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2); ctx.stroke();
  drawCenteredBannerText(ctx, 'Click to throw the pebble there — guards will investigate the noise', 26);
}

/* drawCenteredBannerText: one line of cream text on a dark banner. */
function drawCenteredBannerText(ctx, text, y) {
  ctx.font = '14px monospace';
  const width = ctx.measureText(text).width + 28;
  ctx.fillStyle = 'rgba(8,8,16,0.82)';
  ctx.fillRect((renderCfg.CANVAS_WIDTH_PX - width) / 2, y - 16, width, 26);
  ctx.fillStyle = renderPalette.textCream;
  ctx.textAlign = 'center';
  ctx.fillText(text, renderCfg.CANVAS_WIDTH_PX / 2, y + 2);
}

/* drawTitleScreenScene: lamplit vault backdrop, game title and story. */
function drawTitleScreenScene(ctx, state) {
  drawPlayScene(ctx, state);
  ctx.fillStyle = 'rgba(4,4,10,0.66)';
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = renderPalette.treasureGold;
  ctx.font = 'bold 64px monospace';
  ctx.fillText('LAMPBLACK', 480, 168);
  ctx.fillStyle = renderPalette.textCream;
  ctx.font = '22px monospace';
  ctx.fillText('— The Gilded Vault —', 480, 208);
  ctx.font = '15px monospace';
  ctx.fillText('Five floors. Twenty guards. Thirty treasures. One thief in the dark.', 480, 268);
  ctx.fillText('Stay in shadow, bend the patrols with pebble, smoke and EMP,', 480, 294);
  ctx.fillText('and reach the lift unseen. Detection fades if you break their gaze.', 480, 320);
  ctx.fillStyle = renderPalette.exitGreen;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Press ENTER or click to begin the heist', 480, 384);
  ctx.fillStyle = '#b9b2a0';
  ctx.font = '13px monospace';
  ctx.fillText('WASD / arrows move · Q pebble (click to throw) · F smoke · E EMP · P pause · R restart · M mute', 480, 428);
  ctx.fillText('A make.fun stealth game — fully offline, no network, just nerve.', 480, 456);
}

/* drawLevelIntroCard: floor name, story line and loot target before play. */
function drawLevelIntroCard(ctx, state) {
  drawPlayScene(ctx, state);
  ctx.fillStyle = 'rgba(4,4,10,0.72)';
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = renderPalette.treasureGold;
  ctx.font = 'bold 30px monospace';
  ctx.fillText(state.level.name, 480, 218);
  ctx.fillStyle = renderPalette.textCream;
  ctx.font = 'italic 16px monospace';
  ctx.fillText(state.level.subtitle, 480, 252);
  ctx.font = '15px monospace';
  wrapCanvasText(ctx, state.level.intro, 480, 300, 620, 22);
  ctx.fillStyle = renderPalette.exitGreen;
  ctx.font = 'bold 17px monospace';
  ctx.fillText('Press ENTER to slip inside', 480, 392);
}

/* wrapCanvasText: naive word wrap for centred canvas text. */
function wrapCanvasText(ctx, text, centerX, startY, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth && line) { lines.push(line); line = word; } else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach(function (entry, index) { ctx.fillText(entry, centerX, startY + index * lineHeight); });
}

/* drawCaughtOverlay: the caught screen — detection counted, floor restarts. */
function drawCaughtOverlay(ctx, state) {
  drawPlayScene(ctx, state);
  ctx.fillStyle = 'rgba(40,2,2,0.72)';
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6a55';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('CAUGHT!', 480, 240);
  ctx.fillStyle = renderPalette.textCream;
  ctx.font = '16px monospace';
  ctx.fillText('The lamps flare, the alarm sings, the floor resets.', 480, 284);
  ctx.fillText('Detections this floor: ' + state.detections + ' — the ghost bonus is gone, the loot is not.', 480, 312);
  ctx.fillStyle = renderPalette.exitGreen;
  ctx.font = 'bold 17px monospace';
  ctx.fillText('Press ENTER to try the floor again', 480, 366);
}

/* drawPausedOverlay: simple paused veil. */
function drawPausedOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(4,4,10,0.6)';
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = renderPalette.textCream;
  ctx.font = 'bold 36px monospace';
  ctx.fillText('PAUSED', 480, 280);
  ctx.font = '15px monospace';
  ctx.fillText('P or Esc to resume · R to restart the floor', 480, 318);
}

/* starStringForRating: '★★★' style rating text for a star count. */
function starStringForRating(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

/* drawLevelCompleteScreenScene: stars, loot, time and ghost bonus breakdown. */
function drawLevelCompleteScreenScene(ctx, state, result) {
  drawPlayScene(ctx, state);
  ctx.fillStyle = 'rgba(3,10,6,0.78)';
  ctx.fillRect(0, 0, renderCfg.CANVAS_WIDTH_PX, renderCfg.CANVAS_HEIGHT_PX);
  ctx.textAlign = 'center';
  ctx.fillStyle = renderPalette.exitGreen;
  ctx.font = 'bold 38px monospace';
  ctx.fillText(result.isFinal ? 'THE VAULT IS EMPTY' : 'FLOOR CLEARED', 480, 150);
  ctx.fillStyle = renderPalette.treasureGold;
  ctx.font = '44px monospace';
  ctx.fillText(starStringForRating(result.stars), 480, 208);
  ctx.fillStyle = renderPalette.textCream;
  ctx.font = '17px monospace';
  ctx.fillText('Loot stolen: ' + result.loot + ' gold', 480, 262);
  ctx.fillText('Time bonus: ' + result.timeBonus + '   ·   Ghost bonus: ' + result.ghostBonus + (result.ghost ? ' (never caught!)' : ''), 480, 292);
  ctx.fillText('Floor score: ' + result.levelScore + '   ·   Campaign total: ' + result.totalScore, 480, 322);
  ctx.fillText('Treasures taken: ' + result.treasuresTaken + ' of ' + result.treasuresTotal, 480, 352);
  ctx.fillStyle = renderPalette.exitGreen;
  ctx.font = 'bold 17px monospace';
  ctx.fillText(result.isFinal ? 'Five floors, one legend. Thanks for playing LAMPBLACK.' : 'Press ENTER for the next floor', 480, 408);
}

/* drawVictoryScreenScene: campaign victory reuses the complete breakdown. */
function drawVictoryScreenScene(ctx, state, result) {
  drawLevelCompleteScreenScene(ctx, state, result);
}

window.LB_RENDER = {
  drawPlayScene, drawTitleScreenScene, drawLevelIntroCard, drawCaughtOverlay,
  drawPausedOverlay, drawLevelCompleteScreenScene, drawVictoryScreenScene,
  starStringForRating,
};

'use strict';
/* LAMPBLACK: The Gilded Vault — input.js
 * One job: read the player's hands. WASD / arrow keys for movement, mouse
 * position and clicks on the canvas (pebble targeting), and the single-key
 * commands: Q pebble mode, F smoke, E EMP, P/Esc pause, R restart, M mute,
 * Enter to advance screens. Exposes a plain keys-down set plus callbacks. */

const inputKeysDown = new Set();
let inputMouse = { x: 0, y: 0, clickedX: -1, clickedY: -1, hasClick: false };
let inputHandlers = { onAction: function () {}, onAnyKey: function () {} };

/* bindInputToCanvas: attach keyboard and mouse listeners exactly once. */
function bindInputToCanvas(canvas, handlers) {
  inputHandlers = handlers;
  window.addEventListener('keydown', handleKeyDownEvent);
  window.addEventListener('keyup', handleKeyUpEvent);
  canvas.addEventListener('mousemove', function (event) {
    const rect = canvas.getBoundingClientRect();
    inputMouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    inputMouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', function (event) {
    const rect = canvas.getBoundingClientRect();
    inputMouse.clickedX = (event.clientX - rect.left) * (canvas.width / rect.width);
    inputMouse.clickedY = (event.clientY - rect.top) * (canvas.height / rect.height);
    inputMouse.hasClick = true;
    inputHandlers.onAnyKey();
  });
}

/* handleKeyDownEvent: track held keys and fire one-shot action commands. */
function handleKeyDownEvent(event) {
  const key = event.key.toLowerCase();
  inputKeysDown.add(key);
  inputHandlers.onAnyKey();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  const actionByKey = {
    q: 'pebble-mode', '1': 'pebble-mode',
    f: 'smoke', '2': 'smoke',
    e: 'emp', '3': 'emp',
    p: 'pause', escape: 'pause',
    r: 'restart', m: 'mute', enter: 'advance', ' ': 'advance',
  };
  const action = actionByKey[key];
  if (action && !event.repeat) inputHandlers.onAction(action);
}

/* handleKeyUpEvent: release a held key. */
function handleKeyUpEvent(event) {
  inputKeysDown.delete(event.key.toLowerCase());
}

/* readMovementVector: normalised WASD/arrow direction from held keys. */
function readMovementVector() {
  let dx = 0; let dy = 0;
  if (inputKeysDown.has('a') || inputKeysDown.has('arrowleft')) dx -= 1;
  if (inputKeysDown.has('d') || inputKeysDown.has('arrowright')) dx += 1;
  if (inputKeysDown.has('w') || inputKeysDown.has('arrowup')) dy -= 1;
  if (inputKeysDown.has('s') || inputKeysDown.has('arrowdown')) dy += 1;
  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length, moving: dx !== 0 || dy !== 0 };
}

/* consumeCanvasClick: return and clear a pending canvas click, if any. */
function consumeCanvasClick() {
  if (!inputMouse.hasClick) return null;
  inputMouse.hasClick = false;
  return { x: inputMouse.clickedX, y: inputMouse.clickedY };
}

/* getMousePosition: current mouse position in canvas pixels. */
function getMousePosition() { return { x: inputMouse.x, y: inputMouse.y }; }

window.LB_INPUT = { bindInputToCanvas, readMovementVector, consumeCanvasClick, getMousePosition };

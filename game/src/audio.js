'use strict';
/* LAMPBLACK: The Gilded Vault — audio.js
 * One job: tiny generated WebAudio bleeps (no audio files, fully offline)
 * for pickups, alarms, gadget sounds and UI clicks, with a mute toggle. */

let audioContext = null;
let audioMuted = false;

/* ensureAudioContext: create the context lazily on first user gesture. */
function ensureAudioContext() {
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioContext = new Ctor();
  return audioContext;
}

/* playToneBleep: one short oscillator blip with an exponential fade. */
function playToneBleep(frequencyHz, durationSec, type, volume) {
  if (audioMuted) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = frequencyHz;
  gain.gain.setValueAtTime(volume || 0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + durationSec);
}

/* playTreasurePickupSound: a bright two-note chime for stolen treasure. */
function playTreasurePickupSound() { playToneBleep(880, 0.12, 'triangle', 0.09); setTimeout(function () { playToneBleep(1318, 0.16, 'triangle', 0.07); }, 60); }

/* playAlarmStingSound: harsh square blip when detection surges / laser trips. */
function playAlarmStingSound() { playToneBleep(196, 0.25, 'square', 0.1); }

/* playCaughtSound: falling tone for being caught. */
function playCaughtSound() { playToneBleep(392, 0.2, 'sawtooth', 0.08); setTimeout(function () { playToneBleep(196, 0.4, 'sawtooth', 0.08); }, 140); }

/* playLevelCompleteSound: small rising arpeggio for a clean getaway. */
function playLevelCompleteSound() { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { playToneBleep(f, 0.18, 'triangle', 0.08); }, i * 90); }); }

/* playPebbleClink: the thrown pebble's tick on stone. */
function playPebbleClink() { playToneBleep(1560, 0.06, 'square', 0.05); }

/* playSmokePoof: low soft burst for the smoke bomb. */
function playSmokePoof() { playToneBleep(140, 0.3, 'sine', 0.1); }

/* playEmpZap: descending zap for the EMP charge. */
function playEmpZap() { playToneBleep(1200, 0.22, 'sawtooth', 0.06); }

/* playUiClickSound: menu click. */
function playUiClickSound() { playToneBleep(660, 0.06, 'sine', 0.05); }

/* toggleAudioMuted: flip mute and report the new state. */
function toggleAudioMuted() { audioMuted = !audioMuted; return audioMuted; }

/* unlockAudioOnFirstGesture: create/resume the context inside a user
 * gesture, which is the only moment browsers allow audio to start. */
function unlockAudioOnFirstGesture() {
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

window.LB_AUDIO = {
  playTreasurePickupSound, playAlarmStingSound, playCaughtSound,
  playLevelCompleteSound, playPebbleClink, playSmokePoof, playEmpZap,
  playUiClickSound, toggleAudioMuted, unlockAudioOnFirstGesture,
};

// Procedural WebAudio effects only — no audio files. Every sound is a few
// oscillators and a gain envelope, built when the game first hears a gesture
// (browsers block audio before one). M toggles mute. Safe to import in Node:
// everything is behind a `window` guard and no-ops without it.
let context = null;
let muted = false;
let alarmOsc = null;
let alarmGain = null;

function ensure() {
  if (typeof window === 'undefined') return null;
  try {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
  } catch {
    return null;
  }
  return context;
}

function tone(freq, dur, type, volume, when = 0, slideTo = null) {
  const ctx = ensure();
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function unlockAudio() {
  ensure();
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAlarmHum();
  return muted;
}

export function isMuted() {
  return muted;
}

/** A coin landing on the floor: two bright metallic pings. */
export function soundCoin() {
  tone(2093, 0.09, 'triangle', 0.16);
  tone(2637, 0.14, 'triangle', 0.12, 0.05);
}

/** Pocketing loot: a soft two-note blip that rises with the loot's value. */
export function soundPickup(value) {
  const base = 520 + Math.min(400, value);
  tone(base, 0.1, 'sine', 0.2);
  tone(base * 1.5, 0.16, 'sine', 0.18, 0.07);
}

/** A guard's suspicion snapping to chase: a low warning buzz. */
export function soundChase() {
  tone(180, 0.28, 'sawtooth', 0.12, 0, 110);
}

/** Tripping a laser: a sharp electric zap. */
export function soundLaser() {
  tone(1400, 0.16, 'square', 0.1, 0, 300);
}

/** Caught by a guard: a short descending sting. */
export function soundCaught() {
  tone(392, 0.14, 'sawtooth', 0.14, 0, 311);
  tone(311, 0.2, 'sawtooth', 0.14, 0.12, 233);
}

/** Lockdown: a two-tone siren that falls away. */
export function soundLockdown() {
  tone(660, 0.22, 'square', 0.1, 0, 660);
  tone(440, 0.22, 'square', 0.1, 0.22, 440);
  tone(660, 0.3, 'square', 0.1, 0.44, 330);
}

/** Floor cleared: a small rising arpeggio. */
export function soundClear() {
  tone(523, 0.12, 'sine', 0.18);
  tone(659, 0.12, 'sine', 0.18, 0.1);
  tone(784, 0.12, 'sine', 0.18, 0.2);
  tone(1047, 0.26, 'sine', 0.2, 0.3);
}

/** The whole heist won: a longer fanfare. */
export function soundWin() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((freq, i) => tone(freq, 0.18, 'sine', 0.18, i * 0.11));
}

/** A soft tick while the alarm is climbing, so the meter is heard as well as seen. */
export function soundAlarmTick() {
  tone(880, 0.05, 'square', 0.05);
}

/**
 * A low hum while the alarm is high (above 0.6): one oscillator whose gain
 * follows the alarm, started once and stopped when the alarm cools.
 */
export function alarmHum(level) {
  const ctx = ensure();
  if (!ctx || muted) {
    stopAlarmHum();
    return;
  }
  if (level < 0.6) {
    stopAlarmHum();
    return;
  }
  if (!alarmOsc) {
    alarmOsc = ctx.createOscillator();
    alarmGain = ctx.createGain();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.value = 55;
    alarmGain.gain.value = 0;
    alarmOsc.connect(alarmGain);
    alarmGain.connect(ctx.destination);
    alarmOsc.start();
  }
  alarmGain.gain.setTargetAtTime(0.05 + level * 0.05, ctx.currentTime, 0.1);
  alarmOsc.frequency.setTargetAtTime(55 + level * 30, ctx.currentTime, 0.2);
}

export function stopAlarmHum() {
  if (alarmOsc) {
    try {
      alarmOsc.stop();
    } catch {
      // Already stopped.
    }
    alarmOsc = null;
    alarmGain = null;
  }
}

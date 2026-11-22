// Smoke clouds: the thief's second tool. Press E to drop one at the thief's
// feet: a grey cloud that blocks every guard's and camera's line of sight for
// a few seconds, so a watched corridor can be crossed unseen. It costs $50 of
// score a cloud and each floor only carries two, so it is spent, not spammed.
import { SMOKE } from './config.js';

/** A fresh cloud at (x, y), hanging in the air for SMOKE.duration seconds. */
export function createSmokeCloud(x, y) {
  return { x, y, radius: SMOKE.radius, age: 0, duration: SMOKE.duration };
}

/** Age the clouds one step; the spent ones drift away. */
export function updateSmokeClouds(clouds, dt) {
  for (const cloud of clouds) cloud.age += dt;
  return clouds.filter((cloud) => cloud.age < cloud.duration);
}

/**
 * True when the segment from an eye (x1, y1) to a target (x2, y2) runs through
 * a live smoke cloud: sampled along the line, so a cloud anywhere between the
 * watcher and the watched breaks the sight — including a cloud the target
 * stands inside.
 */
export function smokeBlocksSight(clouds, x1, y1, x2, y2) {
  if (!clouds || clouds.length === 0) return false;
  const steps = 24;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const cloud of clouds) {
      const dx = px - cloud.x;
      const dy = py - cloud.y;
      if (dx * dx + dy * dy < cloud.radius * cloud.radius) return true;
    }
  }
  return false;
}

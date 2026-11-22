// Security systems: sweeping cameras and blinking laser beams. Both feed the
// one alarm meter in world.js. A camera is a cone mounted on a wall tile that
// swings back and forth; a laser is a beam between two emitters that blinks on
// and off — cross it while it is live and the alarm jumps.
import { CAMERA, LASER, TILE } from './config.js';
import { inCone, tileCenter } from './vision.js';
import { smokeBlocksSight } from './smoke.js';

export function createCamera(def) {
  const c = tileCenter(def.x, def.y);
  return { x: c.x, y: c.y, dir: def.dir, baseDir: def.dir, sweep: def.sweep, phase: 0, seeing: false };
}

export function updateCamera(camera, dt, grid, player, smokes) {
  camera.phase += dt * CAMERA.sweepSpeed;
  camera.dir = camera.baseDir + Math.sin(camera.phase) * camera.sweep;
  camera.seeing = inCone(grid, camera.x, camera.y, camera.dir, CAMERA.halfAngle, CAMERA.viewRange, player.x, player.y, player.hidden)
    && !smokeBlocksSight(smokes, camera.x, camera.y, player.x, player.y);
  return camera.seeing;
}

export function createLaser(def) {
  const a = tileCenter(def.x1, def.y1);
  const b = tileCenter(def.x2, def.y2);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, period: def.period, phase: def.phase, live: false, tripped: false };
}

/** Advance a laser's blink; returns true the moment it switches on. */
export function updateLaser(laser, time) {
  const was = laser.live;
  laser.live = ((time + laser.phase) % laser.period) < laser.period / 2;
  if (!laser.live) laser.tripped = false;
  return laser.live && !was;
}

/** Distance from a point to a line segment, for testing a beam crossing. */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * True when the player crosses a live beam this step. A beam only fires once per
 * live blink (its `tripped` latch), so walking along it does not stack the alarm.
 */
export function laserTrips(laser, player, radius) {
  if (!laser.live || laser.tripped) return false;
  if (distToSegment(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2) < radius + 3) {
    laser.tripped = true;
    return true;
  }
  return false;
}

export { CAMERA, LASER };

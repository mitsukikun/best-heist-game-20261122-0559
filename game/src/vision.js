// Line of sight and vision cones. Everything works in pixel coordinates; tiles
// are 40px, and a cone is raycast against the walls, cases and shadows so a cone
// never leaks through a wall.
import { TILE } from './config.js';
import { blocksSightTile, tileAt } from './levels.js';

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

/** True when the straight line from (x0,y0) to (x1,y1) crosses no sight-blocking tile. */
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const steps = Math.ceil(dist / 6);
  const startTx = Math.floor(x0 / TILE);
  const startTy = Math.floor(y0 / TILE);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx === startTx && ty === startTy) continue;
    if (blocksSightTile(tileAt(grid, tx, ty))) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from (ox,oy) along `angle` until a sight-blocking tile, capped at range. */
export function castRay(grid, ox, oy, angle, range) {
  const step = 6;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const startTx = Math.floor(ox / TILE);
  const startTy = Math.floor(oy / TILE);
  for (let d = step; d <= range; d += step) {
    const tx = Math.floor((ox + dx * d) / TILE);
    const ty = Math.floor((oy + dy * d) / TILE);
    if (tx === startTx && ty === startTy) continue;
    if (blocksSightTile(tileAt(grid, tx, ty))) return d - step / 2;
  }
  return range;
}

/**
 * The cone's outline as a polygon: the origin, then one raycast point per ray
 * across the cone. The renderer fills it; the detector uses the same shape.
 */
export function conePolygon(grid, ox, oy, angle, halfAngle, range, rays = 14) {
  const points = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = castRay(grid, ox, oy, a, range);
    points.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d });
  }
  return points;
}

/**
 * True when a target at (tx,ty) is inside the cone from (ox,oy) facing `angle`
 * and nothing blocks the view. `hidden` (standing in shadow) is never spotted.
 */
export function inCone(grid, ox, oy, angle, halfAngle, range, tx, ty, hidden) {
  if (hidden) return false;
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  return hasLineOfSight(grid, ox, oy, tx, ty);
}

/** 0 at the cone's edge, 1 point-blank: how strongly a sighting counts. */
export function sightStrength(range, dist) {
  return Math.max(0, 1 - dist / range);
}

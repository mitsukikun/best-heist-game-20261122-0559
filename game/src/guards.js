// Guard AI. A guard walks its patrol loop, turns to look at a noise, chases a
// thief it has fully spotted, investigates a tossed coin, then searches the spot
// and goes back to patrol. Suspicion rises while the thief is in the cone and
// cools while hidden; a full meter flips the guard to chase.
import { GUARD, PLAYER, TILE } from './config.js';
import { inCone, sightStrength, tileCenter } from './vision.js';
import { isSolidTile, tileAt } from './levels.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_SEARCH = 'search';

export function createGuard(def) {
  const first = tileCenter(def.path[0][0], def.path[0][1]);
  return {
    x: first.x,
    y: first.y,
    dir: 0,
    path: def.path,
    waypoint: 1 % def.path.length,
    state: GUARD_PATROL,
    suspicion: 0,
    timer: 0,
    lastSeen: null,
    investigate: null,
    pathTiles: [],
    repathTimer: 0,
    pauseTimer: 0,
  };
}

/** Breadth-first path of tile centres from (sx,sy) to (gx,gy) over walkable tiles. */
export function findPath(grid, sx, sy, gx, gy) {
  const key = (x, y) => y * 1000 + x;
  const prev = new Map();
  const queue = [[sx, sy]];
  prev.set(key(sx, sy), null);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === gx && cy === gy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isSolidTile(tileAt(grid, nx, ny))) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(key(gx, gy))) return [];
  const tiles = [];
  let cur = [gx, gy];
  while (cur !== null) {
    tiles.unshift(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  return tiles;
}

/** Walk toward (tx,ty) at `speed`, sliding along walls; returns true on arrival. */
function moveToward(guard, tx, ty, speed, dt, grid) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  if (!isSolidTile(tileAt(grid, Math.floor(nx / TILE), Math.floor(guard.y / TILE)))) guard.x = nx;
  if (!isSolidTile(tileAt(grid, Math.floor(guard.x / TILE), Math.floor(ny / TILE)))) guard.y = ny;
  guard.dir = Math.atan2(dy, dx);
  return false;
}

function followPath(guard, speed, dt, grid) {
  if (guard.pathTiles.length === 0) return true;
  const [tx, ty] = guard.pathTiles[0];
  const c = tileCenter(tx, ty);
  if (moveToward(guard, c.x, c.y, speed, dt, grid)) guard.pathTiles.shift();
  return guard.pathTiles.length === 0;
}

function repath(guard, grid, gx, gy) {
  const sx = Math.floor(guard.x / TILE);
  const sy = Math.floor(guard.y / TILE);
  guard.pathTiles = findPath(grid, sx, sy, gx, gy);
  if (guard.pathTiles.length > 0) guard.pathTiles.shift();
}

/**
 * One step of one guard. `sense` carries what the guard can know this step:
 * the player's position and hidden flag, the grid, and any fresh noise
 * (a coin landing or loud footsteps) as {x, y, kind}. Returns 'caught' when the
 * guard touches the player, 'chase' the first step a chase begins, else null.
 */
export function updateGuard(guard, dt, sense) {
  const { grid, player } = sense;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const seen = inCone(grid, guard.x, guard.y, guard.dir, GUARD.halfAngle, GUARD.viewRange, player.x, player.y, player.hidden);

  if (seen) {
    const rate = GUARD.spotRateFar + (GUARD.spotRateNear - GUARD.spotRateFar) * sightStrength(GUARD.viewRange, dist);
    guard.suspicion += rate * (player.sneaking ? GUARD.sneakFactor : 1) * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.timer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.decayRate * dt);
  }

  let event = null;
  if (guard.suspicion >= 1 && guard.state !== GUARD_CHASE) {
    guard.state = GUARD_CHASE;
    guard.timer = 0;
    event = 'chase';
  }

  // A coin landing nearby, or loud footsteps close by, pulls the guard over.
  if (sense.noise && guard.state !== GUARD_CHASE) {
    const nd = Math.hypot(sense.noise.x - guard.x, sense.noise.y - guard.y);
    const hear = sense.noise.kind === 'coin' ? GUARD.hearRadius : PLAYER.hearRadius;
    if (nd < hear) {
      guard.state = GUARD_INVESTIGATE;
      guard.investigate = { x: sense.noise.x, y: sense.noise.y };
      guard.timer = 0;
      repath(guard, grid, Math.floor(sense.noise.x / TILE), Math.floor(sense.noise.y / TILE));
    }
  }

  switch (guard.state) {
    case GUARD_PATROL: {
      const target = guard.path[guard.waypoint];
      const c = tileCenter(target[0], target[1]);
      if (moveToward(guard, c.x, c.y, GUARD.patrolSpeed, dt, grid)) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
        guard.pauseTimer = 0.6;
      }
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.dir += Math.sin(guard.timer * 2) * 0.02;
      }
      if (guard.suspicion > 0.35) guard.state = GUARD_SUSPICIOUS;
      break;
    }
    case GUARD_SUSPICIOUS: {
      // Stop and stare toward the last thing seen; suspicion cools here.
      guard.timer += dt;
      if (guard.lastSeen) guard.dir = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      if (guard.suspicion <= 0.05 || guard.timer > 2.5) {
        guard.state = GUARD_PATROL;
        guard.timer = 0;
      }
      break;
    }
    case GUARD_CHASE: {
      guard.repathTimer -= dt;
      if (guard.repathTimer <= 0) {
        repath(guard, grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
        guard.repathTimer = 0.5;
      }
      followPath(guard, GUARD.chaseSpeed, dt, grid);
      if (!seen) {
        guard.timer += dt;
        if (guard.timer > GUARD.chaseGiveUp) {
          guard.state = GUARD_SEARCH;
          guard.timer = 0;
        }
      }
      break;
    }
    case GUARD_INVESTIGATE: {
      if (followPath(guard, GUARD.investigateSpeed, dt, grid)) {
        guard.state = GUARD_SEARCH;
        guard.timer = 0;
      }
      break;
    }
    case GUARD_SEARCH: {
      guard.timer += dt;
      guard.dir += dt * 1.8; // look around the spot
      if (guard.timer > GUARD.searchTime) {
        guard.state = GUARD_PATROL;
        guard.timer = 0;
        guard.investigate = null;
        repath(guard, grid, guard.path[guard.waypoint][0], guard.path[guard.waypoint][1]);
      }
      break;
    }
    default:
      break;
  }

  if (dist < GUARD.catchRadius) return 'caught';
  return event;
}

/** Reset a guard to its patrol start after a catch or a lockdown. */
export function resetGuard(guard, def) {
  const fresh = createGuard(def);
  Object.assign(guard, fresh);
}

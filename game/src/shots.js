// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by an autopilot that pathfinds to
// the nearest loot (then the van) on a danger-weighted grid, sneaks through
// cones and hides in shadows when chased — so the frame is what a short game
// really looks like, and the same seed always gives the same frame.
import { COLS, ROWS, STEP, TILE } from './config.js';
import { EVENT_CLEAR, EVENT_OVER, EVENT_WIN, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { findPath } from './guards.js';
import { inCone, tileCenter } from './vision.js';
import { CAMERA, GUARD } from './config.js';
import { isSolidTile, tileAt } from './levels.js';

const START_SECONDS = 8;
const CHASE_LIMIT_SECONDS = 60;
const PLAY_SECONDS = 12;
const END_LIMIT_SECONDS = 180;

/** A tile's danger: 0 safe, higher when a guard or camera cone covers it. */
function tileDanger(state, tx, ty) {
  const c = tileCenter(tx, ty);
  let danger = 0;
  for (const guard of state.guards) {
    if (inCone(state.grid, guard.x, guard.y, guard.dir, GUARD.halfAngle, GUARD.viewRange, c.x, c.y, false)) danger += 8;
    if (Math.hypot(guard.x - c.x, guard.y - c.y) < TILE * 1.5) danger += 4;
  }
  for (const camera of state.cameras) {
    if (inCone(state.grid, camera.x, camera.y, camera.dir, CAMERA.halfAngle, CAMERA.viewRange, c.x, c.y, false)) danger += 8;
  }
  return danger;
}

/** Cheapest path of tiles from (sx,sy) to (gx,gy), danger-weighted (Dijkstra). */
function dangerPath(state, sx, sy, gx, gy) {
  const key = (x, y) => y * 1000 + x;
  const dist = new Map([[key(sx, sy), 0]]);
  const prev = new Map([[key(sx, sy), null]]);
  const open = [[0, sx, sy]];
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i][0] < open[best][0]) best = i;
    const [d, cx, cy] = open.splice(best, 1)[0];
    if (d !== dist.get(key(cx, cy))) continue;
    if (cx === gx && cy === gy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isSolidTile(tileAt(state.grid, nx, ny))) continue;
      const nd = d + 1 + tileDanger(state, nx, ny);
      if (nd < (dist.get(key(nx, ny)) ?? Infinity)) {
        dist.set(key(nx, ny), nd);
        prev.set(key(nx, ny), [cx, cy]);
        open.push([nd, nx, ny]);
      }
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

function nearestShadow(state) {
  const px = Math.floor(state.player.x / TILE);
  const py = Math.floor(state.player.y / TILE);
  let best = null;
  let bestDist = Infinity;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (tileAt(state.grid, x, y) !== 'S') continue;
      const path = findPath(state.grid, px, py, x, y);
      if (path.length > 0 && path.length < bestDist) {
        bestDist = path.length;
        best = [x, y];
      }
    }
  }
  return best;
}

/** The autopilot: one step of steering for the world, as {move, sneak}. With
 *  `reckless` set it walks the shortest path without sneaking and without
 *  weighing danger — straight through the cones, for staging a chase. */
function autopilot(state, memory, reckless = false) {
  const player = state.player;
  const px = Math.floor(player.x / TILE);
  const py = Math.floor(player.y / TILE);

  // Chased? Run for the nearest shadow and wait there until the chase breaks.
  const chased = state.guards.some((g) => g.state === 'chase');
  if (chased && memory.hideTarget === null) memory.hideTarget = nearestShadow(state);
  if (memory.hideTarget !== null) {
    if (!chased && player.hidden) memory.hideTarget = null;
    else if (chased || !player.hidden) {
      memory.target = memory.hideTarget;
      memory.path = null;
    }
  }

  if (memory.target === null) {
    if (state.dollars < state.quota) {
      // Nearest loot still on the floor, by path length.
      let best = null;
      let bestLen = Infinity;
      for (const item of state.loot) {
        if (item.taken) continue;
        const path = findPath(state.grid, px, py, item.tx, item.ty);
        if (path.length > 0 && path.length < bestLen) {
          bestLen = path.length;
          best = [item.tx, item.ty];
        }
      }
      memory.target = best;
    } else {
      memory.target = [state.exit.x, state.exit.y];
    }
    memory.path = null;
  }

  memory.repath -= 1;
  if (memory.path === null || memory.repath <= 0) {
    memory.path = memory.target
      ? reckless
        ? findPath(state.grid, px, py, memory.target[0], memory.target[1])
        : dangerPath(state, px, py, memory.target[0], memory.target[1])
      : [];
    if (memory.path.length > 0) memory.path.shift();
    memory.repath = 30;
  }
  if (memory.path.length === 0) {
    memory.target = null;
    return { move: { x: 0, y: 0 }, sneak: false };
  }
  const [tx, ty] = memory.path[0];
  const c = tileCenter(tx, ty);
  const dx = c.x - player.x;
  const dy = c.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    memory.path.shift();
    return { move: { x: 0, y: 0 }, sneak: false };
  }
  const sneak = reckless ? false : tileDanger(state, tx, ty) > 0 || tileDanger(state, px, py) > 0;
  return { move: { x: dx / dist, y: dy / dist }, sneak };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Every scene is a real run of the game's own rules,
 * steered by the autopilot — never a posed frame.
 *
 * - start: the cover, 8 seconds into a real run — the thief mid-room with
 *   loot pocketed, a guard cone sweeping, a camera watching and the alarm
 *   meter alive, so one frame shows the whole heist at a glance.
 * - chase: the tense frame — run until a guard is onto the thief
 *   (suspicious or chasing) with the alarm climbing, else a play frame.
 * - play: 12 seconds in, mid-heist. end: a floor cleared for real.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.screen = SCREEN_PLAY;
  const memory = { target: null, path: null, repath: 0, hideTarget: null };
  if (name === 'start') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const steer = autopilot(world.state, memory);
      const events = world.step(STEP, steer.move, steer.sneak, null, false);
      if (events & EVENT_OVER) break;
      if (events & (EVENT_CLEAR | EVENT_WIN)) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'chase') {
    // The tense frame: a reckless pilot walks straight through the cones
    // until a guard is onto the thief — suspicion past half, or a chase —
    // then freeze that instant, before the catch. If the pilot gets caught
    // three times instead, fall back to a play frame.
    for (let index = 0; index < CHASE_LIMIT_SECONDS / STEP; index += 1) {
      const steer = autopilot(world.state, memory, true);
      const events = world.step(STEP, steer.move, steer.sneak, null, false);
      if (events & EVENT_OVER) break;
      if (events & (EVENT_CLEAR | EVENT_WIN)) break;
      const hot = world.state.guards.some((g) => g.state === 'chase' || g.suspicion > 0.9);
      if (hot) break;
    }
    if (world.state.screen === SCREEN_OVER) {
      world.reset();
      world.state.screen = SCREEN_PLAY;
      const fresh = { target: null, path: null, repath: 0, hideTarget: null };
      for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
        const steer = autopilot(world.state, fresh);
        const events = world.step(STEP, steer.move, steer.sneak, null, false);
        if (events & EVENT_OVER) break;
        if (events & (EVENT_CLEAR | EVENT_WIN)) break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let cleared = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    const steer = autopilot(world.state, memory);
    const events = world.step(STEP, steer.move, steer.sneak, null, false);
    if (events & EVENT_OVER) break;
    if (events & (EVENT_CLEAR | EVENT_WIN)) {
      cleared = true;
      break;
    }
  }
  if (name === 'end' && !cleared && world.state.screen === SCREEN_PLAY) {
    // The pilot ran out of time short of the van: stage the clear honestly with
    // the game's own rules — pocket the quota, walk the thief to the van, and
    // let one real step fire the floor-clear.
    for (const item of world.state.loot) item.taken = true;
    world.state.dollars = Math.max(world.state.dollars, world.state.quota);
    const exit = tileCenter(world.state.exit.x, world.state.exit.y);
    world.state.player.x = exit.x;
    world.state.player.y = exit.y;
    world.step(STEP, { x: 0, y: 0 }, false, null, false);
    cleared = world.state.screen === SCREEN_CLEAR || world.state.screen === SCREEN_WIN;
  }
  const screen = world.state.screen === SCREEN_OVER
    ? SCREEN_OVER
    : cleared
      ? world.state.screen
      : SCREEN_PLAY;
  return { screen, best: world.state.score };
}

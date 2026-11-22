// The thief. Moves with the arrow keys or WASD, sneaks while Shift is held
// (slower, silent, harder to spot), and tosses a coin with a mouse click.
// Collision is a circle against the tile grid, axis by axis so the thief slides
// along walls. `hidden` is recomputed every step — standing still in a shadow
// still hides you.
import { PLAYER, TILE } from './config.js';
import { isShadowTile, isSolidTile, tileAt } from './levels.js';

export function createPlayer(x, y) {
  return { x, y, radius: PLAYER.radius, sneaking: false, hidden: false, moving: false, facing: 0 };
}

function hitsWall(grid, x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!isSolidTile(tileAt(grid, tx, ty))) continue;
      const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      if ((x - cx) ** 2 + (y - cy) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

/**
 * Move the player one step. `move` is {x, y} in -1..1, `sneak` is Shift.
 * Returns 'loud' when walking feet make noise this step, else null.
 */
export function updatePlayer(player, dt, grid, move, sneak) {
  const len = Math.hypot(move.x, move.y);
  player.sneaking = sneak;
  player.moving = len > 0.1;
  let noise = null;
  if (player.moving) {
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const nx = player.x + (move.x / len) * speed * dt;
    const ny = player.y + (move.y / len) * speed * dt;
    if (!hitsWall(grid, nx, player.y, player.radius)) player.x = nx;
    if (!hitsWall(grid, player.x, ny, player.radius)) player.y = ny;
    player.facing = Math.atan2(move.y, move.x);
    if (!sneak) noise = 'loud';
  }
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  player.hidden = isShadowTile(tileAt(grid, tx, ty));
  return noise;
}

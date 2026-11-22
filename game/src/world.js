// The game's rules and state, with no drawing and no browser in it: the thief,
// the guards, the cameras and lasers, the loot quota, the one alarm meter, the
// lives and the score. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react (sound, screens) without the world
// knowing about screens or sound. Nothing here allocates after createWorld.
import { ALARM, CAMERA, COIN, LIVES, LOOT_VALUES, PLAYER, SCORE, SMOKE, TILE } from './config.js';
import { LEVELS, parseLevel, tileAt } from './levels.js';
import { createGuard, resetGuard, updateGuard } from './guards.js';
import { createCamera, createLaser, laserTrips, updateCamera, updateLaser } from './security.js';
import { createPlayer, updatePlayer } from './player.js';
import { createSmokeCloud, updateSmokeClouds } from './smoke.js';
import { tileCenter } from './vision.js';

export const EVENT_PICKUP = 1;
export const EVENT_COIN = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LOCKDOWN = 8;
export const EVENT_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;
export const EVENT_LASER = 128;
export const EVENT_CHASE = 256;
export const EVENT_ALARM = 512;
export const EVENT_SMOKE = 1024;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createWorld(random) {
  const state = {
    screen: SCREEN_TITLE,
    floorIndex: 0,
    floor: null,
    grid: null,
    start: null,
    exit: null,
    player: null,
    guards: [],
    guardDefs: [],
    cameras: [],
    lasers: [],
    loot: [],
    coins: [],
    smokes: [],
    smokesLeft: SMOKE.perFloor,
    dollars: 0,
    quota: 0,
    alarm: 0,
    lives: LIVES,
    score: 0,
    floorScore: 0,
    floorTime: 0,
    floorSpotted: false,
    coinsLeft: COIN.perFloor,
    elapsed: 0,
    time: 0,
    clearBonus: 0,
    over: false,
  };

  function loadFloor(index) {
    const def = LEVELS[index];
    const { grid, start, exit } = parseLevel(def);
    state.floorIndex = index;
    state.floor = def;
    state.grid = grid;
    state.start = start;
    state.exit = exit;
    const sc = tileCenter(start.x, start.y);
    state.player = createPlayer(sc.x, sc.y);
    state.guardDefs = def.guards;
    state.guards = def.guards.map(createGuard);
    state.cameras = def.cameras.map(createCamera);
    state.lasers = def.lasers.map(createLaser);
    state.loot = def.loot.map((item) => {
      const c = tileCenter(item.x, item.y);
      return { x: c.x, y: c.y, tx: item.x, ty: item.y, kind: item.kind, value: LOOT_VALUES[item.kind], taken: false };
    });
    state.coins = [];
    state.smokes = [];
    state.smokesLeft = SMOKE.perFloor;
    state.quota = def.quota;
    state.dollars = 0;
    state.alarm = 0;
    state.floorTime = 0;
    state.floorSpotted = false;
    state.coinsLeft = COIN.perFloor;
    state.clearBonus = 0;
  }

  function reset() {
    state.lives = LIVES;
    state.score = 0;
    state.elapsed = 0;
    state.time = 0;
    state.over = false;
    state.screen = SCREEN_TITLE;
    loadFloor(0);
  }

  function respawn() {
    const sc = tileCenter(state.start.x, state.start.y);
    state.player.x = sc.x;
    state.player.y = sc.y;
    state.player.hidden = false;
    for (let i = 0; i < state.guards.length; i += 1) resetGuard(state.guards[i], state.guardDefs[i]);
    state.coins = [];
  }

  function loseLife() {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.over = true;
      state.screen = SCREEN_OVER;
      return EVENT_OVER;
    }
    respawn();
    return 0;
  }

  function lockdown() {
    state.alarm = ALARM.lockdownReset;
    return loseLife() | EVENT_LOCKDOWN;
  }

  function clearFloor() {
    const timeBonus = Math.max(0, SCORE.timeBonusMax - Math.floor(state.floorTime) * SCORE.timeBonusPerSec);
    const ghostBonus = state.floorSpotted ? 0 : SCORE.ghostBonus;
    state.clearBonus = SCORE.clearBonus + timeBonus + ghostBonus;
    state.score += state.clearBonus;
    state.floorScore = state.score;
    if (state.floorIndex + 1 >= LEVELS.length) {
      state.screen = SCREEN_WIN;
      return EVENT_WIN;
    }
    state.screen = SCREEN_CLEAR;
    return EVENT_CLEAR;
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1, `sneak` is Shift, `click` is a
   * canvas point to toss a coin at (or null), `smoke` is E pressed this step.
   * With `harmless` set (the title screen's backdrop) the world idles: guards
   * patrol, nothing scores, nothing catches. Returns the EVENT_* flags of what
   * happened this step.
   */
  function step(dt, move, sneak, click, harmless, smoke) {
    let events = 0;
    state.time += dt;
    if (state.screen !== SCREEN_PLAY && !harmless) return 0;
    if (harmless) {
      // Title backdrop: guards patrol, cameras sweep, nobody is ever caught.
      for (const guard of state.guards) {
        updateGuard(guard, dt, { grid: state.grid, player: { ...state.player, hidden: true }, noise: null });
      }
      for (const camera of state.cameras) updateCamera(camera, dt, state.grid, { ...state.player, hidden: true });
      for (const laser of state.lasers) updateLaser(laser, state.time);
      return 0;
    }

    state.elapsed += dt;
    state.floorTime += dt;
    const player = state.player;

    const noiseKind = updatePlayer(player, dt, state.grid, move, sneak);
    let noise = null;
    if (noiseKind === 'loud') noise = { x: player.x, y: player.y, kind: 'steps' };

    if (click && state.coinsLeft > 0) {
      const dx = click.x - player.x;
      const dy = click.y - player.y;
      const dist = Math.hypot(dx, dy);
      const range = Math.min(dist, COIN.throwRange);
      const lx = player.x + (dist === 0 ? 0 : (dx / dist) * range);
      const ly = player.y + (dist === 0 ? 0 : (dy / dist) * range);
      state.coins.push({ x: lx, y: ly, age: 0 });
      state.coinsLeft -= 1;
      noise = { x: lx, y: ly, kind: 'coin' };
      events |= EVENT_COIN;
    }
    for (const coin of state.coins) coin.age += dt;
    state.coins = state.coins.filter((coin) => coin.age < 6);

    // Smoke: E drops a cloud at the thief's feet for $50 of score. It blinds
    // every cone while it hangs — the second tool, spent, not spammed.
    if (smoke && state.smokesLeft > 0) {
      state.smokes.push(createSmokeCloud(player.x, player.y));
      state.smokesLeft -= 1;
      state.score = Math.max(0, state.score - SMOKE.cost);
      events |= EVENT_SMOKE;
    }
    state.smokes = updateSmokeClouds(state.smokes, dt);

    // Loot: walk over it to pocket it.
    for (const item of state.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - player.x, item.y - player.y) < PLAYER.radius + 16) {
        item.taken = true;
        state.dollars += item.value;
        state.score += item.value;
        events |= EVENT_PICKUP;
      }
    }

    // Guards: sight, suspicion, chase, catch. Smoke between eye and thief
    // breaks the sight, so a clouded corridor can be crossed unseen.
    let anySeeing = false;
    for (const guard of state.guards) {
      const result = updateGuard(guard, dt, { grid: state.grid, player, noise, smokes: state.smokes });
      if (result === 'caught') {
        state.alarm = Math.min(1, state.alarm + ALARM.catchPenalty);
        state.floorSpotted = true;
        events |= EVENT_CAUGHT;
        const lost = loseLife();
        events |= lost;
        if (state.over) return events;
        break;
      }
      if (result === 'chase') {
        state.floorSpotted = true;
        events |= EVENT_CHASE;
      }
      if (guard.state === 'chase') anySeeing = true;
    }

    // Cameras feed the alarm while they hold the thief in view — unless smoke
    // sits between the lens and the thief.
    for (const camera of state.cameras) {
      if (updateCamera(camera, dt, state.grid, player, state.smokes)) {
        state.alarm = Math.min(1, state.alarm + CAMERA.alarmRate * dt);
        anySeeing = true;
        state.floorSpotted = true;
        events |= EVENT_ALARM;
      }
    }

    // Lasers: crossing a live beam jumps the alarm.
    for (const laser of state.lasers) {
      updateLaser(laser, state.time);
      if (laserTrips(laser, player, PLAYER.radius)) {
        state.alarm = Math.min(1, state.alarm + 0.22);
        state.floorSpotted = true;
        events |= EVENT_LASER;
      }
    }

    // The alarm cools only while nobody sees the thief.
    if (!anySeeing) state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt);

    if (state.alarm >= 1) {
      events |= lockdown();
      if (state.over) return events;
    }

    // The getaway van opens once the loot quota is met; reach it to clear the floor.
    const exit = tileCenter(state.exit.x, state.exit.y);
    const quotaMet = state.dollars >= state.quota;
    if (quotaMet && Math.hypot(exit.x - player.x, exit.y - player.y) < TILE * 0.9) {
      events |= clearFloor();
    }
    return events;
  }

  function nextFloor() {
    loadFloor(state.floorIndex + 1);
    state.screen = SCREEN_PLAY;
  }

  function startGame() {
    reset();
    state.screen = SCREEN_PLAY;
  }

  reset();
  return { state, reset, startGame, nextFloor, step, loadFloor };
}

// The Velvet Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area (32x18 tiles of 40px); the
// renderer scales it to the window, so no rule below depends on screen size.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 168, // px/s — loud: guards hear footsteps this fast
  sneakSpeed: 96, // px/s — silent, and harder to spot
  hearRadius: 150, // guards hear walking feet inside this many px
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 148,
  investigateSpeed: 104,
  viewRange: 6.4 * TILE, // how far a guard's cone reaches
  halfAngle: 0.61, // radians either side of facing (~70 deg cone)
  spotRateNear: 1.15, // suspicion per second at point-blank range
  spotRateFar: 0.45, // suspicion per second at the cone's edge
  sneakFactor: 0.45, // sneaking player is spotted this much slower
  decayRate: 0.34, // suspicion per second while the player is unseen
  chaseGiveUp: 3.5, // seconds of no sight before a chase becomes a search
  searchTime: 2.6, // seconds a guard searches before resuming patrol
  hearRadius: 190, // guards hear a tossed coin inside this many px
  catchRadius: 24, // touching the player this close catches them
};

export const CAMERA = {
  viewRange: 6.8 * TILE,
  halfAngle: 0.5,
  alarmRate: 0.085, // alarm (0..1) per second while the camera sees the player
  sweepSpeed: 0.55, // radians per second of sweep
};

export const LASER = {
  tripAlarm: 0.22, // alarm added the instant a live beam is crossed
};

export const ALARM = {
  decayRate: 0.022, // alarm per second while nothing sees the player
  catchPenalty: 0.3, // alarm added when a guard catches the player
  lockdownReset: 0.3, // alarm left after a lockdown costs a life
};

export const COIN = {
  perFloor: 3,
  throwRange: 7 * TILE,
  landRadius: 10,
};

export const LOOT_VALUES = { painting: 100, gold: 150, gem: 200, crown: 500 };

export const SCORE = {
  clearBonus: 250,
  timeBonusMax: 300, // shrinks as the floor timer runs
  timeBonusPerSec: 2,
  ghostBonus: 200, // never chased and no lockdown on this floor
};

export const LIVES = 3;

export const PALETTE = {
  backdrop: '#0d0b14',
  floor: '#221d33',
  floorAlt: '#251f38',
  wall: '#4a4360',
  wallTop: '#5d5478',
  shadow: '#120f1e', // dark zones that hide the thief
  shadowEdge: '#2c2547',
  displayCase: '#3a2f52',
  caseGlass: '#7d6bb0',
  lootPainting: '#e8b64c',
  lootGold: '#f2c94c',
  lootGem: '#58d6ff',
  lootCrown: '#ff5d8f',
  player: '#e8e6f0',
  playerSneak: '#b9b4d6',
  guard: '#ff6b5e',
  guardCone: 'rgba(255, 107, 94, 0.20)',
  guardConeHot: 'rgba(255, 107, 94, 0.38)',
  camera: '#ffb020',
  cameraCone: 'rgba(255, 176, 32, 0.16)',
  laser: '#ff3b5c',
  laserOff: 'rgba(255, 59, 92, 0.18)',
  exit: '#3ddc84',
  exitLocked: '#5a5470',
  alarm: '#ff3b5c',
  alarmCalm: '#3ddc84',
  panel: '#171223',
  panelEdge: '#3a2f52',
  text: '#f2eefc',
  muted: '#9a90b8',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';

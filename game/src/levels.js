// The three floors of The Velvet Vault. Each map is 32x18 tiles:
//   # wall (blocks movement and sight)   . floor
//   S shadow (floor you can stand on; hides the thief and blocks sight)
//   C display case (blocks movement and sight)
//   P the thief's start   E the getaway van
// Loot, guard patrols, cameras and lasers live in the metadata below the maps,
// so the maps stay pure terrain. Rows are built from fixed-width zones so a row
// can never be the wrong length: vrow takes 10 + 1 + 10 + 1 + 8 tiles, hrow
// takes three 10-tile zones, each wrapped in the border walls.
import { COLS, ROWS } from './config.js';

function vrow(left, a, mid, b, right) {
  return '#' + left + a + mid + b + right + '#';
}

function hrow(a, b, c) {
  return '#' + a + b + c + '#';
}

const WALL_ROW = '################################';

const FLOOR_1_MAP = [
  WALL_ROW,
  vrow('P......S..', '#', '..........', '#', '........'),
  vrow('.........C', '#', '..........', '#', '...C....'),
  vrow('..S.......', '#', '....C.....', '.', '........'),
  vrow('.........C', '#', '..........', '#', '........'),
  vrow('..C.......', '#', '..S.......', '#', '....C...'),
  vrow('..........', '.', '..........', '#', '........'),
  vrow('......S...', '#', '....C.....', '#', '........'),
  vrow('..........', '#', '..........', '#', '....C...'),
  vrow('..........', '#', '..S.......', '.', '........'),
  vrow('..C.......', '#', '..........', '#', '........'),
  vrow('.......S..', '#', '....C.....', '#', '........'),
  vrow('..........', '.', '..........', '#', '...C....'),
  vrow('..S.......', '#', '..........', '#', '........'),
  vrow('.........C', '#', '..........', '#', '..C.....'),
  vrow('......S...', '#', '..........', '#', '........'),
  vrow('..........', '#', '..........', '#', '.......E'),
  WALL_ROW,
];

const FLOOR_2_MAP = [
  WALL_ROW,
  hrow('P......S..', '..C.......', '..S.......'),
  hrow('.........C', '.........C', '..........'),
  hrow('..S.......', '...C......', '.C....S...'),
  hrow('......C...', '.......S..', '..........'),
  hrow('..C.......', '..S.......', '....C...C.'),
  '########.#######################',
  hrow('......S...', '........C.', '..........'),
  hrow('..C.......', '...S......', '.C....S...'),
  hrow('.........C', '.......S..', '..........'),
  hrow('....S.....', '....C.....', '....C.....'),
  hrow('..C.......', '....S.....', '..C.......'),
  '################.###############',
  hrow('.......S..', '.......C..', '....S.....'),
  hrow('..C.......', '....S.....', '....C.....'),
  hrow('......C...', '..S.......', '....C.....'),
  hrow('.........S', '.......C..', '........E.'),
  WALL_ROW,
];

const FLOOR_3_MAP = [
  WALL_ROW,
  hrow('P......S..', '..C.......', '..S.......'),
  hrow('..........', 'C.........', 'C.........'),
  hrow('..S.......', '....C.....', '..C....S..'),
  hrow('......C...', '.......S..', '..........'),
  hrow('..C.......', '..S.......', '....C...C.'),
  hrow('.........C', '.......S..', '..........'),
  '#............#.....#...........#',
  hrow('......S...', '..#.....#.', '...C......'),
  hrow('..........', '..#.....#.', '....S.....'),
  hrow('..C.......', '..#.....#.', '........C.'),
  '#............#.....#...........#',
  hrow('......S...', '.......C..', '..........'),
  hrow('..C.......', '..S.......', '....C...S.'),
  hrow('.........C', '.......S..', '..........'),
  hrow('....S.....', '....C.....', '....C.....'),
  hrow('..........', '..S.......', '....C...E.'),
  WALL_ROW,
];

// Cameras sit on a wall tile and sweep a cone from it; dir is radians (0 = east,
// PI/2 = south) and sweep is how far the cone swings either side of dir.
export const LEVELS = [
  {
    name: 'The Gallery',
    quota: 300,
    map: FLOOR_1_MAP,
    loot: [
      { x: 18, y: 1, kind: 'painting' },
      { x: 30, y: 3, kind: 'gold' },
      { x: 25, y: 7, kind: 'gem' },
      { x: 2, y: 8, kind: 'painting' },
      { x: 18, y: 13, kind: 'gold' },
    ],
    guards: [
      { path: [[14, 2], [14, 8], [14, 14]] },
      { path: [[24, 2], [24, 15]] },
    ],
    cameras: [{ x: 11, y: 1, dir: 0, sweep: 0.7 }],
    lasers: [{ x1: 10, y1: 6, x2: 12, y2: 6, period: 2.4, phase: 0 }],
  },
  {
    name: 'The Strongroom',
    quota: 500,
    map: FLOOR_2_MAP,
    loot: [
      { x: 26, y: 1, kind: 'painting' },
      { x: 10, y: 3, kind: 'gold' },
      { x: 28, y: 7, kind: 'gem' },
      { x: 4, y: 9, kind: 'painting' },
      { x: 20, y: 10, kind: 'gold' },
      { x: 8, y: 14, kind: 'gem' },
    ],
    guards: [
      { path: [[3, 3], [28, 3]] },
      { path: [[28, 8], [4, 8]] },
      { path: [[4, 15], [28, 15]] },
    ],
    cameras: [
      { x: 7, y: 6, dir: Math.PI / 2, sweep: 0.8 },
      { x: 17, y: 12, dir: Math.PI / 2, sweep: 0.8 },
    ],
    lasers: [
      { x1: 20, y1: 7, x2: 20, y2: 11, period: 2.0, phase: 0.5 },
      { x1: 12, y1: 14, x2: 20, y2: 14, period: 2.8, phase: 0 },
    ],
  },
  {
    name: 'The Crown Suite',
    quota: 800,
    map: FLOOR_3_MAP,
    loot: [
      { x: 24, y: 2, kind: 'painting' },
      { x: 8, y: 4, kind: 'gold' },
      { x: 26, y: 6, kind: 'gem' },
      { x: 16, y: 9, kind: 'crown' },
      { x: 6, y: 13, kind: 'gem' },
      { x: 20, y: 15, kind: 'gold' },
    ],
    guards: [
      { path: [[3, 2], [28, 2]] },
      { path: [[2, 8], [2, 15]] },
      { path: [[15, 8], [17, 8], [17, 10], [15, 10]] },
      { path: [[28, 13], [4, 13]] },
    ],
    cameras: [
      { x: 16, y: 0, dir: Math.PI / 2, sweep: 0.9 },
      { x: 0, y: 9, dir: 0, sweep: 0.7 },
      { x: 31, y: 9, dir: Math.PI, sweep: 0.7 },
    ],
    lasers: [
      { x1: 14, y1: 7, x2: 18, y2: 7, period: 2.2, phase: 0.3 },
      { x1: 14, y1: 11, x2: 18, y2: 11, period: 2.6, phase: 0.9 },
      { x1: 27, y1: 12, x2: 27, y2: 16, period: 2.4, phase: 0 },
    ],
  },
];

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'S';
}

export function isShadowTile(ch) {
  return ch === 'S';
}

/** Parse a level's map into a grid of terrain chars plus its start and exit tiles. */
export function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  let start = { x: 1, y: 1 };
  let exit = { x: COLS - 2, y: ROWS - 2 };
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (grid[y][x] === 'P') {
        start = { x, y };
        grid[y][x] = '.';
      } else if (grid[y][x] === 'E') {
        exit = { x, y };
        grid[y][x] = '.';
      }
    }
  }
  return { grid, start, exit };
}

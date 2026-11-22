// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Flat shapes and canvas text for the HUD and panels.
// A cone is the raycast polygon from vision.js, so what you see is what the
// guard or camera sees.
import { FIELD, FONT, LIVES, PALETTE, TILE } from './config.js';
import { conePolygon, tileCenter } from './vision.js';
import { CAMERA, GUARD } from './config.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

export { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN };

const PANEL = { width: 660, top: 150, line: 34, bottom: 76 };
const HUD_H = 46;

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const dollarsLabel = cachedLabel('Loot $');
  const floorLabel = cachedLabel('');
  const scoreLabel = cachedLabel('Score $');
  const finalLabel = cachedLabel('Score $');
  const bestLabel = cachedLabel('Best $');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function fillPoly(points, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.closePath();
    context.fill();
  }

  function drawFloor(state) {
    const grid = state.grid;
    for (let ty = 0; ty < grid.length; ty += 1) {
      for (let tx = 0; tx < grid[ty].length; tx += 1) {
        const ch = grid[ty][tx];
        const px = tx * TILE;
        const py = ty * TILE;
        if (ch === '#') {
          context.fillStyle = PALETTE.wall;
          context.fillRect(px, py, TILE, TILE);
          context.fillStyle = PALETTE.wallTop;
          context.fillRect(px, py, TILE, 5);
        } else if (ch === 'S') {
          context.fillStyle = PALETTE.shadow;
          context.fillRect(px, py, TILE, TILE);
          context.strokeStyle = PALETTE.shadowEdge;
          context.lineWidth = 1;
          context.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        } else if (ch === 'C') {
          context.fillStyle = PALETTE.displayCase;
          context.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          context.fillStyle = PALETTE.caseGlass;
          context.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
        } else {
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          context.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const { x, y } = item;
      context.save();
      context.translate(x, y);
      // A soft glow so loot reads at a glance, even shrunk: a pulsing halo.
      const pulse = 1 + 0.12 * Math.sin(state.time * 3 + item.x * 0.05);
      context.fillStyle = 'rgba(242, 201, 76, 0.20)';
      context.beginPath();
      context.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
      context.fill();
      if (item.kind === 'painting') {
        context.fillStyle = PALETTE.lootPainting;
        context.fillRect(-14, -11, 28, 22);
        context.fillStyle = '#7a5a1e';
        context.fillRect(-11, -8, 22, 16);
        context.fillStyle = '#3f6d8e';
        context.beginPath();
        context.moveTo(-11, 8);
        context.lineTo(-2, -6);
        context.lineTo(6, 8);
        context.closePath();
        context.fill();
      } else if (item.kind === 'gold') {
        context.fillStyle = PALETTE.lootGold;
        context.fillRect(-13, 2, 26, 8);
        context.fillRect(-10, -6, 20, 8);
        context.fillRect(-6, -13, 12, 7);
      } else if (item.kind === 'gem') {
        context.fillStyle = PALETTE.lootGem;
        context.beginPath();
        context.moveTo(0, -14);
        context.lineTo(11, 0);
        context.lineTo(0, 14);
        context.lineTo(-11, 0);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.65)';
        context.beginPath();
        context.moveTo(0, -14);
        context.lineTo(5, 0);
        context.lineTo(0, 14);
        context.lineTo(-5, 0);
        context.closePath();
        context.fill();
      } else {
        // crown
        context.fillStyle = PALETTE.lootCrown;
        context.beginPath();
        context.moveTo(-14, 8);
        context.lineTo(-14, -6);
        context.lineTo(-7, 2);
        context.lineTo(0, -12);
        context.lineTo(7, 2);
        context.lineTo(14, -6);
        context.lineTo(14, 8);
        context.closePath();
        context.fill();
        context.fillStyle = '#ffd7e6';
        context.beginPath();
        context.arc(0, -12, 2.5, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      text(`$${item.value}`, x, y + 30, 13, PALETTE.gold, 'center');
    }
  }

  function drawExit(state) {
    const c = tileCenter(state.exit.x, state.exit.y);
    const open = state.dollars >= state.quota;
    const pulse = open ? 0.75 + 0.25 * Math.sin(state.time * 5) : 1;
    context.save();
    context.translate(c.x, c.y);
    context.globalAlpha = pulse;
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    context.beginPath();
    context.roundRect(-19, -13, 38, 26, 6);
    context.fill();
    context.fillStyle = '#0d0b14';
    context.fillRect(-14, -9, 12, 9);
    context.fillStyle = open ? '#0d0b14' : '#3a3550';
    context.beginPath();
    context.arc(-10, 14, 4, 0, Math.PI * 2);
    context.arc(10, 14, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    const label = open ? 'GETAWAY' : 'LOCKED';
    const lx = state.exit.x >= 30 ? c.x - 46 : c.x;
    text(label, lx, c.y - 24, 13, open ? PALETTE.exit : PALETTE.muted, 'center');
  }

  function drawCoins(state) {
    for (const coin of state.coins) {
      const ring = 8 + coin.age * 26;
      context.strokeStyle = `rgba(242, 201, 76, ${Math.max(0, 0.7 - coin.age * 0.14)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(coin.x, coin.y, ring, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawLasers(state) {
    for (const laser of state.lasers) {
      context.strokeStyle = laser.live ? PALETTE.laser : PALETTE.laserOff;
      context.lineWidth = laser.live ? 3 : 1.5;
      if (!laser.live) context.setLineDash([6, 6]);
      context.beginPath();
      context.moveTo(laser.x1, laser.y1);
      context.lineTo(laser.x2, laser.y2);
      context.stroke();
      context.setLineDash([]);
      for (const [ex, ey] of [[laser.x1, laser.y1], [laser.x2, laser.y2]]) {
        context.fillStyle = laser.live ? PALETTE.laser : '#7a2f42';
        context.beginPath();
        context.arc(ex, ey, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawSmoke(state) {
    for (const cloud of state.smokes) {
      const fade = 1 - cloud.age / cloud.duration;
      context.fillStyle = `rgba(178, 172, 196, ${0.34 * fade})`;
      context.beginPath();
      context.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = `rgba(226, 222, 240, ${0.22 * fade})`;
      context.beginPath();
      context.arc(cloud.x - cloud.radius * 0.3, cloud.y - cloud.radius * 0.2, cloud.radius * 0.55, 0, Math.PI * 2);
      context.arc(cloud.x + cloud.radius * 0.35, cloud.y + cloud.radius * 0.25, cloud.radius * 0.45, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      fillPoly(conePolygon(state.grid, camera.x, camera.y, camera.dir, CAMERA.halfAngle, CAMERA.viewRange), PALETTE.cameraCone);
    }
    for (const guard of state.guards) {
      const hot = guard.state === 'chase' || guard.suspicion > 0.6;
      fillPoly(
        conePolygon(state.grid, guard.x, guard.y, guard.dir, GUARD.halfAngle, GUARD.viewRange),
        hot ? PALETTE.guardConeHot : PALETTE.guardCone,
      );
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      context.save();
      context.translate(guard.x, guard.y);
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.rotate(guard.dir);
      context.fillStyle = '#ffd9d4';
      context.beginPath();
      context.arc(6, -4, 2.4, 0, Math.PI * 2);
      context.arc(6, 4, 2.4, 0, Math.PI * 2);
      context.fill();
      context.restore();
      // Suspicion arc over the guard's head.
      if (guard.suspicion > 0.02) {
        context.strokeStyle = guard.suspicion > 0.6 ? '#ff3b5c' : '#ffb020';
        context.lineWidth = 4;
        context.beginPath();
        context.arc(guard.x, guard.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        context.stroke();
      }
      const mark = guard.state === 'chase' ? '!' : guard.state === 'suspicious' || guard.state === 'investigate' ? '?' : null;
      if (mark) text(mark, guard.x, guard.y - GUARD.radius - 12, 20, guard.state === 'chase' ? '#ff3b5c' : '#ffb020', 'center');
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      context.save();
      context.translate(camera.x, camera.y);
      context.rotate(camera.dir);
      // A wall-mounted unit that reads as a camera at a glance: a bright body,
      // a dark lens, and a thin amber ring around it.
      context.strokeStyle = camera.seeing ? '#ff3b5c' : PALETTE.camera;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(2, 0, 11, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = camera.seeing ? '#ff3b5c' : PALETTE.camera;
      context.fillRect(-5, -7, 14, 14);
      context.fillStyle = '#1a1426';
      context.beginPath();
      context.arc(11, 0, 4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    context.save();
    context.translate(player.x, player.y);
    context.globalAlpha = player.sneaking ? 0.75 : 1;
    context.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    context.beginPath();
    context.arc(0, 0, player.radius, 0, Math.PI * 2);
    context.fill();
    // The thief's mask: a dark band with two eyes, facing the way they move.
    context.rotate(player.facing);
    context.fillStyle = '#241d3a';
    context.fillRect(-2, -8, 10, 16);
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(4, -3.5, 1.8, 0, Math.PI * 2);
    context.arc(4, 3.5, 1.8, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (player.hidden) {
      context.strokeStyle = 'rgba(232, 230, 240, 0.7)';
      context.lineWidth = 1.5;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      text('HIDDEN', player.x, player.y - player.radius - 10, 11, PALETTE.muted, 'center');
    }
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(13, 11, 20, 0.82)';
    context.fillRect(0, 0, FIELD.width, HUD_H);
    context.textBaseline = 'top';
    text(dollarsLabel(state.dollars), 16, 14, 20, PALETTE.gold, 'left', 'top');
    text(`/ $${state.quota}`, 16 + context.measureText(dollarsLabel(state.dollars)).width + 6, 16, 16, PALETTE.muted, 'left', 'top');
    text(floorLabel(`${state.floor.name}  ·  Floor ${state.floorIndex + 1}/3  ·  ${scoreLabel(state.score)}`), 16, 30, 12, PALETTE.muted, 'left', 'top');
    // The alarm meter, centre stage: it is the heist's heartbeat.
    const meterW = 340;
    const meterX = (FIELD.width - meterW) / 2;
    const level = state.alarm;
    const color = level > 0.66 ? '#ff3b5c' : level > 0.33 ? '#ffb020' : PALETTE.alarmCalm;
    text('ALARM', meterX - 8, 14, 16, color, 'right', 'top');
    context.fillStyle = '#2c2547';
    context.fillRect(meterX, 16, meterW, 16);
    context.fillStyle = color;
    context.fillRect(meterX, 16, meterW * level, 16);
    context.strokeStyle = '#5d5478';
    context.lineWidth = 1;
    context.strokeRect(meterX + 0.5, 16.5, meterW, 16);
    text(`${Math.round(level * 100)}%`, meterX + meterW + 8, 14, 16, color, 'left', 'top');
    const mins = Math.floor(state.floorTime / 60);
    const secs = Math.floor(state.floorTime % 60);
    text(`${mins}:${String(secs).padStart(2, '0')}`, FIELD.width - 16, 14, 16, PALETTE.text, 'right', 'top');
    // Lives as dots, then the coins left — top right, under the timer.
    for (let i = 0; i < LIVES; i += 1) {
      context.fillStyle = i < state.lives ? '#ff5d8f' : '#3a2f52';
      context.beginPath();
      context.arc(FIELD.width - 24 - i * 22, 38, 6, 0, Math.PI * 2);
      context.fill();
    }
    text(`Coins ${state.coinsLeft} · Smoke ${state.smokesLeft}`, FIELD.width - 16 - LIVES * 22 - 12, 30, 12, PALETTE.muted, 'right', 'top');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, height - 2);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 44, accent || PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'You are Wren, a cat-burglar. Pocket the loot quota,',
    'then reach the getaway van.',
    'Guards sweep vision cones — shadows hide you.',
    'Cameras raise the alarm. Lasers blink.',
    'Move WASD / arrows. Hold Shift to sneak.',
    'Click to toss a coin and lure a guard.',
    'E drops a smoke cloud ($50) that blinds every cone.',
    'Loud steps are heard. At 100% alarm the building',
    'locks down and you lose a life.',
    '',
  ];

  /** Paint one frame: the floor, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state);
    drawLoot(state);
    drawExit(state);
    drawCoins(state);
    drawLasers(state);
    drawCones(state);
    drawSmoke(state);
    drawGuards(state);
    drawCameras(state);
    drawPlayer(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('THE VELVET VAULT', TITLE_LINES, 'Press Space or click to start the heist', PALETTE.gold);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_CLEAR) {
      const ghost = state.floorSpotted ? 0 : 200;
      const timeBonus = Math.max(0, 300 - Math.floor(state.floorTime) * 2);
      drawPanel('Clean getaway!', [
        `${state.floor.name} cleared — loot $${state.dollars} of $${state.quota} quota.`,
        `Clear bonus $250  ·  Time bonus $${timeBonus}  ·  Ghost bonus $${ghost}`,
        scoreLabel(state.score),
        bestLabel(best),
      ], state.floorIndex + 1 >= 3 ? '' : 'Press Space for the next floor', PALETTE.exit);
    } else if (screen === SCREEN_OVER) {
      drawPanel('Caught!', [
        'The vault keeps its secrets — this time.',
        finalLabel(state.score),
        bestLabel(best),
      ], 'Press Space or click to try again', '#ff3b5c');
    } else if (screen === SCREEN_WIN) {
      drawPanel('THE PERFECT HEIST', [
        'Every floor cleared. The Crown is yours, and the van is gone before dawn.',
        finalLabel(state.score),
        bestLabel(best),
      ], 'Press Space or click to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

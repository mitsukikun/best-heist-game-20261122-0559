// Keyboard and mouse input. Held keys give a steering vector; one-shot presses
// (start, pause, mute) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A mouse click
// is a coin toss: the canvas point it lands on is queued for the world.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SNEAK.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    click = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  });

  return {
    /** The steering vector from the held keys, each axis in -1..1. */
    move() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        if (LEFT.has(code)) x -= 1;
        else if (RIGHT.has(code)) x += 1;
        else if (UP.has(code)) y -= 1;
        else if (DOWN.has(code)) y += 1;
      }
      return { x, y };
    },
    sneak() {
      for (const code of keys) if (SNEAK.has(code)) return true;
      return false;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The queued coin-toss point, if any, in playfield coordinates. */
    takeClick() {
      const point = click;
      click = null;
      return point;
    },
    /** Test hooks: pretend keys are held, and queue a click, without a browser. */
    _test: {
      press(code) {
        keys.add(code);
      },
      release(code) {
        keys.delete(code);
      },
      clickAt(x, y) {
        click = { x, y };
      },
    },
  };
}

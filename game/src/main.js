// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// floor-clear, game over and win.
//
// ?seed=N fixes the random seed. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. window.__velvet exposes the world and input for playtests.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_CHASE,
  EVENT_CLEAR,
  EVENT_COIN,
  EVENT_LASER,
  EVENT_LOCKDOWN,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_WIN,
  SCREEN_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import {
  alarmHum,
  soundAlarmTick,
  soundCaught,
  soundChase,
  soundClear,
  soundCoin,
  soundLaser,
  soundLockdown,
  soundPickup,
  soundWin,
  stopAlarmHum,
  toggleMute,
  unlockAudio,
} from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let prevAlarm = 0;

  // The playtest hook: state and input, without a browser.
  window.__velvet = { world, input, get screen() { return screen; } };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.startGame();
    accumulator = 0;
    prevAlarm = 0;
    screen = SCREEN_PLAY;
    unlockAudio();
    announce(`Playing. ${LIVES} lives. Steal $${world.state.quota} and reach the van.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    stopAlarmHum();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Caught. Game over. Score $${world.state.score}. Best $${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    stopAlarmHum();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`The perfect heist. Score $${world.state.score}. Best $${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_CLEAR) {
      world.nextFloor();
      screen = SCREEN_PLAY;
      announce(`Floor ${world.state.floorIndex + 1}: ${world.state.floor.name}.`);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function playSound(events) {
    if (events & EVENT_PICKUP) soundPickup(100);
    if (events & EVENT_COIN) soundCoin();
    if (events & EVENT_CHASE) soundChase();
    if (events & EVENT_LASER) soundLaser();
    if (events & EVENT_CAUGHT) soundCaught();
    if (events & EVENT_LOCKDOWN) soundLockdown();
    if (events & EVENT_CLEAR) soundClear();
    if (events & EVENT_WIN) soundWin();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, null, true);
      return;
    }
    const events = world.step(STEP, input.move(), input.sneak(), input.takeClick(), false);
    playSound(events);
    if (world.state.alarm > prevAlarm && world.state.alarm > 0.5 && Math.random() < 0.06) soundAlarmTick();
    prevAlarm = world.state.alarm;
    alarmHum(world.state.alarm);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WIN) winGame();
    else if (events & EVENT_CLEAR) {
      screen = SCREEN_CLEAR;
      stopAlarmHum();
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Clean getaway. Score $${world.state.score}.`);
    } else if (events & EVENT_CAUGHT) {
      announce(world.state.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${world.state.lives} lives left.`);
    } else if (events & EVENT_LOCKDOWN) {
      announce('Lockdown. The building seals itself.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Velvet Vault. Press Space or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

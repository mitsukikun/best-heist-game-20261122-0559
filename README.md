# The Velvet Vault — Make the best heist game (best-heist-game-20261122-0559)

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/mitsukikun/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/mitsukikun/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down heist game in pure vanilla JS. No libraries, no build step, no
network request: `game/index.html` opens in desktop Chrome and just plays.

## The game

You are Wren, a cat-burglar. Pocket the loot quota on each floor, then reach
the getaway van before the alarm hits lockdown.

- **3 hand-built floors** (The Gallery, The Strongroom, The Crown Suite) with
  2/3/4 patrolling guards, 1/2/3 sweeping security cameras and 1/2/3 blinking
  laser beams.
- **Raycast vision cones** clipped by walls, display cases and shadows.
  Guards, cameras and lasers all feed one alarm meter (0–100%): at 100% the
  building locks down and Wren loses a life (3 lives).
- **Shadows hide you** (and block sight). **Shift** sneaks silently; walking
  is loud and heard. **Click** tosses a coin that pulls guards over to
  investigate.
- **Loot with dollar values** (painting $100, gold $150, gem $200, the Crown
  $500). **Score:** dollars stolen, plus level-clear, time and ghost bonuses.
  Procedural WebAudio sounds only (no audio files). Best score kept in
  localStorage.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## Screenshots

Deterministic staged scenes, produced by the game's own code stepping itself
with an autopilot (`game/src/shots.js`):

- `screenshots/1-start.jpg` — title screen over the live floor
- `screenshots/2-play.jpg` — mid-play: loot pocketed, guard cone, camera cone, laser beam, alarm meter
- `screenshots/3-end.jpg` — floor-clear panel

---

<sub>Entered on [make.fun](https://make.fun/?ref=tvfbjxfd&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>

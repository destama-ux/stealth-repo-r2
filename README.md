# stealth-repo-r2

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/destama-ux/stealth-repo-r2/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/destama-ux/stealth-repo-r2/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

## LAMPBLACK: The Gilded Vault

A top-down 2D stealth heist game for a desktop browser. You are the Lampblack
Thief, working through the five floors of the Gilded Vault — a lamplit museum
of coin, portraits, clockwork, relics and, at its heart, the Lampblack Crown.
Steal the required loot on each floor and reach the green lift door unseen.

The game is fully offline: plain static files, vanilla JavaScript on a
canvas, no build step, no network requests, no external assets. All sound is
generated with WebAudio; all art is drawn in code.

### The campaign

- **5 heist levels** (floors), **20 guards** on learnable patrol routes and
  **30 treasures** in total, from the Brass Abacus to the Lampblack Crown.
- **Guards with vision cones** — direction, range and field of view, blocked
  by walls (cones are raycast-clipped around cover, exactly as sight works).
- **Light and shadow** — dark shadow zones are drawn darker on the floor;
  stand in one and guard vision against you shrinks to about a single tile.
- **Recoverable detection** — being seen fills the detection meter; break
  line of sight and it decays while guards search your last seen position.
  Only a completely full meter catches you (and costs the floor's ghost
  bonus).
- **Three gadgets**, limited per floor:
  - **Pebble** (Q, then click): a thrown noise-maker that pulls nearby
    guards off their patrols to investigate.
  - **Smoke Bomb** (F): a cloud around you that blocks every vision cone.
  - **EMP Charge** (E): disables the floor's cameras and laser tripwires
    for several seconds.
- **Security cameras** with sweeping cones that fill detection faster, and
  **laser tripwires** that surge detection when crossed (unless EMP'd).
- **Scoring** — loot value plus a time bonus plus a **ghost bonus** for a
  floor finished with zero full detections; **1–3 stars** per floor on the
  level-complete screen, a campaign total, and a final victory screen.

### How to run

Open `game/index.html` in a desktop browser (or serve `game/` with any
static file server) and play. No installation, no network.

Hand-in (make.fun program): with Node 22,

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` there using `buildDossier` from
`vendor/makefun-game.ts` (the kit's library, vendored unchanged).

Deterministic screenshot modes (used for the images in `screenshots/`):

- `game/index.html?shot=start&seed=1` — title screen
- `game/index.html?shot=play&seed=1` — floor I mid-gameplay
- `game/index.html?shot=end&seed=1` — campaign victory screen

### Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Q (or 1), then click | Throw a pebble to the clicked point |
| F (or 2) | Smoke bomb |
| E (or 3) | EMP charge |
| P / Esc | Pause |
| R | Restart the floor |
| M | Mute / unmute |
| Enter / click | Advance title, intro, caught and complete screens |
| Mouse | Aim pebbles; HUD buttons for pause / restart / mute |

### Layout

- `main.ts` — the hand-in program (Node 22, standard library only)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `game/index.html` — page, HUD and script order
- `game/src/config.js` — constants, palette, seeded RNG
- `game/src/levels.js` — the five heists as data (`FIVE_HEISTS`)
- `game/src/guards.js` — patrols, vision, detection, cameras, lasers
- `game/src/gadgets.js` — pebble, smoke bomb, EMP
- `game/src/render.js` — all canvas drawing, including every screen
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — generated WebAudio bleeps
- `game/src/shots.js` — deterministic `?shot=` screenshot poses
- `game/src/main.js` — game state, loop, scoring, campaign
- `screenshots/` — real renders of the game taken in a headless browser
- `shots.json` — the screenshot names and their URLs

MIT licensed — see `LICENSE`.

## Run it

```sh
python3 -m http.server 8000 --directory game
# open http://localhost:8000 in a desktop browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=9sgjf964&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>

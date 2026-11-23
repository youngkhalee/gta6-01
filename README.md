# gta6-01
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/youngkhalee/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/youngkhalee/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Neon Harbor

An original open-world crime game that plays in a desktop browser from static files — no build step, no network requests, no libraries. All art is drawn in code on a canvas and all sound is synthesized with WebAudio.

Vale Cruz came home to Neon Harbor, a sun-soaked coastal city, to start clean. One old friend — valet Rico Mendes, who owes the marina crew money — pulls Vale back in: steal a first set of wheels, run a marina drop, win back a race car, clear the Flamingo crew off the docks, and pull off the Azure Score. Then the whole city opens up with repeatable taxi fares, package pickups and street races.

## What's in the game

- **A living city** — a 3400×2600 world with a road grid, sidewalks, named buildings, palm trees, streetlights, benches, a sandy beach and the sea.
- **On foot and by car** — walk, sprint, aim with the mouse and shoot; press E to enter or steal any parked or traffic car and drive it with real acceleration, braking, steering and collision damage.
- **Traffic and pedestrians** — cars follow the road network, brake for obstacles and honk; pedestrians stroll the sidewalks, flee gunfire and dive away from speeding cars.
- **Wanted system and police** — crimes raise your stars (0–5). Police cruisers and officers pursue by car and on foot, shoot back, and bust you if they hold you at close range. Hide to cool the heat down. BUSTED and WASTED screens respawn you at Harbor PD or Harbor Clinic for a fee.
- **Missions and story** — five story missions with dialogue: First Wheels, Marina Drop, Hot Pursuit Hearts, Dockside Trouble and The Azure Score, plus endless side jobs.
- **Combat** — pistol with magazine and reload, tracers, muzzle flash, hit particles, hostile gang members who shoot back.
- **HUD and minimap** — health and armor bars, cash, wanted stars, ammo, clock, current objective, and a live minimap with mission markers and police blips.
- **Start screen, pause and save** — title screen with New Game / Continue, pause menu, and a localStorage save (press M, and automatic saves after every mission).
- **Polish** — day/night cycle with headlights and lit windows, screen shake, smoke and sparks, engine and siren synthesis, and a sunny bass-line music loop.

## Controls

- WASD / arrows — move or drive
- Mouse — aim · Click or F — shoot · R — reload
- E — enter / exit car · Shift — sprint · Space (in car) — handbrake
- P / Esc — pause · M — save · Enter — advance dialogue / start

## Run it

```sh
node serve.ts
```

then open http://localhost:8080

To hand the game in the way the bounty program does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page
- `game/src/city.js` — city generation, roads, collisions
- `game/src/vehicles.js` — cars, traffic AI, driving physics
- `game/src/pedestrians.js` — pedestrians and fleeing
- `game/src/police.js` — wanted level, police pursuit, busts
- `game/src/missions.js` — story missions and side jobs
- `game/src/render.js` — world, HUD, minimap and menus
- `game/src/audio.js` — synthesized sound and music
- `game/src/main.js` — game state and the main loop

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

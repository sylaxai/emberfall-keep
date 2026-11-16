# EMBERFALL KEEP — design brief (best-game-01, second entry)

Build this game exactly as specified. You are the coding agent: write every file
listed below fresh, from this spec. Do NOT copy the kit starter's game code
(Block Dodger) and do NOT copy any other game's code — different genre,
different mechanics, different art. Only the kit's `vendor/makefun-game.ts`
(already in this repo, byte-identical to the kit) and the MIT LICENSE are
reused. No libraries, no network requests, no assets: plain ES modules +
canvas 2D + WebAudio, all files under `game/`.

## Concept

EMBERFALL KEEP: a tower-defense strategy game. You are the keeper of a mountain
keep. Waves of ember-corrupted creatures march along a winding dirt road toward
the keep's gate. Build towers on the grass beside the road, upgrade them, and
stop every wave. 12 waves, a boss on wave 12. Win by surviving all 12 waves;
lose when the keep's 20 hearts are gone. Strategy, not reflexes: where you
build and when you upgrade decides everything.

Art direction: warm fantasy — deep moss-green field, warm amber/gold UI, ember
glow on enemies. Palette: background #0e1a12, grass A #1d3324, grass B #24402c,
path dirt #6b543a, path edge #8a6f4d, keep stone #9aa3ad, wood #7a5230, gold
#ffd94d, arrow #ffe9a8, cannon ember #ff7a3d, frost ice #7ad9ff, arcane violet
#c77dff, tesla yellow #ffe14d, enemy ember #ff5a3d, text #f5ead6, muted
#a8b39a. Everything reads at a glance when the screenshot is shrunk: big gold
count, big hearts, big wave banner, bright towers and enemies on a dark field.

## Field and path

- FIELD 1280x720. Grid 16 cols x 9 rows, cell 80 px. Cell (c, r) centre is
  (c*80+40, r*80+40).
- Path waypoints (pixel centres, in order): (-40,360) -> (360,360) ->
  (360,120) -> (920,120) -> (920,600) -> (1160,600) -> (1160,360) ->
  (1280,360). The keep gate sits at the right edge, cell (15,4).
- Path cells (no building here): row 4 cols 0-4; col 4 rows 1-4; row 1 cols
  4-11; col 11 rows 1-7; row 7 cols 11-14; col 14 rows 4-7; row 4 cols 14-15.
  Every other cell is grass and buildable (116 cells).
- Enemies walk the waypoint polyline from spawn (-40,360) to the gate
  (1280,360). Reaching the gate = a leak.

## Files (one clear job each)

- `game/index.html` — canvas `#game` + screen-reader `#status` line + module
  script `./src/main.js`. Dark background, canvas fixed full-window.
- `game/src/config.js` — every tuning number and colour (FIELD 1280x720,
  GRID 16x9, CELL 80, WAYPOINTS, PATH_CELLS, TOWERS, ENEMIES, WAVES, ECONOMY,
  PALETTE, FONT, BEST_KEY `emberfall-keep.best`). No logic.
- `game/src/random.js` — mulberry32 seeded RNG `createRandom(seed)`.
- `game/src/input.js` — mouse (move, click, hover cell) + keyboard (1-5
  select tower type, Space/Enter start next wave, F speed 1x/2x, P/Esc pause,
  M mute, Esc deselect, R restart on end screens). Exposes `mouse` {x, y
  (field coords, via the renderer's view transform — pass a function that
  converts client coords to field coords), clicked, cell}, `takeActions()`
  returning one-shot flags `ACTION_START_WAVE`, `ACTION_PAUSE`,
  `ACTION_MUTE`, `ACTION_SPEED`, `ACTION_RESTART`, `ACTION_DESELECT`, and
  `selectedTowerType()` from keys 1-5.
- `game/src/audio.js` — WebAudio synth only, no assets. `createAudio()`:
  `unlock()` on first gesture; `shoot()` (short pluck); `cannon()` (noise
  burst + sine drop); `frost()` (soft chime); `zap()` (crackle); `coin()`
  (two-note arpeggio); `leak()` (low thud); `horn()` (wave-start horn);
  `win()` (fanfare); `lose()` (descending dirge); `build()` (wood knock);
  `upgrade()` (rising chime); `toggleMute()`; a quiet ambient pad loop
  (two detuned sines, very low gain) during play. All functions safe to call
  before unlock (no-ops) and when muted. Keep gains low so nothing clips.
- `game/src/world.js` — the rules and state, no drawing, no browser in it.
  `createWorld(random)` returns `{ state, reset, step, build, upgrade,
  sell, startWave }`. State: `gold`, `lives` (20), `score`, `wave` (0 =
  before wave 1), `waveState` (`'build' | 'fight' | 'clear' | 'won' |
  'lost'`), `towers[]`, `enemies[]`, `projectiles[]`, `particles[]`,
  `texts[]` (floating gold/score popups), `spawnQueue[]`, `spawnTimer`,
  `speed` (1 or 2), `kills`, `leaked`, `events` bit flags returned by
  step(): `EVENT_SHOOT`, `EVENT_CANNON`, `EVENT_FROST`, `EVENT_ZAP`,
  `EVENT_KILL`, `EVENT_COIN`, `EVENT_LEAK`, `EVENT_WAVE_CLEAR`, `EVENT_WIN`,
  `EVENT_LOSE`, `EVENT_BUILD`, `EVENT_UPGRADE`.
  - Towers (cost, damage, interval s, range px, special):
    `arrow` (50, 8, 0.5, 176, single target, fast arrow projectile);
    `cannon` (100, 22, 1.6, 160, splash radius 64);
    `frost` (75, 2, 1.0, 160, slows target 40% for 1.5 s);
    `arcane` (150, 40, 2.0, 256, slow glowing orb);
    `tesla` (125, 12, 1.25, 192, chains to up to 3 targets, instant zap).
    Each tower has `level` 1..3. Upgrade cost L2 = round(0.75 * base),
    L3 = round(1.25 * base). Each level: damage x1.6, range x1.08, interval
    x0.9 (applied cumulatively from base). Sell returns 70% of total
    invested (floor). Targeting: the enemy furthest along the path (greatest
    distance travelled) within range.
  - Enemies (hp, speed px/s, gold, score, leak lives, radius):
    `imp` (30, 55, 6, 10, 1, 13); `runner` (18, 110, 5, 15, 1, 10);
    `armored` (160, 32, 14, 25, 1, 16); `healer` (40, 50, 12, 30, 1, 12,
    heals allies within 96 px for 6 hp/s); `swarm` (8, 90, 2, 5, 1, 7);
    `boss` (2400, 26, 200, 500, 5, 30). HP scales per wave: hp *
    (1 + 0.18 * (wave - 1)). Speed scales: x (1 + 0.02 * (wave - 1)), capped
    at x1.2. Boss appears only in wave 12.
  - Waves (composition = list of [kind, count], spawned in shuffled order,
    spawn interval 0.9 s x 0.96^(wave-1), min 0.45 s):
    1: imp 8. 2: imp 12, runner 4. 3: imp 10, runner 8, armored 2.
    4: imp 8, runner 6, armored 4, swarm 6. 5: imp 12, runner 8, armored 6,
    healer 2. 6: runner 10, armored 8, swarm 12, healer 3.
    7: imp 14, runner 10, armored 8, healer 4, swarm 12.
    8: runner 8, armored 10, healer 6, swarm 18.
    9: imp 16, runner 12, armored 10, healer 6.
    10: runner 12, armored 12, healer 8, swarm 24.
    11: imp 20, runner 16, armored 12, healer 8, swarm 24.
    12: boss 1, runner 10, healer 6, swarm 12.
    Wave-clear bonus gold: 25 + 15 * wave. Start gold 220, lives 20.
    When the spawn queue is empty and no enemies remain: wave clear — bonus
    gold, `waveState = 'clear'` for 2.5 s, then back to `'build'`. After
    wave 12 clears: `waveState = 'won'`, score += 50 * lives remaining.
    Lives <= 0: `waveState = 'lost'`.
  - Projectiles: `{x, y, tx, ty, target, speed, damage, splash, kind}`.
    Arrow speed 520, cannonball 380, orb 300. A projectile that reaches its
    target (or the target dies first — then it fizzles at the last known
    position, no damage) applies damage; cannon applies splash to every
    enemy within 64 px of the impact. Tesla has no projectile: instant
    chain — damage the target, then the nearest enemy within 120 px of the
    previous one, up to 3 total; draw the zap lines as particles for 0.15 s.
  - Particles: fixed pool of 512, each `{active, x, y, vx, vy, life,
    maxLife, size, color}`. Explosion: 12 particles. Hit spark: 4. Leak:
    red burst at the gate + shake. Floating texts: `{x, y, text, life}`
    rise 40 px/s, life 0.9 s ("+6g", "+10"). Shake trauma decays 1.6/s;
    render offset uses trauma^2 x 10 px.
  - `build(type, cell)` — fails (returns false, no gold spent) if the cell
    is a path cell, occupied, or gold is short. `upgrade(tower)` / `sell(tower)`
    likewise. `startWave()` — only from `'build'` state, builds the spawn
    queue for wave + 1 from WAVES and sets `waveState = 'fight'`.
  - Nothing allocates after `createWorld` returns (reuse pool slots).
    `step(dt, input, sound)` where input is `{mouse, actions, hoverCell,
    selectedType}` — the world reads clicks/keys from it and returns event
    flags; the caller plays sounds from the flags. Keep world free of
    audio/DOM. `reset()` restores a fresh run (gold 220, lives 20, wave 0,
    score 0, no towers/enemies).
- `game/src/render.js` — drawing only. `createRenderer(canvas)` returns
  `{ draw(state, screen, ui), clientToField(cx, cy) }` where `ui` is
  `{best, muted, selectedType, hoverCell, selectedTower, wavePreview}`.
  Fixed 1280x720 field scaled to fit the window, centred, devicePixelRatio
  aware. Draws: grass checker with subtle speckles, dirt path with edge
  stones and centre dashes, the keep (stone tower with battlements, flag,
  gate arch) at the right edge, towers as distinct readable shapes (arrow =
  wooden tower + bow, cannon = stone base + barrel, frost = ice crystal,
  arcane = floating violet orb on a pedestal, tesla = copper coil with
  arcs), level pips on towers, enemies as distinct shapes with HP bars
  (imp = orange imp with horns, runner = small red dart, armored = grey
  rock golem, healer = green wisp with plus, swarm = tiny dark bat, boss =
  huge ember titan with crown of flame), slow tint (pale blue ring) on
  slowed enemies, heal sparkles, projectiles with trails, zap polylines,
  particles, floating texts, range ring + ghost preview (green = buildable,
  red = blocked) for the selected tower type at the hover cell, selected
  tower range ring, HUD bar (gold, hearts, wave, score, enemies left,
  speed, pause, mute buttons as drawn clickable rects — main.js maps
  clicks), build bar at the bottom (5 tower cards: icon, name, cost,
  hotkey 1-5, greyed when unaffordable), wave preview panel (next wave
  composition as small icons + counts), wave banner ("WAVE 3", "WAVE
  CLEAR +70g"), boss HP bar across the top during wave 12, title screen
  (big title, subtitle, how-to-play lines, best score, "Click or press
  Enter to start"), victory screen (score, waves, kills, best, "Press R to
  play again"), defeat screen (wave reached, score, "Press R to retry").
  Every screen readable when shrunk: big numbers, high contrast.
- `game/src/shots.js` — scripted play for `?shot=<name>&seed=<n>` so
  screenshots are reproducible. `runShot(world, name, random)` drives the
  world with a fixed auto-player (no rendering): build a fixed strong tower
  layout on good cells near the path bends, start waves as soon as the
  previous one clears, upgrade towers when gold allows, until the target
  state, then return `{done: true}`. Targets: `start` = title screen (no
  play); `play` = mid-fight in wave 5 with towers firing; `action` = boss
  wave 12 mid-fight with the boss on screen; `end` = victory screen. The
  auto-player MUST win in local testing (see tools/sim.js) — tune its build
  order until it does, and keep it legitimate (no free gold, no debug
  cheats: it only calls the world's public build/upgrade/startWave).
- `game/src/main.js` — the loop and screens. Fixed timestep 1/60 with
  accumulator, `speed` 1x/2x multiplies steps. Screens: `'title'`,
  `'playing'`, `'won'`, `'lost'` (pause overlays on top of playing).
  Owns: input wiring, audio triggers from world event flags, HUD button
  clicks (build-bar cards, Start Wave, speed, pause, mute, upgrade, sell),
  localStorage best (`emberfall-keep.best` {score, wave}), the `#status`
  screen-reader line (announces wave starts, wave clears, leaks, win/lose),
  and `?shot=` handling (run the shot script, render one frame, stop the
  loop so the screenshot is stable). Exposes `window.__game` = {state,
  world} for tests.
- `main.ts` — the entrypoint (Node 22, standard library only): copy
  `game/` and `screenshots/` from beside this file to
  `process.env.MAKEFUN_OUTPUT_DIR || '/output'` and write
  `/output/dossier.json` with the vendored `buildDossier`, using the
  scorer's caps (text_max_bytes 163840, screenshots max 4 max_bytes
  262144, game_max_files 993, game_max_bytes 50331648,
  game_path_max_bytes 1000). Write it fresh in your own words — do NOT
  copy the kit starter's main.ts.
- `serve.ts` — a tiny static dev server (Node 22 stdlib): serve this
  directory on port 8080 (`node serve.ts`, open http://localhost:8080).
  Write it fresh.
- `tools/sim.js` — headless balance test (Node, no browser): load
  world.js + config.js + random.js as ES modules, run the shots.js
  auto-player through all 12 waves with fixed dt, print per-wave lives,
  gold, kills and the final result (WIN/LOSE). Must print WIN. Run it
  after every balance change.
- `tools/shoot.py` — screenshot helper (Python Playwright sync API): serve
  `game/` on 127.0.0.1 with Python's http.server, open each `shots.json`
  entry at 1280x720, wait for `window.__shotReady`, and save JPEGs to
  `screenshots/<name>` under 262144 bytes using qualities 85, 75, then 65.
  Fail on console/page errors. Accepts `--port`.
- `tools/test_play.py` — Python Playwright mouse smoke test: start from the
  title, build two towers, start a wave, fight, pause and resume, then check
  every shot scene becomes ready with no console/page errors. Accepts
  `--port`. Run both browser tools outside the restricted sandbox.
- `shots.json` — `[{name: "1-cover.jpg", query: "?shot=start&seed=1"},
  {name: "2-play.jpg", query: "?shot=play&seed=1"}, {name: "3-action.jpg",
  query: "?shot=action&seed=1"}, {name: "4-win.jpg", query:
  "?shot=end&seed=1"}]`.
- `README.md` — from the requirements template: title `emberfall-keep`,
  badges with owner `sylaxai`, description of the game, run command
  (`node serve.ts` then open http://localhost:8080), footer referral code
  `wgbpxxkc`.
- `.gitignore` — `out/`, `test-shots/`, `node_modules/`.

## Balance targets (verify with tools/sim.js + real play)

- A decent first-time player who reads the how-to-play should reach wave 6-8.
- The auto-player (sensible layout, upgrades when affordable) WINS with
  3+ lives left. If it loses, strengthen the player (cheaper upgrades, more
  wave bonus, or +10% tower damage) — never weaken the waves silently.
- No wave should be unwinnable from a full-lives state; the boss must be
  killable by a wave-12 board (about 14-18 towers, mostly level 2-3).
- First 60 seconds must teach: wave 1 is 8 imps only, starting gold 220
  buys 2-3 towers before wave 1.

## Definition of done

- `node --check` clean on every JS file; `node tools/sim.js` prints WIN;
  `MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0 and writes out/dossier.json
  with 4 screenshots; two runs produce byte-identical out/dossier.json
  (deterministic: no wall-clock time, no unseeded randomness in the
  dossier); `node serve.ts` + Playwright screenshots show the title, a
  busy mid-wave fight, the boss fight and the victory screen, each clearly
  readable at 480 px wide; the game is playable end-to-end by mouse alone
  (build, upgrade, sell, start wave, win, restart) with no console errors.

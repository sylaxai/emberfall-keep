// Headless replay for one staged shot: run the exact shot the browser runs
// (same seed + step count) and print the HUD state as JSON. Used by
// tools/check-shot-truth.py to assert the browser's numbers are real.
// Usage: node tools/replay-shot.mjs --shot play --seed 2137 [--steps 18240]
import { createWorld } from "../game/src/world.js";
import { createRandom } from "../game/src/random.js";
import { runShot } from "../game/src/shots.js";

const argv = process.argv.slice(2), args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
const world = createWorld(createRandom(Number(args.seed || 1)));
runShot(world, args.shot, Number(args.steps || 0) || undefined);
const s = world.state;
let foes = 0;
for (const e of s.enemies) if (e.active) foes++;
foes += s.spawnCount - s.spawnIndex;
console.log(JSON.stringify({ gold: s.gold, lives: s.lives, wave: s.wave, score: s.score, kills: s.kills, foes }));

// Staged-cover seed scan (SUNWRIGHT stageplan.mjs pattern). For each seed,
// drive the auto-player once and score every 6th tick of wave 5 (play) and
// of wave 12 while the boss lives (action); keep each wave's best tick.
// Prints the best (seed, steps) per shot -- pin them in shots.json.
// Usage: node tools/scan-seeds.mjs [firstSeed] [lastSeed]  (default 2001 2300)
import { createWorld } from "../game/src/world.js";
import { createRandom } from "../game/src/random.js";
import { drive, scorePlayTick, scoreActionTick } from "../game/src/shots.js";

const first = Number(process.argv[2] || 2001);
const last = Number(process.argv[3] || 2300);
let bestPlay = null, bestAction = null;
for (let seed = first; seed <= last; seed++) {
  const w = createWorld(createRandom(seed));
  try {
    drive(w, (n, s) => {
      if (n % 6 !== 0) return false;
      if (s.wave === 5 && s.waveState === "fight") {
        const m = scorePlayTick(s);
        if (!bestPlay || m.score > bestPlay.score) bestPlay = { seed, steps: n, ...m };
      }
      if (s.wave === 12 && s.waveState === "fight") {
        const m = scoreActionTick(s);
        if (m && (!bestAction || m.score > bestAction.score)) bestAction = { seed, steps: n, ...m };
      }
      return false;
    });
  } catch (e) { console.error("seed", seed, "failed:", e.message); }
}
console.log("PLAY  best:", JSON.stringify(bestPlay));
console.log("ACTION best:", JSON.stringify(bestAction));
for (const [name, m] of [["PLAY", bestPlay], ["ACTION", bestAction]]) {
  if (!m) { console.log(name, "NO TICK"); continue; }
  const targets = name === "PLAY"
    ? [["enemies>=14", m.enemies >= 14], ["floaters>=2", m.floaters >= 2],
       ["projectiles>=3", m.projectiles >= 3], ["towers>=12", m.towers >= 12],
       ["level3>=2", m.level3 >= 2], ["slowed>=1", m.slowed >= 1]]
    : [["boss at rim 500-800", m.bossDist >= 500 && m.bossDist <= 800],
       ["boss damaged", m.bossHp < 1], ["other enemies>=6", m.enemies - 1 >= 6],
       ["floaters>=2", m.floaters >= 2], ["projectiles>=2", m.projectiles >= 2]];
  console.log(name, "targets:", targets.map(([t, ok]) => `${t}:${ok ? "yes" : "no"}`).join(" "));
}

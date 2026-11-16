// The same public-action strategy drives screenshots and the balance test.
// Staged covers (SUNWRIGHT stageplan pattern): the best capture tick of a
// shot is found by scanning seeds headlessly (tools/scan-seeds.mjs) and
// pinned in shots.json as ?shot=<name>&seed=<n>&steps=<k>. The sim is
// deterministic (fixed 1/60 steps, seeded RNG, no wall clock), so the same
// seed + step count reproduces the exact frame in the browser and in a
// headless replay -- which is what tools/check-shot-truth.py asserts.
export const LAYOUT=[['arrow',3,3],['arrow',5,3],['cannon',5,2],['arrow',3,2],['tesla',10,2],['frost',10,3],['arcane',6,2],['cannon',10,6],['tesla',12,6],['arrow',12,3],['arcane',8,2],['cannon',13,6],['tesla',5,0],['arcane',12,4],['arrow',10,4],['frost',12,5]];
export function autoBuild(world){const s=world.state;for(const [type,c,r] of LAYOUT){let tower=null;for(const t of s.towers)if(t.active&&t.c===c&&t.r===r)tower=t;if(!tower){if(!world.build(type,{c,r}))return;}}for(let level=2;level<=3;level++)for(const t of s.towers)if(t.active&&t.level<level&&!world.upgrade(t))return;}
// Drive the auto-player with fixed steps. After each step fn(stepIndex,
// state) runs; returning true stops. Returns {steps, won}. One loop for the
// shot script and the seed scan, so a scanned step count replays exactly.
export function drive(world,fn){const s=world.state;for(let i=0;i<400000;i++){if(s.waveState==='build'){autoBuild(world);world.startWave();}world.step(1/60);if(fn&&fn(i+1,s))return {steps:i+1,won:false};if(s.waveState==='won')return {steps:i+1,won:true};if(s.waveState==='lost')throw Error('Auto-player lost');}throw Error('Shot timeout');}
// Cover density scores for one tick. play: enemies on the road, floaters,
// projectiles, upgraded towers, slowed enemies. action: the Titan at the
// rim (top straight, distance 500-800) and already damaged, plus density.
export function scorePlayTick(s){let enemies=0,floaters=0,projectiles=0,slowed=0,towers=0,level3=0;for(const e of s.enemies)if(e.active){enemies++;if(e.slow>0)slowed++;}for(const t of s.texts)if(t.active)floaters++;for(const p of s.projectiles)if(p.active)projectiles++;for(const t of s.towers)if(t.active){towers++;if(t.level===3)level3++;}return {score:enemies*2+floaters*3+projectiles+level3*2+Math.min(slowed,3)+Math.min(towers,16),enemies,floaters,projectiles,slowed,towers,level3,gold:s.gold,gameScore:s.score,lives:s.lives,wave:s.wave,foes:enemies+s.spawnCount-s.spawnIndex};}
export function scoreActionTick(s){let enemies=0,floaters=0,projectiles=0,boss=null;for(const e of s.enemies)if(e.active){enemies++;if(e.kind==='boss')boss=e;}for(const t of s.texts)if(t.active)floaters++;for(const p of s.projectiles)if(p.active)projectiles++;if(!boss)return null;const rim=boss.distance>=500&&boss.distance<=800?15:0,damaged=(1-boss.hp/boss.maxHp)*10;return {score:rim+damaged+enemies*2+floaters*3+projectiles,enemies,floaters,projectiles,bossDist:Math.round(boss.distance),bossHp:+(boss.hp/boss.maxHp).toFixed(2),gold:s.gold,gameScore:s.score,lives:s.lives,wave:s.wave,foes:enemies+s.spawnCount-s.spawnIndex};}
export function runShot(world,name,steps){if(name==='start')return {done:true};const s=world.state;
 if(steps){drive(world,(n)=>n>=steps);return {done:true};}
 drive(world,()=>{if(name==='play'&&s.wave===5&&s.enemies.some(e=>e.active&&e.distance>480)&&s.projectiles.some(p=>p.active))return true;if(name==='action'&&s.wave===12&&s.enemies.some(e=>e.active&&e.kind==='boss'&&e.distance>620))return true;return false;});
 return {done:true};}

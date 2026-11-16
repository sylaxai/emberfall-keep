import {createWorld} from '../game/src/world.js';
import {createRandom} from '../game/src/random.js';
import {autoBuild} from '../game/src/shots.js';
const w=createWorld(createRandom(1)),s=w.state;let last=0;
for(let i=0;i<500000;i++){if(s.waveState==='build'){autoBuild(w);w.startWave();}w.step(1/60);if(s.wave>last&&(s.waveState==='clear'||s.waveState==='won'||s.waveState==='lost')){last=s.wave;console.log(`Wave ${s.wave}: lives=${s.lives} gold=${s.gold} kills=${s.kills}`);}if(s.waveState==='won'||s.waveState==='lost'){console.log(s.waveState==='won'&&s.lives>=3?'WIN':'LOSE');process.exit(s.waveState==='won'&&s.lives>=3?0:1);}}throw Error('Simulation timed out');

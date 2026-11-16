// EMBERFALL KEEP — main loop and screens. Where things live:
// config.js (numbers, colours, Keeper lines) -> random.js (seeded RNG) ->
// world.js (simulation: rules and state, no drawing) -> input.js (mouse and
// keys) -> audio.js (synth sounds per event flag) -> render.js (drawing
// only) -> shots.js (auto-player and staged-cover ticks). This file owns the
// screens, the fixed 1/60 timestep, hit-stop (real-time restore), the
// tiered feedback bundles, the wave toast, and the best score.
import {createWorld} from './world.js';
import {createRandom} from './random.js';
import {createRenderer,BUTTONS,CARDS} from './render.js';
import {createInput} from './input.js';
import {createAudio} from './audio.js';
import {runShot} from './shots.js';
import {BEST_KEY,KEEPER_LINES} from './config.js';
const canvas=document.querySelector('#game'),renderer=createRenderer(canvas),input=createInput(canvas,renderer.clientToField),audio=createAudio(),params=new URLSearchParams(location.search),world=createWorld(createRandom(Number(params.get('seed')||1))),state=world.state;
let screen='title',paused=false,muted=false,selectedType='arrow',selectedTower=null,best=0,last=0,acc=0,freezeUntil=0,uiShake=0,flashColor='#ffffff',flashAlpha=0,toast=null,toastUntil=0,lastCursor='';
try{best=JSON.parse(localStorage.getItem(BEST_KEY)||'{}').score||0;}catch{}
window.__game={state,world};
function announce(s){document.querySelector('#status').textContent=s;}
function save(){if(state.score>best){best=state.score;try{localStorage.setItem(BEST_KEY,JSON.stringify({score:best,wave:state.wave}));}catch{}}}
function draw(){renderer.draw(state,screen,{best,muted,selectedType,selectedTower,hoverCell:input.mouse.cell,hoverX:input.mouse.x,hoverY:input.mouse.y,paused,wavePreview:state.wave+1,shake:uiShake,flashColor,flashAlpha,toast:toast&&state.time<toastUntil?toast:null});}
function restart(){world.reset();screen='playing';paused=false;selectedTower=null;selectedType='arrow';announce('New run. Build your defenses.');}
function start(){if(world.startWave()){audio.horn();toast={title:state.wave===12?'THE EMBER TITAN AWAKENS':'WAVE '+state.wave,line:KEEPER_LINES[state.wave-1]||'',boss:state.wave===12};toastUntil=state.time+3.5;announce('Wave '+state.wave+' begins. '+(KEEPER_LINES[state.wave-1]||''));}}
function sounds(flags){for(const [flag,name] of [[1,'shoot'],[2,'cannon'],[4,'frost'],[8,'zap'],[32,'coin'],[64,'leak'],[128,'clear'],[256,'win'],[512,'lose'],[1024,'build'],[2048,'upgrade']])if(flags&flag)audio[name]();if(flags&64)announce('A creature reached the keep. '+state.lives+' hearts left.');if(flags&128)announce('Wave '+state.wave+' cleared.');}
function click(){audio.unlock();if(screen==='title'){screen='playing';return;}if(screen==='won'||screen==='lost'){restart();return;}const m=input.mouse;for(const [key,b] of Object.entries(BUTTONS))if(m.x>=b[0]&&m.x<b[0]+b[2]&&m.y>=b[1]&&m.y<b[1]+b[3]){if(key==='start'&&!paused)start();if(key==='speed')state.speed=state.speed===1?2:1;if(key==='pause')paused=!paused;if(key==='mute')muted=audio.toggleMute();if(key==='upgrade'&&!paused)world.upgrade(selectedTower);if(key==='sell'&&!paused){world.sell(selectedTower);selectedTower=null;}return;}if(m.y>=644){const i=Math.floor((m.x-12)/146);if(i>=0&&i<5){selectedType=CARDS[i];selectedTower=null;}return;}if(m.y<74||m.y>634||paused)return;const cell=m.cell;for(const t of state.towers)if(t.active&&t.c===cell.c&&t.r===cell.r){selectedTower=t;selectedType=null;return;}if(selectedType)world.build(selectedType,cell);else selectedTower=null;}
if(params.has('shot')){const name=params.get('shot');runShot(world,name,Number(params.get('steps')||0)||undefined);screen=name==='start'?'title':state.waveState==='won'?'won':'playing';selectedType=null;draw();window.__shotReady=true;}else{
 function frame(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(now<freezeUntil){draw();requestAnimationFrame(frame);return;}const actions=input.takeActions(),type=input.selectedTowerType();if(type){selectedType=type;selectedTower=null;}if(input.mouse.clicked){input.mouse.clicked=false;click();}if(actions.ACTION_MUTE)muted=audio.toggleMute();if(actions.ACTION_START_WAVE){audio.unlock();if(screen==='title')screen='playing';else if(screen==='playing'&&!paused)start();}if(actions.ACTION_RESTART&&(screen==='won'||screen==='lost'))restart();if(actions.ACTION_PAUSE&&screen==='playing')paused=!paused;if(actions.ACTION_DESELECT){selectedType=null;selectedTower=null;}if(actions.ACTION_SPEED)state.speed=state.speed===1?2:1;if(screen==='playing'&&!paused){acc+=dt*state.speed;const bossAlive=state.enemies.some(e=>e.active&&e.kind==='boss');let frameFlags=0;while(acc>=1/60){const f=world.step(1/60);frameFlags|=f;sounds(f);acc-=1/60;}
 if(bossAlive&&!state.enemies.some(e=>e.active&&e.kind==='boss')){freezeUntil=now+120;uiShake=1;flashColor='#ffd94d';flashAlpha=.28;audio.bossDown();}
 if(frameFlags&128){freezeUntil=Math.max(freezeUntil,now+50);uiShake=Math.max(uiShake,.35);flashColor='#ffd94d';flashAlpha=Math.max(flashAlpha,.14);}
 if(frameFlags&64){flashColor='#ff5a3d';flashAlpha=Math.max(flashAlpha,.18);}if(state.waveState==='won'||state.waveState==='lost'){screen=state.waveState;save();announce(screen==='won'?'Victory! The keep endures.':'Defeat. Click to retry.');}}
 uiShake=Math.max(0,uiShake-dt*1.6);flashAlpha=Math.max(0,flashAlpha-dt*2.2);
 const mx=input.mouse.x,my=input.mouse.y;let cur='default';
 if(screen==='title'||screen==='won'||screen==='lost'){if(mx>=350&&mx<930&&my>=510&&my<574)cur='pointer';}
 else if(screen==='playing'){for(const [key,b] of Object.entries(BUTTONS)){if(key==='upgrade'||key==='sell'){if(!selectedTower)continue;}if(mx>=b[0]&&mx<b[0]+b[2]&&my>=b[1]&&my<b[1]+b[3]){cur='pointer';break;}}if(cur==='default'&&my>=644&&my<710&&mx>=12&&mx<742)cur='pointer';}
 if(cur!==lastCursor){canvas.style.cursor=cur;lastCursor=cur;}
 draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}

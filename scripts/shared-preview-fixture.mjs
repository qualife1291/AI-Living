/** Synthetic browser-only fixture; no fetch/DB or production artifacts. */
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {bootstrapShared,replayShared,projectionWorld} from '../lib/living/shared-ground.ts';
import {worldTime,weatherAt} from '../lib/clock.ts';
const now=Date.now(),start=now-3000,world={...structuredClone(seed),born:new Date(start-9*3600000).toISOString(),living:initializeLiving(start)};
const source={seq:1,revision:0,capturedAt:start,raw:JSON.stringify(world)};
let state=await bootstrapShared(source,crypto.randomUUID());for(let n=1;n<=3;n++)state=(await replayShared(state,source,[],start+n*1000)).state;
const w=projectionWorld(world,state.simMs),view={version:2,scope:state.scope,worldBorn:state.worldBorn,checkpoint:'a'.repeat(64),sequence:3,sourceRevision:0,cursorRealMs:state.cursorRealMs,simMs:state.simMs,backlogMs:0,paused:false,descriptors:state.descriptors,frames:state.frames,eligibleForReward:false,eligibleForP2P:false};
console.log(JSON.stringify({revision:0,serverNow:new Date(now).toISOString(),world:w,events:[],worldTime:worldTime(w,0),weatherState:weatherAt(w.born,worldTime(w,0)),sharedGround:view}));

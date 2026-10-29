/** All authoritative humans, including those outside a72-person render budget. */
import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {initializeLiving} from '../lib/living/engine.ts';
import {bootstrapShared,replayShared} from '../lib/living/shared-ground.ts';
import {bootstrapAuthority,authorityObserver,validateAuthorityState} from '../lib/living/ground-authority.ts';
const base=Date.parse('2026-10-29T03:00:00Z'),world={...structuredClone(seed),born:new Date(base).toISOString(),living:initializeLiving(base),clock:{pausedAt:null,pausedMs:0,scale:60,anchors:[{realMs:base,simMs:0,scale:60}]}};
const template=world.living.residents[0];world.living.residents=Array.from({length:240},(_,i)=>({...structuredClone(template),id:`neighbor-full-${i}`,name:`Cư dân fixture ${i}`}));
const source={seq:1,revision:0,capturedAt:base,raw:JSON.stringify(world)},shared=await bootstrapShared(source,crypto.randomUUID()),state=await bootstrapAuthority(shared,source,'a'.repeat(64));assert.equal(state.actors.length,243);
const trace=await authorityObserver(state,source),out=await replayShared(shared,source,[],base+100,null,trace.observer);await validateAuthorityState(trace.state);assert.equal(out.state.frames.at(-1).poses.length,246);assert.equal(trace.state.counts.arrivals,0);assert.equal(trace.state.counts.presence,0);assert.equal(trace.state.counts.heard,0);
const outside=new Set(world.living.residents.slice(72).map(r=>r.id)),meetings=trace.records.filter(r=>r.type==='co-presence');assert(meetings.some(r=>r.participants.some(p=>outside.has(p.id))),'Offscreen actors still receive physical contact accounting');assert(meetings.every(r=>r.durationMs>=3000&&r.durationMs<3100.001&&r.eligibleForReward===false&&r.eligibleForP2P===false));
assert(trace.state.pairs.length<=8192);assert(out.physicsSteps<=120);assert.equal(source.raw,JSON.stringify(world));
console.log(JSON.stringify({suite:'ground-authority-all-actors',mode:'real-GND2-replay',humans:243,bodies:246,encounters:meetings.length,pairs:trace.state.pairs.length,offscreenAccounted:true,baselineNotArrival:true,physicsSteps:out.physicsSteps,worldWrites:false,training:false}));

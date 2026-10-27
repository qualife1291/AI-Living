import assert from 'node:assert/strict';
import {realContext} from '../lib/living/realtime.ts';
import {performance} from 'node:perf_hooks';
let fetches=0,writes=0;
const cache={read:async()=>null,write:async()=>{writes++;}};
const never=async()=>{fetches++;return new Promise(()=>{});};
const cached=await realContext(Date.now(),cache,never,true);assert.equal(fetches,0);assert.equal(writes,0);assert.equal(cached.weather.status,'unavailable');
const start=performance.now();const timed=await realContext(Date.now(),cache,never);assert.ok(performance.now()-start<5000);assert.equal(timed.weather.status,'unavailable');assert.equal(fetches,3);assert.equal(writes,3);
console.log('PASS: cold world context reads never fetch/write; non-cooperative upstreams have a bounded deadline.');

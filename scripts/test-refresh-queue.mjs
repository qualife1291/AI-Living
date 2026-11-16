import assert from 'node:assert/strict';
import {createRefreshQueue} from '../lib/city/refresh-queue.ts';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};};
const first=deferred(),second=deferred();let reads=0,active=0,maxActive=0;
const refresh=createRefreshQueue(async()=>{
 maxActive=Math.max(maxActive,++active);reads++;
 await (reads===1?first:second).promise;active--;
});
const initial=refresh();await Promise.resolve();assert.equal(reads,1);
const normal=Array.from({length:100},()=>refresh());assert(normal.every(p=>p===initial));
const forced=Array.from({length:100},()=>refresh(true));assert(forced.every(p=>p===initial));
assert.equal(reads,1,'Forced retries cannot start concurrent network reads');
let finished=false;void initial.then(()=>{finished=true});first.resolve();
await Promise.resolve();await Promise.resolve();assert.equal(reads,2);assert(!finished,'Waiters must include the post-write follow-up');
second.resolve();await Promise.all([initial,...normal,...forced]);
assert.equal(reads,2);assert.equal(maxActive,1);
let attempts=0;const failing=createRefreshQueue(async()=>{if(++attempts===1)throw Error('temporary');});
await assert.rejects(failing(),/temporary/);await failing();assert.equal(attempts,2,'A rejected read must release the queue');
console.log(JSON.stringify({suite:'refresh-queue',normalCallers:100,forcedCallers:100,networkReads:reads,maxConcurrent:maxActive,followUpBeforeAck:true,rejectedReadRetry:true,productionAccess:false}));

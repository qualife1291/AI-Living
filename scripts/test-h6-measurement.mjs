import assert from 'node:assert/strict';
import {withH6Measurement} from '../lib/living/h6-measurement.ts';
import {runSystemTask} from '../lib/system-log.ts';
const logs=[],original={info:console.info,warn:console.warn,error:console.error};
for(const level of Object.keys(original))console[level]=line=>logs.push(JSON.parse(line));
try{
 const version=crypto.randomUUID(),failure=new Error('PRIVATE');
 for(const event of ['h6_shadow_eval','h6_canary_result']){
  const metrics=()=>({h6ModelUsed:3,h6ModelSha256:'a'.repeat(64),actorId:'PRIVATE',status:200});
  for(const status of [200,409,503]){
   const value={status,data:{private:'PRIVATE'}};
   const result=await runSystemTask('cron',true,()=>withH6Measurement(event,async()=>value,metrics),{id:version});
   assert.equal(result,value);assert.equal(logs.at(-1).status,status);assert.equal(logs.at(-1).event,event);
   assert.equal(logs.at(-1).level,status>=500?'error':status>=400?'warn':'info');
  }
  await assert.rejects(runSystemTask('cron',true,()=>withH6Measurement(event,async()=>{throw failure;},metrics)),e=>e===failure);
  assert.equal(logs.at(-1).status,500,'Thrown pipeline may not produce success telemetry');
  const n=logs.length;
  const unusual=Object.defineProperty({},'status',{get(){throw failure;}});
  assert.equal(await withH6Measurement(event,async()=>unusual,metrics),unusual);
  assert.equal(await runSystemTask('cron',true,()=>withH6Measurement(event,async()=>42,()=>{throw failure;})),42);
  assert.equal(logs.length,n,'Broken telemetry must not affect successful return');
  await assert.rejects(runSystemTask('cron',true,()=>withH6Measurement(event,async()=>{throw failure;},()=>{throw Error('metric failure');})),e=>e===failure);
 }
 const n=logs.length;
 await Promise.all(Array.from({length:12},(_,i)=>runSystemTask('cron',true,()=>withH6Measurement('h6_shadow_eval',async()=>{
  await new Promise(resolve=>setTimeout(resolve,i%3));return {status:i%2?503:200};
 },()=>({h6ModelUsed:1})),{id:version})));
 assert.equal(new Set(logs.slice(n).map(r=>r.requestId)).size,12);
 assert.equal(logs.slice(n).filter(r=>r.status===503).length,6);
 assert(logs.slice(n).every(r=>r.version===version));
 assert(!JSON.stringify(logs).includes('PRIVATE'));
 console.info=()=>{throw failure;};
 assert.equal(await runSystemTask('cron',true,()=>withH6Measurement('h6_shadow_eval',async()=>12,()=>({}))),12);
}finally{Object.assign(console,original);}
console.log(JSON.stringify({suite:'h6-measurement',pass:true,realPipelineStatus:true,throwPreserved:true,
 concurrentInvocations:12,privacy:true,telemetryFailureNonFatal:true,modelActivation:false}));

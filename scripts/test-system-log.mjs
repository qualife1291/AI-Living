import assert from 'node:assert/strict';
import {observeHttp,runSystemTask,systemLog,safeErrorType} from '../lib/system-log.ts';
import {runPulsePipeline} from '../lib/living/pulse-pipeline.ts';
const logs=[],original={info:console.info,warn:console.warn,error:console.error};
for(const level of Object.keys(original))console[level]=line=>logs.push({level,...JSON.parse(line)});
try{
 const version=crypto.randomUUID(),req=new Request('https://qa.invalid/api/living/interact?token=PRIVATE',{method:'POST',headers:{'x-request-id':'PRIVATE'},body:'PRIVATE'});
 const headers=await Promise.all(Array.from({length:20},(_,i)=>observeHttp(req,true,async()=>{
  await new Promise(resolve=>setTimeout(resolve,i%3));systemLog('chat_storage_failed',{stage:'write',status:503,message:'PRIVATE',cookie:'PRIVATE',actorId:'PRIVATE',durationMs:Infinity});
  return new Response('unchanged',{status:503,headers:{'Content-Type':'text/plain','Cache-Control':'private, no-store'}});
 },{id:version})));
 assert.equal(new Set(headers.map(r=>r.headers.get('X-Request-Id'))).size,20);
 for(const response of headers){const own=logs.filter(x=>x.requestId===response.headers.get('X-Request-Id'));assert.equal(own.length,2);assert(own.every(x=>x.version===version&&x.level==='error'&&x.route==='/api/living/interact'));assert.equal(await response.text(),'unchanged');assert.equal(response.headers.get('Cache-Control'),'private, no-store');}
 assert(!JSON.stringify(logs).includes('PRIVATE'));assert(logs.every(x=>!('durationMs' in x)||Number.isFinite(x.durationMs)));
 const count=logs.length;const disabled=await observeHttp(req,false,()=>Response.json({ok:true}));assert.equal(logs.length,count);assert.equal(disabled.headers.get('X-Request-Id'),null);
 let pulls=0;const stream=new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array([65]));c.close();}},{highWaterMark:0});
 const streamed=await observeHttp(new Request('https://qa.invalid/api/PRIVATE'),true,()=>new Response(stream));assert.equal(pulls,0);assert.equal(await streamed.text(),'A');assert.equal(logs.length,count,'Successful read polling is not custom-logged');
 await observeHttp(new Request('https://qa.invalid/api/PRIVATE'),true,()=>new Response(null,{status:404}));assert.equal(logs.at(-1).route,'/api/other');
 const thrown=Object.defineProperty(new Error('PRIVATE'),'name',{get(){throw Error('PRIVATE');}});assert.equal(safeErrorType(thrown),'Error');
 await assert.rejects(observeHttp(req,true,()=>{throw new Error('PRIVATE');}),/PRIVATE/);assert.equal(logs.at(-1).event,'http_uncaught');assert(!JSON.stringify(logs).includes('PRIVATE'));
 const invoked=[];const step=(name,status=200)=>async()=>{invoked.push(name);return {status,data:{updated:2,private:'PRIVATE'}};};
 const result=await runSystemTask('cron',true,()=>runPulsePipeline({learning:step('learning'),social:step('social'),tick:step('tick')}),{id:version});assert.deepEqual(invoked,['learning','social','tick']);assert.equal(result.data.learning.updated,2);
 assert.deepEqual(logs.slice(-3).map(x=>x.stage),['learning','social','tick']);assert.equal(new Set(logs.slice(-3).map(x=>x.requestId)).size,1);assert(logs.slice(-3).every(x=>x.trigger==='cron'));
 invoked.length=0;const stopped=await runPulsePipeline({learning:step('learning',409),social:step('social'),tick:step('tick')});assert.equal(stopped.status,409);assert.deepEqual(invoked,['learning']);
 const failed=new Error('PRIVATE');await assert.rejects(runSystemTask('cron',true,()=>runPulsePipeline({learning:async()=>{throw failed;},social:step('social'),tick:step('tick')})),e=>e===failed);assert.equal(logs.at(-1).stage,'learning');assert.equal(logs.at(-1).status,500);
 const h6Count=logs.length;
 runSystemTask('cron',true,()=>{
   systemLog('cron_result',{status:200,h6ShadowOnly:true,h6Candidates:96,cookie:'PRIVATE',modelDump:'PRIVATE'});
 });
 assert.equal(logs.length,h6Count+1);
 assert.equal(logs.at(-1).h6ShadowOnly,true);
 assert.equal(logs.at(-1).h6Candidates,96);
 console.info=()=>{throw Error('Sink unavailable');};assert.equal((await observeHttp(req,true,()=>new Response('ok'))).status,200);
 assert(!JSON.stringify(logs).includes('PRIVATE'));
}finally{Object.assign(console,original);}
console.log(JSON.stringify({suite:'system-log',concurrentRequests:20,isolatedCorrelation:true,privacyAllowlist:true,streamPreserved:true,noReadPollSpam:true,sinkFailureNonFatal:true,pipelineOrderAndShortCircuit:true}));

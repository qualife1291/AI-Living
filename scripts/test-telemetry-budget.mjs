import assert from 'node:assert/strict';
import {clientLogs,logClient,flushClientLogs} from '../lib/diagnostics.ts';
const clock=Date.now,windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window'),documentDescriptor=Object.getOwnPropertyDescriptor(globalThis,'document'),navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
let now=1_800_000_000_000,requests=0;
try {
 Date.now=()=>now;
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});
 Object.defineProperty(globalThis,'document',{value:{hidden:false},configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 globalThis.fetch=async()=>{requests++;return Response.json({ok:true});};
 for(let seconds=0;seconds<=600;seconds+=5){
  now=1_800_000_000_000+seconds*1000;logClient('frame_sample',{ms:16});
  if(seconds%15===0)await flushClientLogs({automatic:true});
 }
 assert.equal(requests,11,'Sample-only telemetry batches once per minute rather than41 times in ten minutes');
 const sampleRequests=requests;
 now+=7500;logClient('webgl_lost');await flushClientLogs({automatic:true});assert.equal(requests,12,'Critical renderer failures do not wait for sample cadence');
 now+=60000;logClient('route_miss');document.hidden=true;await flushClientLogs({automatic:true});assert.equal(requests,12);
 document.hidden=false;navigator.onLine=false;await flushClientLogs({automatic:true});assert.equal(requests,12);
 navigator.onLine=true;globalThis.fetch=async()=>{requests++;return Response.json({error:'busy'},{status:429});};
 await flushClientLogs({automatic:true});const retained=clientLogs();assert(retained.length);
 now+=15000;await flushClientLogs({automatic:true});assert.equal(requests,13,'Failure backs off without dropping telemetry');
 assert.deepEqual(clientLogs(),retained);
 now+=45000;globalThis.fetch=async()=>{requests++;return Response.json({ok:true});};await flushClientLogs({automatic:true});assert.equal(requests,14);assert.equal(clientLogs().length,0);
 console.log(JSON.stringify({suite:'telemetry-budget',windowSeconds:600,samplePostsBefore:41,samplePostsAfter:sampleRequests,criticalNotDelayed:true,hiddenAndOfflineSkip:true,backoff:true,ackRetainsData:true,productionAccess:false}));
} finally {
 Date.now=clock;
 for(const [name,descriptor] of [['window',windowDescriptor],['document',documentDescriptor],['navigator',navigatorDescriptor]])if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
}

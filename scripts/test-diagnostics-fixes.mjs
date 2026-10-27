import assert from 'node:assert/strict';
import { DialogueGrammar } from '../lib/living/dialogue-grammar.ts';
import { clientLogs, logClient, flushClientLogs } from '../lib/diagnostics.ts';
const g = new DialogueGrammar(), a={id:'a',name:'An'}, b={id:'b',name:'Bình'};
let history=[];
for(let i=0;i<200;i++) for(const line of g.lines(i%2?a:b,i%2?b:a,i%3?'Chợ nhỏ':'Thư viện',i)) {
  assert(!history.includes(line.text),'No exact repeats within 50 lines of either pair order');
  history.push(line.text);history=history.slice(-50);
}
const exchange=g.lines(a,b,'Thư viện',201,6);assert(exchange.every(line=>line.text.includes('đọc truyện')),'Every reply must stay on the selected topic');
globalThis.window={};
logClient('route_miss'); logClient('route_miss'); assert.equal(clientLogs().length,1);
for(let i=0;i<700;i++)logClient('actor_stuck',{actor:String(i)});
assert.equal(clientLogs().length,512);
globalThis.fetch=async()=>({ok:false});await flushClientLogs();assert.equal(clientLogs().length,512);
globalThis.fetch=async()=>new Response('<html>Sign in</html>');await flushClientLogs();assert.equal(clientLogs().length,512,'A 200 login page is not a server ACK');
globalThis.fetch=async()=>Response.json({ok:false});await flushClientLogs();assert.equal(clientLogs().length,512,'Explicit rejection must retain queued logs');
globalThis.fetch=async()=>Response.json({ok:true});await flushClientLogs();assert.equal(clientLogs().length,480);
console.log('PASS dialogue 800 lines, pair-order history, telemetry ring, deduplication, retry and ACK');
// Maximum-size valid fields, especially UTF-8, must not poison the retry queue.
while(clientLogs().length) await flushClientLogs();
for(let i=0;i<32;i++)logClient('actor_stuck',Object.fromEntries([
  ['actor',`unicode-${i}`],...Array.from({length:7},(_,k)=>[`field${k}`,'猫'.repeat(100)])
]));
let sent=0;
globalThis.fetch=async(_url,options)=>{
  const bytes=new TextEncoder().encode(options.body).byteLength;
  assert(bytes<=16384,`Diagnostics request exceeds server limit: ${bytes} bytes`);
  const rows=JSON.parse(options.body).logs;assert(rows.length>0&&rows.length<=32);
  sent+=rows.length;return Response.json({ok:true});
};
await flushClientLogs();
assert(sent>0,'A full UTF-8 batch must make progress instead of retrying HTTP 413 forever');
assert(clientLogs().length>0,'Only the acknowledged prefix is removed');
while(clientLogs().length)await flushClientLogs();
assert.equal(sent,32,'All queued logs eventually reach the server');
console.log('PASS UTF-8 byte-bounded batches drain without ACK loss');
logClient('route_slow',{actor:'oversized',detail:'猫'.repeat(2000),invalid:NaN,...Object.fromEntries(Array.from({length:12},(_,i)=>[`extra${i}`,i]))});
const normalized=clientLogs()[0].data;
assert.equal(normalized.detail.length,100);
assert(!('invalid' in normalized));assert(Object.keys(normalized).length<=8);
globalThis.fetch=async(_url,options)=>{
 const rows=JSON.parse(options.body).logs;
 assert(rows.every(r=>Object.keys(r.data).length<=8&&Object.values(r.data).every(v=>typeof v!=='string'||v.length<=100)));
 return Response.json({ok:true});
};
await flushClientLogs();assert.equal(clientLogs().length,0,'Oversized observations are normalized before upload');

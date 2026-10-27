import assert from 'node:assert/strict';
import { DialogueGrammar } from '../lib/living/dialogue-grammar.ts';
import { clientLogs, logClient, flushClientLogs } from '../lib/diagnostics.ts';
const g = new DialogueGrammar(), a={id:'a',name:'An'}, b={id:'b',name:'Bình'};
let history=[];
for(let i=0;i<200;i++) for(const line of g.lines(i%2?a:b,i%2?b:a,i%3?'Chợ nhỏ':'Thư viện',i)) {
  assert(!history.includes(line.text),'No exact repeats within 50 lines of either pair order');
  history.push(line.text);history=history.slice(-50);
}
globalThis.window={};
logClient('route_miss'); logClient('route_miss'); assert.equal(clientLogs().length,1);
for(let i=0;i<700;i++)logClient('actor_stuck',{actor:String(i)});
assert.equal(clientLogs().length,512);
globalThis.fetch=async()=>({ok:false});await flushClientLogs();assert.equal(clientLogs().length,512);
globalThis.fetch=async()=>({ok:true});await flushClientLogs();assert.equal(clientLogs().length,480);
console.log('PASS dialogue 800 lines, pair-order history, telemetry ring, deduplication, retry and ACK');

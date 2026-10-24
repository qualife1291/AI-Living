import assert from 'node:assert/strict';
import {vehiclesAt,signalAt} from '../lib/traffic.ts';
import {speechAt,wrapSpeech,bubbleOffset} from '../lib/speech.ts';
import {actorsAt} from '../lib/life.ts';
const world={born:'2026-10-24T00:00:00Z',people:['an','binh','chi'].map(id=>({id,name:id})),paused:false};const start=Date.parse(world.born);
let waiting=0,moving=0;
for(let t=0;t<220000;t+=250){const lights=signalAt(t/1000);assert.equal(lights.main&&lights.avenue,false);for(const car of vehiclesAt(world,start+t)){assert.ok(car.position.every(Number.isFinite));if(car.waiting){waiting++;assert.equal(car.moving,false)}if(car.moving)moving++;}}
assert.ok(waiting>0&&moving>0);const paused={...world,clock:{pausedAt:start+20000,pausedMs:0}};assert.deepEqual(vehiclesAt(paused,start+22000),vehiclesAt(paused,start+99000));
const text='Mình đang đọc một quyển sách về khu phố. Bạn cùng xem nhé?';assert.equal(wrapSpeech(text).join(' '),text);assert.ok(wrapSpeech('a'.repeat(300)).every(s=>s.length<=36));
const at=start+30000,actors=actorsAt(world,at);const event={id:'e1',source:'ai',createdAt:world.born,dialogue:[{speaker:actors[0].id,text:'Chào bạn',atSecond:30,location:actors[0].location}]};const stationary=actors.map(a=>({...a,walking:false}));assert.equal(speechAt(world,stationary,[event],at).source,'ai');assert.notEqual(speechAt(world,actors.map(a=>({...a,walking:true})),[event],at)?.source,'ai');
assert.ok(!speechAt(world,stationary,[event],start+37000)||speechAt(world,stationary,[event],start+37000).source!=='ai');
console.log('PASS: traffic phases mutually exclusive, vehicles move/wait, paused traffic stable, full-text wrapping, timed AI speech and walking guard.');

assert.equal(bubbleOffset([1300,200],'0 0 1200 780','Test'),null);const adjusted=bubbleOffset([20,20],'0 0 570 370','Chào bạn');assert.ok(adjusted[0]>0&&adjusted[1]>0);

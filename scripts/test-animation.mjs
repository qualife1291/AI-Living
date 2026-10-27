import assert from 'node:assert/strict';
import {speechAt} from '../lib/speech.ts';
import {actorsAt} from '../lib/life.ts';
const world={born:'2026-10-24T00:00:00Z',people:['an','binh','chi'].map(id=>({id,name:id})),paused:false};const start=Date.parse(world.born);
const at=start+30000,actors=actorsAt(world,at);const event={id:'e1',source:'ai',createdAt:world.born,dialogue:[{speaker:actors[0].id,text:'Chào bạn',atSecond:30,location:actors[0].location}]};const stationary=actors.map(a=>({...a,walking:false}));assert.equal(speechAt(world,stationary,[event],at).source,'ai');assert.notEqual(speechAt(world,actors.map(a=>({...a,walking:true})),[event],at)?.source,'ai');
assert.ok(!speechAt(world,stationary,[event],start+37000)||speechAt(world,stationary,[event],start+37000).source!=='ai');
console.log('PASS: timed AI speech and walking guard.');

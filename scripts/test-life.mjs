import assert from 'node:assert/strict';
import {route,places,along,actorsAt,animalsAt,simulationTime,followView,distance} from '../lib/life.ts';
const world={born:'2026-10-24T00:00:00Z',paused:false,people:['an','binh','chi'].map(id=>({id,name:id,location:'Bếp chung'}))};
const origin=Date.parse(world.born);
for(const from of Object.keys(places))for(const to of Object.keys(places)){const p=route(from,to);assert.deepEqual(p[0],places[from]);assert.deepEqual(p.at(-1),places[to]);}
assert.deepEqual(along([[0,0],[10,0],[10,10]],15),[10,5]);
for(let t=0;t<700000;t+=1000){const a=actorsAt(world,origin+t),b=actorsAt(world,origin+t+1000);for(let i=0;i<3;i++){assert.ok(a[i].position.every(Number.isFinite));assert.ok(distance(a[i].position,b[i].position)<100,'Actor teleported at boundary');}assert.equal(animalsAt(world,origin+t).length,3);}
const paused={...world,clock:{pausedAt:origin+100000,pausedMs:0}};assert.equal(simulationTime(paused,origin+120000),100000);assert.deepEqual(actorsAt(paused,origin+100000),actorsAt(paused,origin+200000));
const resumed={...world,clock:{pausedAt:null,pausedMs:100000}};assert.equal(simulationTime(resumed,origin+200000),100000);
const planned={...world,people:[{...world.people[0],plan:{createdAt:world.born,pausedMs:0,from:'Bếp chung',steps:[{location:'Công viên',activity:'Nghỉ cùng bạn',kind:'rest',duration:80}]}}]};assert.equal(actorsAt(planned,origin+20000)[0].source,'plan');assert.equal(actorsAt(planned,origin+90000)[0].source,'routine');
for(const p of [[0,0],[1200,780],[500,300]]){const [x,y,w,h]=followView(p).split(' ').map(Number);assert.ok(x>=0&&y>=0&&x+w<=1200&&y+h<=780);}
console.log('PASS: connected pedestrian routes, interpolation, no routine teleports, pause/resume clock, AI plan precedence/expiry, animal projection, camera bounds.');

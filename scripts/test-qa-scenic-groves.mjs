import assert from 'node:assert/strict';
import { scenicGroves } from '../lib/city/scenic-groves.ts';
import { sceneryTrees, sceneryObstacles } from '../lib/city/scenery.ts';
import { TRAFFIC_COUNT } from '../lib/city/traffic.ts';
import scenes from '../data/social-scenes.json' with {type:'json'};
assert.equal(scenicGroves.length,48);
assert.equal(new Set(scenicGroves.map(p=>p.x+':'+p.z)).size,48);
for(const p of scenicGroves){assert(Number.isFinite(p.x)&&Number.isFinite(p.z));
  assert(p.z<=-330,'Distant trees must be outside the street simulation north edge');
  assert(p.x>=100&&p.x<=2450);
  assert(!sceneryObstacles.some(o=>o.id?.includes('scenic-grove')),
    'Decorative foliage must not add invisible colliders');}
assert.equal(TRAFFIC_COUNT,12,'Traffic count and headway must remain unchanged without swept tests');
assert.equal(scenes.scenes.length,26);assert.equal(new Set(scenes.scenes.map(s=>s.id)).size,26);
for(const s of scenes.scenes.slice(-4)){assert.equal(s.turns.length,4);
  assert.equal(s.turns.reduce((n,t)=>n+t.seconds,0)+4,s.durationSeconds);
  assert.deepEqual(s.turns.map(t=>t.speaker),['a','b','a','b']);
  assert(s.turns.every(t=>t.text.length>5 && t.text.length<=120));}
assert(sceneryTrees.length>=140);
console.log(JSON.stringify({suite:'qa-scenic-grove-social-depth',visualOnlyTrees:48,
  streetTreesUnchanged:sceneryTrees.length,ambientDialogueScenes:26,
  vehicleCount:12,syntheticAnimals:0,worldWrites:0,passed:true}));

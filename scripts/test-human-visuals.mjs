import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createSharedPrimitives,HumanMotion} from '../components/city/three/humans.ts';
const geometries=createSharedPrimitives(),triangles={};
for(const [name,g] of Object.entries(geometries)){
 g.computeBoundingBox();const size=g.boundingBox.getSize(new Vector3()),center=g.boundingBox.getCenter(new Vector3());
 for(const axis of ['x','y','z']){assert(Math.abs(size[axis]-1)<1e-6);assert(Math.abs(center[axis])<1e-6);}
 for(const a of [g.attributes.position,g.attributes.normal])assert([...a.array].every(Number.isFinite));
 triangles[name]=(g.index?.count??g.attributes.position.count)/3;assert(triangles[name]>=12&&triangles[name]<=300);g.dispose();
}
// These primitives serve fauna/traffic; human body topology is covered by crowd-skins.
assert.deepEqual(Object.keys(geometries).sort(),['box','head','limb','round']);
const a={id:'an',position:[0,0],walking:true,transport:'walk',kind:'walk',source:'routine'},b={...a,id:'binh'},before=JSON.stringify([a,b]),motion=new HumanMotion(),poses=new Map();
const first=motion.frame([a,b],poses,0,0,false);assert.notEqual(first.get('an').phase,first.get('binh').phase);
assert.deepEqual(motion.frame([b,a],poses,0,0,false).get('an'),first.get('an'));
const changed=motion.frame([{...a,position:[1,0]},b],poses,1,1/60,false);assert.notEqual(changed.get('an').phase,first.get('an').phase);
const stopped=motion.frame([a,b],poses,1,1/60,true);
for(const time of [2,100,86400])assert.deepEqual(motion.frame([b,a],poses,time,1/60,true),new Map([...stopped].reverse()));
assert.equal(JSON.stringify([a,b]),before,'Render motion cannot edit roots or source provenance');
console.log(JSON.stringify({suite:'human-visuals',sharedFaunaPrimitives:triangles,stableIdentity:true,distanceGait:true,pause:true,sourceImmutable:true,oldHumanGeometry:false}));

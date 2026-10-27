import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {actorsAt,distance} from '../lib/life.ts';
import {WalkDirector,safeWalkPath,WALK_RADIUS} from '../lib/city/walkability.ts';
import {bodyWalkable,bodySegmentWalkable,groundObstacles} from '../lib/city/walk-ground.ts';
import {containsPoint,segmentHits} from '../lib/city/footprints.ts';
import {BICYCLE_RADIUS,BICYCLE_SPEED} from '../lib/city/bicycle.ts';
const now=Date.parse('2026-10-27T05:00:00Z'),world=structuredClone(seed);world.born='2026-10-26T17:00:00Z';world.paused=false;
const raw=actorsAt(world,now)[0],bike={...raw,position:[-425,-700],path:[[-400,-700],[-150,-700]],walking:true,kind:'cycle'};
const d=new WalkDirector(),saved=JSON.stringify(world);let previous,travel=0,maxStep=0;
for(let i=0;i<1200;i++){
 const a=d.frame(world,[structuredClone(bike)],100+i*.05)[0];assert(a.bicycle);assert.equal(a.transport,'bicycle');
 assert(bodyWalkable(a.position,BICYCLE_RADIUS));
 if(previous){const step=distance(a.position,previous.position);travel+=step;maxStep=Math.max(maxStep,step);assert(step<=BICYCLE_SPEED*.05+.00001);assert(bodySegmentWalkable(previous.position,a.position,BICYCLE_RADIUS));assert(a.bicycle.distance>=previous.bicycle.distance);}
 previous=a;
}
assert(travel>240,'A cyclist must actually complete the route');assert(distance(previous.position,[-150,-700])<.1);
const paused=d.frame({...world,paused:true},[bike],200);
for(let i=0;i<10;i++)assert.deepEqual(d.frame({...world,paused:true},[bike],200+i),paused);
const unmounted=d.frame(world,[{...bike,kind:'read'}],210)[0];assert(!unmounted.bicycle);assert(distance(unmounted.position,previous.position)<1);
assert.equal(JSON.stringify(world),saved);
// Independent static oracle: the spatial index must include the enlarged body at bucket boundaries.
for(const radius of [WALK_RADIUS,BICYCLE_RADIUS])for(let i=0;i<1000;i++){
 const p=[-440+(i*79)%3500,-800+(i*131)%2800],q=[p[0]+(i%20)-10,p[1]+(i%31)-15];
 assert.equal(bodyWalkable(p,radius),!groundObstacles.some(r=>containsPoint(r,p,radius)));
 assert.equal(bodySegmentWalkable(p,q,radius),!groundObstacles.some(r=>segmentHits(r,p,q,radius)));
}
for(const [from,to] of [[[-400,-700],[-150,-700]],[[277,565],[465,432]],[[440,1030],[277,565]]]){
 const path=safeWalkPath(from,to,BICYCLE_RADIUS);for(let i=1;i<path.length;i++)assert(bodySegmentWalkable(path[i-1],path[i],BICYCLE_RADIUS));
}
console.log(JSON.stringify({suite:'cycle-ground',frames:1200,travel,maxStep,bodyRadius:BICYCLE_RADIUS,pause:true,dismount:true,spatialOracleChecks:4000,worldWrites:false}));
// A live walker beside a wall must leave it on foot before mounting, without a spawn correction.
let narrow;
for(const r of groundObstacles){const p=[r.x+r.width/2+WALK_RADIUS+.3,r.z];if(bodyWalkable(p,WALK_RADIUS)&&!bodyWalkable(p,BICYCLE_RADIUS)){narrow=p;break;}}
assert(narrow);const transition=new WalkDirector();
const waiting={...bike,kind:'read',position:[narrow[0]-25,narrow[1]],walking:false,path:[narrow]};
const before=transition.frame(world,[waiting],10)[0];
let mounted=false,last=before;
for(let i=1;i<=600;i++){
 const a=transition.frame(world,[{...waiting,kind:'cycle'}],10+i*.05)[0];
 assert(distance(last.position,a.position)<=1.10001,'Mounting must never move the root discontinuously');
 if(a.bicycle){mounted=true;assert(bodyWalkable(a.position,BICYCLE_RADIUS));}
 last=a;
}
assert(mounted,'A narrow starting point should find space to mount');

// Oncoming pedestrians/cyclists use body-specific swept separation, not only their centers.
const mixed=new WalkDirector();let old,mixedDistance=0;
const pedestrian={...bike,id:'binh',name:'Bình',kind:'social',position:[-125,-700],path:[[-150,-707],[-400,-707]]};
for(let i=0;i<1600;i++){
 const result=mixed.frame(world,i%2?[pedestrian,bike]:[bike,pedestrian],100+i*.05);
 const a=result.find(p=>p.id==='an'),b=result.find(p=>p.id==='binh');
 assert(distance(a.position,b.position)>=(a.bicycle?.radius??WALK_RADIUS)+(b.bicycle?.radius??WALK_RADIUS)+.35-1e-6);
 if(old){
  const pa=old.find(p=>p.id==='an'),pb=old.find(p=>p.id==='binh');
  const relative=[pa.position[0]-pb.position[0],pa.position[1]-pb.position[1]],v=[a.position[0]-pa.position[0]-b.position[0]+pb.position[0],a.position[1]-pa.position[1]-b.position[1]+pb.position[1]];
  const t=Math.max(0,Math.min(1,-(relative[0]*v[0]+relative[1]*v[1])/(v[0]*v[0]+v[1]*v[1]||1)));
  assert(Math.hypot(relative[0]+v[0]*t,relative[1]+v[1]*t)>=(a.bicycle?.radius??WALK_RADIUS)+WALK_RADIUS+.35-1e-6);
  mixedDistance+=distance(pa.position,a.position);
 }
 old=result;
}
assert(mixedDistance>200,'Avoidance must make useful progress, not pass by freezing both actors');
console.log(JSON.stringify({suite:'cycle-transitions-and-people',mountWithoutTeleport:mounted,mixedFrames:1600,mixedDistance,sweptCollisionCount:0,reorder:true}));
// Verify actual bicycle geometry and rigged avatar fit the navigation envelope at every yaw.
const THREE=await import('three');
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const {readFileSync}=await import('node:fs');
const {AssetLibrary}=await import('../components/city/three/assets.ts');
const {createModelActors}=await import('../components/city/three/model-actors.ts');
const {createBicycle,spinBicycle}=await import('../components/city/three/activity-props.ts');
const bytes=readFileSync('public/models/kenney/characters/character-a.glb'),loader=new GLTFLoader();
loader.register(()=>({name:'qa-material',loadMaterial:()=>Promise.resolve(new THREE.MeshBasicMaterial())}));
const model=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const library=new AssetLibrary();library.loaded.set('characters/character-a',model);
const scene=new THREE.Scene(),avatars=createModelActors(scene,library);let maximumRadius=0;
for(let i=0;i<36;i++){
 const a={...bike,position:[-400,-700],transport:'bicycle',bicycle:{radius:BICYCLE_RADIUS,distance:i*.8,yaw:i*Math.PI/18}};
 avatars.draw(world,[a],new Map(),new Map([['an',a.bicycle.yaw]]),i*.1+1);scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!o.isMesh)return;let active=true;for(let p=o;p;p=p.parent)if(!p.visible)active=false;if(!active)return;
  for(let v=0;v<o.geometry.attributes.position.count;v++){
   const p=new THREE.Vector3();o.getVertexPosition(v,p);o.localToWorld(p);
   const radius=Math.hypot(p.x-a.position[0],p.z-a.position[1]);maximumRadius=Math.max(maximumRadius,radius);assert(radius<=BICYCLE_RADIUS+.001,`Model exceeds collision envelope: ${radius}`);
  }
 });
}
const stopped={...bike,position:[-400,-700],bicycle:{radius:BICYCLE_RADIUS,distance:20,yaw:0},walking:false};
avatars.draw(world,[stopped],new Map(),new Map([['an',0]]),10);const stoppedPose=avatars.snapshots();
for(let i=0;i<20;i++)avatars.draw(world,[stopped],new Map(),new Map([['an',0]]),10+i*.05);
const currentPose=avatars.snapshots();
for(const key of ['leg','position'])for(let i=0;i<stoppedPose.an[key].length;i++)assert(Math.abs(stoppedPose.an[key][i]-currentPose.an[key][i])<1e-9,'Stopped cyclist must not accumulate leg offsets or pedal by wall time');
const wheel=createBicycle();spinBicycle(wheel,6);assert(wheel.children.filter(o=>o.name==='bicycle-wheel').every(o=>o.rotation.z===-2));
const wheels=wheel.children.filter(o=>o.name==='bicycle-wheel').map(o=>o.rotation.z);spinBicycle(wheel,6);assert.deepEqual(wheel.children.filter(o=>o.name==='bicycle-wheel').map(o=>o.rotation.z),wheels);
avatars.draw(world,[{...stopped,kind:'read',bicycle:undefined}],new Map(),new Map(),12);assert(scene.children.filter(o=>o.isGroup&&o.children.some(c=>c.name==='bicycle-wheel')).every(o=>!o.visible),'Dismount hides the bicycle');
console.log(JSON.stringify({suite:'cycle-actual-model',poses:36,maximumRadius,bodyRadius:BICYCLE_RADIUS,stoppedPoseStable:true,wheelsByDistance:true,dismount:true}));
const {TrafficDirector,vehicleContains}=await import('../lib/city/traffic.ts');
const traffic=new TrafficDirector();let crossing=[1800,400];traffic.frame(0,[crossing],[BICYCLE_RADIUS]);
for(let i=1;i<=1400;i++){
 const cars=traffic.frame(i*.05,[crossing],[BICYCLE_RADIUS]);
 assert(cars.every(car=>!vehicleContains(car,crossing,BICYCLE_RADIUS)),'Cars must account for the whole bicycle, not a pedestrian center');
 const next=[crossing[0],Math.min(480,crossing[1]+BICYCLE_SPEED*.05)];
 if(cars.every(car=>!vehicleContains(car,next,BICYCLE_RADIUS+.5)))crossing=next;
}
assert(crossing[1]>475,'The protected crossing must eventually make progress');
console.log('PASS full-bicycle cooperative crossing over 1400 frames with actual traffic');
const commute=new WalkDirector();let arrivedOnBike=false,trip;
for(let i=0;i<800;i++){
 trip=commute.frame(world,[{...bike,kind:'read',transport:'bicycle',walking:i<10}],i*.05)[0];
 if(i===20)assert(trip.bicycle,'Projection arrival must not remove a bicycle while ground movement is still underway');
 if(trip.bicycle&&distance(trip.position,[-150,-700])<.1)arrivedOnBike=true;
}
assert(arrivedOnBike);assert(!trip.bicycle,'After actual arrival a non-cycle task dismounts');
console.log('PASS bicycle transport commutes retain the bike until ground arrival, then dismount for the task');

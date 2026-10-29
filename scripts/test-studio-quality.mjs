import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {loadLocalGLTF} from './load-local-gltf.mjs';
import {StudioAvatar} from '../components/studio/avatar.ts';
import {poseStudioActors} from '../components/studio/actors.ts';
import {StudioFeline} from '../components/studio/feline.ts';
import {studioCamera,studioFocus} from '../components/studio/camera.ts';
import {stagePoint,STAGE_Y} from '../components/studio/motion.ts';
import {scenarioFrame,scenarioDefinitions} from '../lib/city/scenarios/index.ts';
const catalog=JSON.parse(readFileSync('public/models/supplied/catalog.json')).assets,models=new Map(),report=[];
const equivalent=(a,b)=>{if(typeof a==='number'&&typeof b==='number'){assert(Math.abs(a-b)<1e-5,`Pose drift ${a} vs ${b}`);return;}if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))equivalent(a[k],b[k]);}else assert.equal(a,b);};
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(const d of scenarioDefinitions){
 const actors=new Map();for(const s of d.cast.filter(s=>s.species==='human')){assert(s.modelHint.startsWith('supplied/'));if(!models.has(s.modelHint))models.set(s.modelHint,await loadLocalGLTF(catalog.find(a=>a.id===s.modelHint).url));actors.set(s.id,new StudioAvatar(models.get(s.modelHint),s.heightMeters*10*STAGE_Y,s.radius*.9,s.wardrobe.shirt));}
 for(const s of d.cast.filter(s=>s.species==='human'))assert(actors.get(s.id).height>=s.heightMeters*10*STAGE_Y*.93,`${d.id}/${s.id}: a source hand pose must not shrink the actor body`);
 const sample=t=>poseStudioActors(actors,scenarioFrame(d.id,t));
 // Playing, seeking backwards and replaying must give identical deformed pose.
 const snapshot=t=>{const contacts=sample(t);return {contacts,rigs:[...actors].map(([id,a])=>[id,a.model.toJSON().object,a.group.position.toArray()])};};
 for(const t of [37.125,54.15,78.325,88.1,99.2,119.99]){const expected=snapshot(t);sample(119);sample(0);equivalent(snapshot(t),expected);}
 let maxHandStep=0,worst;const events=scenarioFrame(d.id,120).events;
 // Dense transition probes measure actual rendered hand surfaces, not plan targets.
 for(const event of events){let previous;for(let n=-36;n<=72;n++){const t=Math.max(0,Math.min(120,event.at+n/60)),current=sample(t);for(const a of current){assert([...a.head,...a.hands.left,...a.hands.right].every(Number.isFinite));if(previous)for(const side of ['left','right']){const old=previous.find(b=>b.id===a.id);const step=gap(a.hands[side],old.hands[side]);if(step>maxHandStep){maxHandStep=step;worst={t,id:a.id,side,from:old.hands[side],to:a.hands[side]};}}}previous=current;}}
 assert(maxHandStep<.9,`${d.id} hand discontinuity ${maxHandStep}: ${JSON.stringify(worst)}`);
 // Explicit recipient/custody moments: surface contact with the actual prop OBB.
 const probes={ 'wallet-return':[[42,'wallet','tuan'],[86,'wallet','tuan'],[94,'wallet','minh']], 'sanitation-gratitude':[[82,'cup','hanh'],[93,'cup','hanh']], 'kitten-care':[], 'bakery-courtesy':[[93,'loaf-0','seller'],[99,'loaf-0','ba'],[104,'loaf-0','ba']] }[d.id];
 for(const aspect of [1440/900,390/844])for(const at of d.shots.map(s=>s.at+2.5)){
  const f=scenarioFrame(d.id,at),contacts=sample(at),shot=studioCamera(f,contacts,aspect),camera=new THREE.PerspectiveCamera(f.camera.fov,aspect,.1,2000);camera.position.copy(shot.eye);camera.lookAt(shot.target);camera.updateMatrixWorld(true);
  for(const id of shot.subjects){const a=f.actors.find(a=>a.id===id),head=contacts.find(c=>c.id===id)?.head??[a.position[0],a.position[1]*STAGE_Y+2.25,a.position[2]];for(const p of [head,stagePoint(a.position)]){const ndc=new THREE.Vector3(...p).project(camera);assert(Math.abs(ndc.x)<.95&&Math.abs(ndc.y)<.95,`${d.id} ${id} camera ${at} clips head/feet`);}}
 }
 let maximumContactGap=0;
 for(const [t,id,actor] of probes){const f=scenarioFrame(d.id,t),p=f.props.find(p=>p.id===id),a=sample(t).find(a=>a.id===actor),centre=new THREE.Vector3(...stagePoint(p.position)),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)).invert(),hand=new THREE.Vector3(...a.hands.right).sub(centre).applyQuaternion(q),size=p.size.map((v,i)=>i===1?v*STAGE_Y:v),outside=Math.hypot(...hand.toArray().map((v,i)=>Math.max(0,Math.abs(v)-size[i]/2)));maximumContactGap=Math.max(maximumContactGap,outside);assert(outside<.35,`${d.id}/${id} at ${t}: rendered palm outside prop ${outside}`);}
 if(d.id==='kitten-care'){const c=sample(119),f=scenarioFrame(d.id,119),cat=f.actors.find(a=>a.id==='miu'),a=c.find(a=>a.id==='thanh');for(const side of ['left','right']){const h=a.hands[side],p=stagePoint(cat.position);assert(Math.abs(h[0]-p[0])<1&&Math.abs(h[2]-p[2])<1.3&&h[1]>p[1]&&h[1]<p[1]+1.2,'Both hands support the actual feline body');}}
 if(d.id==='kitten-care'){
  const feline=new StudioFeline();
  for(const at of [60,80,93,95,119]){const f=scenarioFrame(d.id,at),cat=f.actors.find(a=>a.id==='miu'),contacts=sample(at),hands=contacts.find(c=>c.id==='thanh').hands;feline.pose(at,stagePoint(cat.position),cat.yaw,true,!!cat.carrierId);feline.group.updateMatrixWorld(true);
   for(const side of ['left','right']){const hand=new THREE.Vector3(...hands[side]),body=feline.group.getObjectByName('cat-body'),index=body.geometry.index;let distance=Infinity;for(let i=0;i<index.count;i+=3){const points=[0,1,2].map(j=>body.getVertexPosition(index.getX(i+j),new THREE.Vector3()).applyMatrix4(body.matrixWorld)),closest=new THREE.Triangle(...points).closestPointToPoint(hand,new THREE.Vector3());distance=Math.min(distance,closest.distanceTo(hand));}assert(distance<.15,'Palm must support rendered belly: '+JSON.stringify({at,side,distance}));}

   for(const aspect of [1440/900,390/844]){const shot=studioFocus(f,contacts,'miu',aspect,40,new THREE.Vector3(15,10,24)),camera=new THREE.PerspectiveCamera(40,aspect,.1,2000);camera.position.copy(shot.eye);camera.lookAt(shot.target);camera.updateMatrixWorld(true);assert(shot.subjects.includes('thanh'),'Focus includes the supporting adult on the ground and while carried');for(const id of shot.subjects){const a=f.actors.find(a=>a.id===id),head=contacts.find(c=>c.id===id)?.head??[a.position[0],a.position[1]+2.25,a.position[2]];for(const p of [head,stagePoint(a.position)]){const ndc=new THREE.Vector3(...p).project(camera);assert(Math.abs(ndc.x)<.95&&Math.abs(ndc.y)<.95,'Focused cat and carrier stay in frame');}}}
  }
  const geometries=new Set(),materials=new Set();feline.group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
 report.push({scenario:d.id,maxHandStep,maximumContactGap,seekEquivalent:true});for(const a of actors.values())a.dispose();
}
const voices=JSON.parse(readFileSync('public/audio/studio/manifest.json'));assert.equal(voices.clips.length,21);
for(const c of voices.clips){const bytes=readFileSync('public'+c.url);assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert(c.duration>1&&c.duration<=c.until-c.at);const f=scenarioFrame(c.scenario,c.at+.01);assert(f.dialogue.some(l=>l.speaker===c.speaker&&l.text===c.text));assert.equal(bytes.subarray(0,4).toString(),'OggS');}
console.log(JSON.stringify({suite:'studio-quality',report,voices:voices.clips.length,scope:'actual rig/arm surfaces and local asset integrity; browser/audio output separate'}));

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {loadLocalGLTF} from './load-local-gltf.mjs';
import {StudioAvatar} from '../components/studio/avatar.ts';
import {poseStudioActors} from '../components/studio/actors.ts';
import {stagePoint} from '../components/studio/motion.ts';
import {scenarioFrame,scenarioDefinitions} from '../lib/city/scenarios/index.ts';
const catalog=JSON.parse(readFileSync('public/models/resources/catalog.json')).assets,models=new Map(),report=[];
const equivalent=(a,b)=>{if(typeof a==='number'&&typeof b==='number'){assert(Math.abs(a-b)<1e-5,`Pose drift ${a} vs ${b}`);return;}if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))equivalent(a[k],b[k]);}else assert.equal(a,b);};
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(const d of scenarioDefinitions){
 const actors=new Map();for(const s of d.cast.filter(s=>s.species==='human')){assert(s.modelHint.startsWith('gobkit-human002/'));if(!models.has(s.modelHint))models.set(s.modelHint,await loadLocalGLTF(catalog.find(a=>a.id===s.modelHint).url));actors.set(s.id,new StudioAvatar(models.get(s.modelHint),s.heightMeters*10,s.radius*.9,s.wardrobe.shirt));}
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
 let maximumContactGap=0;
 for(const [t,id,actor] of probes){const f=scenarioFrame(d.id,t),p=f.props.find(p=>p.id===id),a=sample(t).find(a=>a.id===actor),centre=new THREE.Vector3(...stagePoint(p.position)),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)).invert(),hand=new THREE.Vector3(...a.hands.right).sub(centre).applyQuaternion(q),size=p.size.map((v,i)=>i===1?v*.34:v),outside=Math.hypot(...hand.toArray().map((v,i)=>Math.max(0,Math.abs(v)-size[i]/2)));maximumContactGap=Math.max(maximumContactGap,outside);assert(outside<.35,`${d.id}/${id} at ${t}: rendered palm outside prop ${outside}`);}
 if(d.id==='kitten-care'){const c=sample(119),f=scenarioFrame(d.id,119),cat=f.actors.find(a=>a.id==='miu'),a=c.find(a=>a.id==='thanh');for(const side of ['left','right']){const h=a.hands[side],p=stagePoint(cat.position);assert(Math.abs(h[0]-p[0])<1&&Math.abs(h[2]-p[2])<1.3&&h[1]>p[1]&&h[1]<p[1]+1.2,'Both hands support the actual feline body');}}
 report.push({scenario:d.id,maxHandStep,maximumContactGap,seekEquivalent:true});for(const a of actors.values())a.dispose();
}
const voices=JSON.parse(readFileSync('public/audio/studio/manifest.json'));assert.equal(voices.clips.length,21);
for(const c of voices.clips){const bytes=readFileSync('public'+c.url);assert.equal(bytes.length,c.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);assert(c.duration>1&&c.duration<=c.until-c.at);const f=scenarioFrame(c.scenario,c.at+.01);assert(f.dialogue.some(l=>l.speaker===c.speaker&&l.text===c.text));assert.equal(bytes.subarray(0,4).toString(),'OggS');}
console.log(JSON.stringify({suite:'studio-quality',report,voices:voices.clips.length,scope:'actual rig/arm surfaces and local asset integrity; browser/audio output separate'}));

import * as THREE from 'three';
import {scenarioDefinitions,type ScenarioFrame} from '../../lib/city/scenarios/index.ts';
import {stagePoint} from './motion.ts';
const groups:Record<string,string[][]>={
 'wallet-return':[['minh'],['tuan'],['tuan','minh'],['tuan','minh'],['tuan','minh']],
 'sanitation-gratitude':[['hanh'],['hoang','lan'],['hanh','hoang','lan'],['hanh','lan'],['hanh','hoang','lan']],
 'kitten-care':[['miu'],['thanh','mai'],['miu','thanh'],['miu','thanh','mai'],['miu','thanh','mai']],
 'bakery-courtesy':[['office','teacher'],['ba','teacher'],['ba','office','teacher'],['ba','teacher','seller'],['ba','seller','teacher']],
};
type Contact={id:string;head:number[];hands:{left:number[];right:number[]}};
const ease=(v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*t*(t*(t*6-15)+10);};
export function studioCamera(frame:ScenarioFrame,contacts:Contact[],aspect:number){
 const index=frame.beat.index,definition=scenarioDefinitions.find(d=>d.id===frame.id)!,amount=index?ease((frame.time-definition.shots[index].at)/2.4):1;
 const offset=new THREE.Vector3(...frame.camera.position).sub(new THREE.Vector3(...frame.camera.target));offset.y*=.8;
 // Preserve the authored orbit/pitch, but frame real chibi bodies instead of the
 // old human-height focus and compressed top-down distance.
 const direction=offset.clone().normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(frame.camera.fov)/2);
 const boundsFor=(ids:string[])=>{const bounds=new THREE.Box3();for(const id of ids){const a=frame.actors.find(a=>a.id===id)!;if(a.species==='cat'){const p=stagePoint(a.position);bounds.expandByPoint(new THREE.Vector3(p[0]-1,p[1],p[2]-2));bounds.expandByPoint(new THREE.Vector3(p[0]+1,p[1]+2.25,p[2]+1.5));}else{const c=contacts.find(c=>c.id===id)!,p=a.position,r=a.radius*.8;bounds.expandByPoint(new THREE.Vector3(p[0]-r,0,p[2]-r));bounds.expandByPoint(new THREE.Vector3(p[0]+r,c.head[1]+.2,p[2]+r));bounds.expandByPoint(new THREE.Vector3(...c.hands.left));bounds.expandByPoint(new THREE.Vector3(...c.hands.right));}}
  for(const p of frame.props)if(p.visible&&p.holderId&&ids.includes(p.holderId)){const center=new THREE.Vector3(...stagePoint(p.position)),half=new THREE.Vector3(p.size[0]/2,p.size[1]*.34/2,p.size[2]/2);bounds.expandByPoint(center.clone().sub(half));bounds.expandByPoint(center.clone().add(half));}
  return bounds;
 };
 const fit=(ids:string[])=>{const bounds=boundsFor(ids),center=bounds.getCenter(new THREE.Vector3()),height=bounds.max.y-bounds.min.y;center.addScaledVector(up,-height*.06);let distance=10;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,p.dot(direction)+Math.abs(p.dot(right))/(tan*Math.max(.3,aspect)*.76),p.dot(direction)+Math.abs(p.dot(up))/(tan*(aspect<.85?.5:.64)));}
  return {target:center,eye:center.clone().addScaledVector(direction,Math.max(distance,offset.length()*.5)),ids};
 };
 const a=fit(groups[frame.id][Math.max(0,index-1)]),b=fit(groups[frame.id][index]);
 return {target:a.target.lerp(b.target,amount),eye:a.eye.lerp(b.eye,amount),subjects:amount>.999?b.ids:amount<.001?a.ids:[...new Set([...a.ids,...b.ids])]};
}

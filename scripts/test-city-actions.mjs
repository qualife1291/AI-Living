import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {loadLocalGLTF} from './load-local-gltf.mjs';
import {RiggedAvatar} from '../components/city/three/rigged-avatar.ts';
import {groundElevation} from '../lib/city/ground.ts';
import {ActorActions} from '../components/city/three/actor-actions.ts';
const floor=groundElevation(0,0);
const catalog=JSON.parse(fs.readFileSync('public/models/supplied/catalog.json')).assets;
let radiusMax=0,gripMax=0,footMax=0,seatMax=0,frames=0;
const report=[];
for(const asset of catalog){
 const source=await loadLocalGLTF(asset.url),rig=new RiggedAvatar(source),actions=new ActorActions(),baseline=JSON.stringify(source.scene.toJSON());
 const lengths=()=>['left','right'].flatMap(side=>{const a=rig.joint('arm-'+side),h=rig.joint('hand-'+side),b=h.parent;return [a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3())),b.getWorldPosition(new THREE.Vector3()).distanceTo(h.getWorldPosition(new THREE.Vector3()))];});
 const originalLengths=lengths();
 for(const [ki,kind] of ['read','cup','bread','work','garden','bag','cook','exercise','jump','soccer','swim','cycle'].entries()){
  let kindRadius=0,kindGrip=0,kindFoot=0,kindSeat=0;
  const actor={id:'fixture',name:'fixture',kind:kind==='cycle'?'cycle':kind==='cup'?'drink':kind==='bread'?'eat':kind==='bag'?'shop':kind==='cook'?'work':kind,activity:kind,from:'Công viên',location:'Công viên',position:[0,0],path:[[0,0]],walking:false,progress:1,source:'plan'};
  for(let n=0;n<48;n++){
   const seconds=ki*10+n/12;if(kind==='cycle')actor.bicycle={distance:n/3};
   rig.pose(kind==='cycle'?'drive':'idle',seconds,seconds,[0,0],0,floor+(kind==='cycle'?4:0));actions.apply(rig,actor,kind,seconds);assert.equal(rig.group.position.x,0);assert.equal(rig.group.position.z,0);
   for(const [i,length] of lengths().entries())assert(Math.abs(length-originalLengths[i])<1e-6,'Contact cannot stretch a limb');
   if(n>=12){
    if(['read','work','garden','bag','cook'].includes(kind)){const y=(rig.hand('right').y-floor)/rig.height;assert(y>.4&&y<.73,asset.id+'/'+kind+' needs an actual hand-held pose: '+y);}
    if(kind==='read'){assert(rig.hand('left').distanceTo(rig.hand('right'))<3.2);assert(rig.hand('right').z>1.8);}
    if(kind==='cycle'){
     const phase=actor.bicycle.distance/3;
     for(const side of ['left','right']){const sign=side==='left'?1:-1,grip=rig.hand(side).distanceTo(new THREE.Vector3(sign*2,floor+9,3.5)),foot=rig.foot(side).distanceTo(new THREE.Vector3(sign*1.35,floor+3+sign*Math.sin(phase)*1.1,sign*Math.cos(phase)*1.1));kindGrip=Math.max(kindGrip,grip);kindFoot=Math.max(kindFoot,foot);}
     kindSeat=Math.max(kindSeat,Math.abs(rig.seat().y-floor-7.8));
    }
   }
   rig.model.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.getAttribute('position').count;i++){const p=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),r=Math.hypot(p.x,p.z);kindRadius=Math.max(kindRadius,r);assert(r<=(kind==='cycle'?9.2:4.8)+.001,`${asset.id}/${kind}/${n}: actual skin radius ${r}`);}});
   frames++;
  }
  if(kind==='cycle'){assert(kindGrip<.35,asset.id+' handlebar contact '+kindGrip);assert(kindFoot<.35,asset.id+' pedal contact '+kindFoot);assert(kindSeat<.35,asset.id+' saddle contact '+kindSeat);}
  radiusMax=Math.max(radiusMax,kindRadius);gripMax=Math.max(gripMax,kindGrip);footMax=Math.max(footMax,kindFoot);seatMax=Math.max(seatMax,kindSeat);report.push({id:asset.id,kind,radius:kindRadius,handleGap:kindGrip,pedalGap:kindFoot,seatGap:kindSeat});
 }
 // Constant animation tracks must overwrite prior IK offsets on each frame.
 const clean=new RiggedAvatar(source);rig.pose('idle',0,1000,[0,0],0,floor);clean.pose('idle',0,1000,[0,0],0,floor);
 for(const side of ['left','right'])assert(rig.hand(side).distanceTo(clean.hand(side))<1e-6,'No contact pose leaks into idle');
 const frozen=rig.snapshot();rig.pose('drive',0,1000,[0,0],0,floor);assert.deepEqual(rig.snapshot(),frozen,'Presentation time freezes clip/contacts while paused');clean.dispose();
 assert.equal(JSON.stringify(source.scene.toJSON()),baseline);rig.dispose();
}
console.log(JSON.stringify({suite:'city-actions',styles:5,actions:12,frames,radiusMax,gripMax,footMax,seatMax,limbLengthsPreserved:true,sourceImmutable:true,worldWrites:false,report}));

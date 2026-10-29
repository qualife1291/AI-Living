/** Original CC0 civilian rigs, generated deterministically; no downloaded artwork. */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(!globalThis.FileReader)globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result=`data:${blob.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const write=process.argv.includes('--write'),folder='public/models/citizens';
const designs=[
 ['an','An — áo khoác nhẹ',0,'#298d94','#293d52','short','jacket','glasses'],
 ['binh','Bình — sơ mi và kính',1,'#c7835c','#354b62','side','shirt','glasses'],
 ['chi','Chi — tạp dề bếp',2,'#e4ad62','#576c69','bun','apron','none'],
 ['linen','Áo linen',3,'#81a89a','#465c73','curl','shirt','none'],
 ['cardigan','Áo cardigan',0,'#b56f7a','#40495d','long','jacket','none'],
 ['field','Trang phục làm vườn',1,'#78975e','#7a6856','short','vest','cap'],
 ['courier','Áo giao hàng',2,'#ca7958','#394d61','side','jacket','cap'],
 ['coat','Áo blouse',3,'#e7ece2','#597b8c','bun','coat','glasses'],
 ['senior','Áo gile',1,'#8f829f','#4e566b','gray','vest','glasses'],
 ['workshop','Trang phục xưởng',2,'#688dba','#3d5360','curl','vest','none'],
 ['denim','Áo denim',0,'#557d9e','#926f58','long','jacket','none'],
 ['summer','Áo mùa hè',3,'#d7b77c','#507a7a','side','shirt','none'],
];
function make(design,index){
 const [,,tone,shirt,trousers,hair,outfit,accessory]=design,skin=['#e1b58d','#b98867','#d3a17e','#efc7a2'][tone],hairColor=hair==='gray'?'#aaa9a3':['#30383a','#4d3730','#272f32'][index%3];
 const scene=new THREE.Scene();scene.name='Citizen';scene.userData.profile='xom-citizen-v1';
 const bones=[],map=new Map(),parts=[];const bone=(name,parent,x,y,z=0)=>{const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);parent?.add(b);bones.push(b);map.set(name,b);return b;};
 const root=bone('Root',null,0,0),hips=bone('Hips',root,0,8.1),spine=bone('Spine',hips,0,1.1),chest=bone('Chest',spine,0,2.15),neck=bone('Neck',chest,0,2.1),head=bone('Head',neck,0,.8);
 for(const side of ['Left','Right']){const sign=side==='Left'?1:-1,a=bone(side+'Arm',chest,sign*2.05,.6),f=bone(side+'ForeArm',a,0,-2.65),h=bone(side+'Hand',f,0,-2.35),l=bone(side+'UpLeg',hips,sign*.9,-.15),k=bone(side+'Leg',l,0,-3.45);bone(side+'Foot',k,0,-3.4);h.userData.attachment=true;}
 scene.add(root);scene.updateMatrixWorld(true);
 const shape=(geo,b,color,mask,x,y,z,sx=1,sy=1,sz=1,rx=0)=>{geo.rotateX(rx);geo.scale(sx,sy,sz);geo.translate(x,y,z);geo.applyMatrix4(b.matrixWorld);if(geo.index){const g=geo.toNonIndexed();geo.dispose();geo=g;}const n=geo.attributes.position.count,c=new THREE.Color(color),colors=new Float32Array(n*3),indices=new Uint16Array(n*4),weights=new Float32Array(n*4),masks=new Float32Array(n);for(let i=0;i<n;i++){c.toArray(colors,i*3);indices[i*4]=bones.indexOf(b);weights[i*4]=1;masks[i]=mask;}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));geo.setAttribute('_wardrobe',new THREE.BufferAttribute(masks,1));parts.push(geo);};
 const capsule=(b,x,y,z,r,len,color,mask,sx=1,sz=1)=>shape(new THREE.CapsuleGeometry(r,len,2,6),b,color,mask,x,y,z,sx,1,sz);
 const sphere=(b,x,y,z,sx,sy,sz,color,mask=0)=>shape(new THREE.SphereGeometry(1,8,6),b,color,mask,x,y,z,sx,sy,sz);
 const joint=(b,x,y,z,sx,sy,sz,color,mask)=>shape(new THREE.SphereGeometry(1,6,3),b,color,mask,x,y,z,sx,sy,sz);
 const box=(b,x,y,z,w,h,d,color,mask=0)=>shape(new THREE.BoxGeometry(1,1,1),b,color,mask,x,y,z,w,h,d);
 const build=1+(index%3-1)*.045;
 capsule(spine,0,1.35,0,1.5,2.8,shirt,1,1.05*build,.58);sphere(hips,0,0,0,1.62*build,.72,.83,trousers,2);
 capsule(neck,0,.25,0,.46,.5,skin,3);
 sphere(head,0,.6,0,1.12,1.42,.94,skin,3);
 for(const sign of [-1,1]){sphere(head,sign*1.1,.45,-.06,.22,.35,.2,skin,3);sphere(head,sign*.4,.8,.84,.23,.25,.13,'#faf5e7');sphere(head,sign*.4,.8,.97,.105,.15,.06,'#273740');box(head,sign*.4,1.2,.86,.48,.1,.08,hairColor);}
 sphere(head,0,.43,.98,.17,.24,.24,skin,3);box(head,0,-.02,.9,.44,.075,.08,'#a46f5d');
 sphere(head,0,1.55,-.08,1.15,.62,.98,hairColor);
 if(hair==='long'||hair==='bun'){capsule(head,0,.65,-.63,.82,1.5,hairColor,0,1.2,.48);if(hair==='bun')sphere(head,0,1.65,-.9,.54,.54,.5,hairColor);}
 if(hair==='curl')for(const x of [-.65,0,.65])sphere(head,x,1.9,-.05,.51,.42,.72,hairColor);
 if(hair==='side')sphere(head,-.5,1.6,.52,.8,.44,.54,hairColor);
 if(accessory==='glasses'){for(const sign of [-1,1]){shape(new THREE.TorusGeometry(.32,.045,3,8),head,'#39484e',0,sign*.4,.81,1.025,1,1,1);box(head,sign*.84,.83,.66,.07,.07,.6,'#39484e');}box(head,0,.83,1.03,.2,.06,.06,'#39484e');}
 if(accessory==='cap'){sphere(head,0,1.85,-.05,1.21,.47,1.03,shirt);box(head,0,1.7,.91,1.7,.11,.65,shirt);}
 for(const side of ['Left','Right']){const a=map.get(side+'Arm'),f=map.get(side+'ForeArm'),h=map.get(side+'Hand'),l=map.get(side+'UpLeg'),k=map.get(side+'Leg'),foot=map.get(side+'Foot');joint(a,0,0,0,.5,.52,.46,shirt,1);capsule(a,0,-1.2,0,.49,1.65,shirt,1,1,.9);joint(f,0,0,0,.37,.38,.35,skin,3);capsule(f,0,-1.08,0,.36,1.65,skin,3);sphere(h,0,-.32,.05,.43,.62,.3,skin,3);capsule(l,0,-1.55,0,.63,2.25,trousers,2,1,.9);joint(k,0,0,0,.55,.56,.53,trousers,2);capsule(k,0,-1.55,0,.53,2.25,trousers,2,1,.95);joint(foot,0,.05,0,.44,.48,.43,trousers,2);box(foot,0,-.55,.36,1.15,.72,1.85,'#35474b');box(foot,0,-.93,.36,1.2,.15,1.9,'#d8d8cb');}
 if(outfit==='jacket'||outfit==='vest'||outfit==='coat'){const length=outfit==='coat'?4.1:2.6;box(spine,0,.6,-.83,2.7*build,length,.14,shirt,1);for(const sign of [-1,1])box(spine,sign*.65,.65,.85,.66,length,.15,shirt,1);box(spine,0,1.3,.9,.42,1.45,.08,'#e9e3cf');}
 if(outfit==='apron'){box(spine,0,.6,.91,2.3,3.5,.13,'#e7d8b6');box(spine,0,-.15,1.01,1.05,.7,.05,'#c4b99d');}
 for(const y of [.2,.8,1.4])sphere(spine,.08,y,.94,.065,.065,.05,'#e9d8b4');
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.computeBoundingBox();const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name='CitizenBody';scene.add(mesh);scene.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));
 const times=[0,.25,.5,.75,1],q=(x,y=0,z=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).toArray();
 const clip=(name,patterns,duration=1)=>new THREE.AnimationClip(name,duration,Object.entries(patterns).map(([bone,angles])=>new THREE.QuaternionKeyframeTrack(bone+'.quaternion',times.map(t=>t*duration),angles.flatMap(v=>q(...(Array.isArray(v)?v:[v]))))));
 const cycle=(v)=>[0,v,0,-v,0],still=[0,0,0,0,0];
 const clips=[clip('Idle',{Chest:cycle(.012),Head:cycle(.025)},3),clip('Walk',{LeftUpLeg:cycle(.28),RightUpLeg:cycle(-.28),LeftLeg:[.08,.04,.08,.22,.08],RightLeg:[.08,.22,.08,.04,.08],LeftArm:cycle(-.3),RightArm:cycle(.3)}),clip('Run',{LeftUpLeg:cycle(.36),RightUpLeg:cycle(-.36),LeftArm:cycle(-.55),RightArm:cycle(.55)},.7),clip('Talk',{Head:cycle(.07),RightArm:[[0,0,-.1],[0,.08,-.2],[0,0,-.1],[0,-.08,-.25],[0,0,-.1]],RightForeArm:[-.4,-.7,-.5,-.8,-.4]},3),clip('Listen',{Head:cycle(.09),LeftArm:still},3),clip('Nod',{Head:cycle(.14)},2),clip('Think',{RightForeArm:[-1,-1.1,-1,-1.15,-1]},3),clip('Sit',{LeftUpLeg:Array(5).fill(-1.2),RightUpLeg:Array(5).fill(-1.2),LeftLeg:Array(5).fill(1.2),RightLeg:Array(5).fill(1.2)},2),clip('Wave',{RightArm:Array(5).fill([0,0,-1.7]),RightForeArm:cycle(.4)},2),clip('PickUp',{Chest:[0,.25,.5,.25,0],LeftForeArm:[0,-.4,-.7,-.4,0],RightForeArm:[0,-.4,-.7,-.4,0]},2)];
 return {scene,clips,triangles:geometry.attributes.position.count/3};
}
const assets=[];if(write)mkdirSync(folder,{recursive:true});
for(let i=0;i<designs.length;i++){const d=designs[i],{scene,clips,triangles}=make(d,i),raw=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,onlyVisible:true})),url=`/models/citizens/${d[0]}.glb`,sha256=createHash('sha256').update(raw).digest('hex');
 const asset={id:`citizens/${d[0]}`,name:d[1],pack:'xom-citizens',kind:'human',genre:'daily-life',url,bytes:raw.length,sha256,license:'CC0-1.0',skins:1,triangles,clips:clips.map(c=>c.name)};assets.push(asset);
 if(write)writeFileSync('public'+url,raw);else if(!readFileSync('public'+url).equals(raw))throw Error('Stale original citizen model: '+asset.id);
 scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
}
const catalog=JSON.stringify({version:1,source:'Original Xóm AI civilian rig generator; no third-party mesh or texture',license:'CC0-1.0',licenseUrl:'/models/citizens/LICENSE.txt',assets},null,2)+'\n';
if(write){writeFileSync(folder+'/catalog.json',catalog);writeFileSync(folder+'/LICENSE.txt','Xóm AI Citizens — original geometry, skeletons and animation authored for this project, 2026.\nDedicated to the public domain under CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\nNo third-party mesh, texture or character likeness was used. Rebuild with scripts/build-citizen-models.mjs.\n');}else if(readFileSync(folder+'/catalog.json','utf8')!==catalog)throw Error('Stale citizen catalog');
console.log(JSON.stringify({models:assets.length,bytes:assets.reduce((n,a)=>n+a.bytes,0),triangles:assets.map(a=>a.triangles),mode:write?'written':'checked',originalCC0:true}));

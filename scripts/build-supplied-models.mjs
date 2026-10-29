/** Offline, deterministic normalization of the owner's explicitly selected civilian rigs. */
import {Document,NodeIO,Accessor} from '@gltf-transform/core';
import {weld,prune,resample} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const selection=JSON.parse(readFileSync('data/assets/supplied-selection.json'));
const write=process.argv.includes('--write'),folder='public/models/supplied',io=new NodeIO();
const hash=b=>createHash('sha256').update(b).digest('hex');
if(!write){
 const catalog=JSON.parse(readFileSync(folder+'/catalog.json'));
 for(const a of catalog.assets){const selected=selection.assets.find(s=>s.id===a.id);if(!selected||a.sourceSha256!==selected.sourceSha256||a.license!==selection.license)throw Error('Unreviewed supplied asset');for(const f of [{url:a.url,bytes:a.bytes,sha256:a.sha256},...a.resources]){const p='public'+f.url;if(!f.url.startsWith('/models/supplied/')||f.url.includes('..')||lstatSync(p).isSymbolicLink())throw Error('Invalid derivative path');const b=readFileSync(p);if(b.length!==f.bytes||hash(b)!==f.sha256)throw Error('Derivative checksum mismatch');}}
 console.log(JSON.stringify({suite:'supplied-assets',models:catalog.assets.length,license:selection.license,hashes:true,requiresSourceVault:false}));process.exit(0);
}
const extraction=spawnSync('python3',['scripts/extract-supplied-assets.py'],{encoding:'utf8'});if(extraction.status!==0)throw Error('Approved source extraction failed: '+extraction.stderr.slice(-400));
await MeshoptSimplifier.ready;mkdirSync(folder,{recursive:true});
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class extends Event{constructor(t,init={}){super(t);Object.assign(this,init);}};
const aliases={head:'Head',torso:'Spine1',hips:'Hips','arm-left':'LeftArm','arm-right':'RightArm','hand-left':'LeftHand','hand-right':'RightHand','leg-left':'LeftUpLeg','leg-right':'RightUpLeg','knee-left':'LeftLeg','knee-right':'RightLeg','foot-left':'LeftFoot','foot-right':'RightFoot'};
const assets=[];
for(const selected of selection.assets){
 const raw=readFileSync('work/supplied-inputs/'+selected.id.split('/')[1]+'.glb');if(hash(raw)!==selected.sourceSha256)throw Error('Source model checksum');
 const original=await io.readBinary(raw),loader=new GLTFLoader();loader.register(()=>({name:'offline-material',loadMaterial:()=>Promise.resolve(new THREE.MeshBasicMaterial())}));
 const source=await loader.parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
 const skeletons=[];source.scene.traverse(o=>{if(o.isSkinnedMesh)skeletons.push(o.skeleton);});const bones=skeletons[0].bones,byName=new Map(bones.map(b=>[b.name,b]));
 if(bones.length!==44||Object.values(aliases).some(name=>!byName.has(name)))throw Error('Unexpected skeleton');
 for(const s of skeletons)if(s.bones.some((b,i)=>b!==bones[i]))throw Error('Mismatched mesh skin');
 const pick=names=>names.map(n=>source.animations.find(c=>c.name===n)).find(Boolean);
 const neutral=pick(['Idle','Adult_TalkGestureListen','Plus-sizeAdult_TalkGestureListen']);if(!neutral)throw Error('No reviewed standing pose');
 const mixer=new THREE.AnimationMixer(source.scene),actions=new Map(source.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const sample=(clip,time)=>{mixer.stopAllAction();const a=actions.get(clip.name);a.reset().play();a.time=Math.min(time,clip.duration);mixer.update(0);source.scene.updateMatrixWorld(true);};
 sample(neutral,0);
 const rest=bones.map(b=>({p:b.getWorldPosition(new THREE.Vector3()),q:b.getWorldQuaternion(new THREE.Quaternion())}));
 const parents=bones.map(b=>bones.indexOf(b.parent)),hips=bones.indexOf(byName.get('Hips'));
 // Source characters include a complete body beneath separate garments. A garment
 // simplified into larger triangles can cut through that body. Remove only body
 // faces actually covered by a nearby garment in the reviewed neutral pose.
 const occluders=[];let bodyFacesRemoved=0,pantsHem=Infinity;
 source.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh||!/pants|shorts|shirt|top|shoes/i.test(mesh.name))return;mesh.skeleton.update();const p=mesh.geometry.getAttribute('position'),v=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const point=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);point.toArray(v,i*3);if(/pants|shorts/i.test(mesh.name))pantsHem=Math.min(pantsHem,point.y);}const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(v,3));if(mesh.geometry.index)geometry.setIndex(mesh.geometry.index.clone());const o=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));o.updateMatrixWorld();occluders.push(o);});
 const bodyHeight=new THREE.Box3().setFromObject(source.scene).getSize(new THREE.Vector3()).y,ray=new THREE.Raycaster();ray.far=bodyHeight*.065;
 const coveredFace=(mesh,index,k)=>{const a=mesh.getVertexPosition(index[k],new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),b=mesh.getVertexPosition(index[k+1],new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),c=mesh.getVertexPosition(index[k+2],new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),center=a.clone().add(b).add(c).multiplyScalar(1/3),si=mesh.geometry.getAttribute('skinIndex'),sw=mesh.geometry.getAttribute('skinWeight');let leg=0,arm=0;for(let v=0;v<3;v++)for(let j=0;j<4;j++){const name=bones[si.getComponent(index[k+v],j)].name,weight=sw.getComponent(index[k+v],j)/3;if(/Hips|Leg|Foot|Toe/.test(name))leg+=weight;if(/Arm/.test(name))arm+=weight;}
  // Exact reviewed garments: all five have trousers/shorts; the first three
  // listed here have long sleeves. Retain bare calves, ankles, wrists and hands.
  if(leg>.55)return selected.id!=='supplied/leisure'&&Math.min(a.y,b.y,c.y)>pantsHem+bodyHeight*.003;
  if(arm>.8&&['supplied/jacket','supplied/service','supplied/office'].includes(selected.id))return true;
  ray.set(center.addScaledVector(normal,-bodyHeight*1e-5),normal);return ray.intersectObjects(occluders,false).length>0;};
 const pos=[],normal=[],uv=[],color=[],joints=[],weights=[],wardrobe=[],features=[],indices=[],skinCandidates=[];let mainTexture;
 source.scene.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const association=source.parser.associations.get(mesh),sourceMesh=original.getRoot().listMeshes()[association?.meshes],primitives=association?.primitives===undefined?sourceMesh?.listPrimitives():[sourceMesh.listPrimitives()[association.primitives]];
  if(!primitives)throw Error('Source mesh metadata mismatch: '+mesh.name);
  const g=mesh.geometry;mesh.skeleton.update();
  const skin=g.getAttribute('skinIndex'),w=g.getAttribute('skinWeight'),p=g.getAttribute('position'),n=g.getAttribute('normal'),u=g.getAttribute('uv'),c=g.getAttribute('color');
  const index=g.index?.array??Array.from({length:p.count},(_,i)=>i),groups=g.groups.length?g.groups:[{start:0,count:index.length,materialIndex:0}];
  for(const group of groups){
   const primitive=primitives[group.materialIndex??0];if(!primitive)throw Error('Source material group missing');
   if(/chain/i.test(primitive.getMaterial()?.getName()??''))continue; // Cosmetic necklace is not part of the civilian body.
   const texture=primitive.getMaterial()?.getBaseColorTexture();if(!texture)throw Error('Expected reviewed palette texture');
   if(mainTexture&&hash(texture.getImage())!==hash(mainTexture.getImage()))throw Error('Multiple body palettes need an explicit atlas');mainTexture=texture;
   const remap=new Map(),mask=/pants/i.test(mesh.name)?2:/shirt|top/i.test(mesh.name)?1:0;
   for(let k=group.start;k<group.start+group.count;k++){
    if((k-group.start)%3===0&&(/body/i.test(mesh.name)||/^ChessPlayer_0[12]$/.test(mesh.name))&&coveredFace(mesh,index,k)){bodyFacesRemoved++;k+=2;continue;}
    const vi=index[k];let out=remap.get(vi);
    if(out===undefined){out=pos.length/3;remap.set(vi,out);const v=mesh.getVertexPosition(vi,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);pos.push(...v);features.push(/face/i.test(mesh.name)||(/body/i.test(mesh.name)||/^ChessPlayer_0[12]$/.test(mesh.name))&&v.y>byName.get('Neck').getWorldPosition(new THREE.Vector3()).y?1:0);uv.push(u.getX(vi),u.getY(vi));color.push(c?.getX(vi)??1,c?.getY(vi)??1,c?.getZ(vi)??1,c?.itemSize===4?c.getW(vi):1);
     const skinMatrix=new THREE.Matrix4();skinMatrix.elements.fill(0);for(let j=0;j<4;j++){const bi=skin.getComponent(vi,j),weight=w.getComponent(vi,j);joints.push(bi);weights.push(weight);const bm=mesh.skeleton.boneMatrices;for(let z=0;z<16;z++)skinMatrix.elements[z]+=bm[bi*16+z]*weight;}
     skinMatrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);const vn=new THREE.Vector3(n.getX(vi),n.getY(vi),n.getZ(vi)).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(skinMatrix));normal.push(...vn);wardrobe.push(mask);if(mask===0&&!/hair|glasses|hat|shoes|chain/i.test(mesh.name))skinCandidates.push([out,u.getX(vi),u.getY(vi)]);
    }indices.push(out);
   }
  }
 });
 const image=mainTexture.getImage(),textureName='palette-'+hash(image).slice(0,24)+'.png';if(mainTexture.getMimeType()!=='image/png')throw Error('Unexpected palette format');writeFileSync(folder+'/'+textureName,image);
 const skinSample=spawnSync('python3',['scripts/supplied-skin-mask.py'],{input:JSON.stringify({path:folder+'/'+textureName,vertices:skinCandidates}),encoding:'utf8'});if(skinSample.status!==0)throw Error('Source palette skin sampling failed: '+skinSample.stderr);const skinData=JSON.parse(skinSample.stdout);for(const index of skinData.indices)wardrobe[index]=3;
 const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Supplied civilian').setExtras({profile:'xom-supplied-v1',jointAliases:aliases,canonicalAxes:true,skinTone:skinData.skinTone,sourceSha256:selected.sourceSha256});
 const nodes=bones.map((b,i)=>doc.createNode(b.name).setTranslation(rest[i].p.clone().sub(parents[i]<0?new THREE.Vector3():rest[parents[i]].p).toArray()));
 for(let i=0;i<nodes.length;i++)if(parents[i]>=0)nodes[parents[i]].addChild(nodes[i]);else scene.addChild(nodes[i]);
 const attr=(name,type,array)=>doc.createAccessor(name,buffer).setType(type).setArray(array);
 const inverse=new Float32Array(bones.length*16);rest.forEach((r,i)=>new THREE.Matrix4().makeTranslation(-r.p.x,-r.p.y,-r.p.z).toArray(inverse,i*16));
 const sk=doc.createSkin('Canonical civilian');nodes.forEach(n=>sk.addJoint(n));sk.setSkeleton(nodes[parents.indexOf(-1)]).setInverseBindMatrices(attr('inverse-bind',Accessor.Type.MAT4,inverse));

 const tex=doc.createTexture('Shared civilian palette').setImage(image).setMimeType('image/png').setURI(textureName),mat=doc.createMaterial('Civilian palette').setBaseColorTexture(tex).setDoubleSided(true).setMetallicFactor(0).setRoughnessFactor(.85);
 const primitive=doc.createPrimitive().setMaterial(mat).setIndices(attr('indices',Accessor.Type.SCALAR,new Uint32Array(indices)));
 for(const [name,type,data] of [['POSITION','VEC3',new Float32Array(pos)],['NORMAL','VEC3',new Float32Array(normal)],['TEXCOORD_0','VEC2',new Float32Array(uv)],['COLOR_0','VEC4',new Float32Array(color)],['JOINTS_0','VEC4',new Uint16Array(joints)],['WEIGHTS_0','VEC4',new Float32Array(weights)],['_WARDROBE','SCALAR',new Float32Array(wardrobe)],['_FEATURE','SCALAR',new Float32Array(features)]])primitive.setAttribute(name,attr(name,type,data));
 const mesh=doc.createMesh('CivilianBody').addPrimitive(primitive);scene.addChild(doc.createNode('CivilianBody').setMesh(mesh).setSkin(sk));
 const clipSpecs=[['Idle',neutral,Math.min(3,neutral.duration)],['Walk',pick(['Adult_Walk','Plus-sizeAdult_Walk'])],['Run',pick(['Adult_Run','Adult_WalkFast','Plus-sizeAdult_WalkFast'])],['Talk',pick(['Adult_TalkGestureActive','Plus-sizeAdult_TalkGestureActive']),4],['Listen',neutral,3],['Sit',pick(['Adult_Male_Sit_01','Adult_Male_Sit_02','Adult_Male_Sit_03','Plus-size_Male_Sit_01']),2],['Ride',pick(['Adult_Male_Sit_01','Adult_Male_Sit_02','Adult_Male_Sit_03','Plus-size_Male_Sit_01']),2],['Think',neutral,3],['Nod',neutral,2],['PickUp',neutral,2],['Wave',neutral,2]],origins={};
 for(const [name,clip,limit] of clipSpecs){
  if(!clip)throw Error('Missing required clip '+name);const duration=Math.min(limit??clip.duration,clip.duration),frames=Math.max(2,Math.ceil(duration*24)),times=Float32Array.from({length:frames+1},(_,i)=>duration*i/frames),rot=bones.map(()=>[]),locations=bones.map(()=>[]);
  for(let f=0;f<=frames;f++){
   const t=times[f];sample(clip,['Sit','Ride'].includes(name)?Math.max(0,clip.duration-1):name==='Talk'?1-Math.cos(Math.PI*t/2):t);const worldDelta=bones.map((b,i)=>b.getWorldQuaternion(new THREE.Quaternion()).multiply(rest[i].q.clone().invert()));
   for(let i=0;i<bones.length;i++){
    const q=parents[i]<0?new THREE.Quaternion():worldDelta[parents[i]].clone().invert().multiply(worldDelta[i]);
    const arm=/Arm|Shoulder/.test(bones[i].name),leg=/Leg|Foot|Toe/.test(bones[i].name);let amount=arm?(['Talk','Think','Nod','PickUp'].includes(name)?.22:.42):leg&&!['Sit','Ride'].includes(name)?(name==='Run'?.51:.62):/Spine|Hips/.test(bones[i].name)?(name==='Talk'?.35:.65):1;if(['Sit','Ride'].includes(name))amount=arm?.5:1;
    q.copy(new THREE.Quaternion().slerp(q,amount));
    if(name==='Sit'&&/Hips|Spine|Shoulder|Arm/.test(bones[i].name))q.identity();
    if(name==='Sit'&&/^(Left|Right)(UpLeg|Leg|Foot)$/.test(bones[i].name))q.setFromAxisAngle(new THREE.Vector3(1,0,0),bones[i].name.endsWith('UpLeg')?-.85:bones[i].name.endsWith('Foot')?-.85:1.7);
    if(name==='Nod'&&bones[i].name==='Head')q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.sin(t*Math.PI)*.12));
    if(name==='PickUp'&&bones[i].name==='Spine')q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.sin(t*Math.PI/2)**2*.25));
    if(name==='Wave'&&bones[i].name==='RightArm')q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-1.2*Math.sin(t*Math.PI/2)**2));
    q.toArray(rot[i],f*4);const p=rest[i].p.clone().sub(parents[i]<0?new THREE.Vector3():rest[parents[i]].p);if(i===hips){const dy=byName.get('Hips').getWorldPosition(new THREE.Vector3()).y-rest[hips].p.y;p.y+=dy*(['Sit','Ride'].includes(name)?1:.5);}p.toArray(locations[i],f*3);
   }
  }
  // Periodic closure keeps authored gesture loops from snapping at the wrap.
  for(let i=0;i<bones.length;i++)for(let f=0;f<=frames;f++)if(times[f]>duration-.35){const v=(times[f]-duration+.35)/.35,s=v*v*(3-2*v),q=new THREE.Quaternion().fromArray(rot[i],f*4).slerp(new THREE.Quaternion().fromArray(rot[i]),s);q.toArray(rot[i],f*4);}
  const animation=doc.createAnimation(name),input=attr(name+'-time','SCALAR',times);for(let i=0;i<bones.length;i++)for(const [path,type,values] of [['rotation','VEC4',rot[i]],['translation','VEC3',locations[i]]]){if(path==='translation'&&i!==hips)continue;const sampler=doc.createAnimationSampler().setInput(input).setOutput(attr(name+'-'+bones[i].name+'-'+path,type,new Float32Array(values))).setInterpolation('LINEAR');animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodes[i]).setTargetPath(path).setSampler(sampler));}origins[name]={nativeClip:clip.name,...(name==='Talk'?{sourceSegment:[0,2],cosinePingPongSeconds:4}:{}),authoredAdditionalMotion:['Nod','PickUp','Wave','Sit'].includes(name),inPlace:true};
 }
 await doc.transform(weld());
 const pp=primitive.getAttribute('POSITION'),uu=primitive.getAttribute('TEXCOORD_0'),nn=primitive.getAttribute('NORMAL'),ii=primitive.getIndices(),verts=pp.getCount(),attributes=new Float32Array(verts*5),locked=new Uint8Array(verts);
 for(let i=0;i<verts;i++){attributes.set([...uu.getElement(i,[]),...nn.getElement(i,[])],i*5);if(primitive.getAttribute('_FEATURE').getScalar(i)>.5)locked[i]=1;}
 const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(ii.getArray()),new Float32Array(pp.getArray()),3,attributes,5,[.08,.08,.015,.015,.015],locked,selection.pipeline.targetTriangles*3,selection.pipeline.maxRelativeSimplificationError);
 const [remap,unique]=MeshoptSimplifier.compactMesh(reduced);
 for(const attribute of primitive.listAttributes()){const array=attribute.getArray(),size=attribute.getElementSize(),compacted=new array.constructor(unique*size);for(let old=0;old<remap.length;old++)if(remap[old]<unique)for(let c=0;c<size;c++)compacted[remap[old]*size+c]=array[old*size+c];attribute.setArray(compacted);}
 primitive.setAttribute('_FEATURE',null);primitive.setIndices(attr('lod-indices','SCALAR',reduced));await doc.transform(resample({tolerance:1e-5,cleanup:false}),prune());
 // Keep one external shared palette. NodeIO binary output embeds images, so use JSONDocument to externalize only that image.
 const jsonDoc=await io.writeJSON(doc);const d=jsonDoc.json,binaryKeys=Object.keys(jsonDoc.resources).filter(k=>k.endsWith('.bin'));if(binaryKeys.length!==1)throw Error('Unexpected output buffers');const binary=jsonDoc.resources[binaryKeys[0]],jsonImages=d.images??[];
 for(const img of jsonImages){if(img.uri){const imgBytes=jsonDoc.resources[img.uri];if(!imgBytes||hash(imgBytes)!==hash(image))throw Error('Unexpected derivative image');img.uri=textureName;}}
 d.buffers[0]={byteLength:binary.length};let j=Buffer.from(JSON.stringify(d));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);let bin=Buffer.from(binary);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);const header=Buffer.alloc(28);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+bin.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);header.writeUInt32LE(bin.length,20);header.writeUInt32LE(0x004e4942,24);const output=Buffer.concat([header.subarray(0,20),j,header.subarray(20),bin]);
 const url='/models/'+selected.id+'.glb';writeFileSync('public'+url,output);assets.push({...selected,url,bytes:output.length,sha256:hash(output),license:selection.license,pack:'supplied-civilians',genre:'daily-life',skins:1,triangles:reduced.length/3,primitives:1,hiddenBodyTrianglesRemoved:bodyFacesRemoved,relativeSimplificationError:error,clips:clipSpecs.map(c=>c[0]),clipOrigins:origins,resources:[{url:'/models/supplied/'+textureName,bytes:image.length,sha256:hash(image)}]});
 console.log(JSON.stringify({id:selected.id,sourceTriangles:selected.triangles,triangles:reduced.length/3,error,bytes:output.length,palette:image.length}));
 mixer.stopAllAction();
}
writeFileSync(folder+'/LICENSE.txt','Free — owner supplied and confirmed. NOT CC0.\nThe project owner confirmed these downloads were free and authorized their use, filtering and adaptation. Formal author/license information was not included in the supplied Casino Free/Chess Free archives.\nPreserve the original source archive and SHA256 from data/assets/source-archives.json. Selected source members, SHA256 and adaptation history are in catalog.json and data/assets/supplied-selection.json. Do not infer a public-domain grant from a free price.\n');
writeFileSync(folder+'/catalog.json',JSON.stringify({version:1,profile:'xom-supplied-v1',license:selection.license,packs:[{id:'supplied-civilians',licenseUrl:'/models/supplied/LICENSE.txt',license:selection.license}],assets},null,2)+'\n');

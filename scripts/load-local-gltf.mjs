/** Geometry/rig QA without a browser image decoder; never fetches an external URI. */
import {readFileSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class ProgressEvent extends Event{constructor(type,init={}){super(type);Object.assign(this,init);}};
const root=resolve('public');
export async function loadLocalGLTF(url) {
 if(!url.startsWith('/models/')||url.includes('..'))throw Error('Local approved model URL required');
 const path=resolve(root,'.'+url);if(!path.startsWith(root+'/'))throw Error('Model path escapes public');
 const raw=readFileSync(path),loader=new GLTFLoader();loader.register(()=>({name:'qa-material',loadMaterial:()=>Promise.resolve(new THREE.MeshPhongMaterial())}));
 if(extname(path)==='.glb')return loader.parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
 const doc=JSON.parse(raw.toString());
 for(const buffer of doc.buffers??[])if(buffer.uri){if(/[\\:#?]/.test(buffer.uri)||buffer.uri.split('/').some(p=>p==='..'))throw Error('External buffer denied');const local=resolve(dirname(path),buffer.uri);if(!local.startsWith(root+'/'))throw Error('Invalid buffer path');buffer.uri='data:application/octet-stream;base64,'+readFileSync(local).toString('base64');}
 return loader.parseAsync(JSON.stringify(doc),'');
}

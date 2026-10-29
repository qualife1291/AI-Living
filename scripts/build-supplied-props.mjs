/** Reviewed ZIP1 props only. Reproducible atlas/LOD derivatives; CI needs no vault. */
import {NodeIO,getBounds} from '@gltf-transform/core';
import {weld,simplify,prune,dedup} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const selection=JSON.parse(readFileSync('data/assets/supplied-props-selection.json'));
const folder='public/models/supplied/props',hash=b=>createHash('sha256').update(b).digest('hex'),io=new NodeIO();
const triangles=d=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
if(process.argv.includes('--write')){
 const extraction=spawnSync('python3',['scripts/extract-supplied-assets.py','--props'],{encoding:'utf8'});if(extraction.status!==0)throw Error('Reviewed prop extraction failed');
 await MeshoptSimplifier.ready;mkdirSync(folder,{recursive:true});const assets=[];
 for(const item of selection.assets){
  const raw=readFileSync('work/environment-inputs/'+item.id.split('/').at(-1)+'.glb');if(hash(raw)!==item.sourceSha256)throw Error('Prop source mismatch');
  const doc=await io.readBinary(raw),root=doc.getRoot();if(root.listSkins().length||root.listAnimations().length)throw Error('Only rigid props are approved');
  const textures=[...new Set(root.listMaterials().map(m=>m.getBaseColorTexture()).filter(Boolean))];
  if(!textures.length||textures.length>4)throw Error('Prop texture budget');
  const atlas=spawnSync('python3',['-c',`import sys,json,base64,io\nfrom PIL import Image\na=json.load(sys.stdin);out=Image.new('RGBA',(len(a)*256,256))\nfor i,s in enumerate(a):\n im=Image.open(io.BytesIO(base64.b64decode(s)));assert im.width<=4096 and im.height<=4096;im=im.convert('RGBA').resize((248,248),Image.Resampling.LANCZOS);tile=im.resize((256,256),Image.Resampling.NEAREST);tile.paste(im,(4,4));out.paste(tile,(i*256,0))\nout.save(sys.stdout.buffer,format='PNG',optimize=True,compress_level=9)`],{input:JSON.stringify(textures.map(t=>Buffer.from(t.getImage()).toString('base64'))),maxBuffer:8*1024*1024});
  if(atlas.status!==0)throw Error('Atlas conversion failed');
  const combined=doc.createTexture('reviewed-basecolor-atlas').setImage(atlas.stdout).setMimeType('image/png');
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
   const material=p.getMaterial(),texture=material?.getBaseColorTexture();if(!material||!texture)throw Error('Missing basecolor');
   const source=p.getAttribute('TEXCOORD_0');if(!source)throw Error('Missing source UV');
   const uv=source.clone(),array=new Float32Array(source.getArray());
   for(let n=0;n<array.length;n+=2){if(array[n]<-.01||array[n]>1.01||array[n+1]<-.01||array[n+1]>1.01)throw Error('Tiled UV needs separate review');array[n]=((4+248*array[n])/256+textures.indexOf(texture))/textures.length;array[n+1]=(4+248*array[n+1])/256;}
   uv.setArray(array);p.setAttribute('TEXCOORD_0',uv);
  }
  for(const m of root.listMaterials())m.setBaseColorTexture(combined).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
  await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,1400/triangles(doc)),error:.01}),dedup(),prune());
  const count=triangles(doc);if(count>3000)throw Error('Prop geometry budget exceeded');
  const output=await io.writeBinary(doc),url='/models/'+item.id+'.glb';if(output.length>400000)throw Error('Prop byte budget');writeFileSync('public'+url,output);
  const bounds=getBounds(root.listScenes()[0]);
  assets.push({...item,name:item.id.split('/').at(-1),url,bytes:output.length,sha256:hash(output),pack:'supplied-props',genre:'daily-life',kind:'prop',license:selection.license,skins:0,clips:[],triangles:count,primitives:root.listMeshes().reduce((n,m)=>n+m.listPrimitives().length,0),atlasSize:[textures.length*256,256],bounds:{...bounds,size:bounds.max.map((v,i)=>v-bounds.min[i])}});
 }
 writeFileSync(folder+'/LICENSE.txt','Free — owner supplied and confirmed. NOT CC0.\nSelected ZIP1 members and source SHA256: data/assets/supplied-props-selection.json. Original archives: data/assets/source-archives.json.\nDerived geometry and basecolor atlases preserve the original UVs and owner-confirmed permission. No casino gameplay or assets imported.\n');
 writeFileSync(folder+'/catalog.json',JSON.stringify({version:1,packs:[{id:'supplied-props',license:selection.license,licenseUrl:'/models/supplied/props/LICENSE.txt'}],assets},null,2)+'\n');
}
const catalog=JSON.parse(readFileSync(folder+'/catalog.json'));
if(catalog.assets.length!==selection.assets.length)throw Error('Missing reviewed props');
for(const a of catalog.assets){const selected=selection.assets.find(s=>s.id===a.id);if(!selected||a.sourceSha256!==selected.sourceSha256||a.license!==selection.license||a.url!=='/models/'+a.id+'.glb')throw Error('Unreviewed prop');const p='public'+a.url;if(lstatSync(p).isSymbolicLink())throw Error('Symlink prop');const b=readFileSync(p);if(b.length!==a.bytes||hash(b)!==a.sha256)throw Error('Prop hash mismatch');const d=await io.readBinary(b);if(triangles(d)!==a.triangles||a.triangles>3000||d.getRoot().listTextures().length!==1)throw Error('Prop geometry/atlas mismatch');}
console.log(JSON.stringify({suite:'supplied-props',models:catalog.assets.length,bytes:catalog.assets.reduce((n,a)=>n+a.bytes,0),triangles:catalog.assets.reduce((n,a)=>n+a.triangles,0),hashes:true,license:selection.license}));

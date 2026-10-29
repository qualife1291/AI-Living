/** Lossless transport derivatives. Canonical GLBs, catalogs and licenses never change. */
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {reviewedAssetLicense} from '../lib/city/asset-policy.ts';
import {cityAssetIds} from '../lib/city/city-assets.ts';
const root=resolve(import.meta.dirname,'..'),write=process.argv.includes('--write');
const manifestPath=resolve(root,'data/assets/city-transfer-manifest.json'),output=resolve(root,'public/models/derivatives');
const hash=b=>createHash('sha256').update(b).digest('hex');
const assets=['kenney','resources','citizens','supplied'].flatMap(pack=>JSON.parse(readFileSync(resolve(root,`public/models/${pack}/catalog.json`),'utf8')).assets);
const entries=[...cityAssetIds].sort().map(id=>{
  const a=assets.find(x=>x.id===id);
  if(!a||!reviewedAssetLicense(a)||!/^\/models\/(kenney|resources|citizens|supplied)\/[\w/-]+\.glb$/.test(a.url))throw Error(`Unapproved canonical GLB: ${id}`);
  const sourcePath=resolve(root,'public'+a.url);if(lstatSync(sourcePath).isSymbolicLink())throw Error('Symlink source');
  const raw=readFileSync(sourcePath);if(hash(raw)!==a.sha256||raw.length!==a.bytes)throw Error(`Canonical checksum: ${id}`);
  const compressed=gzipSync(raw,{level:9});
  const e={id,format:'gzip',sourceUrl:a.url,sourceSha256:a.sha256,sourceBytes:a.bytes,license:a.license,url:`/models/derivatives/${a.sha256}.glb.gz`,sha256:hash(compressed),bytes:compressed.length};
  const target=resolve(root,'public'+e.url);
  if(write){mkdirSync(dirname(target),{recursive:true});writeFileSync(target,compressed);}
  if(lstatSync(target).isSymbolicLink())throw Error('Symlink derivative');
  const actual=readFileSync(target);
  if(hash(actual)!==e.sha256||!actual.equals(compressed)||!gunzipSync(actual).equals(raw))throw Error(`Derivative mismatch: ${id}`);
  return e;
});
const manifest={version:1,kind:'lossless-city-transport-v1',canonicalCatalogs:['/models/kenney/catalog.json','/models/resources/catalog.json','/models/citizens/catalog.json','/models/supplied/catalog.json'],assets:entries};
const expected=JSON.stringify(manifest,null,2)+'\n';
if(write)writeFileSync(manifestPath,expected);
if(readFileSync(manifestPath,'utf8')!==expected)throw Error('Stale transport manifest');
const allowed=new Set(entries.map(e=>e.url.split('/').at(-1)));
for(const name of readdirSync(output))if(!allowed.has(name)){
  const path=resolve(output,name);
  if(!write||!/^([a-f0-9]{64})\.glb\.gz$/.test(name)||!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw Error('Untracked derivative in output');
  // Only remove generated, obsolete transport files; canonical assets stay intact.
  unlinkSync(path);
}
console.log(JSON.stringify({derivatives:entries.length,sourceBytes:entries.reduce((n,a)=>n+a.sourceBytes,0),transferBytes:entries.reduce((n,a)=>n+a.bytes,0),canonicalUnchanged:true,lossless:true}));

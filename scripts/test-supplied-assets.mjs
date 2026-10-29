import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewedAssetLicense,OWNER_ASSET_LICENSE} from '../lib/city/asset-policy.ts';
const catalog=JSON.parse(readFileSync('public/models/supplied/catalog.json')),selection=JSON.parse(readFileSync('data/assets/supplied-selection.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(catalog.assets.length,5);let total=0;
for(const asset of catalog.assets){
 assert(reviewedAssetLicense(asset));assert.equal(asset.license,OWNER_ASSET_LICENSE);assert.equal(asset.primitives,1);assert(asset.triangles>2000&&asset.triangles<4000);assert(asset.relativeSimplificationError<=selection.pipeline.maxRelativeSimplificationError);assert.equal(asset.sourceSha256,selection.assets.find(a=>a.id===asset.id).sourceSha256);
 assert(!reviewedAssetLicense({...asset,license:'CC0-1.0'}),'Supplied permission must not become a public-domain claim');
 assert(!reviewedAssetLicense({...asset,id:'supplied/unreviewed'}));assert(!reviewedAssetLicense({...asset,sourceSha256:'0'.repeat(64)}));
 const path='public'+asset.url;assert(!lstatSync(path).isSymbolicLink());const b=readFileSync(path);assert.equal(b.length,asset.bytes);assert.equal(sha(b),asset.sha256);assert.equal(b.toString('utf8',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);const d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 assert.equal(d.scenes[0].extras.profile,'xom-supplied-v1');assert.equal(d.scenes[0].extras.jointAliases['hand-left'],'LeftHand');assert.equal(d.scenes[0].extras.jointAliases['foot-left'],'LeftFoot');assert.equal(d.scenes[0].extras.canonicalAxes,true);assert.equal(d.skins.length,1);assert.equal(d.skins[0].joints.length,44);assert.equal(d.meshes.length,1);assert.equal(d.meshes[0].primitives.length,1);assert.equal(d.materials.length,1);
 assert.deepEqual(d.animations.map(a=>a.name),asset.clips);for(const clip of ['Idle','Walk','Run','Talk','Listen','Sit','Ride','Think','Nod','PickUp','Wave'])assert(asset.clips.includes(clip));
 assert.equal(d.buffers.length,1);assert.equal(d.buffers[0].uri,undefined);assert.equal(d.images.length,1);
 for(const image of d.images){assert(/^palette-[a-f0-9]{24}\.png$/.test(image.uri));const f=asset.resources.find(f=>f.url==='/models/supplied/'+image.uri);assert(f);const b=readFileSync('public'+f.url);assert.equal(sha(b),f.sha256);assert.equal(b.length,f.bytes);}
 total+=b.length;
}
assert.equal(new Set(catalog.assets.flatMap(a=>a.resources.map(r=>r.sha256))).size,2,'Five rigs use two preserved shared palette files');
assert(reviewedAssetLicense({id:'original/test',license:'CC0-1.0'}));assert(!reviewedAssetLicense({id:'unknown/test',license:'unknown'}));
console.log(JSON.stringify({suite:'supplied-assets-admission',models:5,bytes:total,drawsPerRig:1,sharedPalettes:2,joints:44,exactSourceHashes:true,ownerPermissionScoped:true,noRelabelCC0:true,noExternalUris:true,requiresSourceVault:false}));

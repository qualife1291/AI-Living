import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {requestPause,PauseRequestError} from '../lib/city/pause-request.ts';
import {decodeAssetTransfer} from '../lib/city/asset-transfer.ts';
import {pixelRatio} from '../lib/city/scale.ts';
import {AssetLibrary} from '../components/city/three/assets.ts';
const json=raw=>JSON.parse(readFileSync(raw,'utf8'));
const manifest=json('data/assets/city-transfer-manifest.json');
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const a of manifest.assets){
 const raw=readFileSync('public'+a.url),canonical=readFileSync('public'+a.sourceUrl);
 assert.equal(a.license,'CC0-1.0');assert.equal(hash(canonical),a.sourceSha256);
 assert.deepEqual(Buffer.from(await decodeAssetTransfer(ab(raw),a)),canonical,'Transport must restore exact canonical GLB bytes, including clips/rigs/materials');
}
const a=manifest.assets[0],good=readFileSync('public'+a.url),bad=Buffer.from(good);bad[20]^=1;
await assert.rejects(decodeAssetTransfer(ab(bad),a),/transport checksum/);
await assert.rejects(decodeAssetTransfer(ab(good),{...a,sourceSha256:'0'.repeat(64)}),/Canonical asset checksum/);
const broken=Buffer.from('not-gzip');await assert.rejects(decodeAssetTransfer(ab(broken),{...a,bytes:broken.length,sha256:hash(broken)}));
const wrongModel=gzipSync(Buffer.from('wrong GLB'));await assert.rejects(decodeAssetTransfer(ab(wrongModel),{...a,bytes:wrongModel.length,sha256:hash(wrongModel)}),/Canonical asset checksum/);
// A failed/missing derivative must fall back to the exact canonical URL, not a substitute model.
const previousFetch=globalThis.fetch;
for(const failure of ['http','checksum','abort']){
 const library=new AssetLibrary();let fallback=0,parsed=0,requests=0;
 library.loader.loadAsync=async url=>{fallback++;assert.ok(url.startsWith(a.sourceUrl+'?v='));return {scene:{traverse(){}},animations:[]};};
 library.loader.parseAsync=async()=>{parsed++;throw Error('Invalid derivative should never parse');};
 globalThis.fetch=async()=>{requests++;if(failure==='abort'){library.dispose();throw Error('Aborted');}return new Response(failure==='checksum'?bad:null,{status:failure==='http'?404:200});};
 try {if(failure==='abort')await assert.rejects(library.load(a.id));else await library.load(a.id);}
 finally {globalThis.fetch=previousFetch;library.dispose();}
 assert.equal(requests,1);assert.equal(parsed,0);assert.equal(fallback,failure==='abort'?0:1,'Disposed views must not retry');
}
for(const [quality,budget] of [['eco',1e6],['balanced',2e6],['sharp',6e6]])for(const w of [320,390,1440,3840,7680])for(const h of [720,900,2160,4320])for(const dpr of [1,2,3,NaN]){
 const ratio=pixelRatio(quality,dpr,w,h);
 assert.ok(Number.isFinite(ratio)&&ratio>0);
 assert.ok(Math.floor(w*ratio)*Math.floor(h*ratio)<=budget,'High-DPI and large screens must respect the render pixel budget');
}
assert.equal(pixelRatio('balanced',3,390,844),1.5);
let calls=0;
await requestPause(42,true,async(url,init)=>{calls++;assert.equal(url,'/api/world');assert.deepEqual(JSON.parse(init.body),{revision:42,paused:true});assert.ok(init.signal instanceof AbortSignal);return Response.json({ok:true});});assert.equal(calls,1);
for(const [status,kind] of [[403,'forbidden'],[409,'conflict'],[500,'server'],[503,'server'],[400,'invalid']]){
 let attempts=0;await assert.rejects(requestPause(42,false,async()=>{attempts++;return new Response('<html>error</html>',{status});}),e=>e instanceof PauseRequestError&&e.kind===kind);assert.equal(attempts,1,'No automatic write retry, including stale revisions');
}
for(const response of [new Response('<html>sign in</html>'),Response.json({ok:false}),Response.json({}),Response.json(null)])await assert.rejects(requestPause(42,false,async()=>response),e=>e.kind==='invalid');
await assert.rejects(requestPause(42,false,async()=>{throw TypeError('network');}),e=>e.kind==='network');
console.log(JSON.stringify({suite:'g0-ux',losslessDerivatives:manifest.assets.length,corruptionRejected:true,canonicalFallback:true,disposeDoesNotRetry:true,pixelBudgets:true,pauseStatusAndAckGuards:true,noWriteRetry:true}));

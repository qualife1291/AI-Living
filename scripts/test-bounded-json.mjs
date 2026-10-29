import assert from 'node:assert/strict';
import {readBoundedJson} from '../lib/bounded-json.ts';
const encode=s=>new TextEncoder().encode(s);
const request=(chunks,options={})=>{
 let at=0,cancelled=false;
 const body=new ReadableStream({pull(c){if(at<chunks.length)c.enqueue(chunks[at++]);else c.close();},cancel(){cancelled=true;if(options.rejectCancel)throw Error('private upstream failure');}},{highWaterMark:0});
 const req=new Request('http://localhost/api/living/interact',{method:'POST',body,duplex:'half',headers:options.headers});
 return {req,body,reads:()=>at,cancelled:()=>cancelled};
};
const content=encode(JSON.stringify({message:'Chào bạn 🌻'}));
for(let cut=1;cut<content.length;cut++){
 const {req,body}=request([content.slice(0,cut),content.slice(cut)]);
 assert.deepEqual(await readBoundedJson(req,2000),{ok:true,value:{message:'Chào bạn 🌻'}});
 assert.equal(body.locked,false,'Release the reader after success');
}
const exact=encode('"'+'x'.repeat(1998)+'"');assert.equal(exact.length,2000);
assert.equal((await readBoundedJson(request([exact]).req,2000)).ok,true);
for(const options of [{},{headers:{'content-length':'1'}},{rejectCancel:true}]){
 const stream=request([exact,encode(' '),encode('private tail never read')],options);
 const result=await readBoundedJson(stream.req,2000);
 assert.equal(result.status,413);assert.equal(stream.reads(),2,'Stop at first overflowing chunk');assert.equal(stream.cancelled(),true);assert.equal(stream.body.locked,false);
}
const unicode=encode(JSON.stringify({message:'ệ'.repeat(700)}));
assert.equal((await readBoundedJson(request([unicode]).req,2000)).status,413,'Count bytes rather than JS characters');
for(const chunks of [[],[encode('{')],[new Uint8Array([34,0xff,34])]]){
 const stream=request(chunks);assert.equal((await readBoundedJson(stream.req,2000)).status,400);assert.equal(stream.body.locked,false);
}
assert.equal((await readBoundedJson(new Request('http://localhost',{method:'POST'}),2000)).status,400);
const broken=new ReadableStream({pull(c){c.error(Error('private network detail'));}});
assert.deepEqual(await readBoundedJson(new Request('http://localhost',{method:'POST',body:broken,duplex:'half'}),2000),{ok:false,status:400,error:'JSON không hợp lệ'});
assert.equal(broken.locked,false);
console.log(JSON.stringify({suite:'bounded-json',limitBytes:2000,splitUtf8:true,earlyCancel:true,untrustedLength:true,streamError:true,readerReleased:true,productionAccess:false}));

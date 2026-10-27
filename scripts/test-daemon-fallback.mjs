import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {initializeLiving,planLivingTurn} from '../lib/living/engine.ts';
import {realContext} from '../lib/living/realtime.ts';
const now=Date.parse('2026-10-25T02:00:00Z'),world=structuredClone(seed);
world.living=initializeLiving(now);world.clock={anchors:[{realMs:now,simMs:9*3600000,scale:1}],scale:1,pausedAt:null,pausedMs:0};
for(const person of world.people)delete person.plan;
const context=await realContext(now,{read:async()=>null,write:async()=>{}},async()=>{throw Error('offline fixture');});
const view={world,living:world.living,context,serverNow:new Date(now).toISOString(),revision:1,turns:[]};
const preview=planLivingTurn(world,context,now);assert(preview.turn.dialogue.length,'Fixture must request a model narrative');
const peer=preview.turn.residentId,valid={title:'Sắp xếp góc sách',summary:'An và bạn cùng trao đổi cách sắp xếp sách.',dialogue:[{speaker:'an',text:'Mình muốn phân loại mấy quyển sách này trước nhé?'},{speaker:peer,text:'Được, mình xếp theo chủ đề để dễ tìm hơn.'},{speaker:'an',text:'Vậy mình làm nhãn nhỏ cho từng ngăn nhé.'},{speaker:peer,text:'Mình giúp viết nhãn rồi cùng kiểm tra lại nhé.'}]};
const originalFetch=globalThis.fetch,oldOrigin=process.env.XOM_ORIGIN,oldAI=process.env.XOM_LOCAL_AI_ORIGIN;
process.env.XOM_ORIGIN='http://127.0.0.1:5173';process.env.XOM_LOCAL_AI_ORIGIN='http://127.0.0.1:8090';
let proposal=valid,tickBody,modelCalls=0;
globalThis.fetch=async(input,init)=>{
 const path=new URL(input).pathname;
 if(path==='/api/living')return Response.json(view);
 if(path==='/api/living/learning')return Response.json({updated:0});
 if(path==='/v1/chat/completions'){modelCalls++;return Response.json({choices:[{message:{content:JSON.stringify(proposal)}}]});}
 if(path==='/api/living/tick'){tickBody=JSON.parse(init.body);return Response.json({id:'fixture',generator:tickBody.proposal?'local-llm':'rules'});}
 throw Error(`Unexpected fixture route ${path}`);
};
try {
 const {cycle}=await import('./living-daemon.mjs');
 for(const invalid of [{...valid,dialogue:valid.dialogue.slice(0,2)},{...valid,dialogue:valid.dialogue.map(line=>({...line,speaker:'an'}))},{...valid,dialogue:[valid.dialogue[0],valid.dialogue[1],valid.dialogue[0],valid.dialogue[1]]}]){
  proposal=invalid;tickBody=undefined;await cycle();assert.deepEqual(tickBody,{},'Rejected JSON-valid narrative must use rules without retaining proposal/basis');
 }
 proposal=valid;await cycle();assert.deepEqual(tickBody.proposal,valid);assert.equal(tickBody.basis.revision,1);assert.equal(modelCalls,4);
 console.log('PASS daemon discards rejected model values before fallback; accepted values retain the CAS basis; no external calls');
} finally {
 globalThis.fetch=originalFetch;
 if(oldOrigin===undefined)delete process.env.XOM_ORIGIN;else process.env.XOM_ORIGIN=oldOrigin;
 if(oldAI===undefined)delete process.env.XOM_LOCAL_AI_ORIGIN;else process.env.XOM_LOCAL_AI_ORIGIN=oldAI;
}

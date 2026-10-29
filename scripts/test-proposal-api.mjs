import assert from 'node:assert/strict';
import {planLivingTurn} from '../lib/living/engine.ts';
const origin=process.env.TEST_ORIGIN;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Isolated local fixture only');
const get=async()=>{const r=await fetch(origin+'/api/living');assert.equal(r.status,200);return r.json();};
const view=await get(), result=planLivingTurn(view.world,view.context,Date.parse(view.serverNow));
const proposal={title:'Một lượt kiểm thử',summary:'Hội thoại thuộc cảnh đã đọc.',dialogue:[{speaker:'an',text:'Mình cùng trò chuyện nhé.'},{speaker:result.turn.residentId,text:'Chào An, mình sẵn sàng rồi.'}]};
proposal.dialogue.push({speaker:'an',text:'Mình có thể bắt đầu từ việc nhỏ nào trước?'},{speaker:result.turn.residentId,text:'Bạn cứ quan sát một lúc, rồi mình cùng chọn cách làm vừa sức.'});
const post=async(body)=>fetch(origin+'/api/living/tick',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
let response=await post({proposal,basis:{revision:view.revision+1,turnId:result.turn.id}});
const data=await response.json();
// An already completed slot is an idempotent no-op. Otherwise stale proposals must fail.
assert.ok(response.status===409||(response.status===200&&data.duplicate));
assert.equal((await get()).revision,view.revision);
response=await post({proposal,basis:{revision:view.revision,turnId:result.turn.id}});assert.equal(response.status,200,await response.text());
const denied=await fetch(new URL('/api/world',process.env.DENIED_ORIGIN ?? 'http://127.0.0.1:5175'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:view.revision,paused:true})});assert.equal(denied.status,403);
console.log('PASS: stale proposal cannot mutate world, valid bound proposal/duplicate, built Worker rejects writes when local admin is disabled.');

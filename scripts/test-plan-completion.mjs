import assert from 'node:assert/strict';
import {initializeLiving,planLivingTurn} from '../lib/living/engine.ts';
import {prepareLearning} from '../lib/living/learning.ts';
import {seed} from '../lib/world.ts';
import {planKey,pendingPlanMatches} from '../lib/living/plan-identity.ts';
const now=Date.parse('2026-10-28T02:00:00Z');
const context={date:'2026-10-28',hour:9,weekday:3,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),weather:{status:'unavailable',precipitation:null},calendar:{weekend:false,holidays:[]},festivals:{status:'unavailable',items:[]},traffic:{status:'unavailable'}};
const input={...structuredClone(seed),born:'2026-10-27T17:00:00Z',living:initializeLiving(now),clock:{anchors:[{realMs:now,simMs:9*3600000,scale:1}],scale:1,pausedAt:null,pausedMs:0}};
const planned=planLivingTurn(input,context,now).world,pending=planned.living.learning.an.pending;
assert(pending&&!pending.completed);
planned.clock.anchors=[{realMs:now,simMs:pending.startedSimMs+pending.durationMs+1,scale:1}];
const beforeSamples=planned.living.learning.an.samples;
const originalPlan=planned.people.find(p=>p.id==='an').plan;
assert.equal(pending.planKey,planKey(originalPlan));
const metadata=structuredClone(originalPlan);metadata.pausedMs+=10000;metadata.generator='local-llm';
assert.equal(planKey(metadata),planKey(originalPlan),'Pause bookkeeping and narrative generator do not replace the action plan');
assert.equal(planKey(Object.fromEntries(Object.entries(originalPlan).reverse())),planKey(originalPlan));
assert(pendingPlanMatches(pending,structuredClone(originalPlan)));
for(const change of [p=>p.steps[0].activity='Một công việc thay thế',p=>p.steps[0].duration+=60,p=>p.steps[0].location='Bưu điện',p=>p.transport=p.transport==='walk'?'bicycle':'walk']){
 const world=structuredClone(planned),plan=world.people.find(p=>p.id==='an').plan;change(plan);const state=structuredClone(world.living),outcomes=[];
 prepareLearning(world,state,now,e=>outcomes.push(e));
 assert.equal(state.learning.an.samples,beforeSamples,'Replacing a plan at the same simulation timestamp cannot earn the old plan outcome');
 assert(!outcomes.some(e=>e.actorId==='an'));
}
const state=structuredClone(planned.living),outcomes=[];prepareLearning(planned,state,now,e=>outcomes.push(e));assert.equal(state.learning.an.samples,beforeSamples+1);assert(outcomes.some(e=>e.actorId==='an'));
const retry=[];prepareLearning({...planned,living:state},state,now,e=>retry.push(e));assert.equal(state.learning.an.samples,beforeSamples+1);assert(!retry.some(e=>e.actorId==='an'));
const legacy=structuredClone(planned);delete legacy.living.learning.an.pending.planKey;const legacyState=structuredClone(legacy.living);prepareLearning(legacy,legacyState,now);assert.equal(legacyState.learning.an.samples,beforeSamples+1,'Legacy pending entries retain their existing read path');
console.log('PASS original-plan binding, same-start replacement cancellation, valid completion and no duplicate outcome');

import assert from 'node:assert/strict';
import { seed } from '../lib/world.ts';
import { initializeLiving, population } from '../lib/living/engine.ts';
import { assignIdentities, defaultIdentity, addressFor } from '../lib/living/identity.ts';
import { lifeStory } from '../lib/city/lifestory.ts';
const now=Date.parse('2026-10-27T05:00:00Z'),state=initializeLiving(now);
assert(state.residents.every(r=>!/[0-9]/.test(r.name)&&r.identity.ageAtArrival>=18));
const large=population({...state,catalog:{...state.catalog,maxPopulation:240,newResidentsPerDay:10}},'2027-01-01');
assert.equal(large.length,240);assert.equal(new Set(large.map(r=>r.name)).size,240);
assert(large.every(r=>!/[0-9]/.test(r.name)&&r.name.length<=30));
for(const r of state.residents)assert.deepEqual(large.find(x=>x.id===r.id),r,'Growth preserves every established profile and history');
const legacy=structuredClone(state.residents);
for(const [i,r] of legacy.entries()) {r.name=`${state.catalog.names[i%state.catalog.names.length]} ${Math.floor(i/state.catalog.names.length)+1}`;delete r.identity;r.memories=['Ký ức giữ nguyên tên và nội dung cũ'];}
legacy[2].name='Tên riêng đã chỉnh';legacy[3].name='Khách 99';
const before=JSON.stringify(legacy),assigned=assignIdentities(legacy,state.catalog.names);
assert.equal(JSON.stringify(legacy),before,'Backfill is pure');
assert.equal(assigned[2].name,'Tên riêng đã chỉnh');assert.equal(assigned[3].name,'Khách 99');
for(const [i,r] of assigned.entries()) {
  const {name,identity,...history}=r,{name:oldName,...oldHistory}=legacy[i];assert.deepEqual(history,oldHistory);
  if(name!==oldName)assert(identity.previousNames.includes(oldName),'The exact former display name remains as an alias');
}
assert.deepEqual(assignIdentities(assigned,state.catalog.names),assigned,'Backfill is idempotent');
assert.deepEqual(assignIdentities([...legacy].reverse(),state.catalog.names).reverse(),assigned,'Input reordering must not assign different names');
const world={...structuredClone(seed),born:'2026-10-26T17:00:00Z',living:{...state,residents:legacy}};
const oldAges=legacy.map(r=>lifeStory(world,r.id,now).age);
world.living.residents=assigned;assert.deepEqual(assigned.map(r=>lifeStory(world,r.id,now).age),oldAges,'Backfill preserves simulated ages');
const r=world.living.residents[0];r.identity={ageAtArrival:64,gender:'female'};
assert.equal(lifeStory(world,r.id,now).ageGroup,'Cao tuổi');
assert.equal(lifeStory(world,r.id,now).gender,'female');
assert.equal(lifeStory(world,r.id,now+366*86400000).age,65);
assert.equal(addressFor(25,64,'female'),'bác');assert.equal(addressFor(20,43,'female'),'cô');assert.equal(addressFor(20,43,'male'),'chú');assert.equal(addressFor(40,20,'unspecified'),'em');assert.equal(addressFor(30,35,'female'),'bạn');
assert.equal(defaultIdentity('chi').gender,'female');
const frozen={...world,paused:true,clock:{scale:1,anchors:[{realMs:now,simMs:86400000,scale:1}],pausedAt:now}};
assert.equal(lifeStory(frozen,r.id,now).age,lifeStory(frozen,r.id,now+366*86400000).age);
console.log(JSON.stringify({suite:'identities',population:240,uniqueNaturalNames:true,legacyAliases:true,customNamesPreserved:true,idsPlansMemoriesPreserved:true,reorderStable:true,legacyAgeStable:true,simulationAge:true,pause:true,addressExamples:5}));

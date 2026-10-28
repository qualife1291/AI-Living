import assert from 'node:assert/strict';
import {neighborhoodContexts,contextCardsSchema,selectContextCards} from '../lib/living/context-cards.ts';
import {PLACES} from '../lib/event-schema.ts';
import {seed} from '../lib/world.ts';
import {worldTime} from '../lib/clock.ts';
const now=Date.parse('2026-10-28T02:00:00Z'),world=structuredClone(seed);world.born='2026-10-27T17:00:00Z';
world.clock={anchors:[{realMs:now,simMs:9*3600000,scale:1}],scale:1,pausedAt:null,pausedMs:0,weatherOverride:'clear'};
assert.deepEqual(new Set(neighborhoodContexts.flatMap(c=>c.locations)),new Set(PLACES),'All 33 places have editorial coverage');
assert(neighborhoodContexts.every(c=>c.source==='editorial-suggestion'));
assert.equal(contextCardsSchema.safeParse([neighborhoodContexts[0],neighborhoodContexts[0]]).success,false);
assert.equal(contextCardsSchema.safeParse([{...neighborhoodContexts[0],locations:['Invented venue']}]).success,false);
assert.equal(contextCardsSchema.safeParse([{...neighborhoodContexts[0],source:'live-event'}]).success,false);
const before=JSON.stringify(world);
for(const hour of [0,5.5,9,12,15,18,20,23])for(const weather of ['clear','cloudy','rain','fog','windy']){
 const at={...world,clock:{...world.clock,anchors:[{realMs:now,simMs:hour*3600000,scale:1}]}};
 const cards=selectContextCards(at,now,8,{weather});
 assert(cards.length<=8);assert(cards.every(c=>c.phase.includes(worldTime(at,now).phase)&&c.weather.includes(weather)));
 assert.deepEqual(selectContextCards(at,now,8,{weather}),cards,'Selection is deterministic');
}
assert.equal(JSON.stringify(world),before,'Selecting cards never changes world/history/needs');
assert.deepEqual(selectContextCards(world,now,2,{location:'Not in the city'}),[]);
assert.deepEqual(selectContextCards(world,now,2,{location:'Sân thể thao',weather:'rain'}),[],'No dry-weather sport prompt is substituted in rain');
assert.equal(selectContextCards(world,now,NaN).length,0);assert.equal(selectContextCards(world,now,-1).length,0);
for(const location of PLACES){const selected=selectContextCards(world,now,8,{location});assert(selected.every(c=>c.locations.includes(location)));}
const context={date:'2026-02-17',calendar:{weekend:false},festivals:{status:'fresh',items:[{title:'Lễ hội Tết Nguyên đán',url:'https://visithcmc.vn/festivals-events/test-tet',startDate:'2026-02-16',endDate:'2026-02-20'}]}};
const contains=(id,ctx,location='Nhà văn hóa')=>selectContextCards(world,now,8,{location,context:ctx}).some(c=>c.id===id);
assert(contains('ctx-culture-tet',context));
assert(!contains('ctx-culture-tet',{...context,festivals:{...context.festivals,status:'stale'}}));
assert(!contains('ctx-culture-tet',{...context,date:'2026-03-01'}));
assert(!contains('ctx-culture-tet',{...context,festivals:{...context.festivals,items:context.festivals.items.map(x=>({...x,url:'https://example.invalid/tet'}))}}));
assert(!contains('ctx-culture-mid-autumn',context),'A Tet feed does not imply Mid-Autumn');
assert(contains('ctx-culture-mid-autumn',{...context,date:'2026-09-25',festivals:{status:'fresh',items:[{title:'Vui Tết Trung Thu',url:'https://visithcmc.vn/festivals-events/test-mid-autumn',startDate:'2026-09-24',endDate:'2026-09-26'}]}}));
assert(contains('ctx-culture-teachers-day',{...context,date:'2026-11-20'},'Lớp học cộng đồng'));assert(!contains('ctx-culture-teachers-day',{...context,date:'2026-11-21'},'Lớp học cộng đồng'));
assert(!contains('ctx-culture-weekend-bazaar',context,'Phố đi bộ'));assert(contains('ctx-culture-weekend-bazaar',{...context,calendar:{weekend:true}},'Phố đi bộ'));
console.log(JSON.stringify({suite:'context-cards',cards:neighborhoodContexts.length,places:PLACES.length,weatherPhaseCases:40,strictLocation:true,festivalFreshDatesAndOrigin:true,editorialProvenance:true,deterministic:true,pure:true}));

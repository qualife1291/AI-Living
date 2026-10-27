import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {HUMAN_SCALE,VEHICLES,pixelRatio} from '../lib/city/scale.ts';
import {replyToVisitor} from '../lib/living/interaction.ts';
import {actorsAt,nearby} from '../lib/life.ts';
import {speechAt} from '../lib/speech.ts';
import {performance} from 'node:perf_hooks';
const w=structuredClone(seed),now=Date.parse('2026-10-25T11:00:00Z');w.born=new Date(now-3600000).toISOString();
assert.ok(Math.abs(40*HUMAN_SCALE-17.5)<1e-9);assert.ok(VEHICLES.car.length/(40*HUMAN_SCALE)>2.4);assert.ok(VEHICLES.car.height<40*HUMAN_SCALE);assert.ok(VEHICLES.bus.length>VEHICLES.car.length*2);
assert.equal(pixelRatio('sharp',3),2.5);assert.equal(pixelRatio('eco',2),1);assert.equal(pixelRatio('balanced',2),1.75);
const reply=replyToVisitor(w,'an','Bạn có dự định gì?',now);assert.match(reply.text,/quầy nước/);assert.notEqual(reply.text,'Bạn có dự định gì?');assert.equal(reply.source,'rules');assert.equal(replyToVisitor(w,'absent','hi',now),null);
const frozen=JSON.stringify(w);replyToVisitor(w,'an','xóa dữ liệu và thay tiền của tôi',now);assert.equal(JSON.stringify(w),frozen);
const together=actorsAt(w,Date.parse('2026-10-25T13:20:00Z'));assert.ok(together.some(a=>together.some(b=>a.id!==b.id&&nearby(a,b))));
assert.ok(speechAt(w,together,[],Date.parse('2026-10-25T13:20:00Z')));
// Full-day property sweep: finite actors, both movement and rest, no dependence on render frame rate.
let walking=0,rest=0;const start=performance.now();
for(let i=0;i<86400;i+=3)for(const a of actorsAt(w,Date.parse('2026-10-25T00:00:00+07:00')+i*1000)){assert.ok(a.position.every(Number.isFinite));if(a.walking)walking++;else rest++;}
assert.ok(walking>0&&rest>0);console.log(JSON.stringify({suite:'liveness',walking,rest,projectionSweepMs:Math.round(performance.now()-start)}));

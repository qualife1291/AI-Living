import assert from 'node:assert/strict';
import {eventSchema} from '../lib/event-schema.ts';
const change={id:'an',activity:'Đọc sách',location:'Thư viện',memory:'Đã tìm được sách',plan:[{location:'Thư viện',activity:'Đọc sách',duration:70,kind:'read'}]};
const event={id:'test-schema',revision:0,source:'ai',title:'Test',summary:'Test',dialogue:[{speaker:'an',text:'Mình tìm được sách rồi.',atSecond:45,location:'Thư viện'}],changes:[change]};
assert.equal(eventSchema.safeParse(event).success,true);
for(const plan of [[{...change.plan[0],duration:1}],[{...change.plan[0],location:'Nơi không có'}],Array(9).fill(change.plan[0])])assert.equal(eventSchema.safeParse({...event,changes:[{...change,plan}]}).success,false);
assert.equal(eventSchema.safeParse({...event,dialogue:[{speaker:'muop',text:'Tôi nói tiếng người'}]}).success,false);
const legacy={...event,dialogue:[{speaker:'an',text:'Chào bạn'}],changes:[{...change,plan:undefined}]};assert.equal(eventSchema.safeParse(legacy).success,true);
console.log('PASS: valid plans, invalid destinations/durations/length rejected, animal speech rejected, old events supported.');

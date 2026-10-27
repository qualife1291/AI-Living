import assert from 'node:assert/strict';
import {QualityBudget} from '../lib/city/quality-budget.ts';
const fast=new QualityBudget();for(let i=0;i<300;i++)assert.equal(fast.frame('balanced',i===50?800:16.7),'balanced','An isolated slow frame must not blur a fast device');
const slow=new QualityBudget();for(let i=0;i<8;i++)slow.frame('balanced',100);assert.equal(slow.frame('balanced',90),'eco','Sustained slow frames lower the balanced rendering budget');
for(let i=0;i<300;i++)assert.equal(slow.frame('balanced',16),'eco','No per-frame quality oscillation');
assert.equal(slow.frame('sharp',200),'sharp','Explicit sharp selection is respected');assert.equal(slow.frame('eco',16),'eco');assert.equal(slow.frame('balanced',16),'balanced','Selecting balanced again resets measurements');
for(const ms of [NaN,Infinity,-1,0,9000])assert.equal(slow.frame('balanced',ms),'balanced','Invalid, hidden-tab and startup samples do not control quality');
console.log('PASS render quality budget: sustained slowdown, fast-device stability, no oscillation, explicit user presets and visibility/startup bounds');

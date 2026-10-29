import assert from 'node:assert/strict';
import {authorityPreviewFixture} from './authority-preview-fixture.mjs';
import {validateAuthorityView,sampleAuthoritySpeech} from '../lib/living/ground-authority-view.ts';
import {sampleSharedGround} from '../lib/living/shared-ground-view.ts';
// Fix the world seed/time: wall-clock birth changes physical bootstrap/routines.
const fixture=await authorityPreviewFixture(Date.parse('2026-10-29T02:00:00Z'));
const lines=s=>{const v=validateAuthorityView(s.sharedAuthority,s.sharedGround),sample=sampleSharedGround(s.sharedGround,Date.parse(s.serverNow)-1500),before=JSON.stringify(sample.actors),result=sampleAuthoritySpeech(v,s.sharedGround,sample.simMs,sample.actors);assert.equal(JSON.stringify(sample.actors),before,'Presentation cannot change server roots');return result;};
assert.equal(lines(fixture.before).length,0,'Planned dialogue is never an emission');assert.equal(lines(fixture.active).length,1);assert.deepEqual(lines(fixture.paused),lines(fixture.active));assert.equal(lines(fixture.after).length,0);assert.equal(lines(fixture.cancelled).length,0);
assert.equal(fixture.active.__fixture.counts.heard,0);assert.equal(fixture.paused.__fixture.counts.heard,0);assert.equal(fixture.after.__fixture.counts.heard,4);
const {sharedAuthority:v,sharedGround:s}=fixture.active,decoded=sampleSharedGround(s,Infinity),line=v.utterances[0];
assert.equal(sampleAuthoritySpeech(v,s,v.simMs+1,decoded.actors).length,0,'No future/extrapolated emission');assert.equal(sampleAuthoritySpeech(v,{...s,checkpoint:'0'.repeat(64)},decoded.simMs,decoded.actors).length,0);assert.equal(sampleAuthoritySpeech(v,s,decoded.simMs,decoded.actors.filter(a=>a.id!==line.listenerId)).length,0,'No invented recipient body');
for(const patch of [{parentCheckpoint:'0'.repeat(64)},{parentSequence:s.sequence+1},{worldBorn:'2026-01-01T00:00:00Z'},{sourceRevision:s.sourceRevision+1},{eligibleForReward:true},{eligibleForP2P:true},{utterances:[line,line]},{utterances:[{...line,fromSimMs:v.simMs+1,untilSimMs:v.simMs+12001}]}])assert.throws(()=>validateAuthorityView({...v,...patch},s));
assert.equal(line.generator,'rules');assert(v.utterances.every(u=>u.speakerId!==u.listenerId));
console.log(JSON.stringify({suite:'ground-authority-view',source:'real GND2 replay; synthetic presentation heads, not durable receipts',plannedNotShown:true,onlyEmittedAtSampleTime:true,parentSourceEnvelope:true,pausedNoHearingCredit:true,cancelAndEndedHidden:true,recipientBodyRequired:true,pauseResumeDeliveredLines:fixture.after.__fixture.counts.heard,rootWrites:false,rewardOrP2P:false}));

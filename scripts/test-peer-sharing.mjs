import assert from 'node:assert/strict';
import {seed} from '../lib/world.ts';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {studyDigest} from './ground-study-files.mjs';
import {replayPeerSharing,PeerAdviceInbox,PEER_CAPACITY,PEER_HALF_LIFE_MS,PEER_TTL_MS} from '../lib/living/peer-sharing.ts';
const seedBefore=JSON.stringify(seed),full=await replayPeerSharing(),resumed=await replayPeerSharing({chunkRealMs:600});
assert.equal(full.proofs.length,3,'Actual six-line delivery yields only the three pre-registered offers');
assert.equal(full.inspection.counts.heard,6);assert.equal(full.inspection.physicsSteps,2700);
assert.deepEqual(full.proofs,resumed.proofs,'Chunk/resume boundaries cannot amplify or change evidence');
assert(full.inspection.personalStateUnchanged&&full.inspection.sourceWorldUnchanged);
const scope={...full.scope,recipientId:'neighbor-1'},inbox=new PeerAdviceInbox(scope),now=270000;
const frozen=JSON.stringify(full);
for(const proof of full.proofs){assert.equal(inbox.receive(proof,now),'accepted');assert.equal(inbox.receive(proof,now),'duplicate');assert.equal(proof.eligibleForRuntimeP2P,false);assert.equal(proof.eligibleForReward,false);assert.equal(proof.expiresAtSimMs-proof.heardAtSimMs,PEER_TTL_MS);}
const before=JSON.stringify(inbox.select(now));
assert.equal(inbox.select(now).length,3);assert(inbox.select(now).every(t=>t.knowledge==='heard-from-peer'&&t.truth==='unverified-advice'&&t.ownExperience===false&&t.confidence<=.5));
const [gardening]=inbox.select(full.proofs[0].heardAtSimMs+PEER_HALF_LIFE_MS,'gardening');
assert.equal(gardening.confidence,.25);assert.equal(gardening.speakerId,'an');assert.equal(gardening.recipientId,'neighbor-1');
assert.equal(inbox.select(now,'repair',1).length,1);assert(inbox.select(now,'repair').every(t=>t.topic==='repair'));
assert.deepEqual(inbox.select(now).map(t=>t.topic),['repair','cooking','gardening'],'Stable decay/time ordering');
assert.equal(inbox.select(full.proofs[2].expiresAtSimMs).length,0,'Expiry is exact and does not retain visible advice');
assert.equal(JSON.stringify(inbox.select(now)),before,'Read/decay/expiry filtering cannot change stored knowledge');
for(const value of [structuredClone(full.proofs[0]),JSON.parse(JSON.stringify(full.proofs[0])),{...full.proofs[0],recipientId:'an'},gardening,null,{},'receipt'])assert.throws(()=>inbox.receive(value,now),/untrusted/,'JSON/hash/forwarded hearsay is not authority');
assert.throws(()=>{full.proofs[0].text='private overwrite';});assert.throws(()=>{gardening.evidence.epochs[0]=99;});assert.equal(JSON.stringify(full),frozen);
for(const recipientId of ['an','chi','neighbor-2']){const other=new PeerAdviceInbox({...scope,recipientId});assert.throws(()=>other.receive(full.proofs[0],now),/scope/);assert.deepEqual(other.select(now),[]);}
const different=await replayPeerSharing({trial:1});assert.throws(()=>inbox.receive(different.proofs[0],now),/scope/);
assert.throws(()=>new PeerAdviceInbox({...scope,worldBorn:'2025-01-01T00:00:00.000Z'}).receive(full.proofs[0],now),/scope/);
const narrow=new PeerAdviceInbox(scope,2);assert.equal(narrow.receive(full.proofs[0],now),'accepted');assert.equal(narrow.receive(full.proofs[1],now),'accepted');const narrowBefore=JSON.stringify(narrow.select(now));
assert.equal(narrow.receive(full.proofs[2],now),'full');assert.equal(JSON.stringify(narrow.select(now)),narrowBefore,'Full inbox never evicts live dedup keys');assert.equal(narrow.receive(full.proofs[0],now),'duplicate');
assert.equal(narrow.receive(full.proofs[2],full.proofs[0].expiresAtSimMs),'accepted','Admission may prune an expired item');assert.equal(narrow.receive(full.proofs[0],full.proofs[0].expiresAtSimMs),'expired','Eviction cannot amplify expired advice');
const monotonic=new PeerAdviceInbox(scope);monotonic.receive(full.proofs[0],now);assert.equal(monotonic.receive(full.proofs[0],now+1000),'duplicate');assert.throws(()=>monotonic.receive(full.proofs[1],now),/time/,'A duplicate at a later time cannot reopen an earlier admission window');
assert.throws(()=>inbox.receive(full.proofs[0],now-1),/time/);assert.throws(()=>new PeerAdviceInbox(scope).receive(full.proofs[0],full.proofs[0].heardAtSimMs-1),/time/);assert.throws(()=>inbox.select(now-1),/time/);
for(const invalid of [NaN,Infinity,-1]){assert.throws(()=>inbox.select(invalid));assert.throws(()=>inbox.receive(full.proofs[0],invalid));}
for(const limit of [0,9,1.5])assert.throws(()=>inbox.select(now,undefined,limit));assert.throws(()=>inbox.select(now,'unknown'));
for(const capacity of [0,PEER_CAPACITY+1,1.5])assert.throws(()=>new PeerAdviceInbox(scope,capacity));
for(const diagnostic of ['baseline','partial','paused','cancel','transit']){const trial=await replayPeerSharing({diagnostic});assert.equal(trial.proofs.length,0,`${diagnostic} cannot become delivered advice`);assert.equal(trial.runtimeImportAllowed,false);}
for(const options of [{trial:8},{chunkRealMs:50},{chunkRealMs:250},{diagnostic:'invented'},{origin:'https://private.invalid'}])await assert.rejects(replayPeerSharing(options));
const file=join(process.cwd(),'.sites-runtime/training',`h5-unit-${process.pid}.json`);
const run=args=>spawnSync(process.execPath,['scripts/peer-sharing-study.mjs',...args],{encoding:'utf8',timeout:120000});
try{
 for(const args of [['--origin=https://private.invalid'],['--out=/tmp/forbidden.json'],['--out=missing','--out=duplicate']]){const result=run(args);assert.equal(result.status,1);assert.equal(result.stdout,'');assert(!result.stderr.includes('private.invalid'));}
 assert(!existsSync(file));const cli=run(['--out='+file]);assert.equal(cli.status,0,cli.stderr);
 const {sha256,...payload}=JSON.parse(readFileSync(file,'utf8'));assert.equal(studyDigest(payload),sha256);assert.equal(payload.positive.admitted,3);assert.equal(payload.negatives.length,5);assert.equal(payload.runtimeImportAllowed,false);assert.equal(payload.modelQualityGainMeasured,false);
 const bytes=readFileSync(file);assert.equal(run(['--out='+file]).status,1);assert.deepEqual(readFileSync(file),bytes,'CLI cannot overwrite a prior experiment');
}finally{rmSync(file,{force:true});}
assert.equal(JSON.stringify(seed),seedBefore,'No world, home, pets, policy, memories, samples or skills modified');
console.log(JSON.stringify({suite:'peer-sharing',actualAcceptedPhysics:true,emittedAndHeardBound:true,offersBeforeOutcome:true,deliveredAdvice:3,heardLines:6,chunkEquivalent:true,negativeDiagnostics:5,untrustedJsonOrForwardingRejected:true,recipientSessionWorldIsolation:true,duplicateIdempotency:true,capacityWithoutReplayAmplification:true,decayOnRead:true,ownExperience:false,worldOrPolicyWrites:false,runtimeImport:false}));

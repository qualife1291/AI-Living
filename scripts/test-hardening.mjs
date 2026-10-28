import assert from 'node:assert/strict';
import { adminAllowed, cloudflareQaAccessAllowed } from '../lib/admin.ts';
import { lifeStory, interiorPhase } from '../lib/city/lifestory.ts';
import { seed } from '../lib/world.ts';
import { initializeLiving } from '../lib/living/engine.ts';
import { initializeAgent, prepareLearning } from '../lib/living/learning.ts';
const req = (url, user) => new Request(url, {headers: user ? {'oai-authenticated-user-id': user} : {}});
assert.equal(adminAllowed(req('https://city.example/api/world'), {}), false);
assert.equal(adminAllowed(req('https://city.example/api/world', 'viewer'), {ownerId:'owner'}), false);
assert.equal(adminAllowed(req('https://city.example/api/world', 'owner'), {ownerId:'owner'}), true);
assert.equal(adminAllowed(req('https://city.example/api/world'), {localAdmin:'true'}), false);
assert.equal(adminAllowed(req('http://127.0.0.1:5174/api/world'), {localAdmin:'true'}), true);
// Cloudflare QA Access is verified by the platform context, never by a client
// header or a spoofed Origin. Keep Sites production's auth unchanged.
const qaRequest=new Request('https://ai-living-qa.example/api/living/pulse',{method:'POST'});
const qaCfg={expectedAud:'qa-access-aud',hostname:'ai-living-qa.example'};
assert.equal(cloudflareQaAccessAllowed(qaRequest,{aud:'qa-access-aud'},qaCfg),true);
assert.equal(cloudflareQaAccessAllowed(qaRequest,undefined,qaCfg),false);
assert.equal(cloudflareQaAccessAllowed(qaRequest,{aud:'other-aud'},qaCfg),false);
assert.equal(cloudflareQaAccessAllowed(qaRequest,{aud:'qa-access-aud'},{...qaCfg,expectedAud:undefined}),false);
assert.equal(cloudflareQaAccessAllowed(qaRequest,{aud:'qa-access-aud'},{...qaCfg,hostname:undefined}),false);
assert.equal(cloudflareQaAccessAllowed(new Request('http://ai-living-qa.example/api/living/pulse'),{aud:'qa-access-aud'},qaCfg),false);
assert.equal(cloudflareQaAccessAllowed(new Request('https://unrelated.example/api/living/pulse',{headers:{origin:qaRequest.url,'cf-access-jwt-assertion':'forged','oai-authenticated-user-id':'owner'}}),{aud:'qa-access-aud'},qaCfg),false);
assert.equal(cloudflareQaAccessAllowed(new Request(qaRequest.url,{headers:{origin:qaRequest.url,'cf-access-jwt-assertion':'forged'}}),undefined,qaCfg),false);
const now = Date.parse('2026-10-25T05:00:00Z'), world=structuredClone(seed);
world.born = new Date(now-600000).toISOString(); world.clock=undefined;
world.living=initializeLiving(now);
world.living.residents=Array.from({length:240}, (_,i)=>({...world.living.residents[0],id:`fixture-${i}`,plan:{simStartedAt:0}}));
world.living.learning={};
for(const p of world.living.residents) world.living.learning[p.id]={...initializeAgent(p.id),pending:{id:p.id,scenarioId:'rest-home',startedSimMs:0,durationMs:180000,completed:false}};
const all=[]; prepareLearning(world,world.living,now,e=>all.push(e));
assert.equal(all.length,240); assert.equal(world.living.experiences.length,200);
const again=[]; prepareLearning(world,world.living,now,e=>again.push(e));assert.equal(again.length,0);
const adult=lifeStory(world,'an',now), year=lifeStory(world,'an',now+366*86400000);
assert.ok(adult.age>=20);assert.equal(year.age,adult.age+1);
world.clock={pausedAt:now,pausedMs:0};assert.equal(lifeStory(world,'an',now+366*86400000).age,adult.age);
for(let i=0;i<240;i++) { const p=interiorPhase(i);assert.ok(p.liftY>=0&&p.liftY<=2); }
console.log('PASS: fail-closed owner authorization, local-only admin, 240 completed outcomes retained for archive despite 200-item snapshot, idempotent settlement, simulated age and pause, bounded elevator.');

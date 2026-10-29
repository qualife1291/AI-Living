import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {scenarioDefinitions,scenarioFrame} from '../lib/city/scenarios/index.ts';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog={assets:[...read('../public/models/kenney/catalog.json').assets,...read('../public/models/resources/catalog.json').assets,...read('../public/models/citizens/catalog.json').assets]};
const policy=read('../data/assets/requirements.json');
export function resolveRequirements(keys,approved,preferred,procedural){
 const bindings={},missing=[];
 for(const key of [...new Set(keys)].sort()){
  const chosen=preferred[key]??approved.find(a=>a.id===key||a.id.split('/').at(-1)===key)?.id;
  if(chosen&&approved.some(a=>a.id===chosen&&a.license==='CC0-1.0'))bindings[key]=chosen;
  else if(procedural.includes(key))bindings[key]=`procedural/${key}`;
  else missing.push({key,reason:'A reviewed model or implemented procedural recipe is needed.'});
 }
 return {version:1,bindings,missing};
}
const keys=[...Object.keys(policy.preferred),...policy.procedural];
for(const scenario of scenarioDefinitions){keys.push(...scenario.cast.map(a=>a.modelHint),...scenario.environment.map(p=>p.modelHint??p.kind));for(const time of [0,30,60,90,120])keys.push(...scenarioFrame(scenario.id,time).props.map(p=>p.modelHint??p.kind));}
const result=resolveRequirements(keys,catalog.assets,policy.preferred,policy.procedural);
const text=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--self-test')){
 const approved=[{id:'market/bread',license:'CC0-1.0'},{id:'unsafe/phone',license:'unknown'}];
 assert.deepEqual(resolveRequirements(['bread','wallet'],approved,{},['wallet']).bindings,{bread:'market/bread',wallet:'procedural/wallet'});
 assert.equal(resolveRequirements(['phone'],approved,{},[]).missing.length,1);
 assert.equal(resolveRequirements(['mystery'],approved,{},[]).missing.length,1);
 console.log('PASS new approved assets bind automatically; unknown licences and missing recipes remain explicit');
}
const out=new URL('../data/assets/runtime-bindings.json',import.meta.url);
if(process.argv.includes('--write'))writeFileSync(out,text);
else assert.equal(readFileSync(out,'utf8'),text,'Asset bindings are stale. Run npm run assets:maintain.');
assert.equal(result.missing.length,0,JSON.stringify(result.missing));
console.log(JSON.stringify({approvedAssets:catalog.assets.length,bindings:Object.keys(result.bindings).length,missing:result.missing.length,mode:process.argv.includes('--write')?'updated':'checked'}));

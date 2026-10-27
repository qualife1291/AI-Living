/** Synthetic holdout benchmark of imported runtime policies, NOT an LLM evaluation.
 * Shared training log, frozen holdout models, identical needs/skills/weather/gates.
 * The reward oracle is the runtime's simulated outcome function, not real welfare. */
import assert from 'node:assert/strict';
import {chooseScenario,initializeAgent,scenarios,settleLearning} from '../lib/living/learning.ts';
import {decisionContext,linearScore} from '../lib/living/linucb.ts';
import {writeFileSync} from 'node:fs';
const outputIndex=process.argv.indexOf('--output'),output=outputIndex>=0?process.argv[outputIndex+1]:undefined;
if(outputIndex>=0&&!output)throw Error('--output requires a path');
function random(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function observation(rng){
 const agent=initializeAgent('benchmark-resident');
 Object.assign(agent,{energy:15+rng()*80,hunger:rng()*95,health:55+rng()*45,skill:rng()*70,socialNeed:rng()*100});
 const rainy=rng()<.4;
 const context={date:'2026-10-28',hour:6+rng()*16,weather:{status:'fresh',precipitation:rainy?2:0}};
 return {agent,context};
}
function outcome(base,scenario,context,index){
 const agent=structuredClone(base);
 agent.pending={id:`synthetic-${index}`,scenarioId:scenario.id,startedSimMs:0,durationMs:1000,completed:false,context:decisionContext(agent,context.weather)};
 assert(settleLearning(agent,1000,'2026-10-28T00:00:00.000Z',true));
 return agent;
}
const runs=[];
for(const seed of [11,37,83,149,233,401,617,997]){
 const rng=random(seed),model=initializeAgent('benchmark-resident');
 // Action chosen uniformly: same logged training outcomes for both models.
 for(let t=0;t<820;t++){
  const {agent,context}=observation(rng),scenario=scenarios[Math.floor(rng()*scenarios.length)];
  Object.assign(agent,{actions:structuredClone(model.actions),linear:structuredClone(model.linear),samples:model.samples,memories:[]});
  const next=outcome(agent,scenario,context,t);
  model.actions=next.actions;model.linear=next.linear;model.samples=next.samples;
 }
 const frozen=JSON.stringify(model),scores={tabular:{reward:0,mse:0,regret:0},linucb:{reward:0,mse:0,regret:0}};
 for(let t=0;t<160;t++){
  const {agent,context}=observation(rng);
  Object.assign(agent,{actions:model.actions,linear:model.linear,samples:model.samples,recentActions:[]});
  const probe=scenarios[Math.floor(rng()*scenarios.length)],truth=outcome(agent,probe,context,t).lastReward;
  const estimates={tabular:model.actions[probe.id]?.meanReward??0,linucb:linearScore(model.linear?.[probe.id],decisionContext(agent,context.weather)).mean};
  const eligible=scenarios.filter(s=>agent.skill>=(s.minSkill??0)&&!['minor-injury','traffic-check','job-change'].includes(s.id)).filter(s=>!context.weather.precipitation||!['sport','ecology'].includes(s.tag));
  const best=Math.max(...eligible.map(s=>outcome(agent,s,context,t).lastReward));
  for(const policy of ['tabular','linucb']){
   const choice=chooseScenario(agent,'benchmark-resident',context,'Thư viện',policy),reward=outcome(agent,choice,context,t).lastReward;
   scores[policy].reward+=reward; scores[policy].mse+=(estimates[policy]-truth)**2;
   // Heuristic health/hunger/rest overrides remain in both runtime policies.
   scores[policy].regret+=Math.max(0,best-reward);
  }
 }
 assert.equal(JSON.stringify(model),frozen,'Holdout cannot train either model');
 runs.push({seed,training:820,holdout:160,...Object.fromEntries(Object.entries(scores).map(([policy,s])=>[policy,{meanReward:s.reward/160,predictionMSE:s.mse/160,immediateRegret:s.regret/160}]))});
}
const mean=policy=>Object.fromEntries(['meanReward','predictionMSE','immediateRegret'].map(key=>[key,runs.reduce((sum,r)=>sum+r[policy][key],0)/runs.length]));
const report={kind:'synthetic-runtime-policy-holdout-v1',runtime:['chooseScenario','settleLearning','decisionContext','linearScore'],training:'shared uniform logged actions; no peer transfers or model-specific skill bonuses',holdout:'frozen models, independent seeded observations, same runtime rules/gates/priorities',limits:['Reward is the existing simulation formula, not observed physical completion or language quality.','No GPU, LLM calls, real-world claims, SFT scores or assertion that LinUCB must win.','One-step regret does not measure long-horizon welfare; uncertainty and needs heuristics can lower immediate reward.'],seeds:runs.length,runs,average:{tabular:mean('tabular'),linucb:mean('linucb')}};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

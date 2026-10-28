/** Frozen boundary grid for verifying refactors against the pre-H1 runtime. */
import {createHash} from 'node:crypto';
import {initializeAgent,settleLearning,chooseScenario,scenarios} from '../lib/living/learning.ts';
export function fixtureContext(hour=9,rain=false) {
 return {date:'2026-10-28',hour,weekday:3,timezone:'Asia/Ho_Chi_Minh',fetchedAt:'2026-10-28T02:00:00.000Z',weather:{status:'fresh',source:'synthetic-fixture',observedAt:null,temperature:30,humidity:70,precipitation:rain?2:0,code:null,windKph:0},calendar:{weekend:false,holidays:[],source:'synthetic-fixture',status:'fresh',coverage:'synthetic'},traffic:{status:'unavailable',label:'synthetic'},festivals:{status:'unavailable',label:'synthetic'}};
}
export function* outcomeFixtures() {
 let index=0;
 for(const scenario of scenarios)for(const energy of [0,25,50,75,100])for(const hunger of [0,25,50,75,100])for(const health of [0,25,50,75,100])for(const skill of [0,99,100]) {
  const agent=initializeAgent('golden-resident');
  Object.assign(agent,{energy,hunger,health,skill,employment:['employed','seeking','studying'][index%3]});
  if(index%2)delete agent.domainSkills;
  if(index%3)agent.citations=7;
  agent.pending={id:'golden-outcome',scenarioId:scenario.id,startedSimMs:0,durationMs:180000,completed:false,...(index%2?{context:[1,energy/100,hunger/100,.5,0,skill/100]}:{})};
  yield {agent,scenario,index:index++};
 }
}
export function learningFingerprint() {
 const outcomes=createHash('sha256'),choices=createHash('sha256');let cases=0,decisions=0;
 for(const {agent,index} of outcomeFixtures()) {
  const early=settleLearning(agent,179999,'2026-10-28T02:00:00.000Z',true);
  const completed=settleLearning(agent,180000,'2026-10-28T02:00:00.000Z',true);
  outcomes.update(JSON.stringify({index,early,completed,agent})+'\n');cases++;
 }
 for(const hour of [0,6,12,18,22])for(const rain of [false,true])for(const energy of [0,19,20,65,100])for(const hunger of [0,35,72,73,100])for(const health of [64,65,100]) {
  const agent=initializeAgent('golden-resident');Object.assign(agent,{energy,hunger,health,employment:decisions%3?'employed':'seeking'});
  for(const policy of ['tabular','linucb'])choices.update(chooseScenario(agent,'golden-resident',fixtureContext(hour,rain),'Thư viện',policy).id+'\n');
  decisions+=2;
 }
 return {cases,decisions,outcomes:outcomes.digest('hex'),choices:choices.digest('hex')};
}

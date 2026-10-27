import assert from 'node:assert/strict';
import {newArm,fitLinear,linearScore,decisionContext} from '../lib/living/linucb.ts';
import {initializeAgent,chooseScenario,settleLearning} from '../lib/living/learning.ts';
import {initializeLiving,planLivingTurn} from '../lib/living/engine.ts';
import {seed} from '../lib/world.ts';
function solve(matrix,vector) {
 const rows=matrix.map((row,i)=>[...row,vector[i]]),n=rows.length;
 for(let c=0;c<n;c++) {
  let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
  [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
  const divisor=rows[c][c];assert(Math.abs(divisor)>1e-12);
  for(let k=c;k<=n;k++)rows[c][k]/=divisor;
  for(let r=0;r<n;r++)if(r!==c){const factor=rows[r][c];for(let k=c;k<=n;k++)rows[r][k]-=factor*rows[c][k];}
 }
 return rows.map(row=>row[n]);
}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
let arm=newArm(),matrix=Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>r===c?1:0)),b=Array(6).fill(0),maxError=0;
for(let n=0;n<1200;n++) {
 const x=[1,...Array.from({length:5},(_,i)=>((n*(i*31+7)+i*19)%101)/100)],reward=Math.sin(n*.3),old=JSON.stringify(arm);
 const next=fitLinear(arm,x,reward);assert.equal(JSON.stringify(arm),old,'Posterior updates never mutate the previous snapshot');arm=next;
 for(let r=0;r<6;r++){b[r]+=reward*x[r];for(let c=0;c<6;c++)matrix[r][c]+=x[r]*x[c];}
 if(n%13===0){const probe=[1,.8,.2,.7,0,.3],actual=linearScore(arm,probe),theta=solve(matrix,b),variance=dot(probe,solve(matrix,probe));
  maxError=Math.max(maxError,Math.abs(actual.mean-Math.max(-1,Math.min(1,dot(probe,theta)))),Math.abs(actual.uncertainty-.25*Math.sqrt(variance)));
 }
}
assert(maxError<1e-8);assert.equal(arm.samples,1200);assert.equal(arm.inverse.length,21);
assert.throws(()=>fitLinear(arm,[1,2],.5));assert.throws(()=>fitLinear(arm,[1,0,0,0,0,0],NaN));
let high,low;
for(let n=0;n<150;n++){const energy=n%2?.9:.1,x=[1,energy,.4,.5,0,.1];high=fitLinear(high,x,energy>.5?1:-1);low=fitLinear(low,x,energy>.5?-1:1);}
assert(linearScore(high,[1,.9,.4,.5,0,.1]).mean>linearScore(low,[1,.9,.4,.5,0,.1]).mean);
assert(linearScore(high,[1,.1,.4,.5,0,.1]).mean<linearScore(low,[1,.1,.4,.5,0,.1]).mean);
const now=Date.parse('2026-10-27T05:00:00Z'),context={date:'2026-10-27',hour:12,weekday:2,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),weather:{status:'fresh',precipitation:0},calendar:{weekend:false,holidays:[]},festivals:{status:'unavailable',label:'fixture'},traffic:{status:'unavailable',label:'fixture'}};
const novice=initializeAgent('novice');novice.actions['teach-class']={trials:999,meanReward:999};
assert.notEqual(chooseScenario(novice,'novice',context).id,'teach-class');novice.skill=8;assert.equal(chooseScenario(novice,'novice',context).id,'teach-class');
novice.energy=10;assert.equal(chooseScenario(novice,'novice',context).id,'rest-home','Physiological gates stay ahead of any fitted policy');
const agent=initializeAgent('actual-outcome'),atChoice=decisionContext(agent,context.weather);
agent.pending={id:'outcome1',scenarioId:'learn-trade',startedSimMs:0,durationMs:180000,completed:false,context:[...atChoice]};
agent.energy=15;agent.hunger=85;
assert.equal(settleLearning(agent,179999,new Date(now).toISOString(),true),false);assert.equal(agent.linear,undefined);
assert.equal(settleLearning(agent,180000,new Date(now).toISOString(),true),true);
assert.deepEqual(agent.linear['learn-trade'].b,atChoice.map(v=>v*agent.lastReward),'Learn using the captured decision context, not the completion-time needs');
const posterior=JSON.stringify(agent.linear);assert.equal(settleLearning(agent,360000,new Date(now).toISOString(),true),false);assert.equal(JSON.stringify(agent.linear),posterior);
agent.pending={...agent.pending,id:'cancelled',completed:false};assert.equal(settleLearning(agent,360000,new Date(now).toISOString(),false),false);assert.equal(JSON.stringify(agent.linear),posterior);
const world={...structuredClone(seed),born:'2026-10-26T17:00:00Z',living:initializeLiving(now)},before=JSON.stringify(world),result=planLivingTurn(world,context,now);
assert.equal(JSON.stringify(world),before);
for(const [id,a] of Object.entries(result.state.learning))if(a.pending&&!a.pending.completed){
 assert(a.pending.context?.length===6);const plan=result.world.people.find(p=>p.id===id)?.plan??result.state.residents.find(r=>r.id===id)?.plan;
 assert.equal(a.pending.durationMs,plan.steps.reduce((s,step)=>s+step.duration,0)*1000,'Outcome waits for every planned stage, not a fixed180s');
}
console.log(JSON.stringify({suite:'linucb',ridgeOracleUpdates:1200,maxError,contextSensitiveRanking:true,skillGateAndUnlock:true,legacyPreserved:true,contextAtChoice:true,noEarlyOrDuplicateOrCancelledCredit:true,fullPlanDuration:true,syntheticOnly:true}));

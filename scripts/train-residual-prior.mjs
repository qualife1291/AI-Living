/** Offline empirical residual prior. Never writes DB or configures production. */
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {hashSeed} from '../lib/clock.ts';
import {runLearningRollout} from '../lib/living/sim-harness.ts';
import {priorSchema,priorKey,SCENARIO_SIGNATURE} from '../lib/living/residual-policy.ts';
const {values}=parseArgs({options:{profile:{type:'string',default:'cold-stress-v1'},seeds:{type:'string',default:'8'},'seed-start':{type:'string',default:'1000'},agents:{type:'string',default:'24'},days:{type:'string',default:'60'},out:{type:'string'}},strict:true});
if(!values.out)throw Error('out required');
const count=Number(values.seeds),start=Number(values['seed-start']),agents=Number(values.agents),days=Number(values.days);
if(!Number.isSafeInteger(count)||count<1||count>100||!Number.isSafeInteger(start)||start<0||start>1_000_000)throw Error('Invalid training seed budget');
const seeds=Array.from({length:count},(_,i)=>hashSeed(`H1-seed:${start+i}`)),begin=performance.now();
const report=runLearningRollout({policy:'residual-ema-v1',profile:values.profile,agents,days,seeds,shiftDay:Math.floor(days/2)},undefined,{collectPrior:true});
const rows=new Map();
for(const run of report.runs)for(const row of run.study.trainingRows) {
 const key=priorKey(row.rolePlace,row.scenarioId),old=rows.get(key),support=(old?.support??0)+row.support;
 rows.set(key,{...row,support,mean:(old?.mean??0)+(row.mean-(old?.mean??0))*row.support/support});
}
const prior=priorSchema.parse({version:1,source:'synthetic-H2-training',expectedVersion:'scenario-outcome-v1',scenarioSignature:SCENARIO_SIGNATURE,profile:values.profile,trainingSeeds:seeds,rows:[...rows.values()].filter(r=>r.support>=5).sort((a,b)=>priorKey(a.rolePlace,a.scenarioId).localeCompare(priorKey(b.rolePlace,b.scenarioId)))});
const payload={prior,training:{kind:report.kind,agents,days,summary:report.summary,earnedOutcomes:report.runs.reduce((n,r)=>n+r.completedPlans,0)},productionAccess:false};
const sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if(existsSync(values.out)&&JSON.parse(readFileSync(values.out,'utf8')).sha256!==sha256)throw Error('Different prior already exists; preserve the training artifact');
mkdirSync(dirname(values.out),{recursive:true});writeFileSync(values.out,JSON.stringify({...payload,sha256},null,2)+'\n');
console.log(JSON.stringify({sha256,rows:prior.rows.length,trainingSeeds:seeds,seconds:+((performance.now()-begin)/1000).toFixed(3)}));

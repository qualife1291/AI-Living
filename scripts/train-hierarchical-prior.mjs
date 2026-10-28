/** Generate synthetic data only; never consume private archives or write DB. */
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {hashSeed} from '../lib/clock.ts';
import {HierarchyTrainer} from '../lib/living/hierarchical-prior.ts';
import {runHierarchyRollout} from '../lib/living/hierarchy-harness.ts';
const {values}=parseArgs({options:{profile:{type:'string',default:'cold-stress-v1'},seeds:{type:'string',default:'8'},'seed-start':{type:'string',default:'3000'},agents:{type:'string',default:'24'},days:{type:'string',default:'60'},out:{type:'string'}},strict:true,allowPositionals:false});
if(!values.out)throw Error('out required');
const count=Number(values.seeds),start=Number(values['seed-start']),agents=Number(values.agents),days=Number(values.days);
if(!Number.isSafeInteger(count)||count<2||count>100||!Number.isSafeInteger(start)||start<0||start>1_000_000)throw Error('Invalid training seed budget');
const seeds=Array.from({length:count},(_,i)=>hashSeed(`H1-seed:${start+i}`)),trainer=new HierarchyTrainer(values.profile,seeds,agents,days);
const digest=createHash('sha256'),begin=performance.now();
runHierarchyRollout({variant:'personal-v1',profile:values.profile,agents,days,seeds,shiftDay:Math.floor(days/2)},undefined,(seed,outcome)=>{
 const record=trainer.observe(seed,outcome);digest.update(JSON.stringify({seed,record})+'\n');
});
const prior=trainer.artifact(),payload={prior,provenance:{generator:'H4-synthetic-completed-linucb-v1',transcriptSha256:digest.digest('hex'),
 acceptedBy:'H3-verified-contextual/fingerprint-v1/unique-id/monotonic-personal-sample',productionAccess:false}};
const sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if(existsSync(values.out)&&JSON.parse(readFileSync(values.out,'utf8')).sha256!==sha256)throw Error('Different prior already exists; preserve training artifact');
mkdirSync(dirname(values.out),{recursive:true});writeFileSync(values.out,JSON.stringify({...payload,sha256},null,2)+'\n');
console.log(JSON.stringify({sha256,rows:prior.rows.length,acceptedOutcomes:prior.acceptedOutcomes,seconds:+((performance.now()-begin)/1000).toFixed(3)}));

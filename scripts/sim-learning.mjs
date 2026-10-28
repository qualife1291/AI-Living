/** Offline rollout. Reports never overwrite a different baseline. */
import {parseArgs} from 'node:util';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {hashSeed} from '../lib/clock.ts';
import {runLearningRollout} from '../lib/living/sim-harness.ts';
import {priorSchema} from '../lib/living/residual-policy.ts';
const {values}=parseArgs({options:{policy:{type:'string',default:'linucb'},mode:{type:'string',default:'full'},agents:{type:'string'},days:{type:'string'},seeds:{type:'string'},'seed-start':{type:'string',default:'0'},'shift-day':{type:'string'},profile:{type:'string'},prior:{type:'string'},out:{type:'string'}},strict:true,allowPositionals:false});
if(!['full','proxy'].includes(values.mode))throw Error('mode must be full or proxy');
if(!['tabular','linucb','model-prior-v1','residual-ema-v1','residual-warm-v1'].includes(values.policy))throw Error('Unknown policy');
if(values.profile&&!['ordinary-v1','cold-stress-v1'].includes(values.profile))throw Error('Unknown profile');
if(values.prior&&values.policy!=='residual-warm-v1')throw Error('Only the warm policy accepts a prior');
let prior,priorChecksum;
if(values.prior) {
 const {sha256,...payload}=JSON.parse(readFileSync(values.prior,'utf8'));
 if(createHash('sha256').update(JSON.stringify(payload)).digest('hex')!==sha256)throw Error('Prior checksum mismatch');
 prior=priorSchema.parse(payload.prior);
 priorChecksum=sha256;
}
const integer=(text,fallback)=>{const n=text===undefined?fallback:Number(text);if(!Number.isSafeInteger(n))throw Error('Expected an integer');return n;};
const proxy=values.mode==='proxy',agents=integer(values.agents,proxy?12:24),days=integer(values.days,proxy?30:60),count=integer(values.seeds,proxy?5:20),start=integer(values['seed-start'],0);
if(count<1||count>100||start<0||start>1_000_000)throw Error('Seed range outside budget');
const shiftDay=values['shift-day']==='none'?null:integer(values['shift-day'],Math.floor(days/2));
const begin=performance.now();
const report=runLearningRollout({policy:values.policy,agents,days,seeds:Array.from({length:count},(_,i)=>hashSeed(`H1-seed:${start+i}`)),shiftDay,...(values.profile?{profile:values.profile}:{})},undefined,{prior,priorChecksum});
const sha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
if(values.out){
 if(existsSync(values.out)&&JSON.parse(readFileSync(values.out,'utf8')).sha256!==sha256)throw Error('Different report already exists; use a new output filename to preserve the baseline');
 mkdirSync(dirname(values.out),{recursive:true});writeFileSync(values.out,JSON.stringify({...report,sha256},null,2)+'\n');
}
console.log(JSON.stringify({kind:report.kind,config:report.config,acceptanceProfile:report.acceptanceProfile,sha256,seconds:+((performance.now()-begin)/1000).toFixed(3),summary:report.summary}));

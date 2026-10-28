import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {hashSeed} from '../lib/clock.ts';
import {hierarchyPriorSchema} from '../lib/living/hierarchical-prior.ts';
import {runHierarchyRollout,compareHierarchyRollouts} from '../lib/living/hierarchy-harness.ts';
const {values}=parseArgs({options:{variant:{type:'string',default:'personal-v1'},profile:{type:'string',default:'cold-stress-v1'},seeds:{type:'string',default:'20'},'seed-start':{type:'string',default:'5000'},agents:{type:'string',default:'24'},days:{type:'string',default:'60'},prior:{type:'string'},baseline:{type:'string'},out:{type:'string'}},strict:true,allowPositionals:false});
function verified(path,maxBytes){if(statSync(path).size>maxBytes)throw Error('Artifact exceeds budget');const {sha256,...payload}=JSON.parse(readFileSync(path,'utf8'));if(createHash('sha256').update(JSON.stringify(payload)).digest('hex')!==sha256)throw Error('Artifact checksum mismatch');return {payload,sha256};}
let prior,priorChecksum=null;
if(values.prior){const file=verified(values.prior,1_000_000);prior=hierarchyPriorSchema.parse(file.payload.prior);priorChecksum=file.sha256;}
const count=Number(values.seeds),start=Number(values['seed-start']),agents=Number(values.agents),days=Number(values.days);
if(!Number.isSafeInteger(count)||count<1||count>100||!Number.isSafeInteger(start)||start<0||start>1_000_000)throw Error('Invalid evaluation seed budget');
const begin=performance.now(),report=runHierarchyRollout({variant:values.variant,profile:values.profile,agents,days,
 seeds:Array.from({length:count},(_,i)=>hashSeed(`H1-seed:${start+i}`)),shiftDay:Math.floor(days/2)},prior);
const comparison=values.baseline?compareHierarchyRollouts(verified(values.baseline,8_000_000).payload.report,report):null;
const payload={report,priorChecksum,comparison},sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if(values.out){if(existsSync(values.out)&&JSON.parse(readFileSync(values.out,'utf8')).sha256!==sha256)throw Error('Different report already exists; preserve baseline');mkdirSync(dirname(values.out),{recursive:true});writeFileSync(values.out,JSON.stringify({...payload,sha256},null,2)+'\n');}
console.log(JSON.stringify({sha256,variant:values.variant,profile:values.profile,summary:report.raw.summary,secondary:report.summary,gates:comparison?.gates??null,seconds:+((performance.now()-begin)/1000).toFixed(3)}));

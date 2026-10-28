/** Read a local JSONL export. Never fetch, rewrite history, or train a policy. */
import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {auditExperiences} from '../lib/living/experience-audit.ts';
const {values}=parseArgs({options:{in:{type:'string'},out:{type:'string'}},strict:true,allowPositionals:false});
if(!values.in)throw Error('in must point to a local JSONL export');
if(statSync(values.in).size>32*1024*1024)throw Error('Audit input exceeds 32 MiB; split the local export');
const raw=readFileSync(values.in),records=[];
for(const [index,line] of raw.toString('utf8').split('\n').entries()) {
 if(!line.trim())continue;
 try{records.push(JSON.parse(line));}catch{throw Error(`Invalid JSONL at line ${index+1}`);}
}
const payload={...auditExperiences(records),inputSha256:createHash('sha256').update(raw).digest('hex')};
const sha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if(values.out)writeFileSync(values.out,JSON.stringify({...payload,sha256},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...payload,sha256}));
if(payload.counts.rejected)process.exitCode=2;

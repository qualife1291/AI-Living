/** Explicit local owner export only. Never read DB/network or mutate source. */
import {parseArgs} from 'node:util';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {ReplayCorpus,fitReplay} from '../lib/living/outcome-replay.ts';
import {digest,corpusDigest,privateReplayPath} from './replay-files.mjs';
const {values}=parseArgs({options:{in:{type:'string'},actor:{type:'string'},'expected-sha256':{type:'string'},order:{type:'string',default:'curriculum'},out:{type:'string'}},strict:true,allowPositionals:false});
try {
 if(!values.in||!values.actor||!values.out||!values['expected-sha256'])throw Error('in, actor, expected-sha256 and private out required');
 if(!['curriculum','chronological'].includes(values.order))throw Error('Unknown replay order');
 const output=privateReplayPath(values.out);
 if(statSync(values.in).size>32*1024*1024)throw Error('Local export exceeds32MiB; split export before replay');
 const raw=readFileSync(values.in),sha256=digest(raw);
 if(sha256!==values['expected-sha256'])throw Error('Source checksum mismatch; input preserved');
 const builder=new ReplayCorpus({kind:'actor',actorId:values.actor});
 for(const [index,line] of raw.toString('utf8').split('\n').entries()) {
  if(!line.trim())continue;
  let record;try{record=JSON.parse(line);}catch{throw Error(`Invalid JSONL at line ${index+1}`);}
  builder.add(record);
 }
 const corpus=builder.finish();
 const artifact=fitReplay(corpus,values.order,{kind:'local-owner-jsonl',sha256,acceptedDigest:corpusDigest(corpus)},null);
 const payload={artifact,productionAccess:false,trainsRuntimePolicy:false},artifactHash=digest(JSON.stringify(payload));
 writeFileSync(output,JSON.stringify({...payload,sha256:artifactHash},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({kind:'actor-scoped-local-replay',report:corpus.report,sha256:artifactHash,productionAccess:false,trainsRuntimePolicy:false}));
} catch(error) {
 const message=error instanceof Error&&/^(in,|Unknown replay|Private replay|Local export|Source checksum|Invalid JSONL|Replay source|No compatible)/.test(error.message)?error.message:'Local replay failed; input preserved and existing output not overwritten';
 console.error(message);process.exitCode=1;
}

import {z} from 'zod';
import {compareProgress,progressSchema} from './progress-watch.ts';

const count=z.number().int().nonnegative().max(1e12);
const duration=z.number().nonnegative().max(1e12);
// Parse only operational fields. Exported platform payloads and identities must
// never be copied into the aggregate report, including validation errors.
const logSchema=z.object({
  schema:z.literal('xom-system-log-v1'),at:z.string().datetime(),
  event:z.string().min(1).max(64),requestId:z.string().uuid(),
  trigger:z.enum(['http','cron']),version:z.string().uuid().optional(),
  status:z.number().int().min(100).max(599).optional(),
  stage:z.enum(['read','write','learning','social','tick']).optional(),
  durationMs:duration.optional(),duplicate:z.boolean().optional(),coalesced:z.boolean().optional(),
  h6Evaluations:count.optional(),h6ModelUsed:count.optional(),h6Errors:count.optional(),
  h6CanaryEvaluations:count.optional(),h6CanaryChanged:count.optional(),h6CanaryErrors:count.optional(),
});
type Record=z.infer<typeof logSchema>;
function latency(values:number[]){
  const sorted=[...values].sort((a,b)=>a-b);
  const at=(q:number)=>sorted.length?sorted[Math.ceil(sorted.length*q)-1]:null;
  return {samples:sorted.length,p50Ms:at(.5),p95Ms:at(.95),maxMs:at(1)};
}

/** Offline, bounded exported-log correlation. A file cannot attest its source:
 * never promote this report to native scheduler provenance or model quality. */
export function auditQaWindow(beforeValue:unknown,afterValue:unknown,values:unknown[]){
  const before=progressSchema.parse(beforeValue),after=progressSchema.parse(afterValue);
  const progress=compareProgress(before,after);
  if(values.length>10000)throw Error('Log budget exceeded');
  const logs=values.map(v=>logSchema.parse(v));
  const start=Date.parse(before.observedAt),end=Date.parse(after.observedAt);
  const window=logs.filter(r=>Date.parse(r.at)>start&&Date.parse(r.at)<=end);
  const versionKnown=before.version!==null&&before.version===after.version;
  const current=versionKnown?window.filter(r=>r.version===before.version):[];
  const cron=current.filter(r=>r.trigger==='cron');
  const groups=new Map<string,Record[]>();
  for(const r of cron){const rows=groups.get(r.requestId)??[];rows.push(r);groups.set(r.requestId,rows);}
  let completed=0,coalesced=0,duplicates=0,failed=0,incomplete=0;
  for(const rows of groups.values()){
    const results=rows.filter(r=>r.event==='cron_result');
    const result=results[0];
    if(rows.some(r=>r.event==='cron_failed'||(r.status??0)>=500)){failed++;continue;}
    // Repeated records are not multiple executions. Refuse ambiguous result
    // records (e.g. overlapping exports) instead of double-counting them.
    if(results.length!==1){incomplete++;continue;}
    if(result.coalesced===true){coalesced++;continue;}
    if(result.duplicate===true){duplicates++;continue;}
    if(result.status===409){incomplete++;continue;}
    const stages=rows.filter(r=>r.event==='pulse_stage');
    const ordered=stages.length===3&&['learning','social','tick'].every((s,i)=>
      stages[i].stage===s&&stages[i].status===200&&
      (i===0||Date.parse(stages[i].at)>=Date.parse(stages[i-1].at)));
    if(result.status===200&&result.coalesced===false&&result.duplicate===false&&ordered&&
      Date.parse(result.at)>=Date.parse(stages[2].at))completed++;
    else incomplete++;
  }
  const http=current.filter(r=>r.trigger==='http');
  const errors=http.filter(r=>r.event==='http_uncaught'||(r.event==='http_complete'&&(r.status??0)>=500));
  // Count requests rather than duplicate stage/completion error log lines.
  const httpErrors=new Set(errors.map(r=>r.requestId)).size;
  const authDenied=new Set(http.filter(r=>r.event==='qa_auth_denied').map(r=>r.requestId)).size;
  const throttled=new Set(http.filter(r=>r.event==='chat_throttled').map(r=>r.requestId)).size;
  const shadow=current.filter(r=>r.event==='h6_shadow_eval');
  const canary=current.filter(r=>r.event==='h6_canary_result');
  const sum=(rows:Record[],key:'h6Evaluations'|'h6ModelUsed'|'h6Errors'|'h6CanaryEvaluations'|'h6CanaryChanged'|'h6CanaryErrors')=>
    rows.reduce((n,r)=>n+(r[key]??0),0);
  const warnings:string[]=[];
  if(!versionKnown)warnings.push('version_unverified');
  if(window.length!==current.length)warnings.push('unmatched_version_logs');
  if(failed||httpErrors)warnings.push('runtime_errors');
  if(sum(shadow,'h6Errors')||sum(canary,'h6CanaryErrors'))warnings.push('model_scoring_errors');
  if(incomplete)warnings.push('incomplete_cron_evidence');
  if(['state_changed','clock_mismatch','tick_evidence_mismatch','stalled','activity_without_tick_progress'].includes(progress.status))warnings.push(progress.status);
  const status=warnings.length?'attention_required':
    progress.status==='paused'||progress.status==='pause_changed'?'paused':
    completed>0&&progress.status==='ticks_progressing'?'correlated_progress':'insufficient_evidence';
  return {schema:'xom-qa-window-v1',status,version:versionKnown?before.version:null,
    observedFrom:before.observedAt,observedTo:after.observedAt,progress,
    logs:{provided:logs.length,inWindow:window.length,matchingVersion:current.length},
    cron:{invocations:groups.size,completed,coalesced,duplicates,failed,incomplete,
      stages:Object.fromEntries(['learning','social','tick'].map(s=>[s,latency(cron.filter(r=>r.event==='pulse_stage'&&r.stage===s&&r.durationMs!==undefined).map(r=>r.durationMs!))]))},
    http:{errors:httpErrors,authDenied,throttled},
    h6:{shadowInvocations:shadow.length,shadowEvaluations:sum(shadow,'h6Evaluations'),shadowModelUsed:sum(shadow,'h6ModelUsed'),
      shadowErrors:sum(shadow,'h6Errors'),shadowBlocked:current.filter(r=>r.event==='h6_shadow_blocked').length,
      canaryInvocations:canary.length,canaryEvaluations:sum(canary,'h6CanaryEvaluations'),canaryModelUsed:sum(canary,'h6ModelUsed'),
      canaryChanged:sum(canary,'h6CanaryChanged'),canaryErrors:sum(canary,'h6CanaryErrors'),
      canaryBlocked:current.filter(r=>r.event==='h6_canary_blocked').length},warnings,
    nativeSchedulerAttributionProven:false,modelQualityGainProven:false,mutationPerformed:false,automaticRecovery:false};
}

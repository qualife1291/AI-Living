import {stateSchema,fail,type State,type Entity,type EntityKind,type Relationship} from './schema.ts';
export function entity<K extends EntityKind>(s:State,id:string,kind:K):Extract<Entity,{kind:K}> {
 const found=s.entities.find(e=>e.id===id);if(!found||found.kind!==kind)return fail('ENTITY_NOT_FOUND',404);
 return found as Extract<Entity,{kind:K}>;
}
export const outgoing=(s:State,id:string,kind:Relationship['kind'])=>s.relationships.filter(r=>r.from===id&&r.kind===kind);
export const assigned=(s:State,id:string)=>outgoing(s,id,'assigned_to')[0]?.to;
export function assertConsistent(value:unknown):State {
 const parsed=stateSchema.safeParse(value);if(!parsed.success)return fail('INCONSISTENT_SCHEMA',503);
 const s=parsed.data,byId=new Map(s.entities.map(e=>[e.id,e]));
 if(byId.size!==s.entities.length||s.entities.some(e=>!e.id.startsWith(e.kind+':')))return fail('INCONSISTENT_IDS',503);
 const seen=new Set<string>();
 const expected={assigned_to:['task','agent'],depends_on:['task','task'],part_of:['task','workflow'],targets:['task','pull_request']} as const;
 for(const r of s.relationships){
  const key=r.kind+'\0'+r.from+'\0'+r.to;
  if(seen.has(key)||r.from===r.to)return fail('INCONSISTENT_RELATION',503);seen.add(key);
  if(r.kind==='concerns'){
   if(byId.get(r.from)?.kind!=='task'||!/^sim:actor:[a-zA-Z0-9_-]{1,100}$/.test(r.to)||!r.worldBorn)return fail('INCONSISTENT_DOMAIN_REF',503);
  }else{
   const kinds=expected[r.kind];if(r.worldBorn||byId.get(r.from)?.kind!==kinds[0]||byId.get(r.to)?.kind!==kinds[1])return fail('INCONSISTENT_RELATION_TYPE',503);
  }
  if(['assigned_to','part_of','targets'].includes(r.kind)&&outgoing(s,r.from,r.kind).length>1)return fail('INCONSISTENT_CARDINALITY',503);
 }
 for(const e of s.entities)if(e.kind==='pull_request'){
  const repo=byId.get(e.repositoryId);if(repo?.kind!=='repository'||e.evidence.headSha!==e.headSha||e.evidence.number!==e.number)return fail('INCONSISTENT_PR',503);
  if(e.evidence.checks.length!==repo.checks.length||!repo.checks.every(c=>e.evidence.checks.some(v=>v.workflow===c.workflow&&v.job===c.job&&v.definitionSha===c.definitionSha)))return fail('INCONSISTENT_CHECKS',503);
 }
 const visiting=new Set<string>(),done=new Set<string>();
 const walk=(id:string)=>{if(visiting.has(id))fail('DEPENDENCY_CYCLE',503);if(done.has(id))return;visiting.add(id);for(const r of outgoing(s,id,'depends_on'))walk(r.to);visiting.delete(id);done.add(id);};
 for(const e of s.entities)if(e.kind==='task')walk(e.id);
 return s;
}
export function blockers(s:State,id:string,now:number):string[]{
 const task=entity(s,id,'task'),reasons:string[]=[],owner=assigned(s,id);
 if(!owner||!entity(s,owner,'agent').active)reasons.push('owner_missing_or_inactive');
 const visited=new Set<string>();
 const visit=(at:string)=>{for(const r of outgoing(s,at,'depends_on'))if(!visited.has(r.to)){visited.add(r.to);if(entity(s,r.to,'task').state!=='done')reasons.push('dependency:'+r.to);visit(r.to);}};visit(id);
 const flow=outgoing(s,id,'part_of')[0];if(flow&&entity(s,flow.to,'workflow').state!=='active'&&task.state!=='done')reasons.push('workflow_not_active');
 if(task.category!=='review'){
  const target=outgoing(s,id,'targets')[0];
  if(!target)reasons.push('pull_request_missing');
  else {const pr=entity(s,target.to,'pull_request');if(now-pr.evidence.verifiedAt>600000||pr.evidence.verifiedAt>now)reasons.push('qa_refresh_required');if(pr.evidence.checks.some(c=>c.status!=='success'))reasons.push('qa_not_passed');if(task.state==='done'&&task.approvedHeadSha!==pr.headSha)reasons.push('approved_head_changed');}
 }
 return [...new Set(reasons)];
}
export function analyze(s:State,now:number){
 const tasks=s.entities.filter(e=>e.kind==='task');
 return {tasks:tasks.map(t=>({id:t.id,state:t.state,owner:assigned(s,t.id)??null,blockers:blockers(s,t.id,now)})),unownedBugs:tasks.filter(t=>t.category==='bug'&&!assigned(s,t.id)).map(t=>t.id),mergeExecutionEnabled:false};
}

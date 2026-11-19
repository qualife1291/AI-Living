import {z} from 'zod';
import {actionSchema,fail,type State,type Action,type Entity,type Principal,type Evidence} from './schema.ts';
import {assertConsistent,entity,outgoing,assigned,blockers} from './graph.ts';
import {authorize,requireTaskWritable} from './policy.ts';
export type DomainSource={revision:number;born:string;actorIds:string[]};
export type ActionContext={now:number;evidence:Map<string,Evidence>;domain?:DomainSource};
export const actionCatalog=()=>({inputSchema:z.toJSONSchema(actionSchema),actions:actionSchema.options.map(s=>s.shape.type.value),mergeExecutionEnabled:false});
export function evidenceTargets(s:State,a:Action):Extract<Entity,{kind:'pull_request'}>[]{
 if(a.type==='checks.refresh')return [entity(s,a.input.id,'pull_request')];
 let tasks:Extract<Entity,{kind:'task'}>[]=[];
 if(a.type==='task.transition'&&a.input.state==='done')tasks=[entity(s,a.input.id,'task')];
 if(a.type==='workflow.transition'&&a.input.state==='completed')tasks=s.relationships.filter(r=>r.kind==='part_of'&&r.to===a.input.id).map(r=>entity(s,r.from,'task'));
 const ids=new Set<string>();for(const task of tasks.filter(t=>t.category!=='review')){const r=outgoing(s,task.id,'targets')[0];if(!r)fail('PULL_REQUEST_REQUIRED');ids.add(r.to);}
 return [...ids].map(id=>entity(s,id,'pull_request'));
}
function requireEvidence(s:State,taskId:string,c:ActionContext){
 const target=outgoing(s,taskId,'targets')[0];if(!target)return fail('PULL_REQUEST_REQUIRED');
 const pr=entity(s,target.to,'pull_request'),e=c.evidence.get(pr.id),repo=entity(s,pr.repositoryId,'repository');
 if(!e||e.repositoryId!==pr.evidence.repositoryId||e.number!==pr.number||e.verifiedAt!==c.now||e.checks.length!==repo.checks.length||!repo.checks.every(r=>e.checks.some(v=>v.workflow===r.workflow&&v.job===r.job&&v.definitionSha===r.definitionSha&&v.status==='success')))return fail('QA_GATE_NOT_PASSED');
 return e;
}
/** Typed reducer; server creates context, never deserializes evidence from an action. */
export function applyAction(source:State,p:Principal,a:Action,c:ActionContext):State {
 authorize(source,p,a);const s=structuredClone(source);
 const add=(e:Entity)=>{if(s.entities.some(v=>v.id===e.id))fail('ENTITY_EXISTS');s.entities.push(e);};
 switch(a.type){
  case 'workspace.initialize':break;
  case 'agent.register':add({kind:'agent',...a.input,active:true});break;
  case 'agent.configure':{const e=entity(s,a.input.id,'agent');e.roles=a.input.roles;e.active=a.input.active;break;}
  case 'repository.register':add({kind:'repository',...a.input});break;
  case 'workflow.create':add({kind:'workflow',...a.input,state:'planned'});break;
  case 'task.create':add({kind:'task',...a.input,state:'todo'});break;
  case 'task.assign':{
   const t=requireTaskWritable(s,a.input.id),who=entity(s,a.input.agentId,'agent');
   if(!who.active||!who.roles.includes('developer'))fail('INVALID_ASSIGNEE');
   s.relationships=s.relationships.filter(r=>!(r.kind==='assigned_to'&&r.from===t.id));s.relationships.push({kind:'assigned_to',from:t.id,to:who.id});break;
  }
  case 'relationship.add':{
   const r=a.input.relationship;requireTaskWritable(s,r.from);
   if(r.kind==='assigned_to')fail('USE_ASSIGN_ACTION');
   if(r.kind==='concerns'&&(!c.domain||c.domain.born!==r.worldBorn||!c.domain.actorIds.includes(r.to)))fail('DOMAIN_SOURCE_MISMATCH');
   if(s.relationships.some(v=>v.kind===r.kind&&v.from===r.from&&v.to===r.to))fail('RELATION_EXISTS');
   if(r.kind==='part_of'&&entity(s,r.to,'workflow').state==='completed')fail('WORKFLOW_COMPLETED');
   s.relationships.push(r);break;
  }
  case 'relationship.remove':{
   const r=a.input.relationship;requireTaskWritable(s,r.from);if(r.kind==='assigned_to')fail('USE_ASSIGN_ACTION');
   const at=s.relationships.findIndex(v=>v.kind===r.kind&&v.from===r.from&&v.to===r.to&&v.worldBorn===r.worldBorn);if(at<0)fail('RELATION_NOT_FOUND');s.relationships.splice(at,1);break;
  }
  case 'task.transition':{
   const t=entity(s,a.input.id,'task'),next=a.input.state;
   const transitions={todo:['in_progress','cancelled'],in_progress:['in_review','cancelled'],in_review:['in_progress','done','cancelled'],done:['todo'],cancelled:['todo']};
   if(!transitions[t.state].includes(next))fail('INVALID_TRANSITION');
   const member=outgoing(s,t.id,'part_of')[0];if(member&&entity(s,member.to,'workflow').state!=='active')fail('WORKFLOW_NOT_ACTIVE');
   if(next!=='todo'&&next!=='cancelled'){
    if(!assigned(s,t.id)||!entity(s,assigned(s,t.id)!,'agent').active)fail('ASSIGNEE_REQUIRED');
    if(outgoing(s,t.id,'depends_on').some(r=>entity(s,r.to,'task').state!=='done'))fail('DEPENDENCY_BLOCKED');
   }
   if(next==='done'&&t.category!=='review'){const proof=requireEvidence(s,t.id,c);const pr=entity(s,outgoing(s,t.id,'targets')[0].to,'pull_request');if(!a.input.expectedHeadSha||a.input.expectedHeadSha!==pr.headSha||proof.headSha!==a.input.expectedHeadSha)fail('APPROVED_HEAD_CHANGED');t.approvedHeadSha=proof.headSha;pr.evidence=proof;}
   if(next==='todo')delete t.approvedHeadSha;t.state=next;break;
  }
  case 'workflow.transition':{
   const flow=entity(s,a.input.id,'workflow');if(flow.state===a.input.state||flow.state==='completed')fail('INVALID_TRANSITION');
   if(a.input.state==='completed'){
    if(flow.state!=='active')fail('INVALID_TRANSITION');
    const tasks=s.relationships.filter(r=>r.kind==='part_of'&&r.to===flow.id).map(r=>entity(s,r.from,'task'));
    if(!tasks.length||tasks.some(t=>t.state!=='done'||outgoing(s,t.id,'depends_on').some(r=>entity(s,r.to,'task').state!=='done')))fail('WORKFLOW_BLOCKED');
    for(const t of tasks)if(t.category!=='review'){const e=requireEvidence(s,t.id,c);if(t.approvedHeadSha!==e.headSha)fail('APPROVED_HEAD_CHANGED');}
   }
   flow.state=a.input.state;break;
  }
  case 'pull_request.track':{
   const e=c.evidence.get(a.input.id);if(!e||e.number!==a.input.number||e.verifiedAt!==c.now)fail('VERIFIED_SOURCE_REQUIRED');entity(s,a.input.repositoryId,'repository');
   add({kind:'pull_request',...a.input,headSha:e.headSha,evidence:e});break;
  }
  case 'checks.refresh':{const pr=entity(s,a.input.id,'pull_request'),e=c.evidence.get(pr.id);if(!e||e.repositoryId!==pr.evidence.repositoryId||e.number!==pr.number||e.verifiedAt!==c.now)fail('VERIFIED_SOURCE_REQUIRED');pr.headSha=e.headSha;pr.evidence=e;break;}
  case 'credential.issue':if(!entity(s,a.input.agentId,'agent').active)fail('AGENT_INACTIVE',403);break;
  case 'credential.revoke':break;
 }
 try{return assertConsistent(s);}catch{return fail('INCONSISTENT_CHANGE');}
}
export const readiness=(s:State,id:string,now:number)=>({id,blockers:blockers(s,id,now),mergeExecutionEnabled:false});

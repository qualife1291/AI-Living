import {fail,type Principal,type State,type Action,type Role} from './schema.ts';
import {entity,assigned,outgoing} from './graph.ts';
export const ROLE_CAPABILITIES:Record<Role,readonly string[]>={
 reader:['development.read'],developer:['development.read','task.develop'],reviewer:['development.read','task.review'],maintainer:['development.read','task.manage','workflow.manage','pull_request.track'],auditor:['development.read','audit.read'],'domain-reader':['domain.read'],
};
export const permissionRoleEntities=Object.entries(ROLE_CAPABILITIES).map(([role,capabilities])=>({id:'permission_role:'+role,kind:'permission_role' as const,role,capabilities,readOnly:true}));
export const permissionRelationships=(s:State)=>s.entities.flatMap(e=>e.kind==='agent'?e.roles.map(role=>({kind:'has_permission_role' as const,from:e.id,to:'permission_role:'+role,readOnly:true})):[]);
export function rolesFor(s:State,p:Principal):Role[]{if(p.kind==='owner')return [];const a=entity(s,p.id,'agent');if(!a.active)fail('AGENT_INACTIVE',403);return a.roles;}
const capabilitiesFor=(s:State,p:Principal)=>new Set(rolesFor(s,p).flatMap(r=>ROLE_CAPABILITIES[r]));
export function mayRead(s:State,p:Principal,view:string){
 if(p.kind==='owner')return;const capabilities=capabilitiesFor(s,p);
 const needed=view==='audit'?'audit.read':view==='domain'?'domain.read':'development.read';
 if(!capabilities.has(needed))fail('PERMISSION_DENIED',403);
}
/** Pure server policy. No LLM, network, ambient identity, or caller-supplied roles. */
export function authorize(s:State,p:Principal,a:Action){
 const capabilities=capabilitiesFor(s,p),owner=p.kind==='owner',maintainer=owner||capabilities.has('task.manage'),reviewer=owner||capabilities.has('task.review');
 const ownerActions=['workspace.initialize','agent.register','agent.configure','repository.register','credential.issue','credential.revoke'];
 if(ownerActions.includes(a.type)){if(!owner)fail('OWNER_REQUIRED',403);return;}
 if(a.type==='task.transition'){
  const t=entity(s,a.input.id,'task'),mine=p.kind==='agent'&&assigned(s,t.id)===p.id;
  if(a.input.state==='done') {if(!reviewer)fail('REVIEWER_REQUIRED',403);if(mine)fail('SELF_APPROVAL_DENIED',403);}
  else if(a.input.state==='cancelled'||a.input.state==='todo'){if(!maintainer)fail('MAINTAINER_REQUIRED',403);}
  else if(a.input.state==='in_progress'&&t.state==='in_review'){if(!reviewer)fail('REVIEWER_REQUIRED',403);}
  else if(!owner&&!(capabilities.has('task.develop')&&mine))fail('ASSIGNEE_REQUIRED',403);
 }else if(a.type==='checks.refresh'){if(!maintainer&&!reviewer)fail('PERMISSION_DENIED',403);}
 else if(!maintainer)fail('MAINTAINER_REQUIRED',403);
}
export function requireTaskWritable(s:State,id:string){
 const t=entity(s,id,'task');if(t.state==='done'||t.state==='cancelled')fail('TERMINAL_TASK');
 const member=outgoing(s,id,'part_of')[0];if(member&&entity(s,member.to,'workflow').state==='completed')fail('WORKFLOW_COMPLETED');
 return t;
}

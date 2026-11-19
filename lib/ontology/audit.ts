import {actionSchema,type Principal,type State} from './schema.ts';
import type {ActionContext} from './registry.ts';
import {rolesFor} from './policy.ts';
/** Store the decision and safe mutation parameters, never free text, bearer
 * headers, credential hashes/secrets, prompts or arbitrary rejected payloads. */
export function auditContext(action:unknown,p?:Principal,s?:State,context?:ActionContext){
 const parsed=actionSchema.safeParse(action);if(!parsed.success)return {inputValidated:false};
 const input=parsed.data.input,parameters:Record<string,unknown>={};
 for(const key of ['id','roles','active','fullName','checks','category','state','agentId','repositoryId','number','relationship','expectedHeadSha','credentialId','ttlSeconds'])if(key in input)parameters[key]=input[key as keyof typeof input];
 return {ontologyVersion:1,policyVersion:'ontology-policy-v1',inputValidated:true,parameters,...(p&&s?{grantedRoles:p.kind==='owner'?['owner']:rolesFor(s,p)}:{}),...(context?.evidence.size?{evidence:[...context.evidence].map(([id,evidence])=>({id,...evidence}))}:{}),...(context?.domain?{domainSource:{born:context.domain.born,revision:context.domain.revision}}:{})};
}
export function actionLabel(action:unknown){const parsed=actionSchema.safeParse(action);return parsed.success?parsed.data.type:'unrecognized';}

import {z} from 'zod';
export const LIMITS={entities:512,relationships:2048,stateBytes:262144,requestBytes:8192} as const;
export const roleSchema=z.enum(['reader','developer','reviewer','maintainer','auditor','domain-reader']);
export type Role=z.infer<typeof roleSchema>;
export type Principal={kind:'owner'}|{kind:'agent';id:string;credentialId?:string};
export const idSchema=z.string().regex(/^(agent|repository|workflow|task|pull_request):[a-z0-9][a-z0-9_-]{0,79}$/);
export const shaSchema=z.string().regex(/^[a-f0-9]{40}$/);
const title=z.string().trim().min(1).max(160),revision=z.number().int().nonnegative();
export const checkRequirementSchema=z.object({workflow:z.string().regex(/^\.github\/workflows\/[a-zA-Z0-9_-]+\.ya?ml$/),job:z.string().min(1).max(100),definitionSha:shaSchema}).strict();
export const evidenceSchema=z.object({repositoryId:z.number().int().positive(),number:z.number().int().positive(),headSha:shaSchema,verifiedAt:z.number().int().nonnegative(),checks:z.array(z.object({workflow:z.string(),job:z.string(),definitionSha:shaSchema,workflowId:z.number().int().positive(),runId:z.number().int().nonnegative(),attempt:z.number().int().nonnegative(),status:z.enum(['success','failure','pending','missing'])}).strict()).min(1).max(8)}).strict();
export type Evidence=z.infer<typeof evidenceSchema>;
export const entitySchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('agent'),id:idSchema,name:title,roles:z.array(roleSchema).min(1).max(6).refine(a=>new Set(a).size===a.length),active:z.boolean()}).strict(),
 z.object({kind:z.literal('repository'),id:idSchema,fullName:z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/).max(180),checks:z.array(checkRequirementSchema).min(1).max(8).refine(a=>new Set(a.map(c=>c.workflow+'\0'+c.job)).size===a.length)}).strict(),
 z.object({kind:z.literal('workflow'),id:idSchema,title,state:z.enum(['planned','active','completed'])}).strict(),
 z.object({kind:z.literal('task'),id:idSchema,title,category:z.enum(['code','bug','review']),state:z.enum(['todo','in_progress','in_review','done','cancelled']),approvedHeadSha:shaSchema.optional()}).strict(),
 z.object({kind:z.literal('pull_request'),id:idSchema,repositoryId:idSchema,number:z.number().int().positive(),headSha:shaSchema,evidence:evidenceSchema}).strict(),
]);
export type Entity=z.infer<typeof entitySchema>;
export type EntityKind=Entity['kind'];
export const relationshipSchema=z.object({kind:z.enum(['assigned_to','depends_on','part_of','targets','concerns']),from:idSchema,to:z.string().min(1).max(160),worldBorn:z.string().datetime().optional()}).strict();
export type Relationship=z.infer<typeof relationshipSchema>;
export const stateSchema=z.object({version:z.literal(1),entities:z.array(entitySchema).max(LIMITS.entities),relationships:z.array(relationshipSchema).max(LIMITS.relationships)}).strict();
export type State=z.infer<typeof stateSchema>;
export const emptyState=():State=>({version:1,entities:[],relationships:[]});
const input=<T extends z.ZodRawShape>(shape:T)=>z.object(shape).strict();
const action=<N extends string,T extends z.ZodRawShape>(type:N,shape:T)=>z.object({type:z.literal(type),input:input(shape)}).strict();
export const actionSchema=z.discriminatedUnion('type',[
 action('workspace.initialize',{}),
 action('agent.register',{id:idSchema,name:title,roles:z.array(roleSchema).min(1).max(6)}),
 action('agent.configure',{id:idSchema,roles:z.array(roleSchema).min(1).max(6),active:z.boolean()}),
 action('repository.register',{id:idSchema,fullName:z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/).max(180),checks:z.array(checkRequirementSchema).min(1).max(8)}),
 action('workflow.create',{id:idSchema,title}),
 action('workflow.transition',{id:idSchema,state:z.enum(['active','completed'])}),
 action('task.create',{id:idSchema,title,category:z.enum(['code','bug','review'])}),
 action('task.assign',{id:idSchema,agentId:idSchema}),
 action('relationship.add',{relationship:relationshipSchema}),
 action('relationship.remove',{relationship:relationshipSchema}),
 action('task.transition',{id:idSchema,state:z.enum(['todo','in_progress','in_review','done','cancelled']),expectedHeadSha:shaSchema.optional()}),
 action('pull_request.track',{id:idSchema,repositoryId:idSchema,number:z.number().int().positive()}),
 action('checks.refresh',{id:idSchema}),
 action('credential.issue',{agentId:idSchema,ttlSeconds:z.number().int().min(60).max(604800)}),
 action('credential.revoke',{credentialId:z.string().uuid()}),
]);
export type Action=z.infer<typeof actionSchema>;
export const attemptSchema=z.object({operationId:z.string().uuid(),expectedRevision:revision,action:z.object({type:z.string().min(1).max(60),input:z.unknown()}).strict()}).strict();
export type Attempt=z.infer<typeof attemptSchema>;
export const resultSchema=z.object({ok:z.boolean(),code:z.string().max(64),revision,changed:z.boolean(),duplicate:z.boolean(),data:z.object({id:z.string().max(180).optional(),credentialId:z.string().uuid().optional(),token:z.string().regex(/^ont1_[a-f0-9]{64}$/).optional()}).strict().optional()}).strict();
export type Result=z.infer<typeof resultSchema>;
export class OntologyError extends Error {code:string;status:number;constructor(code:string,status=409){super(code);this.code=code;this.status=status;}}
export function fail(code:string,status=409):never {throw new OntologyError(code,status);}
export const principalKey=(p:Principal)=>p.kind==='owner'?'owner':p.id;
export function canonical(value:unknown,depth=0):string {
 if(depth>64)fail('INPUT_DEPTH_LIMIT',400);
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v,depth+1)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}

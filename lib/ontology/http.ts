import {z} from 'zod';
import {adminAllowed} from '../admin.ts';
import {readBoundedJson} from '../bounded-json.ts';
import {LIMITS,OntologyError,digest,entitySchema,relationshipSchema,type Principal} from './schema.ts';
import {readOntology,executeOntology} from './store.ts';
import {actionCatalog} from './registry.ts';
import {mayRead,permissionRoleEntities,permissionRelationships} from './policy.ts';
import {analyze} from './graph.ts';
import {readDomain,domainRefProblems} from './domain.ts';
import {queryEntitySchema,queryRelationshipSchema} from './view.ts';
import {createGitHubVerifier} from './github.ts';
type Settings={DB?:D1Database;XOM_ONTOLOGY_ENABLED?:string;XOM_ONTOLOGY_GITHUB_TOKEN?:string;XOM_ADMIN_USER_ID?:string;XOM_LOCAL_ADMIN?:string;XOM_OWNER_PRIVATE_ORIGIN?:string};
export const ontologyPath=(path:string)=>path==='/api/ontology'||path.startsWith('/api/ontology/');
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
/** Tokens grant access only inside this namespace. Roles never come from headers. */
export async function authenticateOntology(req:Request,settings:Settings,db:D1Database,now=Date.now()):Promise<Principal|null>{
 // An explicitly presented Bearer is always attenuated to its stored agent,
 // even for localhost/owner sessions. It cannot fall back to owner on failure.
 const url=new URL(req.url);if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return null;
 const authorization=req.headers.get('authorization');
 if(authorization){
  const match=/^Bearer (ont1_[a-f0-9]{64})$/.exec(authorization);if(!match)return null;
  const row=await db.prepare(`SELECT c.id,c.agent_id FROM ontology_credentials c,ontology_states s,json_each(s.data,'$.entities') a WHERE s.id='development' AND c.token_hash=? AND c.revoked_at IS NULL AND c.expires_at>? AND c.created_at<=? AND json_extract(a.value,'$.kind')='agent' AND json_extract(a.value,'$.id')=c.agent_id AND json_extract(a.value,'$.active')=1`).bind(await digest(match[1]),now,now).first<{id:string;agent_id:string}>();
  return row?{kind:'agent',id:row.agent_id,credentialId:row.id}:null;
 }
 return adminAllowed(req,{ownerId:settings.XOM_ADMIN_USER_ID,localAdmin:settings.XOM_LOCAL_ADMIN,privateOrigin:settings.XOM_OWNER_PRIVATE_ORIGIN})?{kind:'owner'}:null;
}
const querySchema=z.object({view:z.enum(['schema','actions','entities','relationships','analysis','domain','audit']).default('entities'),kind:z.string().max(60).optional(),from:z.string().max(160).optional(),to:z.string().max(160).optional(),after:z.string().max(512).default(''),limit:z.coerce.number().int().min(1).max(100).default(50),revision:z.coerce.number().int().nonnegative().optional()}).strict();
const statusFor=(code:string)=>code.startsWith('GITHUB_')?503:['PERMISSION_DENIED','OWNER_REQUIRED','REVIEWER_REQUIRED','MAINTAINER_REQUIRED','ASSIGNEE_REQUIRED','SELF_APPROVAL_DENIED','AGENT_INACTIVE','CREDENTIAL_INACTIVE'].includes(code)?403:code==='INVALID_ACTION'?400:409;
/** Explicit opt-in transport. Existing app APIs and scheduler remain untouched. */
export async function handleOntologyHttp(req:Request,settings:Settings):Promise<Response>{
 if(settings.XOM_ONTOLOGY_ENABLED!=='true')return json({error:'ONTOLOGY_DISABLED'},503);
 if(!settings.DB)return json({error:'ONTOLOGY_UNAVAILABLE'},503);
 const db=settings.DB;
 try{
  const principal=await authenticateOntology(req,settings,db);if(!principal)return json({error:'ONTOLOGY_AUTH_REQUIRED'},403);
  const url=new URL(req.url),path=url.pathname.replace(/\/+$/,'');
  if(path==='/api/ontology/actions'&&req.method==='POST'){
   const origin=req.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'ORIGIN_REJECTED'},403);
   const input=await readBoundedJson(req,LIMITS.requestBytes);if(!input.ok)return json({error:input.error},input.status);
   const result=await executeOntology(db,principal,input.value,{verifyGitHub:createGitHubVerifier(fetch,settings.XOM_ONTOLOGY_GITHUB_TOKEN)});return json(result,result.ok?200:statusFor(result.code));
  }
  if(path!=='/api/ontology')return json({error:'NOT_FOUND'},404);
  if(req.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
  const params:Record<string,string>={};for(const [key,value]of url.searchParams){if(key in params)return json({error:'INVALID_QUERY'},400);params[key]=value;}
  const parsed=querySchema.safeParse(params);if(!parsed.success)return json({error:'INVALID_QUERY'},400);
  const q=parsed.data,{state,revision}=await readOntology(db);mayRead(state,principal,q.view);
  if(q.revision!==undefined&&q.revision!==revision)return json({error:'REVISION_CONFLICT'},409);
  if(q.view==='schema')return json({version:1,entitySchema:z.toJSONSchema(queryEntitySchema),relationshipSchema:z.toJSONSchema(queryRelationshipSchema),persistentEntitySchema:z.toJSONSchema(entitySchema),persistentRelationshipSchema:z.toJSONSchema(relationshipSchema),limits:LIMITS,permissionRoles:permissionRoleEntities});
  if(q.view==='actions')return json(actionCatalog());
  if(q.view==='domain')return json(await readDomain(db));
  if(q.view==='analysis'){
   const refs=state.relationships.some(r=>r.kind==='concerns');return json({revision,...analyze(state,Date.now()),...(refs?{domainProblems:domainRefProblems(state,await readDomain(db))}:{})});
  }
  if(q.view==='audit'){
   if(q.after&&(!/^\d+$/.test(q.after)||!Number.isSafeInteger(Number(q.after))))return json({error:'INVALID_CURSOR'},400);
   const rows=(await db.prepare('SELECT seq,id,operation_id,kind,principal,action,context,before_revision,after_revision,result,created_at FROM ontology_audit WHERE seq>? ORDER BY seq LIMIT ?').bind(q.after?Number(q.after):0,q.limit+1).all()).results;
   const page=rows.slice(0,q.limit);return json({revision,items:page,next:rows.length>q.limit?String(page.at(-1)?.seq):null});
  }
  const rows=q.view==='entities'?[...state.entities,...permissionRoleEntities].filter(e=>!q.kind||e.kind===q.kind).map(e=>({key:e.id,value:e})):[...state.relationships,...permissionRelationships(state)].filter(r=>(!q.kind||r.kind===q.kind)&&(!q.from||r.from===q.from)&&(!q.to||r.to===q.to)).map(r=>({key:r.kind+':'+r.from+':'+r.to,value:r}));
  rows.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);const eligible=rows.filter(r=>r.key>q.after),page=eligible.slice(0,q.limit);
  return json({revision,items:page.map(p=>p.value),next:eligible.length>q.limit?page.at(-1)?.key:null});
 }catch(error){if(error instanceof OntologyError)return json({error:error.code},error.status);return json({error:'ONTOLOGY_UNAVAILABLE'},503);}
}

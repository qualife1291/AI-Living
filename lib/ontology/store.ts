import {attemptSchema,actionSchema,resultSchema,emptyState,fail,OntologyError,LIMITS,canonical,digest,principalKey,type State,type Principal,type Attempt,type Result,type Action} from './schema.ts';
import {assertConsistent,entity} from './graph.ts';
import {authorize,rolesFor} from './policy.ts';
import {applyAction,evidenceTargets,type ActionContext} from './registry.ts';
import {createGitHubVerifier,type GitHubVerifier} from './github.ts';
import {auditContext,actionLabel} from './audit.ts';
import {readDomain} from './domain.ts';
type Head={revision:number;data:string;nonce:string};
type Receipt={principal:string;request_hash:string;result:string};
export async function readOntology(db:D1Database):Promise<{revision:number;state:State;head:Head|null}>{
 const head=await db.prepare("SELECT revision,data,nonce FROM ontology_states WHERE id='development'").first<Head>();
 if(!head)return {revision:0,state:emptyState(),head:null};
 if(!Number.isSafeInteger(head.revision)||head.revision<1||new TextEncoder().encode(head.data).length>LIMITS.stateBytes)fail('ONTOLOGY_CORRUPT',503);
 try{return {revision:head.revision,state:assertConsistent(JSON.parse(head.data)),head};}catch{return fail('ONTOLOGY_CORRUPT',503);}
}
const lookup=(db:D1Database,id:string)=>db.prepare("SELECT principal,request_hash,result FROM ontology_audit WHERE operation_id=? AND kind='decision'").bind(id).first<Receipt>();
function replay(row:Receipt,key:string,hash:string):Result|null {
 if(row.principal!==key||row.request_hash!==hash)return null;
 const result=resultSchema.safeParse(JSON.parse(row.result));if(!result.success||result.data.data?.token)fail('AUDIT_CORRUPT',503);
 return {...result.data,duplicate:true};
}
async function logDenial(db:D1Database,a:Attempt,key:string,hash:string,revision:number,code:string,now:number,conflict=false):Promise<Result>{
 const result:Result={ok:false,code,revision,changed:false,duplicate:false},raw=JSON.stringify(result),id=crypto.randomUUID();
 const statement=db.prepare(`INSERT INTO ontology_audit(id,operation_id,kind,principal,request_hash,action,context,before_revision,after_revision,result,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,a.operationId,conflict?'replay_conflict':'decision',key,hash,actionLabel(a.action),JSON.stringify(auditContext(a.action)),revision,revision,raw,now);
 try{
  await db.batch([statement,db.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM ontology_audit WHERE id=? AND result=? AND principal=? AND request_hash=?) THEN 1 ELSE json('ontology_audit_assertion') END ok").bind(id,raw,key,hash)]);
 }catch{
  const existing=await lookup(db,a.operationId);if(existing){const r=replay(existing,key,hash);if(r)return r;}
  return fail('AUDIT_UNAVAILABLE',503);
 }
 return result;
}
export type StoreOptions={now?:number;verifyGitHub?:GitHubVerifier};
/** One canonical writer for every ontology mutation, including credentials. */
export async function executeOntology(db:D1Database,p:Principal,value:unknown,options:StoreOptions={}):Promise<Result>{
 const parsed=attemptSchema.safeParse(value);if(!parsed.success)return fail('INVALID_ENVELOPE',400);
 const attempt=parsed.data,now=options.now??Date.now(),key=principalKey(p),hash=await digest(canonical(attempt));
 const current=await readOntology(db),prior=await lookup(db,attempt.operationId);
 // Re-check current role/active status even for a retry of a previous success.
 let authError:OntologyError|undefined;try{rolesFor(current.state,p);if(p.kind==='agent'&&p.credentialId&&!await db.prepare('SELECT 1 ok FROM ontology_credentials WHERE id=? AND agent_id=? AND revoked_at IS NULL AND expires_at>? AND created_at<=?').bind(p.credentialId,p.id,now,now).first())fail('CREDENTIAL_INACTIVE',403);}catch(e){if(e instanceof OntologyError)authError=e;else throw e;}
 if(prior){
  if(!authError){const replayed=replay(prior,key,hash);if(replayed)return replayed;}
  return logDenial(db,attempt,key,hash,current.revision,authError?.code??'OPERATION_CONFLICT',now,true);
 }
 const denied=(code:string)=>logDenial(db,attempt,key,hash,current.revision,code,now);
 if(authError)return denied(authError.code);
 if(attempt.expectedRevision!==current.revision)return denied('REVISION_CONFLICT');
 const action=actionSchema.safeParse(attempt.action);if(!action.success)return denied('INVALID_ACTION');
 const a:Action=action.data;
 const context:ActionContext={now,evidence:new Map()};let next:State;
 try{
  authorize(current.state,p,a);
  if(a.type==='workspace.initialize'&&current.head)fail('ALREADY_INITIALIZED');
  if(a.type!=='workspace.initialize'&&!current.head)fail('NOT_INITIALIZED');
  const verify=options.verifyGitHub??createGitHubVerifier();
  if(a.type==='pull_request.track')context.evidence.set(a.input.id,await verify(entity(current.state,a.input.repositoryId,'repository'),a.input.number,now));
  const targets=evidenceTargets(current.state,a);if(targets.length>8)fail('EVIDENCE_REQUEST_LIMIT');
  await Promise.all(targets.map(async pr=>context.evidence.set(pr.id,await verify(entity(current.state,pr.repositoryId,'repository'),pr.number,now))));
  if(a.type==='relationship.add'&&a.input.relationship.kind==='concerns'){
   const d=await readDomain(db);context.domain={revision:d.source.revision,born:d.source.born,actorIds:d.entities.filter(e=>e.kind==='simulation_actor').map(e=>e.id)};
  }
  next=applyAction(current.state,p,a,context);
 }catch(error){if(error instanceof OntologyError)return denied(error.code);throw error;}
 const raw=JSON.stringify(next);if(new TextEncoder().encode(raw).length>LIMITS.stateBytes)return denied('WORKSPACE_LIMIT');
 const revision=current.revision+1,nonce=crypto.randomUUID(),auditId=crypto.randomUUID(),statements:D1PreparedStatement[]=[];
 let secret:string|undefined;
 const result:Result={ok:true,code:'OK',revision,changed:true,duplicate:false};
 if('id' in a.input)result.data={id:a.input.id};
 const source=context.domain;
 let sourceGuard=source?" AND EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND json_extract(data,'$.born')=?)":'';
 const sourceArgs:(string|number)[]=source?[source.revision,source.born]:[];
 if(p.kind==='agent'&&p.credentialId){sourceGuard+=' AND EXISTS(SELECT 1 FROM ontology_credentials WHERE id=? AND agent_id=? AND revoked_at IS NULL AND expires_at>? AND created_at<=?)';sourceArgs.push(p.credentialId,p.id,Math.max(now,Date.now()),now);}
 if(current.head)statements.push(db.prepare(`UPDATE ontology_states SET revision=?,data=?,nonce=?,updated_at=? WHERE id='development' AND revision=? AND data=? AND nonce=?${sourceGuard}`).bind(revision,raw,nonce,now,current.revision,current.head.data,current.head.nonce,...sourceArgs));
 else statements.push(db.prepare(`INSERT INTO ontology_states(id,revision,data,nonce,updated_at) SELECT 'development',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM ontology_states WHERE id='development')`).bind(revision,raw,nonce,now));
 const headGuard="EXISTS(SELECT 1 FROM ontology_states WHERE id='development' AND revision=? AND data=? AND nonce=?)"+sourceGuard;
 const headArgs=[revision,raw,nonce,...sourceArgs];let effectGuard='1';let effectArgs:(string|number|null)[]=[];
 if(a.type==='credential.issue'){
  const id=crypto.randomUUID();secret='ont1_'+Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const tokenHash=await digest(secret),expiry=now+a.input.ttlSeconds*1000;
  statements.push(db.prepare(`INSERT INTO ontology_credentials(id,agent_id,token_hash,created_at,expires_at) SELECT ?,?,?,?,? WHERE ${headGuard}`).bind(id,a.input.agentId,tokenHash,now,expiry,...headArgs));
  effectGuard='EXISTS(SELECT 1 FROM ontology_credentials WHERE id=? AND agent_id=? AND token_hash=? AND created_at=? AND expires_at=? AND revoked_at IS NULL)';effectArgs=[id,a.input.agentId,tokenHash,now,expiry];result.data={credentialId:id};
 }
 if(a.type==='credential.revoke'){
  const old=await db.prepare('SELECT id,agent_id,token_hash,expires_at,revoked_at FROM ontology_credentials WHERE id=?').bind(a.input.credentialId).first<{id:string;agent_id:string;token_hash:string;expires_at:number;revoked_at:number|null}>();
  if(!old||old.revoked_at!==null)return denied('CREDENTIAL_NOT_ACTIVE');
  statements.push(db.prepare(`UPDATE ontology_credentials SET revoked_at=? WHERE id=? AND agent_id=? AND token_hash=? AND expires_at=? AND revoked_at IS NULL AND ${headGuard}`).bind(now,old.id,old.agent_id,old.token_hash,old.expires_at,...headArgs));
  effectGuard='EXISTS(SELECT 1 FROM ontology_credentials WHERE id=? AND agent_id=? AND token_hash=? AND expires_at=? AND revoked_at=?)';effectArgs=[old.id,old.agent_id,old.token_hash,old.expires_at,now];result.data={credentialId:old.id};
 }
 const stored=JSON.stringify(resultSchema.parse(result)),details=JSON.stringify(auditContext(a,p,current.state,context));
 statements.push(db.prepare(`INSERT INTO ontology_audit(id,operation_id,kind,principal,request_hash,action,context,before_revision,after_revision,result,created_at) VALUES (?,?,'decision',?,?,?,?,?,?,CASE WHEN ${headGuard} AND (${effectGuard}) THEN ? ELSE NULL END,?)`).bind(auditId,attempt.operationId,key,hash,a.type,details,current.revision,revision,...headArgs,...effectArgs,stored,now));
 // SELECT has no write cost; a malformed JSON branch aborts the entire D1 batch.
 statements.push(db.prepare(`SELECT CASE WHEN ${headGuard} AND (${effectGuard}) AND EXISTS(SELECT 1 FROM ontology_audit WHERE id=? AND operation_id=? AND principal=? AND request_hash=? AND result=? AND context=?) THEN 1 ELSE json('ontology_atomicity_assertion') END ok`).bind(...headArgs,...effectArgs,auditId,attempt.operationId,key,hash,stored,details));
 try{await db.batch(statements);}catch{
  const existing=await lookup(db,attempt.operationId);if(existing){const r=replay(existing,key,hash);if(r)return r;return logDenial(db,attempt,key,hash,(await readOntology(db)).revision,'OPERATION_CONFLICT',now,true);}
  const latest=await readOntology(db);if(latest.revision!==current.revision)return logDenial(db,attempt,key,hash,latest.revision,'REVISION_CONFLICT',now);
  return fail('ATOMIC_WRITE_FAILED',503);
 }
 return resultSchema.parse({...result,...(secret?{data:{...result.data,token:secret}}:{})});
}

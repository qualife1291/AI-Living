import {z} from 'zod';
import {fail,shaSchema,evidenceSchema,type Entity,type Evidence} from './schema.ts';
export type Repository=Extract<Entity,{kind:'repository'}>;
export type GitHubVerifier=(repository:Repository,number:number,now:number)=>Promise<Evidence>;
const repoSchema=z.object({id:z.number().int().positive(),full_name:z.string()});
const prSchema=z.object({number:z.number().int().positive(),state:z.literal('open'),draft:z.literal(false),merged:z.literal(false),head:z.object({sha:shaSchema,repo:repoSchema}),base:z.object({repo:repoSchema})});
const workflowSchema=z.object({id:z.number().int().positive(),path:z.string(),state:z.literal('active')});
const runSchema=z.object({id:z.number().int().positive(),workflow_id:z.number().int().positive(),head_sha:shaSchema,run_attempt:z.number().int().positive(),status:z.string(),conclusion:z.string().nullable(),event:z.enum(['push','pull_request','workflow_dispatch']),head_repository:repoSchema});
const jobSchema=z.object({name:z.string(),head_sha:shaSchema,status:z.string(),conclusion:z.string().nullable()});
/** Fixed GitHub origin; no merge endpoint, arbitrary URLs, or client CI attestations. */
export function createGitHubVerifier(fetcher:typeof fetch=fetch,token?:string):GitHubVerifier {
 return async(repository,number,now)=>{
  const signal=AbortSignal.timeout(10000);
  const get=async(path:string):Promise<unknown>=>{
   let response:Response;try{response=await fetcher('https://api.github.com'+path,{method:'GET',redirect:'manual',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'AI-Living-Ontology',...(token?{Authorization:'Bearer '+token}:{})},signal});}catch{return fail('GITHUB_UNAVAILABLE',503);}
   if(!response.ok)return fail('GITHUB_UNAVAILABLE',503);
   const reader=response.body?.getReader();if(!reader)return fail('GITHUB_INVALID_RESPONSE',503);
   const chunks:Uint8Array[]=[];let bytes=0;
   try{
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>524288){void reader.cancel().catch(()=>{});return fail('GITHUB_RESPONSE_LIMIT',503);}chunks.push(value);}
    const raw=new Uint8Array(bytes);let at=0;for(const c of chunks){raw.set(c,at);at+=c.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
   }catch{return fail('GITHUB_INVALID_RESPONSE',503);}finally{reader.releaseLock();}
  };
  try{
   const prefix='/repos/'+repository.fullName.split('/').map(encodeURIComponent).join('/');
   const repo=repoSchema.parse(await get(prefix));if(repo.full_name.toLowerCase()!==repository.fullName.toLowerCase())return fail('GITHUB_REPOSITORY_MISMATCH',503);
   const readPR=async()=>{const pr=prSchema.parse(await get(prefix+'/pulls/'+number));if(pr.number!==number||pr.base.repo.id!==repo.id||pr.head.repo.id!==repo.id)return fail('GITHUB_PR_SCOPE',409);return pr;};
   const pr=await readPR(),checks:Evidence['checks']=[];
   for(const required of repository.checks){
    const definition=z.object({type:z.literal('file'),sha:shaSchema}).parse(await get(prefix+'/contents/'+required.workflow.split('/').map(encodeURIComponent).join('/')+'?ref='+pr.head.sha));
    if(definition.sha!==required.definitionSha)return fail('GITHUB_WORKFLOW_DEFINITION_CHANGED',409);
    const workflow=workflowSchema.parse(await get(prefix+'/actions/workflows/'+encodeURIComponent(required.workflow.split('/').at(-1)!)));
    if(workflow.path!==required.workflow)return fail('GITHUB_WORKFLOW_MISMATCH',503);
    const raw=z.object({workflow_runs:z.array(runSchema).max(100)}).parse(await get(prefix+'/actions/workflows/'+workflow.id+'/runs?head_sha='+pr.head.sha+'&per_page=100'));
    // Never fall back to an older successful run when the latest is pending/failed.
    const latest=raw.workflow_runs.filter(r=>r.head_sha===pr.head.sha).sort((a,b)=>b.id-a.id||b.run_attempt-a.run_attempt)[0];
    let status:Evidence['checks'][number]['status']='missing';
    if(latest){
     if(latest.workflow_id!==workflow.id||latest.head_repository.id!==repo.id)return fail('GITHUB_RUN_SCOPE',503);
     status=latest.status!=='completed'?'pending':latest.conclusion!=='success'?'failure':'missing';
     if(latest.status==='completed'&&latest.conclusion==='success'){
      const jobs=z.object({total_count:z.number().int().max(100),jobs:z.array(jobSchema).max(100)}).parse(await get(prefix+'/actions/runs/'+latest.id+'/attempts/'+latest.run_attempt+'/jobs?per_page=100'));
      if(jobs.total_count!==jobs.jobs.length)return fail('GITHUB_JOBS_INCOMPLETE',503);
      const matching=jobs.jobs.filter(j=>j.name===required.job);
      if(matching.length===1&&matching[0].head_sha===pr.head.sha)status=matching[0].status==='completed'&&matching[0].conclusion==='success'?'success':matching[0].status==='completed'?'failure':'pending';
     }
    }
    checks.push({workflow:required.workflow,job:required.job,definitionSha:required.definitionSha,workflowId:workflow.id,runId:latest?.id??0,attempt:latest?.run_attempt??0,status});
   }
   if((await readPR()).head.sha!==pr.head.sha)return fail('GITHUB_HEAD_CHANGED',409);
   return evidenceSchema.parse({repositoryId:repo.id,number,headSha:pr.head.sha,verifiedAt:now,checks});
  }catch(error){if(error instanceof Error&&error.name==='ZodError')return fail('GITHUB_INVALID_RESPONSE',503);throw error;}
 };
}

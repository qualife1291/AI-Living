/** Shared test-only GitHub transport. Never imported by app/runtime. */
export function githubFixture(){
 let mode='pass',prReads=0;const calls=[];
 return {calls,setMode(value){mode=value;prReads=0;},async fetch(input){
  const u=new URL(typeof input==='string'?input:input.url??String(input));calls.push(u.href);
  if(u.origin!=='https://api.github.com')throw Error('Unexpected external origin');
  if(mode==='offline')throw Error('synthetic network outage');
  if(mode==='oversize')return new Response(' '.repeat(524289));
  const path=decodeURIComponent(u.pathname),repo={id:7,full_name:'qualife1291/AI-Living'},sha='a'.repeat(40),head=mode==='head_changed'&&path.endsWith('/pulls/10')&&++prReads%2===0?'b'.repeat(40):sha;
  if(path==='/repos/qualife1291/AI-Living')return Response.json(repo);
  if(path.endsWith('/pulls/10'))return Response.json({number:10,state:'open',draft:false,merged:false,head:{sha:head,repo:mode==='fork'?{...repo,id:99}:repo},base:{repo}});
  if(path.includes('/contents/.github/workflows/asset-maintenance.yml'))return Response.json({type:'file',sha:(mode==='workflow_changed'?'d':'c').repeat(40)});
  if(path.endsWith('/actions/workflows/asset-maintenance.yml'))return Response.json({id:8,path:mode==='workflow_spoof'?'.github/workflows/other.yml':'.github/workflows/asset-maintenance.yml',state:'active'});
  if(path.endsWith('/actions/workflows/8/runs')){
   const good={id:9,workflow_id:8,head_sha:sha,run_attempt:1,status:'completed',conclusion:'success',event:'push',head_repository:repo};
   return Response.json({workflow_runs:mode==='latest_failed'?[good,{...good,id:10,conclusion:'failure'}]:[{...good,...(mode==='pending'?{status:'in_progress',conclusion:null}:{}),...(mode==='wrong_sha'?{head_sha:'b'.repeat(40)}:{}),...(mode==='run_spoof'?{workflow_id:99}:{}),...(mode==='run_repo_spoof'?{head_repository:{...repo,id:99}}:{})}]});
  }
  if(path.endsWith('/actions/runs/9/attempts/1/jobs'))return Response.json({total_count:mode==='truncated_jobs'?101:1,jobs:[{name:mode==='job_spoof'?'unrelated':'verify',head_sha:mode==='job_sha'?'b'.repeat(40):sha,status:'completed',conclusion:mode==='skipped_job'?'skipped':'success'}]});
  return Response.json({error:'Unexpected fixture endpoint'},{status:404});
 }};
}

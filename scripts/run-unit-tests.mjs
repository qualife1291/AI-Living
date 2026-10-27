/** Bounded process workers; no shell, network, DB or fail-fast skips. */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';
const suites=JSON.parse(readFileSync(new URL('./unit-suites.json',import.meta.url),'utf8'));
const requested=process.env.XOM_TEST_JOBS===undefined?Math.min(4,availableParallelism()):Number(process.env.XOM_TEST_JOBS);
if(!Number.isInteger(requested)||requested<1||requested>8)throw Error('XOM_TEST_JOBS must be an integer from 1 to 8');
if(process.argv.includes('--list')) { for(const args of suites)console.log('node '+args.join(' '));process.exit(0); }
let cursor=0;const results=[],started=performance.now();
async function worker() {
  while(cursor<suites.length) {
    const index=cursor++,args=suites[index],begin=performance.now();
    const result=await new Promise(resolve=>{
      const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe'],env:process.env});
      let output='';const append=data=>{output=(output+data.toString()).slice(-128*1024);};
      child.stdout.on('data',append);child.stderr.on('data',append);
      child.on('error',error=>{output+=error.message;});
      child.on('close',(code,signal)=>resolve({index,args,ok:code===0,code,signal,ms:performance.now()-begin,output}));
    });
    results.push(result);console.log(`${result.ok?'PASS':'FAIL'} ${args.join(' ')} (${(result.ms/1000).toFixed(2)}s)`);
    if(!result.ok)process.stderr.write(result.output+'\n');
  }
}
await Promise.all(Array.from({length:Math.min(requested,suites.length)},worker));
const failed=results.filter(r=>!r.ok);
console.log(JSON.stringify({suite:'unit-summary',total:suites.length,passed:results.length-failed.length,failed:failed.map(r=>({command:r.args,code:r.code,signal:r.signal})),workers:requested,seconds:+((performance.now()-started)/1000).toFixed(2)}));
process.exitCode=failed.length?1:0;

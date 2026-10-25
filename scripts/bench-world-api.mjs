import {performance} from 'node:perf_hooks';
const origin=process.env.TEST_ORIGIN;if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local benchmark only');
const times=[],sizes=[];let errors=0;
for(let batch=0;batch<8;batch++)await Promise.all(Array.from({length:8},async()=>{const start=performance.now();const r=await fetch(origin+'/api/world?compact=1');const body=await r.text();times.push(performance.now()-start);sizes.push(body.length);if(!r.ok)errors++;}));
times.sort((a,b)=>a-b);console.log(JSON.stringify({requests:times.length,errors,p50Ms:Math.round(times[Math.floor(times.length*.5)]),p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1)),maxResponseChars:Math.max(...sizes)}));if(errors)process.exitCode=1;

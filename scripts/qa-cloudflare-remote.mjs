#!/usr/bin/env node
// Remote QA only: tests the isolated Cloudflare QA environment, NOT production.
// Pass CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET via a secret manager.
// Does NOT print credentials; has no write action unless explicitly opted in.
const origin = 'https://ai-living-qa.hoanglonglea1mtl.workers.dev';
const id = process.env.CF_ACCESS_CLIENT_ID;
const secret = process.env.CF_ACCESS_CLIENT_SECRET;
if (!id || !secret) {
  console.error('Missing CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET. Supply via private agent environment.');
  process.exit(2);
}
if (process.env.QA_ORIGIN && process.env.QA_ORIGIN !== origin) {
  console.error('Refusing to test an origin other than the isolated QA Worker.');
  process.exit(2);
}
const headers = {
  'CF-Access-Client-Id': id,
  'CF-Access-Client-Secret': secret,
  'Cache-Control': 'no-store',
};
const run = async (label, path, opts = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(origin + path, { ...opts, headers: {...headers,...opts.headers}, redirect:'manual', signal:controller.signal });
    const type = res.headers.get('content-type') || '';
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }
    const ok = res.status === 200 && type.includes('json') && data !== null;
    console.log(JSON.stringify({test:label,ok,status:res.status,contentType:type,path,
      ...(label === 'world' && ok ? {revision:data.revision,people:data.world?.people?.length} : {}),
      ...(label === 'learning' && ok ? {sampleCount:data.experiences?.length || 0,scope:data.scope} : {}),
    }));
    if(!ok) throw Error(label+' failed (invalid response or unauthenticated).');
    return data;
  } finally {clearTimeout(timeout);}
};
try {
  const world = await run('world', '/api/world?compact=1');
  if (!world?.world || !Number.isSafeInteger(world.revision)) throw Error('World schema or revision invalid');
  await run('learning', '/api/living/learning');
  if (process.env.QA_ENABLE_PULSE === 'ai_living_qa') {
    await run('pulse', '/api/living/pulse', {method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  } else {
    console.log(JSON.stringify({test:'pulse',skipped:true,reason:'set QA_ENABLE_PULSE=ai_living_qa to mutate only QA'}));
  }
  console.log(JSON.stringify({qa:'passed',origin}));
} catch(e) {
  console.error(JSON.stringify({qa:'failed',error:e instanceof Error?e.message:String(e)}));
  process.exitCode = 1;
}

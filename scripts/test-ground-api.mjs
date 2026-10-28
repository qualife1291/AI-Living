/** Fresh compiled Worker + isolated D1 only. No real DB, Site, cron or browser. */
import assert from 'node:assert/strict';
import { realpathSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed } from '../lib/world.ts';
const require = createRequire(realpathSync(resolve('node_modules/wrangler/package.json')));
const { Miniflare } = require('miniflare');
const born = '2026-10-28T00:00:00.000Z', start = Date.parse(born);
const files = readdirSync('dist/server', { recursive: true }).filter(p => typeof p === 'string' && p.endsWith('.js'));
const options = {
  modules: [{ type: 'ESModule', path: resolve('dist/server/__ground_fixture.mjs'), contents: `import worker from './index.js';const NativeDate=Date;let current=${start + 1000};globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[current]))}static now(){return current}};export default{fetch(req,env,ctx){const url=new URL(req.url);if(url.pathname==='/__fixture/time'){current=Number(url.searchParams.get('now'));return Response.json({ok:true})}return worker.fetch(req,env,ctx)}};` }, ...files.map(path => ({ type: 'ESModule', path: resolve('dist/server', path) }))],
  modulesRoot: resolve('dist/server'), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'],
  d1Databases: ['DB'], bindings: { XOM_LOCAL_ADMIN: 'false', XOM_ADMIN_USER_ID: 'fixture-owner' }, inspectorPort: 0,
};
const mf = new Miniflare(options), url = 'http://localhost/api/living/ground';
const post = (value, headers = {}, origin = url) => mf.dispatchFetch(origin, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value) });
const time = ms => mf.dispatchFetch(`http://localhost/__fixture/time?now=${start + ms}`);
try {
  const sessionId = randomUUID(), body = { sessionId };
  assert.equal((await post(body)).status, 403);
  assert.equal((await post(body, { 'oai-authenticated-user-id': 'fixture-owner' })).status, 403, 'owner without local-admin still denied');
  await mf.setOptions({ ...options, bindings: { XOM_LOCAL_ADMIN: 'true', XOM_ADMIN_USER_ID: 'fixture-owner' } });
  assert.equal((await post(body, { 'oai-authenticated-user-id': 'fixture-owner' }, 'https://owner-private.example/api/living/ground')).status, 403, 'verified remote owner still denied');
  assert.equal((await post(body, { origin: 'https://example.invalid' })).status, 403);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post({ ...body, nowMs: 999999 })).status, 400);
  assert.equal((await post({ ...body, position: [0, 0] })).status, 400);
  assert.equal((await post(new Uint8Array([0xc0, 0xaf]))).status, 400);
  assert.equal((await post(JSON.stringify({ sessionId, text: 'đ'.repeat(1100) }))).status, 413);
  assert.equal((await post(body)).status, 503, 'missing0009 does not bootstrap state/world');
  let db = await mf.getD1Database('DB');
  assert.equal((await db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='worlds'").first()).n, 0);
  await db.prepare('CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT)').run();
  await db.prepare('CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT)').run();
  await db.prepare('CREATE TABLE episodes(id TEXT PRIMARY KEY,data TEXT)').run();
  await db.prepare('CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT)').run();
  for (const sql of readFileSync('drizzle/0009_ground_timeline.sql', 'utf8').split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
  const world = { ...structuredClone(seed), born };
  await db.prepare("INSERT INTO worlds VALUES('home',4,?)").bind(JSON.stringify(world)).run();
  await db.prepare("INSERT INTO memories VALUES('old','preserve')").run(); await db.prepare("INSERT INTO episodes VALUES('old','preserve')").run(); await db.prepare("INSERT INTO learning_policies VALUES('an','preserve')").run();
  const snapshot = async () => JSON.stringify(await Promise.all(['worlds', 'memories', 'episodes', 'learning_policies'].map(async table => (await db.prepare(`SELECT * FROM ${table}`).all()).results)));
  const before = await snapshot();
  const status = await post(body); assert.equal(status.status, 200); assert.equal((await status.json()).exists, false);
  const preview = await post({ sessionId, action: 'preview' }); assert.equal(preview.status, 200); assert.equal((await preview.json()).batchArrivals.length, 0);
  assert.equal((await db.prepare('SELECT count(*) n FROM ground_sessions').first()).n, 0); assert.equal(await snapshot(), before);
  const startBody = { sessionId, action: 'start', operationId: randomUUID() };
  const started = await post(startBody); assert.equal(started.status, 200); const initial = await started.json();
  assert.equal(initial.eligibleForReward, false); assert.equal(initial.eligibleForP2P, false); assert.equal(initial.sequence, 1);
  assert.equal((await (await post(startBody)).json()).duplicate, true); assert.equal(await snapshot(), before);
  world.people[0].plan = { createdAt: born, pausedMs: 0, from: 'Sân chung', simStartedAt: 1000, steps: [{ location: 'Công viên', activity: 'Đi tới công viên', duration: 180, kind: 'rest' }] };
  await db.prepare("UPDATE worlds SET data=?,revision=5 WHERE id='home'").bind(JSON.stringify(world)).run();
  const adopted = await post({ sessionId, action: 'advance', operationId: randomUUID(), expectedCheckpoint: initial.checkpoint }); assert.equal(adopted.status, 200); const adoption = await adopted.json();
  const actualSource = await snapshot();
  await time(61000);
  const advance = { sessionId, action: 'advance', operationId: randomUUID(), expectedCheckpoint: adoption.checkpoint };
  const [first, second] = await Promise.all([post(advance), post(advance)]); assert.equal(first.status, 200); assert.equal(second.status, 200);
  const [a, b] = await Promise.all([first.json(), second.json()]); assert.equal([a, b].filter(r => !r.duplicate).length, 1); assert.equal(a.checkpoint, b.checkpoint);
  assert.equal(a.batchArrivals.length, 1); assert.equal(a.batchArrivals[0].actorId, 'an'); assert.equal(a.steps, 600);
  assert.deepEqual(await (await post(body)).json(), await (await post(body)).json(), 'two readers get one committed snapshot');
  assert.equal((await post({ ...advance, operationId: randomUUID() })).status, 409); assert.equal(await snapshot(), actualSource);
  const savedState = await db.prepare('SELECT * FROM ground_sessions WHERE id=?').bind(sessionId).first();
  await time(62000);
  await db.prepare('CREATE TRIGGER ground_ignore BEFORE INSERT ON ground_batches BEGIN SELECT RAISE(IGNORE); END').run();
  assert.equal((await post({ sessionId, action: 'advance', operationId: randomUUID(), expectedCheckpoint: a.checkpoint })).status, 503, 'silent receipt ignore rolls entire D1 batch back');
  assert.deepEqual(await db.prepare('SELECT * FROM ground_sessions WHERE id=?').bind(sessionId).first(), savedState);
  assert.equal((await db.prepare('SELECT count(*) n FROM ground_batches WHERE session_id=?').bind(sessionId).first()).n, 3);
  await db.prepare('DROP TRIGGER ground_ignore').run();
  assert.equal(await snapshot(), actualSource);
  world.paused = true; await db.prepare("UPDATE worlds SET data=?,revision=6 WHERE id='home'").bind(JSON.stringify(world)).run();
  assert.equal((await post({ sessionId, action: 'advance', operationId: randomUUID(), expectedCheckpoint: a.checkpoint })).status, 409);
  await mf.setOptions({ ...options, bindings: { XOM_LOCAL_ADMIN: 'false', XOM_ADMIN_USER_ID: 'fixture-owner' } });
  db = await mf.getD1Database('DB');
  assert.equal((await post(body, { 'oai-authenticated-user-id': 'fixture-owner' })).status, 403);
  console.log(JSON.stringify({ suite: 'ground-api-compiled-d1', localOwnerOnly: true, remoteVerifiedOwnerDenied: true, bodySchemaUtf8Bytes: true, missingMigrationNoBootstrap: true, previewZeroWrites: true, serverPlanOnlyNoClientPoseTime: true, fixed600StepMotion: true, arrivalReceipts: 1, concurrentSameOperationOneCommit: true, checkpointCAS: true, silentReceiptIgnoreD1Rollback: true, committedReadersAgree: true, pause: true, userWorldPoliciesHistoryMemoriesPreserved: true, eligibleForReward: false, eligibleForP2P: false, productionAccess: false }));
} finally { await mf.dispose(); }

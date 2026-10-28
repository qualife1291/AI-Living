import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { seed } from '../lib/world.ts';
import { distance } from '../lib/life.ts';
import { startGroundTimeline, advanceGroundTimeline, groundHash, validateGroundState, GROUND_SCOPE, GROUND_LIMITS } from '../lib/living/ground-timeline.ts';
import { runGroundAuthority, groundRequestSchema } from '../lib/living/ground-store.ts';
import { bodySegmentWalkable, WALK_RADIUS } from '../lib/city/walk-ground.ts';
import { groundTimelineCommand } from './ground-timeline.mjs';
const born = '2026-10-28T00:00:00.000Z', origin = Date.parse(born), now = t => origin + t;
const world = () => ({ ...structuredClone(seed), born });
const plan = (start = 1000, location = 'Công viên', extra = {}) => ({ createdAt: new Date(now(start)).toISOString(), pausedMs: 0, from: 'Sân chung', simStartedAt: start, steps: [{ location, activity: 'Đi tới địa điểm trong mô phỏng ground local', duration: 180, kind: 'walk-pet' === extra.kind ? extra.kind : 'rest' }], ...extra });
const request = (sessionId, action = 'status', expectedCheckpoint = 'new', operationId) => groundRequestSchema.parse({ sessionId, action, expectedCheckpoint, ...(operationId ? { operationId } : {}) });
const w = world(), initial = await startGroundTimeline(w, 4, randomUUID(), now(1000));
assert.equal(initial.actors.every(a => a.status === 'baseline' && !a.plan), true);
w.people[0].plan = plan();
let adopted = await advanceGroundTimeline(initial, w, 5, now(1000));
assert.equal(adopted.steps, 0); assert.equal(adopted.arrivals.length, 0);
const whole = await advanceGroundTimeline(adopted.state, w, 5, now(61000));
assert.equal(whole.steps, 600); assert.ok(whole.arrivals.some(a => a.actorId === 'an'));
assert.equal(whole.arrivals.every(a => a.authority === GROUND_SCOPE && !a.eligibleForReward && !a.eligibleForP2P), true);
let chunked = adopted.state; const pieces = [];
for (let t = 11000; t <= 61000; t += 10000) { const next = await advanceGroundTimeline(chunked, w, 5, now(t)); chunked = next.state; pieces.push(...next.arrivals); }
assert.deepEqual(chunked.actors, whole.state.actors); assert.deepEqual(pieces, whole.arrivals);
assert.equal((await advanceGroundTimeline(whole.state, w, 5, now(121000))).arrivals.length, 0, 'one arrival per step');
const late = await advanceGroundTimeline(initial, w, 5, now(61000));
assert.deepEqual(late.state.actors.map(a => a.position), initial.actors.map(a => a.position), 'newly observed plan cannot move in the past');
const backlog = await advanceGroundTimeline(adopted.state, w, 5, now(150000));
assert.equal(backlog.steps, 600); assert.equal(backlog.backlogMs, 89000);
assert.equal(backlog.state.cursorSimMs, 61000);
const currentCopy = structuredClone(whole.state); w.paused = true;
const pause = await advanceGroundTimeline(whole.state, w, 5, now(121000)); assert.deepEqual(pause.state, currentCopy); assert.equal(pause.steps, 0); w.paused = false;
await assert.rejects(advanceGroundTimeline(whole.state, w, 5, now(60000)), /rewind/);
await assert.rejects(advanceGroundTimeline(whole.state, { ...w, born: '2026-10-27T00:00:00Z' }, 5, now(121000)), /identity/);
const unsupported = structuredClone(w); unsupported.people[0].plan = plan(61000, 'Thư viện', { transport: 'bicycle' });
const unsupportedResult = await advanceGroundTimeline(whole.state, unsupported, 6, now(121000));
assert.equal(unsupportedResult.state.actors[0].status, 'unsupported'); assert.deepEqual(unsupportedResult.state.actors[0].position, whole.state.actors[0].position);
const cancellation = structuredClone(w); delete cancellation.people[0].plan;
const cancelled = await advanceGroundTimeline(adopted.state, cancellation, 6, now(61000)); assert.equal(cancelled.arrivals.length, 0);
const expired = structuredClone(w); expired.people[0].plan = plan(1000, 'Thư viện');
const expiredResult = await advanceGroundTimeline(initial, expired, 5, now(200000)); assert.equal(expiredResult.state.actors[0].status, 'expired'); assert.equal(expiredResult.arrivals.length, 0);
const baselineWorld = world(); baselineWorld.people[0].plan = plan();
const baseline = await startGroundTimeline(baselineWorld, 5, randomUUID(), now(1000));
assert.equal((await advanceGroundTimeline(baseline, baselineWorld, 5, now(100000))).arrivals.length, 0, 'no baseline historical arrivals');
const corrupt = structuredClone(whole.state); corrupt.actors[0].path[0] = [NaN, 0]; await assert.rejects(validateGroundState(corrupt));
const forgedGoal = structuredClone(whole.state); forgedGoal.actors[0].goal = [0, 0]; await assert.rejects(validateGroundState(forgedGoal), /route/);

// Real moving-disc closest approach oracle, speed cap and footprints at every fixed step.
const crowded = world(); crowded.people.forEach(p => { p.location = 'Sân chung'; });
let moving = await startGroundTimeline(crowded, 0, randomUUID(), now(1000));
crowded.people.forEach(p => { p.plan = plan(1000, 'Sân chung'); });
moving = (await advanceGroundTimeline(moving, crowded, 1, now(1000))).state;
let sweptPairs = 0;
for (let t = 1100; t <= 15100; t += 100) {
  const before = moving; moving = (await advanceGroundTimeline(moving, crowded, 1, now(t))).state;
  for (let i = 0; i < 3; i++) {
    const a = before.actors[i].position, b = moving.actors[i].position;
    assert.ok(distance(a, b) <= 1.6000001); assert.ok(bodySegmentWalkable(a, b, WALK_RADIUS));
    for (let j = 0; j < i; j++) {
      const c = before.actors[j].position, d = moving.actors[j].position, x = a[0] - c[0], z = a[1] - c[1], dx = b[0] - a[0] - d[0] + c[0], dz = b[1] - a[1] - d[1] + c[1], den = dx * dx + dz * dz;
      const at = den ? Math.max(0, Math.min(1, -(x * dx + z * dz) / den)) : 0;
      assert.ok(Math.hypot(x + at * dx, z + at * dz) >= WALK_RADIUS * 2 + .35 - 1e-7); sweptPairs++;
    }
  }
}

class Fixture {
  constructor() {
    this.sql = new DatabaseSync(':memory:'); this.sql.exec('PRAGMA foreign_keys=ON; CREATE TABLE worlds(id TEXT PRIMARY KEY,revision INTEGER,data TEXT); CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT); CREATE TABLE episodes(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE learning_policies(actor_id TEXT PRIMARY KEY,data TEXT)');
    this.sql.exec(readFileSync('drizzle/0009_ground_timeline.sql', 'utf8'));
    this.source = world(); this.revision = 4; this.writeWorld();
    this.sql.exec("INSERT INTO memories VALUES('old-memory','keep');INSERT INTO episodes VALUES('old-event','keep');INSERT INTO learning_policies VALUES('an','keep')");
  }
  writeWorld() { this.sql.prepare("INSERT INTO worlds VALUES('home',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision").run(this.revision, JSON.stringify(this.source)); }
  userRows() { return JSON.stringify(['worlds', 'memories', 'episodes', 'learning_policies'].map(t => this.sql.prepare(`SELECT * FROM ${t}`).all())); }
  prepare(sql, args = []) { return { sql, args, bind: (...values) => this.prepare(sql, values), first: async () => { const row = this.sql.prepare(sql).get(...args); return row ? { ...row } : null; }, all: async () => ({ results: this.sql.prepare(sql).all(...args).map(r => ({ ...r })), success: true, meta: {} }) }; }
  async batch(statements) {
    if (this.beforeWrite) { const fn = this.beforeWrite; this.beforeWrite = null; fn(); }
    this.sql.exec('BEGIN IMMEDIATE');
    try { const results = statements.map(st => /^SELECT/.test(st.sql) ? { success: true, results: this.sql.prepare(st.sql).all(...st.args).map(r => ({ ...r })), meta: { changes: 0 } } : { success: true, results: [], meta: { changes: Number(this.sql.prepare(st.sql).run(...st.args).changes) } }); this.sql.exec('COMMIT'); return results; }
    catch (error) { this.sql.exec('ROLLBACK'); throw error; }
  }
  close() { this.sql.close(); }
}
const db = new Fixture();
try {
  const id = randomUUID(), base = db.userRows();
  const absent = await runGroundAuthority(db, request(id), now(1000)); assert.equal(absent.exists, false);
  assert.equal((await runGroundAuthority(db, request(id, 'preview'), now(1000))).mode, 'preview');
  assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_sessions').get().n, 0);
  const start = request(id, 'start', 'new', randomUUID()), started = await runGroundAuthority(db, start, now(1000));
  assert.equal(started.sequence, 1); assert.equal(started.batchArrivals.length, 0); assert.equal(db.userRows(), base);
  assert.equal((await runGroundAuthority(db, start, now(2000))).duplicate, true);
  db.source.people[0].plan = plan(); db.revision++; db.writeWorld();
  let head = started.checkpoint;
  const adopt = request(id, 'advance', head, randomUUID()), adoption = await runGroundAuthority(db, adopt, now(1000)); head = adoption.checkpoint;
  const before = db.userRows(), command = request(id, 'advance', head, randomUUID());
  const [one, two] = await Promise.all([runGroundAuthority(db, command, now(61000)), runGroundAuthority(db, command, now(61000))]);
  assert.equal([one, two].filter(r => !r.duplicate).length, 1); assert.equal(one.checkpoint, two.checkpoint); assert.equal(one.batchArrivals.length, 1);
  assert.equal(db.userRows(), before);
  const after = await runGroundAuthority(db, request(id), now(999999)); assert.equal(after.checkpoint, one.checkpoint);
  assert.deepEqual(await runGroundAuthority(db, request(id), now(61000)), after, 'different viewers read the same committed position');
  await assert.rejects(runGroundAuthority(db, { ...command, expectedCheckpoint: one.checkpoint }, now(61000)), /operation-reused/);
  await assert.rejects(runGroundAuthority(db, request(id, 'advance', head, randomUUID()), now(61000)), /checkpoint-conflict/);
  const receipt = db.sql.prepare('SELECT * FROM ground_batches WHERE session_id=? AND sequence=3').get(id);
  db.sql.prepare("UPDATE ground_batches SET data=replace(data,'server-ground-core-static-v1','server-ground-core-static-v2') WHERE id=?").run(receipt.id);
  await assert.rejects(runGroundAuthority(db, request(id), now(61000)));
  db.sql.prepare('UPDATE ground_batches SET data=? WHERE id=?').run(receipt.data, receipt.id);
  const rehashed = JSON.parse(receipt.data); rehashed.basis.backlogMs++;
  db.sql.prepare('UPDATE ground_batches SET data=?,checksum=? WHERE id=?').run(JSON.stringify(rehashed), await groundHash(rehashed.basis), receipt.id);
  await assert.rejects(runGroundAuthority(db, request(id), now(61000)), /receipt-integrity/, 'state pins the last receipt digest, not only its self-hash');
  db.sql.prepare('UPDATE ground_batches SET data=?,checksum=? WHERE id=?').run(receipt.data, receipt.checksum, receipt.id);
  const savedState = db.sql.prepare('SELECT * FROM ground_sessions WHERE id=?').get(id);
  for (const definition of ['BEFORE UPDATE ON ground_sessions', 'BEFORE INSERT ON ground_batches']) {
    db.sql.exec(`CREATE TRIGGER ignore_update_fixture ${definition} BEGIN SELECT RAISE(IGNORE); END`);
    await assert.rejects(runGroundAuthority(db, request(id, 'advance', one.checkpoint, randomUUID()), now(62000)));
    assert.deepEqual(db.sql.prepare('SELECT * FROM ground_sessions WHERE id=?').get(id), savedState, 'failed advance rolls cursor back');
    assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_batches WHERE session_id=?').get(id).n, 3);
    db.sql.exec('DROP TRIGGER ignore_update_fixture');
  }
  const safeRows = db.userRows();
  for (const target of ['ground_sessions', 'ground_batches']) {
    const freshId = randomUUID(); db.sql.exec(`CREATE TRIGGER ignore_fixture BEFORE INSERT ON ${target} BEGIN SELECT RAISE(IGNORE); END`);
    await assert.rejects(runGroundAuthority(db, request(freshId, 'start', 'new', randomUUID()), now(61000)));
    assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_sessions WHERE id=?').get(freshId).n, 0);
    assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_batches WHERE session_id=?').get(freshId).n, 0);
    assert.equal(db.userRows(), safeRows); db.sql.exec('DROP TRIGGER ignore_fixture');
  }
  const raceId = randomUUID(); db.beforeWrite = () => { db.source.weather = 'source race'; db.revision++; db.writeWorld(); };
  await assert.rejects(runGroundAuthority(db, request(raceId, 'start', 'new', randomUUID()), now(61000)), /source-conflict/);
  assert.equal(db.sql.prepare('SELECT count(*) n FROM ground_sessions WHERE id=?').get(raceId).n, 0);
  db.source.paused = true; db.revision++; db.writeWorld();
  await assert.rejects(runGroundAuthority(db, request(randomUUID(), 'start', 'new', randomUUID()), now(61000)), /paused/);
  const current = (await runGroundAuthority(db, request(id), now(61000))).checkpoint;
  await assert.rejects(runGroundAuthority(db, request(id, 'advance', current, randomUUID()), now(62000)), /paused/);
  const send = async (_url, init) => Response.json(await runGroundAuthority(db, groundRequestSchema.parse(JSON.parse(init.body)), now(61000)));
  assert.equal((await groundTimelineCommand({ sessionId: id }, send)).checkpoint, current);
  for (const origin of ['https://example.com', 'http://localhost.evil.test', 'file:///tmp/', 'http://user:pass@127.0.0.1', 'http://127.0.0.1/path']) await assert.rejects(groundTimelineCommand({ sessionId: id, origin }, () => { throw Error('must not send'); }));
  for (const body of [{ ok: true }, { ...after, eligibleForReward: true }, { ...after, actors: [...after.actors].reverse() }]) await assert.rejects(groundTimelineCommand({ sessionId: id }, async () => Response.json(body)));
  await assert.rejects(groundTimelineCommand({ sessionId: id }, async () => new Response('<html>private</html>')));
  await assert.rejects(groundTimelineCommand({ sessionId: id }, async () => new Response('x'.repeat(32769))), /response-budget/);
  for (const extra of [{ nowMs: 9999999 }, { position: [0, 0] }, { action: 'advance' }, { action: 'status', operationId: randomUUID() }]) assert.equal(groundRequestSchema.safeParse({ sessionId: id, ...extra }).success, false);
} finally { db.close(); }
assert.equal(GROUND_LIMITS.stepsPerBatch, 600);
console.log(JSON.stringify({ suite: 'ground-timeline', fixedStepDeterminism: true, chunkedEqualsWhole: true, sweptPeerPairs: sweptPairs, staticCollisionAndSpeedCap: true, noBackdatedOrBaselineArrivals: true, backlogBoundedNotSkipped: true, planReplacementAndUnsupported: true, pauseRewindIdentityGuards: true, previewZeroWrites: true, worldPoliciesMemoriesHistoryPreserved: true, exactWorldAndCheckpointCAS: true, durableOperationIdempotency: true, concurrentSameOperationOneBatch: true, receiptTamperDetected: true, silentSessionAndReceiptIgnoreRollBack: true, committedReadersAgree: true, loopbackClientAndAckGuards: true, rewardAndP2PEligible: false, productionAccess: false }));

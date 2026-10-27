import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { seed } from '../lib/world.ts';
import { computeSimMs, updateClock } from '../lib/clock.ts';
import { actorsAt, places } from '../lib/life.ts';
import { initializeAgent, chooseScenario, settleLearning, prepareLearning, cohortIds, hasUnfinishedLearning } from '../lib/living/learning.ts';
import { initializeLiving, population, residentRoutine, planLivingTurn, turnId, crowdAt } from '../lib/living/engine.ts';

const now = Date.parse('2026-10-26T02:00:00Z');
const context = { date: '2026-10-26', hour: 9, weekday: 1, timezone: 'Asia/Ho_Chi_Minh', fetchedAt: new Date(now).toISOString(),
  weather: { status: 'unavailable', source: 'fixture', observedAt: null, temperature: null, humidity: null, precipitation: null, code: null, windKph: null },
  calendar: { weekend: false, holidays: [], source: 'fixture', status: 'unavailable', coverage: 'fixture' }, traffic: { status: 'unavailable', label: 'fixture' }, festivals: { status: 'unavailable', label: 'fixture' } };
const results = [];
const suiteStarted = performance.now();
const test = (name, run) => { try { run(); results.push({ name, ok: true }); } catch (error) { results.push({ name, ok: false, error: error.message }); } };
const fresh = () => ({ ...structuredClone(seed), born: '2026-10-25T17:00:00Z', living: initializeLiving(now) });

test('five-minute turn IDs are versioned, stable on retry and distinct from historical fifteen-minute IDs', () => {
  assert.match(turnId(now), /^living-v2-2026-10-26-108$/);
  assert.equal(turnId(now + 299999), turnId(now));
  assert.notEqual(turnId(now + 300000), turnId(now));
  assert.notEqual(turnId(now), 'living-2026-10-26-36');
  assert.match(turnId(Date.parse('2026-10-26T17:00:00Z')), /^living-v2-2026-10-27-0$/);
});

test('needs change decisions before emergency thresholds and repeated choices lose novelty', () => {
  const well = initializeAgent('test'); well.energy = 80; well.hunger = 20;
  const baseline = chooseScenario(well, 'test', context);
  const hungry = { ...structuredClone(well), hunger: 55 };
  assert.equal(chooseScenario(hungry, 'test', context).kind, 'eat');
  assert.notEqual(baseline.kind, 'eat');
  const tired = { ...structuredClone(well), energy: 30 };
  assert.equal(chooseScenario(tired, 'test', context).id, 'rest-home');
  well.recentActions = Array(6).fill(baseline.id);
  assert.notEqual(chooseScenario(well, 'test', context).id, baseline.id);
  for (let i = 0; i < 80; i++) assert.ok(!['minor-injury', 'traffic-check', 'job-change'].includes(chooseScenario(initializeAgent(`person-${i}`), `person-${i}`, { ...context, hour: 6 + i % 16 }).id));
});

test('reward reflects useful outcomes and does not award more skill or free positive rest', () => {
  const complete = (agent, scenarioId) => { agent.pending = { id: 'outcome', scenarioId, startedSimMs: 0, durationMs: 180000, completed: false }; return settleLearning(agent, 180000, new Date(now).toISOString(), true); };
  const hungry = initializeAgent('hungry'), full = initializeAgent('full'); hungry.energy = full.energy = 80; hungry.hunger = 80; full.hunger = 10;
  assert.ok(complete(hungry, 'lunch') && complete(full, 'lunch'));
  assert.ok(hungry.lastReward > full.lastReward);
  assert.equal(hungry.skill, 0); assert.equal(full.skill, 0);
  const rested = initializeAgent('rested'); rested.energy = 100;
  complete(rested, 'rest-home'); assert.ok(rested.lastReward <= 0);
  const student = initializeAgent('student'); complete(student, 'learn-trade');
  assert.equal(student.skill, 2, 'Original scenario skill amount stays unchanged');
  assert.equal(settleLearning(student, 900000, new Date(now).toISOString(), true), false);
  assert.equal(student.samples, 1);
});

test('every actor has independent bounded need drift without time-only skill or memory awards', () => {
  const w = fresh(), state = w.living;
  prepareLearning(w, state, now);
  const before = structuredClone(state.learning);
  prepareLearning(w, state, now + 3600000);
  const hungerChanges = new Set();
  for (const [id, agent] of Object.entries(state.learning)) {
    assert.ok(agent.energy < before[id].energy);
    assert.ok(agent.hunger > before[id].hunger);
    assert.equal(agent.skill, before[id].skill); assert.equal(agent.samples, 0);
    assert.equal(agent.memories.length, 0);
    hungerChanges.add((agent.hunger - before[id].hunger).toFixed(4));
  }
  assert.ok(hungerChanges.size > 3);
  w.clock = updateClock(w, now + 3600000, { paused: true }); w.paused = true;
  const paused = structuredClone(state.learning);
  prepareLearning(w, state, now + 7200000);
  assert.deepEqual(state.learning, paused);
});

test('bounded rotating cohorts cover everyone with both five-minute and hourly callers', () => {
  const base = initializeLiving(now);
  for (const count of [24, 25, 61, 120, 240]) {
    const state = structuredClone(base), all = population({ ...state, catalog: { ...state.catalog, maxPopulation: 240 } }, '2027-03-01');
    state.residents = all.slice(0, count);
    const first = cohortIds(state, 1200), groups = Math.ceil(count / first.length);
    assert.ok(first.length <= 24 && first.length >= Math.min(12, count));
    for (const cadence of [1, 12]) {
      const covered = new Set();
      for (let i = 0; i < groups; i++) {
        const ids = cohortIds(state, 1200 + i * cadence);
        assert.equal(ids.length, new Set(ids).size);
        for (const id of ids) covered.add(id);
      }
      assert.equal(covered.size, count, `${count} residents at ${cadence * 5} minute cadence`);
    }
    assert.deepEqual(cohortIds(state, 1200), cohortIds(state, 1200));
  }
});

test('unfinished plans and pending outcomes survive new slots on a slow simulation clock', () => {
  let w = fresh();
  w.clock = { pausedAt: null, pausedMs: 0, scale: .1, anchors: [{ realMs: now, simMs: computeSimMs(w.born, undefined, now), scale: .1 }] };
  w = planLivingTurn(w, context, now).world;
  const original = structuredClone(w), oldPlan = structuredClone(w.people.find(p => p.id === 'an').plan), pending = structuredClone(w.living.learning.an.pending);
  for (let i = 1; i <= 5; i++) {
    const at = now + i * 300000;
    const result = planLivingTurn(w, { ...context, fetchedAt: new Date(at).toISOString() }, at);
    assert.deepEqual(result.world.people.find(p => p.id === 'an').plan, oldPlan);
    assert.deepEqual(result.state.learning.an.pending, pending);
    assert.equal(result.turn.location, actorsAt(w, at).find(a => a.id === 'an').location);
    assert.equal(result.turn.dialogue.length, 0);
    assert.match(result.turn.summary, /tiếp tục kế hoạch/);
    assert.equal(result.state.learning.an.samples, 0);
    for (const r of original.living.residents) if (hasUnfinishedLearning(original.living.learning[r.id], r.plan, computeSimMs(w.born, w.clock, at)))
      assert.deepEqual(result.state.residents.find(n => n.id === r.id).plan, r.plan);
    w = result.world;
  }
  const fullPlanRealMs = oldPlan.steps.reduce((sum,step)=>sum+step.duration,0)*1000/.1;
  const finished = planLivingTurn(w, { ...context, fetchedAt: new Date(now + fullPlanRealMs).toISOString() }, now + fullPlanRealMs);
  assert.equal(finished.state.learning.an.samples, 1);
  assert.ok(finished.state.experiences.some(e => e.id === pending.id));
  assert.notEqual(finished.state.learning.an.pending.id, pending.id);
});

test('NPCs have independent purposeful micro-agendas, finite movement and quiet nights without world mutation', () => {
  const w = fresh(), before = JSON.stringify(w), signatures = new Set();
  let transitions = 0;
  for (const resident of w.living.residents) {
    const list = residentRoutine(w.living, resident);
    assert.ok(Math.abs(list.reduce((sum, step) => sum + step.duration, 0) - 86400) < .001);
    assert.ok(list.every(step => step.duration > 0 && places[step.location] && step.activity.length <= 80));
    assert.ok(list.length > 80);
    const changed = list.slice(1).filter((step, i) => step.location !== list[i].location).length;
    assert.ok(changed > 30, resident.id);
    transitions += changed;
    signatures.add(JSON.stringify(list.map(step => [step.location, step.duration])));
  }
  assert.equal(signatures.size, w.living.residents.length);
  for (const hour of [0, 3, 5, 23]) {
    const at = Date.parse('2026-10-25T17:00:00Z') + hour * 3600000;
    assert.ok(crowdAt(w.living, w, at).every(a => !a.walking && a.kind === 'rest' && a.location === 'Khu dân cư'));
  }
  for (let minute = 6 * 60; minute < 22 * 60; minute += 5) for (const a of crowdAt(w.living, w, Date.parse(w.born) + minute * 60000)) assert.ok(a.position.every(Number.isFinite));
  assert.equal(JSON.stringify(w), before);
  assert.ok(transitions > 1000);
});

test('planner preserves money and memories, and keeps normal night turns quiet', () => {
  const w = fresh(), before = JSON.stringify(w), result = planLivingTurn(w, context, now);
  assert.equal(JSON.stringify(w), before);
  for (const person of w.people) {
    const after = result.world.people.find(p => p.id === person.id);
    assert.equal(after.money, person.money);
    assert.deepEqual(after.memories, person.memories);
  }
  const night = planLivingTurn(w, { ...context, hour: 23 }, now);
  assert.equal(night.turn.dialogue.length, 0);
  assert.equal(night.turn.location, 'Phòng An');
});

for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.ok ? '' : `: ${result.error}`}`);
console.log(JSON.stringify({ suite: 'autonomy', cases: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, elapsedMs: Math.round(performance.now() - suiteStarted) }));
if (results.some(r => !r.ok)) process.exitCode = 1;

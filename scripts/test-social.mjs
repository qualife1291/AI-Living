import assert from 'node:assert/strict';
import scripts from '../data/social-scenes.json' with { type: 'json' };
import { seed } from '../lib/world.ts';
import { actorsAt, distance, places, project, simulationTime } from '../lib/life.ts';
import { hashSeed, updateClock } from '../lib/clock.ts';
import { crowdAt, initializeLiving, residentRoutine } from '../lib/living/engine.ts';
import { socialFrame, spaceActors } from '../lib/living/social.ts';
import { reviewNarrative } from '../lib/living/director.ts';
import { PLACES, STEP_KINDS } from '../lib/event-schema.ts';

const born = Date.parse('2026-10-24T17:00:00Z'); // midnight in Vietnam
const noon = born + 12 * 3600_000;
const world = { ...structuredClone(seed), born: new Date(born).toISOString() };
world.living = initializeLiving(born);
const results = [];
function test(name, run) {
  try { run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
const legacyOffset = (w, id) => {
  const i = w.people.findIndex(p => p.id === id), h = hashSeed(id);
  return i >= 0 ? [(i - 1) * 25, i * 7] : [((h % 9) - 4) * 7, ((Math.floor(h / 9) % 7) - 3) * 5];
};
function stationary(w, id, location = 'Sân chung', rawOffset = [0, 0]) {
  const actor = project(id, w.people.find(p => p.id === id)?.name ?? id, [{ location, activity: 'Nghỉ chân', kind: 'social', duration: 3600 }], 120, 'routine', location);
  const offset = legacyOffset(w, id);
  actor.position = [places[location][0] + offset[0] + rawOffset[0], places[location][1] + offset[1] + rawOffset[1]];
  return actor;
}
const pair = [stationary(world, 'an'), stationary(world, 'binh')];

test('authored scene data: venues, kinds, timing and alternating short replies', () => {
  assert.equal(scripts.source, 'agent-authored');
  assert.equal(new Set(scripts.scenes.map(s => s.id)).size, scripts.scenes.length);
  assert.ok(scripts.scenes.length >= 10);
  for (const s of scripts.scenes) {
    assert.ok(s.places.length && s.places.every(p => PLACES.includes(p)), s.id);
    assert.ok(s.kinds.length && s.kinds.every(k => STEP_KINDS.includes(k)), s.id);
    assert.ok(s.turns.length >= 4 && s.turns.length <= 6);
    assert.equal(s.turns.reduce((n, t) => n + t.seconds, 0) + 4, s.durationSeconds);
    for (const [i, t] of s.turns.entries()) {
      assert.equal(t.speaker, i % 2 ? 'b' : 'a');
      assert.ok(t.text.length <= 120 && t.text.length > 0);
      assert.ok(['wave', 'nod', 'explain', 'point', 'laugh', 'listen'].includes(t.gesture));
    }
  }
});

test('63 stationary residents: unique stable slots and minimum 14 world-unit spacing', () => {
  const w = structuredClone(world);
  const originals = w.living.residents;
  w.living.residents = Array.from({ length: 60 }, (_, i) => ({ ...originals[i % originals.length], id: `diverse-${i * 7919 + 101}`, name: `Người ${i}` }));
  const input = [...w.people, ...w.living.residents].map(p => stationary(w, p.id, 'Quảng trường'));
  const spaced = spaceActors(w, input);
  assert.equal(spaced.length, 63);
  for (let i = 0; i < spaced.length; i++) for (let j = i + 1; j < spaced.length; j++)
    assert.ok(distance(spaced[i].position, spaced[j].position) >= 14 - 1e-8, `${spaced[i].id}/${spaced[j].id}`);
  assert.deepEqual(spaceActors(w, input), spaced);
});

test('240 population keeps late focused/encounter residents visible, unique and within 150-unit staging radius', () => {
  const w = structuredClone(world), original = w.living.residents;
  w.living.residents = Array.from({ length: 240 }, (_, i) => ({ ...original[i % original.length], id: `late-resident-${i}`, name: `Người ${i}` }));
  w.livingTurn = { residentId: 'late-resident-239' };
  const crowd = crowdAt(w.living, w, noon, 'late-resident-238');
  assert.equal(crowd.length, 60);
  assert.ok(crowd.some(a => a.id === 'late-resident-239'));
  assert.ok(crowd.some(a => a.id === 'late-resident-238'));
  const input = [...w.people, ...crowd].map(p => stationary(w, p.id, 'Quảng trường'));
  const spaced = spaceActors(w, input);
  for (let i = 0; i < spaced.length; i++) {
    assert.ok(distance(spaced[i].position, places['Quảng trường']) < 150, `${spaced[i].id} staged too far away`);
    for (let j = i + 1; j < spaced.length; j++) assert.ok(distance(spaced[i].position, spaced[j].position) >= 14 - 1e-8);
  }
  const earlier = spaceActors(w, input.filter(a => !a.id.endsWith('-239') && !a.id.endsWith('-238')));
  for (const a of earlier) assert.deepEqual(a.position, spaced.find(b => b.id === a.id).position);
});

test('walking-to-standing arrival stays continuous for every visible actor', () => {
  let arrivals = 0;
  // Search near actual schedule transitions, then inspect the adjacent 1 ms frames.
  for (const hour of [6, 7, 8, 11, 12, 14, 16, 17.5, 18.5, 20, 21, 22]) {
    let before = [...actorsAt(world, born + hour * 3600_000), ...crowdAt(world.living, world, born + hour * 3600_000)];
    for (let second = 1; second <= 180; second++) {
      const at = born + hour * 3600_000 + second * 1000;
      const after = [...actorsAt(world, at), ...crowdAt(world.living, world, at)];
      for (const [i, a] of after.entries()) {
        if (!before[i]?.walking || a.walking) continue;
        let lo = at - 1000, hi = at;
        for (let n = 0; n < 12; n++) {
          const mid = Math.floor((lo + hi) / 2), list = [...actorsAt(world, mid), ...crowdAt(world.living, world, mid)];
          if (list[i].walking) lo = mid; else hi = mid;
        }
        const atLo = [...actorsAt(world, lo), ...crowdAt(world.living, world, lo)];
        const atHi = [...actorsAt(world, hi), ...crowdAt(world.living, world, hi)];
        const oldPosition = spaceActors(world, atLo)[i].position, newPosition = spaceActors(world, atHi)[i].position;
        assert.ok(distance(oldPosition, newPosition) < .2, `${a.id} jumps ${distance(oldPosition, newPosition)} at arrival`);
        arrivals++;
      }
      before = after;
    }
  }
  assert.ok(arrivals > 15, `Need actual arrivals, found ${arrivals}`);
});

test('one pair has alternating complete replies, listener pose and minimum quiet cooldown', () => {
  const groups = new Map();
  for (let s = 0; s < 750; s++) {
    const frame = socialFrame(world, pair, [], noon + s * 1000);
    assert.ok(frame.exchanges.length <= 1);
    const x = frame.exchanges[0];
    if (!x) continue;
    assert.equal(x.source, 'script');
    assert.equal(x.speech.source, 'routine');
    assert.ok(!/\{[ab]\}/.test(x.speech.text), 'Actor names must replace placeholders');
    const keyParts = x.speech.key.split(':'), index = Number(keyParts.pop()), slot = keyParts.join(':');
    const group = groups.get(slot) ?? { start: s, end: s, indices: [], keys: new Set() };
    group.end = s;
    if (!group.keys.has(x.speech.key)) {
      group.keys.add(x.speech.key); group.indices.push(index);
      assert.equal(x.speech.speaker, index % 2 ? 'binh' : 'an');
    }
    groups.set(slot, group);
    const speaker = frame.poses.get(x.speech.speaker), listener = frame.poses.get(x.speech.speaker === 'an' ? 'binh' : 'an');
    assert.equal(speaker.speaking, true);
    assert.equal(listener.speaking, false);
    assert.equal(listener.gesture, 'listen');
    assert.equal(speaker.peerId, x.speech.speaker === 'an' ? 'binh' : 'an');
  }
  const complete = [...groups.values()].filter(g => g.indices.length === 4 && g.indices[0] === 0);
  assert.ok(complete.length >= 2);
  for (const g of complete) assert.deepEqual(g.indices, [0, 1, 2, 3]);
  for (let i = 1; i < complete.length; i++) assert.ok(complete[i].start - complete[i - 1].end >= scripts.cooldownSeconds);
});

test('a newly arrived pair waits for an opening instead of joining a scene on a reply', () => {
  const replySecond = Array.from({ length: 228 }, (_, i) => i).find(s => socialFrame(world, pair, [], noon + s * 1000).exchanges[0]?.speech.key.endsWith(':1'));
  assert.notEqual(replySecond, undefined, 'Need a real second-turn interval');
  const at = noon + replySecond * 1000, initialAge = .25;
  const justArrived = pair.map(a => ({ ...a, stationaryFor: initialAge }));
  assert.equal(socialFrame(world, justArrived, [], at).exchanges.length, 0);
  let firstSpeech;
  for (let s = 1; s <= 228; s++) {
    const actors = justArrived.map(a => ({ ...a, stationaryFor: initialAge + s }));
    firstSpeech = socialFrame(world, actors, [], at + s * 1000).exchanges[0]?.speech;
    if (firstSpeech) break;
  }
  assert.ok(firstSpeech, 'The pair should eventually get its own complete opening');
  assert.ok(firstSpeech.key.endsWith(':0'));
  assert.equal(firstSpeech.speaker, 'an');
});

const validNarrative = {
  title: 'Nghỉ chân bên hiên quán', summary: 'An và Chi bàn chỗ ngồi rồi trở về việc riêng.',
  dialogue: [
    { speaker: 'an', text: 'Chi, bạn thích ngồi ngoài hiên hay bên trong hơn?' },
    { speaker: 'chi', text: 'Bên hiên nhé. Mình thích vừa ngồi vừa nhìn người qua lại.' },
    { speaker: 'an', text: 'Mình cũng vậy. Có lúc chỉ ngắm phố thôi đã thấy dễ chịu.' },
    { speaker: 'chi', text: 'Ừ, mình nghỉ một chút rồi tiếp việc của mình.' },
  ],
};

test('editorial guard accepts a coherent authored four-line exchange without changing it', () => {
  const before = JSON.stringify(validNarrative), review = reviewNarrative(validNarrative, ['an', 'chi']);
  assert.equal(review.ok, true);
  assert.deepEqual(review.proposal, validNarrative);
  assert.equal(JSON.stringify(validNarrative), before);
});

test('editorial guard rejects an unselected speaker', () => {
  const bad = structuredClone(validNarrative); bad.dialogue[1].speaker = 'stranger';
  const review = reviewNarrative(bad, ['an', 'chi']);
  assert.equal(review.ok, false);
  assert.match(review.reason, /hai người được chọn/);
});

test('editorial guard rejects consecutive lines from the same speaker', () => {
  const bad = structuredClone(validNarrative); bad.dialogue[1].speaker = 'an';
  const review = reviewNarrative(bad, ['an', 'chi']);
  assert.equal(review.ok, false);
  assert.match(review.reason, /luân phiên/);
});

test('editorial guard rejects near-verbatim replies observed in the actual local Qwen sample', () => {
  // Exact model output from the local director→characters→critic experiment.
  // Its model critic approved it; the deterministic editorial guard must reject it.
  const proposal = {
    title: 'Đạo diễn',
    summary: 'An và Chi đang đứng bên hiên quán cà phê, chưa mua hay uống gì. Chi muốn uống một chút, An cũng muốn. An hỏi Chi cách phục vụ, Chi trả lời cụ thể.',
    dialogue: [
      { speaker: 'an', text: 'Chi, bạn có thể giúp tôi với một việc nhỏ không?' },
      { speaker: 'chi', text: 'Thôi, mua một chai nước rồi chúng ta ngồi đây.' },
      { speaker: 'an', text: 'Chi, tôi cũng muốn uống một chút, chúng ta cùng nhau mua một ly.' },
      { speaker: 'chi', text: 'Mình cũng muốn uống một chút, An, chúng ta cùng nhau mua một ly.' },
    ],
  };
  const review = reviewNarrative(proposal, ['an', 'chi']);
  assert.equal(review.ok, false);
  assert.match(review.reason, /gần nguyên văn/);
});

test('paused simulation freezes resident positions, dialogue and turn timing', () => {
  const at = noon + Array.from({ length: 228 }, (_, i) => i).find(s => socialFrame(world, pair, [], noon + s * 1000).exchanges.length) * 1000;
  const w = structuredClone(world);
  w.clock = updateClock(w, at, { paused: true }); w.paused = true;
  assert.deepEqual(socialFrame(w, pair, [], at), socialFrame(w, pair, [], at + 4 * 3600_000));
  assert.deepEqual(crowdAt(w.living, w, at), crowdAt(w.living, w, at + 4 * 3600_000));
  assert.deepEqual(actorsAt(w, at), actorsAt(w, at + 4 * 3600_000));
});

test('ambient speech respects overnight quiet, private rooms, walking and distance', () => {
  for (const hour of [0, 3, 5.99, 22, 23.9]) for (let s = 0; s < 60; s++)
    assert.equal(socialFrame(world, pair, [], born + hour * 3600_000 + s * 1000).exchanges.length, 0);
  for (const location of ['Phòng An', 'Phòng Bình', 'Phòng Chi', 'Bệnh viện', 'Phòng khám'])
    for (let s = 0; s < 228; s++) assert.equal(socialFrame(world, [stationary(world, 'an', location), stationary(world, 'binh', location)], [], noon + s * 1000).exchanges.length, 0);
  for (let s = 0; s < 228; s++) {
    assert.equal(socialFrame(world, [{ ...pair[0], walking: true }, pair[1]], [], noon + s * 1000).exchanges.length, 0);
    assert.equal(socialFrame(world, [pair[0], stationary(world, 'binh', 'Sân chung', [300, 0])], [], noon + s * 1000).exchanges.length, 0);
    assert.equal(socialFrame(world, [pair[0], stationary(world, 'binh', 'Công viên')], [], noon + s * 1000).exchanges.length, 0);
  }
});

const aiEvent = {
  id: 'social-ai-test', source: 'ai', createdAt: new Date(noon).toISOString(), simStartedAt: simulationTime(world, noon),
  title: 'Câu chuyện AI đã lưu', summary: 'Cảnh kiểm thử', changes: [],
  dialogue: [
    { speaker: 'an', text: 'Bình, mình nghe bạn nói đây.', atSecond: 0, location: 'Sân chung' },
    { speaker: 'binh', text: 'Ừ, mình kể bạn nghe nhé.', atSecond: 12, location: 'Sân chung' },
  ],
};

test('persisted AI event takes priority over authored ambient script', () => {
  const frame = socialFrame(world, pair, [aiEvent], noon + 1000);
  assert.equal(frame.exchanges[0]?.speech.key, 'social-ai-test-0');
  assert.equal(frame.exchanges[0]?.source, 'ai');
});

test('rules living dialogue cannot hide a persisted AI event in the same moment', () => {
  const rulesLine = { speaker: 'an', text: 'Lời luật nền', source: 'routine', key: 'rules-living' };
  assert.equal(socialFrame(world, pair, [aiEvent], noon + 1000, rulesLine).exchanges[0]?.speech.key, 'social-ai-test-0');
});

test('AI event metadata uses that event title rather than an unrelated living turn', () => {
  const w = { ...world, livingTurn: { title: 'Một lượt sinh hoạt khác' } };
  assert.equal(socialFrame(w, pair, [aiEvent], noon + 1000).exchanges[0]?.title, aiEvent.title);
});

test('persisted two-person dialogue faces its actual co-speaker rather than a closer bystander', () => {
  const event = { ...aiEvent, dialogue: [aiEvent.dialogue[0], { speaker: 'chi', text: 'Ừ, mình đang kể bạn nghe.', atSecond: 12, location: 'Sân chung' }] };
  const frame = socialFrame(world, [...pair, stationary(world, 'chi')], [event], noon + 1000);
  assert.equal(frame.poses.get('an')?.peerId, 'chi');
  assert.equal(frame.poses.get('chi')?.peerId, 'an');
  assert.equal(frame.poses.get('binh')?.source === 'ai', false);
});

test('named AI partner walking away cannot be replaced with a stationary bystander', () => {
  const event = { ...aiEvent, dialogue: [aiEvent.dialogue[0], { speaker: 'chi', text: 'Ừ, mình đang kể bạn nghe.', atSecond: 12, location: 'Sân chung' }] };
  const frame = socialFrame(world, [...pair, { ...stationary(world, 'chi'), walking: true }], [event], noon + 1000);
  assert.equal(frame.exchanges.some(x => x.source === 'ai'), false);
});

test('persisted event lookup is unambiguous when another event ID is its prefix', () => {
  const inactive = { ...aiEvent, id: 'social-ai', title: 'Sai nguồn theo prefix', dialogue: [{ ...aiEvent.dialogue[0], atSecond: 60 }] };
  const frame = socialFrame(world, pair, [inactive, aiEvent], noon + 1000);
  assert.equal(frame.exchanges[0]?.title, aiEvent.title);
});

test('projection and social staging never mutate durable world or actor input', () => {
  const stateBefore = JSON.stringify(world), inputBefore = JSON.stringify(pair);
  for (let s = 0; s < 240; s++) socialFrame(world, pair, [aiEvent], noon + s * 1000);
  for (let hour = 0; hour < 24; hour++) crowdAt(world.living, world, born + hour * 3600_000);
  assert.equal(JSON.stringify(world), stateBefore);
  assert.equal(JSON.stringify(pair), inputBefore);
});

test('24 hour resident agendas vary by role/id, total one day and rest overnight', () => {
  const signatures = new Set();
  for (const r of world.living.residents) {
    const list = residentRoutine(world.living, r);
    assert.equal(Math.round(list.reduce((n, s) => n + s.duration, 0)), 86400);
    assert.ok(list.every(s => s.duration > 0 && PLACES.includes(s.location) && STEP_KINDS.includes(s.kind)));
    assert.equal(list[0].kind, 'rest'); assert.equal(list.at(-1).kind, 'rest');
    assert.ok(list.filter(s => s.kind === 'eat').length >= 2);
    signatures.add(JSON.stringify(list.map(s => [s.location, s.duration])));
  }
  assert.ok(signatures.size >= 10);
  for (const hour of [0, 3, 5, 23]) {
    const crowd = crowdAt(world.living, world, born + hour * 3600_000);
    assert.ok(crowd.every(a => a.kind === 'rest' && a.location === 'Khu dân cư' && !a.walking));
  }
  for (const hour of [8.5, 10, 14, 17]) {
    const crowd = crowdAt(world.living, world, born + hour * 3600_000);
    assert.ok(new Set(crowd.map(a => a.location)).size >= 8);
    assert.ok(crowd.filter(a => a.location === 'Quảng trường').length < crowd.length / 3);
  }
});

for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.ok ? '' : `: ${result.error}`}`);
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({ suite: 'social', cases: results.length, passed: results.length - failed.length, failed: failed.length }));
if (failed.length) process.exitCode = 1;

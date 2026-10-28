import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync, statSync, symlinkSync, linkSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { CURATION_LIMITS, canonicalJson, curationHash, bytesHash, curateDataset, verifyCuratedDataset, selectDatasetFewShots, renderCurationMessages, validateCurationCompletion } from '../lib/dataset-curation.ts';
import { curationValidatorSha256 } from './curate-training.mjs';

const root = resolve(import.meta.dirname, '..');
const fixture = resolve(root, 'data/training/curation-fixtures-v1.jsonl');
const raw = readFileSync(fixture), records = raw.toString().trim().split('\n').map(line => JSON.parse(line));
const pins = { inputSha256: bytesHash(raw), validatorSha256: curationValidatorSha256() };
const compile = values => curateDataset(values, 'an', pins);
const clone = value => structuredClone(value);
const edited = (fn, base = records[0]) => { const r = clone(base); fn(r); return r; };
function repin(r) {
  r.request.source.snapshotSha256 = curationHash(r.request.context);
  const sha = curationHash(r.request);
  for (const c of r.candidates) { c.requestSha256 = sha; c.completionSha256 = curationHash(c.completion); }
  if (r.review?.decision === 'approve') {
    r.review.requestSha256 = sha;
    for (const key of ['chosen', 'rejected']) if (r.review[key]) r.review[key].sha256 = r.candidates.find(c => c.id === r.review[key].id).completionSha256;
  }
  return r;
}
function variant(index, base = records[0]) {
  return repin(edited(r => {
    r.id = `test-record-${index}`; r.request.context.sceneId = `test-scene-${index}`; r.request.source.id = `test-source-${index}`;
    r.candidates.forEach((c, i) => { const old = c.id; c.id = `test-candidate-${index}-${i}`; for (const key of ['chosen', 'rejected']) if (r.review[key]?.id === old) r.review[key].id = c.id; });
  }, base));
}
const artifact = compile(records);
assert.equal(artifact.report.accepted, 6); assert.equal(artifact.report.dpo, 6);
assert.equal(artifact.exports.fewShot.filter(e => e.split === 'train').length, 5);
assert.equal(artifact.exports.fewShot.filter(e => e.split === 'holdout').length, 1);
assert.deepEqual(verifyCuratedDataset(artifact, pins.validatorSha256), artifact);
assert.deepEqual(compile([...records].reverse()), artifact, 'input order must not affect dataset once input SHA is pinned');
assert.deepEqual(readFileSync(fixture), raw);
assert.equal(canonicalJson({ b: 1, a: 'á' }), canonicalJson({ a: 'á', b: 1 }));
assert.notEqual(curationHash('á'), curationHash('a\u0301'), 'do not silently normalize captured prompt bytes');
assert.throws(() => canonicalJson({ value: undefined }));
assert.deepEqual(artifact.exports.fewShot[0].messages, renderCurationMessages(records[0].request));
assert.ok(artifact.records.every(r => r.request.model.kind === 'editorial' && r.request.source.kind === 'synthetic-editorial'));

// Actor filter precedes deep source validation/audit. Foreign corrupt data has no effect on own records.
const foreign = { actorId: 'chi', request: 'invalid private peer request', candidates: 'private payload' };
assert.equal(compile([foreign, records[0]]).report.foreign, 1);
assert.equal(compile([foreign, records[0]]).report.accepted, 1);
const invalid = [
  edited(r => { r.request.context.actorId = 'chi'; }),
  edited(r => { r.request.context.participants = ['an', 'an']; }),
  edited(r => { r.request.context.facts[0].knownBy = ['binh']; }),
  edited(r => { r.request.context.memories[0].ownerId = 'binh'; }, records[4]),
  edited(r => { r.request.context.memories[0].witnessedWith = ['binh']; }, records[4]),
  edited(r => { r.request.context.memories[0].provenance = 'archive-record'; }, records[4]),
  edited(r => { r.request.source.simulation = { worldBorn: '2026-10-28T00:00:00Z', capturedAt: '2026-10-28T00:00:00Z', revision: 1, eventId: 'event' }; }),
  edited(r => { r.request.source.kind = 'simulation-capture'; }),
  edited(r => { r.review.checks.knowledge = 'unknown'; }),
  edited(r => { r.review.reviewer.kind = 'heuristic'; }),
  edited(r => { r.heuristicScore = 98; }),
];
for (const r of invalid) assert.equal(compile([repin(r)]).report.invalid, 1);
assert.equal(compile([edited(r => { r.review = null; })]).report.unreviewed, 1);
assert.equal(compile([edited(r => { r.review = { version: 1, decision: 'abstain', reviewer: { kind: 'agent', id: 'test' }, reason: 'Chưa đủ nguồn.' }; })]).report.unreviewed, 1);

// Neither a score nor a schema pass approves data; both request and semantic review pin actual outputs.
const mismatched = [
  edited(r => { r.request.system += '\nchanged'; }),
  edited(r => { r.request.model.revision = 'different'; }),
  edited(r => { r.request.sampling.temperature = 0.7; }),
  edited(r => { r.candidates[1].requestSha256 = 'a'.repeat(64); }),
  edited(r => { r.candidates[0].completion.title += ' khác'; }),
  edited(r => { r.review.chosen.sha256 = 'a'.repeat(64); }),
  edited(r => { r.review.requestSha256 = 'b'.repeat(64); }),
];
for (const r of mismatched) assert.equal(compile([r]).report.hashRejected, 1);
assert.equal(compile([edited(r => { r.request.context.facts[0].text += ' changed'; })]).report.invalid, 1);
const badChosen = [
  r => { r.candidates[0].completion.dialogue[0].speaker = 'chi'; },
  r => { r.candidates[0].completion.dialogue[1].speaker = 'an'; },
  r => { r.candidates[0].completion.dialogue[1].text = r.candidates[0].completion.dialogue[0].text; },
  r => { r.candidates[0].completion.dialogue[0].text = 'ASCII only'; },
  r => { r.candidates[0].completion.moneyDelta = 30000; },
  r => { r.candidates[0].completion.newRole = { id: 'test-role', label: 'Thử', place: 'Thư viện', activity: 'Đọc', kind: 'read', greeting: 'Chào bạn' }; },
];
for (const fn of badChosen) assert.equal(compile([repin(edited(fn))]).report.validatorRejected, 1);
const rejectedInvalid = repin(edited(r => { r.candidates[1].completion.dialogue[0].speaker = 'cun'; }));
assert.equal(compile([rejectedInvalid]).exports.dpo[0].rejectedValidation.participants, false);
assert.equal(compile([rejectedInvalid]).report.accepted, 1);
const sftOnly = edited(r => { r.review.rejected = null; });
assert.equal(compile([sftOnly]).report.dpo, 0); assert.equal(compile([sftOnly]).report.accepted, 1);
const identical = repin(edited(r => { r.candidates[1].completion = clone(r.candidates[0].completion); }));
assert.equal(compile([identical]).report.invalid, 1);
const captured = repin(edited(r => {
  r.request.source.kind = 'simulation-capture';
  r.request.source.simulation = { worldBorn: '2026-10-28T00:00:00Z', capturedAt: '2026-10-28T00:00:00Z', revision: 1, eventId: 'declared-capture' };
  r.request.model = { kind: 'local-model', id: 'fixture-model', revision: 'test-only', artifactSha256: '1'.repeat(64) };
  r.request.context.facts.forEach(f => { f.provenance = 'simulation-snapshot'; });
}));
assert.equal(compile([captured]).report.accepted, 1, 'declared capture metadata is accepted, not authenticated or physical evidence');
assert.equal(compile([records[0], records[0]]).report.duplicates, 1);
assert.throws(() => compile([records[0], repin(edited(r => { r.request.task += ' khác'; }))]), /conflicting-record-id/);
assert.throws(() => compile([records[0], repin(edited(r => { r.id = 'other'; r.request.task += ' khác'; }))]), /conflicting-candidate-id/);
const reverse = variant('reverse'); reverse.request = clone(records[0].request);
[reverse.review.chosen, reverse.review.rejected] = [reverse.review.rejected, reverse.review.chosen]; repin(reverse);
assert.throws(() => compile([records[0], reverse]), /contradictory-review/);

// Actual group leakage checks, including transitive links, exact prompt/context and same event captures.
const a = variant('a'), b = variant('b'), c = variant('c');
b.request.source.id = a.request.source.id; repin(b);
c.request.context.sceneId = b.request.context.sceneId; repin(c);
const grouped = compile([a, b, c]);
assert.equal(new Set(grouped.exports.fewShot.map(e => e.groupSha256)).size, 1);
assert.equal(new Set(grouped.exports.dpo.map(e => e.split)).size, 1);
const samePrompt = variant('same-prompt'); samePrompt.request.context = clone(a.request.context); repin(samePrompt);
assert.equal(new Set(compile([a, samePrompt]).exports.fewShot.map(e => e.groupSha256)).size, 1);
const capA = variant('capture-a', captured), capB = variant('capture-b', captured);
assert.equal(new Set(compile([capA, capB]).exports.fewShot.map(e => e.groupSha256)).size, 1);
const many = compile(Array.from({ length: 100 }, (_, i) => variant(i)));
for (const split of ['train', 'validation', 'holdout']) assert.ok(many.exports.fewShot.some(e => e.split === split));
const query = variant('target').request;
const selection = selectDatasetFewShots(many, query, pins.validatorSha256, 4);
assert.equal(selection.length, 4); assert.ok(selection.every(e => e.split === 'train'));
assert.equal(selectDatasetFewShots(many, { ...query, model: { kind: 'editorial', revision: 'other' } }, pins.validatorSha256).length, 0);
assert.equal(selectDatasetFewShots(grouped, c.request, pins.validatorSha256).length, 0, 'exclude entire transitive target group');
assert.throws(() => selectDatasetFewShots(many, { ...query, context: { ...query.context, actorId: 'chi', participants: ['chi', 'binh'] }, source: { ...query.source, snapshotSha256: curationHash({ ...query.context, actorId: 'chi', participants: ['chi', 'binh'] }) } }, pins.validatorSha256), /selection-actor|fact-scope/);
const mut = clone(artifact); mut.exports.dpo[0].chosen = 'forged';
assert.throws(() => verifyCuratedDataset(mut, pins.validatorSha256), /artifact-sha/);
function selfHash(value) { const { sha256: _old, ...payload } = value; void _old; value.sha256 = curationHash(payload); return value; }
assert.throws(() => verifyCuratedDataset(selfHash(mut), pins.validatorSha256), /artifact-admission/);
const splitTamper = clone(artifact); splitTamper.exports.fewShot[0].split = 'holdout';
assert.throws(() => verifyCuratedDataset(selfHash(splitTamper), pins.validatorSha256), /artifact-admission/);
const countTamper = clone(artifact); countTamper.report.scanned++;
assert.throws(() => verifyCuratedDataset(selfHash(countTamper), pins.validatorSha256), /artifact-admission/);
assert.throws(() => verifyCuratedDataset(artifact, '0'.repeat(64)), /artifact-sha-or-validator/);
const oversized = edited(r => { r.candidates[0].completion.summary = 'a'.repeat(65536); });
assert.throws(() => compile([oversized]), /record-byte-budget/);
const requestBudget = repin(edited(r => {
  r.request.system = 'đ'.repeat(8000);
  r.request.context.facts = Array.from({ length: 10 }, (_, i) => ({ ...r.request.context.facts[0], id: `budget-${i}`, text: 'đ'.repeat(1000) }));
}));
assert.equal(compile([requestBudget]).report.invalid, 1);
const completionBudget = repin(edited(r => { r.candidates[1].completion.privateText = 'đ'.repeat(5000); }));
assert.equal(compile([completionBudget]).report.invalid, 1);
assert.throws(() => compile(Array(CURATION_LIMITS.records + 1).fill(foreign)), /record-count-budget/);
assert.equal(validateCurationCompletion(records[0].candidates[0].completion, ['an', 'binh']).pass, true);

// Real CLI preview/export, immutable private output, UTF8/JSONL/size guards and safe process errors.
const temporary = mkdtempSync(resolve(tmpdir(), 'curation-test-'));
const privateDir = resolve(root, '.sites-runtime/training', `curation-test-${randomUUID()}`);
const cli = options => spawnSync(process.execPath, ['scripts/curate-training.mjs', ...options], { cwd: root, encoding: 'utf8', maxBuffer: 1048576 });
const baseArgs = ['--in', fixture, '--actor', 'an', '--expected-sha256', pins.inputSha256];
const target = resolve(privateDir, 'dataset.json');
try {
  assert.equal(existsSync(privateDir), false);
  const preview = cli(baseArgs); assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).report.accepted, 6); assert.equal(existsSync(privateDir), false);
  assert.ok(!preview.stdout.includes(records[0].candidates[0].completion.dialogue[0].text));
  assert.ok(!preview.stdout.includes(fixture));
  const exported = cli([...baseArgs, '--action', 'export', '--out', target]);
  assert.equal(exported.status, 0, exported.stderr);
  const output = readFileSync(target);
  assert.deepEqual(verifyCuratedDataset(JSON.parse(output), pins.validatorSha256), artifact);
  assert.equal(statSync(target).mode & 0o777, 0o600);
  assert.equal(cli([...baseArgs, '--action', 'export', '--out', target]).status, 1);
  assert.deepEqual(readFileSync(target), output);
  assert.equal(readdirSync(privateDir).some(n => n.endsWith('.tmp')), false);
  assert.equal(cli([...baseArgs, '--out', resolve(privateDir, 'preview.json')]).status, 1);
  assert.equal(existsSync(resolve(privateDir, 'preview.json')), false);
  assert.equal(cli([...baseArgs, '--action', 'export', '--out', resolve(temporary, 'outside.json')]).status, 1);
  assert.equal(existsSync(resolve(temporary, 'outside.json')), false);
  const redirected = resolve(privateDir, 'redirect'); symlinkSync(temporary, redirected);
  assert.equal(cli([...baseArgs, '--action', 'export', '--out', resolve(redirected, 'new', 'dataset.json')]).status, 1);
  assert.equal(existsSync(resolve(temporary, 'new')), false, 'check symlink before mkdir');
  const linkedOut = resolve(privateDir, 'linked.json'); linkSync(target, linkedOut);
  assert.equal(cli([...baseArgs, '--action', 'export', '--out', linkedOut]).status, 1); assert.deepEqual(readFileSync(target), output);
  const symlinkOut = resolve(privateDir, 'symlink.json'); symlinkSync(target, symlinkOut);
  assert.equal(cli([...baseArgs, '--action', 'export', '--out', symlinkOut]).status, 1); assert.deepEqual(readFileSync(target), output);
  const sourceLink = resolve(temporary, 'source-link'); symlinkSync(fixture, sourceLink);
  assert.equal(cli(['--in', sourceLink, '--actor', 'an', '--expected-sha256', pins.inputSha256]).status, 1);
  for (const [name, content] of [
    ['bad-json', Buffer.from('{"private":"NEVER_ECHO_PRIVATE", broken}\n')],
    ['bad-utf8', Buffer.from([0xff, 0xfe])], ['bom', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), raw])],
    ['big-line', Buffer.from(JSON.stringify({ actorId: 'chi', text: 'a'.repeat(65536) }) + '\n')],
    ['too-many', Buffer.from((JSON.stringify(foreign) + '\n').repeat(CURATION_LIMITS.records + 1))],
    ['too-large', Buffer.alloc(CURATION_LIMITS.inputBytes + 1, 32)],
  ]) {
    const path = resolve(temporary, name); writeFileSync(path, content); chmodSync(path, 0o400);
    const result = cli(['--in', path, '--actor', 'an', '--expected-sha256', bytesHash(content)]);
    assert.equal(result.status, 1, name); assert.equal(result.stdout, '');
    assert.ok(!result.stderr.includes('NEVER_ECHO_PRIVATE')); assert.ok(!result.stderr.includes(path));
    assert.deepEqual(readFileSync(path), content);
  }
  const wrong = cli(['--in', fixture, '--actor', 'an', '--expected-sha256', '0'.repeat(64)]);
  assert.equal(wrong.status, 1); assert.deepEqual(readFileSync(fixture), raw);
  // JSONL newline/CRLF/blank forms are accepted with their own exact file SHA.
  const alternate = resolve(temporary, 'alternate'); const alt = Buffer.from('\r\n' + raw.toString().trim().split('\n').join('\r\n'));
  writeFileSync(alternate, alt);
  assert.equal(cli(['--in', alternate, '--actor', 'an', '--expected-sha256', bytesHash(alt)]).status, 0);
} finally {
  rmSync(temporary, { recursive: true, force: true });
  if (existsSync(privateDir)) rmSync(privateDir, { recursive: true, force: true });
}
console.log(JSON.stringify({ suite: 'dataset-curation', syntheticApproved: 6, fewShotTrain: 5, syntheticHoldout: 1, explicitMatchedDpo: 6, actorFilterBeforeAudit: true, ownMemoryScope: true, actualProposalAndNarrativeGuards: true, explicitSemanticReview: true, requestContextModelSamplingPins: true, sourceKindsSeparated: true, duplicatesAndContradictions: true, connectedSplitGroups: true, trainOnlySelection: true, recomputedArtifactAdmission: true, previewZeroWrites: true, privateAtomicExclusiveOutput: true, byteRecordUtf8Budgets: true, inputPreserved: true, productionAccess: false, trainsModel: false }));

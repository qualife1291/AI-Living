/** SHA-pinned local compiler. No fetch, DB, model invocation, automatic training or writes on preview. */
import { parseArgs } from 'node:util';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, openSync, closeSync, readSync, fstatSync, existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync, fsyncSync, linkSync, unlinkSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { CURATION_LIMITS, curateDataset, verifyCuratedDataset, bytesHash, curationHash } from '../lib/dataset-curation.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = resolve(root, '.sites-runtime/training');
export function curationValidatorSha256() {
  return curationHash(['lib/event-schema.ts', 'lib/living/schema.ts', 'lib/living/director.ts', 'lib/dataset-curation.ts']
    .map(path => ({ path, sha256: bytesHash(readFileSync(resolve(root, path))) })));
}
function localInput(path, expectedSha256) {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256 ?? '')) throw Error('source-sha-required');
  let fd;
  try {
    fd = openSync(resolve(path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const before = fstatSync(fd);
    if (!before.isFile() || before.size > CURATION_LIMITS.inputBytes) throw Error('input-budget-or-type');
    const chunks = []; let bytes = 0;
    for (;;) {
      const part = Buffer.alloc(Math.min(65536, CURATION_LIMITS.inputBytes + 1 - bytes));
      const n = readSync(fd, part, 0, part.length, null); if (!n) break;
      bytes += n; if (bytes > CURATION_LIMITS.inputBytes) throw Error('input-budget'); chunks.push(part.subarray(0, n));
    }
    const after = fstatSync(fd), raw = Buffer.concat(chunks);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || bytesHash(raw) !== expectedSha256) throw Error('source-changed-or-sha');
    // Fatal decoding, including foreign rows, prevents replacement-character aliases.
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
    if (text.startsWith('\uFEFF')) throw Error('input-bom');
    const values = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      if (Buffer.byteLength(line) > CURATION_LIMITS.recordBytes) throw Error('record-byte-budget');
      if (values.length >= CURATION_LIMITS.records) throw Error('record-count-budget');
      values.push(JSON.parse(line));
    }
    return values;
  } finally { if (fd !== undefined) closeSync(fd); }
}
function writePrivate(path, value) {
  const out = resolve(path);
  if (!out.startsWith(privateRoot + sep) || !out.endsWith('.json')) throw Error('private-output-required');
  // Check every existing parent BEFORE creating a child. No symlink traversal/mkdir outside root.
  let current = resolve(root);
  for (const name of relative(current, dirname(out)).split(sep)) {
    current = resolve(current, name);
    if (!existsSync(current)) mkdirSync(current, { mode: 0o700 });
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory() || realpathSync(current) !== current) throw Error('private-parent-required');
  }
  const raw = JSON.stringify(value, null, 2) + '\n';
  if (Buffer.byteLength(raw) > CURATION_LIMITS.outputBytes) throw Error('output-budget');
  const temp = resolve(dirname(out), `.curation-${randomUUID()}.tmp`); let fd;
  try {
    fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    writeFileSync(fd, raw); fsyncSync(fd); closeSync(fd); fd = undefined;
    linkSync(temp, out); // Exclusive, atomic visibility; existing files/symlinks/hardlinks survive unchanged.
  } finally { if (fd !== undefined) closeSync(fd); if (existsSync(temp)) unlinkSync(temp); }
}
export function curateTrainingCommand(options) {
  const action = options.action ?? 'preview';
  if (!['preview', 'export'].includes(action) || !options.input || !options.actorId || !options.expectedSha256 || action === 'export' && !options.output || action === 'preview' && options.output) throw Error('invalid-options');
  const values = localInput(options.input, options.expectedSha256);
  const validatorSha256 = curationValidatorSha256();
  const dataset = curateDataset(values, options.actorId, { inputSha256: options.expectedSha256, validatorSha256 });
  verifyCuratedDataset(dataset, validatorSha256);
  if (action === 'export') {
    if (!dataset.report.accepted) throw Error('no-approved-data');
    writePrivate(options.output, dataset);
  }
  const splits = Object.fromEntries(['train', 'validation', 'holdout'].map(split => [split, {
    fewShot: dataset.exports.fewShot.filter(e => e.split === split).length,
    dpo: dataset.exports.dpo.filter(e => e.split === split).length,
  }]));
  const sourceKinds = Object.fromEntries(['synthetic-editorial', 'simulation-capture'].map(kind => [kind, dataset.records.filter(r => r.request.source.kind === kind).length]));
  return { kind: 'offline-dataset-curation', mode: action, report: dataset.report, splits, sourceKinds, inputSha256: dataset.inputSha256, validatorSha256, datasetSha256: dataset.sha256, productionAccess: false, trainsModel: false, changesRuntime: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { in: { type: 'string' }, actor: { type: 'string' }, 'expected-sha256': { type: 'string' }, action: { type: 'string', default: 'preview' }, out: { type: 'string' } }, strict: true, allowPositionals: false });
    console.log(JSON.stringify(curateTrainingCommand({ input: values.in, actorId: values.actor, expectedSha256: values['expected-sha256'], action: values.action, output: values.out })));
  } catch {
    console.error('Local dataset curation failed. Check source SHA, schema/review and private output; input and existing output were preserved.'); process.exitCode = 1;
  }
}

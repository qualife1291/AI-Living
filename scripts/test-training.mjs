import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const scenes = JSON.parse(
  fs.readFileSync(path.join(root, 'data/scenes.json'), 'utf8'),
);
const contexts = JSON.parse(
  fs.readFileSync(
    path.join(root, 'data/contexts/neighborhood-contexts.json'),
    'utf8',
  ),
);
const goldenEpisodes = JSON.parse(
  fs.readFileSync(
    path.join(root, 'data/training/sft-golden-episodes.json'),
    'utf8',
  ),
);
const dpoPairs = JSON.parse(
  fs.readFileSync(
    path.join(root, 'data/training/dpo-preference-pairs.json'),
    'utf8',
  ),
);
const curriculum = JSON.parse(
  fs.readFileSync(
    path.join(root, 'data/training/self-play-curriculum.json'),
    'utf8',
  ),
);

assert.equal(scenes.length, 16, 'Expected 16 daily scenes in data/scenes.json');
assert.equal(
  contexts.length,
  24,
  'Expected 24 multi-dimensional contexts in neighborhood-contexts.json',
);
assert.ok(
  goldenEpisodes.length >= 6,
  'Expected at least 6 SFT golden episodes',
);
assert.ok(dpoPairs.length >= 6, 'Expected at least 6 DPO preference pairs');
assert.equal(
  curriculum.length,
  8,
  'Expected 8 progressive self-play curriculum stages',
);

const validPlaces = new Set([
  'Sân chung',
  'Phòng An',
  'Phòng Bình',
  'Phòng Chi',
  'Bếp chung',
  'Vườn nhỏ',
  'Công viên',
  'Quán cà phê',
  'Thư viện',
  'Xưởng sáng tạo',
  'Quảng trường',
  'Phố đi bộ',
]);
const validSpeakers = new Set(['an', 'binh', 'chi']);

for (const ep of goldenEpisodes) {
  assert.ok(ep.id && ep.title && ep.summary);
  assert.ok(Array.isArray(ep.dialogue) && ep.dialogue.length >= 1);
  for (const d of ep.dialogue) {
    assert.ok(validSpeakers.has(d.speaker), `Invalid speaker: ${d.speaker}`);
    assert.ok(typeof d.atSecond === 'number' && d.atSecond >= 20);
    assert.ok(validPlaces.has(d.location), `Invalid location: ${d.location}`);
  }
  for (const c of ep.changes) {
    assert.ok(validSpeakers.has(c.id));
    assert.ok(validPlaces.has(c.location));
    assert.ok(Array.isArray(c.plan) && c.plan.length >= 1);
  }
}

for (const pair of dpoPairs) {
  assert.ok(pair.id && pair.dimension && pair.chosen && pair.rejected && pair.critique);
}

console.log(
  `PASS: verified ${scenes.length} scenes, ${contexts.length} synthesized contexts, ${goldenEpisodes.length} SFT golden episodes, ${dpoPairs.length} DPO pairs, and ${curriculum.length} curriculum stages.`,
);

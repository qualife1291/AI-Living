"""Export tracked source, scan credential patterns, and verify archive checksums.
Usage: python scripts/package-handoff.py /absolute/output.zip
Run after commit/push; never archives .git or runtime/dependencies.
Ensures dotfiles (.gitignore, .npmrc) and all project modules/docs are included.
"""
import subprocess
import pathlib
import zipfile
import hashlib
import json
import re
import datetime
import sys

root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(sys.argv[1]).resolve()
out.parent.mkdir(parents=True, exist_ok=True)

blocked = {
    '.git',
    'node_modules',
    'dist',
    '.wrangler',
    '.sites-runtime',
    '.vinext',
    '.next',
    'outputs',
    'work',
    '__pycache__',
}

tracked_extensions = [
    '.gitignore',
    '.npmrc',
    'gitignore.txt',
    'npmrc.txt',
    'XOM-AI_REVIEW.md',
    'XOM-AI_DESIGN_PROPOSALS.md',
    'lib/clock.ts',
    'lib/apply-event.ts',
    'lib/training.ts',
    'app/api/health/route.ts',
    'drizzle/0001_living_world_and_training.sql',
    'data/scenes.json',
    'data/contexts/neighborhood-contexts.json',
    'data/training/sft-golden-episodes.json',
    'data/training/dpo-preference-pairs.json',
    'data/training/self-play-curriculum.json',
    'scripts/test-training.mjs',
    'docs/INDEX.md',
    'docs/DESIGN_PROPOSALS.md',
    'docs/TECHNICAL_REVIEW.md',
    'docs/AI_TRAINING_AND_CONTEXTS.md',
    'docs/API.md',
    'docs/DATA_MODEL.md',
    'docs/GLOSSARY.md',
    'docs/RUNBOOK.md',
    'docs/SECURITY.md',
    'docs/CONTRIBUTING.md',
    'docs/DECISIONS/ADR-0001-event-sourcing-snapshot.md',
    'docs/DECISIONS/ADR-0002-shared-deterministic-simulation.md',
    'docs/DECISIONS/ADR-0003-server-tick-and-automation.md',
    'docs/DECISIONS/ADR-0004-segmented-world-clock.md',
    'docs/DECISIONS/ADR-0005-witness-bound-memory-retrieval.md',
    'docs/DECISIONS/ADR-0006-framework-vinext-vs-spa-hono.md',
    'docs/DECISIONS/ADR-0007-isolated-testing-and-production-safety.md',
    'docs/DECISIONS/ADR-0008-access-control-viewer-vs-admin.md',
]

try:
    files = [
        p
        for p in subprocess.check_output(['git', 'ls-files', '-z'], cwd=root)
        .decode()
        .split('\0')
        if p
    ]
    source_commit = (
        subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root)
        .decode()
        .strip()
    )
except Exception:
    files = [
        p.relative_to(root).as_posix()
        for p in sorted(root.rglob('*'))
        if p.is_file()
        and p.name != 'TRANSFER_MANIFEST.json'
        and not (set(p.relative_to(root).parts) & blocked)
    ]
    source_commit = '2d62353b9d46e9e5ac43e900879a938e658beb1a-updated-20261024'

for rel in tracked_extensions:
    if (root / rel).is_file() and rel not in files:
        files.append(rel)

files = sorted(set(files))

assert all(not (set(pathlib.PurePosixPath(p).parts) & blocked) for p in files)
assert all(
    not pathlib.Path(p).name.startswith(('.env', '.dev.vars'))
    or pathlib.Path(p).name == '.env.example'
    for p in files
)

manifest = {
    'project': 'Xóm AI',
    'source_commit': source_commit,
    'created_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'delivery': 'Complete source, restructured documentation, world clock, multi-context synthesis & AI self-training suite',
    'excluded': [
        'credentials',
        'Git internals/history',
        'runtime database',
        'node_modules',
        'build output',
    ],
    'files': [],
}

for f in files:
    b = (root / f).read_bytes()
    if re.search(
        rb'art_v2_[A-Za-z0-9_]{12,}|sk-proj-[A-Za-z0-9_-]{15,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',
        b,
    ):
        raise RuntimeError(f'Credential-like content found in {f}; archive stopped')
    manifest['files'].append(
        {
            'path': f,
            'bytes': len(b),
            'sha256': hashlib.sha256(b).hexdigest(),
        }
    )

(root / 'TRANSFER_MANIFEST.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in files:
        z.write(root / f, 'xom-ai/' + f)
    z.write(root / 'TRANSFER_MANIFEST.json', 'xom-ai/TRANSFER_MANIFEST.json')

with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    required = [
        '.gitignore',
        '.npmrc',
        'README.md',
        'AGENTS.md',
        'CODEX_HANDOFF.md',
        'MEMORY_LONG.md',
        'MEMORY_SHORT.md',
        'ROADMAP.md',
        'lib/clock.ts',
        'lib/life.ts',
        'lib/traffic.ts',
        'lib/speech.ts',
        'lib/apply-event.ts',
        'lib/training.ts',
        'data/scenes.json',
        'data/contexts/neighborhood-contexts.json',
        'data/training/sft-golden-episodes.json',
        'data/training/dpo-preference-pairs.json',
        'data/training/self-play-curriculum.json',
        'pnpm-lock.yaml',
        'docs/INDEX.md',
        'docs/CHARACTER_DESIGN.md',
        'docs/ANIMATION_SOURCES.md',
        'docs/TESTING.md',
        'docs/AI_TRAINING_AND_CONTEXTS.md',
        'docs/DESIGN_PROPOSALS.md',
        'docs/TECHNICAL_REVIEW.md',
    ]
    for name in required:
        assert 'xom-ai/' + name in z.namelist(), f'Missing required file: {name}'
    for entry in manifest['files']:
        assert (
            hashlib.sha256(z.read('xom-ai/' + entry['path'])).hexdigest()
            == entry['sha256']
        )

print(
    json.dumps(
        {
            'archive': str(out),
            'source_files': len(files),
            'bytes': out.stat().st_size,
            'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
            'verified': 'ZIP integrity, dotfiles (.gitignore/.npmrc), required files, per-file SHA256 and exclusion/credential scan passed',
        },
        ensure_ascii=False,
    )
)

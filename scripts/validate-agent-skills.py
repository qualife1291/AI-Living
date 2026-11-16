#!/usr/bin/env python3
"""Dependency-free structural validation for repo Agent Skills."""
from pathlib import Path
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / '.agents' / 'skills'
errors = []
seen = set()
for path in sorted(SKILLS.glob('*/SKILL.md')):
    raw = path.read_text(encoding='utf-8')
    match = re.match(r'\A---\n(.*?)\n---\n', raw, re.S)
    if not match:
        errors.append(f'{path}: missing YAML frontmatter')
        continue
    fields = dict(re.findall(r'^([a-z_]+):\s*(.*?)\s*$', match.group(1), re.M))
    name, description = fields.get('name', ''), fields.get('description', '')
    if name != path.parent.name or not re.fullmatch(r'[a-z0-9-]{1,64}', name):
        errors.append(f'{path}: invalid/mismatched name {name!r}')
    if not description or len(description) > 1024:
        errors.append(f'{path}: missing/overlong description')
    if name in seen:
        errors.append(f'{path}: duplicate skill {name}')
    seen.add(name)
    # Require useful structure, without rewarding padding to an arbitrary60lines.
    if len(raw.splitlines()) < 20:
        errors.append(f'{path}: too little procedural content')
    for section in ('Operating contract', 'Deliverables', 'Stop conditions', 'Kiểm chứng'):
        if f'## {section}' not in raw and f'## {section.lower()}' not in raw:
            errors.append(f'{path}: missing section "## {section}"')
if not seen:
    errors.append('No skills found')
print(f'Validated {len(seen)} skills')
for err in errors:
    print('ERROR:', err, file=sys.stderr)
sys.exit(1 if errors else 0)

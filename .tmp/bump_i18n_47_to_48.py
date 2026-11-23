"""Bump shared i18n asset query strings from v47 to v48 after the dictionary fix."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'.audit', 'AUDIT_SAVED_CODE', '.tmp', 'node_modules', '__pycache__'}

changed = []
for page in ROOT.rglob('*.html'):
    if any(part in EXCLUDED for part in page.parts):
        continue
    text = page.read_text(encoding='utf-8')
    updated = text.replace('?v=47', '?v=48')
    if updated != text:
        page.write_text(updated, encoding='utf-8', newline='\n')
        changed.append(page.relative_to(ROOT).as_posix())

builder = ROOT / 'tools' / 'build_i18n.py'
source = builder.read_text(encoding='utf-8')
assert 'RUNTIME_VERSION = "47"' in source
builder.write_text(
    source.replace('RUNTIME_VERSION = "47"', 'RUNTIME_VERSION = "48"'),
    encoding='utf-8',
    newline='\n',
)

print(f'bumped {len(changed)} html pages to i18n v48; build_i18n.py updated')

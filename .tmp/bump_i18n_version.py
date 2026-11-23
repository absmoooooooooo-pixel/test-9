#!/usr/bin/env python3
"""Bump the shared i18n runtime assets from v43 to v44."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = [
    "language-switcher.css",
    "number-format.js",
    "translations.js",
    "i18n.js",
    "language-switcher.js",
]

changed = []
for page in ROOT.rglob("*.html"):
    if ".audit" in page.parts or "AUDIT_SAVED_CODE" in page.parts:
        continue
    text = page.read_text(encoding="utf-8")
    updated = text
    for asset in ASSETS:
        updated = updated.replace(f"{asset}?v=43", f"{asset}?v=44")
    if updated != text:
        page.write_text(updated, encoding="utf-8", newline="\n")
        changed.append(page.relative_to(ROOT).as_posix())

builder = ROOT / "tools/build_i18n.py"
source = builder.read_text(encoding="utf-8")
builder.write_text(
    source.replace('RUNTIME_VERSION = "43"', 'RUNTIME_VERSION = "44"'),
    encoding="utf-8",
    newline="\n",
)

print(f"bumped {len(changed)} html pages; build_i18n.py version -> 44")

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"A:\SAN\P2\NEW 23-11-2026\START 23-11-2026")
EN = json.loads((ROOT / "frontend/i18n/en.json").read_text(encoding="utf-8"))["strings"]
patterns = [
    re.compile(r"MW_I18N\.t\(\s*[\"']([^\"']+)[\"']"),
    re.compile(r"data-i18n(?:-attrs)?=[\"']([^\"']+)[\"']"),
    re.compile(r"i18n\([\"']([^\"']+)[\"']\)"),
]
found: dict[str, set[str]] = {}
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in {".js", ".html"}:
        continue
    if "i18n/translations.js" in path.as_posix():
        continue
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        continue
    for pattern in patterns:
        for match in pattern.finditer(text):
            key = match.group(1)
            # data-i18n can contain attribute lists such as "title|aria-label".
            for part in key.split("|"):
                part = part.strip()
                if part and part not in EN:
                    found.setdefault(part, set()).add(path.relative_to(ROOT).as_posix())
for key in sorted(found):
    print(f"{key!r}: {', '.join(sorted(found[key])[:4])}")
print(f"missing literal keys: {len(found)}")

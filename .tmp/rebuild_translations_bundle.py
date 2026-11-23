#!/usr/bin/env python3
"""Rebuild translations.js from the per-language JSON dictionaries."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "frontend/i18n"
ORDER = ["mr", "hi", "en", "de", "es", "fr", "ja", "zh", "pt", "ar"]

payload = {}
for code in ORDER:
    payload[code] = json.loads((I18N / f"{code}.json").read_text(encoding="utf-8"))

(I18N / "translations.js").write_text(
    "window.MW_I18N_DICTIONARIES=" +
    json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
    newline="\n",
)
print("translations.js rebuilt from 10 dictionaries")

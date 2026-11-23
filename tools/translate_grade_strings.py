#!/usr/bin/env python3
"""Populate dictionaries with every string used by the grade detail panel.

The source list is extracted from frontend/assets/data/material-grades-data.js
by dump_grade_strings.js. Only human-readable text is translated; grade names,
standards, symbols, values and units stay in their international form.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import translate_extra_keys as tek

# The "|" separator used by the legacy build tool makes the service split
# long grade descriptions. Newlines are preserved reliably by the same
# endpoint, so batches stay aligned and need no recursive retries.
tek.SEPARATOR = "\n"
tek.BATCH_SIZE = 50

UI_KEYS = [
    "Grade Overview",
    "Material Density",
    "Chemical Composition",
    "Mechanical Properties",
    "Common Industrial Applications",
    "Key Features",
    "Applicable Standards",
    "Material",
    "density",
    "Typical density:",
    "Representative published value for this grade family.",
    "Typical value for the parent material; the grade standard does not specify a density.",
    "Overview is not documented in this reference for this grade.",
    "Chemical composition",
    "Mechanical properties",
    "Key features",
    "is not documented in this reference. Verify against the applicable standard or supplier datasheet.",
    "Close grade details",
    "Show full grade details.",
    "No materials found",
    "Common Applications",
]


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

    data = json.loads((ROOT / "tools/i18n_audit/grade_strings.json").read_text(encoding="utf-8"))
    english = json.loads((ROOT / "frontend/i18n/en.json").read_text(encoding="utf-8"))
    existing = english["strings"]

    keys: list[str] = []
    for group in data.values():
        for value in group:
            if value and value not in keys and value not in existing:
                keys.append(value)
    for value in UI_KEYS:
        if value not in keys and value not in existing:
            keys.append(value)

    print(f"new keys: {len(keys)}", flush=True)

    def save(code: str, dictionary: dict, batch: dict | None = None) -> None:
        if batch:
            dictionary["strings"].update(batch)
        path = ROOT / "frontend/i18n" / (code + ".json")
        path.write_text(
            json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )

    for key in keys:
        existing[key] = key
    save("en", english)
    print("en: saved identity entries", flush=True)

    targets = ["ja", "ar", "de", "es", "fr", "hi", "mr", "pt", "zh"]
    for target in targets:
        print("translating", target, flush=True)
        dictionary = json.loads((ROOT / "frontend/i18n" / (target + ".json")).read_text(encoding="utf-8"))
        tek.translate_all(
            keys, target,
            checkpoint=lambda batch, code=target, dictionary=dictionary: save(code, dictionary, batch),
        )
        print(target + ": saved", flush=True)
    print("done", flush=True)


if __name__ == "__main__":
    main()

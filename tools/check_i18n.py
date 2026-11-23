#!/usr/bin/env python3
"""Development-time translation completeness checker.

    python tools/check_i18n.py

The site translates visible English text in the browser. A missing dictionary
entry therefore silently falls back to English. This checker makes that
failure loud during development by comparing every dictionary against the
English source dictionary and reporting:

  * missing keys
  * empty values
  * values identical to English (reviewed against a small allow-list)
  * dimension labels ("Width (W)") mapped to descriptions instead of short names
  * language codes without a dictionary, and dictionaries without a language
  * stale generated runtime versions in HTML asset blocks

It never modifies files. It exits non-zero when a blocking issue is found.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n_paths as paths

ROOT = paths.PROJECT_ROOT
I18N = paths.I18N_DIR
BUILD_SCRIPT = ROOT / "tools" / "build_i18n.py"

# Short input labels such as "Width (W)" or "Thickness (T)" must never be
# replaced by a help text or FAQ answer in any language.
DIMENSION_LABEL = re.compile(r"^[A-Z][A-Za-z ]* \([A-Z]\)$")

# Technical strings that are intentionally identical across languages.
ALLOW_IDENTICAL = {
    "code", "name", "ogLocale", "dir", "flag", "short",
    "KG", "LB", "kg", "lb", "MM", "mm", "IN", "in", "cm", "m",
    "g/cm³", "kg/m³", "mm²", "mm³", "cm³", "N", "kN", "MPa",
    "ISO", "ASTM", "DIN", "ANSI", "ASME", "JIS", "GB", "BS",
    "UN", "UNC", "UNF", "NPT", "BSP", "BSW", "BSF",
    "PWA", "SEO", "FAQ", "URL", "HTML", "CSS", "JS",
    "© 2026 Jadhav Group of Industries",
}


def flatten(value: object, prefix: str = "") -> dict[str, object]:
    result: dict[str, object] = {}
    if isinstance(value, dict):
        for key, child in value.items():
            name = f"{prefix}.{key}" if prefix else str(key)
            result.update(flatten(child, name))
    else:
        result[prefix] = value
    return result


def load(code: str) -> dict:
    return json.loads((I18N / f"{code}.json").read_text(encoding="utf-8"))


def runtime_version() -> str:
    text = BUILD_SCRIPT.read_text(encoding="utf-8")
    match = re.search(r'RUNTIME_VERSION\s*=\s*"([^"]+)"', text)
    return match.group(1) if match else ""


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    config = paths.load_languages()
    codes = [item["code"] for item in config["languages"]]
    dictionaries = {code: load(code) for code in codes if (I18N / f"{code}.json").exists()}

    problems: list[str] = []
    warnings: list[str] = []

    missing_files = [code for code in codes if code not in dictionaries]
    extra_files = sorted(
        path.stem for path in I18N.glob("*.json")
        if path.stem not in codes and path.stem not in {"languages"}
    )
    if missing_files:
        problems.append(f"dictionaries missing for languages: {', '.join(missing_files)}")
    if extra_files:
        warnings.append(f"dictionary files without a language entry: {', '.join(extra_files)}")

    # English source strings are the keys used by the non-English dictionaries.
    # en.json only needs identity entries where a string must be overridden.
    flattened = {code: flatten(raw) for code, raw in dictionaries.items()}
    counts: Counter[str] = Counter()
    for code, flat in flattened.items():
        if code != "en":
            counts.update(flat.keys())
    non_en_count = len([code for code in flattened if code != "en"])
    threshold = max(2, non_en_count // 2)
    source_keys = {key for key, count in counts.items() if count >= threshold}
    single_language_keys = {key for key, count in counts.items() if count == 1}
    if single_language_keys:
        warnings.append(
            f"{len(single_language_keys)} source keys appear in only one language "
            "(review for stale/unused entries; e.g. "
            f"{', '.join(sorted(single_language_keys)[:6])})"
        )

    for code, flat in sorted(flattened.items()):
        empty = sorted(key for key, value in flat.items() if isinstance(value, str) and not value.strip())
        if code == "en":
            if empty:
                problems.append(f"en: empty values: {', '.join(empty[:12])}")
            continue
        missing = sorted(key for key in source_keys if key not in flat)
        identical = sorted(
            key for key, value in flat.items()
            if isinstance(value, str) and value == key.rsplit(".", 1)[-1]
            and key.rsplit(".", 1)[-1] not in ALLOW_IDENTICAL
        )
        descriptive_labels = sorted(
            key.rsplit(".", 1)[-1]
            for key, value in flat.items()
            if isinstance(value, str)
            and DIMENSION_LABEL.match(key.rsplit(".", 1)[-1])
            and (len(value) > 48 or ". " in value)
        )
        if missing:
            problems.append(f"{code}: {len(missing)} missing source keys (e.g. {', '.join(missing[:12])})")
        if empty:
            problems.append(f"{code}: {len(empty)} empty values (e.g. {', '.join(empty[:12])})")
        if descriptive_labels:
            problems.append(
                f"{code}: dimension labels mapped to descriptions "
                f"(e.g. {', '.join(descriptive_labels[:12])})"
            )
        if identical:
            warnings.append(f"{code}: {len(identical)} values identical to source (e.g. {', '.join(identical[:12])})")

    version = runtime_version()
    if version:
        assets = ["translations.js", "number-format.js", "i18n.js",
                  "language-switcher.css", "language-switcher.js"]
        for asset in assets:
            stale = []
            pattern = re.compile(re.escape(asset) + r"\?v=([A-Za-z0-9._-]+)")
            for page in paths.source_pages():
                text = (ROOT / page).read_text(encoding="utf-8", errors="ignore")
                found = set(pattern.findall(text))
                if found and found != {version}:
                    stale.append(f"{page} ({', '.join(sorted(found))})")
            if stale:
                problems.append(
                    f"stale {asset} version in {len(stale)} pages: {', '.join(stale[:8])}"
                )

    print(f"languages: {len(codes)} ({', '.join(codes)})")
    print(f"dictionaries: {len(dictionaries)}")
    print(f"English source keys (union of translated dictionaries): {len(source_keys)}")
    print(f"runtime version: {version or 'unknown'}")
    print(f"blocking issues: {len(problems)}")
    for item in problems:
        print(f"  ERROR {item}")
    print(f"review warnings: {len(warnings)}")
    for item in warnings:
        print(f"  WARN  {item}")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Round 1 audit analyzer: residual English and missing dictionary entries."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

import harness

ROOT = Path(harness.WORKSPACE)
LANGS = ["hi", "mr", "ja", "zh", "de", "es", "fr", "pt", "ar"]
PAGES = ["index.html", "frontend/about/index.html"] + sorted(
    p.relative_to(ROOT).as_posix()
    for p in (ROOT / "frontend" / "calculators").glob("*/index.html")
)

EXACT_ALLOW = {
    "KG", "LB", "kg", "lb", "mm", "MM", "in", "cm", "pcs", "pc", "OK", "QTY",
    "→", "←", "×", "↺", "×", "© 2026 Jadhav Group of Industries",
    "Metal Weight Calculator",  # corrected by title template separately
    # Single-letter engineering variables and symbols stay in their standard form.
    "A", "B", "D", "H", "L", "R", "T", "W", "d", "r", "ρ", "π",
}


def technical(value: str) -> bool:
    s = value.strip()
    if not s:
        return True
    if s in EXACT_ALLOW:
        return True
    if re.fullmatch(r"[\d\u0660-\u0669\u06f0-\u06f9\u0966-\u096f.,\s+\-×xX()%/°³²]+", s):
        return True
    if re.fullmatch(r"[A-Za-z0-9\s/.,+()\-–×°³²%]+", s) and re.search(r"\d", s) and not re.search(r"[a-z]{4,}", s):
        return True
    return False


def residual(baseline: set[str], snap: dict) -> list[str]:
    return sorted(
        text for text in set(snap.get("texts", []))
        if text in baseline and not technical(text)
    )


def attr_residual(baseline: dict[str, set[str]], snap: dict, key: str, field: str) -> list[str]:
    base = baseline.get(key, set())
    result = []
    for item in snap.get(key, []):
        value = item.get(field, "")
        if value and value in base and not technical(value):
            result.append(value)
    return sorted(set(result))


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(harness.PORT), "--bind", "127.0.0.1",
         "--directory", str(ROOT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(1.0)
        report = []
        for page in PAGES:
            data = harness.run(page, ["en", *LANGS], mode="audit", timeout_ms=30000)
            if data.get("errors") or len(data.get("snapshots", [])) < 2:
                report.append({"page": page, "error": data.get("errors", "no snapshots")})
                continue
            first = data["snapshots"][0]
            baseline_text = set(first.get("texts", []))
            baseline_buttons = {"text": {b.get("text", "") for b in first.get("buttons", [])},
                                "title": {b.get("title", "") for b in first.get("buttons", [])},
                                "aria": {b.get("aria", "") for b in first.get("buttons", [])}}
            baseline_inputs = {"placeholder": {i.get("placeholder", "") for i in first.get("inputs", [])}}
            baseline_selects = {"option": {o for s in first.get("selects", []) for o in s.get("options", [])}}
            for snap in data["snapshots"][1:]:
                missing = [m for m in snap.get("missing", []) if not technical(m)]
                res = residual(baseline_text, snap)
                item = {
                    "page": page,
                    "lang": snap.get("lang"),
                    "dir": snap.get("dir"),
                    "missing": len(missing),
                    "residual": len(res),
                    "attrResidual": len(attr_residual(baseline_buttons, snap, "buttons", "text")),
                    "placeholderResidual": len(attr_residual(baseline_inputs, snap, "inputs", "placeholder")),
                    "optionResidual": len(
                        sorted(o for o in {o for s in snap.get("selects", [])
                                            for o in s.get("options", [])}
                               if o in baseline_selects["option"] and not technical(o))
                    ),
                    "samples": missing[:6] or res[:6],
                }
                report.append(item)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    total_missing = sum(item.get("missing", 0) for item in report)
    total_residual = sum(item.get("residual", 0) for item in report)
    print(json.dumps({"checks": len(report), "missing": total_missing,
                      "residual": total_residual, "items": report},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

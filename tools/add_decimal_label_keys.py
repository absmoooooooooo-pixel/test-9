#!/usr/bin/env python3
"""Add the two composed keypad aria-label sources to every dictionary.

numeric-keypad.js builds "Decimal point (,)" from the translated "Decimal point"
term. The i18n runtime needs the composed source in the dictionary so it can map
the rendered aria-label back to English on repeated language switches.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "frontend/i18n"


def main() -> None:
    for code in ["en", "mr", "hi", "de", "es", "fr", "ja", "zh", "pt", "ar"]:
        path = I18N / (code + ".json")
        dictionary = json.loads(path.read_text(encoding="utf-8"))
        strings = dictionary["strings"]
        base = strings["Decimal point"]
        strings["Decimal point (,)"] = base + " (,)"
        strings["Decimal point (.)"] = base + " (.)"
        path.write_text(
            json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )
        print(code + ": added composed decimal labels", flush=True)


if __name__ == "__main__":
    main()

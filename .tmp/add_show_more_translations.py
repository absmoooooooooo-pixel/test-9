#!/usr/bin/env python3
"""Add the two grade-panel toggle strings to every dictionary and bundle."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "frontend/i18n"

TRANSLATIONS = {
    "en": ("Show More Grades", "Show Less"),
    "mr": ("अधिक ग्रेड दाखवा", "कमी दाखवा"),
    "hi": ("अधिक ग्रेड दिखाएँ", "कम दिखाएँ"),
    "de": ("Weitere Sorten anzeigen", "Weniger anzeigen"),
    "es": ("Mostrar más grados", "Mostrar menos"),
    "fr": ("Afficher plus de nuances", "Afficher moins"),
    "ja": ("さらにグレードを表示", "表示を減らす"),
    "zh": ("显示更多等级", "收起"),
    "pt": ("Mostrar mais graus", "Mostrar menos"),
    "ar": ("عرض المزيد من الدرجات", "عرض أقل"),
}

for code, (more_text, less_text) in TRANSLATIONS.items():
    path = I18N / f"{code}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    strings = data.setdefault("strings", {})
    strings["Show More Grades"] = more_text
    strings["Show Less"] = less_text
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

bundle = I18N / "translations.js"
text = bundle.read_text(encoding="utf-8")
prefix, payload = text.split("=", 1)
data = json.loads(payload.strip().rstrip(";"))
for code, (more_text, less_text) in TRANSLATIONS.items():
    data[code]["strings"]["Show More Grades"] = more_text
    data[code]["strings"]["Show Less"] = less_text
bundle.write_text(
    prefix + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
    newline="\n",
)
print("added Show More Grades / Show Less to 10 dictionaries and bundle")

import json
import sys
from pathlib import Path

ROOT = Path(r"A:\SAN\P2\NEW 23-11-2026\START 23-11-2026")

VALUES = {
    "en": {"KG": "KG", "LB": "LB", "metric tonnes": "metric tonnes"},
    "ar": {"KG": "كجم", "LB": "رطل", "metric tonnes": "أطنان متريّة"},
    "hi": {"KG": "किग्रा", "LB": "पाउंड", "metric tonnes": "मेट्रिक टन"},
    "mr": {"KG": "किग्रा", "LB": "पाउंड", "metric tonnes": "मेट्रिक टन"},
    "de": {"KG": "KG", "LB": "LB", "metric tonnes": "Metrische Tonnen"},
    "es": {"KG": "KG", "LB": "LB", "metric tonnes": "Toneladas métricas"},
    "fr": {"KG": "KG", "LB": "LB", "metric tonnes": "Tonnes métriques"},
    "ja": {"KG": "kg", "LB": "lb", "metric tonnes": "メートルトン"},
    "pt": {"KG": "KG", "LB": "LB", "metric tonnes": "Toneladas métricas"},
}

for code, additions in VALUES.items():
    path = ROOT / "frontend" / "i18n" / (code + ".json")
    data = json.loads(path.read_text(encoding="utf-8"))
    terms = data.setdefault("terms", {})
    for key, value in additions.items():
        terms[key] = value
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print("updated", code)

sys.path.insert(0, str(ROOT / "tools"))
import build_i18n as builder

builder.write_shared_dictionary(builder.paths.load_languages()["languages"])
print("regenerated frontend/i18n/translations.js")

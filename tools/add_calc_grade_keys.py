#!/usr/bin/env python3
"""Add shared calculator material-panel keys that had no dictionary entry."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "frontend/i18n"

VALUES = {
    "en": {
        "Choose a material": "Choose a material",
        "Materials": "Materials",
        "Show More Grades ↓": "Show More Grades ↓",
        "Show Less ↑": "Show Less ↑",
    },
    "mr": {
        "Choose a material": "सामग्री चुनें",
        "Materials": "सामग्रियाँ",
        "Show More Grades ↓": "अधिक ग्रेड दिखाएँ ↓",
        "Show Less ↑": "कम ग्रेड दिखाएँ ↑",
    },
    "hi": {
        "Choose a material": "सामग्री चुनें",
        "Materials": "सामग्रियाँ",
        "Show More Grades ↓": "अधिक ग्रेड दिखाएँ ↓",
        "Show Less ↑": "कम ग्रेड दिखाएँ ↑",
    },
    "de": {
        "Choose a material": "Werkstoff wählen",
        "Materials": "Werkstoffe",
        "Show More Grades ↓": "Weitere Sorten anzeigen ↓",
        "Show Less ↑": "Weniger anzeigen ↑",
    },
    "es": {
        "Choose a material": "Elegir un material",
        "Materials": "Materiales",
        "Show More Grades ↓": "Mostrar más grados ↓",
        "Show Less ↑": "Mostrar menos ↑",
    },
    "fr": {
        "Choose a material": "Choisir un matériau",
        "Materials": "Matériaux",
        "Show More Grades ↓": "Afficher plus de nuances ↓",
        "Show Less ↑": "Afficher moins de nuances ↑",
    },
    "ja": {
        "Choose a material": "材料を選択",
        "Materials": "材料",
        "Show More Grades ↓": "さらにグレードを表示 ↓",
        "Show Less ↑": "表示を減らす ↑",
    },
    "zh": {
        "Choose a material": "选择材料",
        "Materials": "材料",
        "Show More Grades ↓": "显示更多牌号 ↓",
        "Show Less ↑": "显示更少牌号 ↑",
    },
    "pt": {
        "Choose a material": "Escolher um material",
        "Materials": "Materiais",
        "Show More Grades ↓": "Mostrar mais graus ↓",
        "Show Less ↑": "Mostrar menos ↑",
    },
    "ar": {
        "Choose a material": "اختر مادة",
        "Materials": "المواد",
        "Show More Grades ↓": "إظهار المزيد من الدرجات ↓",
        "Show Less ↑": "إظهار درجات أقل ↑",
    },
}


def main() -> None:
    for code, additions in VALUES.items():
        path = I18N / (code + ".json")
        dictionary = json.loads(path.read_text(encoding="utf-8"))
        dictionary["strings"].update(additions)
        path.write_text(
            json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )
        print(code + ": added " + str(len(additions)), flush=True)


if __name__ == "__main__":
    main()

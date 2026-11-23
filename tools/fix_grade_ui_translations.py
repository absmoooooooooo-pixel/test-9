#!/usr/bin/env python3
"""Correct context-sensitive terms in the generated grade-panel dictionaries.

The translation service maps "grade" to school grades and "material" to
literature/equipment in several languages. This build-time pass only touches
the strings that belong to the grade detail panel.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "frontend/i18n"

UI_KEYS = {
    "Grade Overview", "Material Density", "Chemical Composition",
    "Mechanical Properties", "Common Industrial Applications", "Key Features",
    "Applicable Standards", "Material", "density", "Typical density:",
    "Representative published value for this grade family.",
    "Typical value for the parent material; the grade standard does not specify a density.",
    "Overview is not documented in this reference for this grade.",
    "Chemical composition", "Mechanical properties", "Key features",
    "is not documented in this reference. Verify against the applicable standard or supplier datasheet.",
    "Close grade details", "Show full grade details.", "No materials found",
    "Common Applications",
}

OVERRIDES = {
    "de": {
        "Grade Overview": "Übersicht über die Werkstoffgüte",
        "Close grade details": "Werkstoffdetails schließen",
        "Show full grade details.": "Vollständige Werkstoffdetails anzeigen.",
        "Overview is not documented in this reference for this grade.":
            "Für diesen Werkstoff ist in dieser Referenz kein Überblick dokumentiert.",
    },
    "es": {
        "Grade Overview": "Resumen del grado",
        "Close grade details": "Cerrar detalles del grado",
        "Show full grade details.": "Mostrar todos los detalles del grado.",
    },
    "fr": {
        "Grade Overview": "Aperçu de la nuance",
        "Close grade details": "Fermer les détails de la nuance",
        "Show full grade details.": "Afficher tous les détails de la nuance.",
        "Key Features": "Principales caractéristiques",
        "Key features": "Principales caractéristiques",
        "Material": "Matériau",
        "No materials found": "Aucun matériau trouvé",
        "Overview is not documented in this reference for this grade.":
            "L’aperçu n’est pas documenté dans cette référence pour cette nuance.",
    },
    "pt": {
        "Grade Overview": "Visão geral do grau",
        "Close grade details": "Fechar detalhes do grau",
        "Show full grade details.": "Mostrar todos os detalhes do grau.",
        "Material": "Material",
        "No materials found": "Nenhum material encontrado",
        "Key Features": "Principais características",
        "Key features": "Principais características",
        "Overview is not documented in this reference for this grade.":
            "A visão geral não está documentada nesta referência para este grau.",
    },
    "ja": {
        "Close grade details": "グレードの詳細を閉じる",
        "Show full grade details.": "グレードの詳細をすべて表示します。",
    },
    "zh": {
        "Close grade details": "关闭牌号详细信息",
        "Show full grade details.": "显示全部牌号详细信息。",
        "Overview is not documented in this reference for this grade.":
            "本参考文献中未记录该牌号的概述。",
    },
    "mr": {
        "Material": "सामग्री",
        "Material Density": "सामग्री घनत्व",
        "No materials found": "कोणतीही सामग्री आढळली नाही",
        "Representative published value for this grade family.":
            "या ग्रेड कुटुंबासाठी प्रातिनिधिक प्रकाशित मूल्य.",
    },
}

# Word-level repairs applied only to grade-panel strings.
REPLACEMENTS = {
    "es": [("calificaciones", "grados"), ("calificación", "grado")],
    "fr": [("notes", "nuances"), ("note", "nuance")],
    "pt": [("notas", "graus"), ("nota", "grau")],
    "ja": [("成績", "グレード")],
    "zh": [("成绩", "牌号")],
    "mr": [("साहित्य", "सामग्री")],
}


def grade_keys() -> set[str]:
    data = json.loads((ROOT / "tools/i18n_audit/grade_strings.json").read_text(encoding="utf-8"))
    keys = set(UI_KEYS)
    for values in data.values():
        keys.update(value for value in values if value)
    return keys


def main() -> None:
    keys = grade_keys()
    for code in ["ja", "ar", "de", "es", "fr", "hi", "mr", "pt", "zh"]:
        path = I18N / (code + ".json")
        dictionary = json.loads(path.read_text(encoding="utf-8"))
        strings = dictionary["strings"]
        for key, value in OVERRIDES.get(code, {}).items():
            if key in strings:
                strings[key] = value
        for key in keys:
            value = strings.get(key)
            if not isinstance(value, str):
                continue
            for old, new in REPLACEMENTS.get(code, []):
                value = value.replace(old, new)
            strings[key] = value
        path.write_text(
            json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )
        print(code + ": corrected", flush=True)


if __name__ == "__main__":
    main()

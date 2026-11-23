#!/usr/bin/env python3
"""Add centralized translations for dynamic calculation-history strings.

These keys are used by frontend/shared/calculation-history.js when the history
summary is rebuilt. The file is idempotent and only adds missing keys.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n_paths as paths

KEYS = [
    "Open global calculation history",
    "Open global calculation history, {count} calculation",
    "Open global calculation history, {count} calculations",
    "{count} calculation saved across all calculators.",
    "{count} calculations saved across all calculators.",
]

TRANSLATIONS = {
    "en": [
        "Open global calculation history",
        "Open global calculation history, {count} calculation",
        "Open global calculation history, {count} calculations",
        "{count} calculation saved across all calculators.",
        "{count} calculations saved across all calculators.",
    ],
    "hi": [
        "वैश्विक गणना इतिहास खोलें",
        "वैश्विक गणना इतिहास, {count} गणना",
        "वैश्विक गणना इतिहास, {count} गणनाएँ",
        "सभी कैलकुलेटर में {count} गणना सहेजी गई।",
        "सभी कैलकुलेटर में {count} गणनाएँ सहेजी गईं।",
    ],
    "mr": [
        "जागतिक गणना इतिहास उघडा",
        "जागतिक गणना इतिहास, {count} गणना",
        "जागतिक गणना इतिहास, {count} गणना",
        "सर्व कॅल्कुलेटरमध्ये {count} गणना जतन केली.",
        "सर्व कॅल्कुलेटरमध्ये {count} गणना जतन केल्या.",
    ],
    "ja": [
        "全体の計算履歴を開く",
        "全体の計算履歴、{count}件の計算",
        "全体の計算履歴、{count}件の計算",
        "すべての計算ツールに{count}件の計算を保存しました。",
        "すべての計算ツールに{count}件の計算を保存しました。",
    ],
    "zh": [
        "打开全局计算历史",
        "打开全局计算历史，{count} 条计算记录",
        "打开全局计算历史，{count} 条计算记录",
        "已在所有计算器中保存 {count} 条计算记录。",
        "已在所有计算器中保存 {count} 条计算记录。",
    ],
    "de": [
        "Globalen Berechnungsverlauf öffnen",
        "Globalen Berechnungsverlauf öffnen, {count} Berechnung",
        "Globalen Berechnungsverlauf öffnen, {count} Berechnungen",
        "{count} Berechnung in allen Rechnern gespeichert.",
        "{count} Berechnungen in allen Rechnern gespeichert.",
    ],
    "es": [
        "Abrir el historial global de cálculos",
        "Abrir el historial global de cálculos, {count} cálculo",
        "Abrir el historial global de cálculos, {count} cálculos",
        "{count} cálculo guardado en todas las calculadoras.",
        "{count} cálculos guardados en todas las calculadoras.",
    ],
    "fr": [
        "Ouvrir l'historique global des calculs",
        "Ouvrir l'historique global des calculs, {count} calcul",
        "Ouvrir l'historique global des calculs, {count} calculs",
        "{count} calcul enregistré dans tous les calculateurs.",
        "{count} calculs enregistrés dans tous les calculateurs.",
    ],
    "pt": [
        "Abrir o histórico global de cálculos",
        "Abrir o histórico global de cálculos, {count} cálculo",
        "Abrir o histórico global de cálculos, {count} cálculos",
        "{count} cálculo salvo em todas as calculadoras.",
        "{count} cálculos salvos em todas as calculadoras.",
    ],
    "ar": [
        "فتح سجل الحسابات العالمي",
        "فتح سجل الحسابات العالمي، حساب واحد ({count})",
        "فتح سجل الحسابات العالمي، {count} حسابات",
        "تم حفظ حساب واحد ({count}) في جميع الآلات الحاسبة.",
        "تم حفظ {count} حسابات في جميع الآلات الحاسبة.",
    ],
}


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    for code, values in TRANSLATIONS.items():
        dictionary = paths.load_dictionary(code)
        added = 0
        for key, value in zip(KEYS, values):
            if key not in dictionary["strings"]:
                dictionary["strings"][key] = value
                added += 1
        if added:
            (paths.I18N_DIR / f"{code}.json").write_text(
                json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8", newline="\n",
            )
        print(f"{code}: added {added} dynamic keys")


if __name__ == "__main__":
    main()

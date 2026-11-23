#!/usr/bin/env python3
"""Replace the old density reference card with the shared grade panel."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CALC_DIR = ROOT / "frontend/calculators"

SECTION_RE = re.compile(
    r'(?ms)^[ \t]*<!--[^\n]*MATERIAL DENSITY[^\n]*-->\n'
    r'.*?'
    r'^[ \t]*<!--[^\n]*MATERIAL DENSITY[^\n]*END[^\n]*-->\n?'
)

REPLACEMENT = """<!-- ================================================== -->
<!-- MATERIAL GRADES AND APPLICATIONS SECTION START -->
<!-- Shared component replaces the old density reference card. -->
<!-- ================================================== -->
<div class="calculator-grades-root" id="calculatorMaterialGrades" data-calculator-grade-panel></div>
<!-- ================================================== -->
<!-- MATERIAL GRADES AND APPLICATIONS SECTION END -->
<!-- ================================================== -->
"""

CSS = """    <link rel="stylesheet" href="../../assets/css/material-grades.css?v=4">
    <link rel="stylesheet" href="../../shared/calculator-material-grades.css?v=1">
"""

SCRIPTS = """<script src="../../assets/data/material-grades-data.js?v=3"></script>
<script src="../../shared/calculator-material-grades.js?v=1"></script>
"""

CALC_API = '<script src="../../assets/js/calc-api.js?v=2"></script>\n'

changed = []
for index_file in sorted(CALC_DIR.glob("*/index.html")):
    text = index_file.read_text(encoding="utf-8")
    original = text

    text, count = SECTION_RE.subn(REPLACEMENT, text, count=1)
    if count != 1:
        raise RuntimeError(f"density section match count {count} in {index_file}")

    if "Material Density Reference" in text or "densityToggle" in text:
        raise RuntimeError(f"old density UI still present in {index_file}")

    if "assets/css/material-grades.css" not in text:
        if "</head>" not in text:
            raise RuntimeError(f"no </head> in {index_file}")
        text = text.replace("</head>", CSS + "</head>", 1)

    if "shared/calculator-material-grades.js" not in text:
        if CALC_API not in text:
            raise RuntimeError(f"calc-api script anchor missing in {index_file}")
        text = text.replace(CALC_API, CALC_API + SCRIPTS, 1)

    if text != original:
        index_file.write_text(text, encoding="utf-8", newline="\n")
        changed.append(index_file.relative_to(ROOT).as_posix())

print(f"updated {len(changed)} calculator pages")
for path in changed:
    print(path)

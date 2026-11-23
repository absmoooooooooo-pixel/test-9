import pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(r'A:\SAN\P2\NEW 23-11-2026\START 23-11-2026\frontend\calculators')
FORMULA_STARTS = [
    'WEIGHT CALCULATION FORMULA',
    'METHOD SECTION START',
    'CALCULATION METHOD START',
]

for page in sorted(ROOT.glob('*/index.html')):
    text = page.read_text(encoding='utf-8')
    lines = text.splitlines(keepends=True)
    g_idx = next((i for i, l in enumerate(lines) if 'MATERIAL GRADES AND APPLICATIONS SECTION START' in l), None)
    f_candidates = [i for marker in FORMULA_STARTS for i, l in enumerate(lines) if marker in l]
    f_idx = min(f_candidates) if f_candidates else None
    print(f'\n=== {page.parent.name} ===')
    print(f'formula header line {f_idx + 1 if f_idx is not None else None}, grades start line {g_idx + 1 if g_idx is not None else None}')
    if f_idx is None or g_idx is None:
        continue
    print('  gap between formula header and grades start:')
    for i in range(f_idx, g_idx + 1):
        line = lines[i].rstrip('\n')
        if any(k in line for k in ('SECTION START', 'SECTION END', 'AD SLOT', 'METHOD SECTION', 'CALCULATION METHOD', '<section', '</section>', 'calculator-grades-root', '<h2')):
            print(f'   {i+1:4}: {line[:110]}')

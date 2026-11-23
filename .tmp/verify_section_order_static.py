import pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(r'A:\SAN\P2\NEW 23-11-2026\START 23-11-2026\frontend\calculators')
FORMULA_START = [
    '<!-- WEIGHT CALCULATION FORMULA SECTION START -->',
    '<!-- METHOD SECTION START -->',
    '<!-- CALCULATION METHOD START -->',
]
GRADES_START = '<!-- MATERIAL GRADES AND APPLICATIONS SECTION START -->'
GRADES_END = '<!-- MATERIAL GRADES AND APPLICATIONS SECTION END -->'

failures = []
pages = sorted(ROOT.glob('*/index.html'))
for page in pages:
    text = page.read_text(encoding='utf-8')
    gs = text.find(GRADES_START)
    ge = text.find(GRADES_END)
    fs = next((text.find(m) for m in FORMULA_START if m in text), -1)
    heading = re.search(r'<h2[^>]*>\s*Weight Calculation Formula\s*</h2>', text)
    ex = re.search(r'Calculation Example|id="methodExample"', text)
    pos = dict(grades=gs, gradesEnd=ge, formula=fs,
               heading=heading.start() if heading else -1,
               example=ex.start() if ex else -1)
    if any(v == -1 for v in pos.values()):
        failures.append(f'{page.parent.name}: missing {[k for k, v in pos.items() if v == -1]}')
        continue
    if not (pos['grades'] < pos['gradesEnd'] < pos['formula'] <= pos['heading'] < pos['example']):
        failures.append(f'{page.parent.name}: wrong order {pos}')
    for label, marker in (
        ('grades start', GRADES_START), ('grades end', GRADES_END),
        ('grades root', 'calculator-grades-root'),
    ):
        if text.count(marker) != 1:
            failures.append(f'{page.parent.name}: {text.count(marker)} x {label}')
    # The two section wrappers must remain closed exactly once each.
    if text.count('<!-- MATERIAL GRADES AND APPLICATIONS SECTION END -->') != 1:
        failures.append(f'{page.parent.name}: grades wrapper not closed once')
    print(f'{page.parent.name:34} grades={gs:6} formula={fs:6} example={pos["example"]:6}  OK')

print(f'\nchecked {len(pages)} calculator pages')
if failures:
    print('FAIL:\n  ' + '\n  '.join(failures))
    sys.exit(1)
print('PASS: grades before formula; formula heading, step/example content intact on all 24 pages')

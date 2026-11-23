import pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OUT = pathlib.Path(r'C:\Users\sansk\AppData\Local\Temp\opencode\section-order-verify')
failures = []
files = sorted(OUT.glob('*.dom.html'))
for f in files:
    text = f.read_text(encoding='utf-8', errors='replace')
    grades = re.search(r'<h2[^>]*id="calcGradesTitle"[^>]*>\s*Material Grades and Applications\s*</h2>', text)
    root = re.search(r'data-calculator-grade-panel', text)
    formula = re.search(r'<h2[^>]*id="(?:[A-Za-z]+FormulaTitle|methodTitle)"[^>]*>\s*Weight Calculation Formula\s*</h2>', text)
    how = re.search(r'<h3[^>]*>\s*(?:How to Calculate[^<]*)</h3>', text)
    example = re.search(r'<h3[^>]*>\s*Calculation Example\s*</h3>|id="methodExample"', text)
    pos = dict(grades=grades.start() if grades else -1,
               root=root.start() if root else -1,
               formula=formula.start() if formula else -1,
               how=how.start() if how else -1,
               example=example.start() if example else -1)
    name = f.name.replace('.dom.html', '')
    required = ('root', 'grades', 'formula', 'example')
    if any(pos[k] == -1 for k in required):
        failures.append(f'{name}: missing {[k for k in required if pos[k] == -1]}')
        continue
    steps = [pos['formula'], pos['example']]
    if pos['how'] != -1:
        steps.insert(1, pos['how'])
    if not (pos['root'] < pos['grades'] < steps[0] < steps[-1]):
        failures.append(f'{name}: wrong rendered order {pos}')
    if pos['how'] != -1 and not (pos['formula'] < pos['how'] < pos['example']):
        failures.append(f'{name}: how-to outside formula section {pos}')
    print(f'{name:34} grades={pos["grades"]:6} formula={pos["formula"]:6} how={pos["how"]:6} example={pos["example"]:6}  OK')

print(f'\nchecked {len(files)} rendered DOM snapshots')
if failures:
    print('FAIL:\n  ' + '\n  '.join(failures))
    sys.exit(1)
print('PASS: rendered DOM order is grades -> formula -> how-to -> example on every page')

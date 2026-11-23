"""Swap the Material Grades and Weight Calculation Formula sections on every calculator page.

Only the two existing, comment-wrapped blocks exchange positions. Their inner
content is copied byte-for-byte, and whatever sits between them (blank lines /
ad-slot placeholder comments) is left untouched in place.
"""
import pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(r'A:\SAN\P2\NEW 23-11-2026\START 23-11-2026\frontend\calculators')
FORMULA_STARTS = [
    '<!-- WEIGHT CALCULATION FORMULA SECTION START -->',
    '<!-- METHOD SECTION START -->',
    '<!-- CALCULATION METHOD START -->',
]
FORMULA_ENDS = [
    '<!-- WEIGHT CALCULATION FORMULA SECTION END -->',
    '<!-- METHOD SECTION END -->',
    '<!-- CALCULATION METHOD END -->',
]
GRADES_START = '<!-- MATERIAL GRADES AND APPLICATIONS SECTION START -->'
GRADES_END = '<!-- MATERIAL GRADES AND APPLICATIONS SECTION END -->'
COMMENT_LINE = re.compile(r'^\s*<!--.*-->\s*$')
AD_SLOT = 'GOOGLE ADSENSE AD SLOT'


def marker_count(text, marker):
    return text.count(marker)


def line_bounds(text, marker):
    pos = text.index(marker)
    start = text.rfind('\n', 0, pos) + 1
    nl = text.find('\n', pos)
    end = len(text) if nl == -1 else nl + 1
    return start, end


def walk_back(text, line_start, stop_at_adslot=False):
    """Include contiguous preceding whole-line comments in the block."""
    while line_start > 0:
        prev_nl = line_start - 1
        prev_start = text.rfind('\n', 0, prev_nl) + 1
        prev = text[prev_start:prev_nl]
        if not COMMENT_LINE.match(prev):
            break
        if stop_at_adslot and AD_SLOT in prev:
            break
        line_start = prev_start
    return line_start


def walk_forward(text, line_end):
    """Include contiguous following whole-line comments in the block."""
    pos = line_end
    while pos < len(text):
        nl = text.find('\n', pos)
        line = text[pos:nl] if nl != -1 else text[pos:]
        if not COMMENT_LINE.match(line):
            break
        pos = len(text) if nl == -1 else nl + 1
    return pos


def find_marker(text, markers, label):
    found = [(m, marker_count(text, m)) for m in markers if m in text]
    assert len(found) == 1, f'{label}: expected one start/end marker, found {found}'
    marker, count = found[0]
    assert count == 1, f'{label}: marker {marker!r} appears {count} times'
    return marker


changed = []
for page in sorted(ROOT.glob('*/index.html')):
    original = page.read_text(encoding='utf-8')
    text = original

    f_start_marker = find_marker(text, FORMULA_STARTS, 'formula start')
    f_end_marker = find_marker(text, FORMULA_ENDS, 'formula end')
    assert marker_count(text, GRADES_START) == 1, f'{page}: grades start count'
    assert marker_count(text, GRADES_END) == 1, f'{page}: grades end count'

    f_line_start, _ = line_bounds(text, f_start_marker)
    _, f_line_end = line_bounds(text, f_end_marker)
    f_start = walk_back(text, f_line_start)
    f_end = walk_forward(text, f_line_end)

    g_line_start, _ = line_bounds(text, GRADES_START)
    _, g_line_end = line_bounds(text, GRADES_END)
    g_start = walk_back(text, g_line_start, stop_at_adslot=True)
    g_end = walk_forward(text, g_line_end)

    assert f_start < f_end < g_start < g_end, (
        f'{page}: unexpected block offsets {f_start} {f_end} {g_start} {g_end}'
    )
    formula_block = text[f_start:f_end]
    grades_block = text[g_start:g_end]
    separator = text[f_end:g_start]

    assert '<section' in formula_block and '</section>' in formula_block, f'{page}: formula block incomplete'
    assert 'Weight Calculation Formula' in formula_block, f'{page}: formula heading missing'
    assert 'calculator-grades-root' in grades_block, f'{page}: grades block incomplete'
    assert f_end_marker not in grades_block, f'{page}: grades block contains formula end'
    assert GRADES_START not in formula_block, f'{page}: formula block contains grades start'
    assert all(
        (not line.strip()) or COMMENT_LINE.match(line)
        for line in separator.splitlines()
    ), f'{page}: unexpected content between the two sections'

    updated = text[:f_start] + grades_block + separator + formula_block + text[g_end:]
    assert updated != original, f'{page}: no change made'
    assert updated.count(GRADES_START) == updated.count(GRADES_END) == 1
    assert updated.count(f_start_marker) == updated.count(f_end_marker) == 1
    assert updated.index(GRADES_START) < updated.index(f_start_marker), f'{page}: wrong final order'

    # Everything outside the two swapped blocks must remain byte-identical.
    new_grades_start = walk_back(updated, line_bounds(updated, GRADES_START)[0], stop_at_adslot=True)
    assert updated[:new_grades_start] == text[:f_start], f'{page}: prefix changed'
    suffix_len = len(text[g_end:])
    assert updated[len(updated) - suffix_len:] == text[g_end:], f'{page}: suffix changed'

    page.write_text(updated, encoding='utf-8', newline='\n')
    changed.append(page.parent.name)
    print(f'{page.parent.name:34} formula [{f_start}:{f_end}] grades [{g_start}:{g_end}] -> swapped')

print(f'\nswapped {len(changed)} calculator pages')

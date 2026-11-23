#!/usr/bin/env python3
"""Build the shared calculator grade-panel component from the home component."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend/assets/js/material-grades.js"
TARGET = ROOT / "frontend/shared/calculator-material-grades.js"

source = SOURCE.read_text(encoding="utf-8")
body = source[source.index("(function () {"):]

MARKUP = r'''
    /* One shared markup template for every calculator page. The IDs are
       calculator-specific so the panel never collides with a calculator's
       own Material dropdown or with the home page component. */
    var MARKUP = `
        <section class="grades-section calculator-grades-section" aria-labelledby="calcGradesTitle">
            <div class="grades-heading">
                <h2 id="calcGradesTitle">Material Grades and Applications</h2>
                <p>Select a material to explore its common grades, densities and industrial uses.</p>
            </div>

            <div class="grades-card">
                <div class="grades-select-wrap">
                    <label id="calcMaterialSelectionLabel" for="calcMaterialCombo">Material Selection</label>
                    <select class="grades-select" id="calcMaterialGrades" aria-label="Select a material" tabindex="-1" aria-hidden="true"></select>
                    <div class="material-combo">
                        <button type="button" class="combo-control" id="calcMaterialCombo" role="combobox"
                                aria-haspopup="listbox" aria-expanded="false" aria-controls="calcMaterialComboMenu"
                                aria-labelledby="calcMaterialSelectionLabel calcMaterialComboValue">
                            <span class="combo-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>
                                </svg>
                            </span>
                            <span class="combo-value" id="calcMaterialComboValue">Carbon Steel</span>
                            <span class="combo-chevron" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                        </button>
                        <div class="combo-menu" id="calcMaterialComboMenu" role="dialog" aria-label="Choose a material" hidden>
                            <div class="combo-search-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/>
                                </svg>
                                <input class="combo-search" id="calcMaterialComboSearch" type="search" autocomplete="off"
                                       placeholder="Search materials" aria-label="Search materials" aria-controls="calcMaterialComboList">
                            </div>
                            <div class="combo-options" id="calcMaterialComboList" role="listbox" aria-label="Materials"></div>
                        </div>
                    </div>
                </div>

                <div class="grades-list" id="calcGradesList" aria-live="polite"></div>
                <div class="grade-info" id="calcGradeInfo" hidden></div>

                <div class="grades-more-wrap">
                    <button type="button" class="grades-more" id="calcGradesMore"
                            aria-expanded="false" aria-controls="calcGradesList">
                        <span id="calcGradesMoreText">Show More Grades &#8595;</span>
                    </button>
                </div>

                <p class="grades-note">Densities are representative room-temperature values in g/cm³ and kg/m³. Actual density can vary slightly with chemical composition, manufacturing process and temperature. Confirm critical values against the applicable datasheet or mill certificate.</p>
            </div>
        </section>
    `;
'''

body = body.replace('(function () {\n    "use strict";\n', '(function () {\n    "use strict";\n' + MARKUP, 1)

old_lookup = '''    var select = document.getElementById("materialGrades");
    var list = document.getElementById("gradesList");
    var info = document.getElementById("gradeInfo");
    if (!select || !list) return;
'''
new_lookup = '''    var root = document.querySelector("[data-calculator-grade-panel]");
    if (!root || root.querySelector(".grades-section")) return;

    root.innerHTML = MARKUP;

    var select = root.querySelector("#calcMaterialGrades");
    var list = root.querySelector("#calcGradesList");
    var info = root.querySelector("#calcGradeInfo");
    var moreButton = root.querySelector("#calcGradesMore");
'''
assert old_lookup in body
body = body.replace(old_lookup, new_lookup, 1)

old_state = '    var selectedKey = null;\n'
new_state = '''    var selectedKey = null;
    var expanded = false;
    var desktopQuery = window.matchMedia
        ? window.matchMedia("(min-width: 901px)") : null;

    /* Mobile shows 2 cards, desktop shows 4. The breakpoint is the same
       one the reference design uses to switch from one to two columns. */
    function initialLimit() {
        return desktopQuery && desktopQuery.matches ? 4 : 2;
    }

    function updateMoreButton(total, limit) {
        if (!moreButton) return;
        if (total <= limit) {
            moreButton.hidden = true;
            return;
        }
        moreButton.hidden = false;
        moreButton.setAttribute("aria-expanded", expanded ? "true" : "false");
        var label = root.querySelector("#calcGradesMoreText");
        if (label) {
            label.textContent = expanded
                ? tr("Show Less") + " \u2191"
                : tr("Show More Grades") + " \u2193";
        }
    }
'''
assert old_state in body
body = body.replace(old_state, new_state, 1)

# Use calculator-only IDs so the shared panel is independent of the home page
# and of each calculator's own material select.
for old, new in [
    ("materialGrades", "calcMaterialGrades"),
    ("gradesList", "calcGradesList"),
    ("gradeInfo", "calcGradeInfo"),
    ("materialCombo", "calcMaterialCombo"),
    ("material-option-", "calc-material-option-"),
]:
    body = body.replace(old, new)

old_keys = '''    function materialKeys() {
        var table = window.MW_MATERIALS || {};
        var order = window.MW_MATERIAL_ORDER || [];
        var keys = [];

        order.forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });
        Object.keys(table).forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });
        return keys;
    }
'''
new_keys = '''    function materialKeys() {
        var table = window.MW_MATERIALS || {};
        var order = window.MW_MATERIAL_ORDER || [];
        var keys = [];

        order.forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });

        Object.keys(table).forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });

        /* The grade database is a complete fallback if calc-api.js has not
           populated the calculator material table yet. */
        (DB.materials || []).forEach(function (material) {
            if (gradesFor(material.key).length && keys.indexOf(material.key) === -1) {
                keys.push(material.key);
            }
        });
        return keys;
    }
'''
assert old_keys in body
body = body.replace(old_keys, new_keys, 1)

old_choose = '''    function chooseMaterial(value) {
        if (!value) return;
        select.value = value;
        syncCombo();
        renderGrades();
        closeCombo();
        if (control) control.focus();
    }
'''
new_choose = '''    function chooseMaterial(value) {
        if (!value) return;
        select.value = value;
        expanded = false;
        selectedKey = null;
        syncCombo();
        renderGrades();
        closeCombo();
        if (control) control.focus();
    }
'''
assert old_choose in body
body = body.replace(old_choose, new_choose, 1)

old_build_option = '''            option.textContent = tr((table[key] && table[key].name) || key);
'''
new_build_option = '''            var fallback = materialFor(key);
            option.textContent = tr((table[key] && table[key].name) ||
                (fallback && fallback.name) || key);
'''
assert old_build_option in body
body = body.replace(old_build_option, new_build_option, 1)

start = body.index('    function renderGrades() {')
end = body.index('    /* ----------------------------------------------------------------------\n       Detailed information shown below the grade cards after a selection.', start)
new_render = '''    function renderGrades() {
        var key = select.value;
        var restoreKey = selectedKey;
        var restoreIndex = selectedIndex;
        var grades = gradesFor(key);
        var limit = initialLimit();
        var visibleCount = expanded ? grades.length : Math.min(limit, grades.length);

        list.textContent = "";
        selectedIndex = -1;
        if (info) {
            info.textContent = "";
            info.hidden = true;
        }

        for (var index = 0; index < visibleCount; index++) {
            var grade = grades[index];
            var d = fmtDensity(grade.density);
            var item = make("article", "grade-item");

            var button = make("button", "grade-card grade-toggle");
            button.type = "button";
            button.setAttribute("data-grade", grade.name);
            button.setAttribute("data-index", String(index));
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", grade.name + ", " +
                tr("density") + " " + d.g + " g/cm\\u00B3. " +
                tr("Show full grade details."));

            var head = make("span", "grade-card-head");
            var titleBox = make("span", "grade-title-box");

            var name = make("strong", "grade-name", grade.name);
            name.title = grade.name;
            titleBox.appendChild(name);
            titleBox.appendChild(make("span", "grade-standard", grade.standard || ""));

            var density = make("span", "grade-density");
            density.innerHTML = DENSITY_ICON;
            var densityText = make("span", "grade-density-text");
            densityText.appendChild(make("strong", "", d.g + " g/cm\\u00B3"));
            densityText.appendChild(make("small", "", d.kg + " kg/m\\u00B3"));
            density.appendChild(densityText);

            head.appendChild(titleBox);
            head.appendChild(density);

            var body = make("span", "grade-card-body");
            var illustration = make("span", "grade-art");
            illustration.innerHTML = artSvg(chooseArt(grade, key));

            var applications = make("span", "grade-applications");
            applications.appendChild(make("strong", "app-title", tr("Common Applications")));
            applications.appendChild(make("span", "app-text", tr(grade.applications || "")));

            body.appendChild(illustration);
            body.appendChild(applications);
            button.appendChild(head);
            button.appendChild(body);
            item.appendChild(button);
            list.appendChild(item);
        }

        /* A language change or a breakpoint change rebuilds the cards, so put
           the already-open panel back in place instead of losing it. */
        if (restoreKey === key && restoreIndex >= 0 && restoreIndex < visibleCount) {
            var cards = list.querySelectorAll ? list.querySelectorAll(".grade-card") : [];
            if (cards[restoreIndex]) {
                cards[restoreIndex].classList.add("is-selected");
                cards[restoreIndex].setAttribute("aria-pressed", "true");
            }
            selectedIndex = restoreIndex;
            renderGradeInfo(key, restoreIndex);
            positionGradeInfo(restoreIndex);
        }

        updateMoreButton(grades.length, limit);
    }

'''
body = body[:start] + new_render + body[end:]

old_change = '''    select.addEventListener("change", function () {
        selectedKey = null;
        syncCombo();
        renderGrades();
    });
'''
new_change = '''    select.addEventListener("change", function () {
        expanded = false;
        selectedKey = null;
        syncCombo();
        renderGrades();
    });

    if (moreButton) {
        moreButton.addEventListener("click", function () {
            if (expanded) {
                var limit = initialLimit();
                if (selectedIndex >= limit) clearGradeSelection();
            }
            expanded = !expanded;
            renderGrades();
            moreButton.focus();
        });
    }
'''
assert old_change in body
body = body.replace(old_change, new_change, 1)

old_breakpoint = '''    /* Keep the panel beside the correct card when the breakpoint changes. */
    if (mobileQuery && mobileQuery.addEventListener) {
        mobileQuery.addEventListener("change", function () {
            positionGradeInfo(selectedIndex);
        });
    } else {
        window.addEventListener("resize", function () {
            positionGradeInfo(selectedIndex);
        });
    }
'''
new_breakpoint = '''    /* Keep the card count and the detail panel correct when the breakpoint
       changes (for example a tablet rotating or a desktop window resizing). */
    function onBreakpointChange() {
        if (!expanded) renderGrades();
        else positionGradeInfo(selectedIndex);
    }

    if (desktopQuery && desktopQuery.addEventListener) {
        desktopQuery.addEventListener("change", onBreakpointChange);
    } else {
        window.addEventListener("resize", onBreakpointChange);
    }

    if (mobileQuery && mobileQuery.addEventListener) {
        mobileQuery.addEventListener("change", function () {
            positionGradeInfo(selectedIndex);
        });
    }
'''
assert old_breakpoint in body
body = body.replace(old_breakpoint, new_breakpoint, 1)

header = '''/* ==========================================================================
   CALCULATOR: Material Grades and Applications
   --------------------------------------------------------------------------
   Shared replacement for the old Material Density Reference card on every
   calculator. One implementation, one markup template and one responsive
   Show More / Show Less state, driven by the existing shared grade database.
   Calculations, densities, standards and material data are untouched.
========================================================================== */
'''

TARGET.write_text(header + body, encoding="utf-8", newline="\n")
print(f"wrote {TARGET.relative_to(ROOT)} ({len(header + body)} chars)")

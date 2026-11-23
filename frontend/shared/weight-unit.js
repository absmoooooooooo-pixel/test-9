/* ==================================================
   GLOBAL KG / LB WEIGHT UNIT SWITCH START
   One shared control and one shared conversion path for
   every calculator page.

   The calculators always compute and write kilograms into
   the result fields. This module remembers that exact kg
   value, shows pounds only while LB is selected, and puts
   the original kg value back when KG is selected again, so
   repeated switching can never compound rounding.

   Only the final weight values are converted here: the
   dimensions, volume, density, quantity, formulas and the
   engineering calculation itself are never touched.
================================================== */
(function () {
    "use strict";

    var KG_TO_LB = 2.2046226218;
    var STORAGE_KEY = "mw.weightUnit";
    var KG = "kg";
    var LB = "lb";

    var unit = KG;

    try {
        var saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === LB || saved === KG) {
            unit = saved;
        }
    } catch (error) {
        /* Storage can be blocked; kilograms stay the default. */
    }

    var memory = typeof WeakMap === "function" ? new WeakMap() : null;

    /* A number in any of the site's digit systems. A trailing slash is always
       rejected so density ("7,850 kg/m³") is never mistaken for a weight. */
    var NUMBER = "[-\\u2212]?[0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u0966-\\u096F\\uFF10-\\uFF19]" +
        "[0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u0966-\\u096F\\uFF10-\\uFF19.,\\u066B\\u066C" +
        "\\u00A0\\u202F\\u2009\\u2007 ]{0,40}?";

    var vocabulary = null;
    var wholePattern = null;
    var tokenPattern = null;
    var tonnesPattern = null;
    var poundOnlyPattern = null;
    var tonnesTotalText = "tonnes total";

    /* HELPERS */

    function translate(text) {
        try {
            if (window.MW_I18N && MW_I18N.t) {
                var translated = MW_I18N.t(text);

                if (translated && translated !== text) {
                    return translated;
                }
            }
        } catch (error) {
            /* Fall back to English. */
        }

        return null;
    }

    function unique(words) {
        var seen = [];
        var out = [];

        words.forEach(function (word) {
            var value = String(word || "").trim();

            if (!value || seen.indexOf(value.toLowerCase()) !== -1) {
                return;
            }

            seen.push(value.toLowerCase());
            out.push(value);
        });

        /* Longest first so "metric tonnes" wins over "tonnes". */
        return out.sort(function (a, b) {
            return b.length - a.length;
        });
    }

    function escapeWords(words) {
        return words.map(function (word) {
            return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }).join("|");
    }

    /* The unit vocabulary follows the selected website language: Hindi and
       Marathi show "किलो" where English shows "kg". */
    function buildVocabulary() {
        var kilos = unique([
            "kg", "kgs", "kilogram", "kilograms",
            translate("kg"), translate("Kilograms")
        ]);

        var pounds = unique([
            "lb", "lbs", "pound", "pounds",
            translate("Pounds")
        ]);

        var tonnes = unique([
            "metric tonnes", "metric tons", "tonnes", "tons",
            translate("metric tonnes")
        ]);

        vocabulary = { kilos: kilos, pounds: pounds, tonnes: tonnes };

        wholePattern = new RegExp(
            "^\\s*(" + NUMBER + ")\\s*(" + escapeWords(kilos) + ")\\s*$", "i"
        );

        /* A plain lookahead instead of \\b: Arabic unit words are not ASCII
           word characters, so a word boundary would never match after them. */
        tokenPattern = new RegExp(
            "(" + NUMBER + ")\\s*(" + escapeWords(kilos.concat(tonnes)) +
            ")(?![A-Za-z])(?!\\s*\\/)", "gi"
        );

        tonnesPattern = new RegExp(
            "^\\s*(" + NUMBER + ")\\s*(" + escapeWords(tonnes) +
            ")(?![A-Za-z])", "i"
        );

        poundOnlyPattern = new RegExp(
            "^\\s*(" + NUMBER + ")\\s*(" + escapeWords(pounds) + ")\\s*$", "i"
        );

        tonnesTotalText = String(translate("tonnes total") || "tonnes total")
            .trim()
            .toLowerCase();
    }

    function isTonneWord(word) {
        var value = String(word || "").trim().toLowerCase();

        return vocabulary.tonnes.some(function (term) {
            var lower = String(term).trim().toLowerCase();
            return value === lower || value.indexOf(lower) === 0;
        });
    }

    function hasTonnesTotal(text) {
        var value = String(text || "").toLowerCase();
        return value.indexOf("tonnes total") !== -1 ||
            (!!tonnesTotalText && value.indexOf(tonnesTotalText) !== -1);
    }

    function kilosLabel() {
        return translate("kg") || "kg";
    }

    function poundsLabel() {
        return translate("Pounds") || "lb";
    }

    /* The two control captions are real dictionary keys. Arabic uses the
       recognised local abbreviations كجم / رطل; other languages keep KG / LB
       unless their own dictionary provides a shorter form. */
    function buttonLabel(key, fallback) {
        return translate(key) || fallback;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /* NUMBER HELPERS */

    function numberFrom(raw) {
        if (window.MWNumber && MWNumber.parse) {
            var parsed = MWNumber.parse(raw);

            if (isFinite(parsed)) {
                return parsed;
            }
        }

        var plain = String(raw).replace(/[^0-9.\-]/g, "");
        return Number(plain);
    }

    function decimalsOf(raw) {
        var text = window.MWNumber && MWNumber.delocalizeDigits
            ? MWNumber.delocalizeDigits(raw)
            : raw;

        text = String(text).replace(/[\s\u00A0\u202F\u2009\u2007]/g, "");

        /* Latin dot/comma, and the Arabic decimal separator (٫). */
        var cut = Math.max(
            text.lastIndexOf("."),
            text.lastIndexOf(","),
            text.lastIndexOf("\u066B")
        );

        return cut === -1 ? 0 : Math.min(6, text.length - cut - 1);
    }

    function formatNumber(value, decimals) {
        if (window.MWNumber && MWNumber.formatNumber) {
            return MWNumber.formatNumber(value, decimals);
        }

        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function render(kilos, decimals, kind) {
        if (kind === LB) {
            return formatNumber(kilos * KG_TO_LB, decimals) + " " + poundsLabel();
        }

        return formatNumber(kilos, decimals) + " " + kilosLabel();
    }

    /* CONVERSION */

    /* Converts every weight value inside one compound field, for example
       "0.072 tonnes total · 1 piece". Returns null when the field holds no
       weight value at all. */
    function toPounds(text) {
        var converted = false;

        var output = String(text).replace(tokenPattern, function (all, raw, word) {
            var value = numberFrom(raw);

            if (!isFinite(value)) {
                return all;
            }

            var kilos = isTonneWord(word) ? value * 1000 : value;

            converted = true;

            return formatNumber(kilos * KG_TO_LB, decimalsOf(raw)) + " " + poundsLabel();
        });

        return converted ? output : null;
    }

    function recordFor(element) {
        var record = memory ? memory.get(element) : element.__mwWeightRecord;

        if (!record) {
            record = {};

            if (memory) {
                memory.set(element, record);
            } else {
                element.__mwWeightRecord = record;
            }
        }

        return record;
    }

    function recordOf(element) {
        return memory ? memory.get(element) : element.__mwWeightRecord;
    }

    /* Elements that hold their whole value in a single text node, so
       rewriting the text can never remove inline markup. */
    function valueElements(root) {
        if (!root || !document.createTreeWalker) {
            return [];
        }

        var elements = [];
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;

        while ((node = walker.nextNode())) {
            var parent = node.parentElement;
            var text = node.nodeValue || "";

            if (!parent || !text.trim()) {
                continue;
            }

            if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|OPTION)$/.test(parent.tagName)) {
                continue;
            }

            if (parent.textContent.trim() !== text.trim()) {
                continue;
            }

            if (elements.indexOf(parent) === -1) {
                elements.push(parent);
            }
        }

        return elements;
    }

    function showPounds(element) {
        var record = recordFor(element);
        var text = element.textContent;

        if (record.pounds && text === record.pounds) {
            return;
        }

        /* Plain "78.50 kg" / "११.७१४ किलो": keep the exact number so the
           conversion is always taken from the calculated kilogram value. */
        var whole = text.match(wholePattern);

        if (whole) {
            var kilos = numberFrom(whole[1]);

            if (isFinite(kilos)) {
                record.kilos = kilos;
                record.decimals = decimalsOf(whole[1]);
                record.kilosText = text;
                record.pounds = render(kilos, record.decimals, LB);

                element.textContent = record.pounds;
                return;
            }
        }

        /* "0.072 tonnes total · 1 piece" summarises the main total, which the
           page rounds to three tonne decimals. Converting that rounded figure
           would show a pound value a little away from the total, so the total's
           own kilogram value is used and only the unit token is replaced. */
        var total = document.getElementById("totalWeight");
        var totalRecord = total && total !== element ? recordOf(total) : null;

        if (totalRecord && typeof totalRecord.kilos === "number" && hasTonnesTotal(text)) {
            var sameWeight = render(totalRecord.kilos, totalRecord.decimals, LB);
            var summary = text.replace(tonnesPattern, function () { return sameWeight; });

            if (summary !== text) {
                record.kilos = null;
                record.kilosText = text;
                record.pounds = summary;

                element.textContent = summary;
                return;
            }
        }

        var pounds = toPounds(text);

        if (pounds === null) {
            return;
        }

        record.kilos = null;
        record.kilosText = text;
        record.pounds = pounds;

        element.textContent = pounds;
    }

    function showKilos(element) {
        var record = recordOf(element);

        if (!record || !record.pounds) {
            return;
        }

        if (element.textContent !== record.pounds) {
            return;
        }

        element.textContent = record.kilos === null
            ? record.kilosText
            : render(record.kilos, record.decimals, KG);
    }

    /* While LB is selected the converted fields already show pounds, so the
       permanent "0.000 lbs" companion values would just repeat them. The
       pattern follows the active language, including Arabic "رطل". */
    function hidePoundCompanions(elements) {
        elements.forEach(function (element) {
            var record = recordOf(element);

            if (record && record.pounds && element.textContent === record.pounds) {
                return;
            }

            if (!poundOnlyPattern || !poundOnlyPattern.test(element.textContent.trim())) {
                return;
            }

            var target = element.closest(".stat") || element;
            target.classList.add("mw-unit-hidden");
        });
    }

    function showAllCompanions() {
        var hidden = document.querySelectorAll(".mw-unit-hidden");

        Array.prototype.forEach.call(hidden, function (element) {
            element.classList.remove("mw-unit-hidden");
        });
    }

    function resultsBox() {
        return document.getElementById("results");
    }

    function sync() {
        var results = resultsBox();

        if (!results || unit !== LB) {
            return;
        }

        var elements = valueElements(results);

        elements.forEach(showPounds);
        hidePoundCompanions(elements);
    }

    /* CONTROL */

    function updateButtonLabels() {
        var kgButton = document.getElementById("kgBtn");
        var lbButton = document.getElementById("lbBtn");
        var kgLabel = buttonLabel("KG", "KG");
        var lbLabel = buttonLabel("LB", "LB");

        if (kgButton && kgButton.textContent !== kgLabel) {
            kgButton.textContent = kgLabel;
        }

        if (lbButton && lbButton.textContent !== lbLabel) {
            lbButton.textContent = lbLabel;
        }
    }

    function updateControls() {
        var kgButton = document.getElementById("kgBtn");
        var lbButton = document.getElementById("lbBtn");
        var isKilos = unit === KG;

        if (!kgButton || !lbButton) {
            return;
        }

        updateButtonLabels();

        kgButton.classList.toggle("active", isKilos);
        lbButton.classList.toggle("active", !isKilos);

        kgButton.setAttribute("aria-pressed", String(isKilos));
        lbButton.setAttribute("aria-pressed", String(!isKilos));

        kgButton.setAttribute("title", translate("Kilograms") || "Kilograms");
        lbButton.setAttribute("title", translate("Pounds") || "Pounds");

        var group = kgButton.parentElement;

        if (group) {
            group.setAttribute("aria-label", translate("Weight unit") || "Weight unit");
        }
    }

    /* The switch belongs beside the Material Selection heading, opposite the
       title and above the material fields. The dropdown in that card finds the
       heading reliably, including when the page is shown in another language;
       dish ends label their heading explicitly. */
    function materialHeading() {
        var labelled = document.getElementById("materialTitle");

        if (labelled && labelled.tagName === "H2") {
            return labelled;
        }

        var material = document.getElementById("material");

        if (!material || !material.closest) {
            return null;
        }

        var card = material.closest(".card");

        if (!card) {
            return null;
        }

        var heading = card.querySelector("h2");

        return heading && heading.tagName === "H2" ? heading : null;
    }

    function buildSwitch() {
        /* One control per page, wherever an earlier layout may have put it. */
        var existing = document.querySelector(".weight-unit-switch");

        if (existing) {
            return existing;
        }

        var heading = materialHeading();

        if (!heading) {
            return null;
        }

        var head = heading.parentElement;

        if (!head || !head.classList.contains("material-head")) {
            head = document.createElement("div");
            head.className = "material-head";
            heading.parentNode.insertBefore(head, heading);
            head.appendChild(heading);
        }

        var group = document.createElement("div");
        group.className = "unit-switch weight-unit-switch";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", translate("Weight unit") || "Weight unit");
        group.innerHTML =
            '<button id="kgBtn" class="unit-btn active" type="button" aria-pressed="true">' +
            escapeHtml(buttonLabel("KG", "KG")) + "</button>" +
            '<button id="lbBtn" class="unit-btn" type="button" aria-pressed="false">' +
            escapeHtml(buttonLabel("LB", "LB")) + "</button>" +
            '<span class="unit-switch__thumb" aria-hidden="true"></span>';

        head.appendChild(group);

        group.querySelector("#kgBtn").addEventListener("click", function () {
            setUnit(KG);
        });

        group.querySelector("#lbBtn").addEventListener("click", function () {
            setUnit(LB);
        });

        return group;
    }

    /* When the website language changes the unit words change too, so the
       displayed values are rewritten from their remembered kilogram value. */
    function relabelResults() {
        var results = resultsBox();

        if (!results) {
            return;
        }

        valueElements(results).forEach(function (element) {
            var record = recordOf(element);

            if (!record || !record.pounds) {
                return;
            }

            if (record.kilos === null || record.kilos === undefined) {
                return;
            }

            record.kilosText = render(record.kilos, record.decimals, KG);
            record.pounds = render(record.kilos, record.decimals, LB);

            element.textContent = unit === LB ? record.pounds : record.kilosText;
        });

        if (unit === LB) {
            hidePoundCompanions(valueElements(results));
        }
    }

    function applyUnit() {
        updateControls();

        var results = resultsBox();

        if (!results) {
            return;
        }

        var elements = valueElements(results);

        if (unit === LB) {
            elements.forEach(showPounds);
            hidePoundCompanions(elements);
        } else {
            elements.forEach(showKilos);
            showAllCompanions();
        }
    }

    function setUnit(next) {
        if (next !== KG && next !== LB) {
            return;
        }

        if (next === unit) {
            updateControls();
            return;
        }

        unit = next;

        try {
            window.localStorage.setItem(STORAGE_KEY, unit);
        } catch (error) {
            /* The choice still applies to this page. */
        }

        applyUnit();

        /* The formula card follows the same selection. */
        window.dispatchEvent(new CustomEvent("mw:weightunit", { detail: { unit: unit } }));
    }

    /* The calculators redraw their results on every calculation, so the
       observer converts any freshly written kg value straight away. */
    var scheduled = false;

    function schedule() {
        if (scheduled) {
            return;
        }

        scheduled = true;

        /* A timer, not requestAnimationFrame: frames are paused while the tab
           is in the background, and a value written then must still convert. */
        window.setTimeout(function () {
            scheduled = false;
            sync();
        }, 0);
    }

    function watch() {
        var results = resultsBox();

        if (!results || typeof MutationObserver !== "function") {
            return;
        }

        new MutationObserver(schedule).observe(results, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function start() {
        buildVocabulary();

        if (!buildSwitch()) {
            return;
        }

        updateControls();
        watch();

        if (unit === LB) {
            applyUnit();
        }

        window.dispatchEvent(new CustomEvent("mw:weightunit", { detail: { unit: unit } }));

        window.addEventListener("mw:languagechange", function () {
            buildVocabulary();
            updateControls();
            relabelResults();
        });

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                sync();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.MWWeightUnit = {
        get unit() {
            return unit;
        },
        set: setUnit,
        sync: sync,
        kgToLb: KG_TO_LB
    };
})();
/* ==================================================
   GLOBAL KG / LB WEIGHT UNIT SWITCH END
================================================== */

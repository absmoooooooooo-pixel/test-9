/* ==================================================
   WEIGHT CALCULATION FORMULA – KG / LB SYNC START
   The result values are converted by weight-unit.js. This
   module does the same job for the Weight Calculation
   Formula card on every calculator page: the equation, the
   legend, the worked example and the step list follow the
   selected weight unit.

   Each page keeps its own geometry. The pounds form is
   derived from that page's own kilogram formula:

       W (lb) = [ page's kg expression ] x 2.2046226218

   so a plate shows the plate formula, a pipe the pipe
   formula and so on. Nothing is recomputed and no factor is
   applied twice: the kilogram value written by the
   calculator is the single source of every pound figure.
================================================== */
(function () {
    "use strict";

    var KG_TO_LB = 2.2046226218;
    var FACTOR = "2.2046226218";
    var LB = "lb";

    var EQUATION = ".formula-equation";
    var LEGEND = ".formula-legend";
    var EXAMPLE_EQUATION = ".example-equation";
    var EXAMPLE_RESULT = ".example-result strong";
    var STEP_ITEM = ".plate-example ol li";

    /* HELPERS */

    function unitIsLb() {
        return !!(window.MWWeightUnit && window.MWWeightUnit.unit === LB);
    }

    function numberFrom(raw) {
        if (window.MWNumber && window.MWNumber.parse) {
            var parsed = window.MWNumber.parse(raw);

            if (isFinite(parsed)) {
                return parsed;
            }
        }

        return Number(String(raw).replace(/[^0-9.\-]/g, ""));
    }

    function decimalsOf(raw) {
        var text = window.MWNumber && window.MWNumber.delocalizeDigits
            ? window.MWNumber.delocalizeDigits(raw)
            : raw;

        text = String(text).replace(/[\s\u00A0\u202F\u2009\u2007]/g, "");

        var cut = Math.max(
            text.lastIndexOf("."),
            text.lastIndexOf(","),
            text.lastIndexOf("\u066B")
        );

        return cut === -1 ? 0 : Math.min(6, text.length - cut - 1);
    }

    function formatNumber(value, decimals) {
        if (window.MWNumber && window.MWNumber.formatNumber) {
            return window.MWNumber.formatNumber(value, decimals);
        }

        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /* FORMULA TEXT

       A definition clause after a comma, as in
       "W = (pi/4) x (OD^2 - ID^2) x L x rho / 10^6, ID = OD - 2T",
       is kept outside the bracketed expression so the factor can
       never be read as multiplying the definition. */

    function splitClause(rhs) {
        var match = rhs.match(/^([\s\S]*?)(,\s*(?:&nbsp;|\s)*[A-Za-z][^,=]*=[\s\S]*)$/);

        if (match) {
            return { main: match[1], clause: match[2] };
        }

        return { main: rhs, clause: "" };
    }

    function poundsLabel(left) {
        var symbol = left.replace(/\(kg\)/ig, "").trim();

        if (!symbol) {
            symbol = "W";
        }

        return symbol + " (lb)";
    }

    var WEIGHT_EQUALS = /\b(W|Weight)\b\s*(?:\(kg\))?\s*=\s*/g;

    /* The weight clause is not always first: worked examples read
       "ID = 60 - 2 x 5 = 50 mm; W = ...", and method cards read
       "V = ..., r = D / 2, W = ...". The last weight clause is the one
       that produces the weight, so only that clause carries the factor. */
    function lastWeightClause(html) {
        var found = null;
        var match;

        WEIGHT_EQUALS.lastIndex = 0;

        while ((match = WEIGHT_EQUALS.exec(html))) {
            found = { start: match.index, end: WEIGHT_EQUALS.lastIndex, symbol: match[1] };
        }

        return found;
    }

    function poundsEquation(html) {
        /* Never wrap a formula that already carries the factor. */
        if (html.indexOf(FACTOR) !== -1) {
            return null;
        }

        var found = lastWeightClause(html);
        var prefix;
        var label;
        var rest;

        if (found) {
            prefix = html.slice(0, found.start);
            label = found.symbol + " (lb)";
            rest = html.slice(found.end);
        } else {
            var equals = html.indexOf("=");

            if (equals === -1) {
                return null;
            }

            prefix = "";
            label = poundsLabel(html.slice(0, equals));
            rest = html.slice(equals + 1);
        }

        var parts = splitClause(rest);
        var main = parts.main.trim();

        if (!main) {
            return null;
        }

        return prefix + label + " = [ " + main + " ] &times; " + FACTOR + parts.clause;
    }

    function poundsLegend(html) {
        if (!/\(kg\)/i.test(html)) {
            return null;
        }

        /* The first (kg) names the weight symbol; density uses (g/cm3)
           or (kg/m3) and is left alone. */
        return html.replace(/\(kg\)/i, "(lb)");
    }

    function poundsStep(html) {
        if (html.indexOf(FACTOR) !== -1 || html.indexOf("(kg)") === -1) {
            return null;
        }

        var changed = false;

        var output = html.replace(
            /(W|Weight)\s*=\s*([\s\S]*?)\s*\(kg\)/g,
            function (all, symbol, expression) {
                changed = true;

                return symbol + " (lb) = [ " + expression + " ] &times; " + FACTOR;
            }
        );

        return changed ? output : null;
    }

    function poundsResult(text) {
        var dual = String(text).match(
            /^([0-9\u0660-\u0669\u0966-\u096F\uFF10-\uFF19][0-9\u0660-\u0669\u0966-\u096F.,\u066B\u066C\u00A0\u202F ]*)\s*kg\s*\/\s*([0-9][0-9.,]*)\s*lbs?$/i
        );

        if (dual) {
            return dual[2].replace(/[.,]$/, "") + " lb";
        }

        /* The unit word may already be translated (किग्रा, كجم), so the
           number and any unit word are taken apart and only a pounds label
           is rejected. */
        var single = String(text).match(
            /^([0-9\u0660-\u0669\u0966-\u096F\uFF10-\uFF19][0-9\u0660-\u0669\u0966-\u096F.,\u066B\u066C\u00A0\u202F ]*)\s*(\D*)$/
        );

        if (!single) {
            return null;
        }

        if (/\blbs?\b|pounds?|\u092A\u093E\u0909\u0902\u0921|\u0631\u0637\u0644/i.test(single[2])) {
            return null;
        }

        var kilos = numberFrom(single[1]);

        if (!isFinite(kilos)) {
            return null;
        }

        return formatNumber(kilos * KG_TO_LB, decimalsOf(single[1])) + " lb";
    }

    /* DOM STATE

       The original kilogram markup is remembered per element, so
       switching back to KG restores exactly what the page wrote. */

    var state = typeof WeakMap === "function" ? new WeakMap() : null;

    function recordOf(element) {
        var record = state ? state.get(element) : element.__mwFormulaUnit;

        if (!record) {
            record = { html: null, text: null, written: null, writtenText: null };

            if (state) {
                state.set(element, record);
            } else {
                element.__mwFormulaUnit = record;
            }
        }

        return record;
    }

    function applyHtml(element, transform) {
        var record = recordOf(element);
        var current = element.innerHTML;
        var applied = record.written !== null && current === record.written;


        /* A page script may rewrite the card (dish ends changes method);
           anything that is not our own output becomes the new original. */
        if (!applied) {
            record.html = current;
            record.written = null;
        }

        var next = transform(record.html);

        if (!next || next === record.html) {
            return;
        }

        /* The browser normalises entities while parsing (&times; becomes
           ×), so the written state is read back from the DOM. */
        element.innerHTML = next;
        record.written = element.innerHTML;
    }

    function restoreHtml(element) {
        var record = recordOf(element);

        if (record.written === null) {
            return;
        }

        if (element.innerHTML !== record.written) {
            record.written = null;
            return;
        }

        element.innerHTML = record.html;
        record.written = null;
    }

    function applyText(element, transform) {
        var record = recordOf(element);
        var current = element.textContent;
        var applied = record.writtenText !== null && current === record.writtenText;

        if (!applied) {
            record.text = current;
            record.writtenText = null;
        }

        var next = transform(record.text);

        if (!next || next === record.text) {
            return;
        }

        element.textContent = next;
        record.writtenText = element.textContent;
    }

    function restoreText(element) {
        var record = recordOf(element);

        if (record.writtenText === null) {
            return;
        }

        if (element.textContent !== record.writtenText) {
            record.writtenText = null;
            return;
        }

        element.textContent = record.text;
        record.writtenText = null;
    }

    /* CARDS */

    function allCards() {
        var cards = [];

        Array.prototype.forEach.call(document.querySelectorAll(EQUATION), function (element) {
            var card = element.closest ? element.closest("section") : element.parentElement;

            if (card && cards.indexOf(card) === -1) {
                cards.push(card);
            }
        });

        return cards;
    }

    function each(root, selector, callback) {
        Array.prototype.forEach.call(root.querySelectorAll(selector), callback);
    }

    function applyCard(card) {
        var equation = card.querySelector(EQUATION);

        if (equation) {
            applyHtml(equation, poundsEquation);
        }

        var legend = card.querySelector(LEGEND);

        if (legend) {
            applyHtml(legend, poundsLegend);
        }

        each(card, EXAMPLE_EQUATION, function (element) {
            applyHtml(element, poundsEquation);
        });

        each(card, EXAMPLE_RESULT, function (element) {
            applyText(element, poundsResult);
        });

        each(card, STEP_ITEM, function (element) {
            applyHtml(element, poundsStep);
        });
    }

    function restoreCard(card) {
        each(card, [EQUATION, LEGEND, EXAMPLE_EQUATION, STEP_ITEM].join(","), restoreHtml);
        each(card, EXAMPLE_RESULT, restoreText);
    }

    /* OBSERVERS

       The calculators redraw their results, and dish ends rewrites
       its method card, so the card is watched while LB is selected. */

    var observed = typeof WeakMap === "function" ? new WeakMap() : null;
    var scheduled = false;
    var suspended = false;

    function scheduleRefresh() {
        if (scheduled || suspended || !unitIsLb()) {
            return;
        }

        scheduled = true;

        window.setTimeout(function () {
            scheduled = false;

            if (!unitIsLb() || suspended) {
                return;
            }

            allCards().forEach(applyCard);
        }, 0);
    }

    function watch(card) {
        if (!window.MutationObserver || (observed && observed.get(card))) {
            return;
        }

        if (observed) {
            observed.set(card, true);
        }

        new MutationObserver(scheduleRefresh).observe(card, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function refresh() {
        var cards = allCards();

        cards.forEach(function (card) {
            watch(card);

            if (unitIsLb()) {
                applyCard(card);
            } else {
                restoreCard(card);
            }
        });
    }

    function start() {
        refresh();

        window.addEventListener("mw:weightunit", refresh);

        window.addEventListener("mw:languagechange", function () {
            /* Translation is already complete when this event fires. Rebuild
               synchronously so the card never shows a stale or half-updated
               formula for a later timer to repair. */
            suspended = false;
            refresh();
        });

        /* A late script may build the card after this module runs. */
        document.addEventListener("click", function (event) {
            if (event.target && event.target.closest &&
                event.target.closest("#calculateBtn, .calculate-btn")) {
                window.setTimeout(refresh, 60);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.MWFormulaUnit = {
        get unit() {
            return unitIsLb() ? LB : "kg";
        },
        refresh: refresh,
        kgToLb: KG_TO_LB
    };
})();
/* ==================================================
   WEIGHT CALCULATION FORMULA – KG / LB SYNC END
================================================== */

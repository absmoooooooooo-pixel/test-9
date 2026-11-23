/* ==================================================
   NUMERAL LOCALIZATION FOR DISPLAYED TEXT START
   Readouts are written by the calculators as plain numbers in
   many places (quantity, dimensions, volume, results, history
   rows and reference tables). The formatted values already
   follow the language; this module covers the remaining text
   so Devanagari and Arabic-Indic languages do not show Latin
   digits next to localized ones. Standard designations and
   engineering symbols are skipped.

   Only digits are replaced. Decimal and thousands separators,
   units, symbols and dimension values stay exactly as written,
   and standard designations (ISO 4017, M10, ASTM A36) keep
   their Latin digits.
================================================== */
(function () {
    "use strict";

    /* The whole document is scanned; SKIP below protects formulas, standards,
       inputs, buttons and code-like elements. This keeps every calculator and
       every dynamic readout consistent without a per-page container list. */
    var CONTAINERS = "body";

    var SKIP = "script,style,noscript,defs,clipPath,marker,input,select,textarea,button,code,pre," +
        ".formula-equation,.formula-legend,.example-equation";

    var STANDARD = /(?:ISO|DIN|ASME|ASTM|ANSI|JIS|EN|BS|IS|GB|AISI|SAE)\s+$/i;

    function needsLocalization() {
        var config = window.MWNumber && window.MWNumber.currentConfig
            ? window.MWNumber.currentConfig()
            : null;

        return !!(config && config.numberingSystem && config.numberingSystem !== "latn");
    }

    function localizeDigits(text) {
        return window.MWNumber && window.MWNumber.localizeDigits
            ? window.MWNumber.localizeDigits(text)
            : text;
    }

    function localizeTextNode(node) {
        var text = node.nodeValue;

        if (!text || !/[0-9]/.test(text)) {
            return;
        }

        var parent = node.parentElement;

        if (!parent || (parent.closest && parent.closest(SKIP))) {
            return;
        }

        /* While pounds are shown the formula module owns this value and
           compares its exact text to restore kilograms later. */
        if (parent.closest(".example-result") &&
            window.MWWeightUnit && window.MWWeightUnit.unit === "lb") {
            return;
        }

        var next = text.replace(/[0-9]+(?:[.,][0-9]+)*/g, function (match, offset, whole) {
            var before = whole.slice(0, offset);

            /* M10, SS304: a digit inside a designation is not a value. */
            if (/[A-Za-z]$/.test(before)) {
                return match;
            }

            /* ISO 4017, ASTM A36: keep standard numbers in Latin digits. */
            if (STANDARD.test(before)) {
                return match;
            }

            return localizeDigits(match);
        });

        if (next !== text) {
            node.nodeValue = next;
        }
    }

    function localizeRoot(root) {
        if (!root || !document.createTreeWalker) {
            return;
        }

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [];
        var node;

        while ((node = walker.nextNode())) {
            nodes.push(node);
        }

        nodes.forEach(localizeTextNode);
    }

    function localizeAll() {
        if (!needsLocalization()) {
            return;
        }

        Array.prototype.forEach.call(document.querySelectorAll(CONTAINERS), localizeRoot);
    }

    /* This module deliberately has no MutationObserver and no language-change
       timer. The central translator calls refresh() inside its own observer-
       free transaction, so the numeral pass can never become a delayed,
       independently painted pass that makes text blink. */
    function start() {
        localizeAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.MWTextNumbers = { refresh: localizeAll };
})();
/* ==================================================
   NUMERAL LOCALIZATION FOR DISPLAYED TEXT END
================================================== */

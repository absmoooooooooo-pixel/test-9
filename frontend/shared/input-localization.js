/* ==================================================
   NUMERAL LOCALIZATION FOR TYPED INPUT START
   On a computer the numeric fields keep the native keyboard,
   so this module localizes what is shown while the user types:
   Hindi and Marathi show Devanagari digits, Arabic shows
   Arabic-Indic digits, and the other languages keep Latin
   digits with their own decimal separator.

   The typed value is stored twice: the field shows the
   localized text, and data-nk-raw always holds the plain
   ASCII number. Every calculator already reads its fields
   through MWNumber.parse, so the engineering value is never
   changed by the localized display.

   Touch devices are left alone: numeric-keypad.js already
   owns those fields and its on-screen keypad.
================================================== */
(function () {
    "use strict";

    var CANONICAL = /^[+-]?\d*(?:\.\d*)?$/;

    function isMobileDevice() {
        if (window.NumericKeypad && typeof window.NumericKeypad.isMobileDevice === "function") {
            return window.NumericKeypad.isMobileDevice();
        }

        var coarse = window.matchMedia && window.matchMedia("(any-pointer: coarse)").matches;
        var fine = window.matchMedia && window.matchMedia("(any-pointer: fine)").matches;

        if (coarse && !fine) {
            return true;
        }

        var agent = navigator.userAgent || "";

        if (/Android|iPhone|iPod/i.test(agent) && !/CrOS/i.test(agent)) {
            return true;
        }

        return /Macintosh/i.test(agent) && (navigator.maxTouchPoints || 0) > 1;
    }

    function currentLanguage() {
        return (window.MW_I18N && window.MW_I18N.language) || "en";
    }

    function localeConfig(lang) {
        if (window.MWNumber && window.MWNumber.configFor) {
            return window.MWNumber.configFor(lang || currentLanguage());
        }

        return { decimal: ".", group: ",", numberingSystem: "latn" };
    }

    /* Any accepted spelling of a number -> plain ASCII digits, one dot,
       at most one leading minus. Partial entries ("-", "0.") survive
       while the user is still typing. */
    function canonicalize(text, lang) {
        var value = window.MWNumber && window.MWNumber.delocalizeDigits
            ? window.MWNumber.delocalizeDigits(String(text || ""))
            : String(text || "");

        var config = localeConfig(lang);

        value = value.replace(/[\s\u00A0\u202F\u2009\u2007\u2060'\u2019]/g, "");

        /* Plain ASCII (what the page itself writes on a reset, and what any
           Latin-digit locale types) is already canonical: its dot is the
           decimal point, never a thousands separator. */
        if (/^[+-]?\d*(?:\.\d*)?$/.test(value)) {
            return value;
        }

        if (config.group && config.group !== config.decimal) {
            value = value.split(config.group).join("");
        }

        if (config.decimal && config.decimal !== ".") {
            value = value.split(config.decimal).join(".");
        }

        if (value.indexOf(".") === -1 && value.indexOf(",") !== -1) {
            value = value.replace(",", ".");
        }

        value = value.split(",").join("");

        var negative = value.charAt(0) === "-" || value.charAt(0) === "\u2212";

        value = value.replace(/[^0-9.]/g, "");

        var dot = value.indexOf(".");

        if (dot !== -1) {
            value = value.slice(0, dot + 1) + value.slice(dot + 1).split(".").join("");
        }

        if (negative) {
            value = "-" + value;
        }

        return CANONICAL.test(value) ? value : "";
    }

    function displayValue(raw, lang) {
        if (raw === "") {
            return "";
        }

        var config = localeConfig(lang);
        var text = config.decimal && config.decimal !== "."
            ? raw.split(".").join(config.decimal)
            : raw;

        return window.MWNumber && window.MWNumber.localizeDigits
            ? window.MWNumber.localizeDigits(text, lang)
            : text;
    }

    function store(field, raw) {
        field.setAttribute("data-nk-raw", raw);
        return raw;
    }

    function onInput(event) {
        var field = event.target;
        var shown = String(field.value || "");
        var caret = field.selectionStart;
        var before = caret === null || caret === undefined ? shown : shown.slice(0, caret);

        var lang = currentLanguage();
        var raw = store(field, canonicalize(shown, lang));
        var prefix = canonicalize(before, lang);
        var text = displayValue(raw, lang);

        field.__mwLang = lang;

        if (shown !== text) {
            field.value = text;
        }

        if (caret !== null && caret !== undefined) {
            var position = Math.min(text.length, prefix.length);

            try {
                field.setSelectionRange(position, position);
            } catch (error) {
                /* Fields that refuse a selection keep the browser default. */
            }
        }
    }

    /* Re-reads the field so a programmatic write (a reset, a unit change or
       a language change) cannot leave stale or unlocalized digits. */
    function refresh(field) {
        if (!field || !field.classList || !field.classList.contains("mw-num-field")) {
            return;
        }

        /* The visible text was produced in one locale; read it back with that
           same locale, then render it in the current one, so a decimal point
           can never be mistaken for the other locale's thousands separator. */
        var previous = field.__mwLang || currentLanguage();
        var lang = currentLanguage();
        var raw = store(field, canonicalize(field.value, previous));
        var text = displayValue(raw, lang);

        field.__mwLang = lang;

        if (field.value !== text) {
            field.value = text;
        }
    }

    function prepare(field) {
        if (!field || field.tagName !== "INPUT") {
            return;
        }

        if (field.classList.contains("mw-num-field") || field.classList.contains("nk-field")) {
            return;
        }

        if (field.type !== "number" || field.readOnly || field.disabled) {
            return;
        }

        /* A localized digit cannot live in a native number input, so the
           field becomes a text field that behaves like a number field:
           digits, one decimal separator and an optional leading minus. */
        field.type = "text";
        field.setAttribute("inputmode", "decimal");
        field.setAttribute("autocomplete", "off");
        field.setAttribute("autocorrect", "off");
        field.setAttribute("autocapitalize", "off");
        field.setAttribute("spellcheck", "false");
        field.classList.add("mw-num-field");

        var lang = currentLanguage();

        store(field, canonicalize(field.value, lang));
        field.value = displayValue(field.getAttribute("data-nk-raw"), lang);
        field.__mwLang = lang;

        field.addEventListener("input", onInput);
        field.addEventListener("focus", function () { refresh(field); });
        field.addEventListener("change", function () { refresh(field); });
    }

    function prepareAll(root) {
        var scope = root && root.querySelectorAll ? root : document;

        if (root && root.matches && root.matches("input")) {
            prepare(root);
        }

        Array.prototype.forEach.call(scope.querySelectorAll("input"), prepare);
    }

    function relocalizeAll() {
        Array.prototype.forEach.call(
            document.querySelectorAll("input.mw-num-field"),
            refresh
        );
    }

    function start() {
        prepareAll(document);

        if (window.MutationObserver) {
            new MutationObserver(function (records) {
                records.forEach(function (record) {
                    Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                        if (node.nodeType === 1) {
                            prepareAll(node);
                        }
                    });
                });
            }).observe(document.body, { childList: true, subtree: true });
        }

        window.addEventListener("mw:languagechange", relocalizeAll);
        window.addEventListener("pageshow", relocalizeAll);

        /* Reset writes its defaults straight into the fields, so the display
           and the stored value are read back once the page has finished. */
        document.addEventListener("click", function (event) {
            var target = event.target;

            if (target && target.closest && target.closest("#resetBtn, [data-reset]")) {
                window.setTimeout(relocalizeAll, 0);
            }
        });
    }

    if (isMobileDevice()) {
        return;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.MWInputNumbers = {
        canonicalize: canonicalize,
        display: displayValue,
        refresh: relocalizeAll,
        isMobileDevice: isMobileDevice
    };
})();
/* ==================================================
   NUMERAL LOCALIZATION FOR TYPED INPUT END
================================================== */

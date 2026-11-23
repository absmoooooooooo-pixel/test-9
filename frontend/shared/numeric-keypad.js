/* ==================================================
   NUMERIC KEYPAD JAVASCRIPT START
   In-page numeric keyboard for phones and tablets.

   HOW IT WORKS
   ------------
   The page checks the pointing device, not the window width:
   a phone or tablet reports a coarse pointer with no fine pointer,
   while a PC or laptop always has a fine pointer (mouse, trackpad).
   On a PC this file does nothing at all - the field keeps its real
   number input and the physical keyboard works exactly as before.

   On a phone/tablet every numeric field is switched to
   inputmode="none" AND made read-only, so the Android or iPhone
   keyboard never opens, and tapping the field shows the keypad
   built below.

   WHY READ-ONLY IS THE PART THAT MATTERS
   --------------------------------------
   inputmode="none" is only a hint. iOS Safari ignores it (the normal
   keyboard opens anyway) and some Android builds and third-party
   keyboards ignore it too, so on its own it can never be relied on.
   A read-only field is never given a keyboard by any mobile browser,
   in a tab or in an installed PWA, and its value can still be set by
   this file - so it is applied as well, and every route that can
   focus a field (a tap, "Next", or a calculator moving focus to the
   next input) is covered.

   A number input refuses to hold a trailing decimal point
   ("0." is not a valid number), which would break decimal entry
   from a keypad. On mobile only, those fields therefore become
   text fields that keep the same look and still expose .value to
   the calculator, so 0.5 can be typed digit by digit.

   ANDROID BACK BUTTON
   -------------------
   While the keypad is open, one history marker is added. The first Back
   press consumes that marker and only hides the keypad; a fresh marker is
   added so the second press is caught and redirected to the site's real
   Calculator Home Page. Hiding for Back never edits a value or emits input
   or change events, so typed values and results stay exactly as they were.
================================================== */
"use strict";

(function () {
    let panel = null;
    let activeField = null;
    let started = false;
    let observer = null;

    /* Android Back handling. A single history marker is pushed while the
       custom keypad is in use. The first Back press consumes that marker and
       only hides the keypad; the marker is pushed again so a second press can
       be recognised and redirected to the real calculator home page. */
    const BACK_GUARD_KEY = "mwNumericKeypadGuard";
    let backGuardActive = false;
    let navigatingHome = false;

    /* A phone or tablet has a coarse pointer only. A PC or laptop always has
       a fine pointer, so touch-screen laptops never show the keypad.

       The queries are read on every call, not once at load: a few Android
       browsers only settle the pointer type after the first touch, and a
       page may call NumericKeypad.start() itself later on.

       A stylus or a paired mouse makes "any-pointer: fine" match on some
       Android phones, which would leave the native keyboard in place, so
       the user agent of a handheld device is used as a fallback. Desktop
       agents (including a touch-screen laptop) never match either test. */
    function isMobileDevice() {
        if (!window.matchMedia) {
            return false;
        }

        const coarse = window.matchMedia("(pointer: coarse)");
        const fine = window.matchMedia("(any-pointer: fine)");

        if (coarse.matches && !fine.matches) {
            return true;
        }

        return isHandheldDevice();
    }

    function isHandheldDevice() {
        const agent = navigator.userAgent || "";

        /* Chrome OS also mentions Linux but never Android. */
        if (/Android|iPhone|iPod/i.test(agent) && !/CrOS/i.test(agent)) {
            return true;
        }

        /* iPadOS 13 and later report a desktop Mac agent but still have a
           touch screen; a real Mac reports no touch points at all. */
        if (/Macintosh/i.test(agent) && (navigator.maxTouchPoints || 0) > 1) {
            return true;
        }

        return false;
    }

    function numericFields() {
        return Array.prototype.slice.call(document.querySelectorAll("input.nk-field"))
            .filter(function (field) {
                /* Read-only is set by this file, so it is deliberately not
                   filtered here: "Next" has to keep moving through the fields. */
                return !field.disabled && field.getClientRects().length > 0;
            });
    }

    function isKeypadOpen() {
        return Boolean(panel && panel.classList.contains("is-open"));
    }

    /* The home pill already points to the site's real Calculator Home Page on
       every calculator page, so it is used instead of a hard-coded route. */
    function getHomeUrl() {
        const link = document.querySelector(".home-pill") ||
            document.querySelector(".footer-home");

        if (link && link.href) {
            return link.href;
        }

        try {
            return new URL("../../../index.html", window.location.href).href;
        } catch (error) {
            return "../../../index.html";
        }
    }

    function pushBackGuard() {
        if (!window.history || typeof window.history.pushState !== "function") {
            return false;
        }

        try {
            const state = Object.assign({}, window.history.state || {});
            state[BACK_GUARD_KEY] = true;
            window.history.pushState(state, "");
            backGuardActive = true;
            return true;
        } catch (error) {
            /* Some embedded browsers reject history writes; normal Back then
               keeps its default behaviour instead of breaking the calculator. */
            return false;
        }
    }

    /* Only one marker is ever needed. Reopening the keypad reuses the marker
       that is already in the history stack instead of adding another one. */
    function armBackGuard() {
        if (!backGuardActive) {
            pushBackGuard();
        }
    }

    /* Hiding for Back is deliberately different from closeKeypad(): it does
       not tidy a trailing decimal, emit input/change, or blur the field. Every
       typed value and every calculation result stays exactly as it was. */
    function hideKeypadForBack() {
        const field = activeField;

        activeField = null;

        if (panel) {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
        }

        if (field) {
            field.classList.remove("nk-active");
        }
    }

    function goHomeFromCalculator() {
        if (navigatingHome) {
            return;
        }

        navigatingHome = true;
        backGuardActive = false;

        /* replace() avoids adding the calculator page back into history, so
           there is no loop when Back is pressed again on the home page. */
        try {
            window.location.replace(getHomeUrl());
        } catch (error) {
            window.location.href = getHomeUrl();
        }
    }

    function onBackNavigation() {
        if (!backGuardActive || navigatingHome) {
            return;
        }

        if (isKeypadOpen()) {
            hideKeypadForBack();
            /* This Back press consumed the marker. Add one more so the next
               Back press is still caught and sent to the home page. */
            pushBackGuard();
            return;
        }

        goHomeFromCalculator();
    }

    /* Sets one field up for the keypad. Only number fields are touched, and
       the work is done once per field. */
    function prepareField(field) {
        if (!field || !field.tagName || field.tagName !== "INPUT") {
            return;
        }

        const prepared = field.classList.contains("nk-field");

        if (!prepared && field.type !== "number") {
            return;
        }

        if (!field.hasAttribute("data-nk-original-type")) {
            field.setAttribute("data-nk-original-type", field.type);
        }

        /* A trailing decimal point has to be typeable, so the field is kept a
           text field; the browser would otherwise normalise "0." away. */
        if (field.type !== "text") {
            field.type = "text";
        }

        if (!prepared) {
            field.setAttribute("autocomplete", "off");
            field.setAttribute("autocorrect", "off");
            field.setAttribute("autocapitalize", "off");
            field.setAttribute("spellcheck", "false");
            field.classList.add("nk-field");
        }

        /* Read-only is what actually keeps the native keyboard away; the
           inputmode hint is kept for the browsers that honour it. */
        if (field.getAttribute("inputmode") !== "none") {
            field.setAttribute("inputmode", "none");
        }

        if (field.readOnly !== true) {
            field.readOnly = true;
        }

        if (field.getAttribute("data-nk-readonly") !== "1") {
            field.setAttribute("data-nk-readonly", "1");
        }
    }

    /* Applies the protection again if anything rewrote the attributes, and
       returns the field when it is one of ours. Preparing is cheap and only
       writes when something is actually out of place. */
    function enforceField(field) {
        if (!field || !field.tagName || field.tagName !== "INPUT") {
            return null;
        }

        prepareField(field);

        return field.classList.contains("nk-field") ? field : null;
    }

    function prepareAll(root) {
        const scope = root && root.querySelectorAll ? root : document;

        if (root && root.matches && root.matches("input")) {
            prepareField(root);
        }

        Array.prototype.forEach.call(scope.querySelectorAll("input"), prepareField);
    }

    /* ---- locale-aware keypad display ---- */
    const DIGIT_MAPS = {
        deva: ["०","१","२","३","४","५","६","७","८","९"],
        arab: ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"]
    };
    /* Keypad labels are ordinary translation keys now: adding a language only
       needs a dictionary entry, never a change to this component. */
    const LABEL_KEYS = {
        next: "Next",
        backspace: "Backspace",
        decimal: "Decimal point",
        keypad: "Numeric keypad"
    };
    const FALLBACK_LABELS = {
        next: "Next",
        backspace: "Backspace",
        decimal: "Decimal point",
        keypad: "Numeric keypad"
    };

    function currentLang() {
        if (window.MW_I18N && MW_I18N.language) { return MW_I18N.language; }
        const l = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
        return l || "en";
    }
    function localeConfig() {
        if (window.MWNumber && MWNumber.configFor) { return MWNumber.configFor(currentLang()); }
        return { numberingSystem: "latn", decimal: "." };
    }
    function localizeDigit(d) {
        const cfg = localeConfig();
        const map = DIGIT_MAPS[cfg.numberingSystem];
        return map ? map[Number(d)] : String(d);
    }
    function localizeLabel(kind) {
        const key = LABEL_KEYS[kind] || kind;
        if (window.MW_I18N && typeof MW_I18N.t === "function") {
            const translated = MW_I18N.t(key);
            if (translated) { return translated; }
        }
        return FALLBACK_LABELS[kind] || key;
    }
    function decimalChar() { return localeConfig().decimal || "."; }

    function syncCanonical(field) {
        /* Ensure data-nk-raw holds the canonical ASCII numeric string. */
        let raw = field.getAttribute("data-nk-raw");
        if (raw === null || raw === undefined) {
            const v = String(field.value || "").trim();
            if (v === "") {
                raw = "";
            } else if (window.MWNumber && MWNumber.parse) {
                // Parse localized display to a number, then store canonical string.
                // Preserve trailing decimal point if user was mid-entry.
                const deloc = MWNumber.delocalizeDigits(v).replace(/[\u00A0\u202F\u2009\u2007\u2060\s]/g, "");
                const cfg = localeConfig();
                let cleaned = deloc;
                if (cfg.group) { cleaned = cleaned.split(cfg.group).join(""); }
                if (cfg.decimal && cfg.decimal !== ".") { cleaned = cleaned.split(cfg.decimal).join("."); }
                cleaned = cleaned.replace(/,/g, cfg.decimal === "," ? "" : "");
                cleaned = cleaned.replace(/[^0-9.\-+]/g, "");
                const dot = cleaned.indexOf(".");
                if (dot !== -1) { cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, ""); }
                if (/^[+-]?\d*\.?\d*$/.test(cleaned) && cleaned !== "" && cleaned !== "+" && cleaned !== "-" && cleaned !== ".") {
                    raw = cleaned;
                } else {
                    const p = MWNumber.parse(v);
                    raw = isFinite(p) ? String(p) : "";
                }
            } else {
                raw = v.replace(/[^0-9.\-]/g, "");
            }
            field.setAttribute("data-nk-raw", raw);
        }
        return String(field.getAttribute("data-nk-raw") || "");
    }

    function setCanonical(field, raw) {
        /* Store canonical ASCII and display localized string. */
        raw = String(raw == null ? "" : raw);
        // normalize: only digits, one dot, optional leading minus
        raw = raw.replace(/[^0-9.\-]/g, "");
        // single minus at start
        const neg = raw.charAt(0) === "-";
        raw = raw.replace(/-/g, "");
        if (neg) { raw = "-" + raw; }
        // single dot
        const dot = raw.indexOf(".");
        if (dot !== -1) { raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, ""); }
        field.setAttribute("data-nk-raw", raw);
        if (window.MWNumber && MWNumber.localizeNumericString) {
            field.value = raw === "" ? "" : MWNumber.localizeNumericString(raw);
        } else {
            field.value = raw;
        }
    }

    function refreshKeypadLabels() {
        if (!panel) { return; }
        panel.setAttribute("aria-label", localizeLabel("keypad"));
        const keys = panel.querySelectorAll("[data-nk]");
        const dec = decimalChar();
        Array.prototype.forEach.call(keys, function (btn) {
            const k = btn.getAttribute("data-nk");
            if (/^[0-9]$/.test(k)) {
                btn.textContent = localizeDigit(k);
                btn.setAttribute("aria-label", localizeDigit(k));
            } else if (k === ".") {
                btn.textContent = dec;
                btn.setAttribute("aria-label", localizeLabel("decimal") + " (" + dec + ")");
            } else if (k === "next") {
                btn.textContent = localizeLabel("next");
            } else if (k === "backspace") {
                btn.setAttribute("aria-label", localizeLabel("backspace"));
            }
        });
    }

    function refreshActiveFieldDisplay() {
        if (!activeField) { return; }
        const raw = String(activeField.getAttribute("data-nk-raw") || "");
        if (window.MWNumber && MWNumber.localizeNumericString) {
            activeField.value = raw === "" ? "" : MWNumber.localizeNumericString(raw);
        }
    }

    function buildPanel() {
        panel = document.createElement("div");
        panel.className = "nk-panel";
        panel.id = "numericKeypad";
        panel.setAttribute("role", "group");
        panel.setAttribute("aria-label", localizeLabel("keypad"));
        panel.setAttribute("aria-hidden", "true");
        panel.innerHTML =
            '<div class="nk-grid">' +
                '<button class="nk-key" type="button" data-nk="1">1</button>' +
                '<button class="nk-key" type="button" data-nk="2">2</button>' +
                '<button class="nk-key" type="button" data-nk="3">3</button>' +
                '<button class="nk-key nk-key--special" type="button" data-nk="backspace" aria-label="Backspace">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
                    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
                    '<path d="M8.6 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8.6L2.4 12l6.2-7Z"/>' +
                    '<path d="m12.2 9.4 5.2 5.2M17.4 9.4l-5.2 5.2"/></svg>' +
                '</button>' +
                '<button class="nk-key" type="button" data-nk="4">4</button>' +
                '<button class="nk-key" type="button" data-nk="5">5</button>' +
                '<button class="nk-key" type="button" data-nk="6">6</button>' +
                '<button class="nk-key nk-key--next" type="button" data-nk="next">Next</button>' +
                '<button class="nk-key" type="button" data-nk="7">7</button>' +
                '<button class="nk-key" type="button" data-nk="8">8</button>' +
                '<button class="nk-key" type="button" data-nk="9">9</button>' +
                '<button class="nk-key nk-key--special" type="button" data-nk="." aria-label="Decimal point">.</button>' +
                '<button class="nk-key nk-key--empty" type="button" tabindex="-1" aria-hidden="true" disabled></button>' +
                '<button class="nk-key" type="button" data-nk="0">0</button>' +
                '<button class="nk-key nk-key--empty" type="button" tabindex="-1" aria-hidden="true" disabled></button>' +
                '<button class="nk-key nk-key--empty" type="button" tabindex="-1" aria-hidden="true" disabled></button>' +
            '</div>';

        /* pointerdown, not click: preventing the default keeps focus and the
           caret in the field while a key is pressed. */
        panel.addEventListener("pointerdown", function (event) {
            const key = event.target.closest("[data-nk]");

            event.preventDefault();

            if (!key || !activeField) {
                return;
            }

            const value = key.getAttribute("data-nk");

            if (value === "next") {
                goToNextField();
            } else {
                applyKey(value);
            }
        });

        /* A tap already ran on pointerdown, so only keyboard activation
           (Enter or Space, which reports detail 0) is handled here. */
        panel.addEventListener("click", function (event) {
            const key = event.target.closest("[data-nk]");

            if (!key || !activeField || event.detail !== 0) {
                return;
            }

            const value = key.getAttribute("data-nk");

            if (value === "next") {
                goToNextField();
            } else {
                applyKey(value);
            }
        });

        document.body.appendChild(panel);
        refreshKeypadLabels();
    }

    function emitInput(field) {
        field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function applyKey(key) {
        const field = activeField;
        if (!field) { return; }

        let raw = syncCanonical(field);

        if (key === "backspace") {
            if (raw.length === 0) { return; }
            raw = raw.slice(0, -1);
        } else if (key === ".") {
            if (raw.indexOf(".") !== -1) { return; }
            if (raw === "" || raw === "-") { raw = raw + "0."; }
            else { raw = raw + "."; }
        } else if (/^[0-9]$/.test(key)) {
            /* Replace a lone leading zero unless entering decimal digits. */
            if (raw === "0") { raw = key; }
            else if (raw === "-0") { raw = "-" + key; }
            else { raw = raw + key; }
        } else {
            return;
        }

        setCanonical(field, raw);
        emitInput(field);
    }

    function scrollFieldIntoView(field) {
        if (!panel) {
            return;
        }

        const rect = field.getBoundingClientRect();
        const topLimit = 96;
        const bottomLimit = window.innerHeight - panel.offsetHeight - 18;

        if (rect.top < topLimit) {
            window.scrollBy({ top: rect.top - topLimit - 24, behavior: "smooth" });
        } else if (rect.bottom > bottomLimit) {
            window.scrollBy({ top: rect.bottom - bottomLimit + 24, behavior: "smooth" });
        }
    }

    function openKeypad(field) {
        if (!panel) {
            buildPanel();
        }

        if (activeField && activeField !== field) {
            activeField.classList.remove("nk-active");
        }

        syncCanonical(field);
        refreshKeypadLabels();

        const wasOpen = isKeypadOpen();

        activeField = field;
        field.classList.add("nk-active");
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");

        if (!wasOpen) {
            armBackGuard();
        }

        /* Keep caret at end for localized display. */
        try {
            field.setSelectionRange(field.value.length, field.value.length);
        } catch (error) {
            /* Some inputs do not support selection. */
        }

        scrollFieldIntoView(field);
    }

    function closeKeypad() {
        const field = activeField;

        activeField = null;

        if (panel) {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
        }

        if (field) {
            field.classList.remove("nk-active");

            /* A half-typed decimal is tidied up when the entry finishes. */
            let raw = String(field.getAttribute("data-nk-raw") || "");
            if (/\.$/.test(raw)) {
                raw = raw.replace(/\.$/, "");
                setCanonical(field, raw);
                emitInput(field);
            }

            /* The page learns the finished value here, exactly as it would
               after a native keyboard was dismissed. */
            field.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function goToNextField() {
        const fields = numericFields();
        const index = fields.indexOf(activeField);

        if (index === -1) {
            return;
        }

        if (index >= fields.length - 1) {
            /* Last numeric field: the entry is complete. */
            const last = fields[index];

            closeKeypad();
            last.blur();
            return;
        }

        const next = fields[index + 1];

        next.focus();

        /* The keypad follows the next field directly, so it works even if the
           browser reports the focus change late. */
        openKeypad(next);
    }

    function onFocusIn(event) {
        /* A tap, "Next", or a calculator moving focus opens the keypad. The
           field is read-only, so none of those routes can raise the native
           keyboard, and any rewrite of the attributes is undone here. */
        const field = enforceField(event.target);

        if (!field) {
            return;
        }

        openKeypad(field);
    }

    function onPointerDown(event) {
        const target = event.target;

        if (!panel) {
            return;
        }

        const raw = target && target.closest ? target.closest("input") : null;
        const field = raw ? enforceField(raw) : null;

        if (field) {
            /* Tapping the field opens the keypad even when it already has
               focus, which a second tap on the same field does not report. */
            if (!panel.classList.contains("is-open") || activeField !== field) {
                openKeypad(field);
            }

            return;
        }

        if (panel && panel.classList.contains("is-open") && !panel.contains(target)) {
            closeKeypad();
        }
    }

    function start() {
        if (started || !isMobileDevice()) {
            return;
        }

        started = true;
        prepareAll(document);
        buildPanel();

        document.addEventListener("focusin", onFocusIn, true);
        document.addEventListener("pointerdown", onPointerDown, true);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && panel && panel.classList.contains("is-open")) {
                closeKeypad();
            }
        });

        /* Android's hardware Back button fires popstate. The marker pushed by
           openKeypad() lets the first press close only the keypad; the second
           press is redirected to the calculator home page. */
        window.addEventListener("popstate", onBackNavigation);

        /* A back/forward-cache restore can bring back an open keypad with its
           marker still in history. Keep the two-step guard in sync. */
        window.addEventListener("pageshow", function (event) {
            if (event.persisted && started && isKeypadOpen()) {
                armBackGuard();
            }
        });

        /* Products such as the nut and bolt page build their fields after the
           page loads, so every new numeric input is prepared as it appears.
           Attribute changes are watched too, so a page that rewrites a field
           cannot hand it back to the native keyboard. */
        if (window.MutationObserver) {
            observer = new MutationObserver(function (records) {
                records.forEach(function (record) {
                    if (record.type === "attributes") {
                        enforceField(record.target);
                        return;
                    }

                    Array.prototype.forEach.call(record.addedNodes, function (node) {
                        if (node.nodeType === 1) {
                            prepareAll(node);
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["type", "readonly", "inputmode"]
            });
        }
    }

    /* RESET CLEANUP
       -------------
       The canonical value used by both keypads lives in data-nk-raw. A reset
       that only writes "" into input.value leaves that attribute behind, so
       the next focus or input event restores the old number. Clear the cached
       raw value for this page only. Global Calculation History is untouched. */
    function clearResetState() {
        if (isKeypadOpen() || activeField) {
            hideKeypadForBack();
        }

        const fields = document.querySelectorAll(
            "input[data-nk-raw], input.nk-field, input.mw-num-field"
        );

        Array.prototype.forEach.call(fields, function (field) {
            field.removeAttribute("data-nk-raw");
            field.classList.remove("nk-active");
            delete field.__mwLang;
        });
    }

    /* Registered here, outside start(), so desktop fields get the same clean
       reset as mobile ones. It runs after each calculator's own reset handler
       (this script is loaded last) and before the deferred relocalizers. */
    document.addEventListener("click", function (event) {
        const target = event.target;

        if (target && target.closest &&
            target.closest("#resetBtn, [data-reset]")) {
            clearResetState();
        }
    });

    /* Some browsers only report a coarse pointer after the first touch, and a
       page may load before the pointer type settles. One retry keeps the
       first tap working instead of asking the user to tap twice. */
    function startOnFirstTouch(event) {
        if (started) {
            return;
        }

        start();

        if (!started) {
            return;
        }

        const target = event.target;
        const field = target && target.closest ? enforceField(target.closest("input")) : null;

        if (field) {
            openKeypad(field);
        }
    }

    document.addEventListener("pointerdown", startOnFirstTouch, true);
    window.addEventListener("resize", function () {
        if (!started) {
            start();
        }
    }, { passive: true });

    /* Keep keypad labels and displayed values in sync with site language. */
    window.addEventListener("mw:languagechange", function () {
        refreshKeypadLabels();
        if (activeField) {
            const raw = String(activeField.getAttribute("data-nk-raw") || "");
            if (window.MWNumber && MWNumber.localizeNumericString) {
                activeField.value = raw === "" ? "" : MWNumber.localizeNumericString(raw);
            }
        }
    });

    /* Small public hook: pages and tests can initialise the keypad on demand. */
    window.NumericKeypad = {
        start: start,
        isMobileDevice: isMobileDevice,
        isOpen: isKeypadOpen,
        close: closeKeypad
    };

    start();
})();

/* ==================================================
   NUMERIC KEYPAD JAVASCRIPT END
================================================== */

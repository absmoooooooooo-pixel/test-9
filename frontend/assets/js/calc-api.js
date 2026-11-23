/* ==================================================
   CALCULATION API CLIENT START
   Sends the typed values to the backend and returns the finished numbers.
   The engineering formulas live on the server, not in this file.

   Reliability model
   -----------------
   Same deterministic weight maths runs twice:
     1. the API (POST /api/calculate/<calculator>) when it is reachable;
     2. frontend/assets/js/calc-engine.js, generated from the backend
        modules, when the API cannot be reached in time.
   Both use the identical formulas, so the numbers cannot disagree. The
   remote call is still tried first, so a deployed API remains the source
   of truth; the local engine removes the hard dependency on it for
   deterministic results.
================================================== */
"use strict";

(function () {
    var TIMEOUT_MS = 8000;
    var RETRY_DELAY_MS = 400;
    var MAX_ATTEMPTS = 2;      /* first try + one retry for transient faults */

    /* If the API has not answered by now, the identical local engine answers
       instead. A cold, sleeping or unreachable host therefore costs a short
       pause, never a long spinner or an error. */
    var FALLBACK_DEADLINE_MS = 2500;

    /* HTTP statuses that mean "the request never reached a calculation API":
       a static host answers 404/405/501 for /api/*. */
    var NOT_API_STATUS = { 404: true, 405: true, 501: true };

    /* Statuses worth retrying once: overload, cold start, gateway hiccup. */
    var RETRIABLE_STATUS = {
        408: true, 425: true, 429: true,
        500: true, 502: true, 503: true, 504: true
    };

    var ERROR_KIND = {
        VALIDATION: "validation",   /* bad input, authoritative answer       */
        TIMEOUT: "timeout",         /* the request ran out of time           */
        NETWORK: "network",         /* no HTTP response at all               */
        SERVER: "server",           /* 5xx / 429 from a real API             */
        RESPONSE: "response",       /* unexpected body or status             */
        UNAVAILABLE: "unavailable", /* no calculation API at this address    */
        CANCELLED: "cancelled"      /* superseded by newer input / unload    */
    };

    /*
     * Built-in density fallback.
     *
     * The backend is still the source of truth: /api/bootstrap.js is loaded
     * before this file and its values are never overwritten. The copy below is
     * used only when that request did not arrive (for example an offline PWA
     * start or a temporary network failure), so a standard material such as
     * Carbon Steel can never show "Density is not configured". A later
     * /api/materials response replaces these values with the server table.
     */
    var FALLBACK_SECTION_MATERIALS = {
        "carbon-steel": { name: "Carbon Steel", density: 7.85 },
        "stainless-steel": { name: "Stainless Steel", density: 8.00 },
        "aluminium": { name: "Aluminium", density: 2.70 },
        "brass": { name: "Brass", density: 8.45 },
        "bronze": { name: "Bronze", density: 8.73 },
        "cast-iron": { name: "Cast Iron", density: 7.20 },
        "copper": { name: "Copper", density: 8.96 },
        "zinc": { name: "Zinc", density: 7.14 },
        "lead": { name: "Lead", density: 11.34 },
        "tin": { name: "Tin", density: 7.31 },
        "titanium": { name: "Titanium", density: 4.50 },
        "nickel": { name: "Nickel", density: 8.90 },
        "magnesium": { name: "Magnesium", density: 1.74 },
        "inconel-625": { name: "Inconel 625", density: 8.44 },
        "monel-400": { name: "Monel 400", density: 8.80 }
    };

    /* Same order as backend/materials/materialDensity.js (MATERIAL_ORDER).
       The shared dropdown renderer uses it when the API cannot supply one. */
    var FALLBACK_MATERIAL_ORDER = Object.keys(FALLBACK_SECTION_MATERIALS);

    var FALLBACK_DISH_MATERIALS = {
        "carbon-steel": { name: "Carbon Steel", density: 7850 },
        "stainless-steel": { name: "Stainless Steel", density: 8000 },
        "aluminium": { name: "Aluminium", density: 2700 },
        "brass": { name: "Brass", density: 8450 },
        "bronze": { name: "Bronze", density: 8730 },
        "cast-iron": { name: "Cast Iron", density: 7200 },
        "copper": { name: "Copper", density: 8960 },
        "zinc": { name: "Zinc", density: 7140 },
        "lead": { name: "Lead", density: 11340 },
        "tin": { name: "Tin", density: 7310 },
        "titanium": { name: "Titanium", density: 4500 },
        "nickel": { name: "Nickel", density: 8900 },
        "magnesium": { name: "Magnesium", density: 1740 },
        "inconel-625": { name: "Inconel 625", density: 8440 },
        "monel-400": { name: "Monel 400", density: 8800 },
        "ss-304": { name: "Stainless Steel 304", density: 7930 },
        "ss-316": { name: "Stainless Steel 316", density: 7980 },
        "ss-316l": { name: "Stainless Steel 316L", density: 8000 },
        "custom": { name: "Custom Density", density: null }
    };

    /* True when the page did not receive the server table and is running on
       the fallback values above. It makes loadMaterials() retry /api/materials
       instead of accepting the fallback as the final table. */
    var needsServerMaterials = false;

    function installMissing(target, source) {
        Object.keys(source).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(target, key)) {
                target[key] = source[key];
            }
        });
    }

    var receivedSectionTable = Boolean(
        window.MW_MATERIALS && Object.keys(window.MW_MATERIALS).length
    );
    var receivedDishTable = Boolean(
        window.MW_DISH_MATERIALS && Object.keys(window.MW_DISH_MATERIALS).length
    );

    window.MW_MATERIALS = window.MW_MATERIALS || {};
    window.MW_DISH_MATERIALS = window.MW_DISH_MATERIALS || {};
    window.MW_MATERIAL_ORDER = window.MW_MATERIAL_ORDER || FALLBACK_MATERIAL_ORDER;
    installMissing(window.MW_MATERIALS, FALLBACK_SECTION_MATERIALS);
    installMissing(window.MW_DISH_MATERIALS, FALLBACK_DISH_MATERIALS);

    needsServerMaterials = !receivedSectionTable || !receivedDishTable;

    /* The promise of the most recent API calculation. The shared history
       listens to it after the Calculate click so it records the result that
       has actually finished, not the previous one. */
    var lastCalculationPromise = null;

    /*
     * Async results are sequenced centrally. A slow response from an older
     * input state must never overwrite the answer for the newest state, and
     * an input that becomes invalid before the response arrives must clear
     * the pending display instead of letting an old result reappear.
     */
    var calculationSequence = 0;
    var pendingCalculations = [];
    var activeCalculationControllers = [];

    function makeError(message, kind, status, cause) {
        var error = new Error(message);
        error.kind = kind || ERROR_KIND.UNAVAILABLE;

        if (typeof status === "number") {
            error.status = status;
        }

        if (kind === ERROR_KIND.CANCELLED) {
            error.cancelled = true;
        }

        if (cause) {
            error.cause = cause;
        }

        return error;
    }

    function isAbortError(error) {
        return Boolean(error && (error.name === "AbortError" || error.code === 20));
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function unavailable() {
        return makeError(
            "The calculation service could not be reached. " +
            "Please check your connection and try again.",
            ERROR_KIND.UNAVAILABLE
        );
    }

    /* ------------------------------------------------------------------
       Local engineering engine (same modules as the backend)
       ------------------------------------------------------------------ */

    function localEngine(slug) {
        return Boolean(
            slug &&
            window.MWCalcEngine &&
            typeof window.MWCalcEngine.calculate === "function"
        );
    }

    /*
     * Runs the generated browser engine. Returns the result object, or throws
     * an error that already carries the right kind (validation or internal).
     * A local validation error is authoritative: the user's input is wrong and
     * must be reported, never papered over with a fallback number.
     */
    function calculateLocally(slug, payload) {
        try {
            return window.MWCalcEngine.calculate(slug, payload);
        } catch (error) {
            if (error && (error.name === "ValidationError" || error.status === 400)) {
                var validation = makeError(
                    error.message || "Invalid input values.",
                    ERROR_KIND.VALIDATION,
                    error.status || 400,
                    error
                );
                validation.field = error.field || null;
                throw validation;
            }

            throw makeError(
                error && error.message
                    ? error.message
                    : "The calculation could not be completed.",
                ERROR_KIND.RESPONSE,
                0,
                error
            );
        }
    }

    function invalidatePendingCalculations() {
        calculationSequence += 1;
        pendingCalculations = [];
        lastCalculationPromise = null;

        /* Abort the network work as well as hiding the answer. This prevents
           a response from a superseded state (or from an unloaded page) from
           running its callback after the DOM has gone away. */
        activeCalculationControllers.forEach(function (controller) {
            try {
                controller.abort();
            } catch (error) {
                /* An already-finished request needs no cleanup. */
            }
        });
        activeCalculationControllers = [];
    }

    function settleCalculations(result, error) {
        var pending = pendingCalculations;
        pendingCalculations = [];

        pending.forEach(function (item) {
            if (error) {
                item.reject(error);
            } else {
                item.resolve(result);
            }
        });
    }

    function isHistoryControl(target) {
        return Boolean(
            target && target.closest &&
            (target.closest("#historyPanel") || target.closest("#historyOverlay"))
        );
    }

    /* Capture phase runs before the calculator's own handlers. An invalid
       click, reset or unit switch must not let an in-flight result land. */
    document.addEventListener("click", function (event) {
        var target = event.target;

        if (!target || !target.closest || isHistoryControl(target)) {
            return;
        }

        if (target.closest(
            "#calculateBtn, #resetBtn, #mmBtn, #inchBtn, [data-divisions]"
        )) {
            invalidatePendingCalculations();
        }
    }, true);

    /* Text and number fields fire input on every edit. Selects fire change
       instead; excluding input elements here keeps a blur-only change from
       cancelling a calculation that is still legitimately in flight. */
    document.addEventListener("input", function (event) {
        if (!isHistoryControl(event.target)) {
            invalidatePendingCalculations();
        }
    }, true);

    document.addEventListener("change", function (event) {
        var target = event.target;

        if (target && target.tagName === "SELECT" &&
            !isHistoryControl(target)) {
            invalidatePendingCalculations();
        }
    }, true);

    /* A response arriving after the page has gone away has no result panel to
       update. Discard those callbacks before the browser tears down the DOM. */
    ["pagehide", "beforeunload", "unload"].forEach(function (type) {
        window.addEventListener(type, invalidatePendingCalculations);
    });

    /*
     * The backend URL comes from the server, never from a hard-coded host:
     *   - /api/bootstrap.js sets window.MW_API_BASE from the environment,
     *   - api-config.js (window.MW_API_BASE) or a <meta name="mw-api-base">
     *     tag can override it,
     *   - an empty value means "same origin", the normal setup.
     */
    var LOCAL_API_BASE = "http://127.0.0.1:8080";

    /*
     * An address that just proved it has no calculation API (static host,
     * sleeping backend) is not asked again for a short while. Without this
     * every single Calculate click repeated the same failing request.
     */
    var baseCooldown = Object.create(null);
    var COOLDOWN_MS = 60000;

    function coolDown(base) {
        baseCooldown[base] = Date.now() + COOLDOWN_MS;
    }

    function clearCooldown(base) {
        delete baseCooldown[base];
    }

    function baseUrlCandidates() {
        var candidates = [];

        function add(value) {
            var base = typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

            if (base && candidates.indexOf(base) === -1) {
                candidates.push(base);
            }
        }

        if (typeof window.MW_API_BASE === "string") {
            add(window.MW_API_BASE);
        }

        var meta = document.querySelector('meta[name="mw-api-base"]');

        if (meta) {
            add(meta.content);
        }

        if (candidates.indexOf("") === -1) {
            candidates.push("");
        }

        var location = window.location;
        var localPage = location.protocol === "file:" ||
            location.hostname === "127.0.0.1" || location.hostname === "localhost";
        var alreadyOnBackend = location.protocol !== "file:" &&
            (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
            (location.port === "8080" || location.port === "");

        /* When the page is opened from disk or a separate local web server,
           /api/* does not exist there. Retry the backend's local address. */
        if (localPage && !alreadyOnBackend) {
            add(LOCAL_API_BASE);
        }

        return candidates.length ? candidates : [""];
    }

    /* ------------------------------------------------------------------
       Error classification
       ------------------------------------------------------------------ */

    /*
     * Turns a failed response into an error that says what actually happened:
     * invalid input, server error, invalid response, or no API at this address.
     * The user must never see one generic "connection" message for all of them.
     */
    function classifyResponse(response, payload) {
        var status = response.status;
        var apiMessage = payload && payload.error && payload.error.message
            ? String(payload.error.message)
            : "";

        if (status === 400 || status === 422) {
            var validation = makeError(
                apiMessage ||
                    "The entered values could not be calculated. " +
                    "Please check your inputs and try again.",
                ERROR_KIND.VALIDATION,
                status
            );
            validation.field = payload && payload.error ? payload.error.field : null;
            return validation;
        }

        if (status === 408) {
            return makeError(
                "The calculation request timed out. Please try again.",
                ERROR_KIND.TIMEOUT,
                status
            );
        }

        if (status === 429) {
            return makeError(
                apiMessage || "Too many calculations were requested. " +
                    "Please wait a moment and try again.",
                ERROR_KIND.SERVER,
                status
            );
        }

        /* 501 is "not implemented" and, together with 404/405, is what a plain
           static host answers for /api/*. It must be treated as "no API at
           this address" so another configured base is tried, not as a server
           fault of a real calculation service. */
        if (NOT_API_STATUS[status]) {
            return makeError(
                "The calculation service is not available at this address.",
                ERROR_KIND.UNAVAILABLE,
                status
            );
        }

        if (status >= 500) {
            return makeError(
                apiMessage || "The calculation service is temporarily unavailable. " +
                    "Please try again in a moment.",
                ERROR_KIND.SERVER,
                status
            );
        }

        return makeError(
            apiMessage || "The calculation could not be completed. Please try again.",
            apiMessage ? ERROR_KIND.RESPONSE : ERROR_KIND.RESPONSE,
            status
        );
    }

    function isTransient(error) {
        if (!error) {
            return false;
        }

        return Boolean(error.status && RETRIABLE_STATUS[error.status]);
    }

    /* ------------------------------------------------------------------
       One request against one API base, with a single safety retry
       ------------------------------------------------------------------ */

    async function fetchAttempt(url, options, externalSignal) {
        var controller = new AbortController();
        var timedOut = false;
        var abortedExternally = false;

        var onExternalAbort = function () {
            abortedExternally = true;
            try {
                controller.abort();
            } catch (error) {
                /* already aborted */
            }
        };

        if (externalSignal) {
            if (externalSignal.aborted) {
                onExternalAbort();
            } else if (typeof externalSignal.addEventListener === "function") {
                externalSignal.addEventListener("abort", onExternalAbort, { once: true });
            }
        }

        var timer = setTimeout(function () {
            timedOut = true;
            try {
                controller.abort();
            } catch (error) {
                /* already aborted */
            }
        }, TIMEOUT_MS);

        try {
            var response = await fetch(url, {
                method: options.method || "GET",
                headers: options.headers || {},
                body: options.body,
                signal: controller.signal,
                credentials: "same-origin",
                cache: "no-store"
            });

            var payload = null;

            try {
                payload = await response.json();
            } catch (error) {
                payload = null;
            }

            return { response: response, payload: payload, timedOut: false };
        } catch (error) {
            if (abortedExternally || (externalSignal && externalSignal.aborted)) {
                throw makeError("Calculation cancelled.", ERROR_KIND.CANCELLED, 0, error);
            }

            if (timedOut || isAbortError(error)) {
                throw makeError(
                    "The calculation request timed out. Please try again.",
                    ERROR_KIND.TIMEOUT,
                    0,
                    error
                );
            }

            throw makeError(
                "The calculation service could not be reached. " +
                "Please check your connection and try again.",
                ERROR_KIND.NETWORK,
                0,
                error
            );
        } finally {
            clearTimeout(timer);

            if (externalSignal && typeof externalSignal.removeEventListener === "function") {
                externalSignal.removeEventListener("abort", onExternalAbort);
            }
        }
    }

    /*
     * Tries one base (retrying only a genuinely transient fault) and returns
     * the parsed payload. Throws a classified error otherwise.
     */
    async function requestFromBase(base, path, options, externalSignal) {
        var lastError = null;

        for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
            if (externalSignal && externalSignal.aborted) {
                throw makeError("Calculation cancelled.", ERROR_KIND.CANCELLED);
            }

            try {
                var outcome = await fetchAttempt(base + path, options, externalSignal);

                if (outcome.response.ok) {
                    /* A 200 that is not the API's JSON is a static host serving
                       its own page (SPA fallback), never a calculation. */
                    if (!outcome.payload) {
                        throw makeError(
                            "The calculation service returned an unexpected response.",
                            ERROR_KIND.RESPONSE,
                            outcome.response.status
                        );
                    }

                    if (outcome.payload.ok !== true) {
                        throw classifyResponse(outcome.response, outcome.payload);
                    }

                    return outcome.payload;
                }

                throw classifyResponse(outcome.response, outcome.payload);
            } catch (error) {
                lastError = error;

                if (error.kind === ERROR_KIND.CANCELLED) {
                    throw error;
                }

                /*
                 * One retry, and only for a fault a retry can actually cure:
                 * an overloaded or cold-starting API (5xx/429).
                 *
                 * Timeouts and dropped connections are never retried here:
                 * the identical formulas run locally, so a second wait would
                 * only delay an answer the browser can produce at once.
                 */
                if (attempt < MAX_ATTEMPTS - 1 && isTransient(error)) {
                    await sleep(RETRY_DELAY_MS);
                    continue;
                }

                throw error;
            }
        }

        throw lastError || unavailable();
    }

    async function request(path, options, trackForInvalidation) {
        options = options || {};

        var controller = new AbortController();

        if (trackForInvalidation) {
            activeCalculationControllers.push(controller);
        }

        try {
            var now = Date.now();
            var candidates = baseUrlCandidates().filter(function (base) {
                return !(baseCooldown[base] && baseCooldown[base] > now);
            });
            var lastError = null;

            /* Every known address recently proved to have no API. The node is
               deterministic, so answer locally instead of repeating a request
               that already failed a moment ago. */
            if (!candidates.length) {
                throw makeError(
                    "The calculation service is not available at this address.",
                    ERROR_KIND.UNAVAILABLE
                );
            }

            for (var i = 0; i < candidates.length; i += 1) {
                if (controller.signal.aborted) {
                    throw makeError("Calculation cancelled.", ERROR_KIND.CANCELLED);
                }

                try {
                    var body = await requestFromBase(
                        candidates[i], path, options, controller.signal
                    );
                    clearCooldown(candidates[i]);
                    return body;
                } catch (error) {
                    if (error.kind === ERROR_KIND.CANCELLED) {
                        throw error;
                    }

                    lastError = error;

                    /* Addresses that are not serving an API at all are put on
                       a short cooldown so the next click does not repeat the
                       same doomed request (and its console noise). */
                    if (error.kind === ERROR_KIND.UNAVAILABLE ||
                        error.kind === ERROR_KIND.NETWORK ||
                        error.kind === ERROR_KIND.TIMEOUT ||
                        error.kind === ERROR_KIND.RESPONSE) {
                        coolDown(candidates[i]);
                    }

                    /* A 5xx from a real API is that API's answer. Retrying a
                       different host (or the static origin) would only add a
                       second misleading failure, so stop here. */
                    if (error.kind === ERROR_KIND.SERVER ||
                        error.kind === ERROR_KIND.VALIDATION) {
                        throw error;
                    }

                    if (i < candidates.length - 1) {
                        continue;
                    }

                    throw error;
                }
            }

            throw lastError || unavailable();
        } finally {
            var index = activeCalculationControllers.indexOf(controller);

            if (index !== -1) {
                activeCalculationControllers.splice(index, 1);
            }
        }
    }

    /**
     * Runs one calculator.
     *
     * The API is tried first (it stays the source of truth). If it cannot be
     * reached, or answers with something that is not a calculation at all,
     * the identical browser engine produces the result locally, so a
     * deterministic weight never depends on remote availability.
     *
     * Invalid input is never replaced by a local answer: that error belongs to
     * the user and is reported exactly as entered.
     *
     * @param {string} slug    calculator folder name, e.g. "plate"
     * @param {object} payload { values, unit, density, quantity, material }
     * @returns {Promise<object>} the finished result object
     */
    function calculate(slug, payload) {
        var token = ++calculationSequence;
        var resolveCalculation;
        var rejectCalculation;
        var sharedPromise = new Promise(function (resolve, reject) {
            resolveCalculation = resolve;
            rejectCalculation = reject;
        });

        pendingCalculations.push({
            token: token,
            resolve: resolveCalculation,
            reject: rejectCalculation
        });
        lastCalculationPromise = sharedPromise;

        var settled = false;

        function finish(result, error) {
            /* Only the newest input state owns the result panel. Every caller
               from this burst receives that same newest result. */
            if (token !== calculationSequence) {
                return;
            }

            settled = true;

            if (deadline) {
                clearTimeout(deadline);
                deadline = null;
            }

            settleCalculations(result, error);
        }

        function finishOnce(result, error) {
            if (settled || token !== calculationSequence) {
                return;
            }

            finish(result, error);
        }

        /*
         * Slow-backend safety net. The API stays the preferred source, but a
         * deterministic weight must not wait on a host that is asleep. When
         * the deadline passes, the generated engine answers with the same
         * formulas; a late API reply is simply ignored.
         */
        var deadline = null;

        if (localEngine(slug)) {
            deadline = setTimeout(function () {
                deadline = null;

                try {
                    finishOnce(calculateLocally(slug, payload), null);
                } catch (error) {
                    /* A local validation error means the input is wrong: leave
                       the decision to the classified API result below so the
                       user gets the precise field-level message. */
                }
            }, FALLBACK_DEADLINE_MS);
        }

        function settleFromFailure(error) {
            if (error && error.kind === ERROR_KIND.CANCELLED) {
                finishOnce(null, error);
                return;
            }

            /* Bad input is the user's answer: never mask it. */
            if (error && error.kind === ERROR_KIND.VALIDATION) {
                finishOnce(null, error);
                return;
            }

            if (localEngine(slug)) {
                try {
                    finishOnce(calculateLocally(slug, payload), null);
                    return;
                } catch (localError) {
                    finishOnce(null, localError);
                    return;
                }
            }

            finishOnce(null, error || unavailable());
        }

        /*
         * The request is started but deliberately not awaited here: whichever
         * source answers first (the API, the deadline, or the failure path)
         * settles the same promise. Awaiting the network in this function
         * would keep the caller waiting even after a local answer was ready.
         */
        request(
            "/api/calculate/" + encodeURIComponent(slug),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            },
            true
        ).then(function (body) {
            finishOnce(body.result, null);
        }, settleFromFailure);

        return sharedPromise;
    }

    /* ==================================================
       MATERIAL DENSITY TABLES

       /api/bootstrap.js defines window.MW_MATERIALS, but that script only
       exists on the page's own origin. When the frontend is served on a
       different host from the API (or that one request fails) the table is
       empty, so every valid material would show "Unknown material".

       Here the same table is fetched from the API base and copied into the
       object the calculator already captured at startup, then the material
       field is refreshed so its density display updates.
    ================================================== */
    function fillMaterialTables(body) {
        var tables = [
            { name: "MW_MATERIALS", source: body.sections },
            { name: "MW_DISH_MATERIALS", source: body.dishEnds }
        ];
        var filled = 0;

        tables.forEach(function (table) {
            var target = window[table.name];

            if (!target || !table.source || typeof table.source !== "object") {
                return;
            }

            Object.keys(table.source).forEach(function (key) {
                target[key] = table.source[key];
                filled += 1;
            });
        });

        if (body && Array.isArray(body.order) && body.order.length) {
            window.MW_MATERIAL_ORDER = body.order.slice();
        }

        return filled;
    }

    function refreshMaterialFields() {
        /* The dish ends page keeps a free-text density field next to its
           material select. Do not overwrite a value the user already typed. */
        var densityInput = document.getElementById("density");
        /* Dish ends pre-fill this field with a default density. Only a value
           the user actually edited must block a late material-table refresh. */
        var userEditedDensity = densityInput &&
            densityInput.getAttribute("data-user-edited") === "true";

        ["material", "materialSelect"].forEach(function (id) {
            var select = document.getElementById(id);

            if (!select || (userEditedDensity && select.id === "material")) {
                return;
            }

            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    /**
     * Loads the density tables when the page did not receive them.
     * Called automatically at startup; exposed for retries.
     *
     * @param {boolean} force refetch even when the table is already present
     * @returns {Promise<boolean>} true when the tables were filled
     */
    function loadMaterials(force) {
        if (!force && !needsServerMaterials) {
            return Promise.resolve(false);
        }

        return request("/api/materials")
            .then(function (body) {
                if (!body || body.ok !== true || !fillMaterialTables(body)) {
                    return false;
                }

                needsServerMaterials = false;
                refreshMaterialFields();
                document.dispatchEvent(new CustomEvent("mw:materials-loaded"));
                return true;
            })
            .catch(function () {
                return false;
            });
    }

    /* Kept for other scripts that read the resolved primary API base. */
    function baseUrl() {
        return baseUrlCandidates()[0] || "";
    }

    window.MWCalc = {
        calculate: calculate,
        request: request,
        baseUrl: baseUrl,
        loadMaterials: loadMaterials,
        getLastCalculationPromise: function () {
            return lastCalculationPromise;
        },
        ERROR_KIND: ERROR_KIND
    };

    loadMaterials();
})();
/* ==================================================
   CALCULATION API CLIENT END
   This file ends here.
================================================== */

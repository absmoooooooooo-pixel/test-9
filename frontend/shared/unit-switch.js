/* ==================================================
   MM / INCHES UNIT SELECTION START
   Shared unit-selection helper for dimension calculators.
   Switching units keeps the entered number unchanged;
   the value is interpreted in the newly selected unit.
================================================== */
(function () {
    "use strict";

    var INCH_IN_MM = 25.4;
    var states = typeof WeakMap === "function" ? new WeakMap() : null;

    function stateFor(input) {
        var state = states ? states.get(input) : input.__mwUnitState;

        if (state) {
            return state;
        }

        state = { mm: null, clean: false };

        if (states) {
            states.set(input, state);
        } else {
            input.__mwUnitState = state;
        }

        /* A real edit invalidates the remembered millimetre value. Events
           dispatched by page scripts are ignored, so a programmatic redraw
           cannot make a converted value look user-edited. */
        input.addEventListener("input", function (event) {
            if (event.isTrusted) {
                state.mm = null;
                state.clean = false;
            }
        });

        return state;
    }

    /* Enough precision for inch values while keeping the field readable. */
    function format(value) {
        return String(Math.round(value * 1e6) / 1e6);
    }

    function activeFields() {
        var config = window.CALCULATOR_HISTORY_CONFIG;

        if (!config || !config.dimensions) {
            return [];
        }

        return config.dimensions.filter(function (item) {
            return item && item.unit !== false;
        });
    }

    /* Keep entered dimension numbers unchanged on unit switch.
       The calculator interprets the value in the newly selected unit.
       Clear any legacy physical-size memory so stale state cannot rewrite
       inputs on future interactions. */
    function convert(fromUnit, toUnit) {
        if (fromUnit === toUnit) {
            return;
        }

        activeFields().forEach(function (item) {
            var input = document.getElementById(item.key);
            if (!input) {
                return;
            }
            var state = stateFor(input);
            state.mm = null;
            state.clean = false;
        });
    }

    window.MWUnitSwitch = {
        convert: convert,
        inchInMm: INCH_IN_MM
    };
})();

/* ==================================================
   MM / INCHES UNIT SELECTION END
================================================== */

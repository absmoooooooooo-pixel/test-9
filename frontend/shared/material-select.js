/* ==================================================
   SHARED MATERIAL SELECTION RENDERER START
   Builds every calculator's Material Selection dropdown from the shared
   density tables. Custom Density is always the first option, followed by
   the standard materials in the order defined by the backend.
 ================================================== */
(function () {
    "use strict";

    var CUSTOM_VALUE = "custom";
    var CUSTOM_LABEL = "Custom Density";
    var DEFAULT_MATERIAL = "carbon-steel";

    function tableFor(select) {
        if (select.getAttribute("data-mw-material-table") === "dish") {
            return window.MW_DISH_MATERIALS || {};
        }

        return window.MW_MATERIALS || {};
    }

    /* The backend's MATERIAL_ORDER is authoritative. Anything else the server
       sends is appended once, so nothing is lost and nothing is duplicated. */
    function orderedKeys(table) {
        var order = window.MW_MATERIAL_ORDER;
        var seen = {};
        var keys = [];

        function add(key) {
            if (key && key !== CUSTOM_VALUE && table[key] && !seen[key]) {
                seen[key] = true;
                keys.push(key);
            }
        }

        if (Array.isArray(order)) {
            order.forEach(add);
        }

        Object.keys(table).forEach(add);

        return keys;
    }

    function dispatchChange(select) {
        var event;

        if (typeof Event === "function") {
            event = new Event("change", { bubbles: true });
        } else {
            event = document.createEvent("HTMLEvents");
            event.initEvent("change", true, true);
        }

        select.dispatchEvent(event);
    }

    /* Only an option the page itself marked as selected counts as an initial
       choice. The shared markup lists Custom Density first and marks nothing,
       so the browser's default value is "custom"; treating that as a user
       choice started every calculator in Custom Density with an empty field
       instead of the configured default material. */
    function initialSelection(select) {
        var marked = select.querySelector("option[selected]");

        return marked ? marked.value : "";
    }

    function render(select) {
        if (!select) {
            return;
        }

        var table = tableFor(select);
        var rendered = select.getAttribute("data-mw-material-ready") === "true";
        var previous = rendered ? select.value : initialSelection(select);
        var keys = orderedKeys(table);
        var options = document.createDocumentFragment();
        var custom = document.createElement("option");
        var next;

        custom.value = CUSTOM_VALUE;
        custom.textContent = CUSTOM_LABEL;
        options.appendChild(custom);

        keys.forEach(function (key) {
            var option = document.createElement("option");

            option.value = key;
            option.textContent = table[key].name || key;
            options.appendChild(option);
        });

        /* Replacing the whole list guarantees exactly one entry per material,
           even if the static markup or an earlier refresh left an old copy. */
        select.textContent = "";
        select.appendChild(options);

        if (previous === CUSTOM_VALUE || table[previous]) {
            next = previous;
        } else {
            next = table[DEFAULT_MATERIAL] ? DEFAULT_MATERIAL : (keys[0] || CUSTOM_VALUE);
        }

        select.value = next;
        select.setAttribute("data-mw-material-ready", "true");

        /* Dish ends keeps a free-text density field. A late table refresh must
           never overwrite a value the user has typed there. */
        var densityInput = document.getElementById("density");
        var userEditedDensity = densityInput &&
            densityInput.getAttribute("data-user-edited") === "true";

        if (!userEditedDensity) {
            dispatchChange(select);
        }
    }

    function init() {
        var selects = document.querySelectorAll(
            'select[id="material"], select[id="materialSelect"]'
        );

        Array.prototype.forEach.call(selects, render);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    /* /api/materials can answer after the page has rendered. Rebuild from the
       newly filled tables, then let each calculator refresh its density. */
    document.addEventListener("mw:materials-loaded", init);
})();
/* ==================================================
   SHARED MATERIAL SELECTION RENDERER END
   This script ends here.
 ================================================== */

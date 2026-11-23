/* ==================================================
   GLOBAL KG / LB WEIGHT UNIT SWITCH PLACEMENT START
   Keeps the one shared weight switch beside the Material
   Selection heading on every calculator page. Conversion,
   storage and result rendering stay in weight-unit.js.
 ================================================== */
(function () {
    "use strict";

    var HEAD_CLASS = "material-head";

    /* The material dropdown identifies the heading on every calculator;
       dish ends label theirs explicitly. Neither depends on the interface
       language, so the switch stays put after a translation. */
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

    /* Undo the old result-head wrapper so the Calculation Result heading
       keeps its natural card spacing once the switch has moved out. */
    function unwrapResultHead() {
        var heads = document.querySelectorAll("#results .result-head");

        Array.prototype.forEach.call(heads, function (head) {
            var heading = head.querySelector("h2");

            if (heading) {
                head.parentNode.insertBefore(heading, head);
            }

            if (!head.children.length && head.parentNode) {
                head.parentNode.removeChild(head);
            }
        });
    }

    function place() {
        var toggle = document.querySelector(".weight-unit-switch");

        if (!toggle) {
            return;
        }

        var heading = materialHeading();

        if (!heading) {
            return;
        }

        var head = heading.parentElement;

        if (!head || !head.classList || !head.classList.contains(HEAD_CLASS)) {
            head = document.createElement("div");
            head.className = HEAD_CLASS;
            heading.parentNode.insertBefore(head, heading);
            head.appendChild(heading);
        }

        if (toggle.parentElement !== head) {
            head.appendChild(toggle);
        }

        unwrapResultHead();
    }

    function start() {
        place();

        /* The result card is redrawn on every calculation. Keep the single
           switch in place if any future script rebuilds its heading row. */
        var results = document.getElementById("results");

        if (results && typeof MutationObserver === "function") {
            new MutationObserver(place).observe(results, {
                childList: true,
                subtree: true
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
/* ==================================================
   GLOBAL KG / LB WEIGHT UNIT SWITCH PLACEMENT END
 ================================================== */

/* ==================================================
   NUMERIC INPUT CLEANUP START
   A focused number field must never change value from a mouse
   wheel. The wheel is left to the browser so the page keeps
   scrolling normally: as soon as the wheel turns over a focused
   number field, that field simply gives up focus, and a number
   field that is not focused cannot be stepped by the wheel.

   Typing, pasting, arrow keys, validation, min/max and every
   calculator keep working exactly as before.
================================================== */
(function () {
    "use strict";

    function isNumericField(element) {
        if (!element || element.tagName !== "INPUT") {
            return false;
        }

        if (element.type === "number") {
            return true;
        }

        var mode = (element.getAttribute("inputmode") || "").toLowerCase();

        return mode === "decimal" || mode === "numeric";
    }

    function releaseField(event) {
        var field = event.target;

        if (!isNumericField(field)) {
            return;
        }

        /* Only a focused number field can be stepped by the wheel, and
           releasing it lets the very same wheel event scroll the page. */
        if (document.activeElement === field) {
            field.blur();
        }
    }

    /* Capture phase: runs before the field can act on the wheel, and it also
       covers fields the calculators create after load. */
    document.addEventListener("wheel", releaseField, {
        capture: true,
        passive: true
    });
})();
/* ==================================================
   NUMERIC INPUT CLEANUP END
================================================== */

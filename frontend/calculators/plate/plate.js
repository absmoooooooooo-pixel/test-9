/* ==================================================
   PLATE WEIGHT CALCULATOR JAVASCRIPT START
   Inputs, unit conversion, validation, formula and result display for this calculator.
   Here is the complete logic and the formula of this calculator.
================================================== */
"use strict";

/*
 * Plate Weight Calculator
 *
 * Central density configuration:
 * All density values are stored in g/cm³.
 *
 * Weight (kg) =
 * Width (mm) × Thickness (mm) × Length (mm)
 * × Density (g/cm³) / 1,000,000
 */

const $ = id => document.getElementById(id);

/*
 * The density table is resolved through the shared registry at call time.
 * It is deliberately not captured once at load: a table that arrives later
 * (/api/bootstrap.js, /api/materials, a retry after a failed request, or the
 * offline fallback) must always be visible to this calculator.
 */
function materialTable() {
    if (window.MWDensity && typeof window.MWDensity.ensure === "function") {
        return window.MWDensity.ensure("section");
    }

    return window.MW_MATERIALS || {};
}

function materialFor(key) {
    if (window.MWDensity && typeof window.MWDensity.get === "function") {
        return window.MWDensity.get(key, "section");
    }

    const table = materialTable();

    return Object.prototype.hasOwnProperty.call(table, key)
        ? table[key]
        : null;
}

/* Dimension inputs, in mobile keyboard navigation order. */
const FIELDS = [
    "length",
    "width",
    "thickness"
];

let currentUnit = "mm";
let lastCalculation = null;
let autoRecalculate = false;

/* NUMBER FORMATTING */

// ==================================================
// NUMBER FORMATTING HELPER START
// Rounds the number and adds thousands separators before it is shown.
// Here is the helper that shows numbers in a neat format.
// ==================================================
function formatNumber(value, decimals = 2) {
    if (window.MWNumber) { return MWNumber.formatNumber(value, decimals); }
    return value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}
// ==================================================
// NUMBER FORMATTING HELPER END
// This function ends here.
// ==================================================

/*
 * Returns the selected material's density in g/cm³.
 * Built-in materials always use the centralized configuration.
 * Custom density is also entered in g/cm³.
 */
// ==================================================
// MATERIAL DENSITY LOOKUP START
// Returns the density in g/cm3 for the material the user selected.
// Here the density of the chosen material is obtained.
// ==================================================
function getDensity() {
    const selectedKey = $("material").value;

    if (selectedKey === "custom") {
        const rawDensity = $("customDensity").value.trim();

        if (rawDensity === "") {
            return NaN;
        }

        return window.MWNumber
            ? MWNumber.parse(rawDensity)
            : Number(rawDensity);
    }

    /* Every configured material resolves to a positive number in g/cm³.
       A material that genuinely has no density returns NaN, which the
       validation below reports instead of silently using another value. */
    const material = materialFor(selectedKey);
    const density = material ? Number(material.density) : NaN;

    return Number.isFinite(density) && density > 0 ? density : NaN;
}
// ==================================================
// MATERIAL DENSITY LOOKUP END
// This function ends here.
// ==================================================

/* MATERIAL DISPLAY */

// ==================================================
// MATERIAL DENSITY DISPLAY START
// Shows the selected material density under the material dropdown.
// Here the density value is shown on the screen.
// ==================================================
function updateDensityDisplay() {
    const selectedKey = $("material").value;
    const isCustom = selectedKey === "custom";

    $("customBox").style.display = isCustom ? "block" : "none";

    if (isCustom) {
        const customValue = $("customDensity").value.trim();

        $("densityInfo").textContent =
            customValue !== "" &&
            (window.MWNumber ? isFinite(MWNumber.parse(customValue)) && MWNumber.parse(customValue) > 0 : Number.isFinite(Number(customValue)) && Number(customValue) > 0)
                ? "Custom Density — " +
                  formatNumber(window.MWNumber ? MWNumber.parse(customValue) : Number(customValue), 3) +
                  " g/cm³"
                : "Enter custom density";

        return;
    }

    const material = materialFor(selectedKey);
    const density = material ? Number(material.density) : NaN;

    if (!material || !Number.isFinite(density) || density <= 0) {
        $("densityInfo").textContent = "Density is not configured for this material.";
        return;
    }

    $("densityInfo").textContent =
        (material.name || selectedKey) + " — " +
        formatNumber(density, 2) +
        " g/cm³";
}
// ==================================================
// MATERIAL DENSITY DISPLAY END
// This function ends here.
// ==================================================

/* UNIT CONVERSION */

// ==================================================
// MM / INCHES UNIT SELECTION START
// Switches the calculator between MM and Inches.
// The entered number stays the same; it is interpreted in the selected unit.
// ==================================================
function changeUnit(newUnit) {
    if (newUnit === currentUnit) {
        return;
    }

    // Keep the entered number exactly as typed; only the selected unit
    // changes. The value is interpreted in the newly selected unit.
    MWUnitSwitch.convert(currentUnit, newUnit);

    currentUnit = newUnit;

    $("mmBtn").classList.toggle("active", newUnit === "mm");
    $("inchBtn").classList.toggle("active", newUnit === "in");

    $("mmBtn").setAttribute(
        "aria-pressed",
        String(newUnit === "mm")
    );

    $("inchBtn").setAttribute(
        "aria-pressed",
        String(newUnit === "in")
    );

    $("unitNote").textContent =
        newUnit === "mm"
            ? "All dimensions are in millimeters."
            : "All dimensions are in inches.";

    // Density always remains in g/cm³, regardless of dimension unit.
    updateDensityDisplay();

    if (autoRecalculate) {
        calculateWeight();
    }
}
// ==================================================
// MM / INCHES UNIT SELECTION END
// This function ends here.
// ==================================================

/* MATERIAL CHANGE */

// ==================================================
// MATERIAL SELECTION HANDLING START
// Runs when another material is picked and refreshes the density.
// Here the density is updated when the material is changed.
// ==================================================
function materialChanged() {
    updateDensityDisplay();

    if (autoRecalculate) {
        calculateWeight();
    }
}
// ==================================================
// MATERIAL SELECTION HANDLING END
// This function ends here.
// ==================================================

/* INPUT VALIDATION */

// ==================================================
// INPUT VALIDATION START
// Checks the fields for empty, non-numeric or out-of-range values.
// Here it is checked whether the input values are correct.
// ==================================================
function validateInputs() {
    const dimensions = [
        { id: "length", name: "Length" },
        { id: "width", name: "Width" },
        { id: "thickness", name: "Thickness" }
    ];

    for (const item of dimensions) {
        const rawValue = $(item.id).value.trim();
        const value = window.MWNumber ? MWNumber.parse(rawValue) : Number(rawValue);

        if (
            rawValue === "" ||
            !Number.isFinite(value) ||
            value <= 0
        ) {
            return item.name +
                " is required. Please enter a valid positive number.";
        }
    }

    const quantityRaw = $("quantity").value.trim();
    const quantity = window.MWNumber ? MWNumber.parse(quantityRaw) : Number(quantityRaw);

    if (
        quantityRaw === "" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
    ) {
        return "Quantity must be a positive whole number.";
    }

    if ($("material").value === "custom") {
        const rawDensity = $("customDensity").value.trim();
        const customDensity = window.MWNumber ? MWNumber.parse(rawDensity) : Number(rawDensity);

        if (
            rawDensity === "" ||
            !Number.isFinite(customDensity) ||
            customDensity <= 0
        ) {
            return "Please enter a valid positive custom density in g/cm³.";
        }
    }

    const density = getDensity();

    if (!Number.isFinite(density) || density <= 0) {
        return "Invalid material density.";
    }

    return "";
}
// ==================================================
// INPUT VALIDATION END
// This function ends here.
// ==================================================

/* WEIGHT CALCULATION */

// ==================================================
// WEIGHT CALCULATION FORMULA START
// Applies the metal weight formula (volume x density) and shows kg, tonnes and the extra results.
// Here is the complete logic that calculates the weight.
// ==================================================
async function calculateWeight() {
    const errorMessage = validateInputs();

    $("error").textContent = errorMessage;

    if (errorMessage) {
        $("results").style.display = "none";
        lastCalculation = null;
        return;
    }

    const width = (window.MWNumber ? MWNumber.parse($("width").value) : Number($("width").value));
    const thickness = window.MWNumber ? MWNumber.parse($("thickness").value) : (window.MWNumber ? MWNumber.parse($("thickness").value) : Number($("thickness").value));
    const length = window.MWNumber ? MWNumber.parse($("length").value) : (window.MWNumber ? MWNumber.parse($("length").value) : Number($("length").value));
    const quantity = window.MWNumber ? MWNumber.parse($("quantity").value) : (window.MWNumber ? MWNumber.parse($("quantity").value) : Number($("quantity").value));

    // Density is always in g/cm³.
    const density = getDensity();

    // Convert entered dimensions to millimeters.
    const dimensionFactor = currentUnit === "in" ? 25.4 : 1;

    const widthMM = width * dimensionFactor;
    const thicknessMM = thickness * dimensionFactor;
    const lengthMM = length * dimensionFactor;

    /*
     * Formula for dimensions in mm and density in g/cm³:
     *
     * Weight (kg) =
     * L(mm) × W(mm) × T(mm) × Density(g/cm³) / 1,000,000
     */

    /* Engineering formulas run on the backend (POST /api/calculate/plate). */
    let calc;

    try {
        calc = await MWCalc.calculate("plate", {
            values: { length: length, width: width, thickness: thickness },
            unit: currentUnit,
            density: density,
            quantity: quantity,
            material: $("material").value
        });
    } catch (error) {
        if (error && (error.cancelled || error.kind === "cancelled")) {
            return;
        }
        $("error").textContent =
            error.message || "Calculation service is unavailable.";
        $("results").style.display = "none";
        lastCalculation = null;
        return;
    }

    const { volumeMM3, volumeM3, singleWeight, totalWeight } = calc;

    if (
        !Number.isFinite(volumeM3) ||
        !Number.isFinite(singleWeight) ||
        !Number.isFinite(totalWeight)
    ) {
        $("error").textContent =
            "Values are too large to calculate safely.";

        $("results").style.display = "none";
        lastCalculation = null;
        return;
    }

    const selectedKey = $("material").value;
    const selectedMaterial = materialFor(selectedKey);

    const materialName =
        selectedKey === "custom"
            ? "Custom Material"
            : (selectedMaterial && selectedMaterial.name) || selectedKey;

    lastCalculation = {
        width,
        thickness,
        length,
        quantity,
        density,
        volumeM3,
        singleWeight,
        totalWeight,
        materialName,
        unit: currentUnit
    };

    /* DISPLAY RESULTS */

    /* Weights are always written in kilograms; the shared KG / LB switch
       converts only the displayed value. */
    $("totalWeight").textContent =
        formatNumber(totalWeight, 2) + " kg";

    $("singleWeight").textContent =
        formatNumber(singleWeight, 2) + " kg";

    $("tonnes").textContent =
        formatNumber(totalWeight / 1000, 4) + " metric tonnes";

    $("resultQuantity").textContent =
        formatNumber(quantity, 0) + (quantity === 1 ? " pc" : " pcs");

    $("volume").textContent =
        formatNumber(volumeM3, 8) + " m³";

    $("resultDensity").textContent =
        formatNumber(density, 2) + " g/cm³";

    $("dimensions").textContent =
        "Material: " + materialName +
        " | Dimensions: " +
        width + " × " +
        thickness + " × " +
        length + " " + currentUnit;

    $("results").style.display = "block";

    autoRecalculate = true;
}
// ==================================================
// WEIGHT CALCULATION FORMULA END
// This function ends here.
// ==================================================

/* RESET CALCULATOR */

// ==================================================
// RESET CALCULATOR START
// Clears the inputs and puts the calculator back to its starting state.
// Here the calculator is brought back to its starting state.
// ==================================================
function resetCalculator() {
    ["width", "thickness", "length"].forEach(id => {
        $(id).value = "";
    });

    $("quantity").value = "1";
    $("material").value = "carbon-steel";
    $("customDensity").value = "";

    currentUnit = "mm";

    $("mmBtn").classList.add("active");
    $("inchBtn").classList.remove("active");

    $("mmBtn").setAttribute("aria-pressed", "true");
    $("inchBtn").setAttribute("aria-pressed", "false");

    $("unitNote").textContent =
        "All dimensions are in millimeters.";

    $("error").textContent = "";
    $("results").style.display = "none";

    lastCalculation = null;
    autoRecalculate = false;

    updateDensityDisplay();
}
// ==================================================
// RESET CALCULATOR END
// This function ends here.
// ==================================================

/* EVENT LISTENERS */

$("mmBtn").addEventListener("click", () => {
    changeUnit("mm");
});

$("inchBtn").addEventListener("click", () => {
    changeUnit("in");
});

$("material").addEventListener("change", materialChanged);

$("calculateBtn").addEventListener("click", calculateWeight);

$("resetBtn").addEventListener("click", resetCalculator);

$("customDensity").addEventListener("input", () => {
    updateDensityDisplay();

    if (autoRecalculate) {
        calculateWeight();
    }
});

$("quantity").addEventListener("input", () => {
    if (autoRecalculate) {
        calculateWeight();
    }
});

/* DIMENSION INPUT REFRESH */
/*
 * Once a result is on screen, editing a dimension keeps it in step.
 * A short pause avoids one request per keystroke. While a field is
 * empty the previous result is hidden instead of being shown as if
 * it still described the current inputs.
 */
let autoRecalcTimer = null;

function scheduleAutoRecalculate() {
    if (!autoRecalculate) {
        return;
    }

    clearTimeout(autoRecalcTimer);

    if (FIELDS.some(function (id) {
        return String($(id).value).trim() === "";
    })) {
        $("results").style.display = "none";
        return;
    }

    autoRecalcTimer = setTimeout(calculateWeight, 350);
}

FIELDS.forEach(function (id) {
    $(id).addEventListener("input", scheduleAutoRecalculate);
});

/*
 * Mobile keyboard navigation.
 * "Next" moves through the dimension fields in order.
 * Enter on the last dimension triggers the calculation.
 */
FIELDS.forEach((id, index) => {
    $(id).addEventListener("keydown", event => {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();

        if (index < FIELDS.length - 1) {
            $(FIELDS[index + 1]).focus();
        } else {
            $("calculateBtn").click();
        }
    });
});

/* INITIALIZE */

updateDensityDisplay();

/* CALCULATION HISTORY CONFIG */

window.CALCULATOR_HISTORY_CONFIG = {
    calculatorName: "Plate Weight Calculator",
    shapeName: "Plate",
    sizeLabels: false,
    dimensions: [
        { key: "length", label: "Length (L)" },
        { key: "width", label: "Width (W)" },
        { key: "thickness", label: "Thickness (T)" }
    ],
    getCalculation: function () {
        return lastCalculation;
    }
};

/* MATERIAL DENSITY DISCLOSURE */

(function () {
    const toggle = $("densityToggle");
    const extraRows = document.querySelectorAll(".density-extra");

    if (!toggle || !extraRows.length) {
        return;
    }

    toggle.addEventListener("click", () => {
        const expanded =
            toggle.getAttribute("aria-expanded") === "true";
        const nextExpanded = !expanded;

        toggle.setAttribute("aria-expanded", String(nextExpanded));
        toggle.classList.toggle("is-open", nextExpanded);

        extraRows.forEach(row => {
            row.hidden = !nextExpanded;
        });
    });
})();

/* ==================================================
   PLATE WEIGHT CALCULATOR JAVASCRIPT END
   This JavaScript file ends here.
================================================== */
/* Re-render localized number displays when language changes. */
window.addEventListener("mw:languagechange", function () {
    try {
        if (typeof autoRecalculate !== "undefined" && autoRecalculate && typeof calculateWeight === "function") {
            var r = calculateWeight();
            if (r && typeof r.then === "function") { r.catch(function () {}); }
        } else if (typeof updateDensityDisplay === "function") {
            updateDensityDisplay();
        }
    } catch (e) { /* ignore */ }
});

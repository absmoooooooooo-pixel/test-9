/*
 * Regression tests for the material density system.
 *
 * The Plate Weight Calculator used to show
 *   "Density is not configured for this material."
 *   "Invalid material density."
 * for Carbon Steel because it captured window.MW_MATERIALS once at load. The
 * shared registry (frontend/shared/material-density.js) now fills the tables
 * synchronously and the calculators resolve densities at call time, so a
 * missing, cached or late density table can no longer break a configured
 * material.
 *
 * These checks pin the browser registry to backend/materials/materialDensity.js,
 * run the real plate.js page script without calc-api.js (the broken state),
 * and walk every material in every calculator dropdown.
 *
 * Usage:  node test/materialDensity.js
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createContext, run } = require("./domStub");
const density = require("../materials/materialDensity");

const ROOT = path.resolve(__dirname, "..", "..");
const REGISTRY = path.join(ROOT, "frontend", "shared", "material-density.js");
const CALCULATORS = path.join(ROOT, "frontend", "calculators");
const PLATE_PAGE = path.join(CALCULATORS, "plate", "index.html");
const PLATE_SCRIPT = path.join(CALCULATORS, "plate", "plate.js");
const SELECT_SCRIPT = path.join(ROOT, "frontend", "shared", "material-select.js");

const close = (actual, expected, tolerance, label) => {
    assert.ok(
        Number.isFinite(actual) &&
            Math.abs(actual - expected) <= tolerance,
        label + ": expected " + expected + ", got " + actual
    );
};

function load(file, context) {
    run(context, fs.readFileSync(file, "utf8"), file);
}

/* A fresh browser-like context with only the shared registry present: this is
   the state that used to leave the calculators with an empty density table. */
function registryContext() {
    const context = createContext();

    load(REGISTRY, context);

    return context;
}

/* plate.js together with the registry, but deliberately without calc-api.js
   or /api/bootstrap.js. The plate formula is reproduced locally so the test
   checks the page script's density flow, not the network. */
function plateContext() {
    const context = registryContext();

    context.MWCalc = {
        calculate: async (slug, payload) => {
            assert.strictEqual(slug, "plate", "plate calculator slug");

            const factor = payload.unit === "in" ? 25.4 : 1;
            const length = payload.values.length * factor;
            const width = payload.values.width * factor;
            const thickness = payload.values.thickness * factor;
            const volumeMM3 = length * width * thickness;
            const singleWeight =
                (volumeMM3 * payload.density) / 1000000;

            return {
                volumeMM3,
                volumeM3: volumeMM3 / 1000000000,
                singleWeight,
                totalWeight: singleWeight * payload.quantity
            };
        }
    };

    load(PLATE_SCRIPT, context);

    return context;
}

function fillPlateInputs(context, material, quantity) {
    const doc = context.document;

    doc.get("length").value = "1000";
    doc.get("width").value = "500";
    doc.get("thickness").value = "10";
    doc.get("quantity").value = String(quantity || 1);
    doc.get("material").value = material;
}

/* 1. One source of truth: the browser registry must equal the backend table. */
function testRegistryMatchesBackend() {
    const context = registryContext();

    Object.keys(density.SECTION_MATERIALS).forEach(function (key) {
        const expected = density.SECTION_MATERIALS[key];
        const fromRegistry = context.MWDensity.SECTION[key];
        const fromTable = context.MW_MATERIALS[key];

        assert.ok(fromRegistry, "registry section material " + key);
        assert.ok(fromTable, "MW_MATERIALS material " + key);
        assert.strictEqual(fromTable.name, expected.name, key + " name");
        close(fromTable.density, expected.density, 1e-9, key + " density");

        /* Section densities are g/cm³, never kg/m³. */
        assert.ok(
            fromTable.density > 1 && fromTable.density < 25,
            key + " density looks like g/cm³"
        );
    });

    Object.keys(density.DISH_MATERIALS).forEach(function (key) {
        const expected = density.DISH_MATERIALS[key];
        const fromTable = context.MW_DISH_MATERIALS[key];

        assert.ok(fromTable, "MW_DISH_MATERIALS material " + key);
        assert.strictEqual(fromTable.name, expected.name, key + " dish name");
        assert.strictEqual(
            fromTable.density,
            expected.density,
            key + " dish density"
        );
    });

    assert.strictEqual(
        context.MW_MATERIALS["carbon-steel"].density,
        7.85,
        "Carbon Steel is 7.85 g/cm³ in the browser table"
    );
    assert.strictEqual(
        context.MW_DISH_MATERIALS["carbon-steel"].density,
        7850,
        "Carbon Steel is 7850 kg/m³ in the dish table"
    );
    assert.deepStrictEqual(
        context.MW_MATERIAL_ORDER,
        Array.from(density.MATERIAL_ORDER),
        "dropdown order matches the backend"
    );
}

/* 2. The reported bug: an empty table must never break a configured material. */
function testEmptyTableDoesNotBreakCarbonSteel() {
    const context = plateContext();

    /* Simulate the failure the old snapshot caused: the shared table is wiped
       after the page scripts ran, exactly like a table that never arrived. */
    context.MW_MATERIALS = {};

    context.document.get("material").value = "carbon-steel";
    context.updateDensityDisplay();

    assert.strictEqual(context.getDensity(), 7.85, "Carbon Steel density");
    assert.ok(
        context.document.get("densityInfo").textContent.indexOf("7.85") !== -1,
        "density display shows 7.85: " +
            context.document.get("densityInfo").textContent
    );
    assert.ok(
        context.document.get("densityInfo").textContent.indexOf(
            "Density is not configured"
        ) === -1,
        "no unconfigured-density message for Carbon Steel"
    );
    assert.notStrictEqual(
        context.validateInputs(),
        "Invalid material density.",
        "Carbon Steel density is valid"
    );
}

/* 3. Carbon Steel end to end: density display, validation and weight. */
async function testCarbonSteelCalculation() {
    const context = plateContext();

    context.document.get("material").value = "carbon-steel";
    context.updateDensityDisplay();

    assert.strictEqual(
        context.document.get("densityInfo").textContent,
        "Carbon Steel — 7.85 g/cm³",
        "Carbon Steel density display"
    );
    assert.strictEqual(context.getDensity(), 7.85, "Carbon Steel density value");

    fillPlateInputs(context, "carbon-steel", 1);
    assert.strictEqual(context.validateInputs(), "", "no validation error");

    await context.calculateWeight();

    assert.strictEqual(
        context.document.get("error").textContent,
        "",
        "no error after Calculate Weight"
    );
    assert.strictEqual(
        context.document.get("totalWeight").textContent,
        "39.25 kg",
        "1000 × 500 × 10 mm Carbon Steel plate weighs 39.25 kg"
    );
    assert.strictEqual(
        context.document.get("resultDensity").textContent,
        "7.85 g/cm³",
        "result panel shows the density used"
    );
    assert.strictEqual(
        context.document.get("results").style.display,
        "block",
        "results are shown"
    );

    /* Quantity multiplies the single weight, not the density. */
    fillPlateInputs(context, "carbon-steel", 3);
    await context.calculateWeight();
    assert.strictEqual(
        context.document.get("totalWeight").textContent,
        "117.75 kg",
        "three plates weigh 117.75 kg"
    );
}

/* 4. Every material in the dropdown: valid density, display and calculation. */
async function testEveryMaterial() {
    const context = plateContext();
    const doc = context.document;
    const expected = Object.keys(density.SECTION_MATERIALS);

    fillPlateInputs(context, "carbon-steel", 1);

    for (const key of expected) {
        doc.get("material").value = key;
        context.updateDensityDisplay();

        const configured = density.SECTION_MATERIALS[key];
        const shown = doc.get("densityInfo").textContent;

        assert.strictEqual(
            context.getDensity(),
            configured.density,
            key + " density resolved by the calculator"
        );
        assert.ok(
            shown.indexOf(configured.name) === 0,
            key + " display starts with the material name: " + shown
        );
        assert.ok(
            shown.indexOf("g/cm³") !== -1,
            key + " display has the g/cm³ unit: " + shown
        );
        assert.ok(
            shown.indexOf("Density is not configured") === -1,
            key + " is configured on screen"
        );
        assert.notStrictEqual(
            context.validateInputs(),
            "Invalid material density.",
            key + " passes density validation"
        );

        await context.calculateWeight();

        assert.strictEqual(
            doc.get("error").textContent,
            "",
            key + " calculates without an error"
        );

        const weight = (1000 * 500 * 10 * configured.density) / 1000000;

        assert.strictEqual(
            doc.get("totalWeight").textContent,
            weight.toFixed(2) + " kg",
            key + " weight matches L × W × T × density / 1,000,000"
        );
        assert.strictEqual(
            doc.get("resultDensity").textContent,
            configured.density.toFixed(2) + " g/cm³",
            key + " result density"
        );
    }
}

/* 5. Switching materials must never leave a stale density behind. */
function testSwitchingMaterials() {
    const context = plateContext();
    const doc = context.document;

    fillPlateInputs(context, "carbon-steel", 1);

    const sequence = [
        ["carbon-steel", 7.85],
        ["aluminium", 2.70],
        ["lead", 11.34],
        ["cast-iron", 7.20],
        ["carbon-steel", 7.85]
    ];

    sequence.forEach(function (step) {
        doc.get("material").value = step[0];
        context.materialChanged();

        assert.strictEqual(
            context.getDensity(),
            step[1],
            "density after selecting " + step[0]
        );
    });

    /* Switching to Custom with an empty field reports the custom field only;
       the previous material's density must not be reused. */
    doc.get("material").value = "custom";
    doc.get("customDensity").value = "";
    context.materialChanged();

    assert.ok(
        Number.isNaN(context.getDensity()),
        "no stale density in custom mode"
    );
    assert.strictEqual(
        doc.get("densityInfo").textContent,
        "Enter custom density",
        "custom mode asks for a density"
    );
    assert.strictEqual(
        context.validateInputs(),
        "Please enter a valid positive custom density in g/cm³.",
        "custom mode rejects an empty density"
    );
}

/* 6. Custom density validation: decimals accepted, invalid values rejected. */
async function testCustomDensityValidation() {
    const context = plateContext();
    const doc = context.document;

    fillPlateInputs(context, "custom", 1);

    const invalid = ["", "   ", "0", "-1", "abc"];

    for (const value of invalid) {
        doc.get("customDensity").value = value;

        assert.strictEqual(
            context.validateInputs(),
            "Please enter a valid positive custom density in g/cm³.",
            "custom density '" + value + "' is rejected"
        );
    }

    doc.get("customDensity").value = "9.1";

    assert.strictEqual(
        context.validateInputs(),
        "",
        "custom density 9.1 is accepted"
    );
    assert.strictEqual(context.getDensity(), 9.1, "custom density value");

    await context.calculateWeight();

    assert.strictEqual(
        doc.get("totalWeight").textContent,
        "45.50 kg",
        "custom density 9.1 gives 45.50 kg"
    );
    assert.strictEqual(
        doc.get("resultDensity").textContent,
        "9.10 g/cm³",
        "result shows the custom density"
    );
}

/* 7. Page markup: Carbon Steel is the default, so a refresh starts on 7.85. */
function testPageMarkup() {
    const html = fs.readFileSync(PLATE_PAGE, "utf8");

    assert.ok(
        html.indexOf('<option value="carbon-steel" selected>') !== -1,
        "Carbon Steel is marked as the default material in the page"
    );
    assert.ok(
        html.indexOf("shared/material-density.js") !== -1,
        "the page loads the shared density registry"
    );
    assert.ok(
        html.indexOf("shared/material-density.js") <
            html.indexOf("assets/js/calc-api.js"),
        "the registry loads before calc-api.js"
    );
}

/* 8. Fresh page load without any prior state resolves the default material. */
function testFreshLoad() {
    const context = plateContext();

    /* The page's markup default, before any script has run. */
    context.document.get("material").value = "carbon-steel";
    context.updateDensityDisplay();

    assert.strictEqual(context.getDensity(), 7.85, "fresh load density");
    assert.ok(
        context.document.get("densityInfo").textContent.indexOf("7.85") !== -1,
        "fresh load shows 7.85 g/cm³"
    );
}

/* 9. The shared dropdown renderer starts on Carbon Steel, not Custom. */
function testDropdownDefault(initialValue, marked, expected) {
    const select = {
        value: initialValue,
        textContent: "",
        changes: 0,
        attrs: {},
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(this.attrs, name)
                ? this.attrs[name]
                : null;
        },
        setAttribute(name, value) {
            this.attrs[name] = String(value);
        },
        querySelector() {
            return marked ? { value: marked } : null;
        },
        appendChild() {},
        dispatchEvent() {
            this.changes += 1;
            return true;
        }
    };

    const context = registryContext();
    const listeners = {};

    context.Event = Event;
    context.document.readyState = "complete";
    context.document.querySelectorAll = () => [select];
    context.document.getElementById = () => null;
    context.document.addEventListener = (type, handler) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(handler);
    };

    load(SELECT_SCRIPT, context);

    assert.strictEqual(
        select.value,
        expected,
        "first render selects " + expected + " (markup value was " + initialValue + ")"
    );
    assert.strictEqual(select.changes, 1, "first render fires one change event");
    assert.strictEqual(
        select.attrs["data-mw-material-ready"],
        "true",
        "the dropdown records that it has been rendered"
    );

    /* A later table refresh keeps a choice the user made. */
    select.value = "custom";
    (listeners["mw:materials-loaded"] || []).forEach((handler) => handler());

    assert.strictEqual(
        select.value,
        "custom",
        "a table refresh keeps the user's Custom Density choice"
    );
}

/* 10. Every calculator's dropdown options resolve in the shared tables. */
function testEveryCalculatorDropdown() {
    const slugs = fs
        .readdirSync(CALCULATORS)
        .filter((name) =>
            fs.existsSync(path.join(CALCULATORS, name, "index.html"))
        );

    const context = registryContext();

    slugs.forEach(function (slug) {
        const html = fs.readFileSync(
            path.join(CALCULATORS, slug, "index.html"),
            "utf8"
        );
        const select = html.match(/<select id="material"[^>]*>([\s\S]*?)<\/select>/);

        assert.ok(select, slug + " has a material dropdown");

        const isDish =
            select[0].indexOf('data-mw-material-table="dish"') !== -1;
        const table = isDish
            ? context.MW_DISH_MATERIALS
            : context.MW_MATERIALS;
        const options = Array.from(
            select[1].matchAll(/<option value="([^"]+)"/g)
        ).map((match) => match[1]);

        assert.ok(options.length > 1, slug + " lists materials");
        assert.strictEqual(
            options[0],
            "custom",
            slug + " keeps Custom Density first"
        );

        options.forEach(function (key) {
            if (key === "custom") {
                return;
            }

            assert.ok(
                table[key],
                slug + ": material '" + key + "' has a configured density"
            );
            assert.ok(
                Number(table[key].density) > 0,
                slug + ": material '" + key + "' has a positive density"
            );
        });
    });
}

(async function () {
    testRegistryMatchesBackend();
    testEmptyTableDoesNotBreakCarbonSteel();
    await testCarbonSteelCalculation();
    await testEveryMaterial();
    testSwitchingMaterials();
    await testCustomDensityValidation();
    testPageMarkup();
    testFreshLoad();
    testDropdownDefault("custom", null, "carbon-steel");
    testDropdownDefault("custom", "stainless-steel", "stainless-steel");
    testEveryCalculatorDropdown();

    console.log(
        "PASS — material densities are centralized, every material resolves, " +
            "and Carbon Steel calculates at 7.85 g/cm³."
    );
})().catch(function (error) {
    console.error("FAIL — " + error.message);
    process.exit(1);
});

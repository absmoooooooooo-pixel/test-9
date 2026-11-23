/* ==================================================
   SHARED MATERIAL DENSITY REGISTRY START
   One synchronous source of truth for every calculator's material density.

   Before this file existed the browser knew the density tables only after
   /api/bootstrap.js or frontend/assets/js/calc-api.js had run. A calculator
   that captured window.MW_MATERIALS once at load (for example plate.js)
   therefore kept an empty table whenever that other script was missing,
   cached, slow or failed, and every valid material showed
   "Density is not configured for this material." plus "Invalid material density."

   This registry is loaded before the calculators and fills the shared tables
   immediately, so a standard material always resolves. Server values stay
   authoritative: when /api/materials answers later it overwrites these
   entries (calc-api.js assigns them), and load order never matters.

   Units:
     SECTION — g/cm³  (plate, bar, pipe, channel, shell, flange ...)
     DISH    — kg/m³  (dish ends calculator)
================================================== */
(function () {
    "use strict";

    /* Same values as backend/materials/materialDensity.js. The regression test
       backend/test/materialDensity.js fails if these two ever drift apart. */
    var SECTION = {
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

    var DISH = {
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

    var ORDER = Object.keys(SECTION);
    var DEFAULT_MATERIAL = "carbon-steel";
    var CUSTOM_KEY = "custom";

    function isKind(kind) {
        return kind === "dish";
    }

    function tableName(kind) {
        return isKind(kind) ? "MW_DISH_MATERIALS" : "MW_MATERIALS";
    }

    function canonical(kind) {
        return isKind(kind) ? DISH : SECTION;
    }

    /* The shared table object. Never replaced, only filled, so every reference
       a calculator already holds stays valid. */
    function table(kind) {
        var name = tableName(kind);
        var existing = window[name];

        if (!existing || typeof existing !== "object") {
            existing = {};
            window[name] = existing;
        }

        if (isKind(kind) && !Array.isArray(window.MW_MATERIAL_ORDER)) {
            window.MW_MATERIAL_ORDER = ORDER.slice();
        }

        return existing;
    }

    /* Server values win: only keys the table does not have yet are added. */
    function ensure(kind) {
        var target = table(kind);
        var source = canonical(kind);

        Object.keys(source).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(target, key)) {
                target[key] = source[key];
            }
        });

        return target;
    }

    function get(key, kind) {
        if (!key) {
            return null;
        }

        var target = ensure(kind);

        if (Object.prototype.hasOwnProperty.call(target, key)) {
            return target[key];
        }

        var fallback = canonical(kind);

        return Object.prototype.hasOwnProperty.call(fallback, key)
            ? fallback[key]
            : null;
    }

    function isKnown(key, kind) {
        return !!get(key, kind);
    }

    /* Density in the table's own unit, or NaN when the material genuinely has
       no positive configured density (custom density is entered separately). */
    function densityOf(key, kind) {
        var material = get(key, kind);
        var value = material ? Number(material.density) : NaN;

        return Number.isFinite(value) && value > 0 ? value : NaN;
    }

    /* Fill both tables now, so no calculator can ever start with an empty one. */
    ensure("section");
    ensure("dish");

    if (!Array.isArray(window.MW_MATERIAL_ORDER) || !window.MW_MATERIAL_ORDER.length) {
        window.MW_MATERIAL_ORDER = ORDER.slice();
    }

    window.MWDensity = {
        DEFAULT_MATERIAL: DEFAULT_MATERIAL,
        CUSTOM_KEY: CUSTOM_KEY,
        SECTION: SECTION,
        DISH: DISH,
        ORDER: ORDER,
        table: table,
        ensure: ensure,
        get: get,
        isKnown: isKnown,
        densityOf: densityOf
    };

    /* /api/materials can answer after this file has filled the tables. Keep
       both tables complete if that refresh replaced any entries. */
    window.addEventListener("mw:materials-loaded", function () {
        ensure("section");
        ensure("dish");
    });
})();
/* ==================================================
   SHARED MATERIAL DENSITY REGISTRY END
   This script ends here.
================================================== */

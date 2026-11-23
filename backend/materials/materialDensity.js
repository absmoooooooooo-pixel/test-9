/*
 * Material density data — the single source of truth for the whole site.
 *
 * Three exports are kept because the calculators have always used two unit
 * systems and one common dropdown order:
 *
 *   SECTION_MATERIALS  — g/cm³  (plate, bar, pipe, channel, shell, flange ...)
 *   DISH_MATERIALS     — kg/m³  (dish ends calculator)
 *   MATERIAL_ORDER     — canonical order of the standard options in every
 *                        Material Selection dropdown (Custom Density is
 *                        inserted before these by the shared renderer)
 *
 * The values are served to the browser through GET /api/bootstrap.js and
 * GET /api/materials, so the frontend never ships its own independent copy.
 */
"use strict";

/* Density in g/cm³ — used by every calculator except dish ends. */
const SECTION_MATERIALS = Object.freeze({
    "carbon-steel": Object.freeze({ name: "Carbon Steel", density: 7.85 }),
    "stainless-steel": Object.freeze({ name: "Stainless Steel", density: 8.00 }),
    "aluminium": Object.freeze({ name: "Aluminium", density: 2.70 }),
    "brass": Object.freeze({ name: "Brass", density: 8.45 }),
    "bronze": Object.freeze({ name: "Bronze", density: 8.73 }),
    "cast-iron": Object.freeze({ name: "Cast Iron", density: 7.20 }),
    "copper": Object.freeze({ name: "Copper", density: 8.96 }),
    "zinc": Object.freeze({ name: "Zinc", density: 7.14 }),
    "lead": Object.freeze({ name: "Lead", density: 11.34 }),
    "tin": Object.freeze({ name: "Tin", density: 7.31 }),
    "titanium": Object.freeze({ name: "Titanium", density: 4.50 }),
    "nickel": Object.freeze({ name: "Nickel", density: 8.90 }),
    "magnesium": Object.freeze({ name: "Magnesium", density: 1.74 }),
    "inconel-625": Object.freeze({ name: "Inconel 625", density: 8.44 }),
    "monel-400": Object.freeze({ name: "Monel 400", density: 8.80 })
});

/* Order used by every Material Selection dropdown. Keeping it here means a
   new material only has to be added once to appear everywhere in sync. */
const MATERIAL_ORDER = Object.freeze(Object.keys(SECTION_MATERIALS));

/* Density in kg/m³ — dish ends calculator. The first 15 entries are the
   SECTION_MATERIALS table multiplied by 1000; the page's older stainless
   grades and its editable custom entry follow them. */
const DISH_MATERIALS = Object.freeze({
    "carbon-steel": Object.freeze({ name: "Carbon Steel", density: 7850 }),
    "stainless-steel": Object.freeze({ name: "Stainless Steel", density: 8000 }),
    "aluminium": Object.freeze({ name: "Aluminium", density: 2700 }),
    "brass": Object.freeze({ name: "Brass", density: 8450 }),
    "bronze": Object.freeze({ name: "Bronze", density: 8730 }),
    "cast-iron": Object.freeze({ name: "Cast Iron", density: 7200 }),
    "copper": Object.freeze({ name: "Copper", density: 8960 }),
    "zinc": Object.freeze({ name: "Zinc", density: 7140 }),
    "lead": Object.freeze({ name: "Lead", density: 11340 }),
    "tin": Object.freeze({ name: "Tin", density: 7310 }),
    "titanium": Object.freeze({ name: "Titanium", density: 4500 }),
    "nickel": Object.freeze({ name: "Nickel", density: 8900 }),
    "magnesium": Object.freeze({ name: "Magnesium", density: 1740 }),
    "inconel-625": Object.freeze({ name: "Inconel 625", density: 8440 }),
    "monel-400": Object.freeze({ name: "Monel 400", density: 8800 }),
    "ss-304": Object.freeze({ name: "Stainless Steel 304", density: 7930 }),
    "ss-316": Object.freeze({ name: "Stainless Steel 316", density: 7980 }),
    "ss-316l": Object.freeze({ name: "Stainless Steel 316L", density: 8000 }),
    "custom": Object.freeze({ name: "Custom Density", density: null })
});

/* Density values shown in the reference tables on the pages (g/cm³).
   These match the dropdown tables exactly, so no page publishes a different
   value for the same material. */
const DENSITY_REFERENCE = Object.freeze(MATERIAL_ORDER.map(function (key) {
    const material = SECTION_MATERIALS[key];

    return Object.freeze({ material: material.name, density: material.density });
}));

function lookup(table, key) {
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
}

module.exports = {
    SECTION_MATERIALS,
    DISH_MATERIALS,
    MATERIAL_ORDER,
    DENSITY_REFERENCE,
    lookup
};

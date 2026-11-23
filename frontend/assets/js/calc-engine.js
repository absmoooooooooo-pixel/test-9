/* ==================================================
   LOCAL CALCULATION ENGINE (GENERATED)
   Browser-side fallback using the same formulas as backend/.
   Generated from backend/core and backend/calculations by
   tools/build_calc_engine.py. Do not hand-edit.
================================================== */
(function (root) {
    "use strict";

    var modules = {};
    var cache = {};

    function define(name, factory) { modules[name] = factory; }
    function require(name) {
        if (cache[name]) return cache[name].exports;
        var mod = { exports: {} };
        cache[name] = mod;
        if (!modules[name]) throw new Error("Unknown module: " + name);
        modules[name](mod, mod.exports, require);
        return mod.exports;
    }

    define("core/weight", function (module, exports, require) {
        /*
         * Shared weight maths.
         *
         * Every figure below is the exact expression the browser used before the
         * split. The multiplication order is kept on purpose: it produces bit-identical
         * floating point results, which is what the parity tests compare.
         *
         * Dimensions are in millimetres, density in g/cm³ unless noted.
         */
        "use strict";
        
        const MM3_PER_M3 = 1_000_000_000;
        const MM3_G_CM3_TO_KG = 1_000_000;
        
        /**
         * Volume (mm³) and density (g/cm³) -> volumes and weights.
         * 1,000,000,000 mm³ = 1 m³ and mm³ × g/cm³ / 1,000,000 = kg.
         */
        function weightFromVolume(volumeMM3, density, quantity) {
            const volumeM3 = volumeMM3 / MM3_PER_M3;
            const singleWeight = (volumeMM3 * density) / MM3_G_CM3_TO_KG;
            const totalWeight = singleWeight * quantity;
            const totalTonnes = totalWeight / 1000;
        
            return {
                volumeMM3,
                volumeM3,
                singleWeight,
                totalWeight,
                totalTonnes
            };
        }
        
        /**
         * Dish ends use density in kg/m³:
         * weight = developed area (mm²) × thickness (mm) × density (kg/m³) / 10⁹.
         */
        function weightFromAreaKgM3(areaMM2, thicknessMM, densityKgM3) {
            return (areaMM2 * thicknessMM * densityKgM3) / MM3_PER_M3;
        }
        
        function allFinite(values) {
            return values.every((value) => Number.isFinite(value));
        }
        
        module.exports = {
            weightFromVolume,
            weightFromAreaKgM3,
            allFinite,
            MM3_PER_M3,
            MM3_G_CM3_TO_KG
        };
    });

    define("core/validation", function (module, exports, require) {
        /*
         * Request validation for the calculation API.
         *
         * The browser still validates its fields so the user sees the familiar,
         * field-level messages. This module is the server-side authority: it never
         * trusts the request body and rejects anything that is not a finite, in-range
         * number, an allowed unit, a whole quantity or a sane density.
         */
        "use strict";
        
        const INCH_TO_MM = 25.4;
        
        class ValidationError extends Error {
            constructor(message, field, status = 400) {
                super(message);
                this.name = "ValidationError";
                this.field = field || null;
                this.status = status;
            }
        }
        
        const UNIT_FACTORS = Object.freeze({ mm: 1, in: INCH_TO_MM });
        
        function unitFactor(unit) {
            if (!Object.prototype.hasOwnProperty.call(UNIT_FACTORS, unit)) {
                throw new ValidationError(
                    'Unit must be "mm" or "in".',
                    "unit"
                );
            }
        
            return UNIT_FACTORS[unit];
        }
        
        function toNumber(raw, label, field) {
            if (raw === null || raw === undefined) {
                throw new ValidationError(
                    label + " is required. Please enter a valid positive number.",
                    field
                );
            }
        
            if (typeof raw === "string" && raw.trim() === "") {
                throw new ValidationError(
                    label + " is required. Please enter a valid positive number.",
                    field
                );
            }
        
            const value = Number(raw);
        
            if (!Number.isFinite(value)) {
                throw new ValidationError(
                    label + " must be a number.",
                    field
                );
            }
        
            return value;
        }
        
        /**
         * Reads the dimension fields declared by a calculator module.
         *
         * @param {object} payload  request body
         * @param {object} spec     { fields: [{ key, label, min, max, allowZero }] }
         * @returns {{ values: object, mm: object, factor: number }}
         */
        function readDimensions(payload, spec) {
            const rawValues = payload && payload.values;
        
            if (!rawValues || typeof rawValues !== "object") {
                throw new ValidationError("Missing input values.", "values");
            }
        
            const factor = unitFactor(payload.unit || "mm");
            const values = {};
            const mm = {};
        
            for (const field of spec.fields) {
                const label = field.label || field.key;
                const value = toNumber(rawValues[field.key], label, field.key);
        
                const min = typeof field.min === "number" ? field.min : 0;
        
                if (field.allowZero) {
                    if (value < min) {
                        throw new ValidationError(
                            label + " must be " + min + " or more.",
                            field.key
                        );
                    }
                } else if (value <= min) {
                    throw new ValidationError(
                        label + " is required. Please enter a valid positive number.",
                        field.key
                    );
                }
        
                if (typeof field.max === "number" && value > field.max) {
                    throw new ValidationError(
                        label + " is too large for this calculator.",
                        field.key
                    );
                }
        
                values[field.key] = value;
                mm[field.key] = value * factor;
            }
        
            return { values, mm, factor, raw: rawValues };
        }
        
        function readQuantity(payload) {
            const raw = payload ? payload.quantity : undefined;
            const quantity = Number(raw === undefined ? 1 : raw);
        
            if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
                throw new ValidationError(
                    "Quantity must be a positive whole number.",
                    "quantity"
                );
            }
        
            return quantity;
        }
        
        function readDensity(payload, options) {
            const opts = options || {};
            const min = typeof opts.min === "number" ? opts.min : 0.01;
            const max = typeof opts.max === "number" ? opts.max : 25000;
            const raw = payload ? payload.density : undefined;
            const density = Number(raw);
        
            if (!Number.isFinite(density) || density <= 0) {
                throw new ValidationError(
                    "Invalid material density.",
                    "density"
                );
            }
        
            if (density < min || density > max) {
                throw new ValidationError(
                    "Material density is outside the supported range.",
                    "density"
                );
            }
        
            return density;
        }
        
        /** Guards against overflow and NaN produced by extreme (but valid) input. */
        function assertFinite(numbers) {
            for (const value of numbers) {
                if (!Number.isFinite(value)) {
                    throw new ValidationError(
                        "Values are too large to calculate safely.",
                        null,
                        422
                    );
                }
            }
        }
        
        module.exports = {
            ValidationError,
            unitFactor,
            readDimensions,
            readQuantity,
            readDensity,
            assertFinite,
            INCH_TO_MM
        };
    });

    define("calculations/prismatic", function (module, exports, require) {
        /*
         * Prismatic section calculators.
         *
         * Every calculator in this file is "constant cross-section × length":
         *
         *   volume (mm³) = area (mm²) × length (mm)
         *
         * The area expressions are ported verbatim from the original browser code, so
         * the results are identical for identical input. Nothing here is rounded.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite, ValidationError } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const LENGTH = { key: "length", label: "Length" };
        
        /* ------------------------------------------------------------------ *
         * Cross-section area formulas (dimensions already in millimetres)
         * ------------------------------------------------------------------ */
        const SHAPES = {
            "plate": {
                fields: [
                    { key: "width", label: "Width" },
                    { key: "thickness", label: "Thickness" },
                    LENGTH
                ],
                area: (d) => d.width * d.thickness
            },
        
            "box-channel": {
                fields: [
                    { key: "b", label: "Width" },
                    { key: "h", label: "Height" },
                    { key: "t", label: "Thickness" },
                    LENGTH
                ],
                area: (d) => {
                    const innerWidth = d.b - 2 * d.t;
                    const innerHeight = d.h - 2 * d.t;
                    return d.b * d.h - innerWidth * innerHeight;
                },
                validate: (d) => (
                    d.t * 2 >= d.b || d.t * 2 >= d.h
                        ? "Wall thickness must be less than half of both outer dimensions."
                        : ""
                )
            },
        
            "c-channel": {
                fields: [
                    { key: "h", label: "Height" },
                    { key: "b", label: "Flange width" },
                    { key: "tw", label: "Web thickness" },
                    { key: "tf", label: "Flange thickness" },
                    LENGTH
                ],
                area: (d) => d.h * d.tw + 2 * (d.b - d.tw) * d.tf,
                validate: (d) => {
                    if (d.tw >= d.b) {
                        return "Web thickness must be less than the flange width.";
                    }
                    if (d.tf * 2 >= d.h) {
                        return "Flange thickness must be less than half the overall height.";
                    }
                    return "";
                }
            },
        
            "e-section": {
                fields: [
                    { key: "h", label: "Height" },
                    { key: "b", label: "Overall width" },
                    { key: "tw", label: "Web thickness" },
                    { key: "tf", label: "Flange thickness" },
                    LENGTH
                ],
                area: (d) => d.h * d.tw + 3 * (d.b - d.tw) * d.tf,
                validate: (d) => {
                    if (d.tw >= d.b) {
                        return "Web thickness must be less than the overall width.";
                    }
                    if (d.tf * 3 >= d.h) {
                        return "Flange thickness must be less than one-third of the overall height.";
                    }
                    return "";
                }
            },
        
            "i-channel": {
                fields: [
                    { key: "h", label: "Height" },
                    { key: "b", label: "Flange width" },
                    { key: "tw", label: "Web thickness" },
                    { key: "tf", label: "Flange thickness" },
                    LENGTH
                ],
                area: (d) => 2 * d.b * d.tf + (d.h - 2 * d.tf) * d.tw,
                validate: (d) => {
                    if (d.tw >= d.b) {
                        return "Web thickness must be less than the flange width.";
                    }
                    if (d.tf * 2 >= d.h) {
                        return "Flange thickness must be less than half the overall height.";
                    }
                    return "";
                }
            },
        
            "t-channel": {
                fields: [
                    { key: "h", label: "Height" },
                    { key: "b", label: "Flange width" },
                    { key: "tw", label: "Web thickness" },
                    { key: "tf", label: "Flange thickness" },
                    LENGTH
                ],
                area: (d) => d.b * d.tf + (d.h - d.tf) * d.tw,
                validate: (d) => {
                    if (d.tw >= d.b) {
                        return "Web thickness must be less than the flange width.";
                    }
                    if (d.tf >= d.h) {
                        return "Flange thickness must be less than the overall height.";
                    }
                    return "";
                }
            },
        
            "l-channel": {
                fields: [
                    { key: "legA", label: "Leg A" },
                    { key: "legB", label: "Leg B" },
                    { key: "t", label: "Thickness" },
                    LENGTH
                ],
                area: (d) => d.legA * d.t + (d.legB - d.t) * d.t,
                validate: (d) => (
                    d.t >= d.legA || d.t >= d.legB
                        ? "Thickness must be less than both leg dimensions."
                        : ""
                )
            },
        
            "pipe": {
                fields: [
                    { key: "od", label: "Outer diameter" },
                    { key: "wall", label: "Wall thickness" },
                    LENGTH
                ],
                area: (d) => {
                    const innerDiameter = d.od - 2 * d.wall;
                    return (Math.PI / 4) * (d.od * d.od - innerDiameter * innerDiameter);
                },
                validate: (d) => (
                    d.wall * 2 >= d.od
                        ? "Wall thickness must be less than half the outer diameter."
                        : ""
                )
            },
        
            "shell": {
                fields: [
                    { key: "od", label: "Outer diameter" },
                    { key: "thickness", label: "Thickness" },
                    LENGTH
                ],
                /* π × (OD × T − T²) is identical to π/4 × (OD² − ID²) with ID = OD − 2T. */
                area: (d) => Math.PI * (d.od * d.thickness - d.thickness * d.thickness),
                validate: (d) => {
                    if (d.thickness * 2 >= d.od) {
                        return "Thickness must be less than half of the outer diameter.";
                    }
                    if (!(d.od - 2 * d.thickness > 0)) {
                        return "The calculated inner diameter is not valid. Reduce the thickness.";
                    }
                    return "";
                }
            },
        
            "hexagon-bar": {
                fields: [
                    { key: "a", label: "Across flats" },
                    LENGTH
                ],
                area: (d) => (Math.sqrt(3) / 2) * d.a * d.a
            },
        
            "hexagonal-bar-with-round-hole": {
                fields: [
                    { key: "a", label: "Across flats" },
                    { key: "d", label: "Hole diameter" },
                    LENGTH
                ],
                area: (d) => {
                    const areaOuter = (Math.sqrt(3) / 2) * d.a * d.a;
                    const areaHole = (Math.PI / 4) * d.d * d.d;
                    return areaOuter - areaHole;
                },
                validate: (d) => (
                    d.d >= d.a
                        ? "Hole diameter must be less than the outer across-flats dimension."
                        : ""
                )
            },
        
            "round-bar-with-hexagonal-hole": {
                fields: [
                    { key: "diameter", label: "Outer diameter" },
                    { key: "a", label: "Hex across flats" },
                    LENGTH
                ],
                area: (d) => {
                    const areaOuter = (Math.PI / 4) * d.diameter * d.diameter;
                    const areaHole = (Math.sqrt(3) / 2) * d.a * d.a;
                    return areaOuter - areaHole;
                },
                validate: (d) => {
                    /* A regular hexagon with across-flats A fits inside a circle of
                       diameter D when A / √3 ≤ D / 2. */
                    const maxAcrossFlats = (Math.sqrt(3) / 2) * d.diameter;
                    return d.a > maxAcrossFlats
                        ? "Hexagonal hole across-flats is too large for the outer diameter."
                        : "";
                }
            },
        
            "square-bar": {
                fields: [
                    { key: "a", label: "Side A" },
                    { key: "b", label: "Side B" },
                    LENGTH
                ],
                area: (d) => d.a * d.b
            },
        
            "trapezium-bar": {
                fields: [
                    { key: "a", label: "Parallel side A" },
                    { key: "b", label: "Parallel side B" },
                    { key: "h", label: "Height" },
                    LENGTH
                ],
                area: (d) => ((d.a + d.b) / 2) * d.h
            },
        
            "trapezoidal-bar": {
                fields: [
                    { key: "a", label: "Parallel side A" },
                    { key: "b", label: "Parallel side B" },
                    { key: "h", label: "Height" },
                    LENGTH
                ],
                area: (d) => ((d.a + d.b) / 2) * d.h
            },
        
            "triangular-bar": {
                fields: [
                    { key: "b", label: "Base" },
                    { key: "h", label: "Height" },
                    LENGTH
                ],
                area: (d) => (d.b * d.h) / 2
            }
        };
        
        /**
         * Generic prismatic calculation.
         * @returns {{ areaMM2:number, volumeMM3:number, volumeM3:number,
         *            singleWeight:number, totalWeight:number, totalTonnes:number }}
         */
        function compute(slug, payload) {
            const shape = SHAPES[slug];
        
            if (!shape) {
                throw new ValidationError("Unknown calculator: " + slug, null, 404);
            }
        
            const { mm } = readDimensions(payload, { fields: shape.fields });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            if (shape.fields.some((field) => !(mm[field.key] > 0))) {
                throw new ValidationError("Every dimension must be greater than zero.");
            }
        
            const shapeError = shape.validate ? shape.validate(mm) : "";
        
            if (shapeError) {
                throw new ValidationError(shapeError);
            }
        
            const areaMM2 = shape.area(mm);
            const volumeMM3 = areaMM2 * mm.length;
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            assertFinite([areaMM2, weight.volumeM3, weight.singleWeight, weight.totalWeight]);
        
            return {
                areaMM2,
                ...weight
            };
        }
        
        module.exports = {
            SHAPES,
            compute,
            slugs: Object.keys(SHAPES)
        };
    });

    define("calculations/circularPlate", function (module, exports, require) {
        /*
         * Circular plate: a disc of diameter D and thickness T.
         *
         *   area   = (π / 4) × D²
         *   volume = area × T
         *
         * Ported from the original browser formula without changes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "diameter", label: "Diameter" },
            { key: "thickness", label: "Thickness" }
        ];
        
        function compute(payload) {
            const { mm } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            const areaMM2 = (Math.PI / 4) * mm.diameter * mm.diameter;
            const volumeMM3 = areaMM2 * mm.thickness;
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            assertFinite([areaMM2, weight.volumeM3, weight.singleWeight, weight.totalWeight]);
        
            return { areaMM2, ...weight };
        }
        
        module.exports = { FIELDS, compute };
    });

    define("calculations/roundBar", function (module, exports, require) {
        /*
         * Round bar: a solid cylinder of diameter D and length L.
         *
         *   volume = (π / 4) × D² × L
         *
         * Ported from the original browser formula without changes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "diameter", label: "Diameter" },
            { key: "length", label: "Length" }
        ];
        
        function compute(payload) {
            const { mm } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            const volumeMM3 =
                (Math.PI / 4) * mm.diameter * mm.diameter * mm.length;
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            assertFinite([weight.volumeM3, weight.singleWeight, weight.totalWeight]);
        
            return { ...weight };
        }
        
        module.exports = { FIELDS, compute };
    });

    define("calculations/solidCone", function (module, exports, require) {
        /*
         * Solid cone: base diameter D, height H.
         *
         *   volume = (1 / 3) × π × r² × H   with r = D / 2
         *
         * Ported from the original browser formula without changes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "diameter", label: "Diameter" },
            { key: "height", label: "Height" }
        ];
        
        function compute(payload) {
            const { mm } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            const radius = mm.diameter / 2;
            const volumeMM3 = (1 / 3) * Math.PI * radius * radius * mm.height;
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            assertFinite([weight.volumeM3, weight.singleWeight, weight.totalWeight]);
        
            return { ...weight };
        }
        
        module.exports = { FIELDS, compute };
    });

    define("calculations/sphereBall", function (module, exports, require) {
        /*
         * Sphere / ball: diameter D.
         *
         *   volume = (4 / 3) × π × r³   with r = D / 2
         *
         * Ported from the original browser formula without changes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "diameter", label: "Diameter" }
        ];
        
        function compute(payload) {
            const { mm } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            const radius = mm.diameter / 2;
            const volumeMM3 = (4 / 3) * Math.PI * Math.pow(radius, 3);
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            assertFinite([weight.volumeM3, weight.singleWeight, weight.totalWeight]);
        
            return { ...weight };
        }
        
        module.exports = { FIELDS, compute };
    });

    define("calculations/truncatedCone", function (module, exports, require) {
        /*
         * Truncated cone made from plate: large end D, small end d, height H and
         * plate thickness T.
         *
         *   slant        = √(H² + (R − r)²)
         *   surface area = π × (R + r) × slant
         *   plate volume = surface area × T
         *
         * The weight is the weight of that plate, not a solid frustum.
         * Ported from the original browser formula without changes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite, ValidationError } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "largeDiameter", label: "Large end diameter" },
            { key: "smallDiameter", label: "Small end diameter" },
            { key: "height", label: "Height" },
            { key: "thickness", label: "Plate thickness" }
        ];
        
        function geometry(d) {
            const largeRadius = d.largeDiameter / 2;
            const smallRadius = d.smallDiameter / 2;
            const slantHeight = Math.sqrt(
                d.height * d.height +
                Math.pow(largeRadius - smallRadius, 2)
            );
            const surfaceArea = Math.PI * (largeRadius + smallRadius) * slantHeight;
            const plateVolume = surfaceArea * d.thickness;
        
            return {
                largeRadius,
                smallRadius,
                slantHeight,
                surfaceArea,
                plateVolume
            };
        }
        
        function compute(payload) {
            const { mm, factor } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            if (mm.smallDiameter >= mm.largeDiameter) {
                throw new ValidationError(
                    "Small end diameter must be less than the large end diameter."
                );
            }
        
            if (mm.thickness * 2 >= mm.smallDiameter) {
                throw new ValidationError(
                    "Plate thickness must be less than half the small end diameter."
                );
            }
        
            const shape = geometry(mm);
        
            /* 1,000,000 mm² = 1 m², and 1,000,000,000 mm³ = 1 m³. */
            const surfaceAreaM2 = shape.surfaceArea / 1_000_000;
            const weight = weightFromVolume(shape.plateVolume, density, quantity);
        
            assertFinite([
                shape.slantHeight,
                surfaceAreaM2,
                weight.volumeM3,
                weight.singleWeight,
                weight.totalWeight,
                weight.totalTonnes
            ]);
        
            return {
                slantHeightMM: shape.slantHeight,
                /* The screen shows the slant in the unit the user typed in. */
                slantHeight: shape.slantHeight / factor,
                surfaceAreaMM2: shape.surfaceArea,
                surfaceAreaM2,
                volumeMM3: shape.plateVolume,
                ...weight
            };
        }
        
        module.exports = { FIELDS, compute, geometry };
    });

    define("calculations/flangePlate", function (module, exports, require) {
        /*
         * Flange plate with a central bore and a ring of bolt holes.
         *
         *   gross area = (π / 4) × (OD² − ID²)
         *   hole area  = N × (π / 4) × HD²
         *   net area   = gross area − hole area
         *   volume     = net area × T
         *
         * Ported from the original browser formula without changes, including the
         * geometry checks that reject overlapping holes.
         */
        "use strict";
        
        const { readDimensions, readQuantity, readDensity, assertFinite, ValidationError } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const FIELDS = [
            { key: "od", label: "Outer diameter" },
            { key: "id", label: "Inner diameter" },
            { key: "thickness", label: "Thickness" },
            { key: "holeDiameter", label: "Bolt hole diameter" },
            { key: "pcd", label: "Bolt hole pitch circle diameter" }
        ];
        
        function compute(payload) {
            const { mm, values, factor } = readDimensions(payload, { fields: FIELDS });
            const quantity = readQuantity(payload);
            const density = readDensity(payload);
        
            const holes = Number(payload && payload.values ? payload.values.holes : NaN);
        
            if (!Number.isSafeInteger(holes) || holes < 1) {
                throw new ValidationError(
                    "Number of bolt holes must be a positive whole number.",
                    "holes"
                );
            }
        
            if ([values.od, values.id, values.thickness, values.pcd, values.holeDiameter]
                .some((value) => value > 100000 || value * factor > 100000 * factor)) {
                throw new ValidationError("One of the dimensions is too large for this calculator.");
            }
        
            /* GEOMETRY CHECKS (same rules as the browser, evaluated on millimetres) */
            if (mm.od <= mm.id) {
                throw new ValidationError(
                    "Outer diameter must be greater than the inner diameter."
                );
            }
        
            if (mm.pcd / 2 - mm.holeDiameter / 2 <= mm.id / 2 + 1e-9) {
                throw new ValidationError(
                    "Bolt holes overlap the central bore. Increase the PCD, or reduce the inner diameter or the bolt hole diameter."
                );
            }
        
            if (mm.pcd / 2 + mm.holeDiameter / 2 >= mm.od / 2 - 1e-9) {
                throw new ValidationError(
                    "Bolt holes cross the outside edge. Reduce the PCD or the bolt hole diameter, or increase the outer diameter."
                );
            }
        
            if (holes > 1) {
                const chord = mm.pcd * Math.sin(Math.PI / holes);
        
                if (chord < mm.holeDiameter - 1e-9) {
                    throw new ValidationError(
                        "Adjacent bolt holes overlap. Reduce the bolt hole diameter or the number of holes, or increase the PCD."
                    );
                }
            }
        
            /* Full annular face (disc minus bore) before the bolt holes. */
            const grossAreaMM2 =
                (Math.PI / 4) * (mm.od * mm.od - mm.id * mm.id);
        
            /* One bolt hole removes a circle of π/4 × HD². */
            const holeAreaMM2 =
                holes * (Math.PI / 4) * mm.holeDiameter * mm.holeDiameter;
        
            const areaMM2 = grossAreaMM2 - holeAreaMM2;
            const volumeMM3 = areaMM2 * mm.thickness;
            const weight = weightFromVolume(volumeMM3, density, quantity);
        
            const removedPercent = grossAreaMM2 > 0
                ? (holeAreaMM2 / grossAreaMM2) * 100
                : 0;
        
            assertFinite([
                grossAreaMM2,
                holeAreaMM2,
                areaMM2,
                weight.volumeM3,
                weight.singleWeight,
                weight.totalWeight
            ]);
        
            return {
                holes,
                grossAreaMM2,
                holeAreaMM2,
                areaMM2,
                removedPercent,
                ...weight
            };
        }
        
        module.exports = { FIELDS, compute };
    });

    define("calculations/dishEnds", function (module, exports, require) {
        /*
         * Dish ends — five head types with their own geometry.
         *
         *   flat          crown πR² + straight flange 2πR·SF
         *   torispherical knuckle torus + spherical crown + flange
         *   ellipsoidal   oblate spheroid area (closed form) + flange
         *   hemispherical 2πR² + flange
         *   template      ellipsoidal area, plus the blank stations for marking out
         *
         * Weight uses density in kg/m³:
         *   W = developed area (mm²) × thickness (mm) × ρ (kg/m³) ÷ 10⁹
         *
         * Every expression below is the original browser expression, unchanged.
         */
        "use strict";
        
        const { readQuantity, readDensity, assertFinite, ValidationError } = require("core/validation");
        const { weightFromAreaKgM3 } = require("core/weight");
        
        const TYPES = Object.freeze(["flat", "torispherical", "ellipsoidal", "hemispherical", "template"]);
        
        /* Field sets per head type (millimetres). */
        const TYPE_FIELDS = Object.freeze({
            flat: ["id", "kr", "sf", "t"],
            torispherical: ["id", "kr", "sf", "t"],
            ellipsoidal: ["id", "h", "sf", "t"],
            hemispherical: ["id", "sf", "t"],
            template: ["id", "h", "sf", "t"]
        });
        
        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }
        
        /* ------------------------------------------------------------------ *
         * Geometry helpers (ported verbatim)
         * ------------------------------------------------------------------ */
        
        function torispherical(R, CR, KR) {
            const spread = CR - KR;
            const ratio = clamp((R - KR) / spread, 0, 1);
            const thetaC = Math.asin(ratio);
            const thetaK = Math.PI / 2 - thetaC;
            const H = CR - Math.sqrt(Math.max(0, spread * spread - (R - KR) * (R - KR)));
            const aKnuckle = 2 * Math.PI * KR * ((R - KR) * thetaK + KR * Math.sin(thetaK));
            const aCrown = 2 * Math.PI * CR * (H - KR * Math.sin(thetaK));
        
            return { thetaC, thetaK, H, aKnuckle, aCrown };
        }
        
        function ellipsoidDishArea(a, b) {
            if (Math.abs(a - b) < 1e-9) {
                return 2 * Math.PI * a * a;
            }
            if (a > b) {
                const e = Math.sqrt(1 - (b * b) / (a * a));
                return Math.PI * a * a + (Math.PI * b * b / (2 * e)) * Math.log((1 + e) / (1 - e));
            }
            const ep = Math.sqrt(1 - (a * a) / (b * b));
            return Math.PI * a * a + (Math.PI * a * b / ep) * Math.asin(ep);
        }
        
        function meridianArc(R, H, t) {
            const steps = 160;
            let sum = 0;
            const f = (u) => Math.hypot(R * Math.cos(u), H * Math.sin(u));
        
            for (let i = 0; i < steps; i++) {
                const u0 = (t * i) / steps;
                const u1 = (t * (i + 1)) / steps;
                const um = (u0 + u1) / 2;
                sum += ((f(u0) + 4 * f(um) + f(u1)) * (u1 - u0)) / 6;
            }
        
            return sum;
        }
        
        function buildStations(R, H, n, blankR) {
            const step = (2 * Math.PI) / n;
            const rows = [];
        
            for (let i = 0; i <= n / 2; i++) {
                const phi = i * step;
                const x = R * Math.cos(phi);
                const r = Math.abs(x);
                const t = Math.asin(clamp(r / R, 0, 1));
        
                rows.push({
                    index: i,
                    angle: (phi * 180) / Math.PI,
                    planRadius: r,
                    height: H * Math.cos(t),
                    meridian: meridianArc(R, H, t),
                    bx: blankR * Math.sin(phi),
                    by: blankR * Math.cos(phi)
                });
            }
        
            return rows;
        }
        
        /* ------------------------------------------------------------------ *
         * Input
         * ------------------------------------------------------------------ */
        
        function readInput(payload) {
            const type = payload && payload.type;
        
            if (TYPES.indexOf(type) === -1) {
                throw new ValidationError("Unknown dish end type.", "type");
            }
        
            const raw = payload && payload.values;
        
            if (!raw || typeof raw !== "object") {
                throw new ValidationError("Missing input values.", "values");
            }
        
            const factor = payload.unit === "in" ? 25.4 : 1;
            const num = (key, label) => {
                const value = Number(raw[key]);
        
                if (!Number.isFinite(value)) {
                    throw new ValidationError(label + " must be a number.", key);
                }
        
                return value * factor;
            };
        
            const id = num("id", "Inside diameter");
            const t = num("t", "Thickness");
            const R = id / 2;
            const sf = raw.sf === undefined || raw.sf === null || raw.sf === ""
                ? 0
                : num("sf", "Straight face");
        
            if (!(id > 0)) {
                throw new ValidationError("Enter the dish inside diameter (ID).", "id");
            }
            if (!(t > 0)) {
                throw new ValidationError("Enter the dish thickness (T).", "t");
            }
            if (t >= R) {
                throw new ValidationError("Thickness must be smaller than the inside radius (ID ÷ 2).", "t");
            }
            if (!(sf >= 0)) {
                throw new ValidationError("Straight face must be zero or a positive number.", "sf");
            }
        
            let kr = 0;
            let h = 0;
        
            if (type === "flat" || type === "torispherical") {
                kr = num("kr", "Knuckle radius");
                if (!(kr > 0)) {
                    throw new ValidationError("Enter the dish knuckle radius (R).", "kr");
                }
                if (kr >= R) {
                    throw new ValidationError("Knuckle radius must be smaller than the inside radius (ID ÷ 2).", "kr");
                }
            }
        
            if (type === "ellipsoidal" || type === "template") {
                h = num("h", "Dish height");
                if (!(h > 0)) {
                    throw new ValidationError("Enter the dish total height (H).", "h");
                }
                if (h > id) {
                    throw new ValidationError("Dish height must not exceed the inside diameter (ID).", "h");
                }
            }
        
            const density = readDensity(payload, { min: 1, max: 25000 });
            const quantity = readQuantity(payload);
        
            let divisions = payload.divisions;
        
            if (type === "template") {
                divisions = Number(divisions === undefined ? 12 : divisions);
                if (!Number.isSafeInteger(divisions) || divisions < 4 || divisions > 360 || divisions % 2 !== 0) {
                    throw new ValidationError("Number of divisions must be an even whole number of at least 4.", "divisions");
                }
            }
        
            return {
                type,
                id,
                sf,
                t,
                kr,
                h,
                density,
                quantity,
                divisions: type === "template" ? divisions : null,
                materialName: typeof payload.materialName === "string" ? payload.materialName : ""
            };
        }
        
        /* ------------------------------------------------------------------ *
         * Calculation
         * ------------------------------------------------------------------ */
        
        function compute(input) {
            const type = input.type;
            const R = input.id / 2;
            const T = input.t;
            const SF = input.sf;
            let H = 0;
            let CR = null;
            let KR = null;
            let thetaC = null;
            let thetaK = null;
            let dishArea = 0;
            let meridian = 0;
        
            if (type === "flat") {
                H = 0;
                KR = input.kr;
                dishArea = Math.PI * R * R;
                meridian = R;
            } else if (type === "torispherical") {
                CR = input.id;
                KR = input.kr;
                const g = torispherical(R, CR, KR);
                H = g.H;
                thetaC = g.thetaC;
                thetaK = g.thetaK;
                dishArea = g.aKnuckle + g.aCrown;
                meridian = KR * g.thetaK + CR * g.thetaC;
            } else if (type === "hemispherical") {
                H = R;
                CR = R;
                dishArea = 2 * Math.PI * R * R;
                meridian = (Math.PI * R) / 2;
            } else {
                H = input.h;
                dishArea = ellipsoidDishArea(R, H);
                meridian = meridianArc(R, H, Math.PI / 2);
            }
        
            const faceArea = 2 * Math.PI * R * SF;
            const areaTotal = dishArea + faceArea;
            const blankDia = 2 * Math.sqrt(areaTotal / Math.PI);
            const blankArea = (Math.PI * blankDia * blankDia) / 4;
            const weight = weightFromAreaKgM3(areaTotal, T, input.density);
        
            assertFinite([H, dishArea, faceArea, areaTotal, blankDia, blankArea, weight]);
        
            const result = {
                kind: type,
                id: input.id,
                R,
                T,
                SF,
                H,
                CR,
                KR,
                thetaC,
                thetaK,
                dishArea,
                faceArea,
                areaTotal,
                meridian,
                blankDia,
                blankArea,
                weight,
                quantity: input.quantity,
                totalWeight: weight * input.quantity,
                density: input.density,
                materialName: input.materialName,
                divisions: null,
                stepDeg: null,
                stations: null
            };
        
            if (type === "template") {
                result.divisions = input.divisions;
                result.stepDeg = 360 / input.divisions;
                result.stations = buildStations(R, H, input.divisions, blankDia / 2);
            }
        
            return result;
        }
        
        module.exports = {
            TYPES,
            TYPE_FIELDS,
            readInput,
            compute,
            geometry: { torispherical, ellipsoidDishArea, meridianArc, buildStations }
        };
    });

    define("calculations/nutBolt", function (module, exports, require) {
        /*
         * Nut, bolt and stud weight calculator.
         *
         * One module for three categories (bolts, studs, nuts) and every product in
         * them. Each product has its own function below, so the head of a hex bolt is
         * never calculated with the formula of a socket screw and a nut is never
         * treated as a solid cylinder.
         *
         * INPUT
         *   product   product key from PRODUCTS, e.g. "hex-ht"
         *   values    the dimension fields that product needs, in the unit on screen
         *   unit      "mm" or "in"
         *   density   g/cm³
         *   quantity  whole number of identical pieces
         *
         * Everything is converted to millimetres and cubic millimetres first, because
         * mixing units is the usual source of wrong fastener weights.
         *
         * WEIGHT
         *   weight (kg) = volume (mm³) × density (g/cm³) / 1,000,000
         *   pounds      = kilograms × 2.2046226218
         *
         * THREADS
         *   A threaded length is not a full cylinder. Its effective area is the
         *   stress area of the selected thread system:
         *
         *       ISO metric (ISO 898-1):  As = π/4 × (d − 0.9382 × P)²
         *       Unified inch (ASME B1.1): As = π/4 × (d − 0.9743 × P)²
         *
         *   The factors are the averages of the minor and pitch diameters of their
         *   60° threads. The metric factor reproduces the published ISO stress areas
         *   exactly (M12 = 84.3 mm², M20 = 245 mm²). ASME inch standards must use the
         *   larger Unified factor or their threaded weight is overstated.
         *
         * HEADS AND NUTS
         *   Each shape is a geometric model based on the standard dimensions that the
         *   page fills in (see the comment above every product function). Chamfers,
         *   radii under the head and thread run-out are not modelled; they are small
         *   and are listed in the "Assumptions" panel of the page.
         */
        "use strict";
        
        const {
            readQuantity,
            readDensity,
            assertFinite,
            ValidationError
        } = require("core/validation");
        const { weightFromVolume } = require("core/weight");
        
        const INCH_TO_MM = 25.4;
        const LBS_PER_KG = 2.2046226218;
        
        /* Area of a regular hexagon measured across flats: (√3 / 2) × s². */
        const HEX_AREA_FACTOR = Math.sqrt(3) / 2;
        
        /* Stress-area diameter factors for 60° threads. */
        const ISO_STRESS_DIAMETER_FACTOR = 0.9382;
        const UNIFIED_STRESS_DIAMETER_FACTOR = 0.9743;
        
        /* ISO 965-1 internal thread minor diameter: D1 = d − 1.0825 × P. */
        const MINOR_DIAMETER_FACTOR = 1.0825;
        
        /* Basic external thread root diameter: d3 = d − 1.226869 × P (60° thread). */
        const EXTERNAL_ROOT_DEPTH_FACTOR = 1.226869;
        
        /* Standard hex head/nut chamfer: 30° cone tangent to the across-flats faces. */
        const HEX_CHAMFER_ANGLE_RAD = Math.PI / 6;
        
        /* The nylon collar of a lock nut is not metal: take this depth off the nut. */
        const NYLON_INSERT_DEPTH_MM = 1.5;
        
        /* ---------------------------------------------------------------------------
         * PRODUCT DEFINITIONS
         *
         * fields       dimension inputs the page shows, and the only ones the API
         *              accepts for that product
         * threaded     whether a thread pitch is needed
         * ------------------------------------------------------------------------- */
        const FIELDS = {
            diameter: { key: "diameter", label: "Nominal diameter" },
            pitch: { key: "pitch", label: "Thread pitch" },
            length: { key: "length", label: "Length" },
            threadLength: { key: "threadLength", label: "Thread length" },
            threadLength2: { key: "threadLength2", label: "Second thread length" },
            acrossFlats: { key: "acrossFlats", label: "Width across flats" },
            headHeight: { key: "headHeight", label: "Head height" },
            headDiameter: { key: "headDiameter", label: "Head diameter" },
            socketAcrossFlats: { key: "socketAcrossFlats", label: "Socket width across flats" },
            socketDepth: { key: "socketDepth", label: "Socket depth" },
            neckAcrossFlats: { key: "neckAcrossFlats", label: "Square neck width" },
            neckHeight: { key: "neckHeight", label: "Square neck height" },
            nutHeight: { key: "nutHeight", label: "Nut height" }
        };
        
        function pickFields(keys) {
            return keys.map((key) => FIELDS[key]);
        }
        
        const HEX_BOLT_FIELDS = ["diameter", "pitch", "length", "acrossFlats", "headHeight"];
        const SOCKET_SCREW_FIELDS = [
            "diameter", "pitch", "length", "threadLength",
            "headDiameter", "headHeight", "socketAcrossFlats", "socketDepth"
        ];
        const NUT_FIELDS = ["diameter", "pitch", "acrossFlats", "nutHeight"];
        
        const PRODUCTS = Object.freeze({
            "hex-ft": Object.freeze({
                name: "Hex Bolt, Full Thread",
                category: "bolts",
                fields: pickFields(HEX_BOLT_FIELDS),
                threaded: true
            }),
            "hex-ht": Object.freeze({
                name: "Hex Bolt, Half Thread",
                category: "bolts",
                fields: pickFields(HEX_BOLT_FIELDS.concat("threadLength")),
                threaded: true
            }),
            "hex-blank": Object.freeze({
                name: "Hex Bolt Blank",
                category: "bolts",
                fields: pickFields(["diameter", "length", "acrossFlats", "headHeight"]),
                threaded: false
            }),
            "socket-head": Object.freeze({
                name: "Socket Head Cap Screw",
                category: "bolts",
                fields: pickFields(SOCKET_SCREW_FIELDS),
                threaded: true
            }),
            "countersunk": Object.freeze({
                name: "Countersunk Socket Screw",
                category: "bolts",
                fields: pickFields(SOCKET_SCREW_FIELDS),
                threaded: true
            }),
            "carriage": Object.freeze({
                name: "Carriage Bolt",
                category: "bolts",
                fields: pickFields([
                    "diameter", "pitch", "length", "threadLength",
                    "headDiameter", "headHeight", "neckAcrossFlats", "neckHeight"
                ]),
                threaded: true
            }),
            "stud-ft": Object.freeze({
                name: "Fully Threaded Stud",
                category: "studs",
                fields: pickFields(["diameter", "pitch", "length"]),
                threaded: true
            }),
            "stud-de": Object.freeze({
                name: "Double End Stud",
                category: "studs",
                fields: pickFields(["diameter", "pitch", "length", "threadLength", "threadLength2"]),
                threaded: true
            }),
            "threaded-rod": Object.freeze({
                name: "Threaded Rod",
                category: "studs",
                fields: pickFields(["diameter", "pitch", "length"]),
                threaded: true
            }),
            "hex-nut": Object.freeze({
                name: "Hex Nut",
                category: "nuts",
                fields: pickFields(NUT_FIELDS),
                threaded: true
            }),
            "heavy-hex-nut": Object.freeze({
                name: "Heavy Hex Nut",
                category: "nuts",
                fields: pickFields(NUT_FIELDS),
                threaded: true
            }),
            "jam-nut": Object.freeze({
                name: "Hex Jam Nut",
                category: "nuts",
                fields: pickFields(NUT_FIELDS),
                threaded: true
            }),
            "square-nut": Object.freeze({
                name: "Square Nut",
                category: "nuts",
                fields: pickFields(NUT_FIELDS),
                threaded: true
            }),
            "lock-nut": Object.freeze({
                name: "Nylon Insert Lock Nut",
                category: "nuts",
                fields: pickFields(NUT_FIELDS),
                threaded: true
            })
        });
        
        /* ---------------------------------------------------------------------------
         * REQUEST READING
         * ------------------------------------------------------------------------- */
        
        function readProduct(payload) {
            const key = String(payload.product || "").trim();
        
            if (!Object.prototype.hasOwnProperty.call(PRODUCTS, key)) {
                throw new ValidationError(
                    "Choose a product before calculating.",
                    "product"
                );
            }
        
            return key;
        }
        
        function readUnit(payload) {
            const unit = payload.unit === undefined ? "mm" : payload.unit;
        
            if (unit !== "mm" && unit !== "in") {
                throw new ValidationError('Unit must be "mm" or "in".', "unit");
            }
        
            return unit;
        }
        
        /**
         * Chooses the stress-area factor from the thread system, not just the display
         * unit. An ASME table remains Unified even when the page shows millimetres;
         * a custom thread is Unified only when the page is using inches.
         */
        function readStressFactor(payload) {
            const standard = String(payload.standard || "").trim().toLowerCase();
        
            if (standard.indexOf("asme-") === 0) {
                return UNIFIED_STRESS_DIAMETER_FACTOR;
            }
        
            if ((standard === "" || standard === "custom") && payload.unit === "in") {
                return UNIFIED_STRESS_DIAMETER_FACTOR;
            }
        
            return ISO_STRESS_DIAMETER_FACTOR;
        }
        
        /** Reads one dimension and returns it in millimetres. */
        function readMillimetres(payload, field, factor, options) {
            const opts = options || {};
            const raw = payload.values ? payload.values[field.key] : undefined;
        
            if (raw === null || raw === undefined || String(raw).trim() === "") {
                throw new ValidationError(
                    field.label + " is required. Please enter a valid positive number.",
                    field.key
                );
            }
        
            const value = Number(raw);
        
            if (!Number.isFinite(value)) {
                throw new ValidationError(field.label + " must be a number.", field.key);
            }
        
            if (opts.allowZero && value === 0) {
                return 0;
            }
        
            if (value <= 0) {
                throw new ValidationError(
                    field.label + " is required. Please enter a valid positive number.",
                    field.key
                );
            }
        
            return value * factor;
        }
        
        function readDimensions(payload, product) {
            const unit = readUnit(payload);
            const factor = unit === "in" ? INCH_TO_MM : 1;
            const mm = {};
        
            for (const field of product.fields) {
                const allowZero = field.key === "threadLength" &&
                    (payload.product === "carriage" || payload.product === "socket-head" ||
                        payload.product === "countersunk");
        
                mm[field.key] = readMillimetres(payload, field, factor, { allowZero });
            }
        
            return { mm, factor, unit };
        }
        
        /* ---------------------------------------------------------------------------
         * SHARED GEOMETRY
         * ------------------------------------------------------------------------- */
        
        function circleArea(diameter) {
            return (Math.PI / 4) * diameter * diameter;
        }
        
        function hexagonArea(acrossFlats) {
            return HEX_AREA_FACTOR * acrossFlats * acrossFlats;
        }
        
        /**
         * Effective cross-section of a threaded length.
         * The factor is supplied by readStressFactor(); the default keeps direct
         * callers on the ISO metric formula.
         */
        function threadStressArea(diameter, pitch, diameterFactor) {
            const factor = diameterFactor === undefined
                ? ISO_STRESS_DIAMETER_FACTOR
                : diameterFactor;
            const effectiveDiameter = diameter - factor * pitch;
        
            if (effectiveDiameter <= 0) {
                throw new ValidationError(
                    "The thread pitch is too coarse for this diameter. Check the nominal diameter and the pitch.",
                    "pitch"
                );
            }
        
            return circleArea(effectiveDiameter);
        }
        
        /**
         * Physical material area of an external thread, used for mass/volume.
         *
         * The tensile stress area above is a mechanical design value, not the actual
         * cross-section of the threaded shank. For weight we use the average of the
         * major-diameter circle and the basic root-diameter circle:
         *
         *   A_thread = [ A(d) + A(d − 1.226869 × P) ] / 2
         *
         * This is a geometric approximation of the 60° thread form; it keeps the
         * same units as the other areas and avoids treating the bolt as a plain bar.
         */
        function threadMaterialArea(diameter, pitch) {
            const rootDiameter = diameter - EXTERNAL_ROOT_DEPTH_FACTOR * pitch;
        
            if (rootDiameter <= 0) {
                throw new ValidationError(
                    "The thread pitch is too coarse for this diameter. Check the nominal diameter and the pitch.",
                    "pitch"
                );
            }
        
            return (circleArea(diameter) + circleArea(rootDiameter)) / 2;
        }
        
        function assertThreadLength(threadLength, length, field, label) {
            if (threadLength > length + 1e-9) {
                throw new ValidationError(
                    (label || "Thread length") + " cannot be longer than the overall length.",
                    field
                );
            }
        }
        
        /** Common result body: volume breakdown plus kg and lbs. */
        function buildResult(context, weight) {
            return {
                product: context.productKey,
                productName: context.product.name,
                category: context.product.category,
                quantity: context.quantity,
                density: context.density,
                poundsPerKg: LBS_PER_KG,
                singlePounds: weight.singleWeight * LBS_PER_KG,
                totalPounds: weight.totalWeight * LBS_PER_KG,
                ...weight,
                ...context.breakdown
            };
        }
        
        /* ---------------------------------------------------------------------------
         * BOLT HEADS
         * ------------------------------------------------------------------------- */
        
        /*
         * Hexagon head: a regular hexagonal prism, area (√3/2) × s², height k,
         * with the standard 30° top chamfer subtracted.
         */
        function hexChamferDepth(acrossFlats) {
            /* Across corners of the regular hexagon used by the chamfer geometry. */
            const acrossCorners = acrossFlats / Math.cos(HEX_CHAMFER_ANGLE_RAD);
            const radialDrop = (acrossCorners - acrossFlats) / 2;
            return radialDrop / Math.tan(HEX_CHAMFER_ANGLE_RAD);
        }
        
        function hexChamferVolume(acrossFlats, availableDepth) {
            const depth = Math.min(hexChamferDepth(acrossFlats), availableDepth);
            /* The chamfer meets the top face on the circle tangent to the six flats. */
            const removedTopArea = hexagonArea(acrossFlats) - circleArea(acrossFlats);
            return 0.5 * removedTopArea * depth;
        }
        
        function hexHeadVolume(acrossFlats, headHeight) {
            const prism = hexagonArea(acrossFlats) * headHeight;
            const chamfer = hexChamferVolume(acrossFlats, headHeight);
            return Math.max(prism - chamfer, 0);
        }
        
        /*
         * Socket head cap screw: a cylinder π/4 × dk² × k with a hexagon socket
         * removed, socket volume = (√3/2) × s² × t.
         */
        function socketHeadVolume(headDiameter, headHeight, socketAcrossFlats, socketDepth) {
            const outer = circleArea(headDiameter) * headHeight;
            const socket = hexagonArea(socketAcrossFlats) * socketDepth;
        
            if (socket >= outer) {
                throw new ValidationError(
                    "The socket is larger than the head. Check the head and socket dimensions.",
                    "socketDepth"
                );
            }
        
            return { volume: outer - socket, socketVolume: socket, outerVolume: outer };
        }
        
        /*
         * Countersunk head: a 90° cone frustum from the head diameter dk down to the
         * shank diameter d over the head height k, with the hexagon socket removed.
         *
         *   V = (π × k / 12) × (dk² + dk × d + d²)
         */
        function countersunkHeadVolume(headDiameter, shankDiameter, headHeight,
            socketAcrossFlats, socketDepth) {
            const outer = (Math.PI * headHeight / 12) *
                (headDiameter * headDiameter + headDiameter * shankDiameter +
                    shankDiameter * shankDiameter);
            const socket = hexagonArea(socketAcrossFlats) * socketDepth;
        
            if (socket >= outer) {
                throw new ValidationError(
                    "The socket is larger than the countersunk head. Check the head and socket dimensions.",
                    "socketDepth"
                );
            }
        
            return { volume: outer - socket, socketVolume: socket, outerVolume: outer };
        }
        
        /*
         * Carriage bolt: a domed head plus the square neck under it.
         *
         *   dome  a spherical cap of base diameter dk and height k:
         *         R = (r² + k²) / (2k),  V = π × k² × (3R − k) / 3
         *   neck  the square prism a² × f, less the round shank already counted
         */
        function carriageHeadVolume(headDiameter, headHeight, neckAcrossFlats,
            neckHeight, shankDiameter) {
            const radius = headDiameter / 2;
            const sphereRadius = (radius * radius + headHeight * headHeight) /
                (2 * headHeight);
            const dome = (Math.PI * headHeight * headHeight *
                (3 * sphereRadius - headHeight)) / 3;
            const neck = Math.max(
                0,
                (neckAcrossFlats * neckAcrossFlats - circleArea(shankDiameter)) * neckHeight
            );
        
            return {
                volume: dome + neck,
                socketVolume: 0,
                outerVolume: dome + neck + circleArea(shankDiameter) * neckHeight
            };
        }
        
        /* ---------------------------------------------------------------------------
         * PRODUCT CALCULATIONS — BOLTS
         * ------------------------------------------------------------------------- */
        
        /*
         * Hex bolt, full thread:
         *   head (hex prism) + threaded shank over the full length.
         */
        function computeHexFullThread(mm, stressFactor) {
            const headVolume = hexHeadVolume(mm.acrossFlats, mm.headHeight);
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const threadVolume = materialArea * mm.length;
        
            return {
                volume: headVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: headVolume,
                    shankVolumeMM3: 0,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: 0,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.length
                }
            };
        }
        
        /*
         * Hex bolt, half thread:
         *   head + plain shank (full circle) + threaded length at the stress area.
         */
        function computeHexHalfThread(mm, stressFactor) {
            assertThreadLength(mm.threadLength, mm.length, "threadLength");
        
            const headVolume = hexHeadVolume(mm.acrossFlats, mm.headHeight);
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const solidLength = mm.length - mm.threadLength;
            const shankVolume = circleArea(mm.diameter) * solidLength;
            const threadVolume = materialArea * mm.threadLength;
        
            return {
                volume: headVolume + shankVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: headVolume,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: 0,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.threadLength
                }
            };
        }
        
        /*
         * Hex bolt blank: head + full-diameter shank, no thread at all.
         */
        function computeHexBlank(mm) {
            const headVolume = hexHeadVolume(mm.acrossFlats, mm.headHeight);
            const shankVolume = circleArea(mm.diameter) * mm.length;
        
            return {
                volume: headVolume + shankVolume,
                breakdown: {
                    headVolumeMM3: headVolume,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: 0,
                    socketVolumeMM3: 0,
                    stressAreaMM2: circleArea(mm.diameter),
                    threadMaterialAreaMM2: circleArea(mm.diameter),
                    threadLengthMM: 0
                }
            };
        }
        
        /*
         * Socket head cap screw: cylindrical socket head + plain shank + thread.
         */
        function computeSocketHead(mm, stressFactor) {
            assertThreadLength(mm.threadLength, mm.length, "threadLength");
        
            const head = socketHeadVolume(
                mm.headDiameter,
                mm.headHeight,
                mm.socketAcrossFlats,
                mm.socketDepth
            );
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const solidLength = mm.length - mm.threadLength;
            const shankVolume = circleArea(mm.diameter) * solidLength;
            const threadVolume = materialArea * mm.threadLength;
        
            return {
                volume: head.volume + shankVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: head.volume,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: head.socketVolume,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.threadLength
                }
            };
        }
        
        /*
         * Countersunk socket screw: 90° countersunk head + shank + thread.
         */
        function computeCountersunk(mm, stressFactor) {
            /* ISO 10642 measures L over the head, unlike ISO 4762 where L runs from
               the bearing face. The shank therefore exists only below the head, and a
               thread length longer than that shank is treated as fully threaded to
               the bearing face. */
            const bodyLength = mm.length - mm.headHeight;
        
            if (bodyLength <= 0) {
                throw new ValidationError(
                    "The screw length must be longer than the countersunk head height.",
                    "length"
                );
            }
        
            const effectiveThreadLength = Math.min(mm.threadLength, bodyLength);
            assertThreadLength(effectiveThreadLength, bodyLength, "threadLength");
        
            const head = countersunkHeadVolume(
                mm.headDiameter,
                mm.diameter,
                mm.headHeight,
                mm.socketAcrossFlats,
                mm.socketDepth
            );
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const solidLength = bodyLength - effectiveThreadLength;
            const shankVolume = circleArea(mm.diameter) * solidLength;
            const threadVolume = materialArea * effectiveThreadLength;
        
            return {
                volume: head.volume + shankVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: head.volume,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: head.socketVolume,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: effectiveThreadLength
                }
            };
        }
        
        /*
         * Carriage bolt: domed head, square neck, plain shank and thread.
         */
        function computeCarriage(mm, stressFactor) {
            assertThreadLength(mm.threadLength, mm.length, "threadLength");
        
            const head = carriageHeadVolume(
                mm.headDiameter,
                mm.headHeight,
                mm.neckAcrossFlats,
                mm.neckHeight,
                mm.diameter
            );
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const solidLength = mm.length - mm.threadLength;
            const shankVolume = circleArea(mm.diameter) * solidLength;
            const threadVolume = materialArea * mm.threadLength;
        
            return {
                volume: head.volume + shankVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: head.volume,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: 0,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.threadLength
                }
            };
        }
        
        /* ---------------------------------------------------------------------------
         * PRODUCT CALCULATIONS — STUDS
         * ------------------------------------------------------------------------- */
        
        /*
         * Fully threaded stud / threaded rod: threaded over the whole length.
         */
        function computeFullThreadStud(mm, stressFactor) {
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
            const threadVolume = materialArea * mm.length;
        
            return {
                volume: threadVolume,
                breakdown: {
                    headVolumeMM3: 0,
                    shankVolumeMM3: 0,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: 0,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.length
                }
            };
        }
        
        /*
         * Double end stud: thread at both ends, plain shank in the middle.
         */
        function computeDoubleEndStud(mm, stressFactor) {
            const materialArea = threadMaterialArea(mm.diameter, mm.pitch);
            const stressArea = threadStressArea(mm.diameter, mm.pitch, stressFactor);
        
            assertThreadLength(mm.threadLength, mm.length, "threadLength", "First thread length");
            assertThreadLength(mm.threadLength2, mm.length, "threadLength2", "Second thread length");
        
            const middleLength = mm.length - mm.threadLength - mm.threadLength2;
        
            if (middleLength < 0) {
                throw new ValidationError(
                    "The two thread lengths are longer than the stud. Shorten one of them or increase the overall length.",
                    "threadLength2"
                );
            }
        
            const shankVolume = circleArea(mm.diameter) * middleLength;
            const threadVolume = materialArea * (mm.threadLength + mm.threadLength2);
        
            return {
                volume: shankVolume + threadVolume,
                breakdown: {
                    headVolumeMM3: 0,
                    shankVolumeMM3: shankVolume,
                    threadVolumeMM3: threadVolume,
                    socketVolumeMM3: 0,
                    stressAreaMM2: stressArea,
                    threadMaterialAreaMM2: materialArea,
                    threadLengthMM: mm.threadLength + mm.threadLength2
                }
            };
        }
        
        /* ---------------------------------------------------------------------------
         * PRODUCT CALCULATIONS — NUTS
         * ------------------------------------------------------------------------- */
        
        /*
         * Nut body: the outer prism less the threaded bore.
         *
         * The bore is not a plain hole: the internal thread leaves metal between the
         * minor diameter D1 and the major diameter d. For the weight the bore is
         * modelled with the average of those two areas:
         *
         *   A_bore = ( A(d) + A(D1) ) / 2,   D1 = d − 1.0825 × P
         *
         * This reproduces catalogue nut weights within about 2 %.
         */
        function nutGeometry(mm, options) {
            const opts = options || {};
            const outerArea = opts.square
                ? mm.acrossFlats * mm.acrossFlats
                : hexagonArea(mm.acrossFlats);
            const majorArea = circleArea(mm.diameter);
            const minorDiameter = mm.diameter - MINOR_DIAMETER_FACTOR * mm.pitch;
        
            if (minorDiameter <= 0) {
                throw new ValidationError(
                    "The thread pitch is too coarse for this diameter. Check the nominal diameter and the pitch.",
                    "pitch"
                );
            }
        
            const minorArea = circleArea(minorDiameter);
            const boreArea = (majorArea + minorArea) / 2;
        
            if (boreArea >= outerArea) {
                throw new ValidationError(
                    "The nut is smaller than its thread. Increase the width across flats.",
                    "acrossFlats"
                );
            }
        
            /* A lock nut's nylon collar is not metal and is left out of the weight. */
            const height = opts.nylon
                ? Math.max(0.5 * mm.nutHeight, mm.nutHeight - NYLON_INSERT_DEPTH_MM)
                : mm.nutHeight;
        
            /* Hex nuts are chamfered on both faces; the 30° cone is derived from s. */
            const chamferLoss = opts.square
                ? 0
                : (hexagonArea(mm.acrossFlats) - circleArea(mm.acrossFlats)) *
                  Math.min(hexChamferDepth(mm.acrossFlats), height / 2);
            const outerVolume = outerArea * height -
                Math.min(chamferLoss, (outerArea - boreArea) * height);
        
            return {
                outerArea,
                outerVolume,
                boreArea,
                height,
                volume: outerVolume - boreArea * height
            };
        }
        
        function computeHexNut(mm, stressFactor) {
            const nut = nutGeometry(mm);
        
            return {
                volume: nut.volume,
                breakdown: {
                    headVolumeMM3: nut.outerVolume,
                    shankVolumeMM3: 0,
                    threadVolumeMM3: 0,
                    socketVolumeMM3: nut.boreArea * nut.height,
                    stressAreaMM2: threadStressArea(mm.diameter, mm.pitch, stressFactor),
                    boreAreaMM2: nut.boreArea,
                    threadLengthMM: nut.height
                }
            };
        }
        
        function computeSquareNut(mm, stressFactor) {
            const nut = nutGeometry(mm, { square: true });
        
            return {
                volume: nut.volume,
                breakdown: {
                    headVolumeMM3: nut.outerVolume,
                    shankVolumeMM3: 0,
                    threadVolumeMM3: 0,
                    socketVolumeMM3: nut.boreArea * nut.height,
                    stressAreaMM2: threadStressArea(mm.diameter, mm.pitch, stressFactor),
                    boreAreaMM2: nut.boreArea,
                    threadLengthMM: nut.height
                }
            };
        }
        
        function computeLockNut(mm, stressFactor) {
            const nut = nutGeometry(mm, { nylon: true });
        
            return {
                volume: nut.volume,
                breakdown: {
                    /* Use the same metal height as the volume model so the reported
                       breakdown always satisfies head − socket = volume. */
                    headVolumeMM3: nut.outerVolume,
                    shankVolumeMM3: 0,
                    threadVolumeMM3: 0,
                    socketVolumeMM3: nut.boreArea * nut.height,
                    stressAreaMM2: threadStressArea(mm.diameter, mm.pitch, stressFactor),
                    boreAreaMM2: nut.boreArea,
                    threadLengthMM: nut.height
                }
            };
        }
        
        /* ---------------------------------------------------------------------------
         * DISPATCH
         * ------------------------------------------------------------------------- */
        
        const CALCULATORS = {
            "hex-ft": computeHexFullThread,
            "hex-ht": computeHexHalfThread,
            "hex-blank": computeHexBlank,
            "socket-head": computeSocketHead,
            "countersunk": computeCountersunk,
            "carriage": computeCarriage,
            "stud-ft": computeFullThreadStud,
            "stud-de": computeDoubleEndStud,
            "threaded-rod": computeFullThreadStud,
            "hex-nut": computeHexNut,
            "heavy-hex-nut": computeHexNut,
            "jam-nut": computeHexNut,
            "square-nut": computeSquareNut,
            "lock-nut": computeLockNut
        };
        
        /* ---------------------------------------------------------------------------
         * VALIDATION OF THE COMBINED SHAPE
         * ------------------------------------------------------------------------- */
        
        function validateShape(productKey, mm, payload) {
            const limits = { diameter: 1000, length: 100000, acrossFlats: 5000 };
        
            if (mm.diameter > limits.diameter) {
                throw new ValidationError(
                    "The diameter is too large for this calculator.",
                    "diameter"
                );
            }
        
            if (mm.length !== undefined && mm.length > limits.length) {
                throw new ValidationError(
                    "The length is too large for this calculator.",
                    "length"
                );
            }
        
            if (mm.acrossFlats !== undefined && mm.acrossFlats > limits.acrossFlats) {
                throw new ValidationError(
                    "The width across flats is too large for this calculator.",
                    "acrossFlats"
                );
            }
        
            const nutProducts = ["hex-nut", "heavy-hex-nut", "jam-nut", "square-nut", "lock-nut"];
        
            if (nutProducts.indexOf(productKey) !== -1) {
                if (mm.acrossFlats <= mm.diameter) {
                    throw new ValidationError(
                        "The width across flats must be larger than the nominal diameter.",
                        "acrossFlats"
                    );
                }
        
                if (productKey === "lock-nut" && mm.nutHeight <= NYLON_INSERT_DEPTH_MM) {
                    throw new ValidationError(
                        "The nut height is too small for a nylon insert lock nut.",
                        "nutHeight"
                    );
                }
        
                return;
            }
        
            if (productKey === "socket-head" || productKey === "countersunk") {
                if (mm.headDiameter <= mm.diameter) {
                    throw new ValidationError(
                        "The head diameter must be larger than the shank diameter.",
                        "headDiameter"
                    );
                }
        
                if (mm.socketAcrossFlats >= mm.headDiameter) {
                    throw new ValidationError(
                        "The socket must be smaller than the head diameter.",
                        "socketAcrossFlats"
                    );
                }
        
                if (mm.socketDepth >= mm.headHeight) {
                    throw new ValidationError(
                        "The socket depth must be smaller than the head height.",
                        "socketDepth"
                    );
                }
            }
        
            if (productKey === "carriage") {
                if (mm.headDiameter <= mm.diameter) {
                    throw new ValidationError(
                        "The head diameter must be larger than the shank diameter.",
                        "headDiameter"
                    );
                }
        
                if (mm.neckAcrossFlats <= mm.diameter) {
                    throw new ValidationError(
                        "The square neck must be larger than the shank diameter.",
                        "neckAcrossFlats"
                    );
                }
            }
        
            if (productKey === "hex-ht" && mm.threadLength <= 0) {
                throw new ValidationError(
                    "The thread length is required for a half thread bolt.",
                    "threadLength"
                );
            }
        }
        
        /* ---------------------------------------------------------------------------
         * PUBLIC ENTRY POINT
         * ------------------------------------------------------------------------- */
        
        function compute(payload) {
            const body = payload || {};
            const productKey = readProduct(body);
            const product = PRODUCTS[productKey];
            const { mm } = readDimensions(body, product);
            const quantity = readQuantity(body);
            const density = readDensity(body);
            const stressFactor = readStressFactor(body);
        
            if (!CALCULATORS[productKey]) {
                throw new ValidationError(
                    "This product is not supported by the calculator.",
                    "product"
                );
            }
        
            validateShape(productKey, mm, body);
        
            const calculation = CALCULATORS[productKey](mm, stressFactor);
        
            const finiteFields = [
                calculation.volume,
                calculation.breakdown.headVolumeMM3,
                calculation.breakdown.shankVolumeMM3,
                calculation.breakdown.threadVolumeMM3,
                calculation.breakdown.stressAreaMM2
            ];
        
            if (calculation.breakdown.threadMaterialAreaMM2 !== undefined) {
                finiteFields.push(calculation.breakdown.threadMaterialAreaMM2);
            }
        
            assertFinite(finiteFields);
        
            if (calculation.volume <= 0) {
                throw new ValidationError(
                    "The entered dimensions do not describe a solid part. Check the values."
                );
            }
        
            const weight = weightFromVolume(calculation.volume, density, quantity);
        
            assertFinite([weight.singleWeight, weight.totalWeight, weight.volumeM3]);
        
            return buildResult({
                productKey,
                product,
                quantity,
                density,
                breakdown: calculation.breakdown
            }, weight);
        }
        
        module.exports = {
            PRODUCTS,
            compute,
            threadStressArea,
            threadMaterialArea,
            hexagonArea,
            LBS_PER_KG
        };
    });

    // Build registry like backend/calculations/index.js
    var prismatic = require("calculations/prismatic");
    var circularPlate = require("calculations/circularPlate");
    var roundBar = require("calculations/roundBar");
    var solidCone = require("calculations/solidCone");
    var sphereBall = require("calculations/sphereBall");
    var truncatedCone = require("calculations/truncatedCone");
    var flangePlate = require("calculations/flangePlate");
    var dishEnds = require("calculations/dishEnds");
    var nutBolt = require("calculations/nutBolt");
    var validation = require("core/validation");

    var registry = {};
    registry["circular-plate"] = circularPlate;
    registry["round-bar"] = roundBar;
    registry["solid-cone"] = solidCone;
    registry["sphere-ball"] = sphereBall;
    registry["truncated-cone"] = truncatedCone;
    registry["flange-plate"] = flangePlate;
    registry["dish-ends"] = { compute: function (payload) { return dishEnds.compute(dishEnds.readInput(payload)); } };
    registry["nut-bolt"] = nutBolt;
    prismatic.slugs.forEach(function (slug) {
        registry[slug] = { compute: function (payload) { return prismatic.compute(slug, payload); } };
    });

    function calculate(slug, payload) {
        var mod = registry[slug];
        if (!mod) {
            var err = new Error("Unknown calculator: " + slug);
            err.status = 404;
            throw err;
        }
        return mod.compute(payload || {});
    }

    root.MWCalcEngine = {
        calculate: calculate,
        slugs: function () { return Object.keys(registry); },
        ValidationError: validation.ValidationError
    };
})(typeof window !== "undefined" ? window : globalThis);

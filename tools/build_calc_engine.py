#!/usr/bin/env python3
"""Build frontend/assets/js/calc-engine.js from backend calculation modules.

The generated file exposes window.MWCalcEngine.calculate(slug, payload)
with the same formulas/validation as the backend. It is used by calc-api.js
as a local fallback when the remote API is unavailable.
"""
from __future__ import annotations
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/assets/js/calc-engine.js"

MODULES = [
    ("core/weight", "backend/core/weight.js"),
    ("core/validation", "backend/core/validation.js"),
    ("calculations/prismatic", "backend/calculations/prismatic.js"),
    ("calculations/circularPlate", "backend/calculations/circularPlate.js"),
    ("calculations/roundBar", "backend/calculations/roundBar.js"),
    ("calculations/solidCone", "backend/calculations/solidCone.js"),
    ("calculations/sphereBall", "backend/calculations/sphereBall.js"),
    ("calculations/truncatedCone", "backend/calculations/truncatedCone.js"),
    ("calculations/flangePlate", "backend/calculations/flangePlate.js"),
    ("calculations/dishEnds", "backend/calculations/dishEnds.js"),
    ("calculations/nutBolt", "backend/calculations/nutBolt.js"),
]

HEADER = r"""/* ==================================================
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

"""


def transform(source: str) -> str:
    # Replace require("../core/...") and require("./...")
    def repl(m):
        spec = m.group(2)
        if spec.startswith("../core/"):
            name = "core/" + spec[len("../core/"):]
        elif spec.startswith("./"):
            name = "calculations/" + spec[len("./"):]
        elif spec.startswith("../materials/"):
            name = "materials/" + spec[len("../materials/"):]
        else:
            return m.group(0)
        return f'require("{name}")'
    source = re.sub(r'require\((["\'])([^"\']+)\1\)', repl, source)
    # Strip "use strict" and top-level block comments at start optionally; keep logic
    return source


def main():
    parts = [HEADER]
    for name, rel in MODULES:
        src = (ROOT / rel).read_text(encoding="utf-8")
        src = transform(src)
        parts.append(f'    define({json.dumps(name)}, function (module, exports, require) {{\n')
        for line in src.splitlines():
            parts.append("        " + line + "\n")
        parts.append("    });\n\n")

    parts.append(r"""    // Build registry like backend/calculations/index.js
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
""")
    OUT.write_text("".join(parts), encoding="utf-8", newline="\n")
    print("wrote", OUT, OUT.stat().st_size)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Add material-grade UI strings to every dictionary."""
from __future__ import annotations
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import translate_extra_keys as tek

KEYS = [
"Axles, shafts, gears, crankshafts, bolts and machinery components requiring higher strength than mild steel.",
"Bridges, buildings, transmission towers, crane booms, truck frames and other weight-sensitive structural members.",
"Case-hardened gears, camshafts, pins, tubing, welded structures and general engineering parts.",
"Common Applications",
"Crankshafts, gears, bolts, studs, spindles, pins and high-strength shafts.",
"Densities are representative room-temperature values in g/cm\u00B3 and kg/m\u00B3. Actual density can vary slightly with chemical composition, manufacturing process and temperature. Confirm critical values against the applicable datasheet or mill certificate.",
"Engineering drawing of the selected dish end type with dimensions",
"Forged flanges, forged fittings, valve bodies, bonnets and pressure piping components in oil, gas and process plants.",
"Heavy-duty gears, axles, crankshafts, connecting rods, high-strength bolts and aerospace transmission parts.",
"High-duty shafts, gears, connecting rods, bolts, crankshafts and transmission components.",
"Leaf and coil springs, high-strength wire, hand tools, wear plates and spring clips.",
"Material Grades and Applications",
"Open Dish Ends Calculator",
"Pressure vessel shells and heads, boiler drums, storage tanks, heat exchanger shells and welded pressure components.",
"Seamless pressure piping, refinery process lines, power-plant piping, steam lines and industrial pipeline systems.",
"Search materials",
"Search materials...",
"Select a material",
"Select a material to explore its common grades, densities and industrial uses.",
"Shafts, gears, bolts, studs, crankshafts and general highly stressed machine components.",
"Shafts, pins, studs, gears, sprockets, carburised parts, jigs and general machined components.",
"Structural frames, support beams, base plates, brackets, gussets and general engineering fabrications where moderate strength and good weldability are required.",
"Structural sections, plates, bridges, buildings, tanks, railway wagons and general engineering structures.",
"Water, gas and steam piping, scaffolding, handrails, fence posts and low-pressure process piping.",
]

def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    targets = ["ja", "ar", "de", "es", "fr", "hi", "mr", "pt", "zh"]
    for target in targets:
        print("translating", target, flush=True)
        values = tek.translate_all(KEYS, target)
        path = ROOT / "frontend/i18n" / (target + ".json")
        data = json.loads(path.read_text(encoding="utf-8"))
        for key in KEYS:
            data["strings"][key] = values.get(key) or key
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    path = ROOT / "frontend/i18n/en.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in KEYS:
        data["strings"][key] = key
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("added", len(KEYS), "keys to all dictionaries")

if __name__ == "__main__":
    main()

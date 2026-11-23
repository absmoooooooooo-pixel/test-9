/* ==========================================================================
   Material Grades and Applications - structured reference database
   --------------------------------------------------------------------------
   Home page only. Loaded by index.html before material-grades.js.

   Every grade uses ONE consistent shape:
     name, standard, density (g/cm³), densityType, applications, overview,
     composition, mechanical, features, standards

   densityType:
     "grade"  - representative published value for that specific grade/family
     "family" - representative value for the parent material where the grade
                standard does not itself specify a density

   composition / mechanical are intentionally null where a reliable,
   condition-independent value cannot be stated. The UI labels these as
   "not documented - verify against the standard or mill certificate".
   Nothing in this file is certified test data.
========================================================================== */
(function () {
    "use strict";

    function g(name, standard, density, opts) {
        opts = opts || {};
        return {
            name: name,
            standard: standard,
            density: density,
            densityType: opts.densityType === "grade" ? "grade" : "family",
            applications: opts.applications || "",
            overview: opts.overview || "",
            composition: opts.composition || null,
            mechanical: opts.mechanical || null,
            features: opts.features || [],
            standards: opts.standards || [standard]
        };
    }

    window.MW_GRADE_DATABASE = {
        version: 2,
        densityNote: "Densities are representative engineering reference values at room temperature. " +
            "Actual density can vary slightly with chemical composition, manufacturing process and temperature. " +
            "Values are not certified test data - confirm against the applicable datasheet or mill certificate.",
        materials: [
            /* --------------------------------------------------------- CARBON STEEL */
            {
                key: "carbon-steel",
                name: "Carbon Steel",
                icon: "beam",
                grades: [
                    g("ASTM A36", "ASTM A36/A36M", 7.85, {
                        densityType: "family",
                        overview: "The most widely specified general-purpose structural carbon steel plate and shape grade.",
                        applications: "Structural frames, support beams, base plates, brackets, gussets and general engineering fabrications where moderate strength and good weldability are required.",
                        composition: { "Carbon (C)": "≤ 0.26 %", "Manganese (Mn)": "0.20 - 1.03 %", "Phosphorus (P)": "≤ 0.04 %", "Sulphur (S)": "≤ 0.05 %", "Silicon (Si)": "0.15 - 0.40 %" },
                        mechanical: { "Tensile strength": "400 - 550 MPa", "Yield strength": "≥ 250 MPa", "Elongation": "≥ 20 % (200 mm gauge)", "Hardness": "approx. 119 - 159 HB" },
                        features: ["Excellent weldability", "Readily formed and machined", "Cost-effective for general structures"],
                        standards: ["ASTM A36/A36M", "ASME SA-36"]
                    }),
                    g("ASTM A105", "ASTM A105/A105M", 7.85, {
                        densityType: "family",
                        overview: "Forged carbon steel grade for pressure-retaining components at ambient and moderate temperatures.",
                        applications: "Forged flanges, forged fittings, valve bodies, bonnets and pressure piping components in oil, gas and process plants.",
                        composition: { "Carbon (C)": "≤ 0.35 %", "Manganese (Mn)": "0.60 - 1.05 %", "Phosphorus (P)": "≤ 0.035 %", "Sulphur (S)": "≤ 0.040 %", "Silicon (Si)": "0.10 - 0.35 %" },
                        mechanical: { "Tensile strength": "≥ 485 MPa", "Yield strength": "≥ 250 MPa", "Elongation": "≥ 22 %", "Hardness": "≤ 187 HB" },
                        features: ["Forging-grade toughness", "Suitable for pressure service", "Good machinability after forging"],
                        standards: ["ASTM A105/A105M", "ASME SA-105"]
                    }),
                    g("ASTM A106 Grade B", "ASTM A106", 7.85, {
                        densityType: "family",
                        overview: "Seamless carbon steel pipe grade intended for high-temperature and pressure service.",
                        applications: "Seamless pressure piping, refinery process lines, power-plant piping, steam lines and industrial pipeline systems.",
                        composition: { "Carbon (C)": "≤ 0.30 %", "Manganese (Mn)": "0.29 - 1.06 %", "Phosphorus (P)": "≤ 0.035 %", "Sulphur (S)": "≤ 0.035 %", "Silicon (Si)": "≥ 0.10 %" },
                        mechanical: { "Tensile strength": "≥ 415 MPa", "Yield strength": "≥ 240 MPa", "Elongation": "≥ 20 %" },
                        features: ["Seamless construction", "Elevated-temperature capability", "Widely used in process piping"],
                        standards: ["ASTM A106", "ASME SA-106"]
                    }),
                    g("ASTM A516 Grade 60", "ASTM A516/A516M", 7.85, {
                        densityType: "family",
                        overview: "Fine-grain carbon steel plate optimised for pressure vessel and boiler service.",
                        applications: "Pressure vessel shells and heads, boiler drums, storage tanks, heat exchanger shells and welded pressure components.",
                        composition: { "Carbon (C)": "≤ 0.21 - 0.27 % (thickness dependent)", "Manganese (Mn)": "0.55 - 1.10 %", "Phosphorus (P)": "≤ 0.035 %", "Sulphur (S)": "≤ 0.035 %", "Silicon (Si)": "0.15 - 0.40 %" },
                        mechanical: { "Tensile strength": "415 - 550 MPa", "Yield strength": "≥ 220 MPa", "Elongation": "≥ 25 % (200 mm gauge)" },
                        features: ["Good notch toughness", "Excellent weldability", "Designed for pressure vessels"],
                        standards: ["ASTM A516/A516M", "ASME SA-516"]
                    }),
                    g("ASTM A516 Grade 70", "ASTM A516/A516M", 7.85, {
                        densityType: "family",
                        overview: "Higher-strength variant of A516 pressure vessel plate.",
                        applications: "Pressure vessels, boilers, reactors, separators and storage tanks requiring greater allowable stress than Grade 60.",
                        composition: { "Carbon (C)": "≤ 0.27 % (thickness dependent)", "Manganese (Mn)": "0.60 - 1.20 %", "Phosphorus (P)": "≤ 0.035 %", "Sulphur (S)": "≤ 0.035 %", "Silicon (Si)": "0.15 - 0.40 %" },
                        mechanical: { "Tensile strength": "485 - 620 MPa", "Yield strength": "≥ 260 MPa", "Elongation": "≥ 23 % (200 mm gauge)" },
                        features: ["Higher allowable stress", "Good weldability", "Pressure-vessel qualified"],
                        standards: ["ASTM A516/A516M", "ASME SA-516"]
                    }),
                    g("ASTM A572 Grade 50", "ASTM A572/A572M", 7.85, {
                        densityType: "family",
                        overview: "High-strength low-alloy structural steel with 345 MPa minimum yield.",
                        applications: "Bridges, buildings, transmission towers, crane booms, truck frames and other weight-sensitive structural members.",
                        composition: { "Carbon (C)": "≤ 0.23 %", "Manganese (Mn)": "≤ 1.35 %", "Phosphorus (P)": "≤ 0.04 %", "Sulphur (S)": "≤ 0.05 %", "Silicon (Si)": "≤ 0.40 %" },
                        mechanical: { "Tensile strength": "≥ 450 MPa", "Yield strength": "≥ 345 MPa", "Elongation": "≥ 21 %" },
                        features: ["High strength-to-weight ratio", "Good weldability", "Structural shapes and plates"],
                        standards: ["ASTM A572/A572M"]
                    }),
                    g("AISI 1018", "AISI 1018 / SAE 1018", 7.85, {
                        densityType: "family",
                        overview: "Low-carbon, general-purpose bar steel with excellent machinability and carburising response.",
                        applications: "Shafts, pins, studs, gears, sprockets, carburised parts, jigs and general machined components.",
                        composition: { "Carbon (C)": "0.14 - 0.20 %", "Manganese (Mn)": "0.60 - 0.90 %", "Phosphorus (P)": "≤ 0.040 %", "Sulphur (S)": "≤ 0.050 %" },
                        mechanical: { "Tensile strength": "approx. 440 MPa", "Yield strength": "approx. 370 MPa", "Elongation": "approx. 15 % (50 mm)", "Hardness": "approx. 126 HB" },
                        features: ["Good carburising response", "Easily machined", "Weldable in low-carbon condition"],
                        standards: ["AISI 1018", "SAE J403"]
                    }),
                    g("AISI 1020", "AISI 1020 / SAE 1020", 7.85, {
                        densityType: "family",
                        overview: "Slightly higher-carbon general engineering steel used where case hardening is needed.",
                        applications: "Case-hardened gears, camshafts, pins, tubing, welded structures and general engineering parts.",
                        composition: { "Carbon (C)": "0.17 - 0.23 %", "Manganese (Mn)": "0.30 - 0.60 %", "Phosphorus (P)": "≤ 0.040 %", "Sulphur (S)": "≤ 0.050 %" },
                        mechanical: { "Tensile strength": "approx. 470 MPa", "Yield strength": "approx. 350 MPa", "Elongation": "approx. 15 % (50 mm)" },
                        features: ["Good case-hardening steel", "Suitable for cold forming", "Readily welded"],
                        standards: ["AISI 1020", "SAE J403"]
                    }),
                    g("AISI 1040", "AISI 1040 / SAE 1040", 7.85, {
                        densityType: "family",
                        overview: "Medium-carbon steel offering a balance of strength, toughness and machinability.",
                        applications: "Axles, shafts, gears, crankshafts, bolts and machinery components requiring higher strength than mild steel.",
                        composition: { "Carbon (C)": "0.37 - 0.44 %", "Manganese (Mn)": "0.60 - 0.90 %", "Phosphorus (P)": "≤ 0.040 %", "Sulphur (S)": "≤ 0.050 %" },
                        mechanical: { "Tensile strength": "approx. 620 MPa (normalised)", "Yield strength": "approx. 415 MPa (normalised)", "Elongation": "approx. 13 % (50 mm)" },
                        features: ["Heat-treatable", "Good strength and toughness", "Widely available bar grade"],
                        standards: ["AISI 1040", "SAE J403"]
                    }),
                    g("AISI 1045", "AISI 1045 / SAE 1045", 7.85, {
                        densityType: "family",
                        overview: "Popular medium-carbon steel for quenched and tempered machine parts.",
                        applications: "Crankshafts, gears, bolts, studs, spindles, pins and high-strength shafts.",
                        composition: { "Carbon (C)": "0.42 - 0.50 %", "Manganese (Mn)": "0.60 - 0.90 %", "Phosphorus (P)": "≤ 0.040 %", "Sulphur (S)": "≤ 0.050 %" },
                        mechanical: { "Tensile strength": "approx. 570 MPa (annealed)", "Yield strength": "approx. 310 MPa (annealed)", "Elongation": "approx. 14 % (50 mm)", "Hardness": "approx. 170 HB (annealed)" },
                        features: ["Responds well to heat treatment", "Good machinability in annealed state", "High strength after quenching"],
                        standards: ["AISI 1045", "SAE J403"]
                    }),
                    g("AISI 1060", "AISI 1060 / SAE 1060", 7.85, {
                        densityType: "family",
                        overview: "High-carbon steel used primarily for springs and high-strength wire.",
                        applications: "Leaf and coil springs, high-strength wire, hand tools, wear plates and spring clips.",
                        composition: { "Carbon (C)": "0.55 - 0.65 %", "Manganese (Mn)": "0.60 - 0.90 %", "Phosphorus (P)": "≤ 0.040 %", "Sulphur (S)": "≤ 0.050 %" },
                        features: ["High hardness after heat treatment", "Excellent spring properties", "Limited weldability"],
                        standards: ["AISI 1060", "SAE J403"]
                    }),
                    g("EN8 (080M40)", "BS 970 EN8", 7.85, {
                        densityType: "family",
                        overview: "British standard medium-carbon engineering steel, broadly comparable to AISI 1040.",
                        applications: "Shafts, gears, bolts, studs, crankshafts and general highly stressed machine components.",
                        composition: { "Carbon (C)": "0.36 - 0.44 %", "Manganese (Mn)": "0.60 - 1.00 %", "Silicon (Si)": "0.10 - 0.40 %" },
                        features: ["Good tensile strength", "Machineable and heat treatable", "Common UK engineering steel"],
                        standards: ["BS 970 EN8", "BS EN 10083-2 C40"]
                    }),
                    g("EN19 (709M40)", "BS 970 EN19", 7.85, {
                        densityType: "family",
                        overview: "Chromium-molybdenum alloy steel for high-stress quenched and tempered parts.",
                        applications: "High-duty shafts, gears, connecting rods, bolts, crankshafts and transmission components.",
                        composition: { "Carbon (C)": "0.36 - 0.44 %", "Chromium (Cr)": "0.90 - 1.20 %", "Molybdenum (Mo)": "0.25 - 0.35 %", "Manganese (Mn)": "0.50 - 0.80 %" },
                        features: ["High fatigue strength", "Good hardenability", "Suitable for heavy-duty transmission parts"],
                        standards: ["BS 970 EN19", "BS EN 10083-3 42CrMo4"]
                    }),
                    g("EN24 (817M40)", "BS 970 EN24", 7.85, {
                        densityType: "family",
                        overview: "Nickel-chromium-molybdenum steel for the most demanding quenched and tempered components.",
                        applications: "Heavy-duty gears, axles, crankshafts, connecting rods, high-strength bolts and aerospace transmission parts.",
                        composition: { "Carbon (C)": "0.36 - 0.44 %", "Nickel (Ni)": "1.30 - 1.70 %", "Chromium (Cr)": "1.00 - 1.40 %", "Molybdenum (Mo)": "0.20 - 0.35 %", "Manganese (Mn)": "0.45 - 0.70 %" },
                        features: ["Excellent hardenability", "High toughness at strength", "Used in critical drivetrain parts"],
                        standards: ["BS 970 EN24", "BS EN 10083-3 34CrNiMo6"]
                    }),
                    g("IS 2062 E250", "IS 2062", 7.85, {
                        densityType: "family",
                        overview: "Indian standard hot-rolled structural steel for general fabrication.",
                        applications: "Structural sections, plates, bridges, buildings, tanks, railway wagons and general engineering structures.",
                        features: ["Widely used structural grade in India", "Good weldability and formability", "Available as plates and sections"],
                        standards: ["IS 2062 E250"]
                    }),
                    g("ASTM A53 Grade B", "ASTM A53/A53M", 7.85, {
                        densityType: "family",
                        overview: "General-purpose pipe grade for low-pressure fluid and structural applications.",
                        applications: "Water, gas and steam piping, scaffolding, handrails, fence posts and low-pressure process piping.",
                        composition: { "Carbon (C)": "≤ 0.30 %", "Manganese (Mn)": "≤ 1.20 %", "Phosphorus (P)": "≤ 0.05 %", "Sulphur (S)": "≤ 0.06 %" },
                        features: ["Available welded or seamless", "Good weldability", "General-purpose pipe grade"],
                        standards: ["ASTM A53/A53M", "ASME SA-53"]
                    })
                ]
            },

            /* ----------------------------------------------------- STAINLESS STEEL */
            {
                key: "stainless-steel",
                name: "Stainless Steel",
                icon: "shield",
                grades: [
                    g("304 (UNS S30400)", "ASTM A240", 7.93, {
                        densityType: "grade",
                        overview: "The standard 18/8 austenitic stainless steel and the most widely used stainless grade.",
                        applications: "Food-processing equipment, kitchen equipment, storage tanks, architectural trim, chemical vessels and general corrosion-resistant fabrication.",
                        composition: { "Chromium (Cr)": "18.0 - 20.0 %", "Nickel (Ni)": "8.0 - 10.5 %", "Carbon (C)": "≤ 0.08 %", "Manganese (Mn)": "≤ 2.0 %", "Silicon (Si)": "≤ 1.0 %" },
                        mechanical: { "Tensile strength": "≥ 515 MPa", "Yield strength": "≥ 205 MPa", "Elongation": "≥ 40 %", "Hardness": "≤ 201 HB" },
                        features: ["Good general corrosion resistance", "Excellent formability", "Widely available in all product forms"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4301"]
                    }),
                    g("304L (UNS S30403)", "ASTM A240", 7.93, {
                        densityType: "grade",
                        overview: "Low-carbon version of 304 for welded fabrications where intergranular corrosion is a concern.",
                        applications: "Welded tanks, pipes, pressure vessels, pharmaceutical plant and chemical process equipment.",
                        composition: { "Chromium (Cr)": "18.0 - 20.0 %", "Nickel (Ni)": "8.0 - 12.0 %", "Carbon (C)": "≤ 0.03 %", "Manganese (Mn)": "≤ 2.0 %" },
                        mechanical: { "Tensile strength": "≥ 485 MPa", "Yield strength": "≥ 170 MPa", "Elongation": "≥ 40 %" },
                        features: ["Low carbon reduces sensitisation", "Excellent weldability", "Slightly lower strength than 304"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4307"]
                    }),
                    g("316 (UNS S31600)", "ASTM A240", 7.98, {
                        densityType: "grade",
                        overview: "Molybdenum-bearing austenitic stainless with improved pitting and crevice corrosion resistance.",
                        applications: "Chemical-processing equipment, marine hardware, pumps, valves, medical devices and coastal architectural components.",
                        composition: { "Chromium (Cr)": "16.0 - 18.0 %", "Nickel (Ni)": "10.0 - 14.0 %", "Molybdenum (Mo)": "2.0 - 3.0 %", "Carbon (C)": "≤ 0.08 %" },
                        mechanical: { "Tensile strength": "≥ 515 MPa", "Yield strength": "≥ 205 MPa", "Elongation": "≥ 40 %", "Hardness": "≤ 217 HB" },
                        features: ["Molybdenum improves chloride resistance", "Suitable for marine exposure", "Good formability and weldability"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4401"]
                    }),
                    g("316L (UNS S31603)", "ASTM A240", 7.98, {
                        densityType: "grade",
                        overview: "Low-carbon 316 for heavily welded chemical and marine fabrications.",
                        applications: "Welded chemical vessels, pharmaceutical plant, coastal architecture, marine piping and bleach/water-treatment equipment.",
                        composition: { "Chromium (Cr)": "16.0 - 18.0 %", "Nickel (Ni)": "10.0 - 14.0 %", "Molybdenum (Mo)": "2.0 - 3.0 %", "Carbon (C)": "≤ 0.03 %" },
                        mechanical: { "Tensile strength": "≥ 485 MPa", "Yield strength": "≥ 170 MPa", "Elongation": "≥ 40 %" },
                        features: ["Low carbon for welded sections", "Improved chloride pitting resistance", "Non-magnetic in annealed condition"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4404"]
                    }),
                    g("317L (UNS S31703)", "ASTM A240", 7.98, {
                        densityType: "grade",
                        overview: "Higher-molybdenum austenitic stainless for aggressive chemical environments.",
                        applications: "Pulp and paper digesters, chemical reactors, flue-gas desulphurisation plant and high-chloride process equipment.",
                        composition: { "Chromium (Cr)": "18.0 - 20.0 %", "Nickel (Ni)": "11.0 - 15.0 %", "Molybdenum (Mo)": "3.0 - 4.0 %", "Carbon (C)": "≤ 0.03 %" },
                        features: ["Higher pitting resistance than 316L", "Low carbon for welding", "Used in severe chemical service"],
                        standards: ["ASTM A240", "ASME SA-240"]
                    }),
                    g("321 (UNS S32100)", "ASTM A240", 7.90, {
                        densityType: "grade",
                        overview: "Titanium-stabilised austenitic stainless for elevated-temperature service.",
                        applications: "Aircraft exhaust manifolds, boiler tubes, heat exchangers, expansion joints and high-temperature process piping.",
                        composition: { "Chromium (Cr)": "17.0 - 19.0 %", "Nickel (Ni)": "9.0 - 12.0 %", "Titanium (Ti)": "≥ 5 × C", "Carbon (C)": "≤ 0.08 %" },
                        features: ["Titanium stabilisation resists sensitisation", "Good high-temperature strength", "Suitable for welded high-heat parts"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4541"]
                    }),
                    g("347 (UNS S34700)", "ASTM A240", 7.96, {
                        densityType: "grade",
                        overview: "Niobium-stabilised austenitic stainless for high-temperature welded equipment.",
                        applications: "Boiler tubes, superheater tubes, chemical plant piping, jet-engine exhaust parts and welded high-temperature vessels.",
                        composition: { "Chromium (Cr)": "17.0 - 19.0 %", "Nickel (Ni)": "9.0 - 13.0 %", "Niobium (Nb)": "≥ 10 × C", "Carbon (C)": "≤ 0.08 %" },
                        features: ["Niobium stabilisation", "Good creep strength", "Used in boilers and exhaust systems"],
                        standards: ["ASTM A240", "ASME SA-240"]
                    }),
                    g("303 (UNS S30300)", "ASTM A582", 7.95, {
                        densityType: "grade",
                        overview: "Free-machining austenitic stainless developed for high-volume machining.",
                        applications: "Screws, bolts, nuts, shafts, valve stems, fittings and precision turned components.",
                        composition: { "Chromium (Cr)": "17.0 - 19.0 %", "Nickel (Ni)": "8.0 - 10.0 %", "Sulphur (S)": "≥ 0.15 %", "Carbon (C)": "≤ 0.15 %" },
                        features: ["Excellent machinability", "Sulphur addition improves chip breaking", "Lower corrosion resistance than 304"],
                        standards: ["ASTM A582", "EN 10088-3 1.4305"]
                    }),
                    g("410 (UNS S41000)", "ASTM A240", 7.70, {
                        densityType: "grade",
                        overview: "Basic martensitic stainless combining moderate corrosion resistance with hardenability.",
                        applications: "Turbine blades, valve components, pump parts, cutlery, fasteners and wear-resistant machine parts.",
                        composition: { "Chromium (Cr)": "11.5 - 13.5 %", "Carbon (C)": "≤ 0.15 %", "Manganese (Mn)": "≤ 1.0 %", "Silicon (Si)": "≤ 1.0 %" },
                        mechanical: { "Tensile strength": "≥ 440 MPa", "Yield strength": "≥ 205 MPa", "Elongation": "≥ 20 %", "Hardness": "approx. 195 HB (annealed)" },
                        features: ["Hardenable by heat treatment", "Magnetic", "Moderate corrosion resistance"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4006"]
                    }),
                    g("420 (UNS S42000)", "ASTM A240", 7.70, {
                        densityType: "grade",
                        overview: "Higher-carbon martensitic stainless capable of high hardness.",
                        applications: "Cutlery, surgical instruments, bearings, valve seats, pump parts and wear-resistant moulds.",
                        composition: { "Chromium (Cr)": "12.0 - 14.0 %", "Carbon (C)": "≥ 0.15 %", "Manganese (Mn)": "≤ 1.0 %" },
                        features: ["Can reach high hardness", "Good wear resistance", "Used for cutlery and instruments"],
                        standards: ["ASTM A240", "EN 10088-2 1.4021"]
                    }),
                    g("430 (UNS S43000)", "ASTM A240", 7.70, {
                        densityType: "grade",
                        overview: "Ferritic stainless with good corrosion resistance and lower cost than 304.",
                        applications: "Automotive trim, appliances, kitchen sinks, architectural panels, furnace parts and indoor decorative work.",
                        composition: { "Chromium (Cr)": "16.0 - 18.0 %", "Carbon (C)": "≤ 0.12 %", "Manganese (Mn)": "≤ 1.0 %" },
                        mechanical: { "Tensile strength": "≥ 450 MPa", "Yield strength": "≥ 205 MPa", "Elongation": "≥ 22 %" },
                        features: ["Ferritic and magnetic", "Good resistance to oxidising acids", "Cost-effective alternative to 304"],
                        standards: ["ASTM A240", "EN 10088-2 1.4016"]
                    }),
                    g("440C (UNS S44004)", "ASTM A276", 7.70, {
                        densityType: "grade",
                        overview: "High-carbon martensitic stainless known for very high hardness and wear resistance.",
                        applications: "Ball and roller bearings, valve seats, nozzle parts, cutlery, dies and precision wear components.",
                        composition: { "Chromium (Cr)": "16.0 - 18.0 %", "Carbon (C)": "0.95 - 1.20 %", "Molybdenum (Mo)": "≤ 0.75 %" },
                        features: ["Very high achievable hardness", "Excellent wear resistance", "Used in bearing industry"],
                        standards: ["ASTM A276", "EN 10088-3 1.4125"]
                    }),
                    g("904L (UNS N08904)", "ASTM A240", 8.00, {
                        densityType: "grade",
                        overview: "Superaustenitic stainless for severe acid and chloride service.",
                        applications: "Sulphuric acid plant, chemical reactors, pipework, heat exchangers and offshore process equipment.",
                        composition: { "Chromium (Cr)": "19.0 - 23.0 %", "Nickel (Ni)": "23.0 - 28.0 %", "Molybdenum (Mo)": "4.0 - 5.0 %", "Copper (Cu)": "1.0 - 2.0 %", "Carbon (C)": "≤ 0.02 %" },
                        features: ["Excellent resistance to sulphuric acid", "High alloy content", "Used in aggressive chemical plant"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4539"]
                    }),
                    g("2205 Duplex (UNS S32205)", "ASTM A240", 7.80, {
                        densityType: "grade",
                        overview: "Dual-phase duplex stainless combining high strength with chloride stress-corrosion resistance.",
                        applications: "Offshore piping, desalination plant, chemical vessels, bridges, pressure vessels and water-treatment equipment.",
                        composition: { "Chromium (Cr)": "22.0 - 23.0 %", "Nickel (Ni)": "4.5 - 6.5 %", "Molybdenum (Mo)": "3.0 - 3.5 %", "Nitrogen (N)": "0.14 - 0.20 %" },
                        mechanical: { "Tensile strength": "≥ 620 MPa", "Yield strength": "≥ 450 MPa", "Elongation": "≥ 25 %" },
                        features: ["Roughly twice the strength of 304", "Resistant to chloride stress corrosion cracking", "Good weldability with correct procedures"],
                        standards: ["ASTM A240", "ASME SA-240", "EN 10088-2 1.4462"]
                    }),
                    g("2507 Super Duplex (UNS S32750)", "ASTM A240", 7.80, {
                        densityType: "grade",
                        overview: "Very high-strength super duplex stainless for extreme chloride environments.",
                        applications: "Subsea piping, offshore structures, desalination, chemical processing and high-pressure seawater systems.",
                        composition: { "Chromium (Cr)": "24.0 - 26.0 %", "Nickel (Ni)": "6.0 - 8.0 %", "Molybdenum (Mo)": "3.0 - 4.5 %", "Nitrogen (N)": "0.24 - 0.32 %" },
                        features: ["Very high pitting resistance", "High mechanical strength", "Used in subsea and desalination plant"],
                        standards: ["ASTM A240", "ASME SA-240"]
                    }),
                    g("17-4PH (UNS S17400)", "ASTM A564", 7.75, {
                        densityType: "grade",
                        overview: "Precipitation-hardening martensitic stainless with adjustable strength.",
                        applications: "Aerospace fittings, valve parts, pump shafts, gears, fasteners and nuclear-component hardware.",
                        composition: { "Chromium (Cr)": "15.0 - 17.0 %", "Nickel (Ni)": "3.0 - 5.0 %", "Copper (Cu)": "3.0 - 5.0 %", "Niobium (Nb)": "0.15 - 0.45 %" },
                        features: ["Age-hardenable to high strength", "Good corrosion resistance", "Dimensional stability during heat treatment"],
                        standards: ["ASTM A564", "AMS 5643"]
                    })
                ]
            },

            /* ------------------------------------------------------------ ALUMINIUM */
            {
                key: "aluminium",
                name: "Aluminium",
                icon: "layers",
                grades: [
                    g("1050", "EN AW-1050A", 2.70, {
                        densityType: "grade",
                        overview: "Commercially pure aluminium with excellent conductivity and corrosion resistance.",
                        applications: "Chemical equipment, reflectors, electrical conductors, decorative trim and food-processing liners.",
                        composition: { "Aluminium (Al)": "≥ 99.50 %", "Silicon (Si)": "≤ 0.25 %", "Iron (Fe)": "≤ 0.40 %", "Copper (Cu)": "≤ 0.05 %" },
                        features: ["Very high electrical conductivity", "Excellent corrosion resistance", "Highly formable"],
                        standards: ["EN AW-1050A", "AA 1050"]
                    }),
                    g("1100", "AA 1100", 2.70, {
                        densityType: "grade",
                        overview: "Commercially pure aluminium sheet and plate grade for forming and chemical service.",
                        applications: "Food and chemical containers, heat exchangers, reflectors, nameplates and deep-drawn parts.",
                        composition: { "Aluminium (Al)": "≥ 99.0 %", "Copper (Cu)": "0.05 - 0.20 %", "Silicon (Si)": "≤ 0.95 % (Si+Fe)" },
                        features: ["Excellent formability", "Good corrosion resistance", "Widely used in sheet form"],
                        standards: ["AA 1100", "EN AW-1100"]
                    }),
                    g("3003", "AA 3003", 2.70, {
                        densityType: "grade",
                        overview: "Manganese-alloyed general-purpose aluminium with moderate strength.",
                        applications: "Roofing, cladding, gutters, heat exchangers, pressure vessels, cooking utensils and general sheet work.",
                        composition: { "Manganese (Mn)": "1.0 - 1.5 %", "Copper (Cu)": "0.05 - 0.20 %", "Aluminium (Al)": "Remainder" },
                        features: ["Good formability", "Better strength than 1100", "Excellent corrosion resistance"],
                        standards: ["AA 3003", "EN AW-3003"]
                    }),
                    g("3004", "AA 3004", 2.70, {
                        densityType: "grade",
                        overview: "Higher-strength variant of 3003 used mainly for drawn containers.",
                        applications: "Beverage can bodies, drawn and ironed containers, roofing and architectural sheet.",
                        composition: { "Manganese (Mn)": "1.0 - 1.5 %", "Magnesium (Mg)": "0.8 - 1.3 %", "Aluminium (Al)": "Remainder" },
                        features: ["Good strength for deep drawing", "Corrosion resistant", "Standard can-body alloy"],
                        standards: ["AA 3004", "EN AW-3004"]
                    }),
                    g("5052", "AA 5052", 2.68, {
                        densityType: "grade",
                        overview: "Magnesium-chromium alloy with excellent corrosion resistance, especially in marine atmospheres.",
                        applications: "Marine components, fuel tanks, pressure vessels, sheet-metal parts, appliances and highway signage.",
                        composition: { "Magnesium (Mg)": "2.2 - 2.8 %", "Chromium (Cr)": "0.15 - 0.35 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 230 MPa (H32)", "Yield strength": "approx. 190 MPa (H32)", "Elongation": "approx. 12 % (H32)" },
                        features: ["Excellent marine corrosion resistance", "Good fatigue strength", "Not heat treatable - strain hardened"],
                        standards: ["AA 5052", "EN AW-5052"]
                    }),
                    g("5083", "AA 5083", 2.66, {
                        densityType: "grade",
                        overview: "High-magnesium alloy widely used in welded marine structures.",
                        applications: "Ship hulls, offshore structures, tank trucks, cryogenic vessels and welded marine fabrications.",
                        composition: { "Magnesium (Mg)": "4.0 - 4.9 %", "Manganese (Mn)": "0.4 - 1.0 %", "Chromium (Cr)": "0.05 - 0.25 %", "Aluminium (Al)": "Remainder" },
                        features: ["Excellent weldability", "Outstanding marine corrosion resistance", "Good low-temperature properties"],
                        standards: ["AA 5083", "EN AW-5083"]
                    }),
                    g("5754", "AA 5754", 2.67, {
                        densityType: "grade",
                        overview: "Magnesium alloy with good forming and corrosion performance for automotive and marine panel work.",
                        applications: "Automotive body panels, marine superstructures, tanks, pressure vessels and general structural sheet.",
                        composition: { "Magnesium (Mg)": "2.6 - 3.6 %", "Manganese (Mn)": "≤ 0.50 %", "Aluminium (Al)": "Remainder" },
                        features: ["Good formability", "Good corrosion resistance", "Widely used in automotive sheet"],
                        standards: ["AA 5754", "EN AW-5754"]
                    }),
                    g("6061-T6", "AA 6061-T6", 2.70, {
                        densityType: "grade",
                        overview: "The most widely used heat-treatable general-purpose aluminium alloy.",
                        applications: "Machined components, structural frames, automotive parts, bicycle frames, marine fittings and general engineering applications.",
                        composition: { "Magnesium (Mg)": "0.8 - 1.2 %", "Silicon (Si)": "0.4 - 0.8 %", "Copper (Cu)": "0.15 - 0.40 %", "Chromium (Cr)": "0.04 - 0.35 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 310 MPa (T6)", "Yield strength": "approx. 276 MPa (T6)", "Elongation": "approx. 12 % (T6)", "Hardness": "approx. 95 HB (T6)" },
                        features: ["Good strength and toughness", "Excellent machinability in T6", "Good corrosion resistance and weldability"],
                        standards: ["AA 6061-T6", "EN AW-6061 T6"]
                    }),
                    g("6063-T5", "AA 6063-T5", 2.70, {
                        densityType: "grade",
                        overview: "Extrusion alloy valued for smooth surfaces and good anodising response.",
                        applications: "Architectural extrusions, window and door frames, curtain walls, heat sinks and decorative profiles.",
                        composition: { "Magnesium (Mg)": "0.45 - 0.90 %", "Silicon (Si)": "0.20 - 0.60 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 145 MPa (T5)", "Yield strength": "approx. 110 MPa (T5)", "Elongation": "approx. 12 % (T5)" },
                        features: ["Excellent extrudability", "Good anodising finish", "Standard architectural alloy"],
                        standards: ["AA 6063-T5", "EN AW-6063 T5"]
                    }),
                    g("6082-T6", "AA 6082-T6", 2.70, {
                        densityType: "grade",
                        overview: "Higher-strength structural extrusion alloy common in European construction.",
                        applications: "Structural extrusions, bridges, crane components, transport frames and machined structural parts.",
                        composition: { "Magnesium (Mg)": "0.6 - 1.2 %", "Silicon (Si)": "0.7 - 1.3 %", "Manganese (Mn)": "0.4 - 1.0 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 310 MPa (T6)", "Yield strength": "approx. 260 MPa (T6)", "Elongation": "approx. 10 % (T6)" },
                        features: ["Higher strength than 6061", "Good weldability", "Common in structural extrusions"],
                        standards: ["AA 6082-T6", "EN AW-6082 T6"]
                    }),
                    g("2024-T3", "AA 2024-T3", 2.78, {
                        densityType: "grade",
                        overview: "High-strength copper-containing aerospace aluminium plate and sheet.",
                        applications: "Aircraft skins, fuselage structure, wing components, high-stress fittings and transport structural parts.",
                        composition: { "Copper (Cu)": "3.8 - 4.9 %", "Magnesium (Mg)": "1.2 - 1.8 %", "Manganese (Mn)": "0.3 - 0.9 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 480 MPa (T3)", "Yield strength": "approx. 345 MPa (T3)", "Elongation": "approx. 18 % (T3)" },
                        features: ["High strength-to-weight ratio", "Good fatigue resistance", "Lower corrosion resistance - often clad"],
                        standards: ["AA 2024-T3", "EN AW-2024 T3"]
                    }),
                    g("7075-T6", "AA 7075-T6", 2.81, {
                        densityType: "grade",
                        overview: "One of the highest-strength commercially available aluminium alloys.",
                        applications: "Aircraft structures, high-stress fittings, moulds, precision sporting equipment and military hardware.",
                        composition: { "Zinc (Zn)": "5.1 - 6.1 %", "Magnesium (Mg)": "2.1 - 2.9 %", "Copper (Cu)": "1.2 - 2.0 %", "Chromium (Cr)": "0.18 - 0.28 %", "Aluminium (Al)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 570 MPa (T6)", "Yield strength": "approx. 505 MPa (T6)", "Elongation": "approx. 11 % (T6)", "Hardness": "approx. 150 HB (T6)" },
                        features: ["Very high strength", "Used in aerospace structures", "Limited weldability and corrosion resistance"],
                        standards: ["AA 7075-T6", "EN AW-7075 T6"]
                    }),
                    g("7050-T7451", "AA 7050-T7451", 2.83, {
                        densityType: "grade",
                        overview: "High-strength aerospace plate alloy with improved stress-corrosion resistance.",
                        applications: "Aircraft wing skins, fuselage frames, bulkheads and highly stressed structural plate components.",
                        composition: { "Zinc (Zn)": "5.7 - 6.7 %", "Magnesium (Mg)": "1.9 - 2.6 %", "Copper (Cu)": "2.0 - 2.6 %", "Zirconium (Zr)": "0.08 - 0.15 %", "Aluminium (Al)": "Remainder" },
                        features: ["High strength with better SCC resistance", "Optimised for thick plate", "Aerospace structural alloy"],
                        standards: ["AA 7050-T7451", "AMS 4108"]
                    }),
                    g("8011", "AA 8011", 2.70, {
                        densityType: "grade",
                        overview: "Iron-silicon aluminium alloy used mainly for packaging foil.",
                        applications: "Food packaging foil, bottle caps, laminated foil, container foil and household foil products.",
                        composition: { "Iron (Fe)": "0.6 - 1.0 %", "Silicon (Si)": "0.5 - 0.9 %", "Aluminium (Al)": "Remainder" },
                        features: ["Optimised for foil rolling", "Good barrier properties", "Common packaging alloy"],
                        standards: ["AA 8011", "EN AW-8011"]
                    })
                ]
            },

            /* ---------------------------------------------------------------- BRASS */
            {
                key: "brass",
                name: "Brass",
                icon: "gear",
                grades: [
                    g("C22000 Commercial Bronze (90/10)", "UNS C22000", 8.80, {
                        densityType: "grade",
                        overview: "A 90 % copper / 10 % zinc brass with a bronze-looking finish.",
                        applications: "Architectural hardware, decorative fittings, coins, jewellery and deep-drawn components.",
                        composition: { "Copper (Cu)": "89.0 - 91.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.20 %" },
                        features: ["Warm bronze colour", "Good corrosion resistance", "Excellent deep-drawing characteristics"],
                        standards: ["UNS C22000", "ASTM B104"]
                    }),
                    g("C23000 Red Brass (85/15)", "UNS C23000", 8.75, {
                        densityType: "grade",
                        overview: "Reddish brass with good corrosion resistance and machinability.",
                        applications: "Plumbing fittings, radiator components, decorative hardware and general turned parts.",
                        composition: { "Copper (Cu)": "84.0 - 86.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.20 %" },
                        features: ["Good corrosion resistance", "Attractive red-brass colour", "Suitable for plumbing"],
                        standards: ["UNS C23000", "ASTM B135"]
                    }),
                    g("C26000 Cartridge Brass (70/30)", "UNS C26000", 8.50, {
                        densityType: "grade",
                        overview: "The classic 70/30 brass with an excellent combination of strength and ductility.",
                        applications: "Ammunition casings, deep-drawn parts, radiator cores, decorative hardware and pressed components.",
                        composition: { "Copper (Cu)": "68.5 - 71.5 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.07 %" },
                        features: ["Excellent deep-drawing ability", "Good strength and ductility", "Standard cartridge brass"],
                        standards: ["UNS C26000", "ASTM B36"]
                    }),
                    g("C26800 Yellow Brass (66/34)", "UNS C26800", 8.50, {
                        densityType: "grade",
                        overview: "General-purpose yellow brass for forming and machining.",
                        applications: "Sheet and strip fabrications, hardware, fasteners, lamp fittings and formed decorative parts.",
                        composition: { "Copper (Cu)": "64.0 - 68.5 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.15 %" },
                        features: ["Good formability", "General-purpose brass", "Attractive yellow finish"],
                        standards: ["UNS C26800", "ASTM B36"]
                    }),
                    g("C27200 Yellow Brass (63/37)", "UNS C27200", 8.47, {
                        densityType: "grade",
                        overview: "Lower-copper yellow brass used where cost and formability are important.",
                        applications: "General hardware, radiator cores, fasteners, stamped parts and decorative fittings.",
                        composition: { "Copper (Cu)": "62.0 - 65.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.15 %" },
                        features: ["Economical general-purpose grade", "Good cold-working properties", "Suitable for stamping"],
                        standards: ["UNS C27200", "ASTM B36"]
                    }),
                    g("C28000 Muntz Metal (60/40)", "UNS C28000", 8.39, {
                        densityType: "grade",
                        overview: "Alpha-beta brass with higher strength for hot-working and marine use.",
                        applications: "Condenser tubes, ship hull sheathing, architectural panels, hot-forged fittings and valve stems.",
                        composition: { "Copper (Cu)": "59.0 - 63.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.30 %" },
                        features: ["Hot-workable alpha-beta structure", "Good marine corrosion resistance", "Higher strength than alpha brasses"],
                        standards: ["UNS C28000", "ASTM B171"]
                    }),
                    g("C36000 Free-Cutting Brass", "UNS C36000", 8.50, {
                        densityType: "grade",
                        overview: "The benchmark free-machining brass for high-volume turned parts.",
                        applications: "Valve bodies, pipe fittings, gears, screws, nuts, couplings and high-volume machined components.",
                        composition: { "Copper (Cu)": "60.0 - 63.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "2.5 - 3.7 %" },
                        features: ["Excellent machinability", "Lead addition aids chip formation", "Good strength for fittings"],
                        standards: ["UNS C36000", "ASTM B16"]
                    }),
                    g("C46400 Naval Brass", "UNS C46400", 8.41, {
                        densityType: "grade",
                        overview: "Tin-bearing brass with improved resistance to seawater corrosion.",
                        applications: "Marine hardware, propeller shafts, valve stems, condenser tubes and seawater fittings.",
                        composition: { "Copper (Cu)": "59.0 - 62.0 %", "Tin (Sn)": "0.5 - 1.0 %", "Zinc (Zn)": "Remainder", "Lead (Pb)": "≤ 0.20 %" },
                        features: ["Tin improves seawater resistance", "Good strength and toughness", "Standard naval brass"],
                        standards: ["UNS C46400", "ASTM B21"]
                    }),
                    g("C48500 Naval Brass (Leaded)", "UNS C48500", 8.41, {
                        densityType: "grade",
                        overview: "Leaded naval brass combining marine corrosion resistance with machinability.",
                        applications: "Valve stems, pump parts, marine fittings and turned components for seawater service.",
                        composition: { "Copper (Cu)": "59.0 - 62.0 %", "Tin (Sn)": "0.5 - 1.0 %", "Lead (Pb)": "1.3 - 2.2 %", "Zinc (Zn)": "Remainder" },
                        features: ["Improved machinability over C46400", "Marine corrosion resistance", "Suitable for valve components"],
                        standards: ["UNS C48500", "ASTM B21"]
                    }),
                    g("C67500 Manganese Bronze", "UNS C67500", 8.05, {
                        densityType: "grade",
                        overview: "High-strength manganese-bearing brass for heavy-duty mechanical parts.",
                        applications: "Marine shafts, pump rods, valve stems, gears and high-strength forged fittings.",
                        composition: { "Copper (Cu)": "57.0 - 60.0 %", "Manganese (Mn)": "0.8 - 2.0 %", "Tin (Sn)": "0.5 - 1.5 %", "Iron (Fe)": "0.8 - 2.0 %", "Zinc (Zn)": "Remainder" },
                        features: ["High strength and toughness", "Good wear resistance", "Used for heavy-duty marine parts"],
                        standards: ["UNS C67500", "ASTM B138"]
                    }),
                    g("C75200 Nickel Silver (65/18/17)", "UNS C75200", 8.70, {
                        densityType: "grade",
                        overview: "Nickel brass with a silver-white appearance and good corrosion resistance.",
                        applications: "Jewellery, tableware, musical instruments, optical parts and decorative hardware.",
                        composition: { "Copper (Cu)": "63.0 - 66.0 %", "Nickel (Ni)": "16.5 - 19.5 %", "Zinc (Zn)": "Remainder" },
                        features: ["Silver-white appearance", "Good tarnish resistance", "Excellent for decorative applications"],
                        standards: ["UNS C75200", "ASTM B122"]
                    }),
                    g("C77000 Nickel Silver (55/18/27)", "UNS C77000", 8.70, {
                        densityType: "grade",
                        overview: "Higher-zinc nickel silver with good strength and spring properties.",
                        applications: "Spring contacts, musical instrument parts, tableware, optical frames and decorative strip.",
                        composition: { "Copper (Cu)": "53.0 - 57.0 %", "Nickel (Ni)": "16.5 - 19.5 %", "Zinc (Zn)": "Remainder" },
                        features: ["Good spring characteristics", "Attractive silver finish", "Suitable for formed strip parts"],
                        standards: ["UNS C77000", "ASTM B122"]
                    })
                ]
            },

            /* ---------------------------------------------------------------- BRONZE */
            {
                key: "bronze",
                name: "Bronze",
                icon: "cog",
                grades: [
                    g("C51000 Phosphor Bronze (Grade A)", "UNS C51000", 8.80, {
                        densityType: "grade",
                        overview: "Tin-phosphor bronze with excellent spring and fatigue properties.",
                        applications: "Springs, electrical contacts, diaphragms, bellows, precision instrument parts and welded components.",
                        composition: { "Copper (Cu)": "Remainder", "Tin (Sn)": "4.2 - 5.8 %", "Phosphorus (P)": "0.03 - 0.35 %" },
                        features: ["Excellent spring properties", "High fatigue resistance", "Good solderability"],
                        standards: ["UNS C51000", "ASTM B139"]
                    }),
                    g("C52100 Phosphor Bronze (Grade C)", "UNS C52100", 8.80, {
                        densityType: "grade",
                        overview: "Higher-tin phosphor bronze for demanding spring applications.",
                        applications: "Heavy-duty springs, electrical switch parts, precision bearings and instrument components.",
                        composition: { "Copper (Cu)": "Remainder", "Tin (Sn)": "7.0 - 9.0 %", "Phosphorus (P)": "0.03 - 0.35 %" },
                        features: ["Higher strength than C51000", "Excellent spring performance", "Good wear resistance"],
                        standards: ["UNS C52100", "ASTM B103"]
                    }),
                    g("C86100 Manganese Bronze", "UNS C86100", 7.83, {
                        densityType: "grade",
                        overview: "Cast high-strength manganese bronze for heavy-duty marine parts.",
                        applications: "Propeller hubs, pump parts, gears, bearings and high-strength marine castings.",
                        composition: { "Copper (Cu)": "55.0 - 68.0 %", "Manganese (Mn)": "2.5 - 5.0 %", "Aluminium (Al)": "3.0 - 5.5 %", "Iron (Fe)": "2.0 - 4.0 %", "Zinc (Zn)": "Remainder" },
                        features: ["High strength for a cast bronze", "Good marine corrosion resistance", "Used for propeller castings"],
                        standards: ["UNS C86100", "ASTM B505"]
                    }),
                    g("C86300 Manganese Bronze", "UNS C86300", 7.83, {
                        densityType: "grade",
                        overview: "Very hard cast manganese bronze for heavy-load, low-speed bearing service.",
                        applications: "Heavy-duty bearings, gears, cams, hydraulic cylinder parts and press components.",
                        composition: { "Copper (Cu)": "60.0 - 66.0 %", "Manganese (Mn)": "2.5 - 5.0 %", "Aluminium (Al)": "5.0 - 7.5 %", "Iron (Fe)": "2.0 - 4.0 %", "Zinc (Zn)": "Remainder" },
                        features: ["Very high hardness", "Excellent load-carrying capacity", "Used in heavy machinery"],
                        standards: ["UNS C86300", "ASTM B505"]
                    }),
                    g("C90300 Tin Bronze (Gun Metal)", "UNS C90300", 8.80, {
                        densityType: "grade",
                        overview: "Traditional gunmetal with good casting and bearing characteristics.",
                        applications: "Bearings, bushings, pump bodies, valve components and general engineering castings.",
                        composition: { "Copper (Cu)": "86.0 - 89.0 %", "Tin (Sn)": "7.5 - 10.0 %", "Zinc (Zn)": "3.0 - 5.0 %", "Lead (Pb)": "≤ 0.30 %" },
                        features: ["Good castability", "Reliable bearing surface", "Traditional gunmetal grade"],
                        standards: ["UNS C90300", "ASTM B505"]
                    }),
                    g("C90500 Tin Bronze (Gun Metal)", "UNS C90500", 8.80, {
                        densityType: "grade",
                        overview: "Higher-tin gunmetal for pressure-tight castings and bearings.",
                        applications: "Pump castings, valve bodies, bearings, gears and marine fittings.",
                        composition: { "Copper (Cu)": "86.0 - 89.0 %", "Tin (Sn)": "9.0 - 11.0 %", "Zinc (Zn)": "1.0 - 3.0 %", "Lead (Pb)": "≤ 0.30 %" },
                        features: ["Good pressure tightness", "Wear-resistant bearing surface", "Suitable for pump and valve castings"],
                        standards: ["UNS C90500", "ASTM B505"]
                    }),
                    g("C90700 Tin Bronze", "UNS C90700", 8.77, {
                        densityType: "grade",
                        overview: "High-tin bronze with excellent wear resistance for bearings and gears.",
                        applications: "Worm gears, bearings, bushings, pump parts and heavily loaded sliding components.",
                        composition: { "Copper (Cu)": "Remainder", "Tin (Sn)": "10.0 - 12.0 %", "Lead (Pb)": "≤ 0.50 %" },
                        features: ["Excellent wear resistance", "High hardness for a tin bronze", "Used in worm gears"],
                        standards: ["UNS C90700", "ASTM B505"]
                    }),
                    g("C93200 SAE 660 Bearing Bronze", "UNS C93200", 8.80, {
                        densityType: "grade",
                        overview: "The most widely used cast leaded bronze for general bearings.",
                        applications: "Plain bearings, bushings, thrust washers, pump wear parts and machine-tool slideways.",
                        composition: { "Copper (Cu)": "81.0 - 85.0 %", "Tin (Sn)": "6.0 - 8.0 %", "Lead (Pb)": "6.0 - 10.0 %", "Zinc (Zn)": "2.0 - 5.0 %" },
                        features: ["Excellent machinability", "Good bearing and embeddability properties", "Standard SAE 660 bearing bronze"],
                        standards: ["UNS C93200", "SAE J461 660", "ASTM B505"]
                    }),
                    g("C93700 High-Leaded Tin Bronze", "UNS C93700", 8.80, {
                        densityType: "grade",
                        overview: "High-lead bronze designed for high-speed, well-lubricated bearings.",
                        applications: "Automotive bearings, high-speed bushings, pump bearings and dynamically loaded journal bearings.",
                        composition: { "Copper (Cu)": "78.0 - 82.0 %", "Tin (Sn)": "9.0 - 11.0 %", "Lead (Pb)": "8.0 - 11.0 %" },
                        features: ["High lead content for conformability", "Good high-speed bearing performance", "Excellent machinability"],
                        standards: ["UNS C93700", "ASTM B505"]
                    }),
                    g("C95400 Aluminium Bronze", "UNS C95400", 7.45, {
                        densityType: "grade",
                        overview: "Cast aluminium bronze with high strength and excellent corrosion resistance.",
                        applications: "Heavy-duty gears, bearings, marine propellers, pump impellers and chemical plant fittings.",
                        composition: { "Copper (Cu)": "Remainder", "Aluminium (Al)": "10.0 - 11.5 %", "Iron (Fe)": "3.0 - 4.5 %", "Manganese (Mn)": "≤ 0.50 %" },
                        features: ["High strength and hardness", "Excellent seawater corrosion resistance", "Good wear resistance"],
                        standards: ["UNS C95400", "ASTM B505"]
                    }),
                    g("C95500 Nickel Aluminium Bronze", "UNS C95500", 7.53, {
                        densityType: "grade",
                        overview: "Nickel-containing aluminium bronze for severe marine and chemical service.",
                        applications: "Marine propellers, pump casings, valve bodies, gears and offshore components.",
                        composition: { "Copper (Cu)": "Remainder", "Aluminium (Al)": "10.0 - 11.5 %", "Nickel (Ni)": "3.0 - 5.5 %", "Iron (Fe)": "3.0 - 5.5 %" },
                        features: ["Superior seawater resistance", "High strength and toughness", "Resistant to biofouling"],
                        standards: ["UNS C95500", "ASTM B505"]
                    }),
                    g("C95800 Nickel Aluminium Bronze", "UNS C95800", 7.64, {
                        densityType: "grade",
                        overview: "Weldable nickel aluminium bronze widely specified for seawater systems.",
                        applications: "Marine propellers, valve bodies, pump casings, heat exchangers and seawater pipework.",
                        composition: { "Copper (Cu)": "Remainder", "Aluminium (Al)": "8.5 - 9.5 %", "Nickel (Ni)": "4.0 - 5.0 %", "Iron (Fe)": "3.5 - 4.5 %", "Manganese (Mn)": "0.8 - 1.5 %" },
                        features: ["Excellent seawater corrosion resistance", "Good weldability for repairs", "High toughness"],
                        standards: ["UNS C95800", "ASTM B505"]
                    })
                ]
            },

            /* ------------------------------------------------------------ CAST IRON */
            {
                key: "cast-iron",
                name: "Cast Iron",
                icon: "anvil",
                grades: [
                    g("ASTM A48 Class 30 Gray Iron", "ASTM A48", 7.20, {
                        densityType: "grade",
                        overview: "General-purpose grey cast iron with 207 MPa minimum tensile strength.",
                        applications: "Machine bases, engine blocks, pump housings, brake drums, pipes and general castings requiring good machinability.",
                        composition: { "Carbon (C)": "approx. 3.0 - 3.5 % (typical range)", "Silicon (Si)": "approx. 1.0 - 2.5 % (typical range)", "Manganese (Mn)": "approx. 0.4 - 1.0 % (typical range)" },
                        mechanical: { "Tensile strength": "≥ 207 MPa", "Hardness": "170 - 241 HB (typical for class)" },
                        features: ["Excellent vibration damping", "Excellent castability and machinability", "Graphite flakes give the fracture its grey appearance"],
                        standards: ["ASTM A48", "EN-GJL-200 comparable"]
                    }),
                    g("ASTM A48 Class 40 Gray Iron", "ASTM A48", 7.20, {
                        densityType: "grade",
                        overview: "Higher-strength grey cast iron for more heavily loaded castings.",
                        applications: "Machine tool bases, cylinder blocks, flywheels, compression moulds and heavy-duty housings.",
                        composition: { "Carbon (C)": "approx. 3.0 - 3.5 % (typical range)", "Silicon (Si)": "approx. 1.0 - 2.2 % (typical range)" },
                        mechanical: { "Tensile strength": "≥ 276 MPa", "Hardness": "207 - 269 HB (typical for class)" },
                        features: ["Higher strength than Class 30", "Good damping capacity", "Widely used for machine castings"],
                        standards: ["ASTM A48", "EN-GJL-250 comparable"]
                    }),
                    g("ASTM A536 60-40-18 Ductile Iron", "ASTM A536", 7.10, {
                        densityType: "grade",
                        overview: "Ferritic ductile (spheroidal graphite) iron combining castability with ductility.",
                        applications: "Pressure pipes, fittings, pump bodies, valve bodies, crankshafts and automotive suspension parts.",
                        composition: { "Carbon (C)": "approx. 3.2 - 3.6 % (typical range)", "Silicon (Si)": "approx. 2.0 - 2.8 % (typical range)", "Magnesium (Mg)": "small controlled addition for nodulising" },
                        mechanical: { "Tensile strength": "≥ 414 MPa", "Yield strength": "≥ 276 MPa", "Elongation": "≥ 18 %" },
                        features: ["Spheroidal graphite gives ductility", "Good impact resistance", "Widely used for pressure pipe"],
                        standards: ["ASTM A536", "EN-GJS-400-18 comparable"]
                    }),
                    g("ASTM A536 65-45-12 Ductile Iron", "ASTM A536", 7.10, {
                        densityType: "grade",
                        overview: "General-purpose pearlitic-ferritic ductile iron grade.",
                        applications: "Gears, brackets, hubs, pump parts, flywheels and general engineering castings.",
                        composition: { "Carbon (C)": "approx. 3.2 - 3.6 % (typical range)", "Silicon (Si)": "approx. 2.0 - 2.8 % (typical range)" },
                        mechanical: { "Tensile strength": "≥ 448 MPa", "Yield strength": "≥ 310 MPa", "Elongation": "≥ 12 %" },
                        features: ["Good balance of strength and ductility", "Excellent machinability", "Common general ductile grade"],
                        standards: ["ASTM A536", "EN-GJS-450-10 comparable"]
                    }),
                    g("ASTM A536 80-55-06 Ductile Iron", "ASTM A536", 7.10, {
                        densityType: "grade",
                        overview: "Higher-strength pearlitic ductile iron for demanding mechanical parts.",
                        applications: "Crankshafts, camshafts, gears, sprockets and highly stressed automotive castings.",
                        composition: { "Carbon (C)": "approx. 3.2 - 3.6 % (typical range)", "Silicon (Si)": "approx. 2.0 - 2.6 % (typical range)" },
                        mechanical: { "Tensile strength": "≥ 552 MPa", "Yield strength": "≥ 379 MPa", "Elongation": "≥ 6 %" },
                        features: ["High strength and hardness", "Good wear resistance", "Used in crankshafts and gears"],
                        standards: ["ASTM A536", "EN-GJS-600-3 comparable"]
                    }),
                    g("ASTM A47 32510 Malleable Iron", "ASTM A47", 7.30, {
                        densityType: "grade",
                        overview: "Ferritic malleable cast iron with useful ductility and shock resistance.",
                        applications: "Pipe fittings, hand tools, agricultural implements, brackets and hardware subject to shock loads.",
                        composition: { "Carbon (C)": "approx. 2.0 - 2.9 % (typical range)", "Silicon (Si)": "approx. 0.9 - 1.9 % (typical range)" },
                        mechanical: { "Tensile strength": "≥ 345 MPa", "Yield strength": "≥ 224 MPa", "Elongation": "≥ 10 %" },
                        features: ["Malleable by annealing", "Good shock resistance", "Suitable for thin-section castings"],
                        standards: ["ASTM A47", "EN-GJMB comparable"]
                    }),
                    g("ASTM A532 High-Chromium White Iron", "ASTM A532", 7.60, {
                        densityType: "grade",
                        overview: "Abrasion-resistant white cast iron alloyed with chromium and molybdenum.",
                        applications: "Crusher liners, grinding balls, slurry pump parts, chutes and wear plates in mining and cement plant.",
                        composition: { "Chromium (Cr)": "11.0 - 28.0 % (class dependent)", "Carbon (C)": "2.4 - 3.6 % (typical range)", "Molybdenum (Mo)": "up to 3.0 % (class dependent)" },
                        features: ["Exceptional abrasion resistance", "Very hard carbide structure", "Used in mining and mineral processing"],
                        standards: ["ASTM A532"]
                    }),
                    g("Unalloyed White Cast Iron", "Typical white iron", 7.70, {
                        densityType: "family",
                        overview: "Very hard, brittle cast iron in which carbon is present as cementite.",
                        applications: "Wear-resistant liners, crushing surfaces, grinding media and parts where abrasion resistance dominates.",
                        composition: { "Carbon (C)": "approx. 2.0 - 3.5 % (typical range)", "Silicon (Si)": "low, typically < 1.0 %" },
                        features: ["Extremely hard and wear resistant", "Very low ductility", "Difficult to machine"],
                        standards: ["Typical white cast iron (no single governing grade)"]
                    }),
                    g("Compacted Graphite Iron (CGI)", "EN-GJV-450 comparable", 7.10, {
                        densityType: "grade",
                        overview: "Cast iron with worm-like graphite giving strength between grey and ductile iron.",
                        applications: "Diesel engine blocks, cylinder heads, turbocharger housings, brake discs and high-thermal-load components.",
                        composition: { "Carbon (C)": "approx. 3.0 - 3.6 % (typical range)", "Silicon (Si)": "approx. 1.8 - 2.6 % (typical range)" },
                        mechanical: { "Tensile strength": "approx. 450 MPa (typical grade)", "Yield strength": "approx. 315 MPa (typical grade)", "Elongation": "approx. 1 - 2 %" },
                        features: ["Higher strength than grey iron", "Better thermal conductivity than ductile iron", "Used in modern diesel engines"],
                        standards: ["EN-GJV-450 comparable", "ASTM A842 comparable"]
                    }),
                    g("EN-GJL-250 Gray Iron", "EN 1561 EN-GJL-250", 7.20, {
                        densityType: "grade",
                        overview: "European grey cast iron grade with 250 MPa minimum tensile strength.",
                        applications: "Machine beds, housings, flywheels, brake components and general engineering castings.",
                        mechanical: { "Tensile strength": "≥ 250 MPa (test bar)", "Hardness": "approx. 180 - 250 HB (typical)" },
                        features: ["Good damping and machinability", "Standard European grey iron", "Excellent casting characteristics"],
                        standards: ["EN 1561 EN-GJL-250"]
                    }),
                    g("EN-GJS-400-15 Ductile Iron", "EN 1563 EN-GJS-400-15", 7.10, {
                        densityType: "grade",
                        overview: "European ferritic ductile iron with good elongation.",
                        applications: "Pipes, fittings, valve bodies, pump housings and welded or bolted structural castings.",
                        mechanical: { "Tensile strength": "≥ 400 MPa", "Yield strength": "≥ 250 MPa", "Elongation": "≥ 15 %" },
                        features: ["High ductility for cast iron", "Good impact resistance", "Standard European ductile grade"],
                        standards: ["EN 1563 EN-GJS-400-15"]
                    }),
                    g("Ni-Resist Type D-2", "ASTM A436 Type 2", 7.40, {
                        densityType: "grade",
                        overview: "Austenitic nickel cast iron with enhanced corrosion and heat resistance.",
                        applications: "Pump bodies, valve parts, exhaust manifolds, brine-handling equipment and chemical plant castings.",
                        composition: { "Nickel (Ni)": "18.0 - 22.0 % (typical range)", "Chromium (Cr)": "1.5 - 3.0 % (typical range)", "Copper (Cu)": "0.5 - 2.0 % (typical range)" },
                        features: ["Austenitic matrix", "Good corrosion and heat resistance", "Used in chemical and marine castings"],
                        standards: ["ASTM A436 Type 2"]
                    })
                ]
            },

            /* ---------------------------------------------------------------- COPPER */
            {
                key: "copper",
                name: "Copper",
                icon: "bolt",
                grades: [
                    g("C11000 ETP Copper", "UNS C11000", 8.96, {
                        densityType: "grade",
                        overview: "Electrolytic tough-pitch copper and the standard electrical conductor grade.",
                        applications: "Electrical wiring, busbars, transformers, motor windings, plumbing tube and general conductivity applications.",
                        composition: { "Copper (Cu)": "≥ 99.90 % (including silver)", "Oxygen (O)": "controlled, typically 0.02 - 0.05 %" },
                        features: ["Very high electrical conductivity", "Excellent thermal conductivity", "Good formability and solderability"],
                        standards: ["UNS C11000", "ASTM B1", "EN CW008A"]
                    }),
                    g("C10200 Oxygen-Free Copper", "UNS C10200", 8.94, {
                        densityType: "grade",
                        overview: "High-purity oxygen-free copper for demanding electrical and vacuum applications.",
                        applications: "High-conductivity electronics, vacuum tubes, waveguides, welding electrodes and hydrogen-service components.",
                        composition: { "Copper (Cu)": "≥ 99.95 %", "Oxygen (O)": "≤ 0.001 %" },
                        features: ["No oxygen - avoids hydrogen embrittlement", "High conductivity", "Excellent for vacuum and electronics"],
                        standards: ["UNS C10200", "ASTM B170", "EN CW020A"]
                    }),
                    g("C12200 DHP Copper", "UNS C12200", 8.94, {
                        densityType: "grade",
                        overview: "Deoxidised copper with phosphorus, optimised for plumbing and brazing.",
                        applications: "Water tubes, heat exchangers, refrigeration lines, condenser tubes and general plumbing systems.",
                        composition: { "Copper (Cu)": "≥ 99.90 %", "Phosphorus (P)": "0.015 - 0.040 %" },
                        features: ["Excellent brazability and weldability", "Good corrosion resistance in water", "Standard plumbing tube alloy"],
                        standards: ["UNS C12200", "ASTM B75", "EN CW024A"]
                    }),
                    g("C12000 DLP Copper", "UNS C12000", 8.94, {
                        densityType: "grade",
                        overview: "Deoxidised low-phosphorus copper for welded and brazed fabrications.",
                        applications: "Welded pipe, chemical plant piping, heat exchangers and general deoxidised copper fabrications.",
                        composition: { "Copper (Cu)": "≥ 99.90 %", "Phosphorus (P)": "0.004 - 0.012 %" },
                        features: ["Low phosphorus retains high conductivity", "Good welding performance", "Suitable for process piping"],
                        standards: ["UNS C12000", "ASTM B75"]
                    }),
                    g("C13000 PHP Copper", "UNS C13000", 8.94, {
                        densityType: "grade",
                        overview: "Phosphorised copper for high-temperature brazing and welding applications.",
                        applications: "Brazing rod, welded assemblies, radiator cores and high-temperature copper fabrications.",
                        composition: { "Copper (Cu)": "≥ 99.90 %", "Phosphorus (P)": "0.05 - 0.15 %" },
                        features: ["Self-fluxing brazing characteristics", "Good high-temperature performance", "Used in brazing filler applications"],
                        standards: ["UNS C13000"]
                    }),
                    g("C14500 Tellurium Copper", "UNS C14500", 8.94, {
                        densityType: "grade",
                        overview: "Tellurium-bearing copper combining high conductivity with excellent machinability.",
                        applications: "Machined electrical connectors, switchgear contacts, nozzle tips, electrodes and high-volume turned parts.",
                        composition: { "Copper (Cu)": "≥ 99.0 %", "Tellurium (Te)": "0.40 - 0.70 %", "Phosphorus (P)": "0.004 - 0.012 %" },
                        features: ["Excellent machinability", "High electrical conductivity", "Good thermal conductivity"],
                        standards: ["UNS C14500", "ASTM B301"]
                    }),
                    g("C14700 Sulphur Copper", "UNS C14700", 8.94, {
                        densityType: "grade",
                        overview: "Free-machining copper with sulphur additions for automatic machining.",
                        applications: "Screw-machine products, connectors, terminals and high-volume electrical turned components.",
                        composition: { "Copper (Cu)": "≥ 99.8 %", "Sulphur (S)": "0.20 - 0.50 %" },
                        features: ["Free-machining characteristics", "High conductivity retained", "Suitable for automatic lathes"],
                        standards: ["UNS C14700"]
                    }),
                    g("C17200 Beryllium Copper", "UNS C17200", 8.25, {
                        densityType: "grade",
                        overview: "Precipitation-hardenable copper-beryllium alloy with very high strength.",
                        applications: "Non-sparking tools, springs, electrical contacts, connectors, moulds and high-strength precision parts.",
                        composition: { "Beryllium (Be)": "1.8 - 2.0 %", "Cobalt (Co)": "0.20 % minimum", "Copper (Cu)": "Remainder" },
                        mechanical: { "Tensile strength": "approx. 1,400 MPa peak aged (typical)", "Yield strength": "approx. 1,100 MPa peak aged (typical)", "Hardness": "approx. 36 - 42 HRC peak aged" },
                        features: ["Very high strength after ageing", "Non-sparking in hazardous environments", "Excellent fatigue and conductivity combination"],
                        standards: ["UNS C17200", "ASTM B197"]
                    }),
                    g("C18700 Leaded Copper", "UNS C18700", 8.94, {
                        densityType: "grade",
                        overview: "Leaded copper for improved machinability in electrical components.",
                        applications: "Turned electrical contacts, connectors, switch parts and precision screw-machine products.",
                        composition: { "Copper (Cu)": "≥ 99.0 %", "Lead (Pb)": "0.8 - 1.5 %" },
                        features: ["Lead improves machinability", "Good electrical conductivity", "Used for precision turned parts"],
                        standards: ["UNS C18700"]
                    }),
                    g("C19400 Copper-Iron", "UNS C19400", 8.90, {
                        densityType: "grade",
                        overview: "High-strength copper-iron alloy for leadframe and connector strip.",
                        applications: "Integrated-circuit leadframes, connectors, terminals and electronic strip components.",
                        composition: { "Iron (Fe)": "2.1 - 2.6 %", "Phosphorus (P)": "0.015 - 0.15 %", "Zinc (Zn)": "0.05 - 0.20 %", "Copper (Cu)": "Remainder" },
                        features: ["High strength with good conductivity", "Excellent for stamped leadframes", "Good thermal performance"],
                        standards: ["UNS C19400", "ASTM B465"]
                    })
                ]
            },

            /* ------------------------------------------------------------------ ZINC */
            {
                key: "zinc",
                name: "Zinc",
                icon: "droplet",
                grades: [
                    g("Pure Zinc (99.9%)", "ASTM B69 / Zn 99.9", 7.14, {
                        densityType: "grade",
                        overview: "Commercially pure zinc used in sheet, anode and coating applications.",
                        applications: "Sacrificial anodes, battery cans, roofing sheet, galvanising baths and chemical applications.",
                        composition: { "Zinc (Zn)": "≥ 99.9 %" },
                        features: ["Good corrosion protection behaviour", "Low melting point", "Widely used as a coating metal"],
                        standards: ["ASTM B69", "EN 988 Zn 99.9"]
                    }),
                    g("Zamak 2 (Zn-Al-Cu)", "ASTM AG 40A", 6.70, {
                        densityType: "grade",
                        overview: "High-strength die-casting zinc alloy with copper addition.",
                        applications: "Die-cast hardware, automotive parts, appliances and precision mechanical components.",
                        composition: { "Aluminium (Al)": "3.9 - 4.3 %", "Copper (Cu)": "2.5 - 3.0 %", "Magnesium (Mg)": "0.03 - 0.06 %", "Zinc (Zn)": "Remainder" },
                        features: ["Higher strength than Zamak 3", "Good creep resistance", "Excellent die-casting fluidity"],
                        standards: ["ASTM AG 40A", "EN 12844 ZP0410"]
                    }),
                    g("Zamak 3 (Zn-Al)", "ASTM AG 40B", 6.70, {
                        densityType: "grade",
                        overview: "The most widely used zinc die-casting alloy.",
                        applications: "Die-cast brackets, handles, toys, fittings, automotive hardware and general precision castings.",
                        composition: { "Aluminium (Al)": "3.9 - 4.3 %", "Magnesium (Mg)": "0.03 - 0.06 %", "Copper (Cu)": "≤ 0.10 %", "Zinc (Zn)": "Remainder" },
                        features: ["Excellent castability", "Good dimensional stability", "Economical for high-volume die casting"],
                        standards: ["ASTM AG 40B", "EN 12844 ZP0400"]
                    }),
                    g("Zamak 5 (Zn-Al-Cu)", "ASTM AG 40C", 6.70, {
                        densityType: "grade",
                        overview: "Copper-strengthened variant of Zamak 3 for higher hardness.",
                        applications: "Automotive door handles, hardware, appliance parts and die-cast components requiring higher strength.",
                        composition: { "Aluminium (Al)": "3.9 - 4.3 %", "Copper (Cu)": "0.7 - 1.3 %", "Magnesium (Mg)": "0.03 - 0.06 %", "Zinc (Zn)": "Remainder" },
                        features: ["Higher hardness than Zamak 3", "Good castability", "Slightly reduced ductility"],
                        standards: ["ASTM AG 40C", "EN 12844 ZP0401"]
                    }),
                    g("Zamak 7", "ASTM AG 40D", 6.70, {
                        densityType: "grade",
                        overview: "High-purity zinc die-casting alloy with improved fluidity.",
                        applications: "Thin-wall die castings, complex hardware, electronic housings and precision components.",
                        composition: { "Aluminium (Al)": "3.9 - 4.3 %", "Magnesium (Mg)": "0.01 - 0.03 %", "Copper (Cu)": "≤ 0.10 %", "Zinc (Zn)": "Remainder" },
                        features: ["Higher purity improves fluidity", "Reduced susceptibility to intergranular corrosion", "Suitable for thin sections"],
                        standards: ["ASTM AG 40D"]
                    }),
                    g("ZA-8", "ASTM B669 ZA8", 6.30, {
                        densityType: "grade",
                        overview: "High-aluminium zinc casting alloy for gravity and low-pressure casting.",
                        applications: "Bearings, bushings, small castings, hardware and components requiring higher strength than Zamak.",
                        composition: { "Aluminium (Al)": "8.0 - 8.8 %", "Copper (Cu)": "0.8 - 1.8 %", "Magnesium (Mg)": "0.015 - 0.030 %", "Zinc (Zn)": "Remainder" },
                        features: ["Higher strength than Zamak alloys", "Good bearing properties", "Suitable for gravity casting"],
                        standards: ["ASTM B669 ZA8"]
                    }),
                    g("ZA-12", "ASTM B669 ZA12", 6.30, {
                        densityType: "grade",
                        overview: "Medium-aluminium zinc alloy used for castings and continuous casting.",
                        applications: "Bearings, pulleys, gear blanks, pump parts and structural castings.",
                        composition: { "Aluminium (Al)": "11.0 - 13.0 %", "Copper (Cu)": "0.3 - 1.0 %", "Magnesium (Mg)": "0.02 - 0.05 %", "Zinc (Zn)": "Remainder" },
                        features: ["Good strength and hardness", "Excellent machinability", "Used for bearing applications"],
                        standards: ["ASTM B669 ZA12"]
                    }),
                    g("ZA-27", "ASTM B669 ZA27", 6.60, {
                        densityType: "grade",
                        overview: "Highest-strength family of zinc-aluminium casting alloys.",
                        applications: "Heavy-duty bearings, gears, wheels, structural castings and replacement for some bronze parts.",
                        composition: { "Aluminium (Al)": "25.0 - 28.0 %", "Copper (Cu)": "2.0 - 2.8 %", "Magnesium (Mg)": "0.01 - 0.02 %", "Zinc (Zn)": "Remainder" },
                        features: ["Highest strength of ZA alloys", "Good wear resistance", "Can replace some cast bronzes"],
                        standards: ["ASTM B669 ZA27"]
                    }),
                    g("Zn-Cu-Ti Alloy", "EN 988 ZnCu1Ti", 7.15, {
                        densityType: "grade",
                        overview: "Wrought zinc-titanium alloy used for long-life architectural sheet.",
                        applications: "Roofing, flashing, gutters, facades and standing-seam architectural sheet.",
                        composition: { "Copper (Cu)": "0.7 - 1.5 %", "Titanium (Ti)": "0.06 - 0.25 %", "Zinc (Zn)": "Remainder" },
                        features: ["Improved creep resistance", "Good weathering performance", "Long-service-life roofing material"],
                        standards: ["EN 988 ZnCu1Ti"]
                    }),
                    g("Hot-Dip Galvanised Coating", "ASTM A123 / EN ISO 1461", 7.14, {
                        densityType: "family",
                        overview: "Zinc coating applied to steel for sacrificial corrosion protection.",
                        applications: "Corrosion protection for structural steel, fasteners, poles, guardrails, fencing and fabricated steelwork.",
                        features: ["Sacrificial anode protection", "Long maintenance-free service life", "Self-healing at minor coating damage"],
                        standards: ["ASTM A123", "EN ISO 1461"]
                    })
                ]
            },

            /* ------------------------------------------------------------------ LEAD */
            {
                key: "lead",
                name: "Lead",
                icon: "cube",
                grades: [
                    g("Pure Lead (99.9%)", "ASTM B749 / Pb 99.9", 11.34, {
                        densityType: "grade",
                        overview: "Soft, highly malleable lead used where corrosion resistance and density are needed.",
                        applications: "Lead-acid battery plates, radiation shielding, roofing flashings, balance weights and chemical linings.",
                        composition: { "Lead (Pb)": "≥ 99.9 %" },
                        features: ["Excellent radiation attenuation", "Very malleable and corrosion resistant", "Low melting point"],
                        standards: ["ASTM B749", "EN 12659 Pb 99.9"]
                    }),
                    g("Antimonial Lead (Hard Lead)", "ASTM B749 Pb-Sb", 11.20, {
                        densityType: "grade",
                        overview: "Lead-antimony alloy with increased hardness and strength.",
                        applications: "Battery grids, bullets, cable sheathing, chemical pump parts and castings requiring greater hardness.",
                        composition: { "Antimony (Sb)": "approx. 1 - 12 % (application dependent)", "Lead (Pb)": "Remainder" },
                        features: ["Harder than pure lead", "Good casting characteristics", "Used in battery grids and ammunition"],
                        standards: ["ASTM B749 Pb-Sb", "EN 12659 PbSb"]
                    }),
                    g("Lead-Calcium Alloy", "Pb-Ca battery alloy", 11.10, {
                        densityType: "grade",
                        overview: "Low-gassing lead alloy used in modern valve-regulated batteries.",
                        applications: "Maintenance-free battery grids, standby power batteries and low-water-loss accumulator plates.",
                        composition: { "Calcium (Ca)": "approx. 0.03 - 0.15 %", "Tin (Sn)": "optional small addition", "Lead (Pb)": "Remainder" },
                        features: ["Low gassing and water loss", "Good mechanical strength for grids", "Used in maintenance-free batteries"],
                        standards: ["Typical Pb-Ca battery alloy composition"]
                    }),
                    g("Lead-Calcium-Tin Alloy", "Pb-Ca-Sn battery alloy", 11.10, {
                        densityType: "grade",
                        overview: "Tin-modified lead-calcium alloy with improved corrosion resistance.",
                        applications: "Battery grids for deep-cycle and automotive batteries, valve-regulated lead-acid plates.",
                        composition: { "Calcium (Ca)": "approx. 0.03 - 0.12 %", "Tin (Sn)": "approx. 0.2 - 1.5 %", "Lead (Pb)": "Remainder" },
                        features: ["Improved grid corrosion resistance", "Good creep strength", "Used in long-life batteries"],
                        standards: ["Typical Pb-Ca-Sn battery alloy composition"]
                    }),
                    g("63/37 Tin-Lead Solder", "Sn63Pb37 / AMS-K-18", 8.40, {
                        densityType: "grade",
                        overview: "Eutectic solder with a single melting point and excellent wetting.",
                        applications: "Electronics assembly, printed circuit board joints, electrical connections and low-temperature soldering.",
                        composition: { "Tin (Sn)": "63 %", "Lead (Pb)": "37 %" },
                        features: ["Eutectic melting at about 183 °C", "Excellent wetting", "Traditional electronics solder"],
                        standards: ["Sn63Pb37", "AMS-K-18"]
                    }),
                    g("60/40 Tin-Lead Solder", "Sn60Pb40", 8.67, {
                        densityType: "grade",
                        overview: "General-purpose tin-lead solder with a slightly wider melting range.",
                        applications: "Electronics soldering, electrical joints, plumbing and general low-temperature joining.",
                        composition: { "Tin (Sn)": "60 %", "Lead (Pb)": "40 %" },
                        features: ["Good wetting and flow", "Wide temperature range in pasty state", "General-purpose solder"],
                        standards: ["Sn60Pb40"]
                    }),
                    g("Lead-Silver Battery Alloy", "Pb-Ag alloy", 11.20, {
                        densityType: "grade",
                        overview: "Silver-bearing lead alloy used for high-performance battery plates.",
                        applications: "Positive battery grids, industrial storage batteries and high-reliability power systems.",
                        composition: { "Silver (Ag)": "approx. 0.3 - 1.0 %", "Lead (Pb)": "Remainder" },
                        features: ["Improved grid corrosion resistance", "Good creep strength", "Used in industrial batteries"],
                        standards: ["Typical Pb-Ag battery alloy composition"]
                    }),
                    g("Lead-Antimony-Arsenic Cable Sheath", "Pb-Sb-As alloy", 11.20, {
                        densityType: "grade",
                        overview: "Lead alloy developed for durable, extruded cable sheathing.",
                        applications: "Underground power cable sheaths, communication cable sheathing and chemical-resistant linings.",
                        composition: { "Antimony (Sb)": "approx. 0.2 - 1.0 %", "Arsenic (As)": "small controlled addition", "Lead (Pb)": "Remainder" },
                        features: ["Good extrusion characteristics", "Improved fatigue resistance", "Long-term corrosion protection"],
                        standards: ["Typical Pb-Sb-As cable sheath alloy"]
                    })
                ]
            },

            /* ------------------------------------------------------------------- TIN */
            {
                key: "tin",
                name: "Tin",
                icon: "can",
                grades: [
                    g("Pure Tin (99.9%)", "ASTM B339 / Sn 99.9", 7.31, {
                        densityType: "grade",
                        overview: "Soft, corrosion-resistant metal used mainly as a coating and in solders.",
                        applications: "Food can coatings, tinplate, solder, protective plating on steel and electronic component finishes.",
                        composition: { "Tin (Sn)": "≥ 99.9 %" },
                        features: ["Excellent corrosion resistance", "Non-toxic for food contact", "Good solderability"],
                        standards: ["ASTM B339", "EN 12660 Sn 99.9"]
                    }),
                    g("Pewter (Sn-Sb-Cu)", "Typical pewter alloy", 7.30, {
                        densityType: "grade",
                        overview: "Tin-rich alloy traditionally used for decorative and tableware castings.",
                        applications: "Tableware, tankards, decorative castings, jewellery and commemorative items.",
                        composition: { "Tin (Sn)": "≥ 90 % (typical)", "Antimony (Sb)": "approx. 5 - 8 %", "Copper (Cu)": "approx. 1 - 3 %" },
                        features: ["Attractive dull-silver finish", "Good castability at low temperature", "Traditional decorative alloy"],
                        standards: ["Typical lead-free pewter composition"]
                    }),
                    g("63/37 Tin-Lead Solder", "Sn63Pb37", 8.40, {
                        densityType: "grade",
                        overview: "Eutectic tin-lead solder with the lowest melting point of the Sn-Pb system.",
                        applications: "Electronics assembly, circuit board joints, electrical connections and precision low-temperature soldering.",
                        composition: { "Tin (Sn)": "63 %", "Lead (Pb)": "37 %" },
                        features: ["Eutectic melting near 183 °C", "Excellent wetting", "Standard electronics solder"],
                        standards: ["Sn63Pb37", "AMS-K-18"]
                    }),
                    g("60/40 Tin-Lead Solder", "Sn60Pb40", 8.67, {
                        densityType: "grade",
                        overview: "General-purpose tin-lead solder for electronics and plumbing.",
                        applications: "Electrical soldering, electronics joints, plumbing fittings and general low-temperature joining.",
                        composition: { "Tin (Sn)": "60 %", "Lead (Pb)": "40 %" },
                        features: ["Good flow and wetting", "Economical general-purpose solder", "Wide operating history"],
                        standards: ["Sn60Pb40"]
                    }),
                    g("SAC305 (Sn-Ag-Cu)", "Sn96.5Ag3.0Cu0.5", 7.40, {
                        densityType: "grade",
                        overview: "The most widely used lead-free solder alloy in electronics assembly.",
                        applications: "Lead-free circuit board assembly, surface-mount soldering, rework and general electronic interconnects.",
                        composition: { "Tin (Sn)": "96.5 %", "Silver (Ag)": "3.0 %", "Copper (Cu)": "0.5 %" },
                        features: ["Lead-free and RoHS compliant", "Good mechanical strength", "Melting range around 217 - 220 °C"],
                        standards: ["Sn96.5Ag3.0Cu0.5", "IPC J-STD-006"]
                    }),
                    g("Tinplate Coating", "EN 10202 / ASTM A624", 7.31, {
                        densityType: "grade",
                        overview: "Thin tin coating applied to steel sheet for food packaging.",
                        applications: "Food and beverage cans, closures, trays, container stock and general corrosion-resistant packaging.",
                        features: ["Food-safe protective coating", "Excellent paint and print adhesion", "Provides sacrificial protection to steel"],
                        standards: ["EN 10202", "ASTM A624"]
                    }),
                    g("Tin Bronze (CuSn)", "UNS C51000 / C90700 family", 8.80, {
                        densityType: "grade",
                        overview: "Copper-tin alloys where tin is the principal alloying addition to copper.",
                        applications: "Bearings, bushings, springs, pump parts and castings requiring a hard, wear-resistant tin-rich surface.",
                        composition: { "Copper (Cu)": "Remainder", "Tin (Sn)": "approx. 4 - 12 % (grade dependent)" },
                        features: ["Good wear resistance", "Excellent spring and bearing properties", "Widely used in bronze castings"],
                        standards: ["UNS C51000", "UNS C90700"]
                    }),
                    g("Tin-Based Babbitt", "ASTM B23 Grade 2", 7.30, {
                        densityType: "grade",
                        overview: "Tin-rich white metal bearing alloy with excellent embeddability.",
                        applications: "Plain bearings, journal bearings, turbine bearings and lightly loaded high-speed bearing linings.",
                        composition: { "Tin (Sn)": "Remainder", "Antimony (Sb)": "approx. 7 - 9 %", "Copper (Cu)": "approx. 3 - 5 %" },
                        features: ["Excellent embeddability and conformability", "Good seizure resistance", "Low melting point bearing alloy"],
                        standards: ["ASTM B23 Grade 2"]
                    })
                ]
            },

            /* ------------------------------------------------------------- TITANIUM */
            {
                key: "titanium",
                name: "Titanium",
                icon: "aircraft",
                grades: [
                    g("Grade 1 (CP Titanium)", "ASTM B265 Gr 1", 4.51, {
                        densityType: "grade",
                        overview: "The softest and most formable commercially pure titanium grade.",
                        applications: "Sheet and tube fabrications, chemical plant, marine hardware, jewellery and deeply drawn components.",
                        composition: { "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.18 %", "Iron (Fe)": "≤ 0.20 %" },
                        mechanical: { "Tensile strength": "≥ 240 MPa", "Yield strength": "≥ 170 MPa", "Elongation": "≥ 24 %" },
                        features: ["Highest ductility of CP grades", "Excellent corrosion resistance", "Easily cold formed"],
                        standards: ["ASTM B265 Gr 1", "ASME SB-265", "EN 10088-2 comparable"]
                    }),
                    g("Grade 2 (CP Titanium)", "ASTM B265 Gr 2", 4.51, {
                        densityType: "grade",
                        overview: "The most widely used commercially pure titanium grade.",
                        applications: "Chemical processing equipment, marine hardware, heat exchanger tubing, piping and architectural applications.",
                        composition: { "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.25 %", "Iron (Fe)": "≤ 0.30 %" },
                        mechanical: { "Tensile strength": "≥ 345 MPa", "Yield strength": "≥ 275 MPa", "Elongation": "≥ 20 %" },
                        features: ["Excellent corrosion resistance", "Good balance of strength and formability", "Standard CP titanium grade"],
                        standards: ["ASTM B265 Gr 2", "ASME SB-265"]
                    }),
                    g("Grade 3 (CP Titanium)", "ASTM B265 Gr 3", 4.51, {
                        densityType: "grade",
                        overview: "Higher-strength commercially pure titanium for moderate-load parts.",
                        applications: "Pressure vessels, piping, marine components and structural parts requiring higher strength than Grade 2.",
                        composition: { "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.35 %", "Iron (Fe)": "≤ 0.30 %" },
                        mechanical: { "Tensile strength": "≥ 450 MPa", "Yield strength": "≥ 380 MPa", "Elongation": "≥ 18 %" },
                        features: ["Higher strength than Grade 2", "Good corrosion resistance", "Moderate formability"],
                        standards: ["ASTM B265 Gr 3"]
                    }),
                    g("Grade 4 (CP Titanium)", "ASTM B265 Gr 4", 4.51, {
                        densityType: "grade",
                        overview: "The strongest commercially pure titanium grade.",
                        applications: "High-strength corrosion-resistant components, fasteners, marine parts and surgical applications.",
                        composition: { "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.40 %", "Iron (Fe)": "≤ 0.50 %" },
                        mechanical: { "Tensile strength": "≥ 550 MPa", "Yield strength": "≥ 483 MPa", "Elongation": "≥ 15 %" },
                        features: ["Highest CP titanium strength", "Good corrosion resistance", "Reduced formability compared with Grade 1"],
                        standards: ["ASTM B265 Gr 4"]
                    }),
                    g("Grade 5 (Ti-6Al-4V)", "ASTM B265 Gr 5", 4.43, {
                        densityType: "grade",
                        overview: "The most widely used alpha-beta titanium alloy, combining high strength with low density.",
                        applications: "Aircraft structures, engine components, medical implants, sporting goods and high-performance fasteners.",
                        composition: { "Aluminium (Al)": "5.5 - 6.75 %", "Vanadium (V)": "3.5 - 4.5 %", "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.20 %" },
                        mechanical: { "Tensile strength": "≥ 895 MPa", "Yield strength": "≥ 825 MPa", "Elongation": "≥ 10 %" },
                        features: ["Very high strength-to-weight ratio", "Good fatigue resistance", "Widely used in aerospace and medical implants"],
                        standards: ["ASTM B265 Gr 5", "AMS 4911", "EN 10088-2 comparable"]
                    }),
                    g("Grade 6 (Ti-5Al-2.5Sn)", "ASTM B265 Gr 6", 4.55, {
                        densityType: "grade",
                        overview: "Alpha titanium alloy with good high-temperature stability and weldability.",
                        applications: "Jet engine compressor cases, high-temperature airframe parts, chemical equipment and cryogenic vessels.",
                        composition: { "Aluminium (Al)": "4.5 - 5.5 %", "Tin (Sn)": "2.0 - 3.0 %", "Titanium (Ti)": "Remainder" },
                        features: ["Good elevated-temperature strength", "Weldable alpha alloy", "Used in aerospace engines"],
                        standards: ["ASTM B265 Gr 6"]
                    }),
                    g("Grade 7 (Ti-0.2Pd)", "ASTM B265 Gr 7", 4.51, {
                        densityType: "grade",
                        overview: "Palladium-enhanced CP titanium with superior resistance to reducing acids.",
                        applications: "Chemical reactors, heat exchangers, pickling equipment and severely corrosive process environments.",
                        composition: { "Palladium (Pd)": "0.12 - 0.25 %", "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.25 %" },
                        features: ["Excellent resistance to reducing acids", "Same base strength as Grade 2", "Used in aggressive chemical plant"],
                        standards: ["ASTM B265 Gr 7"]
                    }),
                    g("Grade 9 (Ti-3Al-2.5V)", "ASTM B265 Gr 9", 4.48, {
                        densityType: "grade",
                        overview: "Near-alpha alloy with better strength than CP titanium and good cold formability.",
                        applications: "Aircraft hydraulic tubing, bicycle frames, sporting equipment and welded tubular structures.",
                        composition: { "Aluminium (Al)": "2.5 - 3.5 %", "Vanadium (V)": "2.0 - 3.0 %", "Titanium (Ti)": "Remainder" },
                        features: ["Good cold formability", "Higher strength than CP grades", "Excellent for tubing"],
                        standards: ["ASTM B265 Gr 9", "AMS 4943"]
                    }),
                    g("Grade 11 (Ti-0.2Pd ELI)", "ASTM B265 Gr 11", 4.51, {
                        densityType: "grade",
                        overview: "Extra-low-interstitial palladium titanium with enhanced ductility.",
                        applications: "Deep-drawn corrosion-resistant parts, chemical process equipment and medical devices.",
                        composition: { "Palladium (Pd)": "0.12 - 0.25 %", "Titanium (Ti)": "Remainder", "Oxygen (O)": "≤ 0.18 %" },
                        features: ["Extra-low interstitial content", "Improved formability over Grade 7", "Strong corrosion resistance"],
                        standards: ["ASTM B265 Gr 11"]
                    }),
                    g("Grade 12 (Ti-0.3Mo-0.8Ni)", "ASTM B265 Gr 12", 4.54, {
                        densityType: "grade",
                        overview: "Molybdenum-nickel titanium alloy with improved crevice corrosion resistance.",
                        applications: "Chemical vessels, heat exchangers, brine handling equipment and downhole components.",
                        composition: { "Molybdenum (Mo)": "0.2 - 0.4 %", "Nickel (Ni)": "0.6 - 0.9 %", "Titanium (Ti)": "Remainder" },
                        features: ["Improved crevice corrosion resistance", "Better strength than Grade 2", "Used in hot chloride service"],
                        standards: ["ASTM B265 Gr 12"]
                    }),
                    g("Grade 23 (Ti-6Al-4V ELI)", "ASTM F136 / B265 Gr 23", 4.43, {
                        densityType: "grade",
                        overview: "Extra-low-interstitial version of Grade 5 for medical and cryogenic use.",
                        applications: "Surgical implants, dental fixtures, fracture fixation devices and cryogenic vessels.",
                        composition: { "Aluminium (Al)": "5.5 - 6.5 %", "Vanadium (V)": "3.5 - 4.5 %", "Oxygen (O)": "≤ 0.13 %", "Titanium (Ti)": "Remainder" },
                        mechanical: { "Tensile strength": "≥ 860 MPa", "Yield strength": "≥ 790 MPa", "Elongation": "≥ 10 %" },
                        features: ["Improved ductility and fracture toughness", "Biocompatible implant grade", "Low interstitial content"],
                        standards: ["ASTM F136", "ASTM B265 Gr 23", "ISO 5832-3"]
                    })
                ]
            },

            /* -------------------------------------------------------------- NICKEL */
            {
                key: "nickel",
                name: "Nickel",
                icon: "hex",
                grades: [
                    g("Nickel 200 (UNS N02200)", "ASTM B162", 8.89, {
                        densityType: "grade",
                        overview: "Commercially pure wrought nickel with excellent corrosion resistance.",
                        applications: "Chemical vessels, food-processing equipment, electrical contacts, caustic handling and alkaline batteries.",
                        composition: { "Nickel (Ni)": "≥ 99.0 % (including cobalt)", "Carbon (C)": "≤ 0.15 %", "Iron (Fe)": "≤ 0.40 %", "Copper (Cu)": "≤ 0.25 %" },
                        mechanical: { "Tensile strength": "≥ 380 MPa (annealed)", "Yield strength": "≥ 105 MPa (annealed)", "Elongation": "≥ 40 % (annealed)" },
                        features: ["Excellent resistance to caustic alkalis", "Good thermal and electrical conductivity", "Magnetic at room temperature"],
                        standards: ["ASTM B162", "ASME SB-162", "DIN 17740 Ni 99.2"]
                    }),
                    g("Nickel 201 (UNS N02201)", "ASTM B162", 8.89, {
                        densityType: "grade",
                        overview: "Low-carbon version of Nickel 200 for elevated-temperature service.",
                        applications: "Caustic evaporators, high-temperature chemical vessels, electronics and components above 315 °C.",
                        composition: { "Nickel (Ni)": "≥ 99.0 %", "Carbon (C)": "≤ 0.02 %", "Iron (Fe)": "≤ 0.40 %", "Copper (Cu)": "≤ 0.25 %" },
                        mechanical: { "Tensile strength": "≥ 345 MPa (annealed)", "Yield strength": "≥ 100 MPa (annealed)", "Elongation": "≥ 40 % (annealed)" },
                        features: ["Low carbon avoids graphitisation", "Suitable above 315 °C", "Excellent caustic resistance"],
                        standards: ["ASTM B162", "ASME SB-162", "DIN 17740 Ni 99.0"]
                    }),
                    g("Nickel 205 (UNS N02205)", "ASTM B162", 8.89, {
                        densityType: "grade",
                        overview: "High-carbon nickel grade with increased strength for electronic applications.",
                        applications: "Electronics leads, battery components, spark electrodes and high-strength nickel stampings.",
                        composition: { "Nickel (Ni)": "≥ 99.0 %", "Carbon (C)": "approx. 0.20 - 0.50 %" },
                        features: ["Higher strength than Nickel 200", "Used in electronic lead frames", "Good corrosion resistance"],
                        standards: ["ASTM B162", "UNS N02205"]
                    }),
                    g("Nickel 270 (UNS N02270)", "ASTM B162", 8.89, {
                        densityType: "grade",
                        overview: "Very high-purity nickel with superior magnetic and corrosion properties.",
                        applications: "Electronic components, magnetic shielding, chemical laboratory equipment and high-purity fabrications.",
                        composition: { "Nickel (Ni)": "≥ 99.9 %", "Carbon (C)": "≤ 0.02 %", "Iron (Fe)": "≤ 0.05 %", "Copper (Cu)": "≤ 0.01 %" },
                        features: ["Very high purity", "Enhanced magnetic permeability", "Excellent corrosion resistance"],
                        standards: ["ASTM B162", "UNS N02270"]
                    })
                ]
            },

            /* ----------------------------------------------------------- MAGNESIUM */
            {
                key: "magnesium",
                name: "Magnesium",
                icon: "leaf",
                grades: [
                    g("Pure Magnesium", "ASTM B93 / Mg 99.8", 1.74, {
                        densityType: "grade",
                        overview: "The lightest structural metal, used where minimum mass is critical.",
                        applications: "Alloying element, sacrificial anodes, pyrotechnics, flares and lightweight prototype components.",
                        composition: { "Magnesium (Mg)": "≥ 99.8 %" },
                        features: ["Lowest density of structural metals", "Excellent machinability", "Highly reactive - careful handling required"],
                        standards: ["ASTM B93", "EN 12438 Mg 99.8"]
                    }),
                    g("AZ31B", "ASTM B90 AZ31B", 1.77, {
                        densityType: "grade",
                        overview: "The most common wrought magnesium alloy for sheet and extrusions.",
                        applications: "Laptop housings, camera bodies, bicycle parts, luggage frames and lightweight structural sheet.",
                        composition: { "Aluminium (Al)": "2.5 - 3.5 %", "Zinc (Zn)": "0.6 - 1.4 %", "Manganese (Mn)": "≥ 0.20 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Good formability for a magnesium alloy", "Excellent strength-to-weight ratio", "Widely available as sheet and plate"],
                        standards: ["ASTM B90", "EN 10088-2 comparable"]
                    }),
                    g("AZ61A", "ASTM B107 AZ61A", 1.80, {
                        densityType: "grade",
                        overview: "Higher-strength wrought magnesium extrusion alloy.",
                        applications: "Extruded profiles, structural frames, sporting equipment and lightweight transport components.",
                        composition: { "Aluminium (Al)": "5.8 - 7.2 %", "Zinc (Zn)": "0.4 - 1.5 %", "Manganese (Mn)": "≥ 0.15 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Higher strength than AZ31", "Good extrusion characteristics", "Used in lightweight structures"],
                        standards: ["ASTM B107"]
                    }),
                    g("AZ91D", "ASTM B94 AZ91D", 1.81, {
                        densityType: "grade",
                        overview: "The most widely used die-cast magnesium alloy.",
                        applications: "Automotive parts, power-tool housings, camera bodies, laptop casings and portable equipment frames.",
                        composition: { "Aluminium (Al)": "8.3 - 9.7 %", "Zinc (Zn)": "0.35 - 1.0 %", "Manganese (Mn)": "≥ 0.15 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Excellent die-casting fluidity", "High strength for a cast magnesium alloy", "Good corrosion resistance for Mg alloys"],
                        standards: ["ASTM B94", "EN 1753 MgAl9Zn1"]
                    }),
                    g("AM60B", "ASTM B94 AM60B", 1.80, {
                        densityType: "grade",
                        overview: "Cast magnesium alloy with improved ductility and impact resistance.",
                        applications: "Automotive dashboards, steering wheels, seats, safety components and impact-resistant castings.",
                        composition: { "Aluminium (Al)": "5.5 - 6.5 %", "Manganese (Mn)": "≥ 0.25 %", "Zinc (Zn)": "≤ 0.22 %", "Magnesium (Mg)": "Remainder" },
                        features: ["High ductility for magnesium", "Good energy absorption", "Used in automotive safety parts"],
                        standards: ["ASTM B94", "EN 1753 MgAl6Mn"]
                    }),
                    g("AS41B", "ASTM B94 AS41B", 1.79, {
                        densityType: "grade",
                        overview: "Creep-resistant magnesium die-casting alloy with silicon.",
                        applications: "Automotive transmission housings, engine covers and components exposed to moderately elevated temperatures.",
                        composition: { "Aluminium (Al)": "3.5 - 5.0 %", "Silicon (Si)": "0.5 - 1.5 %", "Manganese (Mn)": "≥ 0.35 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Improved creep resistance", "Good die-casting properties", "Used in automotive powertrain parts"],
                        standards: ["ASTM B94", "EN 1753 MgAl4Si"]
                    }),
                    g("ZK60A", "ASTM B107 ZK60A", 1.83, {
                        densityType: "grade",
                        overview: "High-strength wrought magnesium-zinc-zirconium alloy.",
                        applications: "High-performance sporting equipment, bicycle parts, aerospace components and high-strength extrusions.",
                        composition: { "Zinc (Zn)": "4.8 - 6.2 %", "Zirconium (Zr)": "≥ 0.45 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Highest strength among common wrought Mg alloys", "Good extrusion response", "Used in performance applications"],
                        standards: ["ASTM B107"]
                    }),
                    g("WE43", "ASTM B96 WE43", 1.84, {
                        densityType: "grade",
                        overview: "Rare-earth-containing magnesium alloy with excellent high-temperature strength.",
                        applications: "Aerospace structural castings, helicopter gearboxes, racing components and high-temperature lightweight parts.",
                        composition: { "Yttrium (Y)": "3.7 - 4.3 %", "Rare earths (RE)": "2.0 - 3.0 %", "Zirconium (Zr)": "≥ 0.4 %", "Magnesium (Mg)": "Remainder" },
                        features: ["Excellent elevated-temperature properties", "Good creep resistance", "Premium aerospace magnesium alloy"],
                        standards: ["ASTM B96", "AMS 4427"]
                    })
                ]
            },

            /* ------------------------------------------------------------- INCONEL */
            {
                key: "inconel-625",
                name: "Inconel",
                icon: "flame",
                grades: [
                    g("Inconel 600", "UNS N06600", 8.47, {
                        densityType: "grade",
                        overview: "Nickel-chromium alloy with good oxidation resistance and high-temperature strength.",
                        applications: "Furnace components, heat exchangers, nuclear steam generator tubing, chemical plant and food processing equipment.",
                        composition: { "Nickel (Ni)": "≥ 72.0 %", "Chromium (Cr)": "14.0 - 17.0 %", "Iron (Fe)": "6.0 - 10.0 %", "Carbon (C)": "≤ 0.15 %" },
                        features: ["Good high-temperature oxidation resistance", "Resistant to many corrosive media", "Widely used in nuclear and heat-treatment plant"],
                        standards: ["UNS N06600", "ASTM B163", "ASME SB-163"]
                    }),
                    g("Inconel 601", "UNS N06601", 8.10, {
                        densityType: "grade",
                        overview: "Aluminium-added nickel-chromium alloy with outstanding high-temperature oxidation resistance.",
                        applications: "Furnace muffles, radiant tubes, heat-treatment baskets, gas turbine parts and pollution-control equipment.",
                        composition: { "Nickel (Ni)": "58.0 - 63.0 %", "Chromium (Cr)": "21.0 - 25.0 %", "Aluminium (Al)": "1.0 - 1.7 %", "Iron (Fe)": "Remainder" },
                        features: ["Excellent resistance to oxidation at high temperature", "Good carburisation resistance", "Used in furnace and heat-treatment equipment"],
                        standards: ["UNS N06601", "ASTM B167"]
                    }),
                    g("Inconel 617", "UNS N06617", 8.30, {
                        densityType: "grade",
                        overview: "Nickel-cobalt-chromium-molybdenum alloy for very high-temperature service.",
                        applications: "Gas turbine combustors, industrial furnace components, chemical plant piping and nuclear systems.",
                        composition: { "Nickel (Ni)": "Remainder", "Chromium (Cr)": "20.0 - 24.0 %", "Cobalt (Co)": "10.0 - 15.0 %", "Molybdenum (Mo)": "8.0 - 10.0 %", "Aluminium (Al)": "0.8 - 1.5 %" },
                        features: ["Excellent high-temperature strength", "Good oxidation and carburisation resistance", "Used in advanced power systems"],
                        standards: ["UNS N06617", "ASTM B166"]
                    }),
                    g("Inconel 625", "UNS N06625", 8.44, {
                        densityType: "grade",
                        overview: "Niobium-stabilised nickel-chromium-molybdenum alloy with exceptional corrosion and fatigue performance.",
                        applications: "Marine piping, chemical reactors, aircraft exhaust systems, offshore risers, seawater components and nuclear equipment.",
                        composition: { "Nickel (Ni)": "Remainder", "Chromium (Cr)": "20.0 - 23.0 %", "Molybdenum (Mo)": "8.0 - 10.0 %", "Niobium (Nb)": "3.15 - 4.15 %", "Iron (Fe)": "≤ 5.0 %" },
                        mechanical: { "Tensile strength": "≥ 830 MPa (annealed)", "Yield strength": "≥ 410 MPa (annealed)", "Elongation": "≥ 30 % (annealed)" },
                        features: ["Excellent pitting and crevice corrosion resistance", "High fatigue strength", "Good weldability"],
                        standards: ["UNS N06625", "ASTM B443", "ASME SB-443"]
                    }),
                    g("Inconel 690", "UNS N06690", 8.19, {
                        densityType: "grade",
                        overview: "High-chromium nickel alloy developed for stress-corrosion cracking resistance.",
                        applications: "Nuclear steam generator tubing, chemical processing, waste incineration and high-temperature water systems.",
                        composition: { "Nickel (Ni)": "≥ 58.0 %", "Chromium (Cr)": "27.0 - 31.0 %", "Iron (Fe)": "7.0 - 11.0 %", "Carbon (C)": "≤ 0.05 %" },
                        features: ["Excellent resistance to stress-corrosion cracking", "High chromium content", "Standard nuclear steam generator alloy"],
                        standards: ["UNS N06690", "ASTM B163"]
                    }),
                    g("Inconel 718", "UNS N07718", 8.19, {
                        densityType: "grade",
                        overview: "Precipitation-hardened nickel alloy combining high strength with good weldability.",
                        applications: "Jet engine discs and blades, gas turbine parts, rocket engines, high-strength fasteners and oil-well components.",
                        composition: { "Nickel (Ni)": "50.0 - 55.0 %", "Chromium (Cr)": "17.0 - 21.0 %", "Iron (Fe)": "Remainder", "Niobium (Nb)": "4.75 - 5.50 %", "Molybdenum (Mo)": "2.80 - 3.30 %" },
                        mechanical: { "Tensile strength": "approx. 1,270 MPa (age hardened)", "Yield strength": "approx. 1,040 MPa (age hardened)", "Elongation": "approx. 12 % (age hardened)" },
                        features: ["High strength up to about 650 °C", "Good creep and fatigue resistance", "Widely used in aerospace engines"],
                        standards: ["UNS N07718", "AMS 5662", "ASTM B637"]
                    }),
                    g("Inconel 725", "UNS N07725", 8.37, {
                        densityType: "grade",
                        overview: "Age-hardenable nickel alloy with high strength and excellent seawater corrosion resistance.",
                        applications: "Offshore platform components, seawater fasteners, pump shafts, riser hardware and subsea equipment.",
                        composition: { "Nickel (Ni)": "Remainder", "Chromium (Cr)": "19.0 - 22.5 %", "Molybdenum (Mo)": "7.0 - 9.5 %", "Niobium (Nb)": "2.75 - 4.0 %", "Titanium (Ti)": "1.0 - 1.7 %" },
                        features: ["Very high strength after ageing", "Excellent seawater corrosion resistance", "Used for subsea and offshore hardware"],
                        standards: ["UNS N07725", "ASTM B805"]
                    }),
                    g("Inconel 800", "UNS N08800", 7.94, {
                        densityType: "grade",
                        overview: "Iron-nickel-chromium alloy for high-temperature and carburising environments.",
                        applications: "Furnace components, heat exchangers, petrochemical piping, radiant tubes and nuclear steam generator tubing.",
                        composition: { "Nickel (Ni)": "30.0 - 35.0 %", "Chromium (Cr)": "19.0 - 23.0 %", "Iron (Fe)": "≥ 39.5 %", "Aluminium (Al)": "0.15 - 0.60 %", "Titanium (Ti)": "0.15 - 0.60 %" },
                        features: ["Good high-temperature strength", "Resistant to carburisation and oxidation", "Cost-effective heat-resistant alloy"],
                        standards: ["UNS N08800", "ASTM B163", "ASME SB-163"]
                    }),
                    g("Inconel 825", "UNS N08825", 8.14, {
                        densityType: "grade",
                        overview: "Corrosion-resistant iron-nickel-chromium-molybdenum alloy for aggressive acids.",
                        applications: "Sulphuric and phosphoric acid plant, pollution-control equipment, oil and gas piping and nuclear fuel reprocessing.",
                        composition: { "Nickel (Ni)": "38.0 - 46.0 %", "Chromium (Cr)": "19.5 - 23.5 %", "Iron (Fe)": "Remainder", "Molybdenum (Mo)": "2.5 - 3.5 %", "Copper (Cu)": "1.5 - 3.0 %" },
                        features: ["Excellent resistance to reducing acids", "Good stress-corrosion cracking resistance", "Used in chemical and oil-field service"],
                        standards: ["UNS N08825", "ASTM B163", "ASME SB-163"]
                    }),
                    g("Inconel X-750", "UNS N07750", 8.28, {
                        densityType: "grade",
                        overview: "Precipitation-hardened nickel-chromium alloy with good high-temperature strength.",
                        applications: "Gas turbine components, springs, fasteners, nuclear reactor parts and high-temperature structural hardware.",
                        composition: { "Nickel (Ni)": "≥ 70.0 %", "Chromium (Cr)": "14.0 - 17.0 %", "Iron (Fe)": "5.0 - 9.0 %", "Titanium (Ti)": "2.25 - 2.75 %", "Aluminium (Al)": "0.40 - 1.0 %" },
                        features: ["Good relaxation resistance at temperature", "Age-hardenable", "Used in turbines and nuclear hardware"],
                        standards: ["UNS N07750", "AMS 5667"]
                    })
                ]
            },

            /* --------------------------------------------------------------- MONEL */
            {
                key: "monel-400",
                name: "Monel",
                icon: "wave",
                grades: [
                    g("Monel 400", "UNS N04400", 8.80, {
                        densityType: "grade",
                        overview: "Nickel-copper alloy with outstanding resistance to seawater and many acids.",
                        applications: "Marine shafts, pump casings, valves, chemical vessels, piping and offshore splash-zone components.",
                        composition: { "Nickel (Ni)": "≥ 63.0 %", "Copper (Cu)": "28.0 - 34.0 %", "Iron (Fe)": "≤ 2.5 %", "Manganese (Mn)": "≤ 2.0 %", "Carbon (C)": "≤ 0.30 %" },
                        mechanical: { "Tensile strength": "≥ 480 MPa (annealed)", "Yield strength": "≥ 195 MPa (annealed)", "Elongation": "≥ 35 % (annealed)" },
                        features: ["Excellent seawater corrosion resistance", "Good strength and toughness over a wide temperature range", "Widely used in marine and chemical plant"],
                        standards: ["UNS N04400", "ASTM B127", "ASME SB-127"]
                    }),
                    g("Monel R-405", "UNS N04405", 8.80, {
                        densityType: "grade",
                        overview: "Free-machining version of Monel 400 with controlled sulphur.",
                        applications: "Screw-machine products, nuts, bolts, valve stems and high-volume machined marine components.",
                        composition: { "Nickel (Ni)": "≥ 63.0 %", "Copper (Cu)": "28.0 - 34.0 %", "Sulphur (S)": "0.025 - 0.060 %", "Iron (Fe)": "≤ 2.5 %" },
                        features: ["Improved machinability over Monel 400", "Same base corrosion resistance", "Used for automatic screw-machine parts"],
                        standards: ["UNS N04405", "ASTM B164"]
                    }),
                    g("Monel K-500", "UNS N05500", 8.44, {
                        densityType: "grade",
                        overview: "Age-hardenable Monel with higher strength from aluminium and titanium additions.",
                        applications: "Pump shafts, marine fasteners, oil-well drill collars, chains and high-strength seawater components.",
                        composition: { "Nickel (Ni)": "≥ 63.0 %", "Copper (Cu)": "27.0 - 33.0 %", "Aluminium (Al)": "2.3 - 3.15 %", "Titanium (Ti)": "0.35 - 0.85 %", "Iron (Fe)": "≤ 2.0 %" },
                        mechanical: { "Tensile strength": "approx. 1,100 MPa (age hardened)", "Yield strength": "approx. 790 MPa (age hardened)", "Elongation": "approx. 20 % (age hardened)" },
                        features: ["Precipitation hardenable", "Higher strength than Monel 400", "Retains excellent seawater corrosion resistance"],
                        standards: ["UNS N05500", "ASTM B865", "ASME SB-865"]
                    }),
                    g("Monel 404", "UNS N04404", 8.67, {
                        densityType: "grade",
                        overview: "Low-copper nickel-copper alloy designed for electronic applications.",
                        applications: "Electrical contacts, capacitor components, lead wires and precision instrument parts.",
                        composition: { "Nickel (Ni)": "52.0 - 57.0 %", "Copper (Cu)": "Remainder", "Iron (Fe)": "≤ 0.50 %", "Manganese (Mn)": "≤ 0.10 %" },
                        features: ["Low Curie temperature", "Good brazing and sealing characteristics", "Used in electronic components"],
                        standards: ["UNS N04404", "ASTM B164"]
                    }),
                    g("Monel 401", "UNS N04401", 8.80, {
                        densityType: "grade",
                        overview: "Low-resistivity nickel-copper alloy for precision electrical components.",
                        applications: "Capacitor leads, electrical resistors, instrument parts and controlled-expansion components.",
                        composition: { "Nickel (Ni)": "40.0 - 45.0 %", "Copper (Cu)": "Remainder", "Iron (Fe)": "≤ 0.25 %" },
                        features: ["Controlled electrical resistance", "Good corrosion resistance", "Used in precision instruments"],
                        standards: ["UNS N04401", "ASTM B164"]
                    })
                ]
            }
        ]
    };
}());

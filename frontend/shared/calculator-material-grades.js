/* ==========================================================================
   CALCULATOR: Material Grades and Applications
   --------------------------------------------------------------------------
   Shared replacement for the old Material Density Reference card on every
   calculator. One implementation, one markup template and one responsive
   Show More / Show Less state, driven by the existing shared grade database.
   Calculations, densities, standards and material data are untouched.
========================================================================== */
(function () {
    "use strict";

    /* One shared markup template for every calculator page. The IDs are
       calculator-specific so the panel never collides with a calculator's
       own Material dropdown or with the home page component. */
    var MARKUP = `
        <section class="grades-section calculator-grades-section" aria-labelledby="calcGradesTitle">
            <div class="grades-heading">
                <h2 id="calcGradesTitle">Material Grades and Applications</h2>
                <p>Select a material to explore its common grades, densities and industrial uses.</p>
            </div>

            <div class="grades-card">
                <div class="grades-select-wrap">
                    <label id="calcMaterialSelectionLabel" for="calcMaterialCombo">Material Selection</label>
                    <select class="grades-select" id="calcMaterialGrades" aria-label="Select a material" tabindex="-1" aria-hidden="true"></select>
                    <div class="material-combo">
                        <button type="button" class="combo-control" id="calcMaterialCombo" role="combobox"
                                aria-haspopup="listbox" aria-expanded="false" aria-controls="calcMaterialComboMenu"
                                aria-labelledby="calcMaterialSelectionLabel calcMaterialComboValue">
                            <span class="combo-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>
                                </svg>
                            </span>
                            <span class="combo-value" id="calcMaterialComboValue">Carbon Steel</span>
                            <span class="combo-chevron" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                        </button>
                        <div class="combo-menu" id="calcMaterialComboMenu" role="dialog" aria-label="Choose a material" hidden>
                            <div class="combo-search-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/>
                                </svg>
                                <input class="combo-search" id="calcMaterialComboSearch" type="search" autocomplete="off"
                                       placeholder="Search materials" aria-label="Search materials" aria-controls="calcMaterialComboList">
                            </div>
                            <div class="combo-options" id="calcMaterialComboList" role="listbox" aria-label="Materials"></div>
                        </div>
                    </div>
                </div>

                <div class="grades-list" id="calcGradesList" aria-live="polite"></div>
                <div class="grade-info" id="calcGradeInfo" hidden></div>

                <div class="grades-more-wrap">
                    <button type="button" class="grades-more" id="calcGradesMore"
                            aria-expanded="false" aria-controls="calcGradesList">
                        <span id="calcGradesMoreText">Show More Grades &#8595;</span>
                    </button>
                </div>

                <p class="grades-note">Densities are representative room-temperature values in g/cm³ and kg/m³. Actual density can vary slightly with chemical composition, manufacturing process and temperature. Confirm critical values against the applicable datasheet or mill certificate.</p>
            </div>
        </section>
    `;

    var root = document.querySelector("[data-calculator-grade-panel]");
    if (!root || root.querySelector(".grades-section")) return;

    root.innerHTML = MARKUP;

    var select = root.querySelector("#calcMaterialGrades");
    var list = root.querySelector("#calcGradesList");
    var info = root.querySelector("#calcGradeInfo");
    var moreButton = root.querySelector("#calcGradesMore");

    var selectedIndex = -1;
    var selectedKey = null;
    var expanded = false;
    var desktopQuery = window.matchMedia
        ? window.matchMedia("(min-width: 901px)") : null;

    /* Mobile shows 2 cards, desktop shows 4. The breakpoint is the same
       one the reference design uses to switch from one to two columns. */
    function initialLimit() {
        return desktopQuery && desktopQuery.matches ? 4 : 2;
    }

    function updateMoreButton(total, limit) {
        if (!moreButton) return;
        if (total <= limit) {
            moreButton.hidden = true;
            return;
        }
        moreButton.hidden = false;
        moreButton.setAttribute("aria-expanded", expanded ? "true" : "false");
        var label = root.querySelector("#calcGradesMoreText");
        if (label) {
            label.textContent = expanded
                ? tr("Show Less") + " ↑"
                : tr("Show More Grades") + " ↓";
        }
    }
    var mobileQuery = window.matchMedia
        ? window.matchMedia("(max-width: 900px)") : null;

    /* Every dynamic string in this panel goes through the same global runtime
       as the rest of the site. Missing keys fall back to the English source. */
    function tr(text) {
        if (!window.MW_I18N || typeof window.MW_I18N.t !== "function") return text;
        var translated = window.MW_I18N.t(text);
        return (translated === null || translated === undefined || translated === "")
            ? text : translated;
    }

    /* Numeric values and units never change, only their digit family does. */
    function formatCount(value, decimals) {
        if (window.MWNumber && typeof window.MWNumber.formatNumber === "function") {
            return window.MWNumber.formatNumber(value, decimals);
        }
        return Number(value).toFixed(decimals);
    }

    function formatInteger(value) {
        if (window.MWNumber && typeof window.MWNumber.formatInteger === "function") {
            return window.MWNumber.formatInteger(value);
        }
        return Number(value).toLocaleString("en-US");
    }

    /* ----------------------------------------------------------------------
       Structured database (frontend/assets/data/material-grades-data.js).
       Every grade carries its own name, standard, density, applications,
       overview, composition, mechanical data, features and standards.
    ---------------------------------------------------------------------- */
    var DB = window.MW_GRADE_DATABASE || { materials: [] };

    function materialFor(key) {
        var materials = DB.materials || [];
        for (var i = 0; i < materials.length; i++) {
            if (materials[i].key === key) return materials[i];
        }
        return null;
    }

    function gradesFor(key) {
        var material = materialFor(key);
        return material && material.grades ? material.grades : [];
    }

    /* ----------------------------------------------------------------------
       Industrial illustrations. Every drawing uses the same 64 x 64 viewBox,
       line weight and fill palette so the cards stay visually consistent.
    ---------------------------------------------------------------------- */
    var gearTooth = "";
    for (var t = 0; t < 8; t++) {
        gearTooth += '<rect x="29" y="7" width="6" height="7" rx="1" fill="#dceef8" transform="rotate(' +
            (t * 45) + ' 32 32)"/>';
    }

    var bearingBalls = "";
    for (var b = 0; b < 8; b++) {
        var ang = b * Math.PI / 4;
        bearingBalls += '<circle cx="' + (32 + Math.cos(ang) * 14).toFixed(1) +
            '" cy="' + (32 + Math.sin(ang) * 14).toFixed(1) + '" r="3.1" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>';
    }

    var turbineBlades = "";
    for (var i = 0; i < 7; i++) {
        turbineBlades += '<path d="M32 24c-2.6-5.5-1.8-10.3 1.8-14.4 4.3 3.8 5.4 8.7 3 14.4Z" fill="#e6f1f9" stroke="#8fb6d3" stroke-width="0.9" transform="rotate(' +
            (i * 51.4) + ' 32 32)"/>';
    }

    var propBlades = "";
    for (var p = 0; p < 3; p++) {
        propBlades += '<path d="M32 28c-7.5-3.5-11.5-9.5-9.5-15.5 8 1.2 13 6.2 13.5 14Z" fill="#e6f1f9" stroke="#8fb6d3" stroke-width="1" transform="rotate(' +
            (p * 120) + ' 32 32)"/>';
    }

    var ART = {
        beam: '<path d="M10 10h44v8H36v28h18v8H10v-8h18V18H10z" fill="#e6f1f9"/>' +
            '<path d="M10 18h18M36 18h18M10 46h18M36 46h18M28 18v28M36 18v28" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M10 10v8M54 10v8M10 46v8M54 46v8" stroke="#8fb6d3" stroke-width="1"/>',
        roundBar: '<rect x="12" y="24" width="36" height="16" rx="1.5" fill="#e6f1f9"/>' +
            '<ellipse cx="12" cy="32" rx="5" ry="8" fill="#d6e9f7"/>' +
            '<ellipse cx="48" cy="32" rx="5" ry="8" fill="#f1f7fc"/>' +
            '<path d="M12 24h36M12 40h36" />' +
            '<path d="M18 28h24M18 36h24" stroke="#8fb6d3" stroke-width="1"/>',
        shaft: '<path d="M8 29h8v6H8zM48 27h8v10h-8z" fill="#d6e9f7"/>' +
            '<rect x="16" y="25" width="32" height="14" rx="1.5" fill="#e6f1f9"/>' +
            '<ellipse cx="16" cy="32" rx="4.5" ry="7" fill="#dceef8"/>' +
            '<ellipse cx="48" cy="32" rx="4.5" ry="7" fill="#f1f7fc"/>' +
            '<path d="M16 25h32M16 39h32M8 29h8M8 35h8M48 27h8M48 37h8"/>' +
            '<path d="M24 32h16" stroke="#8fb6d3" stroke-width="1" stroke-dasharray="3 2"/>' +
            '<path d="M34 27h6v4h-6z" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>',
        spring: '<rect x="18" y="8" width="28" height="4" rx="1.5" fill="#d6e9f7"/>' +
            '<rect x="18" y="52" width="28" height="4" rx="1.5" fill="#d6e9f7"/>' +
            '<path d="M20 12 L44 16 L20 20 L44 24 L20 28 L44 32 L20 36 L44 40 L20 44 L44 48 L20 52" fill="none" stroke="#4b7fa6" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M20 12 L44 16 L20 20 L44 24 L20 28 L44 32 L20 36 L44 40 L20 44 L44 48 L20 52" fill="none" stroke="#eaf4fb" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>',
        plate: '<path d="M12 20h36v28H12z" fill="#e6f1f9"/>' +
            '<path d="M48 20l6-5v28l-6 5z" fill="#d6e9f7"/>' +
            '<path d="M12 20l6-5h36l-6 5z" fill="#f1f7fc"/>' +
            '<path d="M12 20h36v28H12zM48 20l6-5M48 48l6-5M54 15v28"/>' +
            '<circle cx="20" cy="28" r="2.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="40" cy="28" r="2.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="20" cy="40" r="2.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="40" cy="40" r="2.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>',
        pipe: '<rect x="12" y="24" width="36" height="16" fill="#e6f1f9"/>' +
            '<ellipse cx="12" cy="32" rx="5" ry="8" fill="#d6e9f7"/>' +
            '<ellipse cx="48" cy="32" rx="5" ry="8" fill="#f1f7fc"/>' +
            '<ellipse cx="48" cy="32" rx="2.7" ry="4.6" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M12 24h36M12 40h36M48 24c2.7 0 5 3.6 5 8s-2.3 8-5 8"/>' +
            '<path d="M20 28h20M20 36h20" stroke="#8fb6d3" stroke-width="1"/>',
        gear: '<circle cx="32" cy="32" r="20" fill="#f5fbff" stroke="none"/>' + gearTooth +
            '<circle cx="32" cy="32" r="15.5" fill="#e6f1f9"/>' +
            '<circle cx="32" cy="32" r="5.5" fill="#ffffff"/>' +
            '<circle cx="32" cy="32" r="2.2" fill="#4b7fa6" stroke="none"/>' +
            '<path d="M32 16v5M32 43v5M16 32h5M43 32h5" stroke="#8fb6d3" stroke-width="1"/>',
        sheet: '<path d="M14 22h30l6 6v22H20l-6-6z" fill="#e6f1f9"/>' +
            '<path d="M14 22l6 6h30M20 28v22M44 22v28" />' +
            '<path d="M22 14h30l4 4" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M22 14v4h30" stroke="#8fb6d3" stroke-width="1"/>',
        extrusion: '<path d="M14 12h36v8H22v24h28v8H14z" fill="#e6f1f9"/>' +
            '<path d="M22 20h28M22 44h28M50 20v24M14 12v40M50 12v8M50 44v8M14 52h36"/>' +
            '<path d="M26 24v16M46 24v16" stroke="#8fb6d3" stroke-width="1"/>',
        wire: '<ellipse cx="28" cy="30" rx="14" ry="14" fill="#e6f1f9"/>' +
            '<ellipse cx="28" cy="30" rx="14" ry="14"/>' +
            '<ellipse cx="28" cy="30" rx="5.5" ry="5.5" fill="#ffffff"/>' +
            '<path d="M18 24c6-5 14-5 20 0M16 33c7 6 17 6 24 0M22 18c5 2 9 5 12 10" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M42 30c8 0 10 4 14 10" stroke="#4b7fa6" stroke-width="2"/>',
        casting: '<path d="M20 16h8l2 6h4l2-6h8l-3 10v4c0 8-4 14-9 16v4H22v-4c-5-2-9-8-9-16v-4z" fill="#e6f1f9"/>' +
            '<path d="M22 50h20v4H22z" fill="#d6e9f7"/>' +
            '<path d="M29 24h6M26 30h12M27 36h10" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M41 20c5 2 8 5 10 9" stroke="#8fb6d3" stroke-width="1"/>',
        anode: '<path d="M32 8v8M26 16h12v4H26z" fill="#d6e9f7"/>' +
            '<rect x="18" y="20" width="28" height="30" rx="3" fill="#e6f1f9"/>' +
            '<path d="M18 20h28v30H18z"/>' +
            '<path d="M18 30h28M18 40h28M32 20v30" stroke="#8fb6d3" stroke-width="1"/>',
        battery: '<rect x="20" y="16" width="24" height="36" rx="3" fill="#e6f1f9"/>' +
            '<path d="M27 12h10v4H27z" fill="#d6e9f7"/>' +
            '<path d="M20 16h24v36H20zM27 12h10v4H27z"/>' +
            '<path d="M32 24v16M24 32h16" stroke="#4b7fa6" stroke-width="1.8"/>' +
            '<path d="M24 21h5" stroke="#8fb6d3" stroke-width="1"/>',
        solder: '<circle cx="26" cy="30" r="14" fill="#e6f1f9"/>' +
            '<circle cx="26" cy="30" r="14"/>' +
            '<circle cx="26" cy="30" r="5" fill="#ffffff"/>' +
            '<path d="M16 24c6-5 14-5 20 0M14 33c7 6 17 6 24 0" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M40 30c6 0 8 4 12 10" stroke="#4b7fa6" stroke-width="2"/>' +
            '<path d="M52 40l4 6" stroke="#4b7fa6" stroke-width="2"/>',
        turbine: '<circle cx="32" cy="32" r="20" fill="#f5fbff" stroke="none"/>' + turbineBlades +
            '<circle cx="32" cy="32" r="6.5" fill="#ffffff"/>' +
            '<circle cx="32" cy="32" r="2.4" fill="#4b7fa6" stroke="none"/>',
        propeller: '<circle cx="32" cy="32" r="20" fill="#f5fbff" stroke="none"/>' + propBlades +
            '<circle cx="32" cy="32" r="5.5" fill="#ffffff"/>' +
            '<circle cx="32" cy="32" r="2.2" fill="#4b7fa6" stroke="none"/>',
        fastener: '<path d="M18 14h12l4 4v4H14v-4z" fill="#d6e9f7"/>' +
            '<path d="M14 18h20v4H14zM18 14h12l4 4H14z"/>' +
            '<rect x="20" y="22" width="8" height="28" rx="1.5" fill="#e6f1f9"/>' +
            '<path d="M20 22h8v28h-8z"/>' +
            '<path d="M20 28h8M20 33h8M20 38h8M20 43h8" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M38 34h14l4 4v6l-4 4H38l-4-4v-6z" fill="#e6f1f9"/>' +
            '<path d="M38 34h14l4 4v6l-4 4H38l-4-4v-6z"/>' +
            '<circle cx="45" cy="41" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>',
        bearing: '<circle cx="32" cy="32" r="20" fill="#f5fbff" stroke="none"/>' +
            '<circle cx="32" cy="32" r="18" fill="#e6f1f9"/>' +
            '<circle cx="32" cy="32" r="10" fill="#f8fbfe"/>' + bearingBalls +
            '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="4.5" fill="#ffffff"/>',
        tubeBundle: '<rect x="10" y="16" width="44" height="32" rx="4" fill="#e6f1f9"/>' +
            '<rect x="10" y="16" width="44" height="32" rx="4"/>' +
            '<path d="M18 16v32M46 16v32M10 32h44" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="25" cy="24" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="32" cy="24" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="39" cy="24" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="25" cy="40" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="32" cy="40" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<circle cx="39" cy="40" r="3.2" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>',
        ingot: '<path d="M12 42h40l6 10H6z" fill="#d6e9f7"/>' +
            '<path d="M18 30h28l6 12H12z" fill="#e6f1f9"/>' +
            '<path d="M24 18h16l6 12H18z" fill="#f1f7fc"/>' +
            '<path d="M12 42h40l6 10H6zM18 30h28l6 12H12zM24 18h16l6 12H18z"/>' +
            '<path d="M24 18l-6 12M40 18l6 12M18 30l-6 12M46 30l6 12" stroke="#8fb6d3" stroke-width="1"/>',
        connector: '<rect x="16" y="20" width="32" height="24" rx="3" fill="#e6f1f9"/>' +
            '<path d="M16 20h32v24H16z"/>' +
            '<path d="M22 20v-6M32 20v-6M42 20v-6M22 44v6M32 44v6M42 44v6"/>' +
            '<rect x="21" y="27" width="6" height="10" rx="1" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<rect x="37" y="27" width="6" height="10" rx="1" fill="#ffffff" stroke="#8fb6d3" stroke-width="1"/>' +
            '<path d="M29 32h6" stroke="#8fb6d3" stroke-width="1"/>'
    };

    var DENSITY_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M8 1.8 14 5.1v5.8L8 14.2 2 10.9V5.1L8 1.8Z"/>' +
        '<path d="M2 5.1 8 8.4l6-3.3M8 8.4v5.8"/></svg>';

    function artSvg(name) {
        return '<svg viewBox="0 0 64 64" fill="none" stroke="#4b7fa6" stroke-width="1.7" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            (ART[name] || ART.plate) + '</svg>';
    }

    /* Pick a product-shaped illustration from the real grade/application text. */
    function chooseArt(grade, key) {
        var text = ((grade.name || "") + " " + (grade.applications || "") + " " + (key || "")).toLowerCase();
        var rules = [
            [/spring/, "spring"],
            [/solder|brazing/, "solder"],
            [/battery|accumulator/, "battery"],
            [/anode|galvanis/, "anode"],
            [/turbine|jet engine|gas turbine|exhaust/, "turbine"],
            [/propeller|marine|seawater/, "propeller"],
            [/bearing|bushing/, "bearing"],
            [/fastener|\bbolt|\bnut|\bnuts\b|\bscrew/, "fastener"],
            [/electrical|electronic|conductor|conductivity|contact|switchgear|busbar|wiring|connector|transformer/, "connector"],
            [/heat exchanger|furnace|reactor|chemical processing|pressure vessel|tubing|pharmaceutical/, "tubeBundle"],
            [/pipe|plumbing|water tube|refrigeration|valve/, "pipe"],
            [/extrusion|window|door frame|architectural|profile/, "extrusion"],
            [/beam|structur|bridge|tower|transmission/, "beam"],
            [/\bgear/, "gear"],
            [/shaft|axle/, "shaft"],
            [/die-cast|die cast|casting|foundry|engine block|machine base|crankshaft/, "casting"],
            [/sheet|roofing|flashing|plate|cladding|trim/, "plate"],
            [/wire|coil|cable/, "wire"],
            [/ingot|billet/, "ingot"],
            [/machin|turned|\bbar\b|\brod\b|stock|forging/, "roundBar"]
        ];

        for (var r = 0; r < rules.length; r++) {
            if (rules[r][0].test(text)) return rules[r][1];
        }

        var fallback = {
            "carbon-steel": "beam",
            "stainless-steel": "plate",
            aluminium: "extrusion",
            brass: "roundBar",
            bronze: "bearing",
            "cast-iron": "casting",
            copper: "connector",
            zinc: "ingot",
            lead: "battery",
            tin: "solder",
            titanium: "shaft",
            nickel: "tubeBundle",
            magnesium: "plate",
            "inconel-625": "turbine",
            "monel-400": "propeller"
        };
        return fallback[key] || "plate";
    }

    /* ----------------------------------------------------------------------
       Dropdown options are taken from the shared material table so both the
       custom search control and the native select stay in perfect sync.
    ---------------------------------------------------------------------- */
    function materialKeys() {
        var table = window.MW_MATERIALS || {};
        var order = window.MW_MATERIAL_ORDER || [];
        var keys = [];

        order.forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });

        Object.keys(table).forEach(function (key) {
            if (gradesFor(key).length && keys.indexOf(key) === -1) keys.push(key);
        });

        /* The grade database is a complete fallback if calc-api.js has not
           populated the calculator material table yet. */
        (DB.materials || []).forEach(function (material) {
            if (gradesFor(material.key).length && keys.indexOf(material.key) === -1) {
                keys.push(material.key);
            }
        });
        return keys;
    }

    function optionNodes() {
        return Array.prototype.slice.call(select.children || []);
    }

    function selectedLabel() {
        var options = optionNodes();
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === select.value) return options[i].textContent;
        }
        return select.value;
    }

    /* Combo elements are optional: the card guide also runs on pages/tests
       that only provide the native select and the grade list. */
    var control = document.getElementById("calcMaterialCombo");
    var comboRoot = control ? control.parentNode : null;
    var menu = document.getElementById("calcMaterialComboMenu");
    var search = document.getElementById("calcMaterialComboSearch");
    var optionsBox = document.getElementById("calcMaterialComboList");
    var comboValue = document.getElementById("calcMaterialComboValue");
    var visibleOptions = [];
    var activeIndex = 0;

    function syncCombo() {
        if (!comboValue) return;
        comboValue.textContent = selectedLabel();
        if (optionsBox && menu && !menu.hidden) renderComboOptions(search ? search.value : "");
    }

    function setActive(index) {
        if (!optionsBox || !visibleOptions.length) return;
        activeIndex = Math.max(0, Math.min(index, visibleOptions.length - 1));
        for (var i = 0; i < visibleOptions.length; i++) {
            if (i === activeIndex) visibleOptions[i].classList.add("is-active");
            else visibleOptions[i].classList.remove("is-active");
        }
        if (search && visibleOptions[activeIndex].id) {
            search.setAttribute("aria-activedescendant", visibleOptions[activeIndex].id);
        }
    }

    function renderComboOptions(query) {
        if (!optionsBox) return;
        var q = String(query || "").trim().toLowerCase();
        optionsBox.textContent = "";
        visibleOptions = [];
        activeIndex = 0;

        optionNodes().forEach(function (option) {
            if (q && option.textContent.toLowerCase().indexOf(q) === -1) return;

            var row = document.createElement("div");
            row.className = "combo-option";
            row.setAttribute("role", "option");
            row.setAttribute("id", "calc-material-option-" + option.value);
            row.setAttribute("data-value", option.value);
            row.setAttribute("aria-selected", option.value === select.value ? "true" : "false");

            var label = document.createElement("span");
            label.textContent = option.textContent;
            row.appendChild(label);

            if (option.value === select.value) {
                var check = document.createElement("span");
                check.className = "combo-option-check";
                check.setAttribute("aria-hidden", "true");
                check.textContent = "\u2713";
                row.appendChild(check);
            }

            optionsBox.appendChild(row);
            visibleOptions.push(row);
            if (option.value === select.value) activeIndex = visibleOptions.length - 1;
        });

        if (!visibleOptions.length) {
            var empty = document.createElement("div");
            empty.className = "combo-empty";
            empty.textContent = tr("No materials found");
            optionsBox.appendChild(empty);
        } else {
            setActive(activeIndex);
        }
    }

    function openCombo() {
        if (!control || !menu) return;
        menu.hidden = false;
        control.setAttribute("aria-expanded", "true");
        if (search) {
            search.value = "";
            renderComboOptions("");
            search.focus();
        } else {
            renderComboOptions("");
        }
    }

    function closeCombo() {
        if (!control || !menu) return;
        menu.hidden = true;
        control.setAttribute("aria-expanded", "false");
        if (search) search.removeAttribute("aria-activedescendant");
    }

    function chooseMaterial(value) {
        if (!value) return;
        select.value = value;
        expanded = false;
        selectedKey = null;
        syncCombo();
        renderGrades();
        closeCombo();
        if (control) control.focus();
    }

    function initCombo() {
        if (!control || !menu || !search || !optionsBox) return;

        control.addEventListener("click", function () {
            if (menu.hidden) openCombo();
            else closeCombo();
        });

        control.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                if (event.preventDefault) event.preventDefault();
                openCombo();
            }
        });

        search.addEventListener("input", function () {
            renderComboOptions(search.value);
        });

        search.addEventListener("keydown", function (event) {
            var key = event.key;
            if (key === "ArrowDown" || key === "ArrowUp") {
                if (event.preventDefault) event.preventDefault();
                setActive(activeIndex + (key === "ArrowDown" ? 1 : -1));
            } else if (key === "Enter") {
                if (event.preventDefault) event.preventDefault();
                if (visibleOptions[activeIndex]) {
                    chooseMaterial(visibleOptions[activeIndex].getAttribute("data-value"));
                }
            } else if (key === "Escape") {
                if (event.preventDefault) event.preventDefault();
                closeCombo();
                control.focus();
            } else if (key === "Tab") {
                closeCombo();
            }
        });

        optionsBox.addEventListener("click", function (event) {
            var row = event.target && event.target.closest ? event.target.closest(".combo-option") : null;
            if (row && optionsBox.contains(row)) chooseMaterial(row.getAttribute("data-value"));
        });

        document.addEventListener("click", function (event) {
            if (menu.hidden || !comboRoot || !comboRoot.contains || !event.target) return;
            if (!comboRoot.contains(event.target)) closeCombo();
        });
    }

    function buildOptions() {
        var keys = materialKeys();
        var previous = select.value;
        var table = window.MW_MATERIALS || {};

        select.textContent = "";
        keys.forEach(function (key) {
            var option = document.createElement("option");
            option.value = key;
            var fallback = materialFor(key);
            option.textContent = tr((table[key] && table[key].name) ||
                (fallback && fallback.name) || key);
            select.appendChild(option);
        });

        if (keys.indexOf(previous) !== -1) select.value = previous;
        syncCombo();
        renderGrades();
    }

    /* ----------------------------------------------------------------------
       Grade cards: header + illustration + visible applications. The card
       design never changes; selecting a card highlights it and shows the
       detailed reference below the grid.
    ---------------------------------------------------------------------- */
    function fmtDensity(value) {
        return {
            g: formatCount(Number(value), 2),
            kg: formatInteger(Math.round(Number(value) * 1000))
        };
    }

    function make(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function densityBlock(value, className) {
        var d = fmtDensity(value);
        var wrap = make("span", className || "info-density");
        wrap.appendChild(make("strong", "info-density-g", d.g + " g/cm\u00B3"));
        wrap.appendChild(make("span", "info-density-kg", d.kg + " kg/m\u00B3"));
        return wrap;
    }

    function renderGrades() {
        var key = select.value;
        var restoreKey = selectedKey;
        var restoreIndex = selectedIndex;
        var grades = gradesFor(key);
        var limit = initialLimit();
        var visibleCount = expanded ? grades.length : Math.min(limit, grades.length);

        list.textContent = "";
        selectedIndex = -1;
        if (info) {
            info.textContent = "";
            info.hidden = true;
        }

        for (var index = 0; index < visibleCount; index++) {
            var grade = grades[index];
            var d = fmtDensity(grade.density);
            var item = make("article", "grade-item");

            var button = make("button", "grade-card grade-toggle");
            button.type = "button";
            button.setAttribute("data-grade", grade.name);
            button.setAttribute("data-index", String(index));
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", grade.name + ", " +
                tr("density") + " " + d.g + " g/cm\u00B3. " +
                tr("Show full grade details."));

            var head = make("span", "grade-card-head");
            var titleBox = make("span", "grade-title-box");

            var name = make("strong", "grade-name", grade.name);
            name.title = grade.name;
            titleBox.appendChild(name);
            titleBox.appendChild(make("span", "grade-standard", grade.standard || ""));

            var density = make("span", "grade-density");
            density.innerHTML = DENSITY_ICON;
            var densityText = make("span", "grade-density-text");
            densityText.appendChild(make("strong", "", d.g + " g/cm\u00B3"));
            densityText.appendChild(make("small", "", d.kg + " kg/m\u00B3"));
            density.appendChild(densityText);

            head.appendChild(titleBox);
            head.appendChild(density);

            var body = make("span", "grade-card-body");
            var illustration = make("span", "grade-art");
            illustration.innerHTML = artSvg(chooseArt(grade, key));

            var applications = make("span", "grade-applications");
            applications.appendChild(make("strong", "app-title", tr("Common Applications")));
            applications.appendChild(make("span", "app-text", tr(grade.applications || "")));

            body.appendChild(illustration);
            body.appendChild(applications);
            button.appendChild(head);
            button.appendChild(body);
            item.appendChild(button);
            list.appendChild(item);
        }

        /* A language change or a breakpoint change rebuilds the cards, so put
           the already-open panel back in place instead of losing it. */
        if (restoreKey === key && restoreIndex >= 0 && restoreIndex < visibleCount) {
            var cards = list.querySelectorAll ? list.querySelectorAll(".grade-card") : [];
            if (cards[restoreIndex]) {
                cards[restoreIndex].classList.add("is-selected");
                cards[restoreIndex].setAttribute("aria-pressed", "true");
            }
            selectedIndex = restoreIndex;
            renderGradeInfo(key, restoreIndex);
            positionGradeInfo(restoreIndex);
        }

        updateMoreButton(grades.length, limit);
    }

    /* ----------------------------------------------------------------------
       Detailed information shown below the grade cards after a selection.
    ---------------------------------------------------------------------- */
    function infoSection(title, content) {
        var section = make("div", "info-section");
        section.appendChild(make("strong", "info-section-title", title));
        section.appendChild(content);
        return section;
    }

    /* Keep chemical symbols, numbers, units and grade designations exactly as
       stored; translate only the human-readable label around them. */
    function translateRowLabel(label) {
        var match = /^(.*?)(\s*\([^)]*\)\s*)$/.exec(label);
        if (match) return tr(match[1].trim()) + match[2];
        return tr(label);
    }

    function translatedRows(data) {
        var rows = {};
        Object.keys(data || {}).forEach(function (label) {
            rows[translateRowLabel(label)] = data[label];
        });
        return rows;
    }

    function dataRows(data) {
        var wrap = make("div", "info-rows");
        var rows = translatedRows(data);
        Object.keys(rows).forEach(function (label) {
            var row = make("div", "info-row");
            row.appendChild(make("span", "info-row-label", label));
            row.appendChild(make("span", "info-row-value", rows[label]));
            wrap.appendChild(row);
        });
        return wrap;
    }

    function unavailable(label) {
        return make("p", "info-unavailable", tr(label) + " " +
            tr("is not documented in this reference. Verify against the applicable standard or supplier datasheet."));
    }

    function renderGradeInfo(key, index) {
        if (!info) return;
        var grade = gradesFor(key)[index];
        var material = materialFor(key);
        if (!grade) return;

        info.textContent = "";
        var d = fmtDensity(grade.density);

        var header = make("div", "info-header");
        var heading = make("div", "info-heading");
        heading.appendChild(make("span", "info-eyebrow", tr(material ? material.name : "Material")));
        heading.appendChild(make("h3", "info-title", grade.name));
        heading.appendChild(make("span", "info-standard", grade.standard || ""));
        header.appendChild(heading);

        var headRight = make("div", "info-header-right");
        headRight.appendChild(densityBlock(grade.density));
        var close = make("button", "info-close", "\u00D7");
        close.type = "button";
        close.setAttribute("aria-label", tr("Close grade details"));
        close.addEventListener("click", clearGradeSelection);
        headRight.appendChild(close);
        header.appendChild(headRight);
        info.appendChild(header);

        var grid = make("div", "info-grid");

        grid.appendChild(infoSection(tr("Grade Overview"),
            make("p", "info-text", tr(grade.overview ||
                "Overview is not documented in this reference for this grade."))));

        var densityBody = make("div", "info-text");
        densityBody.appendChild(make("p", "info-lead",
            tr("Typical density:") + " " + d.g + " g/cm\u00B3 (" + d.kg + " kg/m\u00B3)."));
        densityBody.appendChild(make("p", "",
            grade.densityType === "grade"
                ? tr("Representative published value for this grade family.")
                : tr("Typical value for the parent material; the grade standard does not specify a density.")));
        densityBody.appendChild(make("p", "info-source", tr(DB.densityNote || "")));
        grid.appendChild(infoSection(tr("Material Density"), densityBody));

        grid.appendChild(infoSection(tr("Chemical Composition"),
            grade.composition ? dataRows(grade.composition) : unavailable("Chemical composition")));

        grid.appendChild(infoSection(tr("Mechanical Properties"),
            grade.mechanical ? dataRows(grade.mechanical) : unavailable("Mechanical properties")));

        grid.appendChild(infoSection(tr("Common Industrial Applications"),
            make("p", "info-text", tr(grade.applications || ""))));

        var features = make("ul", "info-features");
        (grade.features || []).forEach(function (feature) {
            features.appendChild(make("li", "", tr(feature)));
        });
        grid.appendChild(infoSection(tr("Key Features"),
            grade.features && grade.features.length ? features : unavailable("Key features")));

        grid.appendChild(infoSection(tr("Applicable Standards"),
            make("p", "info-text", (grade.standards || []).join("  \u00B7  "))));

        info.appendChild(grid);
        info.hidden = false;
    }

    /* Move the single shared panel into the correct grid position.
       Desktop: after the last card in the selected two-column row.
       Mobile: directly after the selected card. */
    function positionGradeInfo(index) {
        if (!info || index < 0 || info.hidden) return;
        var items = list.querySelectorAll ? list.querySelectorAll(".grade-item") : [];
        if (!items.length) return;
        var safeIndex = Math.max(0, Math.min(index, items.length - 1));
        var anchor = items[safeIndex];
        if (!(mobileQuery && mobileQuery.matches)) {
            var rowStart = Math.floor(safeIndex / 2) * 2;
            var rowEnd = Math.min(rowStart + 1, items.length - 1);
            anchor = items[rowEnd];
        }
        if (anchor && anchor.nextSibling !== info) {
            list.insertBefore(info, anchor.nextSibling);
        }
    }

    function clearGradeSelection() {
        var cards = list.querySelectorAll ? list.querySelectorAll(".grade-card") : [];
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.remove("is-selected");
            cards[i].setAttribute("aria-pressed", "false");
        }
        selectedIndex = -1;
        selectedKey = null;
        if (info) {
            info.textContent = "";
            info.hidden = true;
        }
    }

    list.addEventListener("click", function (event) {
        var target = event.target;
        var button = target && target.closest ? target.closest(".grade-card") : null;
        if (!button || !list.contains(button)) return;

        var index = Number(button.getAttribute("data-index"));
        if (button.getAttribute("aria-pressed") === "true") {
            clearGradeSelection();
            return;
        }

        var cards = list.querySelectorAll ? list.querySelectorAll(".grade-card") : [];
        for (var i = 0; i < cards.length; i++) {
            var isThis = cards[i] === button;
            cards[i].classList.toggle("is-selected", isThis);
            cards[i].setAttribute("aria-pressed", isThis ? "true" : "false");
        }
        selectedIndex = index;
        selectedKey = select.value;
        renderGradeInfo(select.value, index);
        positionGradeInfo(index);
    });

    select.addEventListener("change", function () {
        expanded = false;
        selectedKey = null;
        syncCombo();
        renderGrades();
    });

    if (moreButton) {
        moreButton.addEventListener("click", function () {
            if (expanded) {
                var limit = initialLimit();
                if (selectedIndex >= limit) clearGradeSelection();
            }
            expanded = !expanded;
            renderGrades();
            moreButton.focus();
        });
    }

    initCombo();

    /* Keep the card count and the detail panel correct when the breakpoint
       changes (for example a tablet rotating or a desktop window resizing). */
    function onBreakpointChange() {
        if (!expanded) renderGrades();
        else positionGradeInfo(selectedIndex);
    }

    if (desktopQuery && desktopQuery.addEventListener) {
        desktopQuery.addEventListener("change", onBreakpointChange);
    } else {
        window.addEventListener("resize", onBreakpointChange);
    }

    if (mobileQuery && mobileQuery.addEventListener) {
        mobileQuery.addEventListener("change", function () {
            positionGradeInfo(selectedIndex);
        });
    }

    /* The global language switcher must refresh the open panel in place, with
       the same selected material and the same panel position. */
    window.addEventListener("mw:languagechange", function () {
        buildOptions();
    });

    /* calc-api.js refreshes the shared table when /api/materials arrives. */
    document.addEventListener("mw:materials-loaded", buildOptions);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildOptions);
    } else {
        buildOptions();
    }
}());

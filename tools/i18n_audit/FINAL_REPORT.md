# Website Localization Audit — Final Report

## Scope
- 26 pages: homepage, About, and 24 calculators.
- 10 languages: `mr`, `hi`, `en`, `de`, `es`, `fr`, `ja`, `zh`, `pt`, `ar`.
- Desktop (1440×900) and mobile (390×844 / Pixel 5 user agent) viewports.
- Verified static text, dynamic results, numerals, units, formulas, history, keypad labels,
  RTL direction, validation messages, language persistence, and material-grade panels.

## Verification results

| Check | Coverage | Result |
|---|---|---|
| Dictionary/asset consistency (`check_i18n.py`) | 10 dictionaries, 2,394 keys each | 0 blocking issues (9 review warnings for standard names/designations) |
| Round 1 residual analysis (`analyze.py`) | 26 pages | Raw counts informational only; formula fragments, standards, units and variables intentionally unchanged |
| Round 2 repeated switch regression (`round2.py`) | 24 calculators × 16 language switches, 6 checks each | **144 checks, 0 failed, 0 errors** |
| Round 3 full regression (`round3.py`) | 26 pages × 2 viewports × 10 checks | **520 checks, 0 failed, 0 errors** |
| Material-grade panel (`grade_panel_test.py`) | 6 viewports (1920 → 360px) | **282 checks, 0 failed, 0 errors** |
| Grade detail language sync (`grade_detail_lang_test.py`) | 2 sample materials × 5 languages + all 15 material families | **67 checks, 0 failed, 0 errors** |

Final rerun on runtime version 47 used `round3_fast.py` (same checks as `round3.py`,
with a shorter headless virtual-time budget) and again produced **520 checks,
0 failed, 0 errors**.

## Language-wise result

| Language | Digit system | Pages verified | Failed checks |
|---|---|---|---|
| Marathi (`mr`) | Devanagari | 26 (desktop + mobile) | 0 |
| Hindi (`hi`) | Devanagari | 26 (desktop + mobile) | 0 |
| English (`en`) | Latin | 26 (desktop + mobile) | 0 |
| German (`de`) | Latin | 26 (desktop + mobile) | 0 |
| Spanish (`es`) | Latin | 26 (desktop + mobile) | 0 |
| French (`fr`) | Latin | 26 (desktop + mobile) | 0 |
| Japanese (`ja`) | Full-width | 26 (desktop + mobile) | 0 |
| Simplified Chinese (`zh`) | Latin | 26 (desktop + mobile) | 0 |
| Portuguese (`pt`) | Latin | 26 (desktop + mobile) | 0 |
| Arabic (`ar`) | Arabic-Indic, RTL | 26 (desktop + mobile) | 0 |

## Page-wise result

Every page below passed all 10 Round-3 checks on desktop and mobile for all 10 languages:

- `index.html`
- `frontend/about/index.html`
- 24 calculators: `box-channel`, `c-channel`, `circular-plate`, `dish-ends`,
  `e-section`, `flange-plate`, `hexagon-bar`, `hexagonal-bar-with-round-hole`,
  `i-channel`, `l-channel`, `nut-bolt`, `pipe`, `plate`,
  `round-bar-with-hexagonal-hole`, `round-bar`, `shell`, `solid-cone`,
  `sphere-ball`, `square-bar`, `t-channel`, `trapezium-bar`,
  `trapezoidal-bar`, `triangular-bar`, `truncated-cone`.

## Fixes applied during final verification
- Added 24 material-grade/UI strings plus `Bolt Size` to all 10 dictionaries; rebuilt
  `translations.js` and bumped runtime version to `43`.
- Material detail box is now fully language-reactive: every heading, overview,
  density note, composition/mechanical label, application, feature, fallback and
  aria label goes through `MW_I18N.t()`. The open panel re-renders in place on
  `mw:languagechange`, keeping the selected grade and its desktop/mobile position.
- Added 749 grade-database strings (156 overviews, 156 applications, 402 features,
  31 element labels, 4 mechanical labels, 15 material names and the shared density
  note) plus 21 UI labels to all 10 dictionaries. Contextual repairs correct
  "grade"/"material" mistranslations in `de`, `es`, `fr`, `pt`, `ja`, `zh` and `mr`.
- Added the four shared calculator material-panel keys (`Choose a material`,
  `Materials`, `Show More Grades ↓`, `Show Less ↑`) that were previously missing
  from every dictionary, so repeated language switches no longer report them as
  untranslated.
- Added composed keypad label sources (`Decimal point (,)` and `Decimal point (.)`)
  so the mobile numeric keypad's generated aria-label maps back to English on
  repeated language switches instead of being reported as untranslated.
- Runtime version bumped to `47`; `translations.js` and all 26 page asset blocks
  regenerated. Grade strings use newline-batched lookup at build time so batches
  stay aligned; no translation service is contacted at runtime.
- `number-format.js`: a dot after a leading zero is now parsed as a decimal point,
  not a thousands separator (fixed 1000× result changes in `de`/`es`/`pt`).
- `flange-plate.js`: validate bolt-hole count with `MWNumber.parse` and skip
  auto-recalculation until dimension inputs are restored (fixed reload race).
- `nut-bolt.js`: defer language-change recalculation until input localization finishes.
- Hardened audit harnesses (network flags, missing `iframe.src`/listener close,
  non-numeric result filtering, correct digit checks for Latin-script languages).

## Intentional exceptions
Engineering formulas, standard designations (ISO/ASTM/DIN/etc.), variable symbols
(`A`, `D`, `L`, `ρ`, `π`), units (`kg`, `mm`, `lb`) and density values remain in their
international technical form. These are preserved by design and are not translation failures.

## Status
All changes are **uncommitted**. No commit, push, review, or merge was performed.

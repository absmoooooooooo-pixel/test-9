/* Merges the translated strings into frontend/i18n/translations.js. */
const fs = require("fs");

const FILE = "frontend/i18n/translations.js";
const LANGS = ["mr", "hi", "de", "es", "fr", "ja", "pt", "ar"];

/* Always build from the pre-translation snapshot so a re-run is idempotent
   and polished values replace earlier drafts. */
const BASE = fs.existsSync(".audit/translations.backup.js")
  ? ".audit/translations.backup.js"
  : FILE;
const source = fs.readFileSync(BASE, "utf8");
const dicts = JSON.parse(source.match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]);

/* Repairs the two artefacts the translation pass can leave behind: the
   protected brand name and a leading English article that was mistaken for a
   dimension variable ("A shortcut" -> "A शॉर्टकट"). */
function polish(value, dict) {
  const brand = (dict.terms && dict.terms["Metal Weight Calculator"]) ||
                (dict.strings && dict.strings["Metal Weight Calculator"]) ||
                "Metal Weight Calculator";
  let out = value.split("Metal Weight Calculator").join(brand);
  out = out.replace(/(^|[\s।.;:!?])(Der|Die|Das|Ein|Eine|Den|Dem|The)\s+A-(?=[A-ZÄÖÜ])/g, "$1$2 ");
  out = out.replace(/\bA-(?=[A-ZÄÖÜ])/g, "");
  out = out.replace(/(^|[।\s])A\s+(?=[^\x00-\x7F])/g, "$1");
  return out.replace(/\s{2,}/g, " ").trim();
}

for (const lang of LANGS) {
  const cacheFile = ".audit/cache-" + lang + ".json";
  if (!fs.existsSync(cacheFile)) continue;
  const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const dict = dicts[lang] || (dicts[lang] = { code: lang, terms: {}, strings: {}, templates: {} });
  dict.strings = dict.strings || {};
  let added = 0;
  let skipped = 0;
  for (const [key, raw] of Object.entries(cache)) {
    const value = String(raw || "").trim();
    if (!value || value === key || value.includes("\uFFFD")) { skipped += 1; continue; }
    if (Object.prototype.hasOwnProperty.call(dict.strings, key)) { skipped += 1; continue; }
    if (dict.terms && Object.prototype.hasOwnProperty.call(dict.terms, key)) { skipped += 1; continue; }
    dict.strings[key] = polish(value, dict);
    added += 1;
  }
  console.log(lang, "added", added, "skipped", skipped, "total strings", Object.keys(dict.strings).length);
}

/* Hand-checked corrections that the automated pass got wrong or left
   identical to English. */
const OVERRIDES = {
  fr: { pcs: "pi\u00E8ces", pc: "pi\u00E8ce" },
  pt: { pcs: "p\u00E7" },
  de: { Open: "\u00D6ffnen" },
  hi: { Open: "\u0916\u094B\u0932\u0947\u0902" }
};
for (const lang of Object.keys(OVERRIDES)) {
  if (!dicts[lang]) continue;
  for (const key of Object.keys(OVERRIDES[lang])) dicts[lang].strings[key] = OVERRIDES[lang][key];
}

fs.writeFileSync(FILE, "window.MW_I18N_DICTIONARIES=" + JSON.stringify(dicts) + ";", "utf8");
console.log("written", fs.statSync(FILE).size, "bytes");

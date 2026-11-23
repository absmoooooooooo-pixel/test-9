/* Finds user-facing English literals in JavaScript that are not yet in the
   translation dictionaries. Code, selectors and identifiers are filtered out. */
const fs = require("fs");
const path = require("path");

const LANGS = ["mr", "hi", "de", "es", "fr", "ja", "pt", "ar"];
const dicts = JSON.parse(
  fs.readFileSync("frontend/i18n/translations.js", "utf8")
    .match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]
);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) { if (!/node_modules|\.git/.test(p)) walk(p); continue; }
    if (!entry.name.endsWith(".js")) continue;
    if (/translations\.js$|i18n\.js$/.test(p)) continue;
    files.push(p);
  }
})("frontend");

function candidates(text) {
  const out = [];
  const re = /(["'])((?:\\.|(?!\1)[^\\\n])*?)\1/g;
  let m;
  while ((m = re.exec(text))) {
    let value = m[2];
    if (value.length < 4 || value.length > 400) continue;
    if (!/[a-z]{3,}/.test(value)) continue;
    if (!/\s/.test(value)) continue;                     // single tokens: labels, no sentences
    if (/[{}<>$`\\]/.test(value)) continue;              // interpolation or markup
    if (/^[a-z-]+$/.test(value)) continue;               // css classes / keys
    if (/^(https?:|\/|\.\/|\.\.\/|#)/.test(value)) continue;
    if (/^(aria|data|role|type|input|button|none|true|false|null|undefined)/.test(value)) continue;
    if (/(px|em|rem|rgba?|0px|flex|grid|block|absolute|relative)\b/.test(value) && !/[.!?]$/.test(value)) continue;
    if (/[=+*/^]/.test(value) && !/[.!?]$/.test(value)) continue;
    out.push(value.replace(/\\n/g, " ").replace(/\s+/g, " ").trim());
  }
  return out;
}

const found = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const value of candidates(text)) {
    if (!found.has(value)) found.set(value, new Set());
    found.get(value).add(file);
  }
}

function has(dict, key) {
  return (dict.strings && Object.prototype.hasOwnProperty.call(dict.strings, key)) ||
         (dict.terms && Object.prototype.hasOwnProperty.call(dict.terms, key)) ||
         (dict.templates && Object.prototype.hasOwnProperty.call(dict.templates, key));
}

const rows = [];
for (const [value, where] of found) {
  const missing = LANGS.filter((lang) => !has(dicts[lang] || {}, value));
  if (missing.length) rows.push({ value, missing: missing.length, where: [...where].slice(0, 2) });
}
rows.sort((a, b) => b.missing - a.missing || a.value.localeCompare(b.value));
fs.writeFileSync(".audit/js-audit.json", JSON.stringify(rows, null, 1));
console.log("js files", files.length, "literals", found.size, "untranslated", rows.length);
console.log(rows.slice(0, 40).map((r) => r.missing + " :: " + r.value + "   [" + r.where.join(", ") + "]").join("\n"));

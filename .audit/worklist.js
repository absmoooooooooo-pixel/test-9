const fs = require("fs");
const path = require("path");

const dicts = JSON.parse(
  fs.readFileSync("frontend/i18n/translations.js", "utf8")
    .match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]
);

const langs = ["mr", "hi", "de", "es", "fr", "ja", "pt", "ar"];

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&minus;/g, "−")
    .replace(/&times;/g, "×").replace(/&divide;/g, "÷").replace(/&sup2;/g, "²")
    .replace(/&sup3;/g, "³").replace(/&middot;/g, "·").replace(/&rho;/g, "ρ")
    .replace(/&larr;/g, "←").replace(/&rarr;/g, "→").replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–").replace(/&copy;/g, "©").replace(/&deg;/g, "°")
    .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”").replace(/&hellip;/g, "…").replace(/&frac12;/g, "½")
    .replace(/&pi;/g, "π").replace(/&approx;/g, "≈").replace(/&asymp;/g, "≈")
    .replace(/&radic;/g, "√").replace(/&le;/g, "≤").replace(/&ge;/g, "≥")
    .replace(/&ne;/g, "≠").replace(/&rArr;/g, "⇒").replace(/&deg;/g, "°")
    .replace(/&phi;/g, "φ").replace(/&theta;/g, "θ").replace(/&micro;/g, "µ")
    .replace(/\s+/g, " ").trim();
}

function useful(text) {
  if (!text || !/[A-Za-z]/.test(text)) return false;
  if (/^[A-Za-z0-9 .,+\-*/×÷=()²³%°′″/·−—–:;'"&]+$/.test(text) && !/[a-z]{4,}/.test(text)) return false;
  // at least one natural word (3+ lowercase letters)
  if (!/[a-z]{3,}/.test(text)) return false;
  if (/^(https?:|\/|#[a-z])/.test(text)) return false;
  if (text.length < 3) return false;
  return true;
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) { if (!/node_modules|\.git|\.audit/.test(p)) walk(p); }
    else if (entry.name.endsWith(".html") && !/__i18n-audit/.test(p)) files.push(p);
  }
})("frontend");
files.push("index.html");

const strings = new Map(); // text -> Set(file)
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  /* Attributes are collected from markup that keeps <svg>, because the
     engineering drawings carry their description in aria-label. */
  const html = raw.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const re = />([^<>]+)</g;
  let m;
  while ((m = re.exec(html))) {
    const text = decode(m[1]);
    if (useful(text)) {
      if (!strings.has(text)) strings.set(text, new Set());
      strings.get(text).add(file);
    }
  }
  const attrRe = /(?:placeholder|aria-label|title|alt)="([^"]+)"/g;
  while ((m = attrRe.exec(raw))) {
    const text = decode(m[1]);
    if (useful(text)) {
      const key = "@" + text;
      if (!strings.has(key)) strings.set(key, new Set());
      strings.get(key).add(file);
    }
  }
}

function hasIn(dict, text) {
  const entry = text.startsWith("@") ? text.slice(1) : text;
  return (dict.strings && Object.prototype.hasOwnProperty.call(dict.strings, entry)) ||
         (dict.terms && Object.prototype.hasOwnProperty.call(dict.terms, entry)) ||
         (dict.templates && Object.prototype.hasOwnProperty.call(dict.templates, entry));
}

const rows = [];
const missingByLang = {};
for (const l of langs) missingByLang[l] = [];

for (const [text, where] of strings) {
  if (hasIn(dicts.en, text)) continue; // already an interface key, translated elsewhere
  const missing = langs.filter(l => !hasIn(dicts[l], text));
  if (!missing.length) continue;
  rows.push({ text, missing, where: [...where] });
  for (const l of missing) missingByLang[l].push(text);
}

rows.sort((a, b) => b.missing.length - a.missing.length || a.text.localeCompare(b.text));
fs.writeFileSync(".audit/worklist.json", JSON.stringify(rows, null, 1));
fs.writeFileSync(".audit/worklist.txt", rows.map(r => `${r.missing.join(",")} :: ${r.text}`).join("\n"));

console.log("HTML files:", files.length);
console.log("User-facing strings:", strings.size);
console.log("Strings missing in at least one language:", rows.length);
for (const l of langs) console.log(`  ${l}: ${missingByLang[l].length} missing`);
console.log("Longest:", rows[0] && rows[0].text.slice(0, 120));

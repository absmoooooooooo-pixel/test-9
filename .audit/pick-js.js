/* Builds the extra JS strings list from the scan output. */
const fs = require("fs");

const rows = JSON.parse(fs.readFileSync(".audit/js-audit.json", "utf8"));
const existing = JSON.parse(fs.readFileSync(".audit/js-strings.json", "utf8"));
const seen = new Set(existing);

const NOISE = /display-mode|pointer:|prefers-|--[a-z]|__|\.js\b|https?:|=>|\bvar\b|\bfunction\b|\breturn\b|px\)|^\s*[.#\[]|[{}]/;

const picked = [];
for (const row of rows) {
  const value = row.value.trim();
  if (!value || seen.has(value)) continue;
  if (NOISE.test(value)) continue;
  if (!/[a-z]{4,}/.test(value)) continue;
  if (value.length > 600) continue;
  if ((value.match(/\s/g) || []).length < 1) continue;
  seen.add(value);
  picked.push(value);
}

fs.writeFileSync(".audit/js-strings-extra.json", JSON.stringify(picked, null, 1));
console.log("extra strings:", picked.length);
console.log(picked.slice(0, 12).join("\n---\n"));

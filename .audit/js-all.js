/* Extract every human-readable string literal from the calculator and shared
   scripts, so dynamically inserted sentences also reach the dictionaries. */
const fs = require("fs");
const path = require("path");

const ROOTS = ["frontend/calculators", "frontend/shared", "frontend/i18n"];
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js") && !/translations|i18n\.js|languages/.test(entry.name)) files.push(full);
  }
})(ROOTS[0]);
(function walk2(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk2(full);
    else if (entry.name.endsWith(".js") && !/translations|i18n\.js|languages/.test(entry.name)) files.push(full);
  }
})(ROOTS[1]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", divide: "÷", times: "×", minus: "−", sup2: "²", sup3: "³", sup1: "¹", frac12: "½", frac14: "¼", radic: "√", pi: "π", deg: "°", hellip: "…", ndash: "–", mdash: "—", rarr: "→", larr: "←", middot: "·", plusmn: "±", le: "≤", ge: "≥", ne: "≠", asymp: "≈", micro: "µ", oslash: "Ø", Oslash: "Ø", copy: "©", reg: "®", trade: "™", times: "×", bull: "•", prime: "′", Prime: "″", sum: "∑", infin: "∞", ang: "∠", part: "∂", int: "∫", there4: "∴", sim: "∼", cong: "≅", equiv: "≡", sub: "⊂", sup: "⊃", cap: "∩", cup: "∪", and: "∧", or: "∨", not: "¬", forall: "∀", exist: "∃", empty: "∅", nabla: "∇", isin: "∈", notin: "∉", ni: "∋", prod: "∏", minus: "−", lowbar: "_", lpar: "(", rpar: ")", comma: ",", period: ".", colon: ":", semi: ";", excl: "!", quest: "?", num: "#", dollar: "$", percnt: "%", ast: "*", plus: "+", equals: "=", sol: "/", bsol: "\\", verbar: "|", lsqb: "[", rsqb: "]", lbrack: "[", rbrack: "]", lcub: "{", rcub: "}", lbrace: "{", rbrace: "}", hat: "^", grave: "`", tilde: "~", hyphen: "-", dash: "-" };

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => (ENTITIES[name] !== undefined ? ENTITIES[name] : m));
}

function clean(raw) {
  let text = raw.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = decode(text);
  text = text.replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
  text = text.replace(/\\n|\\t|\\r/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

const SKIP = /\b(function|return|var|const|let|querySelector|addEventListener|prototype|undefined|null|true|false|innerHTML|textContent|classList|getElementById|Math\.|window\.|document\.|=>|==)\b/;
const results = new Map();

function consider(raw, file) {
  if (!raw || raw.length < 4) return;
  if (/[${}]/.test(raw)) return;
  if (/^[\w-]+$/.test(raw)) return;
  if (/^https?:|^\.\/|^\/|\.(js|css|png|svg|webp|json)$/i.test(raw)) return;
  const text = clean(raw);
  if (!text || text.length < 4) return;
  if (!/[A-Za-z]{3,}/.test(text)) return;
  if (SKIP.test(text)) return;
  if (!/ /.test(text)) return;                     // single tokens live in terms
  if (!results.has(text)) results.set(text, new Set());
  results.get(text).add(file);
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = file.replace(/\\/g, "/");
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.)*)`/g;
  let match;
  while ((match = re.exec(source))) {
    const raw = match[1] || match[2] || match[3] || "";
    consider(raw, rel);
  }
}

const out = [...results.entries()].map(([text, set]) => ({ text, files: [...set].slice(0, 3) }));
out.sort((a, b) => b.text.length - a.text.length);
fs.writeFileSync(".audit/js-all.json", JSON.stringify(out, null, 1), "utf8");
console.log("files", files.length, "strings", out.length);
console.log(out.slice(0, 6).map((r) => r.text.slice(0, 80)).join("\n"));

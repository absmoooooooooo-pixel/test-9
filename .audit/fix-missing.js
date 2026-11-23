/* One-off: fill the hand-checked gap list into the per-language caches. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const LANGS = ["mr", "hi", "de", "es", "fr", "ja", "pt", "ar"];
const rows = JSON.parse(fs.readFileSync(".audit/worklist.json", "utf8"));
const dicts = JSON.parse(
  fs.readFileSync("frontend/i18n/translations.js", "utf8")
    .match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]
);
const EXTRA = ["Deutsch", "Español", "Français", "Português", "Marathi", "Hindi",
  "English", "Japanese", "Arabic", "German", "French", "Spanish", "Portuguese",
  "Angle (°)", "© 2026 Jadhav Group of Industries"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(text, target) {
  const stamp = process.pid + "-" + Math.random().toString(36).slice(2);
  const inFile = path.join(os.tmpdir(), "mwx-in-" + stamp + ".txt");
  const outFile = path.join(os.tmpdir(), "mwx-out-" + stamp + ".json");
  fs.writeFileSync(inFile, text, "utf8");
  try {
    execFileSync("curl", ["-sS", "--max-time", "30", "--get",
      "https://clients5.google.com/translate_a/t",
      "--data-urlencode", "client=dict-chrome-ex",
      "--data-urlencode", "sl=en",
      "--data-urlencode", "tl=" + target,
      "--data-urlencode", "q@" + inFile,
      "-o", outFile], { maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    return Promise.reject(new Error("curl: " + (error.message || "").slice(0, 100)));
  }
  const body = fs.readFileSync(outFile, "utf8");
  [inFile, outFile].forEach((f) => { try { fs.unlinkSync(f); } catch (e) {} });
  if (!/^\s*\[/.test(body)) return Promise.reject(new Error("throttled"));
  const parsed = JSON.parse(body);
  const flat = Array.isArray(parsed[0])
    ? parsed[0].map((p) => p[0] || "").join("")
    : parsed.map((p) => (Array.isArray(p) ? p[0] : p) || "").join("");
  if (!flat) return Promise.reject(new Error("empty"));
  return Promise.resolve(flat);
}

async function withRetry(text, lang) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await request(text, lang);
    } catch (error) {
      if (attempt === 6) throw error;
      await sleep(6000 * attempt);
    }
  }
}

(async () => {
  for (const lang of LANGS) {
    const cacheFile = ".audit/cache-" + lang + ".json";
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const dict = dicts[lang] || {};
    const has = (k) => (dict.strings && dict.strings[k]) || (dict.terms && dict.terms[k]) ||
      (dict.templates && dict.templates[k]) || cache[k];
    const todo = [];
    for (const row of rows) {
      const key = row.text.replace(/^@/, "");
      if (!has(key) && !todo.includes(key)) todo.push(key);
    }
    for (const key of EXTRA) if (!has(key) && !todo.includes(key)) todo.push(key);
    if (!todo.length) { console.log(lang, "nothing to do"); continue; }
    let done = 0;
    for (let i = 0; i < todo.length; i += 10) {
      const slice = todo.slice(i, i + 10);
      const joined = slice.map((s) => s.replace(/\s+/g, " ").trim()).join(" ||| ");
      let out;
      try {
        out = await withRetry(joined, lang);
      } catch (error) {
        console.log(lang, "FAILED batch at", i, error.message);
        continue;
      }
      const parts = out.split(/\s*\|\|\|\s*/);
      if (parts.length !== slice.length) { console.log(lang, "split mismatch", parts.length, slice.length); continue; }
      slice.forEach((key, idx) => { cache[key] = parts[idx].trim(); done++; });
      await sleep(150);
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
    console.log(lang, "fixed", done, "of", todo.length);
  }
})();

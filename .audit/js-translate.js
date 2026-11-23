/* Translate the JS-derived sentences that are missing from each dictionary. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const LANGS = ["mr", "hi", "de", "es", "fr", "ja", "pt", "ar"];
const list = JSON.parse(fs.readFileSync(".audit/js-all.json", "utf8"))
  .map((row) => row.text)
  .filter((text) => !/&[a-z][a-z0-9]*;/i.test(text));   // undecoded entities never match runtime text
const dicts = JSON.parse(
  fs.readFileSync("frontend/i18n/translations.js", "utf8")
    .match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(text, target) {
  const stamp = process.pid + "-" + Math.random().toString(36).slice(2);
  const inFile = path.join(os.tmpdir(), "js-in-" + stamp + ".txt");
  const outFile = path.join(os.tmpdir(), "js-out-" + stamp + ".json");
  fs.writeFileSync(inFile, text, "utf8");
  try {
    execFileSync("curl", ["-sS", "--max-time", "40", "--get",
      "https://clients5.google.com/translate_a/t",
      "--data-urlencode", "client=dict-chrome-ex",
      "--data-urlencode", "sl=en",
      "--data-urlencode", "tl=" + target,
      "--data-urlencode", "q@" + inFile,
      "-o", outFile], { maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    return Promise.reject(new Error("curl"));
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
      await sleep(5000 * attempt);
    }
  }
}

(async () => {
  for (const lang of LANGS) {
    const cacheFile = ".audit/cache-" + lang + ".json";
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const dict = dicts[lang] || {};
    const fromDict = (k) => (dict.strings && dict.strings[k]) || (dict.terms && dict.terms[k]);
    const todo = list.filter((text) => !fromDict(text) && !cache[text]);
    if (!todo.length) { console.log(lang, "nothing to do"); continue; }
    let done = 0;
    for (let i = 0; i < todo.length; i += 8) {
      const slice = todo.slice(i, i + 8);
      const joined = slice.join(" ||| ");
      let out;
      try {
        out = await withRetry(joined, lang);
      } catch (error) {
        console.log(lang, "FAILED at", i, error.message);
        continue;
      }
      const parts = out.split(/\s*\|\|\|\s*/);
      if (parts.length !== slice.length) {
        /* The service sometimes merges or splits a batch; fall back to one
           request per string so nothing is dropped. */
        for (const key of slice) {
          try {
            cache[key] = (await withRetry(key, lang)).trim();
            done += 1;
          } catch (error) {
            console.log(lang, "FAILED single", error.message);
          }
          await sleep(120);
        }
        continue;
      }
      slice.forEach((key, idx) => { cache[key] = parts[idx].trim(); done += 1; });
      if (done % 80 === 0) console.log(lang, done + "/" + todo.length);
      await sleep(120);
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
    console.log(lang, "done", done, "of", todo.length);
  }
})();

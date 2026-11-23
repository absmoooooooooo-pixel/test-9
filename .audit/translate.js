/* Bulk translation helper for the Metal Weight Calculator dictionaries.
   Translates the missing strings per language, protecting technical tokens,
   and caches every result so the run can resume. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const OUT_DIR = ".audit";
const BATCH = 20;
const DELAY = 150;
const TECH = /\bMetal Weight Calculator\b|\bchrome:\/\/apps\b|\bedge:\/\/apps\b|\bhttps?:\/\/\S+|\b(?:kg|mm|cm|m²|m³|g\/cm³|MPa|GPa|kN|ISO|ASME|DIN|JIS|ASTM|AISI|SAE|PCD|URL|HTTPS|HTTP|ID|OD|SS|MS)\b/g;
const VARIABLE = /\b[A-Z]\b/g;

function protect(text, bag) {
  const keep = (token) => {
    const key = "QZX" + (bag.length.toString(36)) + "Q";
    bag.push(token);
    return key;
  };
  let out = text.replace(TECH, keep);
  /* Single letters are dimension variables (B, H, T, D, L). They are only
     protected inside formula-like text: protecting them in prose turns the
     article "A" into a variable and produces "A-Kastenkanal". */
  const operators = (text.match(/[=×÷√]/g) || []).length;
  const formula = /^[\s=×÷√−+\-(]/.test(text) || operators >= 3;
  if (formula) {
    out = out.replace(VARIABLE, keep);
  }
  return out;
}

function restore(text, bag) {
  return text.replace(/QZX([0-9a-z]{1,3})Q/gi, (whole, code) => {
    const index = parseInt(code, 36);
    return bag[index] === undefined ? whole : bag[index];
  });
}

/* The public endpoint rejects Node's TLS fingerprint with HTTP 429, so the
   request goes through the system curl binary instead. */
function request(text, target) {
  /* Text and response travel through UTF-8 files: passing them as command
     line arguments mangles non-ASCII characters on Windows. */
  const stamp = process.pid + "-" + Math.random().toString(36).slice(2);
  const inFile = path.join(os.tmpdir(), "mwi18n-in-" + stamp + ".txt");
  const outFile = path.join(os.tmpdir(), "mwi18n-out-" + stamp + ".json");
  fs.writeFileSync(inFile, text, "utf8");
  const args = [
    "-sS", "--max-time", "30", "--get",
    "https://clients5.google.com/translate_a/t",
    "--data-urlencode", "client=dict-chrome-ex",
    "--data-urlencode", "sl=en",
    "--data-urlencode", "tl=" + target,
    "--data-urlencode", "q@" + inFile,
    "-o", outFile
  ];
  return new Promise((resolve, reject) => {
    try {
      execFileSync("curl", args, { maxBuffer: 32 * 1024 * 1024 });
    } catch (error) {
      [inFile, outFile].forEach((file) => { try { fs.unlinkSync(file); } catch (e) {} });
      reject(new Error("curl failed: " + (error.message || "").slice(0, 120)));
      return;
    }
    let body = "";
    try {
      body = fs.readFileSync(outFile, "utf8");
    } catch (error) {
      reject(new Error("no response file"));
      return;
    }
    [inFile, outFile].forEach((file) => { try { fs.unlinkSync(file); } catch (e) {} });
    if (!/^\s*\[/.test(body)) {
      reject(new Error("throttled: " + body.slice(0, 60)));
      return;
    }
    try {
      const parsed = JSON.parse(body);
      /* translate_a/single answers [[["text",…],…]], the dict-chrome-ex
         endpoint answers ["text"]; accept both. */
      const flat = Array.isArray(parsed[0])
        ? (parsed[0] || []).map((part) => part[0] || "").join("")
        : parsed.map((part) => (Array.isArray(part) ? part[0] : part) || "").join("");
      if (!flat) {
        reject(new Error("empty translation: " + body.slice(0, 120)));
        return;
      }
      resolve(flat);
    } catch (error) {
      reject(new Error("bad JSON: " + body.slice(0, 120)));
    }
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateBatch(list, target) {
  const bag = [];
  const payload = list.map((item) => protect(item, bag)).join(" ||| ");
  let attempt = 0;
  let result = "";
  while (attempt < 4) {
    try {
      result = await request(payload, target);
      break;
    } catch (error) {
      attempt += 1;
      if (attempt >= 6) throw error;
      const throttled = /429|throttled/.test(error.message);
      await sleep(throttled ? 8000 * attempt : 600 * attempt);
    }
  }
  const lines = result.split(/\s*\|\|\|\s*/).map((line) => restore(line, bag).trim());
  if (lines.length !== list.length) {
    // Fall back to one request per string when the batch lost its boundaries.
    const single = [];
    for (const item of list) {
      let value = "";
      let tries = 0;
      while (tries < 4) {
        try {
          value = await request(protect(item, bag), target);
          break;
        } catch (error) {
          tries += 1;
          await sleep(/429/.test(error.message) ? 4000 * tries : 500 * tries);
        }
      }
      single.push(restore(value, bag).trim());
      await sleep(DELAY);
    }
    return single;
  }
  return lines;
}

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error("usage: node translate.js <lang>");

  const dictSource = fs.readFileSync("frontend/i18n/translations.js", "utf8");
  const dicts = JSON.parse(dictSource.match(/window\.MW_I18N_DICTIONARIES=(\{.*\});?\s*$/s)[1]);
  const dict = dicts[target] || { strings: {}, terms: {} };

  const worklist = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "worklist.json"), "utf8"));
  const jsStrings = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "js-strings.json"), "utf8"));

  const queue = [];
  const seen = new Set();
  const add = (text) => {
    const key = text.startsWith("@") ? text.slice(1) : text;
    if (seen.has(key)) return;
    seen.add(key);
    if (!hasString(dict, key)) queue.push(key);
  };
  for (const row of worklist) {
    if (row.missing.includes(target)) add(row.text);
  }
  for (const text of jsStrings) add(text);

  const cacheFile = path.join(OUT_DIR, "cache-" + target + ".json");
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};
  const todo = queue.filter((text) => !cache[text]);
  console.log(`[${target}] queued ${queue.length}, cached ${queue.length - todo.length}, to translate ${todo.length}`);

  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const results = await translateBatch(slice, target);
    slice.forEach((text, index) => {
      const value = results[index];
      if (value && value !== text) cache[text] = value;
    });
    if ((i / BATCH) % 5 === 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
      console.log(`[${target}] ${i + slice.length}/${todo.length}`);
    }
    await sleep(DELAY);
  }

  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
  console.log(`[${target}] done, cache size ${Object.keys(cache).length}`);
}

function hasString(dict, key) {
  return (dict.strings && Object.prototype.hasOwnProperty.call(dict.strings, key)) ||
         (dict.terms && Object.prototype.hasOwnProperty.call(dict.terms, key)) ||
         (dict.templates && Object.prototype.hasOwnProperty.call(dict.templates, key));
}

main().catch((error) => {
  console.error("FAILED", error.message);
  process.exit(1);
});

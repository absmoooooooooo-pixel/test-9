#!/usr/bin/env python3
"""Round 2 harness: repeated language switching and localized number tests."""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path

import harness

ROOT = Path(harness.WORKSPACE)
WRAPPER_NAME = "__mw_round2_harness.html"
CYCLE = ["en", "hi", "mr", "ja", "zh", "de", "es", "fr", "pt", "ar",
         "en", "ja", "ar", "hi", "mr", "en"]
PAGES = sorted(
    p.relative_to(ROOT).as_posix()
    for p in (ROOT / "frontend" / "calculators").glob("*/index.html")
)
VALUES = {
    "a": "100", "b": "50", "h": "30", "t": "10", "tf": "10", "tw": "10",
    "length": "1000", "width": "100", "diameter": "100", "thickness": "10",
    "od": "100", "id": "50", "wall": "5", "holes": "4", "holeDiameter": "10",
    "pcd": "80", "legA": "50", "legB": "50", "height": "100",
    "largeDiameter": "200", "smallDiameter": "100", "density": "7.85",
    "customDensity": "7.85", "quantity": "10",
}

WRAPPER = r"""<!doctype html>
<meta charset="utf-8">
<title>round 2 harness</title>
<pre id="result">PENDING</pre>
<iframe id="f" style="width:1280px;height:900px;border:0"></iframe>
<script>
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  var page = q.get("page") || "index.html";
  var cycle = (q.get("cycle") || "en").split(",").filter(Boolean);
  var values = {};
  try { values = JSON.parse(q.get("values") || "{}"); } catch (e) {}
  var frame = document.getElementById("f");
  var result = document.getElementById("result");
  var out = { mode: "switch", page: page, steps: [], checks: [], errors: [] };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function ready(win, ms) {
    var deadline = Date.now() + (ms || 6000);
    while (Date.now() < deadline) {
      if (win.document && win.document.readyState === "complete" && win.MW_I18N) { return true; }
      await sleep(20);
    }
    return false;
  }

  function canonical(value, win) {
    if (value === undefined || value === null || value === "") { return null; }
    var match = String(value).match(/[-+]?[0-9\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\uFF10-\uFF19.,\u066B\u066C]+/);
    if (!match) { return String(value).trim(); }
    var parsed = win && win.MWNumber ? win.MWNumber.parse(match[0]) : NaN;
    return isFinite(parsed) ? parsed : match[0];
  }

  var TECHNICAL_ALLOW = ["KG", "LB", "kg", "lb", "mm", "MM", "in", "cm",
    "pcs", "pc", "OK", "QTY", "A", "B", "D", "H", "L", "R", "T", "W",
    "d", "r", "rho", "\u03C1", "\u03C0", "\u2192", "\u2190", "\u00D7", "\u21BA"];
  function isTechnical(value) {
    var s = String(value || "").trim();
    if (!s) { return true; }
    if (/[0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\uFF10-\uFF19]/.test(s)) { return true; }
    if (/^[A-Za-z0-9\s()\[\]+\u2212\u2013\u00D7\u00F7\u2192\u00D8\u03C0\u00B0\u00B3\u00B2%/=:,.!?'\u2019-]+$/.test(s) && !/[A-Za-z]{4,}/.test(s)) { return true; }
    if (TECHNICAL_ALLOW.indexOf(s) !== -1) { return true; }
    if (/^[\d\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\uFF10-\uFF19.,\s+\-×xX()%/°³²]+$/.test(s)) { return true; }
    if (/^[A-Za-z0-9\s/.,+()\-–×°³²%]+$/.test(s) && /\d/.test(s) && !/[a-z]{4,}/.test(s)) { return true; }
    return false;
  }

  function collect(win, lang) {
    var d = win.document;
    var inputs = Array.prototype.map.call(d.querySelectorAll("input, textarea"), function (el) {
      var read = win.MWNumber && win.MWNumber.readInputValue
        ? win.MWNumber.readInputValue(el) : el.value;
      return { id: el.id, displayed: el.value, canonical: canonical(read, win),
               hasRaw: el.hasAttribute("data-nk-raw") };
    });
    var results = {};
    Array.prototype.forEach.call(
      d.querySelectorAll("[id*=weight i], [id*=result i], [id*=total i], [id*=density i], [id*=kg i], [id*=lb i]"),
      function (el) {
        if (!el.id) { return; }
        var raw = el.value !== undefined ? el.value : el.textContent;
        if (!/[0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\uFF10-\uFF19]/.test(raw)) { return; }
        results[el.id] = canonical(raw, win);
      }
    );
    var keypad = Array.prototype.map.call(
      d.querySelectorAll(".nk-key, .nk-btn, [data-nk-key], .numeric-keypad button"),
      function (el) { return (el.textContent || "").trim(); }
    ).filter(Boolean);
    var missing = win.MW_I18N.missingTranslations
      ? win.MW_I18N.missingTranslations() : [];
    return {
      lang: lang, actualLang: win.MW_I18N.language, dir: d.documentElement.dir,
      inputs: inputs, results: results, keypad: keypad, missing: missing,
      localizedDigits: inputs.some(function (i) {
        return i.displayed && i.canonical !== null &&
          win.MWNumber && win.MWNumber.localizeDigits &&
          i.displayed === win.MWNumber.localizeDigits(String(i.canonical), lang) &&
          i.displayed !== String(i.canonical);
      })
    };
  }

  function setValues(win) {
    Object.keys(values).forEach(function (id) {
      var el = win.document.getElementById(id);
      if (!el) { return; }
      if (win.MWNumber && win.MWNumber.setInputValue) {
        win.MWNumber.setInputValue(el, values[id]);
      } else {
        el.value = values[id];
      }
      el.dispatchEvent(new win.Event("input", { bubbles: true }));
      el.dispatchEvent(new win.Event("change", { bubbles: true }));
    });
  }

  function clickCalculate(win) {
    var candidates = Array.prototype.slice.call(
      win.document.querySelectorAll("button, input[type=button], a[role=button]")
    );
    var target = candidates.find(function (el) {
      return /calculate/i.test(el.id || "") || /calculate/i.test(el.textContent || "");
    });
    if (target) { target.click(); return true; }
    return false;
  }

  function check(name, pass, detail) {
    out.checks.push({ name: name, pass: !!pass, detail: detail || "" });
  }

  function sameResults(base, step) {
    var diffs = [];
    Object.keys(base).forEach(function (id) {
      var a = base[id], b = step[id];
      var ok = a === b || (typeof a === "number" && typeof b === "number" &&
        Math.abs(a - b) <= Math.max(0.000001, Math.abs(a) * 0.000001));
      if (!ok) { diffs.push(id + ":" + a + "!=" + b); }
    });
    return diffs;
  }

  frame.addEventListener("load", async function () {
    try {
      var win = frame.contentWindow;
      if (!(await ready(win))) { throw new Error("runtime not ready"); }
      var style = win.document.createElement("style");
      style.textContent = "* { transition: none !important; animation: none !important; }";
      win.document.head.appendChild(style);
      setValues(win);
      await sleep(80);
      clickCalculate(win);
      await sleep(120);
      var baseline = collect(win, win.MW_I18N.language);
      var baseResults = baseline.results;
      var baseInputs = {};
      baseline.inputs.forEach(function (i) { baseInputs[i.id] = i.canonical; });
      out.steps.push(baseline);

      var resultDiffs = [], inputDiffs = [], missingDiffs = [], dirDiffs = [];
      var langDiffs = [], digitChecks = [];
      for (var i = 0; i < cycle.length; i += 1) {
        var lang = cycle[i];
        if (win.MW_I18N.clearMissingTranslations) { win.MW_I18N.clearMissingTranslations(); }
        await win.MW_I18N.switchTo(lang);
        await sleep(70);
        setValues(win);
        await sleep(50);
        clickCalculate(win);
        await sleep(90);
        var step = collect(win, lang);
        out.steps.push(step);
        if (step.actualLang !== lang) { langDiffs.push(i + ":" + step.actualLang + "!=" + lang); }
        var expectedDir = lang === "ar" ? "rtl" : "ltr";
        if (step.dir !== expectedDir) { dirDiffs.push(i + ":" + step.dir); }
        resultDiffs = resultDiffs.concat(sameResults(baseResults, step.results).map(function (d) { return lang + ":" + d; }));
        step.inputs.forEach(function (input) {
          if (baseInputs[input.id] !== input.canonical) {
            inputDiffs.push(lang + ":" + input.id + ":" + baseInputs[input.id] + "!=" + input.canonical);
          }
        });
        var realMissing = step.missing.filter(function (m) { return !isTechnical(m); });
        if (realMissing.length) { missingDiffs.push(lang + ":" + realMissing.slice(0, 3).join("|")); }
        if (["hi", "mr", "ja", "ar"].indexOf(lang) !== -1 &&
            step.inputs.some(function (input) { return input.hasRaw; })) {
          digitChecks.push({ lang: lang, localized: step.localizedDigits });
        }
      }
      check("language switches applied", !langDiffs.length, langDiffs.slice(0, 5).join(", "));
      check("direction after repeated switches", !dirDiffs.length, dirDiffs.slice(0, 5).join(", "));
      check("results stable after repeated switches", !resultDiffs.length, resultDiffs.slice(0, 5).join(", "));
      check("input values preserved", !inputDiffs.length, inputDiffs.slice(0, 5).join(", "));
      check("no missing translations", !missingDiffs.length, missingDiffs.slice(0, 5).join(", "));
      check("localized digits displayed", digitChecks.every(function (d) { return d.localized; }),
            JSON.stringify(digitChecks.filter(function (d) { return !d.localized; }).slice(0, 5)));
    } catch (error) {
      out.errors.push(String(error && error.stack || error));
    }
    result.textContent = JSON.stringify(out);
    result.setAttribute("data-done", "1");
  });
  frame.src = page + (page.indexOf("?") === -1 ? "?" : "&") + "round2=1";
})();
</script>
"""


def run(page: str) -> dict:
    wrapper_path = ROOT / WRAPPER_NAME
    wrapper_path.write_text(WRAPPER, encoding="utf-8")
    params = urllib.parse.urlencode({
        "page": page, "cycle": ",".join(CYCLE), "values": json.dumps(VALUES),
    })
    url = f"{harness.BASE}/{WRAPPER_NAME}?{params}"
    user_dir = tempfile.mkdtemp(prefix="mw-round2-")
    cmd = [
        harness.CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--disable-dev-shm-usage", "--disable-extensions",
        "--disable-background-networking", "--disable-component-update",
        "--disable-default-apps", "--no-first-run", "--no-default-browser-check",
        "--disable-sync",
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
        f"--user-data-dir={user_dir}",
        "--virtual-time-budget=60000", "--dump-dom", url,
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=180,
            encoding="utf-8", errors="replace",
        )
    finally:
        wrapper_path.unlink(missing_ok=True)
    match = re.search(r'<pre id="result"[^>]*>(.*?)</pre>', proc.stdout, re.S)
    if not match:
        return {"errors": [f"no result in Chrome output: {proc.stderr[-600:]}"]}
    payload = html.unescape(match.group(1)).strip()
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return {"errors": [f"invalid harness JSON: {payload[:600]}", proc.stderr[-600:]]}


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(harness.PORT), "--bind", "127.0.0.1",
         "--directory", str(ROOT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    results = []
    try:
        time.sleep(1.0)
        for page in PAGES:
            data = run(page)
            results.append(data)
            failed = [c for c in data.get("checks", []) if not c.get("pass")]
            print(f"{page:60s} checks={len(data.get('checks', []))} "
                  f"failed={len(failed)} errors={len(data.get('errors', []))}", flush=True)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    out_path = Path(__file__).with_name("round2_results.json")
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(r.get("checks", [])) for r in results)
    failed = sum(1 for r in results for c in r.get("checks", []) if not c.get("pass"))
    errors = sum(1 for r in results if r.get("errors"))
    print(json.dumps({"calculators": len(PAGES), "switches_per_page": len(CYCLE),
                      "total_checks": total, "failed_checks": failed,
                      "pages_with_errors": errors, "results_file": str(out_path)},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

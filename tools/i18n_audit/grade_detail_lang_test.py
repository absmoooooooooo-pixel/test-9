#!/usr/bin/env python3
"""Regression test: the material detail box follows the global language switch."""
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

ROOT = harness.WORKSPACE
WRAPPER_NAME = "__mw_grade_lang_test.html"
LANGS = ["ja", "hi", "de", "es", "ar"]
SAMPLE_MATERIALS = [("carbon-steel", 0), ("stainless-steel", 0)]
UI_KEYS = {
    "Grade Overview", "Material Density", "Chemical Composition",
    "Mechanical Properties", "Common Industrial Applications", "Key Features",
    "Applicable Standards", "Material", "density", "Typical density:",
    "Representative published value for this grade family.",
    "Typical value for the parent material; the grade standard does not specify a density.",
    "Overview is not documented in this reference for this grade.",
    "Chemical composition", "Mechanical properties", "Key features",
    "is not documented in this reference. Verify against the applicable standard or supplier datasheet.",
    "Close grade details", "Show full grade details.", "No materials found",
    "Common Applications",
}


def translatable_keys() -> list[str]:
    data = json.loads((ROOT / "tools/i18n_audit/grade_strings.json").read_text(encoding="utf-8"))
    keys = set(UI_KEYS)
    for values in data.values():
        keys.update(value for value in values if value)
    return sorted(keys)


WRAPPER = r"""<!doctype html>
<meta charset="utf-8">
<pre id="result">PENDING</pre>
<iframe id="f" style="width:1280px;height:900px;border:0"></iframe>
<script>
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  var langs = (q.get("langs") || "ja,hi,de,es,ar").split(",").filter(Boolean);
  var samples = JSON.parse(q.get("samples") || "[]");
  var TRANSLATABLE = new Set(__TRANSLATABLE_JSON__);
  var frame = document.getElementById("f");
  var result = document.getElementById("result");
  var out = { snapshots: [], checks: [], errors: [] };
  var ENGLISH_UI = [
    "Grade Overview", "Material Density", "Chemical Composition",
    "Mechanical Properties", "Common Industrial Applications", "Key Features",
    "Applicable Standards", "Close grade details", "Typical density:",
    "Overview is not documented", "is not documented in this reference",
    "Show full grade details.", "No materials found"
  ];

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function check(name, pass, detail) {
    out.checks.push({ name: name, pass: !!pass, detail: detail || "" });
  }

  function load(url) {
    return new Promise(function (resolve, reject) {
      frame.addEventListener("load", function () { resolve(); }, { once: true });
      frame.src = url;
    });
  }

  async function ready(win) {
    var deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      var select = win.document.getElementById("materialGrades");
      if (win.document.readyState === "complete" && win.MW_I18N && select && select.options.length) {
        return true;
      }
      await sleep(20);
    }
    return false;
  }

  function snap(win, label) {
    var info = win.document.getElementById("gradeInfo");
    var selected = win.document.querySelector(".grade-card.is-selected");
    return {
      label: label,
      lang: win.MW_I18N ? win.MW_I18N.language : "",
      text: info ? (info.innerText || info.textContent || "") : "",
      hidden: info ? !!info.hidden : true,
      selectedGrade: selected ? selected.getAttribute("data-grade") : null,
      selectedIndex: selected ? Number(selected.getAttribute("data-index")) : -1,
      missing: win.MW_I18N && win.MW_I18N.missingTranslations
        ? win.MW_I18N.missingTranslations() : [],
      meaningfulMissing: win.MW_I18N && win.MW_I18N.missingTranslations
        ? win.MW_I18N.missingTranslations().filter(function (key) {
            return TRANSLATABLE.has(key);
          }) : []
    };
  }

  async function openGrade(win, materialKey, index) {
    var select = win.document.getElementById("materialGrades");
    if (!select) { throw new Error("material select missing"); }
    select.value = materialKey;
    select.dispatchEvent(new win.Event("change", { bubbles: true }));
    await sleep(80);
    var cards = win.document.querySelectorAll(".grade-card");
    if (!cards[index]) { throw new Error("no grade card " + index + " for " + materialKey); }
    cards[index].click();
    await sleep(100);
  }

  function residualEnglish(text) {
    return ENGLISH_UI.filter(function (phrase) { return text.indexOf(phrase) !== -1; });
  }

  (async function () {
    try {
      await load("index.html?gradeLangTest=1");
      var win = frame.contentWindow;
      if (!(await ready(win))) { throw new Error("runtime/material table not ready"); }

      for (var s = 0; s < samples.length; s += 1) {
        var material = samples[s][0];
        var index = samples[s][1];
        await win.MW_I18N.switchTo("en");
        await sleep(80);
        await openGrade(win, material, index);
        var base = snap(win, material + ":en");
        out.snapshots.push(base);
        check(material + " opens in English", base.lang === "en" && !base.hidden &&
          !!base.selectedGrade && base.text.toLowerCase().indexOf("grade overview") !== -1,
          base.lang + " hidden=" + base.hidden + " grade=" + base.selectedGrade);

        for (var i = 0; i < langs.length; i += 1) {
          var lang = langs[i];
          await win.MW_I18N.switchTo(lang);
          await sleep(120);
          var step = snap(win, material + ":" + lang);
          out.snapshots.push(step);
          check(material + " " + lang + " language applied", step.lang === lang, step.lang);
          check(material + " " + lang + " panel still open", !step.hidden,
            "hidden=" + step.hidden);
          check(material + " " + lang + " material unchanged",
            step.selectedGrade === base.selectedGrade && step.selectedIndex === base.selectedIndex,
            step.selectedGrade + " vs " + base.selectedGrade);
          check(material + " " + lang + " text translated", step.text !== base.text &&
            residualEnglish(step.text).length === 0,
            "same=" + (step.text === base.text) + " residual=" + residualEnglish(step.text).join("|"));
          check(material + " " + lang + " no missing keys", step.meaningfulMissing.length === 0,
            step.meaningfulMissing.slice(0, 5).join("|"));
        }
      }

      /* Walk the whole database so no material/grade family is left behind. */
      var keys = [];
      Object.keys(win.MW_MATERIALS || {}).forEach(function (key) {
        if ((win.MW_GRADE_DATABASE.materials || []).some(function (m) {
          return m.key === key && m.grades && m.grades.length;
        })) { keys.push(key); }
      });
      for (var k = 0; k < keys.length; k += 1) {
        await win.MW_I18N.switchTo("en");
        await openGrade(win, keys[k], 0);
        var english = snap(win, keys[k] + ":en-all");
        await win.MW_I18N.switchTo("ja");
        await sleep(80);
        var japanese = snap(win, keys[k] + ":ja-all");
        out.snapshots.push(english, japanese);
        check(keys[k] + " all-materials ja translated", japanese.text !== english.text &&
          !japanese.hidden && japanese.selectedGrade === english.selectedGrade &&
          residualEnglish(japanese.text).length === 0,
          "same=" + (japanese.text === english.text) + " grade=" + japanese.selectedGrade);
      }
    } catch (error) {
      out.errors.push(String(error && error.stack || error));
    }
    result.textContent = JSON.stringify(out);
    result.setAttribute("data-done", "1");
  })();
})();
</script>
"""


def run() -> dict:
    wrapper_path = ROOT / WRAPPER_NAME
    wrapper = WRAPPER.replace(
        "__TRANSLATABLE_JSON__",
        json.dumps(translatable_keys(), ensure_ascii=False),
    )
    wrapper_path.write_text(wrapper, encoding="utf-8")
    params = urllib.parse.urlencode({
        "langs": ",".join(LANGS),
        "samples": json.dumps(SAMPLE_MATERIALS),
    })
    url = f"{harness.BASE}/{WRAPPER_NAME}?{params}"
    user_dir = tempfile.mkdtemp(prefix="mw-grade-lang-")
    cmd = [
        harness.CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--disable-dev-shm-usage", "--disable-extensions",
        "--disable-background-networking", "--disable-component-update",
        "--disable-default-apps", "--no-first-run", "--no-default-browser-check",
        "--disable-sync",
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
        f"--user-data-dir={user_dir}",
        "--virtual-time-budget=120000", "--dump-dom", url,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=240,
                              encoding="utf-8", errors="replace")
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
    try:
        time.sleep(1.0)
        data = run()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    out_path = Path(__file__).with_name("grade_detail_lang_results.json")
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    failed = [c for c in data.get("checks", []) if not c.get("pass")]
    print(json.dumps({
        "checks": len(data.get("checks", [])),
        "failed": len(failed),
        "errors": data.get("errors", []),
        "results_file": str(out_path),
    }, ensure_ascii=False, indent=2))
    for item in failed[:20]:
        print("FAIL", item["name"], "|", item.get("detail", "")[:300])


if __name__ == "__main__":
    main()

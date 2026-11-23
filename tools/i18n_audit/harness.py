#!/usr/bin/env python3
"""Generic Chrome harness for the global i18n audit.

Serves the workspace over localhost, loads a real page in a same-origin
iframe, drives window.MW_I18N.switchTo(), and captures DOM/input/result state
as JSON via --dump-dom. Product files are never modified by this harness.
"""
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

WORKSPACE = Path(r"A:\SAN\P2\NEW 23-11-2026\START 23-11-2026")
WRAPPER_NAME = "__mw_i18n_harness.html"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 8765
BASE = f"http://127.0.0.1:{PORT}"

WRAPPER = r"""<!doctype html>
<meta charset="utf-8">
<title>i18n harness</title>
<pre id="result">PENDING</pre>
<iframe id="f" style="width:1280px;height:900px;border:0"></iframe>
<script>
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  var page = q.get("page") || "index.html";
  var langs = (q.get("langs") || "en").split(",").filter(Boolean);
  var mode = q.get("mode") || "audit";
  var values = {};
  try { values = JSON.parse(q.get("values") || "{}"); } catch (e) {}
  var frame = document.getElementById("f");
  var result = document.getElementById("result");
  var out = { mode: mode, page: page, snapshots: [], errors: [] };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function ready(win, ms) {
    var deadline = Date.now() + (ms || 4000);
    while (Date.now() < deadline) {
      if (win.document && win.document.readyState === "complete" && win.MW_I18N) {
        return true;
      }
      await sleep(20);
    }
    return false;
  }

  function visibleText(win) {
    var d = win.document;
    var skip = ".lang-switch, script, style, textarea, code, pre, kbd, samp, [data-i18n-skip]";
    var walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT, null);
    var texts = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var el = node.parentElement;
      if (!el || !el.closest || el.closest(skip)) { continue; }
      var value = node.nodeValue.trim();
      if (value) { texts.push(value); }
    }
    return texts;
  }

  function collect(win, label) {
    var d = win.document;
    var inputs = Array.prototype.map.call(d.querySelectorAll("input, textarea"), function (el) {
      return { id: el.id, type: el.type, value: el.value, placeholder: el.placeholder,
               raw: el.getAttribute("data-nk-raw"), readOnly: !!el.readOnly };
    });
    var buttons = Array.prototype.map.call(d.querySelectorAll("button, a[role=button], summary"), function (el) {
      return { id: el.id, text: (el.innerText || el.textContent || "").trim(),
               title: el.title || "", aria: el.getAttribute("aria-label") || "" };
    });
    var selects = Array.prototype.map.call(d.querySelectorAll("select"), function (el) {
      return { id: el.id, value: el.value,
               options: Array.prototype.map.call(el.options, function (o) { return o.text; }) };
    });
    var results = {};
    Array.prototype.forEach.call(
      d.querySelectorAll("[id*=weight i], [id*=result i], [id*=total i], [id*=density i], [id*=kg i], [id*=lb i]"),
      function (el) {
        if (!el.id) { return; }
        results[el.id] = (typeof el.value === "string" ? el.value : el.textContent || "").trim();
      }
    );
    var canonicalResults = {};
    Object.keys(results).forEach(function (id) {
      var raw = results[id];
      var match = String(raw).match(/[-+0-9\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\uFF10-\uFF19.,\u066B\u066C]+/);
      if (!match) { return; }
      if (win.MWNumber && typeof win.MWNumber.parse === "function") {
        var parsed = win.MWNumber.parse(match[0]);
        if (isFinite(parsed)) { canonicalResults[id] = parsed; return; }
      }
      canonicalResults[id] = match[0];
    });

    var history = [];
    try {
      history = JSON.parse(win.localStorage.getItem("jadhav-engineering:calculation-history:global:v1") || "[]");
    } catch (e) {}
    var missing = [];
    if (win.MW_I18N && typeof win.MW_I18N.missingTranslations === "function") {
      missing = win.MW_I18N.missingTranslations();
    }
    var keypad = Array.prototype.map.call(
      d.querySelectorAll(".nk-key, .nk-btn, [data-nk-key], .numeric-keypad button"),
      function (el) { return (el.textContent || "").trim(); }
    ).filter(Boolean);
    return {
      label: label,
      lang: win.MW_I18N ? win.MW_I18N.language : d.documentElement.lang,
      dir: d.documentElement.dir,
      title: d.title,
      texts: visibleText(win),
      inputs: inputs,
      buttons: buttons,
      selects: selects,
      results: results,
      canonicalResults: canonicalResults,
      historyCount: Array.isArray(history) ? history.length : 0,
      history: Array.isArray(history) ? history.slice(-3) : [],
      missing: missing,
      keypad: keypad
    };
  }

  function applyValues(win) {
    Object.keys(values).forEach(function (id) {
      var el = win.document.getElementById(id);
      if (!el) { return; }
      el.value = values[id];
      el.dispatchEvent(new win.Event("input", { bubbles: true }));
      el.dispatchEvent(new win.Event("change", { bubbles: true }));
    });
  }

  function clickCalculate(win) {
    var candidates = Array.prototype.slice.call(win.document.querySelectorAll("button, input[type=button], a[role=button]"));
    var target = candidates.find(function (el) {
      return /calculate/i.test(el.id || "") || /calculate/i.test(el.textContent || "");
    });
    if (target) { target.click(); return target.id || target.textContent.trim(); }
    return null;
  }

  frame.addEventListener("load", async function () {
    try {
      var win = frame.contentWindow;
      if (!(await ready(win))) { throw new Error("runtime not ready"); }
      var style = win.document.createElement("style");
      style.textContent = "* { transition: none !important; animation: none !important; }";
      win.document.head.appendChild(style);

      if (mode === "switch" || mode === "regression") {
        applyValues(win);
        await sleep(80);
        out.calculateTarget = clickCalculate(win);
        await sleep(120);
      }

      out.snapshots.push(collect(win, "initial"));
      for (var i = 0; i < langs.length; i += 1) {
        var lang = langs[i];
        if (lang === (win.MW_I18N ? win.MW_I18N.language : "en")) {
          out.snapshots.push(collect(win, lang));
          continue;
        }
        if (win.MW_I18N.clearMissingTranslations) {
          win.MW_I18N.clearMissingTranslations();
        }
        await win.MW_I18N.switchTo(lang);
        await sleep(80);
        out.snapshots.push(collect(win, lang));
      }
    } catch (error) {
      out.errors.push(String(error && error.stack || error));
    }
    result.textContent = JSON.stringify(out);
    result.setAttribute("data-done", "1");
  });

  frame.src = page;
})();
</script>
"""


def run(page: str, langs: list[str], mode: str = "audit", values: dict | None = None,
        timeout_ms: int = 8000) -> dict:
    wrapper_path = WORKSPACE / WRAPPER_NAME
    wrapper_path.write_text(WRAPPER, encoding="utf-8")
    params = urllib.parse.urlencode({
        "page": page,
        "langs": ",".join(langs),
        "mode": mode,
        "values": json.dumps(values or {}),
    })
    url = f"{BASE}/{WRAPPER_NAME}?{params}"
    user_dir = tempfile.mkdtemp(prefix="mw-chrome-i18n-")
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-sync",
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
        f"--user-data-dir={user_dir}",
        f"--virtual-time-budget={timeout_ms}",
        "--dump-dom",
        url,
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=180,
            encoding="utf-8", errors="replace",
        )
    finally:
        wrapper_path.unlink(missing_ok=True)
    dom = proc.stdout
    match = re.search(r'<pre id="result"[^>]*>(.*?)</pre>', dom, re.S)
    if not match:
        return {"errors": [f"no result in Chrome output: {proc.stderr[-500:]}"]}
    payload = html.unescape(match.group(1)).strip()
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return {"errors": [f"invalid harness JSON: {payload[:500]}", proc.stderr[-500:]]}


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(WORKSPACE)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(1.0)
        page = sys.argv[1] if len(sys.argv) > 1 else "index.html"
        langs = sys.argv[2].split(",") if len(sys.argv) > 2 else ["en", "hi"]
        data = run(page, langs)
        print(json.dumps(data, ensure_ascii=False, indent=2)[:20000])
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    main()

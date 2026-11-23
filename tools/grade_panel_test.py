#!/usr/bin/env python3
"""Responsive test for the material-grade detail panel position."""
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_audit import harness

ROOT = Path(harness.WORKSPACE)
WRAPPER_NAME = "__mw_grade_panel_test.html"
VIEWPORTS = [(1920, 1080), (1366, 768), (768, 1024), (430, 932), (390, 844), (360, 780)]

WRAPPER = r"""<!doctype html>
<meta charset="utf-8">
<title>grade panel test</title>
<style>html,body{margin:0;overflow:hidden}iframe{border:0;display:block;width:100vw;height:100vh}</style>
<pre id="result" style="display:none">PENDING</pre>
<iframe id="f"></iframe>
<script>
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  var mobile = q.get("mobile") === "1";
  var frame = document.getElementById("f");
  var result = document.getElementById("result");
  var out = { mobile: mobile, innerWidth: window.innerWidth, checks: [], states: [], errors: [] };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function ready(win, ms) {
    var deadline = Date.now() + (ms || 10000);
    while (Date.now() < deadline) {
      var cards = win.document.querySelectorAll(".grade-item");
      if (win.document.readyState === "complete" && cards.length >= 6 && win.MW_GRADE_READY !== false) {
        return true;
      }
      await sleep(30);
    }
    return false;
  }

  function check(name, pass, detail) {
    out.checks.push({ name: name, pass: !!pass, detail: detail || "" });
  }

  function cards(win) {
    return Array.prototype.slice.call(win.document.querySelectorAll(".grade-item"));
  }

  function state(win, label) {
    var d = win.document;
    var list = d.getElementById("gradesList");
    var info = d.getElementById("gradeInfo");
    var items = cards(win);
    var selected = items.filter(function (item) {
      var card = item.querySelector(".grade-card");
      return card && card.getAttribute("aria-pressed") === "true";
    });
    var prev = info && info.previousElementSibling;
    var next = info && info.nextElementSibling;
    var infoRect = info && info.hidden ? null : info.getBoundingClientRect();
    var nextRect = next && next.getBoundingClientRect ? next.getBoundingClientRect() : null;
    var style = info ? win.getComputedStyle(info) : null;
    var listStyle = list ? win.getComputedStyle(list) : null;
    var padding = listStyle
      ? parseFloat(listStyle.paddingLeft || "0") + parseFloat(listStyle.paddingRight || "0") : 0;
    return {
      label: label,
      cardCount: items.length,
      selectedCount: selected.length,
      selectedIndex: selected.length ? items.indexOf(selected[0]) : -1,
      panels: d.querySelectorAll(".grade-info").length,
      infoHidden: !info || info.hidden,
      prevIndex: prev ? items.indexOf(prev) : -1,
      nextIndex: next ? items.indexOf(next) : -1,
      infoWidth: infoRect ? infoRect.width : 0,
      expectedWidth: list ? list.clientWidth - padding : 0,
      infoTop: infoRect ? infoRect.top : 0,
      nextTop: nextRect ? nextRect.top : 0,
      gridColumn: style ? style.gridColumnStart : "",
      position: style ? style.position : "",
      docWidth: d.documentElement.scrollWidth,
      winWidth: win.innerWidth,
      listScrollTop: list ? list.scrollTop : 0
    };
  }

  function click(win, index) {
    var item = cards(win)[index];
    if (!item) { return false; }
    var button = item.querySelector(".grade-card");
    if (!button) { return false; }
    button.click();
    return true;
  }

  function expectedPrev(index, count) {
    if (mobile) { return index; }
    var rowEnd = Math.floor(index / 2) * 2 + 1;
    return Math.min(rowEnd, count - 1);
  }

  async function verifySelection(win, index, label) {
    if (!click(win, index)) { check(label + " click", false, "card missing"); return; }
    await sleep(60);
    var s = state(win, label);
    out.states.push(s);
    check(label + " panel visible", !s.infoHidden, "hidden=" + s.infoHidden);
    check(label + " one panel", s.panels === 1, "panels=" + s.panels);
    check(label + " one selected card", s.selectedCount === 1 && s.selectedIndex === index,
          "count=" + s.selectedCount + " index=" + s.selectedIndex);
    check(label + " position", s.prevIndex === expectedPrev(index, s.cardCount),
          "prev=" + s.prevIndex + " expected=" + expectedPrev(index, s.cardCount));
    check(label + " full width", Math.abs(s.infoWidth - s.expectedWidth) <= 2,
          "info=" + s.infoWidth + " expected=" + s.expectedWidth);
    check(label + " spans grid", s.gridColumn === "1", "gridColumn=" + s.gridColumn);
    if (s.nextIndex >= 0) {
      check(label + " no overlap", s.nextTop >= s.infoTop,
            "nextTop=" + s.nextTop + " infoTop=" + s.infoTop);
    }
    check(label + " no horizontal scroll", s.docWidth <= s.winWidth + 1,
          "doc=" + s.docWidth + " win=" + s.winWidth);
    check(label + " not absolutely positioned", s.position !== "absolute" && s.position !== "fixed",
          "position=" + s.position);
    return s;
  }

  frame.addEventListener("load", async function () {
    try {
      var win = frame.contentWindow;
      if (!(await ready(win))) { throw new Error("grade cards not ready"); }
      out.cardCount = cards(win).length;
      await verifySelection(win, 0, "first card");
      await verifySelection(win, 1, "second column");
      await verifySelection(win, 4, "third row");
      await verifySelection(win, 7, "later row");

      if (!click(win, 7)) { check("toggle click", false, "card missing"); }
      else {
        await sleep(60);
        var closed = state(win, "closed");
        out.states.push(closed);
        check("toggle closes panel", closed.infoHidden && closed.selectedCount === 0,
              "hidden=" + closed.infoHidden + " selected=" + closed.selectedCount);
      }

      var beforeScroll = await verifySelection(win, 2, "scroll setup");
      var list = win.document.getElementById("gradesList");
      if (list && list.scrollHeight > list.clientHeight + 20 && !mobile) {
        list.scrollTop = Math.min(80, list.scrollHeight - list.clientHeight);
      } else {
        win.scrollTo(0, Math.min(200, Math.max(0, win.document.body.scrollHeight - win.innerHeight)));
      }
      await sleep(80);
      var afterScroll = state(win, "after scroll");
      out.states.push(afterScroll);
      check("panel stays in flow after scroll",
            afterScroll.prevIndex === beforeScroll.prevIndex && afterScroll.position !== "fixed",
            "prev=" + afterScroll.prevIndex + " position=" + afterScroll.position);
    } catch (error) {
      out.errors.push(String(error && error.stack || error));
    }
    result.textContent = JSON.stringify(out);
    result.setAttribute("data-done", "1");
  });

  frame.src = "index.html?" + (mobile ? "mobile=1" : "desktop=1");
})();
</script>
"""


def run(width: int, height: int) -> dict:
    wrapper_path = ROOT / WRAPPER_NAME
    wrapper_path.write_text(WRAPPER, encoding="utf-8")
    params = urllib.parse.urlencode({"mobile": "1" if width <= 900 else "0"})
    url = f"{harness.BASE}/{WRAPPER_NAME}?{params}"
    user_dir = tempfile.mkdtemp(prefix="mw-grade-panel-")
    cmd = [
        harness.CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--disable-dev-shm-usage", f"--user-data-dir={user_dir}",
        f"--window-size={width},{height}", "--force-device-scale-factor=1",
        "--virtual-time-budget=15000", "--dump-dom", url,
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=70,
            encoding="utf-8", errors="replace",
        )
    finally:
        wrapper_path.unlink(missing_ok=True)
    match = re.search(r'<pre id="result"[^>]*>(.*?)</pre>', proc.stdout, re.S)
    if not match:
        return {"errors": [f"no result: {proc.stderr[-600:]}"]}
    payload = html.unescape(match.group(1)).strip()
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return {"errors": [f"invalid JSON: {payload[:600]}"]}


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
        time.sleep(1)
        for width, height in VIEWPORTS:
            data = run(width, height)
            data["viewport"] = f"{width}x{height}"
            results.append(data)
            failed = [c for c in data.get("checks", []) if not c.get("pass")]
            print(f"{width}x{height}: checks={len(data.get('checks', []))} "
                  f"failed={len(failed)} errors={len(data.get('errors', []))} "
                  f"cards={data.get('cardCount', 0)}", flush=True)
            for item in failed[:8]:
                print(f"  FAIL {item['name']}: {item['detail']}", flush=True)
            for error in data.get("errors", []):
                print(f"  ERROR {error[-300:]}", flush=True)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    out_path = ROOT / "tools" / "grade_panel_results.json"
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(r.get("checks", [])) for r in results)
    failed = sum(1 for r in results for c in r.get("checks", []) if not c.get("pass"))
    errors = sum(len(r.get("errors", [])) for r in results)
    print(json.dumps({"viewports": len(VIEWPORTS), "total_checks": total,
                      "failed_checks": failed, "errors": errors,
                      "results_file": str(out_path)}, indent=2))


if __name__ == "__main__":
    main()

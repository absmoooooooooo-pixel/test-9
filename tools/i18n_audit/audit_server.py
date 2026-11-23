#!/usr/bin/env python3
"""Audit server + driver for the website-wide language audit.

    python tools/i18n_audit/audit_server.py [--pages a,b] [--langs hi,mr,...]

Serves the workspace, loads each page through tools/i18n_audit/audit.html in
headless Chrome, and stores one JSON report per page under
tools/i18n_audit/reports/. Product files are never modified here.
"""
from __future__ import annotations

import argparse
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
REPORTS = Path(__file__).resolve().parent / "reports"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 8770


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):  # noqa: N802 (http.server API)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length)
        name = "unknown"
        try:
            payload = json.loads(body.decode("utf-8"))
            name = payload.get("page", "unknown").replace("/", "_").replace(".html", "")
            (REPORTS / f"{name}.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
            )
        except Exception as error:  # noqa: BLE001
            (REPORTS / "errors.log").open("a", encoding="utf-8").write(f"{name}: {error}\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):  # keep the console readable
        pass


def pages_from_args(value: str | None) -> list[str]:
    if value:
        return [item.strip() for item in value.split(",") if item.strip()]
    pages = ["index.html", "frontend/about/index.html"]
    pages += sorted(
        p.relative_to(ROOT).as_posix()
        for p in (ROOT / "frontend" / "calculators").glob("*/index.html")
    )
    return pages


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def wait_for(port: int, timeout: float = 20.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def run_page(page: str, langs: str, port: int, timeout: float) -> dict:
    REPORTS.mkdir(parents=True, exist_ok=True)
    name = page.replace("/", "_").replace(".html", "")
    target = REPORTS / f"{name}.json"
    if target.exists():
        target.unlink()
    profile = tempfile.mkdtemp(prefix="mw-audit-")
    url = f"http://127.0.0.1:{port}/tools/i18n_audit/audit.html?page={page}&langs={langs}"
    process = subprocess.Popen(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=Translate,MediaRouter",
            "--window-size=1400,1000",
            f"--user-data-dir={profile}",
            url,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    started = time.time()
    try:
        while time.time() - started < timeout:
            if target.exists():
                try:
                    return json.loads(target.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    pass
            if process.poll() is not None and not target.exists():
                time.sleep(0.5)
                if target.exists():
                    return json.loads(target.read_text(encoding="utf-8"))
                break
            time.sleep(0.4)
    finally:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
        shutil.rmtree(profile, ignore_errors=True)
    return {"page": page, "results": [], "errors": ["timeout"]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages")
    parser.add_argument("--langs", default="hi,mr,ja,zh,ar,de,es,fr,pt")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--only", default="", help="comma separated page substrings")
    args = parser.parse_args()

    pages = pages_from_args(args.pages)
    if args.only:
        wanted = [item.strip() for item in args.only.split(",") if item.strip()]
        pages = [p for p in pages if any(w in p for w in wanted)]

    port = PORT if wait_for(PORT, 0.1) else PORT
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    if not wait_for(port, 10):
        print("server did not start", file=sys.stderr)
        return 1

    print(f"auditing {len(pages)} pages on port {port}", flush=True)
    for page in pages:
        payload = run_page(page, args.langs, port, args.timeout)
        results = payload.get("results", [])
        langs = [item.get("label") for item in results]
        status = "ok" if results else "FAILED " + ",".join(payload.get("errors", []))
        print(f"  {page:58s} {status} ({len(results)} snapshots: {','.join(langs)})", flush=True)

    server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())

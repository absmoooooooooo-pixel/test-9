#!/usr/bin/env python3
"""Run the full Round 3 matrix in parallel browser workers."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import harness  # noqa: E402
import round3  # noqa: E402

WORKERS = 6
BASE_PORT = 8801


def worker(port: int, tasks_path: Path, out_path: Path) -> None:
    harness.BASE = f"http://127.0.0.1:{port}"
    round3.WRAPPER_NAME = f"__mw_round3_p{port}.html"
    tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1",
         "--directory", str(round3.ROOT)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    results = []
    try:
        time.sleep(1.0)
        for page, mobile in tasks:
            data = round3.run(page, mobile)
            data["viewport"] = "mobile" if mobile else "desktop"
            results.append(data)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        worker(int(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]))
        return

    tasks = []
    for mobile in (False, True):
        for page in round3.PAGES:
            tasks.append([page, mobile])
    chunks: list[list[list]] = [[] for _ in range(WORKERS)]
    for index, task in enumerate(tasks):
        chunks[index % WORKERS].append(task)

    tmp = Path(tempfile.mkdtemp(prefix="mw-round3-parallel-"))
    procs = []
    out_files = []
    for index, chunk in enumerate(chunks):
        tasks_path = tmp / f"tasks{index}.json"
        out_path = tmp / f"results{index}.json"
        tasks_path.write_text(json.dumps(chunk), encoding="utf-8")
        out_files.append(out_path)
        procs.append(subprocess.Popen([
            sys.executable, str(Path(__file__).resolve()), "worker",
            str(BASE_PORT + index), str(tasks_path), str(out_path),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        print(f"worker {index}: {len(chunk)} pages", flush=True)

    for proc in procs:
        proc.wait(timeout=1800)

    results = []
    for out_path in out_files:
        results.extend(json.loads(out_path.read_text(encoding="utf-8")))
    order = {(mobile, page): index for index, (page, mobile) in enumerate(tasks)}
    results.sort(key=lambda item: order.get((item.get("viewport") == "mobile", item.get("page")), 9999))

    out_path = HERE / "round3_results.json"
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(item.get("checks", [])) for item in results)
    failed = sum(1 for item in results for check in item.get("checks", []) if not check.get("pass"))
    errors = sum(1 for item in results if item.get("errors"))
    print(json.dumps({
        "pages_per_viewport": 26,
        "viewports": 2,
        "total_checks": total,
        "failed_checks": failed,
        "pages_with_errors": errors,
        "results_file": str(out_path),
    }, ensure_ascii=False, indent=2))
    for item in results:
        bad = [check for check in item.get("checks", []) if not check.get("pass")]
        if bad:
            print("FAIL", item.get("viewport"), item.get("page"),
                  bad[0].get("name"), str(bad[0].get("detail", ""))[:300])


if __name__ == "__main__":
    main()

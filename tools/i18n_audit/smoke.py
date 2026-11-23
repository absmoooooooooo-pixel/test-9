from __future__ import annotations

import json
import subprocess
import sys
import time

import harness
import round3

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(harness.PORT), "--bind", "127.0.0.1",
     "--directory", str(harness.WORKSPACE)],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
try:
    time.sleep(1)
    data = round3.run("frontend/calculators/round-bar/index.html", False)
    print(json.dumps(data, ensure_ascii=False, indent=2)[:12000])
finally:
    server.terminate()
    server.wait(timeout=5)

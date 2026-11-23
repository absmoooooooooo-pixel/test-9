"""Shared paths for the one English site and its language dictionaries.

Every page is published once, at its English URL. Languages are applied in the
browser by frontend/i18n/i18n.js, so there are no per-language folders or URL
rules to keep in sync.
"""
from __future__ import annotations

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND = PROJECT_ROOT / "frontend"
I18N_DIR = FRONTEND / "i18n"
SITE_BASE = "https://metalweightcalculator.online"
DEFAULT_LANGUAGE = "en"

SKIP_FOLDERS = {
    "backend",
    "dist",
    "BIN",
    "assets",
    "icons",
    "shared",
    "scripts",
    "tools",
    "node_modules",
    ".git",
    ".freebuff",
    ".cloud-attachments",
    "AUDIT_SAVED_CODE",
    "i18n",
}


def load_languages() -> dict:
    return json.loads((I18N_DIR / "languages.json").read_text(encoding="utf-8"))


def language_codes() -> list[str]:
    return [item["code"] for item in load_languages()["languages"]]


def load_dictionary(code: str) -> dict:
    return json.loads((I18N_DIR / f"{code}.json").read_text(encoding="utf-8"))


def source_pages() -> list[str]:
    """Repo-relative paths of the English pages, in a stable order."""
    pages = ["index.html"]

    for page in sorted(FRONTEND.rglob("index.html"), key=lambda item: item.as_posix().lower()):
        relative = page.relative_to(PROJECT_ROOT).as_posix()

        if any(part in SKIP_FOLDERS or part.startswith(".") for part in relative.split("/")[:-1]):
            continue

        pages.append(relative)

    return pages


def strip_frontend(relative: str) -> str:
    return relative[len("frontend/"):] if relative.startswith("frontend/") else relative


def page_url(relative: str) -> str:
    """Absolute canonical URL of an English page."""
    if relative == "index.html":
        return SITE_BASE + "/"
    return SITE_BASE + "/" + relative

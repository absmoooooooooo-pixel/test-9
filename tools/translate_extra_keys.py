#!/usr/bin/env python3
"""Populate missing long-form dictionary entries from the reference dictionary.

    python tools/translate_extra_keys.py

Japanese is the reference dictionary for FAQ, formula and diagram-description
strings. This one-off build tool copies that coverage into every other
language's static JSON dictionary. Translations are fetched in batches and
saved into the dictionaries; the website never calls a translation service at
runtime. Standard designations, units and formula tokens are kept unchanged.

The script is idempotent: keys already present in a dictionary are skipped.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n_paths as paths

I18N = paths.I18N_DIR
REFERENCE = "ja"
TARGETS = ["en", "ar", "de", "es", "fr", "hi", "mr", "pt", "zh"]
ENDPOINT = "https://translate.googleapis.com/translate_a/t"
BATCH_SIZE = 25
SEPARATOR = "|"
RATE_LIMIT_WAIT = 20
GOOGLE_LANG = {
    "en": "en", "ar": "ar", "de": "de", "es": "es", "fr": "fr",
    "hi": "hi", "mr": "mr", "pt": "pt", "zh": "zh-CN", "ja": "ja",
}

# Keys that must stay in their international form in every language.
PRESERVE = re.compile(
    r"^(?:ISO|ASTM|DIN|ASME|ANSI|JIS|GB|AISI|SAE|BIS|IS|EN)\b|"
    r"^(?:[A-Z]{1,4}\s?)?\d+(?:\.\d+)?(?:\s*[A-Za-z°³²/+()\-]*)?$"
)


def translated_segments(payload: str | list) -> list[str]:
    data = json.loads(payload) if isinstance(payload, str) else payload
    value = data[0] if data else ""
    return [part.replace("\r", "").rstrip("\n") for part in str(value).split(SEPARATOR)]


class BatchMismatch(Exception):
    """The translation service split or merged batched source strings."""


def retry(operation, description: str):
    """Retry transient network errors, backing off hard on HTTP 429."""
    last_error: Exception | None = None
    for attempt in range(8):
        try:
            return operation()
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code != 429 or attempt == 7:
                break
            wait = RATE_LIMIT_WAIT * (attempt + 1)
            print(f"  rate limited ({description}); waiting {wait}s", flush=True)
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt == 7:
                break
            time.sleep(min(30, 2 << attempt))
    raise RuntimeError(f"{description} failed after retries: {last_error}")


def request_translations(query: str) -> list[str]:
    request = urllib.request.Request(
        f"{ENDPOINT}?{query}", headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return translated_segments(response.read().decode("utf-8"))


def fetch_batch(texts: list[str], target: str) -> list[str]:
    query = urllib.parse.urlencode({
        "client": "chrome", "sl": "en", "tl": GOOGLE_LANG[target],
        "dt": "t", "q": SEPARATOR.join(texts),
    })
    result = retry(lambda: request_translations(query), f"{target} batch")
    if len(result) != len(texts):
        raise BatchMismatch(
            f"expected {len(texts)} translations, got {len(result)}"
        )
    return result


def fetch_one(text: str, target: str) -> str:
    query = urllib.parse.urlencode({
        "client": "chrome", "sl": "en", "tl": GOOGLE_LANG[target],
        "dt": "t", "q": text,
    })
    values = retry(lambda: request_translations(query), f"{target} single string")
    return SEPARATOR.join(values) if values else text


def translate_group(texts: list[str], target: str) -> list[str]:
    """Translate a group, splitting it in half if segment alignment fails."""
    if len(texts) == 1:
        return [fetch_one(texts[0], target)]
    try:
        return fetch_batch(texts, target)
    except BatchMismatch:
        middle = len(texts) // 2
        print(f"  {target}: split misaligned batch {len(texts)}", flush=True)
        return translate_group(texts[:middle], target) + translate_group(texts[middle:], target)


def translate_all(texts: list[str], target: str, checkpoint=None) -> dict[str, str]:
    result: dict[str, str] = {}
    # Embedded newlines are sent individually so the API cannot split one
    # source string into several response segments.
    single = [text for text in texts if "\n" in text or "\r" in text or SEPARATOR in text]
    batched = [text for text in texts if text not in single]
    for text in single:
        result[text] = fetch_one(text, target)
        if checkpoint:
            checkpoint(result)
    for start in range(0, len(batched), BATCH_SIZE):
        batch = batched[start:start + BATCH_SIZE]
        for source, value in zip(batch, translate_group(batch, target)):
            result[source] = source if PRESERVE.search(source) else value
        if checkpoint:
            checkpoint(result)
        print(f"  {target}: {min(start + BATCH_SIZE, len(batched))}/{len(batched)}", flush=True)
        time.sleep(0.4)
    return result


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--targets", nargs="+", default=TARGETS,
                        help="language codes to populate (default: all)")
    args = parser.parse_args()

    reference = paths.load_dictionary(REFERENCE)
    baseline_path = Path(__file__).with_name("i18n_reference_keys.json")
    if baseline_path.exists():
        core_keys = set(json.loads(baseline_path.read_text(encoding="utf-8")))
    else:
        core_keys = set(paths.load_dictionary("hi")["strings"])
    extra_keys = [key for key in reference["strings"] if key not in core_keys]
    print(f"reference-only source strings: {len(extra_keys)}")

    for code in args.targets:
        dictionary = paths.load_dictionary(code)
        missing = [key for key in extra_keys if key not in dictionary["strings"]]
        if not missing:
            print(f"{code}: already complete")
            continue
        print(f"{code}: translating {len(missing)} strings")

        def checkpoint(batch: dict[str, str], code=code, dictionary=dictionary) -> None:
            # Save after every batch so a network failure never loses work.
            dictionary["strings"].update(batch)
            (I18N / f"{code}.json").write_text(
                json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8", newline="\n",
            )

        if code == "en":
            translations = {key: key for key in missing}
            checkpoint(translations)
        else:
            translations = translate_all(missing, code, checkpoint=checkpoint)
        print(f"{code}: saved {len(translations)} entries")

    # The generated runtime bundle must be rebuilt after this tool runs.
    print("run `python tools/build_i18n.py` to refresh translations.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

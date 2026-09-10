"""
Gender pass: Serenes Forest's character tables don't carry gender, so this
looks each character up on Fire Emblem Wiki (fireemblemwiki.org, a MediaWiki
site) and reads the `|gender=` field from its {{Character Infobox}}.

Reads  scraper/data/characters.json  (names only)
Writes scraper/data/gender.json      { "<name>": "Male" | "Female" | null }

scrape_serenes.py's merge step applies gender.json onto characters.json, so
this can be run before or after the main scrape.
"""
import json
import re
import time
from pathlib import Path

import requests

API = "https://fireemblemwiki.org/w/api.php"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FireEmblemDokuScraper/0.1)"}
BATCH_SIZE = 10

DATA_DIR = Path(__file__).parent / "data"
GENDER_RE = re.compile(r"\|\s*gender\s*=\s*\*?\s*\[?\[?([A-Za-z]+)", re.IGNORECASE)

# Serenes romanization -> Fire Emblem Wiki page title, for names the wiki has
# no working redirect for. Extend as misses show up.
NAME_OVERRIDES = {
    "Leaf": "Leif",
    "Sheeda": "Caeda",
    "Nabarl": "Navarre",
    "Lance": "Lance (character)",
    "Lorenz": "Lorenz (Archanea)",
    "Levin": "Lewyn",
    "Fury": "Erinys",
    "Dagda": "Dagdar",
    "Astria": "Astram",
    "Boa": "Boah",
    "Machis": "Macellan",
    "Thomas": "Tomas",
    "Zeis": "Zeiss",
    "Mishelan": "Michalis",
    "Tania": "Tanya",
}

# Last-resort gender for names still unresolved after wiki lookup + overrides
# (well-established FE lore). Avatar / Kana / Morgan are intentionally omitted:
# their gender is player-chosen.
GENDER_HARDCODE = {
    "Arthur": "Male", "Astohl": "Male", "Dagda": "Male", "Dean": "Male",
    "Deen": "Male", "Kyza": "Male", "Selena": "Female", "Shade": "Female",
    "Tomth": "Male", "Ymir": "Male",
}


def fetch_wikitext(titles: list[str]) -> dict[str, str]:
    """Return {resolved_or_requested_title: wikitext} for a batch of titles,
    following redirects and mapping normalized/redirected titles back to the
    title we asked for."""
    params = {
        "action": "query",
        "titles": "|".join(titles),
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "redirects": "1",
        "format": "json",
        "formatversion": "2",
    }
    alias_to_requested = {t: t for t in titles}
    out: dict[str, str] = {}

    # The API returns revision content for only a few pages per response and
    # hands back a `continue` token for the rest; loop until it's exhausted.
    while True:
        resp = requests.get(API, params=params, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        data = payload.get("query", {})

        for norm in data.get("normalized", []):
            alias_to_requested[norm["to"]] = alias_to_requested.get(norm["from"], norm["from"])
        for redir in data.get("redirects", []):
            alias_to_requested[redir["to"]] = alias_to_requested.get(redir["from"], redir["from"])

        for page in data.get("pages", []):
            revisions = page.get("revisions")
            if not revisions:
                continue
            content = revisions[0]["slots"]["main"]["content"]
            requested = alias_to_requested.get(page["title"], page["title"])
            out[requested] = content

        if "continue" not in payload:
            break
        params.update(payload["continue"])
    return out


def parse_gender(wikitext: str) -> str | None:
    match = GENDER_RE.search(wikitext)
    if not match:
        return None
    value = match.group(1).strip().lower()
    if value.startswith("male") or value == "m":
        return "Male"
    if value.startswith("female") or value == "f":
        return "Female"
    return None


def main() -> None:
    characters = json.loads((DATA_DIR / "characters.json").read_text(encoding="utf-8"))
    names = sorted({c["name"] for c in characters})

    cache_path = DATA_DIR / "gender.json"
    result: dict[str, str | None] = {}
    if cache_path.exists():
        result = json.loads(cache_path.read_text(encoding="utf-8"))

    todo = [n for n in names if n not in result or result[n] is None]
    print(f"{len(names)} unique names, {len(todo)} to look up")

    for i in range(0, len(todo), BATCH_SIZE):
        batch = todo[i : i + BATCH_SIZE]
        titles = [NAME_OVERRIDES.get(n, n) for n in batch]
        title_to_name = dict(zip(titles, batch))
        try:
            pages = fetch_wikitext(titles)
        except requests.RequestException as e:
            print(f"  batch {i // BATCH_SIZE}: request failed ({e}), skipping")
            continue
        for title, wikitext in pages.items():
            name = title_to_name.get(title, title)
            result[name] = parse_gender(wikitext)
        time.sleep(0.5)  # be polite to the wiki
        print(f"  {min(i + BATCH_SIZE, len(todo))}/{len(todo)}")

    for n in names:
        if not result.get(n) and n in GENDER_HARDCODE:
            result[n] = GENDER_HARDCODE[n]
        result.setdefault(n, None)

    cache_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    hits = sum(1 for n in names if result.get(n))
    print(f"\nResolved gender for {hits}/{len(names)} names -> data/gender.json")
    misses = [n for n in names if not result.get(n)]
    if misses:
        print(f"Unresolved ({len(misses)}): {', '.join(misses[:60])}")


if __name__ == "__main__":
    main()

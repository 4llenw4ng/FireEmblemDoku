"""
Character avatar scraper. Reuses scrape_gender.py's wikitext-fetch machinery
(same Fire Emblem Wiki name resolution, redirects, and NAME_OVERRIDES) to find
each character's page, then pulls their in-game dialogue "mug" portrait for
whichever of our 12 games they actually appear in -- not the big box-art
image from the infobox, which doesn't crop to a face consistently.

Fire Emblem Wiki tags these with a game number, e.g. "Portrait hector fe07.png"
(the full dialogue-box portrait) vs. "Small portrait hector fe07.png" (a tiny
32x32 status-screen icon, not what we want).

Reads  scraper/data/characters.json          (name -> game(s))
Writes assets/Character Avatars/<slug>.<ext> the downloaded portraits
Writes scraper/data/avatars.json             name -> filename | null (cache)

Run again to resume/retry: already-resolved names (including explicit misses)
are skipped, so interrupting and re-running is safe.
"""
import json
import re
import time
from pathlib import Path

import requests
from scrape_gender import API, HEADERS, NAME_OVERRIDES, fetch_wikitext

DATA_DIR = Path(__file__).parent / "data"
OUT_DIR = Path(__file__).parent.parent / "assets" / "Character Avatars"
BATCH_SIZE = 10

# GAMES value (scraper/scrape_serenes.py) -> Fire Emblem Wiki's game-number
# suffix, using the remake as source of truth where we do (Shadow Dragon =
# FE11, Echoes = FE15, and "Mystery of the Emblem" here means the FE3
# original since the wiki -- like Serenes -- has no separate FE12 data).
GAME_TO_FE_NUMBER = {
    "Shadow Dragon": "fe11",
    "Mystery of the Emblem": "fe03",
    "Echoes: Shadows of Valentia": "fe15",
    "Genealogy of the Holy War": "fe04",
    "Thracia 776": "fe05",
    "Binding Blade": "fe06",
    "Blazing Blade": "fe07",
    "Sacred Stones": "fe08",
    "Path of Radiance": "fe09",
    "Radiant Dawn": "fe10",
    "Awakening": "fe13",
    "Fates": "fe14",
}

FILE_REF_RE = re.compile(r"\[\[File:([^|\]]+)")

# Player-created avatar characters (Awakening's "Robin" and Fates' "Corrin"
# are both stored as the generic name "Avatar" in our data; Kana/Morgan are
# their children) have no single canonical appearance -- same reason they
# have no fixed gender. Skip rather than pull something that doesn't
# represent them consistently.
SKIP_NAMES = {"Avatar", "Kana", "Morgan"}

# name -> Fire Emblem Wiki File: title, for characters whose best-match
# portrait isn't right for our purposes. Extend as anomalies show up.
IMAGE_OVERRIDES: dict[str, str] = {}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", name.lower())
    return s.strip("_")


def find_portrait_file(wikitext: str, fe_numbers: list[str]) -> str | None:
    """Picks the best dialogue-portrait File: reference on a character's page
    for the first of their games (in our priority order) that has one.
    Prefers the full portrait over the tiny "Small portrait" status icon."""
    all_files = FILE_REF_RE.findall(wikitext)
    for fe_num in fe_numbers:
        candidates = [
            f for f in all_files if "portrait" in f.lower() and fe_num in f.lower()
        ]
        if not candidates:
            continue
        full_size = [f for f in candidates if not f.lower().startswith("small portrait")]
        return (full_size or candidates)[0]
    return None


def resolve_urls(file_titles: list[str]) -> dict[str, tuple[str, str]]:
    """file title (no 'File:' prefix, as originally requested) -> (direct
    image URL, extension). MediaWiki auto-capitalizes the first letter of
    titles and reports that back under `normalized`, so without mapping it
    back to what we asked for, results keyed by the *normalized* title would
    silently miss a lookup keyed by our original (differently-cased) title."""
    out: dict[str, tuple[str, str]] = {}
    for i in range(0, len(file_titles), 50):
        batch = file_titles[i : i + 50]
        titles = [f"File:{t}" for t in batch]
        alias_to_requested = {t: t for t in titles}
        resp = requests.get(
            API,
            params={
                "action": "query",
                "titles": "|".join(titles),
                "prop": "imageinfo",
                "iiprop": "url",
                "redirects": "1",
                "format": "json",
                "formatversion": "2",
            },
            headers=HEADERS,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json().get("query", {})
        for norm in data.get("normalized", []):
            alias_to_requested[norm["to"]] = alias_to_requested.get(norm["from"], norm["from"])
        for redir in data.get("redirects", []):
            alias_to_requested[redir["to"]] = alias_to_requested.get(redir["from"], redir["from"])
        for page in data.get("pages", []):
            info = page.get("imageinfo")
            if not info:
                continue
            requested = alias_to_requested.get(page["title"], page["title"]).removeprefix("File:")
            url = info[0]["url"]
            ext = url.rsplit(".", 1)[-1].lower()
            out[requested] = (url, ext)
        time.sleep(0.3)
    return out


def download(url: str, dest: Path) -> bool:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"    download failed: {e}")
        return False
    dest.write_bytes(resp.content)
    return True


def main() -> None:
    characters = json.loads((DATA_DIR / "characters.json").read_text(encoding="utf-8"))

    # name -> that character's games, in first-appearance order (dedup'd),
    # translated to wiki fe-numbers, dropping any game we have no mapping for.
    name_to_fe: dict[str, list[str]] = {}
    for c in characters:
        if c["name"] in SKIP_NAMES:
            continue
        fe_num = GAME_TO_FE_NUMBER.get(c["game"])
        if not fe_num:
            continue
        games = name_to_fe.setdefault(c["name"], [])
        if fe_num not in games:
            games.append(fe_num)

    names = sorted(name_to_fe)

    cache_path = DATA_DIR / "avatars.json"
    result: dict[str, str | None] = (
        json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    todo = [n for n in names if n not in result or result[n] is None]
    print(f"{len(names)} names ({len(SKIP_NAMES)} skipped), {len(todo)} to look up")

    # Pass 1: wikitext -> File: title per name.
    name_to_file: dict[str, str] = {}
    for i in range(0, len(todo), BATCH_SIZE):
        batch = todo[i : i + BATCH_SIZE]
        titles = [IMAGE_OVERRIDES.get(n) or NAME_OVERRIDES.get(n, n) for n in batch]
        title_to_name = dict(zip(titles, batch))
        try:
            pages = fetch_wikitext(titles)
        except requests.RequestException as e:
            print(f"  batch {i // BATCH_SIZE}: request failed ({e}), skipping")
            continue
        for title, wikitext in pages.items():
            name = title_to_name.get(title, title)
            file_title = find_portrait_file(wikitext, name_to_fe[name])
            if file_title:
                name_to_file[name] = file_title
            else:
                result[name] = None
        time.sleep(0.5)
        print(f"  wikitext {min(i + BATCH_SIZE, len(todo))}/{len(todo)}")

    # Pass 2: File: title -> direct URL (dedup, since characters can share art).
    unique_files = sorted(set(name_to_file.values()))
    print(f"\nResolving {len(unique_files)} unique image files...")
    file_to_url = resolve_urls(unique_files)

    # Pass 3: download (once per unique file, reused across names that share it).
    downloaded_to_slug: dict[str, str] = {}
    for idx, (name, file_title) in enumerate(sorted(name_to_file.items()), 1):
        if file_title not in file_to_url:
            result[name] = None
            continue
        url, ext = file_to_url[file_title]
        if file_title in downloaded_to_slug:
            result[name] = downloaded_to_slug[file_title]
            continue
        slug = slugify(name)
        dest = OUT_DIR / f"{slug}.{ext}"
        if download(url, dest):
            downloaded_to_slug[file_title] = dest.name
            result[name] = dest.name
        else:
            result[name] = None
        if idx % 20 == 0:
            print(f"  downloaded {idx}/{len(name_to_file)}")
        time.sleep(0.2)

    for n in names:
        result.setdefault(n, None)

    cache_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    hits = sum(1 for n in names if result.get(n))
    print(f"\nResolved avatars for {hits}/{len(names)} names -> {OUT_DIR}")
    misses = [n for n in names if not result.get(n)]
    if misses:
        print(f"Unresolved ({len(misses)}): {', '.join(misses[:60])}")


if __name__ == "__main__":
    main()

"""
Scraper for Serenes Forest character data across the Fire Emblem series (FE1-Fates).
Scrapes base stats, growth rates, and recruitment data per game and merges them
into per-character JSON records. Weapon type is derived from class name rather
than scraped, since a dedicated "weapon ranks" page isn't consistently available
across all 12 games.
"""
import io
import json
import re
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FireEmblemDokuScraper/0.1)"}

# Growth-rate trait thresholds (percentage points).
LOW_GROWTH_MAX = 20   # a stat growth <= this counts as "low growth in X"
HIGH_GROWTH_MIN = 60  # a stat growth >= this counts as "high growth in X"

# The eight canonical growth stats used as puzzle traits.
CANONICAL_STATS = ("HP", "Str", "Mag", "Skl", "Spd", "Luck", "Def", "Res")

# Map each game's scraped growth-column header to a canonical stat. Columns not
# listed here (Wlv, Mov, Bld/Con, weapon level, etc.) are ignored. "S/M" (GBA
# combined Strength/Magic) and "Atk" (Echoes, no Str/Mag split) feed BOTH Str
# and Mag.
STAT_ALIASES = {
    "HP": ("HP",),
    "Str": ("Str",), "Strength": ("Str",),
    "Mag": ("Mag",), "Magic": ("Mag",),
    "S/M": ("Str", "Mag"), "Atk": ("Str", "Mag"),
    "Skl": ("Skl",), "Ski": ("Skl",), "Skill": ("Skl",),
    "Spd": ("Spd",), "Speed": ("Spd",),
    "Lck": ("Luck",), "Luk": ("Luck",), "Luck": ("Luck",),
    "Def": ("Def",), "Defense": ("Def",), "Defence": ("Def",),
    "Res": ("Res",), "Mdf": ("Res",), "Resistance": ("Res",),
}

SKIP_SECTION_KEYWORDS = ("npc", "boss", "enemy", "trial map", "navigation")

# Games in scope, FE1-Fates (remakes used as source of truth where available).
# Each game has a `primary` source and optional `extra_sources`, merged in
# order (first source wins per character name). A source is:
#   base_path:   URL path between serenesforest.net/ and /<page>/
#   suffixes:    per-page extra path segment, for games that split a page into
#                sub-pages (Main Story / difficulty mode / growth variant / ...)
#   page_names:  per-page URL-slug override; None means "source lacks this page"
def _src(base_path, suffixes=None, page_names=None):
    return {"base_path": base_path, "suffixes": suffixes or {}, "page_names": page_names or {}}


GAMES = [
    {"name": "Shadow Dragon",
     "primary": _src("shadow-dragon/characters", {"base-stats": "default", "growth-rates": "default"})},
    {"name": "Mystery of the Emblem", "primary": _src("mystery-of-the-emblem/characters")},
    {"name": "Echoes: Shadows of Valentia", "primary": _src("fire-emblem-echoes-shadows-valentia/characters")},
    {"name": "Genealogy of the Holy War", "primary": _src("genealogy-of-the-holy-war/characters")},
    {"name": "Thracia 776", "primary": _src("thracia-776/characters")},
    {"name": "Binding Blade", "primary": _src("binding-blade/characters")},
    {"name": "Blazing Blade", "primary": _src("blazing-sword/characters")},
    {"name": "Sacred Stones", "primary": _src("the-sacred-stones/characters")},
    {"name": "Path of Radiance", "primary": _src("path-of-radiance/characters")},
    {"name": "Radiant Dawn", "primary": _src("radiant-dawn/characters")},
    {"name": "Awakening",
     "primary": _src("awakening/characters",
                     {"base-stats": "main-story", "growth-rates": "base", "recruitment": "main-story"})},
    {"name": "Fates",
     "primary": _src("fire-emblem-fates/hoshidan-characters"),
     "extra_sources": [
         _src("fire-emblem-fates/nohrian-characters"),
         _src("fire-emblem-fates/revelation",
              page_names={"base-stats": "character-base-stats",
                          "growth-rates": None,
                          "recruitment": "character-recruitment"}),
     ]},
]

# Class -> weapon type(s), derived from Fire Emblem series knowledge (FE1-Fates
# era only; not for Three Houses/Engage's unlocked class systems). Keys are
# matched case-insensitively as substrings of the scraped class name.
CLASS_WEAPON_MAP = {
    "myrmidon": ["Sword"], "swordmaster": ["Sword"], "trueblade": ["Sword"],
    "mercenary": ["Sword"], "hero": ["Sword", "Axe"],
    "cavalier": ["Sword", "Lance"], "paladin": ["Sword", "Lance"], "great knight": ["Sword", "Lance", "Axe"],
    "knight": ["Lance"], "general": ["Lance", "Axe", "Sword"], "armor": ["Lance"],
    "fighter": ["Axe"], "warrior": ["Axe", "Bow"], "pirate": ["Axe"], "berserker": ["Axe"],
    "brigand": ["Axe"],
    "archer": ["Bow"], "sniper": ["Bow"], "nomad": ["Bow"],
    "mage": ["Tome"], "sage": ["Tome", "Staff"], "shaman": ["Tome"], "druid": ["Tome"],
    "sorcerer": ["Tome"], "dark mage": ["Tome"], "summoner": ["Tome"],
    "priest": ["Staff"], "cleric": ["Staff"], "bishop": ["Staff", "Tome"], "war monk": ["Staff", "Fist"],
    "war cleric": ["Staff", "Fist"], "troubadour": ["Staff"], "valkyrie": ["Staff", "Tome"],
    "pegasus knight": ["Lance"], "falcon knight": ["Lance", "Staff"],
    "wyvern rider": ["Lance"], "wyvern lord": ["Lance", "Axe"], "dracoknight": ["Lance"],
    "thief": ["Sword"], "assassin": ["Sword", "Bow"], "trickster": ["Sword", "Staff"], "rogue": ["Sword"],
    "dancer": [], "bard": [],
    "manakete": ["Dragonstone"], "dragon": ["Dragonstone"],
    "taguel": ["Beaststone"], "kitsune": ["Beaststone"], "wolfskin": ["Beaststone"],
    "lord": ["Sword"],
    "tactician": ["Sword", "Tome"], "avatar": ["Sword"],
    "ballistician": ["Bow"], "gunner": ["Bow"],
    "dark flier": ["Tome", "Lance"],
    "diviner": ["Tome"], "onmyoji": ["Tome"], "basara": ["Tome", "Sword"],
    "spear fighter": ["Lance"], "spear master": ["Lance"], "spear hero": ["Lance"],
    "oni": ["Axe"], "blacksmith": ["Axe"],
    "master ninja": ["Dagger"], "ninja": ["Dagger"],
    "swordmaster": ["Sword"], "witch": ["Tome"],
    "monk": ["Staff"],
    # weaponless support/story classes (intentionally empty - not fighters)
    "dancer": [], "bard": [], "villager": [], "transporter": [], "songstress": [],
    # additional classes found across FE1-Fates not covered above
    "halberdier": ["Lance"], "hunter": ["Bow"], "curate": ["Staff"], "sister": ["Staff"],
    "saint": ["Staff"], "horseman": ["Sword", "Lance"], "horsemen": ["Sword", "Lance"],
    "mamkute": ["Dragonstone"], "chameleon": ["Dragonstone"],
    "falcon kn": ["Lance"], "pegasus kn": ["Lance"], "pegasus rider": ["Lance"],
    "sword armour": ["Sword"], "axe armour": ["Axe"],
    "journeyman": ["Axe"], "recruit": ["Sword", "Lance"], "pupil": ["Tome"],
    "soldier": ["Lance"], "ranger": ["Sword", "Bow"],
    "samurai": ["Sword"], "master of arms": ["Sword", "Lance", "Axe"],
    "shrine maiden": ["Staff"], "maid": ["Dagger"], "butler": ["Dagger"],
    "mechanist": ["Bow"], "conqueror": ["Axe"],
    "cat": ["Beaststone"], "tiger": ["Beaststone"], "lion": ["Beaststone"],
    "hawk": ["Beaststone"], "raven": ["Beaststone"], "wolf": ["Beaststone"],
    "beast tribe": ["Beaststone"], "bird tribe": ["Beaststone"],
    "hawk king": ["Beaststone"], "lion king": ["Beaststone"], "raven king": ["Beaststone"],
    "wolf queen": ["Beaststone"],
    "princess crimea": ["Sword"],
    "bandit": ["Axe"], "king": ["Sword"], "necromancer": ["Tome"],
    "valkyria": ["Staff", "Tome"], "chancellor": ["Tome"], "commando": ["Sword"],
    "nohr prince": ["Sword", "Dragonstone"],
    "apothecary": ["Bow"], "adventurer": ["Bow", "Staff"], "merchant": ["Bow"],
    # promoted / compound "... knight" and other multi-word classes
    "dark knight": ["Sword", "Tome"], "mage knight": ["Tome", "Staff"],
    "bow knight": ["Bow", "Sword"], "holy knight": ["Tome", "Staff"],
    "gold knight": ["Sword", "Lance"], "silver knight": ["Sword", "Lance"],
    "kinshi knight": ["Bow", "Lance"], "malig knight": ["Axe", "Tome"],
    "grandmaster": ["Sword", "Tome"], "dread fighter": ["Sword"],
    "war master": ["Axe", "Fist"], "great lord": ["Sword", "Lance"],
    "lord knight": ["Sword", "Lance"], "master knight": ["Sword", "Lance", "Bow", "Staff"],
    "outlaw": ["Bow"],
}

# Known per-character weapon exceptions where class name alone is ambiguous
# (e.g. twin Lords who use different weapons, or royal siblings with a shared
# generic class name). Keyed by (game, character_name).
CHARACTER_WEAPON_OVERRIDES = {
    ("Sacred Stones", "Ephraim"): ["Lance"],
    ("Sacred Stones", "Eirika"): ["Sword"],
    ("Genealogy of the Holy War", "Seliph"): ["Sword"],
    ("Genealogy of the Holy War", "Leif"): ["Sword"],
    ("Genealogy of the Holy War", "Leaf"): ["Sword"],
    ("Genealogy of the Holy War", "Lachesis"): ["Sword"],
    ("Genealogy of the Holy War", "Julia"): ["Tome"],
    ("Genealogy of the Holy War", "Altena"): ["Lance"],
    ("Radiant Dawn", "Sanaki"): ["Tome"],
    ("Radiant Dawn", "Elincia"): ["Sword"],
    ("Radiant Dawn", "Pelleas"): ["Tome"],
}


# Longest keys first so specific multi-word classes ("dark knight") win over
# the generic substring they contain ("knight").
_CLASS_KEYS_BY_LENGTH = sorted(CLASS_WEAPON_MAP, key=len, reverse=True)


def derive_weapon_types(class_name: str) -> list[str]:
    lowered = str(class_name).lower()
    for key in _CLASS_KEYS_BY_LENGTH:
        if key in lowered:
            return CLASS_WEAPON_MAP[key]
    return []


def clean_name(raw) -> str:
    """Strip Hard Mode / chapter-variant / footnote annotations from a name
    so variant rows (e.g. 'Rutger (HM)', 'Felicia (Chapter 16)', 'Izana *1')
    collapse onto the base character entry."""
    name = str(raw).strip().replace("’", "'")
    name = re.sub(r"\s*\(.*?\)\s*$", "", name)
    name = re.sub(r"\s*\*+\d*\s*$", "", name)  # footnote markers: '*', '**', '*1'
    name = re.sub(r"\s+HM?$", "", name)  # trailing ' HM' / ' H' hard-mode variant
    return name.strip()


def parse_growth_value(raw) -> float | None:
    """'66 2/3' -> 66.0, '50' -> 50.0, NaN/non-numeric -> None"""
    if pd.isna(raw):
        return None
    match = re.match(r"\s*(\d+)", str(raw))
    return float(match.group(1)) if match else None


def fetch_page(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_named_tables(html: str) -> pd.DataFrame:
    """Extract and concatenate all tables on a page that have a 'Name' column,
    skipping sections tagged as NPC/Boss/navigation, and dropping repeated
    header rows embedded mid-table.
    """
    soup = BeautifulSoup(html, "lxml")
    entry = soup.find("div", class_="entry")
    if entry is None:
        return pd.DataFrame()

    frames = []
    section = ""
    for el in entry.find_all(["h2", "h3", "h4", "table"]):
        if el.name in ("h2", "h3", "h4"):
            section = el.get_text(strip=True).lower()
            continue
        if any(kw in section for kw in SKIP_SECTION_KEYWORDS):
            continue
        try:
            df = pd.read_html(io.StringIO(str(el)))[0]
        except ValueError:
            continue
        if "Name" not in df.columns and "Character" in df.columns:
            df = df.rename(columns={"Character": "Name"})
        if "Name" not in df.columns:
            continue
        df = df[df["Name"] != "Name"].reset_index(drop=True)
        df["Name"] = df["Name"].map(clean_name)
        frames.append(df)

    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True, sort=False)


def source_tables(source: dict, logical_page: str) -> pd.DataFrame:
    """Fetch and parse one logical page (base-stats/growth-rates/recruitment)
    for a source. `page_names` remaps the URL slug; a None slug means the
    source has no such page (e.g. Fates Revelation has no growth-rates page)."""
    slug = source.get("page_names", {}).get(logical_page, logical_page)
    if slug is None:
        return pd.DataFrame()
    url = f"https://serenesforest.net/{source['base_path']}/{slug}/"
    segment = source.get("suffixes", {}).get(logical_page)
    if segment:
        url += f"{segment}/"
    try:
        return extract_named_tables(fetch_page(url))
    except requests.HTTPError:
        return pd.DataFrame()


def ingest_source(game_name: str, source: dict, characters: dict[str, dict]) -> None:
    """Merge one source's tables into the shared `characters` dict. First
    source wins for a given name; later sources add new names and fill in
    fields the earlier source left blank."""
    base_stats = source_tables(source, "base-stats")
    growth_rates = source_tables(source, "growth-rates")
    recruitment = source_tables(source, "recruitment")

    for _, row in base_stats.iterrows():
        name = row["Name"]
        class_name = row.get("Class", "")
        if not name or name.lower() in ("nan", "class", "name", "character") or name in characters:
            continue  # skip junk/header rows; keep first occurrence of real dupes
        if str(class_name).strip() in ("Class", "Character"):
            continue  # repeated header row that slipped past the Name check
        if str(class_name).strip().lower() in ("varies", "nan", ""):
            class_name = ""
        weapon_types = CHARACTER_WEAPON_OVERRIDES.get((game_name, name)) or derive_weapon_types(class_name)
        characters[name] = {
            "name": name,
            "game": game_name,
            "starting_class": class_name,
            "weapon_types": weapon_types,
        }

    alias_cols = [c for c in growth_rates.columns if c in STAT_ALIASES] if not growth_rates.empty else []
    for _, row in growth_rates.iterrows():
        # Some games list sibling dancers on one shared row ("Nils/Ninian").
        row_names = [row["Name"]] + [p.strip() for p in str(row["Name"]).split("/")]
        for name in row_names:
            if name not in characters or "growths" in characters[name]:
                continue
            growths = {stat: None for stat in CANONICAL_STATS}
            for col in alias_cols:
                value = parse_growth_value(row[col])
                if value is None:
                    continue
                for canonical in STAT_ALIASES[col]:
                    # keep the max when two columns map to one stat (e.g. S/M + Mag)
                    prev = growths[canonical]
                    growths[canonical] = value if prev is None else max(prev, value)
            characters[name]["growths"] = growths
            characters[name]["low_growth_stats"] = [s for s, v in growths.items() if v is not None and v <= LOW_GROWTH_MAX]
            characters[name]["high_growth_stats"] = [s for s, v in growths.items() if v is not None and v >= HIGH_GROWTH_MIN]

    for _, row in recruitment.iterrows():
        name = row["Name"]
        if name not in characters or "recruit_note" in characters[name]:
            continue
        recruit_text = str(row.get("Recruit", ""))
        characters[name]["chapter_joined"] = row.get("Ch", row.get("Chapter"))
        characters[name]["is_recruitable_enemy"] = "enemy" in recruit_text.lower()
        characters[name]["recruit_note"] = recruit_text


def scrape_game(game: dict) -> list[dict]:
    sources = [game["primary"], *game.get("extra_sources", [])]
    characters: dict[str, dict] = {}
    for source in sources:
        ingest_source(game["name"], source, characters)

    # Give every record a uniform shape: characters missing from the recruitment
    # table (e.g. FE4 2nd-gen children) or the growth-rate table (a few edge
    # units with name mismatches) still get all keys, just empty.
    for char in characters.values():
        char.setdefault("chapter_joined", None)
        char.setdefault("is_recruitable_enemy", False)
        char.setdefault("recruit_note", None)
        char.setdefault("growths", {stat: None for stat in CANONICAL_STATS})
        char.setdefault("low_growth_stats", [])
        char.setdefault("high_growth_stats", [])

    # Drop pure bosses/NPCs: units that appear in base-stats but have neither a
    # growth-rate entry nor a recruitment entry are not playable characters.
    playable, dropped = [], []
    for char in characters.values():
        has_growths = any(v is not None for v in char["growths"].values())
        if has_growths or char["recruit_note"] is not None:
            playable.append(char)
        else:
            dropped.append(char["name"])
    if dropped:
        print(f"  {game['name']}: dropped {len(dropped)} non-playable: {', '.join(dropped)}")
    return playable


def apply_gender(records: list[dict], out_dir: Path) -> None:
    """Apply the FE Wiki gender pass (scrape_gender.py output) in place. Every
    record gets a `gender` key; it's None for the handful of player-choice
    avatars/children the wiki can't pin down."""
    gender_path = out_dir / "gender.json"
    if not gender_path.exists():
        print("data/gender.json not found - run scrape_gender.py for the gender field")
        for char in records:
            char.setdefault("gender", None)
        return
    gender_map = json.loads(gender_path.read_text(encoding="utf-8"))
    for char in records:
        char["gender"] = gender_map.get(char["name"])
    resolved = sum(1 for c in records if c.get("gender"))
    print(f"Applied gender to {resolved}/{len(records)} characters")


if __name__ == "__main__":
    out_dir = Path(__file__).parent / "data"
    out_dir.mkdir(exist_ok=True)

    summary = []
    per_game: dict[str, list[dict]] = {}
    for game in GAMES:
        slug = game["name"].lower().replace(":", "").replace(" ", "_")
        try:
            per_game[slug] = scrape_game(game)
            summary.append((game["name"], len(per_game[slug]), None))
        except Exception as e:  # noqa: BLE001 - report and continue for PoC batch run
            summary.append((game["name"], 0, str(e)))

    # Apply gender before writing anything, so every file in data/ has the same
    # record shape (per-game files and the merged characters.json alike).
    all_records = [char for records in per_game.values() for char in records]
    apply_gender(all_records, out_dir)

    for slug, records in per_game.items():
        (out_dir / f"{slug}.json").write_text(
            json.dumps(records, indent=2, default=str), encoding="utf-8"
        )
    (out_dir / "characters.json").write_text(
        json.dumps(all_records, indent=2, default=str), encoding="utf-8"
    )

    print(f"\n{'Game':<32}{'Characters':<12}Status")
    for name, count, error in summary:
        status = f"ERROR: {error}" if error else "OK"
        print(f"{name:<32}{count:<12}{status}")
    print(f"\nMerged {len(all_records)} characters -> data/characters.json")

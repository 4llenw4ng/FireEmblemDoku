"""
Normalizes the scraped in-game dialogue portraits in
`assets/Character Avatars/` into a consistent square size for the web app,
saved to `app/public/icons/characters/`.

Unlike the earlier full-body official-art attempt, these source images are
already tight, game-accurate portrait crops (Fire Emblem Wiki's "Portrait X
feNN.png" files) -- no face-finding heuristic needed. Dimensions vary by game
era (48x64 for older titles, 96x80 for GBA, 128x128 for 3DS), so this pads
(never crops) each onto a square canvas before resizing, so nothing is lost.
"""
from pathlib import Path

from PIL import Image

SRC_DIR = Path(__file__).parent.parent / "assets" / "Character Avatars"
DST_DIR = Path(__file__).parent.parent / "app" / "public" / "icons" / "characters"
OUTPUT_SIZE = 128


def process(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    side = max(im.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    resized = square.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.NEAREST if side < 100 else Image.LANCZOS)
    resized.save(dst)


def main() -> None:
    DST_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC_DIR.iterdir() if p.is_file())
    print(f"Processing {len(files)} avatars -> {DST_DIR}")
    failed = []
    for i, src in enumerate(files, 1):
        dst = DST_DIR / f"{src.stem}.png"
        try:
            process(src, dst)
        except Exception as e:  # noqa: BLE001 - report and continue
            print(f"  FAILED {src.name}: {e}")
            failed.append(src.stem)
        if i % 100 == 0:
            print(f"  {i}/{len(files)}")
    print(f"Done. {len(files) - len(failed)} written, {len(failed)} failed.")


if __name__ == "__main__":
    main()

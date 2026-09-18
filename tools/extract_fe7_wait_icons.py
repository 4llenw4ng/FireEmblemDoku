"""
Extracts the class "wait icon" graphics (the small in-map idle animation
shown under a unit while it waits its turn) from a Fire Emblem 7 (US) GBA
ROM you own.

This ports the exact logic FEBuilderGBA uses to read these graphics
(ROMFE7U.cs address constants, LZ77.cs decompression, ImageUtil.cs tile/
palette decoding, ImageUnitWaitIconFrom.cs frame layout) from C# to Python,
operating read-only on your local ROM file. No ROM or game data is bundled
with or committed to this repo -- only the resulting small icon crops are
written to app/public/icons/classes/ for personal use in this fan project.

Usage: python tools/extract_fe7_wait_icons.py "path/to/Fire Emblem (U).gba"
"""
import struct
import sys
from pathlib import Path

from PIL import Image

# --- ROMFE7U.cs address constants ---
WAIT_ICON_TABLE = 0x024DA0  # unit_wait_icon_pointer
WAIT_ICON_ENTRY_SIZE = 8
CLASS_TABLE = 0x0178F0  # class_pointer
CLASS_ENTRY_SIZE = 84  # class_datasize
PALETTE_ADDRESS = 0x194594  # unit_icon_palette_address (own army / blue)

OUT_DIR = Path(__file__).parent / "extracted" / "fe7_wait_icons"


def lz77_decompress(data: bytes, offset: int) -> bytes:
    """Port of LZ77.cs decompress() -- standard GBA LZ77 (magic byte 0x10)."""
    if offset >= len(data) or data[offset] != 0x10:
        return b""
    size = data[offset + 1] | (data[offset + 2] << 8) | (data[offset + 3] << 16)
    if size < 3:
        return b""
    out = bytearray(size)
    write = 0
    index = offset + 4
    n = len(data)
    while write < size and index < n:
        flags = data[index]
        index += 1
        for bit in range(7, -1, -1):
            if write >= size or index >= n:
                break
            if not (flags & (1 << bit)):
                out[write] = data[index]
                write += 1
                index += 1
            else:
                if index + 1 >= n:
                    break
                first = data[index]
                second = data[index + 1]
                index += 2
                amount = 3 + (first >> 4)
                copy_offset = ((first & 0x0F) << 8) | second
                if write + amount >= size:
                    amount = size - write
                if write <= copy_offset:
                    amount = 0
                for _ in range(amount):
                    out[write] = out[write - copy_offset - 1]
                    write += 1
    return bytes(out)


def is_pointer(a: int) -> bool:
    return 0x08000000 <= a < 0x0A000000


def to_offset(ptr: int) -> int:
    if ptr <= 1:
        return ptr
    return ptr - 0x08000000 if is_pointer(ptr) else ptr


def load_palette(data: bytes, addr: int, count: int = 16) -> list[tuple[int, int, int]]:
    """GBA RGB555 -> RGB888, same <<3 shift FEBuilderGBA uses (not full bit
    replication), so colors match what the tool itself renders."""
    colors = []
    for i in range(count):
        p = data[addr + i * 2] | (data[addr + i * 2 + 1] << 8)
        r = (p & 0x1F) << 3
        g = ((p >> 5) & 0x1F) << 3
        b = ((p >> 10) & 0x1F) << 3
        colors.append((r, g, b))
    return colors


def calc_height(width: int, image_size: int, align: int = 8) -> int:
    height = image_size // (width // 2)
    if image_size % (width // 2) != 0:
        height += 1
    if height % align != 0:
        height += align
    return height // align * align


def tiles_to_indices(image: bytes, width: int, height: int) -> list[list[int]]:
    """4bpp GBA tile decode: 8x8 tiles, left-to-right then down; each byte
    packs two horizontally-adjacent pixels (low nibble = left pixel)."""
    idx = [[0] * width for _ in range(height)]
    x = y = 0
    i = 0
    length = min(len(image), (width * height) // 2)
    while i < length:
        for y8 in range(8):
            for x8 in range(0, 8, 2):
                if i >= length:
                    return idx
                a = image[i]
                i += 1
                if y + y8 < height and x + x8 < width:
                    idx[y + y8][x + x8] = a & 0x0F
                if y + y8 < height and x + x8 + 1 < width:
                    idx[y + y8][x + x8 + 1] = (a >> 4) & 0x0F
        x += 8
        if x >= width:
            x = 0
            y += 8
    return idx


def build_image(idx: list[list[int]], palette, width: int, height: int) -> Image.Image:
    im = Image.new("RGBA", (width, height))
    px = im.load()
    for y in range(height):
        for x in range(width):
            v = idx[y][x]
            if v == 0:
                px[x, y] = (0, 0, 0, 0)  # palette index 0 = transparent
            else:
                r, g, b = palette[v]
                px[x, y] = (r, g, b, 255)
    return im


def deref(data: bytes, addr: int) -> int:
    """InputFormRef treats its `basepointer` arg as the ROM address OF a
    pointer (BaseAddress = ROM.p32(toOffset(basepointer))), not the table
    address itself -- one extra level of indirection versus reading the
    table straight from the raw constant."""
    ptr = struct.unpack_from("<I", data, addr)[0]
    return to_offset(ptr)


def read_wait_icon_table(data: bytes, max_entries: int = 200):
    """Port of ImageUnitWaitIconFrom.Init's row-validity predicate."""
    table_base = deref(data, WAIT_ICON_TABLE)
    entries = []
    for i in range(max_entries):
        addr = table_base + i * WAIT_ICON_ENTRY_SIZE
        if addr + 8 > len(data):
            break
        flags = struct.unpack_from("<I", data, addr)[0]
        ptr = struct.unpack_from("<I", data, addr + 4)[0]
        if i > 0 and not is_pointer(ptr):
            if ptr == 0 and flags == 0:
                break
            if ptr != 0:
                break
        b2 = data[addr + 2]
        entries.append((i, b2, ptr))
    return entries


def read_class_table(data: bytes, max_entries: int = 120):
    """cid -> wait_icon_id, via the class data table (class_pointer,
    class_datasize=84, icon id byte at +6)."""
    table_base = deref(data, CLASS_TABLE)
    mapping = {}
    for cid in range(1, max_entries):
        addr = table_base + cid * CLASS_ENTRY_SIZE
        if addr + 7 > len(data):
            break
        icon_id = data[addr + 6]
        mapping[cid] = icon_id
    return mapping


def extract_frames(data: bytes, b2: int, ptr: int, palette) -> list[Image.Image]:
    offset = to_offset(ptr)
    if offset <= 0 or offset >= len(data):
        return []
    decompressed = lz77_decompress(data, offset)
    if not decompressed:
        return []

    strip_w = 32 if b2 == 2 else 16
    strip_h = calc_height(strip_w, len(decompressed))
    idx = tiles_to_indices(decompressed, strip_w, strip_h)

    frames = []
    for step in range(3):
        if b2 == 0:
            y0, h, w = step * 16, 16, 16
        elif b2 == 1:
            y0, h, w = 32 * step + 8, 24, 16
        else:
            y0, h, w = 32 * step, 32, 32
        if y0 + h > strip_h:
            break
        sub = [row[:w] for row in idx[y0 : y0 + h]]
        frames.append(build_image(sub, palette, w, h))
    return frames


def main() -> None:
    rom_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not rom_path:
        print("Usage: python extract_fe7_wait_icons.py <path-to-rom.gba>")
        raise SystemExit(1)

    data = Path(rom_path).read_bytes()
    title = data[0xA0:0xAC].decode("ascii", errors="replace").strip("\x00")
    code = data[0xAC:0xB0].decode("ascii", errors="replace")
    print(f"ROM: {title!r} ({code})")
    if code != "AE7E":
        print(f"Warning: expected FE7(U) game code AE7E, got {code!r} -- addresses may not match.")

    palette = load_palette(data, PALETTE_ADDRESS)
    icon_entries = {i: (b2, ptr) for i, b2, ptr in read_wait_icon_table(data)}
    print(f"Wait-icon table: {len(icon_entries)} entries")

    class_to_icon = read_class_table(data)
    print(f"Class table: {len(class_to_icon)} entries")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for cid, icon_id in class_to_icon.items():
        if icon_id not in icon_entries:
            continue
        b2, ptr = icon_entries[icon_id]
        if ptr == 0:
            continue
        frames = extract_frames(data, b2, ptr, palette)
        if not frames:
            continue

        stem = f"cid{cid:02d}_icon{icon_id:02d}"
        frames[0].save(OUT_DIR / f"{stem}.png")
        if len(frames) > 1:
            frames[0].save(
                OUT_DIR / f"{stem}.gif",
                save_all=True,
                append_images=frames[1:],
                duration=400,  # FEBuilderGBA's own preview uses 100ms/frame; slowed 4x total for readability at UI size
                loop=0,
                disposal=2,
            )
        written += 1

    print(f"Wrote {written} class icons -> {OUT_DIR}")


if __name__ == "__main__":
    main()

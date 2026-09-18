"""
Decodes real English class names from a Fire Emblem 7 (US) ROM, porting
FEBuilderGBA's Huffman text decoder (FETextDecode.cs: Decode/DecodeAddr/
huffman_decode/append_string/isEscapeCode) from C# to Python. Ground-truths
the class-icon labels in extract_fe7_wait_icons.py instead of guessing names
from 16px pixel art.

Usage: python tools/decode_fe7_class_names.py "path/to/Fire Emblem (U).gba"
"""
import struct
import sys
from pathlib import Path

# --- ROMFE7U.cs address constants ---
CLASS_TABLE = 0x0178F0  # class_pointer
CLASS_ENTRY_SIZE = 84  # class_datasize
TEXT_POINTER = 0x012CB8  # text_pointer
MASK_POINTER = 0x0006BC  # Huffman tree start (single deref)
MASK_POINT_BASE_POINTER = 0x0006B8  # Huffman tree data base (double deref)


def is_pointer(a: int) -> bool:
    return 0x08000000 <= a < 0x0A000000


def to_offset(ptr: int) -> int:
    if ptr <= 1:
        return ptr
    return ptr - 0x08000000 if is_pointer(ptr) else ptr


def u32(data: bytes, addr: int) -> int:
    return struct.unpack_from("<I", data, addr)[0]


def u16(data: bytes, addr: int) -> int:
    return struct.unpack_from("<H", data, addr)[0]


def deref(data: bytes, addr: int) -> int:
    return to_offset(u32(data, addr))


def is_escape_code(code: int, beforecode: int) -> bool:
    return (
        beforecode in (0x0010, 0x0011, 0x0080)
        or code <= 0x001F
        or (0x0080 <= code <= 0x0F00)
    )


def append_string(out: bytearray, code: int, beforecode: int) -> None:
    if code == 0:
        return
    if is_escape_code(code, beforecode):
        out.append(ord("@"))
        out.extend(f"{code:04X}".encode("ascii"))
        return
    if (code & 0xFF00) == 0:
        out.append(code & 0xFF)
        return
    out.append(code & 0xFF)
    out.append((code >> 8) & 0xFF)


def huffman_decode(data: bytes, addr: int) -> bytes:
    tree_base = deref(data, MASK_POINTER)
    tree_data_base = deref(data, deref(data, MASK_POINT_BASE_POINTER))

    out = bytearray()
    tree_data = tree_data_base
    beforecode = 0
    n = len(data)

    while True:
        if addr + 4 > n:
            break
        bit = u32(data, addr)
        if bit == 0x0:
            if addr + 8 > n:
                break
            if u32(data, addr + 4) == 0x0:
                break  # terminator
        addr += 1

        for _bit_index in range(7, -1, -1):
            tree_addr = tree_data + (bit & 1) * 2
            if tree_addr + 2 > n:
                return bytes(out)
            tree_ = u16(data, tree_addr)
            tree_data = tree_base + tree_ * 4
            bit >>= 1

            if tree_data + 4 > n:
                return bytes(out)
            word = u32(data, tree_data)
            if (word & 0x80000000) == 0:
                continue
            tree_data = tree_data_base

            code = word & 0xFFFF
            if code <= 0 or (code & 0xFF) == 0:
                return bytes(out)  # string terminator

            # is_multibyte=false for FE7U, so the SJIS-vs-single-byte branch
            # in the original always takes the "useSJIS" path's condition as
            # true whenever code fits one byte or is a recognized escape
            # range -- for plain single-byte text (all we need for class
            # names) this reduces to a single append_string call.
            append_string(out, code, beforecode)
            beforecode = code

    return bytes(out)


def decode_text(data: bytes, text_id: int) -> str:
    if text_id >= 0x7FFF:
        return ""
    text_base = deref(data, TEXT_POINTER)
    entry_addr = text_base + text_id * 4
    if entry_addr + 4 > len(data):
        return ""
    paddr = u32(data, entry_addr)
    if not is_pointer(paddr):
        return ""
    raw = huffman_decode(data, to_offset(paddr))
    # Strip @XXXX escape codes (control codes irrelevant for short class
    # names) and decode as Latin-1 (FE7(U) is single-byte English text).
    text = raw.decode("latin-1")
    out = []
    i = 0
    while i < len(text):
        if text[i] == "@" and i + 5 <= len(text) and all(c in "0123456789ABCDEF" for c in text[i+1:i+5]):
            i += 5
            continue
        out.append(text[i])
        i += 1
    return "".join(out).strip()


def main() -> None:
    rom_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not rom_path:
        print("Usage: python decode_fe7_class_names.py <path-to-rom.gba>")
        raise SystemExit(1)

    data = Path(rom_path).read_bytes()
    class_table = deref(data, CLASS_TABLE)

    print(f"{'cid':>4}  {'name':<24} text_id")
    for cid in range(1, 119):
        addr = class_table + cid * CLASS_ENTRY_SIZE
        if addr + 2 > len(data):
            break
        text_id = u16(data, addr)
        name = decode_text(data, text_id)
        print(f"{cid:>4}  {name:<24} {text_id}")


if __name__ == "__main__":
    main()

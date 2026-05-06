from __future__ import annotations

import json
import math
import re
import shutil
import struct
import subprocess
from pathlib import Path

from PIL import Image


TREE_VERSION = "0_4"
ATLAS_NAME = "ascendancy-background_1500_1500_BC7.dds.zst"
MAX_SIZE = 512


def slugify(value: str) -> str:
    value = re.sub(r"^Classes", "", value).strip()
    value = re.sub(r"([a-z])([A-Z])", r"\1-\2", value)
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-")
    return value.lower()


def display_name(asset_name: str) -> str:
    return re.sub(r"^Classes", "", asset_name).strip()


def block_mip_size(width: int, height: int) -> int:
    return max(1, math.ceil(width / 4)) * max(1, math.ceil(height / 4)) * 16


def main() -> None:
    wiki_root = Path(__file__).resolve().parents[1]
    workspace_root = wiki_root.parent
    tree_dir = workspace_root / "Path of Building Community (PoE2)" / "TreeData" / TREE_VERSION
    tree_json = tree_dir / "tree.json"
    atlas_zst = tree_dir / ATLAS_NAME
    temp_dir = wiki_root / ".tmp" / "pob-ascendancy"
    output_dir = wiki_root / "assets" / "ascendancies"
    data_dir = wiki_root / "data"

    if not tree_json.exists():
        raise FileNotFoundError(f"Missing PoB tree data: {tree_json}")
    if not atlas_zst.exists():
        raise FileNotFoundError(f"Missing PoB atlas: {atlas_zst}")

    tree = json.loads(tree_json.read_text(encoding="utf-8"))
    atlas_map = tree["ddsCoords"][ATLAS_NAME]

    temp_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    atlas_dds = temp_dir / ATLAS_NAME.replace(".zst", "")
    zstd = shutil.which("zstd") or shutil.which("zstd.exe")
    if not zstd:
        raise RuntimeError("zstd executable is required to unpack PoB .dds.zst atlases.")
    subprocess.run([zstd, "-d", "-f", str(atlas_zst), "-o", str(atlas_dds)], check=True)

    data = atlas_dds.read_bytes()
    header_size = 148 if data[84:88] == b"DX10" else 128
    header = bytearray(data[:header_size])
    width = struct.unpack_from("<I", data, 16)[0]
    height = struct.unpack_from("<I", data, 12)[0]
    mip_count = max(1, struct.unpack_from("<I", data, 28)[0])
    array_size = struct.unpack_from("<I", data, 140)[0] if header_size == 148 else 1

    mip_sizes = []
    mip_width = width
    mip_height = height
    for _ in range(mip_count):
        mip_sizes.append(block_mip_size(mip_width, mip_height))
        mip_width = max(1, mip_width // 2)
        mip_height = max(1, mip_height // 2)
    slice_size = sum(mip_sizes)

    if header_size + slice_size * array_size > len(data):
        raise RuntimeError("DDS atlas is shorter than expected; refusing to export partial frames.")

    if header_size == 148:
        struct.pack_into("<I", header, 140, 1)
    struct.pack_into("<I", header, 20, slice_size)

    assets = {}
    by_class = {}
    by_ascendancy = {}

    for asset_name, one_based_index in sorted(atlas_map.items(), key=lambda entry: entry[1]):
        frame_index = int(one_based_index) - 1
        if frame_index < 0 or frame_index >= array_size:
            continue

        frame_bytes = data[header_size + frame_index * slice_size:header_size + (frame_index + 1) * slice_size]
        frame_dds = temp_dir / f"{slugify(asset_name)}.dds"
        frame_dds.write_bytes(header + frame_bytes)

        image = Image.open(frame_dds).convert("RGBA")
        image.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)

        slug = slugify(asset_name)
        image_path = output_dir / f"{slug}.webp"
        image.save(image_path, "WEBP", quality=88, method=6)

        local_path = f"./assets/ascendancies/{slug}.webp"
        name = display_name(asset_name)
        entry = {
            "asset": asset_name,
            "name": name,
            "slug": slug,
            "image": local_path,
            "sourceIndex": int(one_based_index),
        }
        assets[asset_name] = entry

    for class_data in tree.get("classes", []):
        class_name = class_data.get("name")
        class_asset = class_data.get("background", {}).get("image")
        if class_name and class_asset in assets:
            by_class[class_name] = assets[class_asset]["image"]
        for ascendancy in class_data.get("ascendancies", []):
            ascendancy_name = ascendancy.get("name") or ascendancy.get("id")
            ascendancy_asset = ascendancy.get("background", {}).get("image")
            if ascendancy_name and ascendancy_asset in assets:
                by_ascendancy[ascendancy_name] = assets[ascendancy_asset]["image"]

    payload = {
        "treeVersion": TREE_VERSION,
        "source": "Path of Building Community (PoE2)/TreeData/0_4/tree.json",
        "atlas": f"Path of Building Community (PoE2)/TreeData/{TREE_VERSION}/{ATLAS_NAME}",
        "maxSize": MAX_SIZE,
        "assets": assets,
        "byClass": by_class,
        "byAscendancy": by_ascendancy,
    }

    json_path = data_dir / "pob-ascendancies.json"
    js_path = data_dir / "pob-ascendancies.js"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    js_path.write_text(
        "window.POB_ASCENDANCIES = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"Exported {len(assets)} PoB class/ascendancy portraits to {output_dir}")
    print(f"Wrote {json_path} and {js_path}")


if __name__ == "__main__":
    main()

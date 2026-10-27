#!/usr/bin/env python3
"""Reproducibly import a small, licensed whitelist from owner-supplied Kenney ZIPs.

No archive is extracted wholesale and no archive content is executed. GLB model
dependencies are resolved only inside their GLB-format directory. Run --check in
CI without uploads; rerun import with --source-dir after changing the whitelist.
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import re
import stat
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/models/kenney"
MANIFEST = ROOT / "data/assets/kenney-manifest.json"
MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 8 * 1024 * 1024
PACKS = {
    "characters": ("kenney_blocky-characters_20.zip", ["character-a", "character-b", "character-c", "character-d", "character-e"]),
    "cars": ("kenney_car-kit.zip", ["sedan", "hatchback-sports", "taxi"]),
    "commercial": ("kenney_city-kit-commercial_2.1.zip", ["building-a", "building-b", "building-c", "building-skyscraper-a", "detail-awning", "detail-parasol-a"]),
    "suburban": ("kenney_city-kit-suburban_20.zip", ["building-type-a", "building-type-b", "building-type-c", "tree-large", "tree-small"]),
    "market": ("kenney_mini-market.zip", ["display-bread", "display-fruit", "cash-register", "shelf-boxes", "shelf-bags", "shopping-basket", "shopping-cart", "freezer"]),
    "roads": ("kenney_city-kit-roads.zip", ["construction-barrier", "construction-cone", "dumpster", "light-curved", "road-sign-stop", "traffic-light", "road-straight"]),
    "trains": ("kenney_train-kit.zip", ["train-electric-city-a", "train-tram-modern", "railroad-straight"]),
    "watercraft": ("kenney_watercraft-pack.zip", ["boat-fishing-small", "boat-row-small", "boat-house-a", "buoy"]),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_relative(value: str) -> PurePosixPath:
    parsed = urlsplit(value)
    decoded = unquote(value)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or "\\" in decoded or "\x00" in decoded:
        raise ValueError(f"Non-local dependency: {value!r}")
    if decoded.startswith("/") or not decoded or any(part in ("", ".", "..") for part in decoded.split("/")):
        raise ValueError(f"Unsafe archive path: {value!r}")
    if not re.fullmatch(r"[A-Za-z0-9_. /-]+", decoded):
        raise ValueError(f"Unexpected archive path characters: {value!r}")
    return PurePosixPath(decoded)


def read_member(archive: zipfile.ZipFile, member: str) -> bytes:
    safe_relative(member)
    info = archive.getinfo(member)
    if stat.S_ISLNK(info.external_attr >> 16) or info.is_dir() or info.flag_bits & 1:
        raise ValueError(f"Not a regular unencrypted file: {member}")
    if info.file_size > MAX_FILE or info.compress_size == 0 and info.file_size > 0:
        raise ValueError(f"Archive member too large/invalid: {member}")
    if info.file_size > 1024 * 1024 and info.file_size / max(1, info.compress_size) > 500:
        raise ValueError(f"Suspicious compression ratio: {member}")
    data = archive.read(info)
    if len(data) != info.file_size:
        raise ValueError(f"Truncated archive member: {member}")
    return data


def parse_glb(raw: bytes) -> dict:
    if len(raw) < 20 or len(raw) > MAX_FILE:
        raise ValueError("GLB size outside budget")
    magic, version, length = struct.unpack_from("<4sII", raw)
    if magic != b"glTF" or version != 2 or length != len(raw):
        raise ValueError("Invalid GLB 2.0 header/length")
    size, kind = struct.unpack_from("<II", raw, 12)
    if kind != 0x4E4F534A or size > 2 * 1024 * 1024 or 20 + size > len(raw):
        raise ValueError("Invalid GLB JSON chunk")
    data = json.loads(raw[20:20 + size])
    if data.get("asset", {}).get("version") != "2.0":
        raise ValueError("Unsupported glTF version")
    return data


def multiply(a: list, b: list) -> list:
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def node_matrix(node: dict) -> list:
    if "matrix" in node:
        v = node["matrix"]
        if len(v) != 16:
            raise ValueError("Invalid node matrix")
        return [[v[j * 4 + i] for j in range(4)] for i in range(4)]
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    tx, ty, tz = node.get("translation", [0, 0, 0])
    return [[(1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y - 2 * z * w) * sy, (2 * x * z + 2 * y * w) * sz, tx],
            [(2 * x * y + 2 * z * w) * sx, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z - 2 * x * w) * sz, ty],
            [(2 * x * z - 2 * y * w) * sx, (2 * y * z + 2 * x * w) * sy, (1 - 2 * x * x - 2 * y * y) * sz, tz],
            [0, 0, 0, 1]]


def metadata(gltf: dict) -> dict:
    accessors, meshes, nodes = gltf.get("accessors", []), gltf.get("meshes", []), gltf.get("nodes", [])
    triangle_count, vertex_count, mesh_info = 0, 0, []
    for mesh in meshes:
        primitives = []
        for primitive in mesh["primitives"]:
            position = accessors[primitive["attributes"]["POSITION"]]
            if position.get("type") != "VEC3" or len(position.get("min", [])) != 3 or len(position.get("max", [])) != 3:
                raise ValueError("Position bounds missing")
            count = accessors[primitive["indices"]]["count"] if "indices" in primitive else position["count"]
            mode = primitive.get("mode", 4)
            if mode != 4 or count % 3:
                raise ValueError("Only triangle primitives are supported")
            triangle_count += count // 3
            vertex_count += position["count"]
            primitives.append({"vertices": position["count"], "triangles": count // 3, "material": primitive.get("material"), "attributes": list(primitive["attributes"]), "bounds": {"min": position["min"], "max": position["max"]}})
        mesh_info.append({"name": mesh.get("name", ""), "primitives": primitives})
    low, high = [math.inf] * 3, [-math.inf] * 3
    identity = [[int(i == j) for j in range(4)] for i in range(4)]
    scene_roots = gltf["scenes"][gltf.get("scene", 0)]["nodes"]

    def visit(index: int, parent: list, ancestors: set):
        if index in ancestors or len(ancestors) >= 64:
            raise ValueError("Node cycle/depth limit")
        node = nodes[index]
        transform = multiply(parent, node_matrix(node))
        if "mesh" in node:
            for primitive in mesh_info[node["mesh"]]["primitives"]:
                bounds = primitive["bounds"]
                for point in itertools.product(*zip(bounds["min"], bounds["max"])):
                    vector = [*point, 1]
                    for axis in range(3):
                        value = sum(transform[axis][k] * vector[k] for k in range(4))
                        low[axis], high[axis] = min(low[axis], value), max(high[axis], value)
        for child in node.get("children", []):
            visit(child, transform, ancestors | {index})

    for index in scene_roots:
        visit(index, identity, set())
    if not all(math.isfinite(n) for n in low + high) or any(high[i] <= low[i] for i in range(3)):
        raise ValueError("Non-finite or empty model bounds")
    bounds = {"min": low, "max": high, "size": [high[i] - low[i] for i in range(3)], "center": [(high[i] + low[i]) / 2 for i in range(3)], "pose": "glTF default scene pose; animated envelopes require runtime validation"}
    animations = []
    for animation in gltf.get("animations", []):
        sampler_times = [accessors[s["input"]] for s in animation["samplers"]]
        begin = min(a.get("min", [0])[0] for a in sampler_times)
        end = max(a.get("max", [0])[0] for a in sampler_times)
        animations.append({"name": animation.get("name", ""), "duration": end - begin, "channels": [{"node": c["target"]["node"], "nodeName": nodes[c["target"]["node"]].get("name", ""), "path": c["target"]["path"], "interpolation": animation["samplers"][c["sampler"]].get("interpolation", "LINEAR")} for c in animation["channels"]]})
    return {"meshes": len(meshes), "skins": len(gltf.get("skins", [])), "triangles": triangle_count, "vertices": vertex_count, "bounds": bounds, "clips": [a["name"] for a in animations], "animations": animations, "nodes": [{"index": i, **{k: node[k] for k in ["name", "mesh", "children", "translation", "rotation", "scale", "matrix"] if k in node}} for i, node in enumerate(nodes)], "meshInfo": mesh_info, "extensionsUsed": gltf.get("extensionsUsed", [])}


def safe_write(relative: str, data: bytes) -> dict:
    path = OUTPUT.joinpath(*safe_relative(relative).parts)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink() or not path.resolve().is_relative_to(OUTPUT.resolve()):
        raise ValueError("Output escapes owned asset directory")
    path.write_bytes(data)
    return {"url": "/models/kenney/" + relative, "sha256": sha(data), "bytes": len(data)}


def browser_catalog(manifest: dict) -> dict:
    keys = ["id", "url", "bytes", "license", "clips", "sha256"]
    return {"version": 1, "license": "CC0-1.0", "assets": [
        {**{key: asset[key] for key in keys}, "bounds": {key: asset["bounds"][key] for key in ["min", "max", "size", "center"]}}
        for asset in manifest["assets"]
    ]}


def import_packs(source_dir: Path):
    manifest = {"version": 1, "provider": "Kenney", "license": "CC0-1.0", "source": "owner-supplied ZIP archives", "packs": [], "assets": []}
    for pack, (filename, selected) in PACKS.items():
        candidates = sorted(source_dir.rglob(filename))
        if len(candidates) != 1:
            raise ValueError(f"Expected exactly one {filename}, found {len(candidates)}")
        source = candidates[0]
        with zipfile.ZipFile(source) as archive:
            names = archive.namelist()
            if len(names) != len(set(names)) or len(names) > 5000 or sum(i.file_size for i in archive.infolist()) > 128 * 1024 * 1024:
                raise ValueError(f"Unsafe archive index: {filename}")
            license_data = read_member(archive, "License.txt")
            if b"Creative Commons Zero, CC0" not in license_data:
                raise ValueError(f"CC0 license not present: {filename}")
            license_file = safe_write(f"{pack}/License.txt", license_data)
            manifest["packs"].append({"id": pack, "archive": filename, "archiveSha256": sha(source.read_bytes()), "license": "CC0-1.0", "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/", "creatorUrl": "https://kenney.nl", "licenseFile": license_file})
            for model in selected:
                member = f"Models/GLB format/{model}.glb"
                raw = read_member(archive, member)
                gltf = parse_glb(raw)
                entry = {"id": f"{pack}/{model}", "pack": pack, "name": model, "license": "CC0-1.0", "sourceArchive": filename, "sourceMember": member, **safe_write(f"{pack}/{model}.glb", raw), **metadata(gltf), "resources": []}
                uris = sorted({item["uri"] for category in ["images", "buffers"] for item in gltf.get(category, []) if "uri" in item})
                for uri in uris:
                    relative = safe_relative(uri)
                    if relative.suffix.lower() not in (".png", ".bin"):
                        raise ValueError(f"Unexpected dependency type: {uri}")
                    resource = read_member(archive, str(PurePosixPath(member).parent / relative))
                    entry["resources"].append({"uri": uri, **safe_write(f"{pack}/{relative}", resource)})
                preview_member = f"Previews/{model}.png"
                if preview_member in names:
                    entry["preview"] = safe_write(f"{pack}/Previews/{model}.png", read_member(archive, preview_member))
                if pack == "characters":
                    if entry["meshes"] != 6 or entry["skins"] != 0 or not {"idle", "walk", "sit", "pick-up", "holding-both", "interact-right"}.issubset(entry["clips"]):
                        raise ValueError(f"Unexpected object animation rig: {model}")
                    entry["rig"] = {"kind": "node-transform animation", "rootNode": "root", "torsoNode": "torso", "headNode": "head", "leftHandParent": "arm-left", "rightHandParent": "arm-right", "facing": "-Z expected; verify in rendered integration", "note": "Head has its own 0.1 scale; preserve hierarchy and animate with GLTFLoader/AnimationMixer. No finger bones or facial morph targets."}
                manifest["assets"].append(entry)
    files = {item["url"]: item for pack in manifest["packs"] for item in [pack["licenseFile"]]}
    for asset in manifest["assets"]:
        for item in [asset, *asset["resources"], *([asset["preview"]] if "preview" in asset else [])]:
            files[item["url"]] = item
    manifest["catalog"] = safe_write("catalog.json", (json.dumps(browser_catalog(manifest), ensure_ascii=False, separators=(",", ":")) + "\n").encode())
    files[manifest["catalog"]["url"]] = manifest["catalog"]
    manifest["assetCount"] = len(manifest["assets"])
    manifest["totalBytes"] = sum(item["bytes"] for item in files.values())
    manifest["uniqueFiles"] = len(files)
    if manifest["totalBytes"] > MAX_TOTAL:
        raise ValueError("Curated asset budget exceeded")
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    check_manifest()


def check_manifest():
    manifest = json.loads(MANIFEST.read_text())
    expected = {f"{pack}/{name}" for pack, (_, models) in PACKS.items() for name in models}
    if {a["id"] for a in manifest["assets"]} != expected or len(manifest["assets"]) != len(expected):
        raise ValueError("Curated manifest does not match whitelist")
    files = {}
    for pack in manifest["packs"]:
        if pack["license"] != "CC0-1.0":
            raise ValueError("Unapproved license")
        files[pack["licenseFile"]["url"]] = pack["licenseFile"]
    for asset in manifest["assets"]:
        if asset["license"] != "CC0-1.0" or asset["url"] != "/models/kenney/" + asset["id"] + ".glb":
            raise ValueError("Unapproved asset license/path")
        for item in [asset, *asset["resources"], *([asset["preview"]] if "preview" in asset else [])]:
            if not item["url"].startswith("/models/kenney/"):
                raise ValueError("Non-local deployed URL")
            files[item["url"]] = item
        model_path = OUTPUT.joinpath(*safe_relative(asset["url"].removeprefix("/models/kenney/")).parts)
        if model_path.is_symlink() or not model_path.resolve().is_relative_to(OUTPUT.resolve()):
            raise ValueError("Model escapes owned asset directory")
        raw = model_path.read_bytes()
        measured = metadata(parse_glb(raw))
        for key in ["bounds", "clips", "meshes", "skins", "triangles", "vertices"]:
            if measured[key] != asset[key]:
                raise ValueError(f"Stale {key}: {asset['id']}")
        if {r["uri"] for r in asset["resources"]} != {item["uri"] for category in ["images", "buffers"] for item in parse_glb(raw).get(category, []) if "uri" in item}:
            raise ValueError("Missing GLB dependency")
        for resource in asset["resources"]:
            safe_relative(resource["uri"])
    files[manifest["catalog"]["url"]] = manifest["catalog"]
    if json.loads((OUTPUT / "catalog.json").read_text()) != browser_catalog(manifest):
        raise ValueError("Browser catalog does not match full manifest")
    for url, item in files.items():
        relative = safe_relative(url.removeprefix("/models/kenney/"))
        path = OUTPUT.joinpath(*relative.parts)
        raw = path.read_bytes()
        if path.is_symlink() or not path.resolve().is_relative_to(OUTPUT.resolve()) or len(raw) != item["bytes"] or sha(raw) != item["sha256"]:
            raise ValueError(f"Asset integrity mismatch: {url}")
    total = sum(item["bytes"] for item in files.values())
    if total != manifest["totalBytes"] or total > MAX_TOTAL or len(files) != manifest["uniqueFiles"]:
        raise ValueError("Asset budget/count mismatch")
    print(json.dumps({"assets": len(manifest["assets"]), "packs": len(manifest["packs"]), "files": len(files), "bytes": total, "license": "CC0-1.0", "dependencies": "local and complete", "integrity": "verified"}))


class SafetyTests(unittest.TestCase):
    def test_paths(self):
        for value in ["../token", "/etc/passwd", "Textures/../../token", "https://x/a.png", "file:///a", "Textures/%2e%2e/a", "Textures\\a", "a.png?token=x", "a.png#fragment", "C:/a"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                safe_relative(value)
        self.assertEqual(str(safe_relative("Textures/colormap.png")), "Textures/colormap.png")

    def test_glb_header(self):
        for raw in [b"", b"not a model" * 5, struct.pack("<4sII", b"glTF", 1, 20) + b"12345678"]:
            with self.assertRaises(ValueError):
                parse_glb(raw)

    def test_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "malicious.zip"
            with zipfile.ZipFile(path, "w") as archive:
                item = zipfile.ZipInfo("Textures/colormap.png")
                item.external_attr = (stat.S_IFLNK | 0o777) << 16
                archive.writestr(item, "../../secret")
            with zipfile.ZipFile(path) as archive, self.assertRaises(ValueError):
                read_member(archive, "Textures/colormap.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=Path("/workspace/attachments"))
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        result = unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(SafetyTests))
        sys.exit(not result.wasSuccessful())
    if args.check:
        check_manifest()
    else:
        import_packs(args.source_dir)

#!/usr/bin/env bash
# Fetch self-hosted background-removal assets (model + CPU WASM only).
# Run with: bash scripts/fetch-bg-assets.sh
# Required by src/lib/bgRemoval.ts (publicPath: /bg-removal-data/dist/)
set -euo pipefail

VERSION="${1:-1.7.0}"
OUT="public/bg-removal-data/dist"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading @imgly/background-removal-data@${VERSION} ..."
curl -fsSL "https://staticimgly.com/@imgly/background-removal-data/${VERSION}/package.tgz" -o "$TMP/pkg.tgz"

mkdir -p "$TMP/pkg"
tar -xzf "$TMP/pkg.tgz" -C "$TMP/pkg"
SRC="$TMP/pkg/package/dist"

echo "Pruning to isnet_quint8 model + CPU WASM ..."
python3 - "$SRC" "$OUT" <<'PY'
import json, os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
d = json.load(open(os.path.join(src, "resources.json")))
keep = [k for k in d if k.startswith("/onnxruntime-web/")] + ["/models/isnet_quint8"]
pruned, needed = {}, set()
for k in keep:
    pruned[k] = d[k]
    for c in d[k]["chunks"]:
        needed.add(c["name"])
for h in needed:
    shutil.copy2(os.path.join(src, h), os.path.join(dst, h + ".bin"))
# Capacitor's Android WebViewLocalServer only serves URLs containing a "." (extension),
# so extension-less chunk files 404 on device. Give chunks a .bin extension and update resources.json.
for entry in pruned.values():
    for c in entry["chunks"]:
        c["name"] = c["name"] + ".bin"
        c["hash"] = c["name"]
for mjs in ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.jsep.mjs"]:
    p = os.path.join(src, "onnxruntime-web", mjs)
    if os.path.exists(p):
        os.makedirs(os.path.join(dst, "onnxruntime-web"), exist_ok=True)
        shutil.copy2(p, os.path.join(dst, "onnxruntime-web", mjs))
json.dump(pruned, open(os.path.join(dst, "resources.json"), "w"))
PY

echo "Done -> $OUT"

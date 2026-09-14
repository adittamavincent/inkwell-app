#!/bin/bash
set -e

echo "🔨 Rebuilding native modules for Electron 33.2.1 (ARM64)..."

export PATH="/Volumes/Meaw/code-repos/apps-building/inkwell-app/node_modules/.bin:$PATH"

# Build better-sqlite3
echo "Building better-sqlite3 for Electron..."
cd node_modules/better-sqlite3
rm -rf build release
node-gyp clean && node-gyp rebuild --release --fetch=electron --target=33.2.1 --dist-url=https://electronjs.org/headers 2>&1 | tail -20

cd ../../..
echo "✅ Native modules rebuilt!"

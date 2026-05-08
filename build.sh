#!/bin/bash
# build.sh — Sync src/ to dist/ + bump JS version cache buster
# Usage: npm run build (or ./build.sh)
#
# What it does:
# 1. Sync all HTML files from src/pages/ → dist/pages/
# 2. Sync all JS/CSS/image assets from src/assets/ → dist/assets/
# 3. Replace ?v=YYYYMMDD with today's date in all dist HTML files
# 4. Sync SPA shell (index.html)

set -euo pipefail

SRC="src"
DIST="dist"
VERSION="v=$(date +%Y%m%d)"

echo "🏗️  Building..."

# Create dist directories
mkdir -p "$DIST/pages" "$DIST/assets/js" "$DIST/assets/css" "$DIST/assets/images"
mkdir -p "$DIST/assets/js/ui" "$DIST/assets/js/utils" "$DIST/assets/video"

# 1. Sync HTML pages
echo "📦 Syncing HTML pages..."
find "$SRC/pages" -name '*.html' | while read -r f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  cp "$f" "$DIST/$rel"
done

# Sync SPA shell
cp "$SRC/index.html" "$DIST/index.html"

# 2. Sync JS assets
echo "📦 Syncing JS assets..."
find "$SRC/assets/js" -name '*.js' | while read -r f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  cp "$f" "$DIST/$rel"
done

# 3. Sync CSS
echo "📦 Syncing CSS..."
find "$SRC/assets/css" -name '*.css' 2>/dev/null | while read -r f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  cp "$f" "$DIST/$rel"
done

# 4. Sync images (copy only if newer or missing)
echo "📦 Syncing images..."
find "$SRC/assets/images" -type f 2>/dev/null | while read -r f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  if [ ! -f "$DIST/$rel" ] || [ "$f" -nt "$DIST/$rel" ]; then
    cp "$f" "$DIST/$rel"
  fi
done

# 5. Sync video (skip if no video dir or files > 50MB are already there)
echo "📦 Syncing video..."
find "$SRC/assets/video" -type f 2>/dev/null | while read -r f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  if [ ! -f "$DIST/$rel" ] || [ "$f" -nt "$DIST/$rel" ]; then
    cp "$f" "$DIST/$rel"
  fi
done

# 6. Bump JS version in all dist HTML files (only ?v= pattern)
echo "🔄 Bumping JS version to $VERSION..."
find "$DIST" -name '*.html' -exec sed -i '' "s|?v=[0-9][0-9]*|?$VERSION|g" {} +

# Also bump in src HTML files to keep them in sync
find "$SRC/pages" -name '*.html' -exec sed -i '' "s|?v=[0-9][0-9]*|?$VERSION|g" {} +

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Build complete: $FILES files in dist/"
echo "   Version: $VERSION"

#!/bin/bash
# build.sh — Sync src/ to dist/ + bump JS version cache buster
# Usage: npm run build (or ./build.sh)
#
# What it does:
# 1. Sync all HTML pages from src/pages/ → dist/pages/
# 2. Sync all assets (JS, CSS, fonts, images, lang, video) from src/assets/ → dist/assets/
# 3. Replace ?v=YYYYMMDD with today's date in all dist HTML files
# 4. Sync SPA shell (index.html)

set -euo pipefail

SRC="src"
DIST="dist"
VERSION="v=$(date +%Y%m%d%H%M)"

echo "🏗️  Building..."

# ─── Pre-flight checks ───────────────────────────────────────────
# Catch corrupted source files before they propagate to dist
INDEX_SIZE=$(wc -c < "$SRC/index.html")
if [ "$INDEX_SIZE" -lt 1000 ]; then
  echo "❌ ERROR: src/index.html is suspiciously small (${INDEX_SIZE} bytes)."
  echo "   Expected ~8000+ bytes. File may be corrupted."
  echo "   Restore with: git checkout -- src/index.html"
  exit 1
fi

# ─── Generic sync helper ─────────────────────────────────────────
# Usage: sync_assets <src_subdir> <ext_glob> [incremental]
#   incremental: only copy if newer or missing (for large dirs)
sync_assets() {
  local src_dir="$1"
  local ext_glob="$2"
  local incremental="${3:-}"
  local full_src="$SRC/assets/$src_dir"

  [ -d "$full_src" ] || return 0

  echo "📦 Syncing $src_dir..."
  # Use null-delimited find for safety with special characters
  find "$full_src" -type f -name "$ext_glob" -print0 | while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    mkdir -p "$DIST/$(dirname "$rel")"
    if [ -n "$incremental" ]; then
      [ -f "$DIST/$rel" ] && [ ! "$f" -nt "$DIST/$rel" ] && continue
    fi
    cp "$f" "$DIST/$rel"
  done
}

# ─── 1. HTML pages ──────────────────────────────────────────────
echo "📦 Syncing HTML pages..."
find "$SRC/pages" -name '*.html' -print0 | while IFS= read -r -d '' f; do
  rel="${f#$SRC/}"
  mkdir -p "$DIST/$(dirname "$rel")"
  cp "$f" "$DIST/$rel"
done
cp "$SRC/index.html" "$DIST/index.html"
# Copy 404.html
[ -f "$SRC/404.html" ] && cp "$SRC/404.html" "$DIST/404.html"
# Copy robots.txt if it exists
[ -f "$SRC/robots.txt" ] && cp "$SRC/robots.txt" "$DIST/robots.txt"

# ─── 2. Assets ──────────────────────────────────────────────────
sync_assets "js"           "*.js"
sync_assets "css"          "*.css"
sync_assets "fonts"        "*"
sync_assets "lang"         "*.json"
sync_assets "images"       "*"  incremental
sync_assets "video"        "*"  incremental

# ─── 3. Fix permissions ────────────────────────────────────────────
# Ensure dist files are readable (may have been created by root/sudo)
chmod -R a+rX "$DIST" 2>/dev/null || true

# ─── 4. Version bump ────────────────────────────────────────────
echo "🔄 Bumping JS version to $VERSION..."
# Replace all version query params (handles v=20260508, v=20260508-v3, v=anystring, v=this)
find "$DIST" -name '*.html' -exec sed -i '' "s|?v=[a-zA-Z0-9._-]*|?$VERSION|g" {} +
find "$SRC/pages" -name '*.html' -exec sed -i '' "s|?v=[a-zA-Z0-9._-]*|?$VERSION|g" {} +

# Generate sitemap.xml
if command -v node &>/dev/null; then
  node scripts/generate-sitemap.js 2>/dev/null || true
fi

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Build complete: $FILES files in dist/"
echo "   Version: $VERSION"

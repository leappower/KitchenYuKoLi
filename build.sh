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

# ─── 4. Inject _spaOn definition into all page HTML files ─────────
# This must run BEFORE version bump so it's present in all dist HTML.
SPA_ON='<script>window._spaOn=function(t,e,n,k){var r=window._spaAC_={};if(r[k])r[k].abort();var a=new AbortController;r[k]=a;t.addEventListener(e,n,{signal:a.signal});return a};window.__onSpaEvent=function(t,e,n,g){var k=t+"::"+e;if(g.has(k))g.get(k).abort();var a=new AbortController;t.addEventListener(e,n,{signal:a.signal});g.set(k,a)};</script>'
echo "💉 Injecting _spaOn into page HTML files..."
find "$DIST/pages" -name '*.html' | while IFS= read -r f; do
  grep -q 'window._spaOn' "$f" || sed -i '' "s|<head>|<head>$SPA_ON|" "$f"
done
# index.html already has _spaOn from src, but ensure it's there
grep -q 'window._spaOn' "$DIST/index.html" || sed -i '' "s|<head>|<head>$SPA_ON|" "$DIST/index.html"

# ─── 5. Version bump ────────────────────────────────────────────
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

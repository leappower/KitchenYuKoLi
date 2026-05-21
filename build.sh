#!/bin/bash
# build.sh — 唯一入口：SSG 构建，无双轨
# Usage: ./build.sh [dev|production]
#   (no arg) = production build (default)
#   dev      = development build (no version bump)
#
# 不再同步 src/pages/ → dist/pages/。
# 唯一页面来源 = build-ssg.js 生成到 dist/<route>/。
# webpack 输出 dist/ 作为中转，SSG 读它然后输出 dist/<route>/。

set -euo pipefail

BUILD_MODE="${1:-production}"
[ "$BUILD_MODE" = "dev" ] && WEBPACK_MODE="development" || WEBPACK_MODE="production"

echo "🏗️  Building ($BUILD_MODE)..."

SRC="src"
DIST="dist"
VERSION="v=$(date +%Y%m%d%H%M)"

# ─── Pre-flight checks ───────────────────────────────────────────
INDEX_SIZE=$(wc -c < "$SRC/index.html")
if [ "$INDEX_SIZE" -lt 1000 ]; then
  echo "❌ ERROR: src/index.html is suspiciously small (${INDEX_SIZE} bytes)."
  echo "   Expected ~8000+ bytes. File may be corrupted."
  exit 1
fi

# ─── 0. Bump i18n cache BEFORE webpack ──────────────────────────
I18N_CACHE_TS=$(date +%s)
sed -i '' "s/var I18N_CACHE_V = .*/var I18N_CACHE_V = $I18N_CACHE_TS;/" "$SRC/assets/js/translations.js"
echo "🔄 i18n cache version → $I18N_CACHE_TS"

# ─── 1. Clean dist (webpack output.clean: true also cleans, but explicit) ──
rm -rf "$DIST"

# ─── 2. Tailwind CSS + Webpack ──────────────────────────────────
echo "📦 Webpack ($BUILD_MODE)..."
npm run build:css 2>&1 | tail -1
if [ "$BUILD_MODE" = "dev" ]; then
  npx webpack --env devBuild 2>&1 | tail -3
else
  npx webpack --mode=production 2>&1 | tail -3 || echo "  ⚠️  Webpack had non-fatal errors (html-minifier)"
fi

# ─── 3. Assets (JS, CSS, fonts, lang, images, video) ────────────
# Assets don't go through webpack, copy directly
echo "📦 Syncing assets..."
sync_assets() {
  local src_dir="$1"
  local ext_glob="$2"
  local full_src="$SRC/assets/$src_dir"
  [ -d "$full_src" ] || return 0
  find "$full_src" -type f -name "$ext_glob" -print0 | while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    mkdir -p "$DIST/$(dirname "$rel")"
    cp "$f" "$DIST/$rel"
  done
}

sync_assets "js"           "*.js"
sync_assets "css"          "*.css"
sync_assets "fonts"        "*"
sync_assets "lang"         "*.json"
sync_assets "images"       "*"  
sync_assets "video"        "*"

# ─── 4. SPA shell (index.html + 404.html + robots.txt) ──────────
cp "$SRC/index.html" "$DIST/index.html"
[ -f "$SRC/404.html" ] && cp "$SRC/404.html" "$DIST/404.html"
[ -f "$SRC/robots.txt" ] && cp "$SRC/robots.txt" "$DIST/robots.txt"

# ─── 5. Version bump (production only) ───────────────────────────
if [ "$BUILD_MODE" != "dev" ]; then
  echo "🔄 Bumping JS version to $VERSION..."
  find "$DIST" -name '*.html' -exec sed -i '' "s|?v=[a-zA-Z0-9._-]*|?$VERSION|g" {} +
  find "$SRC/pages" -name '*.html' -exec sed -i '' "s|?v=[a-zA-Z0-9._-]*|?$VERSION|g" {} +
fi

# ─── 6. Sitemap / search index ──────────────────────────────────
node scripts/generate-sitemap.js 2>/dev/null || true
node scripts/generate-search-index.js 2>/dev/null || true

# ─── 7. SSG: build route index.html + copy device files ──────────
# SSG 读取 webpack 的输出 dist/pages/ 然后生成 dist/<route>/
# SSG also copies Swup + plugins from node_modules and fresh JS from src
node scripts/build-ssg.js 2>&1 | grep -E 'Step|✓|✅|WARN|ERROR' || true

# ─── 8. Fix permissions ─────────────────────────────────────────
chmod -R a+rX "$DIST" 2>/dev/null || true

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Build complete: $FILES files in dist/"
echo "   Version: $VERSION"
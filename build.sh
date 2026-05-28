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
I18N_CACHE_TS=${I18N_CACHE_TS:-$(date +%s)}  # fallback if empty
python3 -c "
import re,os
fp = os.path.expandvars('$SRC/assets/js/translations.js')
with open(fp) as f: c = f.read()
c = re.sub(r'var I18N_CACHE_V = \d+;', 'var I18N_CACHE_V = $I18N_CACHE_TS;', c)
with open(fp, 'w') as f: f.write(c)
"
echo "🔄 i18n cache version → $I18N_CACHE_TS"

# ─── 1. Clean dist (webpack output.clean: true also cleans, but explicit) ──
rm -rf "$DIST"

# ─── 2. Tailwind CSS + Webpack ──────────────────────────────────
echo "📦 Webpack ($BUILD_MODE)..."
npm run build:css 2>&1 | tail -1
if [ "$BUILD_MODE" = "dev" ]; then
  npx webpack --env devBuild 2>&1 | tail -3 || echo "  ⚠️  Webpack had non-fatal errors (html-minifier)"
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
sync_assets "data"         "*.json"
sync_assets "images"       "*"  
sync_assets "video"        "*"
sync_assets "pdf"          "*.pdf"

# 排除 aboutus.mp4（已弃用，65MB）
rm -f "$DIST/assets/video/aboutus.mp4"

# ─── 4. SPA shell (index.html + sw.js + CNAME + 404.html + robots.txt) ───
cp "$SRC/index.html" "$DIST/index.html"
[ -f "$SRC/sw.js" ] && cp "$SRC/sw.js" "$DIST/sw.js"
[ -f "$SRC/CNAME" ] && cp "$SRC/CNAME" "$DIST/CNAME"
[ -f "$SRC/404.html" ] && cp "$SRC/404.html" "$DIST/404.html"
[ -f "$SRC/robots.txt" ] && cp "$SRC/robots.txt" "$DIST/robots.txt"
[ -f "$SRC/manifest.json" ] && cp "$SRC/manifest.json" "$DIST/manifest.json"

# ─── 7. Search index ──────────────────────────────────
node scripts/export-products-static.js 2>/dev/null || echo "  ⚠️  Server unavailable, using cached products.json"
node scripts/generate-search-index.js 2>/dev/null || echo "  ⚠️  Failed to generate search-index.json"

# ─── 8. Inject device redirect scripts (pre-SSG) ────────────────
echo "🔄 Injecting device redirect scripts into all pages..."
node scripts/inject-device-redirect.js 2>&1 | tail -5

# ─── 9. SSG: build route index.html + copy device files ──────────
# SSG 读取 webpack 的输出 dist/pages/ 然后生成 dist/<route>/
# SSG also copies Swup + plugins from node_modules and fresh JS from src
node scripts/build-ssg.js 2>&1 | grep -E 'Step|✓|✅|WARN|ERROR' || true

# ─── Sitemap (after SSG, needs dist to be populated) ─────────
node scripts/generate-sitemap.js 2>/dev/null || echo "  ⚠️  Failed to generate sitemap.xml"

# ─── 5. Version bump (production only, after SSG) ───────────────
if [ "$BUILD_MODE" != "dev" ]; then
  echo "🔄 Bumping JS version to $VERSION..."
DIST="$DIST" VERSION="$VERSION" python3 scripts/bump-version.py
fi

# ─── 8.5. Inject device redirect scripts into SSG-generated entries ──
# SSG 生成的 dist/<slug>/index.html 需要注入自包含 redirect 脚本
echo "🔄 Injecting redirect into SSG-generated entries..."
node scripts/inject-device-redirect.js 2>&1 | tail -3

# ─── 9. Validate case slug alias directories ──────────────
echo "🔍 Validating case slug alias directories..."
SLUG_MISSING=0
for slug in manila-lunchbox-studio-2025 jakarta-catering-hub-2025 hcmc-cloud-kitchen-compact bangkok-chain-8-stores kl-canteen-2000-meals cebu-small-resto-payback surabaya-central-automation hanoi-street-food-modern; do
  if [ ! -d "$DIST/cases/$slug" ]; then
    echo "  ❌ MISSING: cases/$slug/"
    SLUG_MISSING=1
  fi
done
if [ "$SLUG_MISSING" -ne 0 ]; then
  echo "❌ ERROR: Case slug alias directories missing — SSG step likely failed."
  echo "   Run 'node scripts/build-ssg.js' manually to debug."
  exit 1
fi
echo "  ✅ All 8 slug alias directories present"

# ─── 9.5 Inject dropdown scripts into pages that lack them ──
echo "🔄 Injecting dropdown scripts into pages that lack them..."
node scripts/inject-dropdown-scripts.js 2>&1 | tail -1

# ─── 10. Fix permissions ────────────────────────────────────
chmod -R a+rX "$DIST" 2>/dev/null || true

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Build complete: $FILES files in dist/"
echo "   Version: $VERSION"
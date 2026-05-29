#!/bin/bash
# build.sh — 唯一入口：SSG 构建，无双轨
# Usage: ./build.sh [dev|production]
#   (no arg) = production build (default)
#   dev      = development build (no version bump)
#
# ════════════════════════════════════════════════════════════════
# 职责
# ════════════════════════════════════════════════════════════════
# - Tailwind CSS 构建
# - Webpack 打包
# - 静态资源复制（JS/CSS/fonts/lang/images/video/pdf）
# - i18n 缓存版本刷新
# - 搜索索引生成
# - 设备重定向脚本注入
# - SSG（Static Site Generation）：路由 index.html 生成
# - SPA 产品路由 index.html 生成
# - Sitemap 生成
# - 版本号注入（HTML + CSS）
# - 质量验证

set -euo pipefail

BUILD_MODE="${1:-production}"
[ "$BUILD_MODE" = "dev" ] && WEBPACK_MODE="development" || WEBPACK_MODE="production"

echo "🏗️  Building ($BUILD_MODE)..."

SRC="src"
DIST="dist"

# ─── 版本号 ────────────────────────────────────────────────────
# 使用毫秒时间戳确保每次构建唯一，触发 CDN/浏览器缓存失效
VERSION=$(date +%s%3N)
VERSION_TAG="v=$VERSION"
echo "   Version: $VERSION_TAG"

# ─── Pre-flight checks ───────────────────────────────────────────
INDEX_SIZE=$(wc -c < "$SRC/index.html")
if [ "$INDEX_SIZE" -lt 1000 ]; then
  echo "❌ ERROR: src/index.html is suspiciously small (${INDEX_SIZE} bytes)."
  echo "   Expected ~8000+ bytes. File may be corrupted."
  exit 1
fi

# ─── 0. Bump i18n cache BEFORE webpack ──────────────────────────
I18N_CACHE_TS=$(date +%s)
python3 -c "
import re,os
fp = os.path.expandvars('$SRC/assets/js/translations.js')
with open(fp) as f: c = f.read()
c = re.sub(r'var I18N_CACHE_V = \d+;', 'var I18N_CACHE_V = $I18N_CACHE_TS;', c)
with open(fp, 'w') as f: f.write(c)
"
echo "🔄 i18n cache version → $I18N_CACHE_TS"

# ─── 1. Clean dist ─────────────────────────────────────────────
rm -rf "$DIST"

# ─── 2. Tailwind CSS + Webpack ──────────────────────────────────
echo "📦 Webpack ($BUILD_MODE)..."
npm run build:css 2>&1 | tail -1
if [ "$BUILD_MODE" = "dev" ]; then
  npx webpack --env devBuild 2>&1 | tail -3 || echo "  ⚠️  Webpack had non-fatal errors (html-minifier)"
else
  npx webpack --mode=production 2>&1 | tail -3 || echo "  ⚠️  Webpack had non-fatal errors (html-minifier)"
fi

# ─── 3. Assets (JS, CSS, fonts, lang, images, video, pdf) ──────
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

# 排除 aboutus.mp4 (已弃用，65MB)
rm -f "$DIST/assets/video/aboutus.mp4"

# ─── 4. Root files ──────────────────────────────────────────────
# CNAME、.nojekyll 等供 GitHub Pages + Cloudflare 使用
cp "$SRC/index.html" "$DIST/index.html"
# sw.js 优先从根目录复制，其次 src/；复制后注入构建版本号
SW_SRC=""
[ -f "sw.js" ]      && SW_SRC="sw.js"
[ -z "$SW_SRC" ] && [ -f "$SRC/sw.js" ] && SW_SRC="$SRC/sw.js"
if [ -n "$SW_SRC" ]; then
  cp "$SW_SRC" "$DIST/sw.js"
  # 注入版本号到 sw.js，让浏览器感知 SW 更新
  sed -i '' "s/var SW_VERSION = \"[^\"]*\";/var SW_VERSION = \"v$VERSION\";/" "$DIST/sw.js"
  echo "  📦 sw.js → v$VERSION"
fi
[ -f "CNAME" ]             && cp "CNAME"             "$DIST/CNAME"
[ -f "$SRC/404.html" ]     && cp "$SRC/404.html"     "$DIST/404.html"
[ -f "$SRC/robots.txt" ]   && cp "$SRC/robots.txt"   "$DIST/robots.txt"
[ -f "$SRC/manifest.json" ] && cp "$SRC/manifest.json" "$DIST/manifest.json"
touch "$DIST/.nojekyll"

# ─── Search index ──────────────────────────────────────────────
node scripts/export-products-static.js 2>/dev/null || echo "  ⚠️  Server unavailable, using cached products.json"
node scripts/generate-search-index.js 2>/dev/null || echo "  ⚠️  Failed to generate search-index.json"

# ─── 8. Inject device redirect scripts (pre-SSG) ────────────────
echo "🔄 Injecting device redirect scripts into all pages..."
node scripts/inject-device-redirect.js 2>&1 | tail -5

# ─── 9. SSG: build route index.html + copy device files ─────────
node scripts/build-ssg.js 2>&1 | grep -E 'Step|✓|✅|WARN|ERROR' || true

# ─── SPA product routes (SSG 之后，确保 dist 已填充) ──────────
echo "🔄 Generating SPA product routes..."
node scripts/generate-spa-product-routes.js 2>&1 | tail -3 || echo "  ⚠️  SPA route generation had non-fatal errors"

# ─── Sitemap ───────────────────────────────────────────────────
node scripts/generate-sitemap.js 2>/dev/null || echo "  ⚠️  Failed to generate sitemap.xml"

# ─── 5. Version bump (production only) ──────────────────────────
if [ "$BUILD_MODE" != "dev" ]; then
  echo "🔄 Bumping version to $VERSION_TAG..."
  python3 -c "
import os, re
root = os.environ.get('DIST', 'dist')
version = '$VERSION'
for r, d, fs in os.walk(root):
    for f in fs:
        fp = os.path.join(r, f)
        if not (f.endswith('.html') or f.endswith('.css')):
            continue
        with open(fp) as fh:
            c = fh.read()
        nc = re.sub(r'\?v=[a-zA-Z0-9._-]*', '?v=' + version, c)
        if nc != c:
            with open(fp, 'w') as fh:
                fh.write(nc)
"
  echo "  ✅ Version bump complete"
fi

# ─── 8.5. Inject device redirect (post-SSG) ─────────────────────
echo "🔄 Injecting redirect into SSG-generated entries..."
node scripts/inject-device-redirect.js 2>&1 | tail -3

# ─── Validate case slug alias directories ─────────────────────
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
  exit 1
fi
echo "  ✅ All 8 slug alias directories present"

# ─── Inject dropdown scripts ──────────────────────────────────
echo "🔄 Injecting dropdown scripts into pages that lack them..."
node scripts/inject-dropdown-scripts.js 2>&1 | tail -1

# ─── Fix permissions ──────────────────────────────────────────
chmod -R a+rX "$DIST" 2>/dev/null || true

# ─── Summary ────────────────────────────────────────────────────
FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Build complete: $FILES files in dist/"
echo "   Version: $VERSION_TAG"
echo "   i18n cache: $I18N_CACHE_TS"

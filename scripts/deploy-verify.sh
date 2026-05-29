#!/bin/bash
# deploy-verify.sh — 在 GHA deploy 完成后验证产物
# 由 deploy.yml 在 Deploy to gh-pages 步骤后调用
set -euo pipefail

DIST="dist"
ERRORS=0

echo "🔍 验证构建产物..."

# 1. 版本号检查
echo ""
echo "📌 检查版本号..."
VERSION_FILE="$DIST/VERSION.txt"
if [ -f "$VERSION_FILE" ]; then
  V=$(head -1 "$VERSION_FILE")
  echo "  ✅ VERSION.txt: $V"
else
  echo "  ❌ VERSION.txt 缺失"
  ERRORS=$((ERRORS + 1))
fi

# 2. 根目录必要文件
echo ""
echo "📋 检查根目录文件..."
for f in index.html 404.html CNAME .nojekyll robots.txt manifest.json sw.js; do
  if [ -f "$DIST/$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f 缺失"
    ERRORS=$((ERRORS + 1))
  fi
done

# 3. 404.html JS 语法验证（用 vm.Script 编译，捕获正则错误）
echo ""
echo "🔐 验证 404.html 脚本语法..."
INLINE_JS=$(sed -n '/<script>/,/<\/script>/p' "$DIST/404.html" 2>/dev/null | grep -v '<script>\|</script>' || true)
if [ -n "$INLINE_JS" ]; then
  if echo "$INLINE_JS" | node -e "
const vm = require('vm');
const fs = require('fs');
try { new vm.Script(fs.readFileSync('/dev/stdin','utf-8')); }
catch(e) { console.log(e.message); process.exit(1); }
" 2>/dev/null; then
    echo "  ✅ 404.html JS 语法合法"
  else
    echo "  ❌ 404.html JS 语法错误"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 4. HTML 中版本号验证
echo ""
echo "🔢 验证版本号注入..."
VERSION_TAG=$(echo "$V" | sed 's/^v//')
MATCH_COUNT=$(grep -roc "?v=${VERSION_TAG}" "$DIST/404.html" 2>/dev/null || true) ; MATCH_COUNT="${MATCH_COUNT:-0}"
if [ "$MATCH_COUNT" -gt 0 ]; then
  echo "  ✅ 404.html 版本号已注入"
else
  echo "  ⚠️  404.html 未找到版本号（可能是 dev 模式构建）"
fi

# 5. 产品页面路由验证
echo ""
echo "🔗 验证产品路由..."
ROUTE_COUNT=$(find "$DIST/products" -mindepth 2 -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
if [ "$ROUTE_COUNT" -gt 0 ]; then
  echo "  ✅ $ROUTE_COUNT 个产品详情页路由"
  # 抽样检查 PDP 路由是否包含设备重定向——不应该有
  SAMPLE=$(find "$DIST/products" -mindepth 2 -name 'index.html' 2>/dev/null | head -3)
  for p in $SAMPLE; do
    if grep -q 'index-mobile.html' "$p" 2>/dev/null; then
      echo "  ⚠️  $p 包含设备重定向脚本（可能存在问题）"
    fi
  done
else
  echo "  ⚠️  没有产品详情页路由（dev 模式或构建不完整）"
fi

# 6. sw.js 版本号验证
echo ""
echo "📦 验证 sw.js 版本号..."
SW_HAS_VERSION=$(grep -c 'SW_VERSION = "v' "$DIST/sw.js" 2>/dev/null || true)
if [ "${SW_HAS_VERSION:-0}" -gt 0 ]; then
  SW_VER=$(grep 'SW_VERSION = "v' "$DIST/sw.js" 2>/dev/null | sed 's/.*"v/v/;s/".*//')
  echo "  ✅ sw.js SW_VERSION = $SW_VER"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ $ERRORS 个验证失败"
  exit 1
else
  echo "✅ 所有验证通过"
fi

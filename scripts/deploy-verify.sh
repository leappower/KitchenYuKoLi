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

# 3. 404.html 正则验证
echo ""
echo "🔐 验证 404.html 脚本..."
INLINE_JS=$(sed -n '/<script>/,/<\/script>/p' "$DIST/404.html" 2>/dev/null | grep -v '<script>\|</script>' || true)
if [ -n "$INLINE_JS" ]; then
  # 提取所有正则，验证合法性
  REGEX_ERRORS=$(echo "$INLINE_JS" | node -e "
const lines = [];
require('fs').readFileSync('/dev/stdin','utf-8').split('\n').forEach(l => {
  const matches = l.match(/\/[^/].*?\/[gimsuyd]*(?=\s*[\.\])])/g);
  if (matches) matches.forEach(m => {
    try {
      const lastSlash = m.lastIndexOf('/');
      new RegExp(m.slice(1, lastSlash), m.slice(lastSlash+1));
    } catch(e) { lines.push(m + ' → ' + e.message); }
  });
});
if (lines.length > 0) console.log(lines.join('\n'));
" 2>/dev/null || true)
  if [ -n "$REGEX_ERRORS" ]; then
    echo "  ❌ 404.html 包含非法正则:"
    echo "$REGEX_ERRORS"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ 404.html 正则合法"
  fi
fi

# 4. HTML 中版本号验证
echo ""
echo "🔢 验证版本号注入..."
VERSION_TAG=$(echo "$V" | sed 's/^v//')
MATCH_COUNT=$(grep -roc "?v=${VERSION_TAG}" "$DIST/404.html" 2>/dev/null || echo 0)
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
else
  echo "  ⚠️  没有产品详情页路由（dev 模式或构建不完整）"
fi

# 6. SPA 产品路由验证
echo ""
echo "🔗 验证 SPA 产品路由..."
SPA_ROUTE_COUNT=$(find "$DIST/products" -name 'index.html' -not -path '*/detail/*' -not -path '*/all/*' -not -path '*/compare/*' -not -path '*/cutting/*' -not -path '*/stirfry/*' -not -path '*/frying/*' -not -path '*/stewing/*' -not -path '*/steaming/*' -not -path '*/other/*' 2>/dev/null | wc -l | tr -d ' ')
if [ "$SPA_ROUTE_COUNT" -gt 0 ]; then
  echo "  ✅ $SPA_ROUTE_COUNT 个 SPA产品路由生成"
fi

# 7. sw.js 版本号验证
echo ""
echo "📦 验证 sw.js 版本号..."
if grep -q 'SW_VERSION = "v' "$DIST/sw.js" 2>/dev/null; then
  SW_VER=$(grep 'SW_VERSION = "v' "$DIST/sw.js" | sed 's/.*"v/v/;s/".*//')
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

#!/bin/bash
# pre-push-check.sh — Build smoke tests before push
# Called by lefthook pre-push
set -euo pipefail

echo "🔍 Running pre-push smoke checks..."

PASS=0
FAIL=0
SRC="src"

# ─── 1. Syntax check all JS files ─────────────────────────────
echo ""
echo "📝 Checking JS syntax..."
JS_ERRORS=0
for f in src/assets/js/*.js src/assets/js/ui/*.js scripts/*.js; do
  [ -f "$f" ] || continue
  if ! node --check "$f" 2>/dev/null; then
    echo "  ❌ SYNTAX ERROR: $f"
    JS_ERRORS=$((JS_ERRORS + 1))
  fi
done
if [ "$JS_ERRORS" -gt 0 ]; then
  echo "  ❌ $JS_ERRORS file(s) have syntax errors"
  FAIL=$((FAIL + 1))
else
  echo "  ✅ All JS files pass syntax check"
  PASS=$((PASS + 1))
fi

# ─── 2. DOCTYPE check ─────────────────────────────────────────
echo ""
echo "📄 Checking DOCTYPE declarations..."
DOCTYPE_ERRORS=0
for f in $(find src/pages -name '*.html' 2>/dev/null); do
  FIRST_LINE=$(head -1 "$f")
  if ! echo "$FIRST_LINE" | grep -qi '<!doctype'; then
    echo "  ❌ Missing DOCTYPE: $f"
    DOCTYPE_ERRORS=$((DOCTYPE_ERRORS + 1))
  fi
done
if [ "$DOCTYPE_ERRORS" -gt 0 ]; then
  echo "  ❌ $DOCTYPE_ERRORS file(s) missing DOCTYPE"
  FAIL=$((FAIL + 1))
else
  echo "  ✅ All HTML files have DOCTYPE"
  PASS=$((PASS + 1))
fi

# ─── 3. Empty script tags ─────────────────────────────────────
echo ""
echo "🔍 Checking for truly empty <script> tags (no src, no type)..."
EMPTY_SCRIPTS=$(grep -rn '<script[^>]*>\s*</script>' src/ --include="*.html" 2>/dev/null | \
  grep -v 'src=' | \
  grep -v 'type=' || true)
if [ -n "$EMPTY_SCRIPTS" ]; then
  echo "  ❌ Empty <script> tags found:"
  echo "$EMPTY_SCRIPTS" | head -20 | while read -r line; do echo "     $line"; done
  COUNT=$(echo "$EMPTY_SCRIPTS" | wc -l | tr -d ' ')
  echo "  ❌ Total: $COUNT file(s) with empty scripts"
  FAIL=$((FAIL + 1))
else
  echo "  ✅ No empty <script> tags"
  PASS=$((PASS + 1))
fi

# ─── 4. Duplicate event listeners ─────────────────────────────
echo ""
echo "🎧 Checking for duplicate addEventListener patterns..."
DUP_EVENTS=$(grep -rn '\.addEventListener(' src/ --include="*.js" 2>/dev/null | \
  grep -v '__DEVELOPMENT__' | \
  sed "s/.*\.addEventListener(//" | \
  sed "s/,.*//" | \
  sort | uniq -d || true)
if [ -n "$DUP_EVENTS" ]; then
  echo "  ⚠️  Potentially duplicate addEventListener calls:"
  echo "$DUP_EVENTS" | head -20 | while read -r ev; do echo "     $ev"; done
  echo "     (review recommended, not blocking)"
fi

# ─── 5. i18n keys check ──────────────────────────────────────
echo ""
echo "🌐 Checking i18n keys..."
if [ -f "scripts/lint-i18n-keys.js" ]; then
  node scripts/lint-i18n-keys.js 2>&1 | tail -5
fi

# ─── 6. 404.html 正则合法性检验（新增）─────────────────────
echo ""
echo "🔐 Checking 404.html regex validity..."
if [ -f "src/404.html" ]; then
  # 从 src/404.html 提取内联 JS 并进行语法验证
  INLINE_JS=$(sed -n '/<script>/,/<\/script>/p' src/404.html 2>/dev/null | head -40 | grep -v '<script>\|</script>' || true)
  if [ -n "$INLINE_JS" ]; then
    # 验证正则表达式语法
    REGEX_ERRORS=$(echo "$INLINE_JS" | grep -oE '/[^/].*/[a-z]*' | while read -r re; do
      node -e "try { new RegExp($re); } catch(e) { console.log('❌ Invalid regex: $re → ' + e.message); }" 2>/dev/null || echo "  ⚠️  Could not parse: $re"
    done || true)
    if [ -n "$REGEX_ERRORS" ]; then
      echo "  ❌ 404.html contains invalid regex patterns:"
      echo "$REGEX_ERRORS"
      FAIL=$((FAIL + 1))
    else
      echo "  ✅ 404.html regex patterns valid"
      PASS=$((PASS + 1))
    fi
  fi
fi

# ─── 7. build-ssg.js generate404 输出验证（新增）───────────
echo ""
echo "🏗️  Running build-ssg generate404 dry-run..."
if [ -f "scripts/build-ssg.js" ]; then
  # 模拟 generate404 的 redirectScript 拼接，验证输出正则合法
  node -e "
const fs = require('fs');
const src = fs.readFileSync('scripts/build-ssg.js', 'utf-8');
// 提取 redirectScript 片段
const fnStart = src.indexOf('var redirectScript');
const fnEnd = src.indexOf('html = html.replace', fnStart);
const scriptPart = src.slice(fnStart, fnEnd);
// 提取字符串片段并 eval 得到输出
const fragments = scriptPart.match(/['][^']*[']/g) || [];
const output = fragments.map(f => eval(f)).join('\n');
// 检查所有正则
const errors = [];
const lines = output.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.startsWith('//') || l.startsWith('<!--') || !l) continue;
  const regexPatts = l.match(/\/[^/].*?\/[gimsuyd]*(?=\s*[\.\],;])/g);
  if (!regexPatts) continue;
  for (const r of regexPatts) {
    try { new RegExp(r.slice(1, r.lastIndexOf('/')), r.slice(r.lastIndexOf('/')+1)); }
    catch(e) { errors.push({line: i+1, regex: r, error: e.message }); }
  }
}
if (errors.length > 0) {
  errors.forEach(e => console.log('❌ L' + e.line + ': ' + e.regex + ' → ' + e.error));
  process.exit(1);
} else {
  console.log('  ✅ build-ssg generate404 regex valid');
}
" && PASS=$((PASS + 1)) || FAIL=$((FAIL + 1))
fi

# ─── 8. HTML/CSS 结构快速检查：确保 asset 路径存在（新增）───
echo ""
echo "📁 Checking referenced asset paths..."
MISSING_ASSETS=0
for f in $(find src/pages -name 'index-pc.html' 2>/dev/null | head -5); do
  # 检查 CSS 引用
  CSS_REFS=$(grep -oE 'href="/assets/css/[^"]+\.css"' "$f" 2>/dev/null | sed 's/href="//;s/"//' || true)
  for ref in $CSS_REFS; do
    [ -f ".$ref" ] || [ -f "src$ref" ] || [ -f "dist$ref" ] || { echo "  ⚠️  Missing CSS: $ref"; MISSING_ASSETS=$((MISSING_ASSETS + 1)); }
  done
  # 检查 JS 引用
  JS_REFS=$(sed 's/[[:space:]]*<script[^>]*src="\([^"]*\)"[^>]*>/\n\1\n/g' "$f" 2>/dev/null | grep '^/assets/js/' | head -20 || true)
  for ref in $JS_REFS; do
    [ -f ".$ref" ] || [ -f "src$ref" ] || [ -f "dist$ref" ] || { echo "  ⚠️  Missing JS: $ref"; MISSING_ASSETS=$((MISSING_ASSETS + 1)); }
  done
done
if [ "$MISSING_ASSETS" -gt 0 ]; then
  echo "  ❌ $MISSING_ASSETS asset(s) not found (may be false positives from build artifacts)"
else
  echo "  ✅ Asset path references look valid"
  PASS=$((PASS + 1))
fi

# ─── 9. Quick CSS build（新增）────────────────────────────
echo ""
echo "🏗️  Running build..."
if npm run build:css 2>&1 | tail -1 | grep -q "Done"; then
  echo "  ✅ CSS build passed"
  PASS=$((PASS + 1))
else
  echo "  ❌ CSS build failed"
  FAIL=$((FAIL + 1))
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ✅ $PASS passed, ❌ $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Pre-push check FAILED. Fix issues before pushing."
  exit 1
fi

echo "✅ All checks passed!"
exit 0

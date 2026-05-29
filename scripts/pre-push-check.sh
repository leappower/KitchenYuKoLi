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
  echo "$EMPTY_SCRIPTS" | while read -r line; do echo "     $line"; done
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
  echo "$DUP_EVENTS" | while read -r ev; do echo "     $ev"; done
  echo "     (review recommended, not blocking)"
fi

# ─── 5. i18n keys check ──────────────────────────────────────
echo ""
echo "🌐 Checking i18n keys..."
if [ -f "scripts/lint-i18n-keys.js" ]; then
  node scripts/lint-i18n-keys.js 2>&1 | tail -5
fi

# ─── 6. build-ssg generate404 输出验证 ────────────────────
echo ""
echo "🏗️  Checking build-ssg generate404 regex..."
if [ -f "scripts/build-ssg.js" ] && [ -f "scripts/lint-build-ssg-regex.js" ]; then
  if node scripts/lint-build-ssg-regex.js 2>&1; then
    echo "  ✅ generate404 regex valid"
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
fi

# ─── 7. Quick CSS build ──────────────────────────────────────
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

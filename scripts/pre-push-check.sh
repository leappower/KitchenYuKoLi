#!/bin/bash
# pre-push-check.sh — Build smoke tests before push
# Called by lefthook pre-push
set -euo pipefail

echo "🔍 Running pre-push smoke checks..."

PASS=0
FAIL=0

# ─── 1. Syntax check all JS files ─────────────────────────────
echo ""
echo "📝 Checking JS syntax..."
JS_ERRORS=0
for f in src/assets/js/*.js src/assets/js/ui/*.js; do
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

# ─── 4. Duplicate event listener patterns ─────────────────────
echo ""
echo "🎧 Checking for duplicate addEventListener patterns..."
DUP=$(grep -rn 'addEventListener' src/assets/js/*.js src/assets/js/ui/*.js 2>/dev/null | \
  grep -oE '[a-zA-Z_]+\.(addEventListener)' | \
  sort | uniq -d || true)
if [ -n "$DUP" ]; then
  echo "  ⚠️  Potentially duplicate addEventListener calls:"
  echo "$DUP" | while read -r line; do echo "     $line"; done
  echo "     (review recommended, not blocking)"
else
  echo "  ✅ No suspicious duplicate addEventListener"
  PASS=$((PASS + 1))
fi

# ─── 5. Build check ───────────────────────────────────────────
echo ""
echo "🏗️  Running build..."
if npm run build:css 2>&1 | tail -3; then
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

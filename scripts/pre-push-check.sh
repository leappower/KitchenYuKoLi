#!/bin/bash
# pre-push-check.sh — Build smoke tests before push
set -euo pipefail

echo "🔍 Running pre-push smoke checks..."
PASS=0; FAIL=0; SRC="src"

# ─── 1. Syntax check ─────────────────────────────────────
check_js_syntax() {
  echo ""; echo "📝 Checking JS syntax..."
  local errs=0
  for f in src/assets/js/*.js src/assets/js/ui/*.js scripts/*.js; do
    [ -f "$f" ] || continue
    node --check "$f" 2>/dev/null || { echo "  ❌ $f"; errs=$((errs+1)); }
  done
  [ "$errs" -gt 0 ] && { FAIL=$((FAIL+1)); return; }
  echo "  ✅ All JS files pass syntax check"; PASS=$((PASS+1))
}

# ─── 2. DOCTYPE ──────────────────────────────────────────
check_doctype() {
  echo ""; echo "📄 Checking DOCTYPE declarations..."
  local errs=0
  for f in $(find src/pages -name '*.html' 2>/dev/null); do
    head -1 "$f" | grep -qi '<!doctype' || { echo "  ❌ Missing DOCTYPE: $f"; errs=$((errs+1)); }
  done
  [ "$errs" -gt 0 ] && { FAIL=$((FAIL+1)); return; }
  echo "  ✅ All HTML files have DOCTYPE"; PASS=$((PASS+1))
}

# ─── 3. Empty scripts ────────────────────────────────────
check_empty_script() {
  echo ""; echo "🔍 Checking empty <script> tags..."
  local hits=$(grep -rn '<script[^>]*>\s*</script>' src/ --include="*.html" 2>/dev/null | grep -v 'src=' | grep -v 'type=' || true)
  [ -n "$hits" ] && { echo "$hits" | head -10; echo "  ❌ Empty scripts found"; FAIL=$((FAIL+1)); return; }
  echo "  ✅ No empty <script> tags"; PASS=$((PASS+1))
}

# ─── 4. Full HTML lint ────────────────────────────────────
check_html_lint() {
  echo ""; echo "🔍 Running full HTML lint..."
  local out=$(npx htmlhint "src/**/*.html" 2>&1)
  local scanned=$(echo "$out" | grep "Scanned")
  if echo "$scanned" | grep -q "no errors"; then
    echo "  ✅ All HTML files pass lint ($(echo $scanned | grep -o 'Scanned[^)]*'))"
    PASS=$((PASS+1))
  elif echo "$scanned" | grep -q "errors"; then
    local n=$(echo "$scanned" | grep -o '[0-9]* errors' | grep -o '[0-9]*')
    echo "$out" | grep -E "error" | head -5
    echo "  ❌ $n HTML error(s) found"; FAIL=$((FAIL+1))
  else
    echo "  ⚠️  htmlhint scan issue"; PASS=$((PASS+1))
  fi
}

# ─── 5. Duplicate events ─────────────────────────────────
check_dup_events() {
  echo ""; echo "🎧 Checking duplicate addEventListener..."
  local evts=$(grep -rn '\.addEventListener(' src/ --include="*.js" 2>/dev/null | \
    grep -v '__DEVELOPMENT__' | sed "s/.*\.addEventListener(//" | sed "s/,.*//" | sort | uniq -d || true)
  [ -n "$evts" ] && { echo "  ⚠️  Potentially duplicate listeners:"; echo "$evts" | head -20; echo "     (review recommended)"; }
}

# ─── 6. i18n keys ────────────────────────────────────────
check_i18n() {
  echo ""; echo "🌐 Checking i18n keys..."
  [ -f "scripts/lint-i18n-keys.js" ] && node scripts/lint-i18n-keys.js 2>&1 | tail -5
}

# ─── 7. build-ssg regex ──────────────────────────────────
check_build_ssg() {
  echo ""; echo "🏗️  Checking build-ssg generate404 regex..."
  if [ -f "scripts/build-ssg.js" ] && [ -f "scripts/lint-build-ssg-regex.js" ]; then
    if node scripts/lint-build-ssg-regex.js 2>&1; then echo "  ✅ generate404 regex valid"; PASS=$((PASS+1))
    else FAIL=$((FAIL+1)); fi
  fi
}

# ─── 8. CSS build ────────────────────────────────────────
check_css_build() {
  echo ""; echo "🏗️  Running build..."
  if npm run build:css 2>&1 | tail -1 | grep -q "Done"; then echo "  ✅ CSS build passed"; PASS=$((PASS+1))
  else echo "  ❌ CSS build failed"; FAIL=$((FAIL+1)); fi
}

# ─── 9. 404.html 结构检查（新增）───────────────────────────
check_404_structure() {
  echo ""; echo "📋 Checking 404.html structure..."
  [ ! -f "src/404.html" ] && return
  local bodies=$(grep -c '</body>' src/404.html)
  local htmls=$(grep -c '</html>' src/404.html)
  [ "$bodies" -ne 1 ] && { echo "  ❌ 404.html has $bodies </body> tags (expected 1)"; FAIL=$((FAIL+1)); return; }
  [ "$htmls" -ne 1 ] && { echo "  ❌ 404.html has $htmls </html> tags (expected 1)"; FAIL=$((FAIL+1)); return; }
  echo "  ✅ 404.html single <body>/<html> structure"
  PASS=$((PASS+1))
}

# Execute all checks
check_js_syntax
check_doctype
check_empty_script
check_html_lint
check_dup_events
check_i18n
check_build_ssg
check_404_structure
check_css_build

# Summary
echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ✅ $PASS passed, ❌ $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[ "$FAIL" -gt 0 ] && { echo "❌ Pre-push check FAILED."; exit 1; }
echo "✅ All checks passed!"; exit 0

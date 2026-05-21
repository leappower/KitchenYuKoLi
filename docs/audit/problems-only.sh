#!/bin/bash
# Targeted audit: extract ONLY problematic patterns across all non-products/applications pages
BASE="/Users/chee/Projects/KitchenYuKoLi/src/pages"
OUT="/Users/chee/Projects/KitchenYuKoLi/docs/audit/problems-only.txt"

FILES=$(find "$BASE" -type f -name "*.html" | grep -v products/ | grep -v applications/ | sort)

echo "=== PROBLEMATIC PATTERNS ONLY ===" > "$OUT"
echo "" >> "$OUT"

for f in $FILES; do
  relpath="${f#$BASE/}"
  screen=""
  if [[ "$f" == *"-mobile.html" ]]; then screen="mobile"
  elif [[ "$f" == *"-tablet.html" ]]; then screen="tablet"
  elif [[ "$f" == *"-pc.html" ]]; then screen="pc"
  fi
  
  problems=0
  
  # Check 1: Mobile body text using text-lg (18px) on <p> tags not in headings
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n '<p[^>]*class="[^"]*text-lg' "$f" | grep -v -E '(text-primary|text-slate-400|text-slate-500|text-white/80)' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] Body text using text-lg on <p> (potential issue):" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 2: Mobile body text using text-xl on <p> tags
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n '<p[^>]*class="[^"]*text-xl' "$f" | grep -v 'text-primary' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] Body text using text-xl on <p>:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 3: CTA buttons with px-8 py-4 + text-lg (too big for mobile)
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n -E 'px-8.*py-4|py-4.*px-8' "$f" | grep -v 'text-sm' | grep -v 'text-base' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] CTA buttons px-8 py-4 with text-lg (too big):" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 4: Mobile CTA buttons with no text-size class (inherits text-base)
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n -E 'class="[^"]*px-(6|7|8)[^"]*py-(3|4)[^"]*rounded' "$f" | grep -v -E 'text-(sm|base|lg|xl)' | grep -v '<input' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] CTA buttons with no text-size class:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 5: Mobile H2 with text-3xl or larger
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n '<h2[^>]*>' "$f" | grep -E 'text-(3xl|4xl|5xl)' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] H2 with text-3xl or larger:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 6: Tablet H2 with text-4xl or larger
  if [[ "$screen" == "tablet" ]]; then
    hits=$(grep -n '<h2[^>]*>' "$f" | grep -E 'text-(4xl|5xl)' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[TABLET] H2 with text-4xl or larger:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 7: Tablet CTA buttons px-8 py-4 without text-sm
  if [[ "$screen" == "tablet" ]]; then
    hits=$(grep -n -E 'px-8.*py-4|py-4.*px-8' "$f" | grep -v 'text-sm' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[TABLET] CTA px-8 py-4 without text-sm:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 8: Button padding inconsistency (primary vs secondary CTA)
  hits=$(grep -n -E '(px-[0-9]+.*py-[0-9]+|py-[0-9]+.*px-[0-9]+)' "$f" | grep -E '(rounded|font-bold|btn|CTA|cta|bg-primary|bg-white|border)' | head -10)
  if [ -n "$hits" ]; then
    # Check if different paddings exist on same page
    pad_count=$(echo "$hits" | grep -oE 'px-[0-9]+' | sort -u | wc -l | tr -d ' ')
    if [ "$pad_count" -gt 1 ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[INCONSISTENCY] Multiple different px paddings on buttons:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
    pad_count=$(echo "$hits" | grep -oE 'py-[0-9]+' | sort -u | wc -l | tr -d ' ')
    if [ "$pad_count" -gt 1 ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[INCONSISTENCY] Multiple different py paddings on buttons:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 9: H2/H3 size variance within same page
  h2_sizes=$(grep '<h2[^>]*>' "$f" | grep -oE 'text-[a-z0-9]+' | sort -u)
  h2_count=$(echo "$h2_sizes" | grep -c 'text-')
  if [ "$h2_count" -gt 1 ]; then
    echo "===== $relpath ($screen) =====" >> "$OUT"
    echo "[H2 VARIANCE] Multiple h2 text sizes: $(echo $h2_sizes | tr '\n' ' ')" >> "$OUT"
    echo "" >> "$OUT"
    problems=1
  fi
  
  h3_sizes=$(grep '<h3[^>]*>' "$f" | grep -oE 'text-[a-z0-9]+' | sort -u)
  h3_count=$(echo "$h3_sizes" | grep -c 'text-')
  if [ "$h3_count" -gt 1 ]; then
    echo "===== $relpath ($screen) =====" >> "$OUT"
    echo "[H3 VARIANCE] Multiple h3 text sizes: $(echo $h3_sizes | tr '\n' ' ')" >> "$OUT"
    echo "" >> "$OUT"
    problems=1
  fi
  
  # Check 10: Hero description text-lg on mobile
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n -E '<p[^>]*class="[^"]*text-(lg|xl)[^"]*"' "$f" | grep -E '(subtitle|desc|description|tagline|lead|hero)' | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[MOBILE] Hero description using text-lg or text-xl:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
      problems=1
    fi
  fi
  
  # Check 11: CTA section buttons (bottom of page)
  hits=$(grep -n -E 'class="[^"]*(px-[0-9]+.*py-[0-9]+|py-[0-9]+.*px-[0-9]+)[^"]*"' "$f" | grep -E '(CTA|cta|quote|contact|get-)' | head -10)
  if [ -n "$hits" ]; then
    echo "===== $relpath ($screen) =====" >> "$OUT"
    echo "[CTA] Bottom CTA buttons:" >> "$OUT"
    echo "$hits" >> "$OUT"
    echo "" >> "$OUT"
  fi
  
  # Check 12: Form inputs on mobile
  if [[ "$screen" == "mobile" ]]; then
    hits=$(grep -n -E '<(input|textarea|select)[^>]*class="[^"]*text-' "$f" | head -5)
    if [ -n "$hits" ]; then
      echo "===== $relpath ($screen) =====" >> "$OUT"
      echo "[FORM] Form inputs with text-size classes:" >> "$OUT"
      echo "$hits" >> "$OUT"
      echo "" >> "$OUT"
    fi
  fi
done

echo "Done. Output: $OUT"
wc -l "$OUT"

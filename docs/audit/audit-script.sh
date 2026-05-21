#!/bin/bash
# Comprehensive font/button size audit script
# Outputs JSON for each file with key metrics

BASE="/Users/chee/Projects/KitchenYuKoLi/src/pages"
OUT="/Users/chee/Projects/KitchenYuKoLi/docs/audit/raw-audit.txt"

# Exclude products/ and applications/
FILES=$(find "$BASE" -type f -name "*.html" | grep -v products/ | grep -v applications/ | sort)

echo "=== FONT/BUTTON SIZE AUDIT ===" > "$OUT"
echo "Generated: $(date)" >> "$OUT"
echo "" >> "$OUT"

for f in $FILES; do
  relpath="${f#$BASE/}"
  screen=""
  if [[ "$f" == *"-mobile.html" ]]; then screen="mobile"
  elif [[ "$f" == *"-tablet.html" ]]; then screen="tablet"
  elif [[ "$f" == *"-pc.html" ]]; then screen="pc"
  fi
  
  echo "========================================" >> "$OUT"
  echo "FILE: $relpath  (screen=$screen)" >> "$OUT"
  
  # Extract H1 tags with text-size classes
  echo "--- H1 TAGS ---" >> "$OUT"
  grep -n -E '<h1[^>]*>' "$f" | head -10 >> "$OUT"
  
  # Extract H2 tags with text-size classes
  echo "--- H2 TAGS ---" >> "$OUT"
  grep -n -E '<h2[^>]*>' "$f" | head -20 >> "$OUT"
  
  # Extract H3 tags with text-size classes
  echo "--- H3 TAGS ---" >> "$OUT"
  grep -n -E '<h3[^>]*>' "$f" | head -20 >> "$OUT"
  
  # Extract paragraph text-size classes (not inside headings)
  echo "--- PARAGRAPH text-size classes ---" >> "$OUT"
  grep -n -E '<p[^>]*class="[^"]*text-(xl|2xl|3xl|4xl|5xl|lg|base|sm)' "$f" | head -20 >> "$OUT"
  
  # Extract CTA buttons with padding and text-size
  echo "--- BUTTONS/CTA ---" >> "$OUT"
  grep -n -E '<(button|a)[^>]*(btn|CTA|cta|primary|secondary|px-|py-)[^>]*>' "$f" | head -20 >> "$OUT"
  
  # Extract any element with text-lg or text-xl on mobile/tablet (potential problem)
  if [[ "$screen" == "mobile" ]]; then
    echo "--- MOBILE: text-lg/text-xl on non-heading elements ---" >> "$OUT"
    grep -n -E 'class="[^"]*text-(lg|xl)' "$f" | grep -v -E '<(h1|h2|h3|h4)' | grep -v 'material-symbols' | head -20 >> "$OUT"
    echo "--- MOBILE: CTA buttons with px-8 py-4 or larger (no text-sm) ---" >> "$OUT"
    grep -n -E '(px-8|px-10|py-4|py-5)' "$f" | grep -v 'text-sm' | head -20 >> "$OUT"
    echo "--- MOBILE: H2 with text-3xl or larger ---" >> "$OUT"
    grep -n '<h2' "$f" | grep -E 'text-(3xl|4xl|5xl)' | head -20 >> "$OUT"
  fi
  
  if [[ "$screen" == "tablet" ]]; then
    echo "--- TABLET: H2 with text-4xl or larger ---" >> "$OUT"
    grep -n '<h2' "$f" | grep -E 'text-(4xl|5xl)' | head -20 >> "$OUT"
    echo "--- TABLET: CTA buttons with px-8 py-4 (no text-sm) ---" >> "$OUT"
    grep -n -E 'px-8.*py-4|py-4.*px-8' "$f" | grep -v 'text-sm' | head -20 >> "$OUT"
  fi

  # Form inputs text-size check
  echo "--- FORM INPUTS ---" >> "$OUT"
  grep -n -E '<(input|textarea|select)[^>]*>' "$f" | head -10 >> "$OUT"
  
  # Footer CTA section
  echo "--- FOOTER/CTA section ---" >> "$OUT"
  grep -n -i -E '(footer|bottom-cta|cta-section|get-quote|contact-us)' "$f" | head -10 >> "$OUT"
  
  # Description paragraphs near hero
  echo "--- HERO DESCRIPTION ---" >> "$OUT"
  grep -n -B2 -A2 -E 'class="[^"]*(hero|subtitle|description|tagline|lead)' "$f" | head -20 >> "$OUT"
  
  echo "" >> "$OUT"
done

echo "Audit complete. Output: $OUT"
wc -l "$OUT"

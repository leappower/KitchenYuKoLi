#!/bin/bash
# Comprehensive font & button size audit for products/ and applications/ pages
# macOS-compatible (no -P flag)

BASE="/Users/chee/Projects/KitchenYuKoLi/src/pages"

echo "=== AUDIT RESULTS ==="
echo ""

for SECTION in products applications; do
  for DIR in "$BASE/$SECTION"/*/; do
    [ -d "$DIR" ] || continue
    PAGE=$(basename "$DIR")
    
    for VARIANT in pc tablet mobile; do
      FILE="$DIR/index-${VARIANT}.html"
      [ -f "$FILE" ] || continue
      
      REL="${SECTION}/${PAGE}/${VARIANT}"
      echo "--- $REL ---"
      
      # 1. H1 text-size
      H1=$(grep -oE '<h1[^>]*class="[^"]*"' "$FILE" | head -1)
      H1_SIZE=$(echo "$H1" | grep -oE 'text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)')
      echo "  H1: $H1_SIZE"
      
      # 2. Hero description - find text near hero area (first section's p tags)
      HERO_DESC=$(grep -oE '<p[^>]*class="[^"]*"' "$FILE" | head -3)
      HERO_DESC_SIZE=$(echo "$HERO_DESC" | grep -oE 'text-(sm|base|lg|xl|2xl|3xl|4xl|5xl)' | head -1)
      echo "  HeroDesc: $HERO_DESC_SIZE"
      
      # 3. CTA buttons - look for buttons with px- and py- classes
      # Find all button/link elements with px- classes
      CTAS=$(grep -oE '<(a|button)[^>]*(px-[0-9]+|py-[0-9]+)[^>]*>' "$FILE" | head -5)
      CTA_SIZES=$(echo "$CTAS" | grep -oE 'px-[0-9]+' | head -3)
      CTA_PYS=$(echo "$CTAS" | grep -oE 'py-[0-9]+' | head -3)
      CTA_TEXT=$(echo "$CTAS" | grep -oE 'text-(xs|sm|base|lg|xl|2xl)' | head -3)
      echo "  CTA_btn: px=$CTA_SIZES py=$CTA_PYS text=$CTA_TEXT"
      
      # 4. Section H2
      H2S=$(grep -oE '<h2[^>]*class="[^"]*"' "$FILE")
      H2_SIZES=$(echo "$H2S" | grep -oE 'text-(sm|base|lg|xl|2xl|3xl|4xl|5xl)' | sort | uniq)
      echo "  H2: $H2_SIZES"
      
      # 5. Section H3
      H3S=$(grep -oE '<h3[^>]*class="[^"]*"' "$FILE")
      H3_SIZES=$(echo "$H3S" | grep -oE 'text-(sm|base|lg|xl|2xl|3xl|4xl)' | sort | uniq)
      echo "  H3: $H3_SIZES"
      
      # 6. Body text - <p> tags (excluding inside hero-specific areas) with text-lg or larger
      # Get all <p> with text- classes
      P_SIZES=$(grep -oE '<p[^>]*class="[^"]*text-(lg|xl|2xl|3xl)[^"]*"' "$FILE" | grep -v 'font-' | head -5)
      if [ -n "$P_SIZES" ]; then
        echo "  Body_p_large:"
        echo "$P_SIZES" | sed 's/^/    /'
      else
        echo "  Body_p_large: (none)"
      fi
      
      # 7. PROBLEM CHECKS for mobile
      if [ "$VARIANT" = "mobile" ]; then
        # Check for px-8 py-4 on any element (CTA or buttons)
        PROB_PAD=$(grep -E 'px-8.*py-4|py-4.*px-8' "$FILE" | grep -v '<!--' | head -3)
        if [ -n "$PROB_PAD" ]; then
          echo "  ⚠️ PROBLEM: px-8 py-4 found on mobile:"
          echo "$PROB_PAD" | sed 's/^/    /'
        fi
        
        # Check for text-xl on <p> tags (not headings, not icons, not stats)
        PROB_XL_P=$(grep -E '<p[^>]*text-xl' "$FILE" | grep -v material-symbols | grep -v 'font-size' | head -3)
        if [ -n "$PROB_XL_P" ]; then
          echo "  ⚠️ PROBLEM: text-xl on <p> on mobile:"
          echo "$PROB_XL_P" | sed 's/^/    /'
        fi
        
        # Check for text-lg on body paragraphs (not headings, not icons)
        PROB_LG=$(grep -E '<p[^>]*text-lg' "$FILE" | grep -v material-symbols | grep -v 'stat\|number\|metric\|count\|value' | head -3)
        if [ -n "$PROB_LG" ]; then
          echo "  ⚠️ PROBLEM: text-lg text-slate-600 on <p> on mobile:"
          echo "$PROB_LG" | sed 's/^/    /'
        fi
        
        # Check for text-3xl on h2
        PROB_H2=$(grep -E '<h2[^>]*text-3xl' "$FILE" | head -2)
        if [ -n "$PROB_H2" ]; then
          echo "  ⚠️ PROBLEM: text-3xl on h2 on mobile:"
          echo "$PROB_H2" | sed 's/^/    /'
        fi
      fi
      
      # 7b. PROBLEM CHECKS for tablet
      if [ "$VARIANT" = "tablet" ]; then
        # Check for text-4xl on h2 without responsive breakpoint
        PROB_H2_T=$(grep -E '<h2[^>]*text-4xl' "$FILE" | grep -v 'xl:' | grep -v '2xl:' | head -2)
        if [ -n "$PROB_H2_T" ]; then
          echo "  ⚠️ PROBLEM: text-4xl on h2 on tablet (no responsive):"
          echo "$PROB_H2_T" | sed 's/^/    /'
        fi
      fi
      
      # 8. Bottom CTA section
      BOTTOM_CTA=$(grep -A5 -E 'CTA|cta-bottom|bottom-cta|call.to.action' "$FILE" | grep -oE 'text-(xs|sm|base|lg|xl|2xl)' | head -2)
      echo "  BottomCTA: $BOTTOM_CTA"
      
      echo ""
    done
  done
done

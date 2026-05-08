#!/bin/bash
cd "$(dirname "$0")"

echo "=== IDs in JS but NOT in any HTML ==="
js_ids=$(grep -roh "getElementById(['\"][^'\"]*['\"])" src/assets/js/ --include='*.js' | grep -v vendor | sed "s/getElementById(['\"]//;s/['\"])//" | sort -u)

for id in $js_ids; do
  count=$(grep -rl "id=\"$id\"" src/pages/ --include='*.html' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" = "0" ]; then
    # Which JS file references it
    src=$(grep -rn "getElementById(['\"]$id['\"])" src/assets/js/ --include='*.js' | grep -v vendor | head -1 | cut -d: -f1-2)
    echo "  MISSING: #$id  → $src"
  fi
done

echo ""
echo "=== Important data-component in HTML but no matching JS handler ==="
components=$(grep -roh 'data-component="[^"]*"' src/pages/ --include='*.html' | sed 's/data-component="//;s/"//' | sort -u)
for comp in $components; do
  count=$(grep -rl "$comp" src/assets/js/ --include='*.js' | grep -v vendor | wc -l | tr -d ' ')
  if [ "$count" = "0" ]; then
    echo "  NO HANDLER: $comp"
  fi
done

echo ""
echo "=== JS files loaded in HTML via script src ==="
loaded_js=$(grep -roh 'src="[^"]*\.js"' src/pages/ --include='*.html' | sed 's/src="//;s/"//' | sort -u)
for f in $loaded_js; do
  base=$(basename "$f")
  if [ ! -f "src/assets/js/$base" ] && [ ! -f "src/$f" ] && [ ! -f "$f" ]; then
    echo "  BROKEN SRC: $f"
  fi
done

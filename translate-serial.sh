#!/bin/bash
# Serial translator - one language at a time to avoid OOM
# Usage: PROVIDER=xxx bash translate-serial.sh

set -e
cd /Users/chee/Projects/KitchenYuKoLi

LANG_DIR="src/assets/lang"
LOG_DIR="/tmp"

# Determine languages that still need translation
langs=()
for f in "$LANG_DIR"/*-ui.json; do
  lang=$(basename "$f" | sed 's/-ui\.json//')
  remaining=$(grep -c 'TRANSLATE:' "$f" 2>/dev/null || echo 0)
  if [ "$remaining" -gt 0 ]; then
    langs+=("$lang")
  fi
done

echo "[$(date '+%H:%M:%S')] Languages to translate: ${#langs[@]}"
echo "[$(date '+%H:%M:%S')] ${langs[*]}"
echo ""

for lang in "${langs[@]}"; do
  remaining=$(grep -c "TRANSLATE:" "$LANG_DIR/${lang}-ui.json" 2>/dev/null || echo 0)
  if [ "$remaining" -eq 0 ]; then
    echo "[$(date '+%H:%M:%S')] ⏭️ $lang already done, skipping"
    continue
  fi
  
  echo "[$(date '+%H:%M:%S')] 🚀 Starting $lang ($remaining keys remaining)"
  node translate-lang.js "$lang" 30 600 >> "$LOG_DIR/translate-$lang.log" 2>&1
  exit_code=$?
  
  new_remaining=$(grep -c "TRANSLATE:" "$LANG_DIR/${lang}-ui.json" 2>/dev/null || echo 0)
  
  if [ "$new_remaining" -eq 0 ]; then
    echo "[$(date '+%H:%M:%S')] ✅ $lang complete!"
  elif [ "$exit_code" -ne 0 ]; then
    echo "[$(date '+%H:%M:%S')] ❌ $lang exited with code $exit_code, $new_remaining remaining"
  else
    echo "[$(date '+%H:%M:%S')] ⚠️ $lang finished but $new_remaining keys still remaining"
  fi
  echo ""
done

echo "[$(date '+%H:%M:%S')] 🏁 All done!"

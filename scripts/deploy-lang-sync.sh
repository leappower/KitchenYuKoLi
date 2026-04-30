#!/usr/bin/env bash
# deploy-lang-sync.sh — Sync lang files from KitchenYuKoLi CMS to KitchenYuKoLiServer
# Usage: ./scripts/deploy-lang-sync.sh [--dry-run] [--force]

set -euo pipefail

# --- Config ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_DIR/src/assets/lang"
TARGET_PROJECT_DIR="${KITCHEN_YUKOLI_SERVER:-../KitchenYuKoLiServer}"
TARGET_DIR="$TARGET_PROJECT_DIR/src/assets/lang"

DRY_RUN=false
FORCE=false

# --- Parse args ---
for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --force)    FORCE=true   ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--force]"
      echo "  --dry-run   Show what would change without copying"
      echo "  --force     Sync all files (default: only files that differ)"
      echo ""
      echo "Source:      $SOURCE_DIR/*.json"
      echo "Target:      $TARGET_DIR/*.json"
      echo "Target proj: $TARGET_PROJECT_DIR"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# --- Validate ---
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [ ! -d "$TARGET_PROJECT_DIR" ]; then
  echo "❌ Target project not found: $TARGET_PROJECT_DIR" >&2
  echo "   Set KITCHEN_YUKOLI_SERVER env to override the default path" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"

# --- Sync ---
ACTION="${DRY_RUN:+DRY RUN }"
echo "🔍 ${ACTION}Comparing lang files..."
echo "   Source: $SOURCE_DIR"
echo "   Target: $TARGET_DIR"
echo ""

changed=0
added=0
removed=0
skipped=0

# Use rsync if available, else cp
if command -v rsync &>/dev/null; then
  SYNC_CMD="rsync"
  if [ "$FORCE" = true ]; then
    RSYNC_FLAGS="-av --delete"
  else
    RSYNC_FLAGS="-av --delete"
  fi

  if [ "$DRY_RUN" = true ]; then
    RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
  fi

  # Count changes via dry-run
  dry_output=$(rsync -rcn --delete --include='*.json' --exclude='*' "$SOURCE_DIR/" "$TARGET_DIR/" 2>&1 || true)

  while IFS= read -r line; do
    file=$(basename "$line")
    if [[ -z "$file" ]]; then continue; fi
    if echo "$line" | grep -q "^deleting\|^>f"; then
      ((removed++))
    elif echo "$line" | grep -q "^<f\|^[^. ]"; then
      ((added++))
    else
      ((changed++))
    fi
  done <<< "$dry_output"

  # Execute
  rsync $RSYNC_FLAGS --include='*.json' --exclude='*' "$SOURCE_DIR/" "$TARGET_DIR/"
else
  SYNC_CMD="cp"
  shopt -s nullglob

  # Track existing target files
  declare -A target_files
  for f in "$TARGET_DIR"/*.json; do
    target_files["$(basename "$f")"]=1
  done

  for src_file in "$SOURCE_DIR"/*.json; do
    filename=$(basename "$src_file")
    target_file="$TARGET_DIR/$filename"

    if [ -f "$target_file" ]; then
      unset "target_files[$filename]"
      if [ "$FORCE" = true ]; then
        if [ "$DRY_RUN" = false ]; then
          cp "$src_file" "$target_file"
        fi
        ((changed++))
      else
        if ! cmp -s "$src_file" "$target_file"; then
          if [ "$DRY_RUN" = false ]; then
            cp "$src_file" "$target_file"
          fi
          ((changed++))
        else
          ((skipped++))
        fi
      fi
    else
      if [ "$DRY_RUN" = false ]; then
        cp "$src_file" "$target_file"
      fi
      ((added++))
    fi
  done

  # Remove files in target not in source (when --force or dry-run showing deletions)
  if [ "$FORCE" = true ]; then
    for filename in "${!target_files[@]}"; do
      if [ "$DRY_RUN" = false ]; then
        rm "$TARGET_DIR/$filename"
      fi
      ((removed++))
    done
  fi

  shopt -u nullglob
fi

# --- Summary ---
echo "─────────────────────────────────────"
echo "✅ ${ACTION}Lang sync complete!"
echo "   📝 Changed: $changed"
echo "   ➕ Added:   $added"
echo "   ➖ Removed: $removed"
if [ "$SYNC_CMD" = "cp" ]; then
  echo "   ⏭️  Skipped: $skipped (identical)"
fi
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "💡 Remove --dry-run to apply changes"
fi

#!/bin/bash
set -e

PROTECTED=(
  "src/pages/contact/index-pc.html"
  "src/pages/contact/index-mobile.html"
  "src/pages/contact/index-tablet.html"
  "src/pages/quote/index-pc.html"
  "src/pages/quote/index-mobile.html"
  "src/pages/quote/index-tablet.html"
  "src/assets/js/quote-form.js"
)

BACKUP_DIR="/tmp/yukoli-sync-$(date +%s)"
mkdir -p "$BACKUP_DIR"

echo "📦 1. 备份受保护文件..."
for f in "${PROTECTED[@]}"; do cp "$f" "$BACKUP_DIR/$(basename $f)"; done

echo "📥 2. fetch..."
git fetch origin dev
REMOTE=$(git rev-parse origin/dev)
LOCAL=$(git rev-parse HEAD)

if [ "$REMOTE" = "$LOCAL" ]; then
  echo "✅ 已是最新，无需同步"
  exit 0
fi

echo "🔄 3. 尝试 stash 本地（如果有改动）..."
STASH_CREATED=""
git stash push -m "sync-protect-$(date +%Y%m%d%H%M)" -- "${PROTECTED[@]}" 2>/dev/null && STASH_CREATED="yes" || true

echo "🔄 4. rebase..."
git rebase origin/dev 2>/dev/null || { echo "⚠️ rebase 冲突，用 --theirs 保留我们的..." && git checkout --theirs "${PROTECTED[@]}" 2>/dev/null && git add "${PROTECTED[@]}" && git rebase --continue 2>/dev/null || { git rebase --abort 2>/dev/null; echo "⚠️ rebase 失败已回退"; }; }

echo "🔧 5. 恢复保护文件（从备份副本）..."
for f in "${PROTECTED[@]}"; do
  if [ -f "$BACKUP_DIR/$(basename $f)" ]; then
    cp "$BACKUP_DIR/$(basename $f)" "$f"
    git add "$f"
  fi
done

echo "🔍 6. 检查远程实质性改动..."
for f in "${PROTECTED[@]}"; do
  DIFF=$(git diff "$REMOTE" -- "$f" 2>/dev/null | grep -v "v=2026" | grep -c "^[+-]" || true)
  if [ "$DIFF" -gt 20 ]; then echo "  ⚠️ $f: $DIFF 行改动，注意审查"; fi
done

echo ""
echo "✅ 同步完成。查看差异：git diff $REMOTE -- <文件路径>"

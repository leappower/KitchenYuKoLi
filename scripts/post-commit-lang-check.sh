#!/usr/bin/env bash
# post-commit-lang-check.sh — Remind to sync lang files after commit
#
# Install: ln -s ../../scripts/post-commit-lang-check.sh .githooks/post-commit
# (The prepare script already sets core.hooksPath to .githooks)

# Check if any lang files were part of the latest commit
COMMIT_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null)

if echo "$COMMIT_FILES" | grep -q '^src/assets/lang/.*\.json$'; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💡 Lang files changed in this commit!"
  echo ""
  CHANGED=$(echo "$COMMIT_FILES" | grep '^src/assets/lang/.*\.json$' || true)
  echo "   $CHANGED"
  echo ""
  echo "   Don't forget to sync to KitchenYuKoLiServer:"
  echo "   npm run sync:lang"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
fi

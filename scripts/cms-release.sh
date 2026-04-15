#!/bin/bash
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "[CMS] Step 1: 同步图片..."
mkdir -p src/assets/images/products/
cp -n src/admin/uploads/* src/assets/images/products/ 2>/dev/null || true
echo "[CMS] 图片同步完成"

echo "[CMS] Step 2: Git 提交..."
git add src/assets/js/product-data-table.js src/assets/images/products/ 2>/dev/null || true
git commit -m "cms: auto-publish $(date '+%Y-%m-%d %H:%M')" --allow-empty || true

echo "[CMS] Step 3: Git push..."
git push origin dev
echo "[CMS] ✅ 发布完成"

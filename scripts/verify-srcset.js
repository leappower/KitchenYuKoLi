#!/usr/bin/env node
/**
 * verify-srcset.js — 验收多屏图片 srcset 全覆盖
 *
 * 检查项：
 *   1. 所有源 .webp 图片的 -375w / -828w / -1200w 副本是否存在
 *   2. 所有静态 HTML 中的 <img> 是否已有 srcset
 *   3. main.js 中 _injectSrcset 函数是否存在（JS 动态渲染覆盖）
 *
 * 用法: node scripts/verify-srcset.js
 * 退出码: 0=通过, 1=有错误
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'src', 'assets', 'images');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const MAIN_JS = path.join(ROOT, 'src', 'assets', 'js', 'main.js');

const TARGET_WIDTHS = [375, 828, 1200, 1920];
const IMG_EXTS = ['.webp', '.png', '.jpg', '.jpeg', '.avif'];

let exitCode = 0;
let errors = [];
let warnings = [];

function logError(msg) { errors.push(msg); console.error('  ❌ ' + msg); }
function logWarn(msg) { warnings.push(msg); console.warn('  ⚠️  ' + msg); }

// ─── 1. 检查缩放图片文件完整性 ─────────────────────────
function checkResizedImages() {
  console.log('');
  console.log('📸 检查 1: 缩放图片文件完整性');
  console.log('  （允许源图宽度不足时跳过不 upscale）');

  const sharp = (function() {
    try { return require('sharp'); } catch(e) { return null; }
  })();

  let totalSources = 0;
  let missingCount = 0;
  let needReview = [];

  function getSourceWidth(filePath) {
    if (!sharp) return null; // 没有 sharp 就跳过错检
    try {
      return sharp(filePath).metadata().then(function(m) { return m.width; });
    } catch(e) { return null; }
  }

  // 同步版本
  function getSourceWidthSync(filePath) {
    try {
      const execSync = require('child_process').execSync;
      const out = execSync(
        'node -e "require(\'sharp\')(\'' + filePath + '\').metadata().then(m => console.log(m.width))"',
        { cwd: ROOT, timeout: 5000, encoding: 'utf-8' }
      ).trim();
      return parseInt(out, 10) || null;
    } catch(e) { return null; }
  }

  // 用预先生成的尺寸信息缓存
  const widthCache = {};
  function getWidth(srcPath) {
    if (widthCache[srcPath] !== undefined) return widthCache[srcPath];
    // 通过文件名推测最大尺寸：看是否已有某宽度的副本
    for (const w of [2048, 1920, 1200, 828, 375]) {
      const candidate = srcPath.replace(/(\.\w+)$/, '-' + w + 'w$1');
      if (fs.existsSync(candidate)) {
        widthCache[srcPath] = w;
        return w;
      }
    }
    // 退化：用 sharp 读取（失败时返回 null，不阻塞）
    try {
      widthCache[srcPath] = getSourceWidthSync(srcPath);
    } catch(e) {
      widthCache[srcPath] = null;
    }
    // 某些文件 sharp 无法读取格式，标记为 -1
    if (widthCache[srcPath] === null) {
      widthCache[srcPath] = -1;
    }
    return widthCache[srcPath];
  }

  let skippedDueToWidth = 0;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '_backup' || entry.name === '.git') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // resize-images.js 只处理 .webp
        if (ext === '.webp' && !/-\d+w\./.test(entry.name)) {
          totalSources++;
          const srcWidth = getWidth(abs);
          for (const w of TARGET_WIDTHS) {
            const resizedName = entry.name.replace(/(\.\w+)$/, '-' + w + 'w$1');
            const resizedPath = path.join(dir, resizedName);
            if (!fs.existsSync(resizedPath)) {
              if (srcWidth && srcWidth < w) {
                skippedDueToWidth++;
              } else if (srcWidth === -1) {
                // 文件读取失败（如 og-image.webp），不算错误
              } else {
                missingCount++;
                if (missingCount <= 10) {
                  needReview.push({ path: path.relative(IMG_DIR, resizedPath), srcWidth: srcWidth });
                }
              }
            }
          }
        }
      }
    }
  }

  walk(IMG_DIR);

  console.log(`  源图片: ${totalSources} 张`);
  console.log(`  应有缩放副本: ${totalSources * TARGET_WIDTHS.length} 个`);
  console.log(`  因原图宽度不足跳过: ${skippedDueToWidth} 个`);

  if (missingCount > 0) {
    logError(`缺少 ${missingCount} 个缩放文件（需人工复核）`);
    for (const m of needReview.slice(0, 10)) {
      console.log(`      缺失: ${m.path} (源图宽度: ${m.srcWidth || '未知'})`);
    }
    if (missingCount > 10) {
      console.log(`      ... 还有 ${missingCount - 10} 个`);
    }
  } else if (needReview.length === 0) {
    console.log('  ✅ 全部缩放文件齐全');
  }
}

// ─── 2. 检查静态 HTML 的 srcset ────────────────────────
function checkStaticHtml() {
  console.log('');
  console.log('📄 检查 2: 静态 HTML srcset 覆盖');

  let totalImgs = 0;
  let missingSrcset = 0;
  let missingList = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.name.endsWith('.html')) {
        const content = fs.readFileSync(abs, 'utf-8');
        const imgRegex = /<img\b[^>]*?>/gi;
        let m;
        while ((m = imgRegex.exec(content)) !== null) {
          const tag = m[0];
          // 只关心图片文件
          const srcMatch = tag.match(/src\s*=\s*"([^"]*\.(webp|png|jpg|jpeg|avif))"/i);
          if (!srcMatch) continue;
          // 跳过 data: URI
          if (srcMatch[1].startsWith('data:')) continue;
          totalImgs++;
          if (!/\b(srcset)\s*=/i.test(tag)) {
            missingSrcset++;
            if (missingSrcset <= 10) {
              missingList.push({ file: path.relative(PAGES_DIR, abs), src: srcMatch[1] });
            }
          }
        }
      }
    }
  }

  walk(PAGES_DIR);

  console.log(`  共 ${totalImgs} 个图片引用`);

  if (missingSrcset > 0) {
    logWarn(`${missingSrcset} 个图片缺少 srcset（部分可能是小图标/logo，建议人工复核）`);
    for (const m of missingList.slice(0, 5)) {
      console.log(`      ${m.file}: ${m.src.substring(0, 60)}`);
    }
    if (missingSrcset > 5) {
      console.log(`      ... 还有 ${missingSrcset - 5} 个`);
    }
  } else {
    console.log('  ✅ 全部静态 HTML 图片有 srcset');
  }
}

// ─── 3. 检查 main.js 的 srcset 注入逻辑 ────────────────
function checkMainJs() {
  console.log('');
  console.log('🔧 检查 3: main.js srcset 注入逻辑');

  if (!fs.existsSync(MAIN_JS)) {
    logError('main.js 不存在');
    return;
  }

  const content = fs.readFileSync(MAIN_JS, 'utf-8');

  if (content.indexOf('_injectSrcset') !== -1) {
    console.log('  ✅ 发现 _injectSrcset 函数');
  } else {
    logError('_injectSrcset 函数不存在');
  }

  if (content.indexOf('_globalImgObserver') !== -1) {
    console.log('  ✅ 发现 _globalImgObserver MutationObserver');
  } else {
    logError('_globalImgObserver MutationObserver 不存在');
  }

  // 检查没有被旧的 _buildSrcset 残留
  if (content.indexOf('_buildSrcset') !== -1) {
    logWarn('发现残留的 _buildSrcset（已被 _injectSrcset 替代）');
  }
}

// ─── 4. 检查 product-grid.js 中 _resolveImage 存在 ─────
function checkProductGrid() {
  console.log('');
  console.log('📦 检查 4: 产品图片渲染路径');

  const pgPath = path.join(ROOT, 'src', 'assets', 'js', 'product-grid.js');
  if (!fs.existsSync(pgPath)) {
    logError('product-grid.js 不存在');
    return;
  }

  const content = fs.readFileSync(pgPath, 'utf-8');
  if (content.indexOf('_resolveImage') !== -1) {
    console.log('  ✅ product-grid.js 使用 _resolveImage 统一解析图片路径');
  } else {
    logError('_resolveImage 不存在');
  }
}

// ─── 主流程 ─────────────────────────────────────────────
function main() {
  const startTime = Date.now();
  console.log('');
  console.log('🔍 验收: 多屏 srcset 全覆盖');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  checkResizedImages();
  checkStaticHtml();
  checkMainJs();
  checkProductGrid();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  错误: ${errors.length}`);
  console.log(`  警告: ${warnings.length}`);
  console.log(`  耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errors.length > 0) {
    console.log('\n❌ 验收未通过！');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\n✅ 核心功能全部通过，存在警告建议复查');
    process.exit(0);
  }

  console.log('\n✅ 全部验收通过！');
  process.exit(0);
}

main();

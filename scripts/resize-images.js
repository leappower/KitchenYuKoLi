#!/usr/bin/env node
/**
 * resize-images.js — 为 KitchenYuKoLi 全站图片生成多尺寸 srcset 副本
 *
 * 读取 src/assets/images/ 下所有 .webp 文件，在相同目录下生成：
 *   -375w.webp, -828w.webp, -1200w.webp, -1920w.webp, -2048w.webp
 *
 * 并发处理以加速。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const SRC_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'images');
const TARGET_WIDTHS = [375, 828, 1200, ];
const CONCURRENCY = 16;

async function getImageWidth(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return meta.width || null;
  } catch {
    return null;
  }
}

async function processFile(absPath) {
  const relPath = path.relative(SRC_DIR, absPath);
  const dir = path.dirname(absPath);
  const basename = path.basename(absPath, '.webp');
  const sourceWidth = await getImageWidth(absPath);

  if (!sourceWidth) {
    return { relPath, status: 'SKIP', reason: '无法读取' };
  }

  let generated = 0;
  for (const width of TARGET_WIDTHS) {
    const targetName = `${basename}-${width}w.webp`;
    const targetPath = path.join(dir, targetName);

    if (fs.existsSync(targetPath)) {
      generated++;
      continue;
    }
    if (sourceWidth < width) {
      // Skip upscaling
      generated++;
      continue;
    }

    try {
      await sharp(absPath)
        .resize(width, undefined, { fit: 'outside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(targetPath);
      generated++;
    } catch (err) {
      return { relPath, status: 'FAIL', reason: err.message };
    }
  }

  if (generated === TARGET_WIDTHS.length) {
    return { relPath, status: 'OK' };
  } else {
    return { relPath, status: 'PARTIAL', count: generated };
  }
}

async function main() {
  console.log('=== BrewYuKoLi 图片尺寸生成 ===');
  console.log(`源目录: ${SRC_DIR}`);
  console.log(`目标尺寸: ${TARGET_WIDTHS.join('w, ')}w`);
  console.log(`并发数: ${CONCURRENCY}\n`);

  // Walk and collect source files
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.webp') && !/-\d+w\.webp$/.test(entry.name)) {
        files.push(abs);
      }
    }
  }
  walk(SRC_DIR);

  console.log(`找到 ${files.length} 个源图片\n`);

  // Process concurrently in batches
  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processFile));

    for (const r of results) {
      if (r.status === 'OK') {
        ok++;
      } else if (r.status === 'SKIP') {
        skip++;
        if (skip <= 5) console.warn(`  [SKIP] ${r.relPath} — ${r.reason}`);
      } else if (r.status === 'FAIL') {
        fail++;
        console.error(`  [FAIL] ${r.relPath} — ${r.reason}`);
      } else {
        skip++;
        console.warn(`  [PARTIAL] ${r.relPath} — 只生成了 ${r.count}/${TARGET_WIDTHS.length}`);
      }
    }

    if (ok > 0 && ok % 100 === 0) {
      console.log(`  [进展] 已处理 ${ok}/${files.length}...`);
    }
  }

  console.log(`\n=== 完成 (OK=${ok}, SKIP=${skip}, FAIL=${fail}) ===`);

  // Summary
  console.log('\n--- 各尺寸文件计数 ---');
  for (const w of TARGET_WIDTHS) {
    const count = parseInt(execSync(
      `find "${SRC_DIR}" -name "*-${w}w.webp" -type f | wc -l`, { encoding: 'utf-8' }
    ).trim(), 10);
    console.log(`  ${w}w: ${count} 个文件`);
  }

  // Check key paths
  console.log('\n--- 关键目录验证 ---');
  for (const subdir of ['products', 'factory', 'solutions', 'cases', 'about']) {
    const fullDir = path.join(SRC_DIR, subdir);
    if (fs.existsSync(fullDir)) {
      const w375 = execSync(`find "${fullDir}" -name "*-375w.webp" -type f | wc -l`, { encoding: 'utf-8' }).trim();
      const w828 = execSync(`find "${fullDir}" -name "*-828w.webp" -type f | wc -l`, { encoding: 'utf-8' }).trim();
      console.log(`  ${subdir}/ → 375w: ${w375}, 828w: ${w828}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

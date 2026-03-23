const fs = require('fs');
const path = require('path');

/**
 * 分析所有HTML文件中的图片标签
 * 统计缺少width/height属性的图片
 */

function analyzeImages() {
  const htmlFiles = [];
  const imageStats = {
    total: 0,
    withDimensions: 0,
    withoutDimensions: 0,
    externalImages: [],
    localImages: [],
    byFile: {}
  };

  function scanDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }

  scanDir('src/pages');

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = file.replace('src/pages/', '');

    // 匹配所有 <img> 标签
    const imgRegex = /<img\s+([^>]*)>/gi;
    let match;
    const images = [];

    while ((match = imgRegex.exec(content)) !== null) {
      const attrs = match[1];

      // 提取关键属性
      const srcMatch = attrs.match(/src="([^"]+)"/i);
      const widthMatch = attrs.match(/width="([^"]+)"/i);
      const heightMatch = attrs.match(/height="([^"]+)"/i);

      if (srcMatch) {
        const src = srcMatch[1];
        const hasWidth = !!widthMatch;
        const hasHeight = !!heightMatch;
        const hasDimensions = hasWidth && hasHeight;

        images.push({
          src,
          width: widthMatch ? widthMatch[1] : null,
          height: heightMatch ? heightMatch[1] : null,
          hasDimensions,
          isExternal: src.startsWith('http') || src.startsWith('//'),
          loading: attrs.includes('loading="lazy"')
        });

        imageStats.total++;

        if (hasDimensions) {
          imageStats.withDimensions++;
        } else {
          imageStats.withoutDimensions++;
        }

        if (src.startsWith('http') || src.startsWith('//')) {
          imageStats.externalImages.push({
            file: relativePath,
            src
          });
        } else {
          imageStats.localImages.push({
            file: relativePath,
            src
          });
        }
      }
    }

    if (images.length > 0) {
      imageStats.byFile[relativePath] = {
        total: images.length,
        withDimensions: images.filter(img => img.hasDimensions).length,
        withoutDimensions: images.filter(img => !img.hasDimensions).length,
        images: images.filter(img => !img.hasDimensions).map(img => ({
          src: img.src,
          isExternal: img.isExternal
        }))
      };
    }
  });

  return imageStats;
}

const stats = analyzeImages();

console.log('📊 图片分析报告\n');
console.log('═'.repeat(60));
console.log(`总图片数: ${stats.total}`);
console.log(`已有尺寸: ${stats.withDimensions} (${((stats.withDimensions/stats.total)*100).toFixed(1)}%)`);
console.log(`缺少尺寸: ${stats.withoutDimensions} (${((stats.withoutDimensions/stats.total)*100).toFixed(1)}%)`);

console.log('\n══ 外部图片 (需要从源获取尺寸) ══');
console.log(`数量: ${stats.externalImages.length}`);
const uniqueExternal = [...new Set(stats.externalImages.map(img => img.src))];
console.log(`唯一外部图片URL: ${uniqueExternal.length}\n`);
uniqueExternal.slice(0, 10).forEach((src, i) => {
  console.log(`  ${i + 1}. ${src.substring(0, 80)}...`);
});
if (uniqueExternal.length > 10) {
  console.log(`  ... 还有 ${uniqueExternal.length - 10} 个`);
}

console.log('\n══ 本地图片 ══');
const uniqueLocal = [...new Set(stats.localImages.map(img => img.src))];
console.log(`数量: ${stats.localImages.length}`);
console.log(`唯一本地图片: ${uniqueLocal.length}\n`);

console.log('\n══ 按文件统计 (缺少尺寸最多的Top 10) ══');
const sortedFiles = Object.entries(stats.byFile)
  .sort((a, b) => b[1].withoutDimensions - a[1].withoutDimensions)
  .slice(0, 10);

sortedFiles.forEach(([file, data], index) => {
  console.log(`\n${index + 1}. ${file}`);
  console.log(`   总计: ${data.total} | 缺少尺寸: ${data.withoutDimensions}`);
  if (data.images.length > 0 && data.images.length <= 3) {
    data.images.forEach(img => {
      console.log(`   - ${img.isExternal ? '[外部]' : '[本地]'} ${img.src.substring(0, 60)}...`);
    });
  } else if (data.images.length > 3) {
    data.images.slice(0, 3).forEach(img => {
      console.log(`   - ${img.isExternal ? '[外部]' : '[本地]'} ${img.src.substring(0, 60)}...`);
    });
    console.log(`   ... 还有 ${data.images.length - 3} 个`);
  }
});

// 保存详细报告
const reportPath = 'scripts/image-analysis-report.json';
fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2), 'utf8');
console.log(`\n\n✅ 详细报告已保存到: ${reportPath}`);

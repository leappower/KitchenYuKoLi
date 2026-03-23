/**
 * 分析 scripts 目录中的所有脚本，识别无效或不再需要的脚本
 */

const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname);
const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js') || f.endsWith('.py'));

console.log('📊 分析 scripts 目录中的所有脚本...\n');

// 脚本分类
const scriptCategories = {
  // 🔴 可以删除的一次性修复脚本
  disposable: [],
  // 🟡 工具脚本（可能需要保留）
  utility: [],
  // 🟢 核心脚本（必须保留）
  core: [],
  // 🟠 产品相关（需要评估）
  product: [],
  // 🔵 分析/报告脚本
  analysis: [],
  // ❓ 未知用途
  unknown: []
};

// 脚本元数据
const scriptsMetadata = {
  // 一次性修复脚本（已完成任务，可以删除）
  'add-current-lang.js': { 
    category: 'disposable',
    reason: '一次性添加当前语言标签，已完成',
    date: '2025-03-17' 
  },
  'add-image-dimensions.js': { 
    category: 'disposable',
    reason: '一次性添加图片尺寸，已完成',
    date: '2025-03-17' 
  },
  'add-performance-css.js': { 
    category: 'disposable',
    reason: '一次性添加性能优化CSS，已完成',
    date: '2025-03-17' 
  },
  'add-template-script.js': { 
    category: 'disposable',
    reason: '一次性添加模板脚本引用，已完成',
    date: '2025-03-17' 
  },
  'add-z-index-css.js': { 
    category: 'disposable',
    reason: '一次性添加z-index CSS，已完成',
    date: '2025-03-17' 
  },
  'apply-max-display-header.js': { 
    category: 'disposable',
    reason: '一次性应用header组件，已完成',
    date: '2025-03-17' 
  },
  'cleanup-hardcoded-footer.js': { 
    category: 'disposable',
    reason: '一次性清理硬编码footer，已完成',
    date: '2025-03-17' 
  },
  'cleanup-hardcoded-footer-v2.js': { 
    category: 'disposable',
    reason: '一次性清理硬编码footer v2，已完成',
    date: '2025-03-17' 
  },
  'copy-translations.js': { 
    category: 'disposable',
    reason: '一次性复制翻译文件，已完成',
    date: '2025-03-17' 
  },
  'ensure-product-data-table.js': { 
    category: 'disposable',
    reason: '一次性确保产品数据表，已完成',
    date: '2025-03-17' 
  },
  'fix-extra-script-tags.js': { 
    category: 'disposable',
    reason: '一次性修复额外script标签，已完成',
    date: '2025-03-17' 
  },
  'fix-html-dropdowns.js': { 
    category: 'disposable',
    reason: '一次性修复HTML下拉框，已完成',
    date: '2025-03-17' 
  },
  'fix-html-newlines.js': { 
    category: 'disposable',
    reason: '一次性修复HTML换行，已完成',
    date: '2025-03-17' 
  },
  'fix-html-tags.js': { 
    category: 'disposable',
    reason: '一次性修复HTML标签，已完成',
    date: '2025-03-17' 
  },
  'fix-img-src.js': { 
    category: 'disposable',
    reason: '一次性修复图片src，已完成',
    date: '2025-03-17' 
  },
  'fix-language-dropdown-zindex.js': { 
    category: 'disposable',
    reason: '一次性修复语言下拉框z-index，已完成',
    date: '2025-03-17' 
  },
  'fix-performance-and-zindex.js': { 
    category: 'disposable',
    reason: '一次性修复性能和z-index，已完成',
    date: '2025-03-17' 
  },
  'fix-script-tag-errors.js': { 
    category: 'disposable',
    reason: '一次性修复script标签错误，已完成',
    date: '2025-03-17' 
  },
  'fix-script-tags.js': { 
    category: 'disposable',
    reason: '一次性修复script标签，已完成',
    date: '2025-03-17' 
  },
  'fix-line-svg.py': { 
    category: 'disposable',
    reason: '一次性修复SVG线条，已完成',
    date: '2025-03-17' 
  },
  'insert-min-display-footer.js': { 
    category: 'disposable',
    reason: '一次性插入min-display footer，已完成',
    date: '2025-03-17' 
  },
  'merge-translations.js': { 
    category: 'disposable',
    reason: '一次性合并翻译文件，已完成',
    date: '2025-03-17' 
  },
  'optimize-dom-fragment.js': { 
    category: 'disposable',
    reason: '一次性优化DOM片段，已完成',
    date: '2025-03-17' 
  },
  'remove-inline-fab.js': { 
    category: 'disposable',
    reason: '一次性移除内联FAB，已完成',
    date: '2025-03-17' 
  },
  'remove-orphan-backtotop-scripts.js': { 
    category: 'disposable',
    reason: '一次性移除孤立的返回顶部脚本，已完成',
    date: '2025-03-17' 
  },
  'replace-mobile-header.py': { 
    category: 'disposable',
    reason: '一次性替换移动端header，已完成',
    date: '2025-03-17' 
  },
  'split-by-language.js': { 
    category: 'disposable',
    reason: '一次性按语言分割，已完成',
    date: '2025-03-17' 
  },
  'translate-helper.js': { 
    category: 'disposable',
    reason: '一次性翻译助手，已完成',
    date: '2025-03-17' 
  },
  'update-architecture-md.js': { 
    category: 'disposable',
    reason: '一次性更新架构文档，已完成',
    date: '2025-03-17' 
  },
  'update-html-css-reference.js': { 
    category: 'disposable',
    reason: '一次性更新HTML CSS引用，已完成',
    date: '2025-03-17' 
  },
  'update-ui-script-paths.js': { 
    category: 'disposable',
    reason: '一次性更新UI脚本路径，已完成',
    date: '2025-03-17' 
  },
  'verify-image-dimensions.js': { 
    category: 'disposable',
    reason: '一次性验证图片尺寸，已完成',
    date: '2025-03-17' 
  },
  'verify-performance-fix.js': { 
    category: 'disposable',
    reason: '一次性验证性能修复，已完成',
    date: '2025-03-17' 
  },
  'verify-static-build.js': { 
    category: 'disposable',
    reason: '一次性验证静态构建，已完成',
    date: '2025-03-17' 
  },

  // 分析/报告脚本（保留用于诊断）
  'analyze-animations.js': { 
    category: 'analysis',
    reason: '分析动画，可用于性能优化',
    date: '2025-03-17' 
  },
  'analyze-dom-fragment.js': { 
    category: 'analysis',
    reason: '分析DOM片段，可用于性能优化',
    date: '2025-03-17' 
  },
  'analyze-images.js': { 
    category: 'analysis',
    reason: '分析图片，可用于性能优化',
    date: '2025-03-17' 
  },
  'check-duplicate-scripts.js': { 
    category: 'analysis',
    reason: '检查重复脚本，可用于代码审查',
    date: '2025-03-17' 
  },
  'check-header-cta.js': { 
    category: 'analysis',
    reason: '检查header CTA，可用于代码审查',
    date: '2025-03-17' 
  },
  'check-build-required.js': { 
    category: 'utility',
    reason: '检查是否需要构建，可能有用',
    date: '2025-03-17' 
  },

  // 工具脚本（保留）
  'build-i18n.js': { 
    category: 'core',
    reason: '构建i18n，核心功能',
    date: '2025-03-17' 
  },
  'init-dev.js': { 
    category: 'core',
    reason: '初始化开发环境，核心功能',
    date: '2025-03-17' 
  },
  'release.js': { 
    category: 'core',
    reason: '发布脚本，核心功能',
    date: '2025-03-17' 
  },
  'serve-static.js': { 
    category: 'core',
    reason: '静态服务器，核心功能',
    date: '2025-03-17' 
  },

  // 产品相关脚本（需要评估）
  'generate-products-data-table.js': { 
    category: 'product',
    reason: '生成产品数据表，产品功能',
    date: '2025-03-17' 
  },
  'optimize-images.js': { 
    category: 'product',
    reason: '优化图片，产品功能',
    date: '2025-03-17' 
  },
  'product-i18n-adapter.js': { 
    category: 'product',
    reason: '产品i18n适配器，产品功能',
    date: '2025-03-17' 
  },
  'product-sync-i18n.js': { 
    category: 'product',
    reason: '产品i18n同步，产品功能',
    date: '2025-03-17' 
  },
  'product-translate-adapter.js': { 
    category: 'product',
    reason: '产品翻译适配器，产品功能',
    date: '2025-03-17' 
  },
  'product-translation-handler.js': { 
    category: 'product',
    reason: '产品翻译处理器，产品功能',
    date: '2025-03-17' 
  },
  'unified-translator.js': { 
    category: 'product',
    reason: '统一翻译器，产品功能',
    date: '2025-03-17' 
  },
};

// 分类每个脚本
files.forEach(file => {
  const metadata = scriptsMetadata[file];
  if (metadata) {
    scriptCategories[metadata.category].push({
      name: file,
      reason: metadata.reason,
      date: metadata.date
    });
  } else {
    scriptCategories.unknown.push({ name: file });
  }
});

// 打印结果
console.log('═══════════════════════════════════════════════════════\n');

// 1. 可以删除的一次性脚本
console.log('🔴 可以删除的一次性修复脚本（' + scriptCategories.disposable.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.disposable.length > 0) {
  scriptCategories.disposable.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     原因: ${script.reason}`);
  });
}
console.log('');

// 2. 核心脚本（必须保留）
console.log('🟢 核心脚本（必须保留，' + scriptCategories.core.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.core.length > 0) {
  scriptCategories.core.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     原因: ${script.reason}`);
  });
}
console.log('');

// 3. 工具脚本（可能需要保留）
console.log('🟡 工具脚本（可能需要保留，' + scriptCategories.utility.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.utility.length > 0) {
  scriptCategories.utility.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     原因: ${script.reason}`);
  });
}
console.log('');

// 4. 产品相关脚本
console.log('🟠 产品相关脚本（需要评估，' + scriptCategories.product.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.product.length > 0) {
  scriptCategories.product.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     原因: ${script.reason}`);
  });
}
console.log('');

// 5. 分析/报告脚本
console.log('🔵 分析/报告脚本（保留用于诊断，' + scriptCategories.analysis.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.analysis.length > 0) {
  scriptCategories.analysis.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     原因: ${script.reason}`);
  });
}
console.log('');

// 6. 未知用途的脚本
console.log('❓ 未知用途的脚本（需要确认，' + scriptCategories.unknown.length + '个）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.unknown.length > 0) {
  scriptCategories.unknown.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
  });
}
console.log('');

// 统计
console.log('📊 统计汇总');
console.log('═══════════════════════════════════════════════════════');
console.log(`  总计: ${files.length} 个脚本`);
console.log(`  可以删除: ${scriptCategories.disposable.length} 个（一次性修复脚本）`);
console.log(`  必须保留: ${scriptCategories.core.length} 个（核心功能）`);
console.log(`  可能保留: ${scriptCategories.utility.length} 个（工具脚本）`);
console.log(`  需要评估: ${scriptCategories.product.length} 个（产品相关）`);
console.log(`  保留诊断: ${scriptCategories.analysis.length} 个（分析脚本）`);
console.log(`  未知用途: ${scriptCategories.unknown.length} 个（需要确认）`);
console.log('');

// 建议
console.log('💡 清理建议');
console.log('═══════════════════════════════════════════════════════');
console.log('1. 立即删除 ' + scriptCategories.disposable.length + ' 个一次性修复脚本');
console.log('2. 保留 ' + scriptCategories.core.length + ' 个核心脚本');
console.log('3. 评估 ' + scriptCategories.product.length + ' 个产品相关脚本是否需要');
console.log('4. 保留 ' + scriptCategories.analysis.length + ' 个分析脚本用于诊断');
console.log('5. 确认 ' + scriptCategories.unknown.length + ' 个未知用途脚本的用途');
console.log('');

// 生成删除命令
console.log('🗑️  删除命令（谨慎使用）');
console.log('═══════════════════════════════════════════════════════');
if (scriptCategories.disposable.length > 0) {
  console.log('cd /Volumes/Extend\\ HD/HTML-YuQL-Test/scripts && \\');
  scriptCategories.disposable.forEach((script, index) => {
    const sep = index === scriptCategories.disposable.length - 1 ? '' : ' \\';
    console.log(`  rm ${script.name}${sep}`);
  });
}
console.log('');

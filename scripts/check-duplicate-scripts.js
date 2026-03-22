const fs = require('fs');
const path = require('path');

// 扫描所有HTML文件
function findDuplicateScripts(htmlFiles) {
  const issues = [];

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // 查找所有script标签
    const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*>/g;
    const scripts = [];
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
      scripts.push(match[1]);
    }

    // 查找重复的script
    const uniqueScripts = new Set();
    const duplicates = [];

    scripts.forEach(src => {
      if (uniqueScripts.has(src)) {
        duplicates.push(src);
      } else {
        uniqueScripts.add(src);
      }
    });

    if (duplicates.length > 0) {
      issues.push({
        file: file.replace('src/pages/', ''),
        duplicates: [...new Set(duplicates)]
      });
    }
  });

  return issues;
}

const htmlFiles = [];

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

const issues = findDuplicateScripts(htmlFiles);

if (issues.length > 0) {
  console.log('❌ 发现重复加载的JS文件:\n');
  issues.forEach(issue => {
    console.log(`📄 ${issue.file}`);
    issue.duplicates.forEach(dup => console.log(`   ⚠️  重复加载: ${dup}`));
    console.log('');
  });
} else {
  console.log('✅ 没有发现重复加载的JS文件');
}

// 检查是否有页面同时加载了相同组件的不同版本
console.log('\n--- 检查组件加载一致性 ---');

const componentFiles = [
  'navigator.js',
  'max-display-header.js',
  'min-display-header.js',
  'footer.js',
  'min-display-footer.js',
  'back-to-top.js'
];

const componentUsage = {};

componentFiles.forEach(comp => {
  componentUsage[comp] = [];
});

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  componentFiles.forEach(comp => {
    if (content.includes(comp)) {
      componentUsage[comp].push(file.replace('src/pages/', ''));
    }
  });
});

Object.entries(componentUsage).forEach(([comp, files]) => {
  console.log(`\n${comp} 被以下文件使用 (${files.length}):`);
  if (files.length <= 5) {
    files.forEach(f => console.log(`  - ${f}`));
  } else {
    console.log(`  - ${files.slice(0, 5).join('\n  - ')}`);
    console.log(`  ... 还有 ${files.length - 5} 个文件`);
  }
});

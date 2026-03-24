#!/usr/bin/env node

/**
 * 项目结构分析脚本 - 快速了解项目关键信息
 * 输出: JSON格式,便于后续处理
 */

const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

// 分析结果
const analysis = {
  timestamp: new Date().toISOString(),
  projectDir,
  structure: {},
  stats: {
    htmlFiles: 0,
    jsFiles: 0,
    jsonFiles: 0,
    cssFiles: 0,
  },
  keyAreas: {
    pages: [],
    components: [],
    assets: [],
    scripts: []
  }
};

// 分析src目录结构
function analyzeStructure(dir, baseDir = dir, result = {}, depth = 0) {
  if (depth > 5) return result;

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(baseDir, fullPath);

    if (stat.isDirectory()) {
      result[item] = analyzeStructure(fullPath, baseDir, {}, depth + 1);

      // 识别关键区域
      if (item === 'pages') {
        analysis.keyAreas.pages.push(relativePath);
      } else if (item === 'components') {
        analysis.keyAreas.components.push(relativePath);
      } else if (item === 'assets') {
        analysis.keyAreas.assets.push(relativePath);
      } else if (item === 'scripts') {
        analysis.keyAreas.scripts.push(relativePath);
      }
    } else {
      const ext = path.extname(item);
      if (ext === '.html') {
        analysis.stats.htmlFiles++;
      } else if (ext === '.js') {
        analysis.stats.jsFiles++;
      } else if (ext === '.json') {
        analysis.stats.jsonFiles++;
      } else if (ext === '.css') {
        analysis.stats.cssFiles++;
      }
      result[item] = `[${ext.slice(1)}] ${formatSize(stat.size)}`;
    }
  }

  return result;
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

// 获取关键文件列表
function getKeyFiles() {
  const keyFiles = [
    'package.json',
    'webpack.config.js',
    'tailwind.config.js',
    'README.md'
  ];

  const files = {};
  for (const file of keyFiles) {
    const fullPath = path.join(projectDir, file);
    if (fs.existsSync(fullPath)) {
      files[file] = {
        size: fs.statSync(fullPath).size,
        modified: fs.statSync(fullPath).mtime.toISOString()
      };
    }
  }

  return files;
}

// 执行分析
console.error('正在分析项目结构...');
analysis.structure.src = analyzeStructure(path.join(projectDir, 'src'), path.join(projectDir, 'src'));
analysis.keyFiles = getKeyFiles();

// 输出结果
console.log(JSON.stringify(analysis, null, 2));

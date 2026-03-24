#!/usr/bin/env node
/**
 * analyze-dom-fragment.js - 分析项目中的 DOM 操作模式,识别可以使用 DocumentFragment 优化的场景
 *
 * 分析结果:
 * 1. 发现所有使用 createElement + appendChild/insertBefore 的位置
 * 2. 识别批量 DOM 插入操作(循环中多次 appendChild)
 * 3. 找出可以通过 DocumentFragment 优化的地方
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const JS_FILES = 'src/assets/js/**/*.js';
const OUTPUT_FILE = 'docs/dom-fragment-analysis-report.md';

// 模式匹配
const PATTERNS = {
  createElement: /document\.createElement\s*\(/g,
  appendChild: /\.appendChild\s*\(/g,
  insertBefore: /\.insertBefore\s*\(/g,
  innerHTML: /\.innerHTML\s*=/g,
  querySelectorAll: /querySelectorAll\s*\([^)]+\)\.forEach/g,
  loopAppend: /for\s*\([^)]+\)\s*\{[^}]*appendChild/gm
};

/**
 * 分析单个 JS 文件
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = {
    filePath,
    fileName: path.basename(filePath),
    createElementCount: 0,
    appendChildCount: 0,
    insertBeforeCount: 0,
    innerHTMLCount: 0,
    querySelectorAllForeachCount: 0,
    loopAppendCount: 0,
    issues: [],
    recommendations: []
  };

  // 统计模式出现次数
  const createElementMatches = content.match(PATTERNS.createElement);
  results.createElementCount = createElementMatches ? createElementMatches.length : 0;

  const appendChildMatches = content.match(PATTERNS.appendChild);
  results.appendChildCount = appendChildMatches ? appendChildMatches.length : 0;

  const insertBeforeMatches = content.match(PATTERNS.insertBefore);
  results.insertBeforeCount = insertBeforeMatches ? insertBeforeMatches.length : 0;

  const innerHTMLMatches = content.match(PATTERNS.innerHTML);
  results.innerHTMLCount = innerHTMLMatches ? innerHTMLMatches.length : 0;

  const querySelectorAllForeachMatches = content.match(PATTERNS.querySelectorAll);
  results.querySelectorAllForeachCount = querySelectorAllForeachMatches ?
    querySelectorAllForeachMatches.length : 0;

  const loopAppendMatches = content.match(PATTERNS.loopAppend);
  results.loopAppendCount = loopAppendMatches ? loopAppendMatches.length : 0;

  // 分析具体问题
  // 1. 循环中多次 appendChild (高优先级)
  if (results.loopAppendCount > 0) {
    results.issues.push({
      type: 'HIGH',
      description: `发现 ${results.loopAppendCount} 处循环中直接 appendChild,会导致多次 Reflow`,
      recommendation: '使用 DocumentFragment 批量插入'
    });
  }

  // 2. 没有使用 DocumentFragment 的批量插入
  if (results.appendChildCount >= 3 && results.createElementCount >= 3) {
    results.recommendations.push({
      type: 'MEDIUM',
      description: '存在多次 DOM 操作,考虑使用 DocumentFragment 优化',
      code: '```javascript\n// 优化前\nfor (var i = 0; i < items.length; i++) {\n  var el = document.createElement("div");\n  container.appendChild(el);\n}\n\n// 优化后\nvar fragment = document.createDocumentFragment();\nfor (var i = 0; i < items.length; i++) {\n  var el = document.createElement("div");\n  fragment.appendChild(el);\n}\ncontainer.appendChild(fragment);\n```'
    });
  }

  // 3. innerHTML 字符串拼接 (中等优先级)
  if (results.innerHTMLCount > 0) {
    results.recommendations.push({
      type: 'INFO',
      description: '使用 innerHTML 可能存在 XSS 风险,考虑使用 createElement + DocumentFragment',
      note: '如果 HTML 内容受信任,innerHTML 性能可以接受'
    });
  }

  return results;
}

/**
 * 生成 Markdown 报告
 */
function generateReport(allResults) {
  let report = `# DocumentFragment 优化分析报告

**生成时间**: ${new Date().toISOString()}
**分析文件数**: ${allResults.length}

---

## 执行摘要

| 指标 | 数量 |
|------|------|
| 总 createElement 调用 | ${allResults.reduce((sum, r) => sum + r.createElementCount, 0)} |
| 总 appendChild 调用 | ${allResults.reduce((sum, r) => sum + r.appendChildCount, 0)} |
| 总 insertBefore 调用 | ${allResults.reduce((sum, r) => sum + r.insertBeforeCount, 0)} |
| 总 innerHTML 赋值 | ${allResults.reduce((sum, r) => sum + r.innerHTMLCount, 0)} |
| 循环中 appendChild | ${allResults.reduce((sum, r) => sum + r.loopAppendCount, 0)} |

---

## 详细文件分析

`;

  // 排序:问题数降序
  allResults.sort((a, b) => {
    const scoreA = a.loopAppendCount * 10 + a.appendChildCount + a.insertBeforeCount;
    const scoreB = b.loopAppendCount * 10 + b.appendChildCount + b.insertBeforeCount;
    return scoreB - scoreA;
  });

  allResults.forEach((result, index) => {
    const totalDomOps = result.appendChildCount + result.insertBeforeCount;
    if (totalDomOps === 0) return; // 跳过无 DOM 操作的文件

    report += `### ${index + 1}. ${result.fileName}\n\n`;
    report += `**路径**: \`${result.filePath}\`\n\n`;
    report += '| 操作类型 | 次数 |\n';
    report += '|---------|------|\n';
    report += `| createElement | ${result.createElementCount} |\n`;
    report += `| appendChild | ${result.appendChildCount} |\n`;
    report += `| insertBefore | ${result.insertBeforeCount} |\n`;
    report += `| innerHTML | ${result.innerHTMLCount} |\n`;
    report += `| querySelectorAll.forEach | ${result.querySelectorAllForeachCount} |\n`;

    if (result.loopAppendCount > 0) {
      report += `| **循环中 appendChild** | **${result.loopAppendCount}** 🔴 |\n`;
    }

    report += '\n';

    // 问题描述
    if (result.issues.length > 0) {
      report += '#### 🔴 问题\n\n';
      result.issues.forEach(issue => {
        report += `- **${issue.type}**: ${issue.description}\n`;
        if (issue.recommendation) {
          report += `  - 建议: ${issue.recommendation}\n`;
        }
      });
      report += '\n';
    }

    // 优化建议
    if (result.recommendations.length > 0) {
      report += '#### 💡 优化建议\n\n';
      result.recommendations.forEach(rec => {
        report += `- **${rec.type}**: ${rec.description}\n`;
        if (rec.code) {
          report += `\n${rec.code}\n`;
        }
        if (rec.note) {
          report += `  - 备注: ${rec.note}\n`;
        }
      });
      report += '\n';
    }

    report += '---\n\n';
  });

  // 添加优化指南
  report += `## DocumentFragment 优化最佳实践

### 1. 批量插入元素

\`\`\`javascript
// ❌ 错误:触发多次 Reflow
for (var i = 0; i < 100; i++) {
  var div = document.createElement('div');
  div.textContent = 'Item ' + i;
  container.appendChild(div); // 每次循环都触发 Reflow
}

// ✅ 正确:只触发一次 Reflow
var fragment = document.createDocumentFragment();
for (var i = 0; i < 100; i++) {
  var div = document.createElement('div');
  div.textContent = 'Item ' + i;
  fragment.appendChild(div); // 只在内存中操作,不触发 Reflow
}
container.appendChild(fragment); // 一次性插入,只触发一次 Reflow
\`\`\`

### 2. 与 innerHTML 的比较

| 方法 | 性能 | 安全性 | 适用场景 |
|------|------|--------|----------|
| DocumentFragment + createElement | 快 | 安全(需手动转义) | 复杂结构,需要细粒度控制 |
| innerHTML | 最快(简单情况) | 不安全(XSS风险) | 受信任的HTML,简单结构 |
| DOMParser | 中等 | 安全 | 解析完整HTML字符串 |

### 3. 性能提升估算

- **减少 Reflow 次数**: N 次循环 → 1 次插入
- **性能提升**: 通常 2-5 倍(取决于元素数量和复杂度)
- **适用场景**: 批量插入 > 3 个元素时推荐使用

---

## 下一步行动

### 高优先级 (必须修复)
1. 修复循环中直接 appendChild 的问题
2. 为批量 DOM 操作添加 DocumentFragment

### 中优先级 (建议修复)
1. 重构 innerHTML 字符串拼接为 createElement
2. 统一使用 DocumentFragment 组件挂载模式

### 低优先级 (可选)
1. 为大型列表添加虚拟滚动(避免一次性插入过多元素)

---

**报告生成完毕**
`;

  return report;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始分析 DOM 操作模式...\n');

  const files = glob.sync(JS_FILES);
  console.log(`📁 找到 ${files.length} 个 JavaScript 文件\n`);

  const results = [];
  files.forEach(file => {
    const result = analyzeFile(file);
    if (result.appendChildCount > 0 || result.insertBeforeCount > 0 ||
        result.innerHTMLCount > 0 || result.loopAppendCount > 0) {
      results.push(result);
      console.log(`  ✓ ${result.fileName}: ` +
        `createElement=${result.createElementCount}, ` +
        `appendChild=${result.appendChildCount}, ` +
        `insertBefore=${result.insertBeforeCount}`);
    }
  });

  console.log('\n📊 生成分析报告...\n');
  const report = generateReport(results);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');

  console.log(`✅ 报告已生成: ${OUTPUT_FILE}`);
  console.log('\n📈 统计摘要:');
  console.log(`   - 循环中 appendChild: ${results.reduce((sum, r) => sum + r.loopAppendCount, 0)} 处`);
  console.log(`   - 批量 DOM 操作: ${results.filter(r => r.appendChildCount >= 3).length} 个文件`);
  console.log(`   - innerHTML 使用: ${results.reduce((sum, r) => sum + r.innerHTMLCount, 0)} 次\n`);
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, generateReport };

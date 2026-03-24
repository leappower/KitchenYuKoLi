const { execSync } = require('child_process');
const path = require('path');

/**
 * 检查是否需要执行构建测试
 * @returns {boolean} 如果需要构建返回 true，否则返回 false
 */
function checkBuildRequired() {
  try {
    // 获取修改的文件
    const status = execSync('git status --short', { encoding: 'utf-8' });
    const changedFiles = status.trim().split('\n').filter(line => line);

    // 如果没有修改，不需要构建
    if (changedFiles.length === 0) {
      console.log('✓ 没有修改，不需要构建');
      return false;
    }

    // 分析修改的文件类型
    const fileStats = {
      html: 0,
      css: 0,
      js: 0,
      config: 0,
      assets: 0,
      other: 0
    };

    changedFiles.forEach(line => {
      const filePath = line.substring(3).trim();
      const ext = path.extname(filePath).toLowerCase();

      // 跳过 scripts/ 目录和 .codebuddy/ 目录
      if (filePath.startsWith('scripts/') || filePath.startsWith('.codebuddy/')) {
        fileStats.other++;
        return;
      }

      if (ext.match(/\.(html|htm)$/)) {
        fileStats.html++;
      } else if (ext.match(/\.(css|scss|less)$/)) {
        fileStats.css++;
      } else if (ext.match(/\.js$/)) {
        fileStats.js++;
      } else if (filePath.match(/webpack\.config\.js|vite\.config\.js|tailwind\.config\.js|postcss\.config\.js/i)) {
        fileStats.config++;
      } else if (ext.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/)) {
        fileStats.assets++;
      } else {
        fileStats.other++;
      }
    });

    // 判断是否是大修改
    const isLargeChange = changedFiles.length >= 5;
    const hasHtml = fileStats.html > 0;
    const hasCss = fileStats.css > 0;
    const hasConfig = fileStats.config > 0;

    // 判断规则
    let reason = '';
    let required = false;

    if (hasHtml) {
      required = true;
      reason = `修改了 ${fileStats.html} 个 HTML 文件`;
    } else if (hasConfig) {
      required = true;
      reason = `修改了 ${fileStats.config} 个配置文件`;
    } else if (hasCss) {
      required = true;
      reason = `修改了 ${fileStats.css} 个样式文件`;
    } else if (isLargeChange) {
      required = true;
      reason = `修改了 ${changedFiles.length} 个文件（大修改）`;
    } else {
      required = false;
      reason = `小修改：${changedFiles.length} 个文件（非 HTML/配置/样式）`;
    }

    // 输出检查结果
    console.log('\n=== 构建测试检查 ===');
    console.log('修改文件统计:');
    console.log(`  HTML: ${fileStats.html}`);
    console.log(`  CSS:  ${fileStats.css}`);
    console.log(`  JS:   ${fileStats.js}`);
    console.log(`  配置: ${fileStats.config}`);
    console.log(`  资源: ${fileStats.assets}`);
    console.log(`  其他: ${fileStats.other}`);
    console.log(`\n总文件数: ${changedFiles.length}`);
    console.log(`\n检查结果: ${required ? '❌ 需要构建测试' : '✓ 不需要构建'}`);
    console.log(`原因: ${reason}`);
    console.log('==================\n');

    return required;
  } catch (error) {
    console.error('检查失败:', error.message);
    // 出错时保守处理，建议构建
    console.log('\n⚠ 检查过程出错，建议执行构建测试');
    return true;
  }
}

/**
 * 执行构建测试
 * @returns {boolean} 构建是否成功
 */
function runBuildTest() {
  console.log('开始执行构建测试: npm run build:dev\n');

  try {
    const startTime = Date.now();
    execSync('npm run build:dev', { stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✓ 构建测试通过 (耗时 ${duration}s)`);
    return true;
  } catch (error) {
    console.error('\n❌ 构建测试失败！');
    console.error('\n请修复以下错误后重试:');
    console.error('1. 查看详细错误: npm run build:dev');
    console.error('2. 搜索 ERROR: npm run build:dev 2>&1 | grep -A 5 ERROR');
    console.error('3. 查看构建日志: npm run build:dev 2>&1 | tee /tmp/build-error.log');
    return false;
  }
}

// 如果直接执行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--run')) {
    // 检查并执行构建
    if (checkBuildRequired()) {
      const success = runBuildTest();
      process.exit(success ? 0 : 1);
    } else {
      console.log('跳过构建测试');
      process.exit(0);
    }
  } else {
    // 只检查是否需要构建
    const required = checkBuildRequired();
    process.exit(required ? 1 : 0);
  }
}

module.exports = {
  checkBuildRequired,
  runBuildTest
};

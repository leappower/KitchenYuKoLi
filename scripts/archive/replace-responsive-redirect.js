/**
 * replace-responsive-redirect.js
 *
 * 批量替换页面中的响应式重定向逻辑,从手动设备检测改为使用 DeviceUtils
 *
 * 功能:
 * - 搜索所有包含 screen.width 的 HTML 文件
 * - 替换响应式重定向脚本为使用 DeviceUtils 的版本
 * - 保持原有的 clean-url 和 SPA 导航逻辑
 */

const fs = require('fs');
const path = require('path');

/**
 * 生成新的响应式重定向脚本 (使用 DeviceUtils)
 */
function generateResponsiveRedirectScript() {
  return `<script>
/* Responsive redirect — runs before render, no flash */
(function(){
  // 防止 bfcache 恢复时重复 redirect
  if (window.__redirectChecked) return;
  window.__redirectChecked = true;

  // 处理 clean-url 参数:重定向后清理 URL 为干净的目录 URL
  var urlParams = new URLSearchParams(location.search);
  var cleanUrl = urlParams.get('clean-url');
  if (cleanUrl) {
    console.log('[Responsive Redirect] Cleaning URL to:', cleanUrl);
    history.replaceState({}, '', cleanUrl);
    return;
  }

  // SPA 导航时跳过响应式重定向
  console.log('[Responsive Redirect] Checking SPA flag: window.__spaNavigating =', window.__spaNavigating);
  if (window.__spaNavigating) {
    console.log('[Responsive Redirect] SPA navigation detected, skipping redirect');
    return;
  }

  // 使用 DeviceUtils 统一管理设备判断
  var currentFile = location.pathname.split('/').pop();
  console.log('[Responsive Redirect] Current file:', currentFile, 'Pathname:', location.pathname);

  // 当访问目录 URL(以 / 结尾)时,不要重定向(SPA 导航使用干净的目录 URL)
  if (window.DeviceUtils && window.DeviceUtils.isDirectoryURL()) {
    console.log('[Responsive Redirect] Directory URL detected, skipping redirect');
    return;
  }

  // 使用 DeviceUtils 判断是否需要重定向
  if (window.DeviceUtils && window.DeviceUtils.shouldRedirect(currentFile)) {
    var deviceType = window.DeviceUtils.getDeviceType();
    var targetFile;

    if (deviceType === window.DeviceUtils.DeviceType.MOBILE) {
      targetFile = 'index-mobile.html';
    } else if (deviceType === window.DeviceUtils.DeviceType.TABLET) {
      targetFile = 'index-tablet.html';
    } else {
      targetFile = 'index-pc.html';
    }

    console.log('[Responsive Redirect] Redirecting to:', targetFile);
    location.href = targetFile;
    return;
  }

  console.log('[Responsive Redirect] No redirect needed');
})();
</script>`;
}

/**
 * 生成响应式入口脚本 (使用 DeviceUtils)
 */
function generateResponsiveEntryScript() {
  return `<script>
/* Responsive entry — redirect to device file with clean-url parameter */
(function () {
  // SPA 导航时跳过响应式重定向
  if (window.__spaNavigating) return;

  // 使用 DeviceUtils 统一管理设备判断
  var deviceType = window.DeviceUtils ? window.DeviceUtils.getDeviceType() : 'pc';
  var targetFile;

  if (deviceType === window.DeviceUtils.DeviceType.MOBILE) {
    targetFile = 'index-mobile.html';
  } else if (deviceType === window.DeviceUtils.DeviceType.TABLET) {
    targetFile = 'index-tablet.html';
  } else {
    targetFile = 'index-pc.html';
  }

  console.log('[Responsive Entry] Device type:', deviceType, 'Target file:', targetFile);

  // 重定向到设备特定文件,带 clean-url 参数,让它在加载后清理 URL
  location.href = targetFile + '?clean-url=/home/';
}());
</script>`;
}

/**
 * 替换文件中的响应式脚本 (支持两种类型: redirect 和 entry)
 */
function replaceResponsiveRedirect(filePath) {
  try {
    var content = fs.readFileSync(filePath, 'utf8');

    // 检查是否包含 screen.width (这是旧版本的标识)
    if (!content.includes('screen.width')) {
      console.log('  ⚠️  No responsive script found, skipping');
      return false;
    }

    // 查找包含 Responsive redirect 或 Responsive entry 注释的 <script> 块
    var scriptStart = content.indexOf('<script>');
    var scriptEnd = content.indexOf('</script>', scriptStart);

    if (scriptStart === -1 || scriptEnd === -1) {
      console.log('  ⚠️  No script tags found, skipping');
      return false;
    }

    // 提取整个脚本块
    var scriptBlock = content.substring(scriptStart, scriptEnd + 9); // +9 for </script>

    var newScript;

    // 判断是哪种类型的脚本
    if (scriptBlock.includes('Responsive redirect')) {
      newScript = generateResponsiveRedirectScript();
      console.log('  📝 Replacing responsive redirect script');
    } else if (scriptBlock.includes('Responsive entry')) {
      newScript = generateResponsiveEntryScript();
      console.log('  📝 Replacing responsive entry script');
    } else {
      console.log('  ⚠️  Not a responsive script, skipping');
      return false;
    }

    // 替换脚本
    var newContent = content.substring(0, scriptStart) + newScript + content.substring(scriptEnd + 9);

    // 写回文件
    fs.writeFileSync(filePath, newContent, 'utf8');

    console.log('  ✅ Updated');
    return true;
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

/**
 * 查找所有需要更新的 HTML 文件
 */
function findHtmlFiles(dir) {
  var files = [];

  function scanDirectory(currentDir) {
    var items = fs.readdirSync(currentDir);

    items.forEach(function(item) {
      var itemPath = path.join(currentDir, item);
      var stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item.endsWith('.html')) {
        files.push(itemPath);
      }
    });
  }

  scanDirectory(dir);
  return files;
}

/**
 * 主函数
 */
function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('  Replace Responsive Redirect with DeviceUtils');
  console.log('═════════════════════════════════════════════════════\n');

  var pagesDir = path.join(__dirname, '..', 'src', 'pages');
  var htmlFiles = findHtmlFiles(pagesDir);

  console.log('Found', htmlFiles.length, 'HTML files\n');

  var updatedCount = 0;
  var skippedCount = 0;
  var errorCount = 0;

  htmlFiles.forEach(function(filePath) {
    var relativePath = path.relative(__dirname, filePath);
    console.log('Processing:', relativePath);

    var result = replaceResponsiveRedirect(filePath);
    if (result === true) {
      updatedCount++;
    } else {
      skippedCount++;
    }
  });

  console.log('\n═════════════════════════════════════════════════════');
  console.log('  Summary:');
  console.log('  - Updated:', updatedCount);
  console.log('  - Skipped:', skippedCount);
  console.log('  - Errors:', errorCount);
  console.log('═════════════════════════════════════════════════════\n');
}

// 运行主函数
main();

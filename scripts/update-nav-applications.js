#!/usr/bin/env node
/**
 * 更新导航结构脚本
 * 1. 为 applications 创建 index.html 入口页
 * 2. 修改 navigator.js 的 NAV_ITEMS
 * 3. 添加新的翻译 key
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

// 1. 创建 applications/index.html 入口页
function createApplicationsEntry() {
  const entryHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<link rel="canonical" href="/applications/"/>
<meta name="description" content="Yukoli Smart Kitchen Applications — explore commercial kitchen automation applications, ROI tools, and industry solutions.">
<meta property="og:type" content="website">
<meta property="og:title" content="Applications — Yukoli Smart Kitchen">
<meta property="og:description" content="Yukoli Smart Kitchen Applications — explore commercial kitchen automation applications, ROI tools, and industry solutions.">
<meta property="og:url" content="https://www.kitchen.yukoli.com/applications/">
<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-home.webp">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Applications — Yukoli Smart Kitchen</title>
<script src="/assets/js/utils/device-utils.js"></script>
<script>
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
  location.href = targetFile + '?clean-url=/applications/';
}());
</script>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/public-sans-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimized.css"/>
<!-- Dark mode: apply saved preference before first paint (prevents flash) -->
  <script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body><script defer src="/assets/js/lang-registry.js"></script>
</body>
</html>`;

  const entryPath = path.join(PAGES_DIR, 'applications', 'index.html');
  fs.writeFileSync(entryPath, entryHtml, 'utf8');
  console.log('✅ Created:', entryPath);
}

// 2. 修改 navigator.js 的 NAV_ITEMS
function updateNavigator() {
  const navigatorPath = path.join(SRC_DIR, 'assets', 'js', 'ui', 'navigator.js');
  let content = fs.readFileSync(navigatorPath, 'utf8');

  // 新的 NAV_ITEMS 配置 - 正确顺序: Products -> Applications -> Solutions -> Service
  const newNavItems = `var NAV_ITEMS = [
    { key: 'nav_products',     path: '/catalog/',      id: 'catalog',      hasDropdown: true },
    { key: 'nav_applications', path: '/applications/', id: 'applications', hasDropdown: true },
    { key: 'nav_solutions',    path: '/solutions/',    id: 'solutions',    hasDropdown: true },
    { key: 'nav_service',      path: '/support/',      id: 'support',      hasDropdown: true },
  ];`;

  // 尝试查找并替换
  const navItemsMatch = content.match(/var NAV_ITEMS = \[[\s\S]*?\];/);
  if (navItemsMatch) {
    content = content.replace(navItemsMatch[0], newNavItems);
    fs.writeFileSync(navigatorPath, content, 'utf8');
    console.log('✅ Updated NAV_ITEMS in navigator.js');
    console.log('   New order: Products → Applications → Solutions → Service');
  } else {
    console.log('❌ Failed to find NAV_ITEMS');
  }
}

// 3. 添加新的翻译 key 到 zh-CN 和 en
function addTranslationKeys() {
  const langDir = path.join(SRC_DIR, 'assets', 'lang');
  
  // 需要添加的翻译 key
  const newKeys = {
    'nav_applications': { 'zh-CN': '应用场景', 'en': 'Applications' },
    'nav_service': { 'zh-CN': '服务支持', 'en': 'Service' },
  };

  // 更新 zh-CN
  const zhPath = path.join(langDir, 'zh-CN-ui.json');
  if (fs.existsSync(zhPath)) {
    const zhContent = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    Object.entries(newKeys).forEach(([key, values]) => {
      if (!zhContent[key]) {
        zhContent[key] = values['zh-CN'];
        console.log(`✅ Added ${key} to zh-CN-ui.json`);
      }
    });
    fs.writeFileSync(zhPath, JSON.stringify(zhContent, null, 2), 'utf8');
  }

  // 更新 en
  const enPath = path.join(langDir, 'en-ui.json');
  if (fs.existsSync(enPath)) {
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    Object.entries(newKeys).forEach(([key, values]) => {
      if (!enContent[key]) {
        enContent[key] = values['en'];
        console.log(`✅ Added ${key} to en-ui.json`);
      }
    });
    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf8');
  }
}

// 主函数
function main() {
  console.log('🚀 Starting navigation update...\n');
  
  createApplicationsEntry();
  console.log('');
  
  updateNavigator();
  console.log('');
  
  addTranslationKeys();
  console.log('');
  
  console.log('✅ Navigation update completed!');
}

main();

#!/usr/bin/env node
/**
 * 生成行业解决方案页面脚本
 * 基于模板快速生成6个行业解决方案的三端页面
 */

const fs = require('fs');
const path = require('path');

// 行业解决方案配置
const SOLUTIONS = [
  {
    id: 'hotpot',
    name: '火锅/麻辣烫',
    nameEn: 'Hotpot & Malatang',
    icon: 'local_fire_department',
    description: '火锅麻辣烫智能厨房解决方案 - 智能涮煮设备、自动出菜系统，实现快速出餐、降低人工成本、提升顾客体验。',
    keywords: '火锅,麻辣烫,智能涮煮,自动出菜,商用厨房设备',
    painPoints: [
      { icon: 'timer', title: '出菜速度慢', desc: '高峰期出菜慢，顾客等待时间长，影响翻台率' },
      { icon: 'group', title: '人工成本高', desc: '后厨人员配置多，人工成本高企' },
      { icon: 'thermostat', title: '火候难控制', desc: '不同食材涮煮时间不同，火候难以精准控制' }
    ],
    solutions: [
      { icon: 'soup_kitchen', title: '智能涮煮', desc: '自动升降涮煮设备，精准控制时间和温度' },
      { icon: 'automation', title: '自动出菜', desc: '智能传送系统，自动将菜品送至取餐区' },
      { icon: 'inventory', title: '库存管理', desc: '智能库存监控，自动预警补货' }
    ],
    stats: [
      { value: '50%', label: '人工成本降低' },
      { value: '3x', label: '出菜速度提升' },
      { value: '30%', label: '翻台率提升' },
      { value: '0', label: '火候失误' }
    ],
    products: [
      { name: '智能涮煮机 YK-SZ600', badge: '热销', desc: '6工位自动升降，精准控温控时' },
      { name: '自动出菜系统 YK-AC200', badge: '标配', desc: '智能传送，自动分拣' },
      { name: '智能汤锅 YK-TK400', badge: '推荐', desc: '4口味同时出餐，自动补汤' }
    ],
    caseStudy: {
      client: '某知名火锅连锁品牌',
      locations: '全国300+门店',
      quote: '引入智能涮煮系统后，单店后厨人员从8人减少到4人，出菜速度提升3倍，顾客满意度大幅提升。',
      results: [
        { label: '人工成本', value: '↓ 50%' },
        { label: '出菜速度', value: '↑ 3x' },
        { label: '顾客满意度', value: '↑ 35%' }
      ]
    }
  },
  {
    id: 'cloud-kitchen',
    name: '云厨房/外卖',
    nameEn: 'Cloud Kitchen',
    icon: 'delivery_dining',
    description: '云厨房外卖智能解决方案 - 专为外卖场景设计的高效率出餐系统，小空间大产能，支持多品牌共享厨房。',
    keywords: '云厨房,外卖,共享厨房,幽灵厨房,智能出餐',
    painPoints: [
      { icon: 'space_dashboard', title: '空间利用率低', desc: '传统厨房布局不合理，空间浪费严重' },
      { icon: 'speed', title: '出餐压力大', desc: '外卖高峰期订单集中，出餐压力大' },
      { icon: 'sync_alt', title: '多平台管理难', desc: '多个外卖平台订单难以统一管理' }
    ],
    solutions: [
      { icon: 'view_compact', title: '紧凑型设计', desc: '模块化设备，小空间大产能' },
      { icon: 'bolt', title: '极速出餐', desc: '自动化设备，2分钟快速出餐' },
      { icon: 'hub', title: '订单聚合', desc: '多平台订单统一管理，智能调度' }
    ],
    stats: [
      { value: '3x', label: '空间利用率' },
      { value: '2min', label: '平均出餐' },
      { value: '60%', label: '人工成本降' },
      { value: '24h', label: '全天候运营' }
    ],
    products: [
      { name: '紧凑型炒菜机 YK-SF400', badge: '热销', desc: '占地仅0.5㎡，单次出餐4份' },
      { name: '智能订单系统 YK-OS100', badge: '标配', desc: '多平台聚合，智能分单' },
      { name: '自动打包机 YK-AP50', badge: '推荐', desc: '自动分装打包，提升效率' }
    ],
    caseStudy: {
      client: '某云厨房运营商',
      locations: '北京/上海/深圳 50+站点',
      quote: '使用Yukoli紧凑型设备后，单个云厨房站点可同时运营5个品牌，日订单量突破2000单。',
      results: [
        { label: '品牌数量', value: '5个/站点' },
        { label: '日订单量', value: '2000+' },
        { label: '坪效提升', value: '↑ 300%' }
      ]
    }
  },
  {
    id: 'canteen',
    name: '食堂/中央厨房',
    nameEn: 'Canteen & Central Kitchen',
    icon: 'restaurant',
    description: '食堂中央厨房智能解决方案 - 大容量自动化设备，满足千人级供餐需求，食品安全可追溯。',
    keywords: '食堂,中央厨房,团餐,大型厨房,食品安全',
    painPoints: [
      { icon: 'groups', title: '供餐压力大', desc: '用餐时间集中，短时间内需要完成大量出餐' },
      { icon: 'security', title: '食品安全风险', desc: '人工操作环节多，食品安全难以保障' },
      { icon: 'account_balance_wallet', title: '成本控制难', desc: '食材浪费严重，成本控制困难' }
    ],
    solutions: [
      { icon: 'batch_prediction', title: '大容量生产', desc: '工业级设备，单次出餐百人份' },
      { icon: 'verified_user', title: '食品安全', desc: '全程可追溯，减少人工接触' },
      { icon: 'savings', title: '精准配餐', desc: '智能称重配餐，减少食材浪费' }
    ],
    stats: [
      { value: '1000+', label: '人/小时产能' },
      { value: '40%', label: '食材浪费降' },
      { value: '50%', label: '人工成本降' },
      { value: '100%', label: '食品安全追溯' }
    ],
    products: [
      { name: '大型炒菜机 YK-SF1200', badge: '热销', desc: '1200mm锅径，单次出餐20份' },
      { name: '自动分餐线 YK-AL500', badge: '标配', desc: '智能分餐，精准称重' },
      { name: '中央厨房系统 YK-CK1000', badge: '推荐', desc: '全流程自动化管理' }
    ],
    caseStudy: {
      client: '某大型企业食堂',
      locations: '员工5000+人',
      quote: '中央厨房改造后，供餐能力从3000人提升到8000人，食材浪费减少40%，员工满意度显著提升。',
      results: [
        { label: '供餐能力', value: '8000人' },
        { label: '食材浪费', value: '↓ 40%' },
        { label: '满意度', value: '↑ 45%' }
      ]
    }
  },
  {
    id: 'southeast-asian',
    name: '泰式/东南亚',
    nameEn: 'Thai & Southeast Asian',
    icon: 'public',
    description: '泰式东南亚餐饮智能解决方案 - 针对东南亚菜系的特殊烹饪需求，提供专业的自动化设备。',
    keywords: '泰式,东南亚,泰国菜,越南菜,智能烹饪',
    painPoints: [
      { icon: 'local_fire_department', title: '火候要求高', desc: '东南亚菜对火候要求极高，传统方式难以标准化' },
      { icon: 'blender', title: '调料配比难', desc: '多种香料调料，配比复杂难以统一' },
      { icon: 'person_search', title: '专业人才稀缺', desc: '东南亚菜系厨师稀缺，招聘困难' }
    ],
    solutions: [
      { icon: 'microwave', title: '精准控火', desc: '智能温控系统，还原地道风味' },
      { icon: 'science', title: '自动调味', desc: '智能调料系统，精准配比' },
      { icon: 'menu_book', title: '菜谱编程', desc: '大师菜谱数字化，一键出餐' }
    ],
    stats: [
      { value: '100%', label: '风味还原度' },
      { value: '60%', label: '厨师依赖降' },
      { value: '35%', label: '培训时间缩' },
      { value: '50+', label: '东南亚菜谱' }
    ],
    products: [
      { name: '东南亚专用炒锅 YK-SA800', badge: '热销', desc: '专为东南亚菜设计，高温爆炒' },
      { name: '智能调料机 YK-SM200', badge: '标配', desc: '12种调料自动配比' },
      { name: '椰浆熬煮机 YK-CS300', badge: '推荐', desc: '精准控温，椰浆不分离' }
    ],
    caseStudy: {
      client: '某泰式连锁餐厅',
      locations: '东南亚地区100+门店',
      quote: '使用Yukoli东南亚专用设备后，我们的冬阴功汤口味一致性达到99%，不再需要依赖泰国本土厨师。',
      results: [
        { label: '口味一致性', value: '99%' },
        { label: '厨师依赖', value: '↓ 60%' },
        { label: '开店速度', value: '↑ 2x' }
      ]
    }
  },
  {
    id: 'automation',
    name: '降本增效',
    nameEn: 'Automation Solutions',
    icon: 'trending_up',
    description: '降本增效通用解决方案 - 适用于各类餐饮场景的自动化改造方案，快速实现投资回报。',
    keywords: '降本增效,自动化,餐饮改造,ROI,投资回报',
    painPoints: [
      { icon: 'trending_down', title: '利润率下滑', desc: '原材料和人工成本上涨，利润空间被压缩' },
      { icon: 'group_off', title: '招工难留人难', desc: '餐饮行业招工难，员工流动性大' },
      { icon: 'error', title: '运营效率低', desc: '传统运营模式效率低下，难以规模化' }
    ],
    solutions: [
      { icon: 'savings', title: '成本优化', desc: '自动化设备替代人工，降低运营成本' },
      { icon: 'speed', title: '效率提升', desc: '智能化流程，提升整体运营效率' },
      { icon: 'account_balance', title: '投资回报', desc: '平均12-18个月收回投资成本' }
    ],
    stats: [
      { value: '30%', label: '平均成本降' },
      { value: '18mo', label: '投资回报期' },
      { value: '40%', label: '效率提升' },
      { value: '200%', label: '3年ROI' }
    ],
    products: [
      { name: '智能炒菜机系列', badge: '热销', desc: '多规格可选，满足不同产能需求' },
      { name: '自动化切配线', badge: '标配', desc: '全流程自动化切配' },
      { name: '智能厨房管理系统', badge: '推荐', desc: '数据驱动决策，持续优化' }
    ],
    caseStudy: {
      client: '某连锁餐饮集团',
      locations: '全国1000+门店',
      quote: '集团层面推进智能厨房改造，平均单店投资回报期14个月，3年ROI达到220%。',
      results: [
        { label: '投资回报期', value: '14个月' },
        { label: '3年ROI', value: '220%' },
        { label: '成本降低', value: '32%' }
      ]
    }
  }
];

// 生成PC页面
function generatePCPage(solution) {
  const painPointsHtml = solution.painPoints.map((p, i) => `
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
        <div class="w-14 h-14 rounded-xl bg-${['red','orange','blue'][i]}-100 dark:bg-${['red','orange','blue'][i]}-900/30 flex items-center justify-center mb-6">
          <span class="material-symbols-outlined text-3xl text-${['red','orange','blue'][i]}-600">${p.icon}</span>
        </div>
        <h3 class="text-xl font-bold mb-3">${p.title}</h3>
        <p class="text-slate-600 dark:text-slate-400">${p.desc}</p>
      </div>`).join('');

  const solutionsHtml = solution.solutions.map(s => `
          <div class="flex gap-4">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-primary">${s.icon}</span>
            </div>
            <div>
              <h4 class="font-bold text-lg">${s.title}</h4>
              <p class="text-slate-600 dark:text-slate-400">${s.desc}</p>
            </div>
          </div>`).join('');

  const statsHtml = solution.stats.map((s) => `
            <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <div class="text-4xl font-black text-primary mb-2">${s.value}</div>
              <p class="text-slate-600 dark:text-slate-400">${s.label}</p>
            </div>`).join('');

  const productsHtml = solution.products.map(p => `
      <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group">
        <div class="h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <img loading="lazy" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" src="/assets/images/products/${solution.id}-${p.badge}.webp" onerror="this.style.display='none'">
        </div>
        <div class="p-6">
          <h3 class="text-xl font-bold mb-2">${p.name}</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">${p.desc}</p>
          <div class="flex items-center justify-between">
            <span class="text-primary font-bold">${p.badge}</span>
            <a href="/catalog/" class="text-sm font-semibold flex items-center gap-1 hover:text-primary transition-colors">
              了解详情 <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>`).join('');

  const caseResultsHtml = solution.caseStudy.results.map(r => `
            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium">${r.label}</span>
                <span class="text-sm text-green-600 font-bold">${r.value}</span>
              </div>
              <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-green-500 rounded-full" style="width: ${Math.random() * 30 + 70}%"></div>
              </div>
            </div>`).join('');

  return `<!DOCTYPE html>
<html class="light" lang="zh-CN"><head>
<link rel="canonical" href="/solutions/${solution.id}/"/>
<link rel="alternate" media="only screen and (max-width: 767px)" href="/solutions/${solution.id}/index-mobile.html"/>
<link rel="alternate" media="only screen and (min-width: 768px) and (max-width: 1279px)" href="/solutions/${solution.id}/index-tablet.html"/>
<link rel="alternate" media="only screen and (min-width: 1280px)" href="/solutions/${solution.id}/index-pc.html"/>
<script>
(function(){
  if (window.__redirectChecked) return;
  window.__redirectChecked = true;
  var urlParams = new URLSearchParams(location.search);
  var cleanUrl = urlParams.get('clean-url');
  if (cleanUrl) { history.replaceState({}, '', cleanUrl); return; }
  if (window.__spaNavigating) return;
  var currentFile = location.pathname.split('/').pop();
  if (window.DeviceUtils && window.DeviceUtils.isDirectoryURL()) return;
  if (window.DeviceUtils && window.DeviceUtils.shouldRedirect(currentFile)) {
    var deviceType = window.DeviceUtils.getDeviceType();
    var targetFile = deviceType === window.DeviceUtils.DeviceType.MOBILE ? 'index-mobile.html' :
                     deviceType === window.DeviceUtils.DeviceType.TABLET ? 'index-tablet.html' : 'index-pc.html';
    location.href = targetFile;
  }
})();
</script>
<meta charset="utf-8"/>
<meta name="description" content="${solution.description}">
<meta name="keywords" content="${solution.keywords}">
<meta property="og:title" content="Yukoli | ${solution.name}智能厨房解决方案">
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Yukoli | ${solution.name}智能厨房解决方案</title>
<link rel="preload" href="/assets/fonts/local-fonts.css" as="style">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="preload" href="/assets/css/tailwind.css" as="style">
<link href="/assets/fonts/local-fonts.css" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/css/styles.css">
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/z-index-system.css">
<link rel="stylesheet" href="/assets/css/performance-optimized.css"/>
<script>(function(){if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark')})()</script>
<link rel="stylesheet" href="/assets/css/skeleton.css"/>
<link rel="icon" href="/assets/images/logo_header.webp" type="image/webp">
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300 overflow-x-hidden">
<navigator data-component="navigator" data-variant="pc" data-active="solutions" data-cta-text-key="nav_get_quote" data-cta-href="/quote"></navigator>
<main id="spa-content">
<section class="relative py-20 overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-100/30 dark:from-primary/10 dark:to-orange-900/20"></div>
  <div class="relative max-w-7xl mx-auto px-6 lg:px-8">
    <div class="flex flex-col lg:flex-row items-center gap-12">
      <div class="w-full lg:w-1/2 flex flex-col gap-6">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider w-fit">
          <span class="material-symbols-outlined">${solution.icon}</span>
          ${solution.name}解决方案
        </div>
        <h1 class="text-5xl lg:text-6xl font-black leading-tight tracking-tighter">
          智能厨房<br/><span class="text-primary">赋能${solution.name}</span>
        </h1>
        <p class="text-xl text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          ${solution.description.split(' - ')[1]}
        </p>
        <div class="flex items-center gap-4 pt-4">
          <a href="/quote/" class="bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
            获取专属方案 <span class="material-symbols-outlined">arrow_forward</span>
          </a>
          <a href="/roi/" class="px-8 py-4 rounded-xl font-bold flex items-center gap-2 border-2 border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary transition-all">
            <span class="material-symbols-outlined">calculate</span> ROI计算
          </a>
        </div>
      </div>
      <div class="w-full lg:w-1/2 relative">
        <div class="absolute -inset-4 bg-primary/20 rounded-3xl blur-3xl"></div>
        <div class="relative rounded-2xl overflow-hidden shadow-2xl">
          <img loading="eager" alt="${solution.name}智能厨房" class="w-full h-[500px] object-cover" src="/assets/images/solutions/${solution.id}-hero.webp" onerror="this.src='https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=800&fit=crop'">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <div class="absolute bottom-0 left-0 right-0 p-8">
            <div class="flex items-center gap-4 text-white">
              <div class="flex -space-x-3">
                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-bold">Y</div>
              </div>
              <div>
                <p class="text-sm font-semibold">Yukoli智能厨房</p>
                <p class="text-xs opacity-80">专业${solution.name}解决方案</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-20 bg-slate-50 dark:bg-slate-900/50">
  <div class="max-w-7xl mx-auto px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-4">行业痛点，我们深知</h2>
      <p class="text-lg text-slate-600 dark:text-slate-400">${solution.name}面临的核心挑战</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">${painPointsHtml}</div>
  </div>
</section>
<section class="py-20">
  <div class="max-w-7xl mx-auto px-6 lg:px-8">
    <div class="flex flex-col lg:flex-row gap-16 items-center">
      <div class="w-full lg:w-1/2">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-6">
          <span class="material-symbols-outlined">lightbulb</span> 解决方案
        </div>
        <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-6">智能厨房全流程自动化</h2>
        <p class="text-lg text-slate-600 dark:text-slate-400 mb-8">专为${solution.name}场景优化的智能厨房解决方案。</p>
        <div class="space-y-6">${solutionsHtml}</div>
      </div>
      <div class="w-full lg:w-1/2">
        <div class="grid grid-cols-2 gap-4">${statsHtml}</div>
      </div>
    </div>
  </div>
</section>
<section class="py-20 bg-slate-50 dark:bg-slate-900/50">
  <div class="max-w-7xl mx-auto px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-4">推荐设备组合</h2>
      <p class="text-lg text-slate-600 dark:text-slate-400">为${solution.name}量身定制的智能设备方案</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">${productsHtml}</div>
  </div>
</section>
<section class="py-20">
  <div class="max-w-7xl mx-auto px-6 lg:px-8">
    <div class="flex flex-col lg:flex-row gap-12 items-center">
      <div class="w-full lg:w-1/2">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold uppercase tracking-wider mb-6">
          <span class="material-symbols-outlined">check_circle</span> 成功案例
        </div>
        <h2 class="text-3xl lg:text-4xl font-black tracking-tight mb-6">${solution.caseStudy.client}</h2>
        <div class="space-y-4 mb-8">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">location_on</span>
            <span>${solution.caseStudy.locations}</span>
          </div>
        </div>
        <blockquote class="text-lg italic text-slate-600 dark:text-slate-400 border-l-4 border-primary pl-6 mb-8">
          "${solution.caseStudy.quote}"
        </blockquote>
        <a href="/cases/" class="inline-flex items-center gap-2 text-primary font-bold hover:underline">
          查看更多案例 <span class="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>
      <div class="w-full lg:w-1/2">
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
          <h3 class="text-xl font-bold mb-6">实施效果对比</h3>
          <div class="space-y-6">${caseResultsHtml}</div>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="py-20 bg-primary">
  <div class="max-w-4xl mx-auto px-6 lg:px-8 text-center">
    <h2 class="text-3xl lg:text-4xl font-black text-white mb-6">开启您的智能厨房之旅</h2>
    <p class="text-xl text-white/80 mb-8">获取专属解决方案，让科技赋能您的餐饮事业</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="/quote/" class="bg-white text-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all">
        免费咨询 <span class="material-symbols-outlined">arrow_forward</span>
      </a>
      <a href="/contact/" class="px-8 py-4 rounded-xl font-bold flex items-center gap-2 border-2 border-white text-white hover:bg-white/10 transition-all">
        <span class="material-symbols-outlined">phone</span> 联系销售
      </a>
    </div>
  </div>
</section>
</main>
<footer data-component="footer" data-variant="pc" data-cta="true"></footer>
<script src="/assets/js/env.js"></script>
<script src="/assets/js/translations.js"></script>
<script src="/assets/js/ui/language-dropdown.js"></script>
<script src="/assets/js/ui/mobile-menu.js"></script>
<script src="/assets/js/ui/products-dropdown.js"></script>
<script src="/assets/js/ui/solutions-dropdown.js"></script>
<script src="/assets/js/ui/support-dropdown.js"></script>
<script src="/assets/js/ui/about-dropdown.js"></script>
<script src="/assets/js/ui/contact-dropdown.js"></script>
<script src="/assets/js/ui/navigator.js"></script>
<script src="/assets/js/ui/footer.js"></script>
<script src="/assets/js/main.js"></script>
</body></html>`;
}

// 主函数
function main() {
  console.log('开始生成行业解决方案页面...\n');
  
  SOLUTIONS.forEach(solution => {
    const dir = path.join(__dirname, '../src/pages/solutions', solution.id);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 生成PC页面
    const pcContent = generatePCPage(solution);
    fs.writeFileSync(path.join(dir, 'index-pc.html'), pcContent);
    console.log(`✓ 生成: solutions/${solution.id}/index-pc.html`);
    
    // 生成Tablet页面（简化版PC）
    const tabletContent = pcContent
      .replace('data-variant="pc"', 'data-variant="tablet"')
      .replace('max-w-7xl', 'max-w-4xl')
      .replace(/text-5xl lg:text-6xl/g, 'text-4xl')
      .replace(/text-3xl lg:text-4xl/g, 'text-2xl')
      .replace(/py-20/g, 'py-12')
      .replace(/px-6 lg:px-8/g, 'px-6');
    fs.writeFileSync(path.join(dir, 'index-tablet.html'), tabletContent);
    console.log(`✓ 生成: solutions/${solution.id}/index-tablet.html`);
    
    // 生成Mobile页面（进一步简化）
    const mobileContent = tabletContent
      .replace('data-variant="tablet"', 'data-variant="mobile"')
      .replace(/grid md:grid-cols-3/g, 'space-y-4')
      .replace(/grid grid-cols-2/g, 'grid grid-cols-2')
      .replace(/text-4xl/g, 'text-3xl')
      .replace(/text-2xl/g, 'text-xl')
      .replace(/py-12/g, 'py-8')
      .replace(/px-6/g, 'px-4');
    fs.writeFileSync(path.join(dir, 'index-mobile.html'), mobileContent);
    console.log(`✓ 生成: solutions/${solution.id}/index-mobile.html`);
    
    console.log('');
  });
  
  console.log('所有页面生成完成！');
  console.log('\n下一步：');
  console.log('1. 更新 scripts/build-ssg.js 添加新路由');
  console.log('2. 更新 mobile-menu.js 和 solutions-dropdown.js 中的链接');
  console.log('3. 运行 npm run build:pack 构建测试');
}

main();

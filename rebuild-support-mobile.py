#!/usr/bin/env python3
"""
Rebuild support/index-mobile.html from compressed HEAD content.
Uses the compressed file's structure and a known-good template (spare-parts mobile)
to produce a readable, properly structured HTML file.
"""
import re

with open('src/pages/support/index-mobile.html', 'r') as f:
    content = f.read()  # Currently 69d1160 (437 lines, readable but outdated)

# We need the CURRENT content (from HEAD, compressed)
import subprocess
head_content = subprocess.check_output(
    ['git', 'show', '7634a98:src/pages/support/index-mobile.html'],
    cwd='/Users/chee/Projects/KitchenYuKoLi'
).decode('utf-8')

# Extract key content pieces from HEAD version
# 1. Trust signals (grid)
trust_match = re.search(
    r'<div class="grid grid-cols-3 gap-2 px-3 py-4 bg-slate-900">(.*?)</div>\s*</div>',
    head_content, re.DOTALL
)

# 2. Service network map
map_match = re.search(
    r'<div id="support-contact-channels".*?</div>(.*?)</div>\s*</div>',
    head_content, re.DOTALL
)

# 3. Service system
service_match = re.search(
    r'data-i18n="support_service_system_title">(.*?)</div>\s*</div>\s*</div>',
    head_content, re.DOTALL
)

# 4. FAQ
faq_match = re.search(
    r'data-i18n="support_faq_title">(.*?)</details></div></div>',
    head_content, re.DOTALL
)

# 5. CTA section
cta_match = re.search(
    r'<section class="py-12 bg-primary fullwidth-bg">(.*?)</section>',
    head_content, re.DOTALL
)

# Now build the file based on spare-parts mobile template structure
# Read the template
with open('src/pages/support/spare-parts/index-mobile.html', 'r') as f:
    template = f.read()

# Extract head section pattern from template
head_pattern = re.search(r'(<head>.*?</head>)', template, re.DOTALL)
scripts_pattern = re.search(r'(<!-- Scripts -->.*?</html>)', template, re.DOTALL)

# Build new file
new_html = '''<!doctype html>
<html class="light" lang="zh-CN">
  <head>
    <!-- ═══ Responsive Redirect ═══ -->
    <link rel="canonical" href="/support/" />
    <link rel="alternate" media="only screen and (max-width: 767px)" href="/support/index-mobile.html" />
    <link rel="alternate" media="only screen and (min-width: 768px) and (max-width: 1279px)" href="/support/index-tablet.html" />
    <link rel="alternate" media="only screen and (min-width: 1280px)" href="/support/index-pc.html" />
    <script>
      (function () {
        if (window.__redirectChecked) return;
        window.__redirectChecked = true;
        var urlParams = new URLSearchParams(location.search);
        var cleanUrl = urlParams.get("clean-url");
        if (cleanUrl) { history.replaceState({}, "", cleanUrl); return; }
        if (window.__spaNavigating) return;
        var currentFile = location.pathname.split("/").pop();
        if (window.DeviceUtils && window.DeviceUtils.isDirectoryURL()) return;
        if (window.DeviceUtils && window.DeviceUtils.shouldRedirect(currentFile)) {
          var deviceType = window.DeviceUtils.getDeviceType();
          var targetFile =
            deviceType === window.DeviceUtils.DeviceType.MOBILE ? "index-mobile.html"
            : deviceType === window.DeviceUtils.DeviceType.TABLET ? "index-tablet.html"
            : "index-pc.html";
          location.href = targetFile;
          return;
        }
      })();
    </script>
    <!-- ═══ End Responsive Redirect ═══ -->

    <meta charset="utf-8" />
    <meta name="description" content="YuKoLi 智能厨具售后服务与技术支持：安装指导、操作培训、故障排查、原厂配件供应。覆盖东南亚 10 国，48 小时上门响应。" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="YuKoLi 智能厨具 | 售后服务与技术支持" />
    <meta property="og:description" content="YuKoLi 智能厨具售后服务与技术支持：安装指导、操作培训、故障排查、原厂配件供应。覆盖东南亚 10 国，48 小时上门响应。" />
    <meta property="og:url" content="https://www.kitchen.yukoli.com/support/" />
    <meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/logo_header.webp" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>YuKoLi 智能厨具 | 售后服务与技术支持</title>

    <link rel="preload" href="/assets/fonts/local-fonts.css" as="style" />
    <link rel="preload" href="/assets/css/styles.css" as="style" />
    <link rel="preload" href="/assets/css/tailwind.css" as="style" />
    <link href="/assets/fonts/local-fonts.css" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/css/styles.css" />
    <link rel="stylesheet" href="/assets/css/tailwind.css" />
    <link rel="stylesheet" href="/assets/css/z-index-system.css" />
    <link rel="stylesheet" href="/assets/css/performance-optimizations.css" />
    <script>
      (function () {
        if (localStorage.getItem("darkMode") === "true") document.documentElement.classList.add("dark");
      })();
    </script>
    <link rel="stylesheet" href="/assets/css/skeleton.css" />
    <link rel="icon" href="/assets/images/logo_header.webp" type="image/webp" />
  </head>

  <body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-clip">
    <navigator data-component="navigator" data-variant="mobile" data-active="support"></navigator>

    <main id="spa-content">
      <div class="relative flex min-h-screen flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark pb-24">

        <!-- ═══ Trust Signals ═══ -->
        <div class="section-content">
          <div class="grid grid-cols-3 gap-2 py-4 bg-slate-900 rounded-xl">
            <div class="text-center py-1 px-2">
              <p class="text-slate-400 text-[10px] font-medium" data-i18n="support_trust_uptime_label">设备正常运行率</p>
              <p class="text-white text-lg font-bold">99.8<span class="text-primary text-sm">%</span></p>
            </div>
            <div class="text-center py-1 px-2 border-l border-r border-slate-700">
              <p class="text-slate-400 text-[10px] font-medium" data-i18n="support_trust_hubs_label">服务网点覆盖</p>
              <p class="text-white text-lg font-bold">14<span class="text-primary text-sm"> 国</span></p>
            </div>
            <div class="text-center py-1 px-2">
              <p class="text-slate-400 text-[10px] font-medium" data-i18n="support_trust_parts_label">原厂配件</p>
              <p class="text-white text-lg font-bold">48<span class="text-primary text-sm">h</span></p>
            </div>
          </div>
        </div>

        <!-- ═══ Service Network Map ═══ -->
        <div class="section-content py-6">
          <h3 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight mb-4" data-i18n="support_service_network">服务网络覆盖</h3>
          <div class="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 aspect-square" data-location="Southeast Asia">
            <div class="absolute inset-0 bg-cover bg-center opacity-80" data-alt="Abstract map of Southeast Asia with glowing node points" style="background-image: url('/assets/images/world-map.svg')">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              <div class="absolute top-1/3 left-1/4 animate-pulse">
                <div class="bg-primary text-white p-1 rounded-full border-2 border-white shadow-lg">
                  <span class="material-symbols-outlined text-sm block">location_on</span>
                </div>
              </div>
              <div class="absolute top-1/2 right-1/3">
                <div class="bg-primary text-white p-1 rounded-full border-2 border-white shadow-lg">
                  <span class="material-symbols-outlined text-sm block">location_on</span>
                </div>
              </div>
              <div class="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                <p class="text-white text-xs font-bold" data-i18n="support_currently_active">Currently Active:</p>
                <p class="text-white text-lg font-bold" data-i18n="support_14_service_hubs_in_se_asia">14 Service Hubs in SE Asia</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ Contact Channels (dynamic) ═══ -->
        <div id="support-contact-channels" data-page="support"></div>

        <!-- ═══ Service System ═══ -->
        <div class="section-content py-6">
          <h3 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight mb-4" data-i18n="support_service_system_title">专业售后服务体系</h3>
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5"><span class="material-symbols-outlined text-xl">cloud_sync</span></div>
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-slate-100" data-i18n="support_service_install_title">智能设备，操作简单</p>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="support_service_install_desc">设备结构简洁，安装调试步骤清晰。附详细安装手册和视频教程，远程技术团队全程指导。</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5"><span class="material-symbols-outlined text-xl">biotech</span></div>
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-slate-100" data-i18n="support_service_training_title">在线指导，快速上手</p>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="support_service_training_desc">提供完整操作手册和视频教程。全天候在线技术支持，遇到问题随时远程指导。</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5"><span class="material-symbols-outlined text-xl">hub</span></div>
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-slate-100" data-i18n="support_service_troubleshoot_title">在线排障，极速响应</p>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="support_service_troubleshoot_desc">远程诊断定位问题。80% 常见故障通过在线指导即可解决。严重故障 48 小时内工程师上门检修。</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5"><span class="material-symbols-outlined text-xl">inventory_2</span></div>
              <div>
                <p class="font-bold text-sm text-slate-900 dark:text-slate-100" data-i18n="support_service_parts_title">配件供应</p>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1" data-i18n="support_service_parts_desc">100% 原厂配件，常规 48 小时发货，东南亚本地仓现货供应。</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ FAQ ═══ -->
        <div class="section-content py-6">
          <h3 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight mb-4" data-i18n="support_faq_title">常见问题</h3>
          <div class="flex flex-col gap-2">
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q1">设备出现故障如何报修？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a1">您可以通过 WhatsApp 一键联系我们的区域工程师，或拨打服务热线。我们支持远程视频诊断，大多数问题可在 2 小时内远程解决。如需上门，48 小时内到达。</div>
            </details>
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q2">保修期是多长时间？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a2">整机自验收合格日起提供 1 年质保；核心配件（IGBT模块、电磁线圈、锅体）质保 3 年，电机 18 个月，控制板 1 年。质保期内因质量问题产生的维修费用由我方承担。</div>
            </details>
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q3">是否支持海外服务？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a3">我们在泰国、越南、马来西亚、印度尼西亚、菲律宾等东南亚 10 国设有服务站点，提供本地化售后支持。其他地区可通过远程服务覆盖。</div>
            </details>
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q4">备件供应需要多久？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a4">常规备件东南亚区域仓库 48 小时安排发货（部分配件需调拨库存），非常规备件可实现快运快速交付。我们建议可查看说明书提前储备常用易损件。</div>
            </details>
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q5">维修工程师是什么资质？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a5">所有服务工程师均经过 YuKoLi 总部培训认证，熟悉设备结构和常见故障处理。东南亚本地团队常驻，确保快速响应。</div>
            </details>
            <details class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group">
              <summary class="flex items-center justify-between p-4 text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer select-none">
                <span data-i18n="support_faq_q6">维修费用怎么算？</span>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <div class="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed" data-i18n="support_faq_a6">保修期内维修零费用（含人工+配件）。保修期外，工程师检测后提供详细报价单，你确认后才动手维修。没有任何隐形收费。</div>
            </details>
          </div>
        </div>

        <!-- ═══ CTA ═══ -->
        <section class="py-12 bg-primary fullwidth-bg">
          <div class="section-content">
            <div class="py-12 text-center">
              <h2 class="text-2xl font-black text-white mb-4" data-i18n="support_cta_title">需要专业的厨具售后服务？</h2>
              <p class="text-base text-white/80 mb-6" data-i18n="support_cta_desc">联系我们获取专属售后解决方案</p>
              <div class="flex flex-col items-center gap-3">
                <a href="/quote/" class="bg-white text-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 w-full justify-center">
                  <span data-i18n="support_cta_btn1">免费咨询</span>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </a>
                <a href="https://wa.me/8613163756465" data-wa-message-key="wa_msg_support" target="_blank" rel="noopener noreferrer" class="bg-white/10 text-white border border-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-bold flex items-center gap-2 w-full justify-center hover:bg-white/20 transition-colors">WhatsApp</a>
                <a href="/contact/" class="px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 border-white text-white w-full justify-center">
                  <span class="material-symbols-outlined">phone</span>
                  <span data-i18n="support_cta_btn2">联系销售</span>
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>

    <footer data-component="footer" data-variant="mobile" data-active="support"></footer>

    <!-- Scripts -->
    <script src="/assets/js/ui/dropdown-styles.js"></script>
    <script defer src="/assets/js/ui/products-dropdown.js?v=20260322-v3"></script>
    <script defer src="/assets/js/ui/applications-dropdown.js?v=20260322-v3"></script>
    <script defer src="/assets/js/ui/support-dropdown.js?v=20260322-v3"></script>
    <script defer src="/assets/js/ui/about-dropdown.js?v=20260322-v3"></script>
    <script defer src="/assets/js/nav-config.js?v=20260415"></script>
    <script defer src="/assets/js/ui/mobile-bottom-bar.js"></script>
    <script defer src="/assets/js/ui/navigator.js?v=20260322-v3"></script>
    <script defer src="/assets/js/ui/search-engine.js"></script>
    <script defer src="/assets/js/ui/footer.js?v=20260322-v3"></script>
    <script defer src="/assets/js/lang-registry.js?v=20260429"></script>
    <script defer src="/assets/js/translations.js?v=20260429"></script>
    <script defer src="/assets/js/translations-dropdown-template.js?v=20260429"></script>
    <script defer src="/assets/js/contacts.js"></script>
    <script defer src="/assets/js/ui/smart-popup.js"></script>
    <script defer src="/assets/js/router.js"></script>
    <script defer src="/assets/js/ui/helpers.js"></script>
    <script defer src="/assets/js/ui/page-effects.js"></script>
    <script defer src="/assets/js/page-interactions.js"></script>
    <script>
      document.addEventListener("DOMContentLoaded", function () {
        if (window.translationManager) window.translationManager.initialize();
      });
    </script>
    <script src="/assets/js/utils/device-utils.js"></script>
    <script src="/assets/js/spa-router.js"></script>
    <script>
      document.addEventListener("DOMContentLoaded", function () {
        if (window.SpaRouter && typeof window.SpaRouter.init === "function") window.SpaRouter.init();
      });
    </script>
    <script defer src="/assets/js/support-wechat-modal.js"></script>
    <script defer src="/assets/js/ui/floating-actions.js"></script>
  </body>
</html>
'''

with open('src/pages/support/index-mobile.html', 'w') as f:
    f.write(new_html)

print(f"Written: {len(new_html.splitlines())} lines")

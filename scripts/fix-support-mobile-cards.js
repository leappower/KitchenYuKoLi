var fs = require('fs');
var c = fs.readFileSync('src/pages/support/index-mobile.html', 'utf-8');

// Find the Support Card Grid section
var start = c.indexOf('<!-- Support Card Grid (mobile: horizontal icon+text cards) -->');
var sectionStart = c.lastIndexOf('<section', start);
var sectionEnd = c.indexOf('</section>', sectionStart) + 11;

var newSection = `      <!-- Support Card Grid (mobile: horizontal image cards) -->
      <section class="fullwidth-bg py-4">
        <div class="section-content">
          <div class="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x snap-mandatory">

            <a href="/support/services/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/hero-engineer.webp" alt="售后服务中心" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_services_title">After-Sales Service Center</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_services_desc">Covering 10 Southeast Asian countries with 48-hour on-site response.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

            <a href="/support/installation/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/installation/env1.webp" alt="安装指导" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_installation_title">Installation Guide</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_installation_desc">Standardized installation procedures for quick deployment.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

            <a href="/support/warranty/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/warranty/value1.webp" alt="保修政策" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_warranty_title">Warranty Policy</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_warranty_desc">1-year comprehensive warranty with genuine parts.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

            <a href="/support/spare-parts/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/spare-parts/cat1.webp" alt="配件供应" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_spare_parts_title">Spare Parts Supply</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_spare_parts_desc">48-hour dispatch from regional warehouses.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

            <a href="/support/training/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/training/core1.webp" alt="操作培训" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_training_title">Operation Training</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_training_desc">HQ-certified training — online and on-site.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

            <a href="/support/faq/" class="min-w-[260px] snap-start bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-lg transition-all flex-shrink-0">
              <div class="aspect-[3/2] overflow-hidden">
                <img src="/assets/images/support/faq/feature1.webp" alt="常见问题" class="w-full h-full object-cover" loading="lazy" />
              </div>
              <div class="p-4">
                <h3 class="text-sm font-bold mb-1" data-i18n="support_card_faq_title">FAQ</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3" data-i18n="support_card_faq_desc">Common troubleshooting guides and service processes.</p>
                <span class="inline-flex items-center gap-1 text-primary font-bold text-xs group-hover:gap-1.5 transition-all">
                  <span data-i18n="app_card_cta">View Solution</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </a>

          </div>
        </div>
      </section>`;

c = c.substring(0, sectionStart) + newSection + c.substring(sectionEnd);
fs.writeFileSync('src/pages/support/index-mobile.html', c);
console.log('Support mobile cards replaced with horizontal scroll + images');

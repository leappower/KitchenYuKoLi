#!/usr/bin/env python3
"""Batch fix cross-site linking issues (Fix 3/4/5/6/7)."""
import os, re

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'pages')

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix3_products_view_all():
    """Add 'View All Products' link to /products/ card overview pages."""
    insertions = {
        'products/index-pc.html': """
    <!-- View All Products -->
    <div class="text-center mt-12">
      <a href="/products/all/" class="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">grid_view</span>
        <span data-i18n="products_view_all_btn">查看全部 150+ 款产品</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>""",
        'products/index-mobile.html': """
      <!-- View All Products -->
      <div class="text-center mt-8">
        <a href="/products/all/" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl transition-all">
          <span class="material-symbols-outlined text-lg">grid_view</span>
          <span data-i18n="products_view_all_btn">查看全部产品</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>""",
        'products/index-tablet.html': """
    <!-- View All Products -->
    <div class="text-center mt-10">
      <a href="/products/all/" class="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">grid_view</span>
        <span data-i18n="products_view_all_btn">查看全部 150+ 款产品</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>""",
    }
    for rel, html in insertions.items():
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}: not found")
            continue
        content = read(path)
        if 'products/all/' in content and 'products_view_all_btn' in content:
            print(f"  SKIP {rel}: already has view-all link")
            continue
        # Insert before CTA section
        marker = '<!-- CTA -->\n  <section class="fullwidth-bg py-'
        if marker not in content:
            # Try alternate marker
            marker = '  <!-- CTA -->\n  <section'
        if marker not in content:
            print(f"  WARN {rel}: CTA marker not found")
            continue
        content = content.replace(marker, html + '\n\n' + marker, 1)
        write(path, content)
        print(f"  OK   {rel}: added view-all link")

def fix4_applications_products():
    """Add products link to /applications/ overview pages."""
    insertions = {
        'applications/index-pc.html': """
    <!-- Browse Products -->
    <div class="text-center mt-12">
      <a href="/products/" class="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">kitchen</span>
        <span data-i18n="applications_view_products">浏览产品设备</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>""",
        'applications/index-mobile.html': """
      <!-- Browse Products -->
      <div class="text-center mt-8">
        <a href="/products/" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl transition-all">
          <span class="material-symbols-outlined text-lg">kitchen</span>
          <span data-i18n="applications_view_products">浏览产品设备</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </a>
      </div>""",
        'applications/index-tablet.html': """
    <!-- Browse Products -->
    <div class="text-center mt-10">
      <a href="/products/" class="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">kitchen</span>
        <span data-i18n="applications_view_products">浏览产品设备</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>""",
    }
    for rel, html in insertions.items():
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}: not found")
            continue
        content = read(path)
        if 'applications_view_products' in content:
            print(f"  SKIP {rel}: already has products link")
            continue
        # Find CTA section (contains profit-calculator or quote)
        # Insert before it
        cta_markers = [
            '<section class="fullwidth-bg py-16 bg-gradient',
            '<section class="fullwidth-bg py-12 bg-gradient',
            '<section class="fullwidth-bg w-full py-',
        ]
        inserted = False
        for m in cta_markers:
            if m in content:
                content = content.replace(m, html + '\n\n' + m, 1)
                inserted = True
                break
        if not inserted:
            # Try before closing </main> as last resort
            print(f"  WARN {rel}: CTA marker not found, trying before </main>")
            content = content.replace('</main>', html + '\n  </main>', 1)
            inserted = True
        write(path, content)
        if inserted:
            print(f"  OK   {rel}: added products link")

def fix5_app_pages_equipment():
    """Add recommended equipment to central-kitchen and menu-lab mobile/tablet."""
    ck_html = """
      <!-- Recommended Equipment -->
      <div class="mb-8">
        <h3 class="text-base font-bold mb-4" data-i18n="canteen_equip_title">推荐设备</h3>
        <div class="grid grid-cols-2 gap-3">
          <a href="/products/cutting/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">content_cut</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_cutting">切配系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">千份级备料，规格统一</p>
          </a>
          <a href="/products/stewing/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">soup_kitchen</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_stewing">炖煮系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">批量炖煮，口味稳定</p>
          </a>
          <a href="/products/other/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">more_horiz</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_other">辅助设备</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">传送+包装全流程</p>
          </a>
          <a href="/products/stirfry/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">local_fire_department</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_stirfry">翻炒系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">智能炒菜，批量出餐</p>
          </a>
        </div>
      </div>"""

    ml_html = """
      <!-- Recommended Equipment -->
      <div class="mb-8">
        <h3 class="text-base font-bold mb-4" data-i18n="canteen_equip_title">推荐设备</h3>
        <div class="grid grid-cols-2 gap-3">
          <a href="/products/stirfry/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">local_fire_department</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_stirfry">翻炒系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">复制各国风味菜谱</p>
          </a>
          <a href="/products/steaming/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">cloud</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_steaming">蒸煮系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">蒸制实验精准控温</p>
          </a>
          <a href="/products/stewing/" class="group bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary/40 transition-all">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-primary">soup_kitchen</span>
            </div>
            <h4 class="font-bold text-sm mb-1" data-i18n="nav_products_stewing">炖煮系列</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">慢炖研发味道一致</p>
          </a>
        </div>
      </div>"""

    pages = {
        'applications/central-kitchen/index-mobile.html': ck_html,
        'applications/central-kitchen/index-tablet.html': ck_html,
        'applications/menu-lab/index-mobile.html': ml_html,
        'applications/menu-lab/index-tablet.html': ml_html,
    }
    for rel, html in pages.items():
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}: not found")
            continue
        content = read(path)
        if 'Recommended Equipment' in content or 'nav_products_cutting' in content and 'central-kitchen' in rel:
            print(f"  SKIP {rel}: already has equipment links")
            continue
        # Insert before CTA section (contains products_cta or quote CTA)
        # Find the section before CTA
        markers = [
            '<section class="fullwidth-bg py-',
            '<!-- CTA',
        ]
        inserted = False
        for m in markers:
            # Find last occurrence before CTA
            idx = content.rfind(m)
            if idx > 0:
                # Check if this is a CTA-like section
                snippet = content[idx:idx+200]
                if 'products_cta' in snippet or 'bg-primary' in snippet:
                    content = content[:idx] + html + '\n' + content[idx:]
                    inserted = True
                    break
        if not inserted:
            print(f"  WARN {rel}: insertion point not found")
            continue
        write(path, content)
        print(f"  OK   {rel}: added equipment links")

def fix6_orphan_pages():
    """Add navigation links to profit-calculator, contact, news pages."""
    pc_nav = """
  <!-- Navigation Links -->
  <section class="fullwidth-bg py-12">
    <div class="section-content">
      <div class="flex flex-wrap justify-center gap-4">
        <a href="/products/" class="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:border-primary hover:text-primary transition-all">
          <span class="material-symbols-outlined">kitchen</span>
          <span data-i18n="nav_products">产品中心</span>
        </a>
        <a href="/applications/" class="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:border-primary hover:text-primary transition-all">
          <span class="material-symbols-outlined">monitoring</span>
          <span data-i18n="nav_applications">行业场景</span>
        </a>
        <a href="/quote/" class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">
          <span class="material-symbols-outlined">description</span>
          <span data-i18n="nav_get_quote">获取报价</span>
        </a>
      </div>
    </div>
  </section>"""

    mobile_nav = """
  <!-- Navigation Links -->
  <section class="fullwidth-bg py-8">
    <div class="section-content">
      <div class="flex flex-col gap-3">
        <a href="/products/" class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all">
          <span class="material-symbols-outlined text-lg">kitchen</span>
          <span data-i18n="nav_products">产品中心</span>
        </a>
        <a href="/applications/" class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all">
          <span class="material-symbols-outlined text-lg">monitoring</span>
          <span data-i18n="nav_applications">行业场景</span>
        </a>
        <a href="/quote/" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm">
          <span class="material-symbols-outlined text-lg">description</span>
          <span data-i18n="nav_get_quote">获取报价</span>
        </a>
      </div>
    </div>
  </section>"""

    # profit-calculator
    for variant, html in [('index-pc.html', pc_nav), ('index-mobile.html', mobile_nav), ('index-tablet.html', pc_nav)]:
        rel = f'profit-calculator/{variant}'
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}")
            continue
        content = read(path)
        if 'Navigation Links' in content:
            print(f"  SKIP {rel}: already fixed")
            continue
        # Insert before </main>
        content = content.replace('</main>', html + '\n</main>', 1)
        write(path, content)
        print(f"  OK   {rel}: added nav links")

    # contact
    contact_nav = """
  <!-- Quick Navigation -->
  <div class="flex flex-wrap justify-center gap-4 mt-8">
    <a href="/products/" class="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all">
      <span class="material-symbols-outlined">kitchen</span>
      <span data-i18n="nav_products">产品中心</span>
    </a>
    <a href="/applications/" class="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all">
      <span class="material-symbols-outlined">monitoring</span>
      <span data-i18n="nav_applications">行业场景</span>
    </a>
  </div>"""
    for variant in ['index-pc.html', 'index-mobile.html', 'index-tablet.html']:
        rel = f'contact/{variant}'
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}")
            continue
        content = read(path)
        if 'Quick Navigation' in content:
            print(f"  SKIP {rel}: already fixed")
            continue
        # Insert before </main>
        content = content.replace('</main>', contact_nav + '\n</main>', 1)
        write(path, content)
        print(f"  OK   {rel}: added nav links")

    # news - check which ones need quote link
    for variant in ['index-mobile.html', 'index-tablet.html']:
        rel = f'news/{variant}'
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            print(f"  SKIP {rel}")
            continue
        content = read(path)
        has_quote = bool(re.search(r'href=["\']/quote/?["\']', content))
        if has_quote:
            print(f"  SKIP {rel}: already has quote link")
            continue
        # Add quote CTA at the bottom
        quote_block = """
  <!-- CTA: Get Quote -->
  <div class="text-center py-8">
    <a href="/quote/" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">
      <span class="material-symbols-outlined text-lg">description</span>
      <span data-i18n="nav_get_quote">获取报价</span>
    </a>
  </div>"""
        content = content.replace('</main>', quote_block + '\n</main>', 1)
        write(path, content)
        print(f"  OK   {rel}: added quote CTA")

def fix7_remove_product_grid():
    """Remove unnecessary product-grid.js and product-detail.js from /products/ card pages."""
    for variant in ['index-pc.html', 'index-mobile.html', 'index-tablet.html']:
        rel = f'products/{variant}'
        path = os.path.join(BASE, rel)
        if not os.path.exists(path):
            continue
        content = read(path)
        original = content
        # Remove product-grid.js line
        content = re.sub(r'\s*<script defer src="/assets/js/product-grid\.js[^"]*"></script>\n?', '\n', content)
        # Remove product-detail.js line
        content = re.sub(r'\s*<script defer src="/assets/js/product-detail\.js[^"]*"></script>\n?', '\n', content)
        if content != original:
            write(path, content)
            print(f"  OK   {rel}: removed product-grid.js and product-detail.js")
        else:
            print(f"  SKIP {rel}: no scripts to remove")

if __name__ == '__main__':
    print("=== Fix 3: /products/ card page → view all link ===")
    fix3_products_view_all()
    print()
    print("=== Fix 4: /applications/ overview → products link ===")
    fix4_applications_products()
    print()
    print("=== Fix 5: central-kitchen / menu-lab equipment links ===")
    fix5_app_pages_equipment()
    print()
    print("=== Fix 6: Orphan pages (profit-calc, contact, news) ===")
    fix6_orphan_pages()
    print()
    print("=== Fix 7: Remove unnecessary scripts from /products/ ===")
    fix7_remove_product_grid()
    print()
    print("DONE")

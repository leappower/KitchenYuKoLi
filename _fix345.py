#!/usr/bin/env python3
"""Fix 3/4/5: Add product links to products overview, applications overview, and detail pages."""

import re

BASE = "src/pages"

# ─── Fix 3: /products/ add "View All Products" button ───

fix3_pc = """
    <!-- View All Products -->
    <div class="text-center mt-12">
      <a href="/products/all/" class="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">grid_view</span>
        <span data-i18n="products_view_all_btn">查看全部 150+ 款产品</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>
"""

fix3_mobile = """
    <!-- View All Products -->
    <div class="text-center mt-8">
      <a href="/products/all/" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl transition-all">
        <span class="material-symbols-outlined text-lg">grid_view</span>
        <span data-i18n="products_view_all_btn">查看全部产品</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </a>
    </div>
"""

fix3_tablet = """
    <!-- View All Products -->
    <div class="text-center mt-12">
      <a href="/products/all/" class="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">grid_view</span>
        <span data-i18n="products_view_all_btn">查看全部 150+ 款产品</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>
"""

# ─── Fix 4: /applications/ add "Browse Products" button ───

fix4_pc = """
    <!-- Browse Products -->
    <div class="text-center mt-12">
      <a href="/products/" class="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">kitchen</span>
        <span data-i18n="applications_view_products">浏览产品设备</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>
"""

fix4_mobile = """
    <!-- Browse Products -->
    <div class="text-center mt-8">
      <a href="/products/" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl transition-all">
        <span class="material-symbols-outlined text-lg">kitchen</span>
        <span data-i18n="applications_view_products">浏览产品设备</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </a>
    </div>
"""

fix4_tablet = """
    <!-- Browse Products -->
    <div class="text-center mt-12">
      <a href="/products/" class="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-base hover:shadow-xl hover:shadow-primary/20 transition-all">
        <span class="material-symbols-outlined">kitchen</span>
        <span data-i18n="applications_view_products">浏览产品设备</span>
        <span class="material-symbols-outlined">arrow_forward</span>
      </a>
    </div>
"""

# ─── Fix 5: Recommended Equipment blocks ───

fix5_central_kitchen = """
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
      </div>
"""

fix5_menu_lab = """
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
      </div>
"""


def insert_before_section(filepath, snippet, anchor_text):
    """Insert snippet before the CTA section that contains anchor_text.
    Looks for </section> followed by <!-- CTA --> or section with anchor_text."""
    with open(filepath, "r") as f:
        content = f.read()

    if snippet.strip().split("\n")[0] in content:
        print(f"  SKIP (already has snippet): {filepath}")
        return False

    # Find the pattern: </section> \n \n <!-- CTA --> or section with anchor
    # For fix3/fix4: insert between grid section close and CTA section
    # Pattern: </section>\n\n  <!-- CTA -->  or  </section>\n\n      <!-- CTA -->
    pattern = r'(</section>\s*\n\s*)(<!-- CTA -->)'
    m = re.search(pattern, content)
    if m:
        insert_pos = m.start()
        new_content = content[:insert_pos] + snippet + "\n" + content[insert_pos:]
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"  OK: {filepath} (inserted before CTA section)")
        return True

    # Fallback: find section containing anchor_text
    pattern2 = r'(</section>\s*\n\s*<section[^>]*>.*?' + re.escape(anchor_text) + r')'
    m2 = re.search(pattern2, content, re.DOTALL)
    if m2:
        insert_pos = m2.start()
        new_content = content[:insert_pos] + snippet + "\n" + content[insert_pos:]
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"  OK: {filepath} (inserted before section with '{anchor_text}')")
        return True

    print(f"  FAIL: {filepath} - could not find insertion point")
    return False


def insert_before_cta(filepath, snippet):
    """Insert snippet before <!-- CTA --> section in detail pages."""
    with open(filepath, "r") as f:
        content = f.read()

    if "canteen_equip_title" in content and "推荐设备" in snippet:
        # Check if our specific block already exists (by unique content)
        if "千份级备料" in content or "复制各国风味" in content:
            print(f"  SKIP (already has recommended equipment): {filepath}")
            return False

    pattern = r'(\n\s*)(<!-- CTA -->)'
    m = re.search(pattern, content)
    if m:
        insert_pos = m.start() + 1  # after the newline
        new_content = content[:insert_pos] + snippet + "\n" + content[insert_pos:]
        with open(filepath, "w") as f:
            f.write(new_content)
        print(f"  OK: {filepath}")
        return True

    print(f"  FAIL: {filepath} - could not find CTA section")
    return False


# ─── Execute Fix 3 ───
print("=== Fix 3: /products/ View All button ===")
insert_before_section(
    f"{BASE}/products/index-pc.html",
    fix3_pc,
    "products_cta_title"
)
insert_before_section(
    f"{BASE}/products/index-mobile.html",
    fix3_mobile,
    "products_cta_title"
)
insert_before_section(
    f"{BASE}/products/index-tablet.html",
    fix3_tablet,
    "products_cta_title"
)

# ─── Execute Fix 4 ───
print("\n=== Fix 4: /applications/ Browse Products button ===")
insert_before_section(
    f"{BASE}/applications/index-pc.html",
    fix4_pc,
    "profit-calculator"
)
insert_before_section(
    f"{BASE}/applications/index-mobile.html",
    fix4_mobile,
    "profit-calculator"
)
insert_before_section(
    f"{BASE}/applications/index-tablet.html",
    fix4_tablet,
    "profit-calculator"
)

# ─── Execute Fix 5 ───
print("\n=== Fix 5: Recommended Equipment blocks ===")
insert_before_cta(f"{BASE}/applications/central-kitchen/index-mobile.html", fix5_central_kitchen)
insert_before_cta(f"{BASE}/applications/central-kitchen/index-tablet.html", fix5_central_kitchen)
insert_before_cta(f"{BASE}/applications/menu-lab/index-mobile.html", fix5_menu_lab)
insert_before_cta(f"{BASE}/applications/menu-lab/index-tablet.html", fix5_menu_lab)

print("\nDone!")

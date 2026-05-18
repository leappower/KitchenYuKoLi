#!/usr/bin/env python3
"""Fix all hardcoded Chinese in case-grid.js render functions — precise edits."""

import json

LANG_DIR = "src/assets/lang"
FILE = "src/assets/js/case-grid.js"

with open(FILE, "r", encoding="utf-8") as f:
    c = f.read()

with open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8") as f:
    en = json.load(f)
with open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8") as f:
    zh = json.load(f)

added = 0

def add(key, en_val, zh_val):
    global added
    if key not in en:
        en[key] = en_val; zh[key] = zh_val; added += 1

def tw(key, fallback_js):
    """Generate JS expression: window.t(key, fallback)"""
    return f'(typeof window.t==="function"?window.t("{key}",{fallback_js}):{fallback_js})'

# ── 1. benefitLabel function — replace Chinese returns ──
old = '''  function benefitLabel(key) {
    var map = {
      "Labor Cost Reduction": "降人工",
      Consistency: "标准化",
      "Space Saving": "省空间",
      "Fast Payback": "快回本",
    };
    return map[key] || key;
  }'''
new = '''  function benefitLabel(key) {
    var map = {
      "Labor Cost Reduction": tOr("cases_benefit_labor", "降人工"),
      Consistency: tOr("cases_benefit_consistency", "标准化"),
      "Space Saving": tOr("cases_benefit_space", "省空间"),
      "Fast Payback": tOr("cases_benefit_payback", "快回本"),
    };
    return map[key] || key;
  }'''
c = c.replace(old, new)
add("cases_benefit_labor", "Reduce Labor", "降人工")
add("cases_benefit_consistency", "Standardization", "标准化")
add("cases_benefit_space", "Save Space", "省空间")
add("cases_benefit_payback", "Quick Payback", "快回本")

# ── 2. Add industry translation helpers (before laborReduction) ──
old = '''  /* ── Helpers ────────────────────────────────────── */
  function laborReduction(b, a) {'''
new = '''  /* ── i18n helpers ──────────────────────────────── */
  var INDUSTRY_I18N = {
    "小型餐饮": "cases_industry_small_restaurant",
    "中央厨房": "cases_industry_central_kitchen",
    "连锁餐饮": "cases_industry_chain_restaurant",
    "智慧食堂": "cases_industry_smart_canteen",
    "云厨房": "cases_industry_cloud_kitchen",
  };
  function tOr(key, fallback) {
    return typeof window.t === "function" ? window.t(key, fallback) : fallback;
  }
  function ti(name) {
    return tOr(INDUSTRY_I18N[name] || name, name);
  }

  /* ── Helpers ────────────────────────────────────── */
  function laborReduction(b, a) {'''
c = c.replace(old, new)
add("cases_industry_small_restaurant", "Small Restaurant", "小型餐饮")
add("cases_industry_central_kitchen", "Central Kitchen", "中央厨房")
add("cases_industry_chain_restaurant", "Chain Restaurant", "连锁餐饮")
add("cases_industry_smart_canteen", "Smart Canteen", "智慧食堂")
add("cases_industry_cloud_kitchen", "Cloud Kitchen", "云厨房")

# ── 3. renderCardPc: c.industry ──
old = "      c.industry +\n      '</span>'"  # first occurrence after storefront
# Be more specific
old = "'><span class=\"flex items-center gap-1\"><span class=\"material-symbols-outlined text-base\">storefront</span>' +\n      c.industry +\n      '</span>'"
new = "'><span class=\"flex items-center gap-1\"><span class=\"material-symbols-outlined text-base\">storefront</span>' +\n      tOr('cases_industry_'+c.slug, c.industry) +\n      '</span>'"
c = c.replace(old, new)

# ── 4. renderCardPc: 餐/天 ──
c = c.replace('" 餐/天"', 'tOr("cases_meals_per_day","餐/天")')
add("cases_meals_per_day", "meals/day", "餐/天")

# ── 5. renderCardPc: 月回本 ──
c = c.replace('" 月回本"', 'tOr("cases_payback_months","月回本")')
add("cases_payback_months", "mo. payback", "月回本")

# ── 6. renderCardPc: 人数变化 ──
c = c.replace("'人数变化'", 'tOr("cases_headcount_change","人数变化")')
add("cases_headcount_change", "Headcount Change", "人数变化")

# ── 7. renderCardPc: 月节省 ──
c = c.replace("'月节省'", 'tOr("cases_monthly_saving_label","月节省")')
add("cases_monthly_saving_label", "Monthly Savings", "月节省")

# ── 8. renderCardMobile: c.industry + c.country line ──
old = '      "<span>" +\n      c.country +\n      " · " +\n      c.industry +\n      "</span>" +'
new = '      "<span>" +\n      c.country +\n      " · " +\n      tOr("cases_industry_"+c.slug, c.industry) +\n      "</span>" +'
c = c.replace(old, new)

# ── 9. renderCardMobile: 人工 ──
c = c.replace('"人工 -"', '(tOr("cases_labor_reduction","人工") + " -")')
add("cases_labor_reduction", "Labor", "人工")

# ── 10. renderGrid: 个案例 in fallback ──
old = 'cases.length + " \\u4e2a\\u6848\\u4f8b"'
new = 'cases.length + " " + tOr("cases_count_unit","个案例")'
c = c.replace(old, new)
add("cases_count_unit", "cases", "个案例")

# ── 11. buildFiltersMobile: 个案例 ──
old = "'<span id=\"case-count\" class=\"flex-shrink-0 text-xs font-bold text-primary whitespace-nowrap\">8 \\u4e2a\\u6848\\u4f8b</span>'"
new = "'<span id=\"case-count\" class=\"flex-shrink-0 text-xs font-bold text-primary whitespace-nowrap\">8 ' + tOr(\"cases_count_unit\",\"个案例\") + '</span>'"
c = c.replace(old, new)

# ── 12. Filter buttons: 全部 ──
c = c.replace('>全部<', ">'+tOr('cases_filter_all','全部')+'<")
add("cases_filter_all", "All", "全部")

# ── 13. Filter industry options at render time ──
# In buildFiltersPc/buildFiltersTablet, replace first occurrence of f.options[i] closing button
c = c.replace(
    "f.options[i] +\n          '</button>'",
    "ti(f.options[i]) +\n          '</button>'"
)
# Second occurrence (Tablet filter)
c = c.replace(
    "f.options[i] +\n          '</button>';",
    "ti(f.options[i]) +\n          '</button>';"
)

# buildFiltersMobile: translate option display text
c = c.replace(
    "'<option value=\"' + f.options[i] + '\">' + f.options[i] + '</option>'",
    "'<option value=\"' + f.options[i] + '\">' + ti(f.options[i]) + '</option>'"
)

# ── Save ──
with open(FILE, "w", encoding="utf-8") as f:
    f.write(c)
print(f"case-grid.js: fixed ({added} new keys)")

# Check it still parses
import subprocess
r = subprocess.run(["node", "-c", FILE], capture_output=True, text=True)
if r.returncode != 0:
    print(f"SYNTAX ERROR: {r.stderr}")
else:
    print("JS syntax: ✅")

# Save JSON
with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
    json.dump(en, f, ensure_ascii=False, indent=2); f.write("\n")
with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as f:
    json.dump(zh, f, ensure_ascii=False, indent=2); f.write("\n")
print(f"JSON: en={len(en)}, zh={len(zh)}")

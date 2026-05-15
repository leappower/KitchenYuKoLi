#!/usr/bin/env python3
"""fix-js-hardcoded.py — Replace all hardcoded Chinese in JS render functions with window.t()"""

import json, re, os, sys

JS_DIR = "src/assets/js"
LANG_DIR = "src/assets/lang"

# Define replacements: (old_text, new_text, key, en_val, zh_val)
# Each: a regex or exact string in JS that should be replaced
REPLACEMENTS = {}

def main():
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))

    new_keys = {}

    def add_key(key, en_val, zh_val):
        if key not in en:
            en[key] = en_val
            zh[key] = zh_val

    # ─── case-grid.js fixes ───
    f = f"{JS_DIR}/case-grid.js"
    with open(f, "r", encoding="utf-8") as fp:
        c = fp.read()

    # Fix renderCardPc: c.industry → window.t with key
    # <span class="flex items-center gap-1">...storefront</span>' + c.industry + '</span>
    # In PC card: industry appears in span after storefront icon
    c = c.replace(
        "'><span class=\"flex items-center gap-1\"><span class=\"material-symbols-outlined text-base\">storefront</span>' +\n      c.industry +\n      '</span>'",
        "'><span class=\"flex items-center gap-1\"><span class=\"material-symbols-outlined text-base\">storefront</span>' +\n      (typeof window.t==='function'?window.t('cases_industry_'+c.slug,c.industry):c.industry) +\n      '</span>'"
    )

    # Fix renderCardMobile: c.country + " · " + c.industry
    c = c.replace(
        'c.country +\n      " · " +\n      c.industry',
        'c.country +\n      " · " +\n      (typeof window.t===\'function\'?window.t(\'cases_industry_\'+c.slug,c.industry):c.industry)'
    )

    # Fix "餐/天" → window.t('cases_meals_per_day')
    c = c.replace('" 餐/天"', '(typeof window.t==="function"?window.t("cases_meals_per_day","餐/天"):" 餐/天")')
    # Deduplicate (may have been replaced by previous)
    add_key("cases_meals_per_day", "meals/day", "餐/天")

    # Add i18n: industry names
    add_key("cases_industry_small_restaurant", "Small Restaurant", "小型餐饮")
    add_key("cases_industry_central_kitchen", "Central Kitchen", "中央厨房")
    add_key("cases_industry_chain_restaurant", "Chain Restaurant", "连锁餐饮")
    add_key("cases_industry_smart_canteen", "Smart Canteen", "智慧食堂")
    add_key("cases_industry_cloud_kitchen", "Cloud Kitchen", "云厨房")

    with open(f, "w", encoding="utf-8") as fp:
        fp.write(c)
    print("Fixed: case-grid.js")

    # ─── Save JSON ───
    with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as fp:
        json.dump(en, fp, ensure_ascii=False, indent=2); fp.write("\n")
    with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as fp:
        json.dump(zh, fp, ensure_ascii=False, indent=2); fp.write("\n")

    print(f"JSON: en={len(en)}, zh={len(zh)}")
    print("Done")

if __name__ == "__main__":
    main()

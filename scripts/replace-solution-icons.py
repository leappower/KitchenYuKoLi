#!/usr/bin/env python3
"""Replace icon blocks with images in application pages - Part 1: Solution/Feature sections (PC, Mobile, Tablet)"""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"
PAGES = {
    "central-kitchen": {
        "features": [
            {"icon": "menu_book", "file": "feature1.webp", "alt": "标准化菜谱管理"},
            {"icon": "precision_manufacturing", "file": "feature2.webp", "alt": "大批量烹饪"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控烹饪"},
            {"icon": "tune", "file": "feature4.webp", "alt": "容量可扩展"},
        ]
    },
    "chain-restaurant": {
        "features": [
            {"icon": "science", "file": "feature1.webp", "alt": "标准化输出"},
            {"icon": "cloud_sync", "file": "feature2.webp", "alt": "多店菜谱同步"},
            {"icon": "group_remove", "file": "feature3.webp", "alt": "减少人员"},
            {"icon": "rocket_launch", "file": "feature4.webp", "alt": "快速开店复制"},
        ]
    },
    "canteen": {
        "features": [
            {"icon": "soup_kitchen", "file": "feature1.webp", "alt": "现场烹饪+保温"},
            {"icon": "thermostat", "file": "feature2.webp", "alt": "标准化输出"},
            {"icon": "eco", "file": "feature3.webp", "alt": "营养管理"},
            {"icon": "savings", "file": "feature4.webp", "alt": "减少浪费"},
        ]
    },
    "food-factory": {
        "features": [
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "标准化大规模生产"},
            {"icon": "thermostat", "file": "feature2.webp", "alt": "精确温控"},
            {"icon": "history", "file": "feature3.webp", "alt": "批次追溯"},
            {"icon": "content_copy", "file": "feature4.webp", "alt": "快速产线复制"},
        ]
    },
    "menu-lab": {
        "features": [
            {"icon": "menu_book", "file": "feature1.webp", "alt": "多菜系菜谱库"},
            {"icon": "tune", "file": "feature2.webp", "alt": "菜谱定制服务"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温度自适应"},
            {"icon": "settings_suggest", "file": "feature4.webp", "alt": "一机多用"},
        ]
    },
    "small-restaurant": {
        "features": [
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "紧凑设备组合"},
            {"icon": "menu_book", "file": "feature2.webp", "alt": "内置标准化菜谱"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控"},
            {"icon": "tune", "file": "feature4.webp", "alt": "按单量可扩展"},
        ]
    },
}


def replace_feature_icons(content, page_name, features, viewport):
    """Replace w-12 h-12 bg-primary/10 icon blocks with image blocks in solution section."""
    img_base = f"/assets/images/applications/{page_name}"
    changes = 0
    
    for feat in features:
        icon_name = feat["icon"]
        img_src = f"{img_base}/{feat['file']}"
        alt = feat["alt"]
        
        if viewport == "pc" and page_name == "food-factory":
            # Food factory uses w-11 h-11
            pattern = (
                r'<div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">\s*'
                rf'<span class="material-symbols-outlined[^"]*"[^>]*>{re.escape(icon_name)}</span>\s*'
                r'</div>'
            )
            replacement = (
                f'<div class="w-28 h-20 rounded-xl overflow-hidden flex-shrink-0">'
                f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
                f'</div>'
            )
        else:
            # Standard w-12 h-12 pattern - but we need to match the right occurrence
            # We'll use a more specific pattern including the icon name
            pattern = (
                r'<div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">\s*'
                rf'<span class="material-symbols-outlined[^"]*"[^>]*>{re.escape(icon_name)}</span>\s*'
                r'</div>'
            )
            if viewport == "mobile":
                replacement = (
                    f'<div class="w-24 h-16 rounded-xl overflow-hidden flex-shrink-0">'
                    f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
                    f'</div>'
                )
            elif viewport == "tablet":
                replacement = (
                    f'<div class="w-28 h-20 rounded-xl overflow-hidden flex-shrink-0">'
                    f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
                    f'</div>'
                )
            else:  # pc
                replacement = (
                    f'<div class="w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">'
                    f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
                    f'</div>'
                )
        
        new_content, count = re.subn(pattern, replacement, content)
        if count > 0:
            content = new_content
            changes += count
            print(f"  [{viewport}] Replaced {icon_name} -> {feat['file']} ({count}x)")
    
    return content, changes


def main():
    total_changes = 0
    
    for page_name, page_data in PAGES.items():
        features = page_data["features"]
        
        for viewport in ["pc", "mobile", "tablet"]:
            filepath = os.path.join(BASE, page_name, f"index-{viewport}.html")
            if not os.path.exists(filepath):
                continue
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            original = content
            content, changes = replace_feature_icons(content, page_name, features, viewport)
            
            if changes > 0:
                total_changes += changes
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"✓ {page_name}/{viewport}: {changes} replacements")
            else:
                print(f"  {page_name}/{viewport}: no changes needed")
    
    print(f"\nTotal: {total_changes} icon blocks replaced with images")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Fix remaining solution icons: small-restaurant mobile/tablet, food-factory tablet."""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"

# Small restaurant: icons are compress, touch_app, cloud, smart_toy
# Map them to feature1-4.webp respectively
small_restaurant_fixes = [
    ("small-restaurant", "mobile", "compress", "feature1.webp", "极简配置"),
    ("small-restaurant", "mobile", "touch_app", "feature2.webp", "一键出菜"),
    ("small-restaurant", "mobile", "cloud", "feature3.webp", "云厨房友好"),
    ("small-restaurant", "mobile", "smart_toy", "feature4.webp", "智能排菜"),
    ("small-restaurant", "tablet", "compress", "feature1.webp", "极简配置"),
    ("small-restaurant", "tablet", "touch_app", "feature2.webp", "一键出菜"),
    ("small-restaurant", "tablet", "cloud", "feature3.webp", "云厨房友好"),
    ("small-restaurant", "tablet", "smart_toy", "feature4.webp", "智能排菜"),
]

# Food factory tablet: remaining icons (soup_kitchen with text-lg, hub with text-lg)
food_factory_tablet_fixes = [
    ("food-factory", "tablet", "soup_kitchen", "feature2.webp", "自动蒸制系统"),
    ("food-factory", "tablet", "hub", "feature4.webp", "中央控制系统"),
]


def do_replacements(replacements):
    total = 0
    file_contents = {}
    
    for page, viewport, icon, feat_file, alt in replacements:
        filepath = os.path.join(BASE, page, f"index-{viewport}.html")
        
        if filepath not in file_contents:
            with open(filepath, "r", encoding="utf-8") as f:
                file_contents[filepath] = f.read()
        
        content = file_contents[filepath]
        img_src = f"/assets/images/applications/{page}/{feat_file}"
        img_size = "w-24 h-16" if viewport == "mobile" else "w-28 h-20"
        
        # Flexible pattern - match icon block regardless of text size class
        pattern = (
            rf'<div class="w-10 h-10 rounded-\w+ bg-primary/10 flex items-center justify-center flex-shrink-0">\s*'
            rf'<span class="material-symbols-outlined[^"]*">\s*{re.escape(icon)}\s*</span>\s*'
            r'</div>'
        )
        
        replacement = (
            f'<div class="{img_size} rounded-xl overflow-hidden flex-shrink-0">'
            f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
            f'</div>'
        )
        
        new_content, count = re.subn(pattern, replacement, content)
        if count > 0:
            file_contents[filepath] = new_content
            total += count
            print(f"  ✓ {page}/{viewport}: {icon} -> {feat_file}")
        else:
            print(f"  ✗ {page}/{viewport}: {icon} -> {feat_file} (no match)")
    
    # Write back modified files
    for filepath, content in file_contents.items():
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    
    return total


print("=== Small Restaurant Fixes ===")
t1 = do_replacements(small_restaurant_fixes)

print("\n=== Food Factory Tablet Fixes ===")
t2 = do_replacements(food_factory_tablet_fixes)

print(f"\nTotal fixed: {t1 + t2}")

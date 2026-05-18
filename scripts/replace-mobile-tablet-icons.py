#!/usr/bin/env python3
"""Replace solution icon blocks in mobile/tablet pages with images."""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"

# Mobile/Tablet solution icons per page (may differ from PC)
MOBILE_TABLET_ICONS = {
    "central-kitchen": {
        "mobile": [
            {"icon": "precision_manufacturing", "file": "feature2.webp", "alt": "批量烹饪生产线"},
            {"icon": "menu_book", "file": "feature1.webp", "alt": "1000+标准化菜谱"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控"},
            {"icon": "monitoring", "file": "feature4.webp", "alt": "营养管理系统"},
        ],
        "tablet": [
            {"icon": "precision_manufacturing", "file": "feature2.webp", "alt": "批量烹饪生产线"},
            {"icon": "menu_book", "file": "feature1.webp", "alt": "1000+标准化菜谱"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控"},
            {"icon": "monitoring", "file": "feature4.webp", "alt": "营养管理系统"},
        ],
    },
    "chain-restaurant": {
        "mobile": [
            {"icon": "science", "file": "feature1.webp", "alt": "标准化输出"},
            {"icon": "person_remove", "file": "feature3.webp", "alt": "减少人员", "color": "green"},
        ],
        "tablet": [
            {"icon": "science", "file": "feature1.webp", "alt": "标准化输出"},
            {"icon": "person_remove", "file": "feature3.webp", "alt": "减少人员", "color": "green"},
        ],
    },
    "canteen": {
        # Already done by the PC script since canteen mobile/tablet use same icon names
        "mobile": [],
        "tablet": [],
    },
    "cloud-kitchen": {
        "mobile": [],
        "tablet": [],
    },
    "food-factory": {
        "mobile": [
            # Lines 222-255: w-9 h-9 rounded-lg, solution section icons differ from PC
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "标准化大规模生产", "size": "w-9 h-9"},
            {"icon": "soup_kitchen", "file": "feature2.webp", "alt": "精确温控", "size": "w-9 h-9"},
            {"icon": "hub", "file": "feature3.webp", "alt": "批次追溯", "size": "w-9 h-9"},
            {"icon": "inventory_2", "file": "feature4.webp", "alt": "快速产线复制", "size": "w-9 h-9"},
        ],
        "tablet": [
            # Lines 255-294: w-10 h-10 rounded-xl, solution section
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "标准化大规模生产", "size": "w-10 h-10"},
            {"icon": "thermostat", "file": "feature2.webp", "alt": "精确温控", "size": "w-10 h-10"},
            {"icon": "inventory_2", "file": "feature3.webp", "alt": "批次追溯", "size": "w-10 h-10"},
            {"icon": "content_copy", "file": "feature4.webp", "alt": "快速产线复制", "size": "w-10 h-10"},
        ],
    },
    "menu-lab": {
        "mobile": [
            {"icon": "menu_book", "file": "feature1.webp", "alt": "多菜系菜谱库"},
            {"icon": "tune", "file": "feature2.webp", "alt": "菜谱定制服务"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温度自适应"},
            {"icon": "settings_suggest", "file": "feature4.webp", "alt": "一机多用"},
        ],
        "tablet": [
            {"icon": "menu_book", "file": "feature1.webp", "alt": "多菜系菜谱库"},
            {"icon": "tune", "file": "feature2.webp", "alt": "菜谱定制服务"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温度自适应"},
            {"icon": "settings_suggest", "file": "feature4.webp", "alt": "一机多用"},
        ],
    },
    "small-restaurant": {
        "mobile": [
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "紧凑设备组合"},
            {"icon": "menu_book", "file": "feature2.webp", "alt": "内置标准化菜谱"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控"},
            {"icon": "tune", "file": "feature4.webp", "alt": "按单量可扩展"},
        ],
        "tablet": [
            {"icon": "precision_manufacturing", "file": "feature1.webp", "alt": "紧凑设备组合"},
            {"icon": "menu_book", "file": "feature2.webp", "alt": "内置标准化菜谱"},
            {"icon": "thermostat", "file": "feature3.webp", "alt": "智能温控"},
            {"icon": "tune", "file": "feature4.webp", "alt": "按单量可扩展"},
        ],
    },
}


def replace_icons(content, page_name, icons, viewport):
    """Replace icon blocks with image blocks."""
    img_base = f"/assets/images/applications/{page_name}"
    changes = 0
    
    for feat in icons:
        icon_name = feat["icon"]
        img_src = f"{img_base}/{feat['file']}"
        alt = feat["alt"]
        size_class = feat.get("size", "w-10 h-10")
        color = feat.get("color", "primary")
        
        if viewport == "mobile":
            img_size = "w-24 h-16"
        else:
            img_size = "w-28 h-20"
        
        # Build pattern - match the icon block
        if size_class == "w-9 h-9":
            # Food factory mobile: single-line pattern
            pattern = (
                r'<div class="w-9 h-9 rounded-lg bg-' + color + r'-[^"]* flex items-center justify-center flex-shrink-0">'
                rf'<span class="material-symbols-outlined [^"]*text-{color}[^"]*">{re.escape(icon_name)}</span></div>'
            )
        else:
            pattern = (
                r'<div class="' + re.escape(size_class) + r' rounded-\w+ bg-' + color + r'-[^"]* flex items-center justify-center flex-shrink-0">\s*'
                rf'<span class="material-symbols-outlined[^"]*text-{color}[^"]*"[^>]*>\s*{re.escape(icon_name)}\s*</span>\s*'
                r'</div>'
            )
        
        replacement = (
            f'<div class="{img_size} rounded-xl overflow-hidden flex-shrink-0">'
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
    total = 0
    for page_name, viewports in MOBILE_TABLET_ICONS.items():
        for viewport, icons in viewports.items():
            if not icons:
                continue
            filepath = os.path.join(BASE, page_name, f"index-{viewport}.html")
            if not os.path.exists(filepath):
                continue
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            content, changes = replace_icons(content, page_name, icons, viewport)
            if changes > 0:
                total += changes
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"✓ {page_name}/{viewport}: {changes} replacements")
    
    print(f"\nTotal: {total} mobile/tablet solution icons replaced")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Replace solution icon blocks in mobile/tablet pages - flexible regex version."""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"

# Define replacements: (page, viewport, icon_name, feature_file, alt_text, icon_size_class, color)
REPLACEMENTS = [
    # Central kitchen mobile (w-10 h-10, multi-line span)
    ("central-kitchen", "mobile", "precision_manufacturing", "feature2.webp", "批量烹饪生产线", "w-10 h-10", "primary"),
    ("central-kitchen", "mobile", "menu_book", "feature1.webp", "1000+标准化菜谱", "w-10 h-10", "primary"),
    ("central-kitchen", "mobile", "thermostat", "feature3.webp", "智能温控", "w-10 h-10", "primary"),
    ("central-kitchen", "mobile", "monitoring", "feature4.webp", "营养管理系统", "w-10 h-10", "primary"),
    # Central kitchen tablet (w-10 h-10)
    ("central-kitchen", "tablet", "precision_manufacturing", "feature2.webp", "批量烹饪生产线", "w-10 h-10", "primary"),
    ("central-kitchen", "tablet", "menu_book", "feature1.webp", "1000+标准化菜谱", "w-10 h-10", "primary"),
    ("central-kitchen", "tablet", "thermostat", "feature3.webp", "智能温控", "w-10 h-10", "primary"),
    ("central-kitchen", "tablet", "monitoring", "feature4.webp", "营养管理系统", "w-10 h-10", "primary"),
    
    # Chain restaurant mobile - science icon (already done for person_remove)
    ("chain-restaurant", "mobile", "science", "feature1.webp", "标准化输出", "w-10 h-10", "primary"),
    ("chain-restaurant", "tablet", "science", "feature1.webp", "标准化输出", "w-10 h-10", "primary"),
    
    # Menu lab mobile
    ("menu-lab", "mobile", "menu_book", "feature1.webp", "多菜系菜谱库", "w-10 h-10", "primary"),
    ("menu-lab", "mobile", "tune", "feature2.webp", "菜谱定制服务", "w-10 h-10", "primary"),
    ("menu-lab", "mobile", "thermostat", "feature3.webp", "智能温度自适应", "w-10 h-10", "primary"),
    ("menu-lab", "mobile", "settings_suggest", "feature4.webp", "一机多用", "w-10 h-10", "primary"),
    # Menu lab tablet
    ("menu-lab", "tablet", "menu_book", "feature1.webp", "多菜系菜谱库", "w-10 h-10", "primary"),
    ("menu-lab", "tablet", "tune", "feature2.webp", "菜谱定制服务", "w-10 h-10", "primary"),
    ("menu-lab", "tablet", "thermostat", "feature3.webp", "智能温度自适应", "w-10 h-10", "primary"),
    ("menu-lab", "tablet", "settings_suggest", "feature4.webp", "一机多用", "w-10 h-10", "primary"),
    
    # Small restaurant mobile
    ("small-restaurant", "mobile", "precision_manufacturing", "feature1.webp", "紧凑设备组合", "w-10 h-10", "primary"),
    ("small-restaurant", "mobile", "menu_book", "feature2.webp", "内置标准化菜谱", "w-10 h-10", "primary"),
    ("small-restaurant", "mobile", "thermostat", "feature3.webp", "智能温控", "w-10 h-10", "primary"),
    ("small-restaurant", "mobile", "tune", "feature4.webp", "按单量可扩展", "w-10 h-10", "primary"),
    # Small restaurant tablet
    ("small-restaurant", "tablet", "precision_manufacturing", "feature1.webp", "紧凑设备组合", "w-10 h-10", "primary"),
    ("small-restaurant", "tablet", "menu_book", "feature2.webp", "内置标准化菜谱", "w-10 h-10", "primary"),
    ("small-restaurant", "tablet", "thermostat", "feature3.webp", "智能温控", "w-10 h-10", "primary"),
    ("small-restaurant", "tablet", "tune", "feature4.webp", "按单量可扩展", "w-10 h-10", "primary"),
    
    # Food factory mobile (w-9 h-9, single-line format with text-base)
    ("food-factory", "mobile", "precision_manufacturing", "feature1.webp", "标准化大规模生产", "w-9 h-9", "primary"),
    ("food-factory", "mobile", "soup_kitchen", "feature2.webp", "精确温控", "w-9 h-9", "primary"),
    ("food-factory", "mobile", "hub", "feature3.webp", "批次追溯", "w-9 h-9", "primary"),
    ("food-factory", "mobile", "inventory_2", "feature4.webp", "快速产线复制", "w-9 h-9", "primary"),
    # Food factory tablet (w-10 h-10, rounded-xl)
    ("food-factory", "tablet", "precision_manufacturing", "feature1.webp", "标准化大规模生产", "w-10 h-10", "primary"),
    ("food-factory", "tablet", "thermostat", "feature2.webp", "精确温控", "w-10 h-10", "primary"),
    ("food-factory", "tablet", "inventory_2", "feature3.webp", "批次追溯", "w-10 h-10", "primary"),
    ("food-factory", "tablet", "content_copy", "feature4.webp", "快速产线复制", "w-10 h-10", "primary"),
]


def make_pattern(icon_name, size_class, color):
    """Create a flexible regex pattern to match icon blocks."""
    # Escape the icon name for regex
    escaped_icon = re.escape(icon_name)
    escaped_size = re.escape(size_class)
    
    # Pattern matches both single-line and multi-line span formats
    pattern = (
        rf'<div class="{escaped_size} rounded-\w+ bg-{color}[^"]* flex items-center justify-center flex-shrink-0">\s*'
        rf'<span class="material-symbols-outlined[^"]*">\s*{escaped_icon}\s*</span>\s*'
        r'</div>'
    )
    return pattern


def make_replacement(page_name, feature_file, alt, viewport):
    """Create the replacement HTML."""
    img_src = f"/assets/images/applications/{page_name}/{feature_file}"
    if viewport == "mobile":
        img_size = "w-24 h-16"
    else:
        img_size = "w-28 h-20"
    
    return (
        f'<div class="{img_size} rounded-xl overflow-hidden flex-shrink-0">'
        f'<img src="{img_src}" alt="{alt}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/placeholders/product-fallback.webp\';">'
        f'</div>'
    )


def main():
    # Group by file to avoid reading/writing same file multiple times
    file_edits = {}  # filepath -> list of (pattern, replacement, desc)
    
    for page, viewport, icon, feat_file, alt, size, color in REPLACEMENTS:
        filepath = os.path.join(BASE, page, f"index-{viewport}.html")
        pattern = make_pattern(icon, size, color)
        replacement = make_replacement(page, feat_file, alt, viewport)
        desc = f"{icon} -> {feat_file}"
        
        if filepath not in file_edits:
            file_edits[filepath] = []
        file_edits[filepath].append((pattern, replacement, desc))
    
    total = 0
    for filepath, edits in file_edits.items():
        if not os.path.exists(filepath):
            continue
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        file_changes = 0
        for pattern, replacement, desc in edits:
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                file_changes += count
                print(f"  ✓ {desc}")
            else:
                print(f"  ✗ {desc} (no match)")
        
        if file_changes > 0:
            total += file_changes
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            rel = os.path.relpath(filepath, BASE)
            print(f"  => {rel}: {file_changes} changes")
        print()
    
    print(f"Total: {total} icons replaced")


if __name__ == "__main__":
    main()

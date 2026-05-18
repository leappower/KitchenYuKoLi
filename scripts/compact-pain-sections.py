#!/usr/bin/env python3
"""Restructure pain point sections: compact horizontal layout + smaller icons.

For mobile: Change top pain cards from vertical space-y-4 list to grid grid-cols-2 gap-3.
            Reduce icons from w-12 h-12 to w-10 h-10.
            Keep bottom pain sections as-is (already compact).
For tablet: Reduce icons from w-12 h-12 to w-10 h-10 in top pain section.
            Keep bottom pain sections as-is.
"""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"


def process_mobile(filepath, page_name):
    """Process mobile pain section: vertical list → 2-col grid + smaller icons."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    changes = 0
    
    # 1. Change top pain container from space-y-4 to grid grid-cols-2 gap-3
    # Pattern: <div class="space-y-4"> after pain title
    # We need to find the specific space-y-4 that's inside the pain section
    # Look for the pattern: pain section title closing tag followed by space-y-4
    
    # Find all space-y-4 containers and check context
    # More targeted: find the space-y-4 that follows pain section headers
    pattern_space_y = r'(<h2[^>]*data-i18n="[^"]*_pain[^"]*"[^>]*>.*?</h2>\s*.*?</p>\s*</div>\s*<div\s+)class="space-y-4"'
    
    def replace_space_y(match):
        nonlocal changes
        changes += 1
        return match.group(1) + 'class="grid grid-cols-2 gap-3"'
    
    content = re.sub(pattern_space_y, replace_space_y, content, flags=re.DOTALL)
    
    # 2. Reduce top pain icon sizes from w-12 h-12 to w-10 h-10
    # Only in the pain section (not solution section)
    # The pain icons have bg-red/orange/blue/purple with text-2xl
    pattern_icon = r'<div class="w-12 h-12 rounded-lg bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center flex-shrink-0">'
    replacement_icon = r'<div class="w-10 h-10 rounded-lg bg-\1-100 dark:bg-\2-900/30 flex items-center justify-center flex-shrink-0">'
    new_content, count = re.subn(pattern_icon, replacement_icon, content)
    if count > 0:
        content = new_content
        changes += count
    
    # Also reduce text size inside pain icons from text-2xl to text-xl
    pattern_text = r'<span class="material-symbols-outlined text-2xl text-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-600">'
    replacement_text = r'<span class="material-symbols-outlined text-xl text-\1-600">'
    new_content, count = re.subn(pattern_text, replacement_text, content)
    if count > 0:
        content = new_content
        changes += count
    
    # 3. Make pain card text more compact - reduce padding from p-5 to p-4
    # Find cards that have the colored icon + text pattern (pain cards)
    pattern_card_p5 = r'(<div class="bg-white dark:bg-slate-800 rounded-xl) p-5 (shadow-md flex gap-[34])">'
    def adjust_card(match):
        nonlocal changes
        changes += 1
        return match.group(1) + ' p-3 ' + match.group(2) + '>'
    
    # Simpler: just replace p-5 with p-3 in cards that contain colored pain icons
    # We'll do this by finding cards with colored icons inside
    pattern_pain_card = r'(<div class="bg-white dark:bg-slate-800 rounded-xl) p-5 (shadow-md flex gap-\d)">'
    new_content, count = re.subn(pattern_pain_card, r'\1 p-3 \2', content)
    if count > 0:
        content = new_content
        changes += count
    
    if changes > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    
    return changes


def process_tablet(filepath, page_name):
    """Process tablet pain section: reduce icon sizes, make more compact."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    changes = 0
    
    # 1. Reduce top pain icon sizes from w-12 h-12 to w-10 h-10
    # Tablet icons have mb-4 or mb-6 style (not flex-shrink-0)
    pattern_icon_12 = r'<div class="w-12 h-12 rounded-lg bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center mb-[46]">'
    replacement_icon_12 = r'<div class="w-10 h-10 rounded-lg bg-\1-100 dark:bg-\2-900/30 flex items-center justify-center mb-3">'
    new_content, count = re.subn(pattern_icon_12, replacement_icon_12, content)
    if count > 0:
        content = new_content
        changes += count
    
    # 2. Reduce text size inside pain icons from text-2xl to text-xl
    pattern_text = r'<span class="material-symbols-outlined text-2xl text-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-600">'
    replacement_text = r'<span class="material-symbols-outlined text-xl text-\1-600">'
    new_content, count = re.subn(pattern_text, replacement_text, content)
    if count > 0:
        content = new_content
        changes += count
    
    # 3. Reduce pain card padding
    pattern_card = r'(<div class="bg-white dark:bg-slate-800 rounded-xl) p-6 (shadow-md)">'
    new_content, count = re.subn(pattern_card, r'\1 p-4 \2', content)
    if count > 0:
        content = new_content
        changes += count
    
    if changes > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    
    return changes


def main():
    pages = [
        "central-kitchen", "chain-restaurant", "canteen", "cloud-kitchen",
        "food-factory", "menu-lab", "small-restaurant"
    ]
    
    total = 0
    for page in pages:
        for viewport in ["mobile", "tablet"]:
            filepath = os.path.join(BASE, page, f"index-{viewport}.html")
            if not os.path.exists(filepath):
                continue
            
            if viewport == "mobile":
                changes = process_mobile(filepath, page)
            else:
                changes = process_tablet(filepath, page)
            
            if changes > 0:
                total += changes
                print(f"✓ {page}/{viewport}: {changes} changes")
    
    print(f"\nTotal: {total} pain section adjustments")


if __name__ == "__main__":
    main()

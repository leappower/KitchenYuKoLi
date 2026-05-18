#!/usr/bin/env python3
"""Fix remaining pain section icons on tablet pages."""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"


def fix_file(filepath, icon_pattern, replacement, desc):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    new_content, count = re.subn(icon_pattern, replacement, content)
    if count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  ✓ {desc}: {count} replacements")
    else:
        print(f"  ✗ {desc}: no match")
    return count


def main():
    total = 0
    
    # Cloud-kitchen tablet: top pain section (w-12 h-12 with flex-shrink-0)
    filepath = os.path.join(BASE, "cloud-kitchen", "index-tablet.html")
    total += fix_file(
        filepath,
        r'<div class="w-12 h-12 rounded-lg bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center flex-shrink-0">',
        r'<div class="w-10 h-10 rounded-lg bg-\1-100 dark:bg-\2-900/30 flex items-center justify-center flex-shrink-0">',
        "cloud-kitchen/tablet top pain flex-shrink"
    )
    # Also reduce text-2xl inside these pain icons
    total += fix_file(
        filepath,
        r'<span class="material-symbols-outlined text-2xl text-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-600">',
        r'<span class="material-symbols-outlined text-xl text-\1-600">',
        "cloud-kitchen/tablet text-2xl→text-xl"
    )
    # Also reduce card padding from p-5 to p-4
    total += fix_file(
        filepath,
        r'(<div class="bg-white dark:bg-slate-800 rounded-xl) p-5 (shadow-md flex gap-4)">',
        r'\1 p-4 \2',
        "cloud-kitchen/tablet p-5→p-4"
    )
    
    # Cloud-kitchen tablet: bottom pain section (w-12 h-12 with shrink-0, inline span)
    total += fix_file(
        filepath,
        r'<div class="w-12 h-12 rounded-lg bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center shrink-0">',
        r'<div class="w-10 h-10 rounded-lg bg-\1-100 dark:bg-\2-900/30 flex items-center justify-center shrink-0">',
        "cloud-kitchen/tablet bottom pain shrink"
    )
    
    # Canteen tablet: fix remaining w-12 (line 175 with mb-6)
    filepath = os.path.join(BASE, "canteen", "index-tablet.html")
    total += fix_file(
        filepath,
        r'<div class="w-12 h-12 rounded-lg bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center mb-6">',
        r'<div class="w-10 h-10 rounded-lg bg-\1-100 dark:bg-\2-900/30 flex items-center justify-center mb-4">',
        "canteen/tablet mb-6→mb-4"
    )
    
    # Check if canteen tablet has w-10 w-10 already done (should be from first script)
    
    print(f"\nTotal: {total} additional fixes")


if __name__ == "__main__":
    main()

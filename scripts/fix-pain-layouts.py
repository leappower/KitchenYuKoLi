#!/usr/bin/env python3
"""Fix remaining pain sections: convert mobile pain containers to grid, reduce tablet icon sizes."""

import re
import os

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/pages/applications"

# Pages that need mobile pain container change (space-y-4 → grid grid-cols-2 gap-3)
# canteen is already done
MOBILE_FIXES = {
    "central-kitchen": 139,    # line number of space-y-4 in pain section
    "chain-restaurant": 143,
    "menu-lab": 142,
    "small-restaurant": 141,
}

# food-factory uses a different structure (large cards in space-y-4 gap-8)
# cloud-kitchen uses space-y-4 too

# Pages that still have w-12 h-12 icons in pain sections (mobile)
# food-factory mobile: lines 161,171,180,191

def fix_mobile_containers():
    """Change pain section space-y-4 to grid grid-cols-2 gap-3 on mobile."""
    for page, line_num in MOBILE_FIXES.items():
        filepath = os.path.join(BASE, page, "index-mobile.html")
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Find the space-y-4 container at or near the expected line
        # Look for <div class="space-y-4"> (simple form)
        for i in range(max(0, line_num - 5), min(len(lines), line_num + 5)):
            if 'class="space-y-4"' in lines[i] and 'grid' not in lines[i]:
                lines[i] = lines[i].replace('class="space-y-4"', 'class="grid grid-cols-2 gap-3"')
                print(f"  ✓ {page}/mobile: line {i+1} space-y-4 → grid grid-cols-2 gap-3")
                break
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(lines)


def fix_mobile_icons_12():
    """Reduce remaining w-12 h-12 pain icons on mobile to w-10 h-10."""
    pages_to_check = ["food-factory", "cloud-kitchen"]
    for page in pages_to_check:
        filepath = os.path.join(BASE, page, "index-mobile.html")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace w-12 h-12 pain icons
        pattern = r'<div class="w-12 h-12 rounded-(lg|xl) bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center mb-4">'
        replacement = r'<div class="w-10 h-10 rounded-\1 bg-\2-100 dark:bg-\3-900/30 flex items-center justify-center mb-3">'
        new_content, count = re.subn(pattern, replacement, content)
        
        if count > 0:
            # Also change container to grid
            # food-factory and cloud-kitchen use space-y-4 gap-8
            new_content = re.sub(
                r'<div class="space-y-4 gap-8">',
                '<div class="grid grid-cols-2 gap-3">',
                new_content
            )
            # Reduce card padding and remove hover effects for mobile
            new_content = re.sub(
                r'rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow',
                'rounded-xl p-3 shadow-md',
                new_content
            )
            # Reduce title text size
            new_content = re.sub(
                r'<h3 class="text-xl font-bold mb-3"',
                '<h3 class="font-bold mb-1"',
                new_content
            )
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  ✓ {page}/mobile: {count} icons reduced, layout converted")


def fix_tablet_remaining():
    """Reduce remaining w-11 h-11 and w-12 h-12 pain icons on tablet."""
    pages = ["food-factory"]  # Only food-factory has w-11 h-11
    for page in pages:
        filepath = os.path.join(BASE, page, "index-tablet.html")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace w-11 h-11 pain icons
        pattern = r'<div class="w-11 h-11 rounded-(lg|xl) bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-100 dark:bg-(red|orange|blue|purple|green|yellow|amber|indigo|pink|teal)-900/30 flex items-center justify-center mb-4">'
        replacement = r'<div class="w-10 h-10 rounded-\1 bg-\2-100 dark:bg-\3-900/30 flex items-center justify-center mb-3">'
        new_content, count = re.subn(pattern, replacement, content)
        
        if count > 0:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  ✓ {page}/tablet: {count} w-11 icons reduced to w-10")


def fix_cloud_kitchen():
    """Fix cloud-kitchen mobile pain section."""
    filepath = os.path.join(BASE, "cloud-kitchen", "index-mobile.html")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if pain section has space-y-4
    # Find the pain section
    if 'space-y-4' in content:
        # Cloud kitchen pain section at line ~165
        # Already has w-10 h-10 icons (from previous script)
        # Just need to convert container
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'class="space-y-4"' in line and i < 200:  # Pain section is early in the file
                lines[i] = line.replace('class="space-y-4"', 'class="grid grid-cols-2 gap-3"')
                print(f"  ✓ cloud-kitchen/mobile: line {i+1} container converted")
                break
        
        content = '\n'.join(lines)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)


def main():
    print("=== Fixing mobile pain containers ===")
    fix_mobile_containers()
    fix_cloud_kitchen()
    
    print("\n=== Fixing remaining mobile icons ===")
    fix_mobile_icons_12()
    
    print("\n=== Fixing tablet remaining ===")
    fix_tablet_remaining()
    
    print("\nDone!")


if __name__ == "__main__":
    main()

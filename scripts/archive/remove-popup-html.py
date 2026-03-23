#!/usr/bin/env python3
"""Remove inline smart-popup-overlay HTML and its CSS from all page HTML files.
smart-popup.js now injects the overlay dynamically via ensureOverlay()."""
import re, glob

# Match the comment + overlay div block (2 levels of closing divs)
pattern = re.compile(
    r'(?:<!-- ═+\s*Smart Popup Overlay.*?═+\s*-->\s*)?'
    r'<div\s+id=["\']smart-popup-overlay["\'][^>]*>.*?</div>\s*</div>',
    re.DOTALL
)

# Also remove the inline <style> block that only contains popup CSS
style_pattern = re.compile(
    r'<style>\s*#smart-popup-overlay\{[^<]*\}\s*</style>',
    re.DOTALL
)

files = glob.glob('src/pages/**/*.html', recursive=True)
count = 0
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    new_content = pattern.sub('', content)
    new_content = style_pattern.sub('', new_content)
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        count += 1
        print('Cleaned:', f)
print(f'Total: {count} files cleaned')

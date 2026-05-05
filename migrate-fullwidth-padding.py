#!/usr/bin/env python3
"""
Wrap fullwidth-bg section content in .section-content div.
Simple approach: find sections, check if they need wrapping, wrap them.
"""

import re, os, glob

PAGE_DIRS = [
    'src/pages/applications',
    'src/pages/about',
    'src/pages/cases',
    'src/pages/contact',
    'src/pages/home',
    'src/pages/landing',
    'src/pages/products',
    'src/pages/profit-calculator',
    'src/pages/support',
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    original = lines[:]
    changed = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Find fullwidth-bg section opening
        if 'fullwidth-bg' in line and '<section' in line:
            # Collect the full opening tag (might span multiple lines)
            open_lines = [line]
            j = i + 1
            while j < len(lines) and '>' not in open_lines[-1]:
                open_lines.append(lines[j])
                j += 1
            
            # Get indent of section tag
            section_indent = len(open_lines[0]) - len(open_lines[0].lstrip())
            
            # Skip if already has section-content
            full_open = ''.join(open_lines)
            if 'section-content' in full_open:
                i = j
                continue
            
            # Find matching </section>
            depth = 1
            content_lines = []
            k = j
            while k < len(lines) and depth > 0:
                cl = lines[k]
                depth += len(re.findall(r'<section\b', cl, re.IGNORECASE))
                depth -= len(re.findall(r'</section>', cl, re.IGNORECASE))
                if depth > 0:
                    content_lines.append(cl)
                else:
                    # This line has </section>, take content before it
                    close_idx = cl.lower().index('</section>')
                    before_close = cl[:close_idx]
                    after_close = cl[close_idx:]
                    if before_close.strip():
                        content_lines.append(before_close)
                    close_line = after_close
                k += 1
            
            if not content_lines or not ''.join(content_lines).strip():
                i = k
                continue
            
            # Check if first child has px- class
            content_text = ''.join(content_lines)
            first_tag_match = re.search(r'<(div|section)\b[^>]*class="([^"]*)"', content_text)
            if first_tag_match and re.search(r'\bpx-[0-9]', first_tag_match.group(2)):
                # Already has padding on first child wrapper
                i = k
                continue
            
            # Wrap content_lines in <div class="section-content">
            wrapper_prefix = ' ' * (section_indent + 2)
            child_prefix = ' ' * (section_indent + 4)
            
            new_lines = list(open_lines)
            new_lines.append(wrapper_prefix + '<div class="section-content">\n')
            for cl in content_lines:
                stripped = cl.lstrip()
                if stripped:
                    new_lines.append(child_prefix + stripped)
                else:
                    new_lines.append('\n')
            new_lines.append(wrapper_prefix + '</div>\n')
            new_lines.append(' ' * section_indent + '</section>\n')
            
            # Replace lines[i:k] with new_lines
            lines[i:k] = new_lines
            changed = True
            i += len(new_lines)
        else:
            i += 1
    
    if changed:
        with open(filepath, 'w') as f:
            f.writelines(lines)
    
    return changed

# Process
total_files = 0
for directory in PAGE_DIRS:
    for filepath in sorted(glob.glob(os.path.join(directory, '**', '*.html'), recursive=True)):
        if process_file(filepath):
            total_files += 1
            print(f"  ✓ {filepath.replace('src/pages/', '')}")

print(f"\nFiles modified: {total_files}")

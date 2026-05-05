#!/usr/bin/env python3
"""
Remove redundant container-level px wrappers inside section-content.
"""
import re, glob, os

def find_matching_close(html, open_end):
    """Find matching </div> for a <div> tag, handling nesting."""
    depth = 1
    pos = open_end
    while depth > 0 and pos < len(html):
        next_o = html.find('<div', pos)
        next_c = html.find('</div>', pos)
        if next_c == -1:
            return -1
        if next_o != -1 and next_o < next_c:
            # Make sure it's a real open tag, not inside text
            depth += 1
            pos = next_o + 4
        else:
            depth -= 1
            if depth == 0:
                return next_c
            pos = next_c + 6
    return -1

removed_count = 0
files_changed = 0

for fpath in sorted(glob.glob('src/pages/**/*.html', recursive=True)):
    with open(fpath) as f:
        lines = f.readlines()
    
    original = ''.join(lines)
    modified = False
    
    # Find all <div class="...md:px-5 lg:px-5 xl:px-10..."> 
    # that are inside section-content
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Match opening div with px classes
        m = re.search(r'<div\s+class="([^"]*(?:md:px-5\s+lg:px-5\s+xl:px-10)[^"]*)"', line)
        if not m:
            i += 1
            continue
        
        cls = m.group(1)
        # Check what's left after removing px classes
        remaining = re.sub(r'(?:px-3\s+)?(?:md:)?px-\d+', '', cls).strip()
        
        # Get the full opening tag (might span to > on same line)
        tag_start_in_line = m.start()
        # Find closing >
        tag_end_in_line = line.find('>', m.end())
        if tag_end_in_line == -1:
            i += 1
            continue
        
        full_tag = line[tag_start_in_line:tag_end_in_line + 1]
        
        # Check if this div is inside a section-content
        before = ''.join(lines[:i]) + line[:tag_start_in_line]
        if 'section-content' not in before[-5000:]:
            i += 1
            continue
        
        if not remaining:
            # ─── Pure container wrapper → remove entirely ───
            # Reconstruct full html from this point
            html_from_here = ''.join(lines[i:]) 
            # Find the matching </div>
            tag_end_offset = tag_end_in_line + 1
            close_idx = find_matching_close(html_from_here, tag_end_offset)
            if close_idx == -1:
                i += 1
                continue
            
            # Extract inner content
            inner = html_from_here[tag_end_offset:close_idx]
            
            # Replace: everything from tag_start to close tag end
            total_end = close_idx + 6  # len('</div>')
            replacement = inner.strip() + '\n'
            
            # Now replace in the lines array
            before_tag = line[:tag_start_in_line]
            after_close = html_from_here[total_end:]
            
            # Split replacement back into lines
            new_lines = (before_tag + replacement + after_close).splitlines(True)
            # Replace lines[i] onwards
            lines = lines[:i] + new_lines
            removed_count += 1
            modified = True
            # Don't increment i - re-process this line (it changed)
        else:
            # ─── Functional div → strip px classes only ───
            new_cls = re.sub(r'\s*px-3\s*', ' ', cls)
            new_cls = re.sub(r'\s*md:px-5\s*', ' ', new_cls)
            new_cls = re.sub(r'\s*lg:px-5\s*', ' ', new_cls)
            new_cls = re.sub(r'\s*xl:px-10\s*', ' ', new_cls)
            new_cls = re.sub(r'\s+', ' ', new_cls).strip()
            
            if new_cls != cls:
                lines[i] = line.replace(f'class="{cls}"', f'class="{new_cls}"')
                removed_count += 1
                modified = True
        
        i += 1
    
    if modified:
        with open(fpath, 'w') as f:
            f.writelines(lines)
        files_changed += 1
        short = fpath.replace('src/pages/', '')
        print(f'  ✓ {short}')

print(f'\nDone: {files_changed} files, {removed_count} fixes')

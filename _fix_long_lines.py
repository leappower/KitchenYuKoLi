#!/usr/bin/env python3
"""Split long JS lines (>300 chars) at ' + ' concatenation boundaries."""
import re, sys

MAX_LEN = 300
TARGET_LEN = 250

def split_line(text):
    """Split a single line at ' + ' boundaries to keep each under TARGET_LEN."""
    if len(text) <= MAX_LEN:
        return None  # no change needed
    
    indent = len(text) - len(text.lstrip())
    prefix = ' ' * indent
    
    # Find ' + ' split points (not inside quotes would be ideal, but
    # for these HTML template lines, splitting at ' + ' is safe)
    # Split at literal ' + ' sequences
    segments = []
    pos = 0
    while pos < len(text):
        # Find next ' + ' that's not inside single-quoted string content
        # Simple heuristic: just split at ' + '
        next_plus = text.find(" + ", pos + 1)
        if next_plus == -1:
            segments.append(text[pos:])
            break
        segments.append(text[pos:next_plus])
        pos = next_plus + 3  # skip past ' + '
    
    if len(segments) <= 1:
        return None  # can't split
    
    # Group segments into lines under TARGET_LEN
    lines = []
    current = prefix + segments[0]
    cont_indent = prefix + '  '
    
    for seg in segments[1:]:
        test = current + ' + ' + seg
        if len(test.rstrip()) > TARGET_LEN and len(current.rstrip()) > 30:
            lines.append(current.rstrip() + ' +')
            current = cont_indent + seg
        else:
            current = test
    
    lines.append(current.rstrip())
    return '\n'.join(lines)


def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    changed = False
    new_lines = []
    
    for i, line in enumerate(lines):
        result = split_line(line)
        if result is not None:
            new_lines.extend(result.split('\n'))
            changed = True
        else:
            new_lines.append(line)
    
    if changed:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines) + '\n')
    
    # Verify no lines > MAX_LEN remain
    remaining = [(i+1, len(l)) for i, l in enumerate(new_lines) if len(l) > MAX_LEN]
    return changed, remaining


files = [
    'src/assets/js/home-core-products.js',
    'src/assets/js/case-grid.js',
    'src/assets/js/ui/footer.js',
    'src/assets/js/products.js',
    'src/assets/js/product-grid.js',
    'src/assets/js/cases-page.js',
    'src/assets/js/translations-dropdown-template.js',
]

for f in files:
    try:
        changed, remaining = process_file(f)
        if changed:
            print(f"FIXED: {f} ({len(remaining)} lines still > {MAX_LEN})")
            for ln, ll in remaining:
                print(f"  line {ln}: {ll} chars")
        else:
            print(f"OK: {f}")
    except Exception as e:
        print(f"ERROR: {f}: {e}")

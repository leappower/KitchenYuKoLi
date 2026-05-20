#!/usr/bin/env python3
"""
fix-html-fallback-en.py v2 — Text-level HTML replacement (preserves exact formatting)

Replaces ALL data-i18n fallback text in HTML with English translations.
Operates at the text level so file formatting is perfectly preserved.

Three cases:
1. Plain text (no child elements): replace entire inner text with en[key]
2. Has children + en[key] has HTML: replace innerHTML with en[key]  
3. Has children + en[key] is plain text: preserve child elements, replace text nodes
"""
import os, re, json, sys

EN_PATH = 'src/assets/lang/en-ui.json'
SRC_DIRS = ['src/pages', 'src/index.html', 'src/404.html']

with open(EN_PATH) as f:
    en = json.load(f)

stats = {
    'files_modified': 0,
    'files_skipped': 0,
    'simple_fixed': 0,
    'children_ok': 0,
    'children_html': 0,
    'children_text': 0,
}

def fix_html_file(filepath):
    """Process one HTML file, replacing Chinese fallback with English"""
    with open(filepath) as f:
        content = f.read()
    
    original = content
    data_i18n_pattern = re.compile(
        r'<(\w+)((?:\s[^>]*?)?)\sdata-i18n="([^"]+)"((?:\s[^>]*?)?)\s*>'
    )
    
    # Find all elements with data-i18n
    elements = []
    for m in re.finditer(data_i18n_pattern, content):
        tag = m.group(1)
        attrs_before = m.group(2)
        key = m.group(3)
        attrs_after = m.group(4)
        start_pos = m.end()  # Position right after >
        
        # Skip self-closing tags
        if content[start_pos:start_pos+1] == '/' or content[start_pos-1:start_pos+1] == '/>':
            continue
        
        # Find the closing tag
        # Use a simple counter approach for nested tags
        depth = 1
        pos = start_pos
        closing_tag = f'</{tag}'
        while pos < len(content) and depth > 0:
            next_open = content.find(f'<{tag}', pos, min(pos + 5000, len(content)))
            next_close = content.find(f'</{tag}', pos, min(pos + 5000, len(content)))
            
            if next_close == -1:
                break  # No closing tag found
            
            if next_open != -1 and next_open < next_close:
                # Nested opening tag of same type
                depth += 1
                pos = next_open + len(tag) + 1
            else:
                depth -= 1
                if depth == 0:
                    inner = content[start_pos:next_close]
                    close_end = content.find('>', next_close)
                    if close_end != -1:
                        elements.append({
                            'key': key,
                            'tag': tag,
                            'full_start': m.start(),
                            'full_end': close_end + 1,
                            'inner_start': start_pos,
                            'inner_end': next_close,
                            'inner': inner,
                        })
                        break
                pos = next_close + len(tag) + 2
        
    # Process elements in REVERSE order so positions stay valid
    elements.reverse()
    changed = False
    
    for el in elements:
        key = el['key']
        en_val = en.get(key)
        if en_val is None:
            continue
        
        inner = el['inner']
        has_children = bool(re.search(r'<[a-zA-Z]', inner))
        
        if not has_children:
            # Case 1: Simple text replacement
            # Clean up whitespace in inner
            inner_cleaned = inner.strip()
            # Find the actual text (between > and <), trimming whitespace
            new_inner = en_val
            # Preserve the original inner spacing (usually leading newline+spaces)
            leading_ws = re.match(r'^(\s*)', inner).group(1)
            trailing_ws = re.search(r'(\s*)$', inner).group(1)
            
            if leading_ws:
                new_inner = leading_ws + en_val
            if trailing_ws and trailing_ws != leading_ws:
                new_inner = new_inner + trailing_ws
            elif trailing_ws and new_inner == en_val:
                new_inner = new_inner + trailing_ws
            
            content = content[:el['inner_start']] + new_inner + content[el['inner_end']:]
            stats['simple_fixed'] += 1
            changed = True
            continue
        
        # Has children
        if re.search(r'<[a-zA-Z][\s\S]*>', en_val):
            # Case 2: EN has HTML → replace entire innerHTML
            new_inner = en_val
            content = content[:el['inner_start']] + new_inner + content[el['inner_end']:]
            stats['children_html'] += 1
        else:
            # Case 3: EN plain text, preserve children
            # Find child element boundaries in the inner content
            # Split inner by child element boundaries
            child_parts = re.split(r'(<[^>]+>[^<]*(?:</[^>]+>)?)', inner)
            child_elements = []
            text_nodes = []
            for part in child_parts:
                if part and re.search(r'<[a-zA-Z]', part) and '>' in part and part.strip():
                    child_elements.append(part)
                elif part.strip():
                    text_nodes.append(part)
            
            # Preserve children, clear text nodes
            if child_elements:
                # Rebuild: children + whitespace + english text
                new_inner = ''.join(child_elements)
                # Add english text after children
                if new_inner.strip():
                    new_inner += ' ' + en_val
                else:
                    new_inner = en_val
            else:
                new_inner = en_val
            
            content = content[:el['inner_start']] + new_inner + content[el['inner_end']:]
            stats['children_text'] += 1
        changed = True
    
    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
    
    return changed


def main():
    files_modified = 0
    files_scanned = 0
    
    for entry in SRC_DIRS:
        if entry.endswith('.html'):
            # Single file
            if os.path.exists(entry):
                files_scanned += 1
                try:
                    if fix_html_file(entry):
                        files_modified += 1
                        print(f"  ✅ {entry}")
                    else:
                        stats['files_skipped'] += 1
                except Exception as e:
                    print(f"  ❌ {entry}: {e}")
        else:
            # Directory
            for root, dirs, files in os.walk(entry):
                for fn in sorted(files):
                    if not fn.endswith('.html'):
                        continue
                    fp = os.path.join(root, fn)
                    rel = os.path.relpath(fp, '.')
                    files_scanned += 1
                    try:
                        if fix_html_file(fp):
                            files_modified += 1
                            print(f"  ✅ {rel}")
                        else:
                            stats['files_skipped'] += 1
                    except Exception as e:
                        print(f"  ❌ {rel}: {e}")
    
    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")
    print(f"  Files scanned:  {files_scanned}")
    print(f"  Modified:       {files_modified}")
    print(f"  Skipped:        {stats['files_skipped']}")
    print()
    print(f"  Elements fixed:")
    print(f"    Simple text:           {stats['simple_fixed']}")
    print(f"    Children + HTML en:    {stats['children_html']}")
    print(f"    Children + text en:    {stats['children_text']}")

if __name__ == '__main__':
    main()

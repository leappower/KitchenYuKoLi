#!/usr/bin/env python3
"""
fix-all-html-en.py v3 — Clean, correct, efficient.
"""
import os, re, json

EN_PATH = 'src/assets/lang/en-ui.json'

with open(EN_PATH) as f:
    en = json.load(f)

stats = {'files': 0, 'simple': 0, 'complex_html': 0, 'complex_text': 0, 'skipped': 0}

def extract_children(inner):
    """Extract child elements (full HTML tags with content). Returns list of outerHTML strings."""
    children = []
    pos = 0
    while pos < len(inner):
        # Find next opening tag
        tag_m = re.match(r'<\w+', inner[pos:])
        if not tag_m:
            break
        
        tag = tag_m.group(0)[1:]
        # Find end of opening tag
        open_end = inner.find('>', pos)
        if open_end == -1:
            break
        
        # Check if it's self-closing or void
        open_tag = inner[pos:open_end+1]
        if open_tag.rstrip().endswith('/') or tag in {'br','hr','img','input','meta','link'}:
            children.append(open_tag)
            pos = open_end + 1
            continue
        
        # Find closing tag
        close_tag = f'</{tag}>'
        close_pos = inner.find(close_tag, open_end)
        if close_pos == -1:
            children.append(open_tag)
            pos = open_end + 1
            continue
        
        # Found a complete child element
        child_html = inner[pos:close_pos + len(close_tag)]
        children.append(child_html)
        pos = close_pos + len(close_tag)
    
    return children

def find_closing(content, tag, start_pos, max_search=20000):
    depth = 1
    pos = start_pos
    search_end = min(pos + max_search, len(content))
    while pos < search_end and depth > 0:
        open_pos = content.find(f'<{tag}', pos, search_end)
        close_pos = content.find(f'</{tag}', pos, search_end)
        if close_pos == -1:
            return None
        if open_pos != -1 and open_pos < close_pos:
            depth += 1
            pos = open_pos + len(tag) + 1
        else:
            depth -= 1
            if depth == 0:
                return close_pos
            pos = close_pos + len(tag) + 2
    return None

def fix_file(filepath):
    with open(filepath) as f:
        content = f.read()
    changed = False
    
    # Collect replacements
    replacements = []
    pat = re.compile(r'<(\w+)([^>]*?)data-i18n="([^"]+)"([^>]*)>')
    
    for m in pat.finditer(content):
        tag = m.group(1)
        key = m.group(3)
        open_end = m.end()
        
        if tag in {'br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr'}:
            continue
        if not en.get(key):
            stats['skipped'] += 1
            continue
        
        close_pos = find_closing(content, tag, open_end)
        if close_pos is None:
            continue
        
        replacements.append({
            'key': key, 'en_val': en[key],
            'inner_start': open_end, 'close_pos': close_pos,
        })
    
    # Process in reverse
    for rep in reversed(replacements):
        inner = content[rep['inner_start']:rep['close_pos']]
        en_val = rep['en_val']
        has_children = bool(re.search(r'<[a-zA-Z]', inner))
        
        if not has_children:
            # Simple text replacement
            leading = re.match(r'^(\s*)', inner).group(1)
            trailing = re.search(r'(\s*)$', inner).group(1)
            new_inner = leading + en_val + trailing
            content = content[:rep['inner_start']] + new_inner + content[rep['close_pos']:]
            stats['simple'] += 1
            changed = True
            
        elif re.search(r'<[a-zA-Z][\s\S]*>', en_val):
            # EN has HTML — use as innerHTML
            content = content[:rep['inner_start']] + en_val + content[rep['close_pos']:]
            stats['complex_html'] += 1
            changed = True
            
        else:
            # Has children + EN plain text: keep children, append en_val
            children = extract_children(inner)
            # Build: whitespace + children + whitespace + en_val
            if children:
                child_html = ''.join(children)
                new_inner = child_html + '\n              ' + en_val
            else:
                new_inner = en_val
            
            content = content[:rep['inner_start']] + new_inner + content[rep['close_pos']:]
            stats['complex_text'] += 1
            changed = True
    
    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

modified = 0
scanned = 0
for root, dirs, files in os.walk('src/pages'):
    for fn in sorted(files):
        if not fn.endswith('.html'): continue
        fp = os.path.join(root, fn)
        scanned += 1
        if fix_file(fp):
            modified += 1
            print(f"  ✅ {os.path.relpath(fp, '.')}")

for fp in ['src/index.html', 'src/404.html']:
    if os.path.exists(fp):
        scanned += 1
        if fix_file(fp):
            modified += 1
            print(f"  ✅ {fp}")

print(f"\n{'='*50}")
print(f"Scanned: {scanned}, Modified: {modified}")
print(f"  Simple text:        {stats['simple']}")
print(f"  Complex + HTML en:  {stats['complex_html']}")
print(f"  Complex + text en:  {stats['complex_text']}")
print(f"  Skipped:            {stats['skipped']}")

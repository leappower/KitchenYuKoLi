#!/usr/bin/env python3
"""
Comprehensive fix for all fullwidth-bg / px / CSS padding inconsistencies.
Runs on all src/pages/**/*.html files.

Fix types:
  A: DOUBLE_PADDING → Remove section px, add fullwidth-bg + wrapper div with px
  B: MISSING_FULLWIDTH → bg/border sections without fullwidth-bg + CSS padding active
  C: NO_PX → fullwidth-bg sections where first content child has no px
  D: INCONSISTENT_PX → different px values across sibling fullwidth-bg sections

False positives to skip:
  - Badge/pill elements (rounded-full + bg-primary/10, inline-flex + gap-2)
  - Centered flex-wrap content (partner logos, links)
  - Sections with p-N (padding all sides, adequate for content)
  - Functional/app pages (products/compare, profit-calculator)
  - The right panel of flex-row sections (bg-slate-300 bg, intentionally edge-to-edge)
"""

import re, glob, sys

def has_css_padding(main_class):
    """Check if main#spa-content CSS padding is active."""
    if not main_class:
        return True  # no class → CSS padding applies
    return not any(x in main_class for x in ['p-', 'px-', 'py-'])

def is_badge_pill(cls):
    """Small badge/pill component - its px is intentional, not a wrapper."""
    return ('rounded-full' in cls or 'rounded-lg' in cls) and 'inline-flex' in cls

def is_centered_content(cls):
    """Centered flex content (partner logos, link rows) - no px needed."""
    return 'flex-wrap' in cls and 'justify-center' in cls

def has_p(cls):
    """Has any padding (including p-N)."""
    return bool(re.search(r'\bp-\d', cls))

def has_px(cls):
    """Has horizontal padding."""
    return bool(re.search(r'\bpx-\d', cls))

def get_px_values(cls):
    """Extract responsive px values: px-3, md:px-5, etc."""
    return re.findall(r'(?:\w+:)?px-(\d+\.?\d*)', cls)

def get_resp_px(screen):
    """Standard responsive px for a screen."""
    if screen == 'mobile':
        return 'px-3'
    return 'px-3 md:px-5 lg:px-5 xl:px-10'

# Pages to skip (functional/app pages with their own layout system)
SKIP_PAGES = {
    'products/compare',
    'products/detail',
    'quote',
    'thank-you',
}

# Regex patterns
SECTION_RE = re.compile(r'<section\s([^>]*)>')
DIV_OPEN_RE = re.compile(r'<div\s([^>]*)>')
DIV_CLOSE_RE = re.compile(r'</div>')

def find_section_end(lines, start):
    """Find the line index of </section> matching the <section at start."""
    depth = 1
    i = start
    while i + 1 < len(lines) and depth > 0:
        i += 1
        line = lines[i]
        depth += len(re.findall(r'<section\b', line))
        depth -= len(re.findall(r'</section>', line))
    return i

def get_section_class(line):
    m = SECTION_RE.match(line.strip())
    if not m:
        return None, None
    attrs = m.group(1)
    cls_m = re.search(r'class="([^"]*)"', attrs)
    return attrs, cls_m.group(1) if cls_m else ''

def process_file(filepath):
    screen = 'pc' if '-pc.html' in filepath else 'tablet' if '-tablet.html' in filepath else 'mobile'
    page = filepath.replace('src/pages/', '').replace(f'/index-{screen}.html', '')
    
    if page in SKIP_PAGES:
        return 0
    
    with open(filepath) as f:
        lines = f.readlines()
    
    # Check main CSS padding
    main_cls = ''
    for line in lines:
        m = re.search(r'<main[^>]*class="([^"]*)"', line)
        if m:
            main_cls = m.group(1)
            break
    css_pad = has_css_padding(main_cls)
    
    if not css_pad:
        return 0  # main has its own padding, fullwidth-bg not applicable
    
    fixes = 0
    content = ''.join(lines)
    new_lines = lines[:]
    
    i = 0
    while i < len(new_lines):
        line = new_lines[i]
        stripped = line.strip()
        
        m = SECTION_RE.match(stripped)
        if not m:
            i += 1
            continue
        
        attrs, sec_cls = get_section_class(stripped)
        if sec_cls is None:
            i += 1
            continue
        
        end_i = find_section_end(new_lines, i)
        sec_block = ''.join(new_lines[i:end_i+1])
        
        has_fw = 'fullwidth-bg' in sec_cls
        has_bg = bool(re.search(r'\bbg-[a-z]', sec_cls)) or 'bg-gradient' in sec_cls
        has_border_y = bool(re.search(r'\bborder-[ty]', sec_cls))
        sec_has_px = has_px(sec_cls)
        
        # Find first content child div (non-absolute, non-hidden)
        inner = sec_block[sec_block.index('>')+1:]
        divs = DIV_OPEN_RE.findall(inner)
        content_divs = [d for d in divs if 'absolute' not in d and 'fixed' not in d and 'hidden' not in d]
        
        first_child_cls = content_divs[0] if content_divs else None
        first_child_px = has_px(first_child_cls) if first_child_cls else False
        
        # ═══════════════════════════════════════════════════════
        # FIX A: Section has px + CSS padding active → DOUBLE PADDING
        # ═══════════════════════════════════════════════════════
        if sec_has_px and css_pad:
            # Extract px values from section
            px_vals = re.findall(r'((?:\w+:)?px-\d+(?:\.\d+)?)', sec_cls)
            if px_vals:
                # Remove px from section, add fullwidth-bg
                new_sec_cls = sec_cls
                for pv in px_vals:
                    new_sec_cls = new_sec_cls.replace(pv, '').strip()
                new_sec_cls = re.sub(r'\s+', ' ', new_sec_cls)
                if not has_fw:
                    new_sec_cls = new_sec_cls.rstrip() + ' fullwidth-bg'
                
                # Find indentation of first content element
                inner_lines = [new_lines[j] for j in range(i+1, end_i)]
                content_text = ''.join(inner_lines).strip()
                if content_text:
                    # Detect indent
                    indent = ''
                    for cl in inner_lines:
                        stripped_cl = cl.rstrip()
                        if stripped_cl and not stripped_cl.startswith('<!--'):
                            indent_match = re.match(r'^(\s+)', cl)
                            indent = indent_match.group(1) if indent_match else '          '
                            break
                    
                    px_str = ' '.join(px_vals)
                    wrapper = f'{indent}<div class="{px_str}">\n'
                    wrapper_close = f'{indent}</div>\n'
                    
                    # Replace section opening line
                    old_line = new_lines[i].rstrip()
                    new_line = old_line.replace(f'class="{sec_cls}"', f'class="{new_sec_cls}"')
                    new_lines[i] = new_line + '\n'
                    
                    # Wrap content
                    # Find first real content line after section open
                    first_content = i + 1
                    while first_content < end_i:
                        fc = new_lines[first_content].strip()
                        if fc and not fc.startswith('<!--') and not fc.startswith('</section'):
                            break
                        first_content += 1
                    
                    # Find last real content line before section close
                    last_content = end_i
                    while last_content > first_content:
                        lc = new_lines[last_content].strip()
                        if lc and not lc.startswith('<!--') and not lc.startswith('</section'):
                            break
                        last_content -= 1
                    
                    # Insert wrapper open before first content
                    new_lines.insert(first_content, wrapper)
                    # Insert wrapper close after last content
                    new_lines.insert(last_content + 2, wrapper_close)
                    
                    end_i += 2  # account for inserted lines
                    fixes += 1
        
        # ═══════════════════════════════════════════════════════
        # FIX B: bg/border section without fullwidth-bg + CSS padding
        # ═══════════════════════════════════════════════════════
        elif (has_bg or has_border_y) and not has_fw and css_pad:
            # Add fullwidth-bg to section
            if first_child_px:
                # Content already has px, just add fullwidth-bg
                new_lines[i] = new_lines[i].replace(
                    f'class="{sec_cls}"',
                    f'class="{sec_cls} fullwidth-bg"'
                )
                fixes += 1
            elif first_child_cls and has_p(first_child_cls):
                # Content has p-N which includes px, just add fullwidth-bg
                new_lines[i] = new_lines[i].replace(
                    f'class="{sec_cls}"',
                    f'class="{sec_cls} fullwidth-bg"'
                )
                fixes += 1
            else:
                # Need fullwidth-bg AND wrap content with px
                resp_px = get_resp_px(screen)
                new_lines[i] = new_lines[i].replace(
                    f'class="{sec_cls}"',
                    f'class="{sec_cls} fullwidth-bg"'
                )
                # Wrap first content child div's content with px
                inner_lines = [new_lines[j] for j in range(i+1, end_i)]
                content_text = ''.join(inner_lines).strip()
                if content_text:
                    indent = ''
                    for cl in inner_lines:
                        stripped_cl = cl.rstrip()
                        if stripped_cl and not stripped_cl.startswith('<!--'):
                            indent_match = re.match(r'^(\s+)', cl)
                            indent = indent_match.group(1) if indent_match else '          '
                            break
                    
                    wrapper = f'{indent}<div class="{resp_px}">\n'
                    wrapper_close = f'{indent}</div>\n'
                    
                    first_content = i + 1
                    while first_content < end_i:
                        fc = new_lines[first_content].strip()
                        if fc and not fc.startswith('<!--'):
                            break
                        first_content += 1
                    
                    last_content = end_i
                    while last_content > first_content:
                        lc = new_lines[last_content].strip()
                        if lc and not lc.startswith('<!--'):
                            break
                        last_content -= 1
                    
                    new_lines.insert(first_content, wrapper)
                    new_lines.insert(last_content + 2, wrapper_close)
                    end_i += 2
                    fixes += 1
        
        # ═══════════════════════════════════════════════════════
        # FIX C: fullwidth-bg without content px (no p- either)
        # ═══════════════════════════════════════════════════════
        elif has_fw and not first_child_px and not sec_has_px:
            if first_child_cls and not has_p(first_child_cls):
                # Check if content div is a centered layout (skip those)
                if is_centered_content(first_child_cls):
                    pass  # centered content, px not needed
                elif is_badge_pill(first_child_cls):
                    pass  # badge, not a wrapper
                else:
                    # Need to add px to first content child or wrap
                    # Check if this is just a structural container
                    resp_px = get_resp_px(screen)
                    inner_lines = [new_lines[j] for j in range(i+1, end_i)]
                    content_text = ''.join(inner_lines).strip()
                    if content_text and len(content_text) > 20:
                        # Add px to the section itself (simplest approach)
                        indent = ''
                        for cl in inner_lines:
                            stripped_cl = cl.rstrip()
                            if stripped_cl and not stripped_cl.startswith('<!--'):
                                indent_match = re.match(r'^(\s+)', cl)
                                indent = indent_match.group(1) if indent_match else '          '
                                break
                        
                        wrapper = f'{indent}<div class="{resp_px}">\n'
                        wrapper_close = f'{indent}</div>\n'
                        
                        first_content = i + 1
                        while first_content < end_i:
                            fc = new_lines[first_content].strip()
                            if fc and not fc.startswith('<!--'):
                                break
                            first_content += 1
                        
                        last_content = end_i
                        while last_content > first_content:
                            lc = new_lines[last_content].strip()
                            if lc and not lc.startswith('<!--'):
                                break
                            last_content -= 1
                        
                        new_lines.insert(first_content, wrapper)
                        new_lines.insert(last_content + 2, wrapper_close)
                        end_i += 2
                        fixes += 1
        
        i = end_i + 1
    
    if fixes > 0:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
    
    return fixes

total = 0
fixed_files = []
for f in sorted(glob.glob('src/pages/**/index-*.html', recursive=True)):
    n = process_file(f)
    if n > 0:
        total += n
        fixed_files.append((f, n))

print(f"\n{'='*60}")
print(f"Fixed {total} issues across {len(fixed_files)} files")
print(f"{'='*60}")
for f, n in sorted(fixed_files):
    print(f"  {n:3d} fixes: {f}")

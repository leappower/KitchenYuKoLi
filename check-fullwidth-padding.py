#!/usr/bin/env python3
"""
Check fullwidth-bg sections for missing standard content padding.

Standard padding wrapper should contain one of:
  - px-3 md:px-5 lg:px-5 xl:px-10  (site standard)
  - px-3 (mobile minimum)

For each fullwidth-bg <section>, we check if the FIRST child element
within the section has horizontal padding (px-* class).
"""

import re, os, glob

STANDARD_PX = re.compile(r'px-[0-9]')
SITE_STD = re.compile(r'px-3\s+md:px-5|md:px-5\s+lg:px-5|lg:px-5\s+xl:px-10')

def check_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find all fullwidth-bg sections
    # Match from <section ... fullwidth-bg ...> to </section>
    issues = []
    
    # Split by section tags
    sections = re.finditer(
        r'<section\b[^>]*fullwidth-bg[^>]*>(.*?)</section>',
        content, re.DOTALL
    )
    
    for i, m in enumerate(sections):
        inner = m.group(1).strip()
        if not inner:
            continue
        
        # Check first 200 chars for any px- class
        head = inner[:500]
        
        # Check if any direct child has px- padding
        has_px = bool(STANDARD_PX.search(head))
        
        # Check for specific patterns:
        # 1. Section itself has px- (wrong - bg should be edge-to-edge)
        # 2. First child div has standard px- (correct)
        # 3. No px- at all in first 500 chars (problem)
        
        if not has_px:
            # Find the first tag inside
            first_tag = re.search(r'<([a-z][a-z0-9]*)\b[^>]*class="([^"]*)"', inner)
            tag_name = first_tag.group(1) if first_tag else '?'
            tag_class = first_tag.group(2) if first_tag else ''
            
            # Get line number
            line_no = content[:m.start()].count('\n') + 1
            
            issues.append({
                'file': os.path.basename(filepath),
                'line': line_no,
                'first_tag': f'<{tag_name}>',
                'first_class': tag_class[:60],
                'preview': inner[:80].replace('\n', ' ').strip()
            })
    
    return issues

# Scan all HTML files
all_issues = []
for f in sorted(glob.glob('src/pages/**/*.html', recursive=True)):
    issues = check_file(f)
    for iss in issues:
        iss['filepath'] = f
        all_issues.append(iss)

# Group by file
by_file = {}
for iss in all_issues:
    fp = iss['filepath']
    if fp not in by_file:
        by_file[fp] = []
    by_file[fp].append(iss)

print(f"=== FULLWIDTH-BG PADDING AUDIT ===\n")
print(f"Total sections missing padding: {len(all_issues)}")
print(f"Files affected: {len(by_file)}\n")

for fp in sorted(by_file.keys()):
    issues = by_file[fp]
    device = '???'
    if 'index-pc' in fp: device = 'PC'
    elif 'index-tablet' in fp: device = 'TABLET'
    elif 'index-mobile' in fp: device = 'MOBILE'
    
    section_name = fp.replace('src/pages/', '').replace('/index-' + device.lower(), '').replace('/index', '')
    
    print(f"\n{'─'*60}")
    print(f"📄 {section_name} [{device}] — {len(issues)} issue(s)")
    for iss in issues:
        print(f"   L{iss['line']:3d} │ {iss['first_tag']} {iss['first_class'][:40]}")
        print(f"         │ {iss['preview'][:60]}")

print(f"\n{'═'*60}")
print(f"Summary: {len(all_issues)} fullwidth-bg sections without standard padding")
print(f"         across {len(by_file)} files")

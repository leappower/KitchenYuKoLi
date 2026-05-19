#!/usr/bin/env python3
"""Fix div tag imbalance in HTML files by analyzing sections and adding missing <div> opens."""

import re
import sys

DIV_OPEN_RE = re.compile(r'<div[\s>]')
DIV_CLOSE_RE = re.compile(r'</div>')


def count_divs(text):
    opens = len(DIV_OPEN_RE.findall(text))
    closes = len(DIV_CLOSE_RE.findall(text))
    return opens, closes


def trace_depth(text):
    """Trace div depth line by line, return list of (line_num, depth, line_content)."""
    lines = text.split('\n')
    result = []
    depth = 0
    for i, line in enumerate(lines, 1):
        opens = len(DIV_OPEN_RE.findall(line))
        closes = len(DIV_CLOSE_RE.findall(line))
        # Process opens first (self-closing divs don't exist, so opens increase depth)
        depth += opens
        result.append((i, depth, line.rstrip()))
        depth -= closes
    return result


def split_sections(text):
    """Split text into sections: before first <section>, each <section>...</section>, after last </section>."""
    # Find all section boundaries
    section_opens = [(m.start(), m.end()) for m in re.finditer(r'<section[\s>]', text)]
    section_closes = [(m.start(), m.end()) for m in re.finditer(r'</section>', text)]
    
    if not section_opens:
        return [(text, "pre-section")]
    
    sections = []
    # Before first section
    if section_opens[0][0] > 0:
        sections.append((text[:section_opens[0][0]], "pre-section"))
    
    # Each section (matched open/close pairs)
    for idx, (s_open_start, s_open_end) in enumerate(section_opens):
        if idx < len(section_closes):
            s_close_start, s_close_end = section_closes[idx]
            section_text = text[s_open_start:s_close_end]
            sections.append((section_text, f"section-{idx+1}"))
        else:
            # Unmatched section open - take till end
            sections.append((text[s_open_start:], f"section-{idx+1}"))
    
    # After last section close
    last_close_end = section_closes[-1][1] if section_closes else 0
    if last_close_end > 0 and last_close_end < len(text):
        sections.append((text[last_close_end:], "post-section"))
    
    return sections


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    opens, closes = count_divs(content)
    diff = closes - opens  # positive means too many closes
    
    print(f"\n{'='*60}")
    print(f"File: {filepath}")
    print(f"Opens: {opens}, Closes: {closes}, Diff (closes-opens): {diff}")
    
    if diff == 0:
        print("Already balanced!")
        return True
    
    # Split into sections and find imbalanced ones
    sections = split_sections(content)
    print(f"\nSection analysis:")
    
    imbalanced_sections = []
    for section_text, section_name in sections:
        s_opens, s_closes = count_divs(section_text)
        s_diff = s_closes - s_opens
        status = "OK" if s_diff == 0 else f"IMBALANCED (diff={s_diff})"
        print(f"  {section_name}: opens={s_opens}, closes={s_closes} - {status}")
        if s_diff != 0:
            imbalanced_sections.append((section_name, section_text, s_diff))
    
    # Trace depth in each imbalanced section to find where it goes wrong
    for section_name, section_text, s_diff in imbalanced_sections:
        print(f"\n  Tracing depth in {section_name} (diff={s_diff}):")
        trace = trace_depth(section_text)
        min_depth = min(t[1] for t in trace)
        
        # Find lines where depth dips to min or below expected
        for line_num, depth, line in trace:
            if depth < 0 or (min_depth < 0 and depth <= min_depth):
                print(f"    Line {line_num} (depth={depth}): {line[:100]}")
            # Also show where depth is 0 at the start/end of section
            if section_text.startswith('<section') and depth <= 0 and line_num <= 3:
                print(f"    [EARLY] Line {line_num} (depth={depth}): {line[:100]}")
    
    # Strategy: For each imbalanced section, we need to add <div> opens to compensate
    # The approach: find where depth goes negative and insert <div> before those closes
    
    if diff > 0:
        # Too many </div> - need to add <div> opens
        # Simplest approach: add missing <div> at the start of sections that are imbalanced
        # We'll add them right after the <section...> tag opening
        
        lines = content.split('\n')
        fix_insertions = []  # (line_index, text_to_insert_before_line)
        
        # Re-analyze with full file depth tracking
        full_trace = trace_depth(content)
        full_depths = [t[1] for t in full_trace]
        
        # Find the first line where depth goes negative
        remaining_fixes = diff
        # Track cumulative depth across the file
        cumulative = 0
        insert_points = []
        
        for i, line in enumerate(lines):
            opens_here = len(DIV_OPEN_RE.findall(line))
            closes_here = len(DIV_CLOSE_RE.findall(line))
            
            new_cumulative = cumulative + opens_here
            
            # If after processing opens, adding closes would bring us negative
            if new_cumulative - closes_here < 0 and remaining_fixes > 0:
                # Need to add <div> before this line
                indent = len(line) - len(line.lstrip())
                insert_points.append((i, ' ' * indent + '<div>'))
                remaining_fixes -= 1
                cumulative = new_cumulative + 1 - closes_here  # +1 for the inserted div
            else:
                cumulative = new_cumulative - closes_here
            
            if remaining_fixes <= 0:
                break
        
        if remaining_fixes > 0:
            print(f"  WARNING: Could not find all fix points! {remaining_fixes} remaining.")
            return False
        
        # Apply insertions (in reverse to preserve line numbers)
        for line_idx, insert_text in reversed(insert_points):
            lines.insert(line_idx, insert_text)
        
        fixed_content = '\n'.join(lines)
        
        # Verify
        f_opens, f_closes = count_divs(fixed_content)
        if f_opens == f_closes:
            print(f"\n  FIXED! New counts: opens={f_opens}, closes={f_closes}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        else:
            print(f"\n  FAILED after fix! New counts: opens={f_opens}, closes={f_closes}, diff={f_closes-f_opens}")
            return False
    
    elif diff < 0:
        # Too many <div> - need to add </div> closes
        print(f"  Need to add {-diff} </div> closes")
        # This is unlikely based on the task description but handle it
        
        lines = content.split('\n')
        remaining_fixes = -diff
        cumulative = 0
        insert_points = []
        
        # Find where sections end but depth is still positive
        section_close_positions = [m.start() for m in re.finditer(r'</section>', content)]
        
        # Track line by line, find </section> lines where depth > 0
        for i, line in enumerate(lines):
            opens_here = len(DIV_OPEN_RE.findall(line))
            closes_here = len(DIV_CLOSE_RE.findall(line))
            cumulative += opens_here
            
            if '</section>' in line and cumulative > 0 and remaining_fixes > 0:
                # Need </div> before this </section>
                indent = len(line) - len(line.lstrip())
                insert_points.append((i, ' ' * indent + '</div>'))
                remaining_fixes -= 1
                cumulative -= 1
            
            cumulative -= closes_here
            
            if remaining_fixes <= 0:
                break
        
        if remaining_fixes > 0:
            print(f"  WARNING: Could not find all fix points! {remaining_fixes} remaining.")
            return False
        
        # Apply insertions (in reverse)
        for line_idx, insert_text in reversed(insert_points):
            lines.insert(line_idx, insert_text)
        
        fixed_content = '\n'.join(lines)
        
        f_opens, f_closes = count_divs(fixed_content)
        if f_opens == f_closes:
            print(f"\n  FIXED! New counts: opens={f_opens}, closes={f_closes}")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        else:
            print(f"\n  FAILED after fix! New counts: opens={f_opens}, closes={f_closes}, diff={f_closes-f_opens}")
            return False
    
    return True


if __name__ == '__main__':
    base = '/Users/chee/Projects/KitchenYuKoLi/src/pages/support'
    files = [
        f'{base}/spare-parts/index-pc.html',
        f'{base}/installation/index-pc.html',
        f'{base}/warranty/index-pc.html',
    ]
    
    results = {}
    for f in files:
        results[f] = fix_file(f)
    
    print(f"\n{'='*60}")
    print("SUMMARY:")
    all_ok = True
    for f, ok in results.items():
        status = "✅ OK" if ok else "❌ FAIL"
        print(f"  {status}: {f}")
        if not ok:
            all_ok = False
    
    sys.exit(0 if all_ok else 1)

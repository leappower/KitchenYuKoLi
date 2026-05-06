#!/usr/bin/env python3
"""Fix long lines in products.js - v6: avoid splits near backslash."""
import subprocess

filepath = 'src/assets/js/products.js'

with open(filepath, 'r') as f:
    lines = f.readlines()

def split_line_very_safe(line, max_line=300, target=250):
    if len(line.rstrip()) <= max_line:
        return None
    
    # Find ' + ' positions
    splits = []
    pos = 0
    while True:
        idx = line.find(" + ", pos)
        if idx == -1:
            break
        # Check chars around the split
        before = line[idx-1] if idx > 0 else ''
        after_char = line[idx+3] if idx+3 < len(line) else ''
        # Skip if before or after is a backslash (escape sequence boundary)
        if before == '\\' or after_char == '\\':
            pos = idx + 3
            continue
        splits.append(idx)
        pos = idx + 3
    
    if not splits:
        return None
    
    segments = []
    last = 0
    for s in splits:
        segments.append(line[last:s])
        last = s + 3
    segments.append(line[last:])
    
    if len(segments) <= 1:
        return None
    
    indent = len(line) - len(line.lstrip())
    result = []
    current = segments[0]
    for seg in segments[1:]:
        test = current + " + " + seg
        if len(test.rstrip()) > target and len(current.strip()) > 20:
            result.append(current.rstrip() + " +")
            current = " " * (indent + 4) + seg
        else:
            current = test
    result.append(current.rstrip())
    
    # Verify each line is <= max_line
    for r in result:
        if len(r) > max_line:
            return None
    
    return "\n".join(result) + "\n"

# Fix line 589
new = split_line_very_safe(lines[588])
if new:
    lines[588] = new
    print("Fixed line 589")
else:
    print("WARNING: Could not fix line 589 with safe splits")
    # Show why
    pos = 0
    while True:
        idx = lines[588].find(" + ", pos)
        if idx == -1:
            break
        before = lines[588][idx-1] if idx > 0 else ''
        after_char = lines[588][idx+3] if idx+3 < len(lines[588]) else ''
        print(f"  Split at {idx}: before={repr(before)} after={repr(after_char)} safe={before != chr(92) and after_char != chr(92)}")
        pos = idx + 3

# Fix line 592
for i in range(len(lines)):
    if 'data-action="show-popup"' in lines[i] and len(lines[i].rstrip()) > 300:
        new = split_line_very_safe(lines[i])
        if new:
            lines[i] = new
            print(f"Fixed button line")
        else:
            print(f"WARNING: Could not fix button line")
        break

with open(filepath, 'w') as f:
    f.writelines(lines)

r = subprocess.run(['node', '--check', filepath], capture_output=True, text=True)
if r.returncode == 0:
    print("SYNTAX OK")
    with open(filepath) as f:
        for i, line in enumerate(f, 1):
            if len(line.rstrip('\n')) > 300:
                print("  Still long: line {}: {} chars".format(i, len(line.rstrip('\n'))))
else:
    print("SYNTAX ERROR:", r.stderr[:500])
    subprocess.run(['git', 'checkout', filepath])
    print("Reverted!")

#!/usr/bin/env python3
"""
fix-zhcn-story-html.py — Recover full Chinese story paragraphs from git history.

Problem: zh-CN-ui.json only stored the FIRST text node of story paragraphs
that have child HTML elements. When switching to zh-CN, only that first
text node gets replaced, leaving English text in remaining nodes.

Fix: Recover the full innerHTML with child elements from original HTML files.
"""
import json, re, subprocess, os, sys

GIT_BASE = 'HEAD'  # Starting point to search backward

# Story keys that need fixing (EN has HTML mode, ZH doesn't)
with open('src/assets/lang/en-ui.json') as f:
    en = json.load(f)
with open('src/assets/lang/zh-CN-ui.json') as f:
    zh = json.load(f)

html_story_keys = sorted([k for k in en if '_story_p' in k and re.search(r'<[a-zA-Z]', en.get(k, ''))])

# For each key, figure out which file contains it
# Pattern: cases_{city}_story_p{N}
def key_to_filepath(key):
    parts = key.split('_')
    city = parts[1]
    return f'src/pages/cases/{city}/index-pc.html'

def extract_original_innerhtml(filepath, key, git_ref):
    """Extract the original innerHTML of a data-i18n element from git history."""
    try:
        content = subprocess.check_output(
            ['git', 'show', f'{git_ref}:{filepath}'],
            stderr=subprocess.DEVNULL
        ).decode('utf-8')
    except:
        return None
    
    # Find the element
    # Pattern: <tag ... data-i18n="KEY" ...> INNERHTML </tag>
    m = re.search(
        rf'<(\w+)(?:[^>]*?)data-i18n="{re.escape(key)}"(?:[^>]*)>',
        content
    )
    if not m:
        return None
    
    tag = m.group(1)
    inner_start = m.end()
    
    # Find closing tag using depth counter
    depth = 1
    pos = inner_start
    while pos < len(content) and depth > 0:
        next_open = content.find(f'<{tag}', pos)
        next_close = content.find(f'</{tag}', pos)
        if next_close == -1:
            return None
        if next_open != -1 and next_open < next_close:
            depth += 1
            pos = next_open + len(tag) + 1
        else:
            depth -= 1
            if depth == 0:
                inner = content[inner_start:next_close]
                return inner.strip()
            pos = next_close + len(tag) + 2
    
    return None

# Search from HEAD backward for the HTML content
# Try increasingly older commits
fixed = 0
for key in html_story_keys:
    fp = key_to_filepath(key)
    
    # Search git history
    found = None
    for i in range(30):  # Check up to 30 commits back
        try:
            inner = extract_original_innerhtml(fp, key, f'HEAD~{i}')
            if inner:
                # Check if it has Chinese text (meaning it's the original, not our EN fix)
                if re.search(r'[\u4e00-\u9fff]', inner):
                    found = inner
                    break
        except:
            continue
    
    if found:
        zh[key] = found
        fixed += 1
        print(f"  ✅ {key}: recovered {len(found)} chars from HEAD~{i}")
    else:
        print(f"  ❌ {key}: could not recover Chinese text")
        print(f"     File: {fp}")

print(f"\nRecovered: {fixed}/{len(html_story_keys)}")

# Write updated zh-CN
with open('src/assets/lang/zh-CN-ui.json', 'w') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print(f"\n✅ zh-CN-ui.json updated ({len(zh)} keys)")

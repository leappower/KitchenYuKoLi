#!/usr/bin/env python3
"""Test: just process compare-pc.html to find elements needing i18n."""
import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Tag
from collections import OrderedDict

SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "meta", "link"}

def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

filepath = 'src/pages/products/compare/index-pc.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

soup = BeautifulSoup(content, 'html.parser')

def is_inside_skip(el):
    for parent in el.parents:
        if not isinstance(parent, Tag):
            continue
        if parent.name in SKIP_TAGS:
            return True
        if parent.get("type") == "application/ld+json":
            return True
    return False

results = []
for el in soup.find_all(True):
    if el.name in SKIP_TAGS:
        continue
    if el.name == "title":
        continue
    if el.get("type") == "application/ld+json":
        continue
    if is_inside_skip(el):
        continue
    if el.get("data-i18n"):
        continue
    
    if el.name == "option":
        text = el.get_text(strip=True)
        if has_chinese(text):
            results.append((el, "option", text))
        continue
    
    direct_chinese = False
    has_child_tags = False
    for child in el.children:
        if isinstance(child, NavigableString) and not isinstance(child, Comment):
            if has_chinese(str(child)):
                direct_chinese = True
        elif isinstance(child, Tag) and child.name not in SKIP_TAGS:
            has_child_tags = True
    
    if not direct_chinese:
        continue
    
    text = el.get_text(strip=True)
    if not has_child_tags:
        results.append((el, "text", text))
    else:
        results.append((el, "mixed", text))

print(f"Found {len(results)} elements")
for el, t, text in results:
    print(f"  [{t}] {el.name}: {text[:80]}")

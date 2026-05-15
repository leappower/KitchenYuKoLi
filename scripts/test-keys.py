#!/usr/bin/env python3
"""Test: just process compare-pc.html with key generation."""
import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Tag
from collections import OrderedDict

SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "meta", "link"}

def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def generate_key(prefix, counter, text_hint=""):
    clean = re.sub(r'<[^>]+>', '', text_hint).strip() if text_hint else ""
    h = abs(hash(clean)) % 10000 if clean else counter
    return f"{prefix}_{h}"

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

elements = []
seen = set()
for el in soup.find_all(True):
    if el.name in SKIP_TAGS:
        continue
    if el.name == "title":
        continue
    if el.get("type") == "application/ld+json":
        continue
    if is_inside_skip(el):
        continue
    if id(el) in seen:
        continue
    if el.get("data-i18n"):
        continue
    if el.name == "option":
        text = el.get_text(strip=True)
        if has_chinese(text):
            elements.append((el, "option", text))
            seen.add(id(el))
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
        elements.append((el, "text", text))
    else:
        elements.append((el, "mixed", text))
    seen.add(id(el))

print(f"Found {len(elements)} elements")

# Now generate keys (same logic as process_file)
file_new_keys = OrderedDict()
counter = 0
used_keys = set()

for el, i18n_type, text_hint in elements:
    print(f"  Processing: [{i18n_type}] {text_hint[:60]}", flush=True)
    clean_text = re.sub(r'<[^>]+>', '', text_hint).strip()
    
    key = generate_key("compare_pc", counter, clean_text)
    actual_key = key + "_text" if i18n_type == "mixed" else key
    
    iterations = 0
    while actual_key in used_keys:
        counter += 1
        key = generate_key("compare_pc", counter, clean_text)
        actual_key = key + "_text" if i18n_type == "mixed" else key
        iterations += 1
        if iterations > 100:
            print(f"    INFINITE LOOP DETECTED! Breaking.", flush=True)
            break
    
    file_new_keys[actual_key] = {"zh": clean_text, "en": "", "type": i18n_type}
    used_keys.add(actual_key)
    counter += 1
    print(f"    → {actual_key}", flush=True)

print(f"\nGenerated {len(file_new_keys)} keys")

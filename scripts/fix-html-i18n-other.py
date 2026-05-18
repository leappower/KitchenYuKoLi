#!/usr/bin/env python3
"""
Fix i18n data-i18n attributes on remaining HTML pages for KitchenYuKoLi project.
Handles: cases pages, compare, support, quote, landing, about, home pages.

Adds data-i18n="key" to elements with hardcoded Chinese text that are missing i18n.
Uses BeautifulSoup for HTML parsing and SiliconFlow API for translations.
"""

import json
import os
import re
import sys
import requests
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Tag
from collections import OrderedDict

# ─── Config ───────────────────────────────────────────────────────────────
PROJECT = Path("/Users/chee/Projects/KitchenYuKoLi")
SRC = PROJECT / "src"
LANG_DIR = SRC / "assets" / "lang"
EN_JSON = LANG_DIR / "en-ui.json"
ZH_JSON = LANG_DIR / "zh-CN-ui.json"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

SKIP_TAGS = {"script", "style", "noscript", "template", "svg", "meta", "link"}

# ─── Helpers ──────────────────────────────────────────────────────────────

def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f, object_pairs_hook=OrderedDict)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def translate_batch(texts_zh):
    """Translate Chinese texts to English using SiliconFlow API."""
    if not texts_zh:
        return {}
    
    lines = []
    for i, t in enumerate(texts_zh):
        clean = re.sub(r'<[^>]+>', '', t).strip()
        lines.append(f"{i}. {clean}")
    
    prompt = (
        "Translate the following Chinese UI texts to English. "
        "Keep it natural and concise for a commercial kitchen equipment website. "
        "Keep product names, brand names, and abbreviations as-is. "
        "Output one line per item in format: NUMBER. ENGLISH_TRANSLATION\n\n"
        + "\n".join(lines)
    )
    
    try:
        resp = requests.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 4096,
            },
            timeout=60,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        
        translations = {}
        for line in content.strip().split("\n"):
            m = re.match(r'^(\d+)\.\s*(.+)$', line.strip())
            if m:
                idx = int(m.group(1))
                translations[idx] = m.group(2).strip()
        
        return translations
    except Exception as e:
        print(f"  ⚠ Translation API error: {e}", flush=True)
        return {}

# ─── Key generation ───────────────────────────────────────────────────────

def generate_key(prefix, counter):
    """Generate a key from prefix + counter."""
    return f"{prefix}_{counter}"

# ─── Core: Find elements needing i18n ────────────────────────────────────

def is_inside_skip(el):
    """Check if element is inside a skipped parent (script/style/ld+json)."""
    for parent in el.parents:
        if not isinstance(parent, Tag):
            continue
        if parent.name in SKIP_TAGS:
            return True
        if parent.get("type") == "application/ld+json":
            return True
    return False

def find_elements_needing_i18n(soup):
    """
    Find elements with Chinese text missing data-i18n.
    Returns list of (target, type, text_hint, parent_context):
    - target: the NavigableString to wrap (for mixed/text_node) or the Tag (for text/option/etc)
    - type: 'text_node' (wrap NavigableString in span), 'text', 'option', 'alt', 'placeholder', 'number_unit'
    - text_hint: the Chinese text
    - parent_context: the parent Tag (for text_node type)
    """
    results = []
    seen_tags = set()
    seen_text_nodes = set()
    
    for el in soup.find_all(True):
        if el.name in SKIP_TAGS:
            continue
        if el.name == "title":
            continue
        if el.get("type") == "application/ld+json":
            continue
        if is_inside_skip(el):
            continue
        if id(el) in seen_tags:
            continue
        
        # <img alt="中文">
        if el.name == "img" and el.get("alt") and has_chinese(el["alt"]):
            if not el.get("data-i18n-alt"):
                results.append((el, "alt", el["alt"], None))
                seen_tags.add(id(el))
            continue
        
        # <input/textarea placeholder="中文">
        if el.name in ("input", "textarea") and el.get("placeholder") and has_chinese(el["placeholder"]):
            if not el.get("data-i18n-placeholder"):
                results.append((el, "placeholder", el["placeholder"], None))
                seen_tags.add(id(el))
            continue
        
        # <option> with Chinese text
        if el.name == "option":
            text = el.get_text(strip=True)
            if has_chinese(text) and not el.get("data-i18n"):
                results.append((el, "option", text, None))
                seen_tags.add(id(el))
            continue
        
        # Skip if already has data-i18n
        if el.get("data-i18n"):
            continue
        
        # Check for number-unit pattern: "1<span>年</span>"
        children = list(el.children)
        if len(children) == 2:
            c1, c2 = children
            if (isinstance(c1, NavigableString) and isinstance(c2, Tag) and
                c2.name == "span" and isinstance(c2.string, str)):
                t1 = c1.strip()
                t2 = c2.string.strip()
                if re.match(r'^[\d.]+$', t1) and has_chinese(t2):
                    results.append((el, "number_unit", t1 + t2, None))
                    seen_tags.add(id(el))
                    continue
        
        # Check for Chinese text in direct text nodes
        has_child_tags = False
        for child in el.children:
            if isinstance(child, Tag) and child.name not in SKIP_TAGS:
                has_child_tags = True
        
        if not has_child_tags:
            # Element has only text content - check if Chinese
            full_text = el.get_text(strip=True)
            if has_chinese(full_text):
                results.append((el, "text", full_text, None))
                seen_tags.add(id(el))
        else:
            # Mixed content: iterate text nodes and wrap each Chinese one
            for child in el.children:
                if isinstance(child, NavigableString) and not isinstance(child, Comment):
                    if has_chinese(str(child)) and id(child) not in seen_text_nodes:
                        results.append((child, "text_node", str(child).strip(), el))
                        seen_text_nodes.add(id(child))
            seen_tags.add(id(el))
    
    return results

# ─── Apply i18n attributes ───────────────────────────────────────────────

def apply_i18n(soup, target, i18n_type, key, parent_context=None):
    """Apply data-i18n attribute."""
    
    if i18n_type == "text" or i18n_type == "option":
        target["data-i18n"] = key
        
    elif i18n_type == "alt":
        target["data-i18n-alt"] = key
        
    elif i18n_type == "placeholder":
        target["data-i18n-placeholder"] = key
        
    elif i18n_type == "number_unit":
        children = list(target.children)
        if len(children) == 2:
            c1, c2 = children
            if isinstance(c1, NavigableString) and isinstance(c2, Tag) and c2.name == "span":
                # Wrap number in span
                num_span = soup.new_tag("span")
                if c2.get("class"):
                    num_span["class"] = list(c2["class"])
                num_span.string = c1.strip()
                num_span["data-i18n"] = key + "_num"
                c1.replace_with(num_span)
                
                c2["data-i18n"] = key + "_unit"
        
    elif i18n_type == "text_node":
        # Wrap the NavigableString in a span with data-i18n
        span = soup.new_tag("span")
        span.string = str(target)
        span["data-i18n"] = key
        target.replace_with(span)

# ─── Process a single file ───────────────────────────────────────────────

def process_file(filepath, prefix, en_data, zh_data, dry_run=False):
    """Process a single HTML file. Returns dict of new keys: {key: {zh, en, type}}."""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    elements = find_elements_needing_i18n(soup)
    
    if not elements:
        return OrderedDict()
    
    file_new_keys = OrderedDict()
    counter = 0
    used_keys = set(en_data.keys()) | set(zh_data.keys())
    
    for target, i18n_type, text_hint, parent_context in elements:
        clean_text = re.sub(r'<[^>]+>', '', text_hint).strip()
        if not clean_text:
            continue
        
        # Handle number_unit (generates 2 keys)
        if i18n_type == "number_unit":
            children = list(target.children)
            if len(children) == 2:
                c1, c2 = children
                num_text = c1.strip()
                unit_text = c2.get_text(strip=True) if isinstance(c2.string, str) else ""
                
                key = generate_key(prefix, counter)
                key_num = key + "_num"
                key_unit = key + "_unit"
                
                while key_num in used_keys or key_unit in used_keys:
                    counter += 1
                    key = generate_key(prefix, counter)
                    key_num = key + "_num"
                    key_unit = key + "_unit"
                
                file_new_keys[key_num] = {"zh": num_text, "en": "", "type": "number_unit"}
                file_new_keys[key_unit] = {"zh": unit_text, "en": "", "type": "number_unit"}
                used_keys.add(key_num)
                used_keys.add(key_unit)
                
                if not dry_run:
                    apply_i18n(soup, target, i18n_type, key)
                counter += 1
                continue
        
        key = generate_key(prefix, counter)
        actual_key = key
        
        while actual_key in used_keys:
            counter += 1
            key = generate_key(prefix, counter)
            actual_key = key
        
        file_new_keys[actual_key] = {"zh": clean_text, "en": "", "type": i18n_type}
        used_keys.add(actual_key)
        
        if not dry_run:
            apply_i18n(soup, target, i18n_type, actual_key, parent_context)
        counter += 1
    
    # Write file
    if file_new_keys and not dry_run:
        html_output = str(soup)
        # Restore DOCTYPE
        if not html_output.strip().startswith('<!DOCTYPE'):
            dm = re.match(r'<!DOCTYPE[^>]*>', content, re.IGNORECASE)
            if dm:
                html_output = dm.group() + '\n' + html_output
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_output)
    
    return file_new_keys

# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("⚠ DRY RUN MODE", flush=True)
    
    en_data, zh_data = load_json(EN_JSON), load_json(ZH_JSON)
    print(f"Loaded en: {len(en_data)} keys, zh: {len(zh_data)} keys", flush=True)
    
    targets = [
        # Cases pages
        ("pages/cases/bangkok/index.html", "cases_bangkok"),
        ("pages/cases/cebu/index.html", "cases_cebu"),
        ("pages/cases/hanoi/index.html", "cases_hanoi"),
        ("pages/cases/hcmc/index.html", "cases_hcmc"),
        ("pages/cases/jakarta/index.html", "cases_jakarta"),
        ("pages/cases/kl/index.html", "cases_kl"),
        ("pages/cases/manila/index.html", "cases_manila"),
        ("pages/cases/surabaya/index.html", "cases_surabaya"),
        # Compare pages
        ("pages/products/compare/index-pc.html", "compare_pc"),
        ("pages/products/compare/index-mobile.html", "compare_mobile"),
        ("pages/products/compare/index-tablet.html", "compare_tablet"),
        # Support pages
        ("pages/support/index-pc.html", "support_pc"),
        ("pages/support/index-mobile.html", "support_mobile"),
        ("pages/support/index-tablet.html", "support_tablet"),
        # Quote pages
        ("pages/quote/index-pc.html", "quote_pc"),
        ("pages/quote/index-mobile.html", "quote_mobile"),
        ("pages/quote/index-tablet.html", "quote_tablet"),
        # Landing pages
        ("pages/landing/index-pc.html", "landing_pc"),
        ("pages/landing/index-mobile.html", "landing_mobile"),
        ("pages/landing/index-tablet.html", "landing_tablet"),
        # About pages
        ("pages/about/index-pc.html", "about_pc"),
        ("pages/about/index-tablet.html", "about_tablet"),
        ("pages/about/index-mobile.html", "about_mobile"),
        # Home pages
        ("pages/home/index-pc.html", "home_pc"),
        ("pages/home/index-mobile.html", "home_mobile"),
        ("pages/home/index-tablet.html", "home_tablet"),
        # Other
        ("404.html", "page_404"),
        ("pages/thank-you/index-pc.html", "thank_you_pc"),
        ("pages/thank-you/index-mobile.html", "thank_you_mobile"),
        ("pages/thank-you/index-tablet.html", "thank_you_tablet"),
    ]
    
    # Phase 1: Collect all new keys from all files
    all_new_keys = OrderedDict()
    
    for rel_path, prefix in targets:
        filepath = SRC / rel_path
        if not filepath.exists():
            print(f"⚠ Missing: {filepath}", flush=True)
            continue
        
        print(f"Scanning: {rel_path}...", flush=True)
        file_keys = process_file(str(filepath), prefix, en_data, zh_data, dry_run)
        
        if file_keys:
            print(f"  → {len(file_keys)} new keys", flush=True)
            for k, v in file_keys.items():
                v["file"] = rel_path
                all_new_keys[k] = v
    
    print(f"\n{'='*60}", flush=True)
    print(f"Total new keys across all files: {len(all_new_keys)}", flush=True)
    
    if not all_new_keys:
        print("Nothing to do!", flush=True)
        return
    
    # Phase 2: Translate all new keys in batches
    all_keys_list = list(all_new_keys.keys())
    all_zh_values = [all_new_keys[k]["zh"] for k in all_keys_list]
    
    BATCH_SIZE = 30
    translations = {}
    for i in range(0, len(all_zh_values), BATCH_SIZE):
        batch = all_zh_values[i:i+BATCH_SIZE]
        print(f"Translating batch {i//BATCH_SIZE+1}/{(len(all_zh_values)-1)//BATCH_SIZE+1} ({len(batch)} texts)...", flush=True)
        batch_trans = translate_batch(batch)
        for idx, en_text in batch_trans.items():
            actual_idx = i + idx
            if actual_idx < len(all_keys_list):
                translations[all_keys_list[actual_idx]] = en_text
    
    # Apply translations
    for key in all_keys_list:
        if key in translations:
            all_new_keys[key]["en"] = translations[key]
        else:
            all_new_keys[key]["en"] = f"[Translate] {all_new_keys[key]['zh']}"
    
    # Phase 3: Update JSON files
    if not dry_run:
        print("\nUpdating JSON files...", flush=True)
        for key, info in all_new_keys.items():
            en_data[key] = info["en"]
            zh_data[key] = info["zh"]
        
        save_json(EN_JSON, en_data)
        save_json(ZH_JSON, zh_data)
        print(f"  en-ui.json: {len(en_data)} keys", flush=True)
        print(f"  zh-CN-ui.json: {len(zh_data)} keys", flush=True)
    
    # Print summary
    print(f"\n{'='*60}")
    print("NEW KEYS SUMMARY:")
    for key, info in all_new_keys.items():
        zh = info['zh'][:50]
        en = info['en'][:50]
        print(f"  {key}:")
        print(f"    zh: {zh}")
        print(f"    en: {en}")
        print(f"    file: {info['file']}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Scan HTML files for data-i18n attributes that are missing from JSON,
extract text, translate Chinese text, and add ALL missing keys to JSON.
"""

import json
import os
import re
import sys
import requests
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment, Tag
from collections import OrderedDict

PROJECT = Path("/Users/chee/Projects/KitchenYuKoLi")
SRC = PROJECT / "src"
LANG_DIR = SRC / "assets" / "lang"
EN_JSON = LANG_DIR / "en-ui.json"
ZH_JSON = LANG_DIR / "zh-CN-ui.json"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"


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


def extract_text_from_element(el, attr):
    if attr == "data-i18n-alt":
        return el.get("alt", "")
    elif attr == "data-i18n-placeholder":
        return el.get("placeholder", "")
    else:
        return el.get_text(strip=True)


def find_missing_keys_in_file(filepath, existing_keys):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    # Returns {key: {text: str, has_chinese: bool}}
    missing = OrderedDict()

    for el in soup.find_all(True):
        for attr in ("data-i18n", "data-i18n-alt", "data-i18n-placeholder"):
            key = el.get(attr)
            if not key or key in existing_keys or key in missing:
                continue

            text = extract_text_from_element(el, attr)
            clean = re.sub(r'<[^>]+>', '', text).strip()

            missing[key] = {
                "text": clean,
                "has_chinese": has_chinese(clean),
            }

    return missing


def main():
    en_data = load_json(EN_JSON)
    zh_data = load_json(ZH_JSON)
    print(f"Loaded en: {len(en_data)} keys, zh: {len(zh_data)} keys", flush=True)

    existing_keys = set(en_data.keys()) | set(zh_data.keys())

    html_files = []
    for root, dirs, files in os.walk(SRC):
        for f in files:
            if f.endswith('.html'):
                html_files.append(os.path.join(root, f))

    f404 = SRC / "404.html"
    if f404.exists() and str(f404) not in html_files:
        html_files.insert(0, str(f404))

    print(f"Scanning {len(html_files)} HTML files...", flush=True)

    all_missing = OrderedDict()
    for filepath in html_files:
        missing = find_missing_keys_in_file(filepath, existing_keys)
        if missing:
            rel = os.path.relpath(filepath, SRC)
            new_count = sum(1 for v in missing.values() if v["has_chinese"])
            non_zh = sum(1 for v in missing.values() if not v["has_chinese"])
            print(f"  {rel}: {new_count} Chinese + {non_zh} non-Chinese missing keys", flush=True)
            for k, v in missing.items():
                all_missing[k] = v

    print(f"\nTotal missing keys: {len(all_missing)}", flush=True)

    if not all_missing:
        print("All keys present in JSON files!", flush=True)
        return

    # Separate Chinese keys (need translation) from non-Chinese (use text as-is)
    chinese_keys = OrderedDict()
    non_chinese_keys = OrderedDict()
    for k, v in all_missing.items():
        if v["has_chinese"]:
            chinese_keys[k] = v["text"]
        else:
            non_chinese_keys[k] = v["text"]

    # Translate Chinese keys
    translations = {}
    if chinese_keys:
        keys_list = list(chinese_keys.keys())
        zh_values = list(chinese_keys.values())

        BATCH_SIZE = 30
        for i in range(0, len(zh_values), BATCH_SIZE):
            batch = zh_values[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(zh_values) - 1) // BATCH_SIZE + 1
            print(f"Translating batch {batch_num}/{total_batches} ({len(batch)} texts)...", flush=True)
            batch_trans = translate_batch(batch)
            for idx, en_text in batch_trans.items():
                actual_idx = i + idx
                if actual_idx < len(keys_list):
                    translations[keys_list[actual_idx]] = en_text

    # Apply all keys
    new_count = 0
    for k, v in all_missing.items():
        if k in existing_keys:
            continue
        new_count += 1
        if v["has_chinese"]:
            en_data[k] = translations.get(k, f"[Translate] {v['text']}")
            zh_data[k] = v["text"]
        else:
            en_data[k] = v["text"]
            zh_data[k] = v["text"]

    save_json(EN_JSON, en_data)
    save_json(ZH_JSON, zh_data)

    print(f"\nAdded {new_count} new keys", flush=True)
    print(f"en-ui.json: {len(en_data)} keys", flush=True)
    print(f"zh-CN-ui.json: {len(zh_data)} keys", flush=True)

    # Check untranslated
    untranslated = [k for k, v in en_data.items() if v.startswith("[Translate]")]
    if untranslated:
        print(f"\n⚠ {len(untranslated)} total keys have [Translate] prefix (pre-existing)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Re-translate missed [Translate] keys in en-ui.json."""
import json
import requests
import re
from collections import OrderedDict

EN_JSON = "/Users/chee/Projects/KitchenYuKoLi/src/assets/lang/en-ui.json"
API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

with open(EN_JSON, 'r', encoding='utf-8') as f:
    en = json.load(f, object_pairs_hook=OrderedDict)

missing = OrderedDict()
for k, v in en.items():
    if v.startswith('[Translate]'):
        missing[k] = v.replace('[Translate] ', '')

print(f"Found {len(missing)} missing translations")

# Batch translate
lines = []
for i, (k, v) in enumerate(missing.items()):
    lines.append(f"{i}. {v}")

prompt = (
    "Translate the following Chinese UI texts to English. "
    "Keep it natural and concise for a commercial kitchen equipment website. "
    "Keep product names, brand names, and abbreviations as-is. "
    "For simple items like '年' (year), '1' (one), '工厂' (factory), translate directly. "
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
            translations[int(m.group(1))] = m.group(2).strip()
    
    keys_list = list(missing.keys())
    fixed = 0
    for idx, en_text in translations.items():
        if idx < len(keys_list):
            key = keys_list[idx]
            en[key] = en_text
            fixed += 1
            print(f"  ✓ {key}: {en_text[:60]}")
    
    print(f"\nFixed {fixed}/{len(missing)} translations")
    
    # Save
    with open(EN_JSON, 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print("Saved en-ui.json")
    
except Exception as e:
    print(f"Error: {e}")

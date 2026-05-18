#!/usr/bin/env python3
"""
translate-keys.py — Read i18n-new-keys.json, translate zh→en, update en-ui.json.
Runs in parallel batches with timeout.
"""

import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KEYS_FILE = PROJECT_ROOT / "scripts" / "i18n-new-keys.json"
EN_JSON = PROJECT_ROOT / "src" / "assets" / "lang" / "en-ui.json"


def translate_batch(batch):
    """Translate a batch of {key: zh_text} to English."""
    lines = [f'"{k}": {json.dumps(v["zh"], ensure_ascii=False)}' for k, v in batch.items()]
    prompt = (
        "Translate these Chinese UI strings to English for a commercial kitchen equipment website.\n"
        "- Keep translations concise and professional\n"
        "- Use title case for headings, sentence case for descriptions\n"
        "- Keep numbers/units: '3-5人' → '3-5 people', '15-30㎡' → '15-30 m²', '30-80万' → '300K-800K'\n"
        "- Equipment names stay as-is if they're model numbers (e.g., ESL-XC60)\n"
        "- Output ONLY valid JSON\n\n"
        + "\n".join(lines)
    )
    
    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "Professional translator. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }).encode()
    
    req = urllib.request.Request(API_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    })
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        content = data['choices'][0]['message']['content']
        m = re.search(r'\{[\s\S]*\}', content)
        if m:
            translations = json.loads(m.group())
            result = {}
            for k, v in batch.items():
                result[k] = {"zh": v["zh"], "en": translations.get(k, v["zh"])}
            return result
        else:
            return dict(batch)
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        return dict(batch)


def main():
    with open(KEYS_FILE) as f:
        keys = json.load(f)
    
    items = list(keys.items())
    batch_size = 15
    batches = [dict(items[i:i+batch_size]) for i in range(0, len(items), batch_size)]
    
    print(f"Translating {len(items)} keys in {len(batches)} batches (size={batch_size})...")
    
    all_translated = {}
    completed = 0
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(translate_batch, b): i for i, b in enumerate(batches)}
        for future in as_completed(futures):
            batch_idx = futures[future]
            result = future.result()
            all_translated.update(result)
            completed += 1
            print(f"  Batch {completed}/{len(batches)} done ({len(result)} keys)")
    
    # Check how many got English translations
    translated = sum(1 for v in all_translated.values() if v.get('en'))
    print(f"\nTranslated: {translated}/{len(all_translated)}")
    
    # Update en-ui.json
    with open(EN_JSON) as f:
        en_data = json.load(f)
    
    added = 0
    for k, v in all_translated.items():
        if k in en_data:
            # Update with English translation if the current value is Chinese
            if has_chinese(en_data[k]) and v.get('en'):
                en_data[k] = v['en']
                added += 1
        elif v.get('en'):
            en_data[k] = v['en']
            added += 1
    
    with open(EN_JSON, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2, sort_keys=False)
        f.write('\n')
    
    # Also save the translated keys back
    with open(KEYS_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_translated, f, ensure_ascii=False, indent=2)
    
    print(f"Updated en-ui.json: {added} keys")
    print("✅ Done!")


def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', str(text)))


if __name__ == '__main__':
    main()

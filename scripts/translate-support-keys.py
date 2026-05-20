#!/usr/bin/env python3
"""
translate-support-keys.py — Translate 26 support overview keys to 23 languages.

Pipeline:
  1. Reads Chinese + English from zh-CN-ui.json / en-ui.json
  2. Batch-translates zh→23 target languages via SiliconFlow API
  3. Merges into each language file
"""

import json, os, sys, re, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL   = "Pro/deepseek-ai/DeepSeek-V3"

LANG_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "lang")
BATCH_SIZE  = 5
CONCURRENCY = 3
API_TIMEOUT = 120
MAX_RETRIES = 2

# Keys to translate (the 26 support overview keys)
SUPPORT_KEYS = [
    "support_page_title",
    "support_overview_hero_badge",
    "support_overview_page_title_hero",
    "support_overview_page_desc",
    "support_card_services_title",
    "support_card_services_desc",
    "support_card_installation_title",
    "support_card_installation_desc",
    "support_card_warranty_title",
    "support_card_warranty_desc",
    "support_card_spare_parts_title",
    "support_card_spare_parts_desc",
    "support_card_training_title",
    "support_card_training_desc",
    "support_card_faq_title",
    "support_card_faq_desc",
    "support_cta_title",
    "support_cta_desc",
    "support_cta_btn_wa",
    "support_cta_btn_services",
    "support_cta_btn_contact",
    "support_overview_cta_title",
    "support_overview_cta_desc",
    "support_overview_cta_btn_contact",
    "support_overview_cta_btn_quote",
    "support_overview_cta_btn_service",
]

TARGET_LANGUAGES = {
    "ar": "Arabic",
    "de": "German",
    "es": "Spanish",
    "fil": "Filipino/Tagalog",
    "fr": "French",
    "he": "Hebrew",
    "hi": "Hindi",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "km": "Khmer",
    "ko": "Korean",
    "lo": "Lao",
    "ms": "Malay",
    "my": "Myanmar/Burmese",
    "nl": "Dutch",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "th": "Thai",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "zh-TW": "Traditional Chinese",
}


def load_lang_json(lang_code):
    path = os.path.join(LANG_DIR, f"{lang_code}-ui.json")
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_lang_json(lang_code, data):
    path = os.path.join(LANG_DIR, f"{lang_code}-ui.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=False)
        f.write('\n')


def translate_batch_zh_to_lang(items, target_lang, target_name):
    """
    Translate a batch of {key: zh_text} from Chinese to target language.
    items: list of (key, zh_text) tuples
    """
    lines = [f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in items]
    prompt = (
        f"Translate these Chinese UI strings to {target_name} for a commercial kitchen equipment website.\n"
        "- Keep translations concise and professional\n"
        "- Use natural {target_name} phrasing\n"
        "- Keep numbers/units as-is (e.g., '10国' → '10 countries', '48小时' → '48 hours')\n"
        "- Brand name 'YuKoLi' stays as-is\n"
        "- Output ONLY valid JSON, no explanations\n\n"
        + "\n".join(lines)
    )

    body = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": f"Professional translator Chinese → {target_name}. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }).encode()

    req = urllib.request.Request(API_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    })

    for attempt in range(MAX_RETRIES):
        try:
            resp = urllib.request.urlopen(req, timeout=API_TIMEOUT)
            result = json.loads(resp.read().decode())
            text = result["choices"][0]["message"]["content"]
            # Extract JSON from response
            json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
            if json_match:
                translated = json.loads(json_match.group())
                return {k: v for k, v in translated.items() if k in dict(items)}
            # Try more aggressive extraction
            text_clean = text.strip()
            if text_clean.startswith('{') and text_clean.endswith('}'):
                translated = json.loads(text_clean)
                return {k: v for k, v in translated.items() if k in dict(items)}
            print(f"  ⚠ Could not parse response for {target_name}: {text[:200]}")
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                print(f"  ⚠ Retry {attempt+1}/{MAX_RETRIES} for {target_name}: {e}")
                time.sleep(wait)
            else:
                print(f"  ✗ Failed {target_name}: {e}")
    return {}


def main():
    # Load existing en and zh data
    en_data = load_lang_json("en")
    zh_data = load_lang_json("zh-CN")

    # Collect source texts
    items = []
    for key in SUPPORT_KEYS:
        if key in zh_data and key in en_data:
            items.append((key, zh_data[key]))
    
    print(f"Translating {len(items)} keys to {len(TARGET_LANGUAGES)} languages...")
    skipped = 0

    for lang_code, lang_name in sorted(TARGET_LANGUAGES.items()):
        # Load existing language data
        lang_data = load_lang_json(lang_code)

        # Check which keys already exist
        existing = [k for k in SUPPORT_KEYS if k in lang_data and not re.search(r'[\u4e00-\u9fff]', str(lang_data[k])) and lang_code != 'zh-TW']
        # For zh-TW, check if it's Chinese but not simplified (rough heuristic)
        if lang_code == 'zh-TW':
            existing = [k for k in SUPPORT_KEYS if k in lang_data]
        
        missing = [k for k in SUPPORT_KEYS if k not in lang_data]
        need_update = [k for k in SUPPORT_KEYS if k in lang_data and lang_data[k] == zh_data.get(k, '') and k != 'zh-TW']
        
        todo_keys = list(set(missing + need_update))
        
        if not todo_keys:
            print(f"  ✓ {lang_name} ({lang_code}) — all keys present")
            skipped += 1
            continue

        # Batch by BATCH_SIZE
        source_items = [(k, zh_data[k]) for k in todo_keys if k in zh_data]
        batches = [source_items[i:i+BATCH_SIZE] for i in range(0, len(source_items), BATCH_SIZE)]
        
        all_translations = {}
        for batch in batches:
            result = translate_batch_zh_to_lang(batch, lang_code, lang_name)
            all_translations.update(result)
            time.sleep(0.3)  # Rate limit
        
        # Merge into language file
        updated = 0
        for k, v in all_translations.items():
            if v and len(v.strip()) > 0:
                lang_data[k] = v
                updated += 1
        
        save_lang_json(lang_code, lang_data)
        print(f"  ✅ {lang_name} ({lang_code}) — {updated}/{len(todo_keys)} keys updated")

    print(f"\n✅ Done! Skipped {skipped} languages that already had all keys.")


if __name__ == '__main__':
    main()

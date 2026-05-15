#!/usr/bin/env python3
"""Fix empty data-i18n="" attributes — assign keys, translate, add to JSON."""

import re, glob, json, time, requests

CJK = re.compile(r'[\u4e00-\u9fff]')
API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

# Find all issues
issues = []
for f in sorted(glob.glob("src/pages/**/*.html", recursive=True)):
    with open(f) as fp:
        content = fp.read()
    for m in re.finditer(r'data-i18n=""\s*>([^<]*[\u4e00-\u9fff][^<]*)<', content):
        zh_text = m.group(1).strip()
        # Find a broader context to generate better key
        start = max(0, m.start() - 200)
        ctx = content[start:m.end()]
        # Generate a key based on the text
        issues.append((f, zh_text))

print(f"Found {len(issues)} empty data-i18n")

# Generate keys
kc = [len(json.load(open("src/assets/lang/en-ui.json")))]
def make_key(text, fpath):
    kc[0] += 1
    rel = fpath.replace("src/pages/","").replace("src/","").replace(".html","")
    parts = [p for p in rel.split("/") if p not in ("index-pc","index-tablet","index-mobile","index")]
    prefix = "_".join(parts).replace("-", "_") or "page"
    return f"{prefix}_{kc[0]}"

# Assign keys
item_map = {}
for fpath, zh_text in issues:
    key = make_key(zh_text, fpath)
    item_map[key] = zh_text

# Filter: only new keys
en = json.load(open("src/assets/lang/en-ui.json", "r", encoding="utf-8"))
zh = json.load(open("src/assets/lang/zh-CN-ui.json", "r", encoding="utf-8"))

truly_new = [(k, v) for k, v in item_map.items() if k not in en]
print(f"Truly new: {len(truly_new)}")

# Translate in batches
items_list = list(truly_new)
BATCH = 20
for i in range(0, len(items_list), BATCH):
    batch = items_list[i:i+BATCH]
    batch_dict = {k: v for k, v in batch}
    up = json.dumps(batch_dict, ensure_ascii=False)
    for attempt in range(3):
        try:
            resp = requests.post(API_URL,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                json={"model": MODEL, "messages": [
                    {"role": "system", "content": "Translate these Chinese strings to natural English for a commercial kitchen equipment website (YuKoLi). Keep model numbers and certification names as-is. Output pure JSON with same keys, translated values only."},
                    {"role": "user", "content": up}
                ], "max_tokens": 4096, "temperature": 0.1}, timeout=120)
            if resp.status_code != 200: time.sleep(2); continue
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
            raw = re.sub(r'\n?```\s*$', '', raw)
            result = json.loads(raw)
            for k, v in result.items():
                en[k] = v
                zh[k] = batch_dict[k]  # use the Chinese
            print(f"  Translated batch {i//BATCH+1}: {len(batch)} keys")
            break
        except Exception as e:
            if attempt == 2: print(f"  Batch {i//BATCH+1} FAILED: {e}")
            time.sleep(2)

# Apply HTML edits — replace data-i18n="" with data-i18n="key"
key_lookup = {}
for key, zh_text in item_map.items():
    key_lookup[zh_text] = key

for fpath in sorted(glob.glob("src/pages/**/*.html", recursive=True)):
    with open(fpath) as fp:
        content = fp.read()
    flag = [False]
    def replace_empty_data_i18n(m):
        old = m.group(0)
        zh_text = m.group(1).strip()
        key = key_lookup.get(zh_text)
        if key:
            flag[0] = True
            return old.replace('data-i18n=""', f'data-i18n="{key}"')
        return old
    
    content = re.sub(r'data-i18n=""\s*>([^<]*[\u4e00-\u9fff][^<]*)<', replace_empty_data_i18n, content)
    
    if flag[0]:
        with open(fpath, "w") as fp:
            fp.write(content)
        print(f"  Fixed: {fpath}")

# Save JSON
with open("src/assets/lang/en-ui.json", "w", encoding="utf-8") as f:
    json.dump(en, f, ensure_ascii=False, indent=2); f.write("\n")
with open("src/assets/lang/zh-CN-ui.json", "w", encoding="utf-8") as f:
    json.dump(zh, f, ensure_ascii=False, indent=2); f.write("\n")
print(f"\nFinal: en={len(en)}, zh={len(zh)}")

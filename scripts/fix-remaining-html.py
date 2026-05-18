#!/usr/bin/env python3
"""fix-remaining-html.py — Fix ALL 264 remaining hardcoded Chinese in HTML files."""

import json, os, re, glob, time, requests

CJK = re.compile(r'[\u4e00-\u9fff]')
LANG_DIR = "src/assets/lang"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

# Pre-defined alt text → existing i18n key mapping
ALT_KEY_MAP = {
    "小型餐饮": "app_small_restaurant",
    "中央厨房": "app_central_kitchen",
    "连锁餐饮": "app_chain_restaurant",
    "智慧食堂": "app_canteen",
    "云厨房": "app_cloud_kitchen",
    "食品工厂": "app_food_factory",
    "菜系实验室": "app_menu_lab",
    "小型餐饮/云厨房智能设备": "app_small_restaurant",  # reuse
    "团餐中央厨房智能解决方案": "app_central_kitchen",
    "团餐中央厨房设备": "app_central_kitchen",
    "连锁餐饮智能后厨": "app_chain_restaurant",
    "云厨房/外卖智能厨房": "app_cloud_kitchen",
    "菜单实验室 · 东南亚菜系智能厨房": "app_menu_lab",
    "食品工厂智能厨房": "app_food_factory",
}

def translate_batch(items):
    """Translate {key: chinese} → {key: english} via API"""
    results = {}
    BATCH = 20
    for i in range(0, len(items), BATCH):
        batch = items[i:i+BATCH]
        up = json.dumps({k: v for k, v in batch}, ensure_ascii=False)
        for attempt in range(3):
            try:
                resp = requests.post(API_URL,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                    json={"model": MODEL, "messages": [
                        {"role": "system", "content": "You are a professional translator. Translate these Chinese strings to natural English for a commercial kitchen equipment website. Keep HTML tags intact. Keep model numbers (ESL-*, YK-*, YKL-*, Y40, Y50) and brand name YuKoLi as-is. For UI elements like buttons and labels, use concise English. Output pure JSON with same keys, translated values only."},
                        {"role": "user", "content": up}
                    ], "max_tokens": 8192, "temperature": 0.1}, timeout=120)
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"].strip()
                    raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
                    raw = re.sub(r'\n?```\s*$', '', raw)
                    translated = json.loads(raw)
                    for k, _ in batch:
                        results[k] = translated.get(k, batch_dict.get(k, ""))
                    print(f"  batch {i//BATCH+1}: {len(batch)} keys ✓")
                    break
                time.sleep(2)
            except Exception as e:
                if attempt == 2:
                    print(f"  batch {i//BATCH+1}: FAILED ({e})")
                time.sleep(2)
    return results

def main():
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))

    html_files = glob.glob("src/**/*.html", recursive=True) + glob.glob("src/*.html")
    new_keys_zh = {}  # key → Chinese text
    file_changes = {}  # fpath → [(old_text, new_text)]

    key_counter = 0
    def make_key(prefix):
        nonlocal key_counter; key_counter += 1
        return f"{prefix}_{key_counter}"

    print("STEP 1: Scanning HTML files...")
    for fpath in sorted(html_files):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        # Generate prefix from path
        rel = fpath.replace("src/pages/", "").replace("src/", "").replace(".html", "")
        parts = [p for p in rel.split("/") if p not in ("index-pc", "index-tablet", "index-mobile", "index")]
        prefix = "_".join(parts).replace("-", "_")
        if not prefix:
            prefix = "page"

        changes = []
        lines = content.split("\n")

        for i, line in enumerate(lines):
            if not CJK.search(line):
                continue
            if "data-i18n" in line:
                continue
            stripped = line.strip()
            if stripped.startswith("<!--"): continue
            if "<title>" in line: continue
            if "广东省佛山市" in line or "万创园" in line: continue
            if "<script" in stripped or "<style" in stripped: continue

            indent = re.match(r"^(\s*)", line).group(1)
            new_line = line

            # Case 1: alt attribute
            alt_match = re.search(r'alt="([^"]*[\u4e00-\u9fff][^"]*)"', line)
            if alt_match and 'data-i18n-alt' not in line:
                alt_text = alt_match.group(1)
                # Use existing key if available
                key = ALT_KEY_MAP.get(alt_text)
                if not key:
                    key = make_key(prefix + "_alt")
                new_line = line.replace(f'alt="{alt_text}"', f'alt="{alt_text}" data-i18n-alt="{key}"')
                if key not in en and key not in new_keys_zh:
                    new_keys_zh[key] = alt_text
                changes.append((line, new_line))
                continue

            # Case 2: Simple text in tag: <tag ...>Chinese text</tag>
            # Match only simple inline tags
            text_match = re.search(
                r'(<(span|p|h[1-6]|option|a|button|b|strong|label|small|figcaption|li|dt|dd|th|td|legend)\b([^>]*)>)\s*'
                r'((?:[^<\u4e00-\u9fff]*[\u4e00-\u9fff][^<]*))\s*'
                r'(</\2>)',
                line
            )
            if text_match:
                tag_open_full = text_match.group(1)
                tag_name = text_match.group(2)
                tag_attrs = text_match.group(3)
                text_content = text_match.group(4).strip()
                tag_close = text_match.group(5)

                key = make_key(prefix + f"_{tag_name}")
                new_tag_open = f'<{tag_name}{tag_attrs} data-i18n="{key}">'
                new_line = line.replace(tag_open_full, new_tag_open)
                new_keys_zh[key] = text_content
                changes.append((line, new_line))
                continue

            # Case 3: Mixed content — wrap Chinese text parts in spans
            # e.g., <div>1<span class="text-lg">年</span></div>
            # e.g., <li>...<strong>中文内容</strong>...</li>
            parts = []
            remaining_text = line
            while True:
                m = re.search(r'(([^<]*[\u4e00-\u9fff][^<]*))', remaining_text)
                if not m:
                    break
                cn_text = m.group(1).strip()
                if cn_text:
                    key = make_key(prefix + "_mixed")
                    parts.append((cn_text, key))
                    new_keys_zh[key] = cn_text
                    remaining_text = remaining_text.replace(cn_text, "", 1)
                else:
                    break

            if parts:
                # Replace each Chinese text segment with a data-i18n span
                new_line = line
                for cn_text, key in parts:
                    replacement = f'<span data-i18n="{key}">{cn_text}</span>'
                    new_line = new_line.replace(cn_text, replacement, 1)
                changes.append((line, new_line))

        if changes:
            file_changes[fpath] = changes

    print(f"  Found {sum(len(v) for v in file_changes.values())} edits across {len(file_changes)} files")
    print(f"  New keys to add: {len(new_keys_zh)}")

    # Filter out already-existing keys
    truly_new = {}
    for k, zh_val in new_keys_zh.items():
        if k not in en:
            truly_new[k] = zh_val
    print(f"  Truly new keys: {len(truly_new)}")

    if truly_new:
        # STEP 2: Translate to English
        print(f"\nSTEP 2: Translating {len(truly_new)} keys to English...")
        items = list(truly_new.items())
        translated = translate_batch(items)

        # Fallback for failed translations
        for k, zh_val in items:
            en_val = translated.get(k, zh_val)
            en[k] = en_val
            zh[k] = zh_val

        # Save JSON
        with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
            json.dump(en, f, ensure_ascii=False, indent=2)
            f.write("\n")
        with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as f:
            json.dump(zh, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  en: {len(en)}, zh-CN: {len(zh)}")

    # STEP 3: Apply HTML edits
    print(f"\nSTEP 3: Applying HTML edits...")
    applied = 0
    for fpath, changes in file_changes.items():
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        for old, new in changes:
            if old in content:
                content = content.replace(old, new, 1)
                applied += 1
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"  Applied {applied}/{sum(len(v) for v in file_changes.values())} edits")

    # STEP 4: Final verification
    print(f"\nSTEP 4: Final verification...")
    remaining = 0
    for fpath in sorted(html_files):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        for line in content.split("\n"):
            if not CJK.search(line): continue
            if "data-i18n" in line: continue
            stripped = line.strip()
            if stripped.startswith("<!--"): continue
            if "<title>" in line: continue
            if "广东省佛山市" in line or "万创园" in line: continue
            if "<script" in stripped or "<style" in stripped: continue
            if re.search(r'>[^<]*[\u4e00-\u9fff][^<]*<', line): remaining += 1
            elif re.search(r'alt="[^"]*[\u4e00-\u9fff]', line): remaining += 1

    print(f"  Remaining hardcoded Chinese (excl title/address): {remaining}")
    print(f"\n{'✅ ALL CLEAR' if remaining == 0 else f'⚠️ {remaining} remaining'}")

if __name__ == "__main__":
    main()

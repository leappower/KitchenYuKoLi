#!/usr/bin/env python3
"""fix-html-i18n-final.py — Fix ALL remaining hardcoded Chinese in HTML files."""

import json, os, re, glob, time, requests

CJK = re.compile(r'[\u4e00-\u9fff]')
LANG_DIR = "src/assets/lang"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"
BATCH_SIZE = 20

def translate_zh_to_en(texts_dict):
    """Batch translate {key: chinese} → {key: english}"""
    items = list(texts_dict.items())
    results = {}
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i+BATCH_SIZE]
        prompt = """Translate these Chinese strings to professional English for a commercial kitchen equipment website (YuKoLi).
- Keep HTML tags like <strong> intact
- Keep model numbers (YK-*, ESL-*, etc.) as-is
- Keep brand name YuKoLi as-is
- Keep numbers and symbols as-is
- Output pure JSON with same keys, translated values only"""
        up = json.dumps({k: v for k, v in batch}, ensure_ascii=False)
        for attempt in range(3):
            try:
                resp = requests.post(API_URL,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                    json={"model": MODEL, "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": up}
                    ], "max_tokens": 4096, "temperature": 0.1}, timeout=120)
                if resp.status_code != 200:
                    print(f"  API {resp.status_code} retry {attempt}")
                    time.sleep(2 * attempt)
                    continue
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
                raw = re.sub(r'\n?```\s*$', '', raw)
                translated = json.loads(raw)
                for k, v in batch:
                    results[k] = translated.get(k, v)  # fallback to Chinese if missing
                break
            except Exception as e:
                print(f"  Error: {e}, retry {attempt}")
                time.sleep(2 * attempt)
        else:
            for k, v in batch:
                results[k] = v  # fallback
    return results

def main():
    # Load existing keys
    with open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8") as f:
        en_data = json.load(f)
    with open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8") as f:
        zh_data = json.load(f)

    # Find all HTML files
    html_files = glob.glob("src/**/*.html", recursive=True) + glob.glob("src/*.html")

    # Collect all Chinese text that needs fixing
    new_keys_en = {}
    new_keys_zh = {}
    file_edits = {}  # filepath -> [(line_num, old_line, new_line)]

    key_counter = {}  # prefix -> count for unique keys

    for fpath in sorted(html_files):
        with open(fpath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        edits_for_file = []

        # Generate a key prefix from filepath
        rel = fpath.replace("src/pages/", "").replace("src/", "")
        parts = rel.replace(".html", "").split("/")
        if parts[-1] in ("index-pc", "index-tablet", "index-mobile"):
            prefix_base = "_".join(parts[:-1])
        elif parts[-1].startswith("detail-"):
            prefix_base = "_".join(parts[:-1]) + "_detail"
        elif parts[-1].startswith("index"):
            prefix_base = "_".join(parts[:-1])
        else:
            prefix_base = "_".join(parts)
        prefix_base = prefix_base.replace("-", "_")

        if prefix_base not in key_counter:
            key_counter[prefix_base] = 0

        for i, line in enumerate(lines):
            ln = i + 1
            if not CJK.search(line):
                continue
            # Skip if already has data-i18n
            if 'data-i18n' in line:
                continue
            stripped = line.strip()
            # Skip title tags
            if '<title>' in line:
                continue
            # Skip comments
            if stripped.startswith('<!--') or stripped.startswith('*'):
                continue
            # Skip scripts/styles
            if '<script' in stripped or '<style' in stripped:
                continue
            # Skip Chinese addresses (contact page)
            if '广东省佛山市' in line or '万创园' in line:
                continue

            # Extract Chinese text from different attribute types
            new_line = line

            # Case 1: alt="中文" → add data-i18n-alt
            alt_match = re.search(r'alt="([^"]*[\u4e00-\u9fff][^"]*)"', line)
            if alt_match and 'data-i18n-alt' not in line:
                alt_text = alt_match.group(1)
                key_counter[prefix_base] += 1
                key = f"{prefix_base}_alt_{key_counter[prefix_base]}"
                new_line = line.replace(
                    f'alt="{alt_text}"',
                    f'alt="{alt_text}" data-i18n-alt="{key}"'
                )
                new_keys_en[key] = ""  # will translate later
                new_keys_zh[key] = alt_text
                edits_for_file.append((ln, line, new_line))
                continue

            # Case 2: placeholder="中文" → add data-i18n-placeholder
            ph_match = re.search(r'placeholder="([^"]*[\u4e00-\u9fff][^"]*)"', line)
            if ph_match and 'data-i18n-placeholder' not in line:
                ph_text = ph_match.group(1)
                key_counter[prefix_base] += 1
                key = f"{prefix_base}_ph_{key_counter[prefix_base]}"
                new_line = line.replace(
                    f'placeholder="{ph_text}"',
                    f'placeholder="{ph_text}" data-i18n-placeholder="{key}"'
                )
                new_keys_en[key] = ""
                new_keys_zh[key] = ph_text
                edits_for_file.append((ln, line, new_line))
                continue

            # Case 3: Text content inside <span>中文</span> or <p>中文</p>
            # Pattern: <tag ...>中文 content</tag> where no child elements
            text_match = re.search(
                r'(<(span|p|li|div|h[1-6]|a|option|b|strong|label|small|figcaption)\b[^>]*>)'
                r'((?:[^<]|<(?!/\2))*)'  # text content (no nested same tags)
                r'(</\2>)',
                line
            )
            if text_match:
                tag_open = text_match.group(1)
                tag_name = text_match.group(2)
                content = text_match.group(3)
                tag_close = text_match.group(4)
                if CJK.search(content):
                    key_counter[prefix_base] += 1
                    key = f"{prefix_base}_text_{key_counter[prefix_base]}"

                    # Check if tag already has an attribute to append to
                    if 'data-i18n' not in tag_open:
                        # Insert data-i18n before the closing >
                        new_tag_open = tag_open[:-1] + f' data-i18n="{key}">'
                    else:
                        new_tag_open = tag_open  # shouldn't happen, we filtered above

                    new_line = line.replace(tag_open + content + tag_close, new_tag_open + content + tag_close)
                    new_keys_en[key] = ""
                    new_keys_zh[key] = content.strip()
                    edits_for_file.append((ln, line, new_line))
                    continue

            # Case 4: Mixed content like "1 年" inside span: <span>1<span class="...">年</span></span>
            # Or <span class="text-4xl">1 年</span>
            mixed_match = re.search(
                r'(<(span|p|div|h[1-6])\b[^>]*>)'
                r'(([^<]*[\u4e00-\u9fff][^<]*)?)'  # optional Chinese text before inner tags
                r'((?:<[^/][^>]*>.*?</[^>]+>)*)'   # inner tags
                r'([^<]*[\u4e00-\u9fff][^<]*)?'      # optional Chinese text after inner tags
                r'(</\2>)',
                line
            )
            if mixed_match and not text_match:
                tag_open = mixed_match.group(1)
                tag_name = mixed_match.group(2)
                before = mixed_match.group(3) or ""
                inner = mixed_match.group(4) or ""
                after = mixed_match.group(5) or ""
                tag_close = mixed_match.group(6)

                # Only handle if there's Chinese in before or after (not inside inner tags which are already handled)
                if CJK.search(before) or CJK.search(after):
                    key_counter[prefix_base] += 1
                    key = f"{prefix_base}_mixed_{key_counter[prefix_base]}"
                    full_text = (before + after).strip()
                    new_keys_en[key] = ""
                    new_keys_zh[key] = full_text

                    # Wrap the text parts in spans with data-i18n
                    parts_to_wrap = []
                    if CJK.search(before):
                        parts_to_wrap.append(before.strip())
                    if CJK.search(after):
                        parts_to_wrap.append(after.strip())

                    if parts_to_wrap:
                        if 'data-i18n' not in tag_open:
                            # For mixed content, wrap each Chinese text part
                            new_content = before + inner + after
                            # If the whole visible text is simple, just add data-i18n to parent
                            visible = re.sub(r'<[^>]+>', '', new_content).strip()
                            if CJK.search(visible):
                                new_tag_open = tag_open[:-1] + f' data-i18n="{key}">'
                                new_line = line.replace(tag_open, new_tag_open)
                                edits_for_file.append((ln, line, new_line))

        if edits_for_file:
            file_edits[fpath] = edits_for_file

    # Filter out keys that already exist
    truly_new_en = {}
    truly_new_zh = {}
    for k in new_keys_en:
        if k not in en_data:
            truly_new_en[k] = new_keys_en[k]
            truly_new_zh[k] = new_keys_zh[k]

    print(f"Found {len(new_keys_en)} new i18n keys to add")
    print(f"Files to edit: {len(file_edits)}")
    print(f"Total edits: {sum(len(v) for v in file_edits.values())}")

    # Translate Chinese → English
    if truly_new_zh:
        print(f"\nTranslating {len(truly_new_zh)} keys to English...")
        translated = translate_zh_to_en(truly_new_zh)
        truly_new_en = translated

        # Show some samples
        for k in list(truly_new_en.keys())[:5]:
            print(f"  {k}: {truly_new_en[k][:60]}")
        print(f"  ...")

    # Apply HTML edits
    print(f"\nApplying HTML edits...")
    for fpath, edits in sorted(file_edits.items()):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        for ln, old, new in edits:
            if old in content:
                content = content.replace(old, new, 1)
            else:
                print(f"  WARNING: {fpath}:{ln} - old text not found (maybe duplicate)")
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)

    # Add keys to JSON files
    if truly_new_en:
        en_data.update(truly_new_en)
        zh_data.update(truly_new_zh)
        with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
            json.dump(en_data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as f:
            json.dump(zh_data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    # Verify
    print(f"\nen-ui.json: {len(en_data)} keys")
    print(f"zh-CN-ui.json: {len(zh_data)} keys")

    # Re-check remaining
    remaining = 0
    for fpath in html_files:
        with open(fpath) as f:
            content = f.read()
        for line in content.split('\n'):
            if not CJK.search(line): continue
            if 'data-i18n' in line: continue
            stripped = line.strip()
            if stripped.startswith('<!--'): continue
            if '<title>' in line: continue
            if '广东省佛山市' in line: continue
            if '<script' in stripped or '<style' in stripped: continue
            if re.search(r'>[^<]*[\u4e00-\u9fff][^<]*<', line):
                remaining += 1
            elif re.search(r'alt="[^"]*[\u4e00-\u9fff]', line) and 'data-i18n-alt' not in line:
                remaining += 1
            elif re.search(r'placeholder="[^"]*[\u4e00-\u9fff]', line) and 'data-i18n-placeholder' not in line:
                remaining += 1

    print(f"Remaining hardcoded Chinese (excl title/address): {remaining}")

if __name__ == "__main__":
    main()

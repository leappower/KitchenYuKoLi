#!/usr/bin/env python3
"""fix-remaining-html-v2.py — Handle alt + simple text only, no mixed content."""

import json, os, re, glob, time, requests, sys

CJK = re.compile(r'[\u4e00-\u9fff]')
LANG_DIR = "src/assets/lang"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

ALT_KEY_MAP = {
    "小型餐饮": "app_small_restaurant", "中央厨房": "app_central_kitchen",
    "连锁餐饮": "app_chain_restaurant", "智慧食堂": "app_canteen",
    "云厨房": "app_cloud_kitchen", "食品工厂": "app_food_factory",
    "菜系实验室": "app_menu_lab",
}

def translate(items):
    BATCH = 20; results = {}
    for i in range(0, len(items), BATCH):
        batch = items[i:i+BATCH]
        batch_dict = {k: v for k, v in batch}
        up = json.dumps(batch_dict, ensure_ascii=False)
        for attempt in range(3):
            try:
                resp = requests.post(API_URL,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                    json={"model": MODEL, "messages": [
                        {"role": "system", "content": "Translate these Chinese strings to natural English for a commercial kitchen equipment website (YuKoLi). Keep model numbers (ESL-*, YK-*, YKL-*, Y40, Y50). UI labels should be concise. Output pure JSON."},
                        {"role": "user", "content": up}
                    ], "max_tokens": 4096, "temperature": 0.1}, timeout=120)
                if resp.status_code != 200:
                    time.sleep(2); continue
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
                raw = re.sub(r'\n?```\s*$', '', raw)
                for k, _ in batch:
                    results[k] = json.loads(raw).get(k, batch_dict.get(k, ""))
                sys.stdout.write(f"  b{i//BATCH+1} "); sys.stdout.flush()
                break
            except: time.sleep(2)
    print()
    return results

def main():
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))
    html_files = glob.glob("src/**/*.html", recursive=True) + glob.glob("src/*.html")

    new_keys_zh = {}
    edits_by_file = {}
    kc = [0]
    def mkkey(prefix):
        kc[0] += 1; return f"{prefix}_{kc[0]}"

    # Scan
    for fpath in sorted(html_files):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        
        rel = fpath.replace("src/pages/", "").replace("src/", "").replace(".html", "")
        parts = [p for p in rel.split("/") if p not in ("index-pc","index-tablet","index-mobile","index")]
        prefix = "_".join(parts).replace("-", "_") or "page"
        edits = []

        for line in content.split("\n"):
            if not CJK.search(line): continue
            if "data-i18n" in line: continue
            s = line.strip()
            if s.startswith("<!--"): continue
            if "<title>" in line: continue
            if "广东省佛山市" in line or "万创园" in line: continue
            if "<script" in s or "<style" in s: continue

            new_line = line

            # === Case 1: alt="中文" → add data-i18n-alt
            alt_m = re.search(r'alt="([^"]*[\u4e00-\u9fff][^"]*)"', line)
            if alt_m and 'data-i18n-alt' not in line:
                at = alt_m.group(1)
                key = ALT_KEY_MAP.get(at)
                if not key:
                    key = mkkey(prefix + "_alt")
                new_line = line.replace(f'alt="{at}"', f'alt="{at}" data-i18n-alt="{key}"')
                if key not in en and key not in new_keys_zh:
                    new_keys_zh[key] = at
                edits.append((line, new_line))
                continue

            # === Case 2: <tag ...>纯中文文本</tag>
            text_m = re.search(
                r'(<(span|p|h[1-6]|option|a|button|strong|label|small|figcaption|li|dt|dd|th|td|legend)\b'
                r'((?:\s[^>]*)?)>\s*)'
                r'((?:[^<\u4e00-\u9fff]*[\u4e00-\u9fff][^<]*))'
                r'(\s*</\2>)',
                line
            )
            if text_m:
                full_open = text_m.group(1)
                tn = text_m.group(2)
                ta = text_m.group(3)
                tc = text_m.group(4).strip()
                
                # Ensure no inner tags in content
                if "<" not in tc.replace("<", ""):
                    key = mkkey(prefix + f"_{tn}")
                    new_open = f'<{tn}{ta} data-i18n="{key}">'
                    new_line = line.replace(full_open, new_open)
                    new_keys_zh[key] = tc
                    edits.append((line, new_line))

        if edits:
            edits_by_file[fpath] = edits

    total_edits = sum(len(v) for v in edits_by_file.values())
    print(f"Scanned: {total_edits} edits in {len(edits_by_file)} files")
    print(f"New keys: {len(new_keys_zh)}")

    # Filter
    truly_new = {}
    for k, zh_val in new_keys_zh.items():
        if k not in en:
            truly_new[k] = zh_val
    print(f"Truly new: {len(truly_new)}")

    # Translate
    if truly_new:
        print(f"\nTranslating...")
        items = list(truly_new.items())
        translated = translate(items)
        for k, zh_val in items:
            en[k] = translated.get(k, zh_val)
            zh[k] = zh_val  # ensure zh has the key too (most already do)

    # Apply HTML edits
    print(f"\nApplying edits...")
    applied = 0
    for fpath, edits in sorted(edits_by_file.items()):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        for old, new in edits:
            if old in content:
                content = content.replace(old, new, 1)
                applied += 1
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)

    # Save JSON
    with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
        json.dump(en, f, ensure_ascii=False, indent=2); f.write("\n")
    with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as f:
        json.dump(zh, f, ensure_ascii=False, indent=2); f.write("\n")

    print(f"Applied: {applied}/{total_edits}")
    print(f"JSON: en={len(en)}, zh-CN={len(zh)}")

    # Verify
    remaining = 0
    for fpath in html_files:
        with open(fpath) as f:
            content = f.read()
        for line in content.split("\n"):
            if not CJK.search(line): continue
            if "data-i18n" in line: continue
            s = line.strip()
            if s.startswith("<!--"): continue
            if "<title>" in line: continue
            if "广东省佛山市" in line or "万创园" in line: continue
            if "<script" in s or "<style" in s: continue
            if re.search(r'>[^<]*[\u4e00-\u9fff][^<]*<', line): remaining += 1
            elif re.search(r'alt="[^"]*[\u4e00-\u9fff]', line): remaining += 1

    print(f"\nRemaining: {remaining}")
    print("✅ DONE" if remaining == 0 else f"⚠️ {remaining}")

if __name__ == "__main__":
    main()

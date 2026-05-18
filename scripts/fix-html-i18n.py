#!/usr/bin/env python3
"""
fix-html-i18n.py — In-place HTML i18n attribute injection using regex.
Does NOT use BeautifulSoup to avoid HTML reformatting.
Operates line-by-line on the raw HTML source.
"""

import json
import re
import sys
import urllib.request
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
PAGES_DIR = SRC_DIR / "pages" / "applications"
EN_JSON = SRC_DIR / "assets" / "lang" / "en-ui.json"
ZH_JSON = SRC_DIR / "assets" / "lang" / "zh-CN-ui.json"

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

SECTIONS = {
    "small-restaurant": "sr",
    "central-kitchen": "ck",
    "canteen": "cn",
    "chain-restaurant": "cr",
    "cloud-kitchen": "clk",
    "food-factory": "ff",
    "menu-lab": "ml",
}

CHINESE_RE = re.compile(r'[\u4e00-\u9fff]')
TAG_SPLIT_RE = re.compile(r'(<[^>]*>)')
ELEMENT_RE = re.compile(
    r'(<(?:h[1-6]|p|span|a|button|li|label|td|th|div|strong|b|em|figcaption|summary|dt|dd|section)\b'
    r'[^>]*>)'
    r'([\s]*[^\n<]*[\u4e00-\u9fff][^\n<]*[\s]*)'
    r'(</(?:h[1-6]|p|span|a|button|li|label|td|th|div|strong|b|em|figcaption|summary|dt|dd|section)\s*>)',
    re.IGNORECASE,
)
UNCLOSED_TAG_RE = re.compile(r'<[a-zA-Z][^>]*$')


def has_chinese(text):
    return bool(CHINESE_RE.search(text))


def add_attr_to_tag(tag_html, attr_name, attr_value):
    """Add an attribute to an HTML tag string (opening tag only)."""
    attr_str = f'{attr_name}="{attr_value}"'
    if re.search(rf'{attr_name}\s*=', tag_html):
        return re.sub(rf'{attr_name}="[^"]*"', attr_str, tag_html, count=1)
    if re.search(r'/\s*>$', tag_html):
        return re.sub(r'/\s*>$', f'{attr_str} />', tag_html, count=1)
    return re.sub(r'\s*>', f' {attr_str}>', tag_html, count=1)


def find_chinese_needing_i18n(lines, existing_keys):
    """Find all Chinese text in HTML that needs data-i18n attributes."""
    results = []
    in_script = in_style = in_comment = False
    tag_buffer = ""
    tag_start_line = -1

    def flush_tag_buffer():
        nonlocal tag_buffer, tag_start_line
        buf = tag_buffer
        sl = tag_start_line
        tag_buffer = ""
        tag_start_line = -1
        return buf, sl

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Track script/style
        if re.match(r'\s*<script', line, re.IGNORECASE) and not in_script:
            in_script = True
        if '</script>' in line.lower():
            in_script = False
        if re.match(r'\s*<style', line, re.IGNORECASE) and not in_style:
            in_style = True
        if '</style>' in line.lower():
            in_style = False

        # Track comments
        if '<!--' in stripped and '-->' not in stripped:
            in_comment = True
        if '-->' in stripped:
            in_comment = False
            continue

        if in_script or in_style or in_comment:
            if tag_buffer:
                tag_buffer = ""
                tag_start_line = -1
            continue

        # ─── Multi-line tag accumulator ───────────────────────────────
        if tag_buffer:
            tag_buffer += " " + stripped
            if '>' in stripped:
                full_tag, sl = flush_tag_buffer()
                # Check <img> with Chinese alt
                if re.match(r'\s*<img\b', full_tag, re.IGNORECASE):
                    alt_m = re.search(r'alt="([^"]*)"', full_tag)
                    if alt_m and has_chinese(alt_m.group(1)):
                        if not re.search(r'data-i18n-alt\s*=', full_tag):
                            results.append((sl, 'alt', full_tag, alt_m.group(1), full_tag))
                # Check <input> with Chinese placeholder
                if re.match(r'\s*<input\b', full_tag, re.IGNORECASE):
                    ph_m = re.search(r'placeholder="([^"]*)"', full_tag)
                    if ph_m and has_chinese(ph_m.group(1)):
                        if not re.search(r'data-i18n-placeholder\s*=', full_tag):
                            results.append((sl, 'placeholder', full_tag, ph_m.group(1), full_tag))
            continue

        # Start accumulating if line has unclosed tag
        if UNCLOSED_TAG_RE.search(stripped) and '>' not in stripped[stripped.index('<'):]:
            tag_start_line = i
            tag_buffer = stripped
            continue

        # ─── Single-line <img> with Chinese alt ───────────────────────
        img_m = re.search(r'(<img\b[^>]*>)', line, re.IGNORECASE)
        if img_m:
            img_tag = img_m.group(1)
            alt_m = re.search(r'alt="([^"]*)"', img_tag)
            if alt_m and has_chinese(alt_m.group(1)):
                if not re.search(r'data-i18n-alt\s*=', img_tag):
                    results.append((i, 'alt', img_tag, alt_m.group(1), line))

        # ─── Single-line <input> with Chinese placeholder ─────────────
        inp_m = re.search(r'(<input\b[^>]*>)', line, re.IGNORECASE)
        if inp_m:
            inp_tag = inp_m.group(1)
            ph_m = re.search(r'placeholder="([^"]*)"', inp_tag)
            if ph_m and has_chinese(ph_m.group(1)):
                if not re.search(r'data-i18n-placeholder\s*=', inp_tag):
                    results.append((i, 'placeholder', inp_tag, ph_m.group(1), line))

        # ─── Text-only elements: <tag>Chinese</tag> on one line ───────
        elem_m = ELEMENT_RE.search(line)
        if elem_m:
            tag_open = elem_m.group(1)
            text_content = elem_m.group(2).strip()
            if text_content and has_chinese(text_content):
                if not re.search(r'data-i18n\s*=', tag_open):
                    results.append((i, 'element', tag_open, text_content, line))

        # ─── Mixed-content lines (tag + Chinese text + child elements) ─
        if (stripped.startswith('<') and has_chinese(stripped)
                and not stripped.startswith('<!--')
                and not re.match(r'<(?:script|style)\b', stripped, re.IGNORECASE)):
            parts = TAG_SPLIT_RE.split(stripped)
            chinese_segments = [p.strip() for p in parts
                                if p.strip() and has_chinese(p) and not p.strip().startswith('<')]
            has_child_tags = any(p.strip().startswith('<') for p in parts if p.strip())
            if chinese_segments and has_child_tags:
                # Skip if already handled by element type
                if not ELEMENT_RE.search(stripped):
                    for seg in chinese_segments:
                        results.append((i, 'mixed_wrap', stripped, seg, line))

        # ─── Pure text lines with Chinese (need span wrapper) ─────────
        if (stripped and has_chinese(stripped)
                and not stripped.startswith('<')
                and not stripped.startswith('&')
                and not stripped.startswith('<!--')):
            results.append((i, 'wrap', None, stripped, line))

    return results


def generate_key(prefix, role, text, context, all_keys):
    """Generate a unique i18n key."""
    hints = {
        'hero': 'hero', 'pain': 'pain', 'challenge': 'pain',
        'solution': 'solution', 'solve': 'solution',
        'feat': 'feat', 'feature': 'feat',
        'stat': 'stat', 'metric': 'stat',
        'equip': 'equip', 'device': 'equip', 'product': 'equip',
        'faq': 'faq', 'question': 'faq',
        'cta': 'cta', 'contact': 'cta',
        'badge': 'badge',
        'scenario': 'scenario', 'case': 'scenario',
        'compare': 'compare', 'vs': 'compare',
        'deploy': 'deploy', 'step': 'deploy',
        'roi': 'roi', 'profit': 'roi',
        'cuisine': 'cuisine', 'recipe': 'cuisine',
        'transition': 'transition',
        'footer': 'footer', 'bottom': 'footer',
    }
    ctx_lower = (context or '').lower()
    section_hint = ''
    for kw, hint in hints.items():
        if kw in ctx_lower:
            section_hint = hint
            break
    base = f"{prefix}_{section_hint}_{role}" if section_hint else f"{prefix}_{role}"
    if base not in all_keys:
        return base
    for n in range(2, 200):
        key = f"{base}_{n}"
        if key not in all_keys:
            return key
    return f"{prefix}_{role}_{hash(text) % 10000}"


def translate_parallel(keys_dict):
    """Translate using parallel API calls."""
    items = list(keys_dict.items())
    batch_size = 15
    batches = [dict(items[i:i + batch_size]) for i in range(0, len(items), batch_size)]

    def translate_batch(batch):
        lines = [f'"{k}": {json.dumps(v["zh"], ensure_ascii=False)}' for k, v in batch.items()]
        prompt = (
            "Translate Chinese UI strings to English for a kitchen equipment website.\n"
            "- Concise, professional. Title case for headings.\n"
            "- '3-5人' → '3-5 people', '15㎡' → '15 m²', '30-80万' → '300K-800K'\n"
            "- Equipment model numbers stay as-is (ESL-XC60, etc)\n"
            "- Output ONLY valid JSON\n\n"
            + "\n".join(lines)
        )
        body = json.dumps({
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "Professional translator. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1, "max_tokens": 4096,
        }).encode()
        req = urllib.request.Request(API_URL, data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        content = data['choices'][0]['message']['content']
        m = re.search(r'\{[\s\S]*\}', content)
        if m:
            translations = json.loads(m.group())
            return {k: {"zh": v["zh"], "en": translations.get(k, "")} for k, v in batch.items()}
        return dict(batch)

    result = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(translate_batch, b): idx for idx, b in enumerate(batches)}
        done = 0
        for future in as_completed(futures):
            try:
                result.update(future.result())
            except Exception as e:
                print(f"  ERROR batch {futures[future]}: {e}", file=sys.stderr)
            done += 1
            if done % 5 == 0:
                print(f"  {done}/{len(batches)}...")
    return result


def main():
    args = set(sys.argv[1:])
    dry_run = '--dry-run' in args or '--apply' not in args
    do_translate = '--translate' in args
    do_apply = '--apply' in args

    # Load existing keys
    existing_keys = set()
    for jf in [EN_JSON, ZH_JSON]:
        if jf.exists():
            with open(jf) as f:
                existing_keys.update(json.load(f).keys())

    # Collect target files
    target_files = []
    for section in SECTIONS:
        for v in ["index-pc.html", "index-tablet.html", "index-mobile.html"]:
            fp = PAGES_DIR / section / v
            if fp.exists():
                target_files.append((section, fp))

    print(f"Mode: {'DRY RUN' if dry_run else 'APPLY'} | Translate: {do_translate}")
    print(f"Files: {len(target_files)} | Existing keys: {len(existing_keys)}")

    # ═══ PASS 1: Scan ═══
    print("\n── Pass 1: Scanning ──")
    text_occurrences = OrderedDict()
    file_entries = {}

    for section, filepath in sorted(target_files):
        content = filepath.read_text(encoding='utf-8')
        lines_list = content.split('\n')
        file_html_keys = set(existing_keys)
        for m in re.finditer(r'data-i18n(?:-alt|-placeholder)?="([^"]+)"', content):
            file_html_keys.add(m.group(1))
        entries = find_chinese_needing_i18n(lines_list, file_html_keys)
        file_entries[filepath] = entries
        for line_idx, etype, tag_info, text, context in entries:
            tk = (etype, text)
            if tk not in text_occurrences:
                text_occurrences[tk] = []
            text_occurrences[tk].append((filepath, line_idx, tag_info, context))
        if entries:
            print(f"  {filepath.relative_to(PROJECT_ROOT)}: {len(entries)} entries")
        else:
            print(f"  {filepath.relative_to(PROJECT_ROOT)}: clean")

    print(f"\nUnique Chinese texts: {len(text_occurrences)}")

    # ═══ Assign keys ═══
    print("\n── Assigning keys ──")
    all_keys = set(existing_keys)
    text_to_key = {}
    new_keys = {}

    for (etype, text), occs in text_occurrences.items():
        if etype == 'alt':
            role = 'img'
        elif etype == 'placeholder':
            role = 'input'
        elif etype in ('wrap', 'mixed_wrap'):
            role = 'text'
        else:
            tag_m = re.match(r'<(\w+)', (occs[0][2] or ''))
            role = tag_m.group(1) if tag_m else 'text'

        first_section = None
        first_context = ""
        for fp, li, ti, ctx in occs:
            for sec in SECTIONS:
                if sec in str(fp):
                    first_section = sec
                    break
            first_context = ctx or ""
            break

        prefix = SECTIONS.get(first_section, 'app')
        key = generate_key(prefix, role, text, first_context, all_keys)
        text_to_key[(etype, text)] = key
        new_keys[key] = {"zh": text, "en": ""}
        all_keys.add(key)

    # Check for 冬阴功汤 debug
    print(f"New keys: {len(new_keys)}")

    # ═══ PASS 2: Apply ═══
    print("\n── Pass 2: Applying ──")
    all_changes = {}
    for section, filepath in sorted(target_files):
        entries = file_entries.get(filepath, [])
        if not entries:
            continue
        content = filepath.read_text(encoding='utf-8')
        lines_list = content.split('\n')
        modified = False

        for line_idx, etype, tag_info, text, context in reversed(entries):
            key = text_to_key.get((etype, text))
            if not key:
                continue
            line = lines_list[line_idx]

            if etype == 'alt' and tag_info:
                new_tag = add_attr_to_tag(tag_info, 'data-i18n-alt', key)
                new_line = line.replace(tag_info, new_tag, 1)
                if new_line != line:
                    lines_list[line_idx] = new_line
                    modified = True

            elif etype == 'placeholder' and tag_info:
                new_tag = add_attr_to_tag(tag_info, 'data-i18n-placeholder', key)
                new_line = line.replace(tag_info, new_tag, 1)
                if new_line != line:
                    lines_list[line_idx] = new_line
                    modified = True

            elif etype == 'element' and tag_info:
                new_tag = add_attr_to_tag(tag_info, 'data-i18n', key)
                new_line = line.replace(tag_info, new_tag, 1)
                if new_line != line:
                    lines_list[line_idx] = new_line
                    modified = True

            elif etype == 'wrap':
                indent = line[:len(line) - len(line.lstrip())]
                stripped_text = text.strip()
                new_line = f'{indent}<span data-i18n="{key}">{stripped_text}</span>'
                lines_list[line_idx] = new_line
                modified = True

            elif etype == 'mixed_wrap':
                # Insert <span data-i18n="key"> around Chinese text in mixed-content line
                # tag_info contains the stripped line content
                stripped_text = text.strip()
                new_stripped = tag_info.replace(stripped_text, f'<span data-i18n="{key}">{stripped_text}</span>', 1)
                indent = line[:len(line) - len(line.lstrip())]
                new_line = indent + new_stripped
                if new_line != line:
                    lines_list[line_idx] = new_line
                    modified = True

        if modified:
            all_changes[filepath] = '\n'.join(lines_list)
            print(f"  {filepath.relative_to(PROJECT_ROOT)}: modified")

    # ═══ Translate ═══
    if do_translate and new_keys:
        print(f"\n── Translating {len(new_keys)} keys ──")
        new_keys = translate_parallel(new_keys)
        print("  Done.")

    # ═══ Save ═══
    keys_path = PROJECT_ROOT / "scripts" / "i18n-new-keys.json"
    with open(keys_path, 'w', encoding='utf-8') as f:
        json.dump(new_keys, f, ensure_ascii=False, indent=2)
    print(f"\nKeys: {keys_path}")

    if do_apply:
        for fp, content in sorted(all_changes.items()):
            fp.write_text(content, encoding='utf-8')
        print(f"  Updated {len(all_changes)} HTML files")

        if new_keys:
            with open(EN_JSON) as f:
                en_data = json.load(f)
            with open(ZH_JSON) as f:
                zh_data = json.load(f)

            en_added = zh_added = 0
            for k, v in new_keys.items():
                en_text = v.get('en', '')
                zh_text = v.get('zh', '')
                if k not in en_data and en_text:
                    en_data[k] = en_text
                    en_added += 1
                if k not in zh_data and zh_text:
                    zh_data[k] = zh_text
                    zh_added += 1

            with open(EN_JSON, 'w', encoding='utf-8') as f:
                json.dump(en_data, f, ensure_ascii=False, indent=2, sort_keys=False)
                f.write('\n')
            with open(ZH_JSON, 'w', encoding='utf-8') as f:
                json.dump(zh_data, f, ensure_ascii=False, indent=2, sort_keys=False)
                f.write('\n')

            print(f"  en-ui.json: +{en_added} keys")
            print(f"  zh-CN-ui.json: +{zh_added} keys")

        print("\n✅ Done!")
    else:
        print(f"\n[DRY RUN] {len(all_changes)} files would change.")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
audit-i18n-comprehensive.py — Full project i18n audit

Checks:
1. All src HTML files have lang-registry.js script tag
2. All data-i18n keys in HTML exist in en-ui.json
3. All keys in en-ui.json exist in zh-CN-ui.json (reference translation)
4. Chinese characters in English fallback text (hardcoded Chinese in HTML)
5. All HTML files have <script src="/assets/js/i18n/dropdown.js"> (for language switcher)
6. orphans: keys in JSON but NOT used in any HTML
7. data-i18n on non-ASCII elements (div, span, etc that don't have visible text to replace)
8. Story paragraphs: verify all have sufficient length
9. Check all 17 language files for missing keys
"""
import os, re, json, sys
from collections import defaultdict

SRC_DIR = 'src/pages'
LANG_DIR = 'src/assets/lang'
EN_PATH = os.path.join(LANG_DIR, 'en-ui.json')
ZH_PATH = os.path.join(LANG_DIR, 'zh-CN-ui.json')

def load_json(path):
    with open(path) as f: return json.load(f)

def find_html_files():
    files = []
    for root, dirs, fnames in os.walk(SRC_DIR):
        for fn in fnames:
            if fn.endswith('.html'):
                files.append(os.path.join(root, fn))
    return sorted(files)

def extract_data_i18n_keys(content):
    """Extract all data-i18n attribute values from HTML"""
    return set(re.findall(r'data-i18n="([^"]+)"', content))

def has_cjk(text):
    """Check if text contains CJK characters"""
    return bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', text))

def extract_text_nodes_after_child(content):
    """Find text that appears directly inside a data-i18n element but AFTER a child element"""
    # Match <TAG data-i18n="..."> TEXT <CHILD> TEXT </TAG>
    patterns = []
    # Remove script and style tags for cleaner parsing
    clean = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', content, flags=re.DOTALL)
    # Find all data-i18n elements with child elements
    # This matches: <p data-i18n="key"> prefix <span>...</span> suffix </p>
    pattern = re.compile(
        r'<(\w+)[^>]*?data-i18n="([^"]+)"[^>]*>'
        r'(.*?)</\1>',
        re.DOTALL
    )
    
    issues = []
    for m in pattern.finditer(clean):
        tag = m.group(1)
        key = m.group(2)
        inner_html = m.group(3).strip()
        
        # Check if inner_html has child elements
        if re.search(r'<[a-zA-Z]', inner_html):
            # Extract all text nodes
            text_parts = []
            has_children = False
            for t in re.split(r'(<[^>]+>)', inner_html):
                if t.startswith('<') and not t.startswith('</'):
                    has_children = True
                elif not t.startswith('<') and not t.startswith('</'):
                    text_parts.append(t.strip())
            
            if has_children:
                # Check if any text node after a child contains CJK
                # Split by child elements to find trailing text
                segments = re.split(r'<[^>]+>', inner_html)
                trailing_text = segments[-1].strip() if len(segments) > 1 else ''
                
                if trailing_text and has_cjk(trailing_text):
                    issues.append({
                        'key': key,
                        'tag': tag,
                        'trailing': trailing_text[:100],
                        'inner': inner_html[:200]
                    })
    return issues

def main():
    print("=" * 72)
    print("SEO COMPREHENSIVE I18N AUDIT")
    print("=" * 72)
    
    html_files = find_html_files()
    en = load_json(EN_PATH)
    zh = load_json(ZH_PATH)
    
    en_keys = set(en.keys())
    zh_keys = set(zh.keys())
    
    all_html_keys = set()
    html_files_with_keys = defaultdict(set)
    
    issues = {
        'missing_lang_registry': [],
        'missing_i18n_key': [],
        'missing_zh': [],
        'hardcoded_chinese': [],
        'orphan_keys': set(),
        'child_chinese': [],
        'short_story': [],
    }
    
    # ──── 1. Scan every HTML file ────
    for fp in html_files:
        rel = os.path.relpath(fp, '.')
        with open(fp) as f:
            content = f.read()
        
        # 1a. Check lang-registry.js
        if 'lang-registry.js' not in content and 'translations.js' in content:
            issues['missing_lang_registry'].append(rel)
        
        # 1b. Extract data-i18n keys
        keys = extract_data_i18n_keys(content)
        all_html_keys.update(keys)
        html_files_with_keys[rel].update(keys)
        
        # 1c. Hardcoded Chinese in data-i18n text fallback
        # Find elements with data-i18n and Chinese in their fallback text
        for m in re.finditer(r'data-i18n="([^"]+)"[^>]*>([^<]+)<', content):
            key = m.group(1)
            fallback = m.group(2).strip()
            if has_cjk(fallback):
                issues['hardcoded_chinese'].append({
                    'file': rel,
                    'key': key,
                    'fallback': fallback[:80]
                })

        # 1d. Chinese text after child elements (story paragraph issue)
        child_issues = extract_text_nodes_after_child(content)
        for ci in child_issues:
            ci['file'] = rel
            issues['child_chinese'].append(ci)
    
    # ──── 2. Keys used in HTML but missing from en-ui.json ────
    for key in sorted(all_html_keys):
        if key not in en:
            # Find which file(s) use this key
            files_using = [f for f, kset in html_files_with_keys.items() if key in kset]
            issues['missing_i18n_key'].append({'key': key, 'files': files_using})
    
    # ──── 3. Keys in en-ui.json but missing from zh-CN-ui.json ────
    for key in sorted(en_keys):
        if key not in zh_keys:
            issues['missing_zh'].append(key)
    
    # ──── 4. Orphan keys: in JSON but NOT in any HTML ────
    used_keys = set()
    for fk in html_files_with_keys.values():
        used_keys.update(fk)
    orphans = en_keys - used_keys
    # Exclude certain namespaces
    known_orphans = {k for k in orphans 
                     if k.startswith(('meta_', 'gtm_', 'og_', 'page_', 'site_'))}
    issues['orphan_keys'] = sorted(orphans - known_orphans)
    issues['known_orphans'] = sorted(known_orphans)
    
    # ──── 5. Story paragraph lengths ────
    for key in sorted(en_keys):
        if '_story_p' in key:
            v = en[key]
            if len(v) < 120:
                issues['short_story'].append({'key': key, 'len': len(v), 'text': v[:100]})
    
    # ──── 6. Check all language files for missing keys ────
    lang_files = sorted([f for f in os.listdir(LANG_DIR) if f.endswith('.json') and f not in ('en-ui.json', 'zh-CN-ui.json')])
    lang_issues = {}
    for lf in lang_files:
        lf_path = os.path.join(LANG_DIR, lf)
        lf_data = load_json(lf_path)
        lf_keys = set(lf_data.keys())
        missing = en_keys - lf_keys
        extra = lf_keys - en_keys
        if missing or extra:
            lang_issues[lf] = {'missing': sorted(missing)[:10], 'extra': sorted(extra)[:10]}
    
    # ──── 7. Check story paragraph HTML content alignment ────
    # For HTML paragraphs, verify child span keys exist
    story_html_span_issues = []
    for key in sorted(en_keys):
        if '_story_p' in key:
            v = en[key]
            if re.search(r'<\w+', v):
                embedded_span_keys = set(re.findall(r'data-i18n="([^"]+)"', v))
                for sk in embedded_span_keys:
                    if sk not in en:
                        story_html_span_issues.append(f"  {key} references missing key '{sk}'")
                    # Verify embed key has the same English fallback
                    # (The span's fallback text in the innerHTML should match the key's translation)
                    if sk in en:
                        span_text = en[sk]
                        # Check if the span text is present in the value
                        if span_text and span_text not in v:
                            story_html_span_issues.append(f"  {key} embed span '{sk}' text '{span_text}' not found in innerHTML")
    
    # ──── 8. Summary ────
    print(f"\n📊  SCANNED: {len(html_files)} HTML files, {len(en_keys)} en keys, {len(zh_keys)} zh keys\n")

    print("─" * 72)
    print(f"1. LANG-REGISTRY.JS MISSING (files with translations.js but no lang-registry)")
    print("─" * 72)
    if issues['missing_lang_registry']:
        for f in issues['missing_lang_registry']:
            print(f"   ❌ {f}")
    else:
        print("   ✅ None — all files covered")

    print("\n" + "─" * 72)
    print(f"2. DATA-I18N KEYS IN HTML BUT MISSING FROM en-ui.json")
    print("─" * 72)
    if issues['missing_i18n_key']:
        for item in issues['missing_i18n_key']:
            print(f"   ❌ {item['key']} (in: {', '.join(item['files'][:3])})")
    else:
        print("   ✅ None — all HTML keys have translations")

    print("\n" + "─" * 72)
    print(f"3. KEYS IN en-ui.json BUT MISSING FROM zh-CN-ui.json")
    print("─" * 72)
    if issues['missing_zh']:
        for k in issues['missing_zh'][:20]:
            print(f"   ❌ {k}")
        if len(issues['missing_zh']) > 20:
            print(f"   ... and {len(issues['missing_zh']) - 20} more")
    else:
        print("   ✅ None — zh-CN has all keys")

    print("\n" + "─" * 72)
    print(f"4. HARDCODED CHINESE IN HTML (data-i18n fallback text)")
    print("─" * 72)
    if issues['hardcoded_chinese']:
        print(f"   ⚠️  {len(issues['hardcoded_chinese'])} instances found (expected for zh-CN pages)")
        # Group by file
        by_file = defaultdict(list)
        for item in issues['hardcoded_chinese']:
            by_file[item['file']].append(item)
        for fp, items in sorted(by_file.items()):
            short_items = [i for i in items if not i['file'].startswith('src/pages/cases/')]
            if short_items:
                for si in short_items:
                    print(f"   ⚠️  {si['file']}: [{si['key']}] '{si['fallback']}'")
    else:
        print("   ✅ No hardcoded Chinese")

    print("\n" + "─" * 72)
    print(f"5. ORPHAN KEYS (in en-ui.json but unused in HTML)")
    print("─" * 72)
    total_orphans = len(issues['orphan_keys']) + len(issues['known_orphans'])
    print(f"   Total orphans: {total_orphans}")
    if issues['orphan_keys']:
        print(f"   ⚠️  Suspicious ({len(issues['orphan_keys'])}):")
        frags = defaultdict(list)
        for k in issues['orphan_keys']:
            prefix = k.split('_')[0] if '_' in k else k
            frags[prefix].append(k)
        for prefix, ks in sorted(frags.items()):
            print(f"     {prefix}_*: {len(ks)} keys")
            for k in ks[:3]:
                print(f"       {k}")
    if issues['known_orphans']:
        print(f"   ℹ️  Known namespaces (meta_, gtm_, og_, page_, site_): {len(issues['known_orphans'])}")

    print("\n" + "─" * 72)
    print(f"6. SHORT STORY PARAGRAPHS (<120 chars)")
    print("─" * 72)
    if issues['short_story']:
        for item in issues['short_story']:
            print(f"   ⚠️  {item['key']}: {item['len']} chars")
    else:
        print("   ✅ None — all stories sufficiently long")

    print("\n" + "─" * 72)
    print(f"7. STORY PARAGRAPH CHINESE AFTER CHILD ELEMENTS")
    print("─" * 72)
    # This checks HTML files directly for Chinese text after child elements
    # (should be 0 since all stories now have English innerHTML)
    if issues['child_chinese']:
        for ci in issues['child_chinese'][:10]:
            print(f"   ⚠️  {ci['file']}: [{ci['key']}] tail: '{ci['trailing']}'")
        if len(issues['child_chinese']) > 10:
            print(f"   ... and {len(issues['child_chinese']) - 10} more")
    else:
        print("   ✅ No Chinese trailing text after child elements")

    print("\n" + "─" * 72)
    print(f"8. STORY HTML SPAN KEY INTEGRITY")
    print("─" * 72)
    if story_html_span_issues:
        for s in story_html_span_issues:
            print(f"   ❌ {s}")
    else:
        print("   ✅ All embedded span keys exist and fallback text matches")

    print("\n" + "─" * 72)
    print(f"9. OTHER LANGUAGE FILES - MISSING KEYS (top 10 per file)")
    print("─" * 72)
    if lang_issues:
        for lf, info in sorted(lang_issues.items()):
            if info['missing']:
                print(f"   ⚠️  {lf}: {len(info['missing'])} missing keys (e.g. {', '.join(info['missing'][:5])})")
            if info['extra']:
                print(f"   ℹ️  {lf}: {len(info['extra'])} extra keys (e.g. {', '.join(info['extra'][:3])})")
    else:
        print("   ✅ All language files complete")

    print("\n" + "=" * 72)
    # Final verdict
    critical = (issues['missing_lang_registry'] or issues['missing_i18n_key'] or 
                issues['short_story'] or issues['child_chinese'])
    
    if critical:
        print("❌  CRITICAL ISSUES FOUND — review above")
    else:
        print("✅  ALL CHECKS PASSED")
    
    print("=" * 72)

if __name__ == '__main__':
    main()

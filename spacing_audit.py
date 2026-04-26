#!/usr/bin/env python3
"""
KitchenYuKoLi — Tablet & Mobile Section Spacing Audit
Scans all tablet/mobile HTML files, extracts section spacing info,
and generates a comparison report.
"""

import os
import re
import json
from html.parser import HTMLParser
from collections import defaultdict

PROJECT = "/Users/chee/Projects/KitchenYuKoLi/src/pages"

# Tailwind spacing class pattern - match standalone classes in class attribute
TW_PAT = re.compile(
    r'(?:^|[\s"])(p[xytblr]?|m[xytblr]?|space-[xy])-'
    r'(\[.+?\]|0|0\.5|1|1\.5|2|2\.5|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|auto)(?=[\s"\']|$)'
)

INLINE_PAT = re.compile(
    r'(?:padding|margin)-(top|bottom|left|right|y|x|block|inline)\s*:\s*([^;"]+)',
    re.I
)

SECTION_SPACING_CSS = re.compile(
    r'section[^{]*\{[^}]*?(padding|margin)[^;]*:[^;]*;[^}]*\}',
    re.I
)

def find_html_files():
    """Find all tablet and mobile HTML files."""
    files = {"tablet": [], "mobile": []}
    for root, dirs, fnames in os.walk(PROJECT):
        for f in fnames:
            if f.endswith("-tablet.html"):
                files["tablet"].append(os.path.join(root, f))
            elif f.endswith("-mobile.html"):
                files["mobile"].append(os.path.join(root, f))
    return files

def parse_sections(filepath):
    """Parse HTML file and extract section spacing info."""
    with open(filepath, 'r', encoding='utf-8') as fh:
        content = fh.read()

    sections = []
    # Find all section tags with their attributes
    # Pattern: <section ...> or <section ...> with class/style
    section_pattern = re.compile(
        r'<section\b([^>]*)>(?:(?!</section>).*?)</section>|<section\b([^>]*)/>',
        re.DOTALL | re.I
    )

    for match in section_pattern.finditer(content):
        attrs_str = match.group(1) or match.group(2) or ""

        # Extract class
        class_match = re.search(r'class="([^"]*)"', attrs_str)
        classes = class_match.group(1) if class_match else ""

        # Extract style
        style_match = re.search(r'style="([^"]*)"', attrs_str)
        inline_style = style_match.group(1) if style_match else ""

        # Extract id
        id_match = re.search(r'id="([^"]*)"', attrs_str)
        section_id = id_match.group(1) if id_match else ""

        # Extract Tailwind spacing classes
        tw_classes = TW_PAT.findall(classes)
        all_tw = list(set(tw_classes))

        # Extract inline spacing
        inline_spacing = INLINE_PAT.findall(inline_style)

        # Extract section content length (brief)
        section_content = match.group(0)
        content_len = len(section_content)

        # Try to get a brief text hint (first 60 chars of text content)
        text_hint = re.sub(r'<[^>]+>', ' ', section_content)
        text_hint = re.sub(r'\s+', ' ', text_hint).strip()[:80]

        sections.append({
            "id": section_id,
            "classes": classes,
            "tw_spacing": all_tw,
            "inline_spacing": inline_spacing,
            "text_hint": text_hint,
            "content_len": content_len,
        })

    return sections

def extract_css_section_rules(css_path):
    """Extract section-related spacing rules from CSS files."""
    if not os.path.exists(css_path):
        return []
    with open(css_path, 'r', encoding='utf-8') as fh:
        content = fh.read()

    rules = []
    # Find rules targeting section
    rule_pattern = re.compile(
        r'([^{}]+?)\{([^{}]*?(?:padding|margin)[^{}]*?)\}',
        re.I
    )
    for m in rule_pattern.finditer(content):
        selector = m.group(1).strip()
        props = m.group(2).strip()
        if 'section' in selector.lower() or re.search(r'\bsection\b', selector):
            rules.append({"selector": selector, "properties": props})

    return rules

def group_by_page(files_dict):
    """Group tablet/mobile files by page (same path minus suffix)."""
    page_groups = defaultdict(dict)
    for device, file_list in files_dict.items():
        for fpath in file_list:
            # Extract relative path from PROJECT
            rel = os.path.relpath(fpath, PROJECT)
            page_key = re.sub(r'-(tablet|mobile)\.html$', '', rel)
            page_groups[page_key][device] = fpath
    return page_groups

def tw_to_px(cls_type, cls_val):
    """Approximate Tailwind spacing to px for comparison."""
    val_map = {
        '0': '0px', '0.5': '2px', '1': '4px', '1.5': '6px',
        '2': '8px', '2.5': '10px', '3': '12px', '4': '16px',
        '5': '20px', '6': '24px', '7': '28px', '8': '32px',
        '9': '36px', '10': '40px', '11': '44px', '12': '48px',
        '14': '56px', '16': '64px', '20': '80px', '24': '96px',
        '28': '112px', '32': '128px', '36': '144px', '40': '160px',
        '44': '176px', '48': '192px', '52': '208px', '56': '224px',
        '60': '240px', '64': '256px', '72': '288px', '80': '320px',
        '96': '384px',
    }
    return val_map.get(cls_val, cls_val)

def effective_spacing(section):
    """Extract effective top/bottom spacing from a section."""
    top_spacings = []
    bottom_spacings = []

    # From Tailwind classes
    for cls_type, cls_val in section["tw_spacing"]:
        if cls_val.startswith('['):
            # Arbitrary value like [20px]
            px = cls_val.strip('[]')
            cls_type_clean = cls_type
        else:
            px = tw_to_px(cls_type, cls_val)
            cls_type_clean = cls_type

        if cls_type_clean in ('pt', 'py', 'p'):
            top_spacings.append(f"tw:{cls_type_clean}-{cls_val} ({px})")
        if cls_type_clean in ('pb', 'py', 'p'):
            bottom_spacings.append(f"tw:{cls_type_clean}-{cls_val} ({px})")
        if cls_type_clean in ('mt', 'my', 'm'):
            top_spacings.append(f"tw:{cls_type_clean}-{cls_val} ({px})")
        if cls_type_clean in ('mb', 'my', 'm'):
            bottom_spacings.append(f"tw:{cls_type_clean}-{cls_val} ({px})")

    # From inline styles
    for prop, val in section["inline_spacing"]:
        if prop in ('top', 'y', 'block'):
            top_spacings.append(f"inline:{prop}={val}")
        if prop in ('bottom', 'y', 'block'):
            bottom_spacings.append(f"inline:{prop}={val}")

    return top_spacings, bottom_spacings

def main():
    print("🔍 Scanning HTML files...")
    files = find_html_files()
    print(f"  Found {len(files['tablet'])} tablet files, {len(files['mobile'])} mobile files")

    # Parse all sections
    all_data = {}  # page_key -> {device: [sections]}
    total_sections = 0

    for device in ['tablet', 'mobile']:
        for fpath in files[device]:
            rel = os.path.relpath(fpath, PROJECT)
            page_key = re.sub(r'-(tablet|mobile)\.html$', '', rel)
            if page_key not in all_data:
                all_data[page_key] = {}
            sections = parse_sections(fpath)
            all_data[page_key][device] = sections
            total_sections += len(sections)

    print(f"  Total sections found: {total_sections}")

    # Extract CSS rules
    print("\n🔍 Scanning CSS files for section rules...")
    css_files = [
        os.path.join(PROJECT, "..", "assets", "css", "styles.css"),
        os.path.join(PROJECT, "..", "styles.d3571a4e.css"),
    ]
    css_rules = []
    for cf in css_files:
        rules = extract_css_section_rules(cf)
        if rules:
            css_rules.extend(rules)
            print(f"  {os.path.basename(cf)}: {len(rules)} section-related rules")

    # Group pages by category for cross-page comparison
    page_groups = group_by_page(files)

    # --- ANALYSIS ---
    report_lines = []
    report_lines.append("# KitchenYuKoLi — Tablet & Mobile Section 间距审查报告\n")
    report_lines.append(f"> 生成时间：2026-04-26 | 扫描文件：{len(files['tablet']) + len(files['mobile'])} 个 | Section 总数：{total_sections}\n")
    report_lines.append("---\n")

    # ============ 1. OVERVIEW ============
    report_lines.append("## 📊 总览\n")
    report_lines.append(f"| 设备 | 文件数 | Section 数 |")
    report_lines.append(f"|------|--------|-----------|")
    for device in ['tablet', 'mobile']:
        cnt_files = len(files[device])
        cnt_sections = sum(len(v[device]) for v in all_data.values() if device in v)
        report_lines.append(f"| {device.capitalize()} | {cnt_files} | {cnt_sections} |")
    report_lines.append("")

    # ============ 2. CSS SECTION RULES ============
    report_lines.append("## 🎨 CSS 文件中的 Section 间距规则\n")
    if css_rules:
        for rule in css_rules:
            report_lines.append(f"### `{rule['selector']}`\n")
            report_lines.append(f"```css\n{rule['selector']} {{ {rule['properties']} }}\n```\n")
    else:
        report_lines.append("未找到专门的 section 间距规则。\n")

    # ============ 3. TABLET vs MOBILE COMPARISON ============
    report_lines.append("## 📋 Tablet vs Mobile 对比\n")
    report_lines.append("### 同一页面 Tablet 与 Mobile section 间距差异\n")

    issues_red = []  # Critical inconsistencies
    issues_yellow = []  # Potential issues
    green_count = 0

    for page_key in sorted(all_data.keys()):
        page_data = all_data[page_key]
        if 'tablet' not in page_data or 'mobile' not in page_data:
            continue

        tablet_secs = page_data['tablet']
        mobile_secs = page_data['mobile']

        if len(tablet_secs) != len(mobile_secs):
            issues_red.append({
                "page": page_key,
                "issue": f"Section 数量不一致：Tablet {len(tablet_secs)} 个 vs Mobile {len(mobile_secs)} 个",
                "severity": "HIGH"
            })
            continue

        page_issues = []
        for i, (ts, ms) in enumerate(zip(tablet_secs, mobile_secs)):
            t_top, t_bot = effective_spacing(ts)
            m_top, m_bot = effective_spacing(ms)

            diffs = []
            if t_top != m_top:
                diffs.append(f"**顶部间距不同**\n  - Tablet: {t_top if t_top else '无'}\n  - Mobile: {m_top if m_top else '无'}")
            if t_bot != m_bot:
                diffs.append(f"**底部间距不同**\n  - Tablet: {t_bot if t_bot else '无'}\n  - Mobile: {m_bot if m_bot else '无'}")

            if diffs:
                sec_id = ts['id'] or ms['id'] or f'#{i+1}'
                hint = ts['text_hint'][:60] if ts['text_hint'] else ms['text_hint'][:60]
                page_issues.append({
                    "section": sec_id,
                    "hint": hint,
                    "diffs": diffs
                })

        if page_issues:
            report_lines.append(f"#### `{page_key}` — {len(page_issues)} 处差异\n")
            for pi in page_issues:
                report_lines.append(f"**Section `{pi['section']}`** {pi['hint']}\n")
                for d in pi['diffs']:
                    report_lines.append(f"{d}\n")
                issues_yellow.append({
                    "page": page_key,
                    "section": pi['section'],
                    "details": pi['diffs']
                })
        else:
            green_count += 1

    report_lines.append(f"\n> ✅ 共 {green_count} 个页面 Tablet 与 Mobile section 间距完全一致\n")

    # ============ 4. CROSS-PAGE CONSISTENCY ============
    report_lines.append("## 🔄 同类页面 Section 间距一致性\n")

    # Group by directory for cross-page comparison
    category_groups = defaultdict(list)
    for page_key in sorted(all_data.keys()):
        parts = page_key.rsplit('/', 1)
        category = parts[0] if len(parts) > 1 else 'root'
        category_groups[category].append(page_key)

    for cat, pages in sorted(category_groups.items()):
        if len(pages) < 2:
            continue
        report_lines.append(f"### `{cat}/` ({len(pages)} 个页面)\n")

        # Collect spacing patterns for each page
        patterns = {}
        for pk in pages:
            for device in ['tablet', 'mobile']:
                if device in all_data[pk]:
                    key = f"{pk} [{device}]"
                    sec_spacings = []
                    for s in all_data[pk][device]:
                        t, b = effective_spacing(s)
                        sec_spacings.append((t, b))
                    patterns[key] = sec_spacings

        # Check if all pages have same number of sections and same spacing
        ref_key = list(patterns.keys())[0]
        ref_len = len(patterns[ref_key])
        inconsistent = False

        for pk_key, spacings in patterns.items():
            if len(spacings) != ref_len:
                inconsistent = True
                issues_yellow.append({
                    "page": cat,
                    "issue": f"`{pk_key}` 有 {len(spacings)} 个 section，参照页 `{ref_key}` 有 {ref_len} 个"
                })

        if not inconsistent and ref_len > 0:
            # Check spacing consistency
            ref_spacings = patterns[ref_key]
            for pk_key, spacings in patterns.items():
                if pk_key == ref_key:
                    continue
                for idx, ((rt, rb), (pt, pb)) in enumerate(zip(ref_spacings, spacings)):
                    if rt != pt or rb != pb:
                        issues_yellow.append({
                            "page": f"{cat} sec#{idx+1}",
                            "issue": f"`{pk_key}` vs `{ref_key}` 间距不同: T({rt}→{pt}) B({rb}→{pb})"
                        })
                        inconsistent = True

        if not inconsistent:
            report_lines.append(f"  ✅ 所有页面 section 间距一致\n")

    # ============ 5. SECTIONS WITH NO SPACING ============
    report_lines.append("## ⚠️ 缺少间距定义的 Section\n")
    no_spacing = []
    for page_key in sorted(all_data.keys()):
        for device in ['tablet', 'mobile']:
            if device not in all_data[page_key]:
                continue
            for i, sec in enumerate(all_data[page_key][device]):
                t, b = effective_spacing(sec)
                if not t and not b:
                    hint = sec['text_hint'][:60] if sec['text_hint'] else '(empty)'
                    no_spacing.append({
                        "page": page_key,
                        "device": device,
                        "section_id": sec['id'] or f'#{i+1}',
                        "hint": hint,
                        "classes": sec['classes']
                    })

    if no_spacing:
        report_lines.append(f"共发现 **{len(no_spacing)}** 个 section 未设置任何显式间距（无 Tailwind 间距 class，无 inline margin/padding）。\n")
        # Group by page
        by_page = defaultdict(list)
        for ns in no_spacing:
            by_page[ns['page']].append(ns)

        for page, items in sorted(by_page.items()):
            report_lines.append(f"#### `{page}`\n")
            for it in items:
                report_lines.append(f"- `{it['device']}` Section `{it['section_id']}`: {it['hint']}\n")
    else:
        report_lines.append("所有 section 均有间距定义 ✅\n")

    # ============ 6. INCONSISTENT SPACING VALUES ============
    report_lines.append("## 📐 间距值分布统计\n")

    # Collect all spacing values
    all_tw_vals = defaultdict(int)
    for page_key in all_data:
        for device in all_data[page_key]:
            for sec in all_data[page_key][device]:
                for cls_type, cls_val in sec['tw_spacing']:
                    all_tw_vals[f"{cls_type}-{cls_val}"] += 1

    report_lines.append("### Tailwind 间距 Class 使用频率\n")
    report_lines.append("| Class | 使用次数 |")
    report_lines.append("|-------|---------|")
    for cls, cnt in sorted(all_tw_vals.items(), key=lambda x: -x[1]):
        report_lines.append(f"| `{cls}` | {cnt} |")
    report_lines.append("")

    # ============ 7. SUMMARY ============
    report_lines.append("---\n")
    report_lines.append("## 📋 问题汇总\n")

    report_lines.append("### 🔴 严重不一致（Section 数量不匹配）\n")
    if issues_red:
        for ir in issues_red:
            report_lines.append(f"- **{ir['page']}** — {ir['issue']}\n")
    else:
        report_lines.append("无严重不一致问题 ✅\n")

    report_lines.append("### 🟡 Tablet vs Mobile 间距差异\n")
    if issues_yellow:
        # Deduplicate and group
        seen = set()
        for iy in issues_yellow:
            key = f"{iy.get('page','')}-{iy.get('section','')}"
            if key not in seen:
                seen.add(key)
                page = iy.get('page', '')
                section = iy.get('section', '')
                details = iy.get('details', [iy.get('issue', '')])
                if isinstance(details, list):
                    details_str = '; '.join(details)
                else:
                    details_str = str(details)
                report_lines.append(f"- **{page}** Section `{section}`: {details_str}\n")
        report_lines.append(f"\n> 共 {len(seen)} 处差异\n")
    else:
        report_lines.append("无差异 ✅\n")

    report_lines.append("### 🟢 间距一致页面\n")
    report_lines.append(f"共 {green_count} 个页面 Tablet 与 Mobile 间距完全一致 ✅\n")

    # ============ 8. RECOMMENDATIONS ============
    report_lines.append("## 💡 修复建议\n")
    report_lines.append("""
1. **统一 Section 间距体系**：建议建立一套标准的 section 间距变量系统：
   - 页面顶部 hero section：`py-16 md:py-24`（64px / 96px）
   - 普通内容 section：`py-12 md:py-16`（48px / 64px）
   - 小间距分隔：`py-8 md:py-12`（32px / 48px）
   - 底部 CTA section：`py-16 md:py-20`（64px / 80px）

2. **缺少间距的 Section**：为所有无间距定义的 section 添加 `py-12` 或类似 class。

3. **Tablet vs Mobile 差异**：对于同一页面，Tablet 和 Mobile 的 section 间距应保持一致或成比例缩放。建议：
   - Mobile 使用较小的间距（如 `py-8` ~ `py-12`）
   - Tablet 使用稍大的间距（如 `py-12` ~ `py-16`）
   - 两者比例关系应保持一致

4. **CSS 变量化**：将 section 间距提取为 CSS 自定义属性，便于全局调整：
   ```css
   :root {
     --section-spacing-sm: 2rem;   /* 32px */
     --section-spacing-md: 3rem;   /* 48px */
     --section-spacing-lg: 4rem;   /* 64px */
     --section-spacing-xl: 6rem;   /* 96px */
   }
   section { padding-top: var(--section-spacing-md); padding-bottom: var(--section-spacing-md); }
   ```

5. **同类页面统一**：applications/、solutions/ 下的子页面 section 结构应保持一致，间距也应对齐。
""")

    report_lines.append("---\n")
    report_lines.append("*报告由 spacing_audit.py 自动生成*")

    # Write report
    report_path = os.path.join("/Users/chee/Projects/KitchenYuKoLi", "spacing-audit-report.md")
    with open(report_path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(report_lines))

    print(f"\n✅ 报告已写入: {report_path}")
    print(f"   总文件: {len(files['tablet']) + len(files['mobile'])}")
    print(f"   总 Section: {total_sections}")
    print(f"   🔴 严重问题: {len(issues_red)}")
    print(f"   🟡 间距差异: {len(issues_yellow)}")
    print(f"   ⚠️ 无间距 Section: {len(no_spacing)}")
    print(f"   🟢 一致页面: {green_count}")

if __name__ == "__main__":
    main()

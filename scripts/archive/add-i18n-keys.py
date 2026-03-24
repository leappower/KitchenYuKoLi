#!/usr/bin/env python3
"""
add-i18n-keys.py — 自动为页面 HTML 中未标记的文本添加 data-i18n 属性
并更新 zh-CN-ui.json 和 en-ui.json

运行方式: python3 scripts/add-i18n-keys.py
"""
import re, glob, json, unicodedata

# ─── 工具函数 ─────────────────────────────────────────────────────────────────

def slugify(text, max_len=40):
    """将文本转换为 snake_case key"""
    text = text.lower().strip()
    # 移除 HTML 实体
    text = re.sub(r'&[a-z]+;', ' ', text)
    # 只保留字母数字和空格
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', '_', text).strip('_')
    return text[:max_len].rstrip('_')

def make_key(page, text, existing_keys, device=''):
    """生成唯一的 i18n key"""
    slug = slugify(text)
    if not slug or len(slug) < 2:
        return None
    prefix = page + ('_' + device if device else '') + '_'
    key = prefix + slug
    # 如果 key 已存在且值相同，复用
    if key in existing_keys:
        return key
    # 避免冲突
    base = key
    i = 2
    while key in existing_keys:
        key = base + '_' + str(i)
        i += 1
    return key

# ─── 页面配置 ─────────────────────────────────────────────────────────────────
# 格式: (page_prefix, [pc_file, tablet_file, mobile_file])
# device 前缀规则:
#   - 所有设备共有 → page_xxx
#   - 仅 PC → page_pc_xxx
#   - 仅 tablet+mobile → page_mobile_tablet_xxx
#   - 仅 mobile → page_mobile_xxx

PAGE_FILES = {
    'home':         ['src/pages/home/index-pc.html', 'src/pages/home/index-tablet.html', 'src/pages/home/index-mobile.html'],
    'catalog':      ['src/pages/catalog/index-pc.html', 'src/pages/catalog/index-tablet.html', 'src/pages/catalog/index-mobile.html'],
    'pdp':          ['src/pages/pdp/index-pc.html', 'src/pages/pdp/index-tablet.html', 'src/pages/pdp/index-mobile.html'],
    'roi':          ['src/pages/roi/index-pc.html', 'src/pages/roi/index-tablet.html', 'src/pages/roi/index-mobile.html'],
    'support':      ['src/pages/support/index-pc.html', 'src/pages/support/index-tablet.html', 'src/pages/support/index-mobile.html'],
    'esg':          ['src/pages/esg/index-pc.html', 'src/pages/esg/index-tablet.html', 'src/pages/esg/index-mobile.html'],
    'case_studies': ['src/pages/case-studies/index-pc.html', 'src/pages/case-studies/index-tablet.html', 'src/pages/case-studies/index-mobile.html'],
    'quote':        ['src/pages/quote/index-pc.html', 'src/pages/quote/index-tablet.html', 'src/pages/quote/index-mobile.html'],
    'landing':      ['src/pages/landing/index-pc.html', 'src/pages/landing/index-tablet.html', 'src/pages/landing/index-mobile.html'],
    'thank_you':    ['src/pages/thank-you/index-pc.html', 'src/pages/thank-you/index-tablet.html', 'src/pages/thank-you/index-mobile.html'],
    'case_download':['src/pages/case-download/index-pc.html'],
}

# ─── 跳过规则 ─────────────────────────────────────────────────────────────────
SKIP_PATTERNS = [
    r'^[\d\s\.\,\%\+\-\$\°\×\/\:\|\(\)]+$',  # 纯数字/符号
    r'^[a-z_]+$',                               # Material Icons 名称
    r'^\s*$',                                   # 空白
    r'^(https?://|www\.)',                      # URL
    r'^\d{4}',                                  # 年份开头
    r'^[A-Z]{2,}\d',                            # 型号编号如 S2, V3
    r'^\+\d',                                   # 电话号码
    r'^©',                                      # 版权符号
    r'^(CE|UL|NSF|ISO|FDA|HACCP)',              # 认证标准
    r'^\d+[xX×]\d+',                            # 尺寸
    r'^(v\d|V\d)',                              # 版本号
    r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',  # 月份
    r'^\d{2}:\d{2}',                            # 时间
    r'^(AM|PM)',                                 # 时间后缀
    r'^Yukoli\s+(Robo|Omni|OS)',                # 产品型号名
    r'^(WhatsApp|LINE|LinkedIn)',               # 社交媒体名
]

def should_skip(text):
    text = text.strip()
    if len(text) < 4:
        return True
    for p in SKIP_PATTERNS:
        if re.match(p, text, re.IGNORECASE):
            return True
    return False

# ─── 主逻辑 ───────────────────────────────────────────────────────────────────

def extract_unmapped(content):
    """提取没有 data-i18n 的文本元素"""
    # 匹配没有 data-i18n 属性的标签中的文本
    pattern = re.compile(
        r'(<(h[1-6]|p|span|button|label|li|a|th|td)(\s[^>]*)?>)([^<]{4,120})(</\2>)',
        re.DOTALL
    )
    results = []
    for m in pattern.finditer(content):
        open_tag, tag, attrs, text, close_tag = m.group(1), m.group(2), m.group(3) or '', m.group(4), m.group(5)
        text_clean = text.strip()
        # Skip if already has data-i18n
        if 'data-i18n' in open_tag:
            continue
        if should_skip(text_clean):
            continue
        results.append((m.start(), m.end(), open_tag, tag, attrs, text, close_tag, text_clean))
    return results

def add_i18n_to_tag(open_tag, key):
    """在开标签中添加 data-i18n 属性"""
    # 在 > 前插入 data-i18n="key"
    return re.sub(r'>$', f' data-i18n="{key}">', open_tag)

def process_page(page_prefix, filepath, zh_dict, en_dict, text_to_key):
    """处理单个页面文件"""
    import os
    if not os.path.exists(filepath):
        return 0

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    unmapped = extract_unmapped(content)
    if not unmapped:
        return 0

    # 确定设备类型
    if 'index-pc' in filepath:
        device_hint = 'pc'
    elif 'index-tablet' in filepath:
        device_hint = 'tablet'
    elif 'index-mobile' in filepath:
        device_hint = 'mobile'
    else:
        device_hint = ''

    # 从后往前替换（避免偏移量变化）
    new_content = content
    replacements = 0
    all_keys = set(zh_dict.keys())

    for start, end, open_tag, tag, attrs, text, close_tag, text_clean in reversed(unmapped):
        # 检查是否已有相同文本的 key（跨设备复用）
        if text_clean in text_to_key:
            key = text_to_key[text_clean]
        else:
            # 生成新 key
            key = make_key(page_prefix, text_clean, all_keys, '')
            if not key:
                continue
            all_keys.add(key)
            text_to_key[text_clean] = key
            # 添加到 JSON（英文保留原文，中文待翻译标记）
            en_dict[key] = text_clean
            zh_dict[key] = text_clean  # 暂时用英文，后续人工翻译

        new_open_tag = add_i18n_to_tag(open_tag, key)
        new_content = new_content[:start] + new_open_tag + text + close_tag + new_content[end:]
        replacements += 1

    if replacements > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return replacements

# ─── 执行 ─────────────────────────────────────────────────────────────────────

with open('src/assets/lang/zh-CN-ui.json', encoding='utf-8') as f:
    zh = json.load(f)
with open('src/assets/lang/en-ui.json', encoding='utf-8') as f:
    en = json.load(f)

text_to_key = {}  # 跨文件复用相同文本的 key
total = 0

for page, files in PAGE_FILES.items():
    for filepath in files:
        count = process_page(page, filepath, zh, en, text_to_key)
        if count:
            print(f'  {filepath}: +{count} keys')
        total += count

# 保存 JSON
with open('src/assets/lang/zh-CN-ui.json', 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)
with open('src/assets/lang/en-ui.json', 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nTotal: {total} keys added')
print(f'zh-CN-ui.json: {len(zh)} keys')
print(f'en-ui.json: {len(en)} keys')

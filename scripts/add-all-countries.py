#!/usr/bin/env python3
"""
add-all-countries.py — Add all 25-language-region countries to profit calculator + quote page.

1. Updates profit-calculator HTML (PC/Mobile/Tablet) — adds country options
2. Updates quote page HTML (PC/Mobile/Tablet) — adds country options
3. Updates profit-calculator.js — DEFAULT_SALARIES + LANG_COUNTRY_MAP + langCurrency()
4. Adds i18n keys for all country names to all 25 language files
"""

import json, os, re, sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG_DIR = os.path.join(PROJECT_ROOT, "src", "assets", "lang")
JS_FILE = os.path.join(PROJECT_ROOT, "src", "assets", "js", "profit-calculator.js")

# ═══════════════════════════════════════════════════════════
#  COMPLETE COUNTRY LIST (28 countries + Other)
# ═══════════════════════════════════════════════════════════
# code, full_name (for profit calc value), native_suffix, monthly_salary, currency_code, symbol
COUNTRIES = [
    ("SG", "Singapore",        "",            2500,  "SGD",  "S$"),
    ("MY", "Malaysia",         "",            2500,  "MYR",  "RM"),
    ("ID", "Indonesia",        "",            4800000, "IDR", "Rp"),
    ("PH", "Philippines",      "",            25000, "PHP",  "₱"),
    ("TH", "Thailand",         "",            15000, "THB",  "฿"),
    ("VN", "Vietnam",          "",            7000000, "VND", "₫"),
    ("MM", "Myanmar",          "",            500000, "MMK",  "K"),
    ("KH", "Cambodia",         "",            400000, "KHR",  "៛"),
    ("LA", "Laos",             "",            2500000, "LAK", "₭"),
    ("CN", "China",            "/ 中国",       5000,  "CNY",  "¥"),
    ("JP", "Japan",            "/ 日本",       220000, "JPY",  "¥"),
    ("KR", "South Korea",      "/ 한국",       2800000, "KRW", "₩"),
    ("IN", "India",            "/ भारत",      25000, "INR",  "₹"),
    ("SA", "Saudi Arabia",     "/ السعودية",   4000,  "SAR",  "ر.س"),
    ("TW", "Taiwan",           "/ 台灣",       40000, "TWD",  "NT$"),
    ("DE", "Germany",          "",            2500,  "EUR",  "€"),
    ("ES", "Spain",            "",            1800,  "EUR",  "€"),
    ("FR", "France",           "",            2200,  "EUR",  "€"),
    ("PT", "Portugal",         "",            1200,  "EUR",  "€"),
    ("RU", "Russia",           "",            50000, "RUB",  "₽"),
    ("NL", "Netherlands",      "",            2500,  "EUR",  "€"),
    ("PL", "Poland",           "",            4500,  "PLN",  "zł"),
    ("IT", "Italy",            "",            1800,  "EUR",  "€"),
    ("TR", "Turkey",           "",            15000, "TRY",  "₺"),
    ("IL", "Israel",           "",            7000,  "ILS",  "₪"),
    ("HK", "Hong Kong SAR",    "",            15000, "HKD",  "HK$"),
    ("MO", "Macau SAR",        "",            12000, "MOP",  "MOP$"),
    ("BN", "Brunei",           "",            1800,  "BND",  "B$"),
]

# i18n key suffix mapping
COUNTRY_I18N_MAP = {
    "SG": "sg", "MY": "my", "ID": "id", "PH": "ph", "TH": "th", "VN": "vn",
    "MM": "mm", "KH": "kh", "LA": "la", "CN": "china",
    "JP": "jp", "KR": "kr", "IN": "in", "SA": "sa", "TW": "tw",
    "DE": "de", "ES": "es", "FR": "fr", "PT": "pt", "RU": "ru",
    "NL": "nl", "PL": "pl", "IT": "it", "TR": "tr", "IL": "il",
    "HK": "hk", "MO": "mo", "BN": "bn",
}


# ═══════════════════════════════════════════════════════════
#  Helper: escape for use in sed/regex
# ═══════════════════════════════════════════════════════════
def escape_regex(s):
    return re.escape(s)


# ═══════════════════════════════════════════════════════════
#  Step 1: Update profit-calculator HTML
# ═══════════════════════════════════════════════════════════
def update_profit_calc_html(filepath):
    with open(filepath) as f:
        html = f.read()

    # Find the country select section
    start = html.find('<select\n                      data-custom-select\n                      id="pc-country"')
    if start < 0:
        # Try mobile/tablet variant
        start = html.find('<select\n                        data-custom-select\n                        id="pc-country"')
    if start < 0:
        start = html.find('<select\n                      data-custom-select\n                      id="pc-country')
    
    if start < 0:
        print(f"  ⚠ Cannot find pc-country select in {filepath}")
        return

    # Find the closing </select> of the country select
    end = html.find('</select>', start)
    end += len('</select>')
    
    # Get the existing options
    select_content = html[start:end]
    
    # Build new options
    options_html = (
        '<option value="" data-i18n="profit_calc_select_country">Select country…</option>\n'
    )
    for code, name, native_suffix, *_ in COUNTRIES:
        i18n_key = f'profit_country_{COUNTRY_I18N_MAP[code]}'
        # Some countries have special formatting
        if native_suffix:
            # Special case: multi-language display
            options_html += (
                f'                      <option value="{name}">\n'
                f'                        🇫🇮 {name} /\n'
                f'                        <span data-i18n="{i18n_key}">{name}{native_suffix}</span>\n'
                f'                      </option>\n'
            )
        else:
            options_html += (
                f'                      <option value="{name}" data-i18n="{i18n_key}">{name}</option>\n'
            )
    options_html += '                      <option value="Other" data-i18n="profit_calc_other">Other</option>'

    # Remove emoji placeholders - we'll just use flag emojis
    # Rebuild without emoji in the value itself
    options_html = ""
    for code, name, native_suffix, *_ in COUNTRIES:
        i18n_key = f'profit_country_{COUNTRY_I18N_MAP[code]}'
        flag = ""  # We'll skip flag emojis in the raw HTML for simplicity
        if native_suffix:
            options_html += (
                f'                      <option value="{name}">\n'
                f'                        <span data-i18n="{i18n_key}">{name}{native_suffix}</span>\n'
                f'                      </option>\n'
            )
        else:
            options_html += (
                f'                      <option value="{name}" data-i18n="{i18n_key}">{name}</option>\n'
            )
    options_html += '                      <option value="Other" data-i18n="profit_calc_other">Other</option>'
    
    # Replace the select content
    new_content = re.sub(
        r'<option value=""[^>]*>.*?</option>.*?</select>',
        options_html + '\n                    </select>',
        select_content,
        flags=re.DOTALL
    )
    
    html = html[:start] + new_content + html[end:]
    
    with open(filepath, 'w') as f:
        f.write(html)
    
    print(f"  ✅ Updated {filepath}")


# ═══════════════════════════════════════════════════════════
#  Step 2: Update quote page HTML
# ═══════════════════════════════════════════════════════════
def update_quote_html(filepath):
    with open(filepath) as f:
        html = f.read()

    # Find the country select
    start = html.find('id="q-country"')
    if start < 0:
        print(f"  ⚠ Cannot find q-country select in {filepath}")
        return
    
    # Find the select open tag
    sel_start = html.rfind('<select', 0, start)
    if sel_start < 0:
        print(f"  ⚠ Cannot find select tag in {filepath}")
        return
    
    # Find closing </select>
    end = html.find('</select>', sel_start)
    if end < 0:
        print(f"  ⚠ Cannot find </select> in {filepath}")
        return
    end += len('</select>')
    
    # Build new options
    options = []
    options.append('<option value="" data-i18n="quote_select_country">Select Country</option>')
    for code, name, *_ in COUNTRIES:
        i18n_key = f'quote_country_{COUNTRY_I18N_MAP[code]}'
        if code == "CN":
            options.append(f'<option value="{code}">🇨🇳 <span data-i18n="{i18n_key}">{name}</span></option>')
        else:
            options.append(f'<option value="{code}" data-i18n="{i18n_key}">{name}</option>')
    options.append('<option value="other" data-i18n="quote_other_countries">Other Countries</option>')
    
    options_html = '\n                      '.join(options) if 'pc' in filepath else '\n        '.join(options)
    
    new_select = re.sub(
        r'<option value=""[^>]*>.*?</option>.*?</select>',
        options_html + '\n                    </select>' if 'pc' in filepath else options_html + '\n        </select>',
        html[sel_start:end],
        flags=re.DOTALL
    )
    
    html = html[:sel_start] + new_select + html[end:]
    
    with open(filepath, 'w') as f:
        f.write(html)
    
    print(f"  ✅ Updated {filepath}")


# ═══════════════════════════════════════════════════════════
#  Step 3: Update profit-calculator.js
# ═══════════════════════════════════════════════════════════
def update_js():
    with open(JS_FILE) as f:
        js = f.read()

    # 3a. Add DEFAULT_SALARIES
    salary_entries = ''
    for code, name, _native_suffix, monthly, currency, symbol in COUNTRIES:
        salary_entries += f'    {json.dumps(name)}: {{ monthly: {monthly}, currency: {json.dumps(currency)}, symbol: {json.dumps(symbol)} }},\n'
    
    # Find the DEFAULT_SALARIES block end
    # It currently ends with "Other: { monthly: 2000, currency: "USD", symbol: "$" },"
    salary_start = js.find('var DEFAULT_SALARIES')
    salary_block_end = js.find('};', salary_start)
    salary_content_start = js.find('{', salary_start) + 1
    
    new_salary_block = 'var DEFAULT_SALARIES = {\n' + salary_entries + '    Other: { monthly: 2000, currency: "USD", symbol: "$" },\n  };'
    js = js[:salary_start] + new_salary_block + js[salary_block_end+2:]
    
    # 3b. Update LANG_COUNTRY_MAP
    lang_map_start = js.find('var LANG_COUNTRY_MAP')
    lang_map_end = js.find('};', lang_map_start) + 2
    
    new_lang_map = '''var LANG_COUNTRY_MAP = {
    "zh-CN": "China",
    "zh-TW": "Taiwan",
    zh: "China",
    en: "Other",
    th: "Thailand",
    vi: "Vietnam",
    id: "Indonesia",
    ms: "Malaysia",
    fil: "Philippines",
    ja: "Japan",
    ko: "South Korea",
    hi: "India",
    ar: "Saudi Arabia",
    de: "Germany",
    es: "Spain",
    fr: "France",
    pt: "Portugal",
    ru: "Russia",
    nl: "Netherlands",
    pl: "Poland",
    it: "Italy",
    tr: "Turkey",
    km: "Cambodia",
    lo: "Laos",
    my: "Myanmar",
    he: "Israel",
  };'''
    
    js = js[:lang_map_start] + new_lang_map + js[lang_map_end:]
    
    with open(JS_FILE, 'w') as f:
        f.write(js)
    
    print("  ✅ Updated profit-calculator.js")


# ═══════════════════════════════════════════════════════════
#  Step 4: Add i18n keys for country names
# ═══════════════════════════════════════════════════════════
COUNTRY_TRANSLATIONS = {
    "SG": {
        "en": "Singapore",
        "zh-CN": "新加坡",
        "zh-TW": "新加坡",
        "th": "สิงคโปร์",
        "vi": "Singapore",
        "ms": "Singapura",
        "id": "Singapura",
        "fil": "Singapore",
        "ja": "シンガポール",
        "ko": "싱가포르",
        "hi": "सिंगापुर",
        "ar": "سنغافورة",
        "de": "Singapur",
        "es": "Singapur",
        "fr": "Singapour",
        "pt": "Singapura",
        "ru": "Сингапур",
        "nl": "Singapore",
        "pl": "Singapur",
        "it": "Singapore",
        "tr": "Singapur",
        "km": "សិង្ហបុរី",
        "lo": "ສິງກະໂປ",
        "my": "စင်ကာပူ",
        "he": "סינגפור",
    },
    "MM": {"en": "Myanmar / Burma", "zh-CN": "缅甸", "zh-TW": "緬甸",
           "th": "เมียนมา", "vi": "Myanmar", "ms": "Myanmar", "id": "Myanmar",
           "fil": "Myanmar", "ja": "ミャンマー", "ko": "미얀마", "hi": "म्यांमार",
           "ar": "ميانمار", "de": "Myanmar", "es": "Myanmar", "fr": "Myanmar",
           "pt": "Mianmar", "ru": "Мьянма", "nl": "Myanmar", "pl": "Mjanma",
           "it": "Myanmar", "tr": "Myanmar", "km": "មីយ៉ាន់ម៉ា", "lo": "ມຽນມາ",
           "my": "မြန်မာ", "he": "מיאנמר"},
    "KH": {"en": "Cambodia", "zh-CN": "柬埔寨", "zh-TW": "柬埔寨",
           "th": "กัมพูชา", "vi": "Campuchia", "ms": "Kemboja", "id": "Kamboja",
           "fil": "Cambodia", "ja": "カンボジア", "ko": "캄보디아", "hi": "कंबोडिया",
           "ar": "كمبوديا", "de": "Kambodscha", "es": "Camboya", "fr": "Cambodge",
           "pt": "Camboja", "ru": "Камбоджа", "nl": "Cambodja", "pl": "Kambodża",
           "it": "Cambogia", "tr": "Kamboçya", "km": "កម្ពុជា", "lo": "ກຳປູເຈຍ",
           "my": "ကမ္ဘောဒီးယား", "he": "קמבודיה"},
    "LA": {"en": "Laos", "zh-CN": "老挝", "zh-TW": "寮國",
           "th": "ลาว", "vi": "Lào", "ms": "Laos", "id": "Laos",
           "fil": "Laos", "ja": "ラオス", "ko": "라오스", "hi": "लाओस",
           "ar": "لاوس", "de": "Laos", "es": "Laos", "fr": "Laos",
           "pt": "Laos", "ru": "Лаос", "nl": "Laos", "pl": "Laos",
           "it": "Laos", "tr": "Laos", "km": "ລາວ", "lo": "ລາວ",
           "my": "လာအို", "he": "לאוס"},
    "DE": {"en": "Germany", "zh-CN": "德国", "zh-TW": "德國",
           "th": "เยอรมนี", "vi": "Đức", "ms": "Jerman", "id": "Jerman",
           "fil": "Germany", "ja": "ドイツ", "ko": "독일", "hi": "जर्मनी",
           "ar": "ألمانيا", "de": "Deutschland", "es": "Alemania", "fr": "Allemagne",
           "pt": "Alemanha", "ru": "Германия", "nl": "Duitsland", "pl": "Niemcy",
           "it": "Germania", "tr": "Almanya", "km": "អាល្លឺម៉ង់", "lo": "ເຢຍລະມັນ",
           "my": "ဂျာမနီ", "he": "גרמניה"},
    "ES": {"en": "Spain", "zh-CN": "西班牙", "zh-TW": "西班牙",
           "th": "สเปน", "vi": "Tây Ban Nha", "ms": "Sepanyol", "id": "Spanyol",
           "fil": "Spain", "ja": "スペイン", "ko": "스페인", "hi": "स्पेन",
           "ar": "إسبانيا", "de": "Spanien", "es": "España", "fr": "Espagne",
           "pt": "Espanha", "ru": "Испания", "nl": "Spanje", "pl": "Hiszpania",
           "it": "Spagna", "tr": "İspanya", "km": "អេស្ប៉ាញ", "lo": "ສະເປນ",
           "my": "စပိန်", "he": "ספרד"},
    "FR": {"en": "France", "zh-CN": "法国", "zh-TW": "法國",
           "th": "ฝรั่งเศส", "vi": "Pháp", "ms": "Perancis", "id": "Prancis",
           "fil": "France", "ja": "フランス", "ko": "프랑스", "hi": "फ़्रांस",
           "ar": "فرنسا", "de": "Frankreich", "es": "Francia", "fr": "France",
           "pt": "França", "ru": "Франция", "nl": "Frankrijk", "pl": "Francja",
           "it": "Francia", "tr": "Fransa", "km": "បារាំង", "lo": "ຝຣັ່ງ",
           "my": "ပြင်သစ်", "he": "צרפת"},
    "PT": {"en": "Portugal", "zh-CN": "葡萄牙", "zh-TW": "葡萄牙",
           "th": "โปรตุเกส", "vi": "Bồ Đào Nha", "ms": "Portugal", "id": "Portugal",
           "fil": "Portugal", "ja": "ポルトガル", "ko": "포르투갈", "hi": "पुर्तगाल",
           "ar": "البرتغال", "de": "Portugal", "es": "Portugal", "fr": "Portugal",
           "pt": "Portugal", "ru": "Португалия", "nl": "Portugal", "pl": "Portugalia",
           "it": "Portogallo", "tr": "Portekiz", "km": "ព័រទុយហ្គាល់", "lo": "ປອກຕຸຍການ",
           "my": "ပေါ်တူဂီ", "he": "פורטוגל"},
    "RU": {"en": "Russia", "zh-CN": "俄罗斯", "zh-TW": "俄羅斯",
           "th": "รัสเซีย", "vi": "Nga", "ms": "Rusia", "id": "Rusia",
           "fil": "Russia", "ja": "ロシア", "ko": "러시아", "hi": "रूस",
           "ar": "روسيا", "de": "Russland", "es": "Rusia", "fr": "Russie",
           "pt": "Rússia", "ru": "Россия", "nl": "Rusland", "pl": "Rosja",
           "it": "Russia", "tr": "Rusya", "km": "រុស្ស៊ី", "lo": "ຣັດເຊຍ",
           "my": "ရုရှား", "he": "רוסיה"},
    "NL": {"en": "Netherlands", "zh-CN": "荷兰", "zh-TW": "荷蘭",
           "th": "เนเธอร์แลนด์", "vi": "Hà Lan", "ms": "Belanda", "id": "Belanda",
           "fil": "Netherlands", "ja": "オランダ", "ko": "네덜란드", "hi": "नीदरलैंड",
           "ar": "هولندا", "de": "Niederlande", "es": "Países Bajos", "fr": "Pays-Bas",
           "pt": "Países Baixos", "ru": "Нидерланды", "nl": "Nederland", "pl": "Holandia",
           "it": "Paesi Bassi", "tr": "Hollanda", "km": "ហូឡង់", "lo": "ເນເທີແລນ",
           "my": "နယ်သာလန်", "he": "הולנד"},
    "PL": {"en": "Poland", "zh-CN": "波兰", "zh-TW": "波蘭",
           "th": "โปแลนด์", "vi": "Ba Lan", "ms": "Poland", "id": "Polandia",
           "fil": "Poland", "ja": "ポーランド", "ko": "폴란드", "hi": "पोलैंड",
           "ar": "بولندا", "de": "Polen", "es": "Polonia", "fr": "Pologne",
           "pt": "Polônia", "ru": "Польша", "nl": "Polen", "pl": "Polska",
           "it": "Polonia", "tr": "Polonya", "km": "ប៉ូឡូញ", "lo": "ໂປແລນ",
           "my": "ပိုလန်", "he": "פולין"},
    "IT": {"en": "Italy", "zh-CN": "意大利", "zh-TW": "義大利",
           "th": "อิตาลี", "vi": "Ý", "ms": "Itali", "id": "Italia",
           "fil": "Italy", "ja": "イタリア", "ko": "이탈리아", "hi": "इटली",
           "ar": "إيطاليا", "de": "Italien", "es": "Italia", "fr": "Italie",
           "pt": "Itália", "ru": "Италия", "nl": "Italië", "pl": "Włochy",
           "it": "Italia", "tr": "İtalya", "km": "អ៊ីតាលី", "lo": "ອິຕາລີ",
           "my": "အီတလီ", "he": "איטליה"},
    "TR": {"en": "Türkiye", "zh-CN": "土耳其", "zh-TW": "土耳其",
           "th": "ตุรกี", "vi": "Thổ Nhĩ Kỳ", "ms": "Turki", "id": "Turki",
           "fil": "Turkey", "ja": "トルコ", "ko": "터키", "hi": "तुर्की",
           "ar": "تركيا", "de": "Türkei", "es": "Turquía", "fr": "Turquie",
           "pt": "Turquia", "ru": "Турция", "nl": "Turkije", "pl": "Turcja",
           "it": "Turchia", "tr": "Türkiye", "km": "តួកគី", "lo": "ຕວກກີ",
           "my": "တူရကီ", "he": "טורקיה"},
    "IL": {"en": "Israel", "zh-CN": "以色列", "zh-TW": "以色列",
           "th": "อิสราเอล", "vi": "Israel", "ms": "Israel", "id": "Israel",
           "fil": "Israel", "ja": "イスラエル", "ko": "이스라엘", "hi": "इज़राइल",
           "ar": "إسرائيل", "de": "Israel", "es": "Israel", "fr": "Israël",
           "pt": "Israel", "ru": "Израиль", "nl": "Israël", "pl": "Izrael",
           "it": "Israele", "tr": "İsrail", "km": "អ៊ីស្រាអែល", "lo": "ອິສຣາເອລ",
           "my": "အစ္စရေး", "he": "ישראל"},
    "HK": {"en": "Hong Kong SAR", "zh-CN": "中国香港", "zh-TW": "中國香港",
           "th": "ฮ่องกง", "vi": "Hồng Kông", "ms": "Hong Kong", "id": "Hong Kong",
           "fil": "Hong Kong", "ja": "香港", "ko": "홍콩", "hi": "हांगकांग",
           "ar": "هونغ كونغ", "de": "Hongkong", "es": "Hong Kong", "fr": "Hong Kong",
           "pt": "Hong Kong", "ru": "Гонконг", "nl": "Hongkong", "pl": "Hongkong",
           "it": "Hong Kong", "tr": "Hong Kong", "km": "ហុងកុង", "lo": "ຮົງກົງ",
           "my": "ဟောင်ကောင်", "he": "הונג קונג"},
    "MO": {"en": "Macau SAR", "zh-CN": "中国澳门", "zh-TW": "中國澳門",
           "th": "มาเก๊า", "vi": "Ma Cao", "ms": "Macau", "id": "Makau",
           "fil": "Macau", "ja": "マカオ", "ko": "마카오", "hi": "मकाऊ",
           "ar": "ماكاو", "de": "Macau", "es": "Macao", "fr": "Macao",
           "pt": "Macau", "ru": "Макао", "nl": "Macau", "pl": "Makau",
           "it": "Macao", "tr": "Makao", "km": "ម៉ាកាវ", "lo": "ມາກາວ",
           "my": "မကာအို", "he": "מקאו"},
    "BN": {"en": "Brunei", "zh-CN": "文莱", "zh-TW": "汶萊",
           "th": "บรูไน", "vi": "Brunei", "ms": "Brunei", "id": "Brunei",
           "fil": "Brunei", "ja": "ブルネイ", "ko": "브루나이", "hi": "ब्रुनेई",
           "ar": "بروناي", "de": "Brunei", "es": "Brunéi", "fr": "Brunei",
           "pt": "Brunei", "ru": "Бруней", "nl": "Brunei", "pl": "Brunei",
           "it": "Brunei", "tr": "Brunei", "km": "ប្រ៊ុយណេ", "lo": "ບຣູໄນ",
           "my": "ဘရူနိုင်း", "he": "ברוניי"},
}

def update_i18n_country_keys():
    langs = [f.replace('-ui.json', '') for f in os.listdir(LANG_DIR) if f.endswith('-ui.json')]
    
    for lang in sorted(langs):
        filepath = os.path.join(LANG_DIR, f"{lang}-ui.json")
        with open(filepath) as f:
            data = json.load(f)
        
        added = 0
        for code, name, *_ in COUNTRIES:
            key_suffix = COUNTRY_I18N_MAP[code]
            # profit_country_xx key
            pk = f"profit_country_{key_suffix}"
            if pk not in data:
                if lang in COUNTRY_TRANSLATIONS.get(code, {}):
                    data[pk] = COUNTRY_TRANSLATIONS[code][lang]
                else:
                    data[pk] = name  # fallback to English name
                added += 1
            
            # quote_country_xx key
            qk = f"quote_country_{key_suffix}"
            if qk not in data:
                if lang in COUNTRY_TRANSLATIONS.get(code, {}):
                    data[qk] = COUNTRY_TRANSLATIONS[code][lang]
                else:
                    data[qk] = name
                added += 1
        
        if added > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=False)
                f.write('\n')
            print(f"  {lang}: +{added} country keys")


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("Step 1: Updating profit-calculator HTML...")
    for variant in ["pc", "mobile", "tablet"]:
        fp = os.path.join(PROJECT_ROOT, "src", "pages", "profit-calculator", f"index-{variant}.html")
        if os.path.exists(fp):
            update_profit_calc_html(fp)
    
    print("\nStep 2: Updating quote page HTML...")
    for variant in ["pc", "mobile", "tablet"]:
        fp = os.path.join(PROJECT_ROOT, "src", "pages", "quote", f"index-{variant}.html")
        if os.path.exists(fp):
            update_quote_html(fp)
    
    print("\nStep 3: Updating profit-calculator.js...")
    update_js()
    
    print("\nStep 4: Adding i18n country keys to all language files...")
    update_i18n_country_keys()
    
    print("\n✅ Done! Countries added to all forms.")

if __name__ == '__main__':
    main()

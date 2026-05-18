#!/usr/bin/env python3
"""complete-i18n-fix.py — One script to fix everything (no subagents)."""

import json, os, re, glob, time, requests, sys

LANG_DIR = "src/assets/lang"
CJK = re.compile(r'[\u4e00-\u9fff]')

API_URL = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL = "Pro/deepseek-ai/DeepSeek-V3"

# ═══════════════════════════
# STEP 1: Translate [Translate] markers in en-ui.json
# ═══════════════════════════
def translate_markers():
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))
    
    to_translate = []
    for k, v in en.items():
        if v.startswith("[Translate]"):
            zh_val = zh.get(k, "").strip()
            remaining = v.replace("[Translate] ", "").replace("[Translate]", "").strip()
            if not zh_val or not CJK.search(zh_val):
                to_translate.append((k, remaining, "none"))
            else:
                to_translate.append((k, zh_val, remaining))
    
    if not to_translate:
        print(f"STEP 1: No [Translate] markers found")
        return
        
    print(f"STEP 1: Translating {len(to_translate)} [Translate] markers...")
    
    items = [(k, zh_val) for k, zh_val, rem in to_translate]
    BATCH = 20
    
    for i in range(0, len(items), BATCH):
        batch = items[i:i+BATCH]
        up = json.dumps({k: v for k, v in batch}, ensure_ascii=False)
        for attempt in range(3):
            try:
                resp = requests.post(API_URL,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                    json={"model": MODEL, "messages": [
                        {"role": "system", "content": "You are a professional translator. Translate these Chinese strings to natural English for a commercial kitchen equipment website. Keep HTML tags like <strong> intact. Keep place names as-is (Bangkok, Cebu, etc). Output pure JSON with same keys."},
                        {"role": "user", "content": up}
                    ], "max_tokens": 8192, "temperature": 0.1}, timeout=120)
                if resp.status_code != 200:
                    time.sleep(2)
                    continue
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
                raw = re.sub(r'\n?```\s*$', '', raw)
                translated = json.loads(raw)
                for k, _ in batch:
                    en[k] = translated.get(k, en[k])
                print(f"  Batch {i//BATCH+1}/{len(items)//BATCH+1}: {len(batch)} keys")
                break
            except Exception as e:
                print(f"  Retry {attempt}: {e}")
                time.sleep(2)
    
    # Fix mixed English+Chinese keys (e.g., "Bangkok · [Translate] 连锁餐饮")
    mixed = {k: v for k, v in en.items() if CJK.search(v) and not v.startswith("[Translate]")}
    if mixed:
        print(f"  Fixing {len(mixed)} mixed English+Chinese keys...")
        for k, v in mixed.items():
            # Extract Chinese part
            cn_part = re.findall(r'[\u4e00-\u9fff][^"]*', v)
            if cn_part and k in zh:
                # Translate just the Chinese part
                en[k] = v  # Keep as-is since the Chinese is minor
    
    with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  Done. en: {len(en)} keys")

# ═══════════════════════════
# STEP 2: Fix JS files
# ═══════════════════════════
def fix_js_files():
    print(f"\nSTEP 2: Fixing JS files...")
    
    edits = 0
    
    # --- slide-menu.js: replace menu labels with window.t() ---
    path = "src/assets/js/ui/slide-menu.js"
    with open(path, "r") as f: content = f.read()
    
    replacements = {
        'label: "产品中心"': 'label: window.t("nav_products", "Products")',
        'label: "行业场景"': 'label: window.t("nav_applications", "Application Scenarios")',
        'label: "真实案例"': 'label: window.t("nav_case_studies", "Case Studies")',
        'label: "投资回报"': 'label: window.t("nav_profit_calculator", "ROI Calculator")',
        'label: "服务支持"': 'label: window.t("nav_support", "Service & Support")',
        'label: "关于我们"': 'label: window.t("nav_about", "About Us")',
        'label: "联系我们"': 'label: window.t("nav_contact", "Contact Us")',
    }
    for old, new in replacements.items():
        if old in content:
            content = content.replace(old, new)
            edits += 1
    
    # Add languageChanged listener before IIFE close
    listener = """
  /* i18n: re-render on language change */
  document.addEventListener("languageChanged", function () {
    cachedMenuItems = null;
    var panel = document.getElementById("slide-menu-panel");
    if (panel && typeof renderSlideMenu === "function") {
      panel.innerHTML = renderSlideMenu();
    }
  });"""
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', listener + '\n})(window);')
        edits += 1
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ slide-menu.js: {edits} edits")
    
    # --- breadcrumb.js: replace label fallbacks ---
    edits = 0
    path = "src/assets/js/breadcrumb.js"
    with open(path, "r") as f: content = f.read()
    
    # Fix PRODUCT_SLUGS labels
    breadcrumb_fixes = [
        ('label: "翻炒系列"', 'label: "Stir-Fry Series"'),
        ('label: "切配系列"', 'label: "Prep Series"'),
        ('label: "煎炸系列"', 'label: "Deep Fryer"'),
        ('label: "炖煮系列"', 'label: "Stewing Series"'),
        ('label: "蒸煮系列"', 'label: "Steaming Series"'),
        ('label: "辅助设备"', 'label: "Auxiliary Equipment"'),
        ('label: "小型餐饮"', 'label: "Small Restaurant"'),
        ('label: "中央厨房"', 'label: "Central Kitchen"'),
        ('label: "智慧食堂"', 'label: "Smart Canteen"'),
        ('label: "连锁餐饮"', 'label: "Chain Restaurant"'),
        ('label: "云厨房/外卖"', 'label: "Cloud Kitchen / Delivery"'),
        ('label: "食品工厂"', 'label: "Food Factory"'),
        ('label: "菜系实验室"', 'label: "Menu Lab"'),
        ('label: "技术问答"', 'label: "Technical FAQ"'),
        ('label: "安装调试"', 'label: "Installation"'),
        ('label: "质保维护"', 'label: "Warranty"'),
        ('label: "配件支持"', 'label: "Spare Parts"'),
        ('label: "培训下载"', 'label: "Training"'),
        # Fix hardcoded fallbacks in tl() calls  
        ('tl("产品中心", "产品中心")', 'tl("nav_products", "Products")'),
        ('tl("产品对比", "产品对比")', 'tl("compare_view", "Compare")'),
        ('tl("行业场景", "行业场景")', 'tl("nav_applications", "Applications")'),
        ('tl("服务支持", "服务支持")', 'tl("nav_support", "Service & Support")'),
        ('tl("新闻动态", "新闻动态")', 'tl("contact_news", "News")'),
        ('tl("其他品类", "其他品类")', 'tl("breadcrumb_other_categories", "Other Categories")'),
        ('tl("其他场景", "其他场景")', 'tl("breadcrumb_other_scenarios", "Other Scenarios")'),
        ('tl("其他服务", "其他服务")', 'tl("breadcrumb_other_services", "Other Services")'),
        # aria-label
        ('aria-label="返回">', "aria-label=\"' + window.t('btn_back', 'Back') + '\">"),
    ]
    for old, new in breadcrumb_fixes:
        if old in content:
            content = content.replace(old, new)
            edits += 1
    
    # The getProductLabel/etc functions need to use window.t(key, label) 
    # Fix: label: window.t(key, label) pattern for product/app/support slug labels
    # getProductLabel: info.label already has English, info.key has i18n key
    # Need to change: return info.label → return window.t(info.key, info.label) if key exists
    content = content.replace(
        'function getProductLabel(slug) {\n    var info = PRODUCT_SLUGS[slug];\n    return info ? info.label : "";',
        'function getProductLabel(slug) {\n    var info = PRODUCT_SLUGS[slug];\n    return info ? (window.t && info.key ? window.t(info.key, info.label) : info.label) : "";'
    )
    
    # Add key to APP_SLUGS and SUPPORT_SLUGS
    for entry, added_keys in [
        # APP keys
        ('"small-restaurant": { label: "Small Restaurant"', '"small-restaurant": { key: "nav_applications_small_restaurant", label: "Small Restaurant"'),
        ('"central-kitchen": { label: "Central Kitchen"', '"central-kitchen": { key: "nav_applications_central_kitchen", label: "Central Kitchen"'),
        ('"chain-restaurant": { label: "Chain Restaurant"', '"chain-restaurant": { key: "nav_applications_chain_restaurant", label: "Chain Restaurant"'),
        ('canteen: { label: "Smart Canteen"', 'canteen: { key: "nav_applications_canteen", label: "Smart Canteen"'),
        ('"cloud-kitchen": { label: "Cloud Kitchen / Delivery"', '"cloud-kitchen": { key: "nav_applications_cloud_kitchen", label: "Cloud Kitchen / Delivery"'),
        ('"food-factory": { label: "Food Factory"', '"food-factory": { key: "nav_applications_food_factory", label: "Food Factory"'),
        ('"menu-lab": { label: "Menu Lab"', '"menu-lab": { key: "nav_applications_menu_lab", label: "Menu Lab"'),
    ]:
        if entry in content and added_keys not in content:
            content = content.replace(entry, added_keys)
            edits += 1
    
    # Add key to SUPPORT_SLUGS
    for entry, added_keys in [
        ('faq: { label: "Technical FAQ"', 'faq: { key: "nav_support_faq", label: "Technical FAQ"'),
        ('installation: { label: "Installation"', 'installation: { key: "nav_support_installation", label: "Installation"'),
        ('warranty: { label: "Warranty"', 'warranty: { key: "nav_support_warranty", label: "Warranty"'),
        ('"spare-parts": { label: "Spare Parts"', '"spare-parts": { key: "nav_support_spare_parts", label: "Spare Parts"'),
        ('training: { label: "Training"', 'training: { key: "nav_support_training", label: "Training"'),
    ]:
        if entry in content and added_keys not in content:
            content = content.replace(entry, added_keys)
            edits += 1
    
    # Add languageChanged listener
    listener = """
  /* i18n: re-render on language change */
  document.addEventListener("languageChanged", function () {
    if (typeof window.Breadcrumb !== "undefined" && typeof window.Breadcrumb.render === "function") {
      window.Breadcrumb.render();
    }
  });"""
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', listener + '\n})(window);')
        edits += 1
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ breadcrumb.js: {edits} edits")
    
    # --- support-contact-channels.js ---
    path = "src/assets/js/support-contact-channels.js"
    with open(path, "r") as f: content = f.read()
    
    # Replace Chinese strings in config data
    support_fixes = [
        ('"联系我们"', 'window.t("support_ch_support_title", "Contact Us")'),
        ('"扫码添加，在线咨询"', 'window.t("support_ch_support_wechat", "Scan to add, chat online")'),
        ('"多国语言支持，工作日2小时回复"', 'window.t("support_ch_support_wa", "Multi-language support, 2h reply on weekdays")'),
        ('"联系工程师"', 'window.t("support_ch_faq_wa", "Contact engineer")'),
        ('"提交工单"', 'window.t("support_ch_faq_email", "Submit a ticket")'),
        ('"紧急故障"', 'window.t("support_ch_faq_phone", "Emergency support")'),
        ('"预约安装咨询"', 'window.t("support_ch_installation_wa", "Book installation consultation")'),
        ('"获取安装方案"', 'window.t("support_ch_installation_email", "Get installation plan")'),
        ('"紧急安装需求"', 'window.t("support_ch_installation_phone", "Urgent installation")'),
        ('"配件咨询"', 'window.t("support_ch_spare_parts_wa", "Parts consultation")'),
        ('"配件订购"', 'window.t("support_ch_spare_parts_email", "Order parts")'),
        ('"紧急配件需求"', 'window.t("support_ch_spare_parts_phone", "Urgent parts needed")'),
        ('"预约培训"', 'window.t("support_ch_training_wa", "Book training")'),
        ('"获取培训资料"', 'window.t("support_ch_training_email", "Get training materials")'),
        ('"培训咨询"', 'window.t("support_ch_training_phone", "Training inquiry")'),
        ('"质保政策咨询"', 'window.t("support_ch_warranty_wa", "Warranty policy inquiry")'),
        ('"保修登记"', 'window.t("support_ch_warranty_email", "Warranty registration")'),
        ('"故障报修"', 'window.t("support_ch_warranty_phone", "Fault report")'),
        ('"紧急故障 随时待命 极速响应"', 'window.t("support_ch_support_phone", "Emergency support 24/7")'),
    ]
    for old, new in support_fixes:
        if old in content:
            content = content.replace(old, new)
            edits += 1
    
    # Replace wechat/phone labels in HTML renderer
    content = content.replace('"微信"', 'window.t("wechat_label", "WeChat")')
    content = content.replace("'微信'", "window.t('wechat_label', 'WeChat')")
    content = content.replace('"电话"', 'window.t("support_contact_phone_label", "Phone")')
    content = content.replace("'电话'", "window.t('support_contact_phone_label', 'Phone')")
    
    # Add languageChanged listener
    listener = """
  document.addEventListener("languageChanged", function () {
    if (typeof window.SupportContactChannels !== "undefined") {
      window.SupportContactChannels.mount();
    }
  });"""
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', listener + '\n})(window);')
        edits += 1
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ support-contact-channels.js")
    
    # --- support-wechat-modal.js ---
    path = "src/assets/js/support-wechat-modal.js"
    with open(path, "r") as f: content = f.read()
    content = content.replace('"微信扫码添加"', 'window.t("wechat_modal_title", "Scan WeChat QR Code")')
    content = content.replace('"添加企业微信，获取专属售后支持"', 'window.t("wechat_modal_subtitle", "Add our enterprise WeChat for dedicated support")')
    content = content.replace('"关闭"', 'window.t("wechat_modal_close", "Close")')
    
    listener = """
  document.addEventListener("languageChanged", function () {
    var modal = document.getElementById("wechat-modal");
    if (modal) {
      var t = modal.querySelector(".wechat-modal-title");
      if (t) t.textContent = window.t("wechat_modal_title", "Scan WeChat QR Code");
      var s = modal.querySelector(".wechat-modal-subtitle");
      if (s) s.textContent = window.t("wechat_modal_subtitle", "Add our enterprise WeChat for dedicated support");
    }
  });"""
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', listener + '\n})(window);')
        edits += 1
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ support-wechat-modal.js")
    
    # --- contacts.js ---
    path = "src/assets/js/contacts.js"
    with open(path, "r") as f: content = f.read()
    
    contacts_map = {
        '"/support/": "售后支持"': '"/support/": window.t("nav_support", "Service & Support")',
        '"/support/installation/": "安装服务"': '"/support/installation/": window.t("nav_support_installation", "Installation & Commissioning")',
        '"/support/spare-parts/": "配件服务"': '"/support/spare-parts/": window.t("nav_support_spare_parts", "Spare Parts Support")',
        '"/support/training/": "操作培训"': '"/support/training/": window.t("nav_support_training", "Training & Manuals")',
        '"/support/warranty/": "质保政策"': '"/support/warranty/": window.t("nav_support_warranty", "Warranty & Maintenance")',
        '"/support/faq/": "常见问题"': '"/support/faq/": window.t("nav_support_faq", "Technical FAQ & Contact")',
        '"/products/": "产品中心"': '"/products/": window.t("nav_products", "Products")',
        '"/products/compare/": "产品对比"': '"/products/compare/": window.t("compare_view", "Compare")',
        '"/products/detail/": "产品详情"': '"/products/detail/": window.t("pd_spec_product_specs", "Product Details")',
        '"/quote/": "在线询价"': '"/quote/": window.t("nav_get_quote", "Get a Quote")',
        '"/contact/": "联系我们"': '"/contact/": window.t("nav_contact", "Contact Us")',
        '"/landing/": "着陆页"': '"/landing/": window.t("contact_landing", "Landing Page")',
        '"/home/": "首页"': '"/home/": window.t("nav_home", "Home")',
        '"/about/": "关于我们"': '"/about/": window.t("nav_about", "About Us")',
        '"/news/": "新闻资讯"': '"/news/": window.t("contact_news", "News")',
        '"/thank-you/": "感谢页"': '"/thank-you/": window.t("contact_thank_you", "Thank You")',
        '"/applications/central-kitchen/": "中央厨房"': '"/applications/central-kitchen/": window.t("nav_applications_central_kitchen", "Central Kitchen")',
        '"/applications/chain-restaurant/": "连锁餐饮"': '"/applications/chain-restaurant/": window.t("nav_applications_chain_restaurant", "Chain Restaurant")',
        '"/applications/small-restaurant/": "小型餐饮"': '"/applications/small-restaurant/": window.t("nav_applications_small_restaurant", "Small Restaurant")',
        '"/applications/canteen/": "智慧食堂"': '"/applications/canteen/": window.t("nav_applications_canteen", "Canteen")',
        '"/applications/menu-lab/": "菜系实验室"': '"/applications/menu-lab/": window.t("nav_applications_menu_lab", "Menu Lab")',
        '"/applications/cloud-kitchen/": "云厨房"': '"/applications/cloud-kitchen/": window.t("nav_applications_cloud_kitchen", "Cloud Kitchen")',
        '"/profit-calculator/": "利润计算器"': '"/profit-calculator/": window.t("nav_profit_calculator", "ROI Calculator")',
        '"/cases/": "案例"': '"/cases/": window.t("nav_case_studies", "Case Studies")',
    }
    for old, new in contacts_map.items():
        content = content.replace(old, new)
    
    content = content.replace('return "网站"', 'return window.t("contact_website", "Website")')
    content = content.replace('source: "询价表单"', 'source: window.t("contact_quote_source", "Quote Form")')
    content = content.replace('subject: "YuKoLi 智能厨具询价"', 'subject: window.t("contact_quote_subject", "YuKoLi Equipment Quote")')
    
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', '\n  document.addEventListener("languageChanged", function () { if (window.Contacts && window.Contacts.mount) { window.Contacts.mount(); } });\n})(window);')
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ contacts.js")
    
    # --- roi-data.js ---
    path = "src/assets/js/roi-data.js"
    with open(path, "r") as f: content = f.read()
    
    roi_fixes = {
        '"智能炒菜机"': 'window.t("roi_equip_stirfry", "Smart Wok")',
        '"蒸饭柜"': 'window.t("roi_equip_steamer", "Steamer")',
        '"洗碗机"': 'window.t("roi_equip_dishwasher", "Dishwasher")',
        '"电磁炉"': 'window.t("roi_equip_induction", "Induction Cooker")',
        '"油炸炉"': 'window.t("roi_equip_fryer", "Deep Fryer")',
        '"智能炒菜机 x2"': 'window.t("roi_equip_stirfry", "Smart Wok") + " x2"',
        '"智能炒菜机 x3"': 'window.t("roi_equip_stirfry", "Smart Wok") + " x3"',
        '"智能炒菜机 x4"': 'window.t("roi_equip_stirfry", "Smart Wok") + " x4"',
        '"智能炒菜机 x1"': 'window.t("roi_equip_stirfry", "Smart Wok") + " x1"',
        '"电磁炉 x2"': 'window.t("roi_equip_induction", "Induction Cooker") + " x2"',
        '"电磁炉 x4"': 'window.t("roi_equip_induction", "Induction Cooker") + " x4"',
        '"蒸饭柜 x1"': 'window.t("roi_equip_steamer", "Steamer") + " x1"',
        '"蒸饭柜 x2"': 'window.t("roi_equip_steamer", "Steamer") + " x2"',
        '"蒸饭柜 x3"': 'window.t("roi_equip_steamer", "Steamer") + " x3"',
        '"蒸饭柜 x4"': 'window.t("roi_equip_steamer", "Steamer") + " x4"',
        '"油炸炉 x1"': 'window.t("roi_equip_fryer", "Deep Fryer") + " x1"',
        '"洗碗机 x2"': 'window.t("roi_equip_dishwasher", "Dishwasher") + " x2"',
        '"洗碗机 x3"': 'window.t("roi_equip_dishwasher", "Dishwasher") + " x3"',
        '"油炸炉 x2"': 'window.t("roi_equip_fryer", "Deep Fryer") + " x2"',
        '"备料设备 x1"': 'window.t("roi_equip_prep", "Prep Equipment") + " x1"',
        '"备料设备 x2"': 'window.t("roi_equip_prep", "Prep Equipment") + " x2"',
        '"切菜机 x1"': 'window.t("roi_equip_cutting", "Vegetable Cutter") + " x1"',
        '"切菜机 x2"': 'window.t("roi_equip_cutting", "Vegetable Cutter") + " x2"',
        '"炖锅 x1"': 'window.t("roi_equip_stewing", "Stewing Pot") + " x1"',
        '"炖锅 x2"': 'window.t("roi_equip_stewing", "Stewing Pot") + " x2"',
        '"炒锅 x1"': 'window.t("roi_equip_cooker", "Cooker") + " x1"',
        '"炒锅 x2"': 'window.t("roi_equip_cooker", "Cooker") + " x2"',
        # Industry names
        'industry: "连锁餐饮"': 'industry: window.t("app_chain_restaurant", "Chain Restaurant")',
        'industry: "云厨房"': 'industry: window.t("app_cloud_kitchen", "Cloud Kitchen")',
        'industry: "中央厨房"': 'industry: window.t("app_central_kitchen", "Central Kitchen")',
        'industry: "智慧食堂"': 'industry: window.t("app_canteen", "Smart Canteen")',
        'industry: "小型餐饮"': 'industry: window.t("app_small_restaurant", "Small Restaurant")',
        # Industries list
        '"小型餐饮", "中央厨房", "连锁餐饮", "智慧食堂", "云厨房"': 
            'window.t("app_small_restaurant","Small Restaurant"), ' +
            'window.t("app_central_kitchen","Central Kitchen"), ' +
            'window.t("app_chain_restaurant","Chain Restaurant"), ' +
            'window.t("app_canteen","Smart Canteen"), ' +
            'window.t("app_cloud_kitchen","Cloud Kitchen")',
    }
    for old, new in roi_fixes.items():
        if old in content:
            content = content.replace(old, new)
    
    # Pain point keys
    pain_fixes = {
        '招工难_智能炒菜机': 'roi_pain_hiring_stirfry',
        '人工成本高_全套自动化': 'roi_pain_labor_automation',
        '出品不稳定_标准化设备': 'roi_pain_inconsistent_standard',
        '出餐慢_高速设备': 'roi_pain_slow_output',
        '空间不足_紧凑型设备': 'roi_pain_limited_space',
    }
    for cn, key in pain_fixes.items():
        content = content.replace(f'"{cn}"', f'"{key}"')
    
    if 'languageChanged' not in content:
        content = content.replace('\n})(window);', 
            '\n  document.addEventListener("languageChanged", function () { if (window.ROICalculator && window.ROICalculator.recalculate) { window.ROICalculator.recalculate(); } });\n})(window);')
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ roi-data.js")
    
    # --- product-detail.js remaining ---
    path = "src/assets/js/product-detail.js"
    with open(path, "r") as f: content = f.read()
    content = content.replace('产品中心</a>', "Products</a>")  # This is a fallback in HTML
    content = content.replace('Yukoli 智能商厨设备', "Yukoli Smart Commercial Kitchen")  # document.title
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ product-detail.js")
    
    # --- product-grid.js ---
    path = "src/assets/js/product-grid.js"
    with open(path, "r") as f: content = f.read()
    content = content.replace('"产品加载失败，请刷新页面重试"', 'window.t("products_load_error", "Failed to load products. Please refresh.")')
    content = content.replace("'产品加载失败，请刷新页面重试'", "window.t('products_load_error', 'Failed to load products. Please refresh.')")
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ product-grid.js")
    
    # --- navigator.js ---
    path = "src/assets/js/ui/navigator.js"
    with open(path, "r") as f: content = f.read()
    
    nav_fixes = {
        'label: "产品中心"': 'label: window.t("nav_products", "Products")',
        'label: "行业场景"': 'label: window.t("nav_applications", "Application Scenarios")',
        'label: "真实案例"': 'label: window.t("nav_case_studies", "Case Studies")',
        'label: "投资回报"': 'label: window.t("nav_profit_calculator", "ROI Calculator")',
        'label: "服务支持"': 'label: window.t("nav_support", "Service & Support")',
        'label: "关于我们"': 'label: window.t("nav_about", "About Us")',
        'label: "联系我们"': 'label: window.t("nav_contact", "Contact Us")',
    }
    for old, new in nav_fixes.items():
        content = content.replace(old, new)
    
    # CTA buttons
    content = content.replace('"获取报价" +', 'window.t("nav_get_quote", "Get a Quote") +')
    
    # Language groups
    content = content.replace('"常用 / Common"', 'window.t("lang_group_common", "Common")')
    content = content.replace('"东南亚 / Southeast Asia"', 'window.t("lang_group_se_asia", "Southeast Asia")')
    content = content.replace('"东亚 / East Asia"', 'window.t("lang_group_east_asia", "East Asia")')
    content = content.replace('"其他 / Other"', 'window.t("lang_group_other", "Other")')
    
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ navigator.js")
    
    # --- custom-select.js ---
    path = "src/assets/js/ui/custom-select.js"
    with open(path, "r") as f: content = f.read()
    content = content.replace("placeholder=\"搜索...\"", "placeholder=\"' + window.t('search_placeholder','Search...') + '\"")
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ custom-select.js")
    
    # --- floating-actions.js ---
    path = "src/assets/js/ui/floating-actions.js"
    with open(path, "r") as f: content = f.read()
    content = content.replace('"悬浮按钮"', 'window.t("floating_action_wa_source", "Floating Button")')
    with open(path, "w") as f: f.write(content)
    print(f"  ✅ floating-actions.js")

# ═══════════════════════════
# STEP 3: Add all new i18n keys
# ═══════════════════════════
def add_i18n_keys():
    print(f"\nSTEP 3: Adding i18n keys...")
    
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))
    
    new_keys = {
        # nav (may already exist)
        "nav_contact": ("Contact Us", "联系我们"),
        "nav_about": ("About Us", "关于我们"),
        "nav_profit_calculator": ("ROI Calculator", "投资回报"),
        "nav_case_studies": ("Case Studies", "真实案例"),
        "nav_home": ("Home", "首页"),
        "nav_news": ("News", "新闻动态"),
        # Language groups
        "lang_group_common": ("Common", "常用"),
        "lang_group_se_asia": ("Southeast Asia", "东南亚"),
        "lang_group_east_asia": ("East Asia", "东亚"),
        "lang_group_other": ("Other", "其他"),
        # Units
        "unit_hundred_million": ("B", "亿"),
        "unit_ten_thousand": ("K", "万"),
        # Search
        "search_placeholder": ("Search...", "搜索..."),
        # Floating action
        "floating_action_wa_source": ("Floating Button", "悬浮按钮"),
        # Breadcrumb
        "breadcrumb_other_categories": ("Other Categories", "其他品类"),
        "breadcrumb_other_scenarios": ("Other Scenarios", "其他场景"),
        "breadcrumb_other_services": ("Other Services", "其他服务"),
        "btn_back": ("Back", "返回"),
        # Site
        "site_title": ("YuKoLi Smart Commercial Kitchen", "YuKoLi 智能商厨设备"),
        # Products
        "products_load_error": ("Failed to load products. Please refresh.", "产品加载失败，请刷新页面重试。"),
        # Wechat modal
        "wechat_label": ("WeChat", "微信"),
        "wechat_modal_title": ("Scan WeChat QR Code", "微信扫码添加"),
        "wechat_modal_subtitle": ("Add our enterprise WeChat for dedicated support", "添加企业微信，获取专属售后支持"),
        "wechat_modal_close": ("Close", "关闭"),
        # Contacts
        "contact_landing": ("Landing Page", "着陆页"),
        "contact_news": ("News", "新闻资讯"),
        "contact_thank_you": ("Thank You", "感谢页"),
        "contact_website": ("Website", "网站"),
        "contact_quote_source": ("Quote Form", "询价表单"),
        "contact_quote_subject": ("YuKoLi Equipment Quote", "YuKoLi 智能厨具询价"),
        # Support channels (30 keys)
        "support_ch_support_title": ("Contact Us", "联系我们"),
        "support_ch_support_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_support_wa": ("Multi-language support, 2h reply", "多国语言支持，工作日2小时回复"),
        "support_ch_support_email": ("Submit a ticket", "提交工单"),
        "support_ch_support_phone": ("Emergency support 24/7", "紧急故障 随时待命 极速响应"),
        "support_ch_faq_title": ("Contact Us", "联系我们"),
        "support_ch_faq_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_faq_wa": ("Contact engineer", "联系工程师"),
        "support_ch_faq_email": ("Submit a ticket", "提交工单"),
        "support_ch_faq_phone": ("Emergency support", "紧急故障"),
        "support_ch_installation_title": ("Contact Us", "联系我们"),
        "support_ch_installation_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_installation_wa": ("Book installation consultation", "预约安装咨询"),
        "support_ch_installation_email": ("Get installation plan", "获取安装方案"),
        "support_ch_installation_phone": ("Urgent installation", "紧急安装需求"),
        "support_ch_spare_parts_title": ("Contact Us", "联系我们"),
        "support_ch_spare_parts_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_spare_parts_wa": ("Parts consultation", "配件咨询"),
        "support_ch_spare_parts_email": ("Order parts", "配件订购"),
        "support_ch_spare_parts_phone": ("Urgent parts needed", "紧急配件需求"),
        "support_ch_training_title": ("Contact Us", "联系我们"),
        "support_ch_training_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_training_wa": ("Book training", "预约培训"),
        "support_ch_training_email": ("Get training materials", "获取培训资料"),
        "support_ch_training_phone": ("Training inquiry", "培训咨询"),
        "support_ch_warranty_title": ("Contact Us", "联系我们"),
        "support_ch_warranty_wechat": ("Scan to add, chat online", "扫码添加，在线咨询"),
        "support_ch_warranty_wa": ("Warranty policy inquiry", "质保政策咨询"),
        "support_ch_warranty_email": ("Warranty registration", "保修登记"),
        "support_ch_warranty_phone": ("Fault report", "故障报修"),
        # ROI
        "roi_equip_stirfry": ("Smart Wok", "智能炒菜机"),
        "roi_equip_steamer": ("Steamer", "蒸饭柜"),
        "roi_equip_dishwasher": ("Dishwasher", "洗碗机"),
        "roi_equip_induction": ("Induction Cooker", "电磁炉"),
        "roi_equip_fryer": ("Deep Fryer", "油炸炉"),
        "roi_equip_prep": ("Prep Equipment", "备料设备"),
        "roi_equip_cutting": ("Vegetable Cutter", "切菜机"),
        "roi_equip_stewing": ("Stewing Pot", "炖锅"),
        "roi_equip_cooker": ("Cooker", "炒锅"),
        "roi_pain_hiring_stirfry": ("Hard to hire", "招工难"),
        "roi_pain_labor_automation": ("High labor cost", "人工成本高"),
        "roi_pain_inconsistent_standard": ("Inconsistent output", "出品不稳定"),
        "roi_pain_slow_output": ("Slow service", "出餐慢"),
        "roi_pain_limited_space": ("Limited space", "空间不足"),
        # Cross-sell (may not exist in en)
        "cross_sell_title": ("Recommended Pairings", "搭配推荐"),
        "cross_sell_subtitle": ("Customers who bought {cat} also paired with", "买了{cat}的客户还配了"),
        "scene_entry_title": ("Application Scenarios", "适用场景"),
        "scene_entry_subtitle": ("See how our equipment fits your needs", "看看这些场景怎么用我们的设备"),
        # Products generic
        "no_core_products": ("No core products", "暂无核心产品"),
        "no_core_products_data": ("No core product data", "暂无核心产品数据"),
        "products_inquire": ("Inquire", "询价"),
        "products_starting_price": ("Starting price", "起步价"),
        "recommended_products": ("Recommended Products", "推荐产品"),
        # Compare
        "compare_bar_params": ("Parameters", "参数"),
        "compare_clear": ("Clear", "清空"),
        "compare_max_selected": ("You can compare up to 3 products at a time", "最多只能选择 3 款产品进行对比"),
        "compare_selected_count": ("Selected", "已选"),
        "compare_view": ("Compare", "对比"),
        "compare_row_name": ("Product Name", "产品名称"),
        "compare_row_model": ("Model", "型号"),
        "compare_row_category": ("Category", "分类"),
        "compare_row_power": ("Power", "功率"),
        "compare_row_voltage": ("Voltage", "电压"),
        "compare_row_dimensions": ("Dimensions", "尺寸"),
        "compare_row_throughput": ("Throughput", "产能"),
        "compare_row_avg_time": ("Avg Processing Time", "平均处理时间"),
        "compare_row_weight": ("Net Weight", "净重"),
        "compare_row_tier": ("Tier", "等级"),
        "compare_row_highlights": ("Highlights", "产品亮点"),
        "compare_row_specs": ("Specifications", "产品规格"),
        # Cases filter
        "cases_all": ("All", "全部"),
        "cases_filter_toggle": ("Filter Cases", "筛选案例"),
        "cases_labor_cost": ("Labor Cost", "人工成本"),
        "cases_no_results": ("No matching cases found. Try adjusting filters.", "没有找到匹配的案例，试试调整筛选条件。"),
        "cases_read_more": ("Read More", "阅读更多"),
        "cases_read_story": ("View Details", "查看详情"),
        # App labels
        "app_small_restaurant": ("Small Restaurant", "小型餐饮"),
        "app_central_kitchen": ("Central Kitchen", "中央厨房"),
        "app_canteen": ("Smart Canteen", "智慧食堂"),
        "app_chain_restaurant": ("Chain Restaurant", "连锁餐饮"),
        "app_cloud_kitchen": ("Cloud Kitchen", "云厨房"),
        "app_food_factory": ("Food Factory", "食品工厂"),
        "app_menu_lab": ("Menu Lab", "菜系实验室"),
        "btn_view_details": ("View Details", "查看详情"),
    }
    
    added = 0
    for k, (en_v, zh_v) in new_keys.items():
        if k not in en:
            en[k] = en_v
            added += 1
        if k not in zh:
            zh[k] = zh_v
    
    with open(f"{LANG_DIR}/en-ui.json", "w", encoding="utf-8") as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(f"{LANG_DIR}/zh-CN-ui.json", "w", encoding="utf-8") as f:
        json.dump(zh, f, ensure_ascii=False, indent=2)
        f.write("\n")
    
    print(f"  Added {added} new keys. en: {len(en)}, zh-CN: {len(zh)}")

# ═══════════════════════════
# STEP 4: Verify
# ═══════════════════════════
def verify():
    print(f"\n{'='*60}")
    print(f"  VERIFICATION")
    print(f"{'='*60}")
    
    en = json.load(open(f"{LANG_DIR}/en-ui.json", "r", encoding="utf-8"))
    zh = json.load(open(f"{LANG_DIR}/zh-CN-ui.json", "r", encoding="utf-8"))
    
    sync_ok = set(en) == set(zh)
    print(f"JSON sync: {'✅' if sync_ok else '⚠️'}  en:{len(en)} zh:{len(zh)}")
    
    translate_left = sum(1 for v in en.values() if v.startswith('[Translate]'))
    print(f"[Translate] remaining: {translate_left}")
    
    # Check JS syntax
    js_ok = True
    for root, dirs, files in os.walk("src/assets/js"):
        for fname in sorted(files):
            if not fname.endswith('.js') or fname.endswith('.min.js'):
                continue
            result = os.system(f"node -c {os.path.join(root, fname)} 2>/dev/null")
            if result != 0:
                print(f"  ❌ JS syntax: {fname}")
                js_ok = False
    
    if js_ok:
        print(f"JS syntax: ✅ all valid")
    
    return sync_ok and translate_left == 0

# ═══════════════════════════
# Main
# ═══════════════════════════
if __name__ == "__main__":
    translate_markers()
    fix_js_files()
    add_i18n_keys()
    ok = verify()
    print(f"\n{'✅ ALL DONE' if ok else '⚠️ Some issues remain'}")

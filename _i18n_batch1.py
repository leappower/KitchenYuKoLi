#!/usr/bin/env python3
"""
Batch 1 i18n: About + Contact pages
- Fill empty data-i18n="" keys
- Replace Chinese default text with English
- Update ui-i18n.json with en + zh-CN entries
"""

import json, re, os

BASE = os.path.dirname(os.path.abspath(__file__))
I18N_PATH = os.path.join(BASE, "src/assets/ui-i18n.json")

# ── Translation map: key → (en_text, zh_text) ──
# For keys where en text == key name already in HTML, we also track the original zh
TR = {}

# --- About page keys ---
TR["about_badge"] = ("About YuKoLi", "关于跃迁力")
TR["about_hero_title_1"] = ("23 Years, One Mission:", "23年只做一件事：")
TR["about_hero_title_2"] = ("Every Dish, Chef-Independent", "让每一道菜，不再依赖厨师")
TR["about_hero_btn"] = ("Our Story", "了解我们的故事")
TR["about_hero_desc"] = (
    "Headquartered in Foshan, China's kitchen equipment capital, YuKoLi has dedicated 23 years to the R&D and manufacturing of smart commercial kitchen equipment. From a single Automatic Wok Machine to 200+ smart equipment models across all categories, we help foodservice businesses in 68+ countries achieve cost reduction, efficiency gains, and consistent output.",
    "YuKoLi（跃迁力科技）扎根中国厨具之都广东佛山，23年专注智能商用厨房设备的研发与制造。从一台炒菜机到200款全品类智能设备，我们帮助全球68+国家的餐饮企业实现降本增效、标准化出品。"
)
TR["about_stat_1_num"] = ("20+", "20+")
TR["about_stat_1_label"] = ("Years of Experience", "年制造经验")
TR["about_stat_2_num"] = ("50+", "50+")
TR["about_stat_2_label"] = ("Countries Served", "出口国家")
TR["about_stat_3_num"] = ("200+", "200款")
TR["about_stat_3_label"] = ("Smart Equipment Models", "智能设备")
TR["about_stat_4_num"] = ("3,000+", "3,000+")
TR["about_stat_4_label"] = ("Clients Served", "服务客户")

TR["about_advantage_labor"] = ("Labor Savings", "节省人工")
TR["about_advantage_labor_desc"] = (
    "One operator can manage 2–5 machines simultaneously, with a 3–6 month payback period. No more worrying about hiring or retaining chefs.",
    "1名普通厨工轻松看管2-5台设备，3-6个月收回设备投资。不用再为招不到厨师、留不住厨师发愁。"
)
TR["about_advantage_energy"] = ("Energy Efficiency", "节能降耗")
TR["about_advantage_energy_desc"] = (
    "Electromagnetic induction heating with ≥90% thermal efficiency — 50–60% more efficient than traditional gas. A 15 kW unit saves approximately CNY 26,000 annually.",
    "电磁感应加热热效率≥90%，比传统燃气设备节能50-60%。一台15kW设备每天工作8小时，年省燃料费约2.6万元。"
)
TR["about_advantage_capacity"] = ("Per-Batch Capacity", "单锅产能")
TR["about_advantage_capacity_desc"] = (
    "800+ smart recipe programs for one-touch cooking. No dependency on chef skill or mood — Bangkok, Jakarta, Kuala Lumpur: same brand, same taste.",
    "800+道智能菜谱一键出餐。不依赖厨师情绪，不依赖厨师水平。曼谷、雅加达、吉隆坡——同一个品牌，同一种味道。"
)

TR["about_stat_years"] = ("Years of Experience", "年行业经验")
TR["about_stat_products"] = ("Smart Equipment Models", "款智能设备")
TR["about_stat_countries"] = ("Countries Served", "服务国家")
TR["about_check_1"] = ("In-House R&D", "自主研发")
TR["about_check_2"] = ("Quality Assurance", "品质保障")

TR["about_mfg_title"] = ("Manufacturing Excellence", "制造实力")
TR["about_mfg_desc"] = (
    "YuKoLi's Foshan manufacturing base is equipped with advanced CNC machining centers, automated welding systems, and full-process quality inspection lines. Every unit undergoes rigorous performance and safety testing before shipment, ensuring stable and reliable operation in demanding commercial kitchen environments.",
    "YuKoLi 佛山制造基地配备先进的数控加工中心、自动化焊接系统和全流程质量检测线。每台设备出厂前经过严格的性能测试和安全检验，确保在高强度的商用厨房环境中稳定可靠运行。"
)
TR["about_mfg_adv1_title"] = ("Precision Manufacturing", "精密制造")
TR["about_mfg_adv1_desc"] = (
    "CNC machining centers and automated production lines ensure consistent precision for every component.",
    "数控加工中心与自动化产线，确保每个零部件精度一致"
)
TR["about_mfg_adv2_title"] = ("Full Inspection Before Shipment", "全检出厂")
TR["about_mfg_adv2_desc"] = (
    "Multi-stage quality control — every unit passes strict performance and safety testing before leaving the factory.",
    "多阶段质检流程，每台设备出厂前通过严格性能与安全测试"
)
TR["about_mfg_adv3_title"] = ("Supply Chain Management", "供应链管理")
TR["about_mfg_adv3_desc"] = (
    "Strategic partnerships with top global component suppliers ensure a stable and reliable supply chain.",
    "与全球优质零部件供应商建立战略合作，确保供应链稳定"
)
TR["about_mfg_adv4_title"] = ("Global Logistics", "全球物流")
TR["about_mfg_adv4_desc"] = (
    "Efficient international logistics network ensuring safe delivery to 68+ countries worldwide.",
    "高效的国际物流体系，设备安全送达全球68+国家"
)

TR["about_cert_title"] = ("Global Certifications", "全球权威认证")
TR["about_cert_ce"] = ("CE Certified", "CE 欧盟认证")
TR["about_cert_iso"] = ("ISO 9001 Certified", "ISO 9001 质量管理")
TR["about_cert_iso14001"] = ("ISO 14001 Certified", "ISO 14001 环境管理")
TR["about_cert_rohs"] = ("RoHS Compliant", "RoHS 环保合规")
TR["about_cert_cb"] = ("CB Certified", "CB 国际电工认证")
TR["about_cert_sni"] = ("SNI Certified", "SNI 印尼国家标准")
TR["about_cert_tis"] = ("TIS Certified", "TIS 泰国工业标准")
TR["about_cert_pli"] = ("Product Liability Insurance", "产品责任险")
TR["about_cert_custom"] = ("Custom Certification Service", "定制化认证服务")

TR["about_story_title"] = ("Our Story", "我们的故事")
TR["about_story_p1"] = (
    "Founded in 2003 in Foshan, Guangdong — China's kitchen equipment manufacturing hub — YuKoLi started in a small engineering workshop with a single goal: transforming commercial kitchens through intelligent automation. Over 23 years of continuous R&D and market validation, YuKoLi has grown into a fully integrated smart kitchen equipment manufacturer spanning R&D, production, and sales.",
    "佛山市跃迁力科技有限公司成立于2003年，坐落于中国厨具制造重镇——广东佛山。从一间小型工程车间起步，我们始终聚焦一个目标：用智能自动化改变商用厨房的工作方式。经过23年的技术积累和市场验证，YuKoLi 已发展成为集研发、制造、销售于一体的专业智能厨具制造商。"
)
TR["about_story_p2"] = (
    "Today, our 200+ smart equipment models serve customers in 50+ countries — from chain restaurants in Bangkok to central kitchens in Ho Chi Minh City, from canteens in Kuala Lumpur to fast-food brands in Jakarta. Whether you run a street food stall or a thousand-store chain, YuKoLi can help you save labor, standardize output, and scale efficiently.",
    "今天，我们的200款智能设备服务于全球50多个国家——从泰国曼谷的连锁餐厅，到越南胡志明市的中央厨房，从马来西亚吉隆坡的食堂，到印度尼西亚雅加达的快餐品牌。无论是街头小吃摊还是千店连锁，YuKoLi 都能帮助您节省人工、统一出品、高效扩张。"
)

TR["about_parts_badge"] = ("Parts Guarantee", "配件保障")
TR["about_parts_title"] = ("72-Hour Parts Dispatch Promise", "72 小时配件发货承诺")
TR["about_parts_subtitle"] = (
    "Equipment downtime is costly. With our parts warehouse in Thailand, common replacement parts are dispatched within 72 hours to any destination in Southeast Asia.",
    "设备出了问题，最怕等配件。我们在泰国设有备件仓库，常见配件 72 小时内发往东南亚任何目的地。"
)
TR["about_parts_dispatch"] = ("72-Hour Dispatch", "72 小时发货")
TR["about_parts_dispatch_desc"] = (
    "Common wear parts (seals, bearings, thermostats, etc.) dispatched from our Singapore warehouse within 72 hours, delivered direct to your door.",
    "常见易损件（密封圈、轴承、温控器等）从新加坡仓库 72 小时内发出，直达目的地。"
)
TR["about_parts_hub"] = ("Thailand Parts Hub", "泰国配件中心")
TR["about_parts_hub_desc"] = (
    "A key logistics hub for Southeast Asia, covering the Philippines, Indonesia, Malaysia, Thailand, Vietnam, and other major markets.",
    "东南亚核心物流节点，覆盖菲律宾、印尼、马来西亚、泰国、越南等主要市场。"
)
TR["about_parts_tutorial"] = ("5-Minute Replacement Guide", "5 分钟更换教程")
TR["about_parts_tutorial_desc"] = (
    "Every wear part comes with a step-by-step video replacement guide — resolve common issues yourself in just 5 minutes.",
    "每个易损件附带视频更换教程，常见问题自己动手 5 分钟解决。"
)
TR["about_parts_video_placeholder"] = ("Video Tutorial (Coming Soon)", "视频教程（即将上线）")

TR["about_sla_badge"] = ("Service Commitment", "售后承诺")
TR["about_sla_title"] = ("After-Sales SLA — Written into Your Contract", "售后服务 SLA — 写进合同的承诺")
TR["about_sla_subtitle"] = (
    "Our after-sales service is not just a promise — it's a guarantee written into your contract.",
    "我们的售后服务不只是承诺，更是写进合同的保障。"
)
TR["about_sla_warranty"] = ("Whole-Machine Warranty", "整机质保")
TR["about_sla_warranty_desc"] = ("Free repair for non-human-caused damage", "非人为损坏免费维修")
TR["about_sla_core"] = ("Core Component Warranty", "核心部件质保")
TR["about_sla_core_desc"] = ("Motors, PLCs, heating elements", "电机、PLC、加热元件")
TR["about_sla_response"] = ("WhatsApp Response", "WhatsApp 响应")
TR["about_sla_response_desc"] = ("Response within 2 minutes during business hours", "工作时间内 < 2 分钟回复")
TR["about_sla_install"] = ("Installation & Training", "安装 & 培训")
TR["about_sla_install_desc"] = ("Included in the project price at no extra cost", "包含在项目总价中，免费")
TR["about_sla_detail_title"] = ("Service Commitment Details", "服务承诺详情")
TR["about_sla_spare_parts"] = ("Southeast Asia Parts Inventory", "东南亚备件库存")
TR["about_sla_spare_parts_desc"] = ("Thailand warehouse stocks 200+ common spare parts, ready for immediate dispatch", "泰国仓储备有 200+ 常用配件，随时可发")
TR["about_sla_remote"] = ("Remote Technical Support", "远程技术支持")
TR["about_sla_remote_desc"] = ("Video remote diagnostics and guidance to reduce wait times", "视频远程诊断 + 指导，减少等待时间")
TR["about_sla_recipe"] = ("Free Recipe Updates", "免费菜谱更新")
TR["about_sla_recipe_desc"] = ("Lifetime free updates to the equipment recipe library — continuously unlock new dishes", "设备菜谱库终身免费更新，不断解锁新菜品")
TR["about_sla_training"] = ("Operator Training Certificate", "操作培训证书")
TR["about_sla_training_desc"] = ("Official operator certificate issued upon completion of training", "培训完成后颁发操作证书，确保规范使用")

TR["about_cta_title"] = ("Ready to Upgrade Your Kitchen?", "准备好升级您的厨房了吗？")
TR["about_cta_desc"] = (
    "Partner with YuKoLi and join 3,000+ foodservice businesses worldwide in their smart upgrade journey. Get a free customized proposal — our engineers will respond within 24 hours.",
    "与 YuKoLi 合作，加入全球3000+餐饮企业的智能化升级行列。免费获取定制方案，24小时内专业工程师回复。"
)
TR["about_cta_btn_quote"] = ("Get a Quote", "获取报价")
TR["about_cta_btn_products"] = ("Browse Products", "浏览产品")

TR["about_wa_cta_title"] = ("Questions? WhatsApp Us Directly", "有疑问？直接 WhatsApp 我们")
TR["about_wa_cta_desc"] = ("Response in 2 min · Remote video diagnostics · On-site technical support", "2 分钟内响应 · 远程视频诊断 · 现场技术支持")
TR["about_wa_cta_btn"] = ("WhatsApp Us", "WhatsApp 联系我们")

TR["about_meta_title"] = ("YuKoLi Smart Kitchen | About Us — Commercial Kitchen Equipment Manufacturer", "YuKoLi 智能厨具 | 关于我们")

# --- Contact page keys ---
TR["contact_hero_badge"] = ("Contact Us", "联系我们")
TR["contact_hero_title"] = ("Let's Start a", "让我们开始")
TR["contact_hero_title_highlight"] = ("Conversation", "对话")
TR["contact_hero_desc"] = (
    "Whether you need a quote, technical support, or partnership opportunities, our global team is ready to serve you.",
    "无论您需要报价、技术支持还是合作机会,我们的全球团队随时为您服务。"
)
TR["contact_form_title"] = ("Send Us a Message", "给我们留言")
TR["contact_form_firstname_label"] = ("First Name", "名")
TR["contact_form_lastname_label"] = ("Last Name", "姓")
TR["contact_form_email_label"] = ("Email", "邮箱")
TR["contact_form_company_label"] = ("Company", "公司")
TR["contact_form_message_label"] = ("Message", "留言")
TR["contact_form_submit"] = ("Send Message", "发送消息")
TR["contact_card_email_title"] = ("Email Us", "邮件联系")
TR["contact_card_phone_title"] = ("Call Us", "电话联系")
TR["contact_card_general_inquiry"] = ("General Inquiry & Sales", "一般咨询与销售")
TR["contact_card_working_hours"] = ("Mon–Fri 9:00–18:00 (UTC+8)", "周一至周五 9:00-18:00 (UTC+8)")
TR["contact_card_urgent_reply"] = ("Urgent Response Available", "紧急事项快速回复")
TR["contact_offices_title"] = ("Our Offices", "公司地址")
TR["contact_office_hq"] = ("China Headquarters", "中国总部")
TR["contact_company_name"] = ("Foshan YuKoLi Technology Co., Ltd.", "佛山市跃迁力科技有限公司")
TR["contact_partner_title"] = ("Become a Partner", "成为合作伙伴")
TR["contact_partner_desc"] = (
    "Join our global distributor and dealer network. We offer competitive margins, comprehensive training, and dedicated support.",
    "加入我们的全球分销商和经销商网络。我们提供具有竞争力的利润空间、全面的培训和专属支持。"
)
TR["contact_partner_btn"] = ("Apply Now", "申请合作")


def process_html(filepath):
    """Process a single HTML file: fill empty data-i18n keys, replace Chinese text with English."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # ── 1. Replace text inside data-i18n="KEY">Chinese</…> with English ──
    for key, (en, zh) in TR.items():
        # Pattern: data-i18n="KEY">ZH_TEXT</
        # The tag might be <span>, <p>, <a>, <h1>, <title>, <label>, <button>, etc.
        # Also handle data-i18n="KEY" with zh text that may contain HTML entities or nested elements
        
        # Skip keys that aren't used in about/contact pages based on file path
        if "about" in os.path.basename(os.path.dirname(filepath)):
            if key.startswith("contact_"):
                continue
        elif "contact" in os.path.basename(os.path.dirname(filepath)):
            if key.startswith("about_"):
                continue

        # Pattern for tags with data-i18n="key" containing zh text (possibly with nested HTML)
        # We need to handle cases where the zh text contains HTML like <span class="text-red-500">*</span>
        # Use a more flexible regex
        if zh == TR.get(key, ("", ""))[1]:  # always true, just for clarity
            # Escape special regex chars in zh
            zh_escaped = re.escape(zh)
            # Match: data-i18n="KEY" followed by > then zh_text until the next </tag> or end
            # We use a non-greedy match for the closing
            pattern = rf'(data-i18n="{re.escape(key)}"[^>]*>)([\s\S]*?)({zh_escaped})([\s\S]*?)(</(?:span|p|h[1-6]|label|a|button|title|div)\s*>)'
            
            # Simpler approach: just replace the Chinese text when it appears after data-i18n="key"
            # Since we know the exact zh text, we can just do string replacement within the tag
            # But we need to be careful to only replace within the correct data-i18n context
            
            # Find all occurrences of data-i18n="key"
            key_pattern = re.compile(rf'data-i18n="{re.escape(key)}"')
            for m in key_pattern.finditer(content):
                start = m.end()
                # Find the closing > of this tag
                gt_pos = content.find('>', start)
                if gt_pos == -1:
                    continue
                # Find the end tag
                # Look for </span>, </p>, </h1>, etc.
                tag_content_start = gt_pos + 1
                # Find the matching end tag - look for next </ after tag_content_start
                # We search for common closing tags
                end_tag_pattern = re.compile(r'</(span|p|h[1-6]|label|a|button|title|div)\s*>', re.IGNORECASE)
                end_match = end_tag_pattern.search(content, tag_content_start)
                if end_match:
                    tag_content = content[tag_content_start:end_match.start()]
                    if zh in tag_content:
                        new_content = tag_content.replace(zh, en)
                        content = content[:tag_content_start] + new_content + content[end_match.start():]

    # ── 2. Fill empty data-i18n="" keys ──
    # Pattern: data-i18n="">SOME TEXT</tag>
    # We need to identify these and fill them with proper keys
    
    # Cert section: data-i18n="">CE 欧盟认证</p>
    empty_i18n_map = {
        "CE 欧盟认证": ("about_cert_ce", "CE Certified"),
        "ISO 9001 质量管理": ("about_cert_iso", "ISO 9001 Certified"),
        "ISO 14001 环境管理": ("about_cert_iso14001", "ISO 14001 Certified"),
        "RoHS 环保合规": ("about_cert_rohs", "RoHS Compliant"),
        "CB 国际电工认证": ("about_cert_cb", "CB Certified"),
        "SNI 印尼国家标准": ("about_cert_sni", "SNI Certified"),
        "TIS 泰国工业标准": ("about_cert_tis", "TIS Certified"),
        "产品责任险": ("about_cert_pli", "Product Liability Insurance"),
        "定制化认证服务": ("about_cert_custom", "Custom Certification Service"),
        "一般咨询与销售": ("contact_card_general_inquiry", "General Inquiry & Sales"),
        "周一至周五 9:00-18:00 (UTC+8)": ("contact_card_working_hours", "Mon–Fri 9:00–18:00 (UTC+8)"),
        "紧急事项快速回复": ("contact_card_urgent_reply", "Urgent Response Available"),
    }
    
    # Also handle PC-specific advantage descriptions that have empty data-i18n
    # These are in about/index-pc.html only
    pc_empty_map = {
        "1名普通厨工轻松看管2-5台设备，3-6个月收回设备投资。不用再为招不到厨师、留不住厨师发愁。": ("about_advantage_labor_desc", "One operator can manage 2–5 machines simultaneously, with a 3–6 month payback period. No more worrying about hiring or retaining chefs."),
        "电磁感应加热热效率≥90%，比传统燃气设备节能50-60%。一台15kW设备每天工作8小时，年省燃料费约2.6万元。": ("about_advantage_energy_desc", "Electromagnetic induction heating with ≥90% thermal efficiency — 50–60% more efficient than traditional gas. A 15 kW unit saves approximately CNY 26,000 annually."),
        "800+道智能菜谱一键出餐。不依赖厨师情绪，不依赖厨师水平。曼谷、雅加达、吉隆坡——同一个品牌，同一种味道。": ("about_advantage_capacity_desc", "800+ smart recipe programs for one-touch cooking. No dependency on chef skill or mood — Bangkok, Jakarta, Kuala Lumpur: same brand, same taste."),
    }
    
    if "index-pc.html" in filepath:
        empty_i18n_map.update(pc_empty_map)
    
    # Also handle mfg_adv descriptions that have empty data-i18n in PC
    pc_mfg_empty_map = {
        "数控加工中心与自动化产线，确保每个零部件精度一致": ("about_mfg_adv1_desc", "CNC machining centers and automated production lines ensure consistent precision for every component."),
        "多阶段质检流程，每台设备出厂前通过严格性能与安全测试": ("about_mfg_adv2_desc", "Multi-stage quality control — every unit passes strict performance and safety testing before leaving the factory."),
        "与全球优质零部件供应商建立战略合作，确保供应链稳定": ("about_mfg_adv3_desc", "Strategic partnerships with top global component suppliers ensure a stable and reliable supply chain."),
        "高效的国际物流体系，设备安全送达全球68+国家": ("about_mfg_adv4_desc", "Efficient international logistics network ensuring safe delivery to 68+ countries worldwide."),
    }
    
    if "index-pc.html" in filepath:
        empty_i18n_map.update(pc_mfg_empty_map)
    
    for zh_text, (key, en_text) in empty_i18n_map.items():
        # Pattern: data-i18n="">ZH_TEXT</tag>
        # The zh_text might appear after data-i18n="" in a tag
        pattern = rf'(data-i18n="")([^>]*>)({re.escape(zh_text)})(</(?:span|p|h[1-6]|label|a|button|title)\s*>)'
        repl = f'data-i18n="{key}"' + r'"\2"' + en_text + r'"\4"'
        content = re.sub(pattern, repl, content)

    # ── 3. Handle hardcoded Chinese in specific contexts ──
    
    # Fix: data-i18n="about_cert_ul" should be data-i18n="about_cert_iso14001" (tablet/mobile bug)
    content = content.replace('data-i18n="about_cert_ul"', 'data-i18n="about_cert_iso14001"')
    
    # Fix alt attributes
    content = content.replace('alt="YuKoLi 工厂"', 'alt="YuKoLi Factory"')
    content = content.replace('alt="工厂"', 'alt="Factory"')
    content = content.replace('alt="新加坡备件仓库"', 'alt="Singapore Parts Warehouse"')
    
    # Fix standalone "年" in SLA warranty cards (e.g., 1年, 3年)
    content = re.sub(r'(<span class="text-2xl">)</s*(\d+)</s*(<span class="text-lg">)年(</span>)', 
                    r'\1\2\3 Yr\4', content)
    content = re.sub(r'(<span class="text-lg">)年(</span>)', 
                    r'\1 Yr\2', content)
    
    # Fix meta/title hardcoded Chinese (only for about pages)
    if "about" in os.path.basename(os.path.dirname(filepath)):
        # PC page has og:title and og:description in Chinese
        content = content.replace(
            'content="YuKoLi 智能厨具 | 关于我们 - 23年商用厨房设备制造商"',
            'content="YuKoLi Smart Kitchen | About Us — 23-Year Commercial Kitchen Equipment Manufacturer"'
        )
        content = content.replace(
            'content="YuKoLi（跃迁力科技）— 23年商用厨房设备制造商，总部位于广东佛山。200款智能商厨设备，覆盖全球68+国家，通过CE、UL、ISO 9001认证。"',
            'content="YuKoLi — 23-year commercial kitchen equipment manufacturer based in Foshan, Guangdong. 200+ smart equipment models serving 68+ countries worldwide. CE, UL, ISO 9001 certified."'
        )
        content = content.replace(
            'content="关于 YuKoLi 跃迁力科技 — 23年商用厨房设备制造经验，ISO 9001/CE双认证，200款智能设备服务全球68+国家餐饮企业。"',
            'content="About YuKoLi — 23 years of commercial kitchen equipment manufacturing. ISO 9001 / CE dual certified. 200+ smart equipment models serving 68+ countries."'
        )
        # Tablet/mobile meta description
        content = content.replace(
            'content="YuKoLi（跃迁力科技）— 20年商用厨房设备制造商，总部位于广东佛山。200款智能商厨设备，覆盖全球50+国家，通过CE、UL、ISO 9001认证。"',
            'content="YuKoLi — 20-year commercial kitchen equipment manufacturer based in Foshan, Guangdong. 200+ smart equipment models serving 50+ countries. CE, UL, ISO 9001 certified."'
        )
    
    # Fix contact meta descriptions
    if "contact" in os.path.basename(os.path.dirname(filepath)):
        content = content.replace(
            'content="联系 YuKoLi - 获取智能商用厨房设备报价和技术咨询,全球服务网络覆盖东南亚、中东、南亚市场。"',
            'content="Contact YuKoLi — Get quotes and technical consultation for smart commercial kitchen equipment. Global service network covering Southeast Asia, Middle East, and South Asia."'
        )
        content = content.replace(
            'content="联系 YuKoLi — 获取智能商用厨房设备报价和技术咨询，全球服务网络覆盖东南亚、中东、南亚市场。"',
            'content="Contact YuKoLi — Get quotes and technical consultation for smart commercial kitchen equipment. Global service network covering Southeast Asia, Middle East, and South Asia."'
        )
        # JSON-LD Chinese
        content = content.replace(
            '"name": "联系我们 - 佛山市跃迁力科技有限公司"',
            '"name": "Contact Us — Foshan YuKoLi Technology Co., Ltd."'
        )
        content = content.replace(
            '"description": "联系佛山市跃迁力科技有限公司,获取商用厨房设备报价与技术支持。"',
            '"description": "Contact Foshan YuKoLi Technology Co., Ltd. for commercial kitchen equipment quotes and technical support."'
        )
    
    # Fix "中文地址" labels in contact pages
    content = content.replace('>中文地址<', '>Chinese Address<')
    
    # Fix onerror Chinese fallback text
    content = content.replace("仓库照片加载中...", "Loading warehouse photo...")
    content = content.replace("仓库照片", "Warehouse photo")
    
    # Fix "发送留言" in mobile contact (no data-i18n on this one, it has data-i18n="contact_form_title")
    # Actually, the mobile contact has data-i18n="contact_form_title">发送留言 — already handled above
    
    # Fix "发送" button text in mobile contact (data-i18n="contact_form_submit">发送)
    # This is already handled by the TR map
    
    # Fix "立即申请" in tablet contact partner section - TR has "申请合作" which maps to different zh
    # Let's handle "立即申请" specifically
    content = content.replace('>立即申请<', '>Apply Now<')
    
    # Fix "申请" in mobile contact partner 
    # The mobile has data-i18n="contact_partner_btn">申请 — need to handle
    # Actually the TR map handles this with key contact_partner_btn, zh="申请合作"
    # But mobile has just "申请", so let's check
    # The replacement logic above should have caught data-i18n="contact_partner_btn">申请
    # If it didn't match because zh text is "申请" not "申请合作", we need to handle
    # Let's do a manual fix for this edge case
    
    # Actually let's check: mobile has `data-i18n="contact_partner_btn">\n          申请\n        </a>`
    # The zh in TR is "申请合作" but mobile has "申请". So the replacement won't match.
    # Fix: just replace the Chinese text in that context
    # We'll handle this with a more targeted approach
    
    if "index-mobile.html" in filepath and "contact" in filepath:
        # Mobile partner btn
        content = re.sub(
            r'(data-i18n="contact_partner_btn"[^>]*>)\s*申请\s*(</a>)',
            r'\1Apply Now\2',
            content
        )
    
    # Fix tablet "安装 & 培训" already has correct data-i18n, but the & is HTML entity
    # The text in TR uses "&" which matches
    
    # Fix lang="zh-CN" → lang="en" in <html> tag (default language for SEA B2B)
    content = re.sub(r'<html([^>]*?)lang="zh-CN"', r'<html\1lang="en"', content)
    
    # Fix "仓库照片加载中..." and "仓库照片" in onerror handlers
    # These are in JavaScript strings, need to handle escaped versions
    content = content.replace('\\u4ed3\\u5e93\\u7167\\u7247\\u52a0\\u8f7d\\u4e2d...', 'Loading warehouse photo...')
    content = content.replace('\\u4ed3\\u5e93\\u7167\\u7247', 'Warehouse photo')
    content = content.replace("仓库照片加载中...", "Loading warehouse photo...")
    content = content.replace("仓库照片", "Warehouse photo")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated: {filepath}")
    else:
        print(f"  No changes: {filepath}")


def update_i18n_json():
    """Add all new about/contact keys to en and zh-CN in ui-i18n.json."""
    with open(I18N_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'en' not in data:
        data['en'] = {}
    if 'zh-CN' not in data:
        data['zh-CN'] = {}
    
    added_en = 0
    added_zh = 0
    for key, (en, zh) in sorted(TR.items()):
        if key not in data['en']:
            data['en'][key] = en
            added_en += 1
        if key not in data['zh-CN']:
            data['zh-CN'][key] = zh
            added_zh += 1
    
    with open(I18N_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    print(f"  Added {added_en} new EN keys, {added_zh} new zh-CN keys to ui-i18n.json")


if __name__ == "__main__":
    print("Processing About pages...")
    for name in ["index-pc.html", "index-tablet.html", "index-mobile.html"]:
        process_html(os.path.join(BASE, "src/pages/about", name))
    
    print("\nProcessing Contact pages...")
    for name in ["index-pc.html", "index-tablet.html", "index-mobile.html"]:
        process_html(os.path.join(BASE, "src/pages/contact", name))
    
    print("\nUpdating ui-i18n.json...")
    update_i18n_json()
    
    print("\nDone!")

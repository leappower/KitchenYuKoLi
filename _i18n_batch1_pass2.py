#!/usr/bin/env python3
"""Fix remaining Chinese text in about/contact HTML files — pass 2."""

import os

BASE = "/Users/chee/Projects/KitchenYuKoLi"

def fix_file(filepath, replacements):
    """Apply a list of (old_str, new_str) replacements."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated: {filepath}")
    else:
        print(f"  No changes: {filepath}")

# ═══════════════════════════════════════════
# ABOUT PC
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/about/index-pc.html", [
    # Title tag
    ('<title>YuKoLi 智能厨具 | 关于我们 - 23年商用厨房设备制造商</title>',
     '<title>YuKoLi Smart Kitchen | About Us — 23-Year Commercial Kitchen Equipment Manufacturer</title>'),
    # JSON-LD about page
    ('"name": "关于 YuKoLi - 23年商用厨房设备制造商"',
     '"name": "About YuKoLi — 23-Year Commercial Kitchen Equipment Manufacturer"'),
    ('"description": "YuKoLi（跃迁力科技）— 23年专注智能商用厨房设备的研发与制造，200款智能设备服务全球68+国家。"',
     '"description": "YuKoLi — 23 years dedicated to R&D and manufacturing of smart commercial kitchen equipment. 200+ smart equipment models serving 68+ countries worldwide."'),
    # 500份
    ('<p class="text-3xl font-black text-primary">500份</p>',
     '<p class="text-3xl font-black text-primary">500</p>'),
    # Story p1 — remaining Chinese after partial replacement
    ('已发展成为集研发、制造、销售于一体的专业智能厨具制造商。',
     'YuKoLi has grown into a fully integrated smart kitchen equipment manufacturer spanning R&D, production, and sales.'),
    ('今天，我们的200款智能设备服务于全球50多个国家——从泰国曼谷的连锁餐厅，到越南胡志明市的中央厨房，从马来西亚吉隆坡的食堂，到印度尼西亚雅加达的快餐品牌。无论是街头小吃摊还是千店连锁，YuKoLi\n            都能帮助您节省人工、统一出品、高效扩张。',
     'Today, our 200+ smart equipment models serve customers in 50+ countries — from chain restaurants in Bangkok to central kitchens in Ho Chi Minh City, from canteens in Kuala Lumpur to fast-food brands in Jakarta. Whether you run a street food stall or a thousand-store chain, YuKoLi can help you save labor, standardize output, and scale efficiently.'),
    # 年 in SLA
    ('<div class="text-5xl font-black text-primary mb-2">1<span class="text-2xl">年</span></div>',
     '<div class="text-5xl font-black text-primary mb-2">1<span class="text-2xl"> Yr</span></div>'),
    ('<div class="text-5xl font-black text-primary mb-2">3<span class="text-2xl">年</span></div>',
     '<div class="text-5xl font-black text-primary mb-2">3<span class="text-2xl"> Yr</span></div>'),
    # SLA response desc
    ('data-i18n="about_sla_response_desc">工作时间内 &lt; 2 分钟回复</p>',
     'data-i18n="about_sla_response_desc">Response within 2 minutes during business hours</p>'),
])

# ═══════════════════════════════════════════
# ABOUT TABLET
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/about/index-tablet.html", [
    # Advantage descriptions
    ('data-i18n="about_advantage_labor_desc">\n                1台智能炒菜机可替代3-5名厨师，解决招工难、留人难问题\n              </p>',
     'data-i18n="about_advantage_labor_desc">One Automatic Wok Machine can replace 3–5 chefs, solving recruitment and retention challenges.</p>'),
    ('data-i18n="about_advantage_energy_desc">\n                电磁加热技术，比传统燃气灶节能30%以上\n              </p>',
     'data-i18n="about_advantage_energy_desc">Electromagnetic heating technology — 30%+ more energy efficient than traditional gas stoves.</p>'),
    # 500份
    ('<p class="text-2xl font-black text-primary mb-1">500份</p>',
     '<p class="text-2xl font-black text-primary mb-1">500</p>'),
    # Capacity desc
    ('data-i18n="about_advantage_capacity_desc">\n                全自动炒菜机一锅出500份标准出品，大幅提升出餐效率\n              </p>',
     'data-i18n="about_advantage_capacity_desc">Fully automatic wok machine produces 500 standard portions per batch, dramatically increasing output.</p>'),
    # Story p1
    ('已发展成为集研发、制造、销售于一体的专业智能厨具制造商。',
     'YuKoLi has grown into a fully integrated smart kitchen equipment manufacturer spanning R&D, production, and sales.'),
    ('今天，我们的200款智能设备服务于全球50多个国家——从泰国曼谷的连锁餐厅，到越南胡志明市的中央厨房，从马来西亚吉隆坡的食堂，到印度尼西亚雅加达的快餐品牌。无论是街头小吃摊还是千店连锁，YuKoLi\n            都能帮助您节省人工、统一出品、高效扩张。',
     'Today, our 200+ smart equipment models serve customers in 50+ countries — from chain restaurants in Bangkok to central kitchens in Ho Chi Minh City, from canteens in Kuala Lumpur to fast-food brands in Jakarta. Whether you run a street food stall or a thousand-store chain, YuKoLi can help you save labor, standardize output, and scale efficiently.'),
    # MFG adv4 desc
    ('data-i18n="about_mfg_adv4_desc">\n                      高效的国际物流体系，设备安全送达全球50+国家\n                    </p>',
     'data-i18n="about_mfg_adv4_desc">Efficient international logistics network ensuring safe delivery to 50+ countries worldwide.</p>'),
    # Cert iso14001
    ('data-i18n="about_cert_iso14001">ISO 14001 环境管理</p>',
     'data-i18n="about_cert_iso14001">ISO 14001 Certified</p>'),
    # Parts hub desc
    ('data-i18n="about_parts_hub_desc">覆盖菲律宾、印尼、马来西亚、泰国、越南等主要市场。</p>',
     'data-i18n="about_parts_hub_desc">Covering the Philippines, Indonesia, Malaysia, Thailand, Vietnam, and other major markets.</p>'),
    # SLA
    ('<div class="text-3xl font-black text-primary mb-1">1<span class="text-lg">年</span></div>',
     '<div class="text-3xl font-black text-primary mb-1">1<span class="text-lg"> Yr</span></div>'),
    ('<div class="text-3xl font-black text-primary mb-1">3<span class="text-lg">年</span></div>',
     '<div class="text-3xl font-black text-primary mb-1">3<span class="text-lg"> Yr</span></div>'),
    ('data-i18n="about_sla_response_desc">工作时间内 &lt; 2 分钟回复</p>',
     'data-i18n="about_sla_response_desc">Response within 2 minutes during business hours</p>'),
    ('data-i18n="about_sla_install">安装 &amp; 培训</h4>',
     'data-i18n="about_sla_install">Installation &amp; Training</h4>'),
    ('data-i18n="about_sla_recipe_desc">设备菜谱库终身免费更新</p>',
     'data-i18n="about_sla_recipe_desc">Lifetime free updates to the equipment recipe library</p>'),
    ('data-i18n="about_sla_training_desc">培训完成后颁发操作证书</p>',
     'data-i18n="about_sla_training_desc">Official operator certificate issued upon completion of training</p>'),
])

# ═══════════════════════════════════════════
# ABOUT MOBILE
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/about/index-mobile.html", [
    # Advantage descriptions
    ('data-i18n="about_advantage_labor_desc">\n                  1台智能炒菜机可替代3-5名厨师，解决招工难、留人难问题\n                </p>',
     'data-i18n="about_advantage_labor_desc">One Automatic Wok Machine can replace 3–5 chefs, solving recruitment and retention challenges.</p>'),
    ('data-i18n="about_advantage_energy_desc">\n                  电磁加热技术，比传统燃气灶节能30%以上\n                </p>',
     'data-i18n="about_advantage_energy_desc">Electromagnetic heating technology — 30%+ more energy efficient than traditional gas stoves.</p>'),
    ('data-i18n="about_advantage_capacity_desc">\n                  全自动炒菜机一锅出500份标准出品，大幅提升出餐效率\n                </p>',
     'data-i18n="about_advantage_capacity_desc">Fully automatic wok machine produces 500 standard portions per batch, dramatically increasing output.</p>'),
    # Story p1
    ('已发展成为集研发、制造、销售于一体的专业智能厨具制造商。',
     'YuKoLi has grown into a fully integrated smart kitchen equipment manufacturer spanning R&D, production, and sales.'),
    ('今天，我们的200款智能设备服务于全球50多个国家——从泰国曼谷的连锁餐厅，到越南胡志明市的中央厨房，从马来西亚吉隆坡的食堂，到印度尼西亚雅加达的快餐品牌。无论是街头小吃摊还是千店连锁，YuKoLi\n            都能帮助您节省人工、统一出品、高效扩张。',
     'Today, our 200+ smart equipment models serve customers in 50+ countries — from chain restaurants in Bangkok to central kitchens in Ho Chi Minh City, from canteens in Kuala Lumpur to fast-food brands in Jakarta. Whether you run a street food stall or a thousand-store chain, YuKoLi can help you save labor, standardize output, and scale efficiently.'),
    # MFG adv4 desc
    ('data-i18n="about_mfg_adv4_desc">\n                    高效的国际物流体系，设备安全送达全球50+国家\n                  </p>',
     'data-i18n="about_mfg_adv4_desc">Efficient international logistics network ensuring safe delivery to 50+ countries worldwide.</p>'),
    # Cert iso14001
    ('data-i18n="about_cert_iso14001">ISO 14001 环境管理</p>',
     'data-i18n="about_cert_iso14001">ISO 14001 Certified</p>'),
    # Parts desc
    ('data-i18n="about_parts_dispatch_desc">常见易损件从新加坡仓库 72 小时内发出，直达目的地。</p>',
     'data-i18n="about_parts_dispatch_desc">Common wear parts dispatched from Singapore warehouse within 72 hours.</p>'),
    ('data-i18n="about_parts_hub_desc">覆盖菲律宾、印尼、马来西亚、泰国、越南等主要市场。</p>',
     'data-i18n="about_parts_hub_desc">Covering the Philippines, Indonesia, Malaysia, Thailand, Vietnam, and other major markets.</p>'),
    # SLA
    ('<div class="text-3xl font-black text-primary mb-1">1<span class="text-lg">年</span></div>',
     '<div class="text-3xl font-black text-primary mb-1">1<span class="text-lg"> Yr</span></div>'),
    ('<div class="text-3xl font-black text-primary mb-1">3<span class="text-lg">年</span></div>',
     '<div class="text-3xl font-black text-primary mb-1">3<span class="text-lg"> Yr</span></div>'),
    ('data-i18n="about_sla_response_desc">&lt; 2 分钟回复</p>',
     'data-i18n="about_sla_response_desc">Response within 2 minutes during business hours</p>'),
    ('data-i18n="about_sla_install_desc">免费，含项目总价</p>',
     'data-i18n="about_sla_install_desc">Included in the project price at no extra cost</p>'),
    ('data-i18n="about_sla_spare_parts_desc">泰国仓储备有 200+ 常用配件</p>',
     'data-i18n="about_sla_spare_parts_desc">Thailand warehouse stocks 200+ common spare parts</p>'),
    ('data-i18n="about_sla_remote_desc">视频远程诊断 + 指导</p>',
     'data-i18n="about_sla_remote_desc">Video remote diagnostics and guidance</p>'),
    ('data-i18n="about_sla_recipe_desc">设备菜谱库终身免费更新</p>',
     'data-i18n="about_sla_recipe_desc">Lifetime free recipe library updates</p>'),
    ('data-i18n="about_sla_training_desc">培训完成后颁发操作证书</p>',
     'data-i18n="about_sla_training_desc">Operator certificate issued upon completion</p>'),
])

# ═══════════════════════════════════════════
# CONTACT PC
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/contact/index-pc.html", [
    ('<span data-i18n="nav_products">产品中心</span>',
     '<span data-i18n="nav_products">Products</span>'),
    ('<span data-i18n="nav_applications">行业场景</span>',
     '<span data-i18n="nav_applications">Applications</span>'),
])

# ═══════════════════════════════════════════
# CONTACT TABLET
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/contact/index-tablet.html", [
    # Hero desc (Chinese variant with full-width comma)
    ('data-i18n="contact_hero_desc">\n            无论您需要报价、技术支持还是合作机会，我们的全球团队随时为您服务。\n          </p>',
     'data-i18n="contact_hero_desc">Whether you need a quote, technical support, or partnership opportunities, our global team is ready to serve you.</p>'),
    # Partner btn "立即申请"
    ('data-i18n="contact_partner_btn">\n          立即申请\n        </a>',
     'data-i18n="contact_partner_btn">Apply Now</a>'),
    # nav
    ('<span data-i18n="nav_products">产品中心</span>',
     '<span data-i18n="nav_products">Products</span>'),
    ('<span data-i18n="nav_applications">行业场景</span>',
     '<span data-i18n="nav_applications">Applications</span>'),
])

# ═══════════════════════════════════════════
# CONTACT MOBILE
# ═══════════════════════════════════════════
fix_file(f"{BASE}/src/pages/contact/index-mobile.html", [
    # Hero title - different zh text
    ('data-i18n="contact_hero_title">联系我们</span>',
     'data-i18n="contact_hero_title">Let\'s Start a</span>'),
    # Hero desc
    ('data-i18n="contact_hero_desc">\n            我们随时为您提供报价、支持和合作服务。\n          </p>',
     'data-i18n="contact_hero_desc">We\'re ready to provide quotes, support, and partnership services.</p>'),
    # Card email title
    ('data-i18n="contact_card_email_title">邮件</p>',
     'data-i18n="contact_card_email_title">Email</p>'),
    # Card phone title
    ('data-i18n="contact_card_phone_title">电话</p>',
     'data-i18n="contact_card_phone_title">Phone</p>'),
    # Form title
    ('data-i18n="contact_form_title">发送留言</h3>',
     'data-i18n="contact_form_title">Send Us a Message</h3>'),
    # Submit button
    ('data-i18n="contact_form_submit"\n              >\n                发送\n              </button>',
     'data-i18n="contact_form_submit">Send</button>'),
    # Partner desc
    ('data-i18n="contact_partner_desc">加入我们的全球分销商网络。</p>',
     'data-i18n="contact_partner_desc">Join our global distributor network.</p>'),
    # nav
    ('<span data-i18n="nav_products">产品中心</span>',
     '<span data-i18n="nav_products">Products</span>'),
    ('<span data-i18n="nav_applications">行业场景</span>',
     '<span data-i18n="nav_applications">Applications</span>'),
])

print("\nAll fixes applied!")

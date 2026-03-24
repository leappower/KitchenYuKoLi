#!/usr/bin/env python3
"""
Extract Applications page i18n keys and generate JSON entries for zh-CN and en.
"""
import re
import json
from pathlib import Path

# Read current language files
lang_dir = Path("src/assets/lang")
zh_cn = json.loads((lang_dir / "zh-CN-ui.json").read_text())
en_us = json.loads((lang_dir / "en-ui.json").read_text())

# Extract all data-i18n keys and their Chinese text from HTML files
apps_dir = Path("src/pages/applications")
pages = ["canteen", "cloud-kitchen", "fast-food", "hotpot", "southeast-asian"]

# Map of key -> (zh, en) - for manual translation
translations = {}

def extract_from_html(page_dir):
    """Extract all data-i18n keys and Chinese text from HTML files"""
    html_files = [
        page_dir / "index-pc.html",
        page_dir / "index-tablet.html",
        page_dir / "index-mobile.html"
    ]
    
    for html_file in html_files:
        if not html_file.exists():
            continue
        html = html_file.read_text()
        
        # Find all data-i18n="KEY" and extract the Chinese text that follows
        # Pattern: data-i18n="KEY">TEXT< or data-i18n="KEY" ...>TEXT<
        matches = re.findall(r'data-i18n="([^"]+)"[^>]*>([^<]+)<', html)
        for key, text in matches:
            text = text.strip()
            if key in translations:
                continue  # Already found
            translations[key] = (text, None)  # (zh, en) - en to be translated

for page in pages:
    extract_from_html(apps_dir / page)

# Manual English translations based on context
manual_en = {
    # === Canteen ===
    "canteen_page_title": "Yukoli | Smart Canteen & Central Kitchen Solutions",
    "canteen_pain_title": "Industry Pain Points We Understand",
    "canteen_solution_title": "Full-Process Smart Kitchen Automation",
    "canteen_equipment_title": "Recommended Equipment",
    "canteen_cta_title": "Start Your Smart Kitchen Journey",
    "canteen_cta_desc": "Get your custom solution and let technology empower your food business",
    "canteen_compare_title": "Implementation Results",
    "canteen_equipment_badge_hot": "Bestseller",
    "canteen_equipment_badge_standard": "Standard",
    "canteen_equipment_badge_recommended": "Recommended",
    
    # === Cloud Kitchen ===
    "cloud-kitchen_page_title": "Yukoli | Smart Cloud Kitchen & Delivery Solutions",
    "cloud-kitchen_pain_title": "Industry Pain Points We Understand",
    "cloud-kitchen_solution_title": "Full-Process Smart Kitchen Automation",
    "cloud-kitchen_equipment_title": "Recommended Equipment",
    "cloud-kitchen_cta_title": "Start Your Smart Kitchen Journey",
    "cloud-kitchen_cta_desc": "Get your custom solution and let technology empower your food business",
    "cloud-kitchen_compare_title": "Implementation Results",
    "cloud-kitchen_equipment_badge_hot": "Bestseller",
    "cloud-kitchen_equipment_badge_standard": "Standard",
    "cloud-kitchen_equipment_badge_recommended": "Recommended",
    
    # === Fast Food ===
    "fast-food_page_title": "Yukoli | Chinese Fast Food Chain Solutions",
    "fast-food_pain_title": "Industry Pain Points We Understand",
    "fast-food_solution_title": "Full-Process Smart Kitchen Automation",
    "fast-food_equipment_title": "Recommended Equipment",
    "fast-food_cta_title": "Start Your Smart Kitchen Journey",
    "fast-food_cta_desc": "Get your custom solution and let technology empower your food business",
    "fast-food_compare_title": "Implementation Results",
    "fast-food_equipment_badge_hot": "Bestseller",
    "fast-food_equipment_badge_standard": "Standard",
    "fast-food_equipment_badge_recommended": "Recommended",
    
    # === Hotpot ===
    "hotpot_page_title": "Yukoli | Smart Hotpot & Malatang Solutions",
    "hotpot_pain_title": "Industry Pain Points We Understand",
    "hotpot_solution_title": "Full-Process Smart Kitchen Automation",
    "hotpot_equipment_title": "Recommended Equipment",
    "hotpot_cta_title": "Start Your Smart Kitchen Journey",
    "hotpot_cta_desc": "Get your custom solution and let technology empower your food business",
    "hotpot_compare_title": "Implementation Results",
    "hotpot_equipment_badge_hot": "Bestseller",
    "hotpot_equipment_badge_standard": "Standard",
    "hotpot_equipment_badge_recommended": "Recommended",
    
    # === Southeast Asian ===
    "southeast-asian_page_title": "Yukoli | Thai & Southeast Asian Cuisine Solutions",
    "southeast-asian_pain_title": "Industry Pain Points We Understand",
    "southeast-asian_solution_title": "Full-Process Smart Kitchen Automation",
    "southeast-asian_equipment_title": "Recommended Equipment",
    "southeast-asian_cta_title": "Start Your Smart Kitchen Journey",
    "southeast-asian_cta_desc": "Get your custom solution and let technology empower your food business",
    "southeast-asian_compare_title": "Implementation Results",
    "southeast-asian_equipment_badge_hot": "Bestseller",
    "southeast-asian_equipment_badge_standard": "Standard",
    "southeast-asian_equipment_badge_recommended": "Recommended",
    
    # === Shared/Other keys ===
    "cta_title": "Start Your Smart Kitchen Journey",
    "cta_desc": "Get your custom solution and let technology empower your food business",
    "cta_get_proposal": "Get Free Proposal",
    "cta_contact_sales": "Contact Sales",
    "pdp_consistency": "High Consistency",
    "case_studies_hero_title_1": "Real-World",
    "case_studies_hero_title_2": "Case Studies",
    "case_studies_hero_desc": "See how leading food service companies are transforming their kitchens with Yukoli.",
    "case_studies_all_cases": "All Cases",
    "case_studies_explore_cases": "Explore Cases",
    "case_studies_watch_video": "Watch Video",
    "case_studies_catering": "Catering",
    "case_studies_chain_restaurants": "Chain Restaurants",
    "case_studies_ghost_kitchens": "Ghost Kitchens",
    "case_studies_se_asia_kitchen": "SE Asian Kitchen",
    "case_studies_30_catering": "30+ Catering",
    "case_studies_50_chain": "50+ Chain",
    "case_studies_20_ghost": "20+ Ghost",
    "case_studies_industry_filter_title": "Filter by Industry",
    "case_studies_industry_filter_desc": "Browse case studies by industry type",
    "case_read_more": "Read More",
    "case1_title": "Chain Canteen Upgrade",
    "case1_desc": "Large enterprise canteen increased capacity by 150% and reduced labor costs by 40%.",
    "case2_title": "Cloud Kitchen Optimization",
    "case2_desc": "Cloud kitchen operator achieved 300% space efficiency with compact equipment.",
    "case3_title": "Fast Food Standardization",
    "case3_desc": "Chinese fast food chain reduced labor costs by 31% with automated cooking.",
    "case4_title": "Hotpot Automation",
    "case4_desc": "Hotpot chain reduced staff by 50% while increasing output speed 3×.",
    "case5_title": "SE Asian Cuisine",
    "case5_desc": "Thai restaurant chain achieved 99% taste consistency without native chefs.",
    "featured_client_heading": "Featured Client",
    "featured_client_name": "Leading Chain Brand",
    "featured_client_tagline": "Serving 500+ locations",
    "featured_stat_labor_cut": "Labor Cost ↓31%",
    "featured_stat_launch_time": "Time to Market ↓50%",
    "featured_stat_outlets": "500+ Outlets",
    "featured_cta": "See Full Case Study",
    "case_studies_annual_saving": "Annual Savings",
    "case_studies_meals_day": "Meals/Day",
    "case_studies_orders_day": "Orders/Day",
    "case_studies_labor": "Labor Cost",
    "case_studies_energy": "Energy Savings",
    "case_studies_speed": "Output Speed",
    "case_studies_cooks_reduced": "Chefs Reduced",
    "case_studies_bowls_day": "Bowls/Day",
    "map_title": "Service Network Map",
    "map_desc": "Find our service centers across Southeast Asia and worldwide",
    "map_active_nodes": "Active Service Centers",
    "map_units": "14 Units",
    "map_units_desc": "Serving major cities in Thailand, Vietnam, Malaysia, Indonesia",
    "certifications_title": "Global Certifications",
    "cert_safety_listed": "UL Listed",
    "cert_eco_compliant": "Eco Compliant",
    "cert_eu_conformity": "EU Conformity",
    "cert_quality_mgmt": "Quality Management System",
}

# Build the final translation dictionary
zh_updates = {}
en_updates = {}

for key, (zh, _) in translations.items():
    zh_updates[key] = zh
    en_updates[key] = manual_en.get(key, key.replace("-", "_").replace("_", " ").title())

# Merge into existing translations
zh_cn.update(zh_updates)
en_us.update(en_updates)

# Write back
(lang_dir / "zh-CN-ui.json").write_text(json.dumps(dict(sorted(zh_cn.items())), indent=2, ensure_ascii=False) + "\n")
(lang_dir / "en-ui.json").write_text(json.dumps(dict(sorted(en_us.items())), indent=2, ensure_ascii=False) + "\n")

print(f"✅ Updated zh-CN-ui.json ({len(zh_updates)} new keys)")
print(f"✅ Updated en-ui.json ({len(en_updates)} new keys)")
print(f"\nTotal keys: zh-CN={len(zh_cn)}, en={len(en_us)}")

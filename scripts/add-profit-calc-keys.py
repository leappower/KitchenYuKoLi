#!/usr/bin/env python3
"""Add missing profit_calc translation keys to all 25 language files."""

import json, os

LANG_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "lang")

# All missing profit_calc keys with English text (source of truth)
# Chinese also provided for zh-CN
KEYS = {
    # ── Comparison dimension names ──
    "profit_calc_comp_dimension":        {"en": "Dimension",               "zh": "对比维度"},
    "profit_calc_comp_quality":          {"en": "Dish Quality",            "zh": "菜品品质"},
    "profit_calc_comp_consistency":      {"en": "Consistency",             "zh": "出品一致性"},
    "profit_calc_comp_speed":            {"en": "Cooking Speed",           "zh": "烹饪速度"},
    "profit_calc_comp_wok_safety":       {"en": "Wok Safety",              "zh": "炒锅安全"},
    "profit_calc_comp_space":            {"en": "Space Usage",             "zh": "空间利用"},
    "profit_calc_comp_rice_capacity":    {"en": "Rice Capacity",           "zh": "米饭容量"},
    "profit_calc_comp_energy":           {"en": "Energy Efficiency",       "zh": "能源效率"},
    "profit_calc_comp_safety":           {"en": "Safety",                  "zh": "安全性"},
    "profit_calc_comp_hygiene":          {"en": "Hygiene",                 "zh": "卫生标准"},
    "profit_calc_comp_water_usage":      {"en": "Water Usage",             "zh": "用水量"},
    "profit_calc_comp_labor_intensity":  {"en": "Labor Intensity",         "zh": "劳动强度"},
    "profit_calc_comp_temp_control":     {"en": "Temperature Control",     "zh": "温度控制"},
    "profit_calc_comp_oil_mgmt":         {"en": "Oil Management",          "zh": "用油管理"},
    "profit_calc_comp_monthly_labor":    {"en": "Monthly Labor Cost",      "zh": "每月人工成本"},
    "profit_calc_comp_daily_output":     {"en": "Daily Output",            "zh": "日产量"},
    "profit_calc_comp_training":         {"en": "Training Required",       "zh": "培训需求"},
    "profit_calc_comp_maintenance":      {"en": "Maintenance",             "zh": "维护保养"},
    "profit_calc_comp_scalability":      {"en": "Scalability",             "zh": "可扩展性"},
    
    # ── Before/after values ──
    "profit_calc_comp_quality_before":       {"en": "Variable, depends on chef skill",     "zh": "依赖厨师水平，不稳定"},
    "profit_calc_comp_quality_after":        {"en": "Standardized, one-touch consistency",  "zh": "标准化，一键出品"},
    "profit_calc_comp_consistency_before":   {"en": "Inconsistent between shifts",          "zh": "不同班次出品不一致"},
    "profit_calc_comp_consistency_after":    {"en": "Programmed parameters, always same",    "zh": "程序化参数，始终如一"},
    "profit_calc_comp_speed_before":         {"en": "8-12 min per dish",                    "zh": "每道菜8-12分钟"},
    "profit_calc_comp_speed_after":          {"en": "3-5 min per dish",                     "zh": "每道菜3-5分钟"},
    "profit_calc_comp_wok_safety_before":    {"en": "Open flame, burn risk",                "zh": "明火操作，烫伤风险"},
    "profit_calc_comp_wok_safety_after":     {"en": "Auto stir, no flame, safety sensors",  "zh": "自动翻炒，无明火，带安全传感器"},
    "profit_calc_comp_space_before":         {"en": "Multiple stations needed",             "zh": "需要多个工作站"},
    "profit_calc_comp_space_after":          {"en": "Single unit, 60% less space",           "zh": "单台设备，节省60%空间"},
    "profit_calc_comp_rice_capacity_before": {"en": "30-50 servings per batch",             "zh": "每批30-50份"},
    "profit_calc_comp_rice_capacity_after":  {"en": "100-200 servings per batch",           "zh": "每批100-200份"},
    "profit_calc_comp_energy_before":        {"en": "High gas/electric consumption",        "zh": "高耗能"},
    "profit_calc_comp_energy_after":         {"en": "Energy-saving inverter technology",     "zh": "节能变频技术"},
    "profit_calc_comp_safety_before":        {"en": "Manual operation risks",               "zh": "人工操作风险"},
    "profit_calc_comp_safety_after":         {"en": "Auto shut-off, overheat protection",    "zh": "自动断电，过热保护"},
    "profit_calc_comp_hygiene_before":       {"en": "Open kitchen, contamination risk",      "zh": "开放厨房，污染风险"},
    "profit_calc_comp_hygiene_after":        {"en": "Sealed cooking, HACCP compliant",       "zh": "密封烹饪，符合HACCP"},
    "profit_calc_comp_water_usage_before":   {"en": "High water consumption",                "zh": "高用水量"},
    "profit_calc_comp_water_usage_after":    {"en": "Optimized water recycling",             "zh": "优化水循环"},
    "profit_calc_comp_labor_intensity_before": {"en": "3-4 staff needed",                    "zh": "需要3-4名员工"},
    "profit_calc_comp_labor_intensity_after":  {"en": "1-2 staff, automated workflows",      "zh": "1-2名员工，自动化流程"},
    "profit_calc_comp_temp_control_before":  {"en": "Manual adjustment, ±10°C",             "zh": "手动调节，±10°C"},
    "profit_calc_comp_temp_control_after":   {"en": "PID precision, ±1°C",                  "zh": "PID精准控温，±1°C"},
    "profit_calc_comp_oil_mgmt_before":      {"en": "Manual oil change, waste",             "zh": "手动换油，浪费大"},
    "profit_calc_comp_oil_mgmt_after":       {"en": "Auto filtration, longer oil life",     "zh": "自动过滤，油品寿命更长"},
    "profit_calc_comp_training_before":      {"en": "2-4 weeks chef training",              "zh": "2-4周厨师培训"},
    "profit_calc_comp_training_after":       {"en": "30 min machine familiarization",        "zh": "30分钟设备熟悉"},
    "profit_calc_comp_maintenance_before":   {"en": "Daily cleaning, frequent repairs",      "zh": "每日清洁，频繁维修"},
    "profit_calc_comp_maintenance_after":    {"en": "Weekly basic cleaning, low maintenance","zh": "每周基础清洁，低维护"},
    "profit_calc_comp_scalability_before":   {"en": "Hard to scale, need more chefs",       "zh": "难以扩展，需要增加厨师"},
    "profit_calc_comp_scalability_after":    {"en": "Easy to scale with equipment",          "zh": "通过设备轻松扩展"},
    
    # ── Comparison headers ──
    "profit_calc_comparison_title":       {"en": "Before vs After — At a Glance",        "zh": "改造前后一目了然"},
    "profit_calc_comparison_before":      {"en": "Before (Traditional)",                 "zh": "改造前（传统）"},
    "profit_calc_comparison_after":       {"en": "After (With YuKoLi)",                  "zh": "改造后（YuKoLi）"},
    
    # ── Recommended equipment ──
    "profit_calc_recommended_equipment":      {"en": "Recommended Equipment Configuration", "zh": "推荐设备配置"},
    "profit_calc_recommended_equipment_type": {"en": "Equipment Type",                     "zh": "设备类型"},
    "profit_calc_recommended_product":        {"en": "Recommended Product",               "zh": "推荐产品"},
    "profit_calc_recommended_price":          {"en": "Price",                              "zh": "价格"},
    "profit_calc_recommended_price_range":    {"en": "Price Range",                        "zh": "价格范围"},
    
    # ── TCO table ──
    "profit_calc_tco_title":              {"en": "5-Year Total Cost of Ownership (TCO)",  "zh": "5年总拥有成本"},
    "profit_calc_tco_traditional":        {"en": "Traditional",                           "zh": "传统方案"},
    "profit_calc_tco_yukoli":             {"en": "YuKoLi Solution",                       "zh": "YuKoLi方案"},
    "profit_calc_tco_year":               {"en": "Year {n}",                              "zh": "第{n}年"},
    "profit_calc_tco_annual_savings":     {"en": "Annual Savings",                        "zh": "年度节省"},
    "profit_calc_tco_cumulative":         {"en": "Cumulative Savings",                    "zh": "累计节省"},
    
    # ── Report section ──
    "profit_calc_report_5year":           {"en": "5-Year ROI Projection",                 "zh": "5年投资回报预测"},
    "profit_calc_report_challenge":       {"en": "Main Challenge",                        "zh": "主要痛点"},
    "profit_calc_report_daily_output":    {"en": "Daily Output",                          "zh": "日均产量"},
    "profit_calc_report_equipment":       {"en": "Equipment Planned",                     "zh": "计划设备"},
    "profit_calc_report_savings":         {"en": "Projected Savings",                     "zh": "预期节省"},
}

# Also check what other keys are referenced in the EQUIP_COMPARISON_MAP
# that might be in en-ui.json already
import re
with open(os.path.join(os.path.dirname(__file__), "..", "src", "assets", "js", "profit-calculator.js")) as f:
    js = f.read()

# Find ALL profit_calc keys referenced
all_keys_in_js = set(re.findall(r'profit_calc_[a-z_]+', js))
with open(os.path.join(LANG_DIR, "en-ui.json")) as f:
    en = json.load(f)

still_missing = sorted(all_keys_in_js - set(en.keys()))
print(f"After adding {len(KEYS)} keys, still missing: {len([k for k in still_missing if k.startswith('profit_calc_')])}")

for k in sorted(still_missing):
    if k.startswith('profit_calc_'):
        print(f"  {k}")

# Add keys to all language files
for lang_file in sorted(os.listdir(LANG_DIR)):
    if not lang_file.endswith('-ui.json'):
        continue
    lang = lang_file.replace('-ui.json', '')
    filepath = os.path.join(LANG_DIR, lang_file)
    
    with open(filepath) as f:
        data = json.load(f)
    
    added = 0
    for key, translations in KEYS.items():
        if key not in data:
            if lang == 'zh-CN':
                data[key] = translations['zh']
            elif lang == 'zh-TW':
                # Use Chinese text for zh-TW too
                data[key] = translations['zh']
            else:
                data[key] = translations['en']
            added += 1
    
    if added > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=False)
            f.write('\n')
        print(f"  {lang}: +{added} keys")
    else:
        print(f"  {lang}: no new keys needed")

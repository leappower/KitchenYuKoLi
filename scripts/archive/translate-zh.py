#!/usr/bin/env python3
"""
translate-zh.py — 为 zh-CN-ui.json 中与 en 值相同的 key 提供中文翻译
产品名/品牌名/数字保持英文，其余文本翻译为中文
"""
import json, re

with open('src/assets/lang/zh-CN-ui.json') as f:
    zh = json.load(f)
with open('src/assets/lang/en-ui.json') as f:
    en = json.load(f)

# 手动翻译映射表（英文原文 → 中文）
# 产品名、品牌名、数字保持英文
TRANSLATIONS = {
    # ─── 产品名（保持英文）───────────────────────────────────────────────────
    "Robo-Chef S2": "Robo-Chef S2",
    "Omni-Oven X1": "Omni-Oven X1",
    "Hydro-Wash Pro": "Hydro-Wash Pro",
    "Sous-Chef Lite": "Sous-Chef Lite",
    "LinkedIn": "LinkedIn",
    "SaaS": "SaaS",
    "WhatsApp": "WhatsApp",
    "LINE": "LINE",
    "Yukoli": "Yukoli",
    "Yukoli OS": "Yukoli OS",
    "IoT": "IoT",
    "AI": "AI",
    "ROI": "ROI",
    "ESG": "ESG",
    "CE": "CE",
    "UL": "UL",
    "NSF": "NSF",
    "ISO": "ISO",
    "B2B": "B2B",

    # ─── 数字/单位（保持原文）────────────────────────────────────────────────
    "-18°C": "-18°C",
    "Pre-heating 180°C": "预热 180°C",
    "280°C": "280°C",
    "8.4k": "8.4k",
    "B2B Technical Excellence • v4.0.2": "B2B 技术卓越 • v4.0.2",
    "$5,000 - $15,000": "$5,000 - $15,000",
    "$15,000 - $50,000": "$15,000 - $50,000",
    "$50,000 - $150,000": "$50,000 - $150,000",
    "$150,000+": "$150,000+",
    "1-10": "1-10",
    "11-50": "11-50",
    "51-200": "51-200",
    "200+": "200+",

    # ─── Home 页面 ────────────────────────────────────────────────────────────
    "Smart Commercial Kitchen 2026": "智能商业厨房 2026",
    "Robotics": "机器人",
    "Start ROI Calculator": "开始 ROI 计算器",
    "calculate": "计算",
    "View Hardware Stack": "查看硬件全系",
    "Flagship Model": "旗舰型号",
    "Yukoli Robo-Chef S2": "Yukoli Robo-Chef S2",
    "Efficiency": "效率",
    "Hardware Matrix": "硬件矩阵",
    "Individually Powerful. Together, Unstoppable.": "单独强大，协同无敌。",
    "View Full Inventory": "查看完整产品目录",
    "High-precision automated cooking with haptic feedback sensors.": "配备触觉反馈传感器的高精度自动烹饪。",
    "Gen 4 AI": "第四代 AI",
    "Institution & Health": "机构与医疗",
    "Institution &amp; Health": "机构与医疗",
    "[REAL-TIME SYSTEM SCHEMATIC DATA FEED]": "【实时系统架构数据流】",
    "robot_2": "机器人",
    "Integrated Solutions": "集成解决方案",
    "Global Reach": "全球覆盖",
    "Trusted by 1,200+ Commercial Kitchens": "受到 1,200+ 家商业厨房信赖",
    "Trusted by 1,200+ commercial kitchens worldwide": "全球 1,200+ 家商业厨房信赖之选",
    "Certifications & Compliance": "认证与合规",
    "CE Certified": "CE 认证",
    "UL Listed": "UL 列名",
    "NSF Approved": "NSF 认证",
    "ISO 9001": "ISO 9001",
    "Compliance Certified": "合规认证",
    "Why Yukoli?": "为什么选择 Yukoli？",
    "Solutions Catalog": "解决方案目录",

    # ─── Catalog 页面 ─────────────────────────────────────────────────────────
    "The 5:3:2 Strategy Preview": "5:3:2 战略预览",
    "Our architectural framework for the next decade of commercial foodservice.": "面向未来十年商业餐饮的架构框架。",
    "Smart Hardware": "智能硬件",
    "System Solutions": "系统解决方案",
    "IoT Intelligence": "IoT 智能",
    "Access the Digital Guide": "获取数字指南",
    "Industry Compliance": "行业合规",
    "Trusted by Global Chains": "受到全球连锁品牌信赖",
    "Get the Technical Catalog": "获取技术目录",
    "Professional Role": "职位",
    "Version": "版本",
    "Robot stir-fryers, combi ovens, and automated cold-chain logistics modules with industrial-grade precision.": "机器人炒锅、万能蒸烤箱和自动冷链物流模块，工业级精度。",
    "Edge-to-cloud connectivity providing real-time monitoring and predictive maintenance alerts.": "边缘到云端连接，提供实时监控和预测性维护告警。",
    "Integrated workflows and architectural layouts optimized for commercial food service scaling.": "针对商业餐饮规模化优化的集成工作流和架构布局。",

    # ─── PDP 页面 ─────────────────────────────────────────────────────────────
    "Industrial Series 2026": "工业系列 2026",
    "Smart Stir-fry Robot Pro": "智能炒菜机器人 Pro",
    "The intersection of aerospace engineering and culinary mastery.": "航空航天工程与烹饪技艺的交汇点。",
    "Technical Specifications": "技术规格",
    "Deep dive into the Pro's engineering capabilities.": "深入了解 Pro 的工程能力。",
    "Aerospace Grade SS": "航空级不锈钢",
    "Power Supply": "电源供应",
    "Join the 1,200+ commercial kitchens already powered by Yukoli.": "加入已由 Yukoli 赋能的 1,200+ 家商业厨房。",
    "Projected for 12-unit chain": "按 12 家门店连锁预测",
    "Global Compliance & Trust": "全球合规与信任",
    "Global Compliance &amp; Trust": "全球合规与信任",
    "View All Certifications": "查看所有认证",
    "Request a Demo": "申请演示",
    "Get a Custom Quote": "获取定制报价",
    "Related Products": "相关产品",
    "View Product": "查看产品",
    "Frequently Asked Questions": "常见问题",
    "Build Material": "构建材料",
    "Wok Diameter": "锅径",
    "Max Temperature": "最高温度",
    "Cycle Time": "循环时间",
    "Daily Capacity": "日产能",
    "Connectivity": "连接方式",
    "Warranty": "保修",
    "Certifications": "认证",
    "Weight": "重量",
    "Dimensions": "尺寸",
    "Power Consumption": "功耗",
    "Noise Level": "噪音水平",
    "Operating Temperature": "工作温度",
    "Humidity Range": "湿度范围",

    # ─── ROI 页面 ─────────────────────────────────────────────────────────────
    "ROI Calculator": "ROI 计算器",
    "Calculate your return on investment": "计算您的投资回报率",
    "Number of Locations": "门店数量",
    "Daily Covers": "日接待量",
    "Current Labor Cost (Monthly)": "当前人工成本（月）",
    "Current Energy Cost (Monthly)": "当前能源成本（月）",
    "Calculate ROI": "计算 ROI",
    "Your Results": "您的结果",
    "Annual Savings": "年度节省",
    "Payback Period": "回收期",
    "5-Year ROI": "5 年 ROI",
    "Monthly Savings": "月度节省",
    "Labor Savings": "人工节省",
    "Energy Savings": "能源节省",
    "Waste Reduction": "废料减少",
    "Get Detailed Report": "获取详细报告",
    "The 'Three Highs, One Low' Reality": "「三高一低」现实",
    "High Labor": "高人工",
    "High Energy": "高能耗",
    "High Rent": "高租金",
    "Low Margin": "低利润",
    "Download the 500+ Outlet Scale-up Blueprint": "下载 500+ 门店规模化蓝图",
    "Work Email": "工作邮箱",
    "500+ Outlets": "500+ 门店",
    "Joined by 2k+ Ops Managers": "2000+ 运营经理加入",
    "↑ Increased": "↑ 提升",
    "↓ Reduced": "↓ 降低",

    # ─── Support 页面 ─────────────────────────────────────────────────────────
    "Technical Support": "技术支持",
    "24/7 Support": "全天候支持",
    "Submit a Ticket": "提交工单",
    "Knowledge Base": "知识库",
    "Live Chat": "在线客服",
    "Phone Support": "电话支持",
    "Email Support": "邮件支持",
    "Response Time": "响应时间",
    "Priority Support": "优先支持",
    "Standard Support": "标准支持",
    "Enterprise Support": "企业支持",
    "Maintenance Schedule": "维护计划",
    "Preventive Maintenance": "预防性维护",
    "Emergency Repair": "紧急维修",
    "Spare Parts": "备用零件",
    "Training & Certification": "培训与认证",
    "On-site Training": "现场培训",
    "Remote Training": "远程培训",
    "Certification Program": "认证计划",
    "Documentation": "文档",
    "Installation Guide": "安装指南",
    "User Manual": "用户手册",
    "API Reference": "API 参考",
    "Release Notes": "发布说明",
    "Contact Support": "联系支持",
    "Open a Ticket": "开启工单",
    "View Documentation": "查看文档",
    "Schedule Maintenance": "安排维护",

    # ─── ESG 页面 ─────────────────────────────────────────────────────────────
    "Sustainability Report": "可持续发展报告",
    "Environmental": "环境",
    "Social": "社会",
    "Governance": "公司治理",
    "Carbon Footprint": "碳足迹",
    "Energy Efficiency": "能源效率",
    "Water Conservation": "节水",
    "Waste Reduction": "废料减少",
    "Renewable Energy": "可再生能源",
    "Carbon Neutral": "碳中和",
    "Net Zero": "净零排放",
    "Scope 1 Emissions": "范围 1 排放",
    "Scope 2 Emissions": "范围 2 排放",
    "Scope 3 Emissions": "范围 3 排放",
    "GHG Emissions": "温室气体排放",
    "Employee Wellbeing": "员工福祉",
    "Diversity & Inclusion": "多元化与包容",
    "Community Impact": "社区影响",
    "Supply Chain Ethics": "供应链道德",
    "Board Composition": "董事会构成",
    "Risk Management": "风险管理",
    "Data Privacy": "数据隐私",
    "Anti-Corruption": "反腐败",
    "Download Report": "下载报告",
    "View Full Report": "查看完整报告",
    "2026 ESG Report": "2026 ESG 报告",
    "Key Metrics": "关键指标",
    "Progress Toward Goals": "目标进展",
    "Stakeholder Engagement": "利益相关方参与",

    # ─── Case Studies 页面 ────────────────────────────────────────────────────
    "Case Studies": "案例研究",
    "Success Stories": "成功案例",
    "Filter by Industry": "按行业筛选",
    "All Industries": "全部行业",
    "Enterprise Chains": "企业连锁",
    "Cloud Kitchens": "云厨房",
    "Health & Institutions": "医疗与机构",
    "Read Case Study": "阅读案例",
    "Download PDF": "下载 PDF",
    "View Full Analysis": "查看完整分析",
    "Cost Savings": "成本节省",
    "Throughput": "产能",
    "Uptime": "运行时间",
    "Complete digital transformation achieving omnichannel customer experience upgrade.": "完整数字化转型，实现全渠道客户体验升级。",
    "Automated central kitchen achieving 340% throughput increase with 60% labor reduction.": "自动化中央厨房实现产能提升 340%，人工减少 60%。",
    "IoT-enabled kitchen management reducing energy consumption by 35% across 200 locations.": "IoT 赋能厨房管理，200 家门店能耗降低 35%。",

    # ─── Quote 页面 ───────────────────────────────────────────────────────────
    "Request a Quote": "申请报价",
    "Project Details": "项目详情",
    "Capacity & Timeline": "产能与时间线",
    "Business Info": "企业信息",
    "Hardware": "硬件",
    "Industrial kitchen machinery & tools (50% of projects)": "工业厨房机械与工具（占项目 50%）",
    "Industrial kitchen machinery &amp; tools (50% of projects)": "工业厨房机械与工具（占项目 50%）",
    "Solutions": "解决方案",
    "End-to-end operational workflow design (30% of projects)": "端到端运营工作流设计（占项目 30%）",
    "IoT Systems": "IoT 系统",
    "Submit Request": "提交申请",
    "Company Size": "公司规模",
    "Phone Number": "电话号码",

    # ─── Landing 页面 ─────────────────────────────────────────────────────────
    "500+ Outlets": "500+ 门店",
    "Joined by 2k+ Ops Managers": "2000+ 运营经理加入",
    "The 'Three Highs, One Low' Reality": "「三高一低」现实",
    "Download the 500+ Outlet Scale-up Blueprint": "下载 500+ 门店规模化蓝图",
    "Work Email": "工作邮箱",

    # ─── Thank You 页面 ───────────────────────────────────────────────────────
    "Your Digital Copy is on its Way": "您的数字版本正在发送",
    "2026 Global Product Catalog": "2026 全球产品目录",
    "System Blueprint Session": "系统蓝图会议",
    "Available Times": "可用时间",
    "09:00 AM": "09:00",
    "10:30 AM": "10:30",
    "01:00 PM": "13:00",
    "03:30 PM": "15:30",
    "Confirm Slot": "确认时间段",
    "Spotlight": "聚焦",
    "October 2025": "2025 年 10 月",
}

# 应用翻译
updated = 0
for key, en_val in en.items():
    if key in zh and zh[key] == en_val:
        # 尝试直接匹配
        clean_val = en_val.strip()
        if clean_val in TRANSLATIONS:
            zh[key] = TRANSLATIONS[clean_val]
            updated += 1
        # 尝试部分匹配（截断的文本）
        else:
            for en_text, zh_text in TRANSLATIONS.items():
                if clean_val.startswith(en_text[:30]) and len(en_text) > 10:
                    zh[key] = zh_text
                    updated += 1
                    break

with open('src/assets/lang/zh-CN-ui.json', 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

# 统计还剩多少未翻译
still_same = sum(1 for k, v in zh.items() if k in en and v == en[k] and not re.match(r'^[\d\$\-\+\°\%\.]+$', v))
print(f'Updated: {updated} keys')
print(f'Still needing translation: {still_same} keys')

#!/usr/bin/env python3
"""
fix-story-i18n.py — Complete fix for case story paragraph i18n across ALL cities.

Problem: Story paragraphs have child elements (<strong>, <span data-i18n>) splitting
text into multiple nodes. setElementTranslation only replaces the FIRST text node.
For English pages, remaining text nodes stay Chinese → mixed language display.

Fix strategy: For EVERY story paragraph with child elements, craft English values
that contain the FULL paragraph text + HTML structure. The translation value
contains HTML tags → triggers innerHTML mode → entire paragraph is replaced.
"""
import re, os, json

PAGES_DIR = 'src/pages/cases'
EN_PATH = 'src/assets/lang/en-ui.json'
ZH_PATH = 'src/assets/lang/zh-CN-ui.json'

with open(EN_PATH) as f: en = json.load(f)
with open(ZH_PATH) as f: zh = json.load(f)

def get_full_paragraph_text(html_content):
    """Get the full text of a paragraph including all text nodes (without HTML tags)."""
    return re.sub(r'<[^>]+>', '', html_content).strip()

# ── Define full English paragraphs for ALL story keys with child elements ──
# Format: key -> full English narrative paragraph
# Where the HTML has <strong>NUMBER</strong>, keep it as {N} for replacement.
# Where the HTML has <span data-i18n="KEY">, embed the span with English fallback.

UPDATES = {
    # ═══════════════════════════════════════════════
    # BANGKOK
    # ═══════════════════════════════════════════════
    "cases_bangkok_story_p1": (
        'In the bustling streets of Bangkok, where the steam from hotpot mingles with the aroma of spices, '
        'a local chain restaurant with 8 branches felt the growing pains of rapid expansion. '
        'Thai hotpot demands perfectly layered broth and balanced dipping sauces — traditionally dependent '
        'on each chef\u2019s personal touch and experience. As daily output climbed to '
        '<strong class="text-primary">1200</strong> meals, management pressure multiplied: Bangkok\u2019s F&B '
        'industry has an extremely high turnover rate, and <span data-i18n="central_kitchen_core">core</span> '
        'recipes fluctuated with every chef departure. New store training cycles were long, and inconsistent '
        'quality directly threatened the brand\u2019s long-term reputation.'
    ),
    "cases_bangkok_story_p2": (
        'In the past, the kitchen was heavily dependent on manpower, requiring 24 employees to run smoothly. '
        'Every new store meant a long learning curve for new hires. The traditional "master-disciple" model was '
        'not only time-consuming but also became a shackle slowing down expansion. Facing increasingly fierce '
        'competition, management knew that relying solely on manual labor was no longer sustainable. '
        'Kitchen automation became the inevitable choice.'
    ),
    "cases_bangkok_story_p3": (
        'The turning point came with the introduction of YuKoLi\u2019s <span data-i18n="central_kitchen_solutions">commercial kitchen solution</span>. '
        'The YuKoLi team went deep into each store\u2019s kitchen, transforming the complex base sauce preparation '
        'and seasoning processes with intelligent automation. The smart cooking system took over the most '
        'labor-dependent cooking tasks, converting intuitive "wok hei" and seasoning ratios into precise '
        'digital parameters. The equipment also included modules tailored to Thai local taste preferences, '
        'locking the brand\u2019s <span data-i18n="central_kitchen_core">core</span> recipes firmly in place. '
        'Kitchen staff transformed from sweating laborers into efficient system operators.'
    ),
    "cases_bangkok_story_p4": (
        'The results were immediate and substantial. After implementation, kitchen staff was reduced from '
        '<strong class="text-primary">24</strong> down to <strong class="text-primary">12</strong>, '
        'cutting labor costs by <strong class="text-primary">50%</strong> and saving the brand '
        '<strong class="text-primary">270,000 THB</strong> monthly in cash flow. In Bangkok\u2019s cutthroat '
        'F&B margins, this automation investment paid for itself in just '
        '<strong class="text-primary">11.3</strong> months. Beyond cost savings, the strategic value lay in '
        'achieving absolute <span data-i18n="cases_roi_standardized">standardization</span> of the brand\u2019s flavor profile.'
    ),
    "cases_bangkok_story_p5": (
        'Thanks to the system\u2019s intelligent guidance, new staff training cycles were slashed by 75%. '
        '\u201cNew stores are fully operational by week 2 \u2014 it used to take at least 2 months,\u201d '
        'the brand founder reflects. The biggest bottleneck to expansion wasn\u2019t front-of-house traffic '
        '\u2014 it was the speed and stability of kitchen output. Today, every pot of broth tastes the same '
        'across all branches, finally breaking the chains that held back scalable growth.'
    ),
    "cases_bangkok_story_p6": (
        'When this Bangkok hotpot chain turned its kitchen into a digital operation, transforming the elusive '
        '"flavor" into a repeatable competitive advantage, they unlocked the key to market leadership. '
        'This story raises a question for every F&B operator still wrestling with high turnover and inconsistent '
        'quality: in a world of uncertainty, isn\u2019t it time your kitchen leveled up?'
    ),

    # ═══════════════════════════════════════════════
    # CEBU
    # ═══════════════════════════════════════════════
    "cases_cebu_story_p1": (
        'On the bustling streets of Cebu City, a beloved local eatery serving hundreds daily was stuck in '
        'a kitchen pressure cooker. The air was thick with familiar aromas of grilled meat and garlic rice, '
        'but behind the scenes, the kitchen was a high-stress battlefield.'
    ),
    "cases_cebu_story_p2": (
        'This small local eatery had a daily output of <strong class="text-primary">280</strong> meals. '
        'To handle the workload, the owner had to hire 3 full-time kitchen staff. With rising employee turnover '
        'and labor costs, three salaries became a heavy burden on thin margins. In the cramped, sweltering kitchen, '
        'chefs worked through intensive repetitive labor during peak hours, leading to fatigue and inconsistent quality.'
    ),
    "cases_cebu_story_p3": (
        'Facing this dilemma, the owner realized the status quo was putting his business at risk. '
        'At an industry exhibition, he first encountered YuKoLi\u2019s <span data-i18n="central_kitchen_solutions">commercial kitchen solution</span>. '
        'For a traditional eatery, investing in high-tech automation seemed like a big expense at first. But when he '
        'compared the one-time equipment cost against ever-rising labor expenses, the business case became crystal clear.'
    ),
    "cases_cebu_story_p4": (
        'The equipment\u2019s arrival became the turning point. It seamlessly integrated into the compact kitchen '
        'layout, taking over the most labor-intensive cooking tasks. What used to require 3 people scrambling '
        'at the stove was now handled by 1 operator. The kitchen team went from '
        '<strong class="text-primary">3</strong> down to <strong class="text-primary">1</strong>, '
        'with <span data-i18n="landing_labor_cost">labor costs</span> dropping by '
        '<strong class="text-primary">67%</strong>.'
    ),
    "cases_cebu_story_p5": (
        'Numbers tell the clearest story. Staff reduction not only solved the hiring headache \u2014 it saved '
        'the owner 32,000 PHP every month. But what\u2019s truly eye-opening is the '
        '<span data-i18n="cases_roi_fast_payback">Fast Payback</span> effect: in just '
        '<strong class="text-primary">4.8</strong> months, the savings fully covered the equipment cost. '
        'YuKoLi\u2019s precision programming eliminated human error, ensuring consistent quality across '
        '<strong class="text-primary">280</strong> daily meals \u2014 even during rush hour.'
    ),
    "cases_cebu_story_p6": (
        '\u201cBest investment I ever made \u2014 the savings already paid for the second unit,\u201d '
        'the owner said with visible relief. To him, this machine was no cold piece of metal \u2014 it became '
        'his most reliable <span data-i18n="central_kitchen_core">core</span> team member.'
    ),
    "cases_cebu_story_p7": (
        'In a market where labor costs keep climbing and every peso of margin counts, a machine that pays for itself '
        'in under half a year and becomes the kitchen\u2019s rock-solid backbone raises a question every small '
        'operator should honestly ask: isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # HANOI
    # ═══════════════════════════════════════════════
    "cases_hanoi_story_p1": (
        'In Hanoi\u2019s Old Quarter, where the air carries notes of star anise and lime, a small eatery faced '
        'the classic dilemma: nearly crushed by its own success. With tourists flooding in, two kitchen staff '
        'ran from morning till night in a cramped, sweltering space. Peak hours meant chaos, and hand-cooking '
        'fatigue led to inconsistent broth. Daily output was stuck at <strong class="text-primary">180</strong> '
        'meals, while soaring <span data-i18n="landing_labor_cost">labor costs</span> and quality issues '
        'became growth bottlenecks.'
    ),
    "cases_hanoi_story_p2": (
        'The turning point came with YuKoLi\u2019s <span data-i18n="central_kitchen_solutions">commercial kitchen solution</span>. '
        'Its compact modular design fit perfectly into the tiny kitchen, with installation and calibration taking '
        'just half a day. The smart cooking station took over the most labor-intensive '
        '<span data-i18n="central_kitchen_core">core</span> tasks: precise temperature control for Pho broth '
        'and <span data-i18n="cases_roi_standardized">standardized</span> preparation of Banh Mi fillings, '
        'all executed with exceptional precision.'
    ),
    "cases_hanoi_story_p3": (
        'The change was immediate. What once required two people\u2019s full attention was now handled by a '
        'single operator. Kitchen staff was cut from 2 to 1, achieving a <strong class="text-primary">50%</strong> '
        'reduction. This saved the shop <strong class="text-primary">8 million VND</strong> '
        '(<strong class="text-primary">VND 8M</strong>) monthly, with equipment ROI in just '
        '<strong class="text-primary">5.1</strong> months. Daily output stabilized at '
        '<strong class="text-primary">180</strong> meals with consistent taste and faster service.'
    ),
    "cases_hanoi_story_p4": (
        'For Mr. Chen, the biggest gain was achieving <span data-i18n="central_kitchen_core">true</span> '
        '<span data-i18n="cases_roi_standardized">standardization</span>. Precise temperature control and automated '
        'portioning ended the feast-or-famine quality swings. Every bowl of Pho and Banh Mi was now as consistent '
        'as a photocopy. \u201cPho and Banh Mi both work perfectly. Even foreign tourists praise the taste,\u201d '
        'he said, finally understanding: machines guard quality so he can preserve culinary soul.'
    ),
    "cases_hanoi_story_p5": (
        'With labor costs rising and customer expectations climbing, this humble street stall proved that '
        'smart transformation works at any scale. When you\u2019re still worrying about staffing gaps and '
        'quality control, maybe it\u2019s time to ask: isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # HCMC
    # ═══════════════════════════════════════════════
    "cases_hcmc_story_p1": (
        'In the bustling streets of Ho Chi Minh City, where food delivery motorbikes swarm, cloud kitchens '
        'have become the hot startup trend. But one operator faced an extreme squeeze: in just 15 square meters, '
        'they crammed 3 employees and traditional cooking equipment. Heat, smoke and crowding pushed '
        '<span data-i18n="landing_efficiency">efficiency</span> to its breaking point. The tiny space severely '
        'limited menu expansion in the fiercely competitive food delivery market.'
    ),
    "cases_hcmc_story_p2": (
        'The traditional model of adding more people and equipment simply failed in 15m\u00b2. To break the '
        'space-efficiency paradox, the operator turned to YuKoLi\u2019s '
        '<span data-i18n="central_kitchen_solutions">smart kitchen solution</span>. Its highly integrated '
        'automation replaced bulky traditional woks and steamers, transforming the micro-kitchen\u2019s prospects.'
    ),
    "cases_hcmc_story_p3": (
        'After installation, YuKoLi\u2019s system showed remarkable adaptability. From high-flame Vietnamese '
        'rice noodles to slow-simmered curries, the system precisely controlled temperature and timing to '
        'deliver authentic local flavors. What used to require 3 chefs scrambling was now handled by one. '
        'Every step was <span data-i18n="cases_roi_standardized">standardized</span>, with '
        '<span data-i18n="central_kitchen_core">core</span> benefits emerging: '
        '<span data-i18n="cases_roi_save_space">space savings</span> that let 15m\u00b2 perform like a full-scale kitchen.'
    ),
    "cases_hcmc_story_p4": (
        'The numbers told the story. The kitchen\u2019s daily output stabilized at '
        '<strong class="text-primary">150</strong> meals/day with dramatically improved consistency. '
        'Kitchen staff went from 3 to 1, with <span data-i18n="landing_labor_cost">labor costs</span> '
        'dropping by <strong class="text-primary">67%</strong>. This saved the operator '
        '<strong class="text-primary">14 million VND</strong> monthly. With the savings from '
        '<span data-i18n="landing_labor_cost">labor costs</span> and increased revenue, the equipment '
        'paid for itself in just <strong class="text-primary">5.5</strong> months.'
    ),
    "cases_hcmc_story_p5": (
        '\u201cSmall space, but I can cook so many dishes \u2014 customers think it\u2019s a professional kitchen.\u201d '
        'The operator\u2019s surprise says it all. YuKoLi smashed the limits of physical space, letting a tiny '
        'cloud kitchen punch like a full-scale operation. When space is no longer the ceiling and labor is no '
        'longer the anchor, maybe it\u2019s time to ask: isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # JAKARTA
    # ═══════════════════════════════════════════════
    "cases_jakarta_story_p1": (
        'In Jakarta\u2019s rapidly growing food scene, a central kitchen serving multiple locations faced '
        'a crisis hidden behind success. Daily demand was climbing, but so was kitchen chaos. High turnover, '
        'inconsistent quality, and ballooning labor costs were silently undermining the entire operation.'
    ),
    "cases_jakarta_story_p2": (
        'Before the transformation, this central kitchen was producing <strong class="text-primary">600</strong> '
        'meals daily. To barely maintain output and quality, the kitchen was packed with 12 kitchen staff. '
        'With Jakarta\u2019s high labor costs and operational expenses, the payroll became a crushing burden. '
        'Even worse, the same dish tasted different depending on which chef cooked it \u2014 spice levels, '
        'saltiness, and doneness all varied by shift.'
    ),
    "cases_jakarta_story_p3": (
        'The turning point came with YuKoLi\u2019s <span data-i18n="central_kitchen_solutions">commercial kitchen solution</span>. '
        'The team customized <span data-i18n="cases_roi_standardized">standardized</span> cooking workflows '
        'for Southeast Asian cuisine \u2014 heavy on sauces and stir-frying. The smart equipment converted '
        'the wok master\u2019s intuitive heat control and seasoning ratios into precise digital programs. '
        'Laborious manual work was replaced by machines, freeing the '
        '<span data-i18n="central_kitchen_core">core</span> chefs to become "flavor architects" focused on '
        'quality monitoring and new recipe development.'
    ),
    "cases_jakarta_story_p4": (
        'The results were immediate. While maintaining <strong class="text-primary">600</strong> meals daily, '
        'kitchen staff dropped from 12 to 5 \u2014 a <strong class="text-primary">58%</strong> reduction. '
        'This saved the brand <strong class="text-primary">22 million IDR</strong> '
        '(<strong class="text-primary">IDR 22M</strong>) monthly. Thanks to the efficiency gains, '
        'the entire equipment investment paid for itself in just <strong class="text-primary">8.0</strong> months.'
    ),
    "cases_jakarta_story_p5": (
        'What excited the team even more than the financial numbers was finally cracking the '
        '<span data-i18n="cases_roi_standardized">standardization</span> '
        '<span data-i18n="central_kitchen_core">core</span> challenge. Whether rendang beef or satay, '
        'all 6 locations now delivered identical flavors. "Every store used to taste different and customers '
        'complained. Now all 6 taste identical \u2014 repeat customers have clearly increased." '
        'Stable quality rebuilt customer trust and earned back '
        '<span data-i18n="central_kitchen_recommended">platform algorithm ranking</span> and brand loyalty.'
    ),
    "cases_jakarta_story_p6": (
        'When quality stops being a game of luck and labor stops being a drag on growth, the business horizon '
        'naturally expands. This Jakarta central kitchen broke through with automation \u2014 and every operator '
        'caught between quality control and rising costs should pause and ask: '
        'isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # KUALA LUMPUR
    # ═══════════════════════════════════════════════
    "cases_kl_story_p1": (
        'At a large manufacturing plant in Kuala Lumpur, the cafeteria served <strong class="text-primary">2,000</strong> '
        'hot meals daily to the factory workers. The menu featured rich local flavors \u2014 fragrant curries, '
        'spicy sambal, and coconut-rich nasi lemak. But behind these beloved dishes lay a headache for management.'
    ),
    "cases_kl_story_p2": (
        'To sustain daily production of 2,000 meals, the kitchen relied on 15 kitchen staff working in punishing '
        'heat. With Malaysia\u2019s minimum wage steadily rising and manufacturing plants sprouting up around KL, '
        'poaching of experienced kitchen staff was common. Each departure meant a scramble. The 15 payrolls '
        'became a heavy operational burden.'
    ),
    "cases_kl_story_p3": (
        'Facing mounting pressure, management decided to break the deadlock by introducing YuKoLi\u2019s '
        '<span data-i18n="central_kitchen_solutions">commercial kitchen solution</span>. Initially skeptical '
        'about whether machines could handle complex local cooking, the YuKoLi team presented a detailed ROI '
        'analysis that made the business case clear.'
    ),
    "cases_kl_story_p4": (
        'The results were immediate. YuKoLi\u2019s smart cooking system took over the high-intensity wok work, '
        'turning <span data-i18n="cases_roi_standardized">standardized</span> recipes into precise heat and timing '
        'control. Daily output of <strong class="text-primary">2,000</strong> meals was delivered with perfect '
        'consistency. Kitchen staff dropped from 15 to 6 \u2014 a <strong class="text-primary">60%</strong> '
        'reduction. This translated to <span data-i18n="cases_monthly_saving">monthly savings</span> of '
        '<strong class="text-primary">13,500 MYR</strong>. The equipment achieved '
        '<span data-i18n="cases_roi_fast_payback">Fast Payback</span> in just '
        '<strong class="text-primary">6.2</strong> months.'
    ),
    "cases_kl_story_p5": (
        'The financial returns were impressive, but frontline feedback surprised management even more. '
        'Automation transformed the most hated part of kitchen work \u2014 end-of-shift cleanup. '
        'As the canteen manager put it: "The workers\u2019 favorite thing is how easy it is to clean. '
        'Ten minutes and we\u2019re done." Gone were the hours of scrubbing. Employee satisfaction? Way up.'
    ),
    "cases_kl_story_p6": (
        'From being stuck in a hiring-and-cost spiral to achieving fast ROI and smooth operations, '
        'this Kuala Lumpur factory canteen proved that kitchen automation is no longer a nice-to-have \u2014 '
        'it\u2019s the route to competitive survival. When you\u2019re staring at climbing labor costs and '
        'unpredictable output, maybe it\u2019s time to ask: isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # MANILA
    # ═══════════════════════════════════════════════
    "cases_manila_story_p1": (
        'In the Philippines, where food delivery apps fuel a booming fast-food scene, one small Manila '
        'eatery was trapped in a vicious cycle. The owner struggled daily to balance rising costs, '
        'inconsistent quality, and kitchen chaos.'
    ),
    "cases_manila_story_p2": (
        'To barely handle <strong class="text-primary">320</strong> daily meals, the cramped kitchen had to '
        'keep 3 chefs. They worked in shifts, sweating over the stove. Labor costs were high, and whenever '
        'someone called in sick or quit, service speed dropped and quality suffered. The owner was stuck '
        'in a cycle of hiring, training, losing staff, and hiring again.'
    ),
    "cases_manila_story_p3": (
        'The turning point came with YuKoLi\u2019s commercial cooking automation. At first, the owner doubted '
        'whether a machine could replicate the complex heat control of local Filipino dishes. But the YuKoLi team '
        'customized the setup for the Philippines\u2019 fast-paced kitchen environment and cramped space. '
        'The smart cooking station precisely controlled ingredient timing and temperature curves. What used to '
        'take three chefs working in shifts was now handled by one machine.'
    ),
    "cases_manila_story_p4": (
        'Kitchen operations were completely transformed. Staff was cut from 3 to 1, with '
        '<span data-i18n="landing_labor_cost">labor costs</span> dropping by '
        '<strong class="text-primary">67%</strong>. The remaining staff member shifted from heavy laborer '
        'to a relaxed production manager. The financial impact was immediate: in just '
        '<strong class="text-primary">5.2</strong> months, the equipment paid for itself \u2014 '
        '<span data-i18n="product_filter_all">all</span> through saved labor. '
        'A true <span data-i18n="cases_roi_fast_payback">Fast Payback</span>.'
    ),
    "cases_manila_story_p5": (
        'After installation, the fast-food joint\u2019s daily output held steady at '
        '<strong class="text-primary">320</strong> meals, but service was noticeably faster than the '
        'all-manual era \u2014 peak-hour wait times dropped significantly. '
        '\u201cFor 3 years I worried about finding a stable wok chef. Now one person handles everything, '
        'and service is faster,\u201d the owner said with relief. He finally freed himself from kitchen '
        'stress to focus on customer service and expansion.'
    ),
    "cases_manila_story_p6": (
        'When labor shortages and quality swings become the new normal in F&B, breaking free often means '
        'thinking differently. When technology can balance efficiency and flavor, the growth bottleneck may '
        'just be one decision away. Staring at rising payrolls and inconsistent plates, every operator should '
        'pause and ask: isn\u2019t it time my kitchen got an upgrade?'
    ),

    # ═══════════════════════════════════════════════
    # SURABAYA
    # ═══════════════════════════════════════════════
    "cases_surabaya_story_p1": (
        'In Surabaya, Indonesia, where fire and spices weave rich local flavors, a central kitchen serving '
        'traditional Indonesian dishes ran at full capacity daily, producing <strong class="text-primary">800</strong> '
        'meals. But in the traditional model, 18 employees worked in punishing heat. Manual cutting and '
        'experience-based cooking led to wildly inconsistent output. Waste rates from imprecise manual work '
        'were alarmingly high.'
    ),
    "cases_surabaya_story_p2": (
        'The operator knew that simply adding more people could no longer support business '
        '<span data-i18n="cases_roi_standardized">standardized</span> expansion. The breakthrough came from '
        'working with the YuKoLi team, who mapped the kitchen workflow and combined automated woks with precise '
        'seasoning systems perfectly suited to Indonesian cooking. After a short, efficient deployment, '
        'the kitchen was transformed.'
    ),
    "cases_surabaya_story_p3": (
        'The results were immediate. YuKoLi\u2019s precise systems took over temperature control, with '
        '<span data-i18n="cases_roi_standardized">standardized</span> workflows replacing heavy manual prep. '
        'The 8% waste rate dropped to 1.2%. Kitchen staff was cut by <strong class="text-primary">56%</strong>, '
        'saving the kitchen <strong class="text-primary">24 million IDR</strong> '
        '(<strong class="text-primary">IDR 24M</strong>) monthly. "Food waste has dropped dramatically. '
        'The monthly ingredient savings alone are substantial," the kitchen manager said.'
    ),
    "cases_surabaya_story_p4": (
        'This was more than a numbers game \u2014 it was competitive rebirth. '
        '<span data-i18n="central_kitchen_core">Core</span> recipes and heat settings were now safely locked '
        'in the system, delivering quality as reliable as clockwork. Customer complaints virtually disappeared. '
        'The automation investment paid for itself in just <strong class="text-primary">8.5</strong> months, '
        '<span data-i18n="product_filter_all">fully</span> recovered. Management finally shifted focus from '
        'daily firefighting to new menu R&D and business expansion.'
    ),
    "cases_surabaya_story_p5": (
        'In an era where every hour of wasted labor drags your business down and every gram of wasted ingredients '
        'eats into your margins, Surabaya\u2019s operators have already made the leap \u2014 cutting costs, '
        'boosting efficiency, and reshaping their bottom line. Maybe it\u2019s time to ask: '
        'isn\u2019t it time my kitchen got an upgrade?'
    ),
}

# ═══ Apply updates ═══
for key, value in UPDATES.items():
    en[key] = value

with open(EN_PATH, 'w') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f"✅ Updated {len(UPDATES)} story keys with full English narrative")
print()

# ═══ Verify ═══
cities = set(k.split('_')[1] for k in UPDATES)
for city in sorted(cities):
    city_keys = [k for k in en if k.startswith(f'cases_{city}_story_p')]
    for k in sorted(city_keys):
        v = en[k]
        has_html = bool(re.search(r'<\w+', v))
        status = "✅" if len(v) > 120 else "⚠️"
        html_flag = "+HTML" if has_html else " text"
        print(f"  {status} {k}: {len(v):4d} chars {html_flag}")

print(f"\nTotal story keys in en-ui.json: {sum(1 for k in en if k.startswith('cases_') and '_story_p' in k)}")

#!/usr/bin/env python3
"""
Batch generate ALL images for 6 application pages using Gemini.
Usage: python3 generate-all-images.py
"""
import requests
import json
import os
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "https://api.kuai.host/v1/chat/completions"
API_KEY = "sk-m4PmfUnPQ7Atlh9bPL8cqXWJ0aN6e0SYhFgZS6Gyha8L1lO6"
IMG_DIR = "src/assets/images/applications"

# ──────────────────────────────────────────────
# IMAGE TASKS: (output_path, prompt, model)
# ──────────────────────────────────────────────
FLASH = "gemini-2.5-flash-image"
PRO = "gemini-3-pro-image-preview"

tasks = []

# ════════════════════════════════════════════════
# CENTRAL KITCHEN (6 pain + 4 scenario + 1 hero = 11)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/central-kitchen/hero.jpg",
     "Professional commercial photography of a modern central kitchen / commissary kitchen. Large-scale intelligent cooking equipment including automated wok machines, commercial steamers, and induction cookers in a clean bright industrial kitchen. Stainless steel countertops, organized workspace, smart digital control panels visible. Wide angle shot showing the scale of operations. High-end commercial kitchen equipment brand showcase. No text, no logos, no people faces.",
     PRO),

    (f"{IMG_DIR}/central-kitchen/pain1.jpg",
     "Cafeteria lunch rush scene: long queue of students and workers waiting in a crowded dining hall, food counter showing only a few dishes remaining. The lunch window is almost empty, people looking impatient. Warm indoor lighting, realistic commercial photography style. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/pain2.jpg",
     "Cafeteria food counter with very limited menu options: only 4-5 metal trays of basic dishes, bland looking food. Diners looking disappointed at the sparse selection. Institutional cafeteria setting. Realistic photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/pain3.jpg",
     "Food safety inspection scene in a commercial kitchen: health inspector with clipboard checking temperature of food, concerned kitchen staff in background. Stainless steel kitchen environment. Serious atmosphere. Professional documentary photography style. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/pain4.jpg",
     "Overcrowded traditional commercial kitchen: too many cooks working in tight space, chaotic scene with multiple gas stoves burning. Traditional wok cooking with open flames, steam, and busy movement. Shows the labor-intensive nature. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/pain5.jpg",
     "Traditional commercial kitchen with excessive gas flames burning on multiple stoves, high energy consumption visible. Gas meters, utility bills concept. Old inefficient cooking equipment consuming too much energy. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/pain6.jpg",
     "Commercial kitchen food waste scene: large bins of leftover food being thrown away, overcooked food on plates, wasted ingredients. Shows the problem of food waste in institutional food service. Professional documentary photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/scene-school.jpg",
     "Modern school cafeteria kitchen equipped with intelligent commercial cooking equipment: automated stir-fry machines, large commercial steamers, digital control panels. Clean bright stainless steel kitchen with organized workflow. Professional commercial photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/scene-enterprise.jpg",
     "Modern corporate cafeteria with smart cooking equipment: industrial induction cookers, automated wok stations, smart food warming display counters. Bright modern workplace cafeteria setting. Professional commercial photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/scene-hospital.jpg",
     "Modern hospital institutional kitchen with intelligent cooking equipment: automated batch cooking machines, commercial steamers, food temperature monitoring systems. Clean hygienic stainless steel environment. Professional commercial photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/central-kitchen/scene-community.jpg",
     "Community meal preparation center with smart cooking equipment: automated cooking machines preparing packaged meals in boxes, assembly line style. Clean modern kitchen with meal packaging station. Professional commercial photography. No text, no logos.",
     FLASH),
]

# ════════════════════════════════════════════════
# CHAIN RESTAURANT (4 pain + 3 hotpot + 1 hero = 8)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/chain-restaurant/hero.jpg",
     "Professional commercial photography of a modern chain restaurant smart kitchen. Multiple intelligent cooking machines including automated wok machines arranged in a clean efficient line. Digital displays showing standardized recipes. Bright professional kitchen environment. High-end commercial kitchen equipment brand showcase. No text, no logos.",
     PRO),

    (f"{IMG_DIR}/chain-restaurant/pain1.jpg",
     "Side-by-side comparison scene: two plates of the same dish from different restaurant locations, one looks perfect and the other looks inconsistent and poorly made. Shows the problem of inconsistent food quality across chain restaurant locations. Professional food photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/pain2.jpg",
     "New restaurant under construction with training in progress: inexperienced kitchen staff looking confused, recipe binders on the counter, partly set up kitchen. Shows the challenge of scaling chain restaurants. Professional documentary photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/pain3.jpg",
     "Help wanted sign in front of a restaurant, expensive chef recruitment scene. Restaurant manager looking stressed reviewing resumes. Shows the challenge of hiring and keeping skilled chefs. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/pain4.jpg",
     "Health and fire safety inspection in a busy restaurant kitchen. Fire extinguisher, safety compliance checklist, health inspector examining equipment. Shows regulatory pressure on restaurants. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/hotpot1.jpg",
     "Automated hotpot base sauce cooking with intelligent commercial cooking machine. Large automated wok machine precisely stir-frying aromatic hotpot base ingredients: chili, Sichuan peppercorns, spices. Professional kitchen setting, steam rising. Commercial photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/hotpot2.jpg",
     "Modern commercial hotpot restaurant with smart equipment: multiple split hotpot pots with electromagnetic heating, precise temperature digital displays, clean modern restaurant setting with elegant table setup. Commercial photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/chain-restaurant/hotpot3.jpg",
     "Smart temperature control system for commercial hotpot: digital temperature monitoring panel, automated soup replenishment system, precise thermostat controls on commercial kitchen equipment. Clean modern kitchen setting. Commercial photography. No text, no logos.",
     FLASH),
]

# ════════════════════════════════════════════════
# CANTEEN (3 pain + 1 hero = 4)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/canteen/hero.jpg",
     "Professional commercial photography of a modern smart institutional cafeteria kitchen. Intelligent cooking equipment including automated wok machines, large commercial rice steamers, and induction cooking ranges. Clean bright stainless steel kitchen with organized workflow, smart digital control panels. High-end commercial kitchen equipment brand showcase. No text, no logos.",
     PRO),

    (f"{IMG_DIR}/canteen/pain1.jpg",
     "Busy school cafeteria kitchen during lunch rush: clock showing 12:00, kitchen staff frantically plating food, stacks of meal trays, overwhelmed expressions. Shows the time pressure of concentrated meal service. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/canteen/pain2.jpg",
     "Institutional cafeteria food counter with repetitive boring dishes day after day: same looking stir-fried vegetables, plain rice, limited variety. Diners looking unenthusiastic. Shows the problem of monotonous menu in institutional catering. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/canteen/pain3.jpg",
     "Food safety concern in school cafeteria: close-up of food temperature being checked, concerned cafeteria manager, food safety compliance documents on clipboard. Serious institutional setting. Professional documentary photography. No text, no logos.",
     FLASH),
]

# ════════════════════════════════════════════════
# CLOUD KITCHEN (3 pain + 1 hero = 4)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/cloud-kitchen/hero.jpg",
     "Professional commercial photography of a modern cloud kitchen / ghost kitchen with compact intelligent cooking equipment. Multiple automated cooking machines in a space-efficient layout, delivery bags ready, digital order display screens. Clean modern kitchen optimized for delivery-only operations. High-end commercial kitchen equipment brand showcase. No text, no logos.",
     PRO),

    (f"{IMG_DIR}/cloud-kitchen/pain1.jpg",
     "Cramped ghost kitchen with inefficient layout: traditional bulky gas stoves taking up most of the space, very little room for food preparation, cluttered and disorganized. Shows poor space utilization in cloud kitchen. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/cloud-kitchen/pain2.jpg",
     "Cloud kitchen during peak delivery hour: multiple food delivery order tickets printing, kitchen staff overwhelmed, tablets showing dozens of pending orders with countdown timers. Shows the pressure of delivery speed. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/cloud-kitchen/pain3.jpg",
     "Multi-brand cloud kitchen operation chaos: different brand labels, food containers from different cuisines getting mixed up, staff confused between orders. Shows the challenge of managing multiple food brands in one kitchen. Professional photography. No text, no logos.",
     FLASH),
]

# ════════════════════════════════════════════════
# FOOD FACTORY (4 pain + 1 hero = 5)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/food-factory/hero.jpg",
     "Professional commercial photography of a modern food factory production line with intelligent cooking equipment. Large automated wok machines and industrial steamers in a row, workers monitoring digital control panels, stainless steel production environment. Clean organized food manufacturing facility. High-end commercial kitchen equipment brand showcase. No text, no logos.",
     PRO),

    (f"{IMG_DIR}/food-factory/pain1.jpg",
     "Food factory production line with manual stir-frying: workers hand-stirring large woks, inconsistent product quality visible in finished batches. Some batches look good, others look overcooked or under-seasoned. Shows quality inconsistency problem. Professional documentary photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/food-factory/pain2.jpg",
     "Food factory labor shortage: empty workstations in a production line, help wanted posters on factory wall, aging workforce. Shows the difficulty of recruiting factory workers. Professional documentary photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/food-factory/pain3.jpg",
     "Food factory quality control failure: inspector rejecting a batch of products, red failed stickers on crates, workers looking dejected. Shows the consequence of quality inspection failure in food manufacturing. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/food-factory/pain4.jpg",
     "Food factory expansion challenge: blueprint of new production line, construction site of new factory wing, existing production line running with reduced staff. Shows the difficulty of replicating production lines. Professional photography. No text, no logos.",
     FLASH),
]

# ════════════════════════════════════════════════
# MENU LAB (4 pain + 1 hero = 5)
# ════════════════════════════════════════════════
tasks += [
    (f"{IMG_DIR}/menu-lab/hero.jpg",
     "Professional commercial photography of a modern recipe development laboratory kitchen. Intelligent cooking equipment including automated wok machines with programmable recipe cards, precision temperature controls, digital tablet showing recipe parameters. Chef in white coat working with smart equipment. Bright professional test kitchen. High-end commercial kitchen equipment brand showcase. No text, no logos.",
     PRO),

    (f"{IMG_DIR}/menu-lab/pain1.jpg",
     "Split scene showing same dish (Thai Tom Yum soup) looking different in two locations: one looks authentic and delicious, the other looks off and inconsistent. Shows the challenge of maintaining recipe consistency across international locations. Professional food photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/menu-lab/pain2.jpg",
     "Recipe development bottleneck: chef testing dishes, notebooks full of adjustments, seasonal ingredients on counter, calendar showing weeks passing. Shows the slow process of developing new menu items. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/menu-lab/pain3.jpg",
     "Expensive chef recruitment for restaurant: two specialized chefs (Thai and Malaysian cuisine) in a professional kitchen, cost concept with calculator or salary figures. Shows the high cost of hiring specialized cuisine chefs. Professional photography. No text, no logos.",
     FLASH),

    (f"{IMG_DIR}/menu-lab/pain4.jpg",
     "Restaurant kitchen shift change: day shift and night shift food comparison side by side, showing visible quality difference between batches. Same dish looking different depending on which cook made it. Professional food photography. No text, no logos.",
     FLASH),
]


def generate_image(output_path, prompt, model, attempt=1):
    """Generate a single image and save to file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8192
    }

    try:
        resp = requests.post(API_URL, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }, json=payload, timeout=120)

        if resp.status_code != 200:
            print(f"  ❌ HTTP {resp.status_code}: {output_path}")
            if attempt < 3:
                time.sleep(5)
                return generate_image(output_path, prompt, model, attempt + 1)
            return False

        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # Try to extract base64 image from markdown format
        if "![" in content and "base64," in content:
            b64_start = content.index("base64,") + 7
            b64_end = content.index(")", b64_start)
            img_data = content[b64_start:b64_end]
        elif content.startswith("/9j/") or content.startswith("iVBOR"):
            img_data = content
        else:
            # Try JSON parse
            try:
                parsed = json.loads(content)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and "inline_data" in item:
                            img_data = item["inline_data"]["data"]
                            break
                        elif isinstance(item, dict) and "url" in item:
                            # Download from URL
                            img_resp = requests.get(item["url"], timeout=60)
                            if img_resp.status_code == 200:
                                with open(output_path, "wb") as f:
                                    f.write(img_resp.content)
                                return True
                    else:
                        print(f"  ❌ No image data found in JSON: {output_path}")
                        return False
                else:
                    print(f"  ❌ Unexpected JSON format: {output_path}")
                    return False
            except json.JSONDecodeError:
                print(f"  ❌ Cannot parse response for: {output_path}")
                print(f"     Content start: {content[:200]}")
                return False

        import base64
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(img_data))

        size = os.path.getsize(output_path)
        print(f"  ✅ OK: {output_path} ({size:,} bytes)")
        return True

    except Exception as e:
        print(f"  ❌ Error: {output_path} - {e}")
        if attempt < 3:
            time.sleep(5)
            return generate_image(output_path, prompt, model, attempt + 1)
        return False


def main():
    print(f"Total images to generate: {len(tasks)}")
    print(f"  Hero (Pro): {sum(1 for _, _, m in tasks if m == PRO)}")
    print(f"  Others (Flash): {sum(1 for _, _, m in tasks if m == FLASH)}")
    print()

    success = 0
    failed = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        for i, (path, prompt, model) in enumerate(tasks):
            name = os.path.basename(path)
            print(f"[{i+1}/{len(tasks)}] Generating {name}...")
            futures[executor.submit(generate_image, path, prompt, model)] = path

        for future in as_completed(futures):
            path = futures[future]
            if future.result():
                success += 1
            else:
                failed.append(path)

    print(f"\n{'='*60}")
    print(f"Done! {success}/{len(tasks)} succeeded")
    if failed:
        print(f"Failed ({len(failed)}):")
        for f in failed:
            print(f"  - {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()

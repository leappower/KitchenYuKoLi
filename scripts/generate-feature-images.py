#!/usr/bin/env python3
"""Generate feature images using GPT-Image-2 API with parallel execution."""

import subprocess
import json
import re
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "https://api.kuai.host/v1/chat/completions"
API_KEY = "sk-gX7yxSZvTRZekkduJtVPoRtwPlk1J4BMND02SUERJUXW19Uh"
BASE = "/Users/chee/Projects/KitchenYuKoLi/src/assets/images/applications"
HOME_IMG = "/Users/chee/Projects/KitchenYuKoLi/src/assets/images/home"

IMAGES = [
    # Central Kitchen (4)
    (f"{BASE}/central-kitchen/feature1.webp",
     "High-end commercial food photography, landscape orientation. A sleek digital tablet mounted on a metallic stand displays a vivid step-by-step digital recipe interface. It sits beside a massive, brushed stainless steel commercial induction wok in a state-of-the-art central kitchen. Warm, inviting ambient lighting casts soft golden reflections on the steel surfaces."),
    (f"{BASE}/central-kitchen/feature2.webp",
     "Cinematic commercial kitchen photography, landscape orientation. A row of heavy-duty automated tilting woks cooking large batches of food simultaneously. Volumetric warm backlighting illuminates the rich, rising steam against a pristine stainless steel central kitchen background."),
    (f"{BASE}/central-kitchen/feature3.webp",
     "Macro commercial product photography, landscape orientation. Extreme close-up of a sleek, glowing digital temperature control panel on a futuristic commercial induction cooker. The high-resolution screen displays precise temperature readings and smart cooking graphs."),
    (f"{BASE}/central-kitchen/feature4.webp",
     "Wide-angle commercial photography, landscape orientation. A highly organized lineup of commercial smart cooking machines arranged from small to massive scale in a clean professional production kitchen. Warm, even lighting."),
    
    # Chain Restaurant (4)
    (f"{BASE}/chain-restaurant/feature1.webp",
     "Commercial photography, two perfectly identical plated dishes resting side by side on a polished stainless steel counter, freshly cooked by a high-tech smart wok machine in the background, warm glowing lighting, landscape orientation"),
    (f"{BASE}/chain-restaurant/feature2.webp",
     "Commercial photography, a sleek tablet displaying a digital cloud-based recipe management system syncing with multiple restaurant locations, on a stainless steel prep table, smart cooking equipment in blurred background, warm ambient lighting, landscape orientation"),
    (f"{BASE}/chain-restaurant/feature3.webp",
     "Commercial photography, a highly efficient commercial kitchen featuring a single chef effortlessly monitoring a long row of automated smart cooking machines running simultaneously, digital screens glowing softly, warm overhead lighting, landscape orientation"),
    (f"{BASE}/chain-restaurant/feature4.webp",
     "Commercial photography, wide angle view of multiple identical compact smart cooking stations lined up perfectly in a row, fully equipped and ready for operation, warm inviting lighting, professional commercial kitchen, landscape orientation"),
    
    # Canteen (4)
    (f"{BASE}/canteen/feature1.webp",
     "Commercial photography, smart cooking equipment including modern induction woks and rice steamers alongside insulated food service counters, bright institutional canteen setting, warm lighting, highly detailed, photorealistic, landscape orientation"),
    (f"{BASE}/canteen/feature2.webp",
     "Commercial photography, an automated wok system with precise preset timing producing consistent meal portions, sleek digital display showing real-time cooking progress, warm ambient lighting, landscape orientation"),
    (f"{BASE}/canteen/feature3.webp",
     "Commercial photography, nutrition management prep station, fresh balanced meal components being prepared with colorful vegetables, healthy proteins, and whole grains neatly organized in commercial metal trays, warm inviting lighting, landscape orientation"),
    (f"{BASE}/canteen/feature4.webp",
     "Commercial photography, efficient ingredient portioning station with precise digital measuring tools, pristine clean culinary environment with minimal waste visible, warm lighting, professional food service setup, landscape orientation"),
    
    # Food Factory (4)
    (f"{BASE}/food-factory/feature1.webp",
     "Commercial photography, massive food factory interior, long automated production line with industrial smart cooking equipment producing prepared meals at scale, stainless steel machinery, futuristic digital control panels, warm ambient lighting, landscape orientation"),
    (f"{BASE}/food-factory/feature2.webp",
     "Commercial photography, large stainless steel cooking vats equipped with multiple high-tech digital temperature sensors and glowing monitoring screens, slight culinary steam, warm amber lighting, cinematic, landscape orientation"),
    (f"{BASE}/food-factory/feature3.webp",
     "Commercial photography, high-tech automated QR code scanning system mounted over a stainless steel conveyor belt carrying packaged meals, worker in clean hygiene gear scanning a barcode, warm overhead lighting, landscape orientation"),
    (f"{BASE}/food-factory/feature4.webp",
     "Commercial photography, multiple identical automated smart cooking production lines running in parallel into the distance, vanishing point perspective, symmetrical composition, warm glowing industrial lights, landscape orientation"),
    
    # Menu Lab (4)
    (f"{BASE}/menu-lab/feature1.webp",
     "Commercial photography, a sleek large touchscreen interface mounted on a smart cooking machine in a modern commercial test kitchen. The screen displays a vibrant multi-cuisine recipe library featuring diverse Asian dishes. Warm ambient lighting, stainless steel background, landscape orientation"),
    (f"{BASE}/menu-lab/feature2.webp",
     "Commercial photography, a professional chef and a culinary engineer collaborating in a test kitchen, next to a high-tech smart wok, pointing at a laptop screen and the machine digital interface to develop a new recipe. Warm kitchen lighting, landscape orientation"),
    (f"{BASE}/menu-lab/feature3.webp",
     "Commercial photography, close up of a smart cooking machine digital display showing split-screen interface with intelligent temperature adaptation curves and dynamic graphs for different global cuisines. Warm glowing kitchen lights, landscape orientation"),
    (f"{BASE}/menu-lab/feature4.webp",
     "Commercial photography, a single versatile smart cooking machine on a stainless steel counter, surrounded by various beautifully plated dishes: vibrant stir-fry, rich stew, and delicate soup. Appetizing studio lighting, landscape orientation"),
    
    # Small Restaurant (4)
    (f"{BASE}/small-restaurant/feature1.webp",
     "Commercial photography, compact smart cooking equipment neatly arranged on a stainless steel countertop in a small commercial kitchen, space-efficient design, everything within arm reach, warm inviting lighting, landscape orientation"),
    (f"{BASE}/small-restaurant/feature2.webp",
     "Commercial photography, close-up of a built-in digital recipe screen on a smart cooking wok displaying step-by-step culinary instructions, sleek touchscreen interface, warm ambient lighting, shallow depth of field, landscape orientation"),
    (f"{BASE}/small-restaurant/feature3.webp",
     "Commercial photography, extreme close-up of a smart temperature probe and LED control display on a compact commercial induction wok, precise digital temperature readings, warm kitchen lighting, macro details, landscape orientation"),
    (f"{BASE}/small-restaurant/feature4.webp",
     "Commercial photography, multiple compact smart cooking equipment units arranged in progressively expanding setup on a commercial kitchen counter, demonstrating scalability from single unit to multi-station, warm lighting, landscape orientation"),
    
    # Home Tablet (4)
    (f"{HOME_IMG}/advantage-labor.webp",
     "Commercial photography of a single high-tech smart cooking machine autonomously stirring in a clean commercial kitchen, replacing the need for human chefs, warm glowing lighting, highly efficient concept, sleek stainless steel, landscape orientation"),
    (f"{HOME_IMG}/advantage-quality.webp",
     "Commercial photography of three perfectly identical gourmet dishes beautifully plated on the output shelf of a smart cooking machine, standardized quality control, warm appetizing lighting, professional commercial kitchen background, landscape orientation"),
    (f"{HOME_IMG}/advantage-energy.webp",
     "Commercial photography of a sleek smart induction cooking machine in an eco-friendly commercial kitchen, glowing blue digital energy-saving interface, modern stainless steel, warm ambient lighting with subtle green accents, landscape orientation"),
    (f"{HOME_IMG}/advantage-service.webp",
     "Commercial photography of a smart commercial cooking machine securely packaged in a modern warehouse ready for global export, a subtle glowing digital world map overlay in the background, warm cinematic lighting, landscape orientation"),
]

def generate_one(output_path, prompt, idx):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    payload = {
        "model": "gpt-image-2-all",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8192
    }
    
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "180", API_URL,
             "-H", "Content-Type: application/json",
             "-H", f"Authorization: Bearer {API_KEY}",
             "-d", json.dumps(payload)],
            capture_output=True, text=True, timeout=200
        )
        
        data = json.loads(result.stdout)
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Extract URL from markdown image format
        match = re.search(r'!\[image\]\((https?://[^\)]+)\)', content)
        if match:
            url = match.group(1)
            # Download image
            dl = subprocess.run(
                ["curl", "-s", "--max-time", "60", "-o", output_path, url],
                capture_output=True, text=True, timeout=70
            )
            size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            if size < 10000:
                os.remove(output_path)
                return f"FAIL [{idx}] {os.path.basename(output_path)}: too small ({size}B)"
            return f"OK [{idx}] {os.path.basename(output_path)} ({size}B)"
        
        # Try array format
        if isinstance(content, list):
            for item in content:
                if item.get("type") == "image_url":
                    url = item["image_url"]["url"]
                    if url.startswith("data:"):
                        import base64
                        b64data = url.split(",", 1)[1]
                        with open(output_path, "wb") as f:
                            f.write(base64.b64decode(b64data))
                    else:
                        subprocess.run(["curl", "-s", "-o", output_path, url], timeout=70)
                    size = os.path.getsize(output_path)
                    return f"OK [{idx}] {os.path.basename(output_path)} ({size}B)"
        
        return f"FAIL [{idx}] {os.path.basename(output_path)}: no image URL found"
    
    except Exception as e:
        return f"FAIL [{idx}] {os.path.basename(output_path)}: {e}"

def main():
    print(f"=== Generating {len(IMAGES)} images with concurrency=3 ===")
    start = time.time()
    results = {"ok": [], "fail": []}
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {}
        for i, (path, prompt) in enumerate(IMAGES):
            futures[executor.submit(generate_one, path, prompt, i)] = (path, prompt)
        
        for future in as_completed(futures):
            result = future.result()
            print(result)
            if result.startswith("OK"):
                results["ok"].append(result)
            else:
                results["fail"].append(result)
    
    elapsed = time.time() - start
    print(f"\n=== Done in {elapsed:.0f}s ===")
    print(f"Success: {len(results['ok'])}, Failed: {len(results['fail'])}")
    if results["fail"]:
        print("Failed:")
        for f in results["fail"]:
            print(f"  {f}")

if __name__ == "__main__":
    main()

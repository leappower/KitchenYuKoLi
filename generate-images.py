#!/usr/bin/env python3
"""Generate 24 images for steaming, stewing, other product pages using GPT-Image-2."""
import json, re, os, sys, time, base64, urllib.request

BASE = "/Users/chee/Projects/KitchenYuKoLi/src/assets/images/products"
API_URL = "https://api.kuai.host/v1/chat/completions"
API_KEY = "sk-gX7yxSZvTRZekkduJtVPoRtwPlk1J4BMND02SUERJUXW19Uh"

from PIL import Image
import io

# All 24 image prompts: (category, type_prefix, number, prompt)
IMAGES = [
    # STEAMING pain points
    ("steaming", "pain", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A chaotic breakfast rush scene in a busy Chinese dim sum restaurant kitchen. A stressed chef frantically managing multiple small bamboo steamers stacked precariously on a crowded stovetop. Piles of unfinished bao buns and dumplings wait on counters. Steam everywhere, crowded workspace. Shallow depth of field, cinematic composition."),
    ("steaming", "pain", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. Close-up of steamed buns (baozi) in a traditional bamboo steamer with visible water condensation dripping onto the buns, making them soggy and wet on top. Unappetizing appearance, water-soaked buns. Stainless steel commercial kitchen background. Professional food photography style."),
    ("steaming", "pain", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A commercial kitchen showing multiple types of food being steamed simultaneously — fish, vegetables, buns — but some are overcooked and mushy while others are undercooked and raw. A confused chef checking different steamers with a timer. Commercial stainless steel kitchen."),
    ("steaming", "pain", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A commercial kitchen with old inefficient gas steamers billowing excessive steam and heat. Energy waste visible — steam escaping from gaps everywhere, high gas flame consuming fuel. Hot uncomfortable environment. Industrial commercial kitchen setting."),
    # STEAMING features
    ("steaming", "feature", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A modern commercial multi-layer stainless steel electric steamer cabinet with 8-10 trays, filled with perfectly steamed fluffy white bao buns, dumplings, and pastries. Clean organized professional kitchen. Smart digital control panel visible on the front. Premium equipment, sleek design."),
    ("steaming", "feature", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. Interior view of a smart commercial steamer showing a drip-free condensate collection system. Perfectly steamed buns on the tray — dry, fluffy, white, no water marks. Built-in condensation channel and drainage visible. Clean stainless steel interior."),
    ("steaming", "feature", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A modern smart commercial steamer with a bright digital touchscreen control panel showing programmed cooking modes and countdown timer. Preset buttons for buns, fish, vegetables visible. LED display. Clean professional kitchen. Chef walking away confidently."),
    ("steaming", "feature", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A modern energy-efficient commercial steamer with contained steam circulation system. Smart energy monitoring display showing low power consumption. Clean efficient operation. No wasted steam escaping. Modern stainless steel commercial kitchen."),

    # STEWING pain points
    ("stewing", "pain", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A late-night central kitchen scene. An exhausted cook sits beside a large traditional stockpot on a gas stove tending to bone broth simmering for hours. Clock on wall shows 2 AM. Cook looks tired rubbing eyes. Large pot with gentle steam rising. Industrial kitchen setting."),
    ("stewing", "pain", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. Two bowls of soup side by side on a stainless steel prep counter — one looks rich golden and perfect, the other looks watery and inconsistent. A disappointed customer in a restaurant background. A chef looking uncertain holding a ladle. Commercial restaurant kitchen."),
    ("stewing", "pain", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A restaurant scheduling board showing empty slots for night shift stewing duty. Multiple staff members looking reluctant. A large stockpot simmering unattended on a stove. Frustration visible on faces. Commercial kitchen background with warm lighting."),
    ("stewing", "pain", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A commercial kitchen with traditional open-flame gas stoves under large stockpots. Visible heat distortion rising, large flames licking sides of pots, wasted heat radiating. Uncomfortable hot kitchen environment. Old inefficient equipment."),
    # STEWING features
    ("stewing", "feature", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A modern commercial electromagnetic stewing pot with a digital temperature display showing 95.3°C with ±1°C accuracy. Stainless steel smart control panel with recipe presets. Rich golden bone broth simmering inside visible through glass lid. Clean professional central kitchen."),
    ("stewing", "feature", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A smart commercial stewing pot with display panel showing 'Auto Keep-Warm Mode 75°C'. The pot sealed with glass lid, rich broth visible inside looking perfect. Timer shows 'Cooking Complete'. Modern commercial kitchen, warm lighting. Professional product shot."),
    ("stewing", "feature", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. An empty commercial kitchen at night. A smart stewing pot operating unattended on a stainless steel counter, LED display glowing showing program running. No staff needed — kitchen is dark except pot indicator light. Peaceful scene showing labor-free automated cooking."),
    ("stewing", "feature", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A commercial electromagnetic heating stewing system showing energy efficiency. The induction base glowing evenly under pot, contained heat with no open flame. Energy monitor display showing 90%+ thermal efficiency. Clean modern central kitchen environment."),

    # OTHER pain points
    ("other", "pain", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A chaotic dishwashing station in a busy restaurant kitchen during peak dinner hours. Mountains of dirty plates bowls and utensils piled on every surface. A single exhausted worker hand-washing dishes desperately. Clean plates running out. Stressful overwhelming scene."),
    ("other", "pain", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A buffet restaurant serving line where cooked food sits in open containers getting cold. No steam rising from food. A customer blowing on food trying to warm it up looking disappointed. Old inadequate holding equipment visible. Professional food service photography."),
    ("other", "pain", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A messy commercial kitchen with equipment from many different brands and colors — red wok machine, blue dishwasher, green refrigerator, all mismatched. A frustrated manager on phone with different service companies. Equipment brand logos visible. Chaotic scene."),
    ("other", "pain", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A cramped cluttered commercial kitchen where equipment is squeezed together with no workflow space. Chefs bumping into each other between stations. Prep tables overloaded, pots on floor, disorganized. Inefficient tight layout clearly visible."),
    # OTHER features
    ("other", "feature", 1, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A modern commercial pass-through dishwasher in action. Clean plates emerging from one side sparkling and ready to use, dirty plates loaded on the other. UV sterilization light visible inside. High-temperature steam. Clean organized dishwashing station. Professional product shot."),
    ("other", "feature", 2, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A sleek modern commercial heated display cabinet with glass doors showing beautifully presented hot food — roasted meats, steaming dim sum, colorful stir-fried dishes. Digital temperature display showing 65°C. Warm golden lighting inside. Attractive food display, restaurant setting."),
    ("other", "feature", 3, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A well-organized commercial kitchen with matching stainless steel prep tables arranged in efficient workflow. Under-shelf storage, integrated cutting boards, organized utensil holders. Clean spacious professional environment. Chefs working smoothly. Modern equipment."),
    ("other", "feature", 4, "Generate a photorealistic image: Commercial kitchen photography, warm ambient lighting. A unified commercial kitchen with all matching equipment — wok station, steamer, dishwasher, holding cabinet, prep tables — all same brand stainless steel design. Cohesive professional look. Single service sticker visible. Clean modern kitchen."),
]

def generate_image(filepath, prompt, index, total):
    print(f"\n[{index}/{total}] Generating: {os.path.basename(filepath)}")
    
    payload = json.dumps({
        "model": "gpt-image-2-all",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8192
    }).encode()
    
    req = urllib.request.Request(API_URL, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    })
    
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR: API call failed: {e}")
        return False
    
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    
    image_url = None
    if isinstance(content, str):
        match = re.search(r'https://[^\s\)\]\"\']+\.(png|jpg|jpeg|webp)', content)
        if match:
            image_url = match.group(0)
        else:
            match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', content)
            if match:
                img_data = base64.b64decode(match.group(1))
                with open(filepath, 'wb') as f:
                    f.write(img_data)
                print(f"  Saved from base64")
                return convert_to_webp(filepath)
    elif isinstance(content, list):
        for item in content:
            if item.get("type") == "image_url":
                url = item["image_url"]["url"]
                if url.startswith("data:"):
                    b64 = url.split(",", 1)[1]
                    img_data = base64.b64decode(b64)
                    with open(filepath, 'wb') as f:
                        f.write(img_data)
                    print(f"  Saved from base64")
                    return convert_to_webp(filepath)
                else:
                    image_url = url
                    break
    
    if not image_url:
        print(f"  ERROR: No image URL found in response")
        print(f"  Response: {str(content)[:300]}")
        return False
    
    print(f"  Downloading: {image_url[:80]}...", flush=True)
    try:
        import subprocess
        result = subprocess.run(['curl', '-sL', '--max-time', '60', '-o', filepath, image_url],
                                capture_output=True, text=True, timeout=90)
        if result.returncode != 0 or not os.path.exists(filepath):
            print(f"  ERROR: curl download failed: {result.stderr[:200]}")
            return False
    except Exception as e:
        print(f"  ERROR: Download failed: {e}")
        return False
    
    return convert_to_webp(filepath)

def convert_to_webp(filepath):
    """Convert image to webp if not already."""
    if not os.path.exists(filepath):
        print(f"  ERROR: File not created")
        return False
    
    # Check if already webp
    if filepath.endswith('.webp'):
        try:
            img = Image.open(filepath)
            if img.format == 'WEBP':
                size = os.path.getsize(filepath)
                print(f"  Already webp: {size} bytes")
                return size > 50000
        except:
            pass
    
    # Convert to webp
    try:
        img = Image.open(filepath)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        tmp = filepath.rsplit('.', 1)[0] + '.webp'
        img.save(tmp, 'webp', quality=82)
        if tmp != filepath:
            os.remove(filepath)
            os.rename(tmp, filepath)
        size = os.path.getsize(filepath)
        print(f"  WebP saved: {size} bytes")
        return size > 50000
    except Exception as e:
        print(f"  ERROR: Conversion failed: {e}")
        return False

def main():
    # Create directories
    for cat in ["steaming", "stewing", "other"]:
        os.makedirs(os.path.join(BASE, cat), exist_ok=True)
    
    total = len(IMAGES)
    success = 0
    failed = []
    
    for i, (cat, typ, num, prompt) in enumerate(IMAGES):
        filepath = os.path.join(BASE, cat, f"{typ}{num}.webp")
        
        # Skip if already exists and > 50KB
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size > 50000:
                print(f"\n[{i+1}/{total}] SKIP (exists, {size}B): {typ}{num}.webp")
                success += 1
                continue
        
        if generate_image(filepath, prompt, i+1, total):
            success += 1
            time.sleep(2)  # Rate limit
        else:
            failed.append(f"{cat}/{typ}{num}")
            time.sleep(5)  # Longer pause on failure
    
    print(f"\n{'='*50}")
    print(f"Complete: {success}/{total} succeeded")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    
    # Summary
    print(f"\nFile summary:")
    for cat in ["steaming", "stewing", "other"]:
        print(f"  {cat}:")
        for typ in ["pain", "feature"]:
            for num in range(1, 5):
                f = os.path.join(BASE, cat, f"{typ}{num}.webp")
                if os.path.exists(f):
                    size = os.path.getsize(f)
                    status = "✓" if size > 50000 else "⚠ small"
                    print(f"    {status} {typ}{num}.webp ({size:,} bytes)")
                else:
                    print(f"    ✗ {typ}{num}.webp MISSING")

if __name__ == "__main__":
    main()

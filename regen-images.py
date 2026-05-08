#!/usr/bin/env python3
"""Regenerate small-restaurant images with smart commercial cooking equipment."""

import json
import base64
import time
import urllib.request
import ssl

API_URL = "https://api.kuai.host/v1/chat/completions"
API_KEY = "sk-m4PmfUnPQ7Atlh9bPL8cqXWJ0aN6e0SYhFgZS6Gyha8L1lO6"
MODEL = "gemini-3-pro-image-preview"
OUT_DIR = "src/assets/images/applications/small-restaurant"

prompts = {
    "hero.jpg": (
        "Commercial photography, bright modern commercial kitchen for a small restaurant. "
        "Show smart commercial cooking equipment: a drum-type automatic wok stir-fry machine (horizontal cylindrical drum cooker), "
        "an automatic tilting wok pot on a countertop, and an automatic stew pot. "
        "Clean stainless steel appliances, no robotic arms, no human hands. "
        "Warm ambient lighting, professional food photography style, photorealistic, 8K quality. "
        "The equipment should look modern and high-tech but NOT sci-fi — real commercial kitchen products. "
        "Background: clean tiled wall, stainless steel shelves with ingredient containers."
    ),
    "scene1.jpg": (
        "Commercial photography, small delivery-only restaurant kitchen (cloud kitchen / ghost kitchen). "
        "Show a compact setup with one automatic drum stir-fry machine and a food warming display cabinet. "
        "Space-efficient layout, clean and organized. Takeout packaging nearby. "
        "Smart commercial cooking equipment only — drum-type automatic wok, NO robotic arms, NO traditional gas stoves. "
        "Photorealistic, bright lighting, professional food photography."
    ),
    "scene2.jpg": (
        "Commercial photography, busy neighborhood fast-food restaurant kitchen. "
        "Show multiple smart cooking stations: an automatic tilting wok for stir-fry, a commercial deep fryer, and an automatic stew pot — "
        "all modern smart commercial equipment running simultaneously. Steam and food aroma atmosphere. "
        "NO robotic arms, NO human hands, NO traditional open-flame gas stoves. "
        "Real commercial smart kitchen products, photorealistic, warm lighting."
    ),
    "scene3.jpg": (
        "Commercial photography, cloud kitchen / shared kitchen with multiple cooking stations. "
        "Show a row of smart automatic cooking machines — drum-type stir-fry cookers, automatic rice cookers, "
        "and automatic braising pots — each station labeled for different virtual restaurant brands. "
        "Compact high-efficiency layout, clean and professional. "
        "NO robotic arms, NO traditional open-flame stoves. Modern smart commercial kitchen equipment. "
        "Photorealistic, bright professional lighting, 8K quality."
    ),
    "scene4.jpg": (
        "Commercial photography, specialty restaurant kitchen featuring signature dish consistency. "
        "Show an automatic smart wok cooker with a digital control panel, producing perfectly consistent stir-fry dishes. "
        "The machine should have a visible touchscreen/display showing temperature and timer settings. "
        "Clean modern kitchen, plated finished dishes nearby showing consistent presentation. "
        "NO robotic arms, NO human hands. Smart commercial automatic cooking pot/wok equipment. "
        "Photorealistic, warm appetizing lighting, professional commercial photography."
    ),
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for filename, prompt in prompts.items():
    filepath = f"{OUT_DIR}/{filename}"
    print(f"\n🖼️  Generating {filename}...")

    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 8192
    }).encode()

    req = urllib.request.Request(API_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {API_KEY}")

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
                body = json.loads(resp.read())

            content = body["choices"][0]["message"]["content"]
            if isinstance(content, list):
                for part in content:
                    if part.get("type") == "image_url":
                        img_data = part["image_url"]["url"]
                        if img_data.startswith("data:image"):
                            b64 = img_data.split(",", 1)[1]
                            with open(filepath, "wb") as f:
                                f.write(base64.b64decode(b64))
                            size = os.path.getsize(filepath)
                            print(f"  ✅ {filename} ({size:,} bytes)")
                            break
                else:
                    print(f"  ⚠️  No image in response parts")
            elif isinstance(content, str):
                # Try to extract base64 from markdown image or raw base64
                import re
                b64_match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', content)
                if not b64_match:
                    # Maybe raw base64
                    b64_match = re.search(r'^([A-Za-z0-9+/=\n]{100,})$', content.strip())
                if b64_match:
                    with open(filepath, "wb") as f:
                        f.write(base64.b64decode(b64_match.group(1)))
                    size = os.path.getsize(filepath)
                    print(f"  ✅ {filename} ({size:,} bytes)")
                else:
                    print(f"  ⚠️  String content but no image data found. First 200 chars: {content[:200]}")
            break

        except Exception as e:
            print(f"  ❌ Attempt {attempt+1} failed: {e}")
            if attempt < max_retries:
                time.sleep(5)
            else:
                print(f"  ❌ Giving up on {filename}")

print("\n✅ Done!")

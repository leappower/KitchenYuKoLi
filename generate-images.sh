#!/bin/bash
# Generate 24 images for steaming, stewing, other product pages
# Uses GPT-Image-2 via Kuai API

BASE="/Users/chee/Projects/KitchenYuKoLi/src/assets/images/products"
API_URL="https://api.kuai.host/v1/chat/completions"
API_KEY="sk-gX7yxSZvTRZekkduJtVPoRtwPlk1J4BMND02SUERJUXW19Uh"

generate_image() {
  local filepath="$1"
  local prompt="$2"
  echo "Generating: $filepath"
  
  response=$(curl -s --max-time 120 "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"model\": \"gpt-image-2-all\",
      \"messages\": [{\"role\": \"user\", \"content\": \"$prompt\"}],
      \"max_tokens\": 8192
    }")
  
  # Extract base64 image from response
  # The image is in choices[0].message.content as a data URL or base64
  image_data=$(echo "$response" | python3 -c "
import sys, json, re, base64
data = json.load(sys.stdin)
content = data['choices'][0]['message']['content']
# Content may be a string with markdown image or an array with image type
if isinstance(content, list):
    for item in content:
        if item.get('type') == 'image_url':
            url = item['image_url']['url']
            if url.startswith('data:'):
                b64 = url.split(',', 1)[1]
                print(b64)
                sys.exit(0)
elif isinstance(content, str):
    # Try to find data:image in the string
    match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', content)
    if match:
        print(match.group(1))
        sys.exit(0)
    # Try to find URL
    match = re.search(r'https://[^\s\"]+\.(png|jpg|webp)', content)
    if match:
        print('URL:' + match.group(0))
        sys.exit(0)
print('ERROR: No image found in response')
print(json.dumps(data, indent=2)[:500])
" 2>/dev/null)
  
  if [[ "$image_data" == URL:* ]]; then
    url="${image_data#URL:}"
    echo "  Downloading from URL: $url"
    curl -s --max-time 60 -o "$filepath" "$url"
  elif [[ "$image_data" == ERROR:* ]]; then
    echo "  FAILED: $image_data"
    return 1
  else
    echo "  Decoding base64..."
    echo "$image_data" | base64 -d > "$filepath"
  fi
  
  # Convert to webp if needed, ensure >50KB
  if [[ -f "$filepath" ]]; then
    size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
    echo "  Size: ${size} bytes"
    # If it's not webp, convert it
    if ! file "$filepath" | grep -q "WebP"; then
      tmpfile="${filepath}.tmp.webp"
      if command -v cwebp &>/dev/null; then
        cwebp -q 80 "$filepath" -o "$tmpfile" 2>/dev/null && mv "$tmpfile" "$filepath"
      elif command -v magick &>/dev/null; then
        magick "$filepath" -quality 80 "$tmpfile" && mv "$tmpfile" "$filepath"
      fi
    fi
    size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
    echo "  Final size: ${size} bytes"
  else
    echo "  FAILED: File not created"
    return 1
  fi
  
  echo "  Done: $filepath"
}

# ═══ STEAMING (蒸煮系列) ═══
# Pain point images
generate_image "$BASE/steaming/pain1.webp" "Commercial kitchen photography, warm ambient lighting. A chaotic breakfast rush scene in a busy Chinese dim sum restaurant kitchen. A stressed chef is frantically trying to manage multiple small bamboo steamers stacked precariously on a crowded stovetop. Piles of unfinished bao buns and dumplings wait on counters. Steam everywhere, crowded workspace. Professional food photography, shallow depth of field, 16:9 aspect ratio."

generate_image "$BASE/steaming/pain2.webp" "Commercial kitchen photography, warm ambient lighting. Close-up of steamed buns (baozi) in a traditional bamboo steamer with visible water condensation dripping onto the buns, making them soggy and wet on top. Unappetizing appearance. A cook looks frustrated. Stainless steel commercial kitchen background. Professional food photography, 16:9 aspect ratio."

generate_image "$BASE/steaming/pain3.webp" "Commercial kitchen photography, warm ambient lighting. A commercial kitchen scene showing multiple types of food being steamed simultaneously — fish, vegetables, buns — but some are overcooked and mushy while others are undercooked. A chef is checking different steamers with a timer, looking confused and overwhelmed. Commercial stainless steel kitchen. Professional food photography, 16:9 aspect ratio."

generate_image "$BASE/steaming/pain4.webp" "Commercial kitchen photography, warm ambient lighting. A commercial kitchen with old inefficient gas steamers billowing excessive steam and heat into the kitchen. Energy waste visible — steam escaping from gaps, high gas flame consuming fuel. A utility bill visible on a nearby counter showing high costs. Industrial commercial kitchen setting. Professional photography, 16:9 aspect ratio."

# Feature images
generate_image "$BASE/steaming/feature1.webp" "Commercial kitchen photography, warm ambient lighting. A modern commercial multi-layer stainless steel steamer cabinet with 8-10 trays, filled with perfectly steamed bao buns, dumplings, and pastries. Clean, organized professional kitchen. Steam rising gently. The equipment looks high-tech and efficient. Smart digital control panel visible. Professional product photography, 16:9 aspect ratio."

generate_image "$BASE/steaming/feature2.webp" "Commercial kitchen photography, warm ambient lighting. Close-up of a smart commercial steamer's interior showing a drip-free condensate collection system. Perfectly steamed buns on the tray — dry, fluffy, white, no water marks. A built-in condensation channel visible. Clean stainless steel interior. Professional product photography, 16:9 aspect ratio."

generate_image "$BASE/steaming/feature3.webp" "Commercial kitchen photography, warm ambient lighting. A commercial smart steamer with a digital touchscreen control panel showing programmed cooking modes and timer. Preset buttons for different foods (buns, fish, vegetables). An LED display showing remaining time. The chef is walking away confidently. Modern professional kitchen. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/steaming/feature4.webp" "Commercial kitchen photography, warm ambient lighting. Side-by-side comparison showing energy efficiency: on the left, an old steamer with excessive steam escaping; on the right, a modern smart steamer with contained, efficient steam circulation. Energy monitoring display showing 40% energy savings. Clean modern commercial kitchen. Professional photography, 16:9 aspect ratio."

# ═══ STEWING (炖煮系列) ═══
# Pain point images
generate_image "$BASE/stewing/pain1.webp" "Commercial kitchen photography, warm ambient lighting. A late-night commercial kitchen scene. An exhausted cook sits beside a large traditional stockpot on a gas stove, tending to bone broth that has been simmering for hours. Clock on the wall shows 2 AM. The cook looks tired, rubbing eyes. Large pot with steam rising. Commercial central kitchen. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/pain2.webp" "Commercial kitchen photography, warm ambient lighting. Two bowls of soup side by side on a stainless steel prep counter — one looks rich and perfect, the other looks watery and inconsistent. A customer at a restaurant table looking disappointed at their soup. A chef in the background looking uncertain. Commercial restaurant kitchen. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/pain3.webp" "Commercial kitchen photography, warm ambient lighting. A restaurant manager's scheduling board showing empty slots for night shift stewing duty. Multiple staff members shaking their heads or looking away. A large stockpot simmering unattended on a stove. Tension and frustration on faces. Commercial kitchen background. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/pain4.webp" "Commercial kitchen photography, warm ambient lighting. A commercial kitchen with traditional open-flame gas stoves under large stockpots. Visible heat distortion rising, flames licking the sides of pots, lots of wasted heat radiating into the kitchen. A gas meter spinning fast. Hot, uncomfortable kitchen environment. Professional photography, 16:9 aspect ratio."

# Feature images
generate_image "$BASE/stewing/feature1.webp" "Commercial kitchen photography, warm ambient lighting. A modern commercial electromagnetic stewing pot with a digital temperature display showing precise temperature (95.3°C) with ±1°C accuracy. A stainless steel control panel with recipe presets. Rich, golden bone broth simmering inside. Clean professional central kitchen. Professional product photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/feature2.webp" "Commercial kitchen photography, warm ambient lighting. A smart commercial stewing pot display panel showing 'Auto Keep-Warm Mode' activated at 75°C. The pot is sealed with a glass lid, broth visible inside looking rich and perfect. A timer shows 'Cooking Complete — Keeping Warm'. Modern commercial kitchen, warm lighting. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/feature3.webp" "Commercial kitchen photography, warm ambient lighting. An empty commercial kitchen at night. A smart stewing pot operating unattended on a counter, display showing program running. No staff needed — the kitchen is dark except for the pot's LED indicator. Peaceful scene showing labor-free operation. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/stewing/feature4.webp" "Commercial kitchen photography, warm ambient lighting. A commercial electromagnetic heating stewing system showing energy efficiency. The induction base glows evenly under the pot, contained heat with no flame visible. An energy monitor display shows 90%+ thermal efficiency. Clean modern central kitchen. Professional product photography, 16:9 aspect ratio."

# ═══ OTHER (辅助设备) ═══
# Pain point images
generate_image "$BASE/other/pain1.webp" "Commercial kitchen photography, warm ambient lighting. A chaotic dishwashing station in a busy restaurant kitchen during peak hours. Mountains of dirty plates, bowls, and utensils piled high on every surface. A single worker is desperately hand-washing dishes, falling behind. Clean plates are running out. Stressful, overwhelming scene. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/other/pain2.webp" "Commercial kitchen photography, warm ambient lighting. A buffet restaurant serving line where cooked food sits in open containers getting cold. Steam has stopped rising. A customer is blowing on food trying to warm it up, looking disappointed. The holding equipment is old and inadequate. Professional food service photography, 16:9 aspect ratio."

generate_image "$BASE/other/pain3.webp" "Commercial kitchen photography, warm ambient lighting. A messy commercial kitchen with equipment from many different brands — a red wok machine, a blue dishwasher, a green refrigerator, all different styles and colors. A frustrated manager is on multiple phone calls with different service companies. Brand logos visible. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/other/pain4.webp" "Commercial kitchen photography, warm ambient lighting. A cramped, cluttered commercial kitchen where equipment is squeezed together with no workflow space. Chefs are bumping into each other trying to move between stations. Prep tables overloaded, pots on the floor. Inefficient layout visible. Professional photography, 16:9 aspect ratio."

# Feature images
generate_image "$BASE/other/feature1.webp" "Commercial kitchen photography, warm ambient lighting. A modern commercial pass-through dishwasher in action — clean plates emerging from one side sparkling and ready to use, dirty plates going in the other. UV light visible inside. High-temperature steam spray. Clean, organized dishwashing station. Professional product photography, 16:9 aspect ratio."

generate_image "$BASE/other/feature2.webp" "Commercial kitchen photography, warm ambient lighting. A sleek commercial heated display cabinet with glass doors showing beautifully presented hot food — roasted meats, dim sum, stir-fried dishes. Temperature display shows steady 65°C. Warm golden lighting inside the cabinet. Attractive food presentation. Professional product photography, 16:9 aspect ratio."

generate_image "$BASE/other/feature3.webp" "Commercial kitchen photography, warm ambient lighting. A well-organized commercial kitchen with matching stainless steel prep tables arranged in an efficient workflow. Under-shelf storage, integrated cutting board, organized utensil holders. Clean, spacious, professional. Chefs working smoothly. Professional photography, 16:9 aspect ratio."

generate_image "$BASE/other/feature4.webp" "Commercial kitchen photography, warm ambient lighting. A unified commercial kitchen setup where all equipment — wok station, steamer, dishwasher, holding cabinet, prep tables — share the same brand design and stainless steel aesthetic. A single service phone number visible on equipment. Clean, cohesive, professional kitchen. Professional photography, 16:9 aspect ratio."

echo ""
echo "═══ Generation complete ═══"
echo "Checking all files..."
for cat in steaming stewing other; do
  echo "--- $cat ---"
  for i in 1 2 3 4; do
    for type in pain feature; do
      f="$BASE/$cat/${type}${i}.webp"
      if [[ -f "$f" ]]; then
        size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null)
        echo "  ✓ ${type}${i}.webp (${size} bytes)"
      else
        echo "  ✗ ${type}${i}.webp MISSING"
      fi
    done
  done
done

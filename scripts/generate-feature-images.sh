#!/bin/bash
# Generate feature images - parallel batch processing
# Using GPT-Image-2 via Kuai API

BASE="/Users/chee/Projects/KitchenYuKoLi/src/assets/images/applications"
HOME_IMG="/Users/chee/Projects/KitchenYuKoLi/src/assets/images/home"
API_URL="https://api.kuai.host/v1/chat/completions"
API_KEY="sk-gX7yxSZvTRZekkduJtVPoRtwPlk1J4BMND02SUERJUXW19Uh"
LOG="/Users/chee/Projects/KitchenYuKoLi/scripts/gen-log.txt"

mkdir -p "$(dirname "$BASE")" "$HOME_IMG"
echo "=== Image Generation Started: $(date) ===" > "$LOG"

generate_image() {
  local output_path="$1"
  local prompt="$2"
  local dir=$(dirname "$output_path")
  mkdir -p "$dir"
  
  echo "[$(date +%H:%M:%S)] Generating: $output_path" >> "$LOG"
  
  response=$(curl -s --max-time 180 "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$(python3 -c "
import json
print(json.dumps({
    'model': 'gpt-image-2-all',
    'messages': [{'role': 'user', 'content': '''$prompt'''}],
    'max_tokens': 8192
}))
")")
  
  # Extract image URL from response
  img_url=$(echo "$response" | python3 -c "
import json, sys, re
data = json.load(sys.stdin)
content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
# Format: ![image](URL)
match = re.search(r'!\[image\]\((https?://[^\)]+)\)', content)
if match:
    print(match.group(1))
else:
    # Try array format
    if isinstance(content, list):
        for item in content:
            if item.get('type') == 'image_url':
                url = item['image_url']['url']
                if url.startswith('data:'):
                    print('BASE64:' + url[:50])
                else:
                    print(url)
                break
    else:
        print('NONE')
" 2>&1)
  
  if [[ "$img_url" == "NONE" ]] || [[ -z "$img_url" ]]; then
    echo "[$(date +%H:%M:%S)] FAILED: No URL in response for $output_path" >> "$LOG"
    echo "  Response: $(echo "$response" | head -c 300)" >> "$LOG"
    return 1
  fi
  
  if [[ "$img_url" == BASE64:* ]]; then
    # Handle base64 - extract and decode
    b64data=$(echo "$response" | python3 -c "
import json, sys
data = json.load(sys.stdin)
content = data['choices'][0]['message']['content']
if isinstance(content, list):
    for item in content:
        if item.get('type') == 'image_url':
            url = item['image_url']['url']
            print(url.split(',', 1)[1])
            break
")
    echo "$b64data" | base64 -d > "$output_path"
  else
    # Download from URL
    curl -s --max-time 60 -o "$output_path" "$img_url"
  fi
  
  local size=$(stat -f%z "$output_path" 2>/dev/null || echo 0)
  if (( size < 10000 )); then
    echo "[$(date +%H:%M:%S)] WARNING: $output_path too small (${size} bytes)" >> "$LOG"
    rm -f "$output_path"
    return 1
  fi
  
  echo "[$(date +%H:%M:%S)] OK: $output_path (${size} bytes)" >> "$LOG"
  echo "  ✓ $output_path (${size} bytes)"
  return 0
}

# Generate all images with concurrency limit of 3
MAX_PARALLEL=3
running=0

run_with_limit() {
  while (( running >= MAX_PARALLEL )); do
    wait -n 2>/dev/null || true
    (( running-- ))
  done
  generate_image "$1" "$2" &
  (( running++ ))
}

# ========== CENTRAL KITCHEN (4) ==========
run_with_limit "$BASE/central-kitchen/feature1.webp" "High-end commercial food photography, landscape orientation. A sleek digital tablet mounted on a metallic stand displays a vivid step-by-step digital recipe interface. It sits beside a massive, brushed stainless steel commercial induction wok in a state-of-the-art central kitchen. Warm, inviting ambient lighting casts soft golden reflections on the steel surfaces."

run_with_limit "$BASE/central-kitchen/feature2.webp" "Cinematic commercial kitchen photography, landscape orientation. A row of heavy-duty automated tilting woks cooking large batches of food simultaneously. Volumetric warm backlighting illuminates the rich, rising steam against a pristine stainless steel central kitchen background."

run_with_limit "$BASE/central-kitchen/feature3.webp" "Macro commercial product photography, landscape orientation. Extreme close-up of a sleek, glowing digital temperature control panel on a futuristic commercial induction cooker. The high-resolution screen displays precise temperature readings and smart cooking graphs."

run_with_limit "$BASE/central-kitchen/feature4.webp" "Wide-angle commercial photography, landscape orientation. A highly organized lineup of commercial smart cooking machines arranged from small to massive scale in a clean professional production kitchen. Warm, even lighting illuminates brushed metal and glass surfaces."

# ========== CHAIN RESTAURANT (4) ==========
run_with_limit "$BASE/chain-restaurant/feature1.webp" "Commercial photography, two perfectly identical plated dishes resting side by side on a polished stainless steel counter, freshly cooked by a high-tech smart wok machine in the background, warm glowing lighting, landscape orientation"

run_with_limit "$BASE/chain-restaurant/feature2.webp" "Commercial photography, a sleek tablet displaying a digital cloud-based recipe management system syncing with multiple restaurant locations, on a stainless steel prep table, smart cooking equipment in blurred background, warm ambient lighting, landscape orientation"

run_with_limit "$BASE/chain-restaurant/feature3.webp" "Commercial photography, a highly efficient commercial kitchen featuring a single chef effortlessly monitoring a long row of automated smart cooking machines running simultaneously, digital screens glowing softly, warm overhead lighting, landscape orientation"

run_with_limit "$BASE/chain-restaurant/feature4.webp" "Commercial photography, wide angle view of multiple identical compact smart cooking stations lined up perfectly in a row, fully equipped and ready for operation, warm inviting lighting, professional commercial kitchen, landscape orientation"

# ========== CANTEEN (4) ==========
run_with_limit "$BASE/canteen/feature1.webp" "Commercial photography, smart cooking equipment including modern induction woks and rice steamers alongside insulated food service counters, bright institutional canteen setting, warm lighting, highly detailed, photorealistic, landscape orientation"

run_with_limit "$BASE/canteen/feature2.webp" "Commercial photography, an automated wok system with precise preset timing producing consistent meal portions, sleek digital display showing real-time cooking progress, warm ambient lighting, landscape orientation"

run_with_limit "$BASE/canteen/feature3.webp" "Commercial photography, nutrition management prep station, fresh balanced meal components being prepared with colorful vegetables, healthy proteins, and whole grains neatly organized in commercial metal trays, warm inviting lighting, landscape orientation"

run_with_limit "$BASE/canteen/feature4.webp" "Commercial photography, efficient ingredient portioning station with precise digital measuring tools, pristine clean culinary environment with minimal waste visible, warm lighting, professional food service setup, landscape orientation"

# ========== FOOD FACTORY (4) ==========
run_with_limit "$BASE/food-factory/feature1.webp" "Commercial photography, massive food factory interior, long automated production line with industrial smart cooking equipment producing prepared meals at scale, stainless steel machinery, futuristic digital control panels, warm ambient lighting, landscape orientation"

run_with_limit "$BASE/food-factory/feature2.webp" "Commercial photography, large stainless steel cooking vats equipped with multiple high-tech digital temperature sensors and glowing monitoring screens, slight culinary steam, warm amber lighting, cinematic, landscape orientation"

run_with_limit "$BASE/food-factory/feature3.webp" "Commercial photography, high-tech automated QR code scanning system mounted over a stainless steel conveyor belt carrying packaged meals, worker in clean hygiene gear scanning a barcode, warm overhead lighting, landscape orientation"

run_with_limit "$BASE/food-factory/feature4.webp" "Commercial photography, multiple identical automated smart cooking production lines running in parallel into the distance, vanishing point perspective, symmetrical composition, warm glowing industrial lights, landscape orientation"

# ========== MENU LAB (4) ==========
run_with_limit "$BASE/menu-lab/feature1.webp" "Commercial photography, a sleek large touchscreen interface mounted on a smart cooking machine in a modern commercial test kitchen. The screen displays a vibrant multi-cuisine recipe library featuring diverse Asian dishes. Warm ambient lighting, stainless steel background, landscape orientation"

run_with_limit "$BASE/menu-lab/feature2.webp" "Commercial photography, a professional chef and a culinary engineer collaborating in a test kitchen, next to a high-tech smart wok, pointing at a laptop screen and the machine digital interface to develop a new recipe. Warm kitchen lighting, landscape orientation"

run_with_limit "$BASE/menu-lab/feature3.webp" "Commercial photography, close up of a smart cooking machine digital display showing split-screen interface with intelligent temperature adaptation curves and dynamic graphs for different global cuisines. Warm glowing kitchen lights, landscape orientation"

run_with_limit "$BASE/menu-lab/feature4.webp" "Commercial photography, a single versatile smart cooking machine on a stainless steel counter, surrounded by various beautifully plated dishes: vibrant stir-fry, rich stew, and delicate soup. Appetizing studio lighting, landscape orientation"

# ========== SMALL RESTAURANT (4) ==========
run_with_limit "$BASE/small-restaurant/feature1.webp" "Commercial photography, compact smart cooking equipment neatly arranged on a stainless steel countertop in a small commercial kitchen, space-efficient design, everything within arm reach, warm inviting lighting, landscape orientation"

run_with_limit "$BASE/small-restaurant/feature2.webp" "Commercial photography, close-up of a built-in digital recipe screen on a smart cooking wok displaying step-by-step culinary instructions, sleek touchscreen interface, warm ambient lighting, shallow depth of field, landscape orientation"

run_with_limit "$BASE/small-restaurant/feature3.webp" "Commercial photography, extreme close-up of a smart temperature probe and LED control display on a compact commercial induction wok, precise digital temperature readings, warm kitchen lighting, macro details, landscape orientation"

run_with_limit "$BASE/small-restaurant/feature4.webp" "Commercial photography, multiple compact smart cooking equipment units arranged in progressively expanding setup on a commercial kitchen counter, demonstrating scalability from single unit to multi-station, warm lighting, landscape orientation"

# ========== HOME TABLET (4) ==========
mkdir -p "$HOME_IMG"

run_with_limit "$HOME_IMG/advantage-labor.webp" "Commercial photography of a single high-tech smart cooking machine autonomously stirring in a clean commercial kitchen, replacing the need for human chefs, warm glowing lighting, highly efficient concept, sleek stainless steel, landscape orientation"

run_with_limit "$HOME_IMG/advantage-quality.webp" "Commercial photography of three perfectly identical gourmet dishes beautifully plated on the output shelf of a smart cooking machine, standardized quality control, warm appetizing lighting, professional commercial kitchen background, landscape orientation"

run_with_limit "$HOME_IMG/advantage-energy.webp" "Commercial photography of a sleek smart induction cooking machine in an eco-friendly commercial kitchen, glowing blue digital energy-saving interface, modern stainless steel, warm ambient lighting with subtle green accents, landscape orientation"

run_with_limit "$HOME_IMG/advantage-service.webp" "Commercial photography of a smart commercial cooking machine securely packaged in a modern warehouse ready for global export, a subtle glowing digital world map overlay in the background, warm cinematic lighting, landscape orientation"

# Wait for all
wait
echo ""
echo "=== Generation Complete: $(date) ===" >> "$LOG"
echo "=== All done ===" 

# Summary
echo ""
echo "=== Summary ==="
echo "Generated files:"
for dir in "$BASE"/*/ "$HOME_IMG"/; do
  count=$(ls "$dir"feature*.webp "$dir"advantage*.webp 2>/dev/null | wc -l)
  if (( count > 0 )); then
    echo "  $(basename $dir): $count new images"
    ls -la "$dir"feature*.webp "$dir"advantage*.webp 2>/dev/null
  fi
done

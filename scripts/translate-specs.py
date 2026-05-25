#!/usr/bin/env python3
"""
Translate product specifications from Chinese to English using OpenAI-compatible API.
"""
import json
import os
import re
import sys

BATCH_SIZE = 15

with open('/tmp/product-i18n-specs.json') as f:
    spec_items = json.load(f)

total = len(spec_items)
print(f'Total items to translate: {total}')

def translate_batch(batch, batch_idx):
    """Translate a batch of specifications using OpenAI API."""
    prompt_lines = []
    for key, zh_text in batch:
        prompt_lines.append(f'{key}: {zh_text}')
    
    system_prompt = """You are a professional kitchen equipment translator. Translate Chinese product specifications to English.

Rules:
1. Keep all numerical values and units exactly as-is: Φ296mm, 5kW, 220V, 50Hz, 8L, 380V etc.
2. Keep semicolon separators between parameter items
3. Keep newline formatting where present
4. Professional terminology:
   - 材质 = Material
   - 功率 = Power
   - 电压 = Voltage
   - 频率 = Frequency
   - 容量 = Capacity
   - 锅体 = Pot/Wok Body
   - 不锈钢 = Stainless Steel
   - 不粘锅 = Non-stick
   - 显示屏 = Display
   - 智能定时 = Smart Timer
   - 火力调节 = Heat Control
   - 翻炒速度 = Stirring Speed
   - 行星搅拌 = Planetary Stirring
   - 生铁锅 = Cast Iron Wok
   - 触摸屏 = Touchscreen
   
Output ONLY valid JSON array: [{"key": "key_name", "en": "translated text"}, ...]"""

    user_prompt = f"Translate these {len(batch)} kitchen equipment specification texts:\n\n" + "\n".join(prompt_lines)

    import urllib.request
    import json as j
    
    # Try siliconflow first, then deepseek
    configs = [
        {
            "url": "https://api.siliconflow.cn/v1/chat/completions",
            "model": "Qwen/Qwen3.5-122B-A10B",
            "key_env": "SILICONFLOW_API_KEY"
        },
        {
            "url": "https://api.deepseek.com/v1/chat/completions",
            "model": "deepseek-chat",
            "key_env": "DEEPSEEK_API_KEY"
        }
    ]
    
    for cfg in configs:
        api_key = os.environ.get(cfg['key_env'], '')
        if not api_key:
            # Try generic
            api_key = os.environ.get('OPENAI_API_KEY', '')
            if not api_key:
                continue
            
        payload = j.dumps({
            "model": cfg['model'],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 4096
        }).encode('utf-8')
        
        req = urllib.request.Request(
            cfg['url'],
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = j.loads(resp.read())
                content = result['choices'][0]['message']['content']
                # Extract JSON from response
                # Find JSON array
                match = re.search(r'\[.*\]', content, re.DOTALL)
                if match:
                    translated = j.loads(match.group())
                    return translated
                else:
                    print(f'  [batch {batch_idx}] No JSON array found in response')
                    print(f'  Response: {content[:200]}')
                    return None
        except Exception as e:
            print(f'  [batch {batch_idx}] API error ({cfg["model"]}): {e}')
            continue
    
    return None

# Process in batches
all_translated = []
for i in range(0, total, BATCH_SIZE):
    batch = spec_items[i:i+BATCH_SIZE]
    batch_idx = i // BATCH_SIZE
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f'Batch {batch_idx+1}/{total_batches} ({len(batch)} items)...')
    
    result = translate_batch(batch, batch_idx)
    if result:
        all_translated.extend(result)
        # Save after each batch
        with open('/tmp/product-i18n-specs-translated.json', 'w') as f:
            j.dump(all_translated, f, ensure_ascii=False, indent=2)
        print(f'  -> Translated {len(result)} items (total: {len(all_translated)})')
    else:
        print(f'  -> FAILED batch {batch_idx+1}')
        # Save partial
        with open(f'/tmp/product-i18n-specs-translated-partial-batch{batch_idx}.json', 'w') as f:
            j.dump(all_translated, f, ensure_ascii=False, indent=2)

print(f'\nDone. Total translated: {len(all_translated)}/{total}')

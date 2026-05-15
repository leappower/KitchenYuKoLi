#!/usr/bin/env python3
"""
sync-new-keys.py — Sync 106 new i18n keys to all language files

Phase 1: Add 106 new keys to zh-CN-ui.json with Chinese translations
Phase 2: Batch translate to 23 other languages via SiliconFlow API (DeepSeek V3)
Phase 3: Merge translated keys into each language file
"""

import json, os, sys, time, re, threading, io as _io
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

# ═══════════════════════════════════════════════════════════
#  Config
# ═══════════════════════════════════════════════════════════
API_URL  = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY  = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL    = "Pro/deepseek-ai/DeepSeek-V3"
LANG_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "lang")

BATCH_SIZE  = 15
CONCURRENCY = 4
API_TIMEOUT = 120
MAX_RETRIES = 3

# Languages to translate into (all except en and zh-CN)
# Code: English name for API prompt
TARGET_LANGUAGES = {
    "ar": "Arabic",
    "de": "German",
    "es": "Spanish",
    "fil": "Filipino/Tagalog",
    "fr": "French",
    "he": "Hebrew",
    "hi": "Hindi",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "km": "Khmer",
    "ko": "Korean",
    "lo": "Lao",
    "ms": "Malay",
    "my": "Myanmar/Burmese",
    "nl": "Dutch",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "th": "Thai",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "zh-TW": "Traditional Chinese",
}

# ═══════════════════════════════════════════════════════════
#  zh-CN translations for all 106 new keys
# ═══════════════════════════════════════════════════════════
ZH_CN_TRANSLATIONS = {
    # ── App labels ──
    "app_small_restaurant": "小型餐饮",
    "app_central_kitchen": "中央厨房",
    "app_canteen": "智慧食堂",
    "app_chain_restaurant": "连锁餐饮",
    "app_cloud_kitchen": "云厨房",
    "app_food_factory": "食品工厂",
    "app_menu_lab": "菜系实验室",

    # ── Buttons ──
    "btn_back": "返回",
    "btn_view_details": "查看详情",

    # ── Cases ──
    "cases_all": "全部",
    "cases_filter_toggle": "筛选案例",
    "cases_labor_cost": "人工成本",
    "cases_no_results": "没有找到匹配的案例，试试调整筛选条件。",
    "cases_read_more": "阅读更多",
    "cases_read_story": "查看详情",

    # ── Compare table ──
    "compare_bar_params": "参数",
    "compare_clear": "清空",
    "compare_max_selected": "最多只能选择 3 款产品进行对比",
    "compare_row_avg_time": "平均处理时间",
    "compare_row_category": "分类",
    "compare_row_dimensions": "尺寸",
    "compare_row_highlights": "产品亮点",
    "compare_row_model": "型号",
    "compare_row_name": "产品名称",
    "compare_row_power": "功率",
    "compare_row_specs": "产品规格",
    "compare_row_throughput": "产能",
    "compare_row_tier": "等级",
    "compare_row_voltage": "电压",
    "compare_row_weight": "净重",
    "compare_selected_count": "已选",
    "compare_view": "对比",

    # ── Cross-sell: stirfry ──
    "cross_sell_stirfry_cutting_reason": "切配后直接翻炒，备料到出餐无缝衔接",
    "cross_sell_stirfry_cutting_hl": "效率 +200%",
    "cross_sell_stirfry_steaming_reason": "蒸饭蒸菜同步进行，午高峰不排队",
    "cross_sell_stirfry_steaming_hl": "出餐 -40min",
    "cross_sell_stirfry_other_reason": "洗碗机+保温台，后厨动线一次到位",
    "cross_sell_stirfry_other_hl": "人手 -3人",
    "cross_sell_stirfry_stewing_reason": "炖汤+炒菜双线出餐，菜品更丰富",
    "cross_sell_stirfry_stewing_hl": "菜品 +30%",

    # ── Cross-sell: cutting ──
    "cross_sell_cutting_stirfry_reason": "切好直接下锅，备料到烹饪零等待",
    "cross_sell_cutting_stirfry_hl": "效率 +180%",
    "cross_sell_cutting_steaming_reason": "切配+蒸煮一体化，前处理更高效",
    "cross_sell_cutting_steaming_hl": "备料 -60min",
    "cross_sell_cutting_other_reason": "传送带+分拣台，流水线式切配作业",
    "cross_sell_cutting_other_hl": "产能 +4倍",

    # ── Cross-sell: frying ──
    "cross_sell_frying_stirfry_reason": "炸+炒双线并行，出餐速度翻倍",
    "cross_sell_frying_stirfry_hl": "出餐 +100%",
    "cross_sell_frying_cutting_reason": "切配备料跟上油炸节奏，不缺料",
    "cross_sell_frying_cutting_hl": "备料 0等待",
    "cross_sell_frying_other_reason": "滤油台+排烟系统，油炸区干净整洁",
    "cross_sell_frying_other_hl": "油烟 -80%",

    # ── Cross-sell: stewing ──
    "cross_sell_stewing_stirfry_reason": "炖汤+炒菜组合，满足多样化菜单",
    "cross_sell_stewing_stirfry_hl": "菜品 +25%",
    "cross_sell_stewing_steaming_reason": "炖煮蒸饭同步，大锅饭不再手忙脚乱",
    "cross_sell_stewing_steaming_hl": "同步出餐",
    "cross_sell_stewing_cutting_reason": "自动切配炖菜食材，规格统一味道稳",
    "cross_sell_stewing_cutting_hl": "口味一致",

    # ── Cross-sell: steaming ──
    "cross_sell_steaming_stirfry_reason": "蒸+炒搭档，炒菜蒸饭同时搞定",
    "cross_sell_steaming_stirfry_hl": "效率 +150%",
    "cross_sell_steaming_cutting_reason": "蒸前切配自动完成，食材现切现蒸",
    "cross_sell_steaming_cutting_hl": "鲜度提升",
    "cross_sell_steaming_stewing_reason": "蒸+炖组合，汤饭粥一灶全出",
    "cross_sell_steaming_stewing_hl": "一灶多用",
    "cross_sell_steaming_other_reason": "保温分餐台搭配蒸柜，热菜直达窗口",
    "cross_sell_steaming_other_hl": "温度不降",

    # ── Cross-sell: other ──
    "cross_sell_other_stirfry_reason": "核心烹饪+辅助设备，后厨全套配齐",
    "cross_sell_other_stirfry_hl": "一站式",
    "cross_sell_other_cutting_reason": "切配+辅助传送，流水线完整配置",
    "cross_sell_other_cutting_hl": "流水线化",
    "cross_sell_other_steaming_reason": "蒸柜+保温台，从蒸到分餐不断链",
    "cross_sell_other_steaming_hl": "温度可控",

    # ── Cross-sell: generic ──
    "cross_sell_subtitle": "买了{cat}的客户还配了",
    "cross_sell_title": "搭配推荐",

    # ── Products ──
    "no_core_products": "暂无核心产品",
    "no_core_products_data": "暂无核心产品数据",
    "products_inquire": "询价",
    "products_starting_price": "起步价",
    "recommended_products": "推荐产品",

    # ── Scene entries ──
    "scene_entry_subtitle": "看看这些场景怎么用我们的设备",
    "scene_entry_title": "适用场景",

    # ── Scene: stirfry ──
    "scene_stirfry_small_restaurant": "2-5人的小厨房，一台炒菜机替代3个厨师",
    "scene_stirfry_canteen": "食堂午高峰500-5000人，90分钟出完热餐",
    "scene_stirfry_central_kitchen": "中央厨房大批量生产，口味标准化统一",

    # ── Scene: cutting ──
    "scene_cutting_central_kitchen": "千份备料，切配规格统一如一",
    "scene_cutting_food_factory": "食品工厂流水线切配，日产能提升6倍",
    "scene_cutting_canteen": "食堂蔬菜自动切配，2小时变20分钟",

    # ── Scene: frying ──
    "scene_frying_small_restaurant": "快速出炸鸡薯条，外卖高峰不积压",
    "scene_frying_chain_restaurant": "全门店炸品标准化统一出品",
    "scene_frying_cloud_kitchen": "多品牌云厨房共享炸炉，轮流出餐",

    # ── Scene: stewing ──
    "scene_stewing_canteen": "食堂炖锅一次出餐千份",
    "scene_stewing_central_kitchen": "中央厨房大批量炖煮，口味始终如一",
    "scene_stewing_chain_restaurant": "招牌炖品每家门店味道一致",

    # ── Scene: steaming ──
    "scene_steaming_canteen": "食堂蒸饭蒸菜同步出，千份轻松搞定",
    "scene_steaming_central_kitchen": "中央厨房批量蒸制，保鲜密封配送",
    "scene_steaming_food_factory": "食品工厂蒸制工序全自动化温控",

    # ── Scene: other ──
    "scene_other_canteen": "洗碗分餐一体，后厨人手砍半",
    "scene_other_chain_restaurant": "全门店排烟清洁标准化统一",
    "scene_other_central_kitchen": "中央厨房传送带+包装，全自动",

    # ── Scene: all ──
    "scene_all_small_restaurant": "2-5人的小厨房，一台炒菜机替代3个厨师",
    "scene_all_canteen": "食堂午高峰500-5000人，90分钟出完热餐",
    "scene_all_central_kitchen": "中央厨房大批量生产，口味标准化统一",
    "scene_all_chain_restaurant": "连锁门店统一出品，不再依赖厨师",
    "scene_all_cloud_kitchen": "外卖云厨房，单店日接3000+单",
    "scene_all_food_factory": "食品工厂自动化产线，日产万份以上",
    "scene_all_menu_lab": "菜系实验室，一键复刻全球风味",
}


# ═══════════════════════════════════════════════════════════
#  API call
# ═══════════════════════════════════════════════════════════
def call_api(system_prompt, batch_dict, label=""):
    """Call SiliconFlow API. Returns dict or {}."""
    up = json.dumps(batch_dict, ensure_ascii=False)
    t0 = time.time()
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {API_KEY}",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": up},
                    ],
                    "max_tokens": 16384,
                    "temperature": 0.1,
                },
                timeout=API_TIMEOUT,
            )
            if resp.status_code != 200:
                print(f"  ⚠ {label} HTTP {resp.status_code}, retry {attempt}")
                if attempt < MAX_RETRIES:
                    time.sleep(2 * attempt)
                    continue
                return {}

            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)
            translated = json.loads(raw)

            # Validate key completeness
            orig_keys = set(batch_dict.keys())
            trans_keys = set(translated.keys())
            if orig_keys - trans_keys:
                missing = orig_keys - trans_keys
                print(f"  ⚠ {label} missing {len(missing)} keys, retry {attempt}")
                if attempt < MAX_RETRIES:
                    time.sleep(2 * attempt)
                    continue
                # Fill missing with Chinese fallback
                for k in missing:
                    translated[k] = batch_dict[k]
            # Remove extra keys
            if trans_keys - orig_keys:
                translated = {k: v for k, v in translated.items() if k in orig_keys}

            elapsed = time.time() - t0
            print(f"  ✓ {label} ({elapsed:.0f}s)")
            return translated

        except json.JSONDecodeError as e:
            print(f"  ⚠ {label} JSON parse error, retry {attempt}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
                continue
            return {}
        except requests.exceptions.Timeout:
            print(f"  ⏱ {label} timeout, retry {attempt}")
            if attempt < MAX_RETRIES:
                time.sleep(3 * attempt)
                continue
            return {}
        except Exception as e:
            print(f"  ✗ {label} failed: {type(e).__name__}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
                continue
            return {}
    return {}


PROMPT_TRANSLATE = """你是精通中文和{target_lang}的UI本地化专家。把中文网站界面文本翻译成{target_lang}。

这是一家商用厨房设备公司（YuKoLi）的官网，产品包括炒菜机、切菜机、炸炉、蒸柜、炖锅等。

## 翻译原则
1. 【UI精简】菜单/按钮/标签类短文本用最简洁的词
2. 【营销文案】保留感染力，比原文更紧凑
3. 【数字+符号】保留不变（如 +200%、-80%、+4倍 等）
4. 【占位符】{cat} 等花括号占位符原样保留
5. 【品牌名】YuKoLi 保留不译
6. 【语气】专业亲切，商用厨房设备行业质感

## 输出格式（极其重要）
- 输入是JSON，键是代码标识符（绝对不能动），值是需要翻译的中文
- 输出纯JSON：保留全部键，只翻译值
- 不要```标记，不要解释文字
- 每个值都必须翻译，不能跳过、不能留空

## 特殊规则
- cross_sell_*_hl 类型的值是高亮标签（如"效率 +200%"），尽量简短精炼，数字符号保留
- cross_sell_*_reason 类型的值是推荐理由，适当本地化
- scene_* 类型的值是场景描述，保持营销感
- compare_row_* 类型的值是表格列名，用最短的词

现在翻译以下JSON："""


def run_batches(batches, prompt, target_lang, concurrency, label_prefix):
    results = {}
    sp = prompt.replace("{target_lang}", target_lang)
    n = len(batches)
    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        fmap = {}
        for bid, bdict in batches:
            fmap[
                ex.submit(
                    call_api, sp, dict(bdict),
                    f"{label_prefix} #{bid + 1}/{n}"
                )
            ] = bid
        for fut in as_completed(fmap):
            bid = fmap[fut]
            try:
                r = fut.result(timeout=API_TIMEOUT + 60)
                if r:
                    results[bid] = r
            except Exception:
                pass
    return results


# ═══════════════════════════════════════════════════════════
#  Phase 1: Add keys to zh-CN
# ═══════════════════════════════════════════════════════════
def phase1_zhcn():
    print("\n" + "=" * 60)
    print("  Phase 1: Add 106 keys to zh-CN-ui.json")
    print("=" * 60)

    path = os.path.join(LANG_DIR, "zh-CN-ui.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing = set(data.keys())
    new_keys = {k: v for k, v in ZH_CN_TRANSLATIONS.items() if k not in existing}
    overlap = set(ZH_CN_TRANSLATIONS.keys()) & existing

    if overlap:
        print(f"  ⚠ {len(overlap)} keys already exist in zh-CN-ui.json, skipping")
    print(f"  Adding {len(new_keys)} new keys...")

    data.update(new_keys)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"  ✅ zh-CN-ui.json now has {len(data)} keys")
    return new_keys


# ═══════════════════════════════════════════════════════════
#  Phase 2: Translate to 23 languages
# ═══════════════════════════════════════════════════════════
def phase2_translate(keys_to_translate):
    print("\n" + "=" * 60)
    print("  Phase 2: Batch translate to 23 languages")
    print("=" * 60)

    items = list(keys_to_translate.items())
    all_batches = [
        items[i : i + BATCH_SIZE] for i in range(0, len(items), BATCH_SIZE)
    ]
    n_batches = len(all_batches)
    print(
        f"  {len(items)} keys in {n_batches} batches × {len(TARGET_LANGUAGES)} languages"
    )

    total_start = time.time()

    for lang_code, lang_name in TARGET_LANGUAGES.items():
        t0 = time.time()
        print(f"\n  🌐 {lang_name} ({lang_code})...")

        path = os.path.join(LANG_DIR, f"{lang_code}-ui.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        existing = set(data.keys())
        missing_keys = {k: keys_to_translate[k] for k in keys_to_translate if k not in existing}

        if not missing_keys:
            print(f"    ⏭ All keys already exist, skipping")
            continue

        print(f"    Translating {len(missing_keys)} keys...")
        batch_list = [
            list(missing_keys.items())[i : i + BATCH_SIZE]
            for i in range(0, len(missing_keys), BATCH_SIZE)
        ]
        batches = [(bi, dict(b)) for bi, b in enumerate(batch_list)]
        results = run_batches(
            batches, PROMPT_TRANSLATE, lang_name, CONCURRENCY, f"{lang_code}"
        )

        # Merge results
        added = 0
        for bid, trans in results.items():
            for k, v in batch_list[bid]:
                if k in trans and trans[k]:
                    data[k] = trans[k]
                    added += 1
                else:
                    # Fallback: use Chinese value
                    data[k] = missing_keys[k]
                    added += 1

        # Fill any remaining missing keys (API failures)
        for k in missing_keys:
            if k not in data:
                data[k] = missing_keys[k]
                added += 1

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        elapsed = time.time() - t0
        print(
            f"    ✅ {lang_code}: +{added} keys → {len(data)} total ({elapsed:.0f}s)"
        )

    total = time.time() - total_start
    print(f"\n  🎉 Phase 2 complete! Total: {total / 60:.1f} min")


# ═══════════════════════════════════════════════════════════
#  Phase 3: Verify
# ═══════════════════════════════════════════════════════════
def phase3_verify(expected_keys):
    print("\n" + "=" * 60)
    print("  Phase 3: Verify all languages")
    print("=" * 60)

    import glob

    files = sorted(glob.glob(os.path.join(LANG_DIR, "*-ui.json")))
    all_ok = True
    for fp in files:
        lang = os.path.basename(fp).replace("-ui.json", "")
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        missing = [k for k in expected_keys if k not in data]
        empty = [k for k in expected_keys if k in data and not data[k].strip()]
        status = "✅" if not missing and not empty else "⚠️"
        if missing or empty:
            all_ok = False
        extra = ""
        if missing:
            extra += f" missing={len(missing)}"
        if empty:
            extra += f" empty={len(empty)}"
        print(f"  {status} {lang}: {len(data)} keys{extra}")

    if all_ok:
        print("\n  ✅ All languages have all 106 keys!")
    else:
        print("\n  ⚠ Some languages have issues, see above")


# ═══════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════
def main():
    print("╔" + "═" * 58 + "╗")
    print("║  i18n New Keys Sync Tool                           ║")
    print(f"║  API: SiliconFlow / {MODEL:<30}║")
    print("║  Phase1: zh-CN | Phase2: 23 languages | Phase3: verify  ║")
    print("╚" + "═" * 58 + "╝")

    # Phase 1
    added = phase1_zhcn()

    # Phase 2
    phase2_translate(ZH_CN_TRANSLATIONS)

    # Phase 3
    phase3_verify(set(ZH_CN_TRANSLATIONS.keys()))


if __name__ == "__main__":
    main()

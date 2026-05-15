#!/usr/bin/env python3
"""
sync-new-keys-v2.py — Sync 106 new i18n keys (sequential, simpler)
Phase 1: Add 106 keys to zh-CN with Chinese translations (skip if exists)
Phase 2: Sequential translate to 23 languages via SiliconFlow API
Phase 3: Verify
"""

import json, os, sys, time, re
import requests

API_URL  = "https://api.siliconflow.cn/v1/chat/completions"
API_KEY  = "sk-tmuyiqvucrmlidhzhrzibeqbihivoddfhcgvvjseiozaxwwu"
MODEL    = "Pro/deepseek-ai/DeepSeek-V3"
LANG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "lang")

BATCH_SIZE  = 15
API_TIMEOUT = 120
MAX_RETRIES = 3

TARGET_LANGUAGES = [
    ("ar", "Arabic"), ("de", "German"), ("es", "Spanish"), ("fil", "Filipino"),
    ("fr", "French"), ("he", "Hebrew"), ("hi", "Hindi"), ("id", "Indonesian"),
    ("it", "Italian"), ("ja", "Japanese"), ("km", "Khmer"), ("ko", "Korean"),
    ("lo", "Lao"), ("ms", "Malay"), ("my", "Myanmar"), ("nl", "Dutch"),
    ("pl", "Polish"), ("pt", "Portuguese"), ("ru", "Russian"), ("th", "Thai"),
    ("tr", "Turkish"), ("vi", "Vietnamese"), ("zh-TW", "Traditional Chinese"),
]

ZH_CN = {
    "app_small_restaurant": "小型餐饮", "app_central_kitchen": "中央厨房",
    "app_canteen": "智慧食堂", "app_chain_restaurant": "连锁餐饮",
    "app_cloud_kitchen": "云厨房", "app_food_factory": "食品工厂",
    "app_menu_lab": "菜系实验室", "btn_back": "返回", "btn_view_details": "查看详情",
    "cases_all": "全部", "cases_filter_toggle": "筛选案例",
    "cases_labor_cost": "人工成本",
    "cases_no_results": "没有找到匹配的案例，试试调整筛选条件。",
    "cases_read_more": "阅读更多", "cases_read_story": "查看详情",
    "compare_bar_params": "参数", "compare_clear": "清空",
    "compare_max_selected": "最多只能选择 3 款产品进行对比",
    "compare_row_avg_time": "平均处理时间", "compare_row_category": "分类",
    "compare_row_dimensions": "尺寸", "compare_row_highlights": "产品亮点",
    "compare_row_model": "型号", "compare_row_name": "产品名称",
    "compare_row_power": "功率", "compare_row_specs": "产品规格",
    "compare_row_throughput": "产能", "compare_row_tier": "等级",
    "compare_row_voltage": "电压", "compare_row_weight": "净重",
    "compare_selected_count": "已选", "compare_view": "对比",
    "cross_sell_stirfry_cutting_reason": "切配后直接翻炒，备料到出餐无缝衔接",
    "cross_sell_stirfry_cutting_hl": "效率 +200%",
    "cross_sell_stirfry_steaming_reason": "蒸饭蒸菜同步进行，午高峰不排队",
    "cross_sell_stirfry_steaming_hl": "出餐 -40min",
    "cross_sell_stirfry_other_reason": "洗碗机+保温台，后厨动线一次到位",
    "cross_sell_stirfry_other_hl": "人手 -3人",
    "cross_sell_stirfry_stewing_reason": "炖汤+炒菜双线出餐，菜品更丰富",
    "cross_sell_stirfry_stewing_hl": "菜品 +30%",
    "cross_sell_cutting_stirfry_reason": "切好直接下锅，备料到烹饪零等待",
    "cross_sell_cutting_stirfry_hl": "效率 +180%",
    "cross_sell_cutting_steaming_reason": "切配+蒸煮一体化，前处理更高效",
    "cross_sell_cutting_steaming_hl": "备料 -60min",
    "cross_sell_cutting_other_reason": "传送带+分拣台，流水线式切配作业",
    "cross_sell_cutting_other_hl": "产能 +4倍",
    "cross_sell_frying_stirfry_reason": "炸+炒双线并行，出餐速度翻倍",
    "cross_sell_frying_stirfry_hl": "出餐 +100%",
    "cross_sell_frying_cutting_reason": "切配备料跟上油炸节奏，不缺料",
    "cross_sell_frying_cutting_hl": "备料 0等待",
    "cross_sell_frying_other_reason": "滤油台+排烟系统，油炸区干净整洁",
    "cross_sell_frying_other_hl": "油烟 -80%",
    "cross_sell_stewing_stirfry_reason": "炖汤+炒菜组合，满足多样化菜单",
    "cross_sell_stewing_hl": "菜品 +25%",
    "cross_sell_stewing_steaming_reason": "炖煮蒸饭同步，大锅饭不再手忙脚乱",
    "cross_sell_stewing_steaming_hl": "同步出餐",
    "cross_sell_stewing_cutting_reason": "自动切配炖菜食材，规格统一味道稳",
    "cross_sell_stewing_cutting_hl": "口味一致",
    "cross_sell_steaming_stirfry_reason": "蒸+炒搭档，炒菜蒸饭同时搞定",
    "cross_sell_steaming_stirfry_hl": "效率 +150%",
    "cross_sell_steaming_cutting_reason": "蒸前切配自动完成，食材现切现蒸",
    "cross_sell_steaming_cutting_hl": "鲜度提升",
    "cross_sell_steaming_stewing_reason": "蒸+炖组合，汤饭粥一灶全出",
    "cross_sell_steaming_stewing_hl": "一灶多用",
    "cross_sell_steaming_other_reason": "保温分餐台搭配蒸柜，热菜直达窗口",
    "cross_sell_steaming_other_hl": "温度不降",
    "cross_sell_other_stirfry_reason": "核心烹饪+辅助设备，后厨全套配齐",
    "cross_sell_other_stirfry_hl": "一站式",
    "cross_sell_other_cutting_reason": "切配+辅助传送，流水线完整配置",
    "cross_sell_other_cutting_hl": "流水线化",
    "cross_sell_other_steaming_reason": "蒸柜+保温台，从蒸到分餐不断链",
    "cross_sell_other_steaming_hl": "温度可控",
    "cross_sell_subtitle": "买了{cat}的客户还配了",
    "cross_sell_title": "搭配推荐",
    "no_core_products": "暂无核心产品",
    "no_core_products_data": "暂无核心产品数据",
    "products_inquire": "询价", "products_starting_price": "起步价",
    "recommended_products": "推荐产品",
    "scene_entry_subtitle": "看看这些场景怎么用我们的设备",
    "scene_entry_title": "适用场景",
    "scene_stirfry_small_restaurant": "2-5人的小厨房，一台炒菜机替代3个厨师",
    "scene_stirfry_canteen": "食堂午高峰500-5000人，90分钟出完热餐",
    "scene_stirfry_central_kitchen": "中央厨房大批量生产，口味标准化统一",
    "scene_cutting_central_kitchen": "千份备料，切配规格统一如一",
    "scene_cutting_food_factory": "食品工厂流水线切配，日产能提升6倍",
    "scene_cutting_canteen": "食堂蔬菜自动切配，2小时变20分钟",
    "scene_frying_small_restaurant": "快速出炸鸡薯条，外卖高峰不积压",
    "scene_frying_chain_restaurant": "全门店炸品标准化统一出品",
    "scene_frying_cloud_kitchen": "多品牌云厨房共享炸炉，轮流出餐",
    "scene_stewing_canteen": "食堂炖锅一次出餐千份",
    "scene_stewing_central_kitchen": "中央厨房大批量炖煮，口味始终如一",
    "scene_stewing_chain_restaurant": "招牌炖品每家门店味道一致",
    "scene_steaming_canteen": "食堂蒸饭蒸菜同步出，千份轻松搞定",
    "scene_steaming_central_kitchen": "中央厨房批量蒸制，保鲜密封配送",
    "scene_steaming_food_factory": "食品工厂蒸制工序全自动化温控",
    "scene_other_canteen": "洗碗分餐一体，后厨人手砍半",
    "scene_other_chain_restaurant": "全门店排烟清洁标准化统一",
    "scene_other_central_kitchen": "中央厨房传送带+包装，全自动",
    "scene_all_small_restaurant": "2-5人的小厨房，一台炒菜机替代3个厨师",
    "scene_all_canteen": "食堂午高峰500-5000人，90分钟出完热餐",
    "scene_all_central_kitchen": "中央厨房大批量生产，口味标准化统一",
    "scene_all_chain_restaurant": "连锁门店统一出品，不再依赖厨师",
    "scene_all_cloud_kitchen": "外卖云厨房，单店日接3000+单",
    "scene_all_food_factory": "食品工厂自动化产线，日产万份以上",
    "scene_all_menu_lab": "菜系实验室，一键复刻全球风味",
}

PROMPT = """你是精通中文和{lang}的UI本地化专家。把中文网站界面文本翻译成{lang}。
这是一家商用厨房设备公司（YuKoLi）的官网。
## 规则
- 输出纯JSON，保留全部键，只翻译值，不要```标记
- cross_sell_*_hl（高亮标签）尽量简短，保留数字符号（+200%、-80%）
- cross_sell_*_reason（推荐理由）适当本地化
- scene_*（场景描述）保持营销感
- compare_row_*（表格列名）用最短词
- 占位符{cat}原样保留
- 品牌名YuKoLi保留
现在翻译："""


def call_api(system_prompt, batch_dict):
    up = json.dumps(batch_dict, ensure_ascii=False)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(API_URL,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
                json={"model": MODEL, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": up}],
                      "max_tokens": 8192, "temperature": 0.1}, timeout=API_TIMEOUT)
            if resp.status_code != 200:
                print(f"  HTTP {resp.status_code} retry {attempt}", flush=True)
                if attempt < MAX_RETRIES: time.sleep(2 * attempt)
                continue
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)
            translated = json.loads(raw)
            orig_keys = set(batch_dict.keys())
            trans_keys = set(translated.keys())
            missing = orig_keys - trans_keys
            if missing:
                for k in missing:
                    translated[k] = batch_dict[k]
            translated = {k: v for k, v in translated.items() if k in orig_keys}
            return translated
        except requests.exceptions.Timeout:
            print(f"  timeout retry {attempt}", flush=True)
            if attempt < MAX_RETRIES: time.sleep(3 * attempt)
        except Exception as e:
            print(f"  error: {e}", flush=True)
            if attempt < MAX_RETRIES: time.sleep(2 * attempt)
    return {}


def main():
    t_total = time.time()

    # Phase 1: zh-CN
    path_zh = os.path.join(LANG_DIR, "zh-CN-ui.json")
    with open(path_zh, "r", encoding="utf-8") as f:
        data_zh = json.load(f)
    added_zh = 0
    for k, v in ZH_CN.items():
        if k not in data_zh:
            data_zh[k] = v
            added_zh += 1
    if added_zh:
        with open(path_zh, "w", encoding="utf-8") as f:
            json.dump(data_zh, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(f"zh-CN: +{added_zh} keys → {len(data_zh)} total", flush=True)

    # Phase 2: Translate each language
    items = list(ZH_CN.items())
    batches_list = [items[i:i+BATCH_SIZE] for i in range(0, len(items), BATCH_SIZE)]
    print(f"Translating {len(items)} keys in {len(batches_list)} batches × {len(TARGET_LANGUAGES)} langs", flush=True)

    for lang_code, lang_name in TARGET_LANGUAGES:
        t0 = time.time()
        path = os.path.join(LANG_DIR, f"{lang_code}-ui.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        missing = {k: ZH_CN[k] for k in ZH_CN if k not in data}
        if not missing:
            print(f"  {lang_code} ({lang_name}): already synced", flush=True)
            continue

        miss_items = list(missing.items())
        miss_batches = [miss_items[i:i+BATCH_SIZE] for i in range(0, len(miss_items), BATCH_SIZE)]
        sp = PROMPT.replace("{lang}", lang_name)
        ok = 0
        fail = 0
        for bi, batch in enumerate(miss_batches):
            batch_dict = dict(batch)
            result = call_api(sp, batch_dict)
            if result:
                for k, v in batch:
                    data[k] = result.get(k, v)
                ok += len(batch)
            else:
                for k, v in batch:
                    data[k] = v  # fallback to Chinese
                fail += len(batch)
            sys.stdout.write(f"  {lang_code}: {ok}/{len(missing)}")
            sys.stdout.flush()

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

        elapsed = time.time() - t0
        print(f" {lang_code}: +{len(missing)} keys ({elapsed:.0f}s) ok={ok} fail={fail}", flush=True)

    # Phase 3: Verify
    print("\nVerify:", flush=True)
    import glob
    for fp in sorted(glob.glob(os.path.join(LANG_DIR, "*-ui.json"))):
        lang = os.path.basename(fp).replace("-ui.json", "")
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
        missing = [k for k in ZH_CN if k not in data]
        empty = [k for k in ZH_CN if k in data and not data[k].strip()]
        s = "✅" if not missing and not empty else "⚠️"
        note = ""
        if missing: note += f" miss={len(missing)}"
        if empty: note += f" empty={len(empty)}"
        print(f"  {s} {lang}: {len(data)} keys{note}", flush=True)

    print(f"\nDone in {(time.time()-t_total)/60:.1f} min", flush=True)


if __name__ == "__main__":
    main()

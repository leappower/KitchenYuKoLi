#!/usr/bin/env python3
"""
generate-product-placeholders.py
为 YuKoLi 产品页生成占位图片。
当真实产品图不可用时，生成带有产品名称和品牌色背景的 SVG 风格占位图。
后续替换为真实产品图时，只需更新 src 属性即可。
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 输出目录
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'images', 'products')
os.makedirs(OUT_DIR, exist_ok=True)

# 品牌色
BRAND_COLOR = (236, 91, 19)  # #ec5b13
DARK_BG = (30, 30, 40)
LIGHT_BG = (245, 245, 248)

# 产品占位图配置
PRODUCTS = {
    # 首页 Hero 展示的4款产品
    "esl-gq90": {"name": "ESL-GQ90", "desc": "全自动语音炒菜机", "size": (800, 600)},
    "esl-xc120": {"name": "ESL-XC120", "desc": "搅拌炒锅炖烩机", "size": (800, 600)},
    "esl-gb80": {"name": "ESL-GB80", "desc": "座地式电磁爆炒机", "size": (800, 600)},
    "y50-fryer": {"name": "Y50", "desc": "升降油炸炉", "size": (800, 600)},
    # 产品页展示的6款产品
    "esl-pzj120": {"name": "ESL-PZJ120", "desc": "漂烫焯水油炸机", "size": (800, 600)},
    "y40-fryer": {"name": "Y40", "desc": "升降双缸油炸炉", "size": (800, 600)},
    "esl-xc60": {"name": "ESL-XC60", "desc": "智能搅拌炒锅", "size": (800, 600)},
    "m-series": {"name": "M系列", "desc": "智能煮面炉", "size": (800, 600)},
    "esl-bxc800": {"name": "ESL-BXC800", "desc": "旋转翻炒大炒锅", "size": (800, 600)},
}

# 分类图标（用简单图形代替）
CATEGORY_ICONS = {
    "stirfry": "🔥",   # 炒菜
    "cutting": "🔪",   # 切配
    "frying": "🍳",    # 煎炸
    "stewing": "🍲",   # 炖煮
    "steaming": "♨️",  # 蒸煮
    "other": "🔧",     # 其他
}


def create_placeholder(product_id: str, config: dict):
    """生成单个产品占位图"""
    w, h = config["size"]
    img = Image.new("RGB", (w, h), DARK_BG)
    draw = ImageDraw.Draw(img)

    # 绘制品牌色边框
    border = 4
    draw.rectangle([border, border, w - border, h - border], outline=BRAND_COLOR, width=border)

    # 绘制中央区域（模拟产品轮廓的抽象图形）
    cx, cy = w // 2, h // 2 - 20

    # 绘制一个简化的厨具轮廓（圆形锅体 + 支架）
    # 锅体
    draw.ellipse([cx - 120, cy - 80, cx + 120, cy + 80], outline=BRAND_COLOR, width=3)
    # 支架
    draw.rectangle([cx - 140, cy + 80, cx + 140, cy + 100], fill=BRAND_COLOR)
    # 底座
    draw.rectangle([cx - 100, cy + 100, cx - 80, cy + 140], fill=BRAND_COLOR)
    draw.rectangle([cx + 80, cy + 100, cx + 100, cy + 140], fill=BRAND_COLOR)

    # 绘制品牌标志
    draw.text((cx - 30, 20), "YuKoLi", fill=BRAND_COLOR)

    # 产品型号
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    name = config["name"]
    desc = config["desc"]
    draw.text((cx - len(name) * 10, h - 90), name, fill="white", font=font_large)
    draw.text((cx - len(desc) * 6, h - 45), desc, fill=(180, 180, 180), font=font_small)

    # "产品图占位" 标注
    draw.text((10, h - 25), "Placeholder - Replace with real product photo", fill=(100, 100, 100))

    filepath = os.path.join(OUT_DIR, f"{product_id}.png")
    img.save(filepath, "PNG", optimize=True)
    print(f"  ✅ {filepath} ({w}x{h})")
    return filepath


def main():
    print(f"📦 生成 {len(PRODUCTS)} 张产品占位图 → {OUT_DIR}")
    for pid, cfg in PRODUCTS.items():
        create_placeholder(pid, cfg)
    print(f"\n✅ 完成！替换真实图片时，更新 HTML 中的 src 属性即可。")


if __name__ == "__main__":
    main()

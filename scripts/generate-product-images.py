#!/usr/bin/env python3
"""
generate-product-images.py - 生成专业级产品占位图
用 Pillow 绘制商用厨具风格的占位图，后续替换为真实产品图时只需更新 src 属性。
输出: src/assets/images/products/{product_id}.webp
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'images', 'products')
os.makedirs(OUT_DIR, exist_ok=True)

# 品牌色
BRAND = (236, 91, 19)      # #ec5b13
BRAND_LIGHT = (255, 200, 160)
BG_DARK = (25, 28, 35)
BG_CARD = (35, 39, 48)
WHITE = (255, 255, 255)
GRAY = (160, 165, 175)
GRAY_LIGHT = (80, 85, 95)

W, H = 800, 600  # 4:3

PRODUCTS = [
    # (filename, model, subtitle, category_icon_char, bg_tint)
    ("esl-gq90",   "ESL-GQ90",   "全自动语音炒菜机",     "全自动", BRAND),
    ("esl-xc120",  "ESL-XC120",  "搅拌炒锅炖烩机",     "多功能", (60, 140, 80)),
    ("esl-gb80",   "ESL-GB80",   "座地式电磁爆炒机",   "大容量", (180, 60, 60)),
    ("y50-fryer",  "Y50",        "升降油炸炉",         "精准控温", (200, 160, 40)),
    ("esl-pzj120", "ESL-PZJ120", "漂烫焯水油炸一体机", "预处理", (40, 120, 180)),
    ("y40-fryer",  "Y40",        "升降双缸油炸炉",     "油水分离", (200, 160, 40)),
    ("esl-xc60",   "ESL-XC60",   "智能搅拌炒锅",       "炖烩", (60, 140, 80)),
    ("m-series",   "M系列",      "智能煮面炉",         "蒸煮", (100, 80, 180)),
    ("esl-bxc800", "ESL-BXC800", "旋转翻炒大炒锅",     "大产量", BRAND),
]


def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """Draw rounded rectangle"""
    x0, y0, x1, y1 = xy
    r = radius
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=fill)
    if outline:
        draw.arc([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=outline, width=width)
        draw.arc([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=outline, width=width)
        draw.arc([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=outline, width=width)
        draw.arc([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=outline, width=width)
        draw.line([x0 + r, y0, x1 - r, y0], fill=outline, width=width)
        draw.line([x0 + r, y1, x1 - r, y1], fill=outline, width=width)
        draw.line([x0, y0 + r, x0, y1 - r], fill=outline, width=width)
        draw.line([x1, y0 + r, x1, y1 - r], fill=outline, width=width)


def draw_appliance_shape(draw, cx, cy, color):
    """Draw a stylized commercial kitchen appliance silhouette"""
    # Machine body (rounded rectangle)
    bw, bh = 240, 160
    draw_rounded_rect(draw, [cx - bw//2, cy - bh//2, cx + bw//2, cy + bh//2], 20, fill=BG_CARD, outline=color, width=3)

    # Control panel (top bar)
    draw_rounded_rect(draw, [cx - bw//2 + 20, cy - bh//2 + 15, cx + bw//2 - 20, cy - bh//2 + 45], 8,
                      fill=color, outline=None)
    # Screen dots on panel
    for i in range(5):
        x = cx - 80 + i * 40
        draw.ellipse([x - 4, cy - bh//2 + 22, x + 4, cy - bh//2 + 38], fill=WHITE)

    # Cooking vessel (ellipse at bottom)
    draw.ellipse([cx - 80, cy - 20, cx + 80, cy + 50], outline=color, width=3)
    # Steam wisps
    for i in range(3):
        sx = cx - 30 + i * 30
        for j in range(3):
            y = cy - 30 - j * 18
            alpha_color = tuple(min(255, c + 60 + j * 20) for c in GRAY_LIGHT)
            draw.ellipse([sx - 3 + j * 2, y - 2, sx + 3 + j * 2, y + 2], fill=alpha_color)

    # Base/stand
    draw_rounded_rect(draw, [cx - bw//2 + 30, cy + bh//2 - 5, cx + bw//2 - 30, cy + bh//2 + 10], 5, fill=color)
    draw.rectangle([cx - 60, cy + bh//2 + 10, cx - 40, cy + bh//2 + 35], fill=GRAY_LIGHT)
    draw.rectangle([cx + 40, cy + bh//2 + 10, cx + 60, cy + bh//2 + 35], fill=GRAY_LIGHT)


def try_font(size, bold=False):
    """Try to load a good font"""
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except:
            continue
    return ImageFont.load_default()


def generate_one(pid, model, subtitle, badge, tint):
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Subtle radial gradient background
    for r in range(300, 0, -2):
        alpha = max(0, 15 - r // 20)
        color = tuple(min(255, c // 6 + alpha) for c in tint)
        draw.ellipse([W//2 - r, H//2 - r - 30, W//2 + r, H//2 + r - 30], fill=color)

    # Draw appliance
    draw_appliance_shape(draw, W // 2, H // 2 - 20, tint)

    # Brand watermark top-left
    font_sm = try_font(16, bold=True)
    draw.text((24, 20), "YuKoLi", fill=tint, font=font_sm)

    # Badge (top-right)
    font_badge = try_font(13, bold=True)
    badge_w = len(badge) * 14 + 20
    draw_rounded_rect(draw, [W - badge_w - 20, 18, W - 20, 42], 10, fill=tint, outline=None)
    draw.text((W - badge_w - 10, 20), badge, fill=WHITE, font=font_badge)

    # Model name (bottom)
    font_model = try_font(32, bold=True)
    model_w = len(model) * 20
    draw.text(((W - model_w) // 2, H - 100), model, fill=WHITE, font=font_model)

    # Subtitle
    font_sub = try_font(18)
    sub_w = len(subtitle) * 12
    draw.text(((W - sub_w) // 2, H - 55), subtitle, fill=GRAY, font=font_sub)

    # Bottom hint bar
    draw.rectangle([0, H - 22, W, H], fill=(20, 22, 28))
    font_hint = try_font(11)
    draw.text((12, H - 18), "PRODUCT PLACEHOLDER — Replace with real photo", fill=(70, 75, 85), font=font_hint)

    # Save as webp (better compression)
    out = os.path.join(OUT_DIR, f"{pid}.webp")
    img.save(out, "WEBP", quality=85)
    return out


if __name__ == "__main__":
    print(f"📦 生成 {len(PRODUCTS)} 张产品占位图...")
    for pid, model, sub, badge, tint in PRODUCTS:
        path = generate_one(pid, model, sub, badge, tint)
        print(f"  ✅ {path}")
    print("✅ 完成")

#!/usr/bin/env python3
"""
BrewYuKoLi — add srcset to all <img> tags in static HTML pages.

Usage:
    python3 scripts/add-srcset.py src/pages

For each HTML file, detects device type from filename suffix:
  - Mobile:   *_mobile.html   => 375w, 828w
  - Tablet:   *_tablet.html   => 828w, 1200w
  - PC:       *_pc.html       => 1200w, 1920w (hero images can have 2048w)

Adds missing srcset and sizes attributes to every <img> tag with a valid image src.
Skips images that already have srcset.
"""
import os
import re
import sys

# ── Device-level srcset config ──
DEVICE_CONFIG = {
    "mobile": {
        "widths": [375, 828],
        "default_sizes": "calc(100vw - 32px)",  # full-width with margin
    },
    "tablet": {
        "widths": [828, 1200],
        "default_sizes": "calc(100vw - 32px)",
    },
    "pc": {
        "widths": [1200, 1920],
        "default_sizes": "calc(100vw - 32px)",
    },
}

# Hero images on PC can optionally include 2048w
HERO_KEYWORDS = ["hero"]

# Image extensions that should get srcset
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".avif", ".gif"}


def detect_device(filename):
    """Detect device type from filename. Returns 'mobile', 'tablet', 'pc', or None."""
    base = os.path.basename(filename)
    if re.search(r'[_-]mobile\.html$', base, re.IGNORECASE):
        return "mobile"
    if re.search(r'[_-]tablet\.html$', base, re.IGNORECASE):
        return "tablet"
    if re.search(r'[_-]pc\.html$', base, re.IGNORECASE):
        return "pc"
    return None


def is_hero_image(src_path):
    """Check if an image path contains hero keywords."""
    return any(kw in src_path.lower() for kw in HERO_KEYWORDS)


def build_srcset(base_src, widths):
    """Build a srcset string from an image source and list of widths.
    Strips the extension and appends -{width}w before it.
    E.g., /assets/images/hero-pc.webp with [1200, 1920]
    => /assets/images/hero-pc-1200w.webp 1200w, /assets/images/hero-pc-1920w.webp 1920w
    """
    clean_src = base_src.lstrip("/")
    root, ext = os.path.splitext(clean_src)
    parts = []
    for w in widths:
        parts.append(f"/{root}-{w}w{ext} {w}w")
    return ", ".join(parts)


def determine_sizes(img_tag_text, device):
    """
    Determine the sizes attribute for an image.
    - Full-width images (judged by class containing 'w-full'): calc(100vw - 32px)
    - Card images (judged by fixed-width containers): use actual display width
    """
    config = DEVICE_CONFIG[device]
    default_sizes = config["default_sizes"]
    
    return default_sizes


def process_html(filepath):
    """Process a single HTML file, adding srcset to all <img> tags."""
    device = detect_device(filepath)
    if not device:
        print(f"  SKIP (unknown device): {filepath}")
        return False

    config = DEVICE_CONFIG[device]
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Count total img tags
    img_count = content.count("<img")
    
    if img_count == 0:
        print(f"  SKIP (no img tags): {filepath}")
        return False

    # Regex to find img tags — handles both <img ... /> and <img ... > (with or without closing)
    # We need to handle multiline img tags
    img_pattern = re.compile(r'(<img\b[^>]*?)(/?>)', re.DOTALL | re.IGNORECASE)
    
    changes = 0
    skipped = 0

    def replace_img(match):
        nonlocal changes, skipped
        tag_start = match.group(1)
        tag_end = match.group(2)
        tag_text = match.group(0)
        
        # Already has srcset?
        if re.search(r'\bsrcset\s*=', tag_start, re.IGNORECASE):
            skipped += 1
            return tag_text
        
        # Must have a src attribute
        src_match = re.search(r'\bsrc\s*=\s*"([^"]*)"', tag_start, re.IGNORECASE)
        if not src_match:
            skipped += 1
            return tag_text
        
        src_path = src_match.group(1)
        
        # Only process image files
        ext = os.path.splitext(src_path)[1].lower()
        if ext not in IMAGE_EXTS:
            skipped += 1
            return tag_text
        
        # Check if it's already an image with resolution suffixes (e.g., image@2x.webp)
        if re.search(r'[@-]\d+x\.', src_path, re.IGNORECASE):
            skipped += 1
            return tag_text
        
        # Build srcset
        widths = list(config["widths"])
        
        # PC hero images can include 2048w
        if device == "pc" and is_hero_image(src_path) and 2048 not in widths:
            widths.append(2048)
        
        srcset = build_srcset(src_path, widths)
        sizes = determine_sizes(tag_text, device)
        
        # Insert srcset and sizes before the closing > of the tag
        # If the tag ends with />, insert before />
        # If >, insert before >
        if tag_end == "/>":
            new_tag = tag_start + f'\n  srcset="{srcset}"\n  sizes="{sizes}"\n' + "/>"
        else:
            new_tag = tag_start + f'\n  srcset="{srcset}"\n  sizes="{sizes}"\n' + ">"
        
        changes += 1
        return new_tag

    new_content = img_pattern.sub(replace_img, content)
    
    if changes > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  ✅ {filepath} ({device}, {changes} imgs updated, {skipped} skipped)")
    else:
        print(f"  SKIP (no applicable imgs): {filepath}")
    
    return changes > 0


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 add-srcset.py <directory>")
        sys.exit(1)
    
    root = sys.argv[1]
    if not os.path.isdir(root):
        print(f"Error: {root} is not a directory")
        sys.exit(1)
    
    total_files = 0
    total_changes = 0
    
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in sorted(filenames):
            if not fn.endswith(".html"):
                continue
            filepath = os.path.join(dirpath, fn)
            if process_html(filepath):
                total_files += 1
                total_changes += 1
    
    print(f"\nDone. Updated {total_files} files.")


if __name__ == "__main__":
    main()

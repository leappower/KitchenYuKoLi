#!/usr/bin/env python3
"""
BrewYuKoLi — add srcset to all <img> tags in static HTML pages.

Usage:
    python3 scripts/add-srcset.py src/pages
    python3 scripts/add-srcset.py src/pages --rebuild

For each HTML file, detects device type from filename suffix:
  - Mobile:   *_mobile.html   => 375w, 828w
  - Tablet:   *_tablet.html   => 828w, 1200w
  - PC:       *_pc.html       => 1200w, 1920w

Uses _srcset-manifest.json to determine which resized images actually exist.
Adds missing srcset and sizes attributes to every <img> tag with a valid image src.
Skips images that already have srcset.

With --rebuild: strips existing srcset/sizes and rebuilds from manifest.
"""
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')
SOURCE_IMG_DIR = os.path.join(PROJECT_ROOT, 'src', 'assets', 'images')
MANIFEST_PATH = os.path.join(PROJECT_ROOT, 'src', 'assets', 'js', '_srcset-manifest.json')

# ── Device-level srcset config ──
DEVICE_CONFIG = {
    "mobile": {
        "widths": [375, 828],
        "default_sizes": "calc(100vw - 32px)",
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

# Image extensions that should get srcset
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".avif", ".gif"}


def load_manifest():
    """Load _srcset-manifest.json. Returns dict mapping img path → list of widths."""
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r') as f:
            return json.load(f)
    print(f"⚠️ Manifest not found: {MANIFEST_PATH}")
    return {}


def detect_device(filename):
    """Detect device type from filename."""
    base = os.path.basename(filename)
    if re.search(r'[_-]mobile\.html$', base, re.IGNORECASE):
        return "mobile"
    if re.search(r'[_-]tablet\.html$', base, re.IGNORECASE):
        return "tablet"
    if re.search(r'[_-]pc\.html$', base, re.IGNORECASE):
        return "pc"
    return None


def build_srcset(src_path, device_widths, manifest):
    """Build srcset from manifest data.
    Only includes widths that exist in the manifest for this image.
    """
    clean = src_path.lstrip('/')
    available = manifest.get(clean, [])
    if not available:
        return ''
    # Pick widths from device preference that exist in manifest
    widths = [w for w in device_widths if w in available]
    if not widths:
        widths = available[-2:]  # fallback: last 2 available
    if not widths:
        return ''
    root, ext = os.path.splitext(clean)
    parts = [f'/{root}-{w}w{ext} {w}w' for w in widths]
    return ', '.join(parts)


def process_html(filepath, manifest, rebuild=False):
    """Process a single HTML file, adding srcset to all <img> tags."""
    device = detect_device(filepath)
    if not device:
        return False

    config = DEVICE_CONFIG[device]

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<img' not in content:
        return False

    img_pattern = re.compile(r'(<img\b[^>]*?)(/?>)', re.DOTALL | re.IGNORECASE)
    changes = 0
    skipped = 0
    warnings = 0

    def replace_img(match):
        nonlocal changes, skipped, warnings
        tag_start = match.group(1)
        tag_end = match.group(2)
        tag_text = match.group(0)

        # With --rebuild: strip existing srcset/sizes and rebuild
        if rebuild:
            tag_start = re.sub(r'\s+srcset\s*=\s*"[^"]*"', '', tag_start, flags=re.IGNORECASE)
            tag_start = re.sub(r'\s+sizes\s*=\s*"[^"]*"', '', tag_start, flags=re.IGNORECASE)
        elif re.search(r'\bsrcset\s*=', tag_start, re.IGNORECASE):
            skipped += 1
            return tag_text

        src_match = re.search(r'\bsrc\s*=\s*"([^"]*)"', tag_start, re.IGNORECASE)
        if not src_match:
            skipped += 1
            return tag_text

        src_path = src_match.group(1)
        ext = os.path.splitext(src_path)[1].lower()
        if ext not in IMAGE_EXTS:
            skipped += 1
            return tag_text

        if re.search(r'[@-]\d+x\.', src_path, re.IGNORECASE):
            skipped += 1
            return tag_text

        srcset = build_srcset(src_path, config['widths'], manifest)
        if not srcset:
            skipped += 1
            return tag_text

        sizes = config['default_sizes']

        if tag_end == '/>':
            new_tag = tag_start + f'\n  srcset="{srcset}"\n  sizes="{sizes}"\n' + "/>"
        else:
            new_tag = tag_start + f'\n  srcset="{srcset}"\n  sizes="{sizes}"\n' + ">"

        changes += 1
        return new_tag

    new_content = img_pattern.sub(replace_img, content)

    if changes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        total = content.count('<img')
        print(f'  ✅ {os.path.relpath(filepath, PROJECT_ROOT)} ({device}: {changes}/{total} imgs)')
    else:
        print(f'  ⏭ {os.path.relpath(filepath, PROJECT_ROOT)} (all skipped)')

    return changes > 0


def main():
    if len(sys.argv) < 2:
        print('Usage: python3 add-srcset.py <directory> [--rebuild]')
        sys.exit(1)

    root = sys.argv[1]
    if not os.path.isdir(root):
        print(f'Error: {root} is not a directory')
        sys.exit(1)

    rebuild = '--rebuild' in sys.argv

    print(f'Loading manifest: {MANIFEST_PATH}')
    manifest = load_manifest()
    print(f'Manifest: {len(manifest)} images\n')

    total_files = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in sorted(filenames):
            if not fn.endswith('.html'):
                continue
            filepath = os.path.join(dirpath, fn)
            if process_html(filepath, manifest, rebuild=rebuild):
                total_files += 1

    print(f'\nDone. Updated {total_files} files.')


if __name__ == '__main__':
    main()

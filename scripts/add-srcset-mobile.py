#!/usr/bin/env python3
"""
BrewYuKoLi — add srcset to mobile HTML pages (supplementary pass).

Targets only *-mobile.html / *_mobile.html files, adding:
  srcset="...-375w.webp 375w, ...-828w.webp 828w"
  sizes="calc(100vw - 32px)"

Skips images that already have srcset.
Run after add-srcset.py to ensure complete mobile coverage.

Usage:
    python3 scripts/add-srcset-mobile.py src/pages
"""
import os
import re
import sys

IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".avif", ".gif"}


def build_srcset(base_src, widths):
    """Build a srcset string with -{width}w suffix before extension."""
    clean_src = base_src.lstrip("/")
    root, ext = os.path.splitext(clean_src)
    parts = []
    for w in widths:
        parts.append(f"/{root}-{w}w{ext} {w}w")
    return ", ".join(parts)


def process_mobile(filepath):
    """Process a mobile HTML file for srcset (375w, 828w)."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    img_count = content.count("<img")
    if img_count == 0:
        return False

    img_pattern = re.compile(r'(<img\b[^>]*?)(/?>)', re.DOTALL | re.IGNORECASE)
    changes = 0
    skipped = 0

    def replace_img(match):
        nonlocal changes, skipped
        tag_text = match.group(0)
        tag_start = match.group(1)
        tag_end = match.group(2)

        # Skip if already has srcset
        if re.search(r'\bsrcset\s*=', tag_start, re.IGNORECASE):
            skipped += 1
            return tag_text

        # Must have image src
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

        srcset = build_srcset(src_path, [375, 828])
        sizes = 'calc(100vw - 32px)'

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
        print(f"  ✅ {filepath} ({changes} imgs updated, {skipped} skipped)")
    return changes > 0


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 add-srcset-mobile.py <directory>")
        sys.exit(1)
    root = sys.argv[1]
    if not os.path.isdir(root):
        print(f"Error: {root} is not a directory")
        sys.exit(1)

    total = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in sorted(filenames):
            if not (fn.endswith("-mobile.html") or fn.endswith("_mobile.html")):
                continue
            filepath = os.path.join(dirpath, fn)
            if process_mobile(filepath):
                total += 1
    print(f"\nMobile supplementary pass done. Updated {total} files.")


if __name__ == "__main__":
    main()

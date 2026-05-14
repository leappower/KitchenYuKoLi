#!/usr/bin/env python3
"""
Serial translator for KitchenYuKoLi - one language at a time.
Usage: PROVIDER=siliconflow python3 translate-serial.py
"""
import subprocess, json, os, glob, sys, time

LANG_DIR = "/Users/chee/Projects/KitchenYuKoLi/src/assets/lang"
SCRIPT = "/Users/chee/Projects/KitchenYuKoLi/translate-lang.js"
PROVIDER = os.environ.get("PROVIDER", "siliconflow")

def count_remaining(lang_file):
    count = 0
    with open(lang_file, 'r') as f:
        for line in f:
            if '"TRANSLATE:' in line:
                count += 1
    return count

def get_remaining_langs():
    langs = []
    for f in sorted(glob.glob(os.path.join(LANG_DIR, "*-ui.json"))):
        lang = os.path.basename(f).replace("-ui.json", "")
        remaining = count_remaining(f)
        if remaining > 0:
            langs.append((lang, remaining))
    return langs

def main():
    langs = get_remaining_langs()
    total_remaining = sum(r for _, r in langs)
    print(f"[{time.strftime('%H:%M:%S')}] {len(langs)} languages to translate, {total_remaining} keys total")
    for lang, remaining in langs:
        print(f"  {lang}: {remaining}")
    print()

    for lang, remaining in langs:
        lang_file = os.path.join(LANG_DIR, f"{lang}-ui.json")
        current_remaining = count_remaining(lang_file)
        if current_remaining == 0:
            print(f"[{time.strftime('%H:%M:%S')}] ⏭️ {lang} already done, skipping")
            continue

        print(f"[{time.strftime('%H:%M:%S')}] 🚀 Starting {lang} ({current_remaining} keys)")
        env = os.environ.copy()
        env["PROVIDER"] = PROVIDER
        log_path = f"/tmp/translate-{lang}.log"
        
        with open(log_path, "a") as log:
            proc = subprocess.Popen(
                ["node", SCRIPT, lang, "30", "600"],
                cwd="/Users/chee/Projects/KitchenYuKoLi",
                env=env,
                stdout=log,
                stderr=log
            )
            ret = proc.wait()
        
        new_remaining = count_remaining(lang_file)
        if new_remaining == 0:
            print(f"[{time.strftime('%H:%M:%S')}] ✅ {lang} complete!")
        elif ret != 0:
            print(f"[{time.strftime('%H:%M:%S')}] ❌ {lang} exit code {ret}, {new_remaining} remaining")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] ⚠️ {lang} finished, {new_remaining} still remaining")
        print()

    # Final summary
    still_remaining = get_remaining_langs()
    if not still_remaining:
        print(f"[{time.strftime('%H:%M:%S')}] 🎉 All languages complete!")
    else:
        total = sum(r for _, r in still_remaining)
        print(f"[{time.strftime('%H:%M:%S')}] 📋 Remaining: {len(still_remaining)} langs, {total} keys")
        for lang, r in still_remaining:
            print(f"  {lang}: {r}")

if __name__ == "__main__":
    main()

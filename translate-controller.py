#!/usr/bin/env python3
"""
Smart parallel translator controller for KitchenYuKoLi.
Spawns one worker per enabled provider, auto-balances language assignment.
Usage: python3 translate-controller.py
"""
import subprocess, json, os, glob, sys, time, threading, queue

LANG_DIR = "/Users/chee/Projects/KitchenYuKoLi/src/assets/lang"
SCRIPT = "/Users/chee/Projects/KitchenYuKoLi/translate-lang.js"
REPO = "/Users/chee/Projects/KitchenYuKoLi"

WORKERS = [
    {"name": "siliconflow", "provider": "siliconflow", "batch": 50, "delay": 500, "enabled": True},
    {"name": "zhipu2", "provider": "zhipu2", "batch": 50, "delay": 800, "enabled": True},
    {"name": "kuai", "provider": "kuai", "batch": 50, "delay": 500, "enabled": True},
]

# Track which languages are currently being worked on
in_progress = set()
lang_lock = threading.Lock()

# Provider error tracking: {provider: consecutive_failures}
provider_fails = {}
provider_lock = threading.Lock()

def count_remaining(lang):
    f = os.path.join(LANG_DIR, f"{lang}-ui.json")
    with open(f, 'r') as fh:
        return sum(1 for line in fh if '"TRANSLATE:' in line)

def get_all_remaining():
    result = {}
    for f in sorted(glob.glob(os.path.join(LANG_DIR, "*-ui.json"))):
        lang = os.path.basename(f).replace("-ui.json", "")
        cnt = count_remaining(lang)
        if cnt > 0:
            result[lang] = cnt
    return result

def mark_provider_fail(name):
    with provider_lock:
        provider_fails[name] = provider_fails.get(name, 0) + 1

def mark_provider_success(name):
    with provider_lock:
        provider_fails[name] = 0

def is_provider_blocked(name):
    with provider_lock:
        return provider_fails.get(name, 0) >= 3

def pick_next_lang():
    """Pick the language with most remaining keys (thread-safe)."""
    with lang_lock:
        remaining = get_all_remaining()
        if not remaining:
            return None, 0
        available = {k: v for k, v in remaining.items() if k not in in_progress}
        if not available:
            return None, 0
        lang = max(available, key=available.get)
        in_progress.add(lang)
        return lang, available[lang]

def release_lang(lang):
    with lang_lock:
        in_progress.discard(lang)

def worker_loop(w, status_queue):
    """Worker: pick next language, translate, repeat until all done."""
    name = w["name"]
    while True:
        if is_provider_blocked(name):
            status_queue.put(f"[{time.strftime('%H:%M:%S')}] 🛑 {name}: blocked (too many failures), idling 5 min")
            time.sleep(300)
            mark_provider_success(name)
            continue

        lang, remaining = pick_next_lang()
        if lang is None or remaining == 0:
            status_queue.put(f"[{time.strftime('%H:%M:%S')}] 🏁 {name}: all done!")
            break

        status_queue.put(f"[{time.strftime('%H:%M:%S')}] 🚀 {name} → {lang} ({remaining} keys)")

        env = os.environ.copy()
        env["PROVIDER"] = w["provider"]
        log_path = f"/tmp/translate-{lang}-{name}.log"

        with open(log_path, "a") as log:
            proc = subprocess.Popen(
                ["node", SCRIPT, lang, str(w["batch"]), str(w["delay"])],
                cwd=REPO, env=env, stdout=log, stderr=log
            )
            ret = proc.wait()

        new_remaining = count_remaining(lang)
        release_lang(lang)
        if new_remaining == 0:
            status_queue.put(f"[{time.strftime('%H:%M:%S')}] ✅ {name} → {lang} complete!")
            mark_provider_success(name)
        elif new_remaining < remaining:
            status_queue.put(f"[{time.strftime('%H:%M:%S')}] ⚠️ {name} → {lang}: {remaining}→{new_remaining}")
            mark_provider_success(name)
        else:
            status_queue.put(f"[{time.strftime('%H:%M:%S')}] ❌ {name} → {lang}: failed ({new_remaining} left)")
            mark_provider_fail(name)

def monitor(status_queue):
    """Print status messages."""
    while True:
        msg = status_queue.get()
        if msg == "DONE":
            break
        print(msg, flush=True)

def main():
    enabled = [w for w in WORKERS if w.get("enabled", True)]
    remaining = get_all_remaining()
    total = sum(remaining.values())
    print(f"[{time.strftime('%H:%M:%S')}] 📊 {len(remaining)} languages, {total} keys")
    for lang, cnt in sorted(remaining.items(), key=lambda x: -x[1]):
        print(f"  {lang}: {cnt}")
    print(f"[{time.strftime('%H:%M:%S')}] 🚀 {len(enabled)} workers: {[w['name'] for w in enabled]}")
    print()

    status_queue = queue.Queue()
    threads = []

    mon = threading.Thread(target=monitor, args=(status_queue,), daemon=True)
    mon.start()

    for w in enabled:
        t = threading.Thread(target=worker_loop, args=(w, status_queue))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    status_queue.put("DONE")

    final = get_all_remaining()
    if not final:
        print(f"\n[{time.strftime('%H:%M:%S')}] 🎉 ALL LANGUAGES COMPLETE!")
    else:
        total = sum(final.values())
        print(f"\n[{time.strftime('%H:%M:%S')}] 📋 Remaining: {len(final)} langs, {total} keys")
        for lang, cnt in sorted(final.items(), key=lambda x: -x[1]):
            print(f"  {lang}: {cnt}")

if __name__ == "__main__":
    main()

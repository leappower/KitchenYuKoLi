#!/usr/bin/env python3
"""Test key generation with simple counter."""
from collections import OrderedDict

def generate_key(prefix, counter, text_hint=""):
    return f"{prefix}_{counter}"

# Test
used_keys = set()
counter = 0
texts = ["产品对比", "产品对比", "选择最多", "已选0/3", "清空"]

for t in texts:
    key = generate_key("test", counter, t)
    actual = key + "_text" if "已选" in t else key
    iters = 0
    while actual in used_keys:
        counter += 1
        key = generate_key("test", counter, t)
        actual = key + "_text" if "已选" in t else key
        iters += 1
        if iters > 100:
            print("INFINITE LOOP!")
            break
    used_keys.add(actual)
    print(f"  {actual}")
    counter += 1

print(f"OK: {len(used_keys)} keys")

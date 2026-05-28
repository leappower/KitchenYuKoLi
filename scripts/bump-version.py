#!/usr/bin/env python3
"""bump-version.py — 替换 dist/ 中所有 HTML 的 ?v= 版本号
VERSION 环境变量应为纯数字或 "v=xxx" 格式，脚本自动去除已存在的 v= 前缀"""
import os, re, sys

root = os.environ.get('DIST', 'dist')
version = os.environ.get('VERSION', '0')
version = version.lstrip('v= ')  # preserve whatever format

cnt = 0
for r, d, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.html'):
            continue
        fp = os.path.join(r, f)
        with open(fp) as fh:
            c = fh.read()
        nc = re.sub(r'\?v=[a-zA-Z0-9._-]*', '?v=' + version, c)
        if nc != c:
            with open(fp, 'w') as fh:
                fh.write(nc)
            cnt += 1
print(f'Version bumped: {cnt} HTML files to v={version}')

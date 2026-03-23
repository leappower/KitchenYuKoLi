# 项目长期记忆 — KitchenYuKoLi

## 工作偏好

- **执行操作优先用脚本**：能用脚本完成的操作，不逐步手动执行。以最省 token 的方式运行，直接跑脚本拿结果。
- **多语言**：非特殊要求，只处理 zh-CN 和 en 两个语言文件，不批量修改其他 23 种语言。

## Release 流程

- release 脚本：`node scripts/release.js`，支持 `--skip-feishu --skip-translate --skip-download` 等参数
- 首次 release（v0.0.1）已于 2026-03-23 发布到 `origin/release/v0.0.1`
- **已知问题（已修复）**：
  - `.stylelintrc.json` 需存在（已创建）
  - `build:pack` 脚本已添加到 package.json

## Header / Footer 样式规范

- Logo 高度：h-9，与文字间距：gap-2
- 文字：text-xl font-black tracking-tighter uppercase，dark:text-slate-100
- Footer logo：h-7, gap-2, tracking-tighter

## 导航统一规范

- 文案统一用 'Equipment'（图标：kitchen）
- PC 导航 5 项：Solutions / Equipment / Case Studies / IoT / Support
- 所有版本：uppercase tracking-wider

## Service Worker 缓存

- 每次 release 版本变化时，sw.js 中三个缓存名会自动更新（release 脚本 Step 6b）
- 缓存名格式：language-files-vX-Y-Z / language-cache-vX-Y-Z / image-cache-vX-Y-Z

## 翻译 Key 状态

- 有效 key：347 个（从 703 个清理后）
- 相关脚本：find-unused-keys-v2.js / remove-unused-keys.js

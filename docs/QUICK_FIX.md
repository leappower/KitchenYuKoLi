[SpaRouter] Loading: /home/index-pc.html
[SpaRouter] Content rendered for: /home/index-pc.html
[SpaRouter] Loading: /catalog/index-pc.html
[SpaRouter] extractContent: body length before cleanup: 24813
[SpaRouter] extractContent: body length after cleanup: 24813
[SpaRouter] mountHeader: checking Navigator...
[SpaRouter] mountFooter: checking Footer...
[SpaRouter] mountFooter: Footer available: true
[SpaRouter] Loading: /home/index-pc.html
[SpaRouter] Loading: /catalog/index-pc.html
[SpaRouter] Content rendered for: /catalog/index-pc.html
Header/Footer 不显示？A: 检查组件脚本是否正确引用 (navigator.js, min-display-footer.js / footer.js)
# SPA 路由快速修复指南

**最后更新**: 2026-03-18
**适用版本**: dev-test 分支

---

## 🚨 立即执行

### 步骤 1: 停止当前服务器
```bash
# 在运行 npm start 的终端中
Ctrl+C
```

### 步骤 2: 重新构建项目
```bash
npm run build:dev
```

**预期输出**:
```
✅ 生成语言列表: dist/assets/lang/languages.json
   包含 25 种语言

========================================
  统计信息
========================================

UI文件数: 25
UI总大小: 280.63 KB
产品文件数: 26
产品总大小: 4066.42 KB
总计: 51 文件
```

### 步骤 3: 重启开发服务器
```bash
npm start
```

**预期输出**:
```
Server running at http://localhost:5000
Environment: development
```

### 步骤 4: 清除浏览器缓存
```
1. 打开 Chrome DevTools (F12)
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"
```

---

## 🔍 问题诊断

### 问题 1: Header logo 点击无效

**诊断步骤**:
1. 打开浏览器控制台
2. 点击 Header logo
3. 检查日志:
   - ✅ 应该看到: `[SpaRouter] Link clicked: /`
   - ✅ 应该看到: `[SpaRouter] SPA navigation triggered for: /`
   - ✅ 应该看到: `[SpaRouter] Navigating to: /home`

**如果没有日志**:
- 问题: 事件未被捕获
- 解决: 检查 z-index，确保元素可点击

**如果有日志但无跳转**:
- 问题: 路由逻辑错误
- 解决: 检查 `navigate()` 函数

### 问题 2: 页面空白

**诊断步骤**:
1. 检查控制台错误
2. 查看日志:
   - ✅ `[SpaRouter] Loading: /pages/home/index-pc.html`
   - ✅ `[SpaRouter] Fetch received: length= 29392`
   - ✅ `[SpaRouter] Content rendered for: ...`

**如果 fetch length 很小 (例如 2297)**:
- 问题: 加载了错误的文件 (index.html 而不是 index-pc.html)
- 解决: 检查 `getDevicePage()` 函数

**如果 container found: false**:
- 问题: DOM 元素未找到
- 解决: 检查 `index.html` 中的 `#spa-content`

### 问题 3: Header/Footer 不显示

**诊断步骤**:
1. 查看日志:
   - ✅ `[SpaRouter] mountHeader: MaxDisplayHeader available: true`
   - ✅ `[SpaRouter] mountFooter: MinDisplayFooter available: true`

**如果 available: false**:
- 问题: 组件脚本未加载
- 解决: 检查 `index.html` 中的脚本引用

**如果 component found: false**:
- 问题: HTML 中未找到组件
- 解决: 检查页面文件中的 `data-component` 属性

---

## 🛠️ 快速修复命令

### 重新编译所有文件
```bash
# 停止服务器
Ctrl+C

# 清理 dist
rm -rf dist && mkdir dist

# 重新构建
npm run build:dev

# 重启服务器
npm start
```

### 仅更新 SPA 路由
```bash
# 停止服务器
Ctrl+C

# 复制路由文件
cp src/assets/js/spa-router.js dist/assets/js/spa-router.js
cp src/index.html dist/index.html

# 重启服务器
npm start
```

### 清除浏览器缓存
```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

## 📊 预期日志输出

### 正常启动
```
[SpaRouter] Initializing...
[SpaRouter] Loading: /pages/home/index-pc.html
[SpaRouter] Fetch response: status= 200 content-type= text/html; charset=UTF-8
[SpaRouter] Fetch received: length= 29392
[SpaRouter] extractContent: body length before cleanup: 24813
[SpaRouter] extractContent: body length after cleanup: 24813
[SpaRouter] mountHeader: checking MaxDisplayHeader...
[SpaRouter] mountHeader: MaxDisplayHeader available: true
[SpaRouter] mountHeader: container found: true
[SpaRouter] mountHeader: header component found: true
[SpaRouter] mountHeader: header HTML injected
[SpaRouter] mountFooter: checking MinDisplayFooter...
[SpaRouter] mountFooter: MinDisplayFooter available: true
[SpaRouter] mountFooter: container found: true
[SpaRouter] mountFooter: footer component found: true
[SpaRouter] mountFooter: footer HTML injected
[SpaRouter] Initialized successfully
[SpaRouter] Content rendered for: /pages/home/index-pc.html
```

### Logo 点击
```
[SpaRouter] Link clicked: /
[SpaRouter] SPA navigation triggered for: /
[SpaRouter] Navigating to: /home
[SpaRouter] Loading: /pages/home/index-pc.html
[SpaRouter] Content rendered for: /pages/home/index-pc.html
```

### 路由切换 (Catalog)
```
[SpaRouter] Link clicked: /catalog
[SpaRouter] SPA navigation triggered for: /catalog
[SpaRouter] Navigating to: /catalog
[SpaRouter] Loading: /pages/catalog/index-pc.html
[SpaRouter] Content rendered for: /pages/catalog/index-pc.html
```

---

## 🐛 常见问题

### Q: 修改了代码但没生效？
A: 必须执行 4 个步骤: 停服务器 → 重新构建 → 重启服务器 → 清除缓存

### Q: 日志不显示？
A: 检查浏览器控制台是否开启 Verbose 日志级别

### Q: 页面一直空白？
A: 检查 `index.html` 中的 `#spa-content` 元素是否存在

### Q: Header/Footer 不显示？
A: 检查组件脚本是否正确引用 (max-display-header.js, min-display-footer.js)

### Q: 路由跳转后页面错乱？
A: 检查 z-index 层级，确保没有元素被遮挡

---

## 📞 寻求帮助

如果以上步骤无法解决问题：

1. **收集日志**: 复制浏览器控制台的所有日志
2. **截图**: 截取页面显示和错误信息
3. **提供信息**: 浏览器版本、设备类型、屏幕尺寸
4. **提交问题**: 附上以上信息

**关键日志**:
- [SpaRouter] Initializing...
- [SpaRouter] Loading: ...
- [SpaRouter] Content rendered for: ...
- [SpaRouter] Link clicked: ...
- [SpaRouter] mountHeader: ...
- [SpaRouter] mountFooter: ...

---

**文档维护**: Yukoli Development Team  
**最后更新**: 2026-03-18  
**版本**: 1.0

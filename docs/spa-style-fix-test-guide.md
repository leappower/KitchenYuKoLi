# SPA 样式修复测试指南

**目标**: 验证 SPA 导航后页面样式是否正常

---

## 🚀 快速测试

### 1. 启动开发服务器

```bash
cd "/Volumes/Extend HD/HTML-YuQL-Test"
npm run dev:fast
```

服务器将在 `http://localhost:5000` 启动

### 2. 浏览器测试

打开浏览器访问: `http://localhost:5000/`

#### 测试清单

##### ✅ 基础功能

- [ ] 首页加载正常
- [ ] Header 显示正常 (Logo + 导航菜单)
- [ ] Footer 显示正常 (内容区 + 底部导航)
- [ ] 页面样式正常 (Tailwind CSS 生效)

##### ✅ 页面导航

- [ ] 点击 "Home" 链接 → 跳转到首页
- [ ] 点击 "Equipment" 链接 → 跳转到产品目录
- [ ] 点击 "Case Studies" 链接 → 跳转到案例研究 **(重点测试)**
- [ ] 点击 "Support" 链接 → 跳转到支持页面

##### ✅ 样式验证

- [ ] **Case Studies 页面样式正常** (修复前样式会丢失)
- [ ] 所有页面 Header 样式一致
- [ ] 所有页面 Footer 样式一致
- [ ] 卡片、按钮、表单等组件样式正常

##### ✅ 交互功能

- [ ] 语言切换功能正常
- [ ] 响应式布局正常 (调整浏览器窗口大小)
- [ ] 悬浮按钮显示正常 (WhatsApp/LINE/回到顶部)

##### ✅ 浏览器历史记录

- [ ] 点击浏览器后退按钮 → 返回上一页
- [ ] 点击浏览器前进按钮 → 前进到下一页
- [ ] 页面历史记录正确

##### ✅ 性能测试

- [ ] 页面切换流畅无闪烁
- [ ] 骨架屏加载正常 (无白屏)
- [ ] Header/Footer 不重复加载

---

## 🔍 问题排查

### 问题 1: 页面样式仍然异常

**症状**: SPA 导航后样式丢失

**排查步骤**:

1. 打开浏览器开发者工具 (F12)
2. 查看 Console 控制台
3. 检查是否有 JavaScript 错误

**常见错误**:

```javascript
// 错误 1: SpaRouter 未定义
Uncaught ReferenceError: SpaRouter is not defined
```

**解决方案**: 确认 `spa-router.js` 文件已加载

```javascript
// 错误 2: 组件未加载
Uncaught ReferenceError: Navigator is not defined
```

**解决方案**: 确认 `navigator.js` 文件已加载

---

### 问题 2: 页面导航不工作

**症状**: 点击链接后页面不跳转

**排查步骤**:

1. 检查链接的 `href` 属性
2. 确认链接格式正确 (以 `/` 开头)

**正确的链接格式**:
```html
<a href="/case-studies/">Case Studies</a>
```

**错误的链接格式**:
```html
<a href="case-studies/">Case Studies</a>  <!-- 缺少前导斜杠 -->
```

---

### 问题 3: Header/Footer 不显示

**症状**: 页面加载后 Header 和 Footer 消失

**排查步骤**:

1. 打开浏览器开发者工具
2. 查看 Elements 面板
3. 检查 `<navigator>` 和 `<footer>` 元素是否存在

**解决方案**:

确认组件脚本已加载:
```html
<script src="/assets/js/ui/navigator.js"></script>
<script src="/assets/js/ui/footer.js"></script>
```

确认初始化脚本已执行:
```javascript
if (window.Navigator && window.Navigator.mount) {
  window.Navigator.mount();
}
```

---

## 📊 性能指标

### 预期性能

| 指标 | 目标值 |
|------|--------|
| 首次内容绘制 (FCP) | < 1.5s |
| 最大内容绘制 (LCP) | < 2.5s |
| 首次输入延迟 (FID) | < 100ms |
| 累积布局偏移 (CLS) | < 0.1 |

### 如何测量

1. 打开浏览器开发者工具 (F12)
2. 切换到 Performance 面板
3. 点击 Record 按钮
4. 执行页面导航操作
5. 停止录制
6. 查看 Core Web Vitals 指标

---

## 🎯 测试报告模板

```markdown
## 测试结果

**测试日期**: YYYY-MM-DD
**测试人员**: [姓名]
**浏览器**: [Chrome/Firefox/Safari] [版本号]

### 功能测试

- [x] 首页加载正常
- [x] Header 显示正常
- [x] Footer 显示正常
- [x] Case Studies 页面样式正常 ✅
- [x] 页面导航正常
- [x] 浏览器历史记录正常

### 性能测试

- FCP: [数值] ms
- LCP: [数值] ms
- FID: [数值] ms
- CLS: [数值]

### 问题记录

无问题 / 或描述发现的问题

### 结论

✅ 通过 / ❌ 不通过
```

---

## 🚨 紧急问题反馈

如果发现以下问题,请立即反馈:

1. **页面样式完全丢失** - 所有页面样式都不正常
2. **页面无法导航** - 点击链接无响应
3. **Header/Footer 消失** - 页面顶部和底部消失
4. **JavaScript 错误** - 控制台有大量错误

---

**测试完成时间**: [填写时间]
**测试人员**: [填写姓名]
**测试结果**: [通过/不通过]

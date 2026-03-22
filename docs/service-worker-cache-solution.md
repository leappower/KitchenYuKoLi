# Service Worker 缓存策略解决方案

## 📋 需求说明

- **开发环境** (`npm start`): 去掉 Service Worker 缓存策略
- **生产环境** (release): 保持 Service Worker 缓存策略

## 🔧 实现方案

### 1. 环境检测

Service Worker 通过以下方式检测环境：

```javascript
function isDevelopment() {
  // 方法 1: 通过环境变量（webpack 注入）
  if (typeof __DEVELOPMENT__ !== 'undefined' && __DEVELOPMENT__) {
    return true;
  }
  // 方法 2: 通过 hostname 判断
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return true;
  }
  // 方法 3: 通过 URL 路径判断
  const devServerPorts = ['8080', '3000', '3001', '5000', '9000'];
  if (devServerPorts.includes(self.location.port)) {
    return true;
  }
  return false;
}
```

### 2. Webpack 配置

在 `webpack.config.js` 中添加 DefinePlugin：

```javascript
new webpack.DefinePlugin({
  __DEVELOPMENT__: JSON.stringify(!isProduction && !isDevBuild),
})
```

### 3. Service Worker 行为

#### 开发环境 (`npm start`)

```javascript
if (DEV_MODE) {
  console.log('[SW] Development mode: skipping install caching');
  event.waitUntil(self.skipWaiting());
  return;
}
```

- ❌ 不执行 `install` 事件（不缓存文件）
- ❌ 不执行 `activate` 事件（不清理旧缓存）
- ❌ 不执行 `fetch` 事件（直接使用网络）
- ❌ 不处理缓存相关消息
- ✅ 支持热重载（HMR）

#### 生产环境 (`npm run build`)

```javascript
if (DEV_MODE) {
  return; // 跳过所有缓存逻辑
}
```

- ✅ 执行 `install` 事件（预缓存语言文件）
- ✅ 执行 `activate` 事件（清理旧缓存）
- ✅ 执行 `fetch` 事件（Cache First 策略）
- ✅ 处理缓存相关消息
- ✅ 支持离线访问

## 🚀 使用方法

### 开发模式

```bash
# 启动开发服务器（无缓存）
npm start

# 或使用其他开发命令
npm run dev:fast
npm run dev:webpack
```

**特点**:
- Service Worker 不会缓存任何文件
- 所有请求直接从网络获取
- 支持热重载和实时更新
- 适合开发调试

### 生产模式

```bash
# 构建生产版本（有缓存）
npm run build

# 构建并部署
npm run build:static

# 完整生产构建
npm run build:production
```

**特点**:
- Service Worker 预缓存语言文件
- 使用 Cache First 策略
- 支持离线访问
- 提高性能和用户体验

## 📊 缓存策略对比

| 功能 | 开发环境 | 生产环境 |
|------|---------|---------|
| 预缓存语言文件 | ❌ | ✅ |
| 图片缓存 (Cache First) | ❌ | ✅ |
| 外链图片缓存 (SWR) | ❌ | ✅ |
| 语言文件缓存 (Cache First) | ❌ | ✅ |
| 缓存清理 | ❌ | ✅ |
| 离线支持 | ❌ | ✅ |
| 热重载 (HMR) | ✅ | ❌ |
| 实时更新 | ✅ | ❌ |

## 🔍 验证方法

### 验证开发模式

1. 启动开发服务器：
   ```bash
   npm start
   ```

2. 打开浏览器控制台：
   ```javascript
   // 应该看到：
   [SW] Mode: DEVELOPMENT (cache disabled)
   ```

3. 检查 Network 面板：
   - 所有请求从网络获取
   - 没有 `from ServiceWorker` 标记

4. 修改文件并刷新：
   - 页面立即更新（无缓存影响）

### 验证生产模式

1. 构建生产版本：
   ```bash
   npm run build
   ```

2. 启动生产服务器：
   ```bash
   node server.js
   ```

3. 打开浏览器控制台：
   ```javascript
   // 应该看到：
   [SW] Mode: PRODUCTION (cache enabled)
   [SW] Pre-cached language files: [...]
   ```

4. 检查 Network 面板：
   - 语言文件有 `from ServiceWorker` 标记
   - 第二次加载时使用缓存

5. 测试离线访问：
   - 断开网络连接
   - 刷新页面
   - 页面仍然可用（已缓存的资源）

## 🛠️ 故障排查

### 问题 1: 开发环境仍然使用缓存

**症状**: 开发模式下仍然看到 `from ServiceWorker`

**解决方案**:
1. 清除浏览器缓存和 Service Worker：
   ```javascript
   // 在控制台执行
   caches.keys().then(keys => {
     keys.forEach(key => caches.delete(key));
   });
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
   });
   ```

2. 检查环境变量：
   ```javascript
   console.log(__DEVELOPMENT__); // 应该是 true
   ```

3. 重启开发服务器

### 问题 2: 生产环境没有缓存

**症状**: 生产模式下所有请求都从网络获取

**解决方案**:
1. 检查 Service Worker 注册：
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW Registration:', reg);
   });
   ```

2. 检查控制台日志：
   ```javascript
   // 应该看到：
   [SW] Mode: PRODUCTION (cache enabled)
   [SW] Pre-cached language files: [...]
   ```

3. 确认 Service Worker 已激活：
   - 打开 DevTools → Application → Service Workers
   - 确认状态为 `Activated`

### 问题 3: 缓存版本不更新

**症状**: 修改文件后仍然使用旧缓存

**解决方案**:
1. 更新缓存版本号：
   ```javascript
   const CACHE_VERSION = 'v0-0-6'; // 修改版本号
   ```

2. 强制更新 Service Worker：
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     reg.update();
   });
   ```

3. 跳过等待：
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     reg.waiting.postMessage({ type: 'SKIP_WAITING' });
   });
   ```

## 📝 最佳实践

### 开发环境

1. **不要手动缓存文件**
   - 让所有请求直接从网络获取
   - 避免缓存导致的调试困难

2. **使用热重载**
   - Webpack DevServer 自动支持 HMR
   - 无需手动刷新页面

3. **清除旧缓存**
   - 定期清除浏览器缓存
   - 使用隐身模式测试

### 生产环境

1. **定期更新缓存版本**
   - 修改 `CACHE_VERSION` 版本号
   - 确保用户获取最新内容

2. **监控缓存性能**
   - 使用 Performance API 监控缓存命中率
   - 优化缓存策略

3. **提供降级方案**
   - 网络失败时显示友好的错误信息
   - 提供重试机制

## 🔗 相关文件

- `src/sw.js` - Service Worker 主文件
- `webpack.config.js` - Webpack 配置文件
- `package.json` - 项目配置和脚本

## 📚 参考资料

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Webpack DefinePlugin](https://webpack.js.org/plugins/define-plugin/)
- [Cache Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Offline PWA](https://web.dev/progressive-web-apps/)

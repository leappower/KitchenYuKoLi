# KitchenYuKoLi 开发环境指南

## 服务架构

```
┌─────────────────────────────────────────────────────────┐
│  Caddy (root, PID 310)                                  │
│  配置: /Users/chee/certs/Caddyfile                       │
│  https://192.168.3.181 (:443) → OpenClaw (:18789)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  nodemon — KitchenYuKoLi 前端                            │
│  配置: nodemon.json (watch server.js+src/, ignore dist/) │
│  https://192.168.3.181:3000 (HTTPS, 自签名证书)           │
│  http://localhost:3099   (HTTP, 调试用)                   │
│  日志: /tmp/yukoli-dev.log                               │
│  热更新: 修改 server.js → 自动重启 ✅                      │
│          修改 src/ → 需运行 bash ./build.sh               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  KitchenYuKoLiServer — 后端 API + CMS                    │
│  https://192.168.3.181:8000 (HTTPS)                      │
│  http://localhost:8001   (HTTP)                           │
│  日志: /tmp/yukoli-server.log                            │
│  前端 server.js 自动代理 /api/* → :8000                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  OpenClaw Gateway                                        │
│  http://192.168.3.181:18789 (直连)                       │
│  https://192.168.3.181/      (Caddy 代理)                │
└─────────────────────────────────────────────────────────┘
```

## 访问地址

| 服务 | 地址 | 用途 |
|---|---|---|
| OpenClaw Control UI | `https://192.168.3.181/` | Agent 管理 |
| OpenClaw Gateway 直连 | `http://192.168.3.181:18789` | API/调试 |
| KitchenYuKoLi 前端 | `https://192.168.3.181:3000/` | 网站开发 |
| KitchenYuKoLi 调试 | `http://localhost:3099/` | 无 TLS 调试 |
| 后端 API | 通过前端 :3000 自动代理 | 无需单独访问 |

## 启动步骤

### 1. 启动 Caddy（OpenClaw HTTPS 代理）

```bash
# Caddy 已作为 root 后台服务运行，通常不需要手动启动
# 如需重启：
sudo caddy reload --config /Users/chee/certs/Caddyfile

# 查看状态：
ps aux | grep caddy
```

Caddy 配置文件：`/Users/chee/certs/Caddyfile`
```caddyfile
https://192.168.3.181 {
    tls /Users/chee/certs/192.168.3.181-new.pem /Users/chee/certs/192.168.3.181-key.pem
    reverse_proxy 127.0.0.1:18789
}
```

### 2. 启动 KitchenYuKoLi 前端（nodemon）

```bash
cd /Users/chee/Projects/KitchenYuKoLi

# 确保 LaunchAgent 不会冲突
launchctl bootout gui/$(id -u)/com.kitchenyuKoli.server 2>/dev/null

# 启动 nodemon（SSL_PORT=0 禁用自带 HTTPS 时用 Caddy；这里保留 HTTPS 用 :3000）
SSL_PORT=3000 NODE_ENV=development nohup npx nodemon server.js > /tmp/yukoli-dev.log 2>&1 &

# 查看日志
tail -f /tmp/yukoli-dev.log
```

**nodemon 配置**（`nodemon.json`）：
```json
{
  "watch": ["server.js", "src/"],
  "ignore": ["dist/", "node_modules/", ".git/", "*.json"],
  "ext": "js,json",
  "delay": 1000
}
```

### 3. 启动后端 KitchenYuKoLiServer

```bash
cd /Users/chee/Projects/KitchenYuKoLiServer

PORT=8001 SSL_PORT=8000 NODE_ENV=production \
SSL_CERT=/Users/chee/certs/192.168.3.181-new.pem \
SSL_KEY=/Users/chee/certs/192.168.3.181-key.pem \
FRONTEND_PROJECT_ROOT=/Users/chee/Projects/KitchenYuKoLi \
CMS_JWT_SECRET=3841a6e4dcc6e7595c8cd6bffad8dc47bf0f35ff64627bebd8a7fe967c73d1dd \
nohup node server.js > /tmp/yukoli-server.log 2>&1 &
```

### 4. 编译前端（修改 src/ 后）

```bash
cd /Users/chee/Projects/KitchenYuKoLi
bash ./build.sh
```

编译后无需重启 nodemon（nodemon 忽略 dist/），刷新浏览器即可看到新版本。

## 热更新说明

| 修改内容 | 是否自动生效 | 操作 |
|---|---|---|
| `server.js` | ✅ 自动重启 | nodemon 检测变化，1秒后重启 |
| `src/pages/**/*.html` | ❌ | `bash ./build.sh` → 刷新浏览器 |
| `src/assets/js/**/*.js` | ❌ | `bash ./build.sh` → 刷新浏览器 |
| `src/assets/css/**` | ❌ | `bash ./build.sh` → 刷新浏览器 |
| `dist/` 下文件 | ✅ 立即生效 | 刷新浏览器（带 Cmd+Shift+R 硬刷新） |

## 停止所有服务

```bash
# 停止 nodemon
pkill -f "nodemon.*server.js"

# 停止后端
pkill -f "KitchenYuKoLiServer.*server.js"

# 停止 Caddy（不推荐，OpenClaw 需要它）
# sudo caddy stop --config /Users/chee/certs/Caddyfile
```

## 常见问题

### Q: 浏览器显示 ERR_CONNECTION_REFUSED
- 确认 nodemon 在跑：`lsof -i :3000 -P -n`
- 确认监听 IPv4：应该显示 `TCP *:3000 (LISTEN)` 而不是 `TCP *:3000 (LISTEN)` 在 IPv6 only
- server.js 已绑定 `0.0.0.0`

### Q: 修改后浏览器看不到变化
- **硬刷新**：Cmd+Shift+R（macOS）或 Ctrl+Shift+R（Windows）
- server.js 设置了 `Cache-Control: no-cache`，但浏览器可能缓存旧版 HTML
- 检查版本号：查看页面源码中的 `?v=` 参数

### Q: 端口被占用
```bash
# 查看谁占用了端口
lsof -i :3099 -P -n
lsof -i :3000 -P -n

# 杀掉旧进程
kill -9 <PID>
```

### Q: LaunchAgent 自动重启冲突
```bash
# 查看状态
launchctl list | grep kitchen

# 卸载（开发时建议）
launchctl bootout gui/$(id -u)/com.kitchenyuKoli.server

# 恢复（生产时）
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.kitchenyuKoli.server.plist
```

## LaunchAgent 说明

系统有两个 LaunchAgent：

| Label | 服务 | 端口 | 开发时建议 |
|---|---|---|---|
| `com.kitchenyuKoli.server` | 前端静态服务 | 3099 (SSL_PORT=0) | ❌ 卸载，用 nodemon |
| `com.kitchenyuKoliServer.server` | 后端 API + CMS | 8000/8001 | ⚠️ 可保留 |

两个都有 `KeepAlive: true`，会自动重启。开发前端时必须卸载 `com.kitchenyuKoli.server`，否则会和 nodemon 抢端口。

## 相关文件

| 文件 | 路径 | 用途 |
|---|---|---|
| Caddyfile (OpenClaw) | `/Users/chee/certs/Caddyfile` | Caddy HTTPS 代理配置 |
| SSL 证书 | `/Users/chee/certs/192.168.3.181-new.pem` | 自签名证书 |
| SSL 私钥 | `/Users/chee/certs/192.168.3.181-key.pem` | 私钥 |
| nodemon 配置 | `nodemon.json` | watch/ignore 规则 |
| server.js | `server.js` | Express 静态服务器 |
| build.sh | `build.sh` | 编译脚本 |
| 开发启动脚本 | `scripts/dev-start.sh` | 一键启动/停止 |

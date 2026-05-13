#!/bin/bash
# KitchenYuKoLi 开发环境启动脚本
# 用法: ./scripts/dev-start.sh [stop|status]
#
# 启动顺序: nodemon (3099) → Caddy (443 → 3099)
# 停止: 反向停止 Caddy → nodemon

set -e
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
LOGFILE="/tmp/yukoli-dev.log"
CADDY_PID_FILE="/tmp/yukoli-caddy.pid"
NODEMON_PID_FILE="/tmp/yukoli-nodemon.pid"

stop_all() {
    echo "🛑 停止开发服务..."
    
    # 停止 Caddy
    if [ -f "$CADDY_PID_FILE" ]; then
        CADDY_PID=$(cat "$CADDY_PID_FILE")
        if kill -0 "$CADDY_PID" 2>/dev/null; then
            kill "$CADDY_PID" 2>/dev/null || true
            echo "  ✅ Caddy 已停止 (PID $CADDY_PID)"
        fi
        rm -f "$CADDY_PID_FILE"
    fi
    # 也尝试 caddy stop
    sudo caddy stop --config "$PROJECT_DIR/Caddyfile.dev" 2>/dev/null || true
    
    # 停止 nodemon/node
    if [ -f "$NODEMON_PID_FILE" ]; then
        NODEMON_PID=$(cat "$NODEMON_PID_FILE")
        if kill -0 "$NODEMON_PID" 2>/dev/null; then
            kill "$NODEMON_PID" 2>/dev/null || true
            echo "  ✅ nodemon 已停止 (PID $NODEMON_PID)"
        fi
        rm -f "$NODEMON_PID_FILE"
    fi
    # 也杀残留进程
    pkill -f "nodemon.*server.js" 2>/dev/null || true
    lsof -ti :3099 2>/dev/null | xargs kill 2>/dev/null || true
    
    echo "✅ 全部停止"
}

status() {
    echo "📊 开发服务状态:"
    echo ""
    
    # nodemon
    if lsof -i :3099 -P -n 2>/dev/null | grep -q LISTEN; then
        NODE_PID=$(lsof -ti :3099 2>/dev/null)
        echo "  ✅ nodemon: 运行中 (PID $NODE_PID, port 3099)"
    else
        echo "  ❌ nodemon: 未运行"
    fi
    
    # Caddy
    if lsof -i :443 -P -n 2>/dev/null | grep -q caddy; then
        CADDY_PID=$(pgrep -f "caddy.*Caddyfile.dev" 2>/dev/null || echo "unknown")
        echo "  ✅ Caddy dev: 运行中 (PID $CADDY_PID, port 443 → 3099)"
    else
        echo "  ⚪ Caddy dev: 未运行 (直接访问 https://192.168.3.181:3000)"
    fi
    
    # OpenClaw Caddy
    if lsof -i :443 -P -n 2>/dev/null | grep -q caddy; then
        echo "  ℹ️  Caddy (OpenClaw): $(cat /Users/chee/certs/Caddyfile 2>/dev/null | head -1)"
    fi
    
    # LaunchAgents
    if launchctl list 2>/dev/null | grep -q kitchen; then
        echo "  ⚠️  LaunchAgent: 仍在运行 (可能与 dev server 冲突)"
    fi
    
    echo ""
    echo "  📁 日志: $LOGFILE"
    echo "  🔗 https://192.168.3.181/cases/"
    echo "  🔗 http://localhost:3099/cases/"
}

start() {
    # 检查端口占用
    if lsof -i :3099 -P -n 2>/dev/null | grep -q LISTEN; then
        echo "⚠️  端口 3099 已被占用，先停止..."
        stop_all
        sleep 1
    fi
    
    # 检查 LaunchAgent 冲突
    if launchctl list 2>/dev/null | grep -q kitchenyuKoli; then
        echo "⚠️  检测到 LaunchAgent 仍在运行，正在 unload..."
        launchctl bootout gui/$(id -u)/com.kitchenyuKoli.server 2>/dev/null || true
        launchctl bootout gui/$(id -u)/com.kitchenyuKoliServer.server 2>/dev/null || true
        sleep 1
    fi
    
    # 清空日志
    > "$LOGFILE"
    
    # 1. 启动 nodemon
    echo "🚀 启动 nodemon (port 3099)..."
    SSL_PORT=0 NODE_ENV=development npx nodemon server.js > "$LOGFILE" 2>&1 &
    echo $! > "$NODEMON_PID_FILE"
    sleep 2
    
    if ! lsof -i :3099 -P -n 2>/dev/null | grep -q LISTEN; then
        echo "❌ nodemon 启动失败，查看日志: $LOGFILE"
        exit 1
    fi
    echo "  ✅ nodemon 已启动 (PID $(cat $NODEMON_PID_FILE))"
    
    # 2. 启动 Caddy dev
    echo "🌐 启动 Caddy (port 443 → 3099)..."
    sudo caddy start --config "$PROJECT_DIR/Caddyfile.dev" 2>&1
    echo "  ✅ Caddy 已启动"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🟢 开发环境已就绪"
    echo "  🔗 https://192.168.3.181/"
    echo "  🔗 https://192.168.3.181/cases/"
    echo "  📁 日志: tail -f $LOGFILE"
    echo "  🛑 停止: ./scripts/dev-start.sh stop"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

case "${1:-start}" in
    start)   start ;;
    stop)    stop_all ;;
    status)  status ;;
    restart) stop_all; sleep 1; start ;;
    log)     tail -f "$LOGFILE" ;;
    *)       echo "用法: $0 {start|stop|restart|status|log}"; exit 1 ;;
esac

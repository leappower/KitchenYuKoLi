#!/bin/bash
# start-all.sh — 同时启动 KitchenYuKoLi (前端) + KitchenYuKoLiServer (后端)
set -e

# 后端
echo "▶ 启动后端 KitchenYuKoLiServer..."
cd /Users/chee/Projects/KitchenYuKoLiServer
export $(grep -v '^\s*#' .env | xargs)
PORT=8001 SSL_PORT=8000 NODE_ENV=production \
nohup node server.js > /tmp/yukoli-server.log 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

sleep 2

# 前端
echo "▶ 启动前端 KitchenYuKoLi..."
cd /Users/chee/Projects/KitchenYuKoLi
SSL_PORT=3000 NODE_ENV=development API_SERVER=http://127.0.0.1:8001 \
nohup node server.js > /tmp/yukoli-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

echo ""
echo "✅ 启动完成"
echo "   前端 https://192.168.3.181:3000"
echo "   后端 https://192.168.3.181:8000/admin"

# 保存 PID 以便停止
echo "$FRONTEND_PID" > /tmp/yukoli-frontend.pid
echo "$BACKEND_PID" > /tmp/yukoli-server.pid

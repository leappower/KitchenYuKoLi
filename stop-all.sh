#!/bin/bash
# stop-all.sh — 停止所有 Yukoli 服务
echo "⏹ 停止服务..."
[ -f /tmp/yukoli-frontend.pid ] && kill $(cat /tmp/yukoli-frontend.pid) 2>/dev/null && echo "  前端已停止"
[ -f /tmp/yukoli-server.pid ] && kill $(cat /tmp/yukoli-server.pid) 2>/dev/null && echo "  后端已停止"
rm -f /tmp/yukoli-frontend.pid /tmp/yukoli-server.pid
echo "✅ 已全部停止"

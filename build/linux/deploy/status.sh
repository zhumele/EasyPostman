#!/bin/bash
# EasyPostman Web 状态检查脚本
# 运行方式: ./status.sh

APP_NAME="easy-postman-web"
APP_HOME=$(cd "$(dirname "$0")" && pwd)
PID_FILE="$APP_HOME/easy-postman-web.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "$APP_NAME: 未运行"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo "$APP_NAME: 运行中 (PID: $PID)"
    exit 0
else
    echo "$APP_NAME: 已停止 (PID 文件存在但进程不存在)"
    exit 1
fi
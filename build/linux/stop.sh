#!/bin/bash
# EasyPostman Web 停止脚本
# 运行方式: ./stop.sh

APP_NAME="easy-postman-web"
APP_HOME=$(cd "$(dirname "$0")" && pwd)
PID_FILE="$APP_HOME/easy-postman-web.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "$APP_NAME 没有运行"
    exit 0
fi

PID=$(cat "$PID_FILE")

# 发送终止信号
if kill -TERM "$PID" 2>/dev/null; then
    echo "正在停止 $APP_NAME (PID: $PID)..."
    # 等待进程结束
    for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "$APP_NAME 已停止"
            rm -f "$PID_FILE"
            exit 0
        fi
        sleep 1
    done
    # 强制终止
    echo "等待超时，强制终止..."
    kill -KILL "$PID" 2>/dev/null
    sleep 1
    rm -f "$PID_FILE"
    echo "$APP_NAME 已强制停止"
else
    echo "$APP_NAME 进程不存在，清理 PID 文件"
    rm -f "$PID_FILE"
fi
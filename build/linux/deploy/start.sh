#!/bin/bash
# EasyPostman Web 启动脚本
# 运行方式: ./start.sh

APP_NAME="easy-postman-web"
APP_VERSION="6.0.12"
APP_JAR="$APP_NAME-$APP_VERSION-shaded.jar"
APP_HOME=$(cd "$(dirname "$0")" && pwd)
LOG_FILE="$APP_HOME/logs/easy-postman-web.log"
PID_FILE="$APP_HOME/easy-postman-web.pid"

# 创建日志目录
mkdir -p "$APP_HOME/logs"

# 检查是否已运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "$APP_NAME 已经在运行，PID: $PID"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

# 检查 JDK
if [ -n "$JAVA_HOME" ]; then
    JAVA="$JAVA_HOME/bin/java"
elif [ -x "$APP_HOME/jre/bin/java" ]; then
    JAVA="$APP_HOME/jre/bin/java"
else
    JAVA=$(find "$APP_HOME/jre" -name "java" -type f 2>/dev/null | grep "/bin/java$" | head -n 1)
    if [ -z "$JAVA" ]; then
        JAVA="java"
    fi
fi

# 检查 Java 是否可用
if [ ! -x "$JAVA" ] && ! command -v "$JAVA" &> /dev/null; then
    echo "错误: 未找到 Java 运行环境"
    echo "请设置 JAVA_HOME 环境变量，或在 $APP_HOME/jre 目录下放置 JRE"
    exit 1
fi

echo "正在启动 $APP_NAME..."
echo "Java 路径: $JAVA"

# 后台启动
nohup "$JAVA" -jar "$APP_HOME/$APP_JAR" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 等待启动
sleep 3

# 检查是否启动成功
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "$APP_NAME 启动成功，PID: $PID"
        echo "日志文件: $LOG_FILE"
        echo "服务端口: 8080"
        echo "访问地址: http://localhost:8080"
    else
        echo "$APP_NAME 启动失败，请查看日志: $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
else
    echo "$APP_NAME 启动失败，请查看日志: $LOG_FILE"
    exit 1
fi
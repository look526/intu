#!/bin/bash
# 一键启动 intu 后端 API + 管理后台前端

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 颜色
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}       intu 开发环境一键启动${NC}"
echo -e "${CYAN}========================================${NC}"

# 先杀掉占用 3000 / 5173 端口的旧进程
for PORT in 3000 5173; do
  PID=$(lsof -ti:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo -e "${RED}[清理] 端口 $PORT 被占用 (PID: $PID)，正在终止...${NC}"
    kill -9 $PID 2>/dev/null
    sleep 0.5
  fi
done

# 启动后端 API (NestJS --watch)
echo -e "${GREEN}[1/2] 启动后端 API (http://localhost:3000) ...${NC}"
cd "$ROOT_DIR/intu-api"
npx nest start --watch > /tmp/intu-api.log 2>&1 &
API_PID=$!

# 启动管理后台前端 (Vite)
echo -e "${GREEN}[2/2] 启动管理后台前端 (http://localhost:5173) ...${NC}"
cd "$ROOT_DIR/admin"
npx vite > /tmp/intu-admin.log 2>&1 &
ADMIN_PID=$!

# 等待服务就绪
echo ""
echo -e "${CYAN}等待服务启动...${NC}"
sleep 5

# 检查进程是否存活
check_alive() {
  kill -0 $1 2>/dev/null
}

echo ""
if check_alive $API_PID; then
  echo -e "${GREEN}✓ 后端 API       PID=$API_PID  →  http://localhost:3000${NC}"
else
  echo -e "${RED}✗ 后端 API 启动失败，查看日志: cat /tmp/intu-api.log${NC}"
fi

if check_alive $ADMIN_PID; then
  echo -e "${GREEN}✓ 管理后台前端   PID=$ADMIN_PID  →  http://localhost:5173${NC}"
else
  echo -e "${RED}✗ 管理后台前端启动失败，查看日志: cat /tmp/intu-admin.log${NC}"
fi

echo ""
echo -e "${CYAN}日志文件:${NC}"
echo "  后端 API:     tail -f /tmp/intu-api.log"
echo "  管理后台前端: tail -f /tmp/intu-admin.log"
echo ""
echo -e "${CYAN}停止所有服务: kill $API_PID $ADMIN_PID${NC}"
echo ""

# 保存 PID 到文件，方便后续 stop
echo "$API_PID $ADMIN_PID" > "$ROOT_DIR/.dev-pids"

# 前台等待，Ctrl+C 统一退出
trap "echo -e '\n${RED}正在停止所有服务...${NC}'; kill $API_PID $ADMIN_PID 2>/dev/null; rm -f '$ROOT_DIR/.dev-pids'; echo '已停止'; exit 0" INT TERM

wait

#!/bin/bash
# =============================================
#  Intu 趣学坊 - 一键部署脚本
# =============================================
#  前提：服务器已安装 Docker 和 Docker Compose
#  用法：
#    1. 将整个项目上传到服务器
#    2. 修改 .env.production 中的配置
#    3. chmod +x deploy.sh && ./deploy.sh
# =============================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}       Intu 趣学坊 - 生产部署${NC}"
echo -e "${CYAN}========================================${NC}"

# 1. 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker 未安装！请先安装 Docker${NC}"
    echo "  curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose 未安装！请先安装${NC}"
    exit 1
fi

# 2. 加载环境变量
if [ -f .env.production ]; then
    echo -e "${GREEN}[1/4] 加载环境变量 .env.production${NC}"
    cp .env.production .env
else
    echo -e "${RED}.env.production 不存在，请先创建${NC}"
    exit 1
fi

# 3. 构建并启动
echo -e "${GREEN}[2/4] 构建 Docker 镜像...${NC}"
docker compose build --no-cache

echo -e "${GREEN}[3/4] 启动所有服务...${NC}"
docker compose up -d

# 4. 等待并检查
echo -e "${GREEN}[4/4] 等待服务就绪...${NC}"
sleep 10

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  服务状态${NC}"
echo -e "${CYAN}========================================${NC}"
docker compose ps
echo ""

# 检查健康状态
if docker compose ps | grep -q "Up"; then
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "你的服务器IP")
    echo -e "${GREEN}部署成功！${NC}"
    echo ""
    echo -e "  管理后台:  http://${SERVER_IP}"
    echo -e "  后端 API:  http://${SERVER_IP}/api"
    echo ""
    echo -e "${CYAN}常用命令:${NC}"
    echo "  查看日志:    docker compose logs -f"
    echo "  查看API日志: docker compose logs -f api"
    echo "  重启服务:    docker compose restart"
    echo "  停止服务:    docker compose down"
    echo "  更新部署:    git pull && ./deploy.sh"
else
    echo -e "${RED}部分服务启动失败，请检查日志:${NC}"
    echo "  docker compose logs"
fi

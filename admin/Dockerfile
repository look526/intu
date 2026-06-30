# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx vite build

# ===== Nginx 托管 =====
FROM nginx:alpine AS production

# 拷贝构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 拷贝 nginx 配置（由 docker-compose 挂载更完整的配置）
# 这里只做一个简单的 SPA fallback
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

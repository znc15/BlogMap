# 旅行相册 CMS - Docker 镜像
FROM node:18-alpine

# 安装编译工具链（better-sqlite3 + sharp 需要原生编译）
RUN apk add --no-cache \
    tini \
    python3 \
    make \
    gcc \
    g++ \
    vips-dev

# 创建运行用户
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖（编译原生模块）
RUN npm install --production

# 清理编译工具（减小镜像体积）
RUN apk del python3 make gcc g++ vips-dev && \
    rm -rf /var/cache/apk/*

# 复制源码
COPY . .

# 创建数据目录（挂载点）
RUN mkdir -p /app/data /app/public/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 48721

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]

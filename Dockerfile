# 旅行相册 CMS - Docker 镜像
FROM node:18-alpine

# 安装必要工具
RUN apk add --no-cache tini

# 创建运行用户
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖（包含 sharp 的原生编译）
RUN npm install --production

# 复制源码
COPY . .

# 创建数据目录（挂载点）
RUN mkdir -p /app/data /app/public/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 48721

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]

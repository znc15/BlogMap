# 足迹 · Footprints

基于 Node.js 的旅行相册 CMS，将走过的路折成一张地图。

**技术栈**：Express + SQLite + EJS + ECharts

## 功能

- 中国地图行迹（ECharts + 灯火标记 + 旅行轨迹）
- 省份详情（瀑布流相册 + 灯箱 + Markdown 游记）
- 时间轴旅行年表
- 后台管理（仪表盘 + 省份/照片 CRUD + 评论审核）
- 数据导入导出（JSON）
- 暗色/亮色主题切换
- RSS 订阅 / 分享卡片 / 评论
- Docker 部署

## 快速开始

```bash
# 安装依赖
npm install

# 启动（默认端口 48721）
npm start

# 或指定端口
PORT=9090 npm start
```

访问 `http://localhost:48721` 浏览前台，`/admin/login` 进入后台。

**默认管理员**：`admin` / `admin123`（登录后请在设置页修改）

## Docker 部署

```bash
docker-compose up -d
```

端口映射可在 `docker-compose.yml` 中修改，数据持久化在 `./data` 和 `./public/uploads`。

## 自定义

| 配置项 | 位置 |
|--------|------|
| 端口 | `PORT` 环境变量 或 `config/default.json` → `port` |
| 站点名称 / 页脚 | 后台 → 设置（即时生效，无需重启） |
| 管理员用户名 / 密码 | 后台 → 设置页修改用户名，密码页修改密码 |
| 上传文件大小 | `config/default.json` → `upload.maxFileSize` |

## 目录结构

```
├── app.js              # 入口
├── config/             # 配置文件
├── db/                 # 数据库 schema + 种子数据
├── routes/             # 路由（前台/后台/API/认证）
├── controllers/        # 业务逻辑
├── middlewares/        # 中间件（鉴权/上传）
├── views/              # EJS 模板
├── public/             # 静态资源（CSS/JS/上传文件）
└── data/               # SQLite 数据库文件
```

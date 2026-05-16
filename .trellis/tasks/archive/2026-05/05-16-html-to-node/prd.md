# 将 HTML 旅行相册改写为 Node.js 项目并完善

## 目标

将现有的单文件 `index.html`（旅行相册）改写为完整的 Node.js 项目：引入 Express 后端、服务端数据持久化、模板化前端，并保持和增强现有功能。

## 已知信息

- 现有 `index.html` 是一个完整的单页应用，包含 HTML/CSS/JS 全部内联
- 使用 ECharts 5.4.3 渲染中国地图，数据来自阿里云 DataV GeoJSON
- 旅行数据存储在 `localStorage`，包含 7 个省份的示例数据
- 功能清单：中国地图行迹、时间轴、省份快速列表、省份详情面板、瀑布流相册、灯箱、上传抽屉（本地图片/URL）、JSON 导入/导出/重置
- 设计风格：暗色主题（#222831 底色），Noto Serif/Sans SC 字体，橙铜色强调色（#D65A31）
- 项目当前无 `package.json`、无任何 Node.js 基础设施

## 需求

1. Node.js + Express 项目骨架（package.json、目录结构、脚本）
2. 前端模块化拆分（EJS 模板 + 静态资源）
3. SQLite 数据库存储（better-sqlite3），替代 localStorage
4. 单管理员认证（session 或 JWT），访客无需登录即可浏览
5. 后台管理界面：省份/照片/游记的 CRUD
6. 服务端图片上传与静态托管
7. 保留所有现有前端体验（地图、时间轴、瀑布流、灯箱）
8. 数据导入/导出（JSON 格式兼容原格式）
9. 错误处理、日志、基础安全（CSRF/XSS 防护）

## 验收条件

- [ ] `npm install && npm start` 可启动项目
- [ ] 访客可浏览所有旅行内容（地图、相册、时间轴）
- [ ] 管理员登录后可新增/编辑/删除省份及照片
- [ ] 图片可通过本地上传至服务端
- [ ] JSON 导入/导出功能正常
- [ ] 数据持久化到 SQLite，服务重启不丢失

## 用户模型

- 单管理员账号（通过配置文件或数据库初始化种子创建）
- 访客无需登录，只读浏览
- 管理员通过 `/admin` 路径登录后管理内容

## 后台管理（仪表盘）

- 统计面板：省份数、照片数、最近更新等概览卡片
- 省份管理：表格列表 + 新增/编辑/删除 + 游记富文本编辑
- 照片管理：按省份分组、拖拽排序、批量操作
- 图表概览：简单的旅行统计图表

## 扩展项（已确认纳入）

- 图片上传安全限制（格式：jpg/png/webp，大小：≤10MB）
- 地图 GeoJSON 本地缓存（public/data/china-geo.json，离线可用）

## 技术方案（提议）

| 层 | 选型 | 理由 |
|---|---|---|
| 运行时 | Node.js 18+ | LTS，生态成熟 |
| 框架 | Express 4 | 社区标准，中间件丰富 |
| 数据库 | better-sqlite3 | 同步 API，零配置，适合单机部署 |
| 模板引擎 | EJS | 与 HTML 语法最接近，迁移成本低 |
| 认证 | express-session + bcrypt | 成熟的 session 方案 |
| 文件上传 | multer | Express 标准上传中间件 |
| 图片处理 | sharp | 高性能缩略图生成 |
| 富文本 | Quill | 轻量、现代、与暗色主题融合好 |
| CSS | 手写（延续现有风格） | 保持设计一致性 |
| 地图 GeoJSON | 本地缓存 + 启动时自动拉取 | 离线可用，启动时检查更新 |

## 项目目录结构（提议）

```
├── package.json
├── app.js                    # Express 入口
├── config/
│   └── default.json          # 端口、管理员账号、上传限制等
├── db/
│   ├── schema.sql            # 建表语句
│   ├── seed.js               # 种子数据（含示例旅行 + 管理员账号）
│   └── index.js              # better-sqlite3 连接
├── routes/
│   ├── index.js              # 前台浏览路由
│   ├── admin.js              # 后台管理路由
│   ├── api.js                # 数据 API
│   └── auth.js               # 登录/登出
├── controllers/
│   ├── travelController.js
│   ├── photoController.js
│   └── authController.js
├── middlewares/
│   ├── auth.js               # 管理员鉴权
│   └── upload.js             # multer 配置
├── views/
│   ├── partials/             # header/footer/nav
│   ├── index.ejs             # 首页（地图+时间轴+列表）
│   ├── detail.ejs            # 省份详情
│   └── admin/                # 后台页面
│       ├── login.ejs
│       ├── dashboard.ejs
│       └── province-form.ejs
├── public/
│   ├── css/style.css         # 从 HTML 提取
│   ├── js/
│   │   ├── map.js            # ECharts 地图逻辑
│   │   ├── gallery.js        # 瀑布流+灯箱
│   │   └── admin.js          # 后台交互
│   ├── data/
│   │   └── china-geo.json    # 离线地图 GeoJSON
│   └── uploads/              # 上传图片目录
└── utils/
    ├── logger.js
    └── validator.js
```

## 技术备注

- 现有 HTML 文件：`index.html`（1631 行）
- ECharts 地图 GeoJSON 来源：`https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`
- 字体来源：Google Fonts（Noto Serif SC, Noto Sans SC）
- 示例图片来源：picsum.photos 随机图片

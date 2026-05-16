# 后端目录结构

> 本项目后端代码组织方式。

---

## 目录布局

```
├── app.js                    # Express 入口，中间件注册、路由挂载、启动初始化
├── package.json              # 依赖与脚本
├── config/
│   └── default.json          # 运行配置（端口、管理员账号、上传限制）
├── db/
│   ├── schema.sql            # 建表语句（SQLite DDL）
│   ├── seed.js               # 种子数据脚本
│   ├── seed-data.json        # 种子数据内容（可独立维护）
│   └── index.js              # better-sqlite3 连接获取
├── routes/
│   ├── index.js              # 前台浏览路由
│   ├── admin.js              # 后台页面路由
│   ├── api.js                # 数据 API（公开 + 管理）
│   └── auth.js               # 登录/登出
├── controllers/
│   ├── travelController.js   # 省份 CRUD、导入导出
│   ├── photoController.js    # 照片上传、缩略图生成、照片 CRUD
│   └── authController.js     # 登录验证、会话管理
├── middlewares/
│   ├── auth.js               # 管理员鉴权中间件（session 检查）
│   └── upload.js             # multer 文件上传配置
├── views/                    # EJS 模板（见前端目录结构）
├── public/                   # 静态资源（见前端目录结构）
└── utils/
    └── logger.js             # 控制台日志工具（带时间戳和级别）
```

## 分层职责

| 层 | 职责 | 不应做 |
|----|------|--------|
| `routes/` | 请求分发、参数提取、调用控制器、渲染/响应 | 不写业务逻辑、不直接操作数据库 |
| `controllers/` | 业务逻辑、数据库操作、数据验证 | 不处理 HTTP 请求/响应对象细节 |
| `middlewares/` | 请求预处理（鉴权、文件解析） | 不包含业务逻辑 |
| `db/` | 数据库连接、schema 定义、种子数据 | 不包含业务逻辑 |

## 命名约定

- 文件名：kebab-case（如 `travelController.js`）
- 路由文件：按功能域命名（`index.js`=前台，`admin.js`=后台，`api.js`=数据接口）
- 控制器文件：`<功能>Controller.js`
- 中间件文件：单文件负责单个关注点

## 实例

- `routes/api.js` — 前后台共享的数据 API，通过路径前缀 `/admin/api/` 区分管理接口
- `controllers/travelController.js` — 所有省份 CRUD + JSON 导入导出逻辑集中于此

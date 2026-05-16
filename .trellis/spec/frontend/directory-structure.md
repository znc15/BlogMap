# 前端目录结构

> 本项目前端使用 EJS 服务端模板 + 原生 JS，无前端框架。

---

## 目录布局

```
views/
├── partials/                 # 可复用模板片段
│   ├── header.ejs            # 前台页面头（导航、统计、hero）
│   ├── footer.ejs            # 页脚 + Toast 通知
│   ├── admin-head.ejs        # 后台页面 head（CSS/JS 引用）
│   └── admin-nav.ejs         # 后台侧边导航栏
├── index.ejs                 # 首页（地图、时间轴、省份列表）
├── detail.ejs                # 省份详情（瀑布流相册、游记）
└── admin/
    ├── login.ejs             # 管理员登录页
    ├── dashboard.ejs         # 仪表盘（统计卡片）
    ├── provinces.ejs         # 省份列表管理
    ├── province-form.ejs     # 省份新增/编辑（Quill 富文本）
    └── photos.ejs            # 照片管理

public/
├── css/
│   └── style.css             # 全局暗色主题样式（CSS 变量、银盐颗粒）
├── js/
│   ├── map.js                # ECharts 中国地图（GeoJSON、灯火、轨迹）
│   ├── gallery.js            # 瀑布流相册 + 灯箱
│   └── admin.js              # 后台 AJAX 交互（导入导出、表单提交）
├── data/
│   └── china-geo.json        # 中国地图 GeoJSON 缓存
└── uploads/                  # 用户上传图片
    └── thumb/                # 缩略图
```

## 模板约定

- 使用 EJS `<%= %>` 输出（自动 HTML 转义），禁止对用户内容使用 `<%- %>`
- 局部模板以功能命名（`header`、`footer`、`admin-nav`）
- 后台页面放在 `views/admin/` 子目录
- 页面级模板直接放在 `views/` 根目录
- 不使用前端路由——所有路由由 Express 服务端定义

## 静态资源约定

- CSS：手写，延续原始 index.html 的暗色主题设计
- JS：原生 JavaScript，无构建工具，按功能拆分为独立文件
- 第三方库通过 CDN 加载（ECharts、Google Fonts、Quill）
- 图片上传到 `public/uploads/`，缩略图在 `public/uploads/thumb/`

## 命名约定

- 模板文件：kebab-case（`province-form.ejs`）
- JS 文件：按功能域命名（`map.js`、`gallery.js`、`admin.js`）
- CSS 文件：单文件 `style.css`，通过 CSS 变量和注释分区管理

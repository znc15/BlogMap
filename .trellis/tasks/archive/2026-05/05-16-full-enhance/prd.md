# 四维度功能增强

## 目标

为旅行相册 CMS 全面增强前台体验、后台管理、社交分享和技术架构四个维度。

## 实施清单

### 一、前台体验（7项）
1. 深色/浅色主题切换 — CSS 变量覆写 + 切换按钮
2. 照片懒加载渐进式占位 — 模糊占位图过渡
3. 旅行统计图表 — ECharts 柱状图(省份照片数)+年度日历热力图
4. 照片搜索/筛选 — 前台搜索栏，按关键词过滤
5. 照片自动 WebP 转换 — 上传时 sharp 生成 webp 版本
6. 游记 Markdown 渲染 — marked.js 渲染日记
7. EXIF 信息展示 — 读取照片拍摄参数

### 二、后台管理（6项）
1. 照片拖拽排序 — SortableJS 拖拽重排
2. 批量操作 — 批量删除照片
3. 数据备份/恢复 — 一键导出完整JSON+照片ZIP
4. 访问统计 — 页面PV计数+仪表盘展示
5. 草稿/发布状态 — 省份可设为草稿(前台不可见)
6. 游记 Markdown 编辑 — 切换为 Markdown 编辑器

### 三、社交分享（3项）
1. 生成分享卡片 — 省份海报图(HTML2Canvas风格，用CSS生成)
2. RSS/Atom 订阅 — /rss.xml 输出
3. 轻量评论 — SQLite 评论表，管理员审核

### 四、技术架构（4项）
1. Docker 化 — Dockerfile + docker-compose.yml
2. API 文档 — Swagger 风格的 API 说明页
3. Sitemap — /sitemap.xml 自动生成
4. PWA — manifest.json + Service Worker

## 技术栈

marked, SortableJS, archiver(备份), feed(RSS), 现有 sharp/echarts

## 验收

- [ ] 主题切换按钮可用
- [ ] 搜索栏可筛选照片
- [ ] 统计图表正常渲染
- [ ] 照片可拖拽排序
- [ ] Docker 可一键启动
- [ ] RSS 可订阅
- [ ] 评论可提交/审核

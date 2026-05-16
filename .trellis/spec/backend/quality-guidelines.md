# 后端质量规范

> 本项目后端代码质量标准。

---

## 代码组织

- 路由只做分发，不写业务逻辑
- 控制器包含业务逻辑和数据库操作
- 中间件单一职责（一个中间件只做一件事）
- 工具函数放入 `utils/`，不得散落于控制器

## 禁止模式

### 不要在路由中直接操作数据库

```js
// 错误：路由中直接操作数据库
router.post('/provinces', (req, res) => {
  const db = getDb();
  db.prepare('INSERT ...').run(req.body.name);
});

// 正确：路由调用控制器
router.post('/provinces', travelController.createProvince);
```

### 不要使用 var

全部使用 `const`（不变绑定）和 `let`（可变绑定）。

### 不要忽略错误

每个 `catch` 块必须包含日志记录和用户可见的错误响应。

## 安全约束

- 所有 SQL 查询使用参数化绑定（better-sqlite3 的 `?` 占位符）
- EJS 模板中用户内容使用 `<%= %>`（自动转义），不用 `<%- %>`
- 文件上传校验格式和大小（见 `middlewares/upload.js`）
- 管理路由通过 `middlewares/auth.js` 鉴权
- 密码使用 bcrypt 哈希存储

## 验证标准

- `npm start` 可启动（端口不冲突）
- 所有路由返回正确的状态码（200/302/400/404/500）
- 数据库操作使用事务保证一致性
- 种子数据脚本可独立运行

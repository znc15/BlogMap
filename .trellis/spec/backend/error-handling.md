# 错误处理

> 本项目 Express 错误处理规范。

---

## 错误类型

| 类型 | 场景 | HTTP 状态码 |
|------|------|------------|
| 资源未找到 | 查询不存在的省份/照片 | 404 |
| 参数校验失败 | 缺少必填字段、格式错误 | 400 |
| 未授权 | 未登录访问管理接口 | 401 / 302 重定向到登录 |
| 文件上传失败 | 格式不支持、超大小 | 400 |
| 服务器内部错误 | 数据库异常、文件系统错误 | 500 |

## 控制器层错误处理

每个控制器函数使用 try-catch：

```js
// controllers/travelController.js
async function getProvince(req, res) {
  try {
    const province = db.prepare('SELECT * FROM provinces WHERE id = ?').get(req.params.id);
    if (!province) return res.status(404).render('404');
    res.render('detail', { province });
  } catch (err) {
    logger.error('获取省份失败', err);
    res.status(500).render('error', { message: '服务器内部错误' });
  }
}
```

## 全局错误中间件

Express 错误中间件捕获未处理异常（app.js 末尾注册）：

```js
app.use((err, req, res, next) => {
  logger.error('未处理异常', err);
  res.status(500).render('error', { message: '服务器内部错误' });
});
```

## API 错误响应格式

```json
{
  "error": "错误描述信息",
  "details": "可选的详细说明"
}
```

对应状态码通过 `res.status(code).json(...)` 设置。

## 日志记录

- 使用 `utils/logger.js` 统一输出
- 所有 catch 块中记录 `logger.error()`
- 数据库操作异常必须记录原始 SQL 和参数

## 常见错误

- **未区分 404 和 500**：资源不存在应返回 404，数据库异常应返回 500
- **向客户端泄露堆栈**：生产环境不在响应中暴露 `err.stack`

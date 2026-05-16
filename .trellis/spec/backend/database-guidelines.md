# 数据库规范

> 本项目使用 SQLite + better-sqlite3，同步 API、零配置。

---

## 技术选型

**选型**：better-sqlite3（同步 API）

**上下文**：项目为单机 CMS，无需并发连接池。同步 API 简化了 Express 路由中的数据库调用。

**后果**：同步调用在请求处理中不阻塞事件循环（better-sqlite3 内部使用 C++ 线程池）。不适用于高并发 Web 服务，但对 CMS 场景足够。

---

## Schema 约定

### 表命名

- 复数英文小写（`provinces`、`photos`、`admins`）
- 关联外键：`<表名单数>_id`（如 `province_id`）

### 列约定

- 主键：`id INTEGER PRIMARY KEY AUTOINCREMENT`
- 时间戳：`created_at` / `updated_at`，默认当前时间
- 布尔值：`INTEGER DEFAULT 0`（SQLite 无 native boolean）
- JSON 数组：`TEXT` 存储，JS 侧 `JSON.stringify/parse`

### 示例（db/schema.sql）

```sql
CREATE TABLE IF NOT EXISTS provinces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province TEXT NOT NULL UNIQUE,
  display TEXT NOT NULL,
  period TEXT,
  diary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 查询规范

### 必须使用参数化查询

```js
// 正确：参数化绑定
db.prepare('SELECT * FROM provinces WHERE id = ?').get(id);

// 错误：字符串拼接
db.prepare(`SELECT * FROM provinces WHERE id = ${id}`).get(); // SQL 注入风险
```

### 增删改模式

```js
// 插入并获取新 ID
const stmt = db.prepare('INSERT INTO provinces (province, display) VALUES (?, ?)');
const result = stmt.run(name, display);
const newId = result.lastInsertRowid;

// 更新
db.prepare('UPDATE provinces SET display = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(display, id);

// 删除
db.prepare('DELETE FROM provinces WHERE id = ?').run(id);
```

### 事务

多表操作使用事务：

```js
const insertAll = db.transaction((items) => {
  for (const item of items) {
    stmt.run(item.province, item.display);
  }
});
insertAll(data);
```

## 种子数据

- `db/seed.js` 独立运行：`node db/seed.js`
- 种子数据内容在 `db/seed-data.json`，便于维护
- `app.js` 启动时自动检查并初始化数据库

## 常见错误

- **忘记 `updated_at` 更新**：更新语句中必须包含 `updated_at = CURRENT_TIMESTAMP`
- **JSON 字段忘记序列化**：写入 TEXT 列前必须 `JSON.stringify()`，读出后 `JSON.parse()`
- **`lastInsertRowid` 类型**：bigint，需转为 Number 使用

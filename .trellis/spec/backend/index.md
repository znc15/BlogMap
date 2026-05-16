# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory contains guidelines for backend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Express 分层架构：routes/controllers/middlewares/db/utils | Done |
| [Database Guidelines](./database-guidelines.md) | SQLite + better-sqlite3，参数化查询，事务 | Done |
| [Error Handling](./error-handling.md) | try-catch 模式，全局错误中间件，API 错误格式 | Done |
| [Quality Guidelines](./quality-guidelines.md) | 路由不写业务逻辑、禁止 var、安全约束 | Done |
| [Logging Guidelines](./logging-guidelines.md) | utils/logger.js，INFO/WARN/ERROR 三级 | Done |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.

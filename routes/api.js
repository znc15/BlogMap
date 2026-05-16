/**
 * 数据 API 路由
 * 前台读取 + 后台管理 API
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const travelController = require('../controllers/travelController');
const photoController = require('../controllers/photoController');
const { requireAdmin } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { getDb } = require('../db/index');
const logger = require('../utils/logger');

// ===== 前台公开 API =====

// 获取所有省份数据
router.get('/provinces', (req, res) => {
  try {
    const data = travelController.getProvinceDataForFrontend();
    res.json(data);
  } catch (err) {
    logger.error('获取省份数据失败:', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 获取单个省份详情
router.get('/provinces/:id', (req, res) => {
  try {
    const province = travelController.getProvinceById(Number(req.params.id));
    if (!province) return res.status(404).json({ error: '省份不存在' });
    res.json(province);
  } catch (err) {
    logger.error('获取省份详情失败:', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 提交评论（公开）
router.post('/comments', (req, res) => {
  try {
    const { provinceId, author, content } = req.body;
    if (!provinceId || !content) {
      return res.status(400).json({ error: '请填写评论内容' });
    }
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO comments (province_id, author, content) VALUES (?, ?, ?)'
    ).run(provinceId, (author || '匿名').trim(), content.trim());
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    logger.error('提交评论失败:', err);
    res.status(500).json({ error: '评论提交失败' });
  }
});

// 获取省份的已审核评论
router.get('/comments/:provinceId', (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(
      'SELECT * FROM comments WHERE province_id = ? AND approved = 1 ORDER BY created_at DESC'
    ).all(Number(req.params.provinceId));
    res.json(comments);
  } catch (err) {
    logger.error('获取评论失败:', err);
    res.status(500).json({ error: '获取评论失败' });
  }
});

// ===== 后台管理 API (需登录) =====

// 统计数据
router.get('/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = travelController.getStats();
    res.json(stats);
  } catch (err) {
    logger.error('获取统计数据失败:', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 创建省份
router.post('/admin/provinces', requireAdmin, (req, res) => {
  try {
    const { province, display, period, diary } = req.body;
    if (!province || !display) {
      return res.status(400).json({ error: '省份名称和显示名不能为空' });
    }
    const result = travelController.createProvince({ province, display, period, diary });
    res.json(result);
  } catch (err) {
    logger.error('创建省份失败:', err);
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: '该省份已存在' });
    }
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新省份
router.put('/admin/provinces/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { province, display, period, diary, status } = req.body;
    const result = travelController.updateProvince(id, { province, display, period, diary, status });
    if (!result) return res.status(404).json({ error: '省份不存在' });
    res.json({ success: true });
  } catch (err) {
    logger.error('更新省份失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 切换省份发布/草稿状态
router.put('/admin/provinces/:id/toggle-status', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const province = db.prepare('SELECT status FROM provinces WHERE id = ?').get(id);
    if (!province) return res.status(404).json({ error: '省份不存在' });

    const newStatus = province.status === 'published' ? 'draft' : 'published';
    db.prepare("UPDATE provinces SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, id);
    res.json({ success: true, status: newStatus });
  } catch (err) {
    logger.error('切换状态失败:', err);
    res.status(500).json({ error: '切换失败' });
  }
});

// 删除省份
router.delete('/admin/provinces/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = travelController.deleteProvince(id);
    if (!result) return res.status(404).json({ error: '省份不存在' });
    res.json({ success: true });
  } catch (err) {
    logger.error('删除省份失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// 上传照片
router.post('/admin/photos', requireAdmin, upload.single('photo'), handleUploadError, async (req, res) => {
  try {
    const { provinceId, caption, location, time } = req.body;
    if (!provinceId) return res.status(400).json({ error: '省份 ID 不能为空' });

    const result = await photoController.addPhoto({
      provinceId: Number(provinceId),
      src: null,
      caption,
      location,
      time,
      file: req.file
    });
    res.json(result);
  } catch (err) {
    logger.error('上传照片失败:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

// 更新照片
router.put('/admin/photos/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { caption, location, time } = req.body;
    const result = photoController.updatePhoto(id, { caption, location, time });
    if (!result) return res.status(404).json({ error: '照片不存在' });
    res.json({ success: true });
  } catch (err) {
    logger.error('更新照片失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除照片
router.delete('/admin/photos/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = photoController.deletePhoto(id);
    if (!result) return res.status(404).json({ error: '照片不存在' });
    res.json({ success: true });
  } catch (err) {
    logger.error('删除照片失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// 批量删除照片
router.post('/admin/photos/batch-delete', requireAdmin, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的照片' });
    }
    photoController.batchDeletePhotos(ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    logger.error('批量删除照片失败:', err);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// 照片排序
router.put('/admin/photos/reorder', requireAdmin, (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds)) return res.status(400).json({ error: '参数错误' });
    photoController.reorderPhotos(photoIds);
    res.json({ success: true });
  } catch (err) {
    logger.error('排序照片失败:', err);
    res.status(500).json({ error: '排序失败' });
  }
});

// 导出全部数据 (JSON)
router.get('/admin/export', requireAdmin, (req, res) => {
  try {
    const data = travelController.exportAllData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=travel-export-${Date.now()}.json`);
    res.json(data);
  } catch (err) {
    logger.error('导出数据失败:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导入数据 (JSON)
router.post('/admin/import', requireAdmin, (req, res) => {
  try {
    const { data } = req.body;
    const count = travelController.importData(data);
    res.json({ success: true, imported: count });
  } catch (err) {
    logger.error('导入数据失败:', err);
    res.status(500).json({ error: err.message || '导入失败' });
  }
});

// 数据备份 (ZIP)
router.get('/admin/backup', requireAdmin, (req, res) => {
  try {
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=travel-backup-${Date.now()}.zip`);

    archive.pipe(res);

    // 添加 JSON 导出
    const data = travelController.exportAllData();
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

    // 添加上传目录
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    // 添加数据库文件
    const dbPath = path.join(__dirname, '..', 'data', 'travel.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'travel.db' });
    }

    archive.finalize();
  } catch (err) {
    logger.error('备份失败:', err);
    res.status(500).json({ error: '备份失败' });
  }
});

// 评论管理 - 获取所有待审核评论
router.get('/admin/comments/pending', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, p.display as province_display
      FROM comments c
      LEFT JOIN provinces p ON c.province_id = p.id
      WHERE c.approved = 0
      ORDER BY c.created_at DESC
    `).all();
    res.json(comments);
  } catch (err) {
    logger.error('获取待审核评论失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取所有评论（含已审核）
router.get('/admin/comments', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, p.display as province_display
      FROM comments c
      LEFT JOIN provinces p ON c.province_id = p.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(comments);
  } catch (err) {
    logger.error('获取评论列表失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 审核评论
router.put('/admin/comments/:id/approve', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE comments SET approved = 1 WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    logger.error('审核评论失败:', err);
    res.status(500).json({ error: '审核失败' });
  }
});

// 删除评论
router.delete('/admin/comments/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM comments WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    logger.error('删除评论失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;

/**
 * 后台管理路由
 * 需要管理员登录
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const travelController = require('../controllers/travelController');
const authController = require('../controllers/authController');
const { getDb } = require('../db/index');
const logger = require('../utils/logger');

// 所有后台路由都需要登录
router.use(requireAdmin);

// 仪表盘
router.get('/dashboard', (req, res) => {
  try {
    const stats = travelController.getStats();
    const provinces = travelController.getAllProvinces();
    res.render('admin/dashboard', {
      stats,
      provinces,
      username: req.session.username
    });
  } catch (err) {
    logger.error('渲染仪表盘失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 省份列表
router.get('/provinces', (req, res) => {
  try {
    const provinces = travelController.getAllProvinces();
    res.render('admin/provinces', {
      provinces,
      username: req.session.username
    });
  } catch (err) {
    logger.error('渲染省份列表失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 新增省份页面
router.get('/provinces/new', (req, res) => {
  res.render('admin/province-form', {
    province: null,
    username: req.session.username
  });
});

// 编辑省份页面
router.get('/provinces/:id/edit', (req, res) => {
  try {
    const province = travelController.getProvinceById(Number(req.params.id));
    if (!province) return res.status(404).send('省份不存在');

    res.render('admin/province-form', {
      province,
      username: req.session.username
    });
  } catch (err) {
    logger.error('渲染编辑页面失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 照片管理页面（按省份查看）
router.get('/photos', (req, res) => {
  try {
    const provinces = travelController.getAllProvinces();
    const provinceId = req.query.province_id ? Number(req.query.province_id) : null;

    let currentProvince = null;
    if (provinceId) {
      currentProvince = travelController.getProvinceById(provinceId);
    }

    res.render('admin/photos', {
      provinces,
      currentProvince,
      username: req.session.username
    });
  } catch (err) {
    logger.error('渲染照片管理页失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 评论管理页面
router.get('/comments', (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, p.display as province_display
      FROM comments c
      LEFT JOIN provinces p ON c.province_id = p.id
      ORDER BY c.created_at DESC
    `).all();

    res.render('admin/comments', {
      comments,
      username: req.session.username
    });
  } catch (err) {
    logger.error('渲染评论管理页失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 修改密码页面
router.get('/change-password', (req, res) => {
  res.render('admin/change-password', {
    username: req.session.username,
    error: null,
    success: null
  });
});

// 修改密码提交
router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.render('admin/change-password', {
        username: req.session.username,
        error: '请填写所有字段',
        success: null
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render('admin/change-password', {
        username: req.session.username,
        error: '两次输入的新密码不一致',
        success: null
      });
    }

    if (newPassword.length < 6) {
      return res.render('admin/change-password', {
        username: req.session.username,
        error: '新密码至少 6 位',
        success: null
      });
    }

    const result = await authController.changePassword(req.session.adminId, oldPassword, newPassword);
    if (!result.success) {
      return res.render('admin/change-password', {
        username: req.session.username,
        error: result.message,
        success: null
      });
    }

    res.render('admin/change-password', {
      username: req.session.username,
      error: null,
      success: '密码修改成功'
    });
  } catch (err) {
    logger.error('修改密码失败:', err);
    res.render('admin/change-password', {
      username: req.session.username,
      error: '操作失败，请重试',
      success: null
    });
  }
});

// 站点设置页面
router.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) { settings[r.key] = r.value; }

    res.render('admin/settings', {
      username: req.session.username,
      siteName: settings.site_name || '',
      siteFooter: settings.site_footer || '',
      error: null,
      success: null
    });
  } catch (err) {
    logger.error('渲染站点设置页失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 站点设置提交（含用户名修改）
router.post('/settings', async (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) { settings[r.key] = r.value; }
  const currentSiteName = settings.site_name || '';
  const currentSiteFooter = settings.site_footer || '';

  try {
    const { siteName, siteFooter, action, newUsername } = req.body;

    // 处理用户名修改
    if (action === 'changeUsername') {
      if (!newUsername || !newUsername.trim()) {
        return res.render('admin/settings', {
          username: req.session.username, siteName: currentSiteName, siteFooter: currentSiteFooter,
          error: '用户名不能为空', success: null
        });
      }
      const result = await authController.changeUsername(req.session.adminId, newUsername.trim());
      if (!result.success) {
        return res.render('admin/settings', {
          username: req.session.username, siteName: currentSiteName, siteFooter: currentSiteFooter,
          error: result.message, success: null
        });
      }
      // 更新 session 中的用户名
      req.session.username = result.username;
      return res.render('admin/settings', {
        username: result.username, siteName: currentSiteName, siteFooter: currentSiteFooter,
        error: null, success: '用户名已修改为「' + result.username + '」'
      });
    }

    // 处理站点设置
    if (!siteName || !siteName.trim()) {
      return res.render('admin/settings', {
        username: req.session.username, siteName: siteName || '', siteFooter: siteFooter || '',
        error: '站点名称不能为空', success: null
      });
    }

    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    upsert.run('site_name', siteName.trim());
    upsert.run('site_footer', (siteFooter || '').trim());

    logger.info(`站点设置已更新: "${siteName.trim()}"`);

    res.render('admin/settings', {
      username: req.session.username,
      siteName: siteName.trim(),
      siteFooter: (siteFooter || '').trim(),
      error: null,
      success: '站点设置已保存（立即生效）'
    });
  } catch (err) {
    logger.error('保存站点设置失败:', err);
    res.render('admin/settings', {
      username: req.session.username, siteName: (req.body && req.body.siteName) || '', siteFooter: (req.body && req.body.siteFooter) || '',
      error: '保存失败，请重试', success: null
    });
  }
});

module.exports = router;

/**
 * 认证路由 - 登录/登出
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登录页面
router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

// 登录提交
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.render('admin/login', { error: '请输入用户名和密码' });
    }

    const admin = await authController.login(username, password);
    if (!admin) {
      return res.render('admin/login', { error: '用户名或密码错误' });
    }

    req.session.adminId = admin.id;
    req.session.username = admin.username;
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin/login', { error: '登录失败，请重试' });
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;

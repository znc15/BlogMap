/**
 * 管理员鉴权中间件
 */

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  // API 请求返回 JSON，页面请求重定向
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }
  res.redirect('/admin/login');
}

module.exports = { requireAdmin };

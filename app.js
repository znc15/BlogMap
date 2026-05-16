/**
 * 旅行相册 CMS - Express 入口
 *
 * 启动流程:
 * 1. 初始化数据库连接和建表
 * 2. 运行种子数据（如果数据库为空）
 * 3. 异步拉取 GeoJSON 地图数据
 * 4. 启动 HTTP 服务
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const https = require('https');
const http = require('http');

const config = require('./config/default.json');
const logger = require('./utils/logger');
const { getDb, closeDb } = require('./db/index');

// 路由
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();

// ===== 视图引擎 =====
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ===== 静态文件 =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== 请求解析 =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Session =====
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 小时
  }
}));

// ===== 站点设置（从数据库读取，config 为初始 fallback） =====
function loadSiteSettings() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) { settings[r.key] = r.value; }
    return {
      name: settings.site_name || (config.site && config.site.name) || '足迹 · Footprints',
      footer: settings.site_footer || (config.site && config.site.footer) || '旅途中的光与风'
    };
  } catch (e) {
    return {
      name: (config.site && config.site.name) || '足迹 · Footprints',
      footer: (config.site && config.site.footer) || '旅途中的光与风'
    };
  }
}

// ===== 全局变量注入 =====
app.use((req, res, next) => {
  const site = loadSiteSettings();
  res.locals.currentYear = new Date().getFullYear();
  res.locals.siteName = site.name;
  res.locals.siteFooter = site.footer;
  res.locals.isAdmin = !!(req.session && req.session.adminId);
  res.locals.username = req.session ? req.session.username : null;
  next();
});

// ===== 访问统计中间件（仅记录前台页面） =====
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/admin') && !req.path.startsWith('/api')) {
    try {
      const db2 = getDb();
      const row = db2.prepare('SELECT count FROM visits WHERE path = ?').get(req.path);
      if (row) {
        db2.prepare('UPDATE visits SET count = count + 1, last_visit = datetime(\'now\') WHERE path = ?').run(req.path);
      } else {
        db2.prepare('INSERT INTO visits (path, count, last_visit) VALUES (?, 1, datetime(\'now\'))').run(req.path);
      }
    } catch (e) { /* 静默处理 */ }
  }
  next();
});

// ===== 路由注册 =====
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);

// ===== 404 处理 =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  res.status(404).send('404 - 页面不存在');
});

// ===== 错误处理 =====
app.use((err, req, res, next) => {
  logger.error('未捕获错误:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
  res.status(500).send('服务器内部错误');
});

// ===== GeoJSON 缓存拉取 =====
function fetchGeoJSON() {
  const cachePath = path.join(__dirname, config.geojson.cachePath);
  const cacheDir = path.dirname(cachePath);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // 如果缓存已存在且较新（7天内），跳过拉取
  if (fs.existsSync(cachePath)) {
    const stat = fs.statSync(cachePath);
    const age = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    if (age < 7) {
      logger.info('GeoJSON 缓存较新，跳过拉取');
      return;
    }
  }

  logger.info('正在拉取 GeoJSON 地图数据...');
  const url = config.geojson.url;

  const request = url.startsWith('https') ? https : http;
  request.get(url, (res) => {
    if (res.statusCode !== 200) {
      logger.warn(`GeoJSON 拉取失败 (HTTP ${res.statusCode})，使用缓存`);
      return;
    }

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        fs.writeFileSync(cachePath, data);
        logger.info('GeoJSON 地图数据已缓存到本地');
      } catch (err) {
        logger.warn('GeoJSON 写入失败:', err.message);
      }
    });
  }).on('error', (err) => {
    logger.warn('GeoJSON 拉取失败:', err.message, '（使用本地缓存）');
  });
}

// ===== 启动 =====
async function start() {
  const port = process.env.PORT || config.port || 48721;

  // 初始化数据库（确保表存在）
  const db = getDb();
  logger.info('数据库已连接');

  // 数据库迁移：添加新字段（用 try/catch 兼容已存在的情况）
  try { db.prepare("ALTER TABLE provinces ADD COLUMN status TEXT NOT NULL DEFAULT 'published'").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE photos ADD COLUMN camera TEXT NOT NULL DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE photos ADD COLUMN aperture TEXT NOT NULL DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE photos ADD COLUMN shutter TEXT NOT NULL DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE photos ADD COLUMN iso TEXT NOT NULL DEFAULT ''").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE photos ADD COLUMN focal_length TEXT NOT NULL DEFAULT ''").run(); } catch (e) {}

  // 运行种子数据
  try {
    const bcrypt = require('bcrypt');
    const db = getDb();

    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash(config.admin.password, 10);
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
        config.admin.username, passwordHash
      );
      logger.info('已创建管理员账号（密码为配置文件中的默认值，请登录后修改）');
    }

    const provinceCount = db.prepare('SELECT COUNT(*) as count FROM provinces').get().count;
    if (provinceCount === 0) {
      // 导入默认种子数据
      const seedData = require('./db/seed-data.json');
      const insertProvince = db.prepare(
        'INSERT OR IGNORE INTO provinces (province, display, period, diary) VALUES (?, ?, ?, ?)'
      );
      const insertPhoto = db.prepare(
        'INSERT INTO photos (province_id, src, caption, location, time, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
      );

      const transaction = db.transaction(() => {
        for (let i = 0; i < seedData.length; i++) {
          const d = seedData[i];
          const result = insertProvince.run(d.province, d.display, d.period, JSON.stringify(d.diary));
          const provinceId = result.lastInsertRowid;
          (d.photos || []).forEach((p, idx) => {
            insertPhoto.run(provinceId, p.src, p.caption, p.location, p.time, idx);
          });
        }
      });
      transaction();
      logger.info(`已导入 ${seedData.length} 个省份的种子数据`);
    }
  } catch (err) {
    logger.warn('种子数据初始化异常（可能已存在）:', err.message);
  }

  // 拉取 GeoJSON（异步，不阻塞启动）
  fetchGeoJSON();

  // 启动服务
  app.listen(port, () => {
    logger.info('========================================');
    logger.info(`  旅行相册 CMS 已启动`);
    logger.info(`  前台访问: http://localhost:${port}`);
    logger.info(`  后台管理: http://localhost:${port}/admin/login`);
    logger.info('  管理员账号: 请查看配置文件或运行种子脚本创建');
    logger.info('========================================');
  });
}

start().catch(err => {
  logger.error('启动失败:', err);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  logger.info('正在关闭服务...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

module.exports = app;

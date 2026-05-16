/**
 * 前台浏览路由
 * 访客无需登录即可浏览
 */

const express = require('express');
const router = express.Router();
const travelController = require('../controllers/travelController');
const { getDb } = require('../db/index');
const logger = require('../utils/logger');

// 首页 - 地图 + 时间轴 + 省份列表
router.get('/', (req, res) => {
  try {
    const provinces = travelController.getAllProvinces();
    const fullData = [];
    for (const p of provinces) {
      // 前台首页只展示已发布的（但为了统计数据一致性，保留全部）
      if (p.status !== 'published') continue;
      const full = travelController.getProvinceById(p.id);
      if (full) fullData.push(full);
    }

    const stats = {
      provinceCount: fullData.length,
      photoCount: fullData.reduce((s, p) => s + p.photos.length, 0)
    };

    res.render('index', {
      provinces: fullData,
      stats,
      isAdmin: !!(req.session && req.session.adminId)
    });
  } catch (err) {
    logger.error('渲染首页失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 省份详情页
router.get('/province/:id', (req, res) => {
  try {
    const province = travelController.getProvinceById(Number(req.params.id));
    if (!province) return res.status(404).send('省份不存在');

    // 前台仅展示已发布省份
    if (province.status !== 'published') {
      // 管理员可以看到草稿
      if (!(req.session && req.session.adminId)) {
        return res.status(404).send('省份不存在');
      }
    }

    // 使用 marked 渲染 Markdown 日记
    const marked = require('marked');
    const diaryText = Array.isArray(province.diary) ? province.diary.join('\n\n') : '';
    const renderedDiary = marked.parse(diaryText);

    // 获取已审核评论
    const db = getDb();
    const comments = db.prepare(
      'SELECT * FROM comments WHERE province_id = ? AND approved = 1 ORDER BY created_at DESC'
    ).all(province.id);

    res.render('detail', {
      province,
      comments,
      renderedDiary,
      isAdmin: !!(req.session && req.session.adminId)
    });
  } catch (err) {
    logger.error('渲染详情页失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// 分享卡片页面
router.get('/card/:id', (req, res) => {
  try {
    const province = travelController.getProvinceById(Number(req.params.id));
    if (!province) return res.status(404).send('省份不存在');

    const firstPhoto = province.photos && province.photos.length > 0 ? province.photos[0] : null;

    res.render('card', {
      province,
      firstPhoto,
      isAdmin: !!(req.session && req.session.adminId)
    });
  } catch (err) {
    logger.error('渲染分享卡片失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// RSS/Atom Feed
router.get('/rss.xml', (req, res) => {
  try {
    const { Feed } = require('feed');
    const provinces = travelController.getPublishedProvinces();

    const siteUrl = req.protocol + '://' + req.get('host');
    const feed = new Feed({
      title: '足迹 · Footprints',
      description: '旅行相册 - 用照片记录走过的路',
      id: siteUrl,
      link: siteUrl,
      language: 'zh-CN',
      updated: new Date(),
      generator: '旅行相册 CMS'
    });

    for (const p of provinces) {
      const diaryText = Array.isArray(p.diary) ? p.diary.join('\n\n') : '';
      feed.addItem({
        title: p.display + ' · 旅行记',
        id: siteUrl + '/province/' + p.id,
        link: siteUrl + '/province/' + p.id,
        description: diaryText.substring(0, 500),
        content: diaryText,
        date: p.updated_at ? new Date(p.updated_at) : new Date()
      });
    }

    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(feed.atom1());
  } catch (err) {
    logger.error('生成 RSS 失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// Sitemap
router.get('/sitemap.xml', (req, res) => {
  try {
    const provinces = travelController.getPublishedProvinces();
    const siteUrl = req.protocol + '://' + req.get('host');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${siteUrl}/</loc><priority>1.0</priority></url>\n`;

    for (const p of provinces) {
      xml += `  <url><loc>${siteUrl}/province/${p.id}</loc><priority>0.8</priority></url>\n`;
      xml += `  <url><loc>${siteUrl}/card/${p.id}</loc><priority>0.5</priority></url>\n`;
    }

    xml += '</urlset>';
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    logger.error('生成 Sitemap 失败:', err);
    res.status(500).send('服务器内部错误');
  }
});

// API 文档页面
router.get('/api-docs', (req, res) => {
  res.render('api-docs', {
    isAdmin: !!(req.session && req.session.adminId)
  });
});

module.exports = router;

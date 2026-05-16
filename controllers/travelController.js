/**
 * 旅行数据控制器
 * 处理省份和照片数据的查询
 */

const { getDb } = require('../db/index');
const logger = require('../utils/logger');

/**
 * 获取所有省份列表（含照片数量）
 */
function getAllProvinces() {
  const db = getDb();
  const provinces = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM photos WHERE province_id = p.id) as photo_count
    FROM provinces p
    ORDER BY p.updated_at DESC
  `).all();

  return provinces.map(p => ({
    ...p,
    diary: JSON.parse(p.diary || '[]')
  }));
}

/**
 * 获取已发布的省份（前台使用）
 */
function getPublishedProvinces() {
  const db = getDb();
  const provinces = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM photos WHERE province_id = p.id) as photo_count
    FROM provinces p
    WHERE p.status = 'published'
    ORDER BY p.updated_at DESC
  `).all();

  return provinces.map(p => ({
    ...p,
    diary: JSON.parse(p.diary || '[]')
  }));
}

/**
 * 获取单个省份详情（含照片）
 */
function getProvinceById(id) {
  const db = getDb();
  const province = db.prepare('SELECT * FROM provinces WHERE id = ?').get(id);
  if (!province) return null;

  province.diary = JSON.parse(province.diary || '[]');
  province.photos = db.prepare(
    'SELECT * FROM photos WHERE province_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(id);

  return province;
}

/**
 * 获取省份完整数据（用于前台渲染，仅已发布）
 */
function getProvinceDataForFrontend() {
  const provinces = getPublishedProvinces();
  const result = [];
  for (const p of provinces) {
    const full = getProvinceById(p.id);
    if (full) result.push(full);
  }
  return result;
}

/**
 * 获取统计数据（扩展版，含访问量和待审核评论）
 */
function getStats() {
  const db = getDb();
  const provinceCount = db.prepare('SELECT COUNT(*) as count FROM provinces').get().count;
  const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos').get().count;
  const recentProvince = db.prepare(
    'SELECT display, updated_at FROM provinces ORDER BY updated_at DESC LIMIT 1'
  ).get();

  // 访问统计
  const totalVisits = db.prepare('SELECT SUM(count) as total FROM visits').get();
  const todayVisits = db.prepare(
    "SELECT SUM(count) as total FROM visits WHERE date(last_visit) = date('now')"
  ).get();

  // 待审核评论数
  const pendingComments = db.prepare(
    'SELECT COUNT(*) as count FROM comments WHERE approved = 0'
  ).get().count;

  // 草稿数
  const draftCount = db.prepare(
    "SELECT COUNT(*) as count FROM provinces WHERE status = 'draft'"
  ).get().count;

  return {
    provinceCount,
    photoCount,
    recentProvince,
    totalVisits: totalVisits ? totalVisits.total || 0 : 0,
    todayVisits: todayVisits ? todayVisits.total || 0 : 0,
    pendingComments,
    draftCount
  };
}

/**
 * 创建省份
 */
function createProvince({ province, display, period, diary }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO provinces (province, display, period, diary) VALUES (?, ?, ?, ?)'
  ).run(province, display, period || '', JSON.stringify(diary || []));
  logger.info(`创建省份: ${display} (${province})`);
  return { id: result.lastInsertRowid };
}

/**
 * 更新省份
 */
function updateProvince(id, { province, display, period, diary, status }) {
  const db = getDb();
  const updates = [];
  const params = [];

  if (province !== undefined) { updates.push('province = ?'); params.push(province); }
  if (display !== undefined) { updates.push('display = ?'); params.push(display); }
  if (period !== undefined) { updates.push('period = ?'); params.push(period); }
  if (diary !== undefined) { updates.push('diary = ?'); params.push(JSON.stringify(diary)); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }

  if (updates.length === 0) return false;

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE provinces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  logger.info(`更新省份 ID: ${id}`);
  return true;
}

/**
 * 删除省份（级联删除照片）
 */
function deleteProvince(id) {
  const db = getDb();
  const province = db.prepare('SELECT display FROM provinces WHERE id = ?').get(id);
  if (!province) return false;

  db.prepare('DELETE FROM provinces WHERE id = ?').run(id);
  logger.info(`删除省份: ${province.display}`);
  return true;
}

/**
 * 导出所有数据为 JSON
 */
function exportAllData() {
  const provinces = getAllProvinces();
  const result = [];
  for (const p of provinces) {
    const full = getProvinceById(p.id);
    if (full) {
      result.push({
        province: full.province,
        display: full.display,
        period: full.period,
        status: full.status,
        diary: full.diary,
        photos: full.photos.map(ph => ({
          src: ph.src,
          caption: ph.caption,
          location: ph.location,
          time: ph.time,
          camera: ph.camera,
          aperture: ph.aperture,
          shutter: ph.shutter,
          iso: ph.iso,
          focal_length: ph.focal_length
        }))
      });
    }
  }
  return result;
}

/**
 * 从 JSON 导入数据
 */
function importData(data) {
  const db = getDb();
  if (!Array.isArray(data)) throw new Error('数据格式不正确，需要数组');

  const insertProvince = db.prepare(
    'INSERT INTO provinces (province, display, period, diary) VALUES (?, ?, ?, ?)'
  );
  const insertPhoto = db.prepare(
    'INSERT INTO photos (province_id, src, caption, location, time, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const checkExists = db.prepare('SELECT id FROM provinces WHERE province = ?');

  let imported = 0;
  const transaction = db.transaction(() => {
    for (const item of data) {
      if (!item.province || !item.display) continue;

      // 检查是否已存在
      const existing = checkExists.get(item.province);
      if (existing) continue;

      const result = insertProvince.run(
        item.province,
        item.display,
        item.period || '',
        JSON.stringify(item.diary || [])
      );
      const provinceId = result.lastInsertRowid;

      (item.photos || []).forEach((p, idx) => {
        insertPhoto.run(provinceId, p.src, p.caption || '', p.location || '', p.time || '', idx);
      });

      imported++;
    }
  });

  transaction();
  logger.info(`导入数据: ${imported} 个省份`);
  return imported;
}

module.exports = {
  getAllProvinces,
  getPublishedProvinces,
  getProvinceById,
  getProvinceDataForFrontend,
  getStats,
  createProvince,
  updateProvince,
  deleteProvince,
  exportAllData,
  importData
};

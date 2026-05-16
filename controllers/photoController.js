/**
 * 照片控制器
 * 处理照片上传、更新、删除、排序
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const exifReader = require('exif-reader');
const { getDb } = require('../db/index');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

/**
 * 为上传的图片生成缩略图和 WebP 版本（保留原图）
 */
async function processImage(filePath) {
  try {
    const basename = path.basename(filePath, path.extname(filePath));
    const dir = path.dirname(filePath);
    const thumbPath = path.join(dir, basename + '_thumb.jpg');
    const webpPath = path.join(dir, basename + '.webp');

    // 缩略图
    await sharp(filePath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(thumbPath);

    // WebP 版本
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(webpPath);

    return path.basename(filePath);
  } catch (err) {
    logger.warn('图片处理失败（非致命）:', err.message);
    return path.basename(filePath);
  }
}

/**
 * 从照片文件读取 EXIF 信息
 */
async function readExif(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // sharp 可以读取原始数据中的 exif
    const metadata = await sharp(filePath).metadata();
    if (metadata.exif) {
      const exifData = exifReader(metadata.exif);
      const exif = exifData.exif || {};
      const photo = exifData.photo || {};
      return {
        camera: (exifData.image && (exifData.image.Make && exifData.image.Model
          ? String(exifData.image.Make).trim() + ' ' + String(exifData.image.Model).trim()
          : (exifData.image.Make || exifData.image.Model || ''))) || '',
        aperture: exif.FNumber ? 'f/' + exif.FNumber : '',
        shutter: exif.ExposureTime ? exif.ExposureTime + 's' : '',
        iso: exif.ISOSpeedRatings ? 'ISO ' + exif.ISOSpeedRatings : '',
        focal_length: exif.FocalLength ? exif.FocalLength + 'mm' : ''
      };
    }
    return {};
  } catch (err) {
    logger.warn('EXIF 读取失败:', err.message);
    return {};
  }
}

/**
 * 添加照片
 */
async function addPhoto({ provinceId, src, caption, location, time, file }) {
  const db = getDb();

  let finalSrc = src;
  let exifData = {};

  // 如果是上传的文件
  if (file) {
    // 读取 EXIF
    exifData = await readExif(file.path);
    const filename = await processImage(file.path);
    finalSrc = '/uploads/' + filename;
  }

  // 获取当前最大排序值
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM photos WHERE province_id = ?'
  ).get(provinceId);

  const sortOrder = (maxOrder.max || 0) + 1;

  const result = db.prepare(
    `INSERT INTO photos (province_id, src, caption, location, time, sort_order, camera, aperture, shutter, iso, focal_length)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    provinceId, finalSrc, caption || '', location || '', time || '', sortOrder,
    exifData.camera || '', exifData.aperture || '', exifData.shutter || '',
    exifData.iso || '', exifData.focal_length || ''
  );

  logger.info(`添加照片到省份 ID: ${provinceId}`);
  return { id: result.lastInsertRowid, src: finalSrc };
}

/**
 * 更新照片
 */
function updatePhoto(id, { caption, location, time, camera, aperture, shutter, iso, focal_length }) {
  const db = getDb();
  const updates = [];
  const params = [];

  if (caption !== undefined) { updates.push('caption = ?'); params.push(caption); }
  if (location !== undefined) { updates.push('location = ?'); params.push(location); }
  if (time !== undefined) { updates.push('time = ?'); params.push(time); }
  if (camera !== undefined) { updates.push('camera = ?'); params.push(camera); }
  if (aperture !== undefined) { updates.push('aperture = ?'); params.push(aperture); }
  if (shutter !== undefined) { updates.push('shutter = ?'); params.push(shutter); }
  if (iso !== undefined) { updates.push('iso = ?'); params.push(iso); }
  if (focal_length !== undefined) { updates.push('focal_length = ?'); params.push(focal_length); }

  if (updates.length === 0) return false;

  params.push(id);
  db.prepare(`UPDATE photos SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return true;
}

/**
 * 删除照片
 */
function deletePhoto(id) {
  const db = getDb();
  const photo = db.prepare('SELECT src FROM photos WHERE id = ?').get(id);
  if (!photo) return false;

  // 删除本地文件
  if (photo.src && photo.src.startsWith('/uploads/')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(photo.src));
    const basename = path.basename(filePath, path.extname(filePath));
    const thumbPath = path.join(path.dirname(filePath), basename + '_thumb.jpg');
    const webpPath = path.join(path.dirname(filePath), basename + '.webp');
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { logger.warn('删除照片文件失败:', e.message); }
    try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch (e) { logger.warn('删除缩略图文件失败:', e.message); }
    try { if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath); } catch (e) { logger.warn('删除 WebP 文件失败:', e.message); }
  }

  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  logger.info(`删除照片 ID: ${id}`);
  return true;
}

/**
 * 批量删除照片
 */
function batchDeletePhotos(ids) {
  const db = getDb();
  if (!Array.isArray(ids) || ids.length === 0) return false;

  // 获取所有照片信息以删除文件
  const placeholders = ids.map(() => '?').join(',');
  const photos = db.prepare(`SELECT src FROM photos WHERE id IN (${placeholders})`).all(...ids);

  for (const photo of photos) {
    if (photo.src && photo.src.startsWith('/uploads/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(photo.src));
      const basename = path.basename(filePath, path.extname(filePath));
      const thumbPath = path.join(path.dirname(filePath), basename + '_thumb.jpg');
      const webpPath = path.join(path.dirname(filePath), basename + '.webp');
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
      try { if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch (e) {}
      try { if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath); } catch (e) {}
    }
  }

  db.prepare(`DELETE FROM photos WHERE id IN (${placeholders})`).run(...ids);
  logger.info(`批量删除照片: ${ids.length} 张`);
  return true;
}

/**
 * 重新排序照片
 */
function reorderPhotos(photoIds) {
  const db = getDb();
  const update = db.prepare('UPDATE photos SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    photoIds.forEach((id, index) => {
      update.run(index, id);
    });
  });
  transaction();
  logger.info('照片排序已更新');
  return true;
}

module.exports = { addPhoto, updatePhoto, deletePhoto, batchDeletePhotos, reorderPhotos, processImage };

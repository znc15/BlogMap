/**
 * Multer 文件上传配置
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // 验证 MIME 类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  // 验证文件扩展名（双重校验，防止 MIME 伪造）
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    logger.warn(`上传被拒绝: ${file.originalname} (mime: ${file.mimetype}, ext: ${ext})`);
    return cb(new Error('仅允许上传 JPG/PNG/WebP 格式的图片'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * 上传错误处理中间件
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    logger.error('上传错误:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next();
}

module.exports = { upload, handleUploadError };

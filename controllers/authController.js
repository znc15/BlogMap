/**
 * 认证控制器
 */

const bcrypt = require('bcrypt');
const { getDb } = require('../db/index');
const logger = require('../utils/logger');

/**
 * 管理员登录
 */
async function login(username, password) {
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin) {
    logger.warn(`登录失败：用户 ${username} 不存在`);
    return null;
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    logger.warn(`登录失败：密码错误 (${username})`);
    return null;
  }

  logger.info(`管理员登录成功: ${username}`);
  return { id: admin.id, username: admin.username };
}

/**
 * 修改密码
 */
async function changePassword(adminId, oldPassword, newPassword) {
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);

  if (!admin) return { success: false, message: '管理员不存在' };

  const match = await bcrypt.compare(oldPassword, admin.password_hash);
  if (!match) return { success: false, message: '原密码错误' };

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, adminId);
  logger.info(`密码已修改 (admin ID: ${adminId})`);
  return { success: true };
}

/**
 * 修改用户名
 */
async function changeUsername(adminId, newUsername) {
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
  if (!admin) return { success: false, message: '管理员不存在' };

  // 检查用户名是否被占用
  const existing = db.prepare('SELECT id FROM admins WHERE username = ? AND id != ?').get(newUsername, adminId);
  if (existing) return { success: false, message: '该用户名已被使用' };

  db.prepare('UPDATE admins SET username = ? WHERE id = ?').run(newUsername, adminId);
  logger.info(`用户名已修改 (admin ID: ${adminId}): ${admin.username} → ${newUsername}`);
  return { success: true, username: newUsername };
}

module.exports = { login, changePassword, changeUsername };

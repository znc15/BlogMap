-- 旅行相册 CMS 数据库建表语句

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provinces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province TEXT NOT NULL UNIQUE,
  display TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT '',
  diary TEXT NOT NULL DEFAULT '[]',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province_id INTEGER NOT NULL,
  src TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_province_id ON photos(province_id);
CREATE INDEX IF NOT EXISTS idx_photos_sort_order ON photos(sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- 默认站点设置
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_name', '足迹 · Footprints');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_footer', '旅途中的光与风');

-- 访问统计表
CREATE TABLE IF NOT EXISTS visits (
  path TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  last_visit DATETIME DEFAULT (datetime('now'))
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  province_id INTEGER NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_province_id ON comments(province_id);

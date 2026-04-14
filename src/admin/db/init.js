'use strict';

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'cms.db');

let db;

function initDatabase() {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cms_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      i18n_key TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
      sub_category TEXT DEFAULT '',
      model TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT '在售',
      is_active INTEGER DEFAULT 1,
      badge TEXT DEFAULT '',
      badge_color TEXT DEFAULT '',
      power TEXT DEFAULT '',
      throughput TEXT DEFAULT '',
      average_time TEXT DEFAULT '',
      voltage TEXT DEFAULT '',
      frequency TEXT DEFAULT '',
      material TEXT DEFAULT '',
      product_dimensions TEXT DEFAULT '',
      color TEXT DEFAULT '',
      control_method TEXT DEFAULT '',
      launch_time TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      alt_text TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      width INTEGER,
      height INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT DEFAULT '',
      action TEXT NOT NULL,
      table_name TEXT DEFAULT '',
      record_id INTEGER,
      old_data TEXT,
      new_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_media_created ON media_library(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  `);

  // Ensure default admin user
  const adminExists = db.prepare('SELECT id FROM cms_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO cms_users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function logAudit(db, userId, username, action, tableName, recordId, oldData, newData) {
  db.prepare(
    'INSERT INTO audit_log (user_id, username, action, table_name, record_id, old_data, new_data) VALUES (?,?,?,?,?,?,?)'
  ).run(userId, username || '', action, tableName || '', recordId || null,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null);
}

module.exports = { initDatabase, getDb, logAudit };

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// DB path relative to KitchenYuKoLi root
const DB_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'KitchenYuKoLiServer', 'src', 'admin', 'data', 'cms.db');

/**
 * Sync a single language's product translations from JSON to SQLite.
 * @param {string} lang - Language code (e.g. 'ja')
 * @param {object} [opts] - Options
 * @param {boolean} [opts.dryRun] - Preview only
 * @returns {{ lang: string, total: number, upserted: number, missing: number[], dbFound: boolean }}
 */
function syncProductTranslationsToServer(lang, opts) {
  opts = opts || {};
  const result = { lang: lang, total: 0, upserted: 0, missing: [], dbFound: false };

  // Read JSON
  const langDir = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'lang');
  const jsonFile = path.join(langDir, lang + '-product.json');
  if (!fs.existsSync(jsonFile)) {
    console.warn('[sync-server] JSON not found: ' + jsonFile);
    return result;
  }
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

  // Group by product_id
  const products = {};
  for (const key of Object.keys(data)) {
    const m = key.match(/^product_(\d+)_(name|specifications|usage|throughput)$/);
    if (!m) continue;
    const pid = m[1];
    const field = m[2];
    if (!products[pid]) products[pid] = {};
    products[pid][field] = String(data[key]);
  }

  const productIds = Object.keys(products);
  result.total = productIds.length;
  if (productIds.length === 0) return result;

  // Check DB exists
  if (!fs.existsSync(DB_PATH)) {
    console.warn('[sync-server] KitchenYuKoLiServer DB not found: ' + DB_PATH);
    return result;
  }
  result.dbFound = true;

  // Try better-sqlite3 first, fall back to sqlite3 CLI
  let useBetterSqlite;
  try { require('better-sqlite3'); useBetterSqlite = true; } catch (_) { useBetterSqlite = false; }

  if (useBetterSqlite) {
    return _syncWithBetterSqlite(products, productIds, lang, opts, result);
  } else {
    return _syncWithCli(products, productIds, lang, opts, result);
  }
}

function _syncWithBetterSqlite(products, productIds, lang, opts, result) {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH, { readonly: false });
  const upsert = db.prepare(
    'INSERT INTO product_translations (product_id, lang, name, specifications, usage, throughput) ' +
    'VALUES (?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(product_id, lang) DO UPDATE SET name=excluded.name, specifications=excluded.specifications, usage=excluded.usage, throughput=excluded.throughput'
  );

  const ensureTable = db.prepare(
    "CREATE TABLE IF NOT EXISTS product_translations (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, " +
    "lang TEXT NOT NULL DEFAULT 'en', name TEXT DEFAULT '', specifications TEXT DEFAULT '', " +
    "usage TEXT DEFAULT '', throughput TEXT DEFAULT '', " +
    "UNIQUE(product_id, lang))"
  );
  ensureTable.run();

  const txn = db.transaction(() => {
    for (const pid of productIds) {
      const p = products[pid];
      try {
        if (!opts.dryRun) {
          upsert.run(Number(pid), lang, p.name || '', p.specifications || '', p.usage || '', p.throughput || '');
        }
        result.upserted++;
      } catch (e) {
        result.missing.push(pid);
      }
    }
  });
  txn();
  db.close();
  return result;
}

function _syncWithCli(products, productIds, lang, opts, result) {
  // Ensure table
  try {
    execSync('sqlite3 "' + DB_PATH + '" "' +
      "CREATE TABLE IF NOT EXISTS product_translations (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, " +
      "lang TEXT NOT NULL DEFAULT 'en', name TEXT DEFAULT '', specifications TEXT DEFAULT '', " +
      "usage TEXT DEFAULT '', throughput TEXT DEFAULT '', " +
      "UNIQUE(product_id, lang))\"", { stdio: 'pipe' });
  } catch (_) {}

  for (const pid of productIds) {
    const p = products[pid];
    // Check product exists
    try {
      const check = execSync('sqlite3 "' + DB_PATH + '" "SELECT id FROM products WHERE id=' + pid + '"', { encoding: 'utf-8' }).trim();
      if (!check) { result.missing.push(pid); continue; }
    } catch (_) { result.missing.push(pid); continue; }

    if (!opts.dryRun) {
      const name = (p.name || '').replace(/'/g, "''");
      const specs = (p.specifications || '').replace(/'/g, "''");
      const usage = (p.usage || '').replace(/'/g, "''");
      const throughput = (p.throughput || '').replace(/'/g, "''");
      const sql = "INSERT INTO product_translations (product_id, lang, name, specifications, usage, throughput) " +
        "VALUES (" + pid + ", '" + lang + "', '" + name + "', '" + specs + "', '" + usage + "', '" + throughput + "') " +
        "ON CONFLICT(product_id, lang) DO UPDATE SET name=excluded.name, specifications=excluded.specifications, usage=excluded.usage, throughput=excluded.throughput;";
      try {
        execSync('sqlite3 "' + DB_PATH + '" "' + sql + '"', { stdio: 'pipe' });
        result.upserted++;
      } catch (e) {
        result.missing.push(pid);
      }
    } else {
      result.upserted++;
    }
  }
  return result;
}

/**
 * Convenience: sync all languages or a specific one. Used by auto-sync trigger.
 * @param {string} [lang] - Specific language, or undefined for the lang being saved
 * @returns {object} sync result
 */
function autoSync(lang) {
  if (!lang) return syncProductTranslationsToServer;
  return syncProductTranslationsToServer(lang);
}

module.exports = { syncProductTranslationsToServer, autoSync, DB_PATH };

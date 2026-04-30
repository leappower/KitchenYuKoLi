'use strict';

const { getDb, logAudit } = require('../db/init');
const path = require('path');
const fs = require('fs');

function importRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth, requireAdmin } = require('./auth');
  const multer = require('multer');

  // Separate multer instance for import (single file, different field name)
  const importUpload = multer({
    dest: path.join(__dirname, '..', 'data', 'tmp'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // Category mapping rules: model prefix → category_id
  const CATEGORY_RULES = [
    { prefix: ['DLB-', 'DLBZ', 'F32', 'F12', 'G26', 'G30', 'G35', 'G40', 'G50', 'G60', 'G70', 'G80', 'J40'], categoryId: 4, name: '翻炒系列' },
    { prefix: ['Y12', 'Y24', 'Y50'], categoryId: 5, name: '油炸系列' },
    { prefix: ['DLB-ZNT', 'DLB-ZNY', 'LZ', 'LZB', 'LZD', 'LZF', 'M30', 'M40', 'M50', 'B30', 'B40', 'B50', 'GT'], categoryId: 6, name: '炖煮系列' },
    { prefix: ['Z6', 'Z8', 'Z12'], categoryId: 7, name: '蒸煮系列' },
  ];

  function matchCategory(model) {
    for (var i = 0; i < CATEGORY_RULES.length; i++) {
      var rule = CATEGORY_RULES[i];
      for (var j = 0; j < rule.prefix.length; j++) {
        if (model.toUpperCase().startsWith(rule.prefix[j].toUpperCase())) return rule;
      }
    }
    return { categoryId: 8, name: '其他设备' };
  }

  // Extract structured fields from specifications text
  function extractSpecFields(specText) {
    if (!specText) return {};
    var result = {};
    var rules = [
      { field: 'power', patterns: [/功率[：:]\s*(\S+)/, /功率[：:]\s*([^\n,，]+)/] },
      { field: 'voltage', patterns: [/电压[：:]\s*(\S+)/] },
      { field: 'frequency', patterns: [/频率[：:]\s*(\S+)/] },
      { field: 'material', patterns: [/材质[：:]\s*(\S+)/, /材质[：:]\s*([^\n,，]+)/] },
      { field: 'throughput', patterns: [/产能[：:]\s*(\S+)/, /产能[：:]\s*([^\n,，]+)/] },
      { field: 'control_method', patterns: [/控制方式[：:]\s*(\S+)/, /控制[：:]\s*(\S+)/] },
    ];
    rules.forEach(function(rule) {
      for (var i = 0; i < rule.patterns.length; i++) {
        var m = specText.match(rule.patterns[i]);
        if (m) { result[rule.field] = m[1].trim(); break; }
      }
    });
    return result;
  }

  // Parse Excel file and return structured product data
  function parseExcel(filePath) {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // First sheet
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    var products = [];
    var errors = [];
    var seen = new Set();

    rows.forEach(function(row, idx) {
      // Try to find the model column
      var model = row['型号'] || row['型号（命名规则）'] || row['model'] || '';
      var name = row['名称'] || row['产品名称'] || row['name'] || '';
      var dims = row['尺寸'] || row['外形尺寸'] || row['dimensions'] || '';
      var specs = row['配置'] || row['产品配置'] || row['specifications'] || '';
      var throughput = row['用途和产能'] || row['产能'] || row['throughput'] || '';
      var catHint = row['类别'] || row['分类'] || row['category'] || '';

      if (!model || !model.toString().trim()) return;
      model = model.toString().trim();

      // Handle compound models like "DLB-GQ40 / DLB-GQ40R"
      var models = model.split(/[/\\]/).map(function(m) { return m.trim(); }).filter(Boolean);

      models.forEach(function(m) {
        if (seen.has(m)) return;
        seen.add(m);

        var cat = catHint ? matchCategoryByHint(catHint) : matchCategory(m);
        var extracted = extractSpecFields(specs);

        products.push({
          model: m,
          name: name || '',
          specifications: specs || '',
          product_dimensions: dims || '',
          throughput: throughput || '',
          category_id: cat.categoryId,
          category_name: cat.name,
          power: extracted.power || '',
          voltage: extracted.voltage || '',
          frequency: extracted.frequency || '',
          material: extracted.material || '',
          control_method: extracted.control_method || '',
          // Override throughput if extracted from specs
          throughput: extracted.throughput || throughput || '',
        });
      });
    });

    return { products, errors, total: rows.length, sheet: sheetName };
  }

  function matchCategoryByHint(hint) {
    if (!hint) return null;
    var h = hint.toString().trim();
    var map = { '翻炒': { categoryId: 4, name: '翻炒系列' }, '油炸': { categoryId: 5, name: '油炸系列' }, '炖煮': { categoryId: 6, name: '炖煮系列' }, '蒸煮': { categoryId: 7, name: '蒸煮系列' } };
    for (var key in map) {
      if (h.indexOf(key) !== -1) return map[key];
    }
    return null;
  }

  // Extract images from Excel ZIP
  function extractImages(filePath) {
    const AdmZip = require('adm-zip');
    const sharp = require('sharp');
    const images = {};
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
    
    // Ensure directory exists
    fs.mkdirSync(uploadsDir, { recursive: true });

    try {
      var zip = new AdmZip(filePath);
      var entries = zip.getEntries();
      
      entries.forEach(function(entry) {
        if (entry.entryName.match(/\.(png|jpg|jpeg|bmp|gif)$/i) && !entry.isDirectory) {
          var ext = path.extname(entry.entryName).toLowerCase();
          var baseName = path.basename(entry.entryName, ext);
          var webpName = baseName + '.webp';
          var webpPath = path.join(uploadsDir, webpName);
          
          try {
            var buf = entry.getData();
            sharp(buf)
              .webp({ quality: 80 })
              .toFile(webpPath)
              .then(function() {
                images[baseName] = '/admin/uploads/products/' + webpName;
              })
              .catch(function(err) {
                console.error('[Import] Failed to convert image:', baseName, err.message);
              });
          } catch(e) {
            console.error('[Import] Failed to extract image:', baseName, e.message);
          }
        }
      });
    } catch(e) {
      console.error('[Import] Failed to read ZIP:', e.message);
    }

    return images;
  }

  // POST /import/excel — preview (dry_run=true) or execute import
  router.post('/import/excel', requireAdmin, importUpload.single('file'), async function(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      var filePath = req.file.path;
      var dryRun = req.body.dry_run === 'true' || req.body.dry_run === true;

      // Parse Excel
      var result = parseExcel(filePath);

      if (dryRun) {
        // Preview mode: return parsed data without writing
        fs.unlinkSync(filePath); // Clean up temp file
        return res.json({
          mode: 'preview',
          sheet: result.sheet,
          total_rows: result.total,
          products_found: result.products.length,
          products: result.products,
          errors: result.errors
        });
      }

      // Execute mode: write to DB
      var imported = 0;
      var skipped = 0;
      var updated = 0;

      var insertStmt = db.prepare(
        `INSERT INTO products (category_id, model, name, specifications, product_dimensions, throughput, power, voltage, frequency, material, control_method, status, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '在售', 1, 0)`
      );

      var updateStmt = db.prepare(
        `UPDATE products SET name = ?, specifications = ?, product_dimensions = ?, throughput = ?, power = ?, voltage = ?, frequency = ?, material = ?, control_method = ?, category_id = ?, updated_at = datetime('now')
         WHERE model = ?`
      );

      var checkStmt = db.prepare('SELECT id FROM products WHERE model = ?');

      var batch = db.transaction(function() {
        result.products.forEach(function(p) {
          var existing = checkStmt.get(p.model);
          if (existing) {
            updateStmt.run(p.name, p.specifications, p.product_dimensions, p.throughput, p.power, p.voltage, p.frequency, p.material, p.control_method, p.category_id, p.model);
            updated++;
          } else {
            insertStmt.run(p.category_id, p.model, p.name, p.specifications, p.product_dimensions, p.throughput, p.power, p.voltage, p.frequency, p.material, p.control_method);
            imported++;
          }
        });
      });
      batch();

      // Clean up temp file
      fs.unlinkSync(filePath);

      logAudit(db, req.user.userId, req.user.username, 'import', 'products', null, null, {
        total: result.products.length,
        imported: imported,
        updated: updated,
        skipped: skipped
      });

      res.json({
        mode: 'executed',
        total_rows: result.total,
        products_found: result.products.length,
        imported: imported,
        updated: updated,
        skipped: skipped,
        errors: result.errors
      });

    } catch(e) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch(ignored) {}
      }
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { importRoutes };

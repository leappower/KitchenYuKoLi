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
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB (Excel with embedded images)
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
      { field: 'power', patterns: [/额定功率[：:]*\s*([\d.]+[wW]\s*[-–—~～]\s*[\d.]+[wW])/i, /额定功率[：:]*\s*([\d.]+\s*[-–—~～]\s*[\d.]+\s*[kKmM]?[wW])/i, /额定功率[：:]*\s*([\d.]+\s*[kKmM]?[wW])/i, /功率[：:]*\s*([\d.]+[wW]\s*[-–—~～]\s*[\d.]+[wW])/i, /功率[：:]*\s*([\d.]+\s*[-–—~～]\s*[\d.]+\s*[kKmM]?[wW])/i, /功率[：:]*\s*([\d.]+\s*[kKmM]?[wW])/i, /电功率[：:]*\s*([\d.]+\s*[kKmM]?[wW])/i] },
      { field: 'voltage', patterns: [/额定电压[：:]*\s*([\d.]+[vV]\s*[-–—~～]\s*[\d.]+[vV])/i, /额定电压[：:]*\s*([\d.]+\s*[vV][\/]?[\d]*)/i, /电压[：:]*\s*([\d.]+[vV]\s*[-–—~～]\s*[\d.]+[vV])/i, /电压[：:]*\s*([\d.]+\s*[vV][\/]?[\d]*)/i] },
      { field: 'frequency', patterns: [/频率[：:]*\s*([\d.]+[hH][zZ]\s*[-–—~～]\s*[\d.]+[hH][zZ])/i, /频率[：:]*\s*([\d.]+[\/]\s*[\d.]+\s*[hH][zZ])/i, /频率[：:]*\s*([\d.]+\s*[hH][zZ])/i, /[/]50Hz/i] },
      { field: 'material', patterns: [/锅体材质[：:]*\s*([^\n，,]+)/, /产品材质[：:]*\s*([^\n，,]+)/, /水箱材质[：:]*\s*([^\n，,]+)/, /材质[：:]*\s*([^\n，,]+)/] },
      { field: 'throughput', patterns: [/产能[：:]*\s*([^\n。]+)/, /产品产能[：:]*\s*([^\n。]+)/, /炒菜重量[：:]*\s*([^\n，,]+)/] },
      { field: 'control_method', patterns: [/操作方式[：:]*\s*([^\n，,]+)/, /控制方式[：:]*\s*([^\n，,]+)/, /控制面板[：:]*\s*([^\n，,]+)/] },
      { field: 'product_dimensions', patterns: [/机器尺寸[：:]*\s*([^\n，,]+)/, /外形尺寸[：:]*\s*([^\n，,]+)/, /配锅尺寸[^：:]*[：:]*\s*([^\n，,]+)/] },
    ];
    rules.forEach(function(rule) {
      for (var i = 0; i < rule.patterns.length; i++) {
        var m = specText.match(rule.patterns[i]);
        if (m && m[1]) { result[rule.field] = m[1].trim(); break; }
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

    // Count embedded images in the Excel (ZIP scan, no decoding)
    var imageCount = 0;
    var imageFiles = [];
    try {
      const AdmZip = require('adm-zip');
      var zip = new AdmZip(filePath);
      zip.getEntries().forEach(function(entry) {
        if (entry.entryName.match(/\.(png|jpg|jpeg|bmp|gif|emf|wmf|tiff)$/i) && !entry.isDirectory) {
          imageCount++;
          imageFiles.push(entry.entryName);
        }
      });
    } catch(e) {
      // Not a valid ZIP or adm-zip unavailable
    }
    console.log('[Import] Embedded images:', imageCount, imageFiles.length > 0 ? imageFiles.slice(0, 5) : []);

    // Log actual column names for debugging
    if (rows.length > 0) {
      console.log('[Import] Excel columns:', JSON.stringify(Object.keys(rows[0])));
    }

    // Fuzzy column matcher: find key by partial match
    function findCol(row, candidates) {
      var keys = Object.keys(row);
      for (var i = 0; i < candidates.length; i++) {
        // Exact match first
        if (row[candidates[i]] !== undefined) return row[candidates[i]];
        // Partial match
        for (var j = 0; j < keys.length; j++) {
          if (keys[j].indexOf(candidates[i]) !== -1 || candidates[i].indexOf(keys[j]) !== -1) {
            return row[keys[j]];
          }
        }
      }
      return '';
    }

    var products = [];
    var errors = [];
    var seen = new Set();

    rows.forEach(function(row, idx) {
      // Try to find the model column (fuzzy matching)
      var model = findCol(row, ['型号', 'model', 'Model', 'MODEL']);
      var name = findCol(row, ['名称', '产品名称', 'name', 'Name']);
      var dims = findCol(row, ['尺寸', '外形尺寸', 'dimensions', 'Dimensions', '外尺寸']);
      var specs = findCol(row, ['配置', '产品配置', 'specifications', 'Specifications', '参数', '规格']);
      var catHint = findCol(row, ['类别', '分类', 'category', 'Category', '系列']);

      // Normalize — clean whitespace/newlines from Excel cells
      model = model ? model.toString().replace(/[\r\n]+/g, '').replace(/\s{2,}/g, ' ').trim() : '';
      name = name ? name.toString().replace(/[\r\n]+/g, '').replace(/\s{2,}/g, ' ').trim() : '';
      dims = dims ? dims.toString().replace(/[\r\n]+/g, '').replace(/\s{2,}/g, ' ').trim() : '';
      specs = specs ? specs.toString().trim() : '';
      catHint = catHint ? catHint.toString().replace(/[\r\n]+/g, '').replace(/\s{2,}/g, ' ').trim() : '';

      // If model is empty, try to derive from name (e.g. "台式360智能电磁炒菜机（电动）")
      if (!model && name) {
        // Try to find a model-like pattern in the name
        var modelFromName = name.match(/[A-Z]{1,3}[-]?\d{2,}[A-Z]?[A-Z0-9]*/);
        if (modelFromName) {
          model = modelFromName[0];
        } else {
          // No alphanumeric model code — use entire name as model
          model = name;
          name = '';
        }
      }

      if (!model) return;

      // Handle compound models like "DLB-GQ40 / DLB-GQ40R"
      var models = model.split(/[/\\]/).map(function(m) { return m.trim(); }).filter(Boolean);

      models.forEach(function(m) {
        if (seen.has(m)) return;
        seen.add(m);

        var cat = catHint ? matchCategoryByHint(catHint) : matchCategory(m);
        var extracted = extractSpecFields(specs);
        var extractedDims = extracted.product_dimensions || '';

        products.push({
          model: m,
          name: name || '',
          specifications: specs || '',
          product_dimensions: dims || extractedDims || '',
          throughput: extracted.throughput || '',
          category_id: cat.categoryId,
          category_name: cat.name,
          power: extracted.power || '',
          voltage: extracted.voltage || '',
          frequency: extracted.frequency || '',
          material: extracted.material || '',
          control_method: extracted.control_method || '',
        });
      });
    });

    return { products, errors, total: rows.length, sheet: sheetName, _columns: rows.length > 0 ? Object.keys(rows[0]) : [], image_count: imageCount, image_files: imageFiles };
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

  // Sanitize model name for use as filename
  function sanitizeForFilename(str) {
    return str.replace(/[\/\\\s\(\)\[\]\{\}<>"':;|&@#~`!\^\*\+\=\?]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  // Extract images from Excel ZIP (async)
  // products: ordered array of {model, ...} matching row order
  // Returns array of {filePath, model, index}
  async function extractImages(filePath, products) {
    const AdmZip = require('adm-zip');
    const sharp = require('sharp');
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
    var extracted = [];
    
    fs.mkdirSync(uploadsDir, { recursive: true });

    try {
      var zip = new AdmZip(filePath);
      var entries = zip.getEntries();
      
      var imgIdx = 0;
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.entryName.match(/\.(png|jpg|jpeg|bmp|gif|emf|wmf)$/i) && !entry.isDirectory) {
          try {
            var buf = entry.getData();
            // Skip tiny/invalid images (< 1KB)
            if (buf.length < 1024) continue;

            // Determine product by index
            var product = products[imgIdx] || null;
            var safeModel = product ? sanitizeForFilename(product.model) : ('image' + (imgIdx + 1));
            var webpName = safeModel + '_' + (imgIdx + 1) + '.webp';
            var webpPath = path.join(uploadsDir, webpName);

            await sharp(buf)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toFile(webpPath);

            extracted.push({
              filePath: '/admin/uploads/products/' + webpName,
              localPath: webpPath,
              fileName: webpName,
              model: product ? product.model : null,
              index: imgIdx
            });
            imgIdx++;
          } catch(err) {
            console.error('[Import] Failed to convert image:', entry.entryName, err.message);
          }
        }
      }
    } catch(e) {
      console.error('[Import] Failed to read ZIP:', e.message);
    }

    return extracted;
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
          errors: result.errors,
          // Debug: include column names from first row
          _debug_columns: result._columns,
          _debug_first_product: result.products[0] || null,
          image_count: result.image_count,
          image_files: result.image_files
        });
      }

      // Execute mode: write to DB
      var imported = 0;
      var skipped = 0;
      var updated = 0;
      var imagesLinked = 0;

      // Extract images from Excel (before writing products)
      var extractedImages = await extractImages(filePath, result.products);
      console.log('[Import] Extracted', extractedImages.length, 'images from Excel');

      var insertStmt = db.prepare(
        `INSERT INTO products (category_id, model, name, specifications, product_dimensions, throughput, power, voltage, frequency, material, control_method, status, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '在售', 1, 0)`
      );

      var updateStmt = db.prepare(
        `UPDATE products SET name = ?, specifications = ?, product_dimensions = ?, throughput = ?, power = ?, voltage = ?, frequency = ?, material = ?, control_method = ?, category_id = ?, updated_at = datetime('now')
         WHERE model = ?`
      );

      var checkStmt = db.prepare('SELECT id FROM products WHERE model = ?');

      var insertImgStmt = db.prepare(
        'INSERT INTO product_images (product_id, file_path, is_primary, sort_order) VALUES (?, ?, ?, ?)'
      );

      var checkImgStmt = db.prepare('SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ? AND file_path = ?');

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

      // Link images to products and save to media_library
      if (extractedImages.length > 0) {
        var allProducts = db.prepare('SELECT id, model FROM products').all();
        var productMap = {};
        allProducts.forEach(function(p) { productMap[p.model] = p; });

        var insertMediaStmt = db.prepare(
          'INSERT INTO media_library (filename, original_name, mime_type, file_size, file_path, alt_text, product_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        extractedImages.forEach(function(img) {
          var matchedProduct = img.model ? productMap[img.model] : null;
          // Fallback: fuzzy match if exact model not found (handles case differences etc.)
          if (!matchedProduct) {
            for (var i = 0; i < allProducts.length; i++) {
              var m = allProducts[i].model.replace(/[-\s]/g, '').toUpperCase();
              var k = (img.model || '').replace(/[-\s]/g, '').toUpperCase();
              if (k && (m === k)) {
                matchedProduct = allProducts[i];
                break;
              }
            }
          }

          if (matchedProduct) {
            var imgPath = img.filePath;
            // Check product_images for duplicates
            var exists = checkImgStmt.get(matchedProduct.id, imgPath);
            if (!exists || exists.cnt === 0) {
              var isFirst = db.prepare('SELECT COUNT(*) as cnt FROM product_images WHERE product_id = ?').get(matchedProduct.id).cnt;
              insertImgStmt.run(matchedProduct.id, imgPath, isFirst === 0 ? 1 : 0, img.index);
              imagesLinked++;
            }

            // Save to media_library
            try {
              var stat = fs.statSync(img.localPath);
              insertMediaStmt.run(
                img.fileName,
                img.fileName,
                'image/webp',
                stat.size,
                img.filePath,
                (img.model || ''),
                matchedProduct.id
              );
            } catch(e) {
              console.error('[Import] Failed to save media_library entry:', img.fileName, e.message);
            }
          } else {
            // No product matched — save to media_library without product_id
            try {
              var stat = fs.statSync(img.localPath);
              insertMediaStmt.run(
                img.fileName,
                img.fileName,
                'image/webp',
                stat.size,
                img.filePath,
                (img.model || ''),
                null
              );
            } catch(e) {
              console.error('[Import] Failed to save media_library entry:', img.fileName, e.message);
            }
          }
        });
      }

      // Clean up temp file
      fs.unlinkSync(filePath);

      logAudit(db, req.user.userId, req.user.username, 'import', 'products', null, null, {
        total: result.products.length,
        imported: imported,
        updated: updated,
        skipped: skipped,
        images_extracted: extractedImages.length,
        images_linked: imagesLinked
      });

      res.json({
        mode: 'executed',
        total_rows: result.total,
        products_found: result.products.length,
        imported: imported,
        updated: updated,
        skipped: skipped,
        images_extracted: extractedImages.length,
        images_linked: imagesLinked,
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

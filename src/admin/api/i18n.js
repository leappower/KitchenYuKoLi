'use strict';

const path = require('path');
const fs = require('fs');

function i18nRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('./auth');
  const { logAudit } = require('../db/init');
  const { syncProductTranslationsToServer } = require('./sync-server');

  const LANG_DIR = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'lang');

  // Resolve lang file: zh-CN + ui → zh-CN-ui.json, fallback to zh-CN.json
  function resolveFile(lang, type) {
    var f = path.join(LANG_DIR, lang + '-' + type + '.json');
    if (fs.existsSync(f)) return f;
    f = path.join(LANG_DIR, lang + '.json');
    if (fs.existsSync(f)) return f;
    return null;
  }

  // GET /i18n/keys — 搜索翻译键（分页）
  router.get('/i18n/keys', (req, res) => {
    try {
      var lang = req.query.lang || 'zh-CN';
      var type = req.query.type || 'ui';
      var search = req.query.search || '';
      var page = parseInt(req.query.page) || 1;
      var limit = parseInt(req.query.limit) || 50;
      if (limit > 200) limit = 200;

      var file = resolveFile(lang, type);
      if (!file) return res.json({ keys: [], total: 0 });

      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      var entries = Object.entries(data);

      if (search) {
        var q = search.toLowerCase();
        entries = entries.filter(function(pair) {
          return pair[0].toLowerCase().includes(q) || String(pair[1]).toLowerCase().includes(q);
        });
      }

      var total = entries.length;
      var start = (page - 1) * limit;
      var paged = entries.slice(start, start + limit);

      res.json({
        keys: paged.map(function(pair) { return { key: pair[0], value: pair[1] }; }),
        total: total
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Shared HTML key scanner ────────────────────────────────────
  // Collects all unique data-i18n="..." keys from src/pages/
  function scanHtmlKeys() {
    var keys = {};
    var pagesDir = path.join(LANG_DIR, '..', 'pages');
    if (!fs.existsSync(pagesDir)) return keys;
    walkDir(pagesDir, function(filePath) {
      if (!/\.html?$/.test(filePath)) return;
      var content = fs.readFileSync(filePath, 'utf-8');
      var re = /data-i18n="([^"]+)"/g;
      var m;
      while ((m = re.exec(content)) !== null) {
        keys[m[1]] = true;
      }
    });
    return keys;
  }

  function walkDir(dir, cb) {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var full = path.join(dir, entries[i].name);
      if (entries[i].isDirectory()) walkDir(full, cb);
      else cb(full);
    }
  }

  // PUT /i18n/batch — 批量更新翻译（含去重校验）
  router.put('/i18n/batch', requireAdmin, (req, res) => {
    try {
      var lang = req.body.lang || 'zh-CN';
      var type = req.body.type || 'ui';
      var updates = req.body.updates;
      if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'Language file not found: ' + lang + '-' + type });

      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      var count = 0;
      var warnings = [];

      updates.forEach(function(u) {
        if (!u.key || u.value === undefined) return;

        // Dedup: if key already has a non-empty value and new value is empty, warn
        if (u.key in data && data[u.key] && data[u.key].trim() && (!u.value || !u.value.trim())) {
          warnings.push('key "' + u.key + '": overwriting non-empty value with empty');
        }

        // JSON objects can't have duplicate keys, but guard anyway
        var keyCount = 0;
        for (var k in data) { if (k === u.key) keyCount++; }
        if (keyCount > 1) {
          warnings.push('key "' + u.key + '": duplicate detected in file (impossible in JSON, skipping)');
          return;
        }

        data[u.key] = u.value;
        count++;
      });

      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      logAudit(db, req.user.userId, req.user.username, 'update', 'i18n', null, null, { lang: lang, type: type, count: count, warnings: warnings });

      // Auto-sync product translations to KitchenYuKoLiServer
      if (type === 'product') {
        try {
          syncProductTranslationsToServer(lang);
        } catch (syncErr) {
          console.error('[i18n] product sync failed:', syncErr.message);
        }
      }

      res.json({ message: '已更新 ' + count + ' 条翻译', count: count, warnings: warnings.length ? warnings : undefined });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Language metadata ───────────────────────────────────────────
  const LANG_META = {
    'zh-CN': { name: '中文', flag: '🇨🇳', dir: 'ltr' },
    'en':    { name: 'English', flag: '🇺🇸', dir: 'ltr' },
    'ja':    { name: '日本語', flag: '🇯🇵', dir: 'ltr' },
    'ko':    { name: '한국어', flag: '🇰🇷', dir: 'ltr' },
    'th':    { name: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
    'vi':    { name: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
    'id':    { name: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
    'ms':    { name: 'Bahasa Melayu', flag: '🇲🇾', dir: 'ltr' },
    'hi':    { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
    'ar':    { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    'zh-TW': { name: '繁體中文', flag: '🇹🇼', dir: 'ltr' }
  };

  // GET /i18n/overview — translation overview with per-language stats
  router.get('/i18n/overview', (req, res) => {
    try {
      var type = req.query.type || 'ui';
      var srcLang = 'zh-CN';
      var srcFile = resolveFile(srcLang, type);
      if (!srcFile) return res.status(404).json({ error: 'Source language file not found' });

      var srcData = JSON.parse(fs.readFileSync(srcFile, 'utf-8'));
      var totalKeys = Object.keys(srcData).length;

      var languages = [];
      for (var code in LANG_META) {
        var meta = LANG_META[code];
        var langFile = resolveFile(code, type);
        var translated = 0;
        var langKeys = 0;
        var missingKeys = [];

        if (langFile) {
          var langData = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
          langKeys = Object.keys(langData).length;
          var langKeySet = Object.keys(langData);
          for (var k in srcData) {
            if (langData[k] && langData[k].trim()) {
              translated++;
            } else if (langKeySet.indexOf(k) === -1) {
              missingKeys.push(k);
            }
          }
        }

        var percent = totalKeys > 0 ? Math.round(translated / totalKeys * 1000) / 10 : 0;
        languages.push({
          code: code,
          name: meta.name,
          flag: meta.flag,
          dir: meta.dir,
          translated: translated,
          total: totalKeys,
          missing: missingKeys,
          percent: percent
        });
      }

      // Calculate overall progress
      var totalTranslated = 0;
      var totalPossible = totalKeys * languages.length;
      languages.forEach(function(l) { totalTranslated += l.translated; });
      var overallPercent = totalPossible > 0 ? Math.round(totalTranslated / totalPossible * 1000) / 10 : 0;

      res.json({
        type: type,
        total_keys: totalKeys,
        overall_percent: overallPercent,
        total_translated: totalTranslated,
        total_possible: totalPossible,
        languages: languages
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Batch translate state (in-memory, per-process) ─────────────
  var batchJobs = {};

  // POST /i18n/batch-translate — start async batch translation
  router.post('/i18n/batch-translate', requireAdmin, async (req, res) => {
    try {
      var source_lang = req.body.source_lang || 'zh-CN';
      var target_langs = req.body.target_langs || [];
      var type = req.body.type || 'ui';

      // Filter out source lang and langs already at 100%
      var srcFile = resolveFile(source_lang, type);
      if (!srcFile) return res.status(404).json({ error: 'Source file not found' });
      var srcData = JSON.parse(fs.readFileSync(srcFile, 'utf-8'));
      var srcKeys = Object.keys(srcData);

      // Filter target langs to only those with missing translations
      var needsWork = [];
      for (var i = 0; i < target_langs.length; i++) {
        var lang = target_langs[i];
        if (lang === source_lang) continue;
        var langFile = resolveFile(lang, type);
        if (!langFile) continue;
        var langData = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
        var missing = srcKeys.filter(function(k) { return !langData[k] || !langData[k].trim(); });
        if (missing.length > 0) {
          needsWork.push({ code: lang, missing: missing });
        }
      }

      if (needsWork.length === 0) {
        return res.json({ job_id: null, status: 'already_done', message: '所有语言已完成翻译' });
      }

      // Get translation provider config
      var apiKey = process.env.TRANSLATE_API_KEY;
      var apiUrl = (process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      var model = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';
      if (!apiKey) return res.status(503).json({ error: '翻译服务未配置：请设置 TRANSLATE_API_KEY' });

      var jobId = 'bt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      var job = {
        id: jobId,
        status: 'running',
        source_lang: source_lang,
        type: type,
        current_lang: needsWork[0].code,
        progress: { total: srcKeys.length * needsWork.length, done: 0, percent: 0 },
        results: {},
        errors: [],
        started_at: new Date().toISOString(),
        cancel: false
      };
      needsWork.forEach(function(n) {
        job.results[n.code] = { status: 'pending', translated: 0, total: n.missing.length, errors: 0 };
      });
      batchJobs[jobId] = job;

      // Start async work
      (async function() {
        var BATCH_SIZE = 20; // keys per API call
        var DELAY_MS = 10000; // delay between API calls (rate limit)

        for (var wi = 0; wi < needsWork.length; wi++) {
          var work = needsWork[wi];
          job.current_lang = work.code;
          job.results[work.code].status = 'running';

          var langFile = resolveFile(work.code, type);
          var langData = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
          var langName = (LANG_META[work.code] || {}).name || work.code;

          // Process missing keys in batches
          for (var bi = 0; bi < work.missing.length; bi += BATCH_SIZE) {
            if (job.cancel) { job.status = 'cancelled'; return; }

            var batch = work.missing.slice(bi, bi + BATCH_SIZE);
            var entries = batch.map(function(k) { return k + ' = ' + (srcData[k] || ''); });

            var prompt = '将以下网站UI文本从' + (source_lang === 'zh-CN' ? '简体中文' : source_lang) + '翻译成' + langName + '。\n\n' +
              '要求：\n' +
              '1. 只输出JSON，不要包含任何其他文字或markdown代码块标记\n' +
              '2. 翻译要简洁、专业、符合当地语言习惯\n' +
              '3. 保留品牌名(YuKoLi)、专有名词、HTML标签不变\n' +
              '4. 数字和单位保持原样或当地化（如 500 → 500）\n' +
              '5. 对话框、按钮、标题等UI文案要简短\n\n' +
              entries.map(function(e, i) { return (i + 1) + '. ' + e; }).join('\n') + '\n\n' +
              '输出JSON格式，key为原文key（不含等号和值），value为翻译后的文本：\n' +
              '{ "' + batch[0] + '": "...", "' + batch[1] + '": "..." }';

            try {
              var controller = new AbortController();
              var timeout = setTimeout(function() { controller.abort(); }, 60000);

              var response = await fetch(apiUrl + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    { role: 'system', content: '你是专业的网站本地化翻译专家。只输出JSON，不要包含任何其他文字或markdown代码块标记。' },
                    { role: 'user', content: prompt }
                  ],
                  temperature: 0.3, max_tokens: 4096,
                  response_format: { type: 'json_object' }
                }),
                signal: controller.signal
              });
              clearTimeout(timeout);

              if (!response.ok) {
                var errText = await response.text();
                job.results[work.code].errors++;
                job.errors.push(work.code + ': API ' + response.status);
              } else {
                var data = await response.json();
                var content = data.choices[0].message.content;
                var translated;
                try {
                  translated = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
                } catch (pe) {
                  job.results[work.code].errors++;
                  job.errors.push(work.code + ': parse error batch ' + bi);
                }
                if (translated) {
                  var written = 0;
                  batch.forEach(function(k) {
                    if (translated[k] && translated[k].trim()) {
                      langData[k] = translated[k];
                      written++;
                    }
                  });
                  job.results[work.code].translated += written;
                  // Write back after each batch for progress safety
                  fs.writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n', 'utf-8');
                }
              }
            } catch (e) {
              job.results[work.code].errors++;
              job.errors.push(work.code + ': ' + e.message);
            }

            job.progress.done += batch.length;
            job.progress.percent = Math.round(job.progress.done / job.progress.total * 1000) / 10;
          }

          job.results[work.code].status = 'done';
          // Delay between languages for rate limiting
          if (wi < needsWork.length - 1) {
            await new Promise(function(resolve) { setTimeout(resolve, DELAY_MS); });
          }
        }
        job.status = 'completed';
      })();

      res.json({ job_id: jobId, status: 'started', message: '开始翻译 ' + needsWork.length + ' 种语言' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /i18n/batch-translate/status — check batch translate progress
  router.get('/i18n/batch-translate/status', (req, res) => {
    var jobId = req.query.job_id;
    if (!jobId || !batchJobs[jobId]) return res.status(404).json({ error: 'Job not found' });
    var job = batchJobs[jobId];
    res.json({
      job_id: job.id,
      status: job.status,
      current_lang: job.current_lang,
      progress: job.progress,
      results: job.results,
      errors: job.errors,
      started_at: job.started_at
    });
  });

  // POST /i18n/batch-translate/cancel — cancel a running job
  router.post('/i18n/batch-translate/cancel', requireAdmin, (req, res) => {
    var jobId = req.body.job_id;
    if (!jobId || !batchJobs[jobId]) return res.status(404).json({ error: 'Job not found' });
    batchJobs[jobId].cancel = true;
    res.json({ message: '取消请求已发送' });
  });

  // GET /i18n/export — 导出语言文件
  router.get('/i18n/export', (req, res) => {
    try {
      var lang = req.query.lang || 'zh-CN';
      var type = req.query.type || 'ui';
      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'File not found' });
      var data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── i18n key stats & audit ─────────────────────────────────────

  // GET /i18n/stats — per-language key stats, orphaned & missing keys
  router.get('/i18n/stats', (req, res) => {
    try {
      var type = req.query.type || 'ui';
      var htmlKeys = scanHtmlKeys();
      var htmlKeySet = Object.keys(htmlKeys);

      // Find all lang files matching *-{type}.json
      var files = fs.readdirSync(LANG_DIR).filter(function(f) {
        return f.endsWith('-' + type + '.json');
      }).sort();

      var stats = [];
      var allOrphaned = {}; // keys in JSON but not HTML (union across all langs)
      var allMissing = {};  // keys in HTML but not JSON (union across all langs)

      files.forEach(function(f) {
        var langCode = f.slice(0, -(type.length + 6)); // e.g. "zh-CN" from "zh-CN-ui.json"
        var fp = path.join(LANG_DIR, f);
        var data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        var jsonKeys = Object.keys(data);
        var emptyCount = 0;

        jsonKeys.forEach(function(k) {
          if (!data[k] || !String(data[k]).trim()) emptyCount++;
        });

        // Orphaned: in JSON but not in HTML
        var orphaned = jsonKeys.filter(function(k) { return !htmlKeys[k]; });
 orphaned.forEach(function(k) { allOrphaned[k] = true; });

        // Missing: in HTML but not in JSON
        var jsonSet = {};
        jsonKeys.forEach(function(k) { jsonSet[k] = true; });
        var missing = htmlKeySet.filter(function(k) { return !jsonSet[k]; });
        missing.forEach(function(k) { allMissing[k] = true; });

        stats.push({
          file: f,
          lang: langCode,
          total_keys: jsonKeys.length,
          empty_keys: emptyCount,
          translated_keys: jsonKeys.length - emptyCount,
          orphaned_keys: orphaned,
          missing_keys: missing,
          orphaned_count: orphaned.length,
          missing_count: missing.length
        });
      });

      var totalHtmlKeys = htmlKeySet.length;
      var totalOrphaned = Object.keys(allOrphaned).length;
      var totalMissing = Object.keys(allMissing).length;

      // Coverage: for zh-CN, what % of HTML keys have non-empty translations
      var srcStat = stats.find(function(s) { return s.lang === 'zh-CN'; });
      var coveragePercent = 0;
      if (srcStat && totalHtmlKeys > 0) {
        var covered = totalHtmlKeys - srcStat.missing_count;
        var coveredTranslated = covered - srcStat.orphaned_keys.filter(function(k) {
          var v = JSON.parse(fs.readFileSync(path.join(LANG_DIR, srcStat.file), 'utf-8'))[k];
          return !v || !String(v).trim();
        }).length;
        // simpler: keys in both HTML and JSON with non-empty value
        var srcData = JSON.parse(fs.readFileSync(path.join(LANG_DIR, srcStat.file), 'utf-8'));
        var matched = htmlKeySet.filter(function(k) { return srcData[k] && String(srcData[k]).trim(); });
        coveragePercent = Math.round(matched.length / totalHtmlKeys * 1000) / 10;
      }

      res.json({
        html_unique_keys: totalHtmlKeys,
        total_orphaned: totalOrphaned,
        total_missing: totalMissing,
        coverage_percent: coveragePercent,
        languages: stats
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /i18n/cleanup — remove orphaned keys from JSON files
  router.post('/i18n/cleanup', requireAdmin, (req, res) => {
    try {
      var type = req.body.type || 'ui';
      var dryRun = req.body.dry_run !== false; // default true
      var htmlKeys = scanHtmlKeys();

      var files = fs.readdirSync(LANG_DIR).filter(function(f) {
        return f.endsWith('-' + type + '.json');
      }).sort();

      var results = [];
      var totalRemoved = 0;

      files.forEach(function(f) {
        var fp = path.join(LANG_DIR, f);
        var data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        var keys = Object.keys(data);
        var orphaned = keys.filter(function(k) { return !htmlKeys[k]; });

        if (orphaned.length === 0) {
          results.push({ file: f, removed: 0, orphaned: [] });
          return;
        }

        if (dryRun) {
          results.push({ file: f, removed: 0, orphaned: orphaned, note: 'dry_run' });
        } else {
          orphaned.forEach(function(k) { delete data[k]; });
          fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
          totalRemoved += orphaned.length;
          results.push({ file: f, removed: orphaned.length, orphaned: orphaned });
        }
      });

      logAudit(db, req.user.userId, req.user.username, 'cleanup', 'i18n', null, null, {
        type: type, dry_run: dryRun, total_removed: totalRemoved
      });

      res.json({
        dry_run: dryRun,
        total_removed: totalRemoved,
        files: results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /i18n/import — 导入语言文件（merge or replace）
  router.post('/i18n/import', requireAdmin, (req, res) => {
    try {
      var lang = req.body.lang || 'zh-CN';
      var type = req.body.type || 'ui';
      var importData = req.body.data;
      var mode = req.body.mode || 'merge';
      if (!importData || typeof importData !== 'object') return res.status(400).json({ error: 'data object required' });

      var file = resolveFile(lang, type);
      if (!file) return res.status(404).json({ error: 'Language file not found' });

      if (mode === 'replace') {
        fs.writeFileSync(file, JSON.stringify(importData, null, 2) + '\n', 'utf-8');
      } else {
        var existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
        Object.keys(importData).forEach(function(k) { existing[k] = importData[k]; });
        fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
      }

      var count = Object.keys(importData).length;
      logAudit(db, req.user.userId, req.user.username, 'import', 'i18n', null, null, { lang: lang, type: type, mode: mode, count: count });
      res.json({ message: '已导入 ' + count + ' 条翻译' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { i18nRoutes };

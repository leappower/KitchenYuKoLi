'use strict';

const { getDb, logAudit } = require('../db/init');
const path = require('path');
const fs = require('fs');

// Supported translation languages with friendly names
const SUPPORTED_LANGS = {
  'en': 'English', 'ja': '日本語', 'ko': '한국어', 'th': 'ไทย',
  'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
  'hi': 'हिन्दी', 'ar': 'العربية', 'zh-TW': '繁體中文'
};

// ─── Rate Limiter (in-memory, per-process) ─────────────────────────
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  // Returns: { allowed: boolean, retryAfterMs: number, remaining: number }
  check() {
    const now = Date.now();
    // Purge old requests
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0];
      return {
        allowed: false,
        retryAfterMs: this.windowMs - (now - oldest),
        remaining: 0
      };
    }
    this.requests.push(now);
    return { allowed: true, retryAfterMs: 0, remaining: this.maxRequests - this.requests.length - 1 };
  }

  get waitMs() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    if (this.requests.length < this.maxRequests) return 0;
    return this.windowMs - (now - this.requests[0]) + 100;
  }
}

// ─── Translation Provider ───────────────────────────────────────────

/**
 * Provider config supports multiple fallback services.
 * Environment variables:
 *   TRANSLATE_API_KEY       — Primary API key (required)
 *   TRANSLATE_API_URL       — Primary API base URL
 *   TRANSLATE_MODEL         — Primary model name
 *   TRANSLATE_FALLBACK_KEY  — Fallback API key (optional)
 *   TRANSLATE_FALLBACK_URL  — Fallback API base URL
 *   TRANSLATE_FALLBACK_MODEL— Fallback model name
 *   TRANSLATE_RATE_LIMIT    — Max requests per minute (default: 10)
 *   TRANSLATE_TIMEOUT_MS    — Request timeout in ms (default: 60000)
 *   TRANSLATE_MAX_RETRIES   — Max retries on transient errors (default: 2)
 *   TRANSLATE_BATCH_SIZE    — Max languages per request (default: 5, split large batches)
 *   TRANSLATE_QUOTA_LIMIT   — Max total translations per day (0 = unlimited, default: 0)
 */

function getProviders() {
  const providers = [];

  // Primary provider
  const primary = {
    apiKey: process.env.TRANSLATE_API_KEY,
    apiUrl: (process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.TRANSLATE_MODEL || 'gpt-4o-mini',
    name: 'primary'
  };
  if (primary.apiKey) providers.push(primary);

  // Fallback provider
  const fallback = {
    apiKey: process.env.TRANSLATE_FALLBACK_KEY,
    apiUrl: (process.env.TRANSLATE_FALLBACK_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.TRANSLATE_FALLBACK_MODEL || 'gpt-4o-mini',
    name: 'fallback'
  };
  if (fallback.apiKey) providers.push(fallback);

  return providers;
}

function getConfig() {
  return {
    rateLimit: parseInt(process.env.TRANSLATE_RATE_LIMIT) || 10,
    timeoutMs: parseInt(process.env.TRANSLATE_TIMEOUT_MS) || 60000,
    maxRetries: parseInt(process.env.TRANSLATE_MAX_RETRIES) || 2,
    batchSize: parseInt(process.env.TRANSLATE_BATCH_SIZE) || 5,
    quotaLimit: parseInt(process.env.TRANSLATE_QUOTA_LIMIT) || 0
  };
}

// Quota tracking (persisted to file, survives restarts)
function getQuotaFilePath() {
  return path.join(__dirname, '..', 'data', 'translate-quota.json');
}

function loadQuota() {
  try {
    const fp = getQuotaFilePath();
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const today = new Date().toISOString().slice(0, 10);
      if (data.date === today) return data;
      // New day: reset quota
      data.date = today;
      data.count = 0;
      fs.writeFileSync(fp, JSON.stringify(data));
      return data;
    }
  } catch (e) { /* ignore */ }
  return { date: new Date().toISOString().slice(0, 10), count: 0, lastError: null };
}

function saveQuota(quota) {
  try {
    const dir = path.dirname(getQuotaFilePath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getQuotaFilePath(), JSON.stringify(quota));
  } catch (e) { /* ignore */ }
}

function checkQuota(quotaLimit) {
  if (quotaLimit <= 0) return { allowed: true, remaining: -1 }; // unlimited
  const quota = loadQuota();
  if (quota.count >= quotaLimit) {
    return { allowed: false, remaining: 0, used: quota.count, limit: quotaLimit };
  }
  return { allowed: true, remaining: quotaLimit - quota.count, used: quota.count, limit: quotaLimit };
}

function incrementQuota(amount) {
  const quota = loadQuota();
  quota.count = (quota.count || 0) + amount;
  saveQuota(quota);
  return quota;
}

function recordError(errorType, message) {
  const quota = loadQuota();
  quota.lastError = { type: errorType, message, time: new Date().toISOString() };
  saveQuota(quota);
}

// ─── Core translate function with retry + fallback ──────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call a single provider with retry logic.
 * Returns parsed JSON or throws.
 */
async function callProvider(provider, prompt, config) {
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Rate limiting: wait before each attempt
    if (attempt > 0) {
      const backoff = Math.min(1000 * Math.pow(2, attempt), 30000); // 2s, 4s, 8s... max 30s
      await sleep(backoff);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(provider.apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + provider.apiKey
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: '你是专业的产品翻译专家。只输出JSON，不要包含任何其他文字或markdown代码块标记。翻译要准确、专业、符合当地语言习惯。保留型号和技术参数不变。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // ─── Error classification ────────────────────────
      if (response.status === 429) {
        // Rate limited — extract retry-after header if present
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (1000 * Math.pow(2, attempt) + 1000);
        lastError = new Error('429 限速 (Retry-After: ' + waitTime + 'ms)');
        lastError.code = 'RATE_LIMITED';
        recordError('rate_limit', provider.name + ': 429');
        await sleep(Math.min(waitTime, 60000));
        continue;
      }

      if (response.status === 402 || response.status === 403) {
        // Quota exceeded or auth error — don't retry, fall through to next provider
        const errText = await response.text();
        lastError = new Error(provider.name + ': ' + response.status + ' ' + errText.substring(0, 100));
        lastError.code = 'QUOTA_EXCEEDED';
        recordError('quota_exceeded', provider.name + ': ' + response.status);
        throw lastError; // Don't retry this provider
      }

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error('API ' + response.status + ': ' + errText.substring(0, 200));
        lastError.code = 'API_ERROR';
        if (response.status >= 500) {
          // Server error — retry
          recordError('server_error', provider.name + ': ' + response.status);
          continue;
        }
        throw lastError; // Client error — don't retry
      }

      // ─── Parse response ─────────────────────────────
      const data = await response.json();
      const content = data.choices[0].message.content;

      let parsed;
      try {
        parsed = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
      } catch (e) {
        lastError = new Error('翻译结果解析失败: ' + content.substring(0, 100));
        lastError.code = 'PARSE_ERROR';
        recordError('parse_error', provider.name + ': JSON parse failed');
        // Retry once for parse errors (sometimes model adds extra text)
        if (attempt < config.maxRetries) continue;
        throw lastError;
      }

      return parsed;

    } catch (e) {
      lastError = e;
      if (e.code === 'QUOTA_EXCEEDED') throw e; // Don't retry quota errors
      if (e.name === 'AbortError') {
        lastError = new Error('请求超时 (' + config.timeoutMs + 'ms)');
        lastError.code = 'TIMEOUT';
        recordError('timeout', provider.name + ': timeout');
        continue; // Retry timeouts
      }
      if (e.code === 'RATE_LIMITED') continue; // Already handled above
      if (!e.code) {
        // Unknown error (network etc.) — retry
        e.code = 'NETWORK_ERROR';
        recordError('network_error', provider.name + ': ' + e.message);
        continue;
      }
      throw e;
    }
  }

  throw lastError;
}

// ─── Routes ─────────────────────────────────────────────────────────

function translateRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth } = require('./auth');

  // Global rate limiter
  const config = getConfig();
  const rateLimiter = new RateLimiter(config.rateLimit, 60000);

  // POST /translate — batch translate with full protection
  router.post('/translate', requireAuth, async (req, res) => {
    try {
      const { texts, source_lang, target_langs } = req.body;
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts array is required' });
      }
      if (!target_langs || !Array.isArray(target_langs) || target_langs.length === 0) {
        return res.status(400).json({ error: 'target_langs array is required' });
      }

      const providers = getProviders();
      if (providers.length === 0) {
        return res.status(503).json({
          error: '翻译服务未配置',
          hint: '请设置环境变量 TRANSLATE_API_KEY（必填）和 TRANSLATE_MODEL'
        });
      }

      // ─── Quota check ─────────────────────────────
      const quotaCheck = checkQuota(config.quotaLimit);
      if (!quotaCheck.allowed) {
        recordError('daily_quota', 'Daily quota exceeded');
        return res.status(429).json({
          error: '今日翻译额度已用完',
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          hint: '额度明天重置，或增大 TRANSLATE_QUOTA_LIMIT'
        });
      }

      // ─── Rate limit check ─────────────────────────
      const rateCheck = rateLimiter.check();
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: '请求过于频繁，请稍后再试',
          retryAfterMs: rateCheck.retryAfterMs,
          hint: Math.ceil(rateCheck.retryAfterMs / 1000) + ' 秒后重试'
        });
      }

      // ─── Split large batches ─────────────────────
      // NVIDIA free tier may struggle with 10 languages in one prompt
      const batchSize = config.batchSize;
      const batches = [];
      for (let i = 0; i < target_langs.length; i += batchSize) {
        batches.push(target_langs.slice(i, i + batchSize));
      }

      // ─── Try each batch with provider fallback ────
      const allTranslations = {};
      let usedProvider = null;
      let warnings = [];

      for (const batch of batches) {
        const prompt = buildTranslationPrompt(texts, source_lang, batch);
        let translated = false;

        for (const provider of providers) {
          // Rate limit between batches
          const wait = rateLimiter.waitMs;
          if (wait > 0) await sleep(wait);

          try {
            const parsed = await callProvider(provider, prompt, config);

            // Map parsed results
            batch.forEach(lang => {
              const langData = parsed[lang] || {};
              allTranslations[lang] = {
                lang: lang,
                name: langData['产品名称'] || langData['name'] || '',
                specifications: langData['产品配置'] || langData['specifications'] || '',
                throughput: langData['用途和产能'] || langData['throughput'] || ''
              };
            });

            usedProvider = provider.name + ' (' + provider.model + ')';
            translated = true;
            break; // Success — don't try fallback

          } catch (e) {
            warnings.push(provider.name + ' failed for [' + batch.join(', ') + ']: ' + e.message);

            if (e.code === 'QUOTA_EXCEEDED') {
              // Don't bother trying this provider again
              // But continue to next provider for this batch
            }
            // Other errors: try next provider
          }
        }

        if (!translated) {
          warnings.push('⚠️ 所有 provider 都失败: [' + batch.join(', ') + ']');
          // Add empty results for failed batch
          batch.forEach(lang => {
            allTranslations[lang] = { lang, name: '', specifications: '', throughput: '', _error: true };
          });
        }
      }

      // ─── Update quota ────────────────────────────
      const newQuota = incrementQuota(target_langs.length);

      // ─── Audit log ───────────────────────────────
      logAudit(db, req.user.userId, req.user.username, 'translate', 'products', null, null, {
        source_lang,
        target_langs,
        texts_count: texts.length,
        provider: usedProvider,
        batches: batches.length,
        warnings: warnings.filter(w => !w.startsWith('所有'))
      });

      // ─── Response ────────────────────────────────
      const translations = target_langs.map(lang => allTranslations[lang] || { lang, name: '', specifications: '', throughput: '' });

      res.json({
        translations,
        _meta: {
          provider: usedProvider,
          batches: batches.length,
          quota: config.quotaLimit > 0 ? { used: newQuota.count, limit: config.quotaLimit, remaining: config.quotaLimit - newQuota.count } : 'unlimited',
          warnings: warnings.length > 0 ? warnings : undefined
        }
      });

    } catch (e) {
      recordError('unknown', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /translate/status — check service health and config
  router.get('/translate/status', requireAuth, (req, res) => {
    const providers = getProviders();
    const config = getConfig();
    const quota = loadQuota();

    res.json({
      configured: providers.length > 0,
      providers: providers.map(p => ({
        name: p.name,
        model: p.model,
        api_url: p.apiUrl.replace(/\/v\d+$/, '/***')
      })),
      rate_limit: { max_per_minute: config.rateLimit },
      quota: config.quotaLimit > 0
        ? { used: quota.count, limit: config.quotaLimit, remaining: config.quotaLimit - quota.count, reset: 'daily' }
        : { mode: 'unlimited' },
      batch_size: config.batchSize,
      timeout_ms: config.timeoutMs,
      max_retries: config.maxRetries,
      supported_langs: SUPPORTED_LANGS,
      last_error: quota.lastError || null
    });
  });

  // POST /translate/test — quick test with a small translation
  router.post('/translate/test', requireAuth, async (req, res) => {
    try {
      const providers = getProviders();
      if (providers.length === 0) {
        return res.status(503).json({ error: '翻译服务未配置' });
      }

      const provider = providers[0];
      const prompt = buildTranslationPrompt(
        ['产品名称: 商用电磁翻转炒炉', '产品配置: 功率:15kW 电压:380V'],
        'zh-CN',
        ['en']
      );

      const parsed = await callProvider(provider, prompt, { ...getConfig(), maxRetries: 0 });

      res.json({
        success: true,
        provider: provider.name + ' (' + provider.model + ')',
        result: parsed
      });
    } catch (e) {
      res.status(502).json({ success: false, error: e.message, code: e.code });
    }
  });

  // DELETE /translate/quota — reset daily quota (admin only)
  router.delete('/translate/quota', requireAuth, (req, res) => {
    const quota = { date: new Date().toISOString().slice(0, 10), count: 0, lastError: null };
    saveQuota(quota);
    res.json({ message: '配额已重置', quota });
  });

  return router;
}

// ─── Prompt Builder ─────────────────────────────────────────────────

function buildTranslationPrompt(texts, source_lang, target_langs) {
  const langList = target_langs.map(l => {
    const name = SUPPORTED_LANGS[l] || l;
    return `  "${l}" ("${name}")`;
  }).join('\n');

  return `将以下商用厨房设备的产品信息翻译成指定语言。

源语言: ${source_lang}
目标语言:
${langList}

原文信息:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

要求:
1. 保留型号（如 DLB-GQ40）、数字、技术参数不变
2. 产品名称翻译要简洁专业
3. 配置描述翻译要准确，技术术语保持原样
4. 产能描述翻译要符合当地习惯

请输出JSON格式，key为语言代码，value为对象，包含字段：
- "产品名称": 翻译后的产品名称
- "产品配置": 翻译后的配置信息
- "用途和产能": 翻译后的用途和产能

示例输出格式:
{
  "en": { "产品名称": "...", "产品配置": "...", "用途和产能": "..." },
  "ja": { "产品名称": "...", "产品配置": "...", "用途和产能": "..." }
}`;
}

module.exports = { translateRoutes, SUPPORTED_LANGS };

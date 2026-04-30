'use strict';

const { getDb, logAudit } = require('../db/init');

// Supported translation languages with friendly names
const SUPPORTED_LANGS = {
  'en': 'English', 'ja': '日本語', 'ko': '한국어', 'th': 'ไทย',
  'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
  'hi': 'हिन्दी', 'ar': 'العربية', 'zh-TW': '繁體中文'
};

/**
 * Translate texts using AI (OpenAI-compatible API).
 * Config: Set environment variables
 *   TRANSLATE_API_KEY  — API key for the LLM service
 *   TRANSLATE_API_URL  — API base URL (default: https://api.openai.com/v1)
 *   TRANSLATE_MODEL    — Model name (default: gpt-4o-mini)
 */
function translateRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAuth } = require('./auth');

  // POST /translate — batch translate product fields
  // Body: { texts: string[], source_lang: 'zh-CN', target_langs: ['en', 'ja', ...] }
  // Response: { translations: [{ lang, name, specifications, throughput }] }
  router.post('/translate', requireAuth, async (req, res) => {
    try {
      const { texts, source_lang, target_langs } = req.body;
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts array is required' });
      }
      if (!target_langs || !Array.isArray(target_langs) || target_langs.length === 0) {
        return res.status(400).json({ error: 'target_langs array is required' });
      }

      const apiKey = process.env.TRANSLATE_API_KEY;
      const apiUrl = process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1';
      const model = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';

      if (!apiKey) {
        return res.status(503).json({ error: '翻译服务未配置：请设置环境变量 TRANSLATE_API_KEY' });
      }

      // Build prompt that translates all texts for all target languages at once
      // This is more efficient than N separate API calls
      const prompt = buildTranslationPrompt(texts, source_lang, target_langs);
      
      const response = await fetch(apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: '你是专业的产品翻译专家。只输出JSON，不要包含任何其他文字或markdown代码块标记。翻译要准确、专业、符合当地语言习惯。保留型号和技术参数不变。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(502).json({ error: '翻译 API 错误: ' + response.status + ' ' + errText.substring(0, 200) });
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON from response (handle potential markdown code blocks)
      let parsed;
      try {
        parsed = JSON.parse(content.replace(/^```json?\s*/, '').replace(/\s*```$/, ''));
      } catch (e) {
        return res.status(502).json({ error: '翻译结果解析失败: ' + content.substring(0, 100) });
      }

      // Map results to our format: array of { lang, name, specifications, throughput }
      const translations = target_langs.map(lang => {
        const langData = parsed[lang] || {};
        return {
          lang: lang,
          name: langData['产品名称'] || langData['name'] || '',
          specifications: langData['产品配置'] || langData['specifications'] || '',
          throughput: langData['用途和产能'] || langData['throughput'] || ''
        };
      });

      logAudit(db, req.user.userId, req.user.username, 'translate', 'products', null, null, {
        source_lang, target_langs, texts_count: texts.length
      });

      res.json({ translations });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /translate/status — check if translation service is configured
  router.get('/translate/status', requireAuth, (req, res) => {
    const apiKey = process.env.TRANSLATE_API_KEY;
    const apiUrl = process.env.TRANSLATE_API_URL || 'https://api.openai.com/v1';
    const model = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';
    res.json({
      configured: !!apiKey,
      api_url: apiUrl.replace(/\/v\d+$/, '/***'),
      model: model,
      supported_langs: SUPPORTED_LANGS
    });
  });

  return router;
}

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

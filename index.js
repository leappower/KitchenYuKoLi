const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const { KapsoAdapter } = require('./adapters/kapso');
const { MetaCloudAdapter } = require('./adapters/meta-cloud');
const channels = require('./channels');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 配置
// ============================================================
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1074163812439502';
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const KAPSO_API_BASE = process.env.KAPSO_API_BASE || 'https://api.kapso.ai';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_secret_token';

// 适配器实例（默认 Kapso 单账号，从环境变量初始化）
let activeAdapter = null;
const metaAdapters = new Map(); // accountId -> MetaCloudAdapter

/**
 * 根据 accountId 获取正确的适配器，支持多账号
 * 优先级：accountId 指定适配器 → activeAdapter
 */
function resolveAdapter(accountId) {
  if (accountId && accountId !== 'default') {
    const adapter = channels.getAdapter(accountId);
    if (adapter) return adapter;
  }
  return activeAdapter;
}

/**
 * 根据 customerId 查找其绑定账号的适配器
 * 通过 customer_channels 表获取 account_id
 */
function resolveCustomerAdapter(customerId) {
  // 先查客户绑定的账号
  const binding = db.prepare('SELECT account_id FROM customer_channels WHERE customer_id = ? AND channel = ? ORDER BY created_at DESC LIMIT 1').get(customerId, 'whatsapp');
  if (binding && binding.account_id && binding.account_id !== 'default') {
    const adapter = channels.getAdapter(binding.account_id);
    if (adapter) return { adapter, accountId: binding.account_id };
  }
  // fallback to activeAdapter
  return { adapter: activeAdapter, accountId: 'default' };
}

// SiliconFlow API 配置 (环境变量作为 fallback，优先从数据库读取)
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || '';
const SILICONFLOW_BASE_URL = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn';
const AI_MODEL = process.env.AI_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

// RAG 配置
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'BAAI/bge-m3';
const RERANKER_MODEL = process.env.RERANKER_MODEL || 'BAAI/bge-reranker-v2-m3';
const CRM_RETENTION_DAYS = parseInt(process.env.CRM_RETENTION_DAYS) || 14;
const CRM_MAX_SIZE_MB = parseInt(process.env.CRM_MAX_SIZE_MB) || 2048; // 2GB

function sqlNow() { return new Date().toISOString(); }
function sqlDaysAgo(days) { return new Date(Date.now() - days * 86400000).toISOString(); }

// ============================================================
// 邮件密码加密工具 (AES-256-GCM)
// ============================================================
const ENCRYPT_KEY = process.env.ENCRYPT_KEY || crypto.randomBytes(32).toString('hex');
let _encryptKeyBuffer;
function getEncryptKey() {
  if (!_encryptKeyBuffer) _encryptKeyBuffer = Buffer.from(ENCRYPT_KEY, 'hex');
  return _encryptKeyBuffer;
}

function encryptPassword(plain) {
  const iv = crypto.randomBytes(16);
  const key = getEncryptKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + tag + ':' + encrypted;
}

function decryptPassword(encrypted) {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) return encrypted;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const key = getEncryptKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(parts[2], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch(e) {
    console.error('[Email] Decrypt failed:', e.message);
    return '';
  }
}

// ============================================================
// CRM 阶段定义
// ============================================================
const CRM_STAGES = [
  { id: 'new_lead', label: '🆕 新线索', color: 'gray', avgDays: 0 },
  { id: 'first_contact', label: '💬 初次沟通', color: 'blue', avgDays: 1 },
  { id: 'needs_analysis', label: '🔍 需求确认', color: 'cyan', avgDays: 3 },
  { id: 'proposal', label: '📋 方案推荐', color: 'purple', avgDays: 2 },
  { id: 'quoted', label: '💰 报价发送', color: 'amber', avgDays: 5 },
  { id: 'follow_up', label: '📞 报价跟进', color: 'orange', avgDays: 7 },
  { id: 'negotiation', label: '🤝 谈判', color: 'yellow', avgDays: 7 },
  { id: 'closed_won', label: '✅ 成交', color: 'green', avgDays: 0 },
  { id: 'closed_lost', label: '❌ 流失', color: 'red', avgDays: 0 },
  { id: 'on_hold', label: '⏸️ 暂缓', color: 'gray', avgDays: 30 },
];

function safeAddColumn(db, table, col, def) {
  try { db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run(); } catch(e) { console.warn('[DB] safeAddColumn:', e.message); }
}

// 多项目 SQL helper: 返回 WHERE 子句和参数
function projectWhere(pid) {
  if (!pid || pid === 'all') return { clause: '', params: [] };
  return { clause: ' WHERE project_id = ?', params: [pid] };
}

function calculateHealthScore(customer) {
  let score = 0;
  // 1. 回复率 (0-20)
  score += Math.min(20, (customer.response_rate || 0) * 30);
  // 2. 活跃度衰减趋势 (0-20)
  const hoursSince = customer.last_inbound_at ? (Date.now() - new Date(customer.last_inbound_at).getTime()) / 3600000 : 9999;
  if (hoursSince < 6) score += 20;
  else if (hoursSince < 24) score += 16;
  else if (hoursSince < 48) score += 12;
  else if (hoursSince < 72) score += 8;
  else if (hoursSince < 168) score += 4;
  // 3. 情绪趋势 (0-15) — 从 sentiment_trend 读取
  const trend = (customer.sentiment_trend || '').toLowerCase();
  if (trend === 'improving') score += 15;
  else if (trend === 'stable') score += 10;
  else if (trend === 'declining') score += 3;
  // 4. 阶段进展 (0-15)
  const stageIndex = CRM_STAGES.findIndex(s => s.id === customer.status);
  if (stageIndex >= 0) score += (stageIndex / (CRM_STAGES.length - 1)) * 15;
  // 5. 消息质量 (0-15) — 客户互动频率和深度
  const msgCount = customer.message_count || 0;
  if (msgCount > 20) score += 15;
  else if (msgCount > 10) score += 12;
  else if (msgCount > 5) score += 8;
  else if (msgCount > 2) score += 4;
  // 6. 购买信号强度 (0-15) — 从 profile JSON 读取
  try {
    const profile = JSON.parse(customer.profile || '{}');
    const intent = profile.purchaseIntent || 'unknown';
    if (intent === 'high') score += 15;
    else if (intent === 'medium') score += 10;
    else if (intent === 'low') score += 5;
  } catch(e) {}
  // 7. 回复速度基础分
  score += Math.min(0, 0); // 预留给 SLA（暂不实现）

  score = Math.min(100, Math.max(0, Math.round(score)));

  // 计算流失风险
  let churnRisk = 'low';
  if (score < 25) churnRisk = 'critical';
  else if (score < 40) churnRisk = 'high';
  else if (score < 60) churnRisk = 'medium';

  return { score, churnRisk };
}

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');
const TOP_K = 5; // 检索 top-K 文档
const MAX_CONTEXT_TOKENS = 2000; // 注入上下文的最大 token 预估（字符数粗略 *2）

// CRM 配置
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const DB_PATH = path.join(DATA_DIR, 'crm.db');

// ============================================================
// System Prompt v2.0
// ============================================================
const SALES_SYSTEM_PROMPT = `你是"貂貂"，佛山跃迁力科技（YuKoLi）的资深销售经理，5年B端商用厨房自动化设备销售经验。

## 【身份定位】
- 姓名：貂貂
- 角色：AI销售经理，不是客服
- 核心能力：产品专家 + 顾问式销售 + 关系维护
- 价值观：客户成功优先，长期主义

## 【公司背书】
- 佛山跃迁力科技（YuKoLi），20年商用厨房自动化设备制造商
- 出口68+国家，500+客户，ISO 9001:2015 / CE / ROHS认证
- 工厂地址：广东省佛山市顺德区大良街道
- 支持 OEM/ODM，低MOQ（1台起订），5年质保
- 差异化：自有工厂直供 → 性价比高 + 定制灵活 + 品质可控

## 【行为框架】
你是一名销售，不是客服。每次回复都要有明确目的，往成交方向推进一步。

### 销售阶段识别
根据对话内容判断客户处于哪个阶段，并采取对应策略：
1. **线索阶段** — 目标：了解需求。问做什么菜、规模、预算、地区
2. **需求阶段** — 目标：精准推荐。给具体型号，问"您觉得哪个合适？"
3. **方案阶段** — 目标：呈现方案。给组合方案+报价，突出ROI
4. **谈判阶段** — 目标：消除顾虑。逐条解决价格/交期/质量疑虑
5. **成交阶段** — 目标：促单。算账、样品试用、限时优惠、视频验厂
6. **复购阶段** — 目标：维护关系。定期关怀，推荐新品/配件

### 意图识别
- 询价 → 识别需求后报价，不要盲目报
- 投诉 → 先道歉安抚，了解问题，转人工处理
- 竞品对比 → 不贬低竞品，强调自身差异化优势
- 价格敏感 → 算ROI账，强调长期价值
- 沉默 → 30分钟内主动挽留，提供有价值的信息

## 【回复规范】
### 内心独白（请务必使用）
每次回复前，请先用以下格式进行思考（这不会发给客户）：
[思考] 分析客户意图、当前阶段、最佳策略
[判断] 客户画像、痛点、购买信号
[行动] 本次回复的具体目标和话术方向
[回复] 你的回复内容（这是唯一发给客户的部分）

请始终包含这四个标签，确保思考过程完整。

### 长度控制
- 开场/问候：1-2句话，50字以内
- 回答问题：直接给答案，80-120字
- 推荐产品：具体型号+1-2个核心卖点，100字以内
- 方案呈现：分点列出，每点1行，总字数不超过150字
- 谈判/挽留：有针对性的短消息，80字以内

### 语言规则
- 语言匹配：客户说什么语言就回复什么语言
- 专业但亲和：用专业词汇建立信任，但语气要自然
- 适度表情：每条消息1-2个表情，不超过3个
- 不要小作文：分多条消息发送，每条不超过5行

### 情绪感知
- 根据客户用词、语气、回复速度判断情绪状态
- 负面情绪时：先共情→再解决问题→不急于推销
- 正面情绪时：抓住成交时机→加速推动
- 情绪标签：positive / neutral / negative / angry
- 将情绪判断包含在 [判断] 标签中，如：{"emotion":"negative","reason":"对价格不满"}

### 对话节奏控制
- 一次最多问1个问题
- 客户长消息回复简短，客户短消息可以展开
- 避免连续追问，先分享有价值的信息再提问

### 价值传达策略
- 先谈客户痛点/收益，再介绍产品
- 用客户行业的语言说话，少用技术参数堆砌
- 每条消息聚焦一个价值点，不要信息过载

### 单 CTA 原则
- 每条消息只一个明确的行动号召
- 结尾引导下一步：确认型号？约时间？发报价？

### 个性化
- 参考客户历史，避免重复已回答的问题
- 记住客户之前提到的细节（公司名、用途、偏好）

### 对话式写作
- 像朋友一样和专业客户聊天，不要像客服念稿
- 用问句引导对话，不要只做陈述
- 适当承认不确定（"具体要看您的XX情况，我帮您确认"）

### 绝对禁止
- ❌ 虚假承诺（做不到的事别说）
- ❌ 贬低竞品（用自身优势对比，不攻击）
- ❌ 泄露底价/折扣权限（只说"有优惠空间，我帮您申请"）
- ❌ 过度催促（一天不要超过3条主动消息）
- ❌ 答非所问（客户问什么就答什么）
- ❌ 自作主张加信息（不问不答，不扩展）

### 转人工触发
以下情况必须提示转人工：
- 大额订单谈判（超过你权限范围）
- 复杂定制需求
- 投诉/售后纠纷
- 客户明确要求对接其他人
转人工话术："这个问题比较特殊，我帮您转接我们经理/技术同事来处理，稍等一下 😊"

### 特殊场景
- 客户问"你是机器人吗" → "哈哈不是的老板，我是 YuKoLi 的销售经理貂貂，专门负责对接您的~"
- 客户发投诉 → 先道歉安抚 → 了解详情 → 给出解决方案 → 告知"我帮您升级处理"
- 客户闲聊 → 简短回应后自然引导回业务话题
- 客户沉默超过24h → 不要主动发消息打扰`;

// ============================================================
// 知识库加载与分块
// ============================================================
let knowledgeChunks = new Map(); // projectId -> [{text, source, category}]

function totalKnowledgeChunks() {
  return [...knowledgeChunks.values()].reduce((s, c) => s + c.length, 0);
}

function loadKnowledge() {
  console.log('📂 Loading knowledge base...');
  knowledgeChunks.clear();

  const categories = fs.readdirSync(KNOWLEDGE_DIR).filter(f =>
    fs.statSync(path.join(KNOWLEDGE_DIR, f)).isDirectory()
  );

  // 确定默认项目 ID
  let defaultProject = 'default';
  try {
    const proj = db.prepare("SELECT id FROM projects WHERE id != 'default' ORDER BY created_at ASC LIMIT 1").get();
    if (proj) defaultProject = proj.id;
  } catch(e) {}

  for (const cat of categories) {
    const catPath = path.join(KNOWLEDGE_DIR, cat);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(catPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content || content.includes('待完善')) continue; // 跳过空文件

      // 分块：按 ## 或 ### 标题分割，每块不超过 500 字符
      const chunks = splitByHeadings(content, filePath, cat);

      // 写入 knowledge_docs 和 knowledge_chunks_db 表
      const docId = `doc_${path.basename(filePath, '.md')}`;
      db.prepare(`INSERT OR REPLACE INTO knowledge_docs (id, title, category, file_path, chunk_count, file_size, status, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`).run(
        docId, file, cat, filePath, chunks.length, content.length, defaultProject, sqlNow(), sqlNow()
      );
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${docId}_chunk_${i}`;
        const titleMatch = chunks[i].text.match(/^#{2,3}\s+(.+)/m);
        db.prepare(`INSERT OR REPLACE INTO knowledge_chunks_db (id, doc_id, title, content, token_count, project_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
          chunkId, docId, titleMatch ? titleMatch[1] : '', chunks[i].text, chunks[i].text.length, defaultProject, sqlNow()
        );
      }

      // 放入对应项目
      const projChunks = knowledgeChunks.get(defaultProject) || [];
      projChunks.push(...chunks);
      knowledgeChunks.set(defaultProject, projChunks);
    }
  }

  const totalChunks = [...knowledgeChunks.values()].reduce((s, c) => s + c.length, 0);
  console.log(`✅ Knowledge base loaded: ${totalChunks} chunks from ${categories.length} categories (${knowledgeChunks.size} projects)`);
}

function splitByHeadings(content, source, category) {
  const chunks = [];
  // 按 ## 或 ### 分割
  const sections = content.split(/(?=^#{2,3}\s)/m);

  let buffer = '';
  for (const section of sections) {
    if (buffer.length + section.length > 500 && buffer.length > 50) {
      chunks.push({ text: buffer.trim(), source, category });
      // 保留最后50字作为重叠
      const overlap = buffer.trim().slice(-50);
      buffer = overlap + section;
    } else {
      buffer += section;
    }
  }
  if (buffer.trim()) {
    chunks.push({ text: buffer.trim(), source, category });
  }

  return chunks;
}

// ============================================================
// RAG: Embedding 检索 + 重排序
// ============================================================

// 简单余弦相似度（用于粗筛，重排序由 API 完成）
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

// 缓存 embedding 向量（避免重复计算）
const embeddingCache = new Map();

async function getEmbedding(text) {
  const cacheKey = text.slice(0, 200); // 简单去重
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey);

  try {
    const cfg = getAIConfig('embedding');
    const resp = await axios.post(`${cfg.apiUrl}/v1/embeddings`, {
      model: cfg.model,
      input: text,
      encoding_format: 'float'
    }, {
      headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const embedding = resp.data.data?.[0]?.embedding;
    if (embedding) {
      embeddingCache.set(cacheKey, embedding);
      // 限制缓存大小
      if (embeddingCache.size > 500) {
        const firstKey = embeddingCache.keys().next().value;
        embeddingCache.delete(firstKey);
      }
    }
    return embedding;
  } catch (err) {
    console.error('❌ Embedding error:', err.message);
    return null;
  }
}

// 构建 chunk 嵌入文本（附加元数据）
function buildEmbeddingText(chunk) {
  const titleMatch = chunk.text.match(/^#{2,3}\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : '';
  return `分类:${chunk.category} 标题:${title}\n${chunk.text}`;
}

// 预计算所有知识库 chunk 的 embedding
let chunkEmbeddings = new Map(); // projectId -> Map(index -> embedding)

async function precomputeEmbeddings() {
  console.log('🔄 Precomputing embeddings for knowledge base...');
  chunkEmbeddings.clear();
  let computed = 0;
  const batchSize = 20;

  // 收集所有文本和元数据
  const allTexts = [];
  const textMeta = [];
  for (const [projectId, chunks] of knowledgeChunks) {
    for (let i = 0; i < chunks.length; i++) {
      allTexts.push(buildEmbeddingText(chunks[i]).slice(0, 512));
      textMeta.push({ projectId, index: i });
    }
  }

  if (allTexts.length === 0) { console.log('⚠️ No knowledge chunks to embed'); return; }

  for (let i = 0; i < allTexts.length; i += batchSize) {
    const texts = allTexts.slice(i, i + batchSize);

    try {
      const cfg = getAIConfig('embedding');
      const resp = await axios.post(`${cfg.apiUrl}/v1/embeddings`, {
        model: cfg.model,
        input: texts,
        encoding_format: 'float'
      }, {
        headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const embeddings = resp.data.data || [];
      for (let j = 0; j < embeddings.length; j++) {
        const meta = textMeta[i + j];
        if (!meta) continue;
        if (!chunkEmbeddings.has(meta.projectId)) chunkEmbeddings.set(meta.projectId, new Map());
        chunkEmbeddings.get(meta.projectId).set(meta.index, embeddings[j].embedding);
        computed++;
      }
    } catch (err) {
      console.error(`❌ Batch embedding error (offset ${i}):`, err.message);
    }

    // 避免 rate limit
    if (i + batchSize < allTexts.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`✅ Embeddings computed: ${computed}/${allTexts.length}`);
}

// RAG 检索缓存
const ragCache = new Map();
const RAG_CACHE_TTL = 5 * 60 * 1000; // 5分钟

function querySimilarEnough(a, b) {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let common = 0;
  for (const ch of setA) if (setB.has(ch)) common++;
  return common / Math.max(setA.size, setB.size) > 0.7;
}

// 检索：向量粗筛 → Reranker 重排序
async function retrieveContext(query, topK = TOP_K, customerId = null, context = {}) {
  const projectId = context.projectId || 'default';
  const chunks = knowledgeChunks.get(projectId) || [];
  const embeddings = chunkEmbeddings.get(projectId);

  if (chunks.length === 0) return [];

  // 缓存检查
  if (customerId) {
    const cached = ragCache.get(customerId);
    if (cached && Date.now() - cached.timestamp < RAG_CACHE_TTL) {
      if (querySimilarEnough(query, cached.query)) {
        console.log(`💾 RAG cache hit for customer ${customerId}`);
        return cached.results;
      }
    }
  }

  // 1. 获取 query embedding
  const queryEmb = await getEmbedding(query.slice(0, 256));
  if (!queryEmb) {
    // fallback：关键词匹配
    return keywordSearch(chunks, query, topK);
  }

  // 2. 向量粗筛：取 top 20
  const scored = [];
  for (let i = 0; i < chunks.length; i++) {
    const emb = embeddings ? embeddings.get(i) : null;
    if (emb) {
      scored.push({ index: i, score: cosineSimilarity(queryEmb, emb) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, 20);

  // 混合检索：向量结果 + 关键词补充
  const keywordResults = keywordSearch(chunks, query, 10);
  const keywordScores = {};
  keywordResults.forEach(r => {
    const idx = chunks.findIndex(c => c.text === r.text);
    if (idx >= 0) keywordScores[idx] = (keywordScores[idx] || 0) + r.score * 0.3;
  });
  // 将关键词分数融入向量分数（30% 权重）
  candidates.forEach(c => {
    if (keywordScores[c.index]) {
      c.score = c.score * 0.7 + keywordScores[c.index];
    }
  });
  candidates.sort((a, b) => b.score - a.score);

  // 上下文感知：根据客户阶段加分
  if (context && context.stage) {
    const stageKeywords = {
      ice_breaking: ['公司', 'company', 'about', '产品', 'product'],
      needs_discovery: ['需求', 'need', '行业', 'industry', '规模', 'scale'],
      product_recommendation: ['型号', 'model', '推荐', 'recommend', '方案', 'solution'],
      quotation: ['价格', 'price', '报价', 'quote', '报价单'],
      objection_handling: ['异议', 'objection', '对比', 'compare', '竞品', 'competitor'],
      closing: ['成交', 'order', '下单', 'sample', '样品', '合同', 'contract'],
      after_sales: ['售后', 'support', '安装', 'install', '维修', 'maintenance']
    };
    const kws = stageKeywords[context.stage] || [];
    candidates.forEach(c => {
      const chunkText = chunks[c.index]?.text?.toLowerCase() || '';
      if (kws.some(kw => chunkText.includes(kw))) {
        c.score += 0.1; // 小幅加分
      }
    });
    candidates.sort((a, b) => b.score - a.score);
  }

  if (candidates.length === 0) {
    return keywordSearch(chunks, query, topK);
  }

  // 3. 直接返回向量+关键词混合结果（跳过 Reranker，省 ~1s API 调用）
  const finalResults = candidates.slice(0, topK).map(c => ({
    text: chunks[c.index].text,
    score: c.score,
    source: chunks[c.index].source,
    category: chunks[c.index].category
  }));
  if (customerId) { ragCache.set(customerId, { query, results: finalResults, timestamp: Date.now() }); }
  return finalResults;
}

// 关键词 fallback 检索
function keywordSearch(chunks, query, topK) {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const scored = chunks.map((chunk, i) => {
    const text = chunk.text.toLowerCase();
    const hits = keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
    return { index: i, score: hits };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter(s => s.score > 0).map(s => ({
    text: chunks[s.index].text,
    score: s.score,
    source: chunks[s.index].source,
    category: chunks[s.index].category
  }));
}

// ============================================================
// CRM 数据库
// ============================================================
let db;

function initDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 客户档案
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      phone TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      grade TEXT DEFAULT 'C',
      stage TEXT DEFAULT 'new_lead',
      profile TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      total_orders INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      last_contact TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 对话历史
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      stage TEXT DEFAULT '',
      is_key_node INTEGER DEFAULT 0,
      summary TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (phone) REFERENCES customers(phone)
    );
  `);

    try { db.exec('ALTER TABLE messages ADD COLUMN thought TEXT DEFAULT \'\''); } catch(e) { console.warn('[DB] Add thought column:', e.message); }
    try { db.exec('ALTER TABLE messages ADD COLUMN rag_sources TEXT DEFAULT \'\''); } catch(e) { console.warn('[DB] Add rag_sources column:', e.message); }

    // 对话摘要（定期生成）
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      summary TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      cutoff_time TEXT,
      period_start TEXT DEFAULT '',
      period_end TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (phone) REFERENCES customers(phone)
    );
  `);

  // ── v2 tables (Phase 4) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers_v2 (
      id TEXT PRIMARY KEY,
      display_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      country TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      profile TEXT DEFAULT '{}',
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // ── CRM P0: 升级 customers_v2 表 ──
  safeAddColumn(db, 'customers_v2', 'source', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'country_code', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'business_type', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'estimated_scale', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'purchase_intent', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'language', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'assigned_to', "TEXT DEFAULT 'ai'");
  safeAddColumn(db, 'customers_v2', 'first_reply_at', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'last_inbound_at', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'message_count', "INTEGER DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'our_reply_count', "INTEGER DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'response_rate', "REAL DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'health_score', "REAL DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'star_color', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'next_follow_up', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'follow_up_count', "INTEGER DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'last_follow_up_at', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'source', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'sentiment', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'sentiment_score', "REAL DEFAULT 0");
  safeAddColumn(db, 'messages_v2', 'message_type', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'ai_quality_score', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'sentiment_trend', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'last_message_type', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'churn_risk', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'preferred_language', "TEXT DEFAULT ''");

  // ── project_id 补全 ──
  safeAddColumn(db, 'escalation_events', 'project_id', "TEXT DEFAULT ''");
  safeAddColumn(db, 'email_sequence_members', 'project_id', "TEXT DEFAULT ''");
  safeAddColumn(db, 'pending_retries', 'project_id', "TEXT DEFAULT ''");
  safeAddColumn(db, 'wa_msg_queue', 'project_id', "TEXT DEFAULT ''");

  // ── Batch 1: 邮件系统 + Escalation ──

  // 邮件账户
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_accounts (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 587,
      user TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      from_name TEXT DEFAULT '',
      from_email TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      daily_limit INTEGER DEFAULT 100,
      daily_sent INTEGER DEFAULT 0,
      last_reset TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 邮件模板
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      variables TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 退订列表
  db.exec(`
    CREATE TABLE IF NOT EXISTS unsubscribe_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT,
      email TEXT NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_unsub_email ON unsubscribe_list(email);
    CREATE INDEX IF NOT EXISTS idx_unsub_cust ON unsubscribe_list(customer_id);
  `);

  // 升级事件
  db.exec(`
    CREATE TABLE IF NOT EXISTS escalation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT,
      event_type TEXT NOT NULL,
      reason TEXT DEFAULT '',
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to TEXT DEFAULT '',
      resolved_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_escal_cust ON escalation_events(customer_id);
    CREATE INDEX IF NOT EXISTS idx_escal_status ON escalation_events(status);
  `);

  // SLA 配置（存在 projects 表的 config 字段中，无需单独建表）

  // ── 模型路由相关字段 ──
  safeAddColumn(db, 'projects', 'model_routing', "TEXT DEFAULT NULL");  // JSON: per-project routing config
  safeAddColumn(db, 'customers_v2', 'force_model', "TEXT DEFAULT NULL"); // manual model override per customer

  // messages_v2 新增字段
  safeAddColumn(db, 'messages_v2', 'email_subject', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'email_template_id', "TEXT DEFAULT ''");
  safeAddColumn(db, 'messages_v2', 'email_thread_id', "TEXT DEFAULT ''");

  // ── Batch 2-5: 客户邮件相关字段 ──
  safeAddColumn(db, 'customers_v2', 'email', "TEXT DEFAULT ''");
  safeAddColumn(db, 'customers_v2', 'is_unsubscribed', "INTEGER DEFAULT 0");
  safeAddColumn(db, 'customers_v2', 'unsubscribed_at', "TEXT DEFAULT ''");
  safeAddColumn(db, 'unsubscribe_list', 'project_id', "TEXT DEFAULT 'default'");

  // ── CRM P0: 客户时间线表 ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'system'
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_tl_cust ON customer_timeline(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tl_time ON customer_timeline(created_at)');

  // ── 跟进记录表 ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL,
      project_id TEXT DEFAULT 'default',
      attempt INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      message TEXT DEFAULT '',
      ai_context TEXT DEFAULT '',
      next_attempt_at TEXT,
      last_attempt_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers_v2(id)
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_fu_cust ON follow_ups(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_fu_proj ON follow_ups(project_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_fu_status ON follow_ups(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_fu_next ON follow_ups(next_attempt_at)');

  // ── CRM P0: 商机/订单表 ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      stage TEXT DEFAULT 'proposal',
      total_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      models TEXT DEFAULT '[]',
      deposit_amount REAL DEFAULT 0,
      deposit_date TEXT DEFAULT '',
      balance_amount REAL DEFAULT 0,
      balance_date TEXT DEFAULT '',
      order_date TEXT DEFAULT '',
      shipping_date TEXT DEFAULT '',
      delivery_date TEXT DEFAULT '',
      tracking_no TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      checklist TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers_v2(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_channels (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      account_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      label TEXT DEFAULT '',
      created_at TEXT,
      UNIQUE(channel, contact_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages_v2 (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      account_id TEXT NOT NULL DEFAULT 'default',
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT,
      status TEXT DEFAULT 'received',
      thought TEXT DEFAULT '',
      rag_sources TEXT DEFAULT '[]',
      retry_count INTEGER DEFAULT 0,
      meta TEXT DEFAULT '{}'
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cv2_cust ON customer_channels(customer_id);
    CREATE INDEX IF NOT EXISTS idx_cv2_lookup ON customer_channels(channel, contact_id);
    CREATE INDEX IF NOT EXISTS idx_mv2_cust ON messages_v2(customer_id);
    CREATE INDEX IF NOT EXISTS idx_mv2_ts ON messages_v2(timestamp);
    CREATE INDEX IF NOT EXISTS idx_mv2_acct ON messages_v2(account_id);
    CREATE INDEX IF NOT EXISTS idx_mv2_status ON messages_v2(status);
  `);

  // ── message_queue table (Phase 6: retry queue) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      account_id TEXT NOT NULL DEFAULT 'default',
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      content TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      retry_count INTEGER DEFAULT 0,
      next_retry_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_error TEXT DEFAULT ''
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mq_status ON message_queue(status, next_retry_at);
  `);

  // ── Knowledge docs & chunks DB (Phase 7B) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      file_path TEXT,
      chunk_count INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks_db (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // ── Intervene mode column ──
  const cols = db.prepare("PRAGMA table_info(customers_v2)").all().map(c => c.name);
  if (!cols.includes('intervene_mode')) {
    db.exec("ALTER TABLE customers_v2 ADD COLUMN intervene_mode INTEGER DEFAULT 0");
  }

  // ── Migrate old data ──
  const oldCustomers = db.prepare('SELECT * FROM customers').all();
  const hasV2 = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customers_v2'").get();
  if (hasV2 && oldCustomers.length > 0) {
    const count = db.prepare('SELECT COUNT(*) as c FROM customers_v2').get().c;
    if (count === 0) {
      console.log(`🔄 Migrating ${oldCustomers.length} old customers to v2...`);
      const insertV2 = db.prepare('INSERT OR IGNORE INTO customers_v2 (id, display_name, phone, country, status, tags, notes, profile, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insertCC = db.prepare('INSERT OR IGNORE INTO customer_channels (id, customer_id, channel, account_id, contact_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const c of oldCustomers) {
        const custId = 'cust_' + c.phone.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || crypto.randomBytes(4).toString('hex');
        insertV2.run(custId, c.name || '', c.phone, '', 'new', c.tags || '[]', c.notes || '', c.profile || '{}', c.created_at, c.updated_at);
        insertCC.run('cc_' + crypto.randomBytes(4).toString('hex'), custId, 'whatsapp', 'default', c.phone, c.phone, c.created_at);
      }
      console.log('✅ Customer migration done');
    }
  }

  const oldMessages = db.prepare('SELECT * FROM messages').all();
  if (hasV2 && oldMessages.length > 0) {
    const mv2Count = db.prepare('SELECT COUNT(*) as c FROM messages_v2').get().c;
    if (mv2Count === 0) {
      console.log(`🔄 Migrating ${oldMessages.length} old messages to v2...`);
      const insertMV2 = db.prepare('INSERT OR IGNORE INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, thought, rag_sources, meta, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const m of oldMessages) {
        const custId = 'cust_' + m.phone.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'unknown';
        const projId = db.prepare('SELECT project_id FROM customers_v2 WHERE id = ?').get(custId)?.project_id || '';
        insertMV2.run('mv2_' + m.id, custId, 'default', 'whatsapp', m.direction === 'in' || m.direction === 'inbound' ? 'inbound' : 'outbound', m.content, m.created_at, 'received', m.thought || '', m.rag_sources || '[]', '{}', projId);
      }
      console.log('✅ Message migration done');
    }
  }

  // 商机
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      title TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      stage TEXT DEFAULT 'discovery',
      probability INTEGER DEFAULT 20,
      expected_close TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (phone) REFERENCES customers(phone)
    );
  `);

  // 索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_opportunities_phone ON opportunities(phone);
  `);

  // AI 供应商管理表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      models TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purpose TEXT NOT NULL UNIQUE,
      provider_id INTEGER NOT NULL,
      model_id TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES ai_providers(id)
    );
  `);

  // ── 多项目支持 ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      ai_persona TEXT DEFAULT '{}',
      sales_strategy TEXT DEFAULT '{}',
      knowledge_root TEXT DEFAULT '',
      follow_up_config TEXT DEFAULT '{"interval_hours":24,"max_attempts":3}',
      language TEXT DEFAULT 'zh-CN',
      timezone TEXT DEFAULT 'Asia/Shanghai',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 报表历史
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      project_id TEXT DEFAULT 'default',
      content TEXT DEFAULT '{}',
      date_range_start TEXT,
      date_range_end TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── 系统日志表（持久化，带项目维度） ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      level TEXT DEFAULT 'info',
      action TEXT DEFAULT '',
      message TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_syslog_project ON system_logs(project_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_syslog_time ON system_logs(created_at DESC)');

  // 为现有业务表加 project_id（默认 'default'）
  for (const table of ['customers', 'customers_v2', 'messages', 'messages_v2', 'deals',
    'customer_timeline', 'customer_channels', 'message_queue', 'knowledge_docs',
    'knowledge_chunks_db', 'opportunities', 'conversation_summaries']) {
    safeAddColumn(db, table, 'project_id', "TEXT DEFAULT 'default'");
  }

  // ── 知识库数据迁移：将空/default 的记录归到第一个非默认项目 ──
  try {
    const firstProject = db.prepare("SELECT id FROM projects WHERE id != 'default' ORDER BY created_at ASC LIMIT 1").get();
    if (firstProject) {
      const pid = firstProject.id;
      const docsMigrated = db.prepare("UPDATE knowledge_docs SET project_id = ? WHERE (project_id IS NULL OR project_id = 'default' OR project_id = '') AND project_id != ?").run(pid, pid).changes;
      const chunksMigrated = db.prepare("UPDATE knowledge_chunks_db SET project_id = ? WHERE (project_id IS NULL OR project_id = 'default' OR project_id = '') AND project_id != ?").run(pid, pid).changes;
      if (docsMigrated > 0 || chunksMigrated > 0) {
        console.log(`📦 Knowledge migrated to project ${pid}: ${docsMigrated} docs, ${chunksMigrated} chunks`);
      }
    }
  } catch(e) { console.warn('[DB] knowledge migration failed:', e.message); }

  // 项目级并发配额字段
  safeAddColumn('projects', 'ai_concurrency', 'INTEGER DEFAULT 0');
  safeAddColumn('projects', 'send_concurrency', 'INTEGER DEFAULT 0');

  // ── Batch 2-5: Sequences, A/B Test, Satisfaction, SLA ──

  // 邮件序列
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_sequences (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      category TEXT DEFAULT 'cold',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_sequence_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id TEXT NOT NULL,
      step_order INTEGER DEFAULT 1,
      name TEXT DEFAULT '',
      delay_days INTEGER DEFAULT 1,
      template_id TEXT,
      subject TEXT DEFAULT '',
      body_html TEXT DEFAULT '',
      condition_field TEXT DEFAULT '',
      condition_value TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sequence_id) REFERENCES email_sequences(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ess_seq ON email_sequence_steps(sequence_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_sequence_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sequence_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      started_at TEXT DEFAULT (datetime('now')),
      next_send_at TEXT DEFAULT '',
      last_sent_at TEXT DEFAULT '',
      UNIQUE(sequence_id, customer_id),
      FOREIGN KEY (sequence_id) REFERENCES email_sequences(id),
      FOREIGN KEY (customer_id) REFERENCES customers_v2(id)
    );
    CREATE INDEX IF NOT EXISTS idx_esm_cust ON email_sequence_members(customer_id);
    CREATE INDEX IF NOT EXISTS idx_esm_next ON email_sequence_members(next_send_at, status);
  `);

  // A/B 测试
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_ab_tests (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      test_type TEXT DEFAULT 'subject',
      template_a_id TEXT NOT NULL,
      template_b_id TEXT NOT NULL,
      traffic_percent INTEGER DEFAULT 50,
      metric TEXT DEFAULT 'open_rate',
      status TEXT DEFAULT 'running',
      total_a INTEGER DEFAULT 0,
      total_b INTEGER DEFAULT 0,
      success_a INTEGER DEFAULT 0,
      success_b INTEGER DEFAULT 0,
      winner TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT DEFAULT ''
    );
  `);

  // 满意度调查
  db.exec(`
    CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT,
      project_id TEXT DEFAULT 'default',
      survey_type TEXT DEFAULT 'csat',
      channel TEXT DEFAULT 'whatsapp',
      score INTEGER,
      feedback TEXT DEFAULT '',
      trigger_type TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      responded_at TEXT DEFAULT '',
      FOREIGN KEY (customer_id) REFERENCES customers_v2(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sat_cust ON satisfaction_surveys(customer_id);
  `);

  // Webhook 通知
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT DEFAULT 'default',
      event_type TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── AI 调用日志表 ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      project_id TEXT DEFAULT 'default',
      customer_id TEXT,
      phone TEXT,
      model TEXT NOT NULL,
      tier TEXT,
      route_reason TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      total_time_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      quality_score REAL,
      complexity TEXT,
      customer_stage TEXT,
      has_reply_sent INTEGER DEFAULT 0,
      ai_quality_score TEXT,
      attempts INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_acl_timestamp ON ai_call_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_acl_model ON ai_call_logs(model);
    CREATE INDEX IF NOT EXISTS idx_acl_project ON ai_call_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_acl_status ON ai_call_logs(status);
  `);

  // ── 性能优化：project_id 索引 + 复合索引 ──
  db.exec(`
    -- 高频表 project_id 单列索引
    CREATE INDEX IF NOT EXISTS idx_cv2_project ON customers_v2(project_id);
    CREATE INDEX IF NOT EXISTS idx_mv2_project ON messages_v2(project_id);
    CREATE INDEX IF NOT EXISTS idx_deals_project ON deals(project_id);
    CREATE INDEX IF NOT EXISTS idx_ct_project ON customer_timeline(project_id);
    CREATE INDEX IF NOT EXISTS idx_escal_project ON escalation_events(project_id);

    -- 复合索引：覆盖高频查询模式
    -- messages_v2: 工作台按项目+日期查消息
    CREATE INDEX IF NOT EXISTS idx_mv2_proj_date ON messages_v2(project_id, date(timestamp));
    -- messages_v2: 按项目+状态过滤 (pending 等)
    CREATE INDEX IF NOT EXISTS idx_mv2_proj_status ON messages_v2(project_id, status);
    -- messages_v2: 对话详情按客户+时间
    CREATE INDEX IF NOT EXISTS idx_mv2_cust_ts ON messages_v2(customer_id, timestamp DESC);
    -- customers_v2: 列表页按项目+更新时间
    CREATE INDEX IF NOT EXISTS idx_cv2_proj_updated ON customers_v2(project_id, updated_at DESC);
    -- ai_call_logs: 趋势分析按项目+时间
    CREATE INDEX IF NOT EXISTS idx_acl_proj_ts ON ai_call_logs(project_id, timestamp);
    -- deals: 按项目+客户
    CREATE INDEX IF NOT EXISTS idx_deals_proj_cust ON deals(project_id, customer_id);
  `);

  // ── 数据修补：messages_v2 历史数据的 project_id 同步 ──
  // 将通过 safeAddColumn 添加的默认值 'default' 同步到实际客户所属项目
  try {
    const syncCount = db.prepare(`
      UPDATE messages_v2 SET project_id = (
        SELECT c.project_id FROM customers_v2 c WHERE c.id = messages_v2.customer_id
      )
      WHERE messages_v2.project_id = 'default'
      AND EXISTS (SELECT 1 FROM customers_v2 c WHERE c.id = messages_v2.customer_id AND c.project_id IS NOT NULL AND c.project_id != 'default')
    `).run().changes;
    if (syncCount > 0) console.log(`📦 Synced project_id for ${syncCount} messages`);
  } catch(e) { console.warn('[DB] messages_v2 project_id sync failed:', e.message); }

  // ── 数据修补：escalation_events 的 project_id 同步 ──
  try {
    const syncEsc = db.prepare(`
      UPDATE escalation_events SET project_id = (
        SELECT c.project_id FROM customers_v2 c WHERE c.id = escalation_events.customer_id
      )
      WHERE (escalation_events.project_id IS NULL OR escalation_events.project_id = '')
      AND EXISTS (SELECT 1 FROM customers_v2 c WHERE c.id = escalation_events.customer_id AND c.project_id IS NOT NULL AND c.project_id != '')
    `).run().changes;
    if (syncEsc > 0) console.log(`📦 Synced project_id for ${syncEsc} escalation_events`);
  } catch(e) { console.warn('[DB] escalation_events project_id sync failed:', e.message); }

  // ── 数据修补：customer_timeline 的 project_id 同步 ──
  try {
    const syncTL = db.prepare(`
      UPDATE customer_timeline SET project_id = (
        SELECT c.project_id FROM customers_v2 c WHERE c.id = customer_timeline.customer_id
      )
      WHERE (customer_timeline.project_id IS NULL OR customer_timeline.project_id = '' OR customer_timeline.project_id = 'default')
      AND EXISTS (SELECT 1 FROM customers_v2 c WHERE c.id = customer_timeline.customer_id AND c.project_id IS NOT NULL AND c.project_id != '' AND c.project_id != 'default')
    `).run().changes;
    if (syncTL > 0) console.log(`📦 Synced project_id for ${syncTL} customer_timeline entries`);
  } catch(e) { console.warn('[DB] customer_timeline project_id sync failed:', e.message); }

  // 清理 90 天前的 AI 调用日志
  try {
    const deleted = db.prepare("DELETE FROM ai_call_logs WHERE timestamp < datetime('now', '-90 days')").run();
    if (deleted.changes > 0) console.log(`🧹 Cleaned ${deleted.changes} old ai_call_logs (>90d)`);
  } catch(e) { console.warn('[DB] ai_call_logs cleanup failed:', e.message); }

  // 初始化默认供应商（仅当表为空时）
  initDefaultAIProviders();

  // 初始化默认邮件序列
  initDefaultSequences();

  console.log('✅ CRM database initialized');
}

// ============================================================
// 默认邮件序列初始化
// ============================================================

function initDefaultSequences() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM email_sequences').get().c;
  if (existing > 0) return;

  const sequences = [
    { id: 'seq_cold', name: '冷邮件开发序列', category: 'cold' },
    { id: 'seq_quote', name: '报价跟进序列', category: 'followup' },
    { id: 'seq_reengage', name: '流失挽回序列', category: 're-engage' },
    { id: 'seq_onboard', name: '新客户引导序列', category: 'onboarding' }
  ];

  for (const seq of sequences) {
    db.prepare('INSERT OR IGNORE INTO email_sequences (id, project_id, name, category) VALUES (?, ?, ?, ?)')
      .run(seq.id, 'default', seq.name, seq.category);
  }

  // 冷邮件序列步骤
  const coldSteps = [
    { seq: 'seq_cold', order: 1, delay: 0, name: '自我介绍', template: 'cold-email-1-intro' },
    { seq: 'seq_cold', order: 2, delay: 3, name: '价值主张', template: 'cold-email-2-value' },
    { seq: 'seq_cold', order: 3, delay: 7, name: '案例证明', template: 'cold-email-3-proof' },
    { seq: 'seq_cold', order: 4, delay: 14, name: '特别优惠', template: 'cold-email-4-offer' },
    { seq: 'seq_cold', order: 5, delay: 30, name: '最后尝试', template: 'cold-email-5-breakup' }
  ];
  // 报价跟进
  const quoteSteps = [
    { seq: 'seq_quote', order: 1, delay: 2, name: '确认收到', template: 'quote-followup-1' },
    { seq: 'seq_quote', order: 2, delay: 5, name: '解答疑虑', template: 'quote-followup-2' },
    { seq: 'seq_quote', order: 3, delay: 10, name: '紧迫促成', template: 'quote-followup-3' }
  ];
  // 流失挽回
  const reSteps = [
    { seq: 'seq_reengage', order: 1, delay: 0, name: '重新连接', template: 're-engage-1' },
    { seq: 'seq_reengage', order: 2, delay: 7, name: '新价值', template: 're-engage-2' },
    { seq: 'seq_reengage', order: 3, delay: 21, name: '最后优惠', template: 're-engage-3' }
  ];
  // 新客户引导
  const onSteps = [
    { seq: 'seq_onboard', order: 1, delay: 0, name: '欢迎', template: 'onboarding-1' },
    { seq: 'seq_onboard', order: 2, delay: 2, name: '产品概览', template: 'onboarding-2' },
    { seq: 'seq_onboard', order: 3, delay: 5, name: '使用指南', template: 'onboarding-3' }
  ];

  for (const steps of [coldSteps, quoteSteps, reSteps, onSteps]) {
    for (const s of steps) {
      db.prepare('INSERT OR IGNORE INTO email_sequence_steps (sequence_id, step_order, name, delay_days, template_id) VALUES (?, ?, ?, ?, ?)')
        .run(s.seq, s.order, s.name, s.delay, s.template);
    }
  }
  console.log('📧 Default email sequences initialized');
}

// ============================================================
// AI 供应商管理系统
// ============================================================

function initDefaultAIProviders() {
  const count = db.prepare('SELECT COUNT(*) as c FROM ai_providers').get().c;
  if (count > 0) return;

  const defaultKey = process.env.SILICONFLOW_API_KEY || '';
  const defaultUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn';
  const defaultChat = process.env.AI_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
  const defaultEmbed = process.env.EMBEDDING_MODEL || 'BAAI/bge-m3';
  const defaultRerank = process.env.RERANKER_MODEL || 'BAAI/bge-reranker-v2-m3';

  const insert = db.prepare(
    "INSERT INTO ai_providers (name, api_url, api_key, models, is_active) VALUES (?, ?, ?, ?, 1)"
  );
  const result = insert.run(
    'SiliconFlow (默认)',
    defaultUrl,
    defaultKey,
    JSON.stringify([
      { id: defaultChat, name: defaultChat },
      { id: defaultEmbed, name: defaultEmbed },
      { id: defaultRerank, name: defaultRerank }
    ])
  );

  const providerId = result.lastInsertRowid;

  // 插入默认模型分配
  const insertAssignment = db.prepare(
    "INSERT OR REPLACE INTO model_assignments (purpose, provider_id, model_id) VALUES (?, ?, ?)"
  );
  insertAssignment.run('chat', providerId, defaultChat);
  insertAssignment.run('embedding', providerId, defaultEmbed);
  insertAssignment.run('reranker', providerId, defaultRerank);

  console.log(`✅ Default AI provider initialized (id=${providerId})`);
}

/**
 * 获取指定用途的 AI 配置 { apiUrl, apiKey, model }
 * 如果数据库没有配置，fallback 到环境变量
 */
function getAIConfig(purpose) {
  try {
    const assignment = db.prepare(
      'SELECT ma.model_id, ap.api_url, ap.api_key FROM model_assignments ma JOIN ai_providers ap ON ma.provider_id = ap.id WHERE ma.purpose = ?'
    ).get(purpose);

    if (assignment) {
      return {
        apiUrl: assignment.api_url,
        apiKey: assignment.api_key,
        model: assignment.model_id
      };
    }
  } catch (e) {
    console.error(`⚠️ Failed to get AI config for "${purpose}":`, e.message);
  }

  // Fallback to env vars
  if (purpose === 'chat') {
    return { apiUrl: SILICONFLOW_BASE_URL, apiKey: SILICONFLOW_API_KEY, model: AI_MODEL };
  } else if (purpose === 'embedding') {
    return { apiUrl: SILICONFLOW_BASE_URL, apiKey: SILICONFLOW_API_KEY, model: EMBEDDING_MODEL };
  } else if (purpose === 'reranker') {
    return { apiUrl: SILICONFLOW_BASE_URL, apiKey: SILICONFLOW_API_KEY, model: RERANKER_MODEL };
  }
  return { apiUrl: SILICONFLOW_BASE_URL, apiKey: SILICONFLOW_API_KEY, model: AI_MODEL };
}

// ============================================================
// CRM 操作函数
// ============================================================

function generateCustId() {
  return 'cust_' + crypto.randomBytes(4).toString('hex');
}

// ============================================================
// AI 模型智能路由
// ============================================================

// 可用模型列表
const AVAILABLE_MODELS = [
  { id: 'Pro/zai-org/GLM-4.7', name: 'GLM-4.7 (深度思考)', tier: 'complex', avgTime: 21000 },
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B (大模型)', tier: 'medium', avgTime: 6000 },
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B (轻量快速)', tier: 'simple', avgTime: 2000 },
];

// 默认路由配置
const DEFAULT_MODEL_ROUTING = {
  enabled: true,
  mode: 'smart',              // "smart" | "full_tuning" | "manual"
  defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
  simpleModel: 'Qwen/Qwen2.5-7B-Instruct',
  complexModel: 'Pro/zai-org/GLM-4.7',
  fallbackChain: ['Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-7B-Instruct'],
  stages: {
    ice_breaking: 'Qwen/Qwen2.5-7B-Instruct',
    needs_discovery: 'Qwen/Qwen2.5-72B-Instruct',
    product_recommendation: 'Qwen/Qwen2.5-72B-Instruct',
    quotation: 'Pro/zai-org/GLM-4.7',
    objection_handling: 'Qwen/Qwen2.5-72B-Instruct',
    closing: 'Pro/zai-org/GLM-4.7',
    after_sales: 'Qwen/Qwen2.5-7B-Instruct',
  },
  complexityRules: {
    simple: {
      maxLength: 15,
      patterns: ['^hi$','^hello$','^hey$','^ok$','^thanks$','^thank you$','^谢谢$','^好的$','^再见$','^bye$','^👌$','^👍$','^😊$','^👍🏻$','^👌🏻$'],
    },
    complex: {
      patterns: ['price|价格|报价|quote|quotation|多少钱|how much|cost|下单|order|样品|sample|投诉|complaint|退款|refund|合同|contract|发票|invoice|定金|deposit|定制|customiz'],
    },
  },
};

/**
 * 获取项目级模型路由配置
 */
function getProjectModelRouting(projectId = 'default') {
  try {
    const row = db.prepare('SELECT model_routing FROM projects WHERE id = ?').get(projectId);
    if (row && row.model_routing) {
      return { ...DEFAULT_MODEL_ROUTING, ...JSON.parse(row.model_routing) };
    }
  } catch (e) {
    console.error('[ModelRouting] load error:', e.message);
  }
  return { ...DEFAULT_MODEL_ROUTING };
}

/**
 * 保存项目级模型路由配置
 */
function saveProjectModelRouting(projectId, config) {
  try {
    const merged = { ...DEFAULT_MODEL_ROUTING, ...config };
    db.prepare('UPDATE projects SET model_routing = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(JSON.stringify(merged), projectId);
    console.log(`[ModelRouting] saved for project ${projectId}`);
  } catch (e) {
    console.error('[ModelRouting] save error:', e.message);
  }
}

/**
 * 分类消息复杂度: 'simple' | 'medium' | 'complex'
 */
function classifyMessageComplexity(message) {
  if (!message) return 'medium';
  const trimmed = message.trim();

  // 简单：极短消息 + 匹配简单模式
  const rules = DEFAULT_MODEL_ROUTING.complexityRules;
  if (trimmed.length <= rules.simple.maxLength) {
    const lower = trimmed.toLowerCase();
    if (rules.simple.patterns.some(p => new RegExp(p, 'i').test(lower))) {
      return 'simple';
    }
  }

  // 复杂：包含关键业务关键词
  const lower = trimmed.toLowerCase();
  if (rules.complex.patterns.some(p => new RegExp(p, 'i').test(lower))) {
    return 'complex';
  }

  // 中等：其余情况
  // 如果消息较长（>50字符）也倾向于复杂
  if (trimmed.length > 50) return 'complex';
  return 'medium';
}

/**
 * 根据路由规则获取模型配置（核心路由函数）
 * @param {string} purpose - AI 用途，如 'chat'
 * @param {string} phone - 客户手机号
 * @param {string} userMessage - 用户消息
 * @param {object} profile - 客户画像
 * @param {string} accountId - 账号ID
 * @returns {{ apiUrl, apiKey, model, tier, mode, routingInfo }}
 */
async function getRoutedAIConfig(purpose, phone, userMessage, profile, accountId = 'default') {
  const projectId = getAccountProject(accountId);
  const routing = getProjectModelRouting(projectId);

  // 如果路由未启用，走原始逻辑
  if (!routing.enabled) {
    const cfg = getAIConfig(purpose);
    return { ...cfg, tier: 'default', mode: 'passthrough', routingInfo: 'routing disabled' };
  }

  let selectedModel = routing.defaultModel;
  let tier = 'medium';
  let routingInfo = '';

  // 1. 检查手动干预（客户级强制模型）
  try {
    // 只做查询，不创建客户（避免重复绑定）
    const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ? LIMIT 1').get(phone);
    if (binding) {
      const cust = db.prepare('SELECT force_model FROM customers_v2 WHERE id = ?').get(binding.customer_id);
      if (cust && cust.force_model) {
        selectedModel = cust.force_model;
        tier = 'forced';
        routingInfo = `forced=${cust.force_model}`;
        const cfg = getAIConfig(purpose);
        const baseCfg = cfg.apiKey ? cfg : { apiUrl: SILICONFLOW_BASE_URL, apiKey: SILICONFLOW_API_KEY, model: selectedModel };
        return { ...baseCfg, model: selectedModel, tier, mode: routing.mode, routingInfo };
      }
    }
  } catch (e) {
    // 忽略查询失败，继续后续逻辑
  }

  // 2. 全调优模式：所有消息用深度模型
  if (routing.mode === 'full_tuning') {
    selectedModel = routing.complexModel;
    tier = 'complex';
    routingInfo = 'full_tuning';
  }
  // 3. 智能模式
  else if (routing.mode === 'smart') {
    const stage = profile?.estimatedStage || '';
    const stageModel = routing.stages?.[stage];

    if (stageModel) {
      // 有阶段配置，优先使用阶段配置的模型
      selectedModel = stageModel;
      tier = stageModel === routing.complexModel ? 'complex' : (stageModel === routing.simpleModel ? 'simple' : 'medium');
      routingInfo = `stage=${stage},model=${stageModel}`;
    } else {
      // 没有阶段配置，用消息复杂度选择
      const complexity = classifyMessageComplexity(userMessage);
      if (complexity === 'simple') {
        selectedModel = routing.simpleModel;
        tier = 'simple';
      } else if (complexity === 'complex') {
        selectedModel = routing.complexModel;
        tier = 'complex';
      } else {
        selectedModel = routing.defaultModel;
        tier = 'medium';
      }
      routingInfo = `complexity=${complexity},model=${selectedModel}`;
    }
  }
  // 4. 手动模式：使用 defaultModel
  else if (routing.mode === 'manual') {
    selectedModel = routing.defaultModel;
    tier = 'manual';
    routingInfo = 'manual';
  }

  // 获取 API 配置（优先用数据库配置，否则用环境变量）
  const cfg = getAIConfig(purpose);
  const finalCfg = {
    apiUrl: cfg.apiUrl || SILICONFLOW_BASE_URL,
    apiKey: cfg.apiKey || SILICONFLOW_API_KEY,
    model: selectedModel,
    tier,
    mode: routing.mode,
    routingInfo,
    projectId,
    fallbackChain: routing.fallbackChain || [],
  };

  return finalCfg;
}

/**
 * 带兜底链的 AI 调用（非流式）
 * @param {object} config - { apiUrl, apiKey, model, fallbackChain }
 * @param {array} messages - [{ role, content }]
 * @param {object} options - { maxTokens, temperature, timeout }
 * @returns {{ content, model, tier, attempts }}
 */
// ── AI 调用日志记录辅助 ──
function recordAICallLog(entry) {
  try {
    db.prepare(`INSERT INTO ai_call_logs (project_id, customer_id, phone, model, tier, route_reason, prompt_tokens, completion_tokens, total_tokens, latency_ms, total_time_ms, status, error_message, quality_score, complexity, customer_stage, has_reply_sent, ai_quality_score, attempts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(entry.project_id || 'default', entry.customer_id || null, entry.phone || null, entry.model, entry.tier || null, entry.route_reason || null, entry.prompt_tokens || 0, entry.completion_tokens || 0, entry.total_tokens || 0, entry.latency_ms || 0, entry.total_time_ms || 0, entry.status || 'success', entry.error_message || null, entry.quality_score || null, entry.complexity || null, entry.customer_stage || null, entry.has_reply_sent || 0, entry.ai_quality_score || null, entry.attempts || 1);
  } catch(e) { console.warn('[AICallLog] write failed:', e.message); }
}

async function callAIWithFallback(config, messages, options = {}) {
  const { maxTokens = 1024, temperature = 0.7, timeout = 30000 } = options;
  const modelsToTry = [config.model, ...(config.fallbackChain || [])];
  const errors = [];
  const callStartTime = Date.now();

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const attempt = i + 1;
    const attemptStart = Date.now();
    try {
      console.log(`[ModelRouting] attempt ${attempt}/${modelsToTry.length}: model=${model}`);
      const response = await axios.post(
        `${config.apiUrl}/v1/chat/completions`,
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: model.includes('GLM') ? 60000 : timeout,  // 推理模型给更多时间
        }
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const usage = response.data.usage || {};
      const latency = Date.now() - attemptStart;

      if (content) {
        const tier = model === 'Pro/zai-org/GLM-4.7' ? 'complex' :
                     model === 'Qwen/Qwen2.5-7B-Instruct' ? 'simple' : 'medium';
        // 记录成功调用日志
        recordAICallLog({
          ...options._callLogContext,
          model,
          tier: options._callLogContext?.tier || tier,
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
          latency_ms: latency,
          status: attempt > 1 ? 'fallback' : 'success',
          attempts: attempt,
        });
        return { content, model, tier, attempts: attempt, usage, latency };
      }
      errors.push(`model=${model}: empty response`);
      // 记录空回复
      recordAICallLog({
        ...options._callLogContext,
        model,
        tier: options._callLogContext?.tier || (model === 'Pro/zai-org/GLM-4.7' ? 'complex' : model === 'Qwen/Qwen2.5-7B-Instruct' ? 'simple' : 'medium'),
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        latency_ms: latency,
        status: 'empty',
        attempts: attempt,
      });
    } catch (e) {
      const errMsg = e.response?.data?.error?.message || e.message;
      errors.push(`model=${model}: ${errMsg}`);
      console.warn(`[ModelRouting] attempt ${attempt} failed: ${errMsg}`);
      // 记录失败
      recordAICallLog({
        ...options._callLogContext,
        model,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        latency_ms: Date.now() - attemptStart,
        status: 'failed',
        error_message: errMsg,
        attempts: attempt,
      });
    }
  }

  // 全部失败，返回 null 让调用者做兜底
  console.error(`[ModelRouting] all ${modelsToTry.length} attempts failed:`, errors);
  return null;
}

// 获取账号绑定的项目ID
function getAccountProject(accountId) {
  try {
    const ch = channels.getChannel(accountId);
    return ch?.projectId || 'default';
  } catch { return 'default'; }
}

function getOrCreateCustomer(phone, accountId = 'default', channel = 'whatsapp') {
  const projectId = getAccountProject(accountId);

  // 1. Look up by channel binding
  let binding = db.prepare('SELECT * FROM customer_channels WHERE channel = ? AND contact_id = ?').get(channel, phone);
  if (binding) {
    db.prepare('UPDATE customers_v2 SET updated_at = ? WHERE id = ?').run(sqlNow(), binding.customer_id);
    return { customerId: binding.customer_id, isNew: false, projectId };
  }

  // 2. Check if phone matches a customer in v2
  let existing = db.prepare('SELECT * FROM customers_v2 WHERE phone = ?').get(phone);
  if (existing) {
    // Bind channel
    const ccId = 'cc_' + crypto.randomBytes(4).toString('hex');
    db.prepare('INSERT OR IGNORE INTO customer_channels (id, customer_id, channel, account_id, contact_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(ccId, existing.id, channel, accountId, phone, phone, sqlNow());
    return { customerId: existing.id, isNew: false, projectId };
  }

  // 3. Create new customer with project_id
  const custId = generateCustId();
  db.prepare('INSERT INTO customers_v2 (id, phone, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(custId, phone, projectId, sqlNow(), sqlNow());
  const ccId = 'cc_' + crypto.randomBytes(4).toString('hex');
  db.prepare('INSERT INTO customer_channels (id, customer_id, channel, account_id, contact_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(ccId, custId, channel, accountId, phone, phone, sqlNow());

  // Also create in old table for backward compat
  try {
    db.prepare('INSERT OR IGNORE INTO customers (phone, last_contact) VALUES (?, ?)').run(phone, sqlNow());
  } catch(e) {}

  return { customerId: custId, isNew: true, projectId };
}

function updateCustomer(phone, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE customers SET ${sets}, updated_at = ? WHERE phone = ?`)
    .run(...Object.values(fields), sqlNow(), phone);
}

function updateCustomerV2(customerId, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE customers_v2 SET ${sets}, updated_at = ? WHERE id = ?`)
    .run(...Object.values(fields), sqlNow(), customerId);
}

function saveMessage(phone, direction, content, _isKeyNode = 0, thought = '', ragSources = '', customerId = null, accountId = 'default', channel = 'whatsapp', projectId = null) {
  // Resolve project_id from customer if not provided
  if (!projectId && customerId) {
    try { projectId = db.prepare('SELECT project_id FROM customers_v2 WHERE id = ?').get(customerId)?.project_id || ''; } catch {}
  }

  // v2 table
  if (customerId) {
    const mv2Id = 'mv2_' + crypto.randomBytes(8).toString('hex');
    db.prepare('INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, thought, rag_sources, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(mv2Id, customerId, accountId, channel, direction === 'in' ? 'inbound' : 'outbound', content, sqlNow(), 'received', thought, ragSources || '[]', projectId || '');
    // CRM: 更新统计 + 时间线
    if (direction === 'in') {
      try {
        db.prepare('UPDATE customers_v2 SET message_count = message_count + 1, last_inbound_at = ?, response_rate = CAST(our_reply_count AS REAL) / (message_count + 1), updated_at = ? WHERE id = ?')
          .run(sqlNow(), sqlNow(), customerId);
        db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data, project_id) VALUES (?, ?, ?, ?)')
          .run(customerId, 'message_received', JSON.stringify({ content: content.slice(0, 200) }), projectId || '');
      } catch(e) { console.error('[Timeline] message_received event failed:', e); }
    }
  }
}

function getRecentMessages(phone, limit = 10, customerId = null) {
  if (customerId) {
    return db.prepare('SELECT * FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp DESC LIMIT ?')
      .all(customerId, limit).reverse();
  }
  // Fallback: resolve customerId from phone
  const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(phone);
  if (binding) {
    return db.prepare('SELECT * FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp DESC LIMIT ?')
      .all(binding.customer_id, limit).reverse();
  }
  return [];
}

function getConversationHistory(phone, maxTokens = 1500, customerId = null) {
  // 先查总结作为上下文前缀
  const cid = customerId || db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(phone)?.customer_id;
  let prefix = '';
  if (cid) {
    const summaries = db.prepare(
      'SELECT summary, created_at FROM conversation_summaries WHERE phone = ? ORDER BY created_at DESC LIMIT 3'
    ).all(phone);
    if (summaries.length > 0) {
      prefix = summaries.map(s => `[历史对话总结 ${s.created_at}]: ${s.summary}`).join('\n') + '\n\n';
    }
  }

  const messages = getRecentMessages(phone, 20, cid);
  const history = [];
  let charCount = 0;
  for (const msg of messages) {
    const dir = msg.direction === 'inbound' ? 'in' : msg.direction;
    const entry = dir === 'in' ? `客户: ${msg.content}` : `貂貂: ${msg.content}`;
    if (charCount + entry.length > maxTokens) break;
    history.push(entry);
    charCount += entry.length;
  }

  const historyText = history.join('\n');
  if (!historyText && !prefix) return null;
  return prefix + historyText;
}

// 客户画像识别
function identifyCustomerProfile(phone, recentMessages, customer = {}) {
  // 语言检测基于最近消息（权重最新）
  const allText = recentMessages.map(m => m.content).join(' ');
  const latestInMsgs = recentMessages.filter(m => m.direction === 'in' || m.direction === 'inbound').slice(-3);
  const latestText = latestInMsgs.map(m => m.content).join(' ');

  let detectedLang = detectLanguage(allText);
  // 如果最新几条入站消息是英文，覆盖为英文
  if (latestText && !/[\u4e00-\u9fff]/.test(latestText) && /[a-zA-Z]/.test(latestText)) {
    detectedLang = 'en';
  }

  const profile = {
    language: detectedLang,
    businessType: detectBusinessType(allText),
    purchaseIntent: detectPurchaseIntent(recentMessages),
    priceSensitivity: detectPriceSensitivity(allText),
    engagementLevel: detectEngagementLevel(recentMessages),
    estimatedStage: 'new_lead'
  };

  // 综合判断销售阶段
  profile.estimatedStage = estimateStage(phone, recentMessages, customer);

  // 新增：情绪画像
  const lastFewInbound = recentMessages.filter(m => m.direction === 'in' || m.direction === 'inbound').slice(-5);
  const emotionSignals = lastFewInbound.map(m => m.content.toLowerCase());
  let dominantEmotion = 'neutral';
  if (emotionSignals.some(t => /angry|furious|垃圾|废物|投诉|骗子|worst|terrible|refund/i.test(t))) dominantEmotion = 'angry';
  else if (emotionSignals.some(t => /unhappy|disappointed|失望|不满意|not good|太贵|expensive|problem|issue|broken/i.test(t))) dominantEmotion = 'negative';
  else if (emotionSignals.some(t => /great|awesome|thanks|thank|好好|不错|喜欢|happy|love|perfect|good| interested/i.test(t))) dominantEmotion = 'positive';
  profile.dominantEmotion = dominantEmotion;

  // 新增：决策风格（基于沟通模式）
  const avgMsgLen = lastFewInbound.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, lastFewInbound.length);
  profile.decisionStyle = avgMsgLen > 100 ? 'analytical' : avgMsgLen > 30 ? 'balanced' : 'quick';

  // 新增：购买信号识别
  const buySignals = ['什么时候能发货', '什么时候发货', '发货', '起订量', '最低起订', '能便宜多少', '怎么付款', 'order', 'ship', 'delivery', 'moq', 'place order', '什么时候能到', '交期', '什么时候有货', '什么时候可以'];
  const weakSignals = ['再考虑', '想想', 'compare', '对比一下', '看看其他', 'let me think', 'later', '下次', '下周再说', 'need time', 'discuss with'];
  const hasStrong = recentMessages.some(m => buySignals.some(s => m.content.toLowerCase().includes(s.toLowerCase())));
  const hasWeak = recentMessages.some(m => weakSignals.some(s => m.content.toLowerCase().includes(s.toLowerCase())));
  profile.buyingSignal = hasStrong ? 'strong' : hasWeak ? 'weak' : 'none';

  // 新增：竞品识别
  const competitorPatterns = [/(\w+)\s*(品牌|brand|machine|equipment)/i, /from\s+(\w+)/i, /using\s+(\w+)/i, /currently (have|use|working with)\s+(\w+)/i];
  const detectedCompetitors = [];
  for (const pat of competitorPatterns) {
    const match = allText.match(pat);
    if (match && match[1] && match[1].length > 2 && match[1].length < 30) {
      detectedCompetitors.push(match[1]);
    }
  }
  if (detectedCompetitors.length > 0) profile.competitors = [...new Set(detectedCompetitors)];

  // 新增：紧迫度检测
  const urgencySignals = ['urgent', '急', 'asap', '尽快', 'immediately', 'right now', '今天', 'this week', '本周', '马上'];
  const noUrgencySignals = ['no rush', '不急', 'take my time', '慢慢来', 'whenever', '有空'];
  if (urgencySignals.some(s => allText.toLowerCase().includes(s.toLowerCase()))) profile.urgency = 'high';
  else if (noUrgencySignals.some(s => allText.toLowerCase().includes(s.toLowerCase()))) profile.urgency = 'low';
  else profile.urgency = 'medium';

  return profile;
}

function detectLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  return 'en';
}

function detectBusinessType(text) {
  const lower = text.toLowerCase();
  if (/restaurant|restaurant|餐|小吃|快餐|外卖|food truck/.test(lower)) return 'restaurant';
  if (/canteen|食堂|cafeteria|school|factory.*meal|团餐/.test(lower)) return 'canteen';
  if (/hotel|宾馆|banquet|宴席|婚礼/.test(lower)) return 'hotel';
  if (/central.?kitchen|中央厨房|food.?process|食品加工|factory/.test(lower)) return 'central_kitchen';
  if (/distribut|dealer|代理|经销商|reseller/.test(lower)) return 'distributor';
  if (/frying|油炸|chips|snack/.test(lower)) return 'snack';
  if (/noodle|面|rice|煲仔/.test(lower)) return 'specialty';
  return 'unknown';
}

function detectPurchaseIntent(messages) {
  const recent = messages.slice(-5);
  const inMsgs = recent.filter(m => m.direction === 'in' || m.direction === 'inbound').map(m => m.content);
  const text = inMsgs.join(' ').toLowerCase();

  if (/price|价格|how much|cost|quote|报价|quotation/.test(text)) return 'high';
  if (/order|下单|buy|purchase|ship|发货|delivery/.test(text)) return 'high';
  if (/interested|感兴趣|tell me more|详细|specification|参数/.test(text)) return 'medium';
  if (/hello|hi|你好|在吗/.test(text)) return 'low';
  return 'unknown';
}

function detectPriceSensitivity(text) {
  const lower = text.toLowerCase();
  if (/expensive|贵|too much|budget|预算|cheap|便宜/.test(lower)) return 'high';
  if (/discount|折扣|offer|优惠|best price|最低价/.test(lower)) return 'high';
  return 'medium';
}

function detectEngagementLevel(messages) {
  const recent = messages.slice(-10);
  if (recent.length < 2) return 'low';
  const inCount = recent.filter(m => m.direction === 'in' || m.direction === 'inbound').length;
  if (inCount >= 5) return 'high';
  if (inCount >= 3) return 'medium';
  return 'low';
}

function estimateStage(phone, recentMessages, customer = {}) {
  if (recentMessages.length === 0) return 'ice_breaking';

  const status = customer.status || 'new';
  const text = recentMessages.map(m => m.content).join(' ').toLowerCase();
  const outMsgs = recentMessages.filter(m => m.direction === 'out' || m.direction === 'outbound');
  const inMsgs = recentMessages.filter(m => m.direction === 'in' || m.direction === 'inbound');

  // 已成交 → 售后
  if (status === 'closed' || status === 'closed_won') return 'after_sales';

  // 流失 → 暂缓
  if (status === 'closed_lost' || status === 'on_hold') return 'after_sales';

  // 拿样阶段
  if (status === 'sampling') return 'closing';

  // 已报价但客户在犹豫 → 根据内容细分
  if (status === 'quoted') {
    const strongBuySignals = /什么时候发货|发货|起订量|moq|order|place order|付款|payment|怎么付/i;
    const priceObjection = /贵|太贵|便宜|discount|budget|expensive|affordable|能便宜|最低价/i;
    const competitorMention = /XX品牌|其他品牌|competitor|compare|brand|compared|对比|比过/i;
    const delaySignal = /考虑|想想|再看看|let me think|later|下次|下周|next week|商量|discuss/i;

    if (strongBuySignals.test(text)) return 'closing';
    if (priceObjection.test(text)) return 'objection_handling';
    if (competitorMention.test(text)) return 'objection_handling';
    if (delaySignal.test(text)) return 'closing'; // 给制造紧迫感的时机
    return 'closing';
  }

  // 谈判中
  if (status === 'negotiating') {
    if (/贵|太贵|便宜|discount|budget|expensive/i.test(text)) return 'objection_handling';
    return 'objection_handling';
  }

  // 询盘中 - 细分阶段
  if (status === 'inquiring' || status === 'new') {
    // 检查是否已有报价记录（跨消息检测）
    const hasQuoteSent = outMsgs.some(m => /报价|quotation|价格.*\d|USD.*\d|\$\d|¥\d|price.*\d/i.test(m.content));

    if (outMsgs.some(m => /推荐|型号|适合|这款|系列|建议.*这台|recommend/i.test(m.content))) {
      if (/价格|price|报价|quote|多少钱|how much|cost/i.test(text)) return 'quotation';
      if (hasQuoteSent) return 'objection_handling'; // 报价后客户继续聊 = 处理异议
      return 'product_recommendation';
    }
    if (hasQuoteSent) return 'objection_handling';
    return 'needs_discovery';
  }

  // 新客户 — 根据消息数量和内容判断
  if (recentMessages.length <= 2) {
    if (/价格|price|多少钱|how much|报价/i.test(text)) return 'needs_discovery'; // 直接问价也算有需求
    return 'ice_breaking';
  }
  if (/价格|price|多少钱|cost|报价/i.test(text)) return 'needs_discovery';
  return 'ice_breaking';
}

// 客户等级自动评估
function autoGradeCustomer(phone, customerId = null) {
  const cid = customerId || db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(phone)?.customer_id;
  if (!cid) return 'C';
  const messages = db.prepare('SELECT COUNT(*) as total, MIN(timestamp) as first_msg, MAX(timestamp) as last_msg FROM messages_v2 WHERE customer_id = ?').get(cid);
  if (!messages || messages.total < 2) return 'C';

  const daysDiff = Math.max(1, (new Date(messages.last_msg) - new Date(messages.first_msg)) / 86400000);
  const freq = messages.total / daysDiff;
  const intent = detectPurchaseIntent(getRecentMessages(phone, 5, cid));

  if (intent === 'high' && freq > 0.5) return 'A';
  if (intent === 'high' || freq > 0.3) return 'B';
  return 'C';
}

// ============================================================
// AI 对话总结（40条触发，保留最新20条）
// ============================================================
async function summarizeConversation(phone) {
  const cid = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(phone)?.customer_id;
  if (!cid) return null;

  const messages = db.prepare(
    'SELECT direction, content, timestamp as created_at FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp ASC'
  ).all(cid);

  if (messages.length <= 40) return null;

  const oldMessages = messages.slice(0, messages.length - 20);
  const summaryText = oldMessages.map(m =>
    `[${m.direction === 'in' || m.direction === 'inbound' ? '客户' : '貂貂'}] ${m.content}`
  ).join('\n');

  try {
    const cfg = getAIConfig('chat');
    const response = await axios.post(
      `${cfg.apiUrl}/v1/chat/completions`,
      {
        model: cfg.model,
        messages: [
          { role: 'system', content: '你是销售对话分析师。请简洁总结以下客户对话的关键信息，包括：1.客户需求和关注点 2.已推荐的产品 3.客户态度和购买意向 4.待解决问题。用中文，200字以内。' },
          { role: 'user', content: summaryText }
        ],
        max_tokens: 300,
        temperature: 0.3
      },
      {
        headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const summary = response.data.choices?.[0]?.message?.content?.trim() || '';
    if (summary) {
      const cutoffTime = oldMessages[oldMessages.length - 1].created_at;
      db.prepare(
        'INSERT INTO conversation_summaries (phone, summary, message_count, cutoff_time, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(phone, summary, oldMessages.length, cutoffTime, oldMessages[0].created_at, cutoffTime);
      db.prepare('DELETE FROM messages_v2 WHERE customer_id = ? AND timestamp <= ?').run(cid, cutoffTime);
      console.log(`📝 Conversation summarized for ${phone}: ${oldMessages.length} messages → summary`);
    }
    return summary;
  } catch (err) {
    console.error(`❌ Summarize error for ${phone}:`, err.message);
    return null;
  }
}

// 对话压缩（定期执行）+ 容量检查
function compressOldMessages() {
  console.log(`🧹 Running message compression (retention: ${CRM_RETENTION_DAYS} days)...`);

  // 检查总数据库容量
  const crmDbPath = path.join(DATA_DIR, 'crm.db');
  const convDbPath = path.join(DATA_DIR, 'conversations.db');
  let totalSizeMB = 0;
  for (const dbPath of [crmDbPath, convDbPath]) {
    if (fs.existsSync(dbPath)) {
      totalSizeMB += fs.statSync(dbPath).size / (1024 * 1024);
    }
  }
  console.log(`📊 CRM total DB size: ${totalSizeMB.toFixed(1)}MB / ${CRM_MAX_SIZE_MB}MB limit`);

  if (totalSizeMB > CRM_MAX_SIZE_MB) {
    console.log(`⚠️ CRM exceeds ${CRM_MAX_SIZE_MB}MB limit! Triggering aggressive cleanup...`);
    const aggressiveDays = Math.max(7, Math.floor(CRM_RETENTION_DAYS / 2));
    const customers = db.prepare('SELECT id, phone FROM customers_v2 WHERE updated_at < ?').all(sqlDaysAgo(aggressiveDays));
    for (const { id, phone } of customers) {
      const oldMsgs = db.prepare(
        `SELECT * FROM messages_v2 WHERE customer_id = ? AND timestamp < ? AND status != 'key_node' ORDER BY timestamp`
      ).all(id, sqlDaysAgo(aggressiveDays));
      if (oldMsgs.length > 5) {
        const summary = oldMsgs.map(m => `${m.direction === 'inbound' ? '客户' : '貂貂'}: ${m.content.slice(0, 100)}`).join('\n');
        db.prepare(
          `INSERT INTO conversation_summaries (phone, summary, period_start, period_end) VALUES (?, ?, ?, ?)`
        ).run(phone, summary.slice(0, 2000), oldMsgs[0].timestamp, oldMsgs[oldMsgs.length - 1].timestamp);
        for (let i = 0; i < oldMsgs.length; i += 50) {
          const batch = oldMsgs.slice(i, i + 50).map(m => m.id);
          if (batch.length > 0) {
            db.prepare(`DELETE FROM messages_v2 WHERE id IN (${batch.join(',')})`).run();
          }
        }
      }
    }
    db.prepare(`DELETE FROM conversation_summaries WHERE created_at < ?`).run(sqlDaysAgo(CRM_RETENTION_DAYS));
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log(`🧹 Aggressive cleanup done`);
  }

  // 常规压缩
  const customers = db.prepare('SELECT id, phone FROM customers_v2 WHERE updated_at < ?').all(sqlDaysAgo(CRM_RETENTION_DAYS));
  let compressed = 0;

  for (const { id, phone } of customers) {
    const oldMsgs = db.prepare(
      `SELECT * FROM messages_v2 WHERE customer_id = ? AND timestamp < ? AND status != 'key_node' ORDER BY timestamp`
    ).all(id, sqlDaysAgo(CRM_RETENTION_DAYS));

    if (oldMsgs.length > 10) {
      const summary = oldMsgs.map(m => `${m.direction === 'inbound' ? '客户' : '貂貂'}: ${m.content.slice(0, 100)}`).join('\n');
      db.prepare(
        `INSERT INTO conversation_summaries (phone, summary, period_start, period_end) VALUES (?, ?, ?, ?)`
      ).run(phone, summary.slice(0, 2000), oldMsgs[0].timestamp, oldMsgs[oldMsgs.length - 1].timestamp);
      for (let i = 0; i < oldMsgs.length; i += 50) {
        const batch = oldMsgs.slice(i, i + 50).map(m => m.id);
        if (batch.length > 0) {
          db.prepare(`DELETE FROM messages_v2 WHERE id IN (${batch.join(',')})`).run();
        }
      }
      compressed += oldMsgs.length;
    }
  }

  // 清理超期的对话摘要
  db.prepare(`DELETE FROM conversation_summaries WHERE created_at < ?`).run(sqlDaysAgo(CRM_RETENTION_DAYS));
  // WAL checkpoint
  db.pragma('wal_checkpoint(TRUNCATE)');

  console.log(`✅ Compressed ${compressed} messages from ${customers.length} customers (retention: ${CRM_RETENTION_DAYS}d)`);
}

// ============================================================
// AI 回复生成（集成 RAG + CRM + 画像）
// ============================================================

// 智能分条：模拟真人发消息习惯，长回复分多条发送
function splitReplyIntoMessages(reply) {
  // 短消息不拆分（< 200字符）
  if (reply.length <= 200) return [reply];

  // 按换行分割
  const lines = reply.split('\n').filter(l => l.trim());
  const messages = [];
  let current = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 如果加上这行超过200字符，先存当前消息
    if ((current + '\n' + trimmed).length > 200) {
      if (current) messages.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + '\n' + trimmed : trimmed;
    }
  }
  if (current.trim()) messages.push(current.trim());

  return messages;
}

const STAGE_PROMPTS = {
  ice_breaking: `
📌 当前阶段：破冰期
- 重点了解客户背景（行业、规模、场景），建立信任
- 不要急于推荐产品或报价
- 最多连续问2个问题，给客户回应空间
- 语气亲切，像朋友聊天
- 如果客户问价格，可以给一个范围，但不要详细报价`,
  needs_discovery: `
📌 当前阶段：需求挖掘
- 确认具体需求：什么产品、什么规格、什么场景
- 委婉了解预算范围和决策人
- 识别竞品信息（不贬低竞品，客观对比）
- 使用开放式问题
- 每轮最多问2个问题，避免审问感`,
  product_recommendation: `
📌 当前阶段：产品推荐
- 推荐1-3款最匹配产品（不多推）
- 每款讲清楚：核心优势 + 适用场景 + 与竞品差异
- 用客户听得懂的方式讲参数（不要堆技术术语）
- 问客户倾向哪个方向
- 如果客户不感兴趣，不要强推，回到了解需求`,
  quotation: `
📌 当前阶段：方案报价
- 给出明细报价（不只是一个总价）
- 突出价值：总价 + 节省的人工/电费/时间（算ROI）
- 主动提优惠（限时/套餐/赠品）
- 明确下一步行动（要样品？要报价？再考虑？）
- 报价格式清晰，每个项目单独列明`,
  objection_handling: `
📌 当前阶段：异议处理
- 先共情（"我理解您的顾虑"）
- 用数据/案例支撑解答
- 异议类型：太贵→算ROI、考虑→制造紧迫感、竞品→差异化对比、不好用→展示改进
- 最后推动："您看这样行不行？"
- 不要与客户争辩，保持专业和耐心`,
  closing: `
📌 当前阶段：逼单/促成交
- 制造紧迫感（库存、活动、运费截止）
- 降低决策门槛（先拿样、分期、退换保障）
- 给出明确时间节点
- 样品试用是最好的逼单方式
- 不要过度施压，保持友好`,
  after_sales: `
📌 当前阶段：售后跟进
- 发送使用指南/注意事项
- 推荐配套产品/耗材（老客户优惠）
- 维护关系，促进复购和转介绍
- 节日关怀
- 主动询问设备使用情况，及时发现潜在问题`
};

// 安全检测：识别可疑/诈骗消息
function isSuspiciousMessage(text) {
  const lower = text.toLowerCase();

  // 常见诈骗关键词
  const spamKeywords = [
    'free money', 'click here', 'claim prize', 'winner', 'congratulations',
    'urgent', 'act now', 'limited time offer', 'you have been selected',
    'verify your account', 'suspended', 'unusual activity', 'security alert',
    'update payment', 'bank', 'crypto', 'investment return', 'guaranteed profit',
    'transfer', 'wire', 'western union', 'gift card', 'bitcoin', 'USDT',
    'lottery', 'inheritance', 'nigerian', 'prince', '充值', '返利', '刷单',
    '兼职', '赚', '中奖', '免费领', '红包', '转账', '打款', '佣金',
    '投资理财', '内部消息', '稳赚', '日赚', '月入', '贷款', '借钱'
  ];

  // 检测短链接（常见钓鱼手段）
  const hasShortLink = /bit\.ly|tinyurl|t\.co|short\.link|cutt\.ly/i.test(text);

  // 检测过多大写字母（骗子常用手法）
  const upperRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  const hasExcessiveCaps = upperRatio > 0.5 && text.length > 10;

  // 检测连续相同字符
  const hasRepeating = /(.)\1{5,}/.test(text);

  return spamKeywords.some(k => lower.includes(k)) || hasShortLink || hasExcessiveCaps || hasRepeating;
}

// ============================================================
// 邮件发送服务
// ============================================================
async function sendEmail(accountId, to, subject, html, text = '', opts = {}) {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ? AND is_active = 1').get(accountId);
  if (!account) throw new Error('Email account not found: ' + accountId);

  // 检查退订
  if (db.prepare('SELECT 1 FROM unsubscribe_list WHERE email = ?').get(to)) {
    console.log(`📧 [Skip] ${to} is unsubscribed`);
    return { sent: false, reason: 'unsubscribed' };
  }

  // 检查每日发送限制
  const lastReset = account.last_reset || '';
  const today = new Date().toISOString().slice(0, 10);
  if (lastReset !== today) {
    db.prepare('UPDATE email_accounts SET daily_sent = 0, last_reset = ? WHERE id = ?').run(today, accountId);
  }
  const acc = db.prepare('SELECT daily_sent, daily_limit FROM email_accounts WHERE id = ?').get(accountId);
  if (acc.daily_sent >= acc.daily_limit) {
    throw new Error(`Daily limit reached (${acc.daily_sent}/${acc.daily_limit})`);
  }

  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    auth: { user: account.user, pass: decryptPassword(account.password_encrypted) }
  });

  const result = await transporter.sendMail({
    from: `"${account.from_name || 'YuKoLi'}" <${account.from_email || account.user}>`,
    to,
    subject,
    html,
    text,
    ...opts
  });

  // 更新计数
  db.prepare('UPDATE email_accounts SET daily_sent = daily_sent + 1 WHERE id = ?').run(accountId);
  console.log(`📧 Email sent to ${to}: ${subject} (messageId: ${result.messageId})`);
  return { sent: true, messageId: result.messageId };
}

// 测试邮件账户连接
async function testEmailConnection(accountId) {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(accountId);
  if (!account) throw new Error('Account not found');
  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    auth: { user: account.user, pass: decryptPassword(account.password_encrypted) }
  });
  await transporter.verify();
  return { success: true };
}

// ============================================================
// 模板渲染引擎
// ============================================================
function renderTemplate(templateHtml, variables) {
  const compiled = handlebars.compile(templateHtml);
  return compiled(variables);
}

// ============================================================
// Escalation（智能升级）引擎
// ============================================================
function checkEscalation(customerId, customerData, projectId = '') {
  if (!projectId && customerId) {
    try { projectId = db.prepare('SELECT project_id FROM customers_v2 WHERE id = ?').get(customerId)?.project_id || ''; } catch {}
  }
  const rules = [
    {
      type: 'negative_emotion',
      check: () => (customerData.sentiment_trend === 'declining'),
      severity: 'high',
      reason: '客户情绪持续下降'
    },
    {
      type: 'churn_risk',
      check: () => (['high', 'critical'].includes(customerData.churn_risk)),
      severity: 'high',
      reason: `流失风险: ${customerData.churn_risk}`
    },
    {
      type: 'complaint',
      check: () => {
        const lastMsg = db.prepare("SELECT message_type FROM messages_v2 WHERE customer_id = ? AND direction = 'inbound' ORDER BY timestamp DESC LIMIT 1").get(customerId);
        return lastMsg && lastMsg.message_type === 'complaint';
      },
      severity: 'critical',
      reason: '客户发起投诉'
    },
    {
      type: 'health_low',
      check: () => ((customerData.health_score || 0) < 25),
      severity: 'medium',
      reason: `健康度过低: ${customerData.health_score}`
    }
  ];

  for (const rule of rules) {
    if (rule.check()) {
      // 检查是否已有未处理的同类型事件（24小时内不重复）
      const existing = db.prepare(
        "SELECT id FROM escalation_events WHERE customer_id = ? AND event_type = ? AND status = 'open' AND created_at > datetime('now', '-24 hours')"
      ).get(customerId, rule.type);
      if (!existing) {
        db.prepare(
          'INSERT INTO escalation_events (customer_id, event_type, reason, severity, status, project_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(customerId, rule.type, rule.reason, rule.severity, 'open', projectId || '');
        console.log(`🚨 Escalation: ${rule.type} for ${customerId} (${rule.severity}) - ${rule.reason}`);
        projectLog(projectId || '', 'warn', 'escalation', `触发升级: ${rule.type}`, `客户${customerId} - ${rule.reason}`);
        return { escalated: true, type: rule.type, severity: rule.severity, reason: rule.reason };
      }
    }
  }
  return { escalated: false };
}

async function generateSalesReply(phone, userMessage, accountId = 'default', channel = 'whatsapp') {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`💬 New message from ${phone}: ${userMessage.slice(0, 100)}`);

  // 1. CRM: 获取/创建客户
  const { customerId, projectId } = getOrCreateCustomer(phone, accountId, channel);
  const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(customerId) || {};
  saveMessage(phone, 'in', userMessage, 0, '', '', customerId, accountId, channel, projectId);

  // 检查是否需要总结（每40条触发一次）
  const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages_v2 WHERE customer_id = ?').get(customerId).count;
  if (msgCount > 40) {
    await summarizeConversation(phone);
  } else if (msgCount > 20) {
    const recentMsgs = db.prepare(
      'SELECT direction, content, timestamp as created_at FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp ASC LIMIT ?'
    ).all(customerId, msgCount - 20);

    const prof = JSON.parse(customer.profile || '{}');
    const summary = `阶段: ${prof.estimatedStage || '未知'} | 类型: ${prof.businessType || '未知'} | 意向: ${prof.purchaseIntent || '未知'} | 要点: ${recentMsgs.filter(m=>m.direction==='inbound').map(m=>m.content.slice(0,50)).join('; ')}`;

    const cutoffTime = recentMsgs[recentMsgs.length - 1].created_at;
    db.prepare(
      'INSERT INTO conversation_summaries (phone, summary, message_count, cutoff_time, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(phone, summary, recentMsgs.length, cutoffTime, sqlNow());
    db.prepare('DELETE FROM messages_v2 WHERE customer_id = ? AND timestamp <= ?').run(customerId, cutoffTime);
    console.log(`📝 Light summary for ${phone}: ${recentMsgs.length} messages compacted`);
  }

  // 2. 获取对话历史
  const recentMessages = getRecentMessages(phone, 20, customerId);
  const conversationHistory = getConversationHistory(phone, 1500, customerId);

  // 3. 客户画像识别
  const profile = identifyCustomerProfile(phone, recentMessages, customer);
  console.log(`📊 Profile: stage=${profile.estimatedStage}, type=${profile.businessType}, intent=${profile.purchaseIntent}, lang=${profile.language}`);

  const currentStage = profile.estimatedStage;
  const stagePrompt = STAGE_PROMPTS[currentStage] || '';

  // 4. 更新客户信息
  const grade = autoGradeCustomer(phone, customerId);
  const oldProfile = JSON.parse(customer.profile || '{}');
  const mergedProfile = { ...oldProfile };
  for (const [key, val] of Object.entries(profile)) {
    if (val && val !== 'unknown' && val !== 'none' && val !== '') {
      if (key === 'estimatedStage') {
        mergedProfile[key] = val;
      } else if (!mergedProfile[key] || mergedProfile[key] === 'unknown') {
        mergedProfile[key] = val;
      }
    }
  }
  // 写入 customers_v2
  if (customerId) {
    const customerV2 = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(customerId) || {};
    const healthResult = calculateHealthScore({ ...customerV2, response_rate: customerV2.response_rate || 0, last_inbound_at: customerV2.last_inbound_at, status: profile.estimatedStage, message_count: customerV2.message_count || 0, profile: JSON.stringify(mergedProfile) });
    updateCustomerV2(customerId, {
      status: profile.estimatedStage,
      language: profile.language,
      business_type: profile.businessType,
      purchase_intent: profile.purchaseIntent,
      profile: JSON.stringify(mergedProfile),
      health_score: healthResult.score,
      churn_risk: healthResult.churnRisk
    });
  }

  // 5. RAG 检索相关知识（短消息跳过，省 ~1s embedding + 检索）
  let context = [];
  const shortMsgThreshold = 10;
  if (userMessage.trim().length > shortMsgThreshold) {
    context = await retrieveContext(userMessage, TOP_K, customerId, { stage: profile.estimatedStage, businessType: profile.businessType, projectId: getAccountProject(accountId) });
  } else {
    console.log(`⚡ Short message (${userMessage.trim().length} chars), skipping RAG`);
  }
  console.log(`📚 RAG: ${context.length} chunks (${Date.now() - startTime}ms)`);

  // 6. 构建完整的 prompt
  let contextBlock = '';
  if (context.length > 0) {
    contextBlock = '\n\n## 参考知识（仅作为回复参考，不要直接照搬）\n' +
      context.slice(0, 3).map((c, i) => `[${i + 1}] (${c.category}) ${c.text.slice(0, 400)}`).join('\n\n');
  }

  const historyBlock = conversationHistory
    ? `\n\n## 最近的对话记录\n${conversationHistory}`
    : '';

  const profileBlock = `\n\n## 当前客户信息\n` +
    `- 销售阶段: ${profile.estimatedStage}\n` +
    `- 客户等级: ${grade}\n` +
    `- 业务类型: ${profile.businessType}\n` +
    `- 购买意向: ${profile.purchaseIntent}\n` +
    `- 价格敏感: ${profile.priceSensitivity}\n` +
    `- 购买信号: ${profile.buyingSignal}\n` +
    `- 情绪状态: ${profile.dominantEmotion}\n` +
    `- 紧迫度: ${profile.urgency || 'medium'}\n` +
    `- 对话轮次: ${recentMessages.length}\n` +
    (profile.competitors && profile.competitors.length > 0 ? `- 已知竞品: ${profile.competitors.join(', ')}\n` : '') +
    (customer.notes ? `- 备注: ${customer.notes}\n` : '');

  let intervenePrompt = '';
  if (isInterveneMode(customerId)) {
    intervenePrompt = '\n\n⚠️ 人工已介入此对话。AI 只做辅助参考，不要主动推销，回复要谨慎简短。';
  }

  // 特殊场景检测
  let specialScenarioPrompt = '';
  const userMsgLower = userMessage.toLowerCase();
  if (/你是机器人|你是ai|你是bot|are you (a )?bot|are you (a )?robot|are you (a )?human|are you real|人工|robot/i.test(userMsgLower)) {
    specialScenarioPrompt = '\n\n⚠️ 特殊场景：客户询问你是否是AI/机器人。\n请自然否认，表明自己是真人销售助理。示例："哈哈不是的老板，我是YuKoLi的销售经理貂貂，专门负责对接您的~"';
  } else if (/投诉|complain|糟糕|terrible|烂|骗子|fraud|scam|退款|refund|broken|坏了|worst|garbage|垃圾/i.test(userMsgLower)) {
    specialScenarioPrompt = '\n\n⚠️ 特殊场景：客户可能是在投诉或表达强烈不满。\n请先安抚情绪，表达歉意，了解具体问题，然后提供解决方案或升级处理。不要急于辩解。';
  } else if (/谢谢|thanks|thank you|bye|goodbye|拜拜|再见|好的|ok|👌|👍|😊|❤️/i.test(userMsgLower) && userMessage.trim().split(/\s+/).length <= 5) {
    // 短消息纯社交 — 不特别处理，让AI自然回复
  } else if (userMessage.trim().split(/\s+/).length <= 3 && !/price|价格|报价|多少钱|how much|order|下单|发货/i.test(userMsgLower)) {
    specialScenarioPrompt = '\n\n⚠️ 特殊场景：客户发的是简短消息（可能是闲聊或测试）。\n请简短自然回应，然后巧妙引导回业务话题。不要长篇大论。';
  }

  const userPrompt = `${historyBlock}${profileBlock}${contextBlock}${stagePrompt}${intervenePrompt}${specialScenarioPrompt}\n\n## 客户最新消息\n${userMessage}\n\n请按照以下格式回复：\n[思考] 分析客户意图和最佳策略\n[判断] 客户画像和痛点（如果从对话中识别到新信息，请用 JSON 格式追加）：\n  {"industry":"餐饮","scale":"50人食堂","painPoints":["价格"],"competitors":["XX品牌"],"urgency":"一般","budget":"5000-8000","decisionMaker":"老板本人"}\n  如果没有新信息就写"无新信息"\n[行动] 本次回复目标\n[回复] 你的回复内容（这是唯一会发给客户的部分）

注意：必须生成 [回复] 内容。即使客户只是简单问候（如"Hi"、"Thank you"），也要给出自然、有针对性的回复，不能返回空内容。

⚠️ 重要提醒：你的回复必须包含完整的 [思考][判断][行动][回复] 四个标签。缺少任何一个将导致回复被拒绝。

[质量自评] 请对本次回复进行自我评分（JSON格式）：
{"relevance":X,"professionalism":X,"warmth":X,"pushiness":X,"length_score":X,"overall":X}
（每项0-10，pushiness中1=无推销感，10=强推销感）`;

  // 7. 调用 AI（流式）
  try {
    // 🔀 智能模型路由：根据复杂度/阶段/手动配置选择模型
    const cfg = await getRoutedAIConfig('chat', phone, userMessage, profile, accountId);
    console.log(`🔀 Model routing: ${cfg.routingInfo} → model=${cfg.model} tier=${cfg.tier} mode=${cfg.mode}`);
    let aiRaw = '';
    let needEmptyRetry = false;

    // AI 调用日志上下文（传递给 callAIWithFallback）
    const callLogCtx = {
      project_id: getAccountProject(accountId),
      customer_id: customerId,
      phone,
      tier: cfg.tier,
      route_reason: cfg.routingInfo,
      customer_stage: currentStage,
      complexity: cfg.tier,
    };

    // 多语言增强：根据客户语言调整 AI 回复
    // 支持项目级 AI 人设：从项目配置中读取 ai_persona
    const projId = getAccountProject(accountId);
    let systemPrompt = SALES_SYSTEM_PROMPT;
    if (projId && projId !== 'default') {
      try {
        const project = db.prepare('SELECT ai_persona FROM projects WHERE id = ?').get(projId);
        if (project && project.ai_persona) {
          const persona = JSON.parse(project.ai_persona);
          if (persona.name || persona.company) {
            systemPrompt = `你是"${persona.name || '貂貂'}"，${persona.company || '佛山跃迁力科技（YuKoLi）'}的资深销售经理，5年B端商用厨房自动化设备销售经验。`;
            if (persona.tone) systemPrompt += `\n语气风格：${persona.tone}`;
            if (persona.greeting) systemPrompt += `\n默认问候语：${persona.greeting}`;
          }
        }
      } catch(e) { console.error('[Persona] failed to load project persona:', e.message); }
    }
    const detectedLang = profile.language || 'zh';
    if (detectedLang !== 'zh') {
      systemPrompt += `\n\n### 语言要求\n客户使用 ${detectedLang === 'en' ? '英语' : detectedLang} 沟通。你必须使用${detectedLang === 'en' ? '英语' : detectedLang}回复，包括所有产品信息和技术参数。保持专业商务语气。`;
    }

    // 构建消息数组
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...formatHistoryMessages(conversationHistory),
      { role: 'user', content: userPrompt }
    ];

    // 使用带兜底的 AI 调用
    const llmResult = await callAIWithFallback(cfg, llmMessages, {
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 30000,
      _callLogContext: callLogCtx,
    });

    if (llmResult) {
      aiRaw = llmResult.content;
      console.log(`✅ AI response from model=${llmResult.model} (attempts=${llmResult.attempts}, tier=${llmResult.tier})`);
    } else {
      console.log(`⚠️ All fallback attempts failed for ${phone}`);
      needEmptyRetry = true;
    }

    // 空回复自动重试一次（仅当 callAIWithFallback 成功但返回空内容时）
    if (!aiRaw && !needEmptyRetry) {
      console.log(`⚠️ AI empty reply detected for ${phone}, will retry once...`);
      needEmptyRetry = true;
    }

    if (needEmptyRetry && aiRaw === '') {
      console.log(`🔄 Retrying AI call for ${phone} (empty or failed)`);
      const retryResult = await callAIWithFallback(
        { ...cfg, fallbackChain: [] },  // 重试时不走兜底链
        [
          { role: 'system', content: systemPrompt },
          ...formatHistoryMessages(conversationHistory),
          { role: 'user', content: userPrompt + '\n\n请务必生成完整的回复内容，包含 [回复] 标签。' }
        ],
        { maxTokens: 1024, temperature: 0.8, timeout: 30000, _callLogContext: callLogCtx }
      );
      if (retryResult) {
        aiRaw = retryResult.content;
        console.log(`✅ Retry successful for ${phone} (model=${retryResult.model})`);
      } else {
        console.log(`❌ Retry also failed for ${phone}`);
      }
    }

    console.log(`🤖 AI raw (${Date.now() - startTime}ms):`, aiRaw);

    // 8. 解析并提取回复
    const parsed = parseAIReply(aiRaw, profile);

    // 8.5 增量提取客户画像
    const profileUpdate = extractProfileFromJudgment(aiRaw);
    if (profileUpdate) {
      try {
        const existingProfile = JSON.parse(db.prepare('SELECT profile FROM customers_v2 WHERE id = ?').get(customerId)?.profile || '{}');
        const merged = { ...existingProfile, ...profileUpdate };
        // 合并数组字段
        if (profileUpdate.painPoints && existingProfile.painPoints) {
          merged.painPoints = [...new Set([...existingProfile.painPoints, ...profileUpdate.painPoints])];
        }
        if (profileUpdate.competitors && existingProfile.competitors) {
          merged.competitors = [...new Set([...existingProfile.competitors, ...profileUpdate.competitors])];
        }
        updateCustomerV2(customerId, { profile: JSON.stringify(merged) });
        console.log(`📝 Profile updated for ${phone}:`, JSON.stringify(profileUpdate));
      } catch (e) {
        console.log(`⚠️ Profile merge error:`, e.message);
      }
    }

    // 9. 回复质量控制
    const finalReply = qualityCheck(parsed.reply, profile);

    // 10. 保存回复到 CRM
    const ragSources = context.map(c => `[${c.category}] ${c.text.slice(0, 100)}`).join('\n');
    saveMessage(phone, 'out', finalReply, isKeyNode(profile, userMessage), parsed.thought, ragSources, customerId, accountId, channel);

    // === 增强功能：消息分类 + 情绪分析 + 质量自评 ===

    // 自动分类消息类型
    let msgType = 'other';
    const lowerMsg = userMessage.toLowerCase();
    if (/price|价格|how much|cost|报价|quote|quotation|多少钱|费用/i.test(lowerMsg)) msgType = 'inquiry';
    else if (/complaint|投诉|问题|坏了|broken|not work|fault|退款|refund/i.test(lowerMsg)) msgType = 'complaint';
    else if (/thank|感谢|thanks|thx|ok好|great|perfect/i.test(lowerMsg)) msgType = 'thankyou';
    else if (/competitor|竞品|其他品牌|other brand|compare|对比/i.test(lowerMsg)) msgType = 'competitor';
    else if (/discount|便宜|优惠|折扣|budget|预算/i.test(lowerMsg)) msgType = 'negotiation';
    else if (/support|售后|install|安装|use|使用|how to|怎么用/i.test(lowerMsg)) msgType = 'support';

    // 从 AI 的 [判断] 标签中提取情绪
    let sentiment = 'neutral';
    let sentimentScore = 0;
    const judgeMatch = aiRaw.match(/\[判断\]([\s\S]*?)(?=\[行动\]|\[回复\]|$)/);
    if (judgeMatch) {
      const judgeText = judgeMatch[1];
      const emotionMatch = judgeText.match(/"emotion"\s*:\s*"(\w+)"/);
      if (emotionMatch) sentiment = emotionMatch[1];
      if (sentiment === 'positive') sentimentScore = 0.8;
      else if (sentiment === 'neutral') sentimentScore = 0.5;
      else if (sentiment === 'negative') sentimentScore = 0.2;
      else if (sentiment === 'angry') sentimentScore = 0;
    }

    // 提取 AI 质量自评
    let qualityScore = null;
    const qualityMatch = aiRaw.match(/\[质量自评\]([\s\S]*?)(?:\[|$)/);
    if (qualityMatch) {
      try {
        qualityScore = JSON.parse(qualityMatch[1].replace(/[\n\r]/g, '').trim());
      } catch(e) {}
    }

    // 写入增强字段到 messages_v2
    if (customerId) {
      try {
        // 找到刚写入的 inbound message 记录并更新
        const lastInMsg = db.prepare("SELECT id FROM messages_v2 WHERE customer_id = ? AND direction = 'inbound' ORDER BY timestamp DESC LIMIT 1").get(customerId);
        if (lastInMsg) {
          db.prepare("UPDATE messages_v2 SET sentiment = ?, sentiment_score = ?, message_type = ? WHERE id = ?")
            .run(sentiment, sentimentScore, msgType, lastInMsg.id);
        }
        // 更新 outbound message 的质量分
        const lastOutMsg = db.prepare("SELECT id FROM messages_v2 WHERE customer_id = ? AND direction = 'outbound' ORDER BY timestamp DESC LIMIT 1").get(customerId);
        if (lastOutMsg && qualityScore) {
          db.prepare("UPDATE messages_v2 SET ai_quality_score = ? WHERE id = ?")
            .run(JSON.stringify(qualityScore), lastOutMsg.id);
        }
        // 更新客户字段
        updateCustomerV2(customerId, {
          last_message_type: msgType,
          preferred_language: profile.language || 'zh'
        });
      } catch(e) { console.error('[Enhance] update message fields failed:', e); }
    }

    // Escalation 检查
    try {
      const custForEsc = db.prepare('SELECT sentiment_trend, churn_risk, health_score FROM customers_v2 WHERE id = ?').get(customerId);
      if (custForEsc) {
        const escResult = checkEscalation(customerId, custForEsc);
        if (escResult.escalated) {
          console.log(`🚨 Escalation triggered: ${escResult.type} (${escResult.severity})`);
        }
      }
    } catch(e) { console.error('[Escalation] check failed:', e); }

    console.log(`📤 Final reply: ${finalReply.slice(0, 100)}`);
    console.log(`⏱️ Total time: ${Date.now() - startTime}ms`);
    projectLog(projectId || '', 'info', 'ai_reply', `AI回复已发送`, `${phone} - 耗时${Date.now() - startTime}ms`);
    console.log(`${'='.repeat(50)}\n`);

    // 更新最近一条 AI 调用日志的汇总字段
    try {
      const totalTime = Date.now() - startTime;
      const overallQuality = qualityScore?.overall || null;
      const aiQualityStr = qualityScore ? JSON.stringify(qualityScore) : null;
      db.prepare(`UPDATE ai_call_logs SET total_time_ms = ?, quality_score = ?, ai_quality_score = ?, customer_stage = ?, complexity = ? WHERE id = (SELECT id FROM ai_call_logs WHERE phone = ? ORDER BY id DESC LIMIT 1)`)
        .run(totalTime, overallQuality, aiQualityStr, currentStage, callLogCtx.complexity, phone);
    } catch(e) { console.warn('[AICallLog] final update failed:', e.message); }

    return { reply: finalReply, thought: parsed.thought || '', ragSources };
  } catch (error) {
    console.error('❌ AI Error:', error.response?.data || error.message);
    const fallback = generateSimpleReply(userMessage, profile.language);
    saveMessage(phone, 'out', fallback, 0, '', '', customerId, accountId, channel);

    // 5分钟后自动重试
    console.log(`⏳ Will retry in 5 minutes for ${phone}`);
    setTimeout(async () => {
      try {
        console.log(`🔄 Retrying reply for ${phone}...`);
        const retryReply = await generateSalesReply(phone, `[系统提示：上一条回复生成失败，客户消息是：${userMessage}。请正常回复客户。]`);
        saveMessage(phone, 'out', retryReply);
        console.log(`✅ Retry successful for ${phone}`);
      } catch (retryError) {
        console.error(`❌ Retry failed for ${phone}:`, retryError.message);
      }
    }, 5 * 60 * 1000);

    return { reply: fallback, thought: '', ragSources: '' };
  }
}

// 解析 AI 回复：分离内心独白和实际回复
function parseAIReply(raw, profile = {}) {
  let thought = '';
  let reply = raw;

  // 尝试提取 [思考] [判断] [行动] 部分
  const thoughtMatch = raw.match(/\[思考\]([^\[]*)/);
  const judgeMatch = raw.match(/\[判断\]([^\[]*)/);
  const actionMatch = raw.match(/\[行动\]([^\[]*)/);

  if (thoughtMatch) thought += thoughtMatch[1].trim();
  if (judgeMatch) thought += ' ' + judgeMatch[1].trim();
  if (actionMatch) thought += ' ' + actionMatch[1].trim();

  // 提取 [回复] 部分
  const replyMatch = raw.match(/\[回复\]([\s\S]*?)(?:\[质量自评\]|$)/);
  if (replyMatch) {
    reply = replyMatch[1].trim();
  } else {
    // 兜底：去掉所有 [标签]... 内容，保留剩余文本
    reply = raw
      .replace(/\[思考\][^\[]*/g, '')
      .replace(/\[判断\][^\[]*/g, '')
      .replace(/\[行动\][^\[]*/g, '')
      .replace(/\[回复\]\s*/g, '')
      .replace(/\[内心独白\][^\[]*/g, '')
      .replace(/\[挽留\]\s*/g, '')
      .replace(/\[质量自评\][\s\S]*/g, '')
      .trim();
  }

  // 去除 <think...</think 标签（某些模型会生成）
  reply = reply.replace(/<think[\s\S]*?<\/think>/g, '').trim();

  if (!reply) reply = profile?.language === 'en' ? 'Hello! How can I help you?' : '您好！请问有什么可以帮到您？';

  return { thought: thought.trim(), reply };
}

// 从 AI 回复的 [判断] 部分提取结构化客户画像信息
function extractProfileFromJudgment(aiRaw) {
  const judgeMatch = aiRaw.match(/\[判断\]([\s\S]*?)(?=\[行动\]|\[回复\]|$)/);
  if (!judgeMatch) return null;

  const judgeText = judgeMatch[1];
  // 尝试提取 JSON
  const jsonMatch = judgeText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // 只保留有效字段
    const validFields = {};
    if (parsed.industry) validFields.industry = parsed.industry;
    if (parsed.scale) validFields.scale = parsed.scale;
    if (parsed.painPoints && Array.isArray(parsed.painPoints)) validFields.painPoints = parsed.painPoints;
    if (parsed.competitors && Array.isArray(parsed.competitors)) validFields.competitors = parsed.competitors;
    if (parsed.urgency) validFields.urgency = parsed.urgency;
    return Object.keys(validFields).length > 0 ? validFields : null;
  } catch (e) {
    return null;
  }
}

// 回复质量控制
function qualityCheck(reply, profile) {
  let checked = reply;

  // 1. 语言匹配检查（简单）
  if (profile.language === 'en' && /[\u4e00-\u9fff]/.test(checked.slice(0, 50))) {
    console.log('⚠️ Quality: language mismatch detected (CN in EN session)');
  }

  // 2. 检查是否有不该出现的内容
  if (/\[思考\]|\[判断\]|\[行动\]|\[内心独白\]/.test(checked)) {
    checked = checked.replace(/\[思考\][^\[]*/g, '')
      .replace(/\[判断\][^\[]*/g, '')
      .replace(/\[行动\][^\[]*/g, '')
      .replace(/\[内心独白\][^\[]*/g, '')
      .trim();
    console.log('⚠️ Quality: stripped leaked internal tags');
  }

  // 4. 防幻觉：检查是否出现了不存在的型号引用
  // (简化版：这里可以做更严格的产品名匹配)

  // 5. 表情符号检查
  const emojiCount = (checked.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 5) {
    console.log('⚠️ Quality: too many emojis');
  }

  return checked;
}

// 判断是否为关键节点
function isKeyNode(profile, message) {
  const text = message.toLowerCase();
  if (/价格|price|报价|quote|下单|order|确认|confirm|样品|sample/.test(text)) return 1;
  return 0;
}

function formatHistoryMessages(historyText) {
  if (!historyText) return [];
  const messages = [];
  const lines = historyText.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.startsWith('客户:')) {
      const text = line.replace(/^客户:\s*/, '');
      messages.push({ role: 'user', content: text.trim() });
    } else if (line.startsWith('貂貂:')) {
      const text = line.replace(/^貂貂:\s*/, '');
      messages.push({ role: 'assistant', content: text.trim() });
    }
  }
  return messages.slice(-20);
}

// 简单回复 (AI 失败时的备用)
function generateSimpleReply(text, lang = 'zh') {
  const lowerText = text.toLowerCase();
  const isEn = lang === 'en' || (!/[\u4e00-\u9fff]/.test(text) && /[a-zA-Z]/.test(text));

  if (lowerText.includes('你好') || lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('在吗')) {
    return isEn ? "Hello! I'm the YuKoLi sales manager 🦊 How can I help you today?" : '您好！我是 YuKoLi 销售经理貂貂 🦊 有什么可以帮到您？';
  }
  if (lowerText.includes('谢谢') || lowerText.includes('感谢') || lowerText.includes('thank')) {
    return isEn ? "You're welcome! 😊 Feel free to ask anything else." : '不客气！😊 很高兴为您服务～';
  }
  if (lowerText.includes('bye') || lowerText.includes('再见')) {
    return isEn ? "Goodbye! 👋 Don't hesitate to reach out anytime." : '再见！👋 有需要随时找我哦～';
  }
  return isEn ? "Got your message! Let me get back to you shortly with details." : '收到您的消息～稍后给您详细回复！';
}

// ============================================================
// 流式分句发送
// ============================================================

/**
 * 按完整句子切割文本（中英文标点）
 */
function splitBySentences(text) {
  const sentences = [];
  // 匹配中英文句末标点：句号、问号、感叹号、省略号、分号
  const regex = /[^。！？.!?\n]+[。！？.!?\n]?/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const s = match[0].trim();
    if (s) sentences.push(s);
  }
  // 如果最后一段没有句末标点，也加上
  const lastMatch = text.match(/[^。！？.!?\n]*$/);
  if (lastMatch && lastMatch[0].trim()) {
    const last = lastMatch[0].trim();
    if (!sentences.includes(last) && last.length > 0) {
      sentences.push(last);
    }
  }
  return sentences;
}

/**
 * 延迟指定毫秒
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 流式调用 LLM 并分句发送
 * 返回完整的 aiRaw 用于后续解析
 */
async function streamAndSendMessages(phone, streamConfig, adapter, accountId, channel, sendInterval = 1500) {
  const { cfg, systemPrompt, conversationHistory, userPrompt } = streamConfig;
  const messages = [
    { role: 'system', content: systemPrompt },
    ...formatHistoryMessages(conversationHistory),
    { role: 'user', content: userPrompt }
  ];

  // 1. 流式调用 LLM
  let aiRaw = '';
  let replyStarted = false;
  let replyBuffer = '';
  const sentParts = [];

  try {
    const response = await axios.post(
      `${cfg.apiUrl}/v1/chat/completions`,
      {
        model: cfg.model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        responseType: 'stream'
      }
    );

    // 2. 逐 chunk 读取，找到 [回复] 后开始缓冲
    for await (const chunk of response.data) {
      const text = chunk.data?.choices?.[0]?.delta?.content || '';
      if (!text) continue;

      aiRaw += text;

      // 还没到 [回复] 部分，只收集不发送
      if (!replyStarted) {
        if (aiRaw.includes('[回复]')) {
          replyStarted = true;
          replyBuffer = '';
          // 提取 [回复] 之后的内容
          const replyStart = aiRaw.lastIndexOf('[回复]');
          replyBuffer = aiRaw.slice(replyStart + 4);
          aiRaw = aiRaw; // 保留完整 aiRaw
        }
        continue;
      }

      replyBuffer += text;

      // 3. 检查 buffer 中是否有完整句子
      const sentences = splitBySentences(replyBuffer);
      if (sentences.length >= 2) {
        // 发送除最后一句之外的所有句子（最后一句可能不完整）
        const toSend = sentences.slice(0, -1);
        const sendText = toSend.join('');
        replyBuffer = sentences[sentences.length - 1];

        try {
          await adapter.sendMessage(phone, sendText);
          sentParts.push(sendText);
          console.log(`📡 Streamed part: "${sendText.slice(0, 50)}..."`);
          if (sentParts.length > 0) await delay(sendInterval); // 消息间间隔
        } catch (sendErr) {
          console.error(`⚠️ Stream send failed:`, sendErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Stream error:', err.message);
    // 如果流式失败，aiRaw 可能为空，返回空让调用者做兜底
  }

  // 4. 发送剩余的 buffer
  if (replyBuffer.trim()) {
    try {
      // 去掉可能的 [质量自评] 部分
      let remaining = replyBuffer.replace(/\[质量自评\][\s\S]*/g, '').trim();
      if (remaining) {
        await adapter.sendMessage(phone, remaining);
        sentParts.push(remaining);
        console.log(`📡 Streamed final: "${remaining.slice(0, 50)}..."`);
      }
    } catch (sendErr) {
      console.error(`⚠️ Stream final send failed:`, sendErr.message);
    }
  }

  // 补充：如果流式中 aiRaw 还是空的（完全没有收到数据），返回空
  return { aiRaw, sentParts };
}

// ============================================================
// WhatsApp 消息发送（通过适配器）
// ============================================================

async function sendMessage(to, text) {
  if (!activeAdapter) {
    console.log('⚠️ No active adapter, skipping send');
    return;
  }
  try {
    await activeAdapter.sendMessage(to, text);
  } catch (error) {
    console.error('❌ Send failed:', error.response?.data || error.message);
  }
}

// ============================================================
// Webhook 路由
// ============================================================

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Helper: check if customer has intervene mode enabled
function isInterveneMode(customerId) {
  const c = db.prepare('SELECT intervene_mode FROM customers_v2 WHERE id = ?').get(customerId);
  return c && c.intervene_mode === 1;
}

// Helper: process reply with intervene support
async function processReplyWithIntervene(phone, content, accountId, channel, adapter) {
  const { customerId, projectId } = getOrCreateCustomer(phone, accountId, channel);

  // Mark inbound message as processing
  const inboundMsgs = db.prepare("SELECT id FROM messages_v2 WHERE customer_id = ? AND direction = 'inbound' AND content = ? ORDER BY timestamp DESC LIMIT 1").all(customerId, content);
  if (inboundMsgs.length > 0) {
    updateMessageStatus(inboundMsgs[0].id, 'processing');
  }

  const result = await generateSalesReply(phone, content, accountId, channel);
  const parts = splitReplyIntoMessages(result.reply);

  // Check intervene mode
  if (isInterveneMode(customerId)) {
    // Save as pending instead of sending
    for (const part of parts) {
      const msgId = 'pending_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      db.prepare('INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, thought, rag_sources, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(msgId, customerId, accountId, channel, 'outbound', part, sqlNow(), 'pending', result.thought, result.ragSources || '[]', projectId || '');
    }
    // Mark inbound as replied (pending review)
    if (inboundMsgs.length > 0) {
      updateMessageStatus(inboundMsgs[0].id, 'replied');
    }
    console.log(`🖐️ Intervene mode: reply saved as pending for ${phone}`);
    projectLog(projectId || '', 'info', 'intervene', `回复待审核`, `${phone}`);
  } else {
    // CRM: 更新统计 + 时间线
    try {
      db.prepare('UPDATE customers_v2 SET our_reply_count = our_reply_count + 1, response_rate = CAST(our_reply_count + 1 AS REAL) / message_count, updated_at = ? WHERE id = ?')
        .run(sqlNow(), customerId);
      if (!db.prepare('SELECT first_reply_at FROM customers_v2 WHERE id = ?').get(customerId).first_reply_at) {
        db.prepare('UPDATE customers_v2 SET first_reply_at = ? WHERE id = ?').run(sqlNow(), customerId);
      }
      db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data) VALUES (?, ?, ?)')
        .run(customerId, 'message_sent', JSON.stringify({ content: result.reply.slice(0, 200) }));
    } catch(e) { console.error('[Timeline] message_sent event failed:', e); }
    // Try to send each part (skip if already sent via streaming)
    if (!result.alreadySent) {
      let allSent = true;
      for (let i = 0; i < parts.length; i++) {
        try {
          await throttledSend(adapter, phone, parts[i]);
          if (i < parts.length - 1) await new Promise(r => setTimeout(r, 1500));
        } catch (sendErr) {
          console.error(`❌ Send failed for part ${i}:`, sendErr.message);
          allSent = false;
          // Enqueue failed part for retry
          const failMsgId = 'fail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          db.prepare('INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, thought, rag_sources, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(failMsgId, customerId, accountId, channel, 'outbound', parts[i], sqlNow(), 'failed', result.thought, result.ragSources || '[]', projectId || '');
          enqueueRetry(failMsgId, customerId, accountId, channel, parts[i]);
        }
      }
      // Update inbound status
      if (inboundMsgs.length > 0) {
        updateMessageStatus(inboundMsgs[0].id, allSent ? 'replied' : 'failed');
      }
    } else {
      console.log(`⚡ Reply already streamed to ${phone}, skipping duplicate send`);
      if (inboundMsgs.length > 0) {
        updateMessageStatus(inboundMsgs[0].id, 'replied');
      }
    }
  }
  return result;
}

// Webhook 验证 (Meta/Kapso，通过适配器)
app.get('/webhook', async (req, res) => {
  if (activeAdapter) {
    await activeAdapter.verifyWebhook(req, res);
  } else {
    res.sendStatus(403);
  }
});

// Webhook 请求日志中间件
app.use('/webhook', (req, res, next) => {
  console.log(`🌐 ${req.method} /webhook - X-Webhook-Event: ${req.headers['x-webhook-event'] || 'none'}`);
  next();
});

// 接收 Webhook 消息（通过适配器解析）
app.post('/webhook', async (req, res) => {
  try {
    if (!activeAdapter) {
      return res.status(500).send('No active adapter');
    }

    const messages = await activeAdapter.handleWebhook(req, res);
    // 注意：handleWebhook 已经发送了 res，这里只处理解析后的消息

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        // 安全过滤：检测诈骗/钓鱼链接和验证码
        const msgText = msg.content;
        const isSpam = isSuspiciousMessage(msgText);
        const hasVerificationCode = /\b\d{4,8}\b/.test(msgText) && /(code|码|verify|验证|OTP|PIN|password|密码)/i.test(msgText);
        const hasLink = /https?:\/\//i.test(msgText);
        const hasQRRequest = /(QR|二维码|scan|扫一扫)/i.test(msgText);

        // 记录可疑消息但不回复，防止AI被利用
        if (isSpam || hasVerificationCode || hasLink || hasQRRequest) {
          console.log(`🚨 Suspicious message from ${msg.contactId}: ${msgText.slice(0, 100)}`);
          console.log(`   Flags: spam=${isSpam} code=${hasVerificationCode} link=${hasLink} qr=${hasQRRequest}`);
          saveMessage(msg.contactId, 'in', msgText);
          continue;
        }

        if (msg.type === 'text' && msg.content) {
          console.log(`📩 New message from ${msg.contactId}: ${msg.content.substring(0, 50)}`);
          await throttledAIProcess(msg.contactId, msg.content, 'default', 'whatsapp', activeAdapter);
        }
      }
    }
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    if (!res.headersSent) res.status(500).send('Error');
  }
});

// ============================================================
// Meta Cloud API Webhook 端点
// ============================================================

// GET /webhook/meta/:accountId — Meta 验签
app.get('/webhook/meta/:accountId', async (req, res) => {
  const adapter = channels.getAdapter(req.params.accountId);
  if (adapter) {
    await adapter.verifyWebhook(req, res);
  } else {
    console.log(`⚠️ No Meta adapter for account: ${req.params.accountId}`);
    res.sendStatus(403);
  }
});

// POST /webhook/meta/:accountId — Meta 消息接收
app.post('/webhook/meta/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const adapter = channels.getAdapter(accountId);
    if (!adapter) {
      return res.status(404).send('Unknown Meta account');
    }

    const result = await adapter.handleWebhook(req, res);
    const messages = result.messages || result; // 兼容旧格式返回数组
    const statuses = result.statuses || [];
    channels.recordMessage(accountId);

    // 处理状态事件
    if (statuses.length > 0) {
      for (const s of statuses) {
        if (s.status === 'failed') {
          console.error(`❌ [Meta] Message ${s.messageId} failed for ${s.recipientId}:`,
            (s.errors || []).map(e => e.message).join(', '));
          channels.recordError(accountId, new Error(`Message failed: ${(s.errors || [])[0]?.message || 'unknown'}`));
        } else {
          console.log(`📊 [Meta] Message ${s.messageId} → ${s.status} for ${s.recipientId}`);
        }
      }
    }

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        try {
          const msgText = msg.content;
          const isSpam = isSuspiciousMessage(msgText);
          const hasVerificationCode = /\b\d{4,8}\b/.test(msgText) && /(code|码|verify|验证|OTP|PIN|password|密码)/i.test(msgText);
          const hasLink = /https?:\/\//i.test(msgText);
          const hasQRRequest = /(QR|二维码|scan|扫一扫)/i.test(msgText);

          if (isSpam || hasVerificationCode || hasLink || hasQRRequest) {
            console.log(`🚨 Suspicious message from ${msg.contactId}: ${msgText.slice(0, 100)}`);
            saveMessage(msg.contactId, 'in', msgText);
            continue;
          }

          // 防刷屏：短时间内多条消息合并处理
          const recentFromContact = db.prepare(
            "SELECT COUNT(*) as cnt FROM messages_v2 WHERE direction = 'inbound' AND timestamp > datetime('now', '-10 seconds')"
          ).get();
          if (recentFromContact && recentFromContact.cnt > 3) {
            console.log(`⏳ Rate limit: too many messages from ${msg.contactId}, delaying`);
            await new Promise(r => setTimeout(r, 5000)); // 等5秒看是否还有新消息
          }

          if (msg.type === 'text' && msg.content) {
            console.log(`📩 [Meta] New message from ${msg.contactId}: ${msg.content.substring(0, 50)}`);
            await throttledAIProcess(msg.contactId, msg.content, accountId, 'whatsapp', adapter);
          }
        } catch (msgErr) {
          console.error(`❌ [Meta] Error processing message from ${msg.contactId}:`, msgErr.message);
          channels.recordError(accountId, msgErr);
        }
      }
    }
  } catch (error) {
    console.error('❌ Meta webhook error:', error.message);
    if (!res.headersSent) res.status(500).send('Error');
  }
});

// POST /webhook/kapso/:accountId — Kapso 消息接收
app.post('/webhook/kapso/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const adapter = channels.getAdapter(accountId);
    if (!adapter) {
      return res.status(404).send('Unknown Kapso account');
    }

    const messages = await adapter.handleWebhook(req, res);
    channels.recordMessage(accountId);

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        try {
          if (msg.type === 'text' && msg.content) {
            console.log(`📩 [Kapso] New message from ${msg.contactId}: ${msg.content.substring(0, 50)}`);
            await throttledAIProcess(msg.contactId, msg.content, accountId, 'whatsapp', adapter);
          }
        } catch (msgErr) {
          console.error(`❌ [Kapso] Error processing message from ${msg.contactId}:`, msgErr.message);
          channels.recordError(accountId, msgErr);
        }
      }
    }
  } catch (error) {
    console.error('❌ Kapso webhook error:', error.message);
    if (!res.headersSent) res.status(500).send('Error');
  }
});

// ============================================================
// CRM 管理 API
// ============================================================

app.get('/api/funnel', (req, res) => {
  const { projectId } = req.query;
  const stages = ['new_lead', 'discovery', 'needs_analysis', 'proposal', 'negotiation', 'closing'];
  const funnel = {};
  const pf = projectId && projectId !== 'default' ? ' AND (project_id = ? OR project_id = \'default\')' : '';
  const pp = projectId && projectId !== 'default' ? [projectId] : [];
  for (const stage of stages) {
    const count = db.prepare('SELECT COUNT(*) as c FROM customers WHERE stage = ?' + pf).get(stage, ...pp);
    funnel[stage] = count.c;
  }
  const total = db.prepare('SELECT COUNT(*) as c FROM customers WHERE 1=1' + pf).get(...pp).c;
  res.json({ total, funnel });
});

app.get('/api/customers', (req, res) => {
  const customers = db.prepare('SELECT id, display_name, phone, status as stage, profile, notes, updated_at as last_contact, created_at FROM customers_v2 ORDER BY updated_at DESC LIMIT 100').all();
  res.json(customers);
});

app.get('/api/customers/:phone', (req, res) => {
  const phone = req.params.phone;
  const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(phone);
  if (!binding) return res.status(404).json({ error: 'Customer not found' });
  const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(binding.customer_id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const messages = getRecentMessages(phone, 20, binding.customer_id);
  res.json({ ...customer, phone, messages });
});

app.post('/api/customers/:phone/notes', (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'Notes required' });
  const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(req.params.phone);
  if (binding) updateCustomerV2(binding.customer_id, { notes });
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    knowledgeChunks: totalKnowledgeChunks(),
    embeddingsCached: chunkEmbeddings.size,
    uptime: process.uptime()
  });
});

// ============================================================
// Phase 6: Message State Machine + Retry Queue
// ============================================================

const MAX_RETRIES = 3;

// ============================================================
// 并发与限流控制
// ============================================================

// 全局 AI 处理并发控制（最多同时处理 N 条消息）
// ============================================================
// 并发控制（项目级配额 + 全局兜底）
// ============================================================

// 全局上限（硬性限制，所有项目共享）
const GLOBAL_MAX_AI = 15;
const GLOBAL_MAX_SEND = 20;

// 项目级并发状态: projectId -> { active, queue: [{ resolve, reject, timer }] }
const projectAIState = new Map();
const projectSendState = new Map();

let globalActiveAI = 0;
const globalAIQueue = [];
let globalActiveSend = 0;
const globalSendQueue = [];

// 每个联系人的发送限流（1条/秒）
const perContactSendTimers = new Map();

/**
 * 获取项目的并发配额（0 或空 = 无限制，仅受全局约束）
 */
function getProjectQuotas(projectId) {
  try {
    if (!projectId || projectId === 'default') return { ai: 0, send: 0 };
    const p = db.prepare('SELECT ai_concurrency, send_concurrency FROM projects WHERE id = ?').get(projectId);
    return { ai: p?.ai_concurrency || 0, send: p?.send_concurrency || 0 };
  } catch { return { ai: 0, send: 0 }; }
}

function ensureProjectState(map, projectId) {
  if (!map.has(projectId)) {
    map.set(projectId, { active: 0, queue: [] });
  }
  return map.get(projectId);
}

/**
 * 获取 AI 处理槽位（项目级 + 全局双层控制）
 */
async function acquireAI(projectId) {
  const proj = getProjectQuotas(projectId);

  // 项目级排队
  if (proj.ai > 0) {
    const state = ensureProjectState(projectAIState, projectId);
    if (state.active >= proj.ai) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = state.queue.indexOf(item);
          if (idx !== -1) state.queue.splice(idx, 1);
          reject(new Error(`AI queue timeout [${projectId}]`));
        }, 60000);
        const item = { resolve, reject, timer };
        state.queue.push(item);
      });
      state.active++;
      return;
    }
  }

  // 全局排队
  if (globalActiveAI >= GLOBAL_MAX_AI) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = globalAIQueue.indexOf(item);
        if (idx !== -1) globalAIQueue.splice(idx, 1);
        reject(new Error('Global AI queue timeout'));
      }, 60000);
      const item = { resolve, reject, timer };
      globalAIQueue.push(item);
    });
  }

  if (proj.ai > 0) ensureProjectState(projectAIState, projectId).active++;
  globalActiveAI++;
}

function releaseAI(projectId) {
  const proj = getProjectQuotas(projectId);
  if (proj.ai > 0) {
    const state = projectAIState.get(projectId);
    if (state) {
      state.active--;
      if (state.queue.length > 0) {
        const next = state.queue.shift();
        clearTimeout(next.timer);
        state.active++;
        next.resolve();
      }
    }
  }
  globalActiveAI--;
  if (globalAIQueue.length > 0) {
    const next = globalAIQueue.shift();
    clearTimeout(next.timer);
    globalActiveAI++;
    next.resolve();
  }
}

/**
 * 获取发送槽位（项目级 + 全局双层控制）
 */
async function acquireSend(projectId) {
  const proj = getProjectQuotas(projectId);

  // 项目级排队
  if (proj.send > 0) {
    const state = ensureProjectState(projectSendState, projectId);
    if (state.active >= proj.send) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = state.queue.indexOf(item);
          if (idx !== -1) state.queue.splice(idx, 1);
          reject(new Error(`Send queue timeout [${projectId}]`));
        }, 30000);
        const item = { resolve, reject, timer };
        state.queue.push(item);
      });
      state.active++;
      return;
    }
  }

  // 全局排队
  if (globalActiveSend >= GLOBAL_MAX_SEND) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = globalSendQueue.indexOf(item);
        if (idx !== -1) globalSendQueue.splice(idx, 1);
        reject(new Error('Global send queue timeout'));
      }, 30000);
      const item = { resolve, reject, timer };
      globalSendQueue.push(item);
    });
  }

  if (proj.send > 0) ensureProjectState(projectSendState, projectId).active++;
  globalActiveSend++;
}

function releaseSend(projectId) {
  const proj = getProjectQuotas(projectId);
  if (proj.send > 0) {
    const state = projectSendState.get(projectId);
    if (state) {
      state.active--;
      if (state.queue.length > 0) {
        const next = state.queue.shift();
        clearTimeout(next.timer);
        state.active++;
        next.resolve();
      }
    }
  }
  globalActiveSend--;
  if (globalSendQueue.length > 0) {
    const next = globalSendQueue.shift();
    clearTimeout(next.timer);
    globalActiveSend++;
    next.resolve();
  }
}

/**
 * 获取当前并发状态（用于前端展示）
 */
function getConcurrencyStatus() {
  const projects = db.prepare('SELECT id, name, ai_concurrency, send_concurrency FROM projects').all();
  const result = {
    global: { activeAI: globalActiveAI, maxAI: GLOBAL_MAX_AI, activeSend: globalActiveSend, maxSend: GLOBAL_MAX_SEND },
    projects: projects.map(p => {
      const aiState = projectAIState.get(p.id);
      const sendState = projectSendState.get(p.id);
      return {
        id: p.id,
        name: p.name,
        aiConcurrency: p.ai_concurrency || 0,
        sendConcurrency: p.send_concurrency || 0,
        activeAI: aiState?.active || 0,
        aiQueueLen: aiState?.queue?.length || 0,
        activeSend: sendState?.active || 0,
        sendQueueLen: sendState?.queue?.length || 0,
      };
    })
  };
  return result;
}

// ============================================================
// AI 处理限流（项目级 + 全局双层）
// ============================================================

const RETRY_DELAYS = [5000, 30000, 180000]; // 5s, 30s, 180s

async function throttledAIProcess(phone, content, accountId, channel, adapter) {
  const projectId = getAccountProject(accountId);
  console.log(`🧠 AI process [${projectId}] from ${phone}`);
  projectLog(projectId, 'info', 'ai_process', `收到消息并处理`, `${phone}`);

  await acquireAI(projectId);
  try {
    return await processReplyWithIntervene(phone, content, accountId, channel, adapter);
  } finally {
    releaseAI(projectId);
  }
}

// 每个联系人的发送限流（令牌桶：1秒1条）
async function throttledSend(adapter, to, text, accountId = 'default') {
  const projectId = getAccountProject(accountId);
  const key = `${adapter.id || 'default'}:${to}`;
  const now = Date.now();
  const last = perContactSendTimers.get(key) || 0;
  const gap = Math.max(0, 1000 - (now - last)); // 至少间隔 1s

  if (gap > 0) {
    await new Promise(r => setTimeout(r, gap));
  }

  await acquireSend(projectId);
  try {
    perContactSendTimers.set(key, Date.now());
    return await adapter.sendMessage(to, text);
  } finally {
    releaseSend(projectId);
  }
}

// Update message status in messages_v2
function updateMessageStatus(msgId, status, extra = {}) {
  try {
    const sets = ['status = ?'];
    const vals = [status];
    if (extra.retry_count !== undefined) { sets.push('retry_count = ?'); vals.push(extra.retry_count); }
    if (extra.meta) { sets.push('meta = ?'); vals.push(JSON.stringify(extra.meta)); }
    vals.push(msgId);
    db.prepare(`UPDATE messages_v2 SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  } catch (e) {
    console.error('❌ updateMessageStatus error:', e.message);
  }
}

// Enqueue a failed message for retry
function enqueueRetry(messageId, customerId, accountId, channel, content) {
  const now = sqlNow();
  const nextRetry = new Date(Date.now() + RETRY_DELAYS[0]).toISOString();
  db.prepare(
    'INSERT INTO message_queue (message_id, customer_id, account_id, channel, content, status, retry_count, next_retry_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run(messageId, customerId, accountId, channel, content, 'queued', nextRetry, now);
  console.log(`📨 Enqueued retry for message ${messageId} (retry #1 at ${nextRetry})`);
}

// Process retry queue (called every 30s)
async function processRetryQueue() {
  try {
    const now = sqlNow();
    const pending = db.prepare(
      "SELECT * FROM message_queue WHERE status = 'queued' AND next_retry_at <= ? ORDER BY created_at ASC LIMIT 10"
    ).all(now);

    for (const item of pending) {
      console.log(`🔄 Retrying message ${item.message_id} (attempt ${item.retry_count})...`);

      try {
        // Get customer phone
        const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(item.customer_id);
        if (!customer || !customer.phone) {
          db.prepare("UPDATE message_queue SET status = 'failed', last_error = ? WHERE id = ?").run('Customer not found', item.id);
          continue;
        }

        const adapter = resolveAdapter(item.account_id);

        if (!adapter) {
          db.prepare("UPDATE message_queue SET status = 'failed', last_error = ? WHERE id = ?").run('No adapter', item.id);
          continue;
        }

        await throttledSend(adapter, customer.phone, item.content);

        // Success
        db.prepare("UPDATE message_queue SET status = 'sent' WHERE id = ?").run(item.id);
        updateMessageStatus(item.message_id, 'sent');
        console.log(`✅ Retry success for message ${item.message_id}`);
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        console.error(`❌ Retry failed for ${item.message_id}: ${errMsg}`);

        if (item.retry_count >= MAX_RETRIES) {
          db.prepare("UPDATE message_queue SET status = 'failed', last_error = ? WHERE id = ?").run(errMsg, item.id);
          updateMessageStatus(item.message_id, 'failed', { meta: { queue_failed: true, error: errMsg } });
          console.log(`💀 Message ${item.message_id} marked as dead after ${MAX_RETRIES} retries`);
        } else {
          const nextDelay = RETRY_DELAYS[Math.min(item.retry_count, RETRY_DELAYS.length - 1)];
          const nextRetry = new Date(Date.now() + nextDelay).toISOString();
          db.prepare("UPDATE message_queue SET retry_count = retry_count + 1, next_retry_at = ?, last_error = ? WHERE id = ?")
            .run(nextRetry, errMsg, item.id);
          console.log(`⏳ Next retry for ${item.message_id} in ${nextDelay/1000}s`);
        }
      }
    }
  } catch (err) {
    console.error('❌ processRetryQueue error:', err.message);
  }
}

// ============================================================
// Follow-up 跟进系统
// ============================================================

/**
 * 生成跟进消息（简化版AI调用，无需完整RAG）
 */
async function generateFollowUpMessage(customer, messages, project, toneHint = '') {
  const cfg = getAIConfig('chat');
  const persona = project.ai_persona ? JSON.parse(project.ai_persona) : {};
  const strategy = project.sales_strategy ? JSON.parse(project.sales_strategy) : {};

  // 构建系统 prompt
  const systemPrompt = `你是"${persona.name || '貂貂'}"，${persona.company || '佛山跃迁力科技（YuKoLi）'}的资深销售经理。

你的任务是对未回复的客户进行主动跟进。

## 跟进策略
- 不要重复之前已经说过的内容
- 根据客户当前阶段选择合适策略：
  · 新线索/探索期 → 破冰问候，了解需求
  · 需求分析期 → 推荐产品方案，展示案例
  · 方案报价期 → 催单，解答疑虑，制造紧迫感
  · 商务谈判期 → 促成成交，处理异议
- 语气自然，像真人销售员在微信上聊天
- 不要过于正式或机械
- 不要长篇大论，简洁有力

## 输出要求
只输出纯文本跟进消息，不超过300字。
不要使用任何标签或格式（如[思考]、[回复]等）。
不要加表情符号（除非非常自然的语气词）。

${strategy.tone ? `语气风格: ${strategy.tone}` : ''}
${strategy.focus ? `跟进重点: ${strategy.focus}` : ''}
${toneHint ? `\n## 本次跟进策略提示\n${toneHint}` : ''}`;

  // 构建对话历史摘要
  const historyBlock = messages.length > 0
    ? `\n\n## 之前的对话记录（最近${messages.length}条）\n` +
      messages.map(m => `${m.direction === 'inbound' ? '客户' : '销售'}: ${m.content.slice(0, 150)}`).join('\n')
    : '\n\n（暂无对话记录）';

  // 客户画像
  const profile = customer.profile ? JSON.parse(customer.profile) : {};
  const profileBlock = `\n\n## 客户信息\n` +
    `- 名称: ${customer.display_name || customer.phone || '未知'}\n` +
    `- 国家: ${customer.country || '未知'}\n` +
    `- 业务类型: ${customer.business_type || profile.businessType || '未知'}\n` +
    `- 语言: ${customer.language || '未知'}\n` +
    `- 购买意向: ${customer.purchase_intent || profile.purchaseIntent || '未知'}\n` +
    `- 销售阶段: ${customer.status || 'new_lead'}\n` +
    `- 历史消息数: ${customer.message_count || 0}`;

  const userPrompt = `${profileBlock}${historyBlock}\n\n请生成一条跟进消息（纯文本，不超过300字）：`;

  try {
    const response = await axios.post(
      `${cfg.apiUrl}/v1/chat/completions`,
      {
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 512,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let content = response.data.choices?.[0]?.message?.content || '';
    // 去掉可能的标签格式
    content = content.replace(/\[思考\].*\n?/g, '').replace(/\[回复\]\s*/g, '').replace(/\[判断\].*\n?/g, '').replace(/\[行动\].*\n?/g, '').trim();
    return content.slice(0, 300);
  } catch (err) {
    console.error('❌ generateFollowUpMessage error:', err.message);
    return '';
  }
}

/**
 * 处理跟进队列 - 查询到期待跟进的客户并发送消息
 */
async function processFollowUps() {
  const now = sqlNow();
  console.log(`🔄 [FollowUp] Starting follow-up scan at ${now}`);

  // 获取所有活跃项目
  const projects = db.prepare("SELECT * FROM projects WHERE status = 'active'").all();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const project of projects) {
    let followUpConfig;
    try {
      followUpConfig = JSON.parse(project.follow_up_config || '{}');
    } catch {
      followUpConfig = {};
    }

    // 检查是否启用跟进
    if (followUpConfig.enabled === false) {
      continue;
    }

    const intervalHours = followUpConfig.interval_hours || 24;
    const maxAttempts = followUpConfig.max_attempts || 3;

    // 查询到期待跟进的活跃客户
    const customers = db.prepare(
      `SELECT c.* FROM customers_v2 c
       WHERE c.project_id = ?
         AND c.next_follow_up IS NOT NULL
         AND c.next_follow_up != ''
         AND c.next_follow_up <= ?
         AND c.status NOT IN ('won', 'lost', 'unsubscribed')
         AND c.phone IS NOT NULL
         AND c.phone != ''`
    ).all(project.id, now);

    for (const customer of customers) {
      try {
        // 检查今天是否已经跟进过（每天最多1次）
        const todayStart = new Date().toISOString().slice(0, 10);
        const todayFollowUp = db.prepare(
          `SELECT COUNT(*) as c FROM follow_ups
           WHERE customer_id = ? AND last_attempt_at >= ? AND status IN ('sent', 'pending')`
        ).get(customer.id, todayStart + 'T00:00:00');

        if (todayFollowUp.c > 0) {
          console.log(`⏭️ [FollowUp] Skipping ${customer.display_name || customer.phone} - already followed up today`);
          continue;
        }

  // 获取历史跟进次数
        const totalAttempts = db.prepare(
          `SELECT COUNT(*) as c FROM follow_ups WHERE customer_id = ? AND status = 'sent'`
        ).get(customer.id)?.c || 0;

        // 跟进次数决定策略语气
        let followUpTone = '';
        if (totalAttempts === 0) {
          followUpTone = '这是第一次跟进，语气轻松友好，像老朋友打招呼，提及上次聊的内容。';
        } else if (totalAttempts === 1) {
          followUpTone = '这是第二次跟进（客户之前未回复），适当制造紧迫感，提供新价值（如新案例、限时优惠），不要施压。';
        } else if (totalAttempts >= 2) {
          followUpTone = '这是第' + (totalAttempts + 1) + '次跟进，最后一次尝试。语气温和但坚定，给出特别条件（样品试用/额外折扣），并尊重客户的选择。如果客户明确拒绝则停止。';
        }

        if (totalAttempts >= maxAttempts) {
          console.log(`⏭️ [FollowUp] Skipping ${customer.display_name || customer.phone} - max attempts reached (${totalAttempts}/${maxAttempts})`);
          // 清除下次跟进时间
          db.prepare('UPDATE customers_v2 SET next_follow_up = NULL WHERE id = ?').run(customer.id);
          continue;
        }

        // 获取最近对话历史
        const recentMessages = db.prepare(
          `SELECT direction, content FROM messages_v2
           WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 10`
        ).all(customer.id).reverse();

        // 生成跟进消息
        const message = await generateFollowUpMessage(customer, recentMessages, project, followUpTone || "");
        if (!message) {
          console.log(`⚠️ [FollowUp] No message generated for ${customer.display_name || customer.phone}`);
          continue;
        }

        // 获取项目绑定的 WhatsApp 账号
        const allChannels = channels.getChannels('whatsapp');
        const projectChannels = allChannels.filter(ch => ch.projectId === project.id);

        if (projectChannels.length === 0) {
          console.log(`⏭️ [FollowUp] No WhatsApp account for project ${project.id}, skipping send`);
          // 记录但不发送
          const fuId = db.prepare(
            `INSERT INTO follow_ups (customer_id, project_id, attempt, status, message, ai_context, last_attempt_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(customer.id, project.id, totalAttempts + 1, 'skipped', message, '', now, now);
          // 仍然更新下次跟进时间
          const nextFollowUp = new Date(Date.now() + intervalHours * 3600000).toISOString();
          db.prepare('UPDATE customers_v2 SET next_follow_up = ? WHERE id = ?').run(nextFollowUp, customer.id);
          continue;
        }

        // 通过适配器发送消息（使用第一个绑定的账号）
        const accountId = projectChannels[0].id;
        const adapter = metaAdapters.get(accountId);

        if (!adapter) {
          console.log(`⚠️ [FollowUp] No adapter for account ${accountId}, skipping send`);
          continue;
        }

        await adapter.sendMessage(customer.phone, message);

        // 记录到 messages_v2
        const fuMsgId = crypto.randomUUID();
        const custProjectId = customer.project_id || db.prepare('SELECT project_id FROM customers_v2 WHERE id = ?').get(customer.id)?.project_id || '';
        db.prepare(
          'INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, source, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(fuMsgId, customer.id, accountId, 'whatsapp', 'outbound', message, now, 'sent', 'auto_follow_up', custProjectId);

        // 记录到 timeline
        db.prepare(
          'INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)'
        ).run(customer.id, 'follow_up_sent', JSON.stringify({ message: message.slice(0, 200), attempt: totalAttempts + 1 }), 'follow_up_system');

        // 更新下次跟进时间
        const nextFollowUp = new Date(Date.now() + intervalHours * 3600000).toISOString();
        db.prepare('UPDATE customers_v2 SET next_follow_up = ?, follow_up_count = follow_up_count + 1, last_follow_up_at = ? WHERE id = ?').run(nextFollowUp, now, customer.id);

        // 插入 follow_ups 记录
        db.prepare(
          `INSERT INTO follow_ups (customer_id, project_id, attempt, status, message, ai_context, last_attempt_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(customer.id, project.id, totalAttempts + 1, 'sent', message, '', now, now);

        sent++;
        console.log(`✅ [FollowUp] Sent to ${customer.display_name || customer.phone} (attempt ${totalAttempts + 1})`);
        projectLog(project.id, 'info', 'follow_up', `跟进消息已发送`, `${customer.display_name || customer.phone} 第${totalAttempts + 1}次`);
      } catch (err) {
        console.error(`❌ [FollowUp] Error for ${customer.display_name || customer.phone}:`, err.message);
        // 记录失败
        db.prepare(
          `INSERT INTO follow_ups (customer_id, project_id, attempt, status, message, last_attempt_at, created_at)
           VALUES (?, ?, ?, 'failed', ?, ?, ?)`
        ).run(customer.id, project.id, 1, err.message, now, now);
        failed++;
      }

      processed++;

      // 避免过快连续发送，间隔2秒
      if (processed < customers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  console.log(`🔄 [FollowUp] Scan complete: processed=${processed}, sent=${sent}, failed=${failed}`);
  return { processed, sent, failed };
}

// 注册定时跟进任务
function initFollowUpCron() {
  if (process.env.FOLLOW_UP_ENABLED === 'false') {
    console.log('⏸️  Follow-up system disabled (FOLLOW_UP_ENABLED=false)');
    return;
  }

  const cronExpr = process.env.FOLLOW_UP_CRON || '0 * * * *';
  if (!cron.validate(cronExpr)) {
    console.error(`⚠️ Invalid FOLLOW_UP_CRON expression: ${cronExpr}, follow-up cron not started`);
    return;
  }

  cron.schedule(cronExpr, () => {
    processFollowUps().catch(err => console.error('❌ [FollowUp] Cron error:', err.message));
  });

  console.log(`🔄 Follow-up cron scheduled: ${cronExpr}`);
}

// Follow-up API endpoints
app.post('/api/follow-ups/run', (req, res) => {
  processFollowUps()
    .then(result => res.json({ ok: true, ...result }))
    .catch(err => res.status(500).json({ ok: false, error: err.message }));
});

app.get('/api/follow-ups', (req, res) => {
  try {
    const { projectId, status, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT f.*, c.display_name, c.phone, c.status as customer_status
               FROM follow_ups f LEFT JOIN customers_v2 c ON f.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (projectId) { sql += ' AND f.project_id = ?'; params.push(projectId); }
    if (status) { sql += ' AND f.status = ?'; params.push(status); }
    sql += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const items = db.prepare(sql).all(...params);
    const total = db.prepare(
      `SELECT COUNT(*) as c FROM follow_ups f WHERE 1=1${projectId ? ' AND f.project_id = ?' : ''}${status ? ' AND f.status = ?' : ''}`
    ).get(...(projectId ? [projectId] : []).concat(status ? [status] : []))?.c || 0;
    res.json({ items, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/follow-ups/stats', (req, res) => {
  try {
    const { projectId } = req.query;
    const whereClause = projectId ? ' WHERE project_id = ?' : '';
    const params = projectId ? [projectId] : [];

    const total = db.prepare(`SELECT COUNT(*) as c FROM follow_ups${whereClause}`).get(...params)?.c || 0;
    const sent = db.prepare(`SELECT COUNT(*) as c FROM follow_ups${whereClause} AND status = 'sent'`).get(...params)?.c || 0;
    const failed = db.prepare(`SELECT COUNT(*) as c FROM follow_ups${whereClause} AND status = 'failed'`).get(...params)?.c || 0;
    const skipped = db.prepare(`SELECT COUNT(*) as c FROM follow_ups${whereClause} AND status = 'skipped'`).get(...params)?.c || 0;

    // 待跟进客户数
    const pendingCustomers = db.prepare(
      `SELECT COUNT(*) as c FROM customers_v2
       WHERE next_follow_up IS NOT NULL AND next_follow_up != '' AND next_follow_up <= ?
       AND status NOT IN ('won', 'lost', 'unsubscribed')`
    ).get(sqlNow())?.c || 0;

    // 按项目分组
    const byProject = db.prepare(
      `SELECT project_id, COUNT(*) as total,
              SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM follow_ups GROUP BY project_id ORDER BY total DESC`
    ).all();

    res.json({
      total,
      sent,
      failed,
      skipped,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0',
      pendingCustomers,
      byProject
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 跟进配置 API ──

// 获取项目的跟进配置
app.get('/api/follow-up/config', (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const project = db.prepare("SELECT follow_up_config FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    let config;
    try { config = JSON.parse(project.follow_up_config || '{}'); } catch { config = {}; }
    // 填充默认值
    res.json({
      enabled: config.enabled !== false,
      interval_hours: config.interval_hours || 24,
      max_attempts: config.max_attempts || 3,
      template: config.template || '',
      projectId
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新跟进配置
app.put('/api/follow-up/config', (req, res) => {
  try {
    const { projectId, enabled, interval_hours, max_attempts, template } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    const config = {
      enabled: enabled !== false,
      interval_hours: parseInt(interval_hours) || 24,
      max_attempts: parseInt(max_attempts) || 3,
      template: template || ''
    };
    db.prepare("UPDATE projects SET follow_up_config = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(config), projectId);
    res.json({ ok: true, config });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取待跟进客户列表
app.get('/api/follow-up/pending', (req, res) => {
  try {
    const { projectId } = req.query;
    const now = sqlNow();
    let sql = `SELECT c.*,
                (SELECT COUNT(*) FROM follow_ups WHERE customer_id = c.id AND status = 'sent') as sent_count,
                (SELECT MAX(last_attempt_at) FROM follow_ups WHERE customer_id = c.id) as last_fu_at
               FROM customers_v2 c
               WHERE c.next_follow_up IS NOT NULL AND c.next_follow_up != '' AND c.next_follow_up <= ?
               AND c.status NOT IN ('won', 'lost', 'unsubscribed', 'closed_won', 'closed_lost')
               AND c.phone IS NOT NULL AND c.phone != ''`;
    const params = [now];
    if (projectId) { sql += ' AND c.project_id = ?'; params.push(projectId); }
    sql += ' ORDER BY c.next_follow_up ASC LIMIT 100';
    const customers = db.prepare(sql).all(...params);
    res.json({ items: customers, total: customers.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 手动触发跟进
app.post('/api/follow-up/trigger', async (req, res) => {
  try {
    const { projectId, customerIds } = req.body;
    // 如果指定了客户ID，只跟进这些客户；否则运行完整的 processFollowUps
    if (customerIds && customerIds.length > 0) {
      let sent = 0;
      let failed = 0;
      const errors = [];
      for (const custId of customerIds) {
        try {
          const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(custId);
          if (!customer) { errors.push({ customerId: custId, error: 'Customer not found' }); continue; }
          const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(customer.project_id || 'default');
          if (!project) { errors.push({ customerId: custId, error: 'Project not found' }); continue; }
          // 获取最近对话
          const recentMessages = db.prepare(
            `SELECT direction, content FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 10`
          ).all(customer.id).reverse();
          const message = await generateFollowUpMessage(customer, recentMessages, project, '');
          if (!message) { errors.push({ customerId: custId, error: 'No message generated' }); continue; }
          // 获取 WhatsApp 账号发送
          const allChannels = channels.getChannels('whatsapp');
          const projectChannels = allChannels.filter(ch => ch.projectId === project.id);
          if (projectChannels.length > 0) {
            const accountId = projectChannels[0].id;
            const adapter = metaAdapters.get(accountId);
            if (adapter) {
              await adapter.sendMessage(customer.phone, message);
              // 记录到 messages_v2
              const msgId = crypto.randomUUID();
              db.prepare(
                'INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, source, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).run(msgId, customer.id, accountId, 'whatsapp', 'outbound', message, sqlNow(), 'sent', 'auto_follow_up', project.id);
            }
          }
          // 更新统计
          db.prepare('UPDATE customers_v2 SET follow_up_count = follow_up_count + 1, last_follow_up_at = ? WHERE id = ?').run(sqlNow(), customer.id);
          // 更新 timeline
          db.prepare(
            'INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)'
          ).run(customer.id, 'follow_up_sent', JSON.stringify({ message: message.slice(0, 200), manual: true }), 'admin');
          // 插入 follow_ups 记录
          db.prepare(
            `INSERT INTO follow_ups (customer_id, project_id, attempt, status, message, last_attempt_at, created_at)
             VALUES (?, ?, ?, 'sent', ?, ?, ?)`
          ).run(customer.id, project.id, (customer.follow_up_count || 0) + 1, message, sqlNow(), sqlNow());
          // 更新下次跟进时间
          let followUpConfig;
          try { followUpConfig = JSON.parse(project.follow_up_config || '{}'); } catch { followUpConfig = {}; }
          const intervalHours = followUpConfig.interval_hours || 24;
          const maxAttempts = followUpConfig.max_attempts || 3;
          if ((customer.follow_up_count || 0) + 1 < maxAttempts) {
            const nextFollowUp = new Date(Date.now() + intervalHours * 3600000).toISOString();
            db.prepare('UPDATE customers_v2 SET next_follow_up = ? WHERE id = ?').run(nextFollowUp, customer.id);
          } else {
            db.prepare('UPDATE customers_v2 SET next_follow_up = NULL WHERE id = ?').run(customer.id);
          }
          sent++;
        } catch (err) {
          failed++;
          errors.push({ customerId: custId, error: err.message });
        }
      }
      res.json({ ok: true, sent, failed, errors });
    } else {
      const result = await processFollowUps();
      res.json({ ok: true, ...result });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// Projects: 项目管理 API
// ============================================================

// 获取项目列表
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT id, name, description, status, language, timezone, created_at, updated_at FROM projects ORDER BY created_at').all();
    // 附加统计
    const allChannels = channels.getChannels('whatsapp');
    for (const p of projects) {
      p.customer_count = db.prepare('SELECT COUNT(*) as c FROM customers_v2 WHERE project_id = ?').get(p.id)?.c || 0;
      p.message_count = db.prepare('SELECT COUNT(*) as c FROM messages_v2 WHERE project_id = ?').get(p.id)?.c || 0;
      p.channel_count = allChannels.filter(c => c.projectId === p.id).length;
    }
    res.json(projects);
  } catch (e) { console.error('[Projects] list error:', e); res.status(500).json({ error: e.message }); }
});

// 获取项目绑定的账号
app.get('/api/projects/:id/channels', (req, res) => {
  try {
    const allChannels = channels.getChannels('whatsapp');
    const bound = allChannels.filter(c => c.projectId === req.params.id);
    res.json(bound);
  } catch (e) { console.error('[ProjectChannels] list error:', e); res.status(500).json({ error: e.message }); }
});

// 在项目下添加新账号
app.post('/api/projects/:id/channels', (req, res) => {
  try {
    const data = Object.assign({}, req.body, { projectId: req.params.id });
    const ch = channels.addChannel(data);
    res.json(ch);
  } catch (e) { console.error('[ProjectChannels] add error:', e); res.status(500).json({ error: e.message }); }
});

// 解绑账号（清除projectId，不从全局删除）
app.delete('/api/projects/:id/channels/:channelId', (req, res) => {
  try {
    const ch = channels.updateChannel(req.params.channelId, { projectId: '' });
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    res.json({ ok: true });
  } catch (e) { console.error('[ProjectChannels] unbind error:', e); res.status(500).json({ error: e.message }); }
});

// 获取单个项目详情
app.get('/api/projects/:id', (req, res) => {
  try {
    const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    // 解析 JSON 字段
    p.ai_persona = JSON.parse(p.ai_persona || '{}');
    p.sales_strategy = JSON.parse(p.sales_strategy || '{}');
    p.follow_up_config = JSON.parse(p.follow_up_config || '{}');
    // 统计
    p.stats = {
      customers: db.prepare('SELECT COUNT(*) as c FROM customers_v2 WHERE project_id = ?').get(p.id)?.c || 0,
      messages: db.prepare('SELECT COUNT(*) as c FROM messages_v2 WHERE project_id = ?').get(p.id)?.c || 0,
      deals: db.prepare('SELECT COUNT(*) as c FROM deals WHERE project_id = ?').get(p.id)?.c || 0,
    };
    res.json(p);
  } catch (e) { console.error('[Projects] get error:', e); res.status(500).json({ error: e.message }); }
});

// 创建项目
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, language, timezone, ai_persona, sales_strategy, follow_up_config } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare(`INSERT INTO projects (id, name, description, language, timezone, ai_persona, sales_strategy, follow_up_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, name.trim(), description || '', language || 'zh-CN', timezone || 'Asia/Shanghai',
      JSON.stringify(ai_persona || {}), JSON.stringify(sales_strategy || {}), JSON.stringify(follow_up_config || {})
    );
    res.json({ id, name: name.trim(), message: 'Project created' });
    projectLog(id, 'info', 'project_create', `项目创建`, name.trim());
  } catch (e) { console.error('[Projects] create error:', e); res.status(500).json({ error: e.message }); }
});

// 更新项目
app.put('/api/projects/:id', (req, res) => {
  try {
    const { name, description, status, language, timezone, ai_persona, sales_strategy, follow_up_config, ai_concurrency, send_concurrency } = req.body;
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    db.prepare(`UPDATE projects SET name=?, description=?, status=?, language=?, timezone=?,
      ai_persona=?, sales_strategy=?, follow_up_config=?,
      ai_concurrency=?, send_concurrency=?, updated_at=datetime('now') WHERE id=?`).run(
      name, description, status || 'active', language, timezone,
      JSON.stringify(ai_persona || {}), JSON.stringify(sales_strategy || {}),
      JSON.stringify(follow_up_config || {}),
      Math.max(0, parseInt(ai_concurrency) || 0),
      Math.max(0, parseInt(send_concurrency) || 0),
      req.params.id
    );
    res.json({ message: 'Project updated' });
    projectLog(req.params.id, 'info', 'project_update', `项目配置更新`, name || req.params.id);
  } catch (e) { console.error('[Projects] update error:', e); res.status(500).json({ error: e.message }); }
});

// 删除项目（先停用再删除，或直接删除最后一个以外的项目）
app.delete('/api/projects/:id', (req, res) => {
  try {
    const p = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    if (p.status === 'active') return res.status(400).json({ error: 'Deactivate project before deleting' });
    // 直接删除（不再迁移数据到 default）
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    projectLog(req.params.id, 'warn', 'project_delete', `项目已删除`, req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (e) { console.error('[Projects] delete error:', e); res.status(500).json({ error: e.message }); }
});

// ============================================================
// 资源跨项目共享 API
// ============================================================

// 获取所有项目列表（用于共享目标选择）
app.get('/api/share/targets', (req, res) => {
  try {
    const list = db.prepare("SELECT id, name, status FROM projects WHERE status = 'active' ORDER BY name").all();
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 共享知识库文档到其他项目
app.post('/api/share/knowledge', (req, res) => {
  try {
    const { docIds, targetProjectId } = req.body;
    if (!targetProjectId || !docIds || !docIds.length) return res.status(400).json({ error: 'targetProjectId 和 docIds 必填' });
    const target = db.prepare("SELECT id FROM projects WHERE id = ?").get(targetProjectId);
    if (!target) return res.status(404).json({ error: '目标项目不存在' });
    let copied = 0, skipped = 0;
    for (const docId of docIds) {
      const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(docId);
      if (!doc) { skipped++; continue; }
      // 检查目标项目是否已有同名文档
      const exists = db.prepare("SELECT id FROM knowledge_docs WHERE project_id = ? AND title = ?").get(targetProjectId, doc.title);
      if (exists) { skipped++; continue; }
      const newId = `shared_${docId}_${targetProjectId}`;
      db.prepare(`INSERT OR IGNORE INTO knowledge_docs (id, title, category, file_path, chunk_count, file_size, status, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`)
        .run(newId, doc.title, doc.category, doc.file_path, doc.chunk_count, doc.file_size, targetProjectId);
      // 复制关联的 chunks
      const chunks = db.prepare('SELECT * FROM knowledge_chunks_db WHERE doc_id = ?').all(docId);
      for (const chunk of chunks) {
        const chunkId = `shared_${chunk.id}_${targetProjectId}`;
        db.prepare(`INSERT OR IGNORE INTO knowledge_chunks_db (id, doc_id, title, content, token_count, project_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
          .run(chunkId, newId, chunk.title, chunk.content, chunk.token_count, targetProjectId);
      }
      copied++;
    }
    // 异步重建目标项目的 embeddings
    setImmediate(() => rebuildProjectEmbeddings(targetProjectId).catch(e => console.error('[Share] rebuild error:', e.message)));
    res.json({ copied, skipped, targetProjectId });
  } catch (e) { console.error('[Share] knowledge error:', e); res.status(500).json({ error: e.message }); }
});

// 共享邮件模板到其他项目
app.post('/api/share/email-templates', (req, res) => {
  try {
    const { templateIds, targetProjectId } = req.body;
    if (!targetProjectId || !templateIds || !templateIds.length) return res.status(400).json({ error: 'targetProjectId 和 templateIds 必填' });
    const target = db.prepare("SELECT id FROM projects WHERE id = ?").get(targetProjectId);
    if (!target) return res.status(404).json({ error: '目标项目不存在' });
    let copied = 0, skipped = 0;
    for (const tid of templateIds) {
      const tmpl = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(tid);
      if (!tmpl) { skipped++; continue; }
      const exists = db.prepare("SELECT id FROM email_templates WHERE project_id = ? AND name = ?").get(targetProjectId, tmpl.name);
      if (exists) { skipped++; continue; }
      const newId = `shared_${tid}_${targetProjectId}`;
      db.prepare(`INSERT OR IGNORE INTO email_templates (id, project_id, name, subject, body_html, body_text, category, variables, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`)
        .run(newId, targetProjectId, tmpl.name, tmpl.subject, tmpl.body_html, tmpl.body_text, tmpl.category, tmpl.variables);
      copied++;
    }
    res.json({ copied, skipped, targetProjectId });
  } catch (e) { console.error('[Share] email-templates error:', e); res.status(500).json({ error: e.message }); }
});

// 共享 AI 人设到其他项目
app.post('/api/share/ai-persona', (req, res) => {
  try {
    const { sourceProjectId, targetProjectId } = req.body;
    if (!sourceProjectId || !targetProjectId) return res.status(400).json({ error: 'sourceProjectId 和 targetProjectId 必填' });
    if (sourceProjectId === targetProjectId) return res.status(400).json({ error: '源项目和目标项目不能相同' });
    const source = db.prepare("SELECT ai_persona, sales_strategy, follow_up_config FROM projects WHERE id = ?").get(sourceProjectId);
    const target = db.prepare("SELECT id FROM projects WHERE id = ?").get(targetProjectId);
    if (!source || !target) return res.status(404).json({ error: '项目不存在' });
    if (!source.ai_persona || source.ai_persona === '{}') return res.status(400).json({ error: '源项目没有 AI 人设' });
    db.prepare("UPDATE projects SET ai_persona = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(source.ai_persona, targetProjectId);
    res.json({ shared: 'ai_persona', sourceProjectId, targetProjectId });
  } catch (e) { console.error('[Share] ai-persona error:', e); res.status(500).json({ error: e.message }); }
});

// 共享销售策略到其他项目
app.post('/api/share/sales-strategy', (req, res) => {
  try {
    const { sourceProjectId, targetProjectId } = req.body;
    if (!sourceProjectId || !targetProjectId) return res.status(400).json({ error: 'sourceProjectId 和 targetProjectId 必填' });
    if (sourceProjectId === targetProjectId) return res.status(400).json({ error: '源项目和目标项目不能相同' });
    const source = db.prepare("SELECT sales_strategy FROM projects WHERE id = ?").get(sourceProjectId);
    const target = db.prepare("SELECT id FROM projects WHERE id = ?").get(targetProjectId);
    if (!source || !target) return res.status(404).json({ error: '项目不存在' });
    if (!source.sales_strategy || source.sales_strategy === '{}') return res.status(400).json({ error: '源项目没有销售策略' });
    db.prepare("UPDATE projects SET sales_strategy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(source.sales_strategy, targetProjectId);
    res.json({ shared: 'sales_strategy', sourceProjectId, targetProjectId });
  } catch (e) { console.error('[Share] sales-strategy error:', e); res.status(500).json({ error: e.message }); }
});

// 一键共享：复制项目的所有资源（知识库 + 邮件模板 + AI人设 + 销售策略）
app.post('/api/share/project-all', (req, res) => {
  try {
    const { sourceProjectId, targetProjectId } = req.body;
    if (!sourceProjectId || !targetProjectId) return res.status(400).json({ error: 'sourceProjectId 和 targetProjectId 必填' });
    if (sourceProjectId === targetProjectId) return res.status(400).json({ error: '源项目和目标项目不能相同' });
    const source = db.prepare("SELECT id FROM projects WHERE id = ?").get(sourceProjectId);
    const target = db.prepare("SELECT id FROM projects WHERE id = ?").get(targetProjectId);
    if (!source || !target) return res.status(404).json({ error: '项目不存在' });
    const result = { knowledge: { copied: 0, skipped: 0 }, emailTemplates: { copied: 0, skipped: 0 }, aiPersona: false, salesStrategy: false };

    // 1. 知识库
    const docs = db.prepare('SELECT id FROM knowledge_docs WHERE project_id = ?').all(sourceProjectId);
    for (const doc of docs) {
      const d = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(doc.id);
      const exists = db.prepare("SELECT id FROM knowledge_docs WHERE project_id = ? AND title = ?").get(targetProjectId, d.title);
      if (exists) { result.knowledge.skipped++; continue; }
      const newId = `shared_${d.id}_${targetProjectId}`;
      db.prepare(`INSERT OR IGNORE INTO knowledge_docs (id, title, category, file_path, chunk_count, file_size, status, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`)
        .run(newId, d.title, d.category, d.file_path, d.chunk_count, d.file_size, targetProjectId);
      const chunks = db.prepare('SELECT * FROM knowledge_chunks_db WHERE doc_id = ?').all(doc.id);
      for (const chunk of chunks) {
        db.prepare(`INSERT OR IGNORE INTO knowledge_chunks_db (id, doc_id, title, content, token_count, project_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
          .run(`shared_${chunk.id}_${targetProjectId}`, newId, chunk.title, chunk.content, chunk.token_count, targetProjectId);
      }
      result.knowledge.copied++;
    }

    // 2. 邮件模板
    const tmpls = db.prepare('SELECT id FROM email_templates WHERE project_id = ?').all(sourceProjectId);
    for (const t of tmpls) {
      const tmpl = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(t.id);
      const exists = db.prepare("SELECT id FROM email_templates WHERE project_id = ? AND name = ?").get(targetProjectId, tmpl.name);
      if (exists) { result.emailTemplates.skipped++; continue; }
      db.prepare(`INSERT OR IGNORE INTO email_templates (id, project_id, name, subject, body_html, body_text, category, variables, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`)
        .run(`shared_${tmpl.id}_${targetProjectId}`, targetProjectId, tmpl.name, tmpl.subject, tmpl.body_html, tmpl.body_text, tmpl.category, tmpl.variables);
      result.emailTemplates.copied++;
    }

    // 3. AI 人设
    const srcProject = db.prepare("SELECT ai_persona FROM projects WHERE id = ?").get(sourceProjectId);
    if (srcProject && srcProject.ai_persona && srcProject.ai_persona !== '{}') {
      db.prepare("UPDATE projects SET ai_persona = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(srcProject.ai_persona, targetProjectId);
      result.aiPersona = true;
    }

    // 4. 销售策略
    const srcStrategy = db.prepare("SELECT sales_strategy FROM projects WHERE id = ?").get(sourceProjectId);
    if (srcStrategy && srcStrategy.sales_strategy && srcStrategy.sales_strategy !== '{}') {
      db.prepare("UPDATE projects SET sales_strategy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(srcStrategy.sales_strategy, targetProjectId);
      result.salesStrategy = true;
    }

    // 异步重建 embeddings
    if (result.knowledge.copied > 0) {
      setImmediate(() => rebuildProjectEmbeddings(targetProjectId).catch(e => console.error('[Share] rebuild error:', e.message)));
    }

    console.log(`📦 Share all: ${sourceProjectId} → ${targetProjectId}`, JSON.stringify(result));
    res.json({ sourceProjectId, targetProjectId, ...result });
  } catch (e) { console.error('[Share] project-all error:', e); res.status(500).json({ error: e.message }); }
});

// 重建指定项目的 embeddings
async function rebuildProjectEmbeddings(projectId) {
  const docs = db.prepare('SELECT id FROM knowledge_docs WHERE project_id = ? AND status = "active"').all(projectId);
  const chunks = db.prepare('SELECT id, content FROM knowledge_chunks_db WHERE project_id = ?').all(projectId);
  if (chunks.length === 0) return;
  console.log(`🔄 Rebuilding embeddings for project ${projectId}: ${chunks.length} chunks`);
  // 重用已有的 embedding 预计算逻辑
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const texts = batch.map(c => (c.content || '').slice(0, 512));
    try {
      const resp = await axios.post(`${EMBEDDING_BASE_URL}/v1/embeddings`, { model: EMBEDDING_MODEL, input: texts, encoding_format: 'float' },
        { headers: { 'Authorization': `Bearer ${EMBEDDING_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 30000 });
      const embeddings = resp.data.data || [];
      for (let j = 0; j < embeddings.length && j < batch.length; j++) {
        db.prepare('UPDATE knowledge_chunks_db SET embedding = ? WHERE id = ?').run(JSON.stringify(embeddings[j].embedding), batch[j].id);
      }
    } catch (err) { console.error(`❌ Embedding batch error (offset ${i}):`, err.message); }
    if (i + 20 < chunks.length) await new Promise(r => setTimeout(r, 200));
  }
  console.log(`✅ Embeddings rebuilt for project ${projectId}`);
  projectLog(projectId, 'info', 'knowledge', 'Embeddings重建完成', `${chunks.length} chunks`);
}

// ============================================================
// Analytics: 数据分析 API
// ============================================================

// 1. 销售漏斗转化报表
app.get('/api/analytics/funnel', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const days = parseInt(req.query.days) || 30;
    const since = `datetime('now', '-${days} days')`;
    const stages = ['new_lead', 'discovery', 'needs_analysis', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
    const funnel = {};
    let total = 0;
    for (const stage of stages) {
      // customers 表有准确的 stage 分布，按 project_id 过滤
      let sql = 'SELECT COUNT(*) as c FROM customers WHERE stage = ?';
      const params = [stage];
      if (pid !== 'all') { sql += " AND (project_id = ? OR project_id IS NULL)"; params.push(pid); }
      const row = db.prepare(sql).get(...params);
      funnel[stage] = row?.c || 0;
      total += funnel[stage];
    }
    const conversions = {};
    const stageList = Object.entries(funnel).filter(([, v]) => v > 0);
    for (let i = 1; i < stageList.length; i++) {
      const from = stageList[i - 1][1];
      const to = stageList[i][1];
      conversions[stageList[i][0]] = from > 0 ? ((to / from) * 100).toFixed(1) : '0';
    }
    let recentSql = 'SELECT COUNT(*) as c FROM customers WHERE 1=1';
    const recentParams = [];
    if (pid !== 'all') { recentSql += " AND (project_id = ? OR project_id IS NULL)"; recentParams.push(pid); }
    recentSql += ` AND created_at >= ${since}`;
    const recentCount = db.prepare(recentSql).get(...recentParams)?.c || 0;
    res.json({ total, funnel, conversions, recent: { days, count: recentCount } });
  } catch (e) { console.error('[Analytics] funnel error:', e); res.status(500).json({ error: e.message }); }
});

// 2. 客户来源分析
app.get('/api/analytics/sources', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const pw = projectWhere(pid);
    const whereClause = pw.clause || ' WHERE 1=1';

    const v2 = db.prepare(`SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count FROM customers_v2 ${whereClause} GROUP BY source ORDER BY count DESC`).all(...pw.params);
    const countries = db.prepare(`SELECT COALESCE(country, 'unknown') as country, COUNT(*) as count FROM customers_v2 ${whereClause} GROUP BY country ORDER BY count DESC LIMIT 20`).all(...pw.params);
    const languages = db.prepare(`SELECT COALESCE(language, 'unknown') as language, COUNT(*) as count FROM customers_v2 ${whereClause} GROUP BY language ORDER BY count DESC`).all(...pw.params);
    const businessTypes = db.prepare(`SELECT COALESCE(business_type, 'unknown') as type, COUNT(*) as count FROM customers_v2 ${whereClause} GROUP BY business_type ORDER BY count DESC LIMIT 15`).all(...pw.params);
    const days = parseInt(req.query.days) || 30;
    const timeWhere = pw.clause ? ` AND created_at >= datetime('now', '-${days} days')` : ` WHERE created_at >= datetime('now', '-${days} days')`;
    const trend = db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as count FROM customers_v2 ${pw.clause || ''}${timeWhere} GROUP BY DATE(created_at) ORDER BY date`).all(...pw.params);
    res.json({ sources: v2, countries, languages, businessTypes, trend });
  } catch (e) { console.error('[Analytics] sources error:', e); res.status(500).json({ error: e.message }); }
});

// 3. 回复效率统计
app.get('/api/analytics/efficiency', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const pw = projectWhere(pid);
    const days = parseInt(req.query.days) || 30;
    const since = `datetime('now', '-${days} days')`;
    const timeFilter = pw.clause ? ` AND timestamp >= ${since}` : ` WHERE timestamp >= ${since}`;

    const inbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound'${timeFilter}`).get()?.c || 0;
    const outbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound'${timeFilter}`).get()?.c || 0;

    const replyTimes = db.prepare(`
      SELECT m1.timestamp as inbound_time, m2.timestamp as reply_time
      FROM messages_v2 m1
      JOIN messages_v2 m2 ON m2.customer_id = m1.customer_id AND m2.direction = 'outbound' AND m2.timestamp > m1.timestamp
      WHERE m1.direction = 'inbound'${timeFilter}
      ORDER BY m1.timestamp
    `).all();

    let totalReplyMinutes = 0, replyCount = 0, minReply = Infinity, maxReply = 0;
    for (const rt of replyTimes) {
      const diff = (new Date(rt.reply_time) - new Date(rt.inbound_time)) / 60000;
      if (diff > 0 && diff < 1440) {
        totalReplyMinutes += diff; replyCount++;
        if (diff < minReply) minReply = diff;
        if (diff > maxReply) maxReply = diff;
      }
    }
    const avgReply = replyCount > 0 ? (totalReplyMinutes / replyCount).toFixed(1) : 0;

    const qpw = projectWhere(pid);
    const queueStats = {
      queued: db.prepare(`SELECT COUNT(*) as c FROM message_queue ${qpw.clause || ' WHERE'} ${pid !== 'all' ? 'project_id = ? AND' : ''} status = 'queued'`).get(...qpw.params)?.c || 0,
      sent: db.prepare(`SELECT COUNT(*) as c FROM message_queue ${qpw.clause || ' WHERE'} ${pid !== 'all' ? 'project_id = ? AND' : ''} status = 'sent'`).get(...qpw.params)?.c || 0,
      failed: db.prepare(`SELECT COUNT(*) as c FROM message_queue ${qpw.clause || ' WHERE'} ${pid !== 'all' ? 'project_id = ? AND' : ''} status = 'failed'`).get(...qpw.params)?.c || 0,
    };

    const dailyMsgs = db.prepare(`
      SELECT DATE(timestamp) as date,
             SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
             SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM messages_v2 WHERE timestamp >= ${since}${pid !== 'all' ? ' AND project_id = ?' : ''}
      GROUP BY DATE(timestamp) ORDER BY date
    `).all(...(pid !== 'all' ? [pid] : []));

    const activeCustomers = db.prepare(`SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE timestamp >= ${since}${pid !== 'all' ? ' AND project_id = ?' : ''}`).get(...(pid !== 'all' ? [pid] : []))?.c || 0;

    const responseRate = db.prepare(`SELECT AVG(response_rate) as avg_rate FROM customers_v2 WHERE message_count > 0${pid !== 'all' ? ' AND project_id = ?' : ''}`).get(...(pid !== 'all' ? [pid] : []))?.avg_rate || 0;

    res.json({
      period: { days, inbound, outbound, activeCustomers },
      replyTime: { avg: avgReply, min: minReply === Infinity ? 0 : minReply.toFixed(1), max: maxReply.toFixed(1), sampleCount: replyCount },
      queueStats,
      dailyMsgs,
      avgResponseRate: (responseRate * 100).toFixed(1),
    });
  } catch (e) { console.error('[Analytics] efficiency error:', e); res.status(500).json({ error: e.message }); }
});

// 4. AI对话质量分析
app.get('/api/analytics/ai-quality', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const days = parseInt(req.query.days) || 30;
    const since = `datetime('now', '-${days} days')`;
    const pf = pid !== 'all' ? ' AND project_id = ?' : '';
    const pp = pid !== 'all' ? [pid] : [];

    const totalAiReplies = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ${since}${pf}`).get(...pp)?.c || 0;
    const withThought = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND thought IS NOT NULL AND thought != '' AND timestamp >= ${since}${pf}`).get(...pp)?.c || 0;
    const withRag = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND rag_sources IS NOT NULL AND rag_sources != '[]' AND timestamp >= ${since}${pf}`).get(...pp)?.c || 0;
    const statusDist = db.prepare(`SELECT status, COUNT(*) as count FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ${since}${pf} GROUP BY status ORDER BY count DESC`).all(...pp);
    const failedMsgs = db.prepare(`SELECT m.id, m.customer_id, m.content, m.last_error, m.created_at, c.display_name FROM message_queue m LEFT JOIN customers_v2 c ON m.customer_id = c.id WHERE m.status = 'failed'${pid !== 'all' ? ' AND m.project_id = ?' : ''} ORDER BY m.created_at DESC LIMIT 20`).all(...pp);
    const retryStats = db.prepare(`SELECT COUNT(*) as total_retries, SUM(retry_count) as total_attempts, AVG(retry_count) as avg_retries FROM message_queue WHERE retry_count > 0${pid !== 'all' ? ' AND project_id = ?' : ''}`).get(...pp);
    const summaryCount = db.prepare(`SELECT COUNT(*) as c FROM conversation_summaries WHERE created_at >= ${since}${pf}`).get(...pp)?.c || 0;

    res.json({
      period: { days },
      aiReplies: { total: totalAiReplies, withThought, withRag },
      thoughtRate: totalAiReplies > 0 ? ((withThought / totalAiReplies) * 100).toFixed(1) : '0',
      ragRate: totalAiReplies > 0 ? ((withRag / totalAiReplies) * 100).toFixed(1) : '0',
      statusDist,
      failedMsgs,
      retryStats: retryStats || { total_retries: 0, total_attempts: 0, avg_retries: 0 },
      summaryCount,
    });
  } catch (e) { console.error('[Analytics] ai-quality error:', e); res.status(500).json({ error: e.message }); }
});

// 5. 数据导出
app.get('/api/analytics/export', (req, res) => {
  try {
    const type = req.query.type || 'customers';
    const format = req.query.format || 'csv';
    const pid = req.query.projectId || 'default';
    const dateStart = req.query.dateStart || '';
    const dateEnd = req.query.dateEnd || '';
    const direction = req.query.direction || 'all';
    const customerStatus = req.query.status || '';

    // Build project filter
    const pf = pid !== 'all' ? ' WHERE project_id = ?' : '';
    const pp = pid !== 'all' ? [pid] : [];

    // Date range clause
    const dateClauses = [];
    if (dateStart) dateClauses.push("created_at >= ?");
    if (dateEnd) dateClauses.push("created_at <= ?");

    let filename, data;
    if (type === 'customers') {
      let sql = `SELECT id, display_name, phone, country, status, source, language, business_type, message_count, our_reply_count, health_score, created_at, updated_at FROM customers_v2`;
      const params = [];
      const where = [];
      if (pid !== 'all') where.push('project_id = ?');
      if (dateStart) where.push('created_at >= ?');
      if (dateEnd) where.push('created_at <= ?');
      if (customerStatus) where.push('status = ?');
      if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
      if (pid !== 'all') params.push(pid);
      if (dateStart) params.push(dateStart);
      if (dateEnd) params.push(dateEnd + ' 23:59:59');
      if (customerStatus) params.push(customerStatus);
      sql += ' ORDER BY created_at DESC';
      data = db.prepare(sql).all(...params);
      const datePart = dateStart ? `_${dateStart}_${dateEnd || dateStart}` : '';
      filename = `customers${datePart}`;
    } else if (type === 'messages') {
      let sql = `SELECT m.id, m.customer_id, m.direction, m.content, m.status, m.timestamp, c.display_name as customer_name FROM messages_v2 m LEFT JOIN customers_v2 c ON m.customer_id = c.id`;
      const params = [];
      const where = [];
      if (pid !== 'all') where.push('m.project_id = ?');
      if (dateStart) where.push('m.timestamp >= ?');
      if (dateEnd) where.push('m.timestamp <= ?');
      if (direction !== 'all') where.push('m.direction = ?');
      if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
      if (pid !== 'all') params.push(pid);
      if (dateStart) params.push(dateStart);
      if (dateEnd) params.push(dateEnd + ' 23:59:59');
      if (direction !== 'all') params.push(direction);
      sql += ' ORDER BY m.timestamp DESC LIMIT 10000';
      data = db.prepare(sql).all(...params);
      const datePart = dateStart ? `_${dateStart}_${dateEnd || dateStart}` : '';
      filename = `messages${datePart}`;
    } else if (type === 'deals') {
      let sql = `SELECT d.id, d.customer_id, d.stage, d.total_amount, d.currency, d.deposit_amount, d.balance_amount, d.order_date, d.shipping_date, d.delivery_date, d.created_at, c.display_name as customer_name FROM deals d LEFT JOIN customers_v2 c ON d.customer_id = c.id`;
      const params = [];
      const where = [];
      if (pid !== 'all') where.push('d.project_id = ?');
      if (dateStart) where.push('d.created_at >= ?');
      if (dateEnd) where.push('d.created_at <= ?');
      if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
      if (pid !== 'all') params.push(pid);
      if (dateStart) params.push(dateStart);
      if (dateEnd) params.push(dateEnd + ' 23:59:59');
      sql += ' ORDER BY d.created_at DESC';
      data = db.prepare(sql).all(...params);
      const datePart = dateStart ? `_${dateStart}_${dateEnd || dateStart}` : '';
      filename = `deals${datePart}`;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: customers, messages, deals' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.json(data);
    }

    // CSV
    if (!data || data.length === 0) return res.status(404).json({ error: 'No data to export' });
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      csvRows.push(headers.map(h => {
        let val = String(row[h] ?? '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(','));
    }
    const csv = '\uFEFF' + csvRows.join('\n'); // BOM for Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
  } catch (e) { console.error('[Analytics] export error:', e); res.status(500).json({ error: e.message }); }
});

// 6. 报表生成
function generateReport(type, projectId) {
  const now = new Date();
  const daysBack = type === 'weekly' ? 7 : 1;
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - daysBack);
  periodStart.setHours(0, 0, 0, 0);

  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - daysBack);

  const dateRangeStart = periodStart.toISOString().slice(0, 10);
  const dateRangeEnd = now.toISOString().slice(0, 10);

  const pf = projectId !== 'all' ? ' AND project_id = ?' : '';
  const pp = projectId !== 'all' ? [projectId] : [];

  // Current period stats
  const newCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const activeCustomers = db.prepare(`SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const inboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const outboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;

  // Previous period comparison
  const prevNewCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ? AND created_at < ?${pf}`).get(prevStart.toISOString(), periodStart.toISOString(), ...pp).c;
  const prevInbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND timestamp >= ? AND timestamp < ?${pf}`).get(prevStart.toISOString(), periodStart.toISOString(), ...pp).c;
  const prevOutbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ? AND timestamp < ?${pf}`).get(prevStart.toISOString(), periodStart.toISOString(), ...pp).c;

  // Funnel change
  const funnelStages = ['new_lead', 'discovery', 'needs_analysis', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
  const currentFunnel = {};
  const prevFunnel = {};
  for (const stage of funnelStages) {
    currentFunnel[stage] = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE status = ?${pf}`).get(stage, ...pp).c;
    prevFunnel[stage] = db.prepare(`SELECT COUNT(*) as c FROM deals WHERE stage = ? AND created_at >= ? AND created_at < ?${pf}`).get(stage, prevStart.toISOString(), periodStart.toISOString(), ...pp).c;
  }

  // Avg reply time (current period)
  const replyTimes = db.prepare(`
    SELECT m1.timestamp as reply_ts, m2.timestamp as inbound_ts,
           CAST((julianday(m1.timestamp) - julianday(m2.timestamp)) * 1440 AS INTEGER) as minutes
    FROM messages_v2 m1
    JOIN messages_v2 m2 ON m1.customer_id = m2.customer_id AND m1.direction = 'outbound' AND m2.direction = 'inbound'
      AND m1.timestamp > m2.timestamp
      AND m1.timestamp = (
        SELECT MIN(m3.timestamp) FROM messages_v2 m3
        WHERE m3.customer_id = m2.customer_id AND m3.direction = 'outbound' AND m3.timestamp > m2.timestamp
      )
    WHERE m1.timestamp >= ?${pf.replace('AND', 'AND m1.')}
    LIMIT 100
  `).get(periodStart.toISOString(), ...pp);
  const avgReplyTime = replyTimes && replyTimes.minutes ? Math.round(replyTimes.minutes) : '-';

  // AI quality metrics
  const aiReplies = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const thoughtCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND thinking_tokens > 0 AND timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const ragCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND rag_used = 1 AND timestamp >= ?${pf}`).get(periodStart.toISOString(), ...pp).c;
  const thoughtRate = aiReplies > 0 ? ((thoughtCount / aiReplies) * 100).toFixed(1) : '0.0';
  const ragRate = aiReplies > 0 ? ((ragCount / aiReplies) * 100).toFixed(1) : '0.0';

  // Pending follow-ups
  const pendingFollowUps = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE next_follow_up <= ? AND next_follow_up IS NOT NULL${pf}`).get(now.toISOString(), ...pp).c;

  const report = {
    type,
    projectId: projectId || 'default',
    period: { start: dateRangeStart, end: dateRangeEnd },
    generatedAt: now.toISOString(),
    summary: {
      newCustomers,
      activeCustomers,
      inboundMessages: inboundCount,
      outboundMessages: outboundCount,
      avgReplyTime,
      pendingFollowUps,
    },
    comparison: {
      newCustomersChange: prevNewCustomers > 0 ? (((newCustomers - prevNewCustomers) / prevNewCustomers) * 100).toFixed(1) : null,
      inboundChange: prevInbound > 0 ? (((inboundCount - prevInbound) / prevInbound) * 100).toFixed(1) : null,
      outboundChange: prevOutbound > 0 ? (((outboundCount - prevOutbound) / prevOutbound) * 100).toFixed(1) : null,
    },
    funnel: { current: currentFunnel, previous: prevFunnel },
    aiQuality: { totalReplies: aiReplies, thoughtRate, ragRate },
  };

  // Store report
  db.prepare('INSERT INTO reports (type, project_id, content, date_range_start, date_range_end) VALUES (?, ?, ?, ?, ?)')
    .run(type, projectId || 'default', JSON.stringify(report), dateRangeStart, dateRangeEnd);

  return report;
}

app.post('/api/analytics/report', (req, res) => {
  try {
    const { type, projectId } = req.body;
    if (!type || !['daily', 'weekly'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use: daily, weekly' });
    }
    const report = generateReport(type, projectId || 'default');
    res.json(report);
  } catch (e) { console.error('[Analytics] report generation error:', e); res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/reports', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const limit = parseInt(req.query.limit) || 10;
    const reports = db.prepare(
      'SELECT id, type, project_id, content, date_range_start, date_range_end, created_at FROM reports WHERE project_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(pid, limit).map(r => ({ ...r, content: JSON.parse(r.content) }));
    res.json(reports);
  } catch (e) { console.error('[Analytics] reports list error:', e); res.status(500).json({ error: e.message }); }
});

// GET /api/analytics/reports/daily — 每日报表
app.get('/api/analytics/reports/daily', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const nextDay = date + ' 23:59:59';
    const pf = pid !== 'all' ? ' AND project_id = ?' : '';
    const pp = pid !== 'all' ? [pid] : [];

    const messageCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const inboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const outboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const newCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ? AND created_at <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const activeCustomers = db.prepare(`SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;

    // 转化率：当天新客户中状态非 new_lead 的比例
    const convertedNew = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ? AND created_at <= ? AND status != 'new_lead'${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const conversionRate = newCustomers > 0 ? ((convertedNew / newCustomers) * 100).toFixed(1) : '0.0';

    // AI 回复质量：outbound 消息的 thought/rag 使用率
    const aiReplies = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const withThought = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND thought IS NOT NULL AND thought != '' AND timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const withRag = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND rag_sources IS NOT NULL AND rag_sources != '[]' AND timestamp >= ? AND timestamp <= ?${pf}`).get(date, nextDay, ...pp)?.c || 0;
    const thoughtRate = aiReplies > 0 ? ((withThought / aiReplies) * 100).toFixed(1) : '0.0';
    const ragRate = aiReplies > 0 ? ((withRag / aiReplies) * 100).toFixed(1) : '0.0';

    res.json({
      date,
      projectId: pid,
      messages: { total: messageCount, inbound: inboundCount, outbound: outboundCount },
      customers: { new: newCustomers, active: activeCustomers },
      conversionRate,
      aiQuality: { aiReplies, thoughtRate, ragRate },
    });
  } catch (e) { console.error('[Analytics] daily report error:', e); res.status(500).json({ error: e.message }); }
});

// GET /api/analytics/reports/weekly — 周报
app.get('/api/analytics/reports/weekly', (req, res) => {
  try {
    const pid = req.query.projectId || 'default';
    const weekStart = req.query.weekStart || (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const weekEnd = req.query.weekEnd || (() => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 6);
      return d.toISOString().slice(0, 10) + ' 23:59:59';
    })();
    const pf = pid !== 'all' ? ' AND project_id = ?' : '';
    const pp = pid !== 'all' ? [pid] : [];

    // 汇总本周数据
    const totalMessages = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const inboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const outboundCount = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const newCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ? AND created_at <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const activeCustomers = db.prepare(`SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const convertedNew = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE created_at >= ? AND created_at <= ? AND status != 'new_lead'${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const conversionRate = newCustomers > 0 ? ((convertedNew / newCustomers) * 100).toFixed(1) : '0.0';
    const aiReplies = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const withThought = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND thought IS NOT NULL AND thought != '' AND timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const withRag = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND rag_sources IS NOT NULL AND rag_sources != '[]' AND timestamp >= ? AND timestamp <= ?${pf}`).get(weekStart, weekEnd, ...pp)?.c || 0;
    const thoughtRate = aiReplies > 0 ? ((withThought / aiReplies) * 100).toFixed(1) : '0.0';
    const ragRate = aiReplies > 0 ? ((withRag / aiReplies) * 100).toFixed(1) : '0.0';

    // 每日明细
    const dailyBreakdown = db.prepare(`
      SELECT DATE(timestamp) as date,
             COUNT(*) as total,
             SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
             SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM messages_v2 WHERE timestamp >= ? AND timestamp <= ?${pf}
      GROUP BY DATE(timestamp) ORDER BY date
    `).all(weekStart, weekEnd, ...pp);

    const dailyNewCustomers = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as new_count
      FROM customers_v2 WHERE created_at >= ? AND created_at <= ?${pf}
      GROUP BY DATE(created_at) ORDER BY date
    `).all(weekStart, weekEnd, ...pp);

    // 合并每日数据
    const dateMap = {};
    for (const d of dailyBreakdown) {
      dateMap[d.date] = { date: d.date, messages: d.total, inbound: d.inbound, outbound: d.outbound, newCustomers: 0 };
    }
    for (const d of dailyNewCustomers) {
      if (dateMap[d.date]) dateMap[d.date].newCustomers = d.new_count;
      else dateMap[d.date] = { date: d.date, messages: 0, inbound: 0, outbound: 0, newCustomers: d.new_count };
    }

    res.json({
      weekStart,
      weekEnd,
      projectId: pid,
      summary: {
        messages: { total: totalMessages, inbound: inboundCount, outbound: outboundCount },
        customers: { new: newCustomers, active: activeCustomers },
        conversionRate,
        aiQuality: { aiReplies, thoughtRate, ragRate },
      },
      dailyBreakdown: Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (e) { console.error('[Analytics] weekly report error:', e); res.status(500).json({ error: e.message }); }
});

// GET /api/analytics/reports/export — 报表导出
app.get('/api/analytics/reports/export', (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const pid = req.query.projectId || 'default';
    const type = req.query.type || 'daily';
    const dateStart = req.query.dateStart || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    const dateEnd = req.query.dateEnd || new Date().toISOString().slice(0, 10);
    const endOfDay = dateEnd + ' 23:59:59';
    const pf = pid !== 'all' ? ' AND project_id = ?' : '';
    const pp = pid !== 'all' ? [pid] : [];

    // 生成每日汇总数据
    const dailyData = db.prepare(`
      SELECT DATE(m.timestamp) as date,
             COUNT(*) as messages,
             SUM(CASE WHEN m.direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
             SUM(CASE WHEN m.direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
             (SELECT COUNT(*) FROM customers_v2 WHERE DATE(created_at) = DATE(m.timestamp)${pf}) as new_customers,
             (SELECT COUNT(*) FROM customers_v2 WHERE DATE(created_at) = DATE(m.timestamp) AND status != 'new_lead'${pf}) as converted
      FROM messages_v2 m
      WHERE m.timestamp >= ? AND m.timestamp <= ?${pf.replace('AND', 'AND m.')}
      GROUP BY DATE(m.timestamp) ORDER BY date
    `).all(dateStart, endOfDay, ...pp);

    // AI 质量每日统计
    const dailyAi = db.prepare(`
      SELECT DATE(timestamp) as date,
             COUNT(*) as ai_replies,
             SUM(CASE WHEN thought IS NOT NULL AND thought != '' THEN 1 ELSE 0 END) as with_thought,
             SUM(CASE WHEN rag_sources IS NOT NULL AND rag_sources != '[]' THEN 1 ELSE 0 END) as with_rag
      FROM messages_v2 WHERE direction = 'outbound' AND status = 'sent' AND timestamp >= ? AND timestamp <= ?${pf}
      GROUP BY DATE(timestamp) ORDER BY date
    `).all(dateStart, endOfDay, ...pp);

    const aiMap = {};
    for (const row of dailyAi) aiMap[row.date] = row;

    // 合并
    const reportRows = dailyData.map(row => {
      const ai = aiMap[row.date] || { ai_replies: 0, with_thought: 0, with_rag: 0 };
      return {
        date: row.date,
        messages: row.messages || 0,
        inbound: row.inbound || 0,
        outbound: row.outbound || 0,
        new_customers: row.new_customers || 0,
        converted: row.converted || 0,
        conversion_rate: row.new_customers > 0 ? ((row.converted / row.new_customers) * 100).toFixed(1) + '%' : '0.0%',
        ai_replies: ai.ai_replies || 0,
        thought_rate: ai.ai_replies > 0 ? ((ai.with_thought / ai.ai_replies) * 100).toFixed(1) + '%' : '0.0%',
        rag_rate: ai.ai_replies > 0 ? ((ai.with_rag / ai.ai_replies) * 100).toFixed(1) + '%' : '0.0%',
      };
    });

    const filename = `report_${type}_${dateStart}_${dateEnd}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.json({ project_id: pid, period: { start: dateStart, end: dateEnd }, type, data: reportRows });
    }

    // CSV
    if (!reportRows.length) return res.status(404).json({ error: 'No report data for the selected period' });
    const headers = Object.keys(reportRows[0]);
    const csvRows = [headers.join(',')];
    for (const row of reportRows) {
      csvRows.push(headers.map(h => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('\uFEFF' + csvRows.join('\n'));
  } catch (e) { console.error('[Analytics] report export error:', e); res.status(500).json({ error: e.message }); }
});

// ============================================================
// Phase 6: Health Check + Self-check
// ============================================================

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const mem = process.memoryUsage();
    const totalMemMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const usedMemMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const memPercent = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);

    // Channel status
    const channelList = channels.getChannels ? channels.getChannels() : [];
    const channelStatus = channelList.map(ch => ({
      id: ch.id,
      label: ch.label,
      enabled: ch.enabled !== false,
      adapter: ch.adapter || 'unknown'
    }));

    // Queue stats
    let queueStats = { queued: 0, sent: 0, failed: 0 };
    if (db) {
      try {
        queueStats.queued = db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'queued'").get().c;
        queueStats.sent = db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'sent'").get().c;
        queueStats.failed = db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'failed'").get().c;
      } catch(e) { console.error('[Queue] queueStats query failed:', e); }
    }

    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: '2.0.0',
      memory: {
        heapUsedMB: parseFloat(usedMemMB),
        heapTotalMB: parseFloat(totalMemMB),
        percent: parseFloat(memPercent)
      },
      channels: channelStatus,
      queue: queueStats,
      knowledge: {
        chunks: totalKnowledgeChunks(),
        embeddings: chunkEmbeddings.size
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Self-check: runs every 60s
function selfCheck() {
  try {
    // Check DB connection
    if (db) {
      db.prepare('SELECT 1').get();
    } else {
      console.error('⚠️ Self-check: DB not initialized');
    }

    // Check memory
    const mem = process.memoryUsage();
    const memPercent = (mem.heapUsed / mem.heapTotal) * 100;
    if (memPercent > 80) {
      console.warn(`⚠️ Self-check: Memory usage high: ${memPercent.toFixed(1)}% (${(mem.heapUsed/1024/1024).toFixed(1)}MB / ${(mem.heapTotal/1024/1024).toFixed(1)}MB)`);
      // Try to free memory
      if (global.gc) global.gc();
      embeddingCache.clear();
    }

    // Log stats
    console.log(`💚 Self-check OK | uptime: ${Math.floor(process.uptime())}s | mem: ${memPercent.toFixed(1)}%`);
  } catch (err) {
    console.error('❌ Self-check failed:', err.message);
  }
}

// ============================================================
// Phase 6: Restart Recovery
// ============================================================

function recoverOnStartup() {
  if (!db) return;

  try {
    // 1. Reset stuck 'processing' messages to 'received'
    const processing = db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE status = 'processing'").get().c;
    if (processing > 0) {
      db.prepare("UPDATE messages_v2 SET status = 'received' WHERE status = 'processing'").run();
      console.log(`🔄 Recovery: Reset ${processing} stuck processing messages to received`);
    }

    // 2. Re-queue failed messages that haven't exceeded retries
    const failedMsgs = db.prepare(
      "SELECT * FROM messages_v2 WHERE status = 'failed' AND retry_count < ? AND direction = 'outbound' ORDER BY timestamp DESC LIMIT 20"
    ).all(MAX_RETRIES);

    for (const msg of failedMsgs) {
      const alreadyQueued = db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE message_id = ? AND status = 'queued'").get(msg.id).c;
      if (alreadyQueued === 0) {
        enqueueRetry(msg.id, msg.customer_id, msg.account_id, msg.channel, msg.content);
      }
    }
    if (failedMsgs.length > 0) {
      console.log(`🔄 Recovery: Re-queued ${failedMsgs.length} failed messages`);
    }

    // 3. Check pending messages (intervene mode)
    const pending = db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE status = 'pending'").get().c;
    if (pending > 0) {
      console.log(`🔄 Recovery: ${pending} pending messages preserved for human review`);
    }

    // 4. Check message_queue for any leftover queued items
    const queued = db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'queued'").get().c;
    if (queued > 0) {
      console.log(`🔄 Recovery: ${queued} messages already in retry queue`);
    }
  } catch (err) {
    console.error('❌ Startup recovery error:', err.message);
  }
}

// ============================================================
// Phase 6: Uncaught Exception Handler
// ============================================================

process.on('uncaughtException', (err) => {
  console.error('💀 Uncaught Exception:', err.message, err.stack);
  // Don't crash - try to keep running
  // The self-check will monitor health
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💀 Unhandled Rejection:', reason);
});

// ============================================================
// 定时任务
// ============================================================

// 每天凌晨 3 点压缩旧消息
cron.schedule('0 3 * * *', () => {
  compressOldMessages();
});

// 每小时刷新知识库（支持热更新）
cron.schedule('0 * * * *', async () => {
  console.log('🔄 Refreshing knowledge base...');
  loadKnowledge();
  chunkEmbeddings.clear();
  await precomputeEmbeddings();
});

// Phase 6: Retry queue scanner (every 30s)
cron.schedule('*/30 * * * * *', () => {
  processRetryQueue();
});

// Phase 6: Self-check (every 60s)
cron.schedule('*/60 * * * * *', () => {
  selfCheck();
});

// Daily report generation (09:00 daily, configurable via env)
const DAILY_REPORT_ENABLED = process.env.DAILY_REPORT_ENABLED !== 'false';
const DAILY_REPORT_CRON = process.env.DAILY_REPORT_CRON || '0 9 * * *';
if (DAILY_REPORT_ENABLED) {
  cron.schedule(DAILY_REPORT_CRON, () => {
    try {
      const projects = db.prepare("SELECT id FROM projects WHERE status = 'active'").all();
      for (const p of projects) {
        const report = generateReport('daily', p.id);
        console.log(`[DailyReport] Generated for ${p.id}: ${report.summary.newCustomers} new customers`);
      }
    } catch (e) { console.error('[DailyReport] generation error:', e); }
  });
  console.log(`[DailyReport] Scheduled at ${DAILY_REPORT_CRON} (enabled)`);
} else {
  console.log('[DailyReport] Disabled via DAILY_REPORT_ENABLED');
}

// Follow-up system initialization
initFollowUpCron();

// ============================================================
// 启动
// ============================================================

async function start() {
  console.log('🚀 Starting WhatsApp AI Sales Manager...');

  // 初始化数据库
  initDB();

  // 加载知识库
  loadKnowledge();

  // 预计算 embeddings
  if (totalKnowledgeChunks() > 0) {
    await precomputeEmbeddings();
  }

  // 初始化适配器（从 channels 模块加载多账号配置）
  channels.initAllAdapters();

  // Phase 6: Restart recovery
  recoverOnStartup();

  // 向后兼容：保留 activeAdapter 用于旧的单账号 webhook 端点
  activeAdapter = new KapsoAdapter({
    id: 'default',
    label: 'Kapso 默认账号',
    apiKey: KAPSO_API_KEY,
    apiBase: KAPSO_API_BASE,
    phoneNumberId: PHONE_NUMBER_ID,
    webhookVerifyToken: WEBHOOK_VERIFY_TOKEN
  });
  console.log(`🔌 Active adapter: Kapso (apiKey=${KAPSO_API_KEY ? 'configured' : 'missing'})`);

  // 初始化 Meta Cloud API 适配器（如果有配置）
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (META_ACCESS_TOKEN) {
    const metaAdapter = new MetaCloudAdapter({
      id: 'meta-default',
      label: 'Meta Cloud API',
      accessToken: META_ACCESS_TOKEN,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID,
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
      appSecret: process.env.META_APP_SECRET,
      apiVersion: process.env.META_API_VERSION
    });
    metaAdapters.set('default', metaAdapter);
    channels.registerAdapter('default', { adapter: metaAdapter, type: 'meta', channel: { id: 'default', adapter: 'meta', enabled: true } });
    console.log('🔌 Meta Cloud adapter initialized (accountId=default)');
  }

  // 启动 HTTP 服务
  app.listen(PORT, () => {
    console.log(`\n🦊 YuKoLi AI Sales Manager "貂貂" is ready!`);
    console.log(`📱 Phone Number ID: ${PHONE_NUMBER_ID}`);
    console.log(`🤖 AI Model: ${AI_MODEL}`);
    console.log(`📚 Knowledge: ${totalKnowledgeChunks()} chunks, ${chunkEmbeddings.size} embeddings`);
    console.log(`🔍 Embedding: ${EMBEDDING_MODEL}`);
    console.log(`🔄 Reranker: ${RERANKER_MODEL}`);
    console.log(`🗄️ CRM DB: ${DB_PATH}`);
    console.log(`🌐 Port: ${PORT}`);
  });
}

start().catch(err => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});

// ============================================================
// Admin 后台 (Port 8000)
// ============================================================
const ADMIN_TOKEN_DEFAULT = process.env.ADMIN_TOKEN || 'yu180601';
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return { adminToken: ADMIN_TOKEN_DEFAULT, backupTime: '03:00', backupEnabled: true, backupRetentionDays: 3 };
  }
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getAdminToken() {
  return loadSettings().adminToken;
}

const adminApp = express();
adminApp.use(express.json());

// 日志收集
const adminLogs = [];
const origConsole = { log: console.log, error: console.error, warn: console.warn };
function captureLog(level, args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  adminLogs.unshift({ time: new Date().toISOString(), level, msg, type: 'system' });
  if (adminLogs.length > 500) adminLogs.length = 500;
}
console.log = (...args) => { captureLog('info', args); origConsole.log(...args); };
console.error = (...args) => { captureLog('error', args); origConsole.error(...args); };
console.warn = (...args) => { captureLog('warn', args); origConsole.warn(...args); };

// 项目级持久化日志（写入 DB + 缓存到内存）
function projectLog(projectId, level, action, msg, detail = '') {
  const time = new Date().toISOString();
  try {
    db.prepare('INSERT INTO system_logs (project_id, level, action, message, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(projectId || null, level, action, msg, detail);
  } catch(e) {}
  // 同步到内存缓存
  adminLogs.unshift({ time, level, msg: `[${action}] ${msg}${detail ? ' — ' + detail : ''}`, type: 'project', project_id: projectId, action });
  if (adminLogs.length > 500) adminLogs.length = 500;
}

// Auth middleware (dynamic token)
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${getAdminToken()}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

adminApp.use('/admin/api', adminAuth);

// Proxy /api/* requests from admin to main app (port 3000)
adminApp.use('/api', (req, res) => {
  const url = `http://localhost:${PORT}${req.originalUrl}`;
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  const opts = {
    method: req.method,
    headers,
    timeout: 10000,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    opts.body = JSON.stringify(req.body);
  }
  fetch(url, opts)
    .then(r => {
      res.status(r.status);
      r.headers.forEach((v, k) => res.setHeader(k, v));
      return r.text();
    })
    .then(body => res.send(body))
    .catch(e => res.status(502).json({ error: 'Backend unreachable', detail: e.message }));
});

// Channel Management
adminApp.get('/admin/api/channels', (req, res) => {
  const { projectId } = req.query;
  let list = channels.getChannels();
  // 按项目过滤：返回绑定了该项目的账号 + 未绑定项目的账号
  if (projectId && projectId !== 'default') {
    list = list.filter(ch => ch.projectId === projectId || !ch.projectId);
  }
  res.json(list);
});

adminApp.post('/admin/api/channels', (req, res) => {
  try {
    const ch = channels.addChannel(req.body);
    res.json(ch);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminApp.put('/admin/api/channels/:id', (req, res) => {
  const ch = channels.updateChannel(req.params.id, req.body);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json(ch);
});

adminApp.delete('/admin/api/channels/:id', (req, res) => {
  const ok = channels.deleteChannel(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Channel not found' });
  res.json({ ok: true });
});

adminApp.post('/admin/api/channels/:id/toggle', (req, res) => {
  const ch = channels.toggleChannel(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json(ch);
});

// Status
adminApp.get('/admin/api/status', (req, res) => {
  const { projectId } = req.query;
  let customerCount = 0;
  if (db) {
    if (projectId && projectId !== 'default') {
      customerCount = db.prepare("SELECT COUNT(*) as c FROM customers_v2 WHERE project_id = ? OR project_id = 'default'").get(projectId).c;
    } else {
      customerCount = db.prepare('SELECT COUNT(*) as c FROM customers_v2').get().c;
    }
  }
  // Knowledge chunks filter by project
  let knowledgeCount = totalKnowledgeChunks();
  if (projectId && projectId !== 'default') {
    const projChunks = knowledgeChunks.get(projectId) || [];
    knowledgeCount = projChunks.length;
  }
  res.json({
    status: 'running',
    uptime: Math.floor(process.uptime()),
    knowledgeChunks: knowledgeCount,
    embeddingsCached: chunkEmbeddings.size,
    model: AI_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    rerankerModel: RERANKER_MODEL,
    memoryUsage: process.memoryUsage(),
    customers: customerCount,
    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
  });
});

// 并发控制状态 API
adminApp.get('/admin/api/concurrency', (req, res) => {
  res.json(getConcurrencyStatus());
});

// Customers list
adminApp.get('/admin/api/customers', (req, res) => {
  try {
    const { followUp, projectId } = req.query;
    const pf = projectId && projectId !== 'default' ? " AND (c.project_id = ? OR c.project_id = 'default')" : '';
    if (followUp === 'pending') {
      const now = sqlNow();
      const customers = db.prepare(
        `SELECT c.id as v2_id, c.phone, c.display_name as name, c.status as stage, c.country, c.language, c.email,
                c.follow_up_count, c.last_follow_up_at, c.next_follow_up, c.message_count, c.created_at, c.updated_at,
                c.sentiment_trend, c.churn_risk, c.last_message_type
         FROM customers_v2 c
         WHERE c.next_follow_up IS NOT NULL AND c.next_follow_up != '' AND c.next_follow_up <= ?
         AND c.status NOT IN ('won', 'lost', 'unsubscribed', 'closed_won', 'closed_lost')${pf}
         ORDER BY c.next_follow_up ASC LIMIT 200`
      ).all(now);
      res.json(customers);
    } else {
      // V2: query customers_v2 with full fields (email, sentiment, churn, etc.)
      const customers = db.prepare(
        `SELECT c.id as v2_id, c.phone, c.display_name as name, c.status as stage, c.country, c.language, c.email,
                c.health_score as grade, c.profile, c.notes, c.tags, c.message_count, c.created_at, c.updated_at,
                c.sentiment_trend, c.churn_risk, c.last_message_type,
                (SELECT MAX(timestamp) FROM messages_v2 WHERE customer_id = c.id) as last_contact
         FROM customers_v2 c WHERE 1=1${pf} ORDER BY c.updated_at DESC LIMIT 200`
      ).all();
      res.json(customers);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Customer detail
adminApp.get('/admin/api/customers/:phone', (req, res) => {
  try {
    const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(req.params.phone);
    if (!binding) return res.status(404).json({ error: 'Customer not found' });
    const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(binding.customer_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const messages = getRecentMessages(req.params.phone, 50, binding.customer_id);
    const summaries = db.prepare(
      'SELECT summary, message_count, cutoff_time, created_at FROM conversation_summaries WHERE phone = ? ORDER BY created_at DESC'
    ).all(req.params.phone);
    res.json({ ...customer, phone: req.params.phone, messages, summaries });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update customers_v2 fields (manual edit)
// Lookup customer v2 id by phone (for batch operations)
adminApp.get('/admin/api/v2/lookup', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const v2 = db.prepare('SELECT id, email FROM customers_v2 WHERE phone = ?').get(phone);
    if (!v2) return res.status(404).json({ error: 'Not found' });
    res.json(v2);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.put('/admin/api/customers-v2/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM customers_v2 WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const allowed = ['display_name', 'country', 'language', 'business_type', 'purchase_intent', 'source', 'notes', 'tags', 'status', 'email'];
    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No fields to update' });
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE customers_v2 SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(fields), id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[CustomerV2] update error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Add customer notes
adminApp.post('/admin/api/customers/:phone/notes', (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ error: 'Notes required' });
    const binding = db.prepare('SELECT customer_id FROM customer_channels WHERE contact_id = ?').get(req.params.phone);
    if (binding) updateCustomerV2(binding.customer_id, { notes });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logs
adminApp.get('/admin/api/logs', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const { projectId, level, type } = req.query;

    // 1. 从 DB 读取项目日志（持久化）
    let dbLogs = [];
    const conds = [];
    const params = [];
    if (projectId && projectId !== 'default' && projectId !== 'all') {
      conds.push('(project_id = ? OR project_id IS NULL)');
      params.push(projectId);
    }
    if (level && level !== 'all') {
      conds.push('level = ?');
      params.push(level);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    dbLogs = db.prepare(`SELECT time, level, message as msg, project_id, action, 'project' as type FROM (SELECT created_at as time, level, message, project_id, action FROM system_logs ${where} ORDER BY created_at DESC LIMIT ?)`)
      .all(...params, limit).map(r => ({ ...r, type: 'project' }));

    // 2. 合并内存系统日志
    let memLogs = adminLogs;
    if (type === 'project') memLogs = [];
    else if (type === 'system') dbLogs = [];
    if (level && level !== 'all') memLogs = memLogs.filter(l => l.level === level);

    // 3. 合并去重（按 time+msg），排序
    const seen = new Set();
    const merged = [];
    for (const l of [...dbLogs, ...memLogs]) {
      const key = l.time + '|' + (l.msg || '').slice(0, 80);
      if (!seen.has(key)) { seen.add(key); merged.push(l); }
    }
    merged.sort((a, b) => b.time.localeCompare(a.time));
    res.json(merged.slice(0, limit));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Chat test
// Chat history for test page
adminApp.get('/admin/api/chat/history/:phone', (req, res) => {
  try {
    const { projectId } = req.query;
    let messages;
    if (projectId && projectId !== 'default') {
      // 通过 customers_v2.project_id 关联过滤
      messages = db.prepare(`
        SELECT m.direction, m.content, m.thought, m.rag_sources, m.timestamp as created_at
        FROM messages_v2 m
        JOIN customers_v2 c ON m.customer_id = c.id
        WHERE c.phone = ? AND c.project_id = ?
        ORDER BY m.timestamp DESC LIMIT 20
      `).all(req.params.phone, projectId).reverse();
    } else {
      messages = db.prepare(`
        SELECT m.direction, m.content, m.thought, m.rag_sources, m.timestamp as created_at
        FROM messages_v2 m
        JOIN customer_channels cc ON m.customer_id = cc.customer_id
        WHERE cc.contact_id = ?
        ORDER BY m.timestamp DESC LIMIT 20
      `).all(req.params.phone).reverse();
    }
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminApp.post('/admin/api/chat', async (req, res) => {
  try {
    const { message, phone, projectId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const testPhone = phone || 'test_admin';

    // 查找指定项目下的账号，用其 accountId 确保数据归属正确项目
    let accountId = 'default';
    if (projectId && projectId !== 'default') {
      const ch = db.prepare("SELECT id FROM channels WHERE project_id = ? LIMIT 1").get(projectId);
      if (ch) accountId = ch.id;
    }

    const result = await generateSalesReply(testPhone, message, accountId);
    res.json({ reply: result.reply, phone: testPhone, time: new Date().toISOString(), thought: result.thought, rag_sources: result.ragSources });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Knowledge reload
adminApp.post('/admin/api/knowledge/reload', async (req, res) => {
  try {
    loadKnowledge();
    chunkEmbeddings.clear();
    await precomputeEmbeddings();
    res.json({ ok: true, chunks: totalKnowledgeChunks(), embeddings: chunkEmbeddings.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Knowledge rebuild
adminApp.post('/admin/api/knowledge/rebuild', async (req, res) => {
  try {
    chunkEmbeddings.clear();
    embeddingCache.clear();
    loadKnowledge();
    await precomputeEmbeddings();
    res.json({ ok: true, chunks: totalKnowledgeChunks(), embeddings: chunkEmbeddings.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Knowledge info
adminApp.get('/admin/api/knowledge', (req, res) => {
  try {
    const { projectId } = req.query;
    let docs;
    if (projectId && projectId !== 'default') {
      docs = db.prepare('SELECT * FROM knowledge_docs WHERE (project_id = ? OR project_id IS NULL OR project_id = \'default\') ORDER BY updated_at DESC').all(projectId);
    } else {
      docs = db.prepare('SELECT * FROM knowledge_docs ORDER BY updated_at DESC').all();
    }
    const categories = {};
    let totalChunks = 0;
    for (const d of docs) {
      categories[d.category] = (categories[d.category] || 0) + d.chunk_count;
      totalChunks += d.chunk_count;
    }
    // 如果 DB 无数据，fallback 到内存
    if (docs.length === 0) {
      for (const [pid, projChunks] of knowledgeChunks) {
        if (projectId && projectId !== 'default' && pid !== projectId) continue;
        for (const chunk of projChunks) {
          categories[chunk.category] = (categories[chunk.category] || 0) + 1;
        }
      }
      if (projectId && projectId !== 'default') {
        totalChunks = knowledgeChunks.get(projectId)?.length || 0;
      } else {
        totalChunks = totalKnowledgeChunks();
      }
    }
    // 按项目统计 embeddings 数量
    let totalEmbeddings = 0;
    if (projectId && projectId !== 'default') {
      totalEmbeddings = chunkEmbeddings.get(projectId)?.size || 0;
    } else {
      for (const [, projMap] of chunkEmbeddings) totalEmbeddings += projMap.size;
    }
    // cacheSize is global (text-level dedup cache, not project-scoped)
    res.json({
      totalChunks,
      totalEmbeddings,
      cacheSize: embeddingCache.size,
      categories,
      docs
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Knowledge stats by project
adminApp.get('/admin/api/knowledge/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT project_id, COUNT(*) as doc_count, SUM(chunk_count) as total_chunks
      FROM knowledge_docs GROUP BY project_id
    `).all();
    const inMemory = {};
    for (const [pid, projChunks] of knowledgeChunks) {
      inMemory[pid] = projChunks.length;
    }
    // 合并 DB 和内存统计
    const merged = {};
    for (const s of stats) {
      merged[s.project_id] = { project_id: s.project_id, doc_count: s.doc_count, total_chunks: s.total_chunks || 0 };
    }
    for (const [pid, count] of Object.entries(inMemory)) {
      if (!merged[pid]) merged[pid] = { project_id: pid, doc_count: 0, total_chunks: 0 };
      if (count > (merged[pid].total_chunks || 0)) merged[pid].total_chunks = count;
    }
    res.json(Object.values(merged));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Knowledge doc detail
adminApp.get('/admin/api/knowledge/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const chunks = db.prepare('SELECT * FROM knowledge_chunks_db WHERE doc_id = ? ORDER BY id').all(req.params.id);
    res.json({ ...doc, chunks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reindex single doc
adminApp.post('/admin/api/knowledge/:id/reindex', async (req, res) => {
  try {
    // Clear embeddings and reload all (simple approach for single doc)
    chunkEmbeddings.clear();
    embeddingCache.clear();
    loadKnowledge();
    await precomputeEmbeddings();
    res.json({ ok: true, chunks: totalKnowledgeChunks() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reindex all
adminApp.post('/admin/api/knowledge/reindex-all', async (req, res) => {
  try {
    knowledgeChunks = new Map();
    chunkEmbeddings = new Map();
    embeddingCache = new Map();
    ragCache = new Map();
    loadKnowledge();
    await precomputeEmbeddings();
    res.json({ ok: true, chunks: totalKnowledgeChunks(), embeddings: chunkEmbeddings.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search test
adminApp.get('/admin/api/knowledge/search', async (req, res) => {
  try {
    const { q, cat, projectId } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await retrieveContext(q, 10, null, { projectId: projectId || 'default' });
    let filtered = results;
    if (cat) filtered = results.filter(r => r.category === cat);
    res.json({ query: q, results: filtered });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// Channels API - 多账号管理
// ============================================================
adminApp.get('/admin/api/channels', (req, res) => {
  const all = channels.loadChannels();
  const enriched = all.map(ch => ({
    ...ch,
    runtime: channels.getRuntimeStats(ch.id)
  }));
  res.json(enriched);
});

adminApp.post('/admin/api/channels', (req, res) => {
  try {
    const ch = channels.addChannel(req.body);
    res.json({ ok: true, channel: ch });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

adminApp.put('/admin/api/channels/:id', (req, res) => {
  const ch = channels.updateChannel(req.params.id, req.body);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json({ ok: true, channel: ch });
});

adminApp.delete('/admin/api/channels/:id', (req, res) => {
  const ok = channels.deleteChannel(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Channel not found' });
  res.json({ ok: true });
});

adminApp.post('/admin/api/channels/:id/toggle', (req, res) => {
  const ch = channels.toggleChannel(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json({ ok: true, channel: ch });
});

adminApp.get('/admin/api/channels/:id/health', async (req, res) => {
  const result = await channels.healthCheckChannel(req.params.id);
  res.json(result);
});

// Settings - GET
adminApp.get('/admin/api/settings', (req, res) => {
  const settings = loadSettings();
  // Hide full token, show masked version
  const masked = { ...settings, adminTokenMasked: '••••••' };
  res.json(masked);
});

// Settings - PUT
adminApp.put('/admin/api/settings', (req, res) => {
  try {
    const current = loadSettings();
    const updates = req.body;
    if (updates.adminToken !== undefined) {
      current.adminToken = updates.adminToken;
    }
    if (updates.backupTime !== undefined) {
      current.backupTime = updates.backupTime;
    }
    if (updates.backupEnabled !== undefined) {
      current.backupEnabled = updates.backupEnabled;
    }
    if (updates.backupRetentionDays !== undefined) {
      current.backupRetentionDays = parseInt(updates.backupRetentionDays) || 3;
    }
    saveSettings(current);
    res.json({ ok: true, settings: { ...current, adminTokenMasked: '••••••' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Backup list
adminApp.get('/admin/api/backups', (req, res) => {
  try {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [] });
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') || f.endsWith('.json') || f.endsWith('.zip'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ backups: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual backup
adminApp.post('/admin/api/backup/now', (req, res) => {
  try {
    const backupDir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(backupDir, `crm-${ts}.db`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, dest);
      // Cleanup old backups
      const settings = loadSettings();
      const retention = settings.backupRetentionDays || 3;
      const cutoff = Date.now() - retention * 86400000;
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('crm-') && f.endsWith('.db'));
      for (const f of files) {
        const stat = fs.statSync(path.join(backupDir, f));
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(path.join(backupDir, f));
        }
      }
      res.json({ ok: true, file: dest });
    } else {
      res.status(500).json({ error: 'Database file not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// CRM v2 API — Enhanced customer management
// ============================================================

const STATUS_LABELS = { new:'新线索', inquiring:'询盘中', negotiating:'谈判中', quoted:'已报价', sampling:'拿样', closed:'成交', lost:'流失' };
const STATUS_LIST = ['new','inquiring','negotiating','quoted','sampling','closed','lost'];

// Customer list (v2)
adminApp.get('/admin/api/v2/customers', (req, res) => {
  try {
    const { q, status, country, account, from, to, projectId, limit = 200 } = req.query;
    let sql = `SELECT c.*,
      (SELECT COUNT(*) FROM messages_v2 WHERE customer_id = c.id) as message_count,
      (SELECT MAX(timestamp) FROM messages_v2 WHERE customer_id = c.id) as last_message,
      (SELECT COUNT(*) FROM messages_v2 WHERE customer_id = c.id AND direction = 'inbound' AND status = 'received') as unread_count
      FROM customers_v2 c`;
    const conds = [];
    const params = [];
    if (projectId && projectId !== 'default') { conds.push('c.project_id = ?'); params.push(projectId); }
    if (q) { conds.push('(c.display_name LIKE ? OR c.phone LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (status) { conds.push('c.status = ?'); params.push(status); }
    if (country) { conds.push('c.country = ?'); params.push(country); }
    if (account) { conds.push(`c.id IN (SELECT customer_id FROM customer_channels WHERE account_id = ?)`); params.push(account); }
    if (from) { conds.push('c.created_at >= ?'); params.push(from); }
    if (to) { conds.push('c.created_at <= ?'); params.push(to + 'T23:59:59Z'); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ` ORDER BY c.updated_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    const customers = db.prepare(sql).all(...params);
    // Attach channels
    for (const c of customers) {
      c.channels = db.prepare('SELECT * FROM customer_channels WHERE customer_id = ?').all(c.id);
    }
    res.json(customers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer search (v2)
adminApp.get('/admin/api/v2/customers/search', (req, res) => {
  req.query.limit = '100';
  // reuse the list endpoint
  req.url = '/admin/api/v2/customers?' + new URLSearchParams(req.query).toString();
  // just redirect logic
  try {
    const { q, status, country, account, from, to } = req.query;
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM messages_v2 WHERE customer_id = c.id) as message_count, (SELECT MAX(timestamp) FROM messages_v2 WHERE customer_id = c.id) as last_message FROM customers_v2 c`;
    const conds = [], params = [];
    if (q) { conds.push('(c.display_name LIKE ? OR c.phone LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (status) { conds.push('c.status = ?'); params.push(status); }
    if (country) { conds.push('c.country = ?'); params.push(country); }
    if (account) { conds.push(`c.id IN (SELECT customer_id FROM customer_channels WHERE account_id = ?)`); params.push(account); }
    if (from) { conds.push('c.created_at >= ?'); params.push(from); }
    if (to) { conds.push('c.created_at <= ?'); params.push(to + 'T23:59:59Z'); }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY c.updated_at DESC LIMIT 100';
    const customers = db.prepare(sql).all(...params);
    for (const c of customers) c.channels = db.prepare('SELECT * FROM customer_channels WHERE customer_id = ?').all(c.id);
    res.json(customers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer detail (v2)
adminApp.get('/admin/api/v2/customers/:id', (req, res) => {
  try {
    const c = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    c.channels = db.prepare('SELECT * FROM customer_channels WHERE customer_id = ?').all(c.id);
    c.messages = db.prepare('SELECT * FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 100').all(c.id).reverse();
    c.statusLabel = STATUS_LABELS[c.status] || c.status;
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update customer (v2)
adminApp.put('/admin/api/v2/customers/:id', (req, res) => {
  try {
    const allowed = ['display_name','phone','country','tags','notes','profile'];
    const sets = [], vals = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(typeof req.body[k] === 'object' ? JSON.stringify(req.body[k]) : req.body[k]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    sets.push('updated_at = ?'); vals.push(sqlNow());
    vals.push(req.params.id);
    db.prepare(`UPDATE customers_v2 SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update customer status (v2) — also triggers auto sequence enrollment
adminApp.put('/admin/api/v2/customers/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUS_LIST.includes(status)) return res.status(400).json({ error: 'Invalid status', valid: STATUS_LIST });
    const id = req.params.id;
    const prev = db.prepare('SELECT status FROM customers_v2 WHERE id = ?').get(id);
    db.prepare('UPDATE customers_v2 SET status = ?, updated_at = ? WHERE id = ?').run(status, sqlNow(), id);
    // Auto-enroll in matching sequence when status changes
    if (prev && prev.status !== status) {
      try {
        const autoSeq = db.prepare("SELECT id FROM email_sequences WHERE is_active = 1 AND category = ?").get(status);
        if (autoSeq) {
          const result = addCustomerToSequence(id, autoSeq.id, null);
          if (result.ok) console.log(`📧 Auto-enrolled ${id} into sequence ${autoSeq.id} on status change to ${status}`);
        }
      } catch(seqErr) { console.error('[AutoSeq] error:', seqErr.message); }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Merge customers (v2)
adminApp.post('/admin/api/v2/customers/:id/merge', (req, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId || targetId === req.params.id) return res.status(400).json({ error: 'Invalid target' });
    const source = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(req.params.id);
    const target = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(targetId);
    if (!source || !target) return res.status(404).json({ error: 'Customer not found' });

    // Move messages
    db.prepare('UPDATE messages_v2 SET customer_id = ? WHERE customer_id = ?').run(targetId, req.params.id);
    // Merge channel bindings
    const bindings = db.prepare('SELECT * FROM customer_channels WHERE customer_id = ?').all(req.params.id);
    for (const b of bindings) {
      db.prepare('INSERT OR IGNORE INTO customer_channels (id, customer_id, channel, account_id, contact_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('cc_' + crypto.randomBytes(4).toString('hex'), targetId, b.channel, b.account_id, b.contact_id, b.label, b.created_at);
    }
    // Merge tags
    const srcTags = JSON.parse(source.tags || '[]');
    const tgtTags = JSON.parse(target.tags || '[]');
    const merged = [...new Set([...tgtTags, ...srcTags])];
    const mergedNotes = [target.notes, source.notes].filter(Boolean).join('\n---\n');
    db.prepare('UPDATE customers_v2 SET tags = ?, notes = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(merged), mergedNotes, sqlNow(), targetId);
    // Delete source
    db.prepare('DELETE FROM customer_channels WHERE customer_id = ?').run(req.params.id);
    db.prepare('DELETE FROM customers_v2 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Customer messages (v2)
adminApp.get('/admin/api/v2/customers/:id/messages', (req, res) => {
  try {
    const { account_id, channel, limit = 100 } = req.query;
    let sql = 'SELECT * FROM messages_v2 WHERE customer_id = ?';
    const params = [req.params.id];
    if (account_id) { sql += ' AND account_id = ?'; params.push(account_id); }
    if (channel) { sql += ' AND channel = ?'; params.push(channel); }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    const messages = db.prepare(sql).all(...params).reverse();
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Funnel stats (v2)
// ============================================================
// Intervention Mode API
// ============================================================

// Toggle intervene mode for a customer
adminApp.put('/admin/api/customers/:id/intervene', (req, res) => {
  try {
    const { enabled } = req.body;
    const id = req.params.id;
    db.prepare('UPDATE customers_v2 SET intervene_mode = ?, updated_at = ? WHERE id = ?').run(enabled ? 1 : 0, sqlNow(), id);
    res.json({ ok: true, intervene_mode: enabled });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve a pending message
adminApp.post('/admin/api/messages/:id/approve', async (req, res) => {
  try {
    const msg = db.prepare('SELECT * FROM messages_v2 WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status !== 'pending') return res.status(400).json({ error: 'Message is not pending' });

    // Get customer phone and account info
    const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(msg.customer_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Send via appropriate adapter (支持多账号)
    const { adapter: resolvedAdapter, accountId: resolvedAccountId } = resolveCustomerAdapter(msg.customer_id);

    if (resolvedAdapter) {
      await throttledSend(resolvedAdapter, customer.phone, msg.content);
    } else {
      console.log(`⚠️ No adapter for approve, message ${msg.id} marked as sent`);
    }

    db.prepare('UPDATE messages_v2 SET status = ?, account_id = COALESCE(account_id, ?) WHERE id = ?').run('sent', resolvedAccountId, msg.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Edit a pending message
adminApp.put('/admin/api/messages/:id/edit', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const msg = db.prepare('SELECT * FROM messages_v2 WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.status !== 'pending') return res.status(400).json({ error: 'Message is not pending' });
    db.prepare('UPDATE messages_v2 SET content = ? WHERE id = ?').run(content, msg.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cancel a pending message
adminApp.post('/admin/api/messages/:id/cancel', (req, res) => {
  try {
    db.prepare('UPDATE messages_v2 SET status = ? WHERE id = ?').run('cancelled', req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manually send a message
adminApp.post('/admin/api/messages/send', async (req, res) => {
  try {
    const { accountId, content } = req.body;
    if (!customerId || !content) return res.status(400).json({ error: 'customerId and content required' });

    const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // 支持多账号：优先用请求指定的 accountId，否则从客户绑定查找
    const resolved = accountId && accountId !== 'default'
      ? { adapter: channels.getAdapter(accountId), accountId }
      : resolveCustomerAdapter(customerId);

    if (resolved.adapter) {
      await throttledSend(resolved.adapter, customer.phone, content);
    }

    // Save message
    const msgId = 'manual_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db.prepare('INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(msgId, customerId, resolved.accountId, 'whatsapp', 'outbound', content, sqlNow(), 'sent', customer.project_id || '');

    res.json({ ok: true, messageId: msgId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark customer messages as read
adminApp.put('/admin/api/v2/customers/:id/read', adminAuth, (req, res) => {
  try {
    db.prepare("UPDATE messages_v2 SET status = 'read' WHERE customer_id = ? AND direction = 'inbound' AND status = 'received'").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get pending messages for a customer
adminApp.get('/admin/api/v2/customers/:id/pending', (req, res) => {
  try {
    const msgs = db.prepare('SELECT * FROM messages_v2 WHERE customer_id = ? AND status = ? ORDER BY timestamp DESC').all(req.params.id, 'pending');
    res.json(msgs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Overview stats API
adminApp.get('/admin/api/overview', (req, res) => {
  try {
    const { projectId } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const pf = projectId && projectId !== 'default' ? ' AND project_id = ?' : '';
    const pp = projectId && projectId !== 'default' ? [projectId] : [];

    const todayMsgs = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE date(timestamp) = ?${pf}`).get(today, ...pp).c;
    const todayInbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE date(timestamp) = ? AND direction = 'inbound'${pf}`).get(today, ...pp).c;
    const todayOutbound = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE date(timestamp) = ? AND direction = 'outbound'${pf}`).get(today, ...pp).c;

    // activeCustomers: 直接用 messages_v2.project_id，无需 JOIN customers_v2
    const activeCustomers = projectId && projectId !== 'default'
      ? db.prepare(`SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE date(timestamp) = ? AND project_id = ?`).get(today, projectId).c
      : db.prepare("SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE date(timestamp) = ?").get(today).c;

    const pendingFollowups = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE status IN ('inquiring','negotiating','quoted','sampling')${pf}`).get(...pp).c;
    const closedToday = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE date(updated_at) = ? AND status = 'closed'${pf}`).get(today, ...pp).c;
    const totalCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE 1=1${pf}`).get(...pp).c;
    // pendingMsgs: 直接用 messages_v2.project_id
    const pendingMsgs = projectId && projectId !== 'default'
      ? db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE status = 'pending' AND project_id = ?`).get(projectId).c
      : db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE status = 'pending'").get().c;

    // Avg response time: 用 messages_v2.project_id 替代 JOIN
    let pairs;
    if (projectId && projectId !== 'default') {
      pairs = db.prepare(`
        SELECT m1.timestamp as t1, m2.timestamp as t2
        FROM messages_v2 m1
        JOIN messages_v2 m2 ON m2.customer_id = m1.customer_id AND m2.direction = 'outbound' AND m2.timestamp > m1.timestamp
        WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ? AND m1.project_id = ?
        GROUP BY m1.id ORDER BY m2.timestamp ASC
      `).all(today, projectId);
    } else {
      pairs = db.prepare(`
        SELECT m1.timestamp as t1, m2.timestamp as t2
        FROM messages_v2 m1
        JOIN messages_v2 m2 ON m2.customer_id = m1.customer_id AND m2.direction = 'outbound' AND m2.timestamp > m1.timestamp
        WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ?
        GROUP BY m1.id ORDER BY m2.timestamp ASC
      `).all(today);
    }
    let avgResponseSec = 0;
    if (pairs.length > 0) {
      const totalSec = pairs.reduce((s, p) => s + (new Date(p.t2) - new Date(p.t1)) / 1000, 0);
      avgResponseSec = Math.round(totalSec / pairs.length);
    }

    // Recent conversations
    const recent = db.prepare(`
      SELECT c.id, c.display_name, c.phone, c.status, c.intervene_mode,
             (SELECT MAX(timestamp) FROM messages_v2 WHERE customer_id = c.id) as last_message,
             (SELECT COUNT(*) FROM messages_v2 WHERE customer_id = c.id) as message_count,
             (SELECT content FROM messages_v2 WHERE customer_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_content
      FROM customers_v2 c
      WHERE c.message_count > 0${pf}
      ORDER BY c.updated_at DESC
      LIMIT 20
    `).all(...pp);

    // Recent messages: 用 messages_v2.project_id 直接过滤，保留 JOIN 只为获取 display_name
    let recentMsgs;
    if (projectId && projectId !== 'default') {
      recentMsgs = db.prepare(`
        SELECT m.*, c.display_name, c.phone as customer_phone
        FROM messages_v2 m LEFT JOIN customers_v2 c ON c.id = m.customer_id
        WHERE m.project_id = ?
        ORDER BY m.timestamp DESC LIMIT 30
      `).all(projectId);
    } else {
      recentMsgs = db.prepare(`
        SELECT m.*, c.display_name, c.phone as customer_phone
        FROM messages_v2 m LEFT JOIN customers_v2 c ON c.id = m.customer_id
        ORDER BY m.timestamp DESC LIMIT 30
      `).all();
    }

    res.json({
      today: { messages: todayMsgs, inbound: todayInbound, outbound: todayOutbound, activeCustomers, closedDeals: closedToday },
      pendingFollowups, totalCustomers, pendingMessages: pendingMsgs, avgResponseSec,
      recentConversations: recent, recentMessages: recentMsgs
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Knowledge files list API
adminApp.get('/admin/api/knowledge/files', (req, res) => {
  try {
    const files = [];
    if (fs.existsSync(KNOWLEDGE_DIR)) {
      for (const fileName of fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt'))) {
        const stat = fs.statSync(path.join(KNOWLEDGE_DIR, fileName));
        files.push({ name: fileName, size: stat.size, modified: stat.mtime.toISOString() });
      }
    }
    res.json(files);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Knowledge file preview API
adminApp.get('/admin/api/knowledge/files/:name', (req, res) => {
  try {
    const fp = path.join(KNOWLEDGE_DIR, req.params.name);
    if (!fp.startsWith(KNOWLEDGE_DIR)) return res.status(403).json({ error: 'Invalid path' });
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found' });
    const content = fs.readFileSync(fp, 'utf-8');
    res.json({ name: req.params.name, content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI settings API
adminApp.get('/admin/api/ai-settings', (req, res) => {
  try {
    const s = loadSettings();
    res.json({
      model: AI_MODEL,
      temperature: 0.7,
      innerThought: true,
      systemPrompt: SALES_SYSTEM_PROMPT
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.put('/admin/api/ai-settings', (req, res) => {
  try {
    const { temperature, innerThought, systemPrompt } = req.body;
    const s = loadSettings();
    if (temperature !== undefined) s.aiTemperature = temperature;
    if (innerThought !== undefined) s.aiInnerThought = innerThought;
    if (systemPrompt) s.aiSystemPrompt = systemPrompt;
    saveSettings(s);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.get('/admin/api/v2/funnel', (req, res) => {
  try {
    const { projectId } = req.query;
    const pf = projectId && projectId !== 'default' ? ' AND project_id = ?' : '';
    const pp = projectId && projectId !== 'default' ? [projectId] : [];
    const funnel = {};
    for (const s of STATUS_LIST) {
      funnel[s] = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE status = ?${pf}`).get(s, ...pp).c;
    }
    const total = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE 1=1${pf}`).get(...pp).c;
    // Recent activity
    const today = new Date().toISOString().slice(0, 10);
    const todayMsgs = db.prepare(`SELECT COUNT(*) as c FROM messages_v2 WHERE date(timestamp) = ?${pf}`).get(today, ...pp).c;
    const todayNew = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE date(created_at) = ?${pf}`).get(today, ...pp).c;
    res.json({ total, funnel, todayMessages: todayMsgs, todayNewCustomers: todayNew });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// AI 模型路由 API（按项目维度）
// ============================================================

// 获取所有可用模型列表（必须在 :projectId 路由之前）
adminApp.get('/admin/api/model-routing/models', (req, res) => {
  res.json(AVAILABLE_MODELS);
});

// 获取项目的模型路由配置
adminApp.get('/admin/api/model-routing/:projectId', (req, res) => {
  try {
    const routing = getProjectModelRouting(req.params.projectId);
    res.json({ ok: true, ...routing, projectId: req.params.projectId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新项目的模型路由配置
adminApp.put('/admin/api/model-routing/:projectId', (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    saveProjectModelRouting(projectId, req.body);
    res.json({ ok: true, message: 'Model routing updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 手动设置某客户强制模型
adminApp.put('/admin/api/customers/:id/model', (req, res) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'model is required' });
    db.prepare('UPDATE customers_v2 SET force_model = ? WHERE id = ?').run(model, req.params.id);
    res.json({ ok: true, message: `force_model set to ${model}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 取消某客户强制模型
adminApp.delete('/admin/api/customers/:id/model', (req, res) => {
  try {
    db.prepare('UPDATE customers_v2 SET force_model = NULL WHERE id = ?').run(req.params.id);
    res.json({ ok: true, message: 'force_model cleared' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 测试模型可用性和响应速度
adminApp.post('/admin/api/model-routing/test', async (req, res) => {
  try {
    const { model, projectId } = req.body;
    if (!model) return res.status(400).json({ error: 'model is required' });
    const routing = getProjectModelRouting(projectId || 'default');
    const cfg = getAIConfig('chat');
    const apiUrl = cfg.apiUrl || SILICONFLOW_BASE_URL;
    const apiKey = cfg.apiKey || SILICONFLOW_API_KEY;

    const testStart = Date.now();
    try {
      const response = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Reply briefly.' },
            { role: 'user', content: 'Say "OK" in one word.' }
          ],
          max_tokens: 10,
          temperature: 0.1,
        },
        {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: model.includes('GLM') ? 60000 : 30000,
        }
      );
      const latency = Date.now() - testStart;
      const content = response.data.choices?.[0]?.message?.content || '';
      res.json({
        ok: true,
        model,
        latency,
        content: content.slice(0, 50),
        success: !!content,
      });
    } catch (e) {
      res.json({
        ok: true,
        model,
        latency: Date.now() - start,
        success: false,
        error: e.response?.data?.error?.message || e.message,
      });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// AI 供应商管理 API
// ============================================================
adminApp.get('/admin/api/ai/providers', (req, res) => {
  try {
    const providers = db.prepare('SELECT id, name, api_url, api_key, models, is_active, created_at FROM ai_providers ORDER BY id').all();
    // 隐藏 API Key 中间部分
    providers.forEach(p => {
      if (p.api_key && p.api_key.length > 8) {
        p.api_key_masked = p.api_key.slice(0, 4) + '****' + p.api_key.slice(-4);
      } else {
        p.api_key_masked = '****';
      }
    });
    res.json(providers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/ai/providers', (req, res) => {
  try {
    const { name, api_url, api_key, models } = req.body;
    if (!name || !api_url || !api_key) return res.status(400).json({ error: 'name, api_url, api_key required' });
    const modelsJson = typeof models === 'string' ? models : JSON.stringify(models || []);
    db.prepare("INSERT INTO ai_providers (name, api_url, api_key, models) VALUES (?, ?, ?, ?)").run(name, api_url, api_key, modelsJson);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.put('/admin/api/ai/providers/:id', (req, res) => {
  try {
    const { name, api_url, api_key, models, is_active } = req.body;
    const existing = db.prepare('SELECT * FROM ai_providers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Provider not found' });
    db.prepare("UPDATE ai_providers SET name=?, api_url=?, api_key=?, models=?, is_active=? WHERE id=?").run(
      name || existing.name,
      api_url || existing.api_url,
      api_key || existing.api_key,
      typeof models === 'string' ? models : JSON.stringify(models || existing.models),
      is_active !== undefined ? is_active : existing.is_active,
      req.params.id
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.delete('/admin/api/ai/providers/:id', (req, res) => {
  try {
    // 检查是否有 model_assignments 引用
    const assignments = db.prepare('SELECT COUNT(*) as c FROM model_assignments WHERE provider_id = ?').get(req.params.id);
    if (assignments.c > 0) return res.status(400).json({ error: '该供应商正在使用中，请先更改模型分配' });
    db.prepare('DELETE FROM ai_providers WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/ai/providers/:id/test', async (req, res) => {
  try {
    const provider = db.prepare('SELECT * FROM ai_providers WHERE id = ?').get(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const models = JSON.parse(provider.models || '[]');
    const testModel = models.length > 0 ? models[0].id : 'test';
    const startTime = Date.now();
    const resp = await axios.post(`${provider.api_url}/v1/chat/completions`, {
      model: testModel,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    }, {
      headers: { 'Authorization': `Bearer ${provider.api_key}`, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    res.json({ ok: true, latency: Date.now() - startTime, model: testModel, status: resp.status });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

adminApp.get('/admin/api/ai/assignments', (req, res) => {
  try {
    const assignments = db.prepare(`
      SELECT ma.purpose, ma.model_id, ap.id as provider_id, ap.name as provider_name
      FROM model_assignments ma
      JOIN ai_providers ap ON ma.provider_id = ap.id
    `).all();
    res.json(assignments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

adminApp.put('/admin/api/ai/assignments', (req, res) => {
  try {
    const { chat, embedding, reranker } = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO model_assignments (purpose, provider_id, model_id) VALUES (?, ?, ?)");
    if (chat) upsert.run('chat', chat.provider_id, chat.model_id);
    if (embedding) upsert.run('embedding', embedding.provider_id, embedding.model_id);
    if (reranker) upsert.run('reranker', reranker.provider_id, reranker.model_id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ============================================================
// CRM P0 API
// ============================================================

// 阶段定义
adminApp.get('/admin/api/crm/stages', (req, res) => {
  res.json(CRM_STAGES);
});

// 今日工作台
adminApp.get('/admin/api/crm/dashboard', (req, res) => {
  try {
    const projectId = req.query.projectId;
    const today = new Date().toISOString().slice(0, 10);
    const now = sqlNow();
    const pf = projectId ? ' AND project_id = ?' : '';
    const pp = projectId ? [projectId] : [];
    // 待办
    const overdue_followups = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE next_follow_up != '' AND next_follow_up < ? AND status NOT IN ('closed_won','closed_lost')${pf}`).get(now, ...pp).c;
    const at_risk = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE (last_inbound_at IS NULL OR last_inbound_at = '' OR last_inbound_at < datetime('now','-7 days')) AND message_count > 0 AND status NOT IN ('closed_won','closed_lost','on_hold','new_lead')${pf}`).get(...pp).c;
    const pending_quotes = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE status IN ('quoted','follow_up','negotiation')${pf}`).get(...pp).c;
    const new_leads = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE (status = 'new_lead' OR status = 'new')${pf}`).get(...pp).c;
    // unread_messages: 直接用 messages_v2.project_id
    let unread_messages;
    if (projectId) {
      unread_messages = db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND status = 'received' AND project_id = ?").get(projectId).c;
    } else {
      unread_messages = db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE direction = 'inbound' AND status = 'received'").get().c;
    }
    // 概览
    const today_new = db.prepare(`SELECT COUNT(*) as c FROM customers_v2 WHERE date(created_at) = ?${pf}`).get(today, ...pp).c;
    // today_active: 直接用 messages_v2.project_id
    let today_active;
    if (projectId) {
      today_active = db.prepare("SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE date(timestamp) = ? AND project_id = ?").get(today, projectId).c;
    } else {
      today_active = db.prepare("SELECT COUNT(DISTINCT customer_id) as c FROM messages_v2 WHERE date(timestamp) = ?").get(today).c;
    }
    // today_replied: 直接用 messages_v2.project_id
    let today_replied;
    if (projectId) {
      today_replied = db.prepare(`
        SELECT COUNT(DISTINCT m1.customer_id) as c FROM messages_v2 m1
        JOIN messages_v2 m ON m.customer_id = m1.customer_id AND m.direction = 'outbound' AND m.timestamp > m1.timestamp
        WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ? AND m1.project_id = ?
      `).get(projectId, today).c;
    } else {
      today_replied = db.prepare(`SELECT COUNT(DISTINCT m.customer_id) as c FROM messages_v2 m1 JOIN messages_v2 m ON m.customer_id = m1.customer_id AND m.direction = 'outbound' AND m.timestamp > m1.timestamp WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ?`).get(today).c;
    }
    // ai_stats: 直接用 messages_v2.project_id
    let ai_stats;
    if (projectId) {
      ai_stats = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status != 'pending' AND status != 'failed' THEN 1 ELSE 0 END) as sent FROM messages_v2 WHERE date(timestamp) = ? AND direction = 'outbound' AND project_id = ?").get(today, projectId);
    } else {
      ai_stats = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status != 'pending' AND status != 'failed' THEN 1 ELSE 0 END) as sent FROM messages_v2 WHERE date(timestamp) = ? AND direction = 'outbound'").get(today);
    }
    const ai_reply_rate = ai_stats.total > 0 ? ai_stats.sent / ai_stats.total : 0;
    // ai_avg_response_ms: 直接用 messages_v2.project_id
    let ai_avg_response_ms;
    if (projectId) {
      ai_avg_response_ms = db.prepare(`
        SELECT AVG((julianday(m2.timestamp) - julianday(m1.timestamp)) * 86400000) as avg_ms
        FROM messages_v2 m1 JOIN messages_v2 m2 ON m2.customer_id = m1.customer_id AND m2.direction = 'outbound' AND m2.timestamp > m1.timestamp
        WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ? AND m1.project_id = ?
        GROUP BY m1.id
      `).all(projectId, today);
    } else {
      ai_avg_response_ms = db.prepare(`
        SELECT AVG((julianday(m2.timestamp) - julianday(m1.timestamp)) * 86400000) as avg_ms
        FROM messages_v2 m1 JOIN messages_v2 m2 ON m2.customer_id = m1.customer_id AND m2.direction = 'outbound' AND m2.timestamp > m1.timestamp
        WHERE m1.direction = 'inbound' AND date(m1.timestamp) = ?
        GROUP BY m1.id
      `).all(today);
    }
    const avgResp = ai_avg_response_ms.length > 0 ? Math.round(ai_avg_response_ms.reduce((s, r) => s + (r.avg_ms || 0), 0) / ai_avg_response_ms.length) : 0;
    // 最近动态: customer_timeline 自带 project_id，无需 JOIN
    let recent_activity;
    if (projectId) {
      recent_activity = db.prepare(`
        SELECT ct.*, c.display_name, c.phone FROM customer_timeline ct
        LEFT JOIN customers_v2 c ON c.id = ct.customer_id
        WHERE ct.project_id = ?
        ORDER BY ct.created_at DESC LIMIT 10
      `).all(projectId);
    } else {
      recent_activity = db.prepare(`
        SELECT ct.*, c.display_name, c.phone FROM customer_timeline ct
        LEFT JOIN customers_v2 c ON c.id = ct.customer_id
        ORDER BY ct.created_at DESC LIMIT 10
      `).all();
    }
    // 重点客户: 按健康度低+有互动排序
    const priority_customers = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM messages_v2 WHERE customer_id = c.id) as msg_count
      FROM customers_v2 c
      WHERE c.message_count > 0 AND c.status NOT IN ('closed_won','closed_lost','on_hold')${pf}
      ORDER BY c.health_score ASC, c.last_inbound_at DESC
      LIMIT 5
    `).all(...pp).map(c => ({ ...c, health_score: calculateHealthScore(c).score, churn_risk: calculateHealthScore(c).churnRisk }));

    res.json({
      todos: { overdue_followups, at_risk, pending_quotes, new_leads, unread_messages },
      overview: { today_new, today_active, today_replied, ai_reply_rate, ai_avg_response_ms: avgResp },
      recent_activity,
      priority_customers
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 客户健康度
adminApp.get('/admin/api/crm/health/:customerId', (req, res) => {
  try {
    const c = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(req.params.customerId);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const healthResult = calculateHealthScore(c);
    db.prepare('UPDATE customers_v2 SET health_score = ?, churn_risk = ? WHERE id = ?').run(healthResult.score, healthResult.churnRisk, c.id);
    res.json({ customer_id: c.id, health_score: healthResult.score, churn_risk: healthResult.churnRisk });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 修改客户阶段
adminApp.put('/admin/api/crm/customers/:customerId/stage', (req, res) => {
  try {
    const { stage, note } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage required' });
    const c = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(req.params.customerId);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const oldStage = c.status;
    db.prepare('UPDATE customers_v2 SET status = ?, updated_at = ? WHERE id = ?').run(stage, sqlNow(), c.id);
    db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)')
      .run(c.id, 'stage_changed', JSON.stringify({ from: oldStage, to: stage, note: note || '' }), 'admin');
    res.json({ ok: true, old_stage: oldStage, new_stage: stage });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 修改客户标签
adminApp.put('/admin/api/crm/customers/:customerId/tags', (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags array required' });
    db.prepare("UPDATE customers_v2 SET tags = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(tags), sqlNow(), req.params.customerId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 修改客户等级和颜色标记
adminApp.put('/admin/api/crm/customers/:customerId/star', (req, res) => {
  try {
    const { star_color } = req.body;
    const validColors = ['', 'blue', 'green', 'yellow', 'orange', 'red'];
    if (star_color !== undefined && !validColors.includes(star_color)) return res.status(400).json({ error: 'Invalid star_color' });
    const fields = { updated_at: sqlNow() };
    if (star_color !== undefined) fields.star_color = star_color;
    if (req.body.assigned_to !== undefined) fields.assigned_to = req.body.assigned_to;
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE customers_v2 SET ${sets} WHERE id = ?`).run(...Object.values(fields), req.params.customerId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 设置下次跟进时间
adminApp.put('/admin/api/crm/customers/:customerId/followup', (req, res) => {
  try {
    const { next_follow_up } = req.body;
    db.prepare('UPDATE customers_v2 SET next_follow_up = ?, updated_at = ? WHERE id = ?')
      .run(next_follow_up || '', sqlNow(), req.params.customerId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取客户时间线
adminApp.get('/admin/api/crm/timeline/:customerId', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const timeline = db.prepare('SELECT * FROM customer_timeline WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(req.params.customerId, limit);
    res.json(timeline);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 手动添加时间线事件
adminApp.post('/admin/api/crm/timeline/:customerId', (req, res) => {
  try {
    const { event_type, event_data } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type required' });
    db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)')
      .run(req.params.customerId, event_type, JSON.stringify(event_data || {}), req.body.created_by || 'admin');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 获取客户商机
adminApp.get('/admin/api/crm/deals/:customerId', (req, res) => {
  try {
    const deals = db.prepare('SELECT * FROM deals WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId);
    res.json(deals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 创建商机
adminApp.post('/admin/api/crm/deals', (req, res) => {
  try {
    const { customer_id, stage, total_amount, currency, models, notes } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
    const id = 'deal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    db.prepare(`INSERT INTO deals (id, customer_id, stage, total_amount, currency, models, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, customer_id, stage || 'proposal', total_amount || 0, currency || 'USD', JSON.stringify(models || []), notes || '', sqlNow(), sqlNow());
    db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)')
      .run(customer_id, 'deal_created', JSON.stringify({ deal_id: id, amount: total_amount }), 'admin');
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新商机
adminApp.put('/admin/api/crm/deals/:dealId', (req, res) => {
  try {
    const allowed = ['stage','total_amount','currency','models','deposit_amount','deposit_date','balance_amount','balance_date','order_date','shipping_date','delivery_date','tracking_no','notes','checklist'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = typeof req.body[k] === 'object' ? JSON.stringify(req.body[k]) : req.body[k];
    }
    updates.updated_at = sqlNow();
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE deals SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.dealId);
    if (req.body.stage) {
      const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId);
      if (deal) {
        db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data, created_by) VALUES (?, ?, ?, ?)')
          .run(deal.customer_id, 'deal_stage_changed', JSON.stringify({ deal_id: deal.id, stage: req.body.stage }), 'admin');
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新节点状态
adminApp.put('/admin/api/crm/deals/:dealId/checklist', (req, res) => {
  try {
    const { checklist } = req.body;
    if (!checklist) return res.status(400).json({ error: 'checklist required' });
    db.prepare("UPDATE deals SET checklist = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(checklist), sqlNow(), req.params.dealId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 增强版客户列表
adminApp.get('/admin/api/crm/customers', (req, res) => {
  try {
    const { status, tag, search, star_color, sort = 'updated_at', order = 'DESC', page = 1, limit = 50 } = req.query;
    const { projectId } = req.query;
    const pf = projectId ? ' AND project_id = ?' : '';
    const pp = projectId ? [projectId] : [];
    let sql = `SELECT * FROM customers_v2 WHERE 1=1${pf}`;
    const params = [...pp];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (tag) { sql += ' AND tags LIKE ?'; params.push(`%"${tag}"%`); }
    if (search) { sql += ' AND (display_name LIKE ? OR phone LIKE ? OR notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (star_color) { sql += ' AND star_color = ?'; params.push(star_color); }
    const allowedSorts = ['updated_at','created_at','health_score','last_inbound_at','message_count','next_follow_up'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'updated_at';
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` ORDER BY ${sortCol} ${orderDir} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    const customers = db.prepare(sql).all(...params).map(c => ({ ...c, health_score: calculateHealthScore(c).score, churn_risk: calculateHealthScore(c).churnRisk }));
    const totalSql = `SELECT COUNT(*) as c FROM customers_v2 WHERE 1=1${pf}${status ? ' AND status = ?' : ''}${tag ? ' AND tags LIKE ?' : ''}${search ? ' AND (display_name LIKE ? OR phone LIKE ? OR notes LIKE ?)' : ''}${star_color ? ' AND star_color = ?' : ''}`;
    const totalParams = [...pp].concat(status ? [status] : []).concat(tag ? [`%"${tag}"%`] : []).concat(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []).concat(star_color ? [star_color] : []);
    const total = db.prepare(totalSql).get(...totalParams).c;
    res.json({ customers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

  // 知识空白检测 API
  adminApp.get('/admin/api/knowledge/gaps', adminAuth, (req, res) => {
    try {
      const { projectId } = req.query;
      let gaps;
      if (projectId) {
        gaps = db.prepare(`
          SELECT m.content as query, COUNT(*) as freq
          FROM messages_v2 m
          WHERE m.direction = 'inbound' AND m.timestamp > datetime('now', '-30 days')
          AND m.message_type = 'inquiry' AND m.project_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM messages_v2 r
            WHERE r.customer_id = m.customer_id AND r.direction = 'outbound'
            AND r.rag_sources = '[]'
          )
          GROUP BY substr(m.content, 1, 50)
          HAVING freq > 1
          ORDER BY freq DESC LIMIT 20
        `).all(projectId);
      } else {
        gaps = db.prepare(`
          SELECT m.content as query, COUNT(*) as freq
          FROM messages_v2 m
          WHERE m.direction = 'inbound' AND m.timestamp > datetime('now', '-30 days')
          AND m.message_type = 'inquiry'
          AND NOT EXISTS (
            SELECT 1 FROM messages_v2 r
            WHERE r.customer_id = m.customer_id AND r.direction = 'outbound'
            AND r.rag_sources = '[]'
          )
          GROUP BY substr(m.content, 1, 50)
          HAVING freq > 1
          ORDER BY freq DESC LIMIT 20
        `).all();
      }
      res.json({ gaps });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI 质量统计
  adminApp.get('/admin/api/ai/quality/stats', adminAuth, (req, res) => {
    try {
      const { projectId } = req.query;
      let stats, daily;
      if (projectId) {
        stats = db.prepare(`
          SELECT
            COUNT(*) as total_replies,
            AVG(CAST(json_extract(m.ai_quality_score, '$.overall') AS REAL)) as avg_quality,
            SUM(CASE WHEN CAST(json_extract(m.ai_quality_score, '$.overall') AS REAL) < 6 THEN 1 ELSE 0 END) as low_quality_count
          FROM messages_v2 m
          WHERE m.direction = 'outbound' AND m.ai_quality_score != '' AND m.project_id = ?
        `).get(projectId);
        daily = db.prepare(`
          SELECT date(m.timestamp) as day,
            AVG(CAST(json_extract(m.ai_quality_score, '$.overall') AS REAL)) as avg_quality
          FROM messages_v2 m
          WHERE m.direction = 'outbound' AND m.ai_quality_score != '' AND m.timestamp > datetime('now', '-30 days') AND m.project_id = ?
          GROUP BY date(m.timestamp) ORDER BY day
        `).all(projectId);
      } else {
        stats = db.prepare(`
          SELECT
            COUNT(*) as total_replies,
            AVG(CAST(json_extract(ai_quality_score, '$.overall') AS REAL)) as avg_quality,
            SUM(CASE WHEN CAST(json_extract(ai_quality_score, '$.overall') AS REAL) < 6 THEN 1 ELSE 0 END) as low_quality_count
          FROM messages_v2
          WHERE direction = 'outbound' AND ai_quality_score != ''
        `).get();
        daily = db.prepare(`
          SELECT date(timestamp) as day,
            AVG(CAST(json_extract(ai_quality_score, '$.overall') AS REAL)) as avg_quality
          FROM messages_v2
          WHERE direction = 'outbound' AND ai_quality_score != '' AND timestamp > datetime('now', '-30 days')
          GROUP BY date(timestamp) ORDER BY day
        `).all();
      }
      res.json({ ...stats, daily });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 低质量回复列表
  adminApp.get('/admin/api/ai/quality/review', adminAuth, (req, res) => {
    try {
      const { projectId } = req.query;
      let reviews;
      if (projectId) {
        reviews = db.prepare(`
          SELECT m.id, m.content, m.ai_quality_score, m.timestamp, c.phone, c.display_name as name
          FROM messages_v2 m
          LEFT JOIN customers_v2 c ON m.customer_id = c.id
          WHERE m.direction = 'outbound' AND m.ai_quality_score != ''
          AND CAST(json_extract(m.ai_quality_score, '$.overall') AS REAL) < 6
          AND m.project_id = ?
          ORDER BY m.timestamp DESC LIMIT 50
        `).all(projectId);
      } else {
        reviews = db.prepare(`
          SELECT m.id, m.content, m.ai_quality_score, m.timestamp, c.phone, c.display_name as name
          FROM messages_v2 m
          LEFT JOIN customers_v2 c ON m.customer_id = c.id
          WHERE m.direction = 'outbound' AND m.ai_quality_score != ''
          AND CAST(json_extract(m.ai_quality_score, '$.overall') AS REAL) < 6
          ORDER BY m.timestamp DESC LIMIT 50
        `).all();
      }
      res.json({ reviews });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 消息分类统计
  adminApp.get('/admin/api/messages/classification/stats', adminAuth, (req, res) => {
    try {
      const { projectId } = req.query;
      let stats;
      if (projectId) {
        stats = db.prepare(`
          SELECT m.message_type, COUNT(*) as count
          FROM messages_v2 m
          WHERE m.message_type != '' AND m.timestamp > datetime('now', '-30 days') AND m.project_id = ?
          GROUP BY m.message_type ORDER BY count DESC
        `).all(projectId);
      } else {
        stats = db.prepare(`
          SELECT message_type, COUNT(*) as count
          FROM messages_v2
          WHERE message_type != '' AND timestamp > datetime('now', '-30 days')
          GROUP BY message_type ORDER BY count DESC
        `).all();
      }
      res.json({ stats });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 情绪统计
  adminApp.get('/admin/api/sentiment/stats', adminAuth, (req, res) => {
    try {
      const { projectId } = req.query;
      let stats, alerts;
      if (projectId) {
        stats = db.prepare(`
          SELECT m.sentiment, COUNT(*) as count, AVG(m.sentiment_score) as avg_score
          FROM messages_v2 m
          WHERE m.sentiment != '' AND m.timestamp > datetime('now', '-30 days') AND m.project_id = ?
          GROUP BY m.sentiment ORDER BY count DESC
        `).all(projectId);
        alerts = db.prepare(`
          SELECT c.phone, c.display_name as name, c.sentiment_trend, c.churn_risk, c.health_score, MAX(m.timestamp) as last_msg
          FROM customers_v2 c
          JOIN messages_v2 m ON m.customer_id = c.id
          WHERE (c.sentiment_trend = 'declining' OR c.churn_risk IN ('high', 'critical')) AND c.project_id = ?
          GROUP BY c.id ORDER BY c.health_score ASC LIMIT 20
        `).all(projectId);
      } else {
        stats = db.prepare(`
          SELECT sentiment, COUNT(*) as count, AVG(sentiment_score) as avg_score
          FROM messages_v2
          WHERE sentiment != '' AND timestamp > datetime('now', '-30 days')
          GROUP BY sentiment ORDER BY count DESC
        `).all();
        alerts = db.prepare(`
          SELECT c.phone, c.display_name as name, c.sentiment_trend, c.churn_risk, c.health_score, MAX(m.timestamp) as last_msg
          FROM customers_v2 c
          JOIN messages_v2 m ON m.customer_id = c.id
          WHERE c.sentiment_trend = 'declining' OR c.churn_risk IN ('high', 'critical')
          GROUP BY c.id ORDER BY c.health_score ASC LIMIT 20
        `).all();
      }
      res.json({ stats, alerts });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Email System APIs ──

  // 邮件账户 CRUD
  adminApp.get('/admin/api/email/accounts', (req, res) => {
    try {
      const { projectId } = req.query;
      const pid = projectId && projectId !== 'default' ? projectId : null;
      const accounts = db.prepare('SELECT id, project_id, name, host, port, user, from_name, from_email, is_active, daily_limit, daily_sent, last_reset, created_at FROM email_accounts WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC')
        .all(pid);
      res.json({ accounts });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.post('/admin/api/email/accounts', (req, res) => {
    try {
      const { name, host, port, user, password, from_name, from_email, projectId, daily_limit } = req.body;
      const id = 'ea_' + crypto.randomBytes(8).toString('hex');
      db.prepare('INSERT INTO email_accounts (id, project_id, name, host, port, user, password_encrypted, from_name, from_email, daily_limit) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(id, projectId || 'default', name, host, port || 587, user, encryptPassword(password), from_name || '', from_email || '', daily_limit || 100);
      res.json({ id, success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.put('/admin/api/email/accounts/:id', (req, res) => {
    try {
      const { name, host, port, user, password, from_name, from_email, is_active, daily_limit } = req.body;
      const updates = [];
      const vals = [];
      if (name !== undefined) { updates.push('name = ?'); vals.push(name); }
      if (host !== undefined) { updates.push('host = ?'); vals.push(host); }
      if (port !== undefined) { updates.push('port = ?'); vals.push(port); }
      if (user !== undefined) { updates.push('user = ?'); vals.push(user); }
      if (password) { updates.push('password_encrypted = ?'); vals.push(encryptPassword(password)); }
      if (from_name !== undefined) { updates.push('from_name = ?'); vals.push(from_name); }
      if (from_email !== undefined) { updates.push('from_email = ?'); vals.push(from_email); }
      if (is_active !== undefined) { updates.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
      if (daily_limit !== undefined) { updates.push('daily_limit = ?'); vals.push(daily_limit); }
      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
      vals.push(req.params.id);
      db.prepare(`UPDATE email_accounts SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.delete('/admin/api/email/accounts/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM email_accounts WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.post('/admin/api/email/accounts/:id/test', async (req, res) => {
    try {
      await testEmailConnection(req.params.id);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // 邮件模板 CRUD
  adminApp.get('/admin/api/email/templates', (req, res) => {
    try {
      const { projectId } = req.query;
      const pid = projectId && projectId !== 'default' ? projectId : null;
      const templates = db.prepare('SELECT * FROM email_templates WHERE (project_id = ? OR project_id IS NULL) AND is_active = 1 ORDER BY category, name')
        .all(pid);
      res.json({ templates });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.post('/admin/api/email/templates', (req, res) => {
    try {
      const { name, subject, body_html, body_text, category, variables, projectId } = req.body;
      const id = 'et_' + crypto.randomBytes(8).toString('hex');
      db.prepare('INSERT INTO email_templates (id, project_id, name, subject, body_html, body_text, category, variables) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, projectId || 'default', name, subject, body_html, body_text || '', category || 'general', JSON.stringify(variables || []));
      res.json({ id, success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.put('/admin/api/email/templates/:id', (req, res) => {
    try {
      const { name, subject, body_html, body_text, category, variables, is_active } = req.body;
      const updates = [];
      const vals = [];
      if (name !== undefined) { updates.push('name = ?'); vals.push(name); }
      if (subject !== undefined) { updates.push('subject = ?'); vals.push(subject); }
      if (body_html !== undefined) { updates.push('body_html = ?'); vals.push(body_html); }
      if (body_text !== undefined) { updates.push('body_text = ?'); vals.push(body_text); }
      if (category !== undefined) { updates.push('category = ?'); vals.push(category); }
      if (variables !== undefined) { updates.push('variables = ?'); vals.push(JSON.stringify(variables)); }
      if (is_active !== undefined) { updates.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
      updates.push('updated_at = ?'); vals.push(sqlNow());
      if (updates.length <= 1) return res.status(400).json({ error: 'No fields to update' });
      vals.push(req.params.id);
      db.prepare(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.delete('/admin/api/email/templates/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM email_templates WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // 发送单封邮件
  adminApp.post('/admin/api/email/send', async (req, res) => {
    try {
      const { accountId, to, subject, body_html, body_text, templateId, variables, customerId } = req.body;
      let html = body_html;
      let text = body_text;
      let finalSubject = subject;
      if (templateId) {
        const tmpl = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(templateId);
        if (tmpl) {
          html = renderTemplate(tmpl.body_html, variables || {});
          finalSubject = renderTemplate(tmpl.subject, variables || {});
        }
      }
      // 添加退订链接（渲染实际URL）
      if (html) {
        const unsubUrl = generateUnsubscribeUrl(to);
        html += '<p style="font-size:12px;color:#999;margin-top:20px;">如不想收到此类邮件，<a href="' + unsubUrl + '">点击退订</a></p>';
      }
      const result = await sendEmail(accountId, to, finalSubject, html, text);
      // 写入 messages_v2
      if (customerId && result.sent) {
        const mv2Id = 'mv2_' + crypto.randomBytes(8).toString('hex');
        const emailProjectId = db.prepare('SELECT project_id FROM customers_v2 WHERE id = ?').get(customerId)?.project_id || '';
        db.prepare("INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, email_subject, email_template_id, project_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
          .run(mv2Id, customerId, accountId, 'email', 'outbound', `[Email] ${finalSubject}`, sqlNow(), 'sent', finalSubject, templateId || '', emailProjectId);
        db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data) VALUES (?, ?, ?)')
          .run(customerId, 'email_sent', JSON.stringify({ to, subject: finalSubject, templateId }));
      }
      res.json(result);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // 退订 webhook（同步更新 customers_v2.is_unsubscribed）
  adminApp.post('/admin/api/unsubscribe/webhook', (req, res) => {
    try {
      const { email, customerId, reason } = req.body;
      db.prepare('INSERT INTO unsubscribe_list (customer_id, email, reason) VALUES (?, ?, ?)')
        .run(customerId || null, email, reason || 'manual');
      // 同步更新 customers_v2
      if (email) {
        db.prepare("UPDATE customers_v2 SET is_unsubscribed = 1, unsubscribed_at = ? WHERE email = ?").run(sqlNow(), email);
      }
      if (customerId) {
        db.prepare("UPDATE customers_v2 SET is_unsubscribed = 1, unsubscribed_at = ? WHERE id = ?").run(sqlNow(), customerId);
      }
      console.log(`📧 Unsubscribed: ${email} (customerId: ${customerId || 'N/A'}, reason: ${reason || 'manual'})`);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // 退订公开端点（邮件退订链接点击后跳转）
  adminApp.get('/unsubscribe', (req, res) => {
    try {
      const { email, token } = req.query;
      if (!email || !token) return res.status(400).send('参数缺失');
      // 简单 token 验证：token = email 的 hmac-sha256 (admin_token)
      const adminToken = process.env.ADMIN_TOKEN || 'aa123123';
      const expectedToken = crypto.createHmac('sha256', adminToken).update(email).digest('hex').slice(0, 16);
      if (token !== expectedToken) return res.status(403).send('无效的退订链接');
      // 执行退订
      const existing = db.prepare('SELECT 1 FROM unsubscribe_list WHERE email = ?').get(email);
      if (!existing) {
        db.prepare('INSERT INTO unsubscribe_list (email, reason) VALUES (?, ?)').run(email, 'email_link');
      }
      db.prepare("UPDATE customers_v2 SET is_unsubscribed = 1, unsubscribed_at = ? WHERE email = ?").run(sqlNow(), email);
      console.log(`📧 Unsubscribed via link: ${email}`);
      res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>退订成功</title></head>
<body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center;color:#333">
<h2>✅ 退订成功</h2><p>您已成功退订 YuKoLi 的邮件通知。</p>
<p style="color:#999;font-size:14px">如需重新订阅，请联系您的销售代表。</p>
</body></html>`);
    } catch(e) { res.status(500).send('退订处理失败'); }
  });

  // 生成退订URL辅助函数
  function generateUnsubscribeUrl(email) {
    const adminToken = process.env.ADMIN_TOKEN || 'aa123123';
    const token = crypto.createHmac('sha256', adminToken).update(email).digest('hex').slice(0, 16);
    const baseUrl = process.env.PUBLIC_URL || process.env.BASE_URL || '';
    return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
  }

  adminApp.delete('/admin/api/unsubscribe/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM unsubscribe_list WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.get('/admin/api/unsubscribe/list', (req, res) => {
    try {
      const { projectId } = req.query;
      let list;
      if (projectId && projectId !== 'default') {
        list = db.prepare('SELECT * FROM unsubscribe_list WHERE (project_id = ? OR project_id IS NULL) ORDER BY created_at DESC LIMIT 100').all(projectId);
      } else {
        list = db.prepare('SELECT * FROM unsubscribe_list ORDER BY created_at DESC LIMIT 100').all();
      }
      res.json({ list });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Escalation APIs
  adminApp.get('/admin/api/escalation/events', (req, res) => {
    try {
      const { status: statusFilter, count_only, project_id } = req.query;
      if (count_only === 'true') {
        let cq = 'SELECT COUNT(*) as cnt FROM escalation_events';
        const cp = [];
        const conds = [];
        if (statusFilter) { conds.push('status = ?'); cp.push(statusFilter); }
        if (project_id && project_id !== 'default') { conds.push('project_id = ?'); cp.push(project_id); }
        if (conds.length) cq += ' WHERE ' + conds.join(' AND ');
        const { cnt } = db.prepare(cq).get(...cp);
        return res.json({ count: cnt });
      }
      let query = 'SELECT e.*, c.display_name as customer_name, c.phone FROM escalation_events e LEFT JOIN customers_v2 c ON e.customer_id = c.id';
      const params = [];
      const conds = [];
      if (statusFilter) { conds.push('e.status = ?'); params.push(statusFilter); }
      if (project_id && project_id !== 'default') { conds.push('e.project_id = ?'); params.push(project_id); }
      if (conds.length) query += ' WHERE ' + conds.join(' AND ');
      query += ' ORDER BY e.created_at DESC LIMIT 50';
      const events = db.prepare(query).all(...params);
      res.json({ events });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Escalation event detail API
  adminApp.get('/admin/api/escalation/events/:id/detail', (req, res) => {
    try {
      const ev = db.prepare(`
        SELECT e.*, c.display_name as customer_name, c.phone, c.status as customer_status,
               c.health_score, c.churn_risk, c.sentiment_trend, c.intervene_mode, c.project_id
        FROM escalation_events e
        LEFT JOIN customers_v2 c ON e.customer_id = c.id
        WHERE e.id = ?
      `).get(req.params.id);
      if (!ev) return res.status(404).json({ error: 'Event not found' });

      // Get project name
      let project_name = '';
      if (ev.project_id) {
        const proj = db.prepare('SELECT name FROM projects WHERE id = ?').get(ev.project_id);
        if (proj) project_name = proj.name;
      }

      // Get recent messages (last 5)
      const messages = db.prepare(
        'SELECT direction, content, timestamp, status FROM messages_v2 WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 5'
      ).all(ev.customer_id).reverse(); // newest last for display

      // Generate suggestion based on event_type
      const suggestions = {
        churn_risk: '建议立即跟进，提供专属优惠或安排人工回访',
        negative_emotion: '建议切换到安抚模式，先处理情绪再谈业务',
        complaint: '建议立即介入，优先处理投诉问题，避免升级扩散',
        health_low: '建议检查近期沟通频率，激活客户互动'
      };
      const suggestion = suggestions[ev.event_type] || '请根据具体情况处理';

      res.json({ event: ev, project_name, messages, suggestion });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  adminApp.put('/admin/api/escalation/events/:id/resolve', (req, res) => {
    try {
      const { note } = req.body;
      db.prepare("UPDATE escalation_events SET status = 'resolved', resolved_at = ? WHERE id = ?")
        .run(sqlNow(), req.params.id);
      if (note) {
        const ev = db.prepare('SELECT reason FROM escalation_events WHERE id = ?').get(req.params.id);
        if (ev) {
          const newReason = ev.reason + (ev.reason ? ' | ' : '') + note;
          db.prepare('UPDATE escalation_events SET reason = ? WHERE id = ?').run(newReason, req.params.id);
        }
      }
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

// ============================================================
// 邮件序列执行引擎
// ============================================================

// 添加客户到序列
function addCustomerToSequence(customerId, sequenceId, accountId) {
  try {
    const member = db.prepare('SELECT id FROM email_sequence_members WHERE sequence_id = ? AND customer_id = ?').get(sequenceId, customerId);
    if (member) return { ok: false, reason: 'already_in_sequence' };

    const nextSend = sqlNow(); // 第一步立即发送
    const seqProjectId = db.prepare('SELECT project_id FROM email_sequences WHERE id = ?').get(sequenceId)?.project_id || '';
    db.prepare('INSERT OR IGNORE INTO email_sequence_members (sequence_id, customer_id, current_step, next_send_at, project_id) VALUES (?, ?, 0, ?, ?)')
      .run(sequenceId, customerId, nextSend, seqProjectId);
    return { ok: true };
  } catch(e) { return { ok: false, reason: e.message }; }
}

// 执行到期序列步骤
async function processDueSequenceSteps() {
  let processedCount = 0;
  const dueMembers = db.prepare(`
    SELECT m.*, s.name as seq_name, st.template_id, st.delay_days, st.step_order
    FROM email_sequence_members m
    JOIN email_sequences s ON m.sequence_id = s.id
    JOIN email_sequence_steps st ON st.sequence_id = m.sequence_id AND st.step_order = m.current_step + 1
    WHERE m.status = 'active' AND m.next_send_at <= datetime('now')
    AND s.is_active = 1
    LIMIT 20
  `).all();

  for (const member of dueMembers) {
    try {
      const customer = db.prepare('SELECT * FROM customers_v2 WHERE id = ?').get(member.customer_id);
      if (!customer) continue;

      // 检查退订
      if (customer.is_unsubscribed) {
        db.prepare("UPDATE email_sequence_members SET status = 'unsubscribed' WHERE id = ?").run(member.id);
        continue;
      }

      // 检查客户最近是否有互动（收到消息回复就暂停）
      const recentReply = db.prepare("SELECT COUNT(*) as c FROM messages_v2 WHERE customer_id = ? AND direction = 'inbound' AND timestamp > datetime('now', '-7 days')").get(member.customer_id);
      if (recentReply && recentReply.c > 0) {
        // 客户活跃，暂停序列（避免打扰）
        const nextDelay = Math.min(member.delay_days || 7, 14);
        db.prepare("UPDATE email_sequence_members SET next_send_at = datetime('now', '+? days') WHERE id = ?").run(nextDelay, member.id);
        continue;
      }

      // 获取邮件账户（使用项目的第一个活跃账户）
      const account = db.prepare("SELECT * FROM email_accounts WHERE is_active = 1 AND (project_id = ? OR project_id = 'default') LIMIT 1").get(customer.project_id || 'default');
      if (!account) continue;

      const customerEmail = customer.email;
      if (!customerEmail) continue;

      // 渲染模板
      const variables = {
        customer_name: customer.display_name || customer.phone || '',
        customer_email: customerEmail,
        business_type: customer.business_type || '',
        company_name: 'YuKoLi',
        rep_name: '貂貂',
        date: new Date().toLocaleDateString('zh-CN')
      };

      // 从知识库加载模板内容（如果 template_id 是知识库文件名）
      let subject = `YuKoLi - ${member.seq_name} - Step ${member.step_order + 1}`;
      let bodyHtml = `<p>Dear ${variables.customer_name},</p>`;

      // 尝试从 email_templates 表加载
      const tmpl = db.prepare('SELECT * FROM email_templates WHERE id = ? AND is_active = 1').get(member.template_id) || db.prepare('SELECT * FROM email_templates WHERE name = ? AND is_active = 1').get(member.template_id);
      if (tmpl) {
        subject = renderTemplate(tmpl.subject, variables);
        bodyHtml = renderTemplate(tmpl.body_html, variables);
      }

      // A/B 测试检查
      const abTest = db.prepare("SELECT * FROM email_ab_tests WHERE status = 'running' AND project_id = ?").get(customer.project_id || 'default');

      // 发送邮件
      const result = await sendEmail(account.id, customerEmail, subject, bodyHtml, '');

      if (result.sent) {
        // 更新成员进度
        db.prepare(`
          UPDATE email_sequence_members SET current_step = ?, last_sent_at = ?, next_send_at = datetime('now', '+? days')
          WHERE id = ?
        `).run(member.step_order, sqlNow(), member.delay_days || 7, member.id);

        // 写入消息记录
        const mv2Id = 'mv2_' + crypto.randomBytes(8).toString('hex');
        db.prepare("INSERT INTO messages_v2 (id, customer_id, account_id, channel, direction, content, timestamp, status, email_subject, project_id) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .run(mv2Id, customer.id, account.id, 'email', 'outbound', `[Sequence] ${subject}`, sqlNow(), 'sent', subject, customer.project_id || '');

        // 时间线
        db.prepare('INSERT INTO customer_timeline (customer_id, event_type, event_data) VALUES (?, ?, ?)')
          .run(customer.id, 'sequence_email_sent', JSON.stringify({ sequence: member.seq_name, step: member.step_order + 1 }));
        processedCount++;

        // A/B 测试记录
        if (abTest) {
          // 简单的 50/50 分配
          const isA = Math.random() < 0.5;
          db.prepare(`UPDATE email_ab_tests SET total_${isA ? 'a' : 'b'} = total_${isA ? 'a' : 'b'} + 1 WHERE id = ?`).run(abTest.id);
        }
      }

    } catch(e) {
      console.error(`❌ Sequence step failed for ${member.customer_id}:`, e.message);
    }
  }
  return processedCount;
}

// 序列 cron（每小时检查一次）
cron.schedule('0 * * * *', () => {
  processDueSequenceSteps().catch(e => console.error('❌ Sequence cron error:', e.message));
});

// ── Email Sequence APIs ──

adminApp.get('/admin/api/email/sequences', (req, res) => {
  try {
    const { projectId } = req.query;
    const pf = projectId && projectId !== 'default' ? " WHERE project_id = ? OR project_id = 'default'" : '';
    const sequences = pf
      ? db.prepare("SELECT * FROM email_sequences" + pf).all(projectId)
      : db.prepare('SELECT * FROM email_sequences').all();
    for (const seq of sequences) {
      const steps = db.prepare('SELECT * FROM email_sequence_steps WHERE sequence_id = ? ORDER BY step_order').all(seq.id);
      const memberCount = db.prepare("SELECT COUNT(*) as c FROM email_sequence_members WHERE sequence_id = ? AND status = 'active'").get(seq.id)?.c || 0;
      const completedCount = db.prepare("SELECT COUNT(*) as c FROM email_sequence_members WHERE sequence_id = ? AND status = 'completed'").get(seq.id)?.c || 0;
      seq.steps = steps;
      seq.active_members = memberCount;
      seq.completed_members = completedCount;
    }
    res.json({ sequences });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/email/sequences/:id/start', (req, res) => {
  try {
    const { customerId, accountId } = req.body;
    const result = addCustomerToSequence(customerId, req.params.id, accountId);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/email/sequences/:id/stop', (req, res) => {
  try {
    const { customerId } = req.body;
    db.prepare("UPDATE email_sequence_members SET status = 'stopped' WHERE sequence_id = ? AND customer_id = ?")
      .run(req.params.id, customerId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/email/sequences/:id/trigger', async (req, res) => {
  try {
    const oldLimit = 20;
    const processed = await processDueSequenceSteps();
    res.json({ ok: true, processed: processed || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.get('/admin/api/email/sequences/:id/members', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT m.*, c.display_name as customer_name, c.phone, c.email, c.health_score
      FROM email_sequence_members m
      LEFT JOIN customers_v2 c ON m.customer_id = c.id
      WHERE m.sequence_id = ?
      ORDER BY m.status, m.current_step DESC
    `).all(req.params.id);
    res.json({ members });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── A/B Test APIs ──

adminApp.post('/admin/api/email/ab/create', (req, res) => {
  try {
    const { name, testType, templateAId, templateBId, trafficPercent, metric, projectId } = req.body;
    const id = 'ab_' + crypto.randomBytes(8).toString('hex');
    db.prepare('INSERT INTO email_ab_tests (id, project_id, name, test_type, template_a_id, template_b_id, traffic_percent, metric) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, projectId || 'default', name, testType || 'subject', templateAId, templateBId, trafficPercent || 50, metric || 'open_rate');
    res.json({ id, success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.get('/admin/api/email/ab/list', (req, res) => {
  try {
    const { projectId } = req.query;
    let tests;
    if (projectId && projectId !== 'default') {
      tests = db.prepare('SELECT * FROM email_ab_tests WHERE project_id = ? OR project_id = \'default\' ORDER BY created_at DESC LIMIT 20').all(projectId);
    } else {
      tests = db.prepare('SELECT * FROM email_ab_tests ORDER BY created_at DESC LIMIT 20').all();
    }
    res.json({ tests });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.get('/admin/api/email/ab/:id/results', (req, res) => {
  try {
    const test = db.prepare('SELECT * FROM email_ab_tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Not found' });
    const totalA = test.total_a || 0;
    const totalB = test.total_b || 0;
    const successA = test.success_a || 0;
    const successB = test.success_b || 0;
    const rateA = totalA > 0 ? (successA / totalA * 100) : 0;
    const rateB = totalB > 0 ? (successB / totalB * 100) : 0;
    const winner = rateA > rateB ? 'A' : rateB > rateA ? 'B' : 'tie';
    res.json({ ...test, rateA: Math.round(rateA * 10) / 10, rateB: Math.round(rateB * 10) / 10, winner, total: totalA + totalB });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/email/ab/:id/end', (req, res) => {
  try {
    const winner = req.body.winner;
    db.prepare("UPDATE email_ab_tests SET status = 'ended', winner = ?, ended_at = ? WHERE id = ?")
      .run(winner || '', sqlNow(), req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Webhook Subscription APIs ──

adminApp.get('/admin/api/webhooks', (req, res) => {
  try {
    const { projectId } = req.query;
    let subs;
    if (projectId && projectId !== 'default') {
      subs = db.prepare('SELECT * FROM webhook_subscriptions WHERE is_active = 1 AND project_id = ?').all(projectId);
    } else {
      subs = db.prepare('SELECT * FROM webhook_subscriptions WHERE is_active = 1').all();
    }
    res.json({ subscriptions: subs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.post('/admin/api/webhooks', (req, res) => {
  try {
    const { eventType, url, secret, projectId } = req.body;
    db.prepare('INSERT INTO webhook_subscriptions (project_id, event_type, url, secret) VALUES (?, ?, ?, ?)')
      .run(projectId || 'default', eventType, url, secret || '');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

adminApp.delete('/admin/api/webhooks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Webhook 触发辅助函数（在客户阶段变更、成交等事件时调用）
function triggerWebhooks(eventType, data) {
  const subs = db.prepare("SELECT * FROM webhook_subscriptions WHERE event_type = ? AND is_active = 1").all(eventType);
  for (const sub of subs) {
    axios.post(sub.url, { event: eventType, data, timestamp: new Date().toISOString() }, {
      headers: sub.secret ? { 'X-Webhook-Secret': sub.secret } : {},
      timeout: 5000
    }).catch(() => {}); // 静默失败
  }
}

// ============================================================
// Model Analytics API
// ============================================================

// GET /admin/api/model-analytics/overview
adminApp.get('/admin/api/model-analytics/overview', (req, res) => {
  try {
    const projectId = req.query.project_id || 'all';
    const where = projectId !== 'all' ? 'WHERE project_id = ?' : '';
    const params = projectId !== 'all' ? [projectId] : [];

    const today = db.prepare(`SELECT COUNT(*) as count FROM ai_call_logs ${where} AND date(timestamp) = date('now')`).get(...params);
    const yesterday = db.prepare(`SELECT COUNT(*) as count FROM ai_call_logs ${where} AND date(timestamp) = date('now', '-1 day')`).get(...params);

    const todayStats = db.prepare(`SELECT AVG(latency_ms) as avg_latency, AVG(quality_score) as avg_quality, CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate FROM ai_call_logs ${where} AND date(timestamp) = date('now')`).get(...params);
    const yesterdayStats = db.prepare(`SELECT AVG(latency_ms) as avg_latency, AVG(quality_score) as avg_quality, CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate FROM ai_call_logs ${where} AND date(timestamp) = date('now', '-1 day')`).get(...params);

    // 本周数据
    const weekStats = db.prepare(`SELECT COUNT(*) as count FROM ai_call_logs ${where} AND timestamp >= datetime('now', '-7 days')`).get(...params);

    res.json({
      today: { calls: today.count, avgLatency: Math.round(todayStats.avg_latency || 0), successRate: Math.round((todayStats.success_rate || 0) * 100), avgQuality: Math.round((todayStats.avg_quality || 0) * 10) / 10 },
      yesterday: { calls: yesterday.count, avgLatency: Math.round(yesterdayStats.avg_latency || 0), successRate: Math.round((yesterdayStats.success_rate || 0) * 100), avgQuality: Math.round((yesterdayStats.avg_quality || 0) * 10) / 10 },
      week: { calls: weekStats.count },
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/api/model-analytics/trend
adminApp.get('/admin/api/model-analytics/trend', (req, res) => {
  try {
    const { period = 'daily', model = 'all', from, to } = req.query;
    const projectId = req.query.project_id || 'all';
    let where = '';
    const params = [];

    if (projectId !== 'all') { where += ' AND project_id = ?'; params.push(projectId); }
    if (model !== 'all') { where += ' AND model = ?'; params.push(model); }
    if (from) { where += ' AND timestamp >= ?'; params.push(from + ' 00:00:00'); }
    if (to) { where += ' AND timestamp <= ?'; params.push(to + ' 23:59:59'); }

    const fmt = period === 'hourly' ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
    const sql = `SELECT strftime('${fmt}', timestamp) as period, model, COUNT(*) as count, AVG(latency_ms) as avg_latency, CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate, AVG(quality_score) as avg_quality FROM ai_call_logs WHERE 1=1 ${where} GROUP BY period, model ORDER BY period`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/api/model-analytics/comparison
adminApp.get('/admin/api/model-analytics/comparison', (req, res) => {
  try {
    const { from, to } = req.query;
    const projectId = req.query.project_id || 'all';
    let where = '';
    const params = [];

    if (projectId !== 'all') { where += ' AND project_id = ?'; params.push(projectId); }
    if (from) { where += ' AND timestamp >= ?'; params.push(from + ' 00:00:00'); }
    if (to) { where += ' AND timestamp <= ?'; params.push(to + ' 23:59:59'); }

    const sql = `SELECT model, COUNT(*) as count, AVG(latency_ms) as avg_latency, CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as success_rate, AVG(quality_score) as avg_quality, SUM(total_tokens) as total_tokens, SUM(CASE WHEN attempts > 1 THEN 1 ELSE 0 END) as fallback_count FROM ai_call_logs WHERE 1=1 ${where} GROUP BY model ORDER BY count DESC`;
    const rows = db.prepare(sql).all(...params);

    const totalCalls = rows.reduce((s, r) => s + r.count, 0);

    // 计算 P95
    const p95sql = `SELECT model, latency_ms FROM ai_call_logs WHERE 1=1 ${where} ORDER BY model, latency_ms`;
    const allLatencies = db.prepare(p95sql).all(...params);
    const byModel = {};
    for (const r of allLatencies) {
      if (!byModel[r.model]) byModel[r.model] = [];
      byModel[r.model].push(r.latency_ms);
    }
    const p95 = {};
    for (const [m, latencies] of Object.entries(byModel)) {
      if (latencies.length > 0) {
        latencies.sort((a, b) => a - b);
        p95[m] = latencies[Math.floor(latencies.length * 0.95)] || 0;
      }
    }

    res.json(rows.map(r => ({
      ...r,
      percentage: totalCalls > 0 ? Math.round(r.count / totalCalls * 100) : 0,
      avg_latency: Math.round(r.avg_latency || 0),
      success_rate: Math.round((r.success_rate || 0) * 100),
      avg_quality: Math.round((r.avg_quality || 0) * 10) / 10,
      p95_latency: p95[r.model] || 0,
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/api/model-analytics/stage-breakdown
adminApp.get('/admin/api/model-analytics/stage-breakdown', (req, res) => {
  try {
    const projectId = req.query.project_id || 'all';
    let where = '';
    const params = [];
    if (projectId !== 'all') { where += ' AND project_id = ?'; params.push(projectId); }

    const sql = `SELECT customer_stage as stage, model, COUNT(*) as count, AVG(latency_ms) as avg_latency, AVG(quality_score) as avg_quality FROM ai_call_logs WHERE customer_stage IS NOT NULL ${where} GROUP BY customer_stage, model ORDER BY customer_stage, count DESC`;
    const rows = db.prepare(sql).all(...params);

    // 按阶段聚合
    const stages = {};
    for (const r of rows) {
      if (!stages[r.stage]) stages[r.stage] = { stage: r.stage, total: 0, models: [] };
      stages[r.stage].total += r.count;
      stages[r.stage].models.push(r);
    }
    const result = Object.values(stages).map(s => ({
      stage: s.stage,
      count: s.total,
      topModel: s.models[0]?.model || '-',
      avgLatency: Math.round(s.models.reduce((sum, m) => sum + (m.avg_latency || 0) * m.count, 0) / s.total),
      avgQuality: Math.round(s.models.reduce((sum, m) => sum + (m.avg_quality || 0) * m.count, 0) / s.total * 10) / 10,
      models: s.models.map(m => ({ model: m.model, count: m.count, percentage: Math.round(m.count / s.total * 100) })),
    }));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/api/model-analytics/recent-errors
adminApp.get('/admin/api/model-analytics/recent-errors', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = db.prepare(`SELECT * FROM ai_call_logs WHERE status IN ('failed', 'empty') ORDER BY id DESC LIMIT ?`).all(limit);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /admin/api/model-analytics/top-slow
adminApp.get('/admin/api/model-analytics/top-slow', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = db.prepare(`SELECT * FROM ai_call_logs ORDER BY latency_ms DESC LIMIT ?`).all(limit);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Serve admin UI
adminApp.get('/admin', (req, res) => {
  const htmlPath = path.join(__dirname, 'admin-ui.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('admin-ui.html not found');
  }
});

const ADMIN_PORT = process.env.ADMIN_PORT || 8000;
adminApp.listen(ADMIN_PORT, '0.0.0.0', () => {
  console.log(`🖥️  Admin panel: http://0.0.0.0:${ADMIN_PORT}/admin`);
});
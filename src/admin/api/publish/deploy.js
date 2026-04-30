'use strict';

// Deployment route — syncs uploaded images to site assets and git pushes.

const path = require('path');
const fs = require('fs');
const { logAudit } = require('../../db/init');

function deployRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const { requireAdmin } = require('../auth');

  // POST /deploy — 一键发布到网站（生成数据 + 同步图片 + git push）
  router.post('/deploy', requireAdmin, (req, res) => {
    try {
      const { execSync } = require('child_process');
      const projectRoot = path.join(__dirname, '..', '..', '..', '..');

      // 1. 同步图片：把 CMS 上传的图片复制到网站资源目录
      const srcUploads = path.join(__dirname, '..', '..', 'uploads');
      const dstImages = path.join(projectRoot, 'src', 'assets', 'images', 'products');
      if (fs.existsSync(srcUploads)) {
        fs.mkdirSync(dstImages, { recursive: true });
        const files = fs.readdirSync(srcUploads);
        let copied = 0;
        files.forEach(f => {
          const src = path.join(srcUploads, f);
          const dst = path.join(dstImages, f);
          if (fs.statSync(src).isFile() && !fs.existsSync(dst)) {
            fs.copyFileSync(src, dst);
            copied++;
          }
        });
        console.log('[CMS] Copied', copied, 'images to', dstImages);
      }

      // 2. Git add + commit + push
      const addCmd = `cd "${projectRoot}" && git add src/assets/js/product-data-table.js src/assets/images/products/ 2>/dev/null; echo "done"`;
      execSync(addCmd, { stdio: 'pipe' });

      const commitCmd = `cd "${projectRoot}" && git commit -m "cms: auto-publish ${new Date().toISOString().slice(0,16)}" --allow-empty`;
      try { execSync(commitCmd, { stdio: 'pipe' }); } catch(e) { /* nothing to commit is ok */ }

      const pushCmd = `cd "${projectRoot}" && git push origin dev`;
      execSync(pushCmd, { stdio: 'pipe', timeout: 30000 });

      logAudit(db, req.user.userId, req.user.username, 'deploy', 'cms', null, null, { status: 'pushed' });
      res.json({ message: '发布成功，预计 2-5 分钟内网站更新', status: 'pushed' });
    } catch (e) {
      logAudit(db, req.user.userId, req.user.username, 'deploy', 'cms', null, null, { status: 'error', error: e.message });
      res.status(500).json({ error: '发布失败: ' + e.message });
    }
  });

  return router;
}

module.exports = { deployRoutes };

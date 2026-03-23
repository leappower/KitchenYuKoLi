#!/usr/bin/env node
'use strict';
/**
 * fix-og-tags.js — 为 solutions 子页面补充完整的 OG 标签
 */
const fs = require('fs');
const path = require('path');

const SOLUTIONS_DIR = path.resolve(__dirname, '..', 'src', 'pages', 'solutions');

const PAGES = [
  {
    slug: 'hotpot',
    title: 'Yukoli | 火锅/麻辣烫智能厨房解决方案',
    desc: '为火锅和麻辣烫连锁提供自动化底料调配、智能控温、标准化出品解决方案，降低人工依赖。',
  },
  {
    slug: 'cloud-kitchen',
    title: 'Yukoli | 云厨房/外卖智能厨房解决方案',
    desc: '专为云厨房和外卖场景设计的智能设备方案，高产能、小占地、快速回本。',
  },
  {
    slug: 'canteen',
    title: 'Yukoli | 食堂/中央厨房智能厨房解决方案',
    desc: '为大型食堂和中央厨房提供标准化、规模化智能烹饪解决方案，日产万份以上。',
  },
  {
    slug: 'southeast-asian',
    title: 'Yukoli | 泰式/东南亚本地餐饮解决方案',
    desc: '针对东南亚本地餐饮场景优化的智能厨房解决方案，适配本地食材和烹饪方式。',
  },
];

const VARIANTS = ['pc', 'tablet', 'mobile'];
let totalFixed = 0;

for (const page of PAGES) {
  for (const v of VARIANTS) {
    const filePath = path.join(SOLUTIONS_DIR, page.slug, 'index-' + v + '.html');
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // og:type
    if (content.indexOf('og:type') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:type" content="website">\n<meta property="og:title"'
      );
      changed = true;
    }

    // og:url
    if (content.indexOf('og:url') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:url" content="https://www.kitchen.yukoli.com/solutions/' + page.slug + '/">\n<meta property="og:title"'
      );
      changed = true;
    }

    // og:image
    if (content.indexOf('og:image') === -1) {
      content = content.replace(
        '<meta property="og:title"',
        '<meta property="og:image" content="https://www.kitchen.yukoli.com/assets/images/og-' + page.slug + '-solution.webp">\n<meta property="og:title"'
      );
      changed = true;
    }

    // og:description
    if (content.indexOf('og:description') === -1) {
      content = content.replace(
        '<meta property="og:title" content="' + page.title + '">',
        '<meta property="og:title" content="' + page.title + '">\n<meta property="og:description" content="' + page.desc + '">'
      );
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      totalFixed++;
    }
  }
}

console.log('Fixed OG tags in ' + totalFixed + ' files');

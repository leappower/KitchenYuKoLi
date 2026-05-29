#!/usr/bin/env node
/**
 * lint-build-ssg-regex.js — pre-commit hook
 * 验证 build-ssg.js 中 generate404 函数输出的正则表达式是否合法
 * 
 * 只检查 staged 中的 build-ssg.js 变更
 * 如果没有变更，静默退出（code 0）
 */

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'scripts', 'build-ssg.js');
if (!fs.existsSync(filePath)) process.exit(0);

const src = fs.readFileSync(filePath, 'utf-8');

// 定位 redirectScript 拼接段
const fnStart = src.indexOf('var redirectScript');
const fnEnd = src.indexOf('html = html.replace', fnStart);
if (fnStart < 0 || fnEnd < 0) process.exit(0); // 未修改或结构变化

// 提取所有字符串字面量并拼接
const fragments = src.slice(fnStart, fnEnd).match(/['][^']*[']/g) || [];
const output = fragments.map(f => eval(f)).join('\n');

// 验证每行正则
const errors = [];
const lines = output.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.startsWith('//') || l.startsWith('<!--') || !l) continue;
  // 提取 /regex/flags 模式
  const regexes = l.match(/\/[^/].*?\/[gimsuyd]*(?=\s*[\.\],;])/g);
  if (!regexes) continue;
  for (const r of regexes) {
    try {
      const lastSlash = r.lastIndexOf('/');
      new RegExp(r.slice(1, lastSlash), r.slice(lastSlash + 1));
    } catch (e) {
      errors.push(`  L${i + 1}: ${r} → ${e.message}`);
    }
  }
}

if (errors.length > 0) {
  console.log('❌ generate404 正则验证失败:');
  errors.forEach(e => console.log(e));
  process.exit(1);
}

#!/usr/bin/env node
/**
<<<<<<< HEAD
 * lint-build-ssg-regex.js — pre-commit / pre-push hook
 *
 * 验证 build-ssg.js 中 generate404 函数输出的 JS 代码是否语法合法。
 *
 * 不做正则提取（因为包含 [^/] 的正则会干扰通配解析），
 * 直接用 vm.Script 做语法检查。
=======
 * lint-build-ssg-regex.js — pre-commit hook
 * 验证 build-ssg.js 中 generate404 函数输出的正则表达式是否合法
 * 
 * 只检查 staged 中的 build-ssg.js 变更
 * 如果没有变更，静默退出（code 0）
>>>>>>> 0031f86b4 (ci: 增加多层次验证体系)
 */

const fs = require('fs');
const path = require('path');
<<<<<<< HEAD
const vm = require('vm');
=======
>>>>>>> 0031f86b4 (ci: 增加多层次验证体系)

const filePath = path.resolve(__dirname, '..', 'scripts', 'build-ssg.js');
if (!fs.existsSync(filePath)) process.exit(0);

const src = fs.readFileSync(filePath, 'utf-8');

// 定位 redirectScript 拼接段
const fnStart = src.indexOf('var redirectScript');
<<<<<<< HEAD
const fnEnd = src.indexOf('\n  html = html.replace', fnStart);
if (fnStart < 0 || fnEnd < 0) { process.exit(0); }

const scriptPart = src.slice(fnStart, fnEnd)
  .replace(/^var redirectScript\s*=/, '').trim();

const bp = '';
const routesJson = '[]';

let output;
try {
  output = eval(scriptPart);
} catch (e) {
  console.log('❌ 无法 eval redirectScript:', e.message);
  process.exit(1);
}

const scriptMatch = output.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { process.exit(0); }

const jsCode = scriptMatch[1].trim();

// 用 vm.Script 检查语法（不做类型推断，不执行）
try {
  new vm.Script(jsCode);
} catch (e) {
  // vm.Script 会对每个正则进行编译，如果正则有问题会在这里捕获
  console.log('❌ generate404 输出的 JS 语法错误:');
  console.log(`  ${e.message}`);
  
  const lines = jsCode.split('\n');
  const errMatch = e.stack.match(/:(\d+):(\d+)/);
  if (errMatch) {
    const errLine = parseInt(errMatch[1]) - 1;
    if (errLine >= 0 && errLine < lines.length) {
      console.log(`  第 ${errLine + 1} 行: ${lines[errLine].trim()}`);
    }
  }
=======
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
>>>>>>> 0031f86b4 (ci: 增加多层次验证体系)
  process.exit(1);
}

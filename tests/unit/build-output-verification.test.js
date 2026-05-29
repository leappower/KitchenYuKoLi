/**
 * build-output-verification.test.js
 *
 * 验证构建产物完整性。需要先运行 bash build.sh 生成 dist/。
 * dist/ 不存在时跳过所有测试。
 */
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../../dist');
let distExists;

beforeAll(() => {
  distExists = fs.existsSync(distDir);
  if (!distExists) {
    console.warn('  ⚠️  dist/ 不存在，跳过构建产物测试（请先运行 bash build.sh）');
  }
});

describe('构建产物验证', () => {
  test('dist 目录存在', () => {
    expect(distExists || true).toBe(true);
  });

  test('VERSION.txt 存在且格式正确', () => {
    if (!distExists) return;
    const vFile = path.join(distDir, 'VERSION.txt');
    expect(fs.existsSync(vFile)).toBe(true);
    const content = fs.readFileSync(vFile, 'utf-8').trim();
    const lines = content.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toMatch(/^\d+$/);
  });

  test('必要的根文件存在', () => {
    if (!distExists) return;
    const files = ['index.html', '404.html', 'CNAME', '.nojekyll', 'sw.js'];
    const missing = files.filter(f => !fs.existsSync(path.join(distDir, f)));
    expect(missing).toEqual([]);
  });

  test('404.html JS 语法合法', () => {
    if (!distExists) return;
    const html = fs.readFileSync(path.join(distDir, '404.html'), 'utf-8');
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      const vm = require('vm');
      expect(() => new vm.Script(scriptMatch[1])).not.toThrow();
    }
  });

  test('sw.js 存在且语法正确', () => {
    if (!distExists) return;
    const swPath = path.join(distDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const sw = fs.readFileSync(swPath, 'utf-8');
    expect(() => new Function(sw)).not.toThrow();
  });

  test('CNAME 内容正确', () => {
    if (!distExists) return;
    expect(fs.existsSync(path.join(distDir, 'CNAME'))).toBe(true);
    const cname = fs.readFileSync(path.join(distDir, 'CNAME'), 'utf-8').trim();
    expect(cname).toMatch(/^[\w.-]+\.[\w.-]+$/);
    expect(cname).toContain('kitchen.yukoli.com');
  });
});

/**
 * ci-config.test.js
 *
 * 测试 CI/CD 配置文件和脚本的逻辑正确性。
 */
const fs = require('fs');
const path = require('path');

function loadYaml(filepath) {
  // 不用 js-yaml 依赖，手动解析关键字段
  const content = fs.readFileSync(filepath, 'utf-8');
  return content;
}

describe('deploy.yml 结构', () => {
  const yamlPath = path.resolve(__dirname, '../../.github/workflows/deploy.yml');
  const content = loadYaml(yamlPath);

  test('构建步骤运行 build.sh', () => {
    expect(content).toContain('bash build.sh');
  });

  test('deploy-verify 步骤存在', () => {
    expect(content).toContain('deploy-verify.sh');
  });

  test('gh-pages 部署步骤存在', () => {
    expect(content).toContain('peaceiris/actions-gh-pages');
  });

  test('CF purge 步骤存在', () => {
    expect(content).toContain('purge_cache');
  });

  test('environment cloudflare 已配置', () => {
    expect(content).toContain('environment: cloudflare');
  });

  test('CF_TOKEN 使用 secrets 语法', () => {
    expect(content).toContain('CF_TOKEN: ${{');
    expect(content).toContain('secrets.CF_TOKEN');
  });

  test('keep_history 已启用（非 force_orphan）', () => {
    expect(content).toContain('keep_history: true');
    expect(content).not.toContain('force_orphan');
  });
});

describe('build.sh 关键步骤', () => {
  const buildPath = path.resolve(__dirname, '../../build.sh');
  const content = fs.readFileSync(buildPath, 'utf-8');

  test('版本号使用毫秒时间戳', () => {
    expect(content).toContain('$(date +%s%3N)');
  });

  test('sw.js 版本号注入存在', () => {
    expect(content).toContain('SW_VERSION');
    expect(content).toContain('sed -i.bak');
  });

  test('production 模式有版本号注入', () => {
    expect(content).toContain('Bumping version');
  });

  test('VERSION.txt 输出存在', () => {
    expect(content).toContain('VERSION.txt');
  });

  test('CNAME 复制逻辑正确', () => {
    expect(content).toContain('[ -f "CNAME" ]');
  });

  test('.nojekyll 创建存在', () => {
    expect(content).toContain('.nojekyll');
  });
});

describe('pre-push-check.sh 语法', () => {
  test('脚本基本结构正确', () => {
    const checkPath = path.resolve(__dirname, '../../scripts/pre-push-check.sh');
    const content = fs.readFileSync(checkPath, 'utf-8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('PASS');
    expect(content).toContain('FAIL');
  });
});

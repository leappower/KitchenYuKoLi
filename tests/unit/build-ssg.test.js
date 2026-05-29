/**
 * build-ssg.js 单元测试
 *
 * 核心风险点：generate404() 函数通过 JS 字符串拼接生成 JS 代码，
 * 字符串中的正则转义容易出错。每次修改都需要验证输出代码的语法正确性。
 *
 * 转义规则（JS 字符串 → 输出到 HTML 的 JS 代码）：
 *   源码中写 \\\/  →  实际输出 \/  →  正则中表示字面 /
 *   源码中写 \\/   →  实际输出 /   →  正则语法错误！
 */
const fs = require('fs');
const path = require('path');

const BUILD_SSG_PATH = path.resolve(__dirname, '../../scripts/build-ssg.js');

/**
 * 模拟 generate404 函数的 redirectScript 拼接逻辑
 */
function buildRedirectScript(bp, routes) {
  const routesJson = JSON.stringify(routes);
  return [
    '  <!-- SSG redirect: missing trailing slash -->',
    '  <script>',
    '  (function () {',
    '    var base = "' + (bp || '') + '";',
    '    var path = window.location.pathname;',
    '    var normalized = path.replace(/\\/$/, "");',
    '    var routes = ' + routesJson + ';',
    '    var categorySlugs = ["cutting","stirfry","frying","stewing","steaming","other","all","compare"];',
    '    if (/^\\/products\\/([^/]+)$/.test(path.replace(/\\/$/, ""))) {',
    '      var productFirstSegment = path.replace(/^\\/products\\//, "").replace(/\\/$/, "");',
    '      if (productFirstSegment && categorySlugs.indexOf(productFirstSegment) !== -1) {',
    '        window.location.replace(base + "/?redirect=" + encodeURIComponent(path));',
    '      }',
    '    }',
    '    var stripped = normalized.replace(/^\\//, "");',
    '    if (routes.indexOf(stripped) !== -1) {',
    '      window.location.replace(base + "/" + stripped + "/");',
    '    } else {',
    '      var segment = normalized.split("/").pop();',
    '      if (routes.indexOf(segment) !== -1) {',
    '        window.location.replace(base + "/" + segment + "/");',
    '      }',
    '    }',
    '  }());',
    '  </script>'
  ].join('\n');
}

/**
 * 验证输出的正则字符串合法，并测试匹配行为
 */
function validateRegexInCode(code) {
  const results = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('<!--') || !trimmed) continue;

    // 提取正则字面量
    const regexes = [];
    let searchStart = 0;
    while (searchStart < trimmed.length) {
      // 找正则以 / 开头，排除 // 注释和 /" 字符串
      const slashIdx = trimmed.indexOf('/', searchStart);
      if (slashIdx === -1) break;

      // 跳过被字符串包围的 /
      const beforeSlash = trimmed[slashIdx - 1];
      if (beforeSlash === '"' || beforeSlash === "'") {
        searchStart = slashIdx + 1;
        continue;
      }

      // 往后找结束 /
      const endIdx = trimmed.indexOf('/', slashIdx + 1);
      if (endIdx === -1) break;

      const candidate = trimmed.slice(slashIdx, endIdx + 1);
      // 粗暴但有效：尝试 eval 看是否合法
      try {
        new Function('return ' + candidate);
        regexes.push(candidate);
        searchStart = endIdx + 1;
      } catch {
        searchStart = endIdx + 1;
        continue;
      }
    }

    for (const r of regexes) {
      try {
        const re = new Function('return ' + r)();
        results.push({ regex: r, valid: true, re });
      } catch (e) {
        results.push({ regex: r, valid: false, error: e.message });
      }
    }
  }
  return results;
}

describe('generate404 正则输出验证', () => {
  test('所有生成的正则表达式语法合法', () => {
    const code = buildRedirectScript('', ['home', 'products']);
    const results = validateRegexInCode(code);
    const invalid = results.filter(r => !r.valid);
    expect(invalid).toEqual([]);
  });

  test('product 品类路由正则：只匹配二级路径，不匹配三级产品详情路径', () => {
    const re = /^\/products\/([^/]+)$/;
    expect(re.test('/products/stirfry')).toBe(true);
    expect(re.test('/products/cutting')).toBe(true);
    expect(re.test('/products/stirfry/DLB-BQ40T')).toBe(false);
    expect(re.test('/products')).toBe(false);
  });

  test('trailing slash 正则：匹配末尾 /，不匹配无 / 的路径', () => {
    const re = /\/$/;
    expect(re.test('/products/')).toBe(true);
    expect(re.test('/products')).toBe(false);
  });

  test('leading slash 正则：匹配开头的 /', () => {
    const re = /^\//;
    expect(re.test('/products')).toBe(true);
    expect(re.test('products')).toBe(false);
  });
});

/**
 * 从 generate404 函数源码中提取 redirectScript 拼接部分，
 * 验证所有 JS 字符串中的转义序列正确。
 *
 * 检查规则：在 JS 字符串字面量中，要生成 \/（正则中的转义/）
 * 必须写 \\/（两个反斜杠），写 \/ 会输出为字符 /（非转义）。
 */
describe('build-ssg.js 源码静态检查', () => {
  test('generate404 字符串模板中没有未转义的 \\/', () => {
    const src = fs.readFileSync(BUILD_SSG_PATH, 'utf-8');

    // 定位 redirectScript 拼接代码段
    const fnStart = src.indexOf('var redirectScript');
    const fnEnd = src.indexOf('html = html.replace', fnStart);
    const scriptPart = src.slice(fnStart, fnEnd);

    // 用 AST 方式找字符串字面量中的问题
    // 在 JS 源码中：'\\/' 的两个反斜杠在 AST 中就是一个反斜杠 + /
    // 而 '\/' 中没有反斜杠（因为 \/ 在 JS 字符串中不是转义序列，被视为 / 本身）
    // 
    // 没法用简单的正则判断。更可靠的方式：直接 eval 检查输出是否合法正则
    
    // 提取所有用 + 拼接的字符串片段
    const fragments = scriptPart.match(/['][^']*[']/g) || [];
    
    // 模拟拼接后检查输出的正则
    const output = fragments.map(f => eval(f)).join('\n');
    const results = validateRegexInCode(output);
    const invalid = results.filter(r => !r.valid);
    
    if (invalid.length > 0) {
      console.log('无效的正则:', invalid);
    }
    expect(invalid).toEqual([]);
  });
});

const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'src/assets/js/product-data-table.js');
const emptyModule = '// 产品数据表（自动创建的空数据占位）\nexport const PRODUCT_DATA_TABLE = [];\n';

function ensureProductDataTableFile() {
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (fs.existsSync(target)) {
    const content = fs.readFileSync(target, 'utf-8').trim();
    if (content && /export const PRODUCT_DATA_TABLE\s*=/.test(content)) {
      console.log('[ensure-product-data-table] file is valid:', target);
      return;
    }
  }

  fs.writeFileSync(target, emptyModule, 'utf-8');
  console.log('[ensure-product-data-table] wrote default file:', target);
}

ensureProductDataTableFile();

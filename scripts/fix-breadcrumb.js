var fs = require('fs');
var src = fs.readFileSync('src/assets/js/product-detail.js', 'utf-8');

var startMarker = '// PC/Tablet breadcrumb — chevron_right + badge (matches steaming/food-factory style)';
var startIdx = src.indexOf(startMarker);

if (startIdx === -1) {
  console.log('ERROR: start marker not found');
  process.exit(1);
}

// Find the end of the breadcrumb block: bcEl.innerHTML = html;
var endMarker = 'bcEl.innerHTML = html;';
var endIdx = src.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.log('ERROR: end marker not found');
  process.exit(1);
}

// Get the old block
var oldBlock = src.substring(startIdx, endIdx + endMarker.length);

var newBlock = `// PC/Tablet breadcrumb — 统一三层 Products / 分类 / 型号
      var chevron = '<span class="mx-1.5 text-slate-300 dark:text-slate-600">/</span>';
      var badgeHtml =
        catLabel && slug
          ? chevron +
            '<a href="/products/' +
            slug +
            '/" class="hover:text-primary transition-colors">' +
            esc(catLabel) +
            "</a>"
          : "";
      var html =
        '<div class="section-content pt-4 pb-0 hidden md:block" style="padding-inline:var(--container-px,0.75rem)">' +
        '<nav class="breadcrumb-nav text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">' +
        '<ol class="flex items-center gap-1 flex-wrap">' +
        '<li><a href="/products/" class="hover:text-primary transition-colors">' +
        esc(tl("nav_products", "Products")) + '</a></li>' +
        (badgeHtml ? badgeHtml : "") +
        (badgeHtml ? chevron : "") +
        '<li><span class="text-slate-900 dark:text-white font-medium">' +
        esc(product.name || model) + "</span></li>" +
        '</ol></nav></div>';
      // Mobile breadcrumb — 统一返回按钮 + 两层
      var mChevron = '<span class="mx-1 text-slate-300 text-xs">/</span>';
      html +=
        '<div class="section-content pt-3 pb-0 md:hidden" style="padding-inline:var(--container-px,0.75rem)">' +
        '<div class="flex items-center gap-2">' +
        '<button onclick="window.Breadcrumb&&window.Breadcrumb.goBack()" class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 transition-all flex-shrink-0" aria-label="' +
        tl("pd_back", "返回") +
        '">' +
        '<span class="material-symbols-outlined text-lg">arrow_back</span></button>' +
        '<div class="text-xs text-slate-500 dark:text-slate-400">' +
        esc(tl("nav_products", "Products")) + '</div>' +
        (catLabel ? '<div class="text-xs text-slate-500 dark:text-slate-400">' + mChevron + esc(catLabel) + "</div>" : "") +
        '<div class="text-sm font-bold text-slate-900 dark:text-white truncate">' +
        mChevron + esc(product.name || model) + "</div>" +
        "</div></div>";
      bcEl.innerHTML = html;`;

src = src.replace(oldBlock, newBlock);
fs.writeFileSync('src/assets/js/product-detail.js', src);
console.log('Breadcrumb replaced successfully');

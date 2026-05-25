var fs = require('fs');
var src = fs.readFileSync('src/assets/js/ui/search-engine.js', 'utf-8');

// Fix 1: Replace window.t() calls in buildSearchableProducts with tr()
src = src.replace(
  'var translatedCategory = typeof window.t === "function"\n        ? (window.t(catKey) || category) : category;',
  'var translatedCategory = tr(catKey, category) || category;'
);
src = src.replace(
  'var translatedName = typeof window.t === "function"\n        ? (window.t("product_" + model + "_name") || name) : name;',
  'var translatedName = tr("product_" + model + "_name", name || model) || name || model;'
);

// Fix 2: Ensure _searchText includes both translated and original text for multi-language search
src = src.replace(
  '_searchText: [\n          translatedName, model, translatedCategory, category,\n          p.specifications || "", p.throughput || "",\n          p.voltage || "", p.power || "", p.material || "", p.scenarios || ""',
  '_searchText: [\n          translatedName || name, model, translatedCat || category, category,\n          p.specifications || "", p.throughput || "",\n          p.voltage || "", p.power || "", p.material || "", p.scenarios || ""'
);

fs.writeFileSync('src/assets/js/ui/search-engine.js', src);
console.log('Search engine fixed');

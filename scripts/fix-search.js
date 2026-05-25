var fs = require('fs');
var src = fs.readFileSync('src/assets/js/ui/search-engine.js', 'utf-8');

// Replace buildSearchableProducts to use PRODUCT_DATA_TABLE
var oldFunc = src.match(/function buildSearchableProducts\(\) \{[\s\S]*?function doSearch/);
if (!oldFunc) {
  console.log('ERROR: could not find buildSearchableProducts');
  process.exit(1);
}

var newFunc = `function buildSearchableProducts() {
    // Use product-data-table.js (146 products) instead of static series
    var table = window.PRODUCT_DATA_TABLE || [];
    var catI18n = {
      "翻炒系列": "nav_products_stirfry",
      "炖煮系列": "nav_products_stewing",
      "蒸煮系列": "nav_products_steaming",
      "煎炸系列": "nav_products_frying",
      "切配系列": "nav_products_cutting",
      "辅助系列": "nav_products_other"
    };
    return table.map(function (p) {
      var model = p.model || "";
      var name = p.name || model;
      var category = p.category || "";
      var catKey = catI18n[category] || "filter_" + category;
      var translatedCategory = typeof window.t === "function"
        ? (window.t(catKey) || category) : category;
      var translatedName = typeof window.t === "function"
        ? (window.t("product_" + model + "_name") || name) : name;

      // Get primary image
      var imgSrc = "";
      if (p.images && p.images.length > 0) {
        var primary = p.images.find(function(i) { return i.isPrimary; }) || p.images[0];
        if (primary && primary.filePath) imgSrc = primary.filePath;
      }
      if (!imgSrc) imgSrc = "/assets/images/products/" + model + "-1.webp";

      return Object.assign({}, p, {
        _displayName: translatedName,
        _displayCategory: translatedCategory,
        _searchText: [
          translatedName, model, translatedCategory, category,
          p.specifications || "", p.throughput || "",
          p.voltage || "", p.power || "", p.material || "", p.scenarios || ""
        ].filter(Boolean).join(" ").toLowerCase(),
        productImage: imgSrc,
        imageUrl: imgSrc
      });
    });
  }

  function doSearch`;

var oldStr = oldFunc[0];
// Remove "function doSearch" from the match since we already have it in newFunc
oldStr = oldStr.substring(0, oldStr.indexOf('function doSearch'));

src = src.replace(oldStr, newFunc);

// Fix 2: Update result item click to navigate to PDP
src = src.replace(
  'href="/products/" data-search-idx="',
  'href="/products/detail/' + escape('/') + '" data-search-idx="'
);
// Actually we need dynamic URL per product. Replace the href construction.
src = src.replace(
  '<a class="ios-search-result-item',
  '<a class="ios-search-result-item"'
);
// Find the href line and make it dynamic
src = src.replace(
  'href="/products/" data-search-idx="' + escape('') + ' idx +',
  'href="' + escape('/') + 'products/' + escape('/') + '" + (results[idx] && results[idx].model ? "detail/" + encodeURIComponent(results[idx].model) + "' + escape('/') + '" : "all/' + escape('/') + '") + " data-search-idx="'
);

fs.writeFileSync('src/assets/js/ui/search-engine.js', src);
console.log('Search engine updated');

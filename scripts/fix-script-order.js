var fs = require('fs');
var pages = [
  'products/all/index-pc.html',
  'products/all/index-mobile.html',
  'products/all/index-tablet.html',
  'products/stirfry/index-pc.html',
  'products/stirfry/index-mobile.html',
  'products/stirfry/index-tablet.html',
  'products/cutting/index-pc.html',
  'products/cutting/index-mobile.html',
  'products/cutting/index-tablet.html',
  'products/frying/index-pc.html',
  'products/frying/index-mobile.html',
  'products/frying/index-tablet.html',
  'products/stewing/index-pc.html',
  'products/stewing/index-mobile.html',
  'products/stewing/index-tablet.html',
  'products/steaming/index-pc.html',
  'products/steaming/index-mobile.html',
  'products/steaming/index-tablet.html',
  'products/other/index-pc.html',
  'products/other/index-mobile.html',
  'products/other/index-tablet.html',
  'products/compare/index-pc.html',
  'products/compare/index-mobile.html',
  'products/compare/index-tablet.html',
];

var ROOT = '/Users/chee/Projects/KitchenYuKoLi/src/pages';

pages.forEach(function(rel) {
  var f = ROOT + '/' + rel;
  if (!fs.existsSync(f)) {
    console.log('SKIP (not found):', rel);
    return;
  }
  var c = fs.readFileSync(f, 'utf-8');
  // Remove hardcoded product-grid.js <script defer> tag
  // Also remove product-list.js if present (also in pageSpecific)
  var before = c;
  c = c.replace(/\s*<script defer src="\/assets\/js\/product-grid\.js[^"]*"><\/script>/g, '');
  c = c.replace(/\s*<script defer src="\/assets\/js\/product-list\.js[^"]*"><\/script>/g, '');
  c = c.replace(/\s*<script defer src="\/assets\/js\/product-detail\.js[^"]*"><\/script>/g, '');
  c = c.replace(/\s*<script defer src="\/assets\/js\/cross-sell\.js[^"]*"><\/script>/g, '');
  if (c !== before) {
    fs.writeFileSync(f, c);
    console.log('FIXED:', rel);
  } else {
    console.log('  (no change):', rel);
  }
});

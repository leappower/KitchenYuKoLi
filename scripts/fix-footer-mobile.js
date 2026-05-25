var fs = require('fs');
var src = fs.readFileSync('src/assets/js/ui/footer.js', 'utf-8');

// Change grid from grid-cols-1 md:grid-cols-2 to grid-cols-2 md:grid-cols-4
// So mobile gets 2 columns (Products + Applications)
src = src.replace(
  'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6',
  'grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6'
);

// Change Applications from hidden md:block to block (always visible)
src = src.replace(
  '/* Applications (shown on md+) */\n      \'<div class="hidden md:block">\'',
  '/* Applications */\n      \'<div class="block">\''
);

fs.writeFileSync('src/assets/js/ui/footer.js', src);
console.log('Footer mobile layout adjusted: grid-cols-2 on mobile, 4 columns on md+');

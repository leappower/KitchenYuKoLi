var fs = require('fs');
var src = fs.readFileSync('src/assets/js/ui/footer.js', 'utf-8');
src = src.replace(
  '/* Products */\n      "<div>"',
  '/* Products */\n      \'<div class="text-center">\''
);
src = src.replace(
  '/* Applications */\n      "<div>"',
  '/* Applications */\n      \'<div class="text-center">\''
);
src = src.replace(
  '/* Support */\n      "<div>"',
  '/* Support */\n      \'<div class="text-center">\''
);
src = src.replace(
  '/* Legal */\n      "<div>"',
  '/* Legal */\n      \'<div class="text-center">\''
);
fs.writeFileSync('src/assets/js/ui/footer.js', src);
console.log('PC footer columns centered');

var fs = require('fs');
var t = fs.readFileSync('src/pages/support/index-tablet.html', 'utf-8');
var idx = t.indexOf('Support Card Grid');
var sectionStart = t.indexOf('<section', idx);
var sectionEnd = t.indexOf('</section>', sectionStart) + 11;
var tabletSection = t.substring(sectionStart, sectionEnd);

// Extract cards
var cards = tabletSection.match(/<a href="[^"]*"[^>]*>[\s\S]*?<\/a>/g);
console.log(cards.length + ' cards found');

var mobileHtml = '      <!-- Support Card Grid (mobile: horizontal image cards) -->\n' +
'      <section class="fullwidth-bg py-4">\n' +
'        <div class="section-content">\n' +
'          <div class="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x snap-mandatory">\n';

cards.forEach(function(card) {
  // Adapt tablet card for mobile
  card = card.replace(/p-5/g, 'p-4');
  card = card.replace(/text-lg/g, 'text-sm');
  card = card.replace(/mb-3/g, 'mb-2');
  card = card.replace(/>([^<]+)<\/p>/g, function(m, p1) {
    // Shorten description for mobile
    var short = p1.length > 60 ? p1.substring(0, 60) + '...' : p1;
    return '>' + short + '<\/p>';
  });
  card = card.replace(/class="group[^"]*"/, function(m) {
    return m + ' min-w-[260px] snap-start flex-shrink-0';
  });
  // Remove hover lift
  card = card.replace(/hover:-translate-y-1 duration-300 /g, '');
  card = card.replace(/transition-all duration-300 /g, 'transition-all ');
  mobileHtml += '\n' + card;
});

mobileHtml += '\n' +
'          </div>\n' +
'        </div>\n' +
'      </section>';

var m = fs.readFileSync('src/pages/support/index-mobile.html', 'utf-8');
var mIdx = m.indexOf('Support Card Grid (mobile: horizontal image cards)');
var mSectionStart = m.lastIndexOf('<section', mIdx);
var mSectionEnd = m.indexOf('</section>', mSectionStart) + 11;
m = m.substring(0, mSectionStart) + mobileHtml + m.substring(mSectionEnd);
fs.writeFileSync('src/pages/support/index-mobile.html', m);
console.log('Done');

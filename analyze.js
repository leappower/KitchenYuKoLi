const fs = require('fs');
const path = require('path');

// Load en-ui.json
const enUi = JSON.parse(fs.readFileSync('/Users/chee/Projects/KitchenYuKoLi/src/assets/lang/en-ui.json', 'utf8'));

const casesDir = '/Users/chee/Projects/KitchenYuKoLi/src/pages/cases';
const cities = ['manila', 'kl', 'bangkok', 'cebu', 'hanoi', 'hcmc', 'jakarta', 'surabaya'];

console.log('='.repeat(80));
console.log('ISSUE 1: Cases sub-page i18n fallback text analysis');
console.log('='.repeat(80));
console.log();

for (const city of cities) {
  for (const variant of ['mobile', 'pc', 'tablet']) {
    const filePath = path.join(casesDir, city, `index-${variant}.html`);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }
    console.log(`\nFile: cases/${city}/index-${variant}.html`);
    console.log('-'.repeat(60));
    
    const html = fs.readFileSync(filePath, 'utf8');
    
    // Find all data-i18n elements and extract their text content
    // Pattern: <tag [attrs] data-i18n="KEY" [attrs]>TEXT</tag>
    const i18nRegex = /<([a-zA-Z0-9_-]+)(?:\s[^>]*?)?\s+data-i18n="([^"]+)"(?:\s[^>]*?)?>([\s\S]*?)<\/\1>/gi;
    
    let match;
    let found = false;
    
    while ((match = i18nRegex.exec(html)) !== null) {
      const tag = match[1];
      const key = match[2];
      const fallback = match[3].trim();
      
      if (!fallback) continue; // skip empty elements
      
      const enText = enUi[key];
      
      if (!enText) {
        console.log(`⚠️  MISSING KEY ${key}: fallback="${fallback.substring(0, 60)}..."`);
        found = true;
        continue;
      }
      
      // Clean HTML entities from fallback for comparison
      const cleanFallback = fallback.replace(/<br\s*\/?>/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
      
      // Get plain text from enText (strip HTML)
      const enPlain = enText.replace(/<[^>]*>/g, '').trim();
      
      // Compare first 20 chars of cleaned fallback vs English
      const fallbackStart = cleanFallback.substring(0, 20).trim();
      const enStart = enPlain.substring(0, 20).trim();
      
      if (fallbackStart.toLowerCase() !== enStart.toLowerCase()) {
        console.log(`❌ ${key}:`);
        console.log(`   fallback="${cleanFallback.substring(0, 80)}..."`);
        console.log(`   en="${enPlain.substring(0, 80)}..."`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('✅ All data-i18n elements match English fallback');
    }
  }
}

console.log();
console.log('='.repeat(80));
console.log('ISSUE 2: Search for remaining grid-cols-2 in mobile files');
console.log('='.repeat(80));
console.log();

const appDir = '/Users/chee/Projects/KitchenYuKoLi/src/pages/applications';
const apps = ['small-restaurant', 'canteen', 'central-kitchen', 'chain-restaurant', 'food-factory', 'menu-lab'];

// Search for grid-cols-2 in all mobile files
for (const app of apps) {
  const filePath = path.join(appDir, app, 'index-mobile.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const lines = html.split('\n');
  
  console.log(`\nFile: applications/${app}/index-mobile.html`);
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('grid-cols-2')) {
      matches.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  
  if (matches.length === 0) {
    console.log('✅ No grid-cols-2 found');
  } else {
    for (const m of matches) {
      console.log(`  L${m.line}: ${m.text}`);
    }
  }
}
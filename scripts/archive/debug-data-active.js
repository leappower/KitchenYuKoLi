/**
 * Debug script to check data-active attribute issues
 * 
 * This script will:
 * 1. Check if pages have correct data-active attributes
 * 2. Verify spa-router's pageToActiveNav mapping
 * 3. Test getBasePagePathFromHtml function
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════');
console.log('  Debugging data-active attribute issues');
console.log('═══════════════════════════════════════════════════\n');

// 1. Check spa-router.js pageToActiveNav mapping
console.log('1. Checking spa-router.js pageToActiveNav mapping:');
console.log('─────────────────────────────────────────────────────');

const spaRouterPath = path.join(__dirname, '../src/assets/js/spa-router.js');
const spaRouterContent = fs.readFileSync(spaRouterPath, 'utf8');

const pageToActiveNavMatch = spaRouterContent.match(/pageToActiveNav:\s*\{([\s\S]*?)\n\s*\},/);
if (pageToActiveNavMatch) {
  const mappingContent = pageToActiveNavMatch[1];
  const mappingLines = mappingContent.split('\n').filter(line => line.trim());
  console.log('Found mappings:');
  mappingLines.forEach(line => {
    console.log('  ' + line.trim());
  });
} else {
  console.log('❌ Could not find pageToActiveNav mapping');
}

// 2. Check getBasePagePathFromHtml function logic
console.log('\n2. Checking getBasePagePathFromHtml function:');
console.log('─────────────────────────────────────────────────────');

const getBasePagePathMatch = spaRouterContent.match(/getBasePagePathFromHtml:\s*function\([\s\S]*?\n\s*\},/);
if (getBasePagePathMatch) {
  const funcContent = getBasePagePathMatch[0];

  // Extract the path conversion logic
  const conversionMatch = funcContent.match(/var path = pathMatch\[1\];[\s\S]*?return path;/);
  if (conversionMatch) {
    console.log('Path conversion logic:');
    console.log(conversionMatch[0]);
  }
}

console.log('\n3. Testing path conversion:');
console.log('─────────────────────────────────────────────────────');

// Simulate the path conversion logic
function testPathConversion(canonicalUrl) {
  const pathMatch = canonicalUrl.match(/https?:\/\/[^/]*(\/.*)/);
  if (!pathMatch) return null;

  let path = pathMatch[1];
  if (path.endsWith('/')) {
    path = path.slice(0, -1) + '/index.html';
  } else {
    path = path + '/index.html';
  }
  return path;
}

const testCases = [
  { canonical: 'https://www.yukoli.com/home/', expected: '/home/index.html' },
  { canonical: 'https://www.yukoli.com/catalog/', expected: '/catalog/index.html' },
  { canonical: 'https://www.yukoli.com/case-studies/', expected: '/case-studies/index.html' },
  { canonical: 'https://www.yukoli.com/support/', expected: '/support/index.html' },
  { canonical: 'https://www.yukoli.com/quote/', expected: '/quote/index.html' },
  { canonical: 'https://www.yukoli.com/roi/', expected: '/roi/index.html' },
  { canonical: 'https://www.yukoli.com/esg/', expected: '/esg/index.html' },
  { canonical: 'https://www.yukoli.com/landing/', expected: '/landing/index.html' },
  { canonical: 'https://www.yukoli.com/thank-you/', expected: '/thank-you/index.html' },
  { canonical: 'https://www.yukoli.com/case-download/', expected: '/case-download/index.html' },
  { canonical: 'https://www.yukoli.com/pdp/', expected: '/pdp/index.html' },
];

testCases.forEach(test => {
  const result = testPathConversion(test.canonical);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.canonical}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Got:      ${result}`);
  if (result !== test.expected) {
    console.log('   ❌ MISMATCH!');
  }
  console.log('');
});

// 4. Check if pages have correct data-active attributes
console.log('\n4. Checking page data-active attributes:');
console.log('─────────────────────────────────────────────────────');

const pagesDir = path.join(__dirname, '../src/pages');
const pageSections = ['home', 'catalog', 'case-studies', 'support', 'quote', 'roi', 'esg', 'landing', 'thank-you', 'case-download', 'pdp'];

pageSections.forEach(section => {
  const pcFile = path.join(pagesDir, section, 'index-pc.html');
  if (fs.existsSync(pcFile)) {
    const content = fs.readFileSync(pcFile, 'utf8');
    const navMatch = content.match(/<navigator[^>]*data-active="([^"]*)"[^>]*>/);
    const footerMatch = content.match(/<footer[^>]*data-active="([^"]*)"[^>]*>/);
    const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);

    console.log(`\n📄 ${section}/index-pc.html:`);
    if (canonicalMatch) {
      console.log(`   Canonical: ${canonicalMatch[1]}`);
    }
    if (navMatch) {
      console.log(`   Navigator data-active: '${navMatch[1]}'`);
    } else {
      console.log('   ❌ No Navigator data-active found');
    }
    if (footerMatch) {
      console.log(`   Footer data-active: '${footerMatch[1]}'`);
    } else {
      console.log('   ℹ No Footer data-active (might be PC-only)');
    }
  }
});

console.log('\n═══════════════════════════════════════════════════');
console.log('  Debug complete');
console.log('═══════════════════════════════════════════════════\n');

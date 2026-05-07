import fs from 'fs';
import path from 'path';

const PAGES_DIR = 'src/pages';
const SKIP = ['products/compare'];

function findHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (/^index-(pc|tablet|mobile)\.html$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function analyzeFile(filePath) {
  const relPath = path.relative(PAGES_DIR, filePath);
  // Check if this is in a skip path
  for (const skip of SKIP) {
    if (relPath.startsWith(skip)) return null;
  }
  
  const html = fs.readFileSync(filePath, 'utf-8');
  
  // Find all section tags
  const sectionRegex = /<section[^>]*>/g;
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    sections.push({
      tag: match[0],
      index: match.index,
      classes: (match[0].match(/class="([^"]*)"/) || ['', ''])[1].split(/\s+/).filter(Boolean),
    });
  }
  
  if (sections.length === 0) return null;
  
  const issues = [];
  
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const cls = s.classes;
    const isFirst = i === 0;
    
    // Check for fullwidth-bg
    const hasFullwidthBg = cls.includes('fullwidth-bg');
    const hasSectionContent = html.slice(s.index).match(/<section[^>]*>\s*(<div[^>]*class="[^"]*section-content[^"]*">|<div class="section-content">)/);
    
    // Check spacing classes
    const hasPadding = cls.some(c => /^(py|pt|pb|p)-/.test(c));
    const hasMargin = cls.some(c => /^(my|mt|mb|m)-/.test(c));
    const hasSpacing = hasPadding || hasMargin;
    
    // Check if should be skipped (inline px, rounded cards, etc)
    const hasInlinePx = cls.some(c => /^px-/.test(c));
    const hasRounded = cls.some(c => /^rounded-(lg|xl|2xl|3xl|full)$/.test(c));
    const isCard = hasRounded && !hasFullwidthBg;
    const isStickyFilter = cls.includes('sticky') || cls.includes('lg:sticky');
    
    // Determine if needs fullwidth-bg
    let needsFullwidthBg = false;
    let reason = '';
    
    if (!hasFullwidthBg && !hasInlinePx && !isCard && !isStickyFilter) {
      // Sections without fullwidth-bg that should probably have it
      if (cls.length === 0) {
        needsFullwidthBg = true;
        reason = 'empty section (no classes)';
      } else if (cls.some(c => /^(bg|dark|text|flex|gap|grid|overflow|relative|absolute|fixed|min-h|max-h|h-|w-|items-|justify-|space-)/.test(c))) {
        // Has layout/content classes but no fullwidth-bg
        if (!isCard) {
          needsFullwidthBg = true;
          reason = 'content/layout section without fullwidth-bg';
        }
      }
    }
    
    // Check spacing
    let needsSpacing = false;
    if (!hasSpacing && !isCard && !isStickyFilter) {
      needsSpacing = true;
    }
    
    if (needsFullwidthBg || needsSpacing || (!hasSectionContent && hasFullwidthBg && !isStickyFilter)) {
      issues.push({
        sectionIndex: i + 1,
        isFirst,
        tag: s.tag,
        classes: cls,
        hasFullwidthBg,
        hasSectionContent: !!hasSectionContent,
        hasSpacing,
        needsFullwidthBg,
        needsSpacing,
        reason,
      });
    }
  }
  
  return { relPath, totalSections: sections.length, issues };
}

const files = findHtmlFiles(PAGES_DIR).sort();
const results = [];

for (const f of files) {
  const r = analyzeFile(f);
  if (r && r.issues.length > 0) {
    results.push(r);
  }
}

// Summary
console.log(`\n=== AUDIT RESULTS ===\n`);
console.log(`Files with issues: ${results.length}`);
let totalIssues = 0;
for (const r of results) {
  console.log(`\n--- ${r.relPath} (${r.totalSections} sections, ${r.issues.length} issues) ---`);
  for (const iss of r.issues) {
    totalIssues++;
    const flags = [];
    if (iss.needsFullwidthBg) flags.push('ADD fullwidth-bg');
    if (iss.needsSpacing) flags.push('NEEDS spacing');
    if (!iss.hasSectionContent && iss.hasFullwidthBg) flags.push('MISSING section-content');
    console.log(`  §${iss.sectionIndex}${iss.isFirst ? ' [HERO]' : ''}: ${flags.join(' | ')}`);
    console.log(`    classes: [${iss.classes.join(', ')}]`);
    console.log(`    reason: ${iss.reason}`);
  }
}

console.log(`\n=== TOTAL ISSUES: ${totalIssues} ===`);

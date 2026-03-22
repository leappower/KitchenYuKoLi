const fs = require('fs');
const path = require('path');

/**
 * 分析项目中的CSS动画使用情况
 */

function analyzeAnimations() {
  const htmlFiles = [];
  const animationStats = {
    transitionAll: 0,
    transitionColors: 0,
    transitionTransform: 0,
    transitionOpacity: 0,
    animatePulse: 0,
    animateSpin: 0,
    animateBounce: 0,
    hoverEffects: 0,
    totalAnimatedElements: 0
  };

  function scanDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        scanDir(fullPath);
      } else if (file.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }

  scanDir('src/pages');

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = file.replace('src/pages/', '');

    // 统计不同的动画类型
    const transitionAll = (content.match(/transition-all/gi) || []).length;
    const transitionColors = (content.match(/transition-colors/gi) || []).length;
    const transitionTransform = (content.match(/transition-transform/gi) || []).length;
    const transitionOpacity = (content.match(/transition-opacity/gi) || []).length;
    const animatePulse = (content.match(/animate-pulse/gi) || []).length;
    const animateSpin = (content.match(/animate-spin/gi) || []).length;
    const animateBounce = (content.match(/animate-bounce/gi) || []).length;
    const hoverEffects = (content.match(/hover:scale/gi) || []).length +
                      (content.match(/hover:bg/gi) || []).length +
                      (content.match(/hover:text/gi) || []).length;

    animationStats.transitionAll += transitionAll;
    animationStats.transitionColors += transitionColors;
    animationStats.transitionTransform += transitionTransform;
    animationStats.transitionOpacity += transitionOpacity;
    animationStats.animatePulse += animatePulse;
    animationStats.animateSpin += animateSpin;
    animationStats.animateBounce += animateBounce;
    animationStats.hoverEffects += hoverEffects;

    const total = transitionAll + transitionColors + transitionTransform + transitionOpacity +
                  animatePulse + animateSpin + animateBounce;
    animationStats.totalAnimatedElements += total;
  });

  return animationStats;
}

const stats = analyzeAnimations();

console.log('📊 CSS动画分析报告\n');
console.log('═'.repeat(60));
console.log('Transition 动画:');
console.log(`  transition-all:       ${stats.transitionAll}`);
console.log(`  transition-colors:    ${stats.transitionColors}`);
console.log(`  transition-transform:  ${stats.transitionTransform}`);
console.log(`  transition-opacity:    ${stats.transitionOpacity}`);
console.log('');
console.log('Animate 动画:');
console.log(`  animate-pulse:       ${stats.animatePulse}`);
console.log(`  animate-spin:        ${stats.animateSpin}`);
console.log(`  animate-bounce:      ${stats.animateBounce}`);
console.log('');
console.log('Hover 效果:');
console.log(`  hover 效果总数:     ${stats.hoverEffects}`);
console.log('');
console.log('═'.repeat(60));
console.log(`📈 总计动画元素: ${stats.totalAnimatedElements}`);
console.log('═'.repeat(60));

console.log('\n💡 优化建议:');
console.log('  1. transition-all → 明确指定属性 (transition-colors, transform, opacity)');
console.log('  2. 为频繁动画的元素添加 will-change 属性');
console.log('  3. 优先优化 hover:scale, animate-pulse 等高频动画');
console.log('  4. 使用 transform 和 opacity 进行动画 (GPU加速)');

// tailwind.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified build-time Tailwind config (replaces 432 KB CDN per-page load).
// Merged from 15 distinct inline configs found across src/pages/**/*.html
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  content: [
    './src/router-test.html',
    './src/**/*.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './src/**/*.json',  // i18n lang files may contain Tailwind classes
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'bounce-once': 'bounce-once 0.6s ease-out',
      },
      keyframes: {
        'bounce-once': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
      colors: {
        // ── Core brand tokens (used by 39+ pages) ────────────────────────────
        'primary':            '#ec5b13',   // Yukoli orange (canonical)
        'background-light':   '#f8f6f6',
        'background-dark':    '#221610',

        // ── Supplementary tokens (used by specific page variants) ─────────────
        'industrial-gray':    '#4a4a4a',
        'industrial-gray-900':'#1A1A1A',
        'industrial-gray-800':'#2D2D2D',
        'industrial-gray-100':'#F4F4F4',
        'slate-dark':         '#0f172a',
        'obsidian':           '#111111',
        'slate-zinc':         '#27272a',
        'tech-silver':        '#e2e8f0',
        'silver':             '#e2e8f0',
        'steel-blue':         '#2D3436',

        // ── Legacy landing-page tokens ──────────────────────────────────────────
        // Note: vitality-orange/#F26522 intentionally mapped to primary #ec5b13
        // after brand-color unification (F5). Keep alias for backward compat.
        'vitality-orange':    '#ec5b13',
        'yukoli-orange':      '#ec5b13',
        'yukoli-obsidian':    '#121417',
        'yukoli-dark-grey':   '#1A1D21',
        'yukoli-muted-grey':  '#2A2E35',
        'industrial-dark':    '#121212',
        'slate-gray':         '#2D2D2D',
      },
      fontFamily: {
        'display': ['Public Sans', 'sans-serif'],
        // Inter used by landing page variants
        'sans':    ['Inter', 'Public Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg':      '0.5rem',
        'xl':      '0.75rem',
        '2xl':     '1rem',
        '3xl':     '1.5rem',
        'full':    '9999px',
      },
    },
  },
  plugins: [],
  safelist: [
    // ── Padding ──────────────────────────────────────────
    { pattern: /^p[btxy]?-(\d+|auto|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)$/ },
    // ── Margin ───────────────────────────────────────────
    { pattern: /^-?m[btxy]?-(\d+|auto|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)$/ },
    // ── Gap ──────────────────────────────────────────────
    { pattern: /^gap-(\d+|0\.5|1|1\.5|2|2\.5|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32)$/ },
    // ── Common utility classes that get dynamically used ──
    'bg-white',
    { pattern: /^max-w-(\d+px|\w+)$/ },
    { pattern: /^w-(\d+px|\d+\/\d+|full|auto|screen|\w+)$/ },
    { pattern: /^h-(\d+px|\d+\/\d+|full|auto|screen|\w+)$/ },
    // ── Spacing for fullwidth-bg / section-content ───────
    'py-8', 'py-10', 'py-12', 'py-16', 'py-20', 'py-24',
    'px-4', 'px-6', 'px-8', 'px-10', 'px-12', 'px-16',
  ],
};

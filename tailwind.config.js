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
};

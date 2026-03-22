# internal/ — Internal Tools Directory

## Purpose

This directory contains HTML pages intended **exclusively for internal team use**.
These are **not** end-user-facing pages and should not be publicly linked or indexed.

## Audience

Marketing, product, and growth team members only.

## Directory Structure

```
internal/
├── ab-test/         # A/B Testing dashboards and email variant comparisons
│   ├── dashboard.html
│   ├── email-1-variants.html
│   ├── email-2-variants.html
│   ├── email-3-variants.html
│   ├── logic-analysis.html
│   └── strategy.html
│
├── crm/             # CRM tools, lead journey maps, scoring configuration
│   ├── dashboard.html
│   ├── lead-journey-se-asia.html
│   ├── lead-journey-western.html
│   ├── lead-scoring.html
│   ├── market-journey-dashboard.html
│   └── se-asia-lead-simulation.html
│
└── strategy/        # Budget planning, ROI tools, page specs, media plans
    ├── budget-simulator-2026.html
    ├── home-specs.html
    ├── media-buying-plan-2026.html
    ├── roi-calculator-pc.html
    └── se-asia-budget-strategy.html
```

## Access Notes

- These pages have **no responsive routing** — they target desktop/laptop screens only.
- No `<link rel="canonical">` or `<link rel="alternate">` declarations are required.
- Not included in `sitemap.xml` or public navigation.
- Accessed directly via URL or through `router-test.html` (the internal preview index).

## Directory Convention

All pages in `internal/` follow this naming pattern:

| Sub-directory | Content type |
|---------------|-------------|
| `ab-test/`    | A/B test variants and performance dashboards |
| `crm/`        | Lead management, journey mapping, and scoring tools |
| `strategy/`   | Budget simulators, media plans, ROI calculators, and page specs |

## Related

- `src/pages/` — End-user-facing pages (public)
- `src/router-test.html` — Full preview index (links to both `pages/` and `internal/`)

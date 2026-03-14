# Performance (Lighthouse)

**Checkpoint:** Lighthouse Performance score should be **≥ 90** on the production or preview URL.

## How to verify

1. Deploy the app (e.g. to Netlify) or run a production build and serve it locally.
2. Run Lighthouse against the deployed URL:

   ```bash
   npx lighthouse https://YOUR_DEPLOYMENT_URL --only-categories=performance --output=json --output=html --output-path=./lighthouse-report
   ```

   Or use the npm script (pass the URL as an argument):

   ```bash
   npm run perf:lighthouse -- https://YOUR_DEPLOYMENT_URL
   ```

3. Open `lighthouse-report.report.html` (or the path you set) and confirm **Performance ≥ 90**.
4. If the score is below 90, check FCP, LCP, and Speed Index in the report and apply fixes from the phased plan (critical CSS, fonts, lazy routes).

## Optimizations in place

- **Phase 1 (skipped):** Critical-CSS plugin (beasties) was not re-applied to avoid broken layout; main CSS loads normally.
- **Phase 2:** Fonts preloaded in `index.html` with `display=optional` and applied on load; reduced font variants (400;600) for faster LCP. Fonts loaded only from index.html (no @import in fonts.css).
- **Phase 3:** Route components and `TenantLayout` lazy-loaded; initial JS bundle reduced.
- **Phase 4:** This doc and the `perf:lighthouse` script for verification.

## CI (optional)

To enforce the threshold in CI, run Lighthouse and parse the JSON output for `categories.performance.score` (0–1) and fail the job if it is below 0.9.

# FlowBoard

A simple Kanban board for small teams: Backlog, In Progress, In Review and Done columns, drag and drop, priorities, due dates, and search. Boards are saved in the visitor's own browser; there is no backend.

Built with React, TypeScript and Vite. Sign-in is a client-side demo, not real authentication.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
```

## Test

```bash
npm run typecheck    # TypeScript
npm test             # unit and component tests (Vitest + Testing Library)
npm run test:e2e     # regression tests in a real browser (Playwright, incl. axe accessibility scans)
npm run test:all     # all of the above
```

The first browser run needs `npx playwright install chromium`.

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`) runs on every push and pull request: typecheck and unit tests, then the browser regression suite.
- **Vercel** is connected to this repository: every push gets a preview deployment, and pushes to `main` deploy to production.
- Set `SITE_URL` in the Vercel project's environment variables if you add a custom domain; otherwise the Vercel production domain is used for canonical links, `robots.txt` and the sitemap.

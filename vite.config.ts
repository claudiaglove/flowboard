import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const DESCRIPTION =
  'FlowBoard is a simple Kanban board for small teams. Plan work in Backlog, In Progress, In Review and Done columns with drag and drop, priorities and due dates.';

// One place for the public address. Set SITE_URL (env var or .env file) at deploy time,
// e.g. SITE_URL=https://flowboard.example npm run build
function seoFiles(siteUrl: string, isPlaceholder: boolean): Plugin {
  return {
    name: 'seo-files',
    transformIndexHtml: (html) => html.split('__SITE_URL__').join(siteUrl),
    buildStart() {
      if (isPlaceholder) {
        this.warn('SITE_URL is not set (and not on Vercel): canonical, Open Graph, robots.txt and sitemap.xml use https://example.com');
      }
    },
    generateBundle() {
      const files: Record<string, string> = {
        'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
        'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n  </url>\n</urlset>\n`,
        'llms.txt': `# FlowBoard\n\n> ${DESCRIPTION}\n\n## Details\n\n- Four fixed columns: Backlog, In Progress, In Review and Done.\n- Cards have a title, assignee, priority (High, Medium, Low) and due date; overdue cards are flagged.\n- Cards can be dragged between columns and reordered, or moved with a menu on each card.\n- Search and filter cards by title, assignee or priority.\n- Boards are saved in the visitor's own browser; nothing is sent to a server.\n- The sign-in screen is the only public page. Signed-in pages are not meant to be indexed.\n\n## Page\n\n- [FlowBoard](${siteUrl}/): sign in to open your board\n`,
      };
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // SITE_URL wins; on Vercel the production domain is available as VERCEL_PROJECT_PRODUCTION_URL.
  const env = loadEnv(mode, '.', ['SITE_', 'VERCEL_PROJECT_PRODUCTION_URL']);
  const configured = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  const siteUrl = (configured || 'https://example.com').replace(/\/+$/, '');
  return {
    plugins: [react(), seoFiles(siteUrl, !configured)],
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      css: false,
    },
  };
});

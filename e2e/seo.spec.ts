import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('the sign-in page is indexable and fully described', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Sign in to FlowBoard – Kanban board for small teams');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Kanban board/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/.+\/$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@type']).toBe('WebApplication');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('the signed-in board asks search engines to stay out', async ({ page }) => {
  await signUp(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page).toHaveTitle('Team Board – FlowBoard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('crawler files are served and consistent', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain('Allow: /');
  const sitemapUrl = robotsText.match(/Sitemap: (\S+)/)![1];
  const sitemap = await request.get(new URL(sitemapUrl).pathname);
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('<loc>');
  expect((await request.get('/llms.txt')).ok()).toBe(true);
  expect((await request.get('/favicon.svg')).ok()).toBe(true);
  expect((await request.get('/og-image.png')).ok()).toBe(true);
});

test('does not load third-party fonts', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) external.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('the sign-in page does not download the board code', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(scripts.some((u) => /\/assets\/Board-/.test(u))).toBe(false);
});

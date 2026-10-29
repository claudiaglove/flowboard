import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addCard, signUp } from './helpers';

// A short, readable summary so a failure says which rule and element broke.
async function scan(page: Page) {
  // Colours are only final once fade-in animations finish; mid-fade contrast readings are noise.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    elements: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(1, 3).join(' ')}`),
  }));
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('sign-in page has no WCAG A/AA violations', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'FlowBoard' })).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });

    test('board, a card and the open dialog have no WCAG A/AA violations', async ({ page }) => {
      await signUp(page);
      expect(await scan(page)).toEqual([]);
      await addCard(page, 'Write docs');
      expect(await scan(page)).toEqual([]);
      await page.getByRole('button', { name: 'Write docs' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });
  });
}
